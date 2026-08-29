'use client';

import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Typography,
} from '@mui/material';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem } from './motion';

export interface BranchOption {
  key: string;
  label: string;
  description?: string;
}

export interface BranchPickerProps {
  title?: string;
  description?: string;
  options: BranchOption[];
  onSelect: (branchKey: string) => void;
}

const BRANCH_LABELS: Record<string, string> = {
  herdeiro: 'Herdeiro',
  inventariante: 'Inventariante',
  advogado: 'Advogado',
};

export function formatBranchLabel(branchKey: string) {
  return BRANCH_LABELS[branchKey] ?? branchKey;
}

export function BranchPicker({
  title = 'Como você participa deste processo?',
  description = 'Escolha o perfil que melhor descreve seu papel. As etapas exibidas serão adaptadas à sua seleção.',
  options,
  onSelect,
}: BranchPickerProps) {
  return (
    <Box component={motion.div} initial="initial" animate="animate" variants={staggerContainer}>
      <Typography component={motion.h2} variants={staggerItem} variant="h5" gutterBottom>
        {title}
      </Typography>
      <Typography component={motion.p} variants={staggerItem} variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>

      {options.map((option, index) => (
        <Card
          key={option.key}
          component={motion.div}
          variants={fadeInUp}
          transition={{ delay: index * 0.06 }}
          sx={{ mb: 2 }}
        >
          <CardActionArea onClick={() => onSelect(option.key)}>
            <CardContent>
              <Typography variant="h6">{option.label}</Typography>
              {option.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {option.description}
                </Typography>
              )}
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
}
