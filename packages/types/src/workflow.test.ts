import {
  assertQuestionConfigForType,
  buildQuestionConfig,
  countQuestionOptions,
  formatQuestionAnswerForDisplay,
  getChoiceOptionLabels,
  getEffectiveTextLengthLimits,
  getMultiChoiceConfigError,
  getMultiChoiceConfigWarning,
  getQuestionAnswerError,
  getQuestionTextLengthLimits,
  getQuestionTypeLabel,
  hasQuestionAnswer,
  isChoiceQuestionType,
  isFreeFormQuestionType,
  isImplementedQuestionType,
  isQuestionStep,
  normalizeQuestionAnswerValue,
  normalizeQuestionStepInput,
  normalizeStepKind,
  optionsFromLabels,
  parseMultiChoiceAnswer,
  QuestionAnswerValidationError,
  QuestionConfigValidationError,
  requiresQuestionOptions,
  sanitizeQuestionConfig,
  serializeMultiChoiceAnswer,
  slugifyOptionId,
  validateQuestionAnswer,
  YES_NO_OPTIONS,
} from './question';
import {
  answersToMap,
  completedStepIdsFromUploads,
  getStepLockMessage,
  getStepperSteps,
  getVisibleSteps,
  isStepShownInStepper,
  isStepVisible,
  workflowFromSnapshot,
  type WorkflowSnapshot,
} from './workflow-logic';
import { diffWorkflowSnapshots } from './workflow-version-diff';

describe('question helpers', () => {
  it('normaliza stepKind e detecta etapas de pergunta', () => {
    expect(normalizeStepKind('QUESTION')).toBe('QUESTION');
    expect(normalizeStepKind('DOCUMENT')).toBe('DOCUMENT');
    expect(normalizeStepKind(null)).toBe('DOCUMENT');
    expect(isQuestionStep('QUESTION')).toBe(true);
    expect(isQuestionStep('DOCUMENT')).toBe(false);
  });

  it('gera ids de opção a partir de rótulos', () => {
    expect(slugifyOptionId('Opção A', 0)).toBe('opcao-a');
    expect(slugifyOptionId('!!!', 2)).toBe('option-3');
    expect(optionsFromLabels(['Sim', 'Sim', 'Não'])).toEqual([
      { id: 'sim', label: 'Sim' },
      { id: 'sim-2', label: 'Sim' },
      { id: 'nao', label: 'Não' },
    ]);
  });

  it('conta opções e extrai rótulos', () => {
    const config = { options: [{ id: 'a', label: 'A' }] };
    expect(countQuestionOptions(config)).toBe(1);
    expect(getChoiceOptionLabels({ questionConfig: config })).toEqual(['A']);
    expect(getChoiceOptionLabels({})).toEqual([]);
  });

  it('classifica tipos de pergunta', () => {
    expect(requiresQuestionOptions('MULTI_CHOICE')).toBe(true);
    expect(requiresQuestionOptions('TEXT')).toBe(false);
    expect(isChoiceQuestionType('YES_NO')).toBe(true);
    expect(isFreeFormQuestionType('DATE')).toBe(true);
    expect(isImplementedQuestionType('TEXT')).toBe(true);
    expect(getQuestionTypeLabel('NUMBER')).toBe('Número');
    expect(getQuestionTypeLabel(undefined)).toBe('Pergunta');
  });

  it('monta configuração por tipo de pergunta', () => {
    expect(buildQuestionConfig('YES_NO', null)).toEqual({ options: YES_NO_OPTIONS });
    expect(
      buildQuestionConfig('TEXT', { placeholder: 'Nome', minLength: 2, maxLength: 10 }),
    ).toEqual({ placeholder: 'Nome', minLength: 2, maxLength: 10 });
    expect(
      buildQuestionConfig('MULTI_CHOICE', {
        options: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        minSelections: 1,
        maxSelections: 2,
      }),
    ).toEqual({
      options: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      minSelections: 1,
      maxSelections: 2,
    });
    expect(buildQuestionConfig('SINGLE_CHOICE', { options: [] })).toEqual({ options: [] });
    expect(buildQuestionConfig(null, { options: [] })).toBeNull();
  });

  it('retorna limites de texto por tipo', () => {
    expect(getQuestionTextLengthLimits('TEXT')?.absoluteMaxLength).toBe(255);
    expect(getQuestionTextLengthLimits('TEXTAREA')?.absoluteMaxLength).toBe(5000);
    expect(getQuestionTextLengthLimits('NUMBER')).toBeNull();
    expect(getEffectiveTextLengthLimits('TEXT', { maxLength: 500 })).toEqual({
      minLength: 0,
      maxLength: 255,
      absoluteMaxLength: 255,
      label: 'texto curto',
    });
  });
});

