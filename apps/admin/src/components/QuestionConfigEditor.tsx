'use client';

import { Alert, Stack, TextField, Typography } from '@mui/material';
import type { QuestionConfig, QuestionTypeV2 } from '@docs-flow/types';
import {
  getMultiChoiceConfigError,
  getMultiChoiceConfigWarning,
  getQuestionTextLengthLimits,
  isFreeFormQuestionType,
  sanitizeQuestionConfig,
} from '@docs-flow/types';

interface QuestionConfigEditorProps {
  questionType: QuestionTypeV2;
  config: QuestionConfig;
  optionCount?: number;
  onChange: (config: QuestionConfig) => void;
  disabled?: boolean;
}

export function QuestionConfigEditor({
  questionType,
  config,
  optionCount = 0,
  onChange,
  disabled,
}: QuestionConfigEditorProps) {
  if (!isFreeFormQuestionType(questionType) && questionType !== 'MULTI_CHOICE') {
    return null;
  }

  const textLimits =
    questionType === 'TEXT' || questionType === 'TEXTAREA'
      ? getQuestionTextLengthLimits(questionType)
      : null;

  const multiChoiceError =
    questionType === 'MULTI_CHOICE' ? getMultiChoiceConfigError(config, optionCount) : null;
  const multiChoiceWarning =
    questionType === 'MULTI_CHOICE' && !multiChoiceError
      ? getMultiChoiceConfigWarning(config, optionCount)
      : null;

  const update = (patch: Partial<QuestionConfig>) => {
    const next = { ...config, ...patch };
    if (
      questionType === 'NUMBER' &&
      next.min !== undefined &&
      next.max !== undefined &&
      next.min > next.max
    ) {
      next.max = next.min;
    }
    if (
      questionType === 'MULTI_CHOICE' &&
      next.minSelections !== undefined &&
      next.maxSelections !== undefined &&
      next.minSelections > next.maxSelections
    ) {
      next.maxSelections = next.minSelections;
    }
    onChange(sanitizeQuestionConfig(questionType, next, optionCount) ?? next);
  };

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Typography variant="subtitle2">Configuração da pergunta</Typography>

      {(questionType === 'TEXT' || questionType === 'TEXTAREA' || questionType === 'NUMBER') && (
        <TextField
          fullWidth
          size="small"
          label="Placeholder"
          value={config.placeholder ?? ''}
          disabled={disabled}
          onChange={(event) => update({ placeholder: event.target.value || undefined })}
        />
      )}

      {(questionType === 'TEXT' || questionType === 'TEXTAREA') && textLimits && (
        <>
          <Typography variant="caption" color="text.secondary">
            {textLimits.label} permite no máximo {textLimits.absoluteMaxLength} caracteres.
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Mínimo de caracteres"
            value={config.minLength ?? ''}
            disabled={disabled}
            helperText={`De 0 a ${textLimits.absoluteMaxLength}`}
            inputProps={{ min: 0, max: textLimits.absoluteMaxLength }}
            onChange={(event) =>
              update({
                minLength: event.target.value === '' ? undefined : Number(event.target.value),
              })
            }
          />
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Máximo de caracteres"
            value={config.maxLength ?? ''}
            disabled={disabled}
            helperText={`De 1 a ${textLimits.absoluteMaxLength}`}
            inputProps={{ min: 1, max: textLimits.absoluteMaxLength }}
            onChange={(event) =>
              update({
                maxLength: event.target.value === '' ? undefined : Number(event.target.value),
              })
            }
          />
        </>
      )}

      {questionType === 'NUMBER' && (
        <>
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Valor mínimo"
            value={config.min ?? ''}
            disabled={disabled}
            onChange={(event) =>
              update({
                min: event.target.value === '' ? undefined : Number(event.target.value),
              })
            }
          />
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Valor máximo"
            value={config.max ?? ''}
            disabled={disabled}
            onChange={(event) =>
              update({
                max: event.target.value === '' ? undefined : Number(event.target.value),
              })
            }
          />
        </>
      )}

      {questionType === 'MULTI_CHOICE' && (
        <>
          <Typography variant="caption" color="text.secondary">
            Defina quantas opções o usuário pode marcar. Deixe em branco para não limitar.
            {optionCount >= 2 && ` Há ${optionCount} opções cadastradas.`}
          </Typography>
          {multiChoiceError && <Alert severity="error">{multiChoiceError}</Alert>}
          {multiChoiceWarning && <Alert severity="warning">{multiChoiceWarning}</Alert>}
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Mínimo de seleções"
            value={config.minSelections ?? ''}
            disabled={disabled}
            error={!!multiChoiceError}
            helperText={
              optionCount >= 2 ? `De 0 a ${optionCount}` : 'Informe ao menos 2 opções acima'
            }
            inputProps={{ min: 0, max: optionCount >= 2 ? optionCount : undefined }}
            onChange={(event) =>
              update({
                minSelections:
                  event.target.value === '' ? undefined : Number(event.target.value),
              })
            }
          />
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Máximo de seleções"
            value={config.maxSelections ?? ''}
            disabled={disabled}
            error={!!multiChoiceError}
            helperText={
              optionCount >= 2 ? `De 1 a ${optionCount}` : 'Informe ao menos 2 opções acima'
            }
            inputProps={{ min: 1, max: optionCount >= 2 ? optionCount : undefined }}
            onChange={(event) =>
              update({
                maxSelections:
                  event.target.value === '' ? undefined : Number(event.target.value),
              })
            }
          />
        </>
      )}
    </Stack>
  );
}
