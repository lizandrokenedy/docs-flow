import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface UploadValidation {
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  maxSizeBytes: number;
  maxFiles: number;
  currentFileCount: number;
}

type UploadRecord = {
  id: string;
  submissionId: string;
  workflowStepId: string;
  storedName: string;
};

@Injectable()
export class UploadsService {
  private readonly uploadDir: string;

  constructor(private readonly prisma: PrismaService) {
    this.uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  validateFile(file: Express.Multer.File, validation: UploadValidation) {
    const ext = extname(file.originalname).replace('.', '').toLowerCase();
    const allowedExts = validation.allowedExtensions.map((e) =>
      e.replace(/^\./, '').toLowerCase(),
    );

    if (!allowedExts.includes(ext)) {
      throw new Error(
        `Formato não aceito. Use: ${allowedExts.join(', ').toUpperCase()}`,
      );
    }

    if (
      validation.allowedMimeTypes.length > 0 &&
      !validation.allowedMimeTypes.includes(file.mimetype)
    ) {
      throw new Error('Tipo MIME não aceito para este documento');
    }

    if (file.size > validation.maxSizeBytes) {
      throw new Error(
        `Arquivo muito grande. Máximo: ${Math.round(validation.maxSizeBytes / (1024 * 1024))} MB`,
      );
    }

    if (validation.currentFileCount >= validation.maxFiles) {
      throw new Error(`Limite de ${validation.maxFiles} arquivo(s) atingido`);
    }
  }

  getStoragePath(submissionId: string, stepId: string, originalName: string) {
    const ext = extname(originalName).toLowerCase();
    const storedName = `${uuidv4()}${ext}`;
    const dir = join(this.uploadDir, submissionId, stepId);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return { dir, storedName, fullPath: join(dir, storedName) };
  }

  getPreviewUrl(submissionId: string, stepId: string, storedName: string) {
    return `/uploads/${submissionId}/${stepId}/${storedName}`;
  }

  async saveUpload(
    submissionId: string,
    stepId: string,
    file: Express.Multer.File,
  ) {
    const { storedName, fullPath } = this.getStoragePath(
      submissionId,
      stepId,
      file.originalname,
    );

    const { writeFileSync } = await import('fs');
    writeFileSync(fullPath, file.buffer);

    return this.prisma.stepUpload.create({
      data: {
        submissionId,
        workflowStepId: stepId,
        originalName: file.originalname,
        storedName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });
  }

  unlinkUploadFile(upload: Pick<UploadRecord, 'submissionId' | 'workflowStepId' | 'storedName'>) {
    const fullPath = join(
      this.uploadDir,
      upload.submissionId,
      upload.workflowStepId,
      upload.storedName,
    );

    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  }

  async removeUpload(uploadId: string) {
    const upload = await this.prisma.stepUpload.findUnique({ where: { id: uploadId } });
    if (!upload) return null;

    this.unlinkUploadFile(upload);
    return this.prisma.stepUpload.delete({ where: { id: uploadId } });
  }

  async removeUploadsForStep(
    stepId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const uploads = await client.stepUpload.findMany({ where: { workflowStepId: stepId } });

    for (const upload of uploads) {
      this.unlinkUploadFile(upload);
      await client.stepUpload.delete({ where: { id: upload.id } });
    }
  }

  async removeSubmissionStorage(submissionId: string) {
    const submissionDir = join(this.uploadDir, submissionId);
    const { existsSync: dirExists } = await import('fs');
    if (!dirExists(submissionDir)) {
      return;
    }

    const { rm } = await import('fs/promises');
    await rm(submissionDir, { recursive: true, force: true });
  }
}
