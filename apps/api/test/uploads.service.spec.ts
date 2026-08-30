import { Test } from '@nestjs/testing';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { UploadsService } from '../src/uploads/uploads.service';
import { VirusScanService } from '../src/uploads/virus-scan.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { buildWorkflowSnapshot } from '../src/workflows/workflow-snapshot.util';
import { resolveSubmissionWorkflow } from '../src/submissions/submission-workflow.util';

const uploadDir = join('/tmp', `docs-flow-unit-uploads-${process.pid}`);

describe('UploadsService', () => {
  let service: UploadsService;
  let prisma: {
    stepUpload: {
      create: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    process.env.UPLOAD_DIR = uploadDir;
    rmSync(uploadDir, { recursive: true, force: true });

    prisma = {
      stepUpload: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UploadsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = moduleRef.get(UploadsService);
  });

  afterAll(() => {
    rmSync(uploadDir, { recursive: true, force: true });
  });

  it('rejeita extensão não permitida', () => {
    expect(() =>
      service.validateFile(
        {
          originalname: 'virus.exe',
          mimetype: 'application/octet-stream',
          size: 100,
        } as Express.Multer.File,
        {
          allowedExtensions: ['pdf'],
          allowedMimeTypes: ['application/pdf'],
          maxSizeBytes: 1024,
          maxFiles: 1,
          currentFileCount: 0,
        },
      ),
    ).toThrow(/Formato não aceito/);
  });

  it('rejeita MIME, tamanho e limite de arquivos', () => {
    const validation = {
      allowedExtensions: ['pdf'],
      allowedMimeTypes: ['application/pdf'],
      maxSizeBytes: 1024,
      maxFiles: 1,
      currentFileCount: 0,
    };

    expect(() =>
      service.validateFile(
        {
          originalname: 'doc.pdf',
          mimetype: 'text/plain',
          size: 100,
        } as Express.Multer.File,
        validation,
      ),
    ).toThrow(/Tipo MIME não aceito/);

    expect(() =>
      service.validateFile(
        {
          originalname: 'doc.pdf',
          mimetype: 'application/pdf',
          size: 2048,
        } as Express.Multer.File,
        validation,
      ),
    ).toThrow(/Arquivo muito grande/);

    expect(() =>
      service.validateFile(
        {
          originalname: 'doc.pdf',
          mimetype: 'application/pdf',
          size: 100,
        } as Express.Multer.File,
        { ...validation, currentFileCount: 1 },
      ),
    ).toThrow(/Limite de 1 arquivo/);
  });

  it('salva, remove upload e limpa storage da submissão', async () => {
    const file = {
      originalname: 'doc.pdf',
      mimetype: 'application/pdf',
      size: 4,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    prisma.stepUpload.create.mockResolvedValue({
      id: 'upload-1',
      submissionId: 'sub-1',
      workflowStepId: 'step-1',
      storedName: 'stored.pdf',
      originalName: 'doc.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4,
    });

    const saved = await service.saveUpload('sub-1', 'step-1', file);
    expect(saved.id).toBe('upload-1');
    expect(existsSync(join(uploadDir, 'sub-1', 'step-1'))).toBe(true);
    expect(service.getPreviewUrl('sub-1', 'step-1', 'stored.pdf')).toBe(
      '/uploads/sub-1/step-1/stored.pdf',
    );

    prisma.stepUpload.findUnique.mockResolvedValue({
      id: 'upload-1',
      submissionId: 'sub-1',
      workflowStepId: 'step-1',
      storedName: saved.storedName,
    });
    prisma.stepUpload.delete.mockResolvedValue({ id: 'upload-1' });

    await service.removeUpload('upload-1');
    expect(prisma.stepUpload.delete).toHaveBeenCalledWith({ where: { id: 'upload-1' } });

    mkdirSync(join(uploadDir, 'sub-2', 'step-1'), { recursive: true });
    writeFileSync(join(uploadDir, 'sub-2', 'step-1', 'file.pdf'), 'x');
    await service.removeSubmissionStorage('sub-2');
    expect(existsSync(join(uploadDir, 'sub-2'))).toBe(false);
  });

  it('remove todos os uploads de uma etapa', async () => {
    prisma.stepUpload.findMany.mockResolvedValue([
      {
        id: 'upload-1',
        submissionId: 'sub-1',
        workflowStepId: 'step-1',
        storedName: 'a.pdf',
      },
    ]);
    prisma.stepUpload.delete.mockResolvedValue({ id: 'upload-1' });

    mkdirSync(join(uploadDir, 'sub-1', 'step-1'), { recursive: true });
    writeFileSync(join(uploadDir, 'sub-1', 'step-1', 'a.pdf'), 'x');

    await service.removeUploadsForStep('step-1');
    expect(prisma.stepUpload.delete).toHaveBeenCalled();
  });
});

describe('VirusScanService', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.CLAMAV_ENABLED;
    delete process.env.CLAMAV_HOST;
  });

  it('ignora scan quando ClamAV está desabilitado', async () => {
    process.env.CLAMAV_ENABLED = 'false';
    const service = new VirusScanService();

    await expect(service.scanBuffer(Buffer.from('ok'))).resolves.toBeUndefined();
    expect(service.isEnabled()).toBe(false);
  });

  it('rejeita arquivo vazio quando scan está habilitado', async () => {
    jest.doMock('../src/uploads/clamav.client', () => ({
      scanBufferViaClamd: jest.fn(),
    }));

    process.env.CLAMAV_ENABLED = 'true';
    process.env.CLAMAV_HOST = '127.0.0.1';

    const { VirusScanService: EnabledScanService } = await import('../src/uploads/virus-scan.service');
    const service = new EnabledScanService();

    expect(service.isEnabled()).toBe(true);
    await expect(service.scanBuffer(Buffer.alloc(0))).rejects.toMatchObject({
      code: 'SCAN_ERROR',
    });
  });
});

