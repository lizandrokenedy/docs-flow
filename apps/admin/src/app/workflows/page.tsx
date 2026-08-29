'use client';

import AddIcon from '@mui/icons-material/Add';
import ControlPointDuplicateIcon from '@mui/icons-material/ControlPointDuplicate';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { CopyLinkButton } from '@/components/CopyLinkButton';
import { api } from '@/lib/api';
import { getPublicWorkflowUrl } from '@/lib/config';
import { slugify } from '@docs-flow/types';

interface WorkflowRow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  version?: number;
  steps: unknown[];
  _count: { submissions: number };
}

export default function WorkflowsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.get<WorkflowRow[]>('/workflows'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post<WorkflowRow>('/workflows', {
        name,
        slug: slug || slugify(name),
        description: description || undefined,
        isActive: false,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      showToast('Workflow criado com sucesso');
      setOpen(false);
      window.location.href = `/workflows/${data.id}`;
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/workflows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      showToast('Workflow removido');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post<WorkflowRow>(`/workflows/${id}/duplicate`, {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      showToast('Workflow duplicado');
      window.location.href = `/workflows/${data.id}`;
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Nome', flex: 1 },
    { field: 'slug', headerName: 'Slug', flex: 1 },
    {
      field: 'version',
      headerName: 'Versão',
      width: 90,
      valueGetter: (value?: number) => value ?? 1,
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Ativo' : 'Inativo'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'steps',
      headerName: 'Steps',
      width: 80,
      valueGetter: (value: unknown[]) => value?.length ?? 0,
    },
    {
      field: '_count',
      headerName: 'Submissões',
      width: 110,
      valueGetter: (value: { submissions: number }) => value?.submissions ?? 0,
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <Box onClick={(e) => e.stopPropagation()}>
          <IconButton size="small" component={Link} href={`/workflows/${params.row.id}`}>
            <EditIcon fontSize="small" />
          </IconButton>
          <Tooltip title="Duplicar workflow">
            <IconButton
              size="small"
              onClick={() => duplicateMutation.mutate(params.row.id)}
              aria-label="duplicar workflow"
            >
              <ControlPointDuplicateIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.isActive && (
            <>
              <IconButton
                size="small"
                component={Link}
                href={getPublicWorkflowUrl(params.row.slug)}
                target="_blank"
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
              <CopyLinkButton
                variant="icon"
                url={getPublicWorkflowUrl(params.row.slug)}
              />
            </>
          )}
          <IconButton
            size="small"
            color="error"
            onClick={() => {
              const count = params.row._count?.submissions ?? 0;
              const message =
                count > 0
                  ? `Este workflow possui ${count} submissão(ões). Remover também apagará todos os documentos enviados. Deseja continuar?`
                  : 'Remover este workflow?';
              if (confirm(message)) {
                deleteMutation.mutate(params.row.id);
              }
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Workflows</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" component={Link} href="/workflows/templates">
            Biblioteca de templates
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Novo Workflow
          </Button>
        </Box>
      </Box>

      <DataGrid
        rows={workflows}
        columns={columns}
        loading={isLoading}
        autoHeight
        pageSizeOptions={[10, 25]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        disableRowSelectionOnClick
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Workflow</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome"
            fullWidth
            margin="normal"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(slugify(e.target.value));
            }}
          />
          <TextField
            label="Slug (URL pública)"
            fullWidth
            margin="normal"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            helperText={`URL: /w/${slug || '...'}`}
          />
          <TextField
            label="Descrição"
            fullWidth
            margin="normal"
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => createMutation.mutate()}
            disabled={!name || createMutation.isPending}
          >
            Criar e Editar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
