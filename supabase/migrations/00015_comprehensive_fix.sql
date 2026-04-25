-- Comprehensive migration to ensure all required columns exist
-- Run this entire script in your Supabase SQL Editor

-- 1. Add 'experience' and 'education' to ai_analysis (from migration 00012)
ALTER TABLE ai_analysis ADD COLUMN IF NOT EXISTS experience JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ai_analysis ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb;

-- 2. Add match_score to applicants (if not present)
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS match_score INTEGER;

-- 3. Add shortlist_threshold to jobs (from migration 00013)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS shortlist_threshold INTEGER DEFAULT 70;

-- 4. Add knockout_skills to jobs (from migration 00014)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS knockout_skills TEXT[] DEFAULT '{}';

-- 5. Add auto_ai_analysis to jobs (from migration 00010)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS auto_ai_analysis BOOLEAN DEFAULT TRUE;

-- 6. Add requires_access_code and deadline to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS requires_access_code BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

-- 7. Add description and ai_baseline to jobs (from migration 00007)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_baseline JSONB;

-- 8. Add extended fields to applicants (from migration 00007)
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS answers JSONB;

-- 9. Verify the Supabase Storage bucket for resumes exists
-- (This must be done manually in Supabase Dashboard → Storage → New Bucket)
-- Bucket name: applicant-resumes
-- Set to PUBLIC so PDF links are accessible
