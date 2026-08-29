'use client';

import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { motion } from 'framer-motion';
import type { QuestionConfig, QuestionType } from '@docs-flow/types';
import { getChoiceOptionLabels, getEffectiveTextLengthLimits } from '@docs-flow/types';
import { ChoiceStep } from './ChoiceStep';
import { transition } from './motion';
import { StepCard } from './StepCard';

export interface QuestionStepProps {
  title: string;
  instructions?: string;
  helpText?: string;
  questionType?: QuestionType | null;
  questionConfig?: QuestionConfig | null;
  choiceOptions?: string[];
  value?: string;
  onChange: (value: string) => void;
}

export function QuestionStep({
  title,
  instructions,
  helpText,
  questionType,
  questionConfig,
  choiceOptions,
  value,
  onChange,
}: QuestionStepProps) {
  const options = getChoiceOptionLabels({ choiceOptions, questionConfig });
  const resolvedType = questionType ?? 'SINGLE_CHOICE';

  if (resolvedType === 'SELECT') {
    return (
      <StepCard title={title} instructions={instructions} helpText={helpText}>
        <FormControl fullWidth sx={{ mt: 1 }}>
          <InputLabel id="question-select-label">Selecione uma opção</InputLabel>
          <Select
            labelId="question-select-label"
            label="Selecione uma opção"
            value={value ?? ''}
            onChange={(event) => onChange(event.target.value)}
          >
            {options.map((option, index) => (
              <MenuItem key={option} value={option}>
                <Box
                  component={motion.div}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...transition.fast, delay: index * 0.05 }}
                  sx={{ width: '100%' }}
                >
                  {option}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </StepCard>
    );
  }

  if (resolvedType === 'TEXT') {
    const limits = getEffectiveTextLengthLimits('TEXT', questionConfig);
    return (
      <StepCard title={title} instructions={instructions} helpText={helpText}>
        <TextField
          fullWidth
          value={value ?? ''}
          placeholder={questionConfig?.placeholder}
          inputProps={{
            minLength: limits?.minLength,
            maxLength: limits?.maxLength,
          }}
          helperText={
            limits ? `Até ${limits.maxLength} caracteres` : undefined
          }
          onChange={(event) => onChange(event.target.value)}
        />
      </StepCard>
    );
  }

  if (resolvedType === 'TEXTAREA') {
    const limits = getEffectiveTextLengthLimits('TEXTAREA', questionConfig);
    return (
      <StepCard title={title} instructions={instructions} helpText={helpText}>
        <TextField
          fullWidth
          multiline
          minRows={4}
          value={value ?? ''}
          placeholder={questionConfig?.placeholder}
          inputProps={{
            minLength: limits?.minLength,
            maxLength: limits?.maxLength,
          }}
          helperText={
            limits ? `Até ${limits.maxLength} caracteres` : undefined
          }
          onChange={(event) => onChange(event.target.value)}
        />
      </StepCard>
    );
  }

  if (resolvedType === 'NUMBER') {
    return (
      <StepCard title={title} instructions={instructions} helpText={helpText}>
        <TextField
          fullWidth
          type="number"
          value={value ?? ''}
          placeholder={questionConfig?.placeholder}
          inputProps={{
            min: questionConfig?.min,
            max: questionConfig?.max,
          }}
          onChange={(event) => onChange(event.target.value)}
        />
      </StepCard>
    );
  }

  if (resolvedType === 'DATE') {
    return (
      <StepCard title={title} instructions={instructions} helpText={helpText}>
        <TextField
          fullWidth
          type="date"
          value={value ?? ''}
          InputLabelProps={{ shrink: true }}
          onChange={(event) => onChange(event.target.value)}
        />
      </StepCard>
    );
  }

  return (
    <ChoiceStep
      title={title}
      instructions={instructions}
      helpText={helpText}
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}
