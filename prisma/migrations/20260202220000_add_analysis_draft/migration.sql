-- CreateTable
CREATE TABLE "analysis_drafts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "selected_project_ids_jsonb" JSONB,
    "manual_projects_jsonb" JSONB,
    "skills_jsonb" JSONB,
    "manual_skills_jsonb" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analysis_drafts_user_id_key" ON "analysis_drafts"("user_id");

-- AddForeignKey
ALTER TABLE "analysis_drafts" ADD CONSTRAINT "analysis_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
