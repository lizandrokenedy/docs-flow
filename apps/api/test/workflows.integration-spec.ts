import {
  addDocumentStep,
  addQuestionStep,
  createDocumentType,
  createWorkflow,
} from './helpers/factories';
import { closeTestHarness, createTestApp, http } from './helpers/test-app';

describe('DocumentTypes (integration)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestHarness(app);
  });

  it('cria, lista, atualiza e remove tipo de documento', async () => {
    const created = await createDocumentType(app, { name: 'CPF' });

    const list = await http(app).get('/document-types').expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe('CPF');

    await http(app)
      .patch(`/document-types/${created.id}`)
      .send({ description: 'Cadastro de pessoa física' })
      .expect(200);

    const detail = await http(app).get(`/document-types/${created.id}`).expect(200);
    expect(detail.body.description).toBe('Cadastro de pessoa física');

    await http(app).delete(`/document-types/${created.id}`).expect(200);

    await http(app).get(`/document-types/${created.id}`).expect(404);
  });
});

describe('Workflows (integration)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestHarness(app);
  });

  it('versiona o fluxo após submissão e reordenação', async () => {
    const docType = await createDocumentType(app);
    const workflow = await createWorkflow(app, { slug: 'versionamento' });

    const stepA = await addDocumentStep(app, workflow.id, {
      documentTypeId: docType.id,
      title: 'Etapa A',
      position: 0,
    });
    const stepB = await addDocumentStep(app, workflow.id, {
      documentTypeId: docType.id,
      title: 'Etapa B',
      position: 1,
    });

    await http(app).patch(`/workflows/${workflow.id}`).send({ isActive: true }).expect(200);

    await http(app).post('/public/workflows/versionamento/submissions').send({}).expect(201);

    await http(app)
      .patch(`/workflows/${workflow.id}/steps/reorder`)
      .send({
        steps: [
          { id: stepB.id, position: 0 },
          { id: stepA.id, position: 1 },
        ],
      })
      .expect(200);

    const workflowAfter = await http(app).get(`/workflows/${workflow.id}`).expect(200);
    expect(workflowAfter.body.version).toBe(2);

    const versions = await http(app).get(`/workflows/${workflow.id}/versions`).expect(200);
    expect(versions.body).toHaveLength(2);
    expect(versions.body[0].version).toBe(2);
    expect(versions.body[0].changes.length).toBeGreaterThan(0);
  });

  it('não versiona ao alterar apenas título da etapa', async () => {
    const docType = await createDocumentType(app);
    const workflow = await createWorkflow(app, { slug: 'titulo-apenas' });
    const step = await addDocumentStep(app, workflow.id, {
      documentTypeId: docType.id,
      title: 'Título original',
    });

    await http(app).patch(`/workflows/${workflow.id}`).send({ isActive: true }).expect(200);
    await http(app).post('/public/workflows/titulo-apenas/submissions').send({}).expect(201);

    await http(app)
      .patch(`/workflows/${workflow.id}/steps/${step.id}`)
      .send({ title: 'Título atualizado' })
      .expect(200);

    const workflowAfter = await http(app).get(`/workflows/${workflow.id}`).expect(200);
    expect(workflowAfter.body.version).toBe(1);
  });

  it('ajusta maxSelections ao número de opções ao criar MULTI_CHOICE', async () => {
    const workflow = await createWorkflow(app, { slug: 'multi-sanitizado' });

    const response = await http(app)
      .post(`/workflows/${workflow.id}/steps`)
      .send({
        stepKind: 'QUESTION',
        title: 'Multi sanitizada',
        questionType: 'MULTI_CHOICE',
        questionConfig: {
          options: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ],
          maxSelections: 3,
        },
        isRequired: true,
      })
      .expect(201);

    expect(response.body.questionConfig.maxSelections).toBe(2);
  });

  it('rejeita pergunta com menos de 2 opções', async () => {
    const workflow = await createWorkflow(app, { slug: 'multi-invalido' });

    await http(app)
      .post(`/workflows/${workflow.id}/steps`)
      .send({
        stepKind: 'QUESTION',
        title: 'Multi inválida',
        questionType: 'MULTI_CHOICE',
        questionConfig: {
          options: [{ id: 'a', label: 'A' }],
        },
        isRequired: true,
      })
      .expect(400);
  });

  it('adiciona pergunta com opções e condicional por resposta', async () => {
    const workflow = await createWorkflow(app, { slug: 'condicional' });

    const question = await addQuestionStep(app, workflow.id, {
      title: 'Tipo',
      questionType: 'SINGLE_CHOICE',
      questionConfig: {
        options: [
          { id: 'pf', label: 'PF' },
          { id: 'pj', label: 'PJ' },
        ],
      },
    });

    const docType = await createDocumentType(app);
    const conditional = await addDocumentStep(app, workflow.id, {
      documentTypeId: docType.id,
      title: 'Doc PJ',
      conditionStepId: question.id,
      conditionValue: 'PJ',
    });

    expect(conditional.id).toBeDefined();
  });

  it('lista, duplica e remove workflows', async () => {
    const workflow = await createWorkflow(app, { slug: 'crud-workflow', name: 'CRUD' });

    const list = await http(app).get('/workflows').expect(200);
    expect(list.body.some((item: { id: string }) => item.id === workflow.id)).toBe(true);

    const duplicated = await http(app)
      .post(`/workflows/${workflow.id}/duplicate`)
      .send({ name: 'Cópia', slug: 'crud-workflow-copia' })
      .expect(201);

    expect(duplicated.body.slug).toBe('crud-workflow-copia');
    expect(duplicated.body.isActive).toBe(false);

    await http(app).delete(`/workflows/${duplicated.body.id}`).expect(200);
    await http(app).get(`/workflows/${duplicated.body.id}`).expect(404);
  });

  it('rejeita ativação sem etapas e slug duplicado', async () => {
    await createWorkflow(app, { slug: 'slug-unico' });

    const empty = await createWorkflow(app, { slug: 'sem-etapas' });
    await http(app).patch(`/workflows/${empty.id}`).send({ isActive: true }).expect(400);

    await http(app)
      .post('/workflows')
      .send({ name: 'Outro', slug: 'slug-unico', description: null, isActive: false })
      .expect(409);
  });

  it('versiona ao alterar obrigatoriedade da etapa', async () => {
    const docType = await createDocumentType(app);
    const workflow = await createWorkflow(app, { slug: 'obrigatoriedade' });
    const step = await addDocumentStep(app, workflow.id, {
      documentTypeId: docType.id,
      title: 'Doc',
    });

    await http(app).patch(`/workflows/${workflow.id}`).send({ isActive: true }).expect(200);
    await http(app).post('/public/workflows/obrigatoriedade/submissions').send({}).expect(201);

    await http(app)
      .patch(`/workflows/${workflow.id}/steps/${step.id}`)
      .send({ isRequired: false })
      .expect(200);

    const workflowAfter = await http(app).get(`/workflows/${workflow.id}`).expect(200);
    expect(workflowAfter.body.version).toBe(2);
  });

  it('remove etapa e retorna detalhe de versão', async () => {
    const docType = await createDocumentType(app);
    const workflow = await createWorkflow(app, { slug: 'remover-etapa' });
    const stepA = await addDocumentStep(app, workflow.id, {
      documentTypeId: docType.id,
      title: 'A',
      position: 0,
    });
    await addDocumentStep(app, workflow.id, {
      documentTypeId: docType.id,
      title: 'B',
      position: 1,
    });

    await http(app).patch(`/workflows/${workflow.id}`).send({ isActive: true }).expect(200);
    await http(app).post('/public/workflows/remover-etapa/submissions').send({}).expect(201);

    await http(app).delete(`/workflows/${workflow.id}/steps/${stepA.id}`).expect(200);

    const version = await http(app)
      .get(`/workflows/${workflow.id}/versions/2`)
      .expect(200);

    expect(version.body.changes.some((change: { description: string }) =>
      change.description.includes('Etapa removida'),
    )).toBe(true);
  });

  it('rejeita etapa de documento sem tipo e condição inválida', async () => {
    const workflow = await createWorkflow(app, { slug: 'validacoes-step' });
    const docType = await createDocumentType(app);
    const step = await addDocumentStep(app, workflow.id, {
      documentTypeId: docType.id,
      title: 'Doc',
    });

    await http(app)
      .post(`/workflows/${workflow.id}/steps`)
      .send({
        stepKind: 'DOCUMENT',
        title: 'Sem tipo',
        isRequired: true,
      })
      .expect(400);

    await http(app)
      .post(`/workflows/${workflow.id}/steps`)
      .send({
        stepKind: 'DOCUMENT',
        title: 'Condição inválida',
        documentTypeId: docType.id,
        conditionStepId: step.id,
        conditionValue: 'Inexistente',
        isRequired: true,
      })
      .expect(400);
  });

  it('rejeita reordenação inválida', async () => {
    const docType = await createDocumentType(app);
    const workflow = await createWorkflow(app, { slug: 'reorder-invalido' });
    const step = await addDocumentStep(app, workflow.id, {
      documentTypeId: docType.id,
      title: 'Única',
    });

    await http(app)
      .patch(`/workflows/${workflow.id}/steps/reorder`)
      .send({ steps: [{ id: step.id, position: 0 }, { id: 'fake', position: 1 }] })
      .expect(400);
  });

  it('lista templates e cria workflow a partir de template', async () => {
    const template = await http(app)
      .post('/workflows')
      .send({
        name: 'Template base',
        slug: 'template-base',
        description: 'Modelo',
        isTemplate: true,
        templateCategory: 'Geral',
      })
      .expect(201);

    const templates = await http(app).get('/workflows/templates').expect(200);
    expect(templates.body.some((item: { id: string }) => item.id === template.body.id)).toBe(true);

    const created = await http(app)
      .post(`/workflows/from-template/${template.body.id}`)
      .send({ name: 'Do template', slug: 'do-template' })
      .expect(201);

    expect(created.body.isTemplate).toBe(false);
    expect(created.body.slug).toBe('do-template');
  });

  it('duplica workflow com slug automático quando já existe', async () => {
    const source = await createWorkflow(app, { slug: 'origem-dup' });
    await http(app)
      .post(`/workflows/${source.id}/duplicate`)
      .send({ slug: 'origem-dup-copia' })
      .expect(201);

    const second = await http(app)
      .post(`/workflows/${source.id}/duplicate`)
      .send({ slug: 'origem-dup-copia' })
      .expect(201);

    expect(second.body.slug).toMatch(/^origem-dup-copia-\d+$/);
  });

  it('rejeita alteração de slug com submissões e versão inválida', async () => {
    const docType = await createDocumentType(app);
    const workflow = await createWorkflow(app, { slug: 'slug-bloqueado' });
    await addDocumentStep(app, workflow.id, { documentTypeId: docType.id, title: 'Doc' });

    await http(app).patch(`/workflows/${workflow.id}`).send({ isActive: true }).expect(200);
    await http(app).post('/public/workflows/slug-bloqueado/submissions').send({}).expect(201);

    await http(app)
      .patch(`/workflows/${workflow.id}`)
      .send({ slug: 'novo-slug' })
      .expect(400);

    await http(app).get(`/workflows/${workflow.id}/versions/abc`).expect(400);
    await http(app).get(`/workflows/${workflow.id}/versions/99`).expect(404);
  });

  it('versiona ao alterar tipo da etapa e limpa dados ao trocar kind', async () => {
    const docType = await createDocumentType(app);
    const workflow = await createWorkflow(app, { slug: 'troca-kind' });

    const question = await addQuestionStep(app, workflow.id, {
      title: 'Pergunta',
      questionType: 'YES_NO',
      position: 0,
    });

    await http(app).patch(`/workflows/${workflow.id}`).send({ isActive: true }).expect(200);

    const submission = await http(app)
      .post('/public/workflows/troca-kind/submissions')
      .send({})
      .expect(201);

    await http(app)
      .patch(`/public/submissions/${submission.body.id}/steps/${question.id}/answer`)
      .send({ value: 'Sim' })
      .expect(200);

    await http(app)
      .patch(`/workflows/${workflow.id}/steps/${question.id}`)
      .send({
        stepKind: 'DOCUMENT',
        documentTypeId: docType.id,
        title: 'Virou documento',
      })
      .expect(200);

    const workflowAfter = await http(app).get(`/workflows/${workflow.id}`).expect(200);
    expect(workflowAfter.body.version).toBe(2);
  });

  it('versiona ao desativar workflow com submissões', async () => {
    const docType = await createDocumentType(app);
    const workflow = await createWorkflow(app, { slug: 'desativar' });
    await addDocumentStep(app, workflow.id, { documentTypeId: docType.id, title: 'Doc' });

    await http(app).patch(`/workflows/${workflow.id}`).send({ isActive: true }).expect(200);
    await http(app).post('/public/workflows/desativar/submissions').send({}).expect(201);

    await http(app).patch(`/workflows/${workflow.id}`).send({ isActive: false }).expect(200);

    const workflowAfter = await http(app).get(`/workflows/${workflow.id}`).expect(200);
    expect(workflowAfter.body.version).toBe(2);
    expect(workflowAfter.body.isActive).toBe(false);
  });

  it('rejeita criação a partir de workflow que não é template', async () => {
    const workflow = await createWorkflow(app, { slug: 'nao-template' });

    await http(app)
      .post(`/workflows/from-template/${workflow.id}`)
      .send({ name: 'Falha', slug: 'falha-template' })
      .expect(400);
  });

  it('rejeita reordenação com posições não contínuas', async () => {
    const docType = await createDocumentType(app);
    const workflow = await createWorkflow(app, { slug: 'posicoes-invalidas' });
    const stepA = await addDocumentStep(app, workflow.id, {
      documentTypeId: docType.id,
      title: 'A',
      position: 0,
    });
    const stepB = await addDocumentStep(app, workflow.id, {
      documentTypeId: docType.id,
      title: 'B',
      position: 1,
    });

    await http(app)
      .patch(`/workflows/${workflow.id}/steps/reorder`)
      .send({
        steps: [
          { id: stepA.id, position: 0 },
          { id: stepB.id, position: 2 },
        ],
      })
      .expect(400);
  });
});

