import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getStepAcceptedExtensions } from '@docs-flow/types';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  async findPublicWorkflow(slug: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { slug, isActive: true },
      include: {
        steps: {
          orderBy: { position: 'asc' },
          include: { documentType: true },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow não encontrado ou inativo');
    }

    return workflow;
  }

  async createSubmission(slug: string) {
    const workflow = await this.findPublicWorkflow(slug);

    return this.prisma.submission.create({
      data: {
        workflowId: workflow.id,
        status: 'IN_PROGRESS',
        currentStepPosition: 0,
      },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: { position: 'asc' },
              include: { documentType: true },
            },
          },
        },
        uploads: true,
      },
    });
  }

  async findSubmission(id: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: { position: 'asc' },
              include: { documentType: true },
            },
          },
        },
        uploads: true,
      },
    });

    if (!submission) throw new NotFoundException('Submissão não encontrada');
    return submission;
  }

  async findAllSubmissions() {
    return this.prisma.submission.findMany({
      include: {
        workflow: { select: { id: true, name: true, slug: true } },
        uploads: true,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  private async getStepForSubmission(submissionId: string, stepId: string) {
    const submission = await this.findSubmission(submissionId);
    const step = submission.workflow.steps.find((s) => s.id === stepId);

    if (!step) {
      throw new NotFoundException('Step não encontrado nesta submissão');
    }

    if (submission.status === 'COMPLETED') {
      throw new BadRequestException('Submissão já finalizada');
    }

    return { submission, step };
  }

  async uploadFile(submissionId: string, stepId: string, file: Express.Multer.File) {
    const { submission, step } = await this.getStepForSubmission(submissionId, stepId);

    const currentUploads = submission.uploads.filter((u) => u.workflowStepId === stepId);
    const extensions = getStepAcceptedExtensions({
      acceptedExtensionsOverride: step.acceptedExtensionsOverride,
      documentType: step.documentType,
    });

    try {
      this.uploadsService.validateFile(file, {
        allowedExtensions: extensions,
        allowedMimeTypes: step.documentType.allowedMimeTypes,
        maxSizeBytes: step.documentType.maxSizeBytes,
        maxFiles: step.maxFiles,
        currentFileCount: currentUploads.length,
      });
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    const upload = await this.uploadsService.saveUpload(submissionId, stepId, file);

    return {
      id: upload.id,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
      previewUrl: this.uploadsService.getPreviewUrl(
        submissionId,
        stepId,
        upload.storedName,
      ),
    };
  }

  async removeUpload(submissionId: string, stepId: string, uploadId: string) {
    const { submission } = await this.getStepForSubmission(submissionId, stepId);

    const upload = submission.uploads.find(
      (u) => u.id === uploadId && u.workflowStepId === stepId,
    );

    if (!upload) throw new NotFoundException('Upload não encontrado');

    await this.uploadsService.removeUpload(uploadId);
    return { success: true };
  }

  async completeSubmission(id: string) {
    const submission = await this.findSubmission(id);

    if (submission.status === 'COMPLETED') {
      throw new BadRequestException('Submissão já finalizada');
    }

    const requiredSteps = submission.workflow.steps.filter((s) => s.isRequired);

    for (const step of requiredSteps) {
      const uploads = submission.uploads.filter((u) => u.workflowStepId === step.id);
      if (uploads.length === 0) {
        throw new BadRequestException(
          `O step "${step.title}" é obrigatório e ainda não possui documentos`,
        );
      }
    }

    return this.prisma.submission.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        currentStepPosition: submission.workflow.steps.length,
      },
      include: {
        workflow: true,
        uploads: true,
      },
    });
  }

  async updateCurrentStep(submissionId: string, position: number) {
    const submission = await this.findSubmission(submissionId);
    return this.prisma.submission.update({
      where: { id: submissionId },
      data: { currentStepPosition: position },
    });
  }
}