describe('question config validation', () => {
  it('valida erros de MULTI_CHOICE', () => {
    expect(getMultiChoiceConfigError({ minSelections: 3, maxSelections: 1 }, 2)).toMatch(
      /mínimo de seleções não pode ser maior que o máximo/,
    );
    expect(getMultiChoiceConfigError({ maxSelections: 3 }, 2)).toMatch(
      /não pode ser maior que o número de opções/,
    );
    expect(getMultiChoiceConfigError({ minSelections: 3 }, 2)).toMatch(
      /não pode ser maior que o número de opções/,
    );
    expect(getMultiChoiceConfigWarning({ minSelections: 2 }, 2)).toBeTruthy();
    expect(getMultiChoiceConfigWarning({ minSelections: 1 }, 2)).toBeNull();
  });

  it('sanitiza configurações de texto e múltipla escolha', () => {
    expect(
      sanitizeQuestionConfig('TEXT', { minLength: 0, maxLength: 9999 }),
    ).toEqual({ maxLength: 255 });

    expect(
      sanitizeQuestionConfig('TEXTAREA', { minLength: 10, maxLength: 5 }),
    ).toEqual({ minLength: 5, maxLength: 5 });

    expect(
      sanitizeQuestionConfig(
        'MULTI_CHOICE',
        { minSelections: 0, maxSelections: 5 },
        2,
      ),
    ).toEqual({ maxSelections: 2 });
  });

  it('lança erros em assertQuestionConfigForType', () => {
    expect(() =>
      assertQuestionConfigForType('TEXT', { maxLength: 300 }),
    ).toThrow(QuestionConfigValidationError);

    expect(() =>
      assertQuestionConfigForType('NUMBER', { min: 10, max: 5 }),
    ).toThrow(/valor mínimo não pode ser maior que o máximo/);

    expect(() =>
      assertQuestionConfigForType('MULTI_CHOICE', { maxSelections: 5 }, 2),
    ).toThrow(QuestionConfigValidationError);
  });
});

describe('question answers', () => {
  it('serializa, parseia e exibe respostas MULTI_CHOICE', () => {
    const serialized = serializeMultiChoiceAnswer(['B', 'A']);
    expect(parseMultiChoiceAnswer(serialized)).toEqual(['A', 'B']);
    expect(parseMultiChoiceAnswer('')).toEqual([]);
    expect(parseMultiChoiceAnswer('invalid')).toEqual([]);
    expect(parseMultiChoiceAnswer('{"not":"array"}')).toEqual([]);
    expect(formatQuestionAnswerForDisplay('MULTI_CHOICE', serialized)).toBe('A, B');
    expect(formatQuestionAnswerForDisplay('TEXT', 'Olá')).toBe('Olá');
  });

  it('normaliza e valida respostas por tipo', () => {
    expect(normalizeQuestionAnswerValue('TEXT', '  valor  ')).toBe('valor');
    expect(normalizeQuestionAnswerValue('MULTI_CHOICE', '["B","A"]')).toBe('["A","B"]');

    const step = {
      questionConfig: {
        options: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        minSelections: 2,
      },
    };

    expect(() =>
      validateQuestionAnswer('MULTI_CHOICE', '["A","B"]', step),
    ).not.toThrow();

    expect(() =>
      validateQuestionAnswer('MULTI_CHOICE', '["Z"]', step),
    ).toThrow(QuestionAnswerValidationError);

    expect(() =>
      validateQuestionAnswer('SINGLE_CHOICE', 'A', step),
    ).not.toThrow();

    expect(() =>
      validateQuestionAnswer('SINGLE_CHOICE', 'Z', step),
    ).toThrow(/Opção inválida/);

    expect(() =>
      validateQuestionAnswer('TEXT', 'ab', {
        questionConfig: { minLength: 3 },
      }),
    ).toThrow(/ao menos 3 caracteres/);

    expect(() =>
      validateQuestionAnswer('NUMBER', 'abc', { questionConfig: {} }),
    ).toThrow(/número válido/);

    expect(() =>
      validateQuestionAnswer('NUMBER', '5', { questionConfig: { min: 10 } }),
    ).toThrow(/valor mínimo é 10/);

    expect(() =>
      validateQuestionAnswer('DATE', '2024-02-30', { questionConfig: {} }),
    ).toThrow(/data válida/);

    expect(() =>
      validateQuestionAnswer('DATE', '2024-02-29', { questionConfig: {} }),
    ).not.toThrow();
  });

  it('detecta respostas vazias e mensagens de erro', () => {
    expect(hasQuestionAnswer('')).toBe(false);
    expect(hasQuestionAnswer('["A"]')).toBe(true);
    expect(hasQuestionAnswer('Sim')).toBe(true);
    expect(getQuestionAnswerError('TEXT', '', { questionConfig: {} }, true)).toBe(
      'Resposta obrigatória',
    );
    expect(getQuestionAnswerError('TEXT', '', { questionConfig: {} }, false)).toBeNull();
  });
});

