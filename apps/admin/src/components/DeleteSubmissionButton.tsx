'use client';

import DeleteIcon from '@mui/icons-material/Delete';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { api } from '@/lib/api';

interface DeleteSubmissionButtonProps {
  submissionId: string;
  workflowName?: string;
  variant?: 'button' | 'icon';
  redirectTo?: string;
  onDeleted?: () => void;
}

export function DeleteSubmissionButton({
  submissionId,
  workflowName,
  variant = 'button',
  redirectTo,
  onDeleted,
}: DeleteSubmissionButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/submissions/${submissionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.removeQueries({ queryKey: ['submission', submissionId] });
      showToast('Submissão excluída');
      setOpen(false);
      onDeleted?.();
      if (redirectTo) {
        router.push(redirectTo);
      }
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  return (
    <>
      {variant === 'icon' ? (
        <IconButton
          size="small"
          color="error"
          aria-label="excluir submissão"
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            setOpen(true);
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ) : (
        <Button
          color="error"
          variant="outlined"
          startIcon={<DeleteIcon />}
          onClick={() => setOpen(true)}
        >
          Excluir submissão
        </Button>
      )}

      <Dialog open={open} onClose={() => !deleteMutation.isPending && setOpen(false)}>
        <DialogTitle>Excluir submissão?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Esta ação remove permanentemente a submissão
            {workflowName ? ` do workflow "${workflowName}"` : ''}, todas as respostas e os
            arquivos enviados. Não é possível desfazer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={deleteMutation.isPending}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
