'use client';

import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Alert, Box, Card, CardContent, Link, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { fadeInUp, transition } from './motion';

export interface StepInstructionsProps {
  title: string;
  instructions?: string | null;
  helpText?: string | null;
  exampleUrl?: string | null;
  documentTypeName?: string;
  acceptedExtensions?: string[];
  maxSizeBytes?: number;
}

const MotionCard = motion.create(Card);

export function StepInstructions({
  title,
  instructions,
  helpText,
  exampleUrl,
  documentTypeName,
  acceptedExtensions = [],
  maxSizeBytes,
}: StepInstructionsProps) {
  return (
    <MotionCard
      sx={{ mb: 3 }}
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      transition={transition.normal}
    >
      <CardContent>
        <Typography variant="h5" gutterBottom>
          {title}
        </Typography>
        {documentTypeName && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tipo: {documentTypeName}
          </Typography>
        )}
        {instructions && (
          <Box
            sx={{
              mb: 2,
              '& p': { m: 0, mb: 1 },
              '& ul, & ol': { pl: 2, mb: 1 },
            }}
          >
            <ReactMarkdown>{instructions}</ReactMarkdown>
          </Box>
        )}
        {helpText && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ ...transition.normal, delay: 0.1 }}
          >
            <Alert severity="info" icon={<HelpOutlineIcon />} sx={{ mb: 2 }}>
              {helpText}
            </Alert>
          </motion.div>
        )}
        {exampleUrl && (
          <Link href={exampleUrl} target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            Ver exemplo
            <OpenInNewIcon fontSize="small" />
          </Link>
        )}
        {(acceptedExtensions.length > 0 || maxSizeBytes) && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
            {acceptedExtensions.length > 0 && `Formatos aceitos: ${acceptedExtensions.join(', ').toUpperCase()}`}
            {acceptedExtensions.length > 0 && maxSizeBytes && ' · '}
            {maxSizeBytes && `Tamanho máximo: ${(maxSizeBytes / (1024 * 1024)).toFixed(1)} MB`}
          </Typography>
        )}
      </CardContent>
    </MotionCard>
  );
}
