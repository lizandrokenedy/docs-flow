import { TestApp, http } from './test-app';

export async function createDocumentType(
  app: TestApp,
  overrides: Partial<{
    name: string;
    allowedExtensions: string[];
    allowedMimeTypes: string[];
    maxSizeBytes: number;
  }> = {},
) {
  const response = await http(app)
    .post('/document-types')
    .send({
      name: 'RG',
      description: 'Documento de identidade',
      allowedExtensions: ['pdf', 'jpg'],
      allowedMimeTypes: ['application/pdf', 'image/jpeg'],
      maxSizeBytes: 10_485_760,
      ...overrides,
    })
    .expect(201);

  return response.body as { id: string };
}

export async function createWorkflow(
  app: TestApp,
  overrides: Partial<{ name: string; slug: string; isActive: boolean }> = {},
) {
  const response = await http(app)
    .post('/workflows')
    .send({
      name: 'Fluxo de teste',
      slug: `fluxo-teste-${Date.now()}`,
      description: 'Workflow para testes',
      isActive: false,
      ...overrides,
    })
    .expect(201);

  return response.body as { id: string; slug: string };
}

export async function addDocumentStep(
  app: TestApp,
  workflowId: string,
  data: {
    documentTypeId: string;
    title: string;
    position?: number;
    conditionStepId?: string | null;
    conditionValue?: string | null;
  },
) {
  const response = await http(app)
    .post(`/workflows/${workflowId}/steps`)
    .send({
      stepKind: 'DOCUMENT',
      title: data.title,
      documentTypeId: data.documentTypeId,
      isRequired: true,
      maxFiles: 1,
      position: data.position,
      conditionStepId: data.conditionStepId ?? null,
      conditionValue: data.conditionValue ?? null,
    })
    .expect(201);

  return response.body as { id: string };
}

export async function addQuestionStep(
  app: TestApp,
  workflowId: string,
  data: {
    title: string;
    questionType: string;
    questionConfig?: Record<string, unknown>;
    position?: number;
    conditionStepId?: string | null;
    conditionValue?: string | null;
  },
) {
  const response = await http(app)
    .post(`/workflows/${workflowId}/steps`)
    .send({
      stepKind: 'QUESTION',
      title: data.title,
      questionType: data.questionType,
      questionConfig: data.questionConfig,
      isRequired: true,
      position: data.position,
      conditionStepId: data.conditionStepId ?? null,
      conditionValue: data.conditionValue ?? null,
    })
    .expect(201);

  return response.body as { id: string };
}
