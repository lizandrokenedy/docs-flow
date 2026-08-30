'use client';

import { StepInstructions } from '@docs-flow/ui';
import { getStepAcceptedExtensions, getQuestionTypeLabel, isQuestionStep } from '@docs-flow/types';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { TemplatesPageSkeleton } from '@/components/skeletons/PageSkeletons';
import { api } from '@/lib/api';
import { slugify } from '@docs-flow/types';
import type { Workflow, WorkflowStep } from '@docs-flow/types';

interface TemplateRow extends Workflow {
  steps: WorkflowStep[];
  templateCategory?: string | null;
}

export default function TemplateLibraryPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [customName, setCustomName] = useState('');
  const [customSlug, setCustomSlug] = useState('');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: () => api.get<TemplateRow[]>('/workflows/templates'),
  });

  const categories = useMemo(
    () =>
      [...new Set(templates.map((t) => t.templateCategory).filter(Boolean))] as string[],
    [templates],
  );

  const filtered = useMemo(
    () =>
      templates.filter(
        (template) => !categoryFilter || template.templateCategory === categoryFilter,
      ),
    [templates, categoryFilter],
  );

  const selected = filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? null;

  const sortedSteps = useMemo(
    () => [...(selected?.steps ?? [])].sort((a, b) => a.position - b.position),
    [selected],
  );

  const previewStep = sortedSteps[previewIndex];

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      setPreviewIndex(0);
      return;
    }

    const stillVisible = selectedId !== null && filtered.some((template) => template.id === selectedId);
    if (stillVisible) return;

    const next = filtered[0];
    setSelectedId(next.id);
    setPreviewIndex(0);
    setCustomName(`${next.name} (novo)`);
    setCustomSlug(`${next.slug}-${Date.now().toString().slice(-4)}`);
  }, [filtered, selectedId]);

  useEffect(() => {
    if (previewIndex >= sortedSteps.length) {
      setPreviewIndex(0);
    }
  }, [previewIndex, sortedSteps.length]);

  const createMutation = useMutation({
    mutationFn: (templateId: string) =>
      api.post<Workflow>(`/workflows/from-template/${templateId}`, {
        name: customName || `${selected?.name ?? 'Workflow'} (novo)`,
        slug: customSlug || `${selected?.slug ?? 'workflow'}-${Date.now().toString().slice(-4)}`,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      showToast('Workflow criado a partir do template');
      window.location.href = `/workflows/${data.id}`;
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const selectTemplate = (template: TemplateRow) => {
    setSelectedId(template.id);
    setPreviewIndex(0);
    setCustomName(`${template.name} (novo)`);
    setCustomSlug(`${template.slug}-${Date.now().toString().slice(-4)}`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Button component={Link} href="/workflows" startIcon={<ArrowBackIcon />} sx={{ mb: 1 }}>
            Voltar aos workflows
          </Button>
          <Typography variant="h4">Biblioteca de templates</Typography>
          <Typography variant="body2" color="text.secondary">
            Explore modelos prontos com preview das etapas antes de criar seu workflow.
          </Typography>
        </Box>
      </Box>

      {categories.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            label="Todas"
            onClick={() => setCategoryFilter('')}
            color={categoryFilter === '' ? 'primary' : 'default'}
            variant={categoryFilter === '' ? 'filled' : 'outlined'}
          />
          {categories.map((category) => (
            <Chip
              key={category}
              label={category}
              onClick={() => setCategoryFilter(category)}
              color={categoryFilter === category ? 'primary' : 'default'}
              variant={categoryFilter === category ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      )}

      {isLoading ? (
        <TemplatesPageSkeleton />
      ) : filtered.length === 0 ? (
        <Typography color="text.secondary">
          Nenhum template disponível. Marque um workflow como template no editor.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            {filtered.map((template) => (
              <Card
                key={template.id}
                sx={{
                  mb: 2,
                  borderColor: selected?.id === template.id ? 'primary.main' : 'divider',
                  borderWidth: selected?.id === template.id ? 2 : 1,
                  borderStyle: 'solid',
                  cursor: 'pointer',
                }}
                onClick={() => selectTemplate(template)}
              >
                <CardContent>
                  <Typography variant="h6">{template.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {template.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {template.steps.length} etapas
                    {template.templateCategory ? ` · ${template.templateCategory}` : ''}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            {selected && (
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    Preview: {selected.name}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {sortedSteps.map((step, index) => (
                      <Chip
                        key={step.id}
                        label={`${index + 1}. ${step.title}`}
                        onClick={() => setPreviewIndex(index)}
                        color={previewIndex === index ? 'primary' : 'default'}
                        variant={previewIndex === index ? 'filled' : 'outlined'}
                      />
                    ))}
                  </Box>

                  {previewStep && (
                    <>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        {isQuestionStep(previewStep.stepKind) && (
                          <Chip
                            label={getQuestionTypeLabel(previewStep.questionType as never)}
                            size="small"
                            color="secondary"
                          />
                        )}
                        {previewStep.conditionStepId && (
                          <Chip label="Condicional" size="small" variant="outlined" />
                        )}
                      </Box>
                      <StepInstructions
                        title={previewStep.title}
                        instructions={previewStep.instructions}
                        helpText={previewStep.helpText}
                        exampleUrl={previewStep.exampleUrl}
                        documentTypeName={previewStep.documentType?.name}
                        acceptedExtensions={getStepAcceptedExtensions({
                          acceptedExtensionsOverride: previewStep.acceptedExtensionsOverride,
                          documentType: previewStep.documentType,
                        })}
                        maxSizeBytes={previewStep.documentType?.maxSizeBytes ?? 10485760}
                      />
                    </>
                  )}

                  <Box sx={{ mt: 3, display: 'grid', gap: 2, maxWidth: 480 }}>
                    <TextField
                      label="Nome do novo workflow"
                      value={customName}
                      onChange={(e) => {
                        setCustomName(e.target.value);
                        setCustomSlug(slugify(e.target.value));
                      }}
                      fullWidth
                    />
                    <TextField
                      label="Slug"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value)}
                      fullWidth
                      helperText={`URL: /w/${customSlug || '...'}`}
                    />
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => createMutation.mutate(selected.id)}
                      disabled={!customName || createMutation.isPending}
                    >
                      Criar workflow a partir deste template
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
