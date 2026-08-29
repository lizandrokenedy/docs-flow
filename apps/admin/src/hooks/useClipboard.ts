'use client';

import { useCallback } from 'react';
import { useToast } from '@/components/ToastProvider';

export function useClipboard() {
  const { showToast } = useToast();

  const copyText = useCallback(
    async (text: string, successMessage = 'Copiado para a área de transferência') => {
      try {
        await navigator.clipboard.writeText(text);
        showToast(successMessage, 'success');
      } catch {
        showToast('Não foi possível copiar para a área de transferência', 'error');
      }
    },
    [showToast],
  );

  return { copyText };
}
