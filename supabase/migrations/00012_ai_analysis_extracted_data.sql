-- Add experience and education extracted fields to ai_analysis table
ALTER TABLE ai_analysis ADD COLUMN IF NOT EXISTS experience JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ai_analysis ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb;
