'use client';

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Box, Button, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { scaleIn, staggerContainer, staggerItem, transition } from './motion';

export interface SuccessScreenProps {
  submissionId: string;
  workflowName?: string;
  onStartNew?: () => void;
}

const MotionIcon = motion.create(CheckCircleOutlineIcon);

export function SuccessScreen({ submissionId, workflowName, onStartNew }: SuccessScreenProps) {
  return (
    <Box
      component={motion.div}
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      sx={{
        textAlign: 'center',
        py: 6,
        px: 2,
      }}
    >
      <MotionIcon
        variants={scaleIn}
        transition={transition.spring}
        sx={{ fontSize: 80, color: 'success.main', mb: 2, display: 'block', mx: 'auto' }}
      />
      <Typography component={motion.h1} variants={staggerItem} variant="h4" gutterBottom>
        Documentos enviados com sucesso!
      </Typography>
      {workflowName && (
        <Typography component={motion.p} variants={staggerItem} variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Processo: {workflowName}
        </Typography>
      )}
      <Typography component={motion.p} variants={staggerItem} variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Guarde o número da sua submissão para referência:
      </Typography>
      <Typography
        component={motion.div}
        variants={scaleIn}
        transition={transition.spring}
        variant="h6"
        sx={{
          fontFamily: 'monospace',
          bgcolor: 'action.hover',
          display: 'inline-block',
          px: 2,
          py: 1,
          borderRadius: 2,
          mb: 3,
        }}
      >
        {submissionId}
      </Typography>
      {onStartNew && (
        <Box component={motion.div} variants={staggerItem}>
          <Button variant="outlined" onClick={onStartNew}>
            Enviar novos documentos
          </Button>
        </Box>
      )}
    </Box>
  );
}
