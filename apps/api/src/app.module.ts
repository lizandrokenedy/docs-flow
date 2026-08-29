import { Module } from '@nestjs/common';
import { DocumentTypesModule } from './document-types/document-types.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { WorkflowsModule } from './workflows/workflows.module';

@Module({
  imports: [PrismaModule, DocumentTypesModule, WorkflowsModule, SubmissionsModule],
  controllers: [HealthController],
})
export class AppModule {}
