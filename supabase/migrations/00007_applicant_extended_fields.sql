-- Add extended fields to applicants
ALTER TABLE applicants 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add description to jobs
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add ai_baseline to jobs (if not already present)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS ai_baseline JSONB;
