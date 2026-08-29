'use client';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
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
  lockedStepIds?: ReadonlySet<string>;
  lockedStepMessages?: Readonly<Record<string, string>>;
  isReviewStep?: boolean;
}

function getStepState(
  index: number,
  activeStep: number,
  isLocked: boolean,
) {
  const isCompleted = !isLocked && index < activeStep;
  const isActive = !isLocked && index === activeStep;
  return { isCompleted, isActive, isLocked };
}

function StepIcon({
  isCompleted,
  isActive,
  isLocked,
  size,
}: {
  isCompleted: boolean;
  isActive: boolean;
  isLocked: boolean;
  size: number;
}) {
  if (isCompleted) {
    return <CheckCircleIcon sx={{ fontSize: size }} color="success" />;
  }

  if (isLocked) {
    return <LockOutlinedIcon sx={{ fontSize: size }} color="disabled" />;
  }

  return (
    <RadioButtonUncheckedIcon
      sx={{ fontSize: size }}
      color={isActive ? 'primary' : 'disabled'}
    />
  );
}

function CompactWorkflowStepper({
  steps,
  activeStep,
  lockedStepIds,
  lockedStepMessages,
  isReviewStep = false,
}: WorkflowStepperProps) {
  const activeRef = useRef<HTMLDivElement | null>(null);
  const totalSteps = steps.length;
  const onReview = isReviewStep || activeStep >= totalSteps;
  const contentStepIndex = onReview
    ? Math.max(totalSteps - 1, 0)
    : Math.min(activeStep, Math.max(totalSteps - 1, 0));
  const currentStep = onReview ? null : steps[contentStepIndex];
  const completedCount = onReview ? totalSteps : Math.min(activeStep, totalSteps);
  const progressValue =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  useEffect(() => {
    if (onReview) return;
    activeRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [contentStepIndex, onReview]);

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
          {onReview
            ? 'Revisão'
            : `Etapa ${Math.min(activeStep + 1, totalSteps)} de ${totalSteps}`}
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

      {(onReview || currentStep) && (
        <Typography
          variant="subtitle1"
          fontWeight={600}
          sx={{ mb: 2, lineHeight: 1.35 }}
        >
          {onReview ? 'Revisão do envio' : currentStep!.title}
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
          const isLocked = lockedStepIds?.has(step.id) ?? false;
          const isActive = !onReview && !isLocked && index === activeStep;
          const isCompleted = !onReview && !isLocked && index < activeStep;
          const iconSize = isActive ? 28 : 22;
          const lockMessage = lockedStepMessages?.[step.id];
          const tooltip = isLocked && lockMessage ? lockMessage : step.title;

          return (
            <Box
              key={step.id}
              ref={isActive ? activeRef : undefined}
              sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >
              <Tooltip title={tooltip} arrow placement="top">
                <Box
                  aria-label={`${index + 1}. ${step.title}`}
                  aria-current={isActive ? 'step' : undefined}
                  sx={{
                    width: iconSize,
                    height: iconSize,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    transition: 'width 0.2s, height 0.2s',
                    opacity: isLocked ? 0.55 : 1,
                  }}
                >
                  <StepIcon
                    isCompleted={isCompleted}
                    isActive={isActive}
                    isLocked={isLocked}
                    size={iconSize}
                  />
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
  lockedStepIds,
  lockedStepMessages,
  isReviewStep = false,
  orientation,
}: WorkflowStepperProps & { orientation: 'horizontal' | 'vertical' }) {
  const onReview = isReviewStep || activeStep >= steps.length;

  return (
    <Box sx={{ width: '100%', mb: 3 }}>
      <Stepper
        activeStep={onReview ? steps.length : activeStep}
        orientation={orientation}
        alternativeLabel={orientation === 'horizontal'}
      >
        {steps.map((step, index) => {
          const isLocked = lockedStepIds?.has(step.id) ?? false;
          const { isCompleted, isActive } = getStepState(index, activeStep, isLocked);
          const lockMessage = lockedStepMessages?.[step.id];

          return (
            <Step key={step.id} completed={isCompleted}>
              <StepLabel
                optional={
                  isLocked && lockMessage ? (
                    <Typography variant="caption" color="text.secondary">
                      {lockMessage}
                    </Typography>
                  ) : undefined
                }
                StepIconComponent={() => (
                  <Tooltip title={lockMessage ?? ''} disableHoverListener={!lockMessage}>
                    <Box sx={{ opacity: isLocked ? 0.55 : 1 }}>
                      <StepIcon
                        isCompleted={isCompleted}
                        isActive={isActive}
                        isLocked={isLocked}
                        size={24}
                      />
                    </Box>
                  </Tooltip>
                )}
                sx={{
                  '& .MuiStepLabel-label': {
                    color: isLocked ? 'text.disabled' : undefined,
                  },
                }}
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

export function WorkflowStepper({
  steps,
  activeStep,
  lockedStepIds,
  lockedStepMessages,
  isReviewStep,
}: WorkflowStepperProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const useCompactMode = steps.length >= COMPACT_STEP_THRESHOLD;

  if (useCompactMode) {
    return (
      <CompactWorkflowStepper
        steps={steps}
        activeStep={activeStep}
        lockedStepIds={lockedStepIds}
        lockedStepMessages={lockedStepMessages}
        isReviewStep={isReviewStep}
      />
    );
  }

  return (
    <ClassicWorkflowStepper
      steps={steps}
      activeStep={activeStep}
      lockedStepIds={lockedStepIds}
      lockedStepMessages={lockedStepMessages}
      isReviewStep={isReviewStep}
      orientation={isMobile ? 'vertical' : 'horizontal'}
    />
  );
}