describe('Submissions (integration)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestHarness(app);
  });

  it('executa fluxo completo com pergunta, upload e finalização', async () => {
    const docType = await createDocumentType(app);
    const workflow = await createWorkflow(app, { slug: 'fluxo-completo' });

    const question = await addQuestionStep(app, workflow.id, {
      title: 'Confirma?',
      questionType: 'YES_NO',
      position: 0,
    });

    const documentStep = await addDocumentStep(app, workflow.id, {
      documentTypeId: docType.id,
      title: 'Envie o RG',
      position: 1,
      conditionStepId: question.id,
    });

    await http(app).patch(`/workflows/${workflow.id}`).send({ isActive: true }).expect(200);

    const submissionRes = await http(app)
      .post('/public/workflows/fluxo-completo/submissions')
      .send({})
      .expect(201);

    const submissionId = submissionRes.body.id as string;

    await http(app)
      .patch(`/public/submissions/${submissionId}/steps/${question.id}/answer`)
      .send({ value: 'Sim' })
      .expect(200);

    await http(app)
      .post(`/public/submissions/${submissionId}/steps/${documentStep.id}/upload`)
      .attach('file', Buffer.from('%PDF-1.4 test'), {
        filename: 'rg.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const completed = await http(app)
      .post(`/public/submissions/${submissionId}/complete`)
      .expect(201);

    expect(completed.body.status).toBe('COMPLETED');
    expect(completed.body.completedAt).toBeTruthy();
  });

  it('valida MULTI_CHOICE com limites de seleção', async () => {
    const workflow = await createWorkflow(app, { slug: 'multi-choice' });

    const question = await addQuestionStep(app, workflow.id, {
      title: 'Selecione',
      questionType: 'MULTI_CHOICE',
      questionConfig: {
        options: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        minSelections: 2,
        maxSelections: 2,
      },
    });

    await http(app).patch(`/workflows/${workflow.id}`).send({ isActive: true }).expect(200);

    const submission = await http(app)
      .post('/public/workflows/multi-choice/submissions')
      .send({})
      .expect(201);

    await http(app)
      .patch(`/public/submissions/${submission.body.id}/steps/${question.id}/answer`)
      .send({ value: '["A"]' })
      .expect(400);

    await http(app)
      .patch(`/public/submissions/${submission.body.id}/steps/${question.id}/answer`)
      .send({ value: '["A","B"]' })
      .expect(200);
  });

  it('libera etapa condicional quando resposta MULTI_CHOICE inclui valor', async () => {
    const workflow = await createWorkflow(app, { slug: 'multi-condicional' });

    const question = await addQuestionStep(app, workflow.id, {
      title: 'Interesses',
      questionType: 'MULTI_CHOICE',
      questionConfig: {
        options: [
          { id: 'x', label: 'X' },
          { id: 'y', label: 'Y' },
        ],
      },
    });

    const docType = await createDocumentType(app);
    const docStep = await addDocumentStep(app, workflow.id, {
      documentTypeId: docType.id,
      title: 'Doc X',
      position: 1,
      conditionStepId: question.id,
      conditionValue: 'X',
    });

    await http(app).patch(`/workflows/${workflow.id}`).send({ isActive: true }).expect(200);

    const submission = await http(app)
      .post('/public/workflows/multi-condicional/submissions')
      .send({})
      .expect(201);

    await http(app)
      .post(`/public/submissions/${submission.body.id}/steps/${docStep.id}/upload`)
      .attach('file', Buffer.from('%PDF-1.4 test'), {
        filename: 'doc.pdf',
        contentType: 'application/pdf',
      })
      .expect(404);

    await http(app)
      .patch(`/public/submissions/${submission.body.id}/steps/${question.id}/answer`)
      .send({ value: '["X"]' })
      .expect(200);

    await http(app)
      .post(`/public/submissions/${submission.body.id}/steps/${docStep.id}/upload`)
      .attach('file', Buffer.from('%PDF-1.4 test'), {
        filename: 'doc.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
  });

  it('rejeita workflow inativo e finalização incompleta', async () => {
    const workflow = await createWorkflow(app, { slug: 'inativo', isActive: false });
    await addQuestionStep(app, workflow.id, {
      title: 'Nome',
      questionType: 'TEXT',
    });

    await http(app).post('/public/workflows/inativo/submissions').send({}).expect(404);

    const active = await createWorkflow(app, { slug: 'incompleto' });
    const question = await addQuestionStep(app, active.id, {
      title: 'Obrigatória',
      questionType: 'TEXT',
    });
    await http(app).patch(`/workflows/${active.id}`).send({ isActive: true }).expect(200);

    const submission = await http(app)
      .post('/public/workflows/incompleto/submissions')
      .send({})
      .expect(201);

    await http(app)
      .post(`/public/submissions/${submission.body.id}/complete`)
      .expect(400);

    await http(app)
      .patch(`/public/submissions/${submission.body.id}/steps/${question.id}/answer`)
      .send({ value: 'Resposta' })
      .expect(200);

    await http(app)
      .post(`/public/submissions/${submission.body.id}/complete`)
      .expect(201);
  });

  it('valida perguntas TEXT, NUMBER e DATE', async () => {
    const workflow = await createWorkflow(app, { slug: 'tipos-livres' });

    const text = await addQuestionStep(app, workflow.id, {
      title: 'Texto',
      questionType: 'TEXT',
      questionConfig: { minLength: 3, maxLength: 10 },
      position: 0,
    });
    const number = await addQuestionStep(app, workflow.id, {
      title: 'Número',
      questionType: 'NUMBER',
      questionConfig: { min: 10, max: 20 },
      position: 1,
    });
    const date = await addQuestionStep(app, workflow.id, {
      title: 'Data',
      questionType: 'DATE',
      position: 2,
    });

    await http(app).patch(`/workflows/${workflow.id}`).send({ isActive: true }).expect(200);

    const submission = await http(app)
      .post('/public/workflows/tipos-livres/submissions')
      .send({})
      .expect(201);

    const submissionId = submission.body.id as string;

    await http(app)
      .patch(`/public/submissions/${submissionId}/steps/${text.id}/answer`)
      .send({ value: 'ab' })
      .expect(400);

    await http(app)
      .patch(`/public/submissions/${submissionId}/steps/${number.id}/answer`)
      .send({ value: '5' })
      .expect(400);

    await http(app)
      .patch(`/public/submissions/${submissionId}/steps/${date.id}/answer`)
      .send({ value: '2024-13-01' })
      .expect(400);

    await http(app)
      .patch(`/public/submissions/${submissionId}/steps/${text.id}/answer`)
      .send({ value: 'válido' })
      .expect(200);

    await http(app)
      .patch(`/public/submissions/${submissionId}/steps/${number.id}/answer`)
      .send({ value: '15' })
      .expect(200);

    await http(app)
      .patch(`/public/submissions/${submissionId}/steps/${date.id}/answer`)
      .send({ value: '2024-02-29' })
      .expect(200);
  });

  it('lista, remove upload e exclui submissão', async () => {
    const docType = await createDocumentType(app);
    const workflow = await createWorkflow(app, { slug: 'admin-submissions' });
    const step = await addDocumentStep(app, workflow.id, {
      documentTypeId: docType.id,
      title: 'Doc',
    });

    await http(app).patch(`/workflows/${workflow.id}`).send({ isActive: true }).expect(200);

    const submission = await http(app)
      .post('/public/workflows/admin-submissions/submissions')
      .send({})
      .expect(201);

    const upload = await http(app)
      .post(`/public/submissions/${submission.body.id}/steps/${step.id}/upload`)
      .attach('file', Buffer.from('%PDF-1.4 test'), {
        filename: 'doc.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const list = await http(app).get('/submissions').expect(200);
    expect(list.body.some((item: { id: string }) => item.id === submission.body.id)).toBe(true);

    await http(app)
      .delete(
        `/public/submissions/${submission.body.id}/steps/${step.id}/uploads/${upload.body.id}`,
      )
      .expect(200);

    await http(app).delete(`/submissions/${submission.body.id}`).expect(204);
    await http(app).get(`/submissions/${submission.body.id}`).expect(404);
  });
});
