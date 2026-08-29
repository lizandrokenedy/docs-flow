'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Button, IconButton, Tooltip } from '@mui/material';
import { useClipboard } from '@/hooks/useClipboard';

interface CopyLinkButtonProps {
  url: string;
  label?: string;
  variant?: 'icon' | 'button';
  successMessage?: string;
}

export function CopyLinkButton({
  url,
  label = 'Copiar link',
  variant = 'button',
  successMessage = 'Link copiado',
}: CopyLinkButtonProps) {
  const { copyText } = useClipboard();

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    void copyText(url, successMessage);
  };

  if (variant === 'icon') {
    return (
      <Tooltip title="Copiar link público">
        <IconButton size="small" onClick={handleClick} aria-label="copiar link público">
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Button size="small" startIcon={<ContentCopyIcon />} onClick={handleClick}>
      {label}
    </Button>
  );
}
