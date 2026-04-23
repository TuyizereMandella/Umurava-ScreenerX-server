-- =====================================================================================
-- SCREENERX - INITIAL SCHEMA MIGRATION ("The Best Engine")
-- =====================================================================================

-- 1. EXTENSIONS & FUNCTIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Auto-update updated_at timestamp function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('ADMIN', 'HR_MANAGER');
CREATE TYPE job_priority AS ENUM ('HIGH', 'REGULAR');
CREATE TYPE applicant_status AS ENUM ('NEW', 'SHORTLISTED', 'INTERVIEWING', 'REJECTED');
CREATE TYPE scheduled_by_type AS ENUM ('AI', 'USER');

-- =====================================================================================
-- 3. CORE TABLES
-- =====================================================================================

-- ORGANIZATIONS (Multi-tenant support)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    domain TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- Soft delete
);

-- USERS (Custom Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Custom Auth
    role user_role DEFAULT 'HR_MANAGER',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- Soft delete
);

-- JOBS
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    department TEXT,
    location TEXT,
    priority job_priority DEFAULT 'REGULAR',
    is_public BOOLEAN DEFAULT TRUE,
    public_code TEXT UNIQUE, -- e.g., 'SX-9921'
    public_url TEXT UNIQUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- Soft delete
);

-- APPLICANTS
CREATE TABLE applicants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    resume_url TEXT,
    status applicant_status DEFAULT 'NEW',
    match_score INTEGER, -- Cached from AI Analysis
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Soft delete
    UNIQUE(job_id, email) -- Prevent duplicate applications for the same job
);

-- AI_ANALYSIS (Gemini Output)
CREATE TABLE ai_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applicant_id UUID UNIQUE NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    technical_dna TEXT[], -- Array of strings
    algorithmic_fit_score INTEGER,
    architecture_score INTEGER,
    strengths TEXT[],
    gaps TEXT[],
    recommendation_summary TEXT,
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- INTERVIEW_TYPES
CREATE TABLE interview_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INTERVIEWS
CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applicant_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    interview_type_id UUID NOT NULL REFERENCES interview_types(id) ON DELETE RESTRICT,
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    meet_url TEXT,
    scheduled_by scheduled_by_type DEFAULT 'AI',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Null if scheduled by AI
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACTIVITY_LOGS (Audit Trail)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Null if AI action
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- 4. TRIGGERS
-- =====================================================================================

CREATE TRIGGER set_timestamp_organizations
BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_jobs
BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_applicants
BEFORE UPDATE ON applicants FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- =====================================================================================
-- 5. INDEXES (For Performance)
-- =====================================================================================

-- Foreign Key Indexes
CREATE INDEX idx_users_org_id ON users(organization_id);
CREATE INDEX idx_jobs_org_id ON jobs(organization_id);
CREATE INDEX idx_applicants_job_id ON applicants(job_id);
CREATE INDEX idx_interviews_applicant_id ON interviews(applicant_id);
CREATE INDEX idx_activity_logs_org_id ON activity_logs(organization_id);

-- Lookup/Filtering Indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_public_code ON jobs(public_code) WHERE deleted_at IS NULL AND is_public = TRUE;
CREATE INDEX idx_jobs_public_url ON jobs(public_url) WHERE deleted_at IS NULL AND is_public = TRUE;
CREATE INDEX idx_applicants_status ON applicants(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_applicants_match_score ON applicants(match_score DESC) WHERE deleted_at IS NULL;
