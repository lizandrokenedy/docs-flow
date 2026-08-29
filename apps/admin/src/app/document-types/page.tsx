'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { api } from '@/lib/api';
import type { DocumentType } from '@docs-flow/types';
import { bytesToMegabytes, megabytesToBytes } from '@docs-flow/types';

interface FormState {
  name: string;
  description: string;
  allowedExtensions: string;
  maxSizeMb: number;
}

const defaultForm: FormState = {
  name: '',
  description: '',
  allowedExtensions: 'pdf, jpg, jpeg, png',
  maxSizeMb: 10,
};

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

function extensionsToMime(extensions: string[]) {
  return extensions.map((ext) => MIME_MAP[ext.toLowerCase()] || `application/${ext}`);
}

export default function DocumentTypesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentType | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);

  const { data: documentTypes = [], isLoading } = useQuery({
    queryKey: ['document-types'],
    queryFn: () => api.get<DocumentType[]>('/document-types'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const extensions = form.allowedExtensions
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      const payload = {
        name: form.name,
        description: form.description || undefined,
        allowedExtensions: extensions,
        allowedMimeTypes: extensionsToMime(extensions),
        maxSizeBytes: megabytesToBytes(form.maxSizeMb),
      };

      if (editing) {
        return api.patch(`/document-types/${editing.id}`, payload);
      }
      return api.post('/document-types', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
      showToast(editing ? 'Tipo atualizado' : 'Tipo criado');
      handleClose();
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/document-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
      showToast('Tipo removido');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const handleOpen = (docType?: DocumentType) => {
    if (docType) {
      setEditing(docType);
      setForm({
        name: docType.name,
        description: docType.description || '',
        allowedExtensions: docType.allowedExtensions.join(', '),
        maxSizeMb: Math.round(bytesToMegabytes(docType.maxSizeBytes)),
      });
    } else {
      setEditing(null);
      setForm(defaultForm);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setForm(defaultForm);
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Nome', flex: 1 },
    { field: 'description', headerName: 'Descrição', flex: 2 },
    {
      field: 'allowedExtensions',
      headerName: 'Formatos',
      flex: 1,
      valueGetter: (value: string[]) => value?.join(', ').toUpperCase(),
    },
    {
      field: 'maxSizeBytes',
      headerName: 'Tamanho Máx.',
      width: 120,
      valueGetter: (value: number) => `${bytesToMegabytes(value).toFixed(1)} MB`,
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => handleOpen(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => {
              if (confirm('Remover este tipo de documento?')) {
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
        <Typography variant="h4">Tipos de Documento</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Novo Tipo
        </Button>
      </Box>

      <DataGrid
        rows={documentTypes}
        columns={columns}
        loading={isLoading}
        autoHeight
        pageSizeOptions={[10, 25]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        disableRowSelectionOnClick
      />

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Tipo' : 'Novo Tipo de Documento'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome"
            fullWidth
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label="Descrição"
            fullWidth
            margin="normal"
            multiline
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <TextField
            label="Extensões aceitas (separadas por vírgula)"
            fullWidth
            margin="normal"
            value={form.allowedExtensions}
            onChange={(e) => setForm({ ...form, allowedExtensions: e.target.value })}
            helperText="Ex: pdf, jpg, png"
          />
          <TextField
            label="Tamanho máximo (MB)"
            fullWidth
            margin="normal"
            type="number"
            inputProps={{ min: 1, step: 1 }}
            value={form.maxSizeMb}
            onChange={(e) => setForm({ ...form, maxSizeMb: Number(e.target.value) })}
            helperText="Tamanho máximo permitido por arquivo"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => saveMutation.mutate()}
            disabled={!form.name || saveMutation.isPending}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
