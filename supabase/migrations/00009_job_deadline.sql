-- Add deadline column to jobs table
ALTER TABLE jobs ADD COLUMN deadline TIMESTAMPTZ;
