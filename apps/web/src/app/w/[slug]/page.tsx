'use client';

import {
  AnimatedStepPanel,
  FileDropzone,
  QuestionStep,
  StepInstructions,
  SuccessScreen,
  UploadReview,
  WizardLoadingSkeleton,
  WorkflowStepper,
  type UploadedFile,
} from '@docs-flow/ui';
import {
  answersToMap,
  completedStepIdsFromUploads,
  formatQuestionAnswerForDisplay,
  getStepAcceptedExtensions,
  getStepperSteps,
  getStepLockMessage,
  getVisibleSteps,
  getQuestionAnswerError,
  hasQuestionAnswer,
  isQuestionStep,
  parseMultiChoiceAnswer,
  serializeMultiChoiceAnswer,
  type PublicWorkflow as PublicWorkflowType,
  type QuestionType,
} from '@docs-flow/types';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import {
  Alert,
  Box,
  Button,
  Container,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { api, uploadFile, API_URL } from '@/lib/api';

interface WorkflowStep {
  id: string;
  title: string;
  instructions?: string;
  helpText?: string;
  exampleUrl?: string;
  position: number;
  stepKind: 'DOCUMENT' | 'QUESTION';
  questionType?: QuestionType | null;
  questionConfig?: Record<string, unknown> | null;
  conditionStepId?: string | null;
  conditionValue?: string | null;
  isRequired: boolean;
  maxFiles: number;
  acceptedExtensionsOverride?: string[];
  documentType?: {
    name: string;
    allowedExtensions: string[];
    allowedMimeTypes: string[];
    maxSizeBytes: number;
  };
}

interface PublicWorkflow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  steps: WorkflowStep[];
}

interface Submission {
  id: string;
  status: string;
  currentStepPosition: number;
  uploads: Array<{
    id: string;
    workflowStepId: string;
    originalName: string;
    storedName: string;
    mimeType: string;
    sizeBytes: number;
  }>;
  answers?: Array<{
    id: string;
    workflowStepId: string;
    value: string;
  }>;
  workflow: PublicWorkflow;
}

const STORAGE_PREFIX = 'docsflow_submission_';

