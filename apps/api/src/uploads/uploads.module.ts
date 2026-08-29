import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { VirusScanService } from './virus-scan.service';

@Module({
  providers: [UploadsService, VirusScanService],
  exports: [UploadsService, VirusScanService],
})
export class UploadsModule {}
