import { isQuestionStep } from './question';

export type StepKind = 'DOCUMENT' | 'QUESTION';

export type StepAnswerMap = Record<string, string>;

export interface StepVisibilityContext {
  answers: StepAnswerMap;
  completedStepIds: ReadonlySet<string>;
}

export interface WorkflowStepLike {
  id: string;
  position: number;
  stepKind?: StepKind | null;
  conditionStepId?: string | null;
  conditionValue?: string | null;
}

export function answersToMap(
  answers: Array<{ workflowStepId: string; value: string }>,
): StepAnswerMap {
  return Object.fromEntries(answers.map((answer) => [answer.workflowStepId, answer.value]));
}

export function completedStepIdsFromUploads(
  uploads: Array<{ workflowStepId: string }>,
): Set<string> {
  return new Set(uploads.map((upload) => upload.workflowStepId));
}

function isPrerequisiteMet(
  prerequisite: WorkflowStepLike,
  conditionValue: string | null | undefined,
  context: StepVisibilityContext,
): boolean {
  const stepKind = prerequisite.stepKind ?? 'DOCUMENT';

  if (isQuestionStep(stepKind)) {
    const answer = context.answers[prerequisite.id];
    if (!answer) {
      return false;
    }

    if (conditionValue && answer !== conditionValue) {
      return false;
    }

    return true;
  }

  return context.completedStepIds.has(prerequisite.id);
}

export function isStepVisible(
  step: WorkflowStepLike,
  context: StepVisibilityContext,
  steps: WorkflowStepLike[],
): boolean {
  if (step.conditionStepId) {
    const prerequisite = steps.find((item) => item.id === step.conditionStepId);
    if (!prerequisite) {
      return false;
    }

    if (!isPrerequisiteMet(prerequisite, step.conditionValue, context)) {
      return false;
    }
  }

  return true;
}

/** Etapas exibidas no stepper: inclui futuras de cadeias lineares só entre documentos. */
export function isStepShownInStepper(
  step: WorkflowStepLike,
  context: StepVisibilityContext,
  steps: WorkflowStepLike[],
): boolean {
  if (isStepVisible(step, context, steps)) {
    return true;
  }

  if (step.conditionValue) {
    return false;
  }

  if (!step.conditionStepId) {
    return true;
  }

  const prerequisite = steps.find((item) => item.id === step.conditionStepId);
  if (!prerequisite) {
    return false;
  }

  if (isQuestionStep(prerequisite.stepKind)) {
    return false;
  }

  return isStepShownInStepper(prerequisite, context, steps);
}

export function getStepLockMessage<T extends WorkflowStepLike & { title?: string }>(
  step: T,
  steps: T[],
): string | null {
  if (!step.conditionStepId) {
    return null;
  }

  const prerequisite = steps.find((item) => item.id === step.conditionStepId);
  if (!prerequisite) {
    return 'Libera após concluir a etapa anterior';
  }

  const prerequisiteTitle = prerequisite.title?.trim() || 'etapa anterior';

  if (step.conditionValue) {
    return `Libera quando "${prerequisiteTitle}" for "${step.conditionValue}"`;
  }

  if (isQuestionStep(prerequisite.stepKind)) {
    return `Libera ao responder "${prerequisiteTitle}"`;
  }

  return `Libera ao preencher "${prerequisiteTitle}"`;
}

export function getVisibleSteps<T extends WorkflowStepLike>(
  steps: T[],
  context: StepVisibilityContext,
): T[] {
  return [...steps]
    .sort((a, b) => a.position - b.position)
    .filter((step) => isStepVisible(step, context, steps));
}

export function getStepperSteps<T extends WorkflowStepLike>(
  steps: T[],
  context: StepVisibilityContext,
): T[] {
  return [...steps]
    .sort((a, b) => a.position - b.position)
    .filter((step) => isStepShownInStepper(step, context, steps));
}

export interface WorkflowSnapshot {
  version: number;
  workflowId: string;
  name: string;
  slug: string;
  description?: string | null;
  capturedAt: string;
  steps: Array<{
    id: string;
    documentTypeId?: string | null;
    title: string;
    instructions?: string | null;
    helpText?: string | null;
    exampleUrl?: string | null;
    position: number;
    stepKind: StepKind;
    questionType?: string | null;
    questionConfig?: Record<string, unknown> | null;
    conditionStepId?: string | null;
    conditionValue?: string | null;
    choiceOptions: string[];
    isRequired: boolean;
    maxFiles: number;
    acceptedExtensionsOverride: string[];
    documentType?: {
      name: string;
      allowedExtensions: string[];
      allowedMimeTypes: string[];
      maxSizeBytes: number;
      icon?: string | null;
    } | null;
  }>;
}

export function workflowFromSnapshot(snapshot: WorkflowSnapshot) {
  return {
    id: snapshot.workflowId,
    name: snapshot.name,
    slug: snapshot.slug,
    description: snapshot.description ?? null,
    version: snapshot.version,
    steps: snapshot.steps,
  };
}
