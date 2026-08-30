import type { WorkflowSnapshot } from '@docs-flow/types';

export type WorkflowWithStepsForSnapshot = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  version: number;
  steps: Array<{
    id: string;
    documentTypeId: string | null;
    title: string;
    instructions: string | null;
    helpText: string | null;
    exampleUrl: string | null;
    position: number;
    stepKind: 'DOCUMENT' | 'QUESTION';
    questionType: string | null;
    questionConfig: unknown;
    conditionStepId: string | null;
    conditionValue: string | null;
    isRequired: boolean;
    maxFiles: number;
    acceptedExtensionsOverride: string[];
    documentType: {
      name: string;
      allowedExtensions: string[];
      allowedMimeTypes: string[];
      maxSizeBytes: number;
      icon: string | null;
    } | null;
  }>;
};

export function buildWorkflowSnapshot(workflow: WorkflowWithStepsForSnapshot): WorkflowSnapshot {
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
      questionType: step.questionType,
      questionConfig: step.questionConfig as WorkflowSnapshot['steps'][number]['questionConfig'],
      conditionStepId: step.conditionStepId,
      conditionValue: step.conditionValue,
      isRequired: step.isRequired,
      maxFiles: step.maxFiles,
      acceptedExtensionsOverride: step.acceptedExtensionsOverride,
      documentType: step.documentType
        ? {
            name: step.documentType.name,
            allowedExtensions: step.documentType.allowedExtensions,
            allowedMimeTypes: step.documentType.allowedMimeTypes,
            maxSizeBytes: step.documentType.maxSizeBytes,
            icon: step.documentType.icon,
          }
        : null,
    })),
  };
}
