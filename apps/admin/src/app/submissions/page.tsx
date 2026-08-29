'use client';

import VisibilityIcon from '@mui/icons-material/Visibility';
import { Box, Card, CardContent, Chip, IconButton, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface SubmissionRow {
  id: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  workflow: { name: string; slug: string };
  uploads: unknown[];
}

export default function SubmissionsPage() {
  const router = useRouter();

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['submissions'],
    queryFn: () => api.get<SubmissionRow[]>('/submissions'),
  });

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace" fontSize={12}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'workflow',
      headerName: 'Workflow',
      flex: 1,
      valueGetter: (value: { name: string }) => value?.name,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'COMPLETED' ? 'success' : 'primary'}
        />
      ),
    },
    {
      field: 'uploads',
      headerName: 'Arquivos',
      width: 90,
      valueGetter: (value: unknown[]) => value?.length ?? 0,
    },
    {
      field: 'startedAt',
      headerName: 'Iniciado em',
      width: 180,
      valueGetter: (value: string) => new Date(value).toLocaleString('pt-BR'),
    },
    {
      field: 'completedAt',
      headerName: 'Finalizado em',
      width: 180,
      valueGetter: (value?: string) => (value ? new Date(value).toLocaleString('pt-BR') : '—'),
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          size="small"
          component={Link}
          href={`/submissions/${params.row.id}`}
          aria-label="ver detalhes"
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Submissões
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Acompanhe os documentos enviados pelos usuários. Clique em uma linha para ver os arquivos.
      </Typography>

      <DataGrid
        rows={submissions}
        columns={columns}
        loading={isLoading}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        onRowClick={(params: GridRowParams) => router.push(`/submissions/${params.id}`)}
        sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
      />

      {!isLoading && submissions.length === 0 && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography color="text.secondary" textAlign="center">
              Nenhuma submissão recebida ainda.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
