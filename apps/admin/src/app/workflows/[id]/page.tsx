'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AddIcon from '@mui/icons-material/Add';
import ControlPointDuplicateIcon from '@mui/icons-material/ControlPointDuplicate';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { StepInstructions } from '@docs-flow/ui';
import { getStepAcceptedExtensions } from '@docs-flow/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { CopyLinkButton } from '@/components/CopyLinkButton';
import { api } from '@/lib/api';
import { getPublicWorkflowUrl } from '@/lib/config';
import type { DocumentType, Workflow, WorkflowStep } from '@docs-flow/types';

interface StepForm {
  documentTypeId: string;
  title: string;
  instructions: string;
  helpText: string;
  exampleUrl: string;
  stepKind: 'DOCUMENT' | 'CHOICE';
  branchKey: string;
  conditionStepId: string;
  choiceOptions: string;
  isRequired: boolean;
  maxFiles: number;
  acceptedExtensionsOverride: string;
}

const defaultStepForm: StepForm = {
  documentTypeId: '',
  title: '',
  instructions: '',
  helpText: '',
  exampleUrl: '',
  stepKind: 'DOCUMENT',
  branchKey: '',
  conditionStepId: '',
  choiceOptions: '',
  isRequired: true,
  maxFiles: 1,
  acceptedExtensionsOverride: '',
};

