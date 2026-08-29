import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

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
      include: {
        steps: { orderBy: { position: 'asc' }, include: { documentType: true } },
        _count: { select: { submissions: true } },
      },
    });
    if (!workflow) throw new NotFoundException('Workflow não encontrado');
    return workflow;
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

    const shouldBumpVersion = workflow._count.submissions > 0 && Object.keys(dto).length > 0;

    return this.prisma.workflow.update({
      where: { id },
      data: {
        ...dto,
        ...(shouldBumpVersion ? { version: { increment: 1 } } : {}),
      },
      include: {
        steps: { orderBy: { position: 'asc' }, include: { documentType: true } },
      },
    });
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
            branchKey: step.branchKey,
            conditionStepId: null,
            conditionValue: step.conditionValue,
            choiceOptions: step.choiceOptions,
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
      if (conditionStep.stepKind !== 'CHOICE') {
        throw new BadRequestException(
          'Valor de condição só é permitido para etapas de escolha anteriores',
        );
      }

      if (!conditionStep.choiceOptions.includes(value)) {
        throw new BadRequestException(
          'O valor da condição deve corresponder a uma opção da etapa de escolha',
        );
      }
    }
  }

  private buildStepUpdateData(dto: UpdateWorkflowStepDto): Prisma.WorkflowStepUncheckedUpdateInput {
    const data: Prisma.WorkflowStepUncheckedUpdateInput = {};

    if (dto.documentTypeId !== undefined) data.documentTypeId = dto.documentTypeId;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.instructions !== undefined) data.instructions = dto.instructions;
    if (dto.helpText !== undefined) data.helpText = dto.helpText;
    if (dto.exampleUrl !== undefined) data.exampleUrl = dto.exampleUrl || null;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.stepKind !== undefined) data.stepKind = dto.stepKind;
    if (dto.branchKey !== undefined) data.branchKey = dto.branchKey?.trim() || null;
    if (dto.conditionStepId !== undefined) data.conditionStepId = dto.conditionStepId;
    if (dto.conditionValue !== undefined) {
      data.conditionValue = dto.conditionValue?.trim() || null;
    }
    if (dto.choiceOptions !== undefined) data.choiceOptions = dto.choiceOptions;
    if (dto.isRequired !== undefined) data.isRequired = dto.isRequired;
    if (dto.maxFiles !== undefined) data.maxFiles = dto.maxFiles;
    if (dto.acceptedExtensionsOverride !== undefined) {
      data.acceptedExtensionsOverride = dto.acceptedExtensionsOverride;
    }

    return data;
  }

  private buildStepData(dto: CreateWorkflowStepDto | UpdateWorkflowStepDto) {
    return {
      documentTypeId: dto.documentTypeId,
      title: dto.title,
      instructions: dto.instructions,
      helpText: dto.helpText,
      exampleUrl: dto.exampleUrl === undefined ? undefined : dto.exampleUrl || null,
      position: dto.position,
      stepKind: dto.stepKind,
      branchKey: dto.branchKey?.trim() || null,
      conditionStepId: dto.conditionStepId || null,
      conditionValue: dto.conditionValue?.trim() || null,
      choiceOptions: dto.choiceOptions ?? [],
      isRequired: dto.isRequired,
      maxFiles: dto.maxFiles,
      acceptedExtensionsOverride: dto.acceptedExtensionsOverride,
    };
  }

  async addStep(workflowId: string, dto: CreateWorkflowStepDto) {
    await this.findOne(workflowId);

    if (dto.stepKind === 'CHOICE' && (!dto.choiceOptions || dto.choiceOptions.length < 2)) {
      throw new BadRequestException('Etapas de escolha precisam de ao menos 2 opções');
    }

    const position =
      dto.position ?? (await this.prisma.workflowStep.count({ where: { workflowId } }));

    await this.validateStepCondition(
      workflowId,
      position,
      undefined,
      dto.conditionStepId,
      dto.conditionValue,
    );

    return this.prisma.workflowStep.create({
      data: {
        workflowId,
        ...this.buildStepData(dto),
        position,
        isRequired: dto.isRequired ?? true,
        maxFiles: dto.maxFiles ?? 1,
        acceptedExtensionsOverride: dto.acceptedExtensionsOverride ?? [],
        stepKind: dto.stepKind ?? 'DOCUMENT',
        choiceOptions: dto.choiceOptions ?? [],
      } as Prisma.WorkflowStepUncheckedCreateInput,
      include: { documentType: true },
    });
  }

  async updateStep(workflowId: string, stepId: string, dto: UpdateWorkflowStepDto) {
    const step = await this.prisma.workflowStep.findFirst({
      where: { id: stepId, workflowId },
    });
    if (!step) throw new NotFoundException('Step não encontrado');

    const nextStepKind = dto.stepKind ?? step.stepKind;
    const nextChoiceOptions = dto.choiceOptions ?? step.choiceOptions;
    if (nextStepKind === 'CHOICE' && nextChoiceOptions.length < 2) {
      throw new BadRequestException('Etapas de escolha precisam de ao menos 2 opções');
    }

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

    return this.prisma.workflowStep.update({
      where: { id: stepId },
      data: this.buildStepUpdateData(dto),
      include: { documentType: true },
    });
  }

  private async sanitizeStepConditions(workflowId: string): Promise<number> {
    const steps = await this.prisma.workflowStep.findMany({
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

      await this.prisma.workflowStep.update({
        where: { id: step.id },
        data: { conditionStepId: null, conditionValue: null },
      });
      cleared += 1;
    }

    return cleared;
  }

  private async reassignStepPositions(
    workflowId: string,
    assignments: Array<{ id: string; position: number }>,
  ) {
    const tempOffset = assignments.length + 1000;

    await this.prisma.$transaction(async (tx) => {
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
    });
  }

  async removeStep(workflowId: string, stepId: string) {
    const step = await this.prisma.workflowStep.findFirst({
      where: { id: stepId, workflowId },
    });
    if (!step) throw new NotFoundException('Step não encontrado');

    await this.prisma.workflowStep.updateMany({
      where: { workflowId, conditionStepId: stepId },
      data: { conditionStepId: null, conditionValue: null },
    });

    await this.prisma.workflowStep.delete({ where: { id: stepId } });

    const remaining = await this.prisma.workflowStep.findMany({
      where: { workflowId },
      orderBy: { position: 'asc' },
    });

    await this.reassignStepPositions(
      workflowId,
      remaining.map((item, index) => ({ id: item.id, position: index })),
    );

    return { success: true };
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

    // Duas fases evitam conflito na unique (workflowId, position) ao trocar ordens.
    await this.reassignStepPositions(workflowId, dto.steps);

    const clearedConditions = await this.sanitizeStepConditions(workflowId);
    const workflow = await this.findOne(workflowId);

    return { ...workflow, clearedConditions };
  }
}
