'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
import { formatFileSize } from '@docs-flow/types';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getPublicWorkflowUrl, getUploadUrl } from '@/lib/config';

interface SubmissionDetail {
  id: string;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  workflow: {
    id: string;
    name: string;
    slug: string;
    steps: Array<{ id: string; title: string; position: number }>;
  };
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

  const { data: submission, isLoading, error } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => api.get<SubmissionDetail>(`/submissions/${id}`),
  });

  if (isLoading) {
    return <Typography>Carregando...</Typography>;
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
          <Typography variant="body2" fontFamily="monospace" color="text.secondary">
            {submission.id}
          </Typography>
        </Box>
        <Chip
          label={submission.status}
          color={submission.status === 'COMPLETED' ? 'success' : 'primary'}
        />
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary">
            Workflow
          </Typography>
          <Typography variant="h6" gutterBottom>
            {submission.workflow.name}
          </Typography>
          <Button
            component={Link}
            href={getPublicWorkflowUrl(submission.workflow.slug)}
            target="_blank"
            size="small"
            endIcon={<OpenInNewIcon />}
          >
            Abrir fluxo público
          </Button>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2">
            <strong>Iniciado:</strong> {new Date(submission.startedAt).toLocaleString('pt-BR')}
          </Typography>
          <Typography variant="body2">
            <strong>Finalizado:</strong>{' '}
            {submission.completedAt
              ? new Date(submission.completedAt).toLocaleString('pt-BR')
              : '—'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Total de arquivos:</strong> {submission.uploads.length}
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="h5" gutterBottom>
        Documentos enviados
      </Typography>

      {sortedSteps.map((step) => {
        const stepUploads = submission.uploads.filter((u) => u.workflowStepId === step.id);

        return (
          <Card key={step.id} sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {step.title}
              </Typography>
              {stepUploads.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum arquivo enviado neste step.
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