describe('normalizeQuestionStepInput', () => {
  it('normaliza etapa de documento e pergunta', () => {
    expect(
      normalizeQuestionStepInput({ stepKind: 'DOCUMENT', questionType: 'TEXT' }),
    ).toEqual({
      stepKind: 'DOCUMENT',
      questionType: null,
      questionConfig: null,
    });

    expect(
      normalizeQuestionStepInput({
        stepKind: 'QUESTION',
        questionType: 'YES_NO',
      }),
    ).toEqual({
      stepKind: 'QUESTION',
      questionType: 'YES_NO',
      questionConfig: { options: YES_NO_OPTIONS },
    });
  });
});

describe('question edge cases', () => {
  it('retorna null em getMultiChoiceConfigError sem config', () => {
    expect(getMultiChoiceConfigError(null, 2)).toBeNull();
    expect(getMultiChoiceConfigWarning(null, 2)).toBeNull();
    expect(getMultiChoiceConfigWarning({ minSelections: 1 }, 1)).toBeNull();
  });

  it('sanitiza configurações irrelevantes para outros tipos', () => {
    expect(sanitizeQuestionConfig('SINGLE_CHOICE', { options: [] })).toEqual({ options: [] });
    expect(assertQuestionConfigForType('TEXT', null)).toBeUndefined();
  });

  it('valida limites máximos em respostas TEXT e NUMBER', () => {
    expect(() =>
      validateQuestionAnswer('TEXT', 'texto muito longo'.repeat(30), {
        questionConfig: { maxLength: 10 },
      }),
    ).toThrow(/no máximo/);

    expect(() =>
      validateQuestionAnswer('NUMBER', '99', { questionConfig: { max: 10 } }),
    ).toThrow(/valor máximo é 10/);

    expect(() =>
      validateQuestionAnswer('MULTI_CHOICE', '["A","B"]', {
        questionConfig: {
          options: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ],
          maxSelections: 1,
        },
      }),
    ).toThrow(/no máximo 1/);
  });

  it('retorna rótulos de todos os tipos de pergunta', () => {
    expect(getQuestionTypeLabel('SINGLE_CHOICE')).toBe('Escolha única');
    expect(getQuestionTypeLabel('SELECT')).toBe('Lista suspensa');
    expect(getQuestionTypeLabel('YES_NO')).toBe('Sim / Não');
    expect(getQuestionTypeLabel('TEXTAREA')).toBe('Texto longo');
    expect(getQuestionTypeLabel('DATE')).toBe('Data');
    expect(getQuestionTypeLabel('MULTI_CHOICE')).toBe('Múltipla escolha');
  });
});

