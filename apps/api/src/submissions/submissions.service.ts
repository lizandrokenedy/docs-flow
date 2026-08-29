import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getStepAcceptedExtensions } from '@docs-flow/types';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  VirusScanFailedError,
  VirusScanService,
} from '../uploads/virus-scan.service';
import {
  CreateSubmissionDto,
  SaveStepAnswerDto,
  UpdateSubmissionBranchDto,
} from './dto/submission.dto';
import {
  buildWorkflowSnapshot,
  getSubmissionBranchOptions,
  getSubmissionVisibleSteps,
  resolveSubmissionWorkflow,
} from './submission-workflow.util';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
    private readonly virusScanService: VirusScanService,
  ) {}

  private readonly submissionInclude = {
    workflow: {
      include: {
        steps: {
          orderBy: { position: 'asc' as const },
          include: { documentType: true },
        },
      },
    },
    uploads: true,
    answers: true,
  };

  private formatSubmission<T extends Record<string, unknown>>(submission: T) {
    return {
      ...submission,
      workflow: resolveSubmissionWorkflow(submission as never),
    };
  }

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

  async createSubmission(slug: string, dto: CreateSubmissionDto = {}) {
    const workflow = await this.findPublicWorkflow(slug);
    const branchOptions = getSubmissionBranchOptions({
      workflowSnapshot: null,
      workflow: workflow as never,
    });

    if (branchOptions.length > 0) {
      if (!dto.branchKey) {
        throw new BadRequestException('Selecione o perfil para iniciar este fluxo');
      }
      if (!branchOptions.includes(dto.branchKey)) {
        throw new BadRequestException('Perfil inválido para este workflow');
      }
    }

    const snapshot = buildWorkflowSnapshot(workflow as never);

    const submission = await this.prisma.submission.create({
      data: {
        workflowId: workflow.id,
        status: 'IN_PROGRESS',
        branchKey: dto.branchKey ?? null,
        workflowSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        currentStepPosition: 0,
      },
      include: this.submissionInclude,
    });

    return this.formatSubmission(submission);
  }

  async findSubmission(id: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: this.submissionInclude,
    });

    if (!submission) throw new NotFoundException('Submissão não encontrada');
    return this.formatSubmission(submission);
  }

  async findAllSubmissions() {
    const submissions = await this.prisma.submission.findMany({
      include: {
        workflow: { select: { id: true, name: true, slug: true } },
        uploads: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    return submissions;
  }

  private async getStepForSubmission(submissionId: string, stepId: string) {
    const submission = await this.findSubmission(submissionId);
    const visibleSteps = getSubmissionVisibleSteps(submission as never);
    const step = visibleSteps.find((item) => item.id === stepId);

    if (!step) {
      throw new NotFoundException('Step não encontrado ou indisponível nesta submissão');
    }

    if (submission.status === 'COMPLETED') {
      throw new BadRequestException('Submissão já finalizada');
    }

    return { submission, step, visibleSteps };
  }

  async setBranch(submissionId: string, dto: UpdateSubmissionBranchDto) {
    const submission = await this.findSubmission(submissionId);
    if (submission.status === 'COMPLETED') {
      throw new BadRequestException('Submissão já finalizada');
    }

    const branchOptions = getSubmissionBranchOptions(submission as never);
    if (!branchOptions.includes(dto.branchKey)) {
      throw new BadRequestException('Perfil inválido para este workflow');
    }

    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: { branchKey: dto.branchKey, currentStepPosition: 0 },
      include: this.submissionInclude,
    });

    return this.formatSubmission(updated);
  }

  async saveStepAnswer(submissionId: string, stepId: string, dto: SaveStepAnswerDto) {
    const { submission, step } = await this.getStepForSubmission(submissionId, stepId);

    if (step.stepKind !== 'CHOICE') {
      throw new BadRequestException('Esta etapa não aceita resposta de escolha');
    }

    if (!step.choiceOptions.includes(dto.value)) {
      throw new BadRequestException('Opção inválida para esta etapa');
    }

    await this.prisma.submissionAnswer.upsert({
      where: {
        submissionId_workflowStepId: {
          submissionId,
          workflowStepId: stepId,
        },
      },
      create: {
        submissionId,
        workflowStepId: stepId,
        value: dto.value,
      },
      update: {
        value: dto.value,
      },
    });

    return this.findSubmission(submission.id);
  }

  async uploadFile(submissionId: string, stepId: string, file: Express.Multer.File) {
    const { submission, step } = await this.getStepForSubmission(submissionId, stepId);

    if (step.stepKind === 'CHOICE') {
      throw new BadRequestException('Esta etapa é de escolha e não aceita upload de arquivo');
    }

    const currentUploads = submission.uploads.filter((upload) => upload.workflowStepId === stepId);
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

    try {
      await this.virusScanService.scanBuffer(file.buffer);
    } catch (error) {
      if (error instanceof VirusScanFailedError) {
        if (error.code === 'UNAVAILABLE') {
          throw new ServiceUnavailableException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw error;
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
      (item) => item.id === uploadId && item.workflowStepId === stepId,
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

    const visibleSteps = getSubmissionVisibleSteps(submission as never);

    for (const step of visibleSteps.filter((item) => item.isRequired)) {
      if (step.stepKind === 'CHOICE') {
        const answer = submission.answers?.find((item) => item.workflowStepId === step.id);
        if (!answer?.value) {
          throw new BadRequestException(
            `A etapa "${step.title}" é obrigatória e ainda não foi respondida`,
          );
        }
        continue;
      }

      const uploads = submission.uploads.filter((upload) => upload.workflowStepId === step.id);
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
        currentStepPosition: visibleSteps.length,
      },
      include: this.submissionInclude,
    }).then((result) => this.formatSubmission(result));
  }

  async updateCurrentStep(submissionId: string, position: number) {
    const submission = await this.findSubmission(submissionId);
    const visibleSteps = getSubmissionVisibleSteps(submission as never);

    if (position < 0 || position > visibleSteps.length) {
      throw new BadRequestException('Posição de etapa inválida');
    }

    return this.prisma.submission.update({
      where: { id: submissionId },
      data: { currentStepPosition: position },
    });
  }
}
