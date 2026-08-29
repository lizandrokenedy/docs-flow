import { z } from 'zod';

export const QuestionTypeSchema = z.enum([
  'SINGLE_CHOICE',
  'SELECT',
  'YES_NO',
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'DATE',
  'MULTI_CHOICE',
]);

export const QuestionTypeV1Schema = z.enum(['SINGLE_CHOICE', 'SELECT', 'YES_NO']);

export const QuestionTypeV2Schema = z.enum([
  'SINGLE_CHOICE',
  'SELECT',
  'YES_NO',
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'DATE',
]);

export const QuestionOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export const QuestionConfigSchema = z.object({
  options: z.array(QuestionOptionSchema).optional(),
  placeholder: z.string().optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minSelections: z.number().int().min(0).optional(),
  maxSelections: z.number().int().min(0).optional(),
});

export type QuestionType = z.infer<typeof QuestionTypeSchema>;
export type QuestionTypeV1 = z.infer<typeof QuestionTypeV1Schema>;
export type QuestionTypeV2 = z.infer<typeof QuestionTypeV2Schema>;
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;
export type QuestionConfig = z.infer<typeof QuestionConfigSchema>;

export type StepKindInput = 'DOCUMENT' | 'QUESTION';

export const YES_NO_OPTIONS: QuestionOption[] = [
  { id: 'yes', label: 'Sim' },
  { id: 'no', label: 'Não' },
];

export function normalizeStepKind(stepKind?: StepKindInput | null): 'DOCUMENT' | 'QUESTION' {
  if (stepKind === 'QUESTION') {
    return 'QUESTION';
  }

  return 'DOCUMENT';
}

export function isQuestionStep(stepKind?: StepKindInput | null): boolean {
  return normalizeStepKind(stepKind) === 'QUESTION';
}

export function slugifyOptionId(label: string, index: number): string {
  const base = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return base || `option-${index + 1}`;
}

export function optionsFromLabels(labels: string[]): QuestionOption[] {
  const seen = new Set<string>();

  return labels.map((label, index) => {
    let id = slugifyOptionId(label, index);
    let suffix = 2;

    while (seen.has(id)) {
      id = `${slugifyOptionId(label, index)}-${suffix}`;
      suffix += 1;
    }

    seen.add(id);
    return { id, label };
  });
}

export function getChoiceOptionLabels(step: {
  choiceOptions?: string[];
  questionConfig?: QuestionConfig | null;
}): string[] {
  const configOptions = step.questionConfig?.options;
  if (configOptions?.length) {
    return configOptions.map((option) => option.label);
  }

  return step.choiceOptions ?? [];
}

export function buildQuestionConfig(
  questionType: QuestionType | null | undefined,
  choiceOptions?: string[],
  questionConfig?: QuestionConfig | null,
): QuestionConfig | null {
  if (!questionType) {
    return null;
  }

  if (questionType === 'YES_NO') {
    return { options: YES_NO_OPTIONS };
  }

  if (isFreeFormQuestionType(questionType)) {
    return questionConfig ?? {};
  }

  if (questionConfig?.options?.length) {
    return questionConfig;
  }

  if (choiceOptions?.length) {
    return { options: optionsFromLabels(choiceOptions) };
  }

  return questionConfig ?? { options: [] };
}

export function requiresQuestionOptions(questionType?: QuestionType | null): boolean {
  return (
    questionType === 'SINGLE_CHOICE' ||
    questionType === 'SELECT' ||
    questionType === 'MULTI_CHOICE'
  );
}

export function isChoiceQuestionType(questionType?: QuestionType | null): boolean {
  return (
    questionType === 'SINGLE_CHOICE' ||
    questionType === 'SELECT' ||
    questionType === 'YES_NO' ||
    questionType === 'MULTI_CHOICE'
  );
}

export function isFreeFormQuestionType(questionType?: QuestionType | null): boolean {
  return (
    questionType === 'TEXT' ||
    questionType === 'TEXTAREA' ||
    questionType === 'NUMBER' ||
    questionType === 'DATE'
  );
}

export const QUESTION_TEXT_LENGTH_LIMITS = {
  TEXT: {
    absoluteMaxLength: 255,
    label: 'texto curto',
  },
  TEXTAREA: {
    absoluteMaxLength: 5000,
    label: 'texto longo',
  },
} as const;