describe('workflow-logic', () => {
  const questionStep = {
    id: 'q1',
    position: 0,
    stepKind: 'QUESTION' as const,
    questionType: 'MULTI_CHOICE',
    title: 'Interesses',
  };

  const documentStep = {
    id: 'd1',
    position: 1,
    stepKind: 'DOCUMENT' as const,
    conditionStepId: 'q1',
    conditionValue: 'A',
    title: 'Doc A',
  };

  const steps = [questionStep, documentStep];

  it('converte respostas sem mapa de tipos', () => {
    const map = answersToMap([{ workflowStepId: 'q1', value: 'Sim' }]);
    expect(map.q1).toBe('Sim');
  });

  it('oculta etapa quando pré-requisito não existe', () => {
    const orphan = {
      id: 'd1',
      position: 1,
      stepKind: 'DOCUMENT' as const,
      conditionStepId: 'missing',
      title: 'Órfã',
    };

    expect(
      isStepVisible(orphan, { answers: {}, completedStepIds: new Set() }, [orphan]),
    ).toBe(false);
  });

  it('não exibe no stepper etapas condicionais por pergunta ainda ocultas', () => {
    const steps = [
      {
        id: 'q1',
        position: 0,
        stepKind: 'QUESTION' as const,
        questionType: 'YES_NO',
        title: 'Pergunta',
      },
      {
        id: 'd1',
        position: 1,
        stepKind: 'DOCUMENT' as const,
        conditionStepId: 'q1',
        conditionValue: 'Sim',
        title: 'Condicional',
      },
    ];

    expect(
      isStepShownInStepper(steps[1], { answers: {}, completedStepIds: new Set() }, steps),
    ).toBe(false);
  });

  it('converte respostas e uploads concluídos', () => {
    const map = answersToMap(
      [{ workflowStepId: 'q1', value: '["A","B"]' }],
      steps,
    );
    expect(map.q1).toEqual(['A', 'B']);
    expect(completedStepIdsFromUploads([{ workflowStepId: 'd1' }])).toEqual(new Set(['d1']));
  });

  it('calcula visibilidade de etapas', () => {
    const visible = getVisibleSteps(steps, {
      answers: answersToMap([{ workflowStepId: 'q1', value: '["A"]' }], steps),
      completedStepIds: completedStepIdsFromUploads([]),
    });
    expect(visible.map((step) => step.id)).toEqual(['q1', 'd1']);

    const hidden = getVisibleSteps(steps, {
      answers: answersToMap([{ workflowStepId: 'q1', value: '["B"]' }], steps),
      completedStepIds: completedStepIdsFromUploads([]),
    });
    expect(hidden.map((step) => step.id)).toEqual(['q1']);
  });

  it('expõe etapas no stepper e mensagens de bloqueio', () => {
    const context = {
      answers: answersToMap([], steps),
      completedStepIds: completedStepIdsFromUploads([]),
    };

    expect(isStepVisible(documentStep, context, steps)).toBe(false);
    expect(isStepShownInStepper(documentStep, context, steps)).toBe(false);
    expect(getStepLockMessage(documentStep, steps)).toMatch(/incluir "A"/);

    const docChain = [
      { id: 'd0', position: 0, stepKind: 'DOCUMENT' as const, conditionStepId: null },
      { id: 'd1', position: 1, stepKind: 'DOCUMENT' as const, conditionStepId: 'd0' },
    ];
    expect(
      isStepShownInStepper(docChain[1], {
        answers: {},
        completedStepIds: new Set(),
      }, docChain),
    ).toBe(true);
  });

  it('monta workflow a partir de snapshot', () => {
    const snapshot: WorkflowSnapshot = {
      version: 1,
      workflowId: 'wf-1',
      name: 'Fluxo',
      slug: 'fluxo',
      capturedAt: new Date().toISOString(),
      steps: [],
    };

    expect(workflowFromSnapshot(snapshot)).toEqual({
      id: 'wf-1',
      name: 'Fluxo',
      slug: 'fluxo',
      description: null,
      version: 1,
      steps: [],
    });
  });

  it('lista etapas do stepper visíveis', () => {
    const stepper = getStepperSteps(steps, {
      answers: answersToMap([{ workflowStepId: 'q1', value: '["A"]' }], steps),
      completedStepIds: completedStepIdsFromUploads([]),
    });
    expect(stepper.map((step) => step.id)).toEqual(['q1', 'd1']);
  });

  it('usa resposta escalar em condições e mensagens de bloqueio', () => {
    const choiceSteps = [
      {
        id: 'q1',
        position: 0,
        stepKind: 'QUESTION' as const,
        questionType: 'SINGLE_CHOICE',
        title: 'Tipo',
      },
      {
        id: 'd1',
        position: 1,
        stepKind: 'DOCUMENT' as const,
        conditionStepId: 'q1',
        conditionValue: 'PF',
        title: 'Doc PF',
      },
    ];

    expect(
      isStepVisible(choiceSteps[1], {
        answers: { q1: 'PF' },
        completedStepIds: new Set(),
      }, choiceSteps),
    ).toBe(true);

    expect(getStepLockMessage(choiceSteps[1], choiceSteps)).toMatch(/for "PF"/);

    const docOnly = [
      { id: 'd0', position: 0, stepKind: 'DOCUMENT' as const, title: 'Inicial' },
      {
        id: 'd1',
        position: 1,
        stepKind: 'DOCUMENT' as const,
        conditionStepId: 'd0',
        title: 'Seguinte',
      },
    ];
    expect(getStepLockMessage(docOnly[1], docOnly)).toMatch(/preencher "Inicial"/);
  });
});