describe('buildWorkflowSnapshot', () => {
  it('mapeia etapas e metadados do workflow', () => {
    const snapshot = buildWorkflowSnapshot({
      id: 'wf-1',
      name: 'Teste',
      slug: 'teste',
      description: 'desc',
      version: 1,
      steps: [
        {
          id: 'step-1',
          documentTypeId: 'doc-1',
          title: 'RG',
          instructions: null,
          helpText: null,
          exampleUrl: null,
          position: 0,
          stepKind: 'DOCUMENT',
          questionType: null,
          questionConfig: null,
          conditionStepId: null,
          conditionValue: null,
          isRequired: true,
          maxFiles: 1,
          acceptedExtensionsOverride: [],
          documentType: {
            name: 'RG',
            allowedExtensions: ['pdf'],
            allowedMimeTypes: ['application/pdf'],
            maxSizeBytes: 1000,
            icon: null,
          },
        },
      ],
    });

    expect(snapshot.workflowId).toBe('wf-1');
    expect(snapshot.steps).toHaveLength(1);
    expect(snapshot.steps[0].documentType?.name).toBe('RG');
  });
});

describe('resolveSubmissionWorkflow', () => {
  it('usa snapshot quando presente', () => {
    const workflow = {
      id: 'wf-1',
      name: 'Atual',
      slug: 'atual',
      description: null,
      version: 2,
      steps: [],
    };

    const snapshot = buildWorkflowSnapshot({
      ...workflow,
      name: 'Congelado',
      version: 1,
      steps: [
        {
          id: 'step-1',
          documentTypeId: null,
          title: 'Pergunta',
          instructions: null,
          helpText: null,
          exampleUrl: null,
          position: 0,
          stepKind: 'QUESTION',
          questionType: 'YES_NO',
          questionConfig: null,
          conditionStepId: null,
          conditionValue: null,
          isRequired: true,
          maxFiles: 1,
          acceptedExtensionsOverride: [],
          documentType: null,
        },
      ],
    });

    const resolved = resolveSubmissionWorkflow({
      workflowSnapshot: snapshot as never,
      workflow: workflow as never,
    });

    expect(resolved.name).toBe('Congelado');
    expect(resolved.steps).toHaveLength(1);
  });

  it('usa workflow atual quando não há snapshot', () => {
    const workflow = {
      id: 'wf-1',
      name: 'Atual',
      slug: 'atual',
      description: null,
      version: 1,
      steps: [],
    };

    const resolved = resolveSubmissionWorkflow({
      workflowSnapshot: null,
      workflow: workflow as never,
    });

    expect(resolved.name).toBe('Atual');
  });
});
