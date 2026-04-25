-- Add auto_ai_analysis column to jobs table
ALTER TABLE jobs ADD COLUMN auto_ai_analysis BOOLEAN DEFAULT true;
