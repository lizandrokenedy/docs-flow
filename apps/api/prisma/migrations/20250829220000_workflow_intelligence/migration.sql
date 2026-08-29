-- CreateEnum
CREATE TYPE "StepKind" AS ENUM ('DOCUMENT', 'CHOICE');

-- AlterTable workflows
ALTER TABLE "workflows" ADD COLUMN "isTemplate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "workflows" ADD COLUMN "templateCategory" TEXT;
ALTER TABLE "workflows" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable workflow_steps
ALTER TABLE "workflow_steps" ADD COLUMN "stepKind" "StepKind" NOT NULL DEFAULT 'DOCUMENT';
ALTER TABLE "workflow_steps" ADD COLUMN "branchKey" TEXT;
ALTER TABLE "workflow_steps" ADD COLUMN "conditionStepId" TEXT;
ALTER TABLE "workflow_steps" ADD COLUMN "conditionValue" TEXT;
ALTER TABLE "workflow_steps" ADD COLUMN "choiceOptions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable submissions
ALTER TABLE "submissions" ADD COLUMN "branchKey" TEXT;
ALTER TABLE "submissions" ADD COLUMN "workflowSnapshot" JSONB;

-- CreateTable submission_answers
CREATE TABLE "submission_answers" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "workflowStepId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_answers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "submission_answers_submissionId_workflowStepId_key" ON "submission_answers"("submissionId", "workflowStepId");

ALTER TABLE "submission_answers" ADD CONSTRAINT "submission_answers_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submission_answers" ADD CONSTRAINT "submission_answers_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
