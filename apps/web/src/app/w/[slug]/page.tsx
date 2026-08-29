'use client';

import {
  AnimatedStepPanel,
  BranchPicker,
  ChoiceStep,
  FileDropzone,
  formatBranchLabel,
  StepInstructions,
  SuccessScreen,
  UploadReview,
  WorkflowStepper,
  type UploadedFile,
} from '@docs-flow/ui';
import {
  answersToMap,
  completedStepIdsFromUploads,
  getBranchOptions,
  getStepAcceptedExtensions,
  getVisibleSteps,
} from '@docs-flow/types';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
  stepKind?: 'DOCUMENT' | 'CHOICE';
  branchKey?: string | null;
  conditionStepId?: string | null;
  conditionValue?: string | null;
  choiceOptions?: string[];
  isRequired: boolean;
  maxFiles: number;
  acceptedExtensionsOverride?: string[];
  documentType: {
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
  branchKey?: string | null;
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

  const branchOptions = useMemo(
    () => getBranchOptions(workflow?.steps ?? []),
    [workflow],
  );

  const createSubmissionMutation = useMutation({
    mutationFn: (branchKey?: string) =>
      api.post<Submission>(`/public/workflows/${slug}/submissions`, branchKey ? { branchKey } : {}),
    onSuccess: (data) => {
      setSubmissionId(data.id);
      localStorage.setItem(`${STORAGE_PREFIX}${slug}`, data.id);
    },
  });

  const setBranchMutation = useMutation({
    mutationFn: (branchKey: string) =>
      api.patch<Submission>(`/public/submissions/${submissionId}/branch`, { branchKey }),
    onSuccess: (data) => {
      queryClient.setQueryData(['submission', data.id], data);
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
    if (!sessionReady || submissionId || !workflow || branchOptions.length > 0) return;
    createSubmissionMutation.mutate(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, submissionId, workflow, branchOptions.length]);

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
    setActiveStep(submission.currentStepPosition);
    setStepSynced(true);
  }, [submission, stepSynced]);

  useEffect(() => {
    if (submission?.status === 'COMPLETED') {
      setCompleted(true);
    }
  }, [submission]);

  const visibleSteps = useMemo(() => {
    if (!submission) return [];
    return getVisibleSteps(submission.workflow.steps, {
      branchKey: submission.branchKey,
      answers: answersToMap(submission.answers ?? []),
      completedStepIds: completedStepIdsFromUploads(submission.uploads),
    });
  }, [submission]);

  const isReviewStep = submission ? activeStep >= visibleSteps.length : false;
  const currentStep = visibleSteps[activeStep];

  const getStepAnswer = useCallback(
    (stepId: string) => submission?.answers?.find((answer) => answer.workflowStepId === stepId)?.value,
    [submission],
  );

  useEffect(() => {
    setChoiceValue(currentStep?.stepKind === 'CHOICE' ? getStepAnswer(currentStep.id) ?? '' : '');
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

    if (currentStep.stepKind === 'CHOICE') {
      if (!currentStep.isRequired) return true;
      return Boolean(choiceValue || getStepAnswer(currentStep.id));
    }

    const files = getStepFiles(currentStep.id);
    if (currentStep.isRequired && files.length === 0) return false;
    return true;
  };

  const handleNext = async () => {
    if (!submissionId || !currentStep) return;

    if (currentStep.stepKind === 'CHOICE' && choiceValue) {
      await api.patch(`/public/submissions/${submissionId}/steps/${currentStep.id}/answer`, {
        value: choiceValue,
      });
      await queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
    }

    const nextStep = activeStep + 1;
    await api.patch(`/public/submissions/${submissionId}/step`, { position: nextStep });
    setActiveStep(nextStep);
    setUploadError(null);
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

  const handleBranchSelect = async (branchKey: string) => {
    if (submissionId) {
      await setBranchMutation.mutateAsync(branchKey);
      return;
    }
    await createSubmissionMutation.mutateAsync(branchKey);
  };

  const needsBranchSelection =
    branchOptions.length > 0 &&
    (!submissionId || (submission && !submission.branchKey));

  if (loadingWorkflow || !sessionReady) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
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
            if (branchOptions.length === 0) {
              createSubmissionMutation.mutate(undefined);
            }
          }}
        />
      </Container>
    );
  }

  if (needsBranchSelection) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 2, md: 4 } }}>
        <Typography variant="h4" gutterBottom fontWeight={700} textAlign="center">
          {workflow.name}
        </Typography>
        {workflow.description && (
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
            {workflow.description}
          </Typography>
        )}
        <BranchPicker
          options={branchOptions.map((branchKey) => ({
            key: branchKey,
            label: formatBranchLabel(branchKey),
          }))}
          onSelect={(branchKey) => void handleBranchSelect(branchKey)}
        />
        {(createSubmissionMutation.isError || setBranchMutation.isError) && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {((createSubmissionMutation.error ?? setBranchMutation.error) as Error).message}
          </Alert>
        )}
      </Container>
    );
  }

  if (
    (submissionId && loadingSubmission && !submissionIsError) ||
    createSubmissionMutation.isPending ||
    setBranchMutation.isPending
  ) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
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
        {submission.branchKey && (
          <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
            Perfil: {formatBranchLabel(submission.branchKey)}
          </Typography>
        )}
        {workflow.description && (
          <Typography variant="body1" color="text.secondary">
            {workflow.description}
          </Typography>
        )}
      </Box>

      <WorkflowStepper
        steps={visibleSteps}
        activeStep={isReviewStep ? visibleSteps.length : activeStep}
      />

      <AnimatedStepPanel stepKey={isReviewStep ? 'review' : currentStep?.id ?? 'loading'}>
        {!isReviewStep && currentStep?.stepKind === 'CHOICE' && (
          <ChoiceStep
            title={currentStep.title}
            instructions={currentStep.instructions}
            helpText={currentStep.helpText}
            options={currentStep.choiceOptions ?? []}
            value={choiceValue}
            onChange={setChoiceValue}
          />
        )}

        {!isReviewStep && currentStep && currentStep.stepKind !== 'CHOICE' && (
          <>
            <StepInstructions
              title={currentStep.title}
              instructions={currentStep.instructions}
              helpText={currentStep.helpText}
              exampleUrl={currentStep.exampleUrl}
              documentTypeName={currentStep.documentType.name}
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
              if (step.stepKind === 'CHOICE') {
                const answer = getStepAnswer(step.id);
                return {
                  id: step.id,
                  title: step.title,
                  isRequired: step.isRequired,
                  files: answer
                    ? [{ id: step.id, originalName: `Resposta: ${answer}`, sizeBytes: 0 }]
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
