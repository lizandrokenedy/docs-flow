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
            {step.documentType?.name} {step.isRequired ? '· Obrigatório' : '· Opcional'}
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
      isRequired: data.isRequired,
      maxFiles: data.maxFiles,
      acceptedExtensionsOverride: extensions.length > 0 ? extensions : undefined,
    };
  };

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
      api.patch(`/workflows/${workflowId}/steps/reorder`, { steps }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      showToast('Ordem dos steps atualizada');
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

  const openStepDialog = (step?: WorkflowStep) => {
    if (step) {
      setEditingStep(step);
      setStepForm({
        documentTypeId: step.documentTypeId,
        title: step.title,
        instructions: step.instructions || '',
        helpText: step.helpText || '',
        exampleUrl: step.exampleUrl || '',
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
            disabled={!stepForm.title || !stepForm.documentTypeId}
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