export function getQuestionTextLengthLimits(questionType: QuestionType) {
  if (questionType === 'TEXT') {
    return QUESTION_TEXT_LENGTH_LIMITS.TEXT;
  }

  if (questionType === 'TEXTAREA') {
    return QUESTION_TEXT_LENGTH_LIMITS.TEXTAREA;
  }

  return null;
}

export class QuestionConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionConfigValidationError';
  }
}

export function sanitizeQuestionConfig(
  questionType: QuestionType,
  config: QuestionConfig | null | undefined,
): QuestionConfig | null {
  if (!config) {
    return null;
  }

  if (questionType !== 'TEXT' && questionType !== 'TEXTAREA') {
    return config;
  }

  const limits = getQuestionTextLengthLimits(questionType)!;
  const next: QuestionConfig = { ...config };

  if (next.maxLength !== undefined) {
    next.maxLength = Math.min(Math.max(0, next.maxLength), limits.absoluteMaxLength);
    if (next.maxLength === 0) {
      delete next.maxLength;
    }
  }

  if (next.minLength !== undefined) {
    next.minLength = Math.min(Math.max(0, next.minLength), limits.absoluteMaxLength);
    if (next.minLength === 0) {
      delete next.minLength;
    }
  }

  if (
    next.minLength !== undefined &&
    next.maxLength !== undefined &&
    next.minLength > next.maxLength
  ) {
    next.minLength = next.maxLength;
  }

  return next;
}

export function assertQuestionConfigForType(
  questionType: QuestionType,
  config: QuestionConfig | null | undefined,
): void {
  if (!config) {
    return;
  }

  if (questionType === 'TEXT' || questionType === 'TEXTAREA') {
    const limits = getQuestionTextLengthLimits(questionType)!;

    if (config.maxLength !== undefined && config.maxLength > limits.absoluteMaxLength) {
      throw new QuestionConfigValidationError(
        `${limits.label} aceita no máximo ${limits.absoluteMaxLength} caracteres`,
      );
    }

    if (config.minLength !== undefined && config.minLength > limits.absoluteMaxLength) {
      throw new QuestionConfigValidationError(
        `O mínimo de caracteres não pode ultrapassar ${limits.absoluteMaxLength}`,
      );
    }

    if (
      config.minLength !== undefined &&
      config.maxLength !== undefined &&
      config.minLength > config.maxLength
    ) {
      throw new QuestionConfigValidationError(
        'O mínimo de caracteres não pode ser maior que o máximo',
      );
    }
    return;
  }

  if (questionType === 'NUMBER') {
    if (config.min !== undefined && config.max !== undefined && config.min > config.max) {
      throw new QuestionConfigValidationError('O valor mínimo não pode ser maior que o máximo');
    }
  }
}

export function getEffectiveTextLengthLimits(
  questionType: QuestionType,
  config?: QuestionConfig | null,
) {
  const typeLimits = getQuestionTextLengthLimits(questionType);
  if (!typeLimits) {
    return null;
  }

  const absoluteMax = typeLimits.absoluteMaxLength;
  const configuredMax =
    config?.maxLength !== undefined ? Math.min(config.maxLength, absoluteMax) : absoluteMax;
  const configuredMin = config?.minLength !== undefined ? Math.min(config.minLength, configuredMax) : 0;

  return {
    minLength: configuredMin,
    maxLength: configuredMax,
    absoluteMaxLength: absoluteMax,
    label: typeLimits.label,
  };
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class QuestionAnswerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionAnswerValidationError';
  }
}

export function normalizeQuestionAnswerValue(
  questionType: QuestionType,
  value: string,
): string {
  if (isFreeFormQuestionType(questionType)) {
    return value.trim();
  }

  return value;
}

