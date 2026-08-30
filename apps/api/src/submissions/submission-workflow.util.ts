import {
  answersToMap,
  completedStepIdsFromUploads,
  getVisibleSteps,
  type WorkflowSnapshot,
  workflowFromSnapshot,
} from '@docs-flow/types';
import { Prisma } from '@prisma/client';
import {
  buildWorkflowSnapshot,
  type WorkflowWithStepsForSnapshot,
} from '../workflows/workflow-snapshot.util';

export { buildWorkflowSnapshot };

type WorkflowWithSteps = WorkflowWithStepsForSnapshot;

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

export function getSubmissionContext(
  submission: {
    answers?: Array<{ workflowStepId: string; value: string }>;
    uploads?: Array<{ workflowStepId: string }>;
  },
  steps?: Array<{ id: string; questionType?: string | null }>,
) {
  return {
    answers: answersToMap(submission.answers ?? [], steps),
    completedStepIds: completedStepIdsFromUploads(submission.uploads ?? []),
  };
}

export function getSubmissionVisibleSteps<
  T extends {
    workflowSnapshot?: Prisma.JsonValue | null;
    answers?: Array<{ workflowStepId: string; value: string }>;
    uploads?: Array<{ workflowStepId: string }>;
    workflow: { steps: WorkflowWithSteps['steps'] };
  },
>(submission: T) {
  const workflow = resolveSubmissionWorkflow({
    workflowSnapshot: submission.workflowSnapshot ?? null,
    workflow: submission.workflow as WorkflowWithSteps,
  });

  return getVisibleSteps(
    workflow.steps as WorkflowWithSteps['steps'],
    getSubmissionContext(submission, workflow.steps),
  );
}