export default function WorkflowWizardPage() {
  const params = useParams();
  const slug = params.slug as string;
  const queryClient = useQueryClient();

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [stepSynced, setStepSynced] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [choiceValue, setChoiceValue] = useState('');

  const { data: workflow, isLoading: loadingWorkflow, error: workflowError } = useQuery({
    queryKey: ['public-workflow', slug],
    queryFn: () => api.get<PublicWorkflow>(`/public/workflows/${slug}`),
    retry: false,
  });

  const { data: submission, isLoading: loadingSubmission, isError: submissionIsError } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => api.get<Submission>(`/public/submissions/${submissionId}`),
    enabled: !!submissionId,
    retry: false,
  });

  const createSubmissionMutation = useMutation({
    mutationFn: () => api.post<Submission>(`/public/workflows/${slug}/submissions`, {}),
    onSuccess: (data) => {
      setSubmissionId(data.id);
      localStorage.setItem(`${STORAGE_PREFIX}${slug}`, data.id);
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => api.post(`/public/submissions/${submissionId}/complete`),
    onSuccess: () => {
      setCompleted(true);
      localStorage.removeItem(`${STORAGE_PREFIX}${slug}`);
    },
  });

  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${slug}`);
    if (stored) {
      setSubmissionId(stored);
    }
    setSessionReady(true);
  }, [slug]);

  useEffect(() => {
    if (!sessionReady || submissionId || !workflow) return;
    createSubmissionMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, submissionId, workflow]);

  useEffect(() => {
    if (!submissionIsError || !submissionId) return;
    localStorage.removeItem(`${STORAGE_PREFIX}${slug}`);
    setSubmissionId(null);
    setActiveStep(0);
    setCompleted(false);
  }, [submissionIsError, submissionId, slug]);

  useEffect(() => {
    setStepSynced(false);
    setActiveStep(0);
  }, [submissionId]);

  useEffect(() => {
    if (!submission || stepSynced) return;
    const position = Math.min(submission.currentStepPosition, getVisibleSteps(submission.workflow.steps, {
      answers: answersToMap(submission.answers ?? [], submission.workflow.steps),
      completedStepIds: completedStepIdsFromUploads(submission.uploads),
    }).length);
    setActiveStep(position);
    setStepSynced(true);
  }, [submission, stepSynced]);

  const baseVisibilityContext = useMemo(
    () => ({
      answers: answersToMap(submission?.answers ?? [], submission?.workflow.steps),
      completedStepIds: completedStepIdsFromUploads(submission?.uploads ?? []),
    }),
    [submission],
  );

  const visibleSteps = useMemo(() => {
    if (!submission) return [];
    return getVisibleSteps(submission.workflow.steps, baseVisibilityContext);
  }, [submission, baseVisibilityContext]);

  const isReviewStep = submission ? activeStep >= visibleSteps.length : false;
  const currentStep = visibleSteps[activeStep];

  const previewVisibilityContext = useMemo(() => {
    const answers = { ...baseVisibilityContext.answers };
    if (currentStep && isQuestionStep(currentStep.stepKind)) {
      if (currentStep.questionType === 'MULTI_CHOICE') {
        const selected = parseMultiChoiceAnswer(choiceValue);
        if (selected.length > 0) {
          answers[currentStep.id] = selected;
        } else {
          delete answers[currentStep.id];
        }
      } else if (hasQuestionAnswer(choiceValue)) {
        answers[currentStep.id] = choiceValue.trim();
      } else {
        delete answers[currentStep.id];
      }
    }
    return { ...baseVisibilityContext, answers };
  }, [baseVisibilityContext, currentStep, choiceValue]);

  const previewVisibleSteps = useMemo(() => {
    if (!submission) return [];
    return getVisibleSteps(submission.workflow.steps, previewVisibilityContext);
  }, [submission, previewVisibilityContext]);

  const stepperSteps = useMemo(() => {
    if (!submission) return [];
    return getStepperSteps(submission.workflow.steps, previewVisibilityContext);
  }, [submission, previewVisibilityContext]);

  const lockedStepIds = useMemo(() => {
    const visibleIds = new Set(previewVisibleSteps.map((step) => step.id));
    return new Set(stepperSteps.filter((step) => !visibleIds.has(step.id)).map((step) => step.id));
  }, [stepperSteps, previewVisibleSteps]);

  useEffect(() => {
    if (!submission || visibleSteps.length === 0) return;
    if (activeStep > visibleSteps.length) {
      setActiveStep(visibleSteps.length);
    }
  }, [submission, visibleSteps.length, activeStep]);

  const lockedStepMessages = useMemo(() => {
    if (!submission) return {};
    const allSteps = submission.workflow.steps;
    const messages: Record<string, string> = {};

    for (const stepId of lockedStepIds) {
      const step = allSteps.find((item) => item.id === stepId);
      if (!step) continue;
      const message = getStepLockMessage(step, allSteps);
      messages[stepId] = message ?? 'Libera após concluir a etapa anterior';
    }

    return messages;
  }, [lockedStepIds, submission]);

  useEffect(() => {
    if (submission?.status === 'COMPLETED') {
      setCompleted(true);
    }
  }, [submission]);

  const stepperActiveStep = useMemo(() => {
    if (isReviewStep) return stepperSteps.length;
    const currentId = visibleSteps[activeStep]?.id;
    if (!currentId) return activeStep;
    const index = stepperSteps.findIndex((step) => step.id === currentId);
    return index >= 0 ? index : activeStep;
  }, [activeStep, isReviewStep, stepperSteps, visibleSteps]);

  const getStepAnswer = useCallback(
    (stepId: string) => submission?.answers?.find((answer) => answer.workflowStepId === stepId)?.value,
    [submission],
  );

  useEffect(() => {
    setChoiceValue(
      currentStep && isQuestionStep(currentStep.stepKind)
        ? getStepAnswer(currentStep.id) ?? ''
        : '',
    );
  }, [currentStep?.id, currentStep?.stepKind, getStepAnswer]);

  const getStepFiles = useCallback(
    (stepId: string): UploadedFile[] => {
      if (!submission) return [];
      return submission.uploads
        .filter((upload) => upload.workflowStepId === stepId)
        .map((upload) => ({
          id: upload.id,
          originalName: upload.originalName,
          mimeType: upload.mimeType,
          sizeBytes: upload.sizeBytes,
          previewUrl: upload.mimeType.startsWith('image/')
            ? `${API_URL}/uploads/${submission.id}/${stepId}/${upload.storedName}`
            : undefined,
        }));
    },
    [submission],
  );

  const handleUpload = async (file: File) => {
    if (!submissionId || !currentStep) return;
    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    try {
      await uploadFile(submissionId, currentStep.id, file, setUploadProgress);
      queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemove = async (fileId: string) => {
    if (!submissionId || !currentStep) return;
    await api.delete(`/public/submissions/${submissionId}/steps/${currentStep.id}/uploads/${fileId}`);
    queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
  };

  const canProceed = () => {
    if (!currentStep || !submission) return false;

    if (isQuestionStep(currentStep.stepKind)) {
      const error = getQuestionAnswerError(
        (currentStep.questionType ?? 'SINGLE_CHOICE') as QuestionType,
        choiceValue,
        {
          questionConfig: currentStep.questionConfig as never,
        },
        currentStep.isRequired,
      );
      return !error;
    }

    const files = getStepFiles(currentStep.id);
    if (currentStep.isRequired && files.length === 0) return false;
    return true;
  };

  const handleNext = async () => {
    if (!submissionId || !currentStep) return;

    setUploadError(null);

    try {
      if (isQuestionStep(currentStep.stepKind)) {
        const answerValue =
          currentStep.questionType === 'MULTI_CHOICE'
            ? serializeMultiChoiceAnswer(parseMultiChoiceAnswer(choiceValue))
            : choiceValue.trim();
        await api.patch(`/public/submissions/${submissionId}/steps/${currentStep.id}/answer`, {
          value: answerValue,
        });
        await queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
      }

      const nextStep = activeStep + 1;
      await api.patch(`/public/submissions/${submissionId}/step`, { position: nextStep });
      setActiveStep(nextStep);
    } catch (err) {
      setUploadError((err as Error).message);
    }
  };

  const handleBack = async () => {
    const newStep = Math.max(0, activeStep - 1);
    if (submissionId) {
      await api.patch(`/public/submissions/${submissionId}/step`, { position: newStep });
    }
    setActiveStep(newStep);
    setUploadError(null);
  };

  const handleGoToStep = async (stepIndex: number) => {
    if (submissionId) {
      await api.patch(`/public/submissions/${submissionId}/step`, { position: stepIndex });
    }
    setActiveStep(stepIndex);
    setUploadError(null);
  };

  if (loadingWorkflow || !sessionReady) {
    return <WizardLoadingSkeleton />;
  }

  if (workflowError || !workflow) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">
          Workflow não encontrado ou inativo. Verifique o link e tente novamente.
        </Alert>
      </Container>
    );
  }

  if (completed && submissionId) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <SuccessScreen
          submissionId={submissionId}
          workflowName={workflow.name}
          onStartNew={() => {
            localStorage.removeItem(`${STORAGE_PREFIX}${slug}`);
            setSubmissionId(null);
            setActiveStep(0);
            setCompleted(false);
            createSubmissionMutation.mutate();
          }}
        />
      </Container>
    );
  }

  if (
    (submissionId && loadingSubmission && !submissionIsError) ||
    createSubmissionMutation.isPending
  ) {
    return <WizardLoadingSkeleton />;
  }

  if (!submission) {
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        sx={{ mb: 3, textAlign: 'center' }}
      >
        <Typography variant="h4" gutterBottom fontWeight={700}>
          {workflow.name}
        </Typography>
        {workflow.description && (
          <Typography variant="body1" color="text.secondary">
            {workflow.description}
          </Typography>
        )}
      </Box>

      <WorkflowStepper
        steps={stepperSteps as PublicWorkflowType['steps']}
        activeStep={stepperActiveStep}
        lockedStepIds={lockedStepIds}
        lockedStepMessages={lockedStepMessages}
        isReviewStep={isReviewStep}
      />

      <AnimatedStepPanel stepKey={isReviewStep ? 'review' : currentStep?.id ?? 'loading'}>
        {!isReviewStep && currentStep && isQuestionStep(currentStep.stepKind) && (
          <QuestionStep
            title={currentStep.title}
            instructions={currentStep.instructions}
            helpText={currentStep.helpText}
            questionType={currentStep.questionType as never}
            questionConfig={currentStep.questionConfig as never}
            value={choiceValue}
            onChange={setChoiceValue}
          />
        )}

        {!isReviewStep && currentStep && !isQuestionStep(currentStep.stepKind) && currentStep.documentType && (
          <>
            <StepInstructions
              title={currentStep.title}
              instructions={currentStep.instructions}
              helpText={currentStep.helpText}
              exampleUrl={currentStep.exampleUrl}
              acceptedExtensions={getStepAcceptedExtensions({
                acceptedExtensionsOverride: currentStep.acceptedExtensionsOverride,
                documentType: currentStep.documentType,
              })}
              maxSizeBytes={currentStep.documentType.maxSizeBytes}
            />

            <FileDropzone
              acceptedExtensions={getStepAcceptedExtensions({
                acceptedExtensionsOverride: currentStep.acceptedExtensionsOverride,
                documentType: currentStep.documentType,
              })}
              maxSizeBytes={currentStep.documentType.maxSizeBytes}
              maxFiles={currentStep.maxFiles}
              files={getStepFiles(currentStep.id)}
              uploading={uploading}
              uploadProgress={uploadProgress}
              error={uploadError}
              onUpload={handleUpload}
              onRemove={handleRemove}
              enableCamera={getStepAcceptedExtensions({
                acceptedExtensionsOverride: currentStep.acceptedExtensionsOverride,
                documentType: currentStep.documentType,
              }).some((ext) => ['jpg', 'jpeg', 'png', 'webp'].includes(ext.toLowerCase()))}
            />
          </>
        )}

        {isReviewStep && (
          <UploadReview
            steps={visibleSteps.map((step) => {
              if (isQuestionStep(step.stepKind)) {
                const answer = getStepAnswer(step.id);
                const displayAnswer = answer
                  ? formatQuestionAnswerForDisplay(step.questionType ?? 'SINGLE_CHOICE', answer)
                  : '';
                return {
                  id: step.id,
                  title: step.title,
                  isRequired: step.isRequired,
                  files: displayAnswer
                    ? [{ id: step.id, originalName: `Resposta: ${displayAnswer}`, sizeBytes: 0 }]
                    : [],
                };
              }

              return {
                id: step.id,
                title: step.title,
                isRequired: step.isRequired,
                files: getStepFiles(step.id).map((file) => ({
                  id: file.id,
                  originalName: file.originalName,
                  sizeBytes: file.sizeBytes,
                })),
              };
            })}
            onEditStep={handleGoToStep}
          />
        )}
      </AnimatedStepPanel>

      <Box
        component={motion.div}
        layout
        sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}
      >
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} disabled={activeStep === 0}>
          Voltar
        </Button>

        {!isReviewStep ? (
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={handleNext}
            disabled={!canProceed()}
          >
            Próximo
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
          >
            {completeMutation.isPending ? 'Finalizando...' : 'Finalizar envio'}
          </Button>
        )}
      </Box>

      {completeMutation.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {(completeMutation.error as Error).message}
        </Alert>
      )}
    </Container>
  );
}
