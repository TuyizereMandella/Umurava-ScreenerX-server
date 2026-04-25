-- Add missing fields to applicants table (safe to re-run)
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS answers JSONB;

-- Add private access toggle to jobs table (safe to re-run)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS requires_access_code BOOLEAN DEFAULT false;
