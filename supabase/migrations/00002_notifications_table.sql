-- =====================================================================================
-- SCREENERX - NOTIFICATIONS SCHEMA MIGRATION
-- =====================================================================================

CREATE TYPE notification_type AS ENUM ('success', 'info', 'warning', 'calendar');

-- NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type notification_type DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIGGERS
CREATE TRIGGER set_timestamp_notifications
BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- INDEXES
CREATE INDEX idx_notifications_org_id ON notifications(organization_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
