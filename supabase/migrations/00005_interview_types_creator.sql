-- Update interview_types to track creators
ALTER TABLE interview_types 
ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Update existing types to be owned by a user (mockup adjustment)
UPDATE interview_types SET created_by_ai = FALSE WHERE created_by_ai IS NULL;
