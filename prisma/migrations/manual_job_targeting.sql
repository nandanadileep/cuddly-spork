-- Add job_description_jsonb to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_description_jsonb JSONB;

-- Add analyzed_for_role to projects table  
ALTER TABLE projects ADD COLUMN IF NOT EXISTS analyzed_for_role TEXT;
