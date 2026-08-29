import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import {
  PublicSubmissionsController,
  SubmissionsController,
} from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [UploadsModule],
  controllers: [PublicSubmissionsController, SubmissionsController],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