describe('workflow-version-diff', () => {
  const baseSnapshot = (overrides?: Partial<WorkflowSnapshot>): WorkflowSnapshot => ({
    version: 1,
    workflowId: 'wf-1',
    name: 'Fluxo',
    slug: 'fluxo',
    description: null,
    capturedAt: new Date().toISOString(),
    steps: [
      {
        id: 's1',
        title: 'Etapa 1',
        position: 0,
        stepKind: 'DOCUMENT',
        questionType: null,
        questionConfig: null,
        documentTypeId: 'doc',
        instructions: null,
        helpText: null,
        exampleUrl: null,
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
    ...overrides,
  });

  it('descreve mudanças entre snapshots', () => {
    const before = baseSnapshot({
      steps: [
        baseSnapshot().steps[0],
        {
          id: 's2',
          title: 'Pergunta',
          position: 1,
          stepKind: 'QUESTION',
          questionType: 'MULTI_CHOICE',
          questionConfig: {
            options: [
              { id: 'a', label: 'A' },
              { id: 'b', label: 'B' },
            ],
            minSelections: 1,
            maxSelections: 1,
          },
          documentTypeId: null,
          instructions: null,
          helpText: null,
          exampleUrl: null,
          conditionStepId: null,
          conditionValue: null,
          isRequired: true,
          maxFiles: 1,
          acceptedExtensionsOverride: [],
          documentType: null,
        },
      ],
    });
    const after = baseSnapshot({
      name: 'Fluxo novo',
      description: 'Nova descrição',
      steps: [
        {
          ...before.steps[0],
          position: 1,
          title: 'Etapa renomeada',
          isRequired: false,
          maxFiles: 2,
          acceptedExtensionsOverride: ['jpg'],
          documentTypeId: 'doc-2',
          instructions: 'Instruções',
          helpText: 'Dica',
          exampleUrl: 'https://exemplo.test',
          documentType: {
            name: 'CPF',
            allowedExtensions: ['pdf'],
            allowedMimeTypes: ['application/pdf'],
            maxSizeBytes: 1000,
            icon: null,
          },
        },
        {
          ...before.steps[1],
          position: 0,
          questionConfig: {
            options: [
              { id: 'a', label: 'A' },
              { id: 'b', label: 'B' },
            ],
            minSelections: 2,
            maxSelections: 2,
          },
        },
      ],
    });

    const changes = diffWorkflowSnapshots(before, after);
    const descriptions = changes.map((change) => change.description);

    expect(descriptions.some((text) => text.includes('Nome do workflow alterado'))).toBe(true);
    expect(descriptions.some((text) => text.includes('Descrição do workflow alterada'))).toBe(true);
    expect(descriptions.some((text) => text.includes('posição alterada'))).toBe(true);
    expect(descriptions.some((text) => text.includes('passou a ser opcional'))).toBe(true);
    expect(descriptions.some((text) => text.includes('tipo de documento alterado'))).toBe(true);
    expect(descriptions.some((text) => text.includes('limites de seleção alterados'))).toBe(true);
    expect(descriptions.some((text) => text.includes('máximo de arquivos alterado'))).toBe(true);
    expect(descriptions.some((text) => text.includes('extensões aceitas alteradas'))).toBe(true);
    expect(descriptions.some((text) => text.includes('instruções alteradas'))).toBe(true);
  });

  it('descreve remoção de etapa e condição', () => {
    const before = baseSnapshot({
      steps: [
        {
          ...baseSnapshot().steps[0],
          id: 's1',
          conditionStepId: 'q1',
          conditionValue: 'Sim',
        },
        {
          ...baseSnapshot().steps[0],
          id: 's2',
          position: 1,
          title: 'Etapa 2',
        },
      ],
    });
    const after = baseSnapshot();

    const changes = diffWorkflowSnapshots(before, after);
    expect(changes.some((change) => change.description.includes('Etapa removida'))).toBe(true);
  });

  it('informa quando não há diferenças', () => {
    const snapshot = baseSnapshot();
    const changes = diffWorkflowSnapshots(snapshot, snapshot);
    expect(changes).toEqual([{ description: 'Nenhuma diferença detectada entre as versões' }]);
  });
});
