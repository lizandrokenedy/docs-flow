'use client';

import type { WorkflowVersionChange } from '@docs-flow/types';
import HistoryIcon from '@mui/icons-material/History';
import {
  Alert,
  Box,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { WorkflowVersionDetailSkeleton, WorkflowVersionHistorySkeleton } from '@/components/skeletons/PageSkeletons';

interface VersionListItem {
  version: number;
  changeLabel: string | null;
  createdAt: string;
  isCurrent: boolean;
  stepCount: number | null;
  changes?: WorkflowVersionChange[];
}

interface VersionDetail {
  version: number;
  changeLabel: string | null;
  createdAt: string;
  isCurrent: boolean;
  changes: WorkflowVersionChange[];
  comparedFromVersion: number | null;
  comparedToVersion: number | null;
}

interface WorkflowVersionHistoryProps {
  workflowId: string;
  submissionCount?: number;
}

export function WorkflowVersionHistory({
  workflowId,
  submissionCount = 0,
}: WorkflowVersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const { data: versions = [], isLoading, isError, error } = useQuery({
    queryKey: ['workflow-versions', workflowId],
    queryFn: () => api.get<VersionListItem[]>(`/workflows/${workflowId}/versions`),
  });

  useEffect(() => {
    setSelectedVersion(null);
  }, [workflowId]);

  useEffect(() => {
    if (selectedVersion === null) {
      return;
    }

    if (!versions.some((item) => item.version === selectedVersion)) {
      setSelectedVersion(null);
    }
  }, [versions, selectedVersion]);

  const activeVersion = selectedVersion ?? versions[0]?.version ?? null;

  const {
    data: versionDetail,
    isLoading: loadingDetail,
    isFetching: fetchingDetail,
    isError: detailError,
    error: detailErrorObject,
  } = useQuery({
    queryKey: ['workflow-version', workflowId, activeVersion],
    queryFn: () => api.get<VersionDetail>(`/workflows/${workflowId}/versions/${activeVersion}`),
    enabled: activeVersion !== null,
  });

  if (isLoading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <HistoryIcon color="primary" />
          <Typography variant="h6">Histórico de alterações</Typography>
        </Box>
        <WorkflowVersionHistorySkeleton />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error">
        {(error as Error)?.message ?? 'Não foi possível carregar o histórico de versões.'}
      </Alert>
    );
  }

  const archivedVersions = versions.filter((item) => !item.isCurrent);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <HistoryIcon color="primary" />
        <Typography variant="h6">Histórico de alterações</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Registra mudanças que afetam o fluxo (ordem, condições, ramificações, obrigatoriedade).
        Ajustes de texto e instruções não geram nova versão.
      </Typography>

      {submissionCount === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          O histórico só registra alterações de fluxo depois da primeira submissão. Edições feitas
          antes disso não geram versões arquivadas — a aba mostra apenas a versão atual do fluxo.
        </Alert>
      ) : archivedVersions.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Ainda não há versões arquivadas neste workflow. A próxima alteração de fluxo (nova etapa,
          reordenação, condição, etc.) criará uma entrada no histórico.
        </Alert>
      ) : null}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ maxHeight: 480, overflow: 'auto' }}>
          <List dense disablePadding>
            {versions.map((item) => (
              <ListItemButton
                key={item.version}
                selected={item.version === activeVersion}
                onClick={() => setSelectedVersion(item.version)}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontWeight={600}>v{item.version}</Typography>
                      {item.isCurrent && <Chip label="Atual" size="small" color="primary" />}
                    </Box>
                  }
                  secondary={
                    <>
                      {item.changeLabel || 'Sem descrição'}
                      <br />
                      {new Date(item.createdAt).toLocaleString('pt-BR')}
                      {item.changes && item.changes.length > 0 && (
                        <>
                          <br />
                          <Typography component="span" variant="caption" color="text.secondary">
                            {item.changes[0].description}
                            {item.changes.length > 1 ? ` (+${item.changes.length - 1})` : ''}
                          </Typography>
                        </>
                      )}
                    </>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, minHeight: 240 }}>
          {activeVersion === null ? (
            <Typography color="text.secondary">Nenhuma versão disponível.</Typography>
          ) : detailError ? (
            <Alert severity="error">
              {(detailErrorObject as Error)?.message ??
                'Não foi possível carregar os detalhes desta versão.'}
            </Alert>
          ) : loadingDetail || (fetchingDetail && !versionDetail) ? (
            <WorkflowVersionDetailSkeleton />
          ) : !versionDetail ? (
            <Typography color="text.secondary">Detalhes indisponíveis para esta versão.</Typography>
          ) : (
            <>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {versionDetail.isCurrent
                  ? `Versão atual (v${versionDetail.version})`
                  : `Versão v${versionDetail.version}`}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {versionDetail.changeLabel || 'Alteração registrada'}
                {versionDetail.comparedFromVersion !== null &&
                  versionDetail.comparedToVersion !== null &&
                  ` · v${versionDetail.comparedFromVersion} para v${versionDetail.comparedToVersion}`}
              </Typography>

              {versionDetail.changes.length === 0 ? (
                <Typography color="text.secondary">
                  Nenhuma diferença de fluxo registrada para esta versão.
                </Typography>
              ) : (
                <List dense>
                  {versionDetail.changes.map((change, index) => (
                    <ListItem key={`${versionDetail.version}-${index}`} sx={{ px: 0 }}>
                      <ListItemText primary={change.description} />
                    </ListItem>
                  ))}
                </List>
              )}
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