export function validateQuestionAnswer(
  questionType: QuestionType,
  value: string,
  step: {
    choiceOptions?: string[];
    questionConfig?: QuestionConfig | null;
  },
): void {
  if (questionType === 'MULTI_CHOICE') {
    throw new QuestionAnswerValidationError('Múltipla escolha ainda não está disponível');
  }

  if (isChoiceQuestionType(questionType)) {
    const optionLabels = getChoiceOptionLabels(step);
    if (!optionLabels.includes(value)) {
      throw new QuestionAnswerValidationError('Opção inválida para esta etapa');
    }
    return;
  }

  const normalizedValue = value.trim();
  const config = step.questionConfig;

  switch (questionType) {
    case 'TEXT':
    case 'TEXTAREA': {
      const limits = getEffectiveTextLengthLimits(questionType, config);
      if (!limits) {
        return;
      }

      if (normalizedValue.length < limits.minLength) {
        throw new QuestionAnswerValidationError(
          `Resposta deve ter ao menos ${limits.minLength} caracteres`,
        );
      }

      if (normalizedValue.length > limits.maxLength) {
        throw new QuestionAnswerValidationError(
          `Resposta deve ter no máximo ${limits.maxLength} caracteres`,
        );
      }
      return;
    }
    case 'NUMBER': {
      if (!normalizedValue) {
        return;
      }

      const parsed = Number(normalizedValue);
      if (Number.isNaN(parsed)) {
        throw new QuestionAnswerValidationError('Informe um número válido');
      }
      if (config?.min !== undefined && parsed < config.min) {
        throw new QuestionAnswerValidationError(`O valor mínimo é ${config.min}`);
      }
      if (config?.max !== undefined && parsed > config.max) {
        throw new QuestionAnswerValidationError(`O valor máximo é ${config.max}`);
      }
      return;
    }
    case 'DATE': {
      if (!normalizedValue) {
        return;
      }

      if (!ISO_DATE_REGEX.test(normalizedValue)) {
        throw new QuestionAnswerValidationError('Informe uma data válida');
      }

      const [year, month, day] = normalizedValue.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
      ) {
        throw new QuestionAnswerValidationError('Informe uma data válida');
      }
      return;
    }
    default:
      return;
  }
}

export function hasQuestionAnswer(value?: string | null): boolean {
  return Boolean(value?.trim());
}

export function getQuestionAnswerError(
  questionType: QuestionType,
  value: string,
  step: {
    choiceOptions?: string[];
    questionConfig?: QuestionConfig | null;
  },
  isRequired: boolean,
): string | null {
  if (!hasQuestionAnswer(value)) {
    return isRequired ? 'Resposta obrigatória' : null;
  }

  try {
    validateQuestionAnswer(questionType, value, step);
    return null;
  } catch (error) {
    if (error instanceof QuestionAnswerValidationError) {
      return error.message;
    }
    throw error;
  }
}

export function isImplementedQuestionType(questionType?: QuestionType | null): boolean {
  return questionType !== 'MULTI_CHOICE';
}

export function getQuestionTypeLabel(questionType?: QuestionType | null): string {
  switch (questionType) {
    case 'SINGLE_CHOICE':
      return 'Escolha única';
    case 'SELECT':
      return 'Lista suspensa';
    case 'YES_NO':
      return 'Sim / Não';
    case 'TEXT':
      return 'Texto curto';
    case 'TEXTAREA':
      return 'Texto longo';
    case 'NUMBER':
      return 'Número';
    case 'DATE':
      return 'Data';
    case 'MULTI_CHOICE':
      return 'Múltipla escolha';
    default:
      return 'Pergunta';
  }
}

export interface NormalizeQuestionStepInput {
  stepKind?: StepKindInput | null;
  questionType?: QuestionType | null;
  questionConfig?: QuestionConfig | null;
  choiceOptions?: string[];
}

export interface NormalizedQuestionStep {
  stepKind: 'DOCUMENT' | 'QUESTION';
  questionType: QuestionType | null;
  questionConfig: QuestionConfig | null;
  choiceOptions: string[];
}

export function normalizeQuestionStepInput(
  input: NormalizeQuestionStepInput,
): NormalizedQuestionStep {
  const stepKind = normalizeStepKind(input.stepKind);

  if (stepKind === 'DOCUMENT') {
    return {
      stepKind: 'DOCUMENT',
      questionType: null,
      questionConfig: null,
      choiceOptions: [],
    };
  }

  const questionType = input.questionType ?? 'SINGLE_CHOICE';
  const questionConfig = buildQuestionConfig(
    questionType,
    input.choiceOptions,
    input.questionConfig,
  );
  const choiceOptions = getChoiceOptionLabels({
    choiceOptions: input.choiceOptions,
    questionConfig,
  });

  return {
    stepKind: 'QUESTION',
    questionType,
    questionConfig,
    choiceOptions,
  };
}
