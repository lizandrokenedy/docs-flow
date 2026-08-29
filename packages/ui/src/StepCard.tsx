'use client';

import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Alert, Box, Card, CardContent, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { fadeInUp, transition } from './motion';

const MotionCard = motion.create(Card);

export interface StepCardProps {
  title: string;
  instructions?: string;
  helpText?: string;
  children: React.ReactNode;
}

export function StepCard({ title, instructions, helpText, children }: StepCardProps) {
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
        {children}
        {helpText && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ ...transition.normal, delay: 0.1 }}
          >
            <Alert severity="info" icon={<HelpOutlineIcon />} sx={{ mt: 2 }}>
              {helpText}
            </Alert>
          </motion.div>
        )}
      </CardContent>
    </MotionCard>
  );
}
