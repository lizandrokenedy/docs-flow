import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { diffWorkflowSnapshots, type WorkflowSnapshot } from '@docs-flow/types';
import {
  countQuestionOptions,
  getChoiceOptionLabels,
  isQuestionStep,
  normalizeQuestionStepInput,
  normalizeStepKind,
  QuestionConfigSchema,
  assertQuestionConfigForType,
  isImplementedQuestionType,
  QuestionConfigValidationError,
  requiresQuestionOptions,
  sanitizeQuestionConfig,
  type QuestionConfig,
  type StepKindInput,
} from '@docs-flow/types';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { buildWorkflowSnapshot } from './workflow-snapshot.util';
import {
  CreateWorkflowDto,
  CreateWorkflowStepDto,
  DuplicateWorkflowDto,
  ReorderStepsDto,
  UpdateWorkflowDto,
  UpdateWorkflowStepDto,
} from './dto/workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  private readonly workflowInclude = {
    steps: { orderBy: { position: 'asc' as const }, include: { documentType: true } },
    _count: { select: { submissions: true } },
  };

  private async loadWorkflowForSnapshot(workflowId: string) {
    return this.prisma.workflow.findUniqueOrThrow({
      where: { id: workflowId },
      include: this.workflowInclude,
    });
  }

  private async withVersionArchive<T>(
    workflowId: string,
    changeLabel: string,
    mutate: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const workflow = await this.loadWorkflowForSnapshot(workflowId);

    if (workflow._count.submissions === 0) {
      return mutate(this.prisma);
    }

    const snapshot = buildWorkflowSnapshot(workflow);

    return this.prisma.$transaction(async (tx) => {
      await tx.workflowVersion.upsert({
        where: {
          workflowId_version: { workflowId, version: workflow.version },
        },
        create: {
          workflowId,
          version: workflow.version,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
          changeLabel,
        },
        update: {
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
          changeLabel,
        },
      });
      await tx.workflow.update({
        where: { id: workflowId },
        data: { version: { increment: 1 } },
      });
      return mutate(tx);
    });
  }

  findAll() {
    return this.prisma.workflow.findMany({
      where: { isTemplate: false },
      include: {
        steps: { orderBy: { position: 'asc' }, include: { documentType: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findTemplates() {
    return this.prisma.workflow.findMany({
      where: { isTemplate: true },
      include: {
        steps: { orderBy: { position: 'asc' }, include: { documentType: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: [{ templateCategory: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: this.workflowInclude,
    });
    if (!workflow) throw new NotFoundException('Workflow não encontrado');
    return workflow;
  }

  private isFlowAffectingWorkflowUpdate(
    dto: UpdateWorkflowDto,
    existing: { isActive: boolean },
  ): boolean {
    return dto.isActive !== undefined && dto.isActive !== existing.isActive;
  }

  private normalizeQuestionConfigForCompare(
    questionType: string | null,
    value: unknown,
  ): string {
    if (value === undefined || value === null) {
      return 'null';
    }

    const parsed = QuestionConfigSchema.safeParse(value);
    if (!parsed.success) {
      return JSON.stringify(value);
    }

    const sanitized = sanitizeQuestionConfig(
      (questionType ?? 'TEXT') as never,
      parsed.data,
      countQuestionOptions(parsed.data),
    );

    return JSON.stringify(sanitized ?? null);
  }

  private normalizeExtensionsForCompare(value: string[] | null | undefined): string {
    return JSON.stringify([...(value ?? [])].sort());
  }

  private isFlowAffectingStepUpdate(
    dto: UpdateWorkflowStepDto,
    existing: {
      stepKind: string;
      questionType: string | null;
      questionConfig: unknown;
      documentTypeId: string | null;
      conditionStepId: string | null;
      conditionValue: string | null;
      isRequired: boolean;
      maxFiles: number;
      acceptedExtensionsOverride: string[];
      position: number;
    },
  ): boolean {
    const nextQuestionType =
      dto.questionType !== undefined ? dto.questionType ?? null : existing.questionType;

    if (dto.documentTypeId !== undefined && dto.documentTypeId !== existing.documentTypeId) {
      return true;
    }

    if (
      dto.stepKind !== undefined &&
      normalizeStepKind(dto.stepKind) !== normalizeStepKind(existing.stepKind as StepKindInput)
    ) {
      return true;
    }

    if (dto.questionType !== undefined && (dto.questionType ?? null) !== existing.questionType) {
      return true;
    }

    if (dto.questionConfig !== undefined) {
      const before = this.normalizeQuestionConfigForCompare(
        existing.questionType,
        existing.questionConfig,
      );
      const after = this.normalizeQuestionConfigForCompare(nextQuestionType, dto.questionConfig);
      if (before !== after) {
        return true;
      }
    }

    if (
      dto.conditionStepId !== undefined &&
      (dto.conditionStepId ?? null) !== existing.conditionStepId
    ) {
      return true;
    }

    if (dto.conditionValue !== undefined) {
      const nextValue = dto.conditionValue?.trim() || null;
      const prevValue = existing.conditionValue?.trim() || null;
      if (nextValue !== prevValue) {
        return true;
      }
    }

    if (dto.isRequired !== undefined && dto.isRequired !== existing.isRequired) {
      return true;
    }

    if (dto.maxFiles !== undefined && dto.maxFiles !== existing.maxFiles) {
      return true;
    }

    if (dto.acceptedExtensionsOverride !== undefined) {
      if (
        this.normalizeExtensionsForCompare(dto.acceptedExtensionsOverride) !==
        this.normalizeExtensionsForCompare(existing.acceptedExtensionsOverride)
      ) {
        return true;
      }
    }

    if (dto.position !== undefined && dto.position !== existing.position) {
      return true;
    }

    return false;
  }

  private parseQuestionConfig(
    value: unknown,
    questionType?: string | null,
  ): QuestionConfig | null {
    if (value === undefined || value === null) {
      return null;
    }

    const parsed = QuestionConfigSchema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException('Configuração da pergunta inválida');
    }

    if (!questionType) {
      return parsed.data;
    }

    const optionCount = countQuestionOptions(parsed.data);
    const sanitized = sanitizeQuestionConfig(questionType as never, parsed.data, optionCount);

    try {
      assertQuestionConfigForType(questionType as never, sanitized, optionCount);
    } catch (error) {
      if (error instanceof QuestionConfigValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    return sanitized;
  }

  private resolveNormalizedStepFields(
    existing: {
      stepKind: StepKindInput;
      questionType: string | null;
      questionConfig: unknown;
    },
    dto: CreateWorkflowStepDto | UpdateWorkflowStepDto,
  ) {
    return normalizeQuestionStepInput({
      stepKind: (dto.stepKind ?? existing.stepKind) as StepKindInput,
      questionType: (dto.questionType ?? existing.questionType) as never,
      questionConfig:
        dto.questionConfig !== undefined
          ? this.parseQuestionConfig(
              dto.questionConfig,
              dto.questionType ?? existing.questionType,
            )
          : this.parseQuestionConfig(existing.questionConfig, existing.questionType),
    });
  }

  private assertQuestionStepIsValid(normalized: ReturnType<typeof normalizeQuestionStepInput>) {
    if (normalized.stepKind !== 'QUESTION') {
      return;
    }

    if (
      requiresQuestionOptions(normalized.questionType) &&
      countQuestionOptions(normalized.questionConfig) < 2
    ) {
      throw new BadRequestException('Perguntas com opções precisam de ao menos 2 alternativas');
    }

    if (normalized.questionType) {
      if (!isImplementedQuestionType(normalized.questionType)) {
        throw new BadRequestException('Múltipla escolha ainda não está disponível');
      }
      assertQuestionConfigForType(
        normalized.questionType,
        normalized.questionConfig,
        countQuestionOptions(normalized.questionConfig),
      );
    }
  }

  private assertDocumentStepIsValid(
    normalized: ReturnType<typeof normalizeQuestionStepInput>,
    documentTypeId?: string | null,
  ) {
    if (normalized.stepKind !== 'DOCUMENT') {
      return;
    }

    if (!documentTypeId) {
      throw new BadRequestException('Etapas de documento precisam de um tipo de documento');
    }
  }

  private applyStepKindPersistence(
    normalized: ReturnType<typeof normalizeQuestionStepInput>,
    dto: CreateWorkflowStepDto | UpdateWorkflowStepDto,
  ): Prisma.WorkflowStepUncheckedUpdateInput {
    if (normalized.stepKind === 'QUESTION') {
      return {
        stepKind: 'QUESTION',
        questionType: normalized.questionType,
        questionConfig: normalized.questionConfig as Prisma.InputJsonValue,
        documentTypeId: null,
        exampleUrl: null,
        maxFiles: 1,
        acceptedExtensionsOverride: [],
      };
    }

    return {
      stepKind: 'DOCUMENT',
      questionType: null,
      questionConfig: Prisma.DbNull,
      documentTypeId: dto.documentTypeId ?? null,
      exampleUrl: dto.exampleUrl === undefined ? undefined : dto.exampleUrl || null,
      maxFiles: dto.maxFiles,
      acceptedExtensionsOverride: dto.acceptedExtensionsOverride,
    };
  }

  private async cleanupStepDataOnKindChange(
    stepId: string,
    previousKind: StepKindInput,
    nextKind: StepKindInput,
    tx: Prisma.TransactionClient,
  ) {
    const wasQuestion = isQuestionStep(previousKind);
    const isNextQuestion = isQuestionStep(nextKind);

    if (wasQuestion === isNextQuestion) {
      return;
    }

    if (wasQuestion) {
      await tx.submissionAnswer.deleteMany({ where: { workflowStepId: stepId } });
      return;
    }

    await this.uploadsService.removeUploadsForStep(stepId, tx);
  }

  private async getArchivedSnapshot(workflowId: string, versionNumber: number) {
    const record = await this.prisma.workflowVersion.findUnique({
      where: {
        workflowId_version: { workflowId, version: versionNumber },
      },
    });

    if (!record) return null;
    return record.snapshot as unknown as WorkflowSnapshot;
  }

  private async getSnapshotForVersion(
    workflowId: string,
    versionNumber: number,
    currentWorkflow: Awaited<ReturnType<typeof this.findOne>>,
  ) {
    if (versionNumber === currentWorkflow.version) {
      return buildWorkflowSnapshot(currentWorkflow);
    }

    const archived = await this.getArchivedSnapshot(workflowId, versionNumber);
    if (!archived) {
      throw new NotFoundException(`Versão ${versionNumber} não encontrada`);
    }

    return archived;
  }

  private async getChangesForVersion(
    workflowId: string,
    versionNumber: number,
    currentWorkflow: Awaited<ReturnType<typeof this.findOne>>,
  ) {
    if (versionNumber <= 1) {
      return { changes: [], comparedFromVersion: null, comparedToVersion: null };
    }

    const beforeSnapshot = await this.getSnapshotForVersion(
      workflowId,
      versionNumber - 1,
      currentWorkflow,
    );
    const afterSnapshot = await this.getSnapshotForVersion(
      workflowId,
      versionNumber,
      currentWorkflow,
    );

    return {
      changes: diffWorkflowSnapshots(beforeSnapshot, afterSnapshot),
      comparedFromVersion: versionNumber - 1,
      comparedToVersion: versionNumber,
    };
  }

  async findVersions(workflowId: string) {
    const workflow = await this.findOne(workflowId);
    const archived = await this.prisma.workflowVersion.findMany({
      where: { workflowId },
      orderBy: { version: 'desc' },
      select: {
        version: true,
        changeLabel: true,
        createdAt: true,
        snapshot: true,
      },
    });

    const currentSnapshot = buildWorkflowSnapshot(workflow);

    const items = await Promise.all([
      (async () => {
        const { changes } = await this.getChangesForVersion(
          workflowId,
          workflow.version,
          workflow,
        );

        return {
          version: workflow.version,
          changeLabel: changes.length > 0 ? 'Últimas alterações de fluxo' : 'Versão atual',
          createdAt: workflow.updatedAt,
          isCurrent: true,
          stepCount: workflow.steps.length,
          changes,
        };
      })(),
      ...archived
        .filter((item) => item.version !== workflow.version)
        .map(async (item) => {
          const afterSnapshot =
            item.version + 1 === workflow.version
              ? currentSnapshot
              : ((await this.getArchivedSnapshot(workflowId, item.version + 1)) ??
                currentSnapshot);

          return {
            version: item.version,
            changeLabel: item.changeLabel,
            createdAt: item.createdAt,
            isCurrent: false,
            stepCount: (item.snapshot as { steps?: unknown[] })?.steps?.length ?? null,
            changes: diffWorkflowSnapshots(
              item.snapshot as unknown as WorkflowSnapshot,
              afterSnapshot,
            ),
          };
        }),
    ]);

    const resolved = await Promise.all(items);
    return resolved.sort((a, b) => b.version - a.version);
  }

  async findVersion(workflowId: string, versionNumber: number) {
    if (!Number.isFinite(versionNumber) || versionNumber < 1) {
      throw new BadRequestException('Número de versão inválido');
    }

    const workflow = await this.findOne(workflowId);

    if (versionNumber === workflow.version) {
      const { changes, comparedFromVersion, comparedToVersion } = await this.getChangesForVersion(
        workflowId,
        workflow.version,
        workflow,
      );

      return {
        version: workflow.version,
        changeLabel: changes.length > 0 ? 'Últimas alterações de fluxo' : 'Versão atual',
        createdAt: workflow.updatedAt,
        isCurrent: true,
        changes,
        comparedFromVersion,
        comparedToVersion,
      };
    }

    const record = await this.prisma.workflowVersion.findUnique({
      where: {
        workflowId_version: { workflowId, version: versionNumber },
      },
    });

    if (!record) {
      throw new NotFoundException(`Versão ${versionNumber} não encontrada`);
    }

    const afterSnapshot =
      versionNumber + 1 === workflow.version
        ? buildWorkflowSnapshot(workflow)
        : await this.getSnapshotForVersion(workflowId, versionNumber + 1, workflow);

    return {
      version: record.version,
      changeLabel: record.changeLabel,
      createdAt: record.createdAt,
      isCurrent: false,
      changes: diffWorkflowSnapshots(
        record.snapshot as unknown as WorkflowSnapshot,
        afterSnapshot,
      ),
      comparedFromVersion: versionNumber,
      comparedToVersion:
        versionNumber + 1 === workflow.version ? workflow.version : versionNumber + 1,
    };
  }

  async create(dto: CreateWorkflowDto) {
    const existing = await this.prisma.workflow.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Slug já está em uso');

    return this.prisma.workflow.create({ data: dto });
  }

  async update(id: string, dto: UpdateWorkflowDto) {
    const workflow = await this.findOne(id);

    if (dto.slug && dto.slug !== workflow.slug) {
      const existing = await this.prisma.workflow.findUnique({ where: { slug: dto.slug } });
      if (existing) throw new ConflictException('Slug já está em uso');

      if (workflow._count.submissions > 0) {
        throw new BadRequestException(
          'Não é possível alterar o slug de um workflow com submissões existentes',
        );
      }
    }

    if (dto.isActive && workflow.steps.length === 0) {
      throw new BadRequestException('Adicione ao menos um step antes de ativar o workflow');
    }

    if (!this.isFlowAffectingWorkflowUpdate(dto, workflow)) {
      return this.prisma.workflow.update({
        where: { id },
        data: dto,
        include: {
          steps: { orderBy: { position: 'asc' }, include: { documentType: true } },
        },
      });
    }

    return this.withVersionArchive(id, 'Status do workflow alterado', (tx) =>
      tx.workflow.update({
        where: { id },
        data: dto,
        include: {
          steps: { orderBy: { position: 'asc' }, include: { documentType: true } },
        },
      }),
    );
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.workflow.delete({ where: { id } });
  }

  async duplicate(id: string, dto: DuplicateWorkflowDto = {}) {
    const source = await this.findOne(id);
    const baseSlug = dto.slug ?? `${source.slug}-copia`;
    let finalSlug = baseSlug;
    let suffix = 2;

    while (await this.prisma.workflow.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.create({
        data: {
          name: dto.name ?? `${source.name} (cópia)`,
          slug: finalSlug,
          description: source.description,
          isActive: false,
          isTemplate: false,
          templateCategory: null,
          version: 1,
        },
      });

      const stepIdMap = new Map<string, string>();

      for (const step of source.steps) {
        const created = await tx.workflowStep.create({
          data: {
            workflowId: workflow.id,
            documentTypeId: step.documentTypeId,
            title: step.title,
            instructions: step.instructions,
            helpText: step.helpText,
            exampleUrl: step.exampleUrl,
            position: step.position,
            stepKind: step.stepKind,
            questionType: step.questionType,
            questionConfig: step.questionConfig as Prisma.InputJsonValue,
            conditionStepId: null,
            conditionValue: step.conditionValue,
            isRequired: step.isRequired,
            maxFiles: step.maxFiles,
            acceptedExtensionsOverride: step.acceptedExtensionsOverride,
          },
        });
        stepIdMap.set(step.id, created.id);
      }

      for (const step of source.steps) {
        if (!step.conditionStepId) continue;
        const mappedConditionStepId = stepIdMap.get(step.conditionStepId);
        if (!mappedConditionStepId) continue;

        await tx.workflowStep.update({
          where: { id: stepIdMap.get(step.id)! },
          data: { conditionStepId: mappedConditionStepId },
        });
      }

      return tx.workflow.findUniqueOrThrow({
        where: { id: workflow.id },
        include: {
          steps: { orderBy: { position: 'asc' }, include: { documentType: true } },
          _count: { select: { submissions: true } },
        },
      });
    });
  }

  async createFromTemplate(templateId: string, dto: DuplicateWorkflowDto) {
    const template = await this.findOne(templateId);
    if (!template.isTemplate) {
      throw new BadRequestException('O workflow informado não é um template');
    }

    return this.duplicate(templateId, dto);
  }

  private async validateStepCondition(
    workflowId: string,
    stepPosition: number,
    stepId: string | undefined,
    conditionStepId?: string | null,
    conditionValue?: string | null,
  ) {
    if (!conditionStepId) {
      if (conditionValue?.trim()) {
        throw new BadRequestException('Informe a etapa de origem da condição');
      }
      return;
    }

    const conditionStep = await this.prisma.workflowStep.findFirst({
      where: { id: conditionStepId, workflowId },
    });

    if (!conditionStep) {
      throw new BadRequestException('Etapa de condição não encontrada neste workflow');
    }

    if (conditionStep.id === stepId) {
      throw new BadRequestException('Uma etapa não pode depender de si mesma');
    }

    if (conditionStep.position >= stepPosition) {
      throw new BadRequestException(
        'A condição só pode referenciar etapas anteriores na ordem do fluxo',
      );
    }

    const value = conditionValue?.trim();
    if (value) {
      if (!isQuestionStep(conditionStep.stepKind)) {
        throw new BadRequestException(
          'Valor de condição só é permitido para etapas de pergunta anteriores',
        );
      }

      const optionLabels = getChoiceOptionLabels({
        questionConfig: conditionStep.questionConfig as QuestionConfig | null,
      });

      if (!optionLabels.includes(value)) {
        throw new BadRequestException(
          'O valor da condição deve corresponder a uma opção da etapa de escolha',
        );
      }
    }
  }

  private buildStepUpdateData(
    dto: UpdateWorkflowStepDto,
    normalized?: ReturnType<typeof normalizeQuestionStepInput>,
    existingQuestionType?: string | null,
  ): Prisma.WorkflowStepUncheckedUpdateInput {
    const data: Prisma.WorkflowStepUncheckedUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.instructions !== undefined) data.instructions = dto.instructions;
    if (dto.helpText !== undefined) data.helpText = dto.helpText;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.conditionStepId !== undefined) data.conditionStepId = dto.conditionStepId;
    if (dto.conditionValue !== undefined) {
      data.conditionValue = dto.conditionValue?.trim() || null;
    }
    if (dto.isRequired !== undefined) data.isRequired = dto.isRequired;

    if (normalized) {
      Object.assign(data, this.applyStepKindPersistence(normalized, dto));
      return data;
    }

    if (dto.documentTypeId !== undefined) data.documentTypeId = dto.documentTypeId;
    if (dto.exampleUrl !== undefined) data.exampleUrl = dto.exampleUrl || null;
    if (dto.stepKind !== undefined) data.stepKind = dto.stepKind;
    if (dto.questionType !== undefined) data.questionType = dto.questionType;
    if (dto.questionConfig !== undefined) {
      data.questionConfig = this.parseQuestionConfig(
        dto.questionConfig,
        dto.questionType ?? existingQuestionType,
      ) as Prisma.InputJsonValue;
    }
    if (dto.maxFiles !== undefined) data.maxFiles = dto.maxFiles;
    if (dto.acceptedExtensionsOverride !== undefined) {
      data.acceptedExtensionsOverride = dto.acceptedExtensionsOverride;
    }

    return data;
  }

  private buildStepData(
    dto: CreateWorkflowStepDto | UpdateWorkflowStepDto,
    normalized: ReturnType<typeof normalizeQuestionStepInput>,
  ) {
    return {
      title: dto.title,
      instructions: dto.instructions,
      helpText: dto.helpText,
      position: dto.position,
      conditionStepId: dto.conditionStepId || null,
      conditionValue: dto.conditionValue?.trim() || null,
      isRequired: dto.isRequired,
      ...this.applyStepKindPersistence(normalized, dto),
    };
  }

  async addStep(workflowId: string, dto: CreateWorkflowStepDto) {
    await this.findOne(workflowId);

    const normalized = this.resolveNormalizedStepFields(
      {
        stepKind: dto.stepKind ?? 'DOCUMENT',
        questionType: dto.questionType ?? null,
        questionConfig: dto.questionConfig ?? null,
      },
      dto,
    );
    this.assertQuestionStepIsValid(normalized);
    this.assertDocumentStepIsValid(normalized, dto.documentTypeId);

    const position =
      dto.position ?? (await this.prisma.workflowStep.count({ where: { workflowId } }));

    await this.validateStepCondition(
      workflowId,
      position,
      undefined,
      dto.conditionStepId,
      dto.conditionValue,
    );

    return this.withVersionArchive(workflowId, 'Nova etapa adicionada', (tx) =>
      tx.workflowStep.create({
        data: {
          workflowId,
          ...this.buildStepData(dto, normalized),
          position,
          isRequired: dto.isRequired ?? true,
        } as Prisma.WorkflowStepUncheckedCreateInput,
        include: { documentType: true },
      }),
    );
  }

  async updateStep(workflowId: string, stepId: string, dto: UpdateWorkflowStepDto) {
    const step = await this.prisma.workflowStep.findFirst({
      where: { id: stepId, workflowId },
    });
    if (!step) throw new NotFoundException('Step não encontrado');

    const normalized = this.resolveNormalizedStepFields(step, dto);
    const appliesStepKindPersistence = dto.stepKind !== undefined;

    this.assertQuestionStepIsValid(normalized);
    if (normalized.stepKind === 'DOCUMENT') {
      this.assertDocumentStepIsValid(normalized, dto.documentTypeId ?? step.documentTypeId);
    }

    const previousKind = step.stepKind as StepKindInput;

    const nextConditionStepId =
      dto.conditionStepId === undefined ? step.conditionStepId : dto.conditionStepId;
    const nextConditionValue =
      dto.conditionValue === undefined ? step.conditionValue : dto.conditionValue;

    await this.validateStepCondition(
      workflowId,
      step.position,
      step.id,
      nextConditionStepId,
      nextConditionValue,
    );

    const updateData = this.buildStepUpdateData(
      dto,
      appliesStepKindPersistence ? normalized : undefined,
      step.questionType,
    );

    const kindChanged =
      appliesStepKindPersistence &&
      normalizeStepKind(previousKind) !== normalized.stepKind;

    const applyUpdate = async (tx: Prisma.TransactionClient) => {
      if (kindChanged) {
        await this.cleanupStepDataOnKindChange(stepId, previousKind, normalized.stepKind, tx);
      }

      return tx.workflowStep.update({
        where: { id: stepId },
        data: updateData,
        include: { documentType: true },
      });
    };

    if (
      !this.isFlowAffectingStepUpdate(dto, {
        stepKind: step.stepKind,
        questionType: step.questionType,
        questionConfig: step.questionConfig,
        documentTypeId: step.documentTypeId,
        conditionStepId: step.conditionStepId,
        conditionValue: step.conditionValue,
        isRequired: step.isRequired,
        maxFiles: step.maxFiles,
        acceptedExtensionsOverride: step.acceptedExtensionsOverride,
        position: step.position,
      })
    ) {
      return applyUpdate(this.prisma);
    }

    const conditionChanged =
      (dto.conditionStepId !== undefined &&
        (dto.conditionStepId ?? null) !== step.conditionStepId) ||
      (dto.conditionValue !== undefined &&
        (dto.conditionValue?.trim() || null) !== (step.conditionValue?.trim() || null));

    const changeLabel = conditionChanged
      ? `Condições da etapa "${step.title}" alteradas`
      : `Fluxo da etapa "${step.title}" alterado`;

    return this.withVersionArchive(workflowId, changeLabel, applyUpdate);
  }

  private async sanitizeStepConditions(
    workflowId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<number> {
    const steps = await tx.workflowStep.findMany({
      where: { workflowId },
      orderBy: { position: 'asc' },
    });
    const positionById = new Map(steps.map((step) => [step.id, step.position]));
    let cleared = 0;

    for (const step of steps) {
      if (!step.conditionStepId) continue;

      const prerequisitePosition = positionById.get(step.conditionStepId);
      const isInvalid =
        prerequisitePosition === undefined || prerequisitePosition >= step.position;

      if (!isInvalid) continue;

      await tx.workflowStep.update({
        where: { id: step.id },
        data: { conditionStepId: null, conditionValue: null },
      });
      cleared += 1;
    }

    return cleared;
  }

  private async reassignStepPositions(
    tx: Prisma.TransactionClient,
    workflowId: string,
    assignments: Array<{ id: string; position: number }>,
  ) {
    const tempOffset = assignments.length + 1000;

    for (const item of assignments) {
      await tx.workflowStep.update({
        where: { id: item.id, workflowId },
        data: { position: item.position + tempOffset },
      });
    }

    for (const item of assignments) {
      await tx.workflowStep.update({
        where: { id: item.id, workflowId },
        data: { position: item.position },
      });
    }
  }

  async removeStep(workflowId: string, stepId: string) {
    const step = await this.prisma.workflowStep.findFirst({
      where: { id: stepId, workflowId },
    });
    if (!step) throw new NotFoundException('Step não encontrado');

    return this.withVersionArchive(workflowId, `Etapa "${step.title}" removida`, async (tx) => {
      await tx.workflowStep.updateMany({
        where: { workflowId, conditionStepId: stepId },
        data: { conditionStepId: null, conditionValue: null },
      });

      await this.uploadsService.removeUploadsForStep(stepId, tx);
      await tx.workflowStep.delete({ where: { id: stepId } });

      const remaining = await tx.workflowStep.findMany({
        where: { workflowId },
        orderBy: { position: 'asc' },
      });

      await this.reassignStepPositions(
        tx,
        workflowId,
        remaining.map((item, index) => ({ id: item.id, position: index })),
      );

      return { success: true };
    });
  }

  async reorderSteps(workflowId: string, dto: ReorderStepsDto) {
    await this.findOne(workflowId);

    const steps = await this.prisma.workflowStep.findMany({ where: { workflowId } });
    const stepIds = new Set(steps.map((step) => step.id));

    if (dto.steps.length !== steps.length) {
      throw new BadRequestException('Informe a ordem de todas as etapas do workflow');
    }

    for (const item of dto.steps) {
      if (!stepIds.has(item.id)) {
        throw new BadRequestException(`Step ${item.id} não pertence a este workflow`);
      }
    }

    const positions = dto.steps.map((item) => item.position).sort((a, b) => a - b);
    const expectedPositions = steps.map((_, index) => index);
    if (positions.some((position, index) => position !== expectedPositions[index])) {
      throw new BadRequestException('As posições devem ser uma sequência contínua começando em 0');
    }

    return this.withVersionArchive(workflowId, 'Ordem das etapas alterada', async (tx) => {
      // Duas fases evitam conflito na unique (workflowId, position) ao trocar ordens.
      await this.reassignStepPositions(tx, workflowId, dto.steps);

      const clearedConditions = await this.sanitizeStepConditions(workflowId, tx);
      const workflow = await tx.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        include: this.workflowInclude,
      });

      return { ...workflow, clearedConditions };
    });
  }
}
