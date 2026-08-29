'use client';

import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getPublicWorkflowUrl } from '@/lib/config';

interface WorkflowSummary {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  steps: unknown[];
  _count: { submissions: number };
}

interface SubmissionSummary {
  id: string;
  status: string;
  startedAt: string;
  workflow: { name: string; slug: string };
}

export default function DashboardPage() {
  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.get<WorkflowSummary[]>('/workflows'),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['submissions'],
    queryFn: () => api.get<SubmissionSummary[]>('/submissions'),
  });

  const activeWorkflows = workflows.filter((w) => w.isActive).length;
  const recentSubmissions = submissions.slice(0, 5);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Dashboard</Typography>
        <Button component={Link} href="/workflows" variant="contained" startIcon={<AddIcon />}>
          Novo Workflow
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Workflows Ativos
              </Typography>
              <Typography variant="h3">{activeWorkflows}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total de Workflows
              </Typography>
              <Typography variant="h3">{workflows.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Submissões
              </Typography>
              <Typography variant="h3">{submissions.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h5" gutterBottom>
        Workflows
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {workflows.map((workflow) => (
          <Grid size={{ xs: 12, md: 6 }} key={workflow.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6">{workflow.name}</Typography>
                  <Chip
                    label={workflow.isActive ? 'Ativo' : 'Inativo'}
                    color={workflow.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {workflow.steps.length} steps · {workflow._count.submissions} submissões
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button component={Link} href={`/workflows/${workflow.id}`} size="small">
                    Editar
                  </Button>
                  {workflow.isActive && (
                    <Button
                      component={Link}
                      href={getPublicWorkflowUrl(workflow.slug)}
                      target="_blank"
                      size="small"
                      endIcon={<OpenInNewIcon />}
                    >
                      Abrir público
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h5" gutterBottom>
        Submissões Recentes
      </Typography>
      {recentSubmissions.length === 0 ? (
        <Typography color="text.secondary">Nenhuma submissão ainda.</Typography>
      ) : (
        recentSubmissions.map((sub) => (
          <Card
            key={sub.id}
            component={Link}
            href={`/submissions/${sub.id}`}
            sx={{ mb: 1, textDecoration: 'none', cursor: 'pointer', '&:hover': { boxShadow: 3 } }}
          >
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body1">{sub.workflow.name}</Typography>
                  <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                    {sub.id}
                  </Typography>
                </Box>
                <Chip
                  label={sub.status}
                  size="small"
                  color={sub.status === 'COMPLETED' ? 'success' : 'primary'}
                />
              </Box>
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
}
