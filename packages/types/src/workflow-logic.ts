export type StepKind = 'DOCUMENT' | 'CHOICE';

export type StepAnswerMap = Record<string, string>;

export interface StepVisibilityContext {
  branchKey?: string | null;
  answers: StepAnswerMap;
  completedStepIds: ReadonlySet<string>;
}

export interface WorkflowStepLike {
  id: string;
  position: number;
  stepKind?: StepKind | null;
  branchKey?: string | null;
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

export function getBranchOptions(steps: Array<{ branchKey?: string | null }>): string[] {
  return [
    ...new Set(
      steps
        .map((step) => step.branchKey?.trim())
        .filter((branchKey): branchKey is string => Boolean(branchKey)),
    ),
  ];
}

function isPrerequisiteMet(
  prerequisite: WorkflowStepLike,
  conditionValue: string | null | undefined,
  context: StepVisibilityContext,
): boolean {
  const stepKind = prerequisite.stepKind ?? 'DOCUMENT';

  if (stepKind === 'CHOICE') {
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
  if (step.branchKey && step.branchKey !== context.branchKey) {
    return false;
  }

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

export function getVisibleSteps<T extends WorkflowStepLike>(
  steps: T[],
  context: StepVisibilityContext,
): T[] {
  return [...steps]
    .sort((a, b) => a.position - b.position)
    .filter((step) => isStepVisible(step, context, steps));
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
    documentTypeId: string;
    title: string;
    instructions?: string | null;
    helpText?: string | null;
    exampleUrl?: string | null;
    position: number;
    stepKind: StepKind;
    branchKey?: string | null;
    conditionStepId?: string | null;
    conditionValue?: string | null;
    choiceOptions: string[];
    isRequired: boolean;
    maxFiles: number;
    acceptedExtensionsOverride: string[];
    documentType: {
      name: string;
      allowedExtensions: string[];
      allowedMimeTypes: string[];
      maxSizeBytes: number;
      icon?: string | null;
    };
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
