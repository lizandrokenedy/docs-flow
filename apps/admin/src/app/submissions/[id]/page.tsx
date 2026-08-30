'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import {
  formatFileSize,
  formatQuestionAnswerForDisplay,
  isQuestionStep,
  type QuestionType,
  type StepKind,
} from '@docs-flow/types';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getPublicWorkflowUrl, getUploadUrl } from '@/lib/config';
import { CopyLinkButton } from '@/components/CopyLinkButton';
import { DeleteSubmissionButton } from '@/components/DeleteSubmissionButton';
import { SubmissionDetailSkeleton } from '@/components/skeletons/PageSkeletons';
import { useClipboard } from '@/hooks/useClipboard';

interface SubmissionDetail {
  id: string;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  workflow: {
    id: string;
    name: string;
    slug: string;
    steps: Array<{
      id: string;
      title: string;
      position: number;
      stepKind?: StepKind;
      questionType?: QuestionType | null;
    }>;
  };
  answers: Array<{
    id: string;
    workflowStepId: string;
    value: string;
    createdAt: string;
  }>;
  uploads: Array<{
    id: string;
    workflowStepId: string;
    originalName: string;
    storedName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }>;
}

export default function SubmissionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { copyText } = useClipboard();

  const { data: submission, isLoading, error } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => api.get<SubmissionDetail>(`/submissions/${id}`),
  });

  if (isLoading) {
    return <SubmissionDetailSkeleton />;
  }

  if (error || !submission) {
    return (
      <Box>
        <Button component={Link} href="/submissions" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
          Voltar
        </Button>
        <Typography color="error">Submissão não encontrada.</Typography>
      </Box>
    );
  }

  const sortedSteps = [...submission.workflow.steps].sort((a, b) => a.position - b.position);

  return (
    <Box>
      <Button component={Link} href="/submissions" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Voltar para submissões
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Submissão
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" fontFamily="monospace" color="text.secondary">
              {submission.id}
            </Typography>
            <Button
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={() => void copyText(submission.id, 'ID da submissão copiado')}
            >
              Copiar ID
            </Button>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Chip
            label={submission.status}
            color={submission.status === 'COMPLETED' ? 'success' : 'primary'}
          />
          <DeleteSubmissionButton
            submissionId={submission.id}
            workflowName={submission.workflow.name}
            redirectTo="/submissions"
          />
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary">
            Workflow
          </Typography>
          <Typography variant="h6" gutterBottom>
            {submission.workflow.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Button
              component={Link}
              href={getPublicWorkflowUrl(submission.workflow.slug)}
              target="_blank"
              size="small"
              endIcon={<OpenInNewIcon />}
            >
              Abrir fluxo público
            </Button>
            <CopyLinkButton url={getPublicWorkflowUrl(submission.workflow.slug)} />
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2">
            <strong>Iniciado:</strong> {new Date(submission.startedAt).toLocaleString('pt-BR')}
          </Typography>
          <Typography variant="body2">
            <strong>Finalizado:</strong>{' '}
            {submission.completedAt
              ? new Date(submission.completedAt).toLocaleString('pt-BR')
              : '-'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Total de arquivos:</strong> {submission.uploads.length}
          </Typography>
          <Typography variant="body2">
            <strong>Respostas registradas:</strong> {submission.answers.length}
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="h5" gutterBottom>
        Etapas
      </Typography>

      {sortedSteps.map((step) => {
        const stepUploads = submission.uploads.filter((u) => u.workflowStepId === step.id);
        const stepAnswer = submission.answers.find((answer) => answer.workflowStepId === step.id);
        const isQuestion = isQuestionStep(step.stepKind);

        return (
          <Card key={step.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6">{step.title}</Typography>
                <Chip
                  size="small"
                  label={isQuestion ? 'Pergunta' : 'Documento'}
                  variant="outlined"
                />
              </Box>

              {isQuestion ? (
                stepAnswer ? (
                  <Box
                    sx={{
                      bgcolor: 'action.hover',
                      borderRadius: 2,
                      px: 2,
                      py: 1.5,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Resposta
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {formatQuestionAnswerForDisplay(
                        (step.questionType ?? 'SINGLE_CHOICE') as QuestionType,
                        stepAnswer.value,
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Registrada em {new Date(stepAnswer.createdAt).toLocaleString('pt-BR')}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma resposta registrada nesta etapa.
                  </Typography>
                )
              ) : stepUploads.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum arquivo enviado nesta etapa.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {stepUploads.map((upload) => {
                    const fileUrl = getUploadUrl(submission.id, step.id, upload.storedName);

                    return (
                      <ListItem
                        key={upload.id}
                        sx={{
                          bgcolor: 'action.hover',
                          borderRadius: 2,
                          mb: 1,
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <ListItemText
                          primary={upload.originalName}
                          secondary={`${formatFileSize(upload.sizeBytes)} · ${upload.mimeType} · ${new Date(upload.createdAt).toLocaleString('pt-BR')}`}
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            component="a"
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                            startIcon={<OpenInNewIcon />}
                          >
                            Abrir
                          </Button>
                          <Button
                            component="a"
                            href={fileUrl}
                            download={upload.originalName}
                            size="small"
                            variant="contained"
                            startIcon={<DownloadIcon />}
                          >
                            Baixar
                          </Button>
                        </Box>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
