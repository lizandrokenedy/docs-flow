import { z } from 'zod';

export * from './workflow-logic';

export const StepKindSchema = z.enum(['DOCUMENT', 'CHOICE']);

export const DocumentTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  allowedExtensions: z.array(z.string()),
  allowedMimeTypes: z.array(z.string()),
  maxSizeBytes: z.number().int().positive(),
  icon: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateDocumentTypeSchema = DocumentTypeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateDocumentTypeSchema = CreateDocumentTypeSchema.partial();

export const WorkflowStepSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  documentTypeId: z.string().uuid(),
  title: z.string().min(1),
  instructions: z.string().nullable().optional(),
  helpText: z.string().nullable().optional(),
  exampleUrl: z.string().url().nullable().optional().or(z.literal('')),
  position: z.number().int().min(0),
  stepKind: StepKindSchema.default('DOCUMENT'),
  branchKey: z.string().nullable().optional(),
  conditionStepId: z.string().uuid().nullable().optional(),
  conditionValue: z.string().nullable().optional(),
  choiceOptions: z.array(z.string()).default([]),
  isRequired: z.boolean(),
  maxFiles: z.number().int().min(1).default(1),
  acceptedExtensionsOverride: z.array(z.string()).nullable().optional(),
  documentType: DocumentTypeSchema.optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateWorkflowStepSchema = z.object({
  documentTypeId: z.string().uuid(),
  title: z.string().min(1),
  instructions: z.string().optional(),
  helpText: z.string().optional(),
  exampleUrl: z.string().url().optional().or(z.literal('')),
  position: z.number().int().min(0).optional(),
  stepKind: StepKindSchema.optional(),
  branchKey: z.string().optional(),
  conditionStepId: z.string().uuid().optional().or(z.literal('')),
  conditionValue: z.string().optional(),
  choiceOptions: z.array(z.string()).optional(),
  isRequired: z.boolean().default(true),
  maxFiles: z.number().int().min(1).default(1),
  acceptedExtensionsOverride: z.array(z.string()).optional(),
});

export const UpdateWorkflowStepSchema = CreateWorkflowStepSchema.partial();

export const ReorderStepsSchema = z.object({
  steps: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    }),
  ),
});

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  isActive: z.boolean(),
  isTemplate: z.boolean().default(false),
  templateCategory: z.string().nullable().optional(),
  version: z.number().int().min(1).default(1),
  steps: z.array(WorkflowStepSchema).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido'),
  description: z.string().optional(),
  isActive: z.boolean().default(false),
  isTemplate: z.boolean().default(false),
  templateCategory: z.string().optional(),
});

export const UpdateWorkflowSchema = CreateWorkflowSchema.partial();

export const DuplicateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido').optional(),
});

export const SubmissionAnswerSchema = z.object({
  id: z.string().uuid(),
  submissionId: z.string().uuid(),
  workflowStepId: z.string().uuid(),
  value: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const SubmissionStatusSchema = z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED']);

export const StepUploadSchema = z.object({
  id: z.string().uuid(),
  submissionId: z.string().uuid(),
  workflowStepId: z.string().uuid(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int(),
  createdAt: z.coerce.date(),
});

export const SubmissionSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  status: SubmissionStatusSchema,
  currentStepPosition: z.number().int().min(0),
  branchKey: z.string().nullable().optional(),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable().optional(),
  uploads: z.array(StepUploadSchema).optional(),
  answers: z.array(SubmissionAnswerSchema).optional(),
  workflow: WorkflowSchema.optional(),
});

export const UploadResponseSchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int(),
  previewUrl: z.string().optional(),
});

export const PublicWorkflowSchema = WorkflowSchema.pick({
  id: true,
  name: true,
  slug: true,
  description: true,
}).extend({
  steps: z.array(
    WorkflowStepSchema.pick({
      id: true,
      title: true,
      instructions: true,
      helpText: true,
      exampleUrl: true,
      position: true,
      stepKind: true,
      branchKey: true,
      conditionStepId: true,
      conditionValue: true,
      choiceOptions: true,
      isRequired: true,
      maxFiles: true,
      acceptedExtensionsOverride: true,
    }).extend({
      documentType: DocumentTypeSchema.pick({
        name: true,
        allowedExtensions: true,
        allowedMimeTypes: true,
        maxSizeBytes: true,
        icon: true,
      }),
    }),
  ),
});

export type DocumentType = z.infer<typeof DocumentTypeSchema>;
export type CreateDocumentType = z.infer<typeof CreateDocumentTypeSchema>;
export type UpdateDocumentType = z.infer<typeof UpdateDocumentTypeSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type CreateWorkflowStep = z.infer<typeof CreateWorkflowStepSchema>;
export type UpdateWorkflowStep = z.infer<typeof UpdateWorkflowStepSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export type CreateWorkflow = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflow = z.infer<typeof UpdateWorkflowSchema>;
export type DuplicateWorkflow = z.infer<typeof DuplicateWorkflowSchema>;
export type SubmissionAnswer = z.infer<typeof SubmissionAnswerSchema>;
export type Submission = z.infer<typeof SubmissionSchema>;
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;
export type StepUpload = z.infer<typeof StepUploadSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
export type PublicWorkflow = z.infer<typeof PublicWorkflowSchema>;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getStepAcceptedExtensions(step: {
  acceptedExtensionsOverride?: string[] | null;
  documentType?: { allowedExtensions: string[] };
}): string[] {
  if (step.acceptedExtensionsOverride?.length) {
    return step.acceptedExtensionsOverride;
  }
  return step.documentType?.allowedExtensions ?? [];
}

export function bytesToMegabytes(bytes: number): number {
  return bytes / (1024 * 1024);
}

export function megabytesToBytes(mb: number): number {
  return Math.round(mb * 1024 * 1024);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${bytesToMegabytes(bytes).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;
}
