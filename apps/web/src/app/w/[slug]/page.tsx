'use client';

import {
  AnimatedStepPanel,
  FileDropzone,
  StepInstructions,
  SuccessScreen,
  UploadReview,
  WorkflowStepper,
  type UploadedFile,
} from '@docs-flow/ui';
import { getStepAcceptedExtensions } from '@docs-flow/types';
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

interface PublicWorkflow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  steps: Array<{
    id: string;
    title: string;
    instructions?: string;
    helpText?: string;
    exampleUrl?: string;
    position: number;
    isRequired: boolean;
    maxFiles: number;
    acceptedExtensionsOverride?: string[];
    documentType: {
      name: string;
      allowedExtensions: string[];
      allowedMimeTypes: string[];
      maxSizeBytes: number;
    };
  }>;
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
    mutationFn: () => api.post<Submission>(`/public/workflows/${slug}/submissions`),
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
    setActiveStep(submission.currentStepPosition);
    setStepSynced(true);
  }, [submission, stepSynced]);

  useEffect(() => {
    if (submission?.status === 'COMPLETED') {
      setCompleted(true);
    }
  }, [submission]);

  const sortedSteps = useMemo(
    () => [...(workflow?.steps || [])].sort((a, b) => a.position - b.position),
    [workflow],
  );

  const isReviewStep = activeStep >= sortedSteps.length;
  const currentStep = sortedSteps[activeStep];

  const getStepFiles = useCallback(
    (stepId: string): UploadedFile[] => {
      if (!submission) return [];
      return submission.uploads
        .filter((u) => u.workflowStepId === stepId)
        .map((u) => ({
          id: u.id,
          originalName: u.originalName,
          mimeType: u.mimeType,
          sizeBytes: u.sizeBytes,
          previewUrl: u.mimeType.startsWith('image/')
            ? `${API_URL}/uploads/${submission.id}/${stepId}/${u.storedName}`
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
    const files = getStepFiles(currentStep.id);
    if (currentStep.isRequired && files.length === 0) return false;
    return true;
  };

  const handleNext = async () => {
    if (submissionId) {
      await api.patch(`/public/submissions/${submissionId}/step`, { position: activeStep + 1 });
    }
    setActiveStep((s) => s + 1);
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

  if (
    loadingWorkflow ||
    !sessionReady ||
    (submissionId && loadingSubmission && !submissionIsError) ||
    (!submissionId && createSubmissionMutation.isPending)
  ) {
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

  if (completed) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <SuccessScreen
          submissionId={submissionId!}
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
        steps={sortedSteps}
        activeStep={isReviewStep ? sortedSteps.length : activeStep}
      />

      <AnimatedStepPanel stepKey={isReviewStep ? 'review' : currentStep?.id ?? 'loading'}>
        {!isReviewStep && currentStep && (
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

        {isReviewStep && submission && (
          <UploadReview
            steps={sortedSteps.map((step) => ({
              id: step.id,
              title: step.title,
              isRequired: step.isRequired,
              files: getStepFiles(step.id).map((f) => ({
                id: f.id,
                originalName: f.originalName,
                sizeBytes: f.sizeBytes,
              })),
            }))}
          />
        )}
      </AnimatedStepPanel>

      <Box
        component={motion.div}
        layout
        sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          disabled={activeStep === 0}
        >
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
