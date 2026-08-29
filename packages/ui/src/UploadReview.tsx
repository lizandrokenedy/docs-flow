'use client';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { formatFileSize } from '@docs-flow/types';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem, transition } from './motion';

export interface ReviewStep {
  id: string;
  title: string;
  isRequired: boolean;
  files: Array<{
    id: string;
    originalName: string;
    sizeBytes: number;
  }>;
}

export interface UploadReviewProps {
  steps: ReviewStep[];
  /** Volta para a etapa indicada (índice 0-based) para revisar ou alterar arquivos. */
  onEditStep?: (stepIndex: number) => void;
}

const MotionCard = motion.create(Card);

export function UploadReview({ steps, onEditStep }: UploadReviewProps) {
  return (
    <Box
      component={motion.div}
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <Typography component={motion.h2} variants={staggerItem} variant="h5" gutterBottom>
        Revise seus documentos
      </Typography>
      <Typography component={motion.p} variants={staggerItem} variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Confira se todos os documentos estão corretos antes de finalizar.
      </Typography>

      {steps.map((step, index) => {
        const hasFiles = step.files.length > 0;
        const isComplete = hasFiles || !step.isRequired;

        return (
          <MotionCard
            key={step.id}
            variants={fadeInUp}
            transition={{ ...transition.normal, delay: index * 0.06 }}
            sx={{ mb: 2 }}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  flexWrap: 'wrap',
                  gap: 1,
                  mb: 1,
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={transition.spring}
                >
                  {isComplete ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <WarningAmberIcon color="warning" fontSize="small" />
                  )}
                </motion.div>
                <Typography variant="h6" sx={{ flex: '1 1 auto', minWidth: 0 }}>
                  {step.title}
                </Typography>
                {step.isRequired && (
                  <Chip label="Obrigatório" size="small" color={hasFiles ? 'success' : 'warning'} />
                )}
                {onEditStep && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditOutlinedIcon />}
                    onClick={() => onEditStep(index)}
                    sx={{ flexShrink: 0 }}
                  >
                    Alterar
                  </Button>
                )}
              </Box>
              {hasFiles ? (
                <List dense disablePadding>
                  {step.files.map((file, fileIndex) => (
                    <ListItem
                      key={file.id}
                      component={motion.li}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...transition.fast, delay: fileIndex * 0.05 }}
                      disablePadding
                      sx={{ py: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={file.originalName}
                        secondary={formatFileSize(file.sizeBytes)}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {step.isRequired ? 'Nenhum documento enviado' : 'Opcional — não enviado'}
                </Typography>
              )}
            </CardContent>
            {index < steps.length - 1 && <Divider />}
          </MotionCard>
        );
      })}
    </Box>
  );
}
