-- Create email logs table
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_by_ai BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'SENT',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_email_logs_org_id ON email_logs(organization_id);
