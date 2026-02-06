-- AlterTable
ALTER TABLE "analysis_drafts" ADD COLUMN     "project_bullets_jsonb" JSONB,
ADD COLUMN     "template_id" TEXT NOT NULL DEFAULT 'modern';
