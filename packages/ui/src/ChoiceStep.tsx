'use client';

import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
} from '@mui/material';
import { motion } from 'framer-motion';
import { transition } from './motion';
import { StepCard } from './StepCard';

export interface ChoiceStepProps {
  title: string;
  instructions?: string;
  helpText?: string;
  options: string[];
  value?: string;
  onChange: (value: string) => void;
}

export function ChoiceStep({
  title,
  instructions,
  helpText,
  options,
  value,
  onChange,
}: ChoiceStepProps) {
  return (
    <StepCard title={title} instructions={instructions} helpText={helpText}>
      <FormControl component="fieldset" sx={{ width: '100%' }}>
        <FormLabel component="legend">Selecione uma opção</FormLabel>
        <RadioGroup
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          sx={{ mt: 1 }}
        >
          {options.map((option, index) => (
            <motion.div
              key={option}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...transition.fast, delay: index * 0.05 }}
            >
              <FormControlLabel value={option} control={<Radio />} label={option} />
            </motion.div>
          ))}
        </RadioGroup>
      </FormControl>
    </StepCard>
  );
}
