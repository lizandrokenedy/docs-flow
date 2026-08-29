'use client';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import {
  Box,
  Chip,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { formatFileSize } from '@docs-flow/types';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';
import { fadeInUp, transition } from './motion';

export interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  previewUrl?: string;
}

export interface FileDropzoneProps {
  acceptedExtensions: string[];
  maxSizeBytes: number;
  maxFiles?: number;
  files: UploadedFile[];
  uploading?: boolean;
  uploadProgress?: number;
  error?: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: (fileId: string) => Promise<void>;
  disabled?: boolean;
  enableCamera?: boolean;
}

const MotionPaper = motion.create(Paper);
const MotionUploadIcon = motion.create(CloudUploadIcon);

export function FileDropzone({
  acceptedExtensions,
  maxSizeBytes,
  maxFiles = 1,
  files,
  uploading = false,
  uploadProgress = 0,
  error,
  onUpload,
  onRemove,
  disabled = false,
  enableCamera = false,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const fileLimit = Math.max(1, maxFiles);
  const accept = acceptedExtensions.map((ext) => `.${ext.replace(/^\./, '')}`).join(',');
  const canAddMore = files.length < fileLimit;
  const remainingSlots = fileLimit - files.length;
  const allowsMultiple = fileLimit > 1;

  const validateFile = useCallback(
    (file: File): string | null => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const allowed = acceptedExtensions.map((e) => e.replace(/^\./, '').toLowerCase());
      if (!allowed.includes(ext)) {
        return `Formato não aceito. Use: ${allowed.join(', ').toUpperCase()}`;
      }
      if (file.size > maxSizeBytes) {
        return `Arquivo muito grande. Máximo: ${formatFileSize(maxSizeBytes)}`;
      }
      return null;
    },
    [acceptedExtensions, maxSizeBytes],
  );

  const openFilePicker = useCallback(() => {
    if (disabled || uploading || !canAddMore) return;
    inputRef.current?.click();
  }, [disabled, uploading, canAddMore]);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length || disabled || uploading) return;
      setLocalError(null);

      const remaining = fileLimit - files.length;
      if (remaining <= 0) {
        setLocalError(`Limite de ${fileLimit} arquivo(s) atingido`);
        return;
      }

      for (const file of Array.from(fileList).slice(0, remaining)) {
        const validationError = validateFile(file);
        if (validationError) {
          setLocalError(validationError);
          return;
        }
        await onUpload(file);
      }

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [disabled, uploading, fileLimit, files.length, validateFile, onUpload],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const dropzoneSx = {
    p: files.length > 0 ? 2.5 : 4,
    textAlign: 'center' as const,
    cursor: disabled || uploading || !canAddMore ? 'not-allowed' : 'pointer',
    borderStyle: 'dashed' as const,
    borderWidth: 2,
    borderColor: dragOver ? 'primary.main' : 'divider',
    bgcolor: dragOver ? 'action.hover' : 'background.paper',
    opacity: disabled || !canAddMore ? 0.6 : 1,
  };

  return (
    <Box
      component={motion.div}
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      transition={{ ...transition.normal, delay: 0.08 }}
    >
      {allowsMultiple && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Chip
            size="small"
            label={`${files.length} de ${fileLimit} arquivo(s)`}
            color={canAddMore ? 'primary' : 'default'}
            variant={canAddMore ? 'outlined' : 'filled'}
          />
          {canAddMore && (
            <Typography variant="caption" color="text.secondary">
              Você pode adicionar mais {remainingSlots} arquivo(s) nesta etapa
            </Typography>
          )}
        </Box>
      )}

      {files.length > 0 && (
        <List sx={{ mb: canAddMore ? 2 : 0 }}>
          <AnimatePresence initial={false}>
            {files.map((file) => (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, x: -12, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 12, height: 0 }}
                transition={transition.normal}
              >
                <ListItem
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="remover"
                      onClick={() => onRemove(file.id)}
                      disabled={disabled || uploading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                  sx={{ bgcolor: 'action.hover', borderRadius: 2, mb: 1 }}
                >
                  <ListItemIcon>
                    {file.previewUrl && file.mimeType.startsWith('image/') ? (
                      <Box
                        component={motion.img}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={transition.spring}
                        src={file.previewUrl}
                        alt={file.originalName}
                        sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }}
                      />
                    ) : (
                      <InsertDriveFileIcon />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={file.originalName}
                    secondary={formatFileSize(file.sizeBytes)}
                  />
                </ListItem>
              </motion.div>
            ))}
          </AnimatePresence>
        </List>
      )}

      {canAddMore && (
        <MotionPaper
          variant="outlined"
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={openFilePicker}
          animate={{ scale: dragOver ? 1.02 : 1 }}
          whileHover={disabled || uploading ? undefined : { scale: 1.01 }}
          whileTap={disabled || uploading ? undefined : { scale: 0.99 }}
          transition={transition.fast}
          sx={dropzoneSx}
        >
          <MotionUploadIcon
            animate={{
              y: dragOver ? -4 : 0,
              scale: dragOver ? 1.1 : 1,
            }}
            transition={transition.fast}
            sx={{
              fontSize: files.length > 0 ? 36 : 48,
              color: 'primary.main',
              mb: 1,
            }}
          />
          <Typography variant="body1" fontWeight={600}>
            {files.length > 0
              ? 'Adicionar outro arquivo'
              : 'Arraste arquivos aqui ou clique para selecionar'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {acceptedExtensions.join(', ').toUpperCase()}, até {formatFileSize(maxSizeBytes)}
            {allowsMultiple && ` · até ${fileLimit} arquivo(s)`}
          </Typography>
        </MotionPaper>
      )}

      {!canAddMore && files.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Limite de {fileLimit} arquivo(s) atingido para esta etapa.
        </Typography>
      )}

      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept}
        capture={enableCamera ? 'environment' : undefined}
        multiple={allowsMultiple && remainingSlots > 1}
        disabled={disabled || uploading || !canAddMore}
        onChange={(e) => handleFiles(e.target.files)}
      />

      <AnimatePresence>
        {uploading && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={transition.fast}
          >
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Enviando... {uploadProgress}%
              </Typography>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(error || localError) && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={transition.fast}
          >
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error || localError}
            </Typography>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
