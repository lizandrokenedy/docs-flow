'use client';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import {
  Box,
  LinearProgress,
  Step,
  StepLabel,
  Stepper,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useRef } from 'react';
import type { PublicWorkflow } from '@docs-flow/types';

const COMPACT_STEP_THRESHOLD = 6;

export interface WorkflowStepperProps {
  steps: PublicWorkflow['steps'];
  activeStep: number;
}

function getStepState(index: number, activeStep: number) {
  const isCompleted = index < activeStep;
  const isActive = index === activeStep;
  return { isCompleted, isActive };
}

function CompactWorkflowStepper({ steps, activeStep }: WorkflowStepperProps) {
  const activeRef = useRef<HTMLDivElement | null>(null);
  const totalSteps = steps.length;
  const clampedActiveStep = Math.min(activeStep, Math.max(totalSteps - 1, 0));
  const currentStep = steps[clampedActiveStep];
  const completedCount = Math.min(activeStep, totalSteps);
  const progressValue =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [clampedActiveStep]);

  return (
    <Box
      sx={{
        width: '100%',
        mb: 3,
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 2,
          mb: 1,
        }}
      >
        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
          Etapa {Math.min(activeStep + 1, totalSteps)} de {totalSteps}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {progressValue}% concluído
        </Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        value={progressValue}
        sx={{
          mb: 1.5,
          height: 6,
          borderRadius: 999,
          bgcolor: 'action.hover',
        }}
      />

      {currentStep && (
        <Typography
          variant="subtitle1"
          fontWeight={600}
          sx={{ mb: 2, lineHeight: 1.35 }}
        >
          {currentStep.title}
        </Typography>
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          overflowX: 'auto',
          pb: 0.5,
          mx: -0.5,
          px: 0.5,
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 999,
            bgcolor: 'action.disabled',
          },
        }}
      >
        {steps.map((step, index) => {
          const { isCompleted, isActive } = getStepState(index, activeStep);

          return (
            <Box
              key={step.id}
              ref={isActive ? activeRef : undefined}
              sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >
              <Tooltip title={step.title} arrow placement="top">
                <Box
                  aria-label={`${index + 1}. ${step.title}`}
                  aria-current={isActive ? 'step' : undefined}
                  sx={{
                    width: isActive ? 28 : 22,
                    height: isActive ? 28 : 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    transition: 'width 0.2s, height 0.2s',
                  }}
                >
                  {isCompleted ? (
                    <CheckCircleIcon
                      sx={{ fontSize: isActive ? 28 : 22 }}
                      color="success"
                    />
                  ) : (
                    <RadioButtonUncheckedIcon
                      sx={{ fontSize: isActive ? 28 : 22 }}
                      color={isActive ? 'primary' : 'disabled'}
                    />
                  )}
                </Box>
              </Tooltip>

              {index < steps.length - 1 && (
                <Box
                  sx={{
                    width: { xs: 10, sm: 14 },
                    height: 2,
                    mx: 0.25,
                    borderRadius: 1,
                    bgcolor: isCompleted ? 'success.light' : 'action.selected',
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function ClassicWorkflowStepper({
  steps,
  activeStep,
  orientation,
}: WorkflowStepperProps & { orientation: 'horizontal' | 'vertical' }) {
  return (
    <Box sx={{ width: '100%', mb: 3 }}>
      <Stepper
        activeStep={activeStep}
        orientation={orientation}
        alternativeLabel={orientation === 'horizontal'}
      >
        {steps.map((step, index) => {
          const { isCompleted } = getStepState(index, activeStep);

          return (
            <Step key={step.id} completed={isCompleted}>
              <StepLabel
                StepIconComponent={() =>
                  isCompleted ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <RadioButtonUncheckedIcon
                      color={index === activeStep ? 'primary' : 'disabled'}
                    />
                  )
                }
              >
                {step.title}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
}

export function WorkflowStepper({ steps, activeStep }: WorkflowStepperProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const useCompactMode = steps.length >= COMPACT_STEP_THRESHOLD;

  if (useCompactMode) {
    return <CompactWorkflowStepper steps={steps} activeStep={activeStep} />;
  }

  return (
    <ClassicWorkflowStepper
      steps={steps}
      activeStep={activeStep}
      orientation={isMobile ? 'vertical' : 'horizontal'}
    />
  );
}
