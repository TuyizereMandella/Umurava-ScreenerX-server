-- Add mandatory knockout skills to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS knockout_skills TEXT[] DEFAULT '{}';
