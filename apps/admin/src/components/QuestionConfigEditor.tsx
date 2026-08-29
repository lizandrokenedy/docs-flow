'use client';

import { Stack, TextField, Typography } from '@mui/material';
import type { QuestionConfig, QuestionTypeV2 } from '@docs-flow/types';
import {
  getQuestionTextLengthLimits,
  isFreeFormQuestionType,
  sanitizeQuestionConfig,
} from '@docs-flow/types';

interface QuestionConfigEditorProps {
  questionType: QuestionTypeV2;
  config: QuestionConfig;
  onChange: (config: QuestionConfig) => void;
  disabled?: boolean;
}

export function QuestionConfigEditor({
  questionType,
  config,
  onChange,
  disabled,
}: QuestionConfigEditorProps) {
  if (!isFreeFormQuestionType(questionType)) {
    return null;
  }

  const textLimits =
    questionType === 'TEXT' || questionType === 'TEXTAREA'
      ? getQuestionTextLengthLimits(questionType)
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
    onChange(sanitizeQuestionConfig(questionType, next) ?? next);
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
    </Stack>
  );
}
