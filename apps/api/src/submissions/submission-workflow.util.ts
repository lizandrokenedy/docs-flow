import {
  answersToMap,
  completedStepIdsFromUploads,
  getBranchOptions,
  getVisibleSteps,
  type WorkflowSnapshot,
  workflowFromSnapshot,
} from '@docs-flow/types';
import { Prisma } from '@prisma/client';

type WorkflowWithSteps = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  version: number;
  steps: Array<{
    id: string;
    documentTypeId: string;
    title: string;
    instructions: string | null;
    helpText: string | null;
    exampleUrl: string | null;
    position: number;
    stepKind: 'DOCUMENT' | 'CHOICE';
    branchKey: string | null;
    conditionStepId: string | null;
    conditionValue: string | null;
    choiceOptions: string[];
    isRequired: boolean;
    maxFiles: number;
    acceptedExtensionsOverride: string[];
    documentType: {
      name: string;
      allowedExtensions: string[];
      allowedMimeTypes: string[];
      maxSizeBytes: number;
      icon: string | null;
    };
  }>;
};

export function buildWorkflowSnapshot(workflow: WorkflowWithSteps): WorkflowSnapshot {
  return {
    version: workflow.version,
    workflowId: workflow.id,
    name: workflow.name,
    slug: workflow.slug,
    description: workflow.description,
    capturedAt: new Date().toISOString(),
    steps: workflow.steps.map((step) => ({
      id: step.id,
      documentTypeId: step.documentTypeId,
      title: step.title,
      instructions: step.instructions,
      helpText: step.helpText,
      exampleUrl: step.exampleUrl,
      position: step.position,
      stepKind: step.stepKind,
      branchKey: step.branchKey,
      conditionStepId: step.conditionStepId,
      conditionValue: step.conditionValue,
      choiceOptions: step.choiceOptions,
      isRequired: step.isRequired,
      maxFiles: step.maxFiles,
      acceptedExtensionsOverride: step.acceptedExtensionsOverride,
      documentType: {
        name: step.documentType.name,
        allowedExtensions: step.documentType.allowedExtensions,
        allowedMimeTypes: step.documentType.allowedMimeTypes,
        maxSizeBytes: step.documentType.maxSizeBytes,
        icon: step.documentType.icon,
      },
    })),
  };
}

export function resolveSubmissionWorkflow<
  T extends {
    workflowSnapshot: Prisma.JsonValue | null;
    workflow: WorkflowWithSteps;
  },
>(submission: T) {
  if (!submission.workflowSnapshot) {
    return submission.workflow;
  }

  const snapshot = submission.workflowSnapshot as unknown as WorkflowSnapshot;
  return {
    ...submission.workflow,
    ...workflowFromSnapshot(snapshot),
    steps: snapshot.steps,
  };
}

export function getSubmissionContext(submission: {
  branchKey: string | null;
  answers?: Array<{ workflowStepId: string; value: string }>;
  uploads?: Array<{ workflowStepId: string }>;
}) {
  return {
    branchKey: submission.branchKey,
    answers: answersToMap(submission.answers ?? []),
    completedStepIds: completedStepIdsFromUploads(submission.uploads ?? []),
  };
}

export function getSubmissionVisibleSteps<
  T extends {
    branchKey: string | null;
    answers?: Array<{ workflowStepId: string; value: string }>;
    uploads?: Array<{ workflowStepId: string }>;
    workflow: { steps: WorkflowWithSteps['steps'] };
  },
>(submission: T) {
  const workflow = resolveSubmissionWorkflow({
    workflowSnapshot: null,
    workflow: submission.workflow as WorkflowWithSteps,
  });

  return getVisibleSteps(workflow.steps, getSubmissionContext(submission));
}

export function getSubmissionBranchOptions(submission: {
  workflowSnapshot: Prisma.JsonValue | null;
  workflow: WorkflowWithSteps;
}) {
  const workflow = resolveSubmissionWorkflow(submission);
  return getBranchOptions(workflow.steps);
}