function SortableStepItem({
  step,
  index,
  onEdit,
  onDelete,
}: {
  step: WorkflowStep;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: step.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card ref={setNodeRef} style={style} sx={{ mb: 1 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
        <IconButton size="small" {...attributes} {...listeners} sx={{ cursor: 'grab' }}>
          <DragIndicatorIcon />
        </IconButton>
        <Chip label={index + 1} size="small" />
        <Box sx={{ flex: 1 }} onClick={onEdit} style={{ cursor: 'pointer' }}>
          <Typography variant="subtitle1">{step.title}</Typography>
          <Typography variant="caption" color="text.secondary">
            {step.stepKind === 'CHOICE' ? 'Escolha' : step.documentType?.name}
            {step.branchKey ? ` · ${step.branchKey}` : ''}
            {step.conditionStepId ? ' · Condicional' : ''}
            {step.isRequired ? ' · Obrigatório' : ' · Opcional'}
          </Typography>
        </Box>
        <IconButton size="small" color="error" onClick={onDelete}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardContent>
    </Card>
  );
}

export default function WorkflowEditorPage() {
  const params = useParams();
  const workflowId = params.id as string;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState(0);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [stepForm, setStepForm] = useState<StepForm>(defaultStepForm);
  const [previewStepIndex, setPreviewStepIndex] = useState(0);

  const [generalForm, setGeneralForm] = useState({
    name: '',
    slug: '',
    description: '',
    isActive: false,
    isTemplate: false,
    templateCategory: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => api.get<Workflow & { steps: WorkflowStep[]; _count?: { submissions: number } }>(`/workflows/${workflowId}`),
  });

  const { data: documentTypes = [] } = useQuery({
    queryKey: ['document-types'],
    queryFn: () => api.get<DocumentType[]>('/document-types'),
  });

  useEffect(() => {
    if (workflow) {
      setGeneralForm({
        name: workflow.name,
        slug: workflow.slug,
        description: workflow.description || '',
        isActive: workflow.isActive,
        isTemplate: workflow.isTemplate ?? false,
        templateCategory: workflow.templateCategory || '',
      });
    }
  }, [workflow]);

  const buildStepPayload = (data: StepForm) => {
    const extensions = data.acceptedExtensionsOverride
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    return {
      documentTypeId: data.documentTypeId,
      title: data.title,
      instructions: data.instructions || undefined,
      helpText: data.helpText || undefined,
      exampleUrl: data.exampleUrl || undefined,
      stepKind: data.stepKind,
      branchKey: data.branchKey || undefined,
      conditionStepId: data.conditionStepId || null,
      choiceOptions: data.choiceOptions
        .split(',')
        .map((option) => option.trim())
        .filter(Boolean),
      isRequired: data.isRequired,
      maxFiles: data.maxFiles,
      acceptedExtensionsOverride: extensions.length > 0 ? extensions : undefined,
    };
  };

  const duplicateMutation = useMutation({
    mutationFn: () => api.post<Workflow>(`/workflows/${workflowId}/duplicate`, {}),
    onSuccess: (data) => {
      showToast('Workflow duplicado');
      window.location.href = `/workflows/${data.id}`;
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: (data: typeof generalForm) => api.patch(`/workflows/${workflowId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      showToast('Workflow atualizado');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const addStepMutation = useMutation({
    mutationFn: (data: StepForm) =>
      api.post(`/workflows/${workflowId}/steps`, {
        ...buildStepPayload(data),
        position: workflow?.steps?.length ?? 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      showToast('Step adicionado');
      setStepDialogOpen(false);
      setStepForm(defaultStepForm);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ stepId, data }: { stepId: string; data: StepForm }) =>
      api.patch(`/workflows/${workflowId}/steps/${stepId}`, buildStepPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      showToast('Step atualizado');
      setStepDialogOpen(false);
      setEditingStep(null);
      setStepForm(defaultStepForm);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const deleteStepMutation = useMutation({
    mutationFn: (stepId: string) => api.delete(`/workflows/${workflowId}/steps/${stepId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      showToast('Step removido');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const reorderMutation = useMutation({
    mutationFn: (steps: { id: string; position: number }[]) =>
      api.patch<{ clearedConditions?: number }>(`/workflows/${workflowId}/steps/reorder`, { steps }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      if (data.clearedConditions && data.clearedConditions > 0) {
        showToast(
          `Ordem atualizada. ${data.clearedConditions} condicional(is) removida(s) por ficarem inválidas.`,
          'error',
        );
      } else {
        showToast('Ordem dos steps atualizada');
      }
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !workflow?.steps) return;

    const oldIndex = workflow.steps.findIndex((s) => s.id === active.id);
    const newIndex = workflow.steps.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(workflow.steps, oldIndex, newIndex);

    reorderMutation.mutate(reordered.map((s, i) => ({ id: s.id, position: i })));
  };

  const getConditionCandidateSteps = (steps: WorkflowStep[], forPosition: number, excludeId?: string) =>
    steps.filter((item) => item.position < forPosition && item.id !== excludeId);

  const getConditionHelperText = (forPosition: number) => {
    if (forPosition === 0) {
      return 'Primeira etapa do fluxo — sempre visível para o usuário.';
    }

    return 'A etapa só aparece depois que a etapa selecionada for preenchida. Se você reordenar o fluxo, condicionais inválidas são removidas automaticamente.';
  };

  const openStepDialog = (step?: WorkflowStep) => {
    const steps = [...(workflow?.steps || [])].sort((a, b) => a.position - b.position);

    if (step) {
      const validConditionIds = new Set(
        getConditionCandidateSteps(steps, step.position, step.id).map((item) => item.id),
      );
      const conditionStepId =
        step.conditionStepId && validConditionIds.has(step.conditionStepId)
          ? step.conditionStepId
          : '';

      setEditingStep(step);
      setStepForm({
        documentTypeId: step.documentTypeId || step.documentType?.id || '',
        title: step.title,
        instructions: step.instructions || '',
        helpText: step.helpText || '',
        exampleUrl: step.exampleUrl || '',
        stepKind: step.stepKind ?? 'DOCUMENT',
        branchKey: step.branchKey || '',
        conditionStepId,
        choiceOptions: step.choiceOptions?.join(', ') || '',
        isRequired: step.isRequired,
        maxFiles: step.maxFiles,
        acceptedExtensionsOverride: step.acceptedExtensionsOverride?.join(', ') || '',
      });
    } else {
      setEditingStep(null);
      setStepForm({
        ...defaultStepForm,
        documentTypeId: documentTypes[0]?.id || '',
      });
    }
    setStepDialogOpen(true);
  };

  if (isLoading || !workflow) {
    return <Typography>Carregando...</Typography>;
  }

  const sortedSteps = [...(workflow.steps || [])].sort((a, b) => a.position - b.position);
  const editingStepPosition = editingStep?.position ?? sortedSteps.length;
  const hasValidDocumentType =
    Boolean(stepForm.documentTypeId) &&
    documentTypes.some((documentType) => documentType.id === stepForm.documentTypeId);
  const conditionCandidateSteps = getConditionCandidateSteps(
    sortedSteps,
    editingStepPosition,
    editingStep?.id,
  );
  const conditionHelperText = getConditionHelperText(editingStepPosition);
  const previewStep = sortedSteps[previewStepIndex];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">{workflow.name}</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {workflow.isActive && (
            <>
              <Button
                component={Link}
                href={getPublicWorkflowUrl(workflow.slug)}
                target="_blank"
                endIcon={<OpenInNewIcon />}
              >
                Ver público
              </Button>
              <CopyLinkButton url={getPublicWorkflowUrl(workflow.slug)} />
            </>
          )}
          <Button
            variant="outlined"
            startIcon={<ControlPointDuplicateIcon />}
            onClick={() => duplicateMutation.mutate()}
            disabled={duplicateMutation.isPending}
          >
            Duplicar
          </Button>
          <Button component={Link} href="/workflows" variant="outlined">
            Voltar
          </Button>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Geral" />
        <Tab label={`Steps (${sortedSteps.length})`} />
        <Tab label="Preview" />
      </Tabs>

      {tab === 0 && (
        <Card>
          <CardContent>
            <TextField
              label="Nome"
              fullWidth
              margin="normal"
              value={generalForm.name}
              onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
            />
            <TextField
              label="Slug"
              fullWidth
              margin="normal"
              value={generalForm.slug}
              onChange={(e) => setGeneralForm({ ...generalForm, slug: e.target.value })}
              helperText={`URL pública: /w/${generalForm.slug}`}
            />
            <TextField
              label="Descrição"
              fullWidth
              margin="normal"
              multiline
              rows={3}
              value={generalForm.description}
              onChange={(e) => setGeneralForm({ ...generalForm, description: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={generalForm.isActive}
                  onChange={(e) =>
                    setGeneralForm({ ...generalForm, isActive: e.target.checked })
                  }
                />
              }
              label="Workflow ativo"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={generalForm.isTemplate}
                  onChange={(e) =>
                    setGeneralForm({ ...generalForm, isTemplate: e.target.checked })
                  }
                />
              }
              label="Usar como template"
            />
            <TextField
              label="Categoria do template"
              fullWidth
              margin="normal"
              value={generalForm.templateCategory}
              onChange={(e) =>
                setGeneralForm({ ...generalForm, templateCategory: e.target.value })
              }
              helperText="Ex.: inventario, onboarding, rh"
              disabled={!generalForm.isTemplate}
            />
            {workflow.version > 1 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Versão atual do workflow: v{workflow.version}. Submissões antigas usam o snapshot
                capturado no início do envio.
              </Alert>
            )}
            {generalForm.isActive && sortedSteps.length === 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Adicione ao menos um step antes de ativar o workflow.
              </Alert>
            )}
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => updateWorkflowMutation.mutate(generalForm)}
                disabled={updateWorkflowMutation.isPending}
              >
                Salvar alterações
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openStepDialog()}
              disabled={documentTypes.length === 0}
            >
              Adicionar Step
            </Button>
          </Box>

          {documentTypes.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Cadastre tipos de documento antes de adicionar steps.
            </Alert>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedSteps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {sortedSteps.map((step, index) => (
                <SortableStepItem
                  key={step.id}
                  step={step}
                  index={index}
                  onEdit={() => openStepDialog(step)}
                  onDelete={() => {
                    if (confirm('Remover este step?')) {
                      deleteStepMutation.mutate(step.id);
                    }
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>

          {sortedSteps.length === 0 && (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              Nenhum step cadastrado. Adicione o primeiro step do workflow.
            </Typography>
          )}
        </Box>
      )}

      {tab === 2 && (
        <Box>
          {sortedSteps.length === 0 ? (
            <Alert severity="info">Adicione steps para visualizar o preview.</Alert>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {sortedSteps.map((step, index) => (
                  <Chip
                    key={step.id}
                    label={`${index + 1}. ${step.title}`}
                    onClick={() => setPreviewStepIndex(index)}
                    color={previewStepIndex === index ? 'primary' : 'default'}
                    variant={previewStepIndex === index ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
              {previewStep && (
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
                  maxSizeBytes={previewStep.documentType?.maxSizeBytes}
                />
              )}
            </Box>
          )}
        </Box>
      )}

      <Dialog open={stepDialogOpen} onClose={() => setStepDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingStep ? 'Editar Step' : 'Novo Step'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Tipo de etapa</InputLabel>
            <Select
              value={stepForm.stepKind}
              label="Tipo de etapa"
              onChange={(e) =>
                setStepForm({
                  ...stepForm,
                  stepKind: e.target.value as 'DOCUMENT' | 'CHOICE',
                })
              }
            >
              <MenuItem value="DOCUMENT">Documento</MenuItem>
              <MenuItem value="CHOICE">Escolha (pergunta)</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Tipo de Documento</InputLabel>
            <Select
              value={stepForm.documentTypeId}
              label="Tipo de Documento"
              onChange={(e) => setStepForm({ ...stepForm, documentTypeId: e.target.value })}
            >
              {documentTypes.map((dt) => (
                <MenuItem key={dt.id} value={dt.id}>
                  {dt.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Título do Step"
            fullWidth
            margin="normal"
            value={stepForm.title}
            onChange={(e) => setStepForm({ ...stepForm, title: e.target.value })}
          />
          <TextField
            label="Instruções (Markdown)"
            fullWidth
            margin="normal"
            multiline
            rows={4}
            value={stepForm.instructions}
            onChange={(e) => setStepForm({ ...stepForm, instructions: e.target.value })}
            helperText="Explique para que serve este documento e como enviá-lo"
          />
          <TextField
            label="Dica rápida"
            fullWidth
            margin="normal"
            value={stepForm.helpText}
            onChange={(e) => setStepForm({ ...stepForm, helpText: e.target.value })}
          />
          <TextField
            label="URL de exemplo"
            fullWidth
            margin="normal"
            value={stepForm.exampleUrl}
            onChange={(e) => setStepForm({ ...stepForm, exampleUrl: e.target.value })}
          />
          <TextField
            label="Ramificação (perfil)"
            fullWidth
            margin="normal"
            value={stepForm.branchKey}
            onChange={(e) => setStepForm({ ...stepForm, branchKey: e.target.value })}
            helperText="Ex.: herdeiro, inventariante, advogado. Deixe vazio para todos os perfis."
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Exibir somente após preencher...</InputLabel>
            <Select
              value={stepForm.conditionStepId}
              label="Exibir somente após preencher..."
              onChange={(e) =>
                setStepForm({
                  ...stepForm,
                  conditionStepId: e.target.value,
                })
              }
            >
              <MenuItem value="">Sempre visível</MenuItem>
              {conditionCandidateSteps.map((step) => (
                <MenuItem key={step.id} value={step.id}>
                  {step.position + 1}. {step.title}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{conditionHelperText}</FormHelperText>
          </FormControl>
          {stepForm.stepKind === 'CHOICE' && (
            <TextField
              label="Opções de escolha"
              fullWidth
              margin="normal"
              value={stepForm.choiceOptions}
              onChange={(e) => setStepForm({ ...stepForm, choiceOptions: e.target.value })}
              helperText="Separe por vírgula. Ex.: Sim, Não"
            />
          )}
          <TextField
            label="Máximo de arquivos"
            fullWidth
            margin="normal"
            type="number"
            value={stepForm.maxFiles}
            onChange={(e) => setStepForm({ ...stepForm, maxFiles: Number(e.target.value) })}
          />
          <TextField
            label="Extensões aceitas (override opcional)"
            fullWidth
            margin="normal"
            value={stepForm.acceptedExtensionsOverride}
            onChange={(e) =>
              setStepForm({ ...stepForm, acceptedExtensionsOverride: e.target.value })
            }
            helperText="Deixe vazio para usar as extensões do tipo de documento. Ex: pdf, jpg"
          />
          <FormControlLabel
            control={
              <Switch
                checked={stepForm.isRequired}
                onChange={(e) => setStepForm({ ...stepForm, isRequired: e.target.checked })}
              />
            }
            label="Obrigatório"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStepDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={
              !stepForm.title ||
              !hasValidDocumentType ||
              (stepForm.stepKind === 'CHOICE' &&
                stepForm.choiceOptions.split(',').map((option) => option.trim()).filter(Boolean).length < 2)
            }
            onClick={() => {
              if (editingStep) {
                updateStepMutation.mutate({ stepId: editingStep.id, data: stepForm });
              } else {
                addStepMutation.mutate(stepForm);
              }
            }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
