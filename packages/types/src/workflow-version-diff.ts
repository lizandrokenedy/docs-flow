import type { WorkflowSnapshot } from './workflow-logic';
import { getChoiceOptionLabels, getQuestionTypeLabel } from './question';

export interface WorkflowVersionChange {
  description: string;
}

type SnapshotStep = WorkflowSnapshot['steps'][number];

function sortedSteps(snapshot: WorkflowSnapshot) {
  return [...snapshot.steps].sort((a, b) => a.position - b.position);
}

function stepLabel(step: SnapshotStep) {
  return `${step.position + 1}. ${step.title}`;
}

function findStep(snapshot: WorkflowSnapshot, stepId: string | null | undefined) {
  if (!stepId) return null;
  return snapshot.steps.find((step) => step.id === stepId) ?? null;
}

function describeCondition(step: SnapshotStep, snapshot: WorkflowSnapshot) {
  if (!step.conditionStepId) return 'Sempre visível';

  const prerequisite = findStep(snapshot, step.conditionStepId);
  const prerequisiteLabel = prerequisite ? stepLabel(prerequisite) : 'etapa desconhecida';

  if (step.conditionValue) {
    if (prerequisite?.questionType === 'MULTI_CHOICE') {
      return `Após incluir "${step.conditionValue}" em ${prerequisiteLabel}`;
    }

    return `Após responder "${step.conditionValue}" em ${prerequisiteLabel}`;
  }

  return `Após preencher ${prerequisiteLabel}`;
}

function formatList(values: string[]) {
  return values.length > 0 ? values.join(', ') : '(vazio)';
}

function pushChange(changes: WorkflowVersionChange[], description: string) {
  changes.push({ description });
}

function fromTo(before: string | number, after: string | number) {
  return `de ${before} para ${after}`;
}

export function diffWorkflowSnapshots(
  before: WorkflowSnapshot,
  after: WorkflowSnapshot,
): WorkflowVersionChange[] {
  const changes: WorkflowVersionChange[] = [];

  if (before.name !== after.name) {
    pushChange(changes, `Nome do workflow alterado ${fromTo(`"${before.name}"`, `"${after.name}"`)}`);
  }

  if ((before.description ?? '') !== (after.description ?? '')) {
    pushChange(changes, 'Descrição do workflow alterada');
  }

  const beforeSteps = sortedSteps(before);
  const afterSteps = sortedSteps(after);
  const beforeById = new Map(beforeSteps.map((step) => [step.id, step]));
  const afterById = new Map(afterSteps.map((step) => [step.id, step]));

  for (const step of afterSteps) {
    if (!beforeById.has(step.id)) {
      pushChange(changes, `Etapa adicionada: ${stepLabel(step)}`);
    }
  }

  for (const step of beforeSteps) {
    if (!afterById.has(step.id)) {
      pushChange(changes, `Etapa removida: ${stepLabel(step)}`);
    }
  }

  for (const afterStep of afterSteps) {
    const beforeStep = beforeById.get(afterStep.id);
    if (!beforeStep) continue;

    const label = stepLabel(afterStep);

    if (beforeStep.position !== afterStep.position) {
      pushChange(
        changes,
        `${label}: posição alterada ${fromTo(beforeStep.position + 1, afterStep.position + 1)}`,
      );
    }

    if (beforeStep.title !== afterStep.title) {
      pushChange(
        changes,
        `${label}: título alterado ${fromTo(`"${beforeStep.title}"`, `"${afterStep.title}"`)}`,
      );
    }

    if (beforeStep.stepKind !== afterStep.stepKind) {
      pushChange(
        changes,
        `${label}: tipo alterado ${fromTo(beforeStep.stepKind, afterStep.stepKind)}`,
      );
    }

    if ((beforeStep.questionType ?? '') !== (afterStep.questionType ?? '')) {
      pushChange(
        changes,
        `${label}: tipo de pergunta alterado ${fromTo(
          getQuestionTypeLabel(beforeStep.questionType as never),
          getQuestionTypeLabel(afterStep.questionType as never),
        )}`,
      );
    }

    const beforeCondition = describeCondition(beforeStep, before);
    const afterCondition = describeCondition(afterStep, after);
    if (beforeCondition !== afterCondition) {
      pushChange(
        changes,
        `${label}: exibição alterada ${fromTo(beforeCondition, afterCondition)}`,
      );
    }

    if (beforeStep.isRequired !== afterStep.isRequired) {
      pushChange(
        changes,
        `${label}: ${afterStep.isRequired ? 'passou a ser obrigatória' : 'passou a ser opcional'}`,
      );
    }

    if (beforeStep.documentTypeId !== afterStep.documentTypeId) {
      const beforeName = beforeStep.documentType?.name ?? 'nenhum';
      const afterName = afterStep.documentType?.name ?? 'nenhum';
      pushChange(
        changes,
        `${label}: tipo de documento alterado ${fromTo(beforeName, afterName)}`,
      );
    }

    const beforeOptions = formatList(getChoiceOptionLabels(beforeStep));
    const afterOptions = formatList(getChoiceOptionLabels(afterStep));
    if (beforeOptions !== afterOptions) {
      pushChange(
        changes,
        `${label}: opções de pergunta alteradas ${fromTo(beforeOptions, afterOptions)}`,
      );
    }

    const beforeConfig = (beforeStep.questionConfig ?? {}) as Record<string, unknown>;
    const afterConfig = (afterStep.questionConfig ?? {}) as Record<string, unknown>;
    if (afterStep.questionType === 'MULTI_CHOICE') {
      const beforeMin = beforeConfig.minSelections ?? '—';
      const afterMin = afterConfig.minSelections ?? '—';
      const beforeMax = beforeConfig.maxSelections ?? '—';
      const afterMax = afterConfig.maxSelections ?? '—';

      if (beforeMin !== afterMin || beforeMax !== afterMax) {
        pushChange(
          changes,
          `${label}: limites de seleção alterados ${fromTo(
            `${beforeMin}–${beforeMax}`,
            `${afterMin}–${afterMax}`,
          )}`,
        );
      }
    }

    if (beforeStep.maxFiles !== afterStep.maxFiles) {
      pushChange(
        changes,
        `${label}: máximo de arquivos alterado ${fromTo(beforeStep.maxFiles, afterStep.maxFiles)}`,
      );
    }

    if (
      formatList(beforeStep.acceptedExtensionsOverride) !==
      formatList(afterStep.acceptedExtensionsOverride)
    ) {
      pushChange(changes, `${label}: extensões aceitas alteradas`);
    }

    if ((beforeStep.instructions ?? '') !== (afterStep.instructions ?? '')) {
      pushChange(changes, `${label}: instruções alteradas`);
    }

    if ((beforeStep.helpText ?? '') !== (afterStep.helpText ?? '')) {
      pushChange(changes, `${label}: dica rápida alterada`);
    }

    if ((beforeStep.exampleUrl ?? '') !== (afterStep.exampleUrl ?? '')) {
      pushChange(changes, `${label}: URL de exemplo alterada`);
    }
  }

  if (changes.length === 0) {
    pushChange(changes, 'Nenhuma diferença detectada entre as versões');
  }

  return changes;
}
