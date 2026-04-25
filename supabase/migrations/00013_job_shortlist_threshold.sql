-- Add custom shortlist threshold to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS shortlist_threshold INTEGER DEFAULT 70;
