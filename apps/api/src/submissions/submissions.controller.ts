import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto, SaveStepAnswerDto } from './dto/submission.dto';

@ApiTags('public')
@Controller('public')
export class PublicSubmissionsController {
  constructor(private readonly service: SubmissionsService) {}

  @Get('workflows/:slug')
  getWorkflow(@Param('slug') slug: string) {
    return this.service.findPublicWorkflow(slug);
  }

  @Post('workflows/:slug/submissions')
  createSubmission(@Param('slug') slug: string, @Body() dto: CreateSubmissionDto) {
    return this.service.createSubmission(slug, dto);
  }

  @Get('submissions/:id')
  getSubmission(@Param('id') id: string) {
    return this.service.findSubmission(id);
  }

  @Patch('submissions/:id/step')
  updateStep(@Param('id') id: string, @Body('position') position: number) {
    return this.service.updateCurrentStep(id, position);
  }

  @Patch('submissions/:id/steps/:stepId/answer')
  saveAnswer(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: SaveStepAnswerDto,
  ) {
    return this.service.saveStepAnswer(id, stepId, dto);
  }

  @Post('submissions/:id/steps/:stepId/upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  upload(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório');
    }
    return this.service.uploadFile(id, stepId, file);
  }

  @Delete('submissions/:id/steps/:stepId/uploads/:uploadId')
  removeUpload(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Param('uploadId') uploadId: string,
  ) {
    return this.service.removeUpload(id, stepId, uploadId);
  }

  @Post('submissions/:id/complete')
  complete(@Param('id') id: string) {
    return this.service.completeSubmission(id);
  }
}

@ApiTags('submissions')
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly service: SubmissionsService) {}

  @Get()
  findAll() {
    return this.service.findAllSubmissions();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findSubmission(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.service.deleteSubmission(id);
  }
}
