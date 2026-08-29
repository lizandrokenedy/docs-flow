import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  getStepAcceptedExtensions,
  hasQuestionAnswer,
  isQuestionStep,
  normalizeQuestionAnswerValue,
  QuestionAnswerValidationError,
  validateQuestionAnswer,
  type QuestionType,
} from '@docs-flow/types';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  VirusScanFailedError,
  VirusScanService,
} from '../uploads/virus-scan.service';
import {
  CreateSubmissionDto,
  SaveStepAnswerDto,
} from './dto/submission.dto';
import {
  buildWorkflowSnapshot,
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

  async createSubmission(slug: string, _dto: CreateSubmissionDto = {}) {
    const workflow = await this.findPublicWorkflow(slug);
    const snapshot = buildWorkflowSnapshot(workflow as never);

    const submission = await this.prisma.submission.create({
      data: {
        workflowId: workflow.id,
        status: 'IN_PROGRESS',
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

  async saveStepAnswer(submissionId: string, stepId: string, dto: SaveStepAnswerDto) {
    const { submission, step } = await this.getStepForSubmission(submissionId, stepId);

    if (!isQuestionStep(step.stepKind)) {
      throw new BadRequestException('Esta etapa não aceita resposta de pergunta');
    }

    const questionType = (step.questionType ?? 'SINGLE_CHOICE') as QuestionType;
    const trimmedValue = dto.value.trim();

    if (!hasQuestionAnswer(trimmedValue)) {
      if (step.isRequired) {
        throw new BadRequestException('Resposta obrigatória');
      }

      await this.prisma.submissionAnswer.deleteMany({
        where: { submissionId, workflowStepId: stepId },
      });
      await this.cleanupHiddenBranchData(submissionId);
      return this.findSubmission(submission.id);
    }

    try {
      validateQuestionAnswer(questionType, trimmedValue, {
        choiceOptions: step.choiceOptions,
        questionConfig: step.questionConfig as never,
      });
    } catch (error) {
      if (error instanceof QuestionAnswerValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const value = normalizeQuestionAnswerValue(questionType, trimmedValue);

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
        value,
      },
      update: {
        value,
      },
    });

    await this.cleanupHiddenBranchData(submissionId);
    return this.findSubmission(submission.id);
  }

  private async cleanupHiddenBranchData(submissionId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: this.submissionInclude,
    });

    if (!submission) {
      return;
    }

    const formatted = this.formatSubmission(submission);
    const visibleStepIds = new Set(
      getSubmissionVisibleSteps(formatted as never).map((item) => item.id),
    );

    const hiddenAnswers =
      submission.answers?.filter((answer) => !visibleStepIds.has(answer.workflowStepId)) ?? [];
    if (hiddenAnswers.length > 0) {
      await this.prisma.submissionAnswer.deleteMany({
        where: { id: { in: hiddenAnswers.map((answer) => answer.id) } },
      });
    }

    const hiddenUploads =
      submission.uploads?.filter((upload) => !visibleStepIds.has(upload.workflowStepId)) ?? [];
    for (const upload of hiddenUploads) {
      await this.uploadsService.removeUpload(upload.id);
    }
  }

  async uploadFile(submissionId: string, stepId: string, file: Express.Multer.File) {
    const { submission, step } = await this.getStepForSubmission(submissionId, stepId);

    if (isQuestionStep(step.stepKind)) {
      throw new BadRequestException('Esta etapa é de pergunta e não aceita upload de arquivo');
    }

    if (!step.documentType) {
      throw new BadRequestException('Etapa de documento sem tipo de documento configurado');
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
      if (isQuestionStep(step.stepKind)) {
        const answer = submission.answers?.find((item) => item.workflowStepId === step.id);
        if (!hasQuestionAnswer(answer?.value)) {
          throw new BadRequestException(
            `A etapa "${step.title}" é obrigatória e ainda não foi respondida`,
          );
        }

        try {
          validateQuestionAnswer((step.questionType ?? 'SINGLE_CHOICE') as QuestionType, answer!.value, {
            choiceOptions: step.choiceOptions,
            questionConfig: step.questionConfig as never,
          });
        } catch (error) {
          if (error instanceof QuestionAnswerValidationError) {
            throw new BadRequestException(
              `A etapa "${step.title}": ${error.message}`,
            );
          }
          throw error;
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

  async deleteSubmission(id: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!submission) {
      throw new NotFoundException('Submissão não encontrada');
    }

    await this.prisma.submission.delete({ where: { id } });
    await this.uploadsService.removeSubmissionStorage(id);
  }
}
