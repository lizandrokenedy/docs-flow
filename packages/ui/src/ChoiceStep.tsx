'use client';

import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import { motion } from 'framer-motion';
import { fadeInUp, transition } from './motion';

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
    <Box component={motion.div} initial="initial" animate="animate" variants={fadeInUp}>
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      {instructions && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
          {instructions}
        </Typography>
      )}
      <FormControl component="fieldset" sx={{ width: '100%' }}>
        <FormLabel component="legend">Selecione uma opção</FormLabel>
        <RadioGroup
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          sx={{ mt: 1 }}
        >
          {options.map((option, index) => (
            <Box
              key={option}
              component={motion.div}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...transition.fast, delay: index * 0.05 }}
            >
              <FormControlLabel value={option} control={<Radio />} label={option} />
            </Box>
          ))}
        </RadioGroup>
      </FormControl>
      {helpText && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {helpText}
        </Typography>
      )}
    </Box>
  );
}
