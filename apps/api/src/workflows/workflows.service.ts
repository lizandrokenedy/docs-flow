import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateWorkflowDto,
  CreateWorkflowStepDto,
  ReorderStepsDto,
  UpdateWorkflowDto,
  UpdateWorkflowStepDto,
} from './dto/workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.workflow.findMany({
      include: {
        steps: { orderBy: { position: 'asc' }, include: { documentType: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { updatedAt: 'desc' },
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

    return this.prisma.workflow.update({
      where: { id },
      data: dto,
      include: {
        steps: { orderBy: { position: 'asc' }, include: { documentType: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.workflow.delete({ where: { id } });
  }

  async addStep(workflowId: string, dto: CreateWorkflowStepDto) {
    await this.findOne(workflowId);

    const position =
      dto.position ??
      (await this.prisma.workflowStep.count({ where: { workflowId } }));

    return this.prisma.workflowStep.create({
      data: {
        workflowId,
        documentTypeId: dto.documentTypeId,
        title: dto.title,
        instructions: dto.instructions,
        helpText: dto.helpText,
        exampleUrl: dto.exampleUrl || null,
        position,
        isRequired: dto.isRequired ?? true,
        maxFiles: dto.maxFiles ?? 1,
        acceptedExtensionsOverride: dto.acceptedExtensionsOverride ?? [],
      },
      include: { documentType: true },
    });
  }

  async updateStep(workflowId: string, stepId: string, dto: UpdateWorkflowStepDto) {
    const step = await this.prisma.workflowStep.findFirst({
      where: { id: stepId, workflowId },
    });
    if (!step) throw new NotFoundException('Step não encontrado');

    return this.prisma.workflowStep.update({
      where: { id: stepId },
      data: {
        ...dto,
        exampleUrl: dto.exampleUrl === undefined ? undefined : dto.exampleUrl || null,
      },
      include: { documentType: true },
    });
  }

  async removeStep(workflowId: string, stepId: string) {
    const step = await this.prisma.workflowStep.findFirst({
      where: { id: stepId, workflowId },
    });
    if (!step) throw new NotFoundException('Step não encontrado');

    await this.prisma.workflowStep.delete({ where: { id: stepId } });

    const remaining = await this.prisma.workflowStep.findMany({
      where: { workflowId },
      orderBy: { position: 'asc' },
    });

    await Promise.all(
      remaining.map((s, index) =>
        this.prisma.workflowStep.update({
          where: { id: s.id },
          data: { position: index },
        }),
      ),
    );

    return { success: true };
  }

  async reorderSteps(workflowId: string, dto: ReorderStepsDto) {
    await this.findOne(workflowId);

    const steps = await this.prisma.workflowStep.findMany({ where: { workflowId } });
    const stepIds = new Set(steps.map((s) => s.id));

    for (const item of dto.steps) {
      if (!stepIds.has(item.id)) {
        throw new BadRequestException(`Step ${item.id} não pertence a este workflow`);
      }
    }

    await this.prisma.$transaction(
      dto.steps.map((item) =>
        this.prisma.workflowStep.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );

    return this.findOne(workflowId);
  }
}
