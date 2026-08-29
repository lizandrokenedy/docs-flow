import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateWorkflowDto,
  CreateWorkflowStepDto,
  DuplicateWorkflowDto,
  ReorderStepsDto,
  UpdateWorkflowDto,
  UpdateWorkflowStepDto,
} from './dto/workflow.dto';
import { WorkflowsService } from './workflows.service';

@ApiTags('workflows')
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly service: WorkflowsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('templates')
  findTemplates() {
    return this.service.findTemplates();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateWorkflowDto) {
    return this.service.create(dto);
  }

  @Post('from-template/:templateId')
  createFromTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: DuplicateWorkflowDto,
  ) {
    return this.service.createFromTemplate(templateId, dto);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Body() dto: DuplicateWorkflowDto) {
    return this.service.duplicate(id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/steps')
  addStep(@Param('id') id: string, @Body() dto: CreateWorkflowStepDto) {
    return this.service.addStep(id, dto);
  }

  @Patch(':id/steps/reorder')
  reorderSteps(@Param('id') id: string, @Body() dto: ReorderStepsDto) {
    return this.service.reorderSteps(id, dto);
  }

  @Patch(':id/steps/:stepId')
  updateStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateWorkflowStepDto,
  ) {
    return this.service.updateStep(id, stepId, dto);
  }

  @Delete(':id/steps/:stepId')
  removeStep(@Param('id') id: string, @Param('stepId') stepId: string) {
    return this.service.removeStep(id, stepId);
  }
}
