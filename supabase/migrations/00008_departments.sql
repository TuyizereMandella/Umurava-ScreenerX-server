-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_departments_organization_id ON departments(organization_id);

-- Add some default constraints (optional but good practice)
ALTER TABLE departments ADD CONSTRAINT unique_department_name_per_org UNIQUE (organization_id, name);
