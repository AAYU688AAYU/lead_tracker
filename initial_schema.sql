-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create ENUM types for statuses/stages
CREATE TYPE user_role AS ENUM ('student', 'consultant', 'admin', 'super_admin');
CREATE TYPE lead_stage AS ENUM (
  'initial_contact',
  'document_collection',
  'application_submission',
  'admission_decision',
  'visa_processing',
  'enrollment'
);
CREATE TYPE lead_status AS ENUM ('active', 'stalled', 'completed', 'dropped');
CREATE TYPE document_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE activity_type AS ENUM (
  'stage_change',
  'document_upload',
  'document_approval',
  'document_rejection',
  'consultant_assignment',
  'reminder_sent',
  'follow_up',
  'note_added'
);
CREATE TYPE notification_type AS ENUM (
  'stage_change',
  'document_request',
  'document_approval',
  'document_rejection',
  'assignment',
  'reminder',
  'follow_up',
  'general'
);
CREATE TYPE communication_channel AS ENUM ('email', 'sms', 'phone', 'whatsapp', 'portal');

-- Create tables
-- Profiles table (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'student',
  branch_id UUID,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Universities table
CREATE TABLE universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  website TEXT,
  established_year INTEGER,
  student_population INTEGER,
  world_rank INTEGER,
  national_rank INTEGER,
  accreditation TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Programs table
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  degree_type TEXT NOT NULL, -- Bachelor's, Master's, PhD, etc.
  field_of_study TEXT NOT NULL,
  duration_months INTEGER,
  tuition_fee DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  language_requirement TEXT,
  exam_requirements TEXT[],
  start_dates DATE[],
  application_deadline DATE,
  description TEXT,
  requirements TEXT[],
  career_outcomes TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leads table (core entity with 6-stage pipeline)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consultant_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  stage lead_stage NOT NULL DEFAULT 'initial_contact',
  status lead_status NOT NULL DEFAULT 'active',
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  application_deadline DATE,
  estimated_enrollment_date DATE,
  actual_enrollment_date DATE,
  visa_status TEXT,
  scholarship_eligible BOOLEAN DEFAULT FALSE,
  scholarship_amount DECIMAL(10, 2),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_stage_status_check CHECK (
    (stage = 'initial_contact' AND status IN ('active', 'stalled')) OR
    (stage = 'document_collection' AND status IN ('active', 'stalled')) OR
    (stage = 'application_submission' AND status IN ('active', 'stalled', 'completed')) OR
    (stage = 'admission_decision' AND status IN ('active', 'stalled', 'completed')) OR
    (stage = 'visa_processing' AND status IN ('active', 'stalled', 'completed')) OR
    (stage = 'enrollment' AND status IN ('completed', 'dropped'))
  )
);

-- Documents table (with versioning)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  status document_status NOT NULL DEFAULT 'pending',
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expiry_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure only one active version per document name per lead
  CONSTRAINT unique_active_document UNIQUE (lead_id, name, version) WHERE (status = 'approved' OR status = 'pending')
);

-- Activity logs table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type activity_type NOT NULL,
  description TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Communication logs table
CREATE TABLE communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel communication_channel NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  sent_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  sent_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'read')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reminders table
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reminder_type TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT, -- cron expression or simple pattern like 'daily', 'weekly'
  sent_at TIMESTAMPTZ,
  is_sent BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stage threshold configs table
CREATE TABLE stage_threshold_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage lead_stage NOT NULL UNIQUE,
  threshold_hours INTEGER NOT NULL CHECK (threshold_hours > 0),
  escalation_level INTEGER NOT NULL DEFAULT 1 CHECK (escalation_level >= 1 AND escalation_level <= 3),
  notification_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feature flags table
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_roles user_role[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  related_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_emailed BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Draft leads table with expiration and cleanup
CREATE TABLE draft_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  initial_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_branch_id ON profiles(branch_id);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

CREATE INDEX idx_universities_name ON universities(name);
CREATE INDEX idx_universities_country ON universities(country);

CREATE INDEX idx_programs_university_id ON programs(university_id);
CREATE INDEX idx_programs_name ON programs(name);
CREATE INDEX idx_programs_field_of_study ON programs(field_of_study);

CREATE INDEX idx_leads_student_id ON leads(student_id);
CREATE INDEX idx_leads_consultant_id ON leads(consultant_id);
CREATE INDEX idx_leads_program_id ON leads(program_id);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_priority ON leads(priority);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_updated_at ON leads(updated_at);

CREATE INDEX idx_documents_lead_id ON documents(lead_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_created_at ON documents(created_at);

CREATE INDEX idx_activity_logs_lead_id ON activity_logs(lead_id);
CREATE INDEX idx_activity_logs_type ON activity_logs(type);
CREATE INDEX idx_activity_logs_performed_by ON activity_logs(performed_by);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

CREATE INDEX idx_communication_logs_lead_id ON communication_logs(lead_id);
CREATE INDEX idx_communication_logs_channel ON communication_logs(channel);
CREATE INDEX idx_communication_logs_sent_by ON communication_logs(sent_by);
CREATE INDEX idx_communication_logs_sent_to ON communication_logs(sent_to);
CREATE INDEX idx_communication_logs_created_at ON communication_logs(created_at);

CREATE INDEX idx_reminders_lead_id ON reminders(lead_id);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);
CREATE INDEX idx_reminders_is_sent ON reminders(is_sent);
CREATE INDEX idx_reminders_created_at ON reminders(created_at);

CREATE INDEX idx_stage_threshold_configs_stage ON stage_threshold_configs(stage);

CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_feature_flags_is_enabled ON feature_flags(is_enabled);

CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_draft_leads_student_id ON draft_leads(student_id);
CREATE INDEX idx_draft_leads_program_id ON draft_leads(program_id);
CREATE INDEX idx_draft_leads_expires_at ON draft_leads(expires_at);

-- Create full-text search columns and indexes
-- Add search_vector column to programs
ALTER TABLE programs ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(field_of_study, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;

CREATE INDEX idx_programs_search_vector ON programs USING GIN (search_vector);

-- Add search_vector column to universities
ALTER TABLE universities ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(country, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(city, '')), 'C')
  ) STORED;

CREATE INDEX idx_universities_search_vector ON universities USING GIN (search_vector);

-- Add trigram indexes on profiles for fuzzy search
CREATE INDEX idx_profiles_name_trgm ON profiles USING GIN (name gin_trgm_ops);
CREATE INDEX idx_profiles_email_trgm ON profiles USING GIN (email gin_trgm_ops);

-- Create triggers for automated functions
-- Trigger for auto-assigning lead on insert
CREATE OR REPLACE FUNCTION tr_auto_assign_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-assign to a consultant if not already assigned and consultant_id is null
  IF NEW.consultant_id IS NULL THEN
    -- Find a consultant with lightest workload (simplified - in reality would be more complex)
    SELECT id INTO NEW.consultant_id
    FROM profiles
    WHERE role = 'consultant'
    ORDER BY (
      SELECT COUNT(*)
      FROM leads
      WHERE consultant_id = profiles.id AND status = 'active'
    ) ASC
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_assign_lead
BEFORE INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION tr_auto_assign_lead();

-- Trigger for enforcing stage transition
CREATE OR REPLACE FUNCTION tr_enforce_stage_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Define valid stage transitions
  IF TG_OP = 'UPDATE' THEN
    IF NEW.stage <> OLD.stage THEN
      -- Define valid transitions
      CASE OLD.stage
        WHEN 'initial_contact' THEN
          IF NEW.stage NOT IN ('initial_contact', 'document_collection') THEN
            RAISE EXCEPTION 'Invalid transition from % to %', OLD.stage, NEW.stage;
          END IF;
        WHEN 'document_collection' THEN
          IF NEW.stage NOT IN ('document_collection', 'application_submission') THEN
            RAISE EXCEPTION 'Invalid transition from % to %', OLD.stage, NEW.stage;
          END IF;
        WHEN 'application_submission' THEN
          IF NEW.stage NOT IN ('application_submission', 'admission_decision') THEN
            RAISE EXCEPTION 'Invalid transition from % to %', OLD.stage, NEW.stage;
          END IF;
        WHEN 'admission_decision' THEN
          IF NEW.stage NOT IN ('admission_decision', 'visa_processing') THEN
            RAISE EXCEPTION 'Invalid transition from % to %', OLD.stage, NEW.stage;
          END IF;
        WHEN 'visa_processing' THEN
          IF NEW.stage NOT IN ('visa_processing', 'enrollment') THEN
            RAISE EXCEPTION 'Invalid transition from % to %', OLD.stage, NEW.stage;
          END IF;
        WHEN 'enrollment' THEN
          -- Once enrolled, cannot go back
          IF NEW.stage <> 'enrollment' THEN
            RAISE EXCEPTION 'Invalid transition from % to %', OLD.stage, NEW.stage;
          END IF;
      END CASE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enforce_stage_transition
BEFORE UPDATE OF stage ON leads
FOR EACH ROW
EXECUTE FUNCTION tr_enforce_stage_transition();

-- Trigger for notifying student on stage change
CREATE OR REPLACE FUNCTION tr_notify_student_on_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stage <> OLD.stage THEN
    INSERT INTO notifications (
      recipient_id,
      type,
      title,
      message,
      related_lead_id,
      metadata
    ) VALUES (
      NEW.student_id,
      'stage_change',
      'Application Stage Updated',
      format('Your application for %s has moved from %s to %s stage.',
             (SELECT name FROM programs WHERE id = NEW.program_id),
             OLD.stage,
             NEW.stage),
      NEW.id,
      jsonb_build_object(
        'old_stage', OLD.stage,
        'new_stage', NEW.stage,
        'changed_at', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_student_on_stage_change
AFTER UPDATE OF stage ON leads
FOR EACH ROW
EXECUTE FUNCTION tr_notify_student_on_stage_change();

-- Trigger for notifying student on reassignment
CREATE OR REPLACE FUNCTION tr_notify_student_on_reassignment()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.consultant_id IS DISTINCT FROM OLD.consultant_id THEN
    INSERT INTO notifications (
      recipient_id,
      type,
      title,
      message,
      related_lead_id,
      metadata
    ) VALUES (
      NEW.student_id,
      'assignment',
      'New Consultant Assigned',
      format('You have been assigned a new consultant for your application to %s.',
             (SELECT name FROM programs WHERE id = NEW.program_id)),
      NEW.id,
      jsonb_build_object(
        'old_consultant_id', OLD.consultant_id,
        'new_consultant_id', NEW.consultant_id,
        'changed_at', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_student_on_reassignment
AFTER UPDATE OF consultant_id ON leads
FOR EACH ROW
EXECUTE FUNCTION tr_notify_student_on_reassignment();

-- Trigger for notifying student on document rejection
CREATE OR REPLACE FUNCTION tr_notify_student_on_document_rejection()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'rejected' THEN
    INSERT INTO notifications (
      recipient_id,
      type,
      title,
      message,
      related_document_id,
      related_lead_id,
      metadata
    ) VALUES (
      (SELECT student_id FROM leads WHERE id = NEW.lead_id),
      'document_rejection',
      'Document Rejected',
      format('Your document %s has been rejected. Reason: %s',
             NEW.name,
             COALESCE(NEW.rejection_reason, 'No reason provided')),
      NEW.id,
      NEW.lead_id,
      jsonb_build_object(
        'document_name', NEW.name,
        'rejection_reason', NEW.rejection_reason,
        'rejected_at', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_student_on_document_rejection
AFTER INSERT ON documents
FOR EACH ROW
EXECUTE FUNCTION tr_notify_student_on_document_rejection();

-- Trigger for handling consultant deactivation
CREATE OR REPLACE FUNCTION tr_handle_consultant_deactivation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role = 'consultant' AND OLD.role != 'consultant' THEN
    -- Consultant is being deactivated, reassign their leads
    UPDATE leads
    SET consultant_id = NULL
    WHERE consultant_id = OLD.id;

    -- Auto-assign those leads to other consultants
    UPDATE leads l
    SET consultant_id = sub.consultant_id
    FROM (
      SELECT
        l.id AS lead_id,
        p.id AS consultant_id
      FROM leads l
      JOIN profiles p ON p.role = 'consultant'
      WHERE l.consultant_id IS NULL
        AND l.student_id IN (
          SELECT id FROM profiles WHERE consultant_id = OLD.id
        )
      ORDER BY l.id, (
        SELECT COUNT(*)
        FROM leads
        WHERE consultant_id = p.id AND status = 'active'
      ) ASC
    ) sub
    WHERE l.id = sub.lead_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_consultant_deactivation
AFTER UPDATE OF role ON profiles
FOR EACH ROW
EXECUTE FUNCTION tr_handle_consultant_deactivation();

-- Trigger for superseding prior document when new version uploaded
CREATE OR REPLACE FUNCTION tr_supersede_prior_document()
RETURNS TRIGGER AS $$
DECLARE
  max_version INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- When inserting a new document, increment version if same name exists for lead
    SELECT COALESCE(MAX(version), 0) INTO max_version
    FROM documents
    WHERE lead_id = NEW.lead_id
      AND name = NEW.name
      AND status IN ('approved', 'pending');

    IF max_version > 0 THEN
      -- Mark existing approved/pending documents as superseded
      UPDATE documents
      SET status = 'superseded'
      WHERE lead_id = NEW.lead_id
        AND name = NEW.name
        AND status IN ('approved', 'pending');

      -- Set new document version to max_version + 1
      NEW.version = max_version + 1;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_supersede_prior_document
BEFORE INSERT ON documents
FOR EACH ROW
EXECUTE FUNCTION tr_supersede_prior_document();

-- Create helper functions
-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
BEGIN
  SELECT role INTO user_role_val FROM profiles WHERE id = auth.uid();
  RETURN user_role_val = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is consultant
CREATE OR REPLACE FUNCTION is_consultant()
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
BEGIN
  SELECT role INTO user_role_val FROM profiles WHERE id = auth.uid();
  RETURN user_role_val IN ('consultant', 'admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect stalled leads
CREATE OR REPLACE FUNCTION fn_detect_stalled_leads()
RETURNS TABLE(
  lead_id UUID,
  student_id UUID,
  consultant_id UUID,
  stage lead_stage,
  hours_in_stage INTEGER,
  days_stalled INTEGER
) AS $$
DECLARE
  config_rec RECORD;
BEGIN
  FOR config_rec IN
    SELECT stage, threshold_hours FROM stage_threshold_configs
  LOOP
    RETURN QUERY
    SELECT
      l.id AS lead_id,
      l.student_id,
      l.consultant_id,
      l.stage,
      EXTRACT(EPOCH FROM (NOW() - l.updated_at))/3600 AS hours_in_stage,
      FLOOR(EXTRACT(EPOCH FROM (NOW() - l.updated_at))/3600/24) AS days_stalled
    FROM leads l
    WHERE l.stage = config_rec.stage
      AND l.status = 'active'
      AND l.updated_at <= NOW() - (config_rec.threshold_hours * INTERVAL '1 hour')
      AND EXISTS (
        SELECT 1 FROM stage_threshold_configs stc
        WHERE stc.stage = l.stage
          AND stc.threshold_hours = config_rec.threshold_hours
      );
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function to cleanup expired drafts
CREATE OR REPLACE FUNCTION fn_cleanup_expired_drafts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM draft_leads
  WHERE expires_at < NOW()
  RETURNING id INTO deleted_count;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- GDPR erasure function
CREATE OR REPLACE FUNCTION fn_gdpr_erase_user_data(user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Anonymize personal data in profiles
  UPDATE profiles SET
    full_name = CONCAT('Anonymized_', id),
    email = CONCAT('anonymized_', id, '@example.com'),
    phone = NULL,
    avatar_url = NULL
  WHERE id = user_id;

  -- Anonymize activity logs
  UPDATE activity_logs SET
    description = CONCAT('Activity by anonymized user ', user_id)
  WHERE performed_by = user_id;

  -- Anonymize communication logs
  UPDATE communication_logs SET
    content = CONCAT('[Communication with anonymized user ', user_id, ']')
  WHERE sent_by = user_id OR sent_to = user_id;

  -- Anonymize notifications
  UPDATE notifications SET
    title = CONCAT('Notification for anonymized user ', user_id),
    message = CONCAT('This notification was for an anonymized user')
  WHERE recipient_id = user_id;

  -- Note: We keep leads and documents for historical/legal reasons but anonymize PII
  -- where possible within legal constraints
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up Row-Level Security (RLS)
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_threshold_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Consultants can view assigned student profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.student_id = profiles.id
        AND leads.consultant_id = auth.uid()
    )
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'consultant'
  );

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- RLS Policies for universities
CREATE POLICY "Everyone can view universities" ON universities
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage universities" ON universities
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- RLS Policies for programs
CREATE POLICY "Everyone can view programs" ON programs
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage programs" ON programs
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- RLS Policies for leads
CREATE POLICY "Students can view own leads" ON leads
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Consultants can view assigned leads" ON leads
  FOR SELECT USING (
    consultant_id = auth.uid()
  );

CREATE POLICY "Admins can view all leads" ON leads
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Students can create own leads" ON leads
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Consultants can update assigned leads" ON leads
  FOR UPDATE USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "Admins can manage all leads" ON leads
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- RLS Policies for documents
CREATE POLICY "Users can view documents via lead ownership" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = documents.lead_id
        AND (
          leads.student_id = auth.uid()
          OR leads.consultant_id = auth.uid()
          OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
        )
    )
  );

CREATE POLICY "Users can upload documents via lead ownership" ON documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = documents.lead_id
        AND (
          leads.student_id = auth.uid()
          OR leads.consultant_id = auth.uid()
          OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
        )
  );

CREATE POLICY "Users can update documents via lead ownership" ON documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = documents.lead_id
        AND (
          leads.student_id = auth.uid()
          OR leads.consultant_id = auth.uid()
          OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
        )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = documents.lead_id
        AND (
          leads.student_id = auth.uid()
          OR leads.consultant_id = auth.uid()
          OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
        )
  );

-- RLS Policies for activity_logs
CREATE POLICY "Users can view activity logs via lead ownership" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = activity_logs.lead_id
        AND (
          leads.student_id = auth.uid()
          OR leads.consultant_id = auth.uid()
          OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
        )
    )
  );

CREATE POLICY "Users can create activity logs" ON activity_logs
  FOR INSERT WITH CHECK (
    -- Anyone can create activity logs for leads they're associated with
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = activity_logs.lead_id
        AND (
          leads.student_id = auth.uid()
          OR leads.consultant_id = auth.uid()
          OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
        )
  );

-- RLS Policies for communication_logs
CREATE POLICY "Users can view communication logs via lead ownership" ON communication_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = communication_logs.lead_id
        AND (
          leads.student_id = auth.uid()
          OR leads.consultant_id = auth.uid()
          OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
        )
    )
  );

CREATE POLICY "Users can create communication logs" ON communication_logs
  FOR INSERT WITH CHECK (
    -- Anyone can create communication logs for leads they're associated with
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = communication_logs.lead_id
        AND (
          leads.student_id = auth.uid()
          OR leads.consultant_id = auth.uid()
          OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
        )
  );

-- RLS Policies for reminders
CREATE POLICY "Users can view reminders via lead ownership" ON reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = reminders.lead_id
        AND (
          leads.student_id = auth.uid()
          OR leads.consultant_id = auth.uid()
          OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
        )
    )
  );

CREATE POLICY "Users can create reminders" ON reminders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = reminders.lead_id
        AND (
          leads.student_id = auth.uid()
          OR leads.consultant_id = auth.uid()
          OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
        )
  );

-- RLS Policies for stage_threshold_configs
CREATE POLICY "Admins can manage stage threshold configs" ON stage_threshold_configs
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- RLS Policies for feature_flags
CREATE POLICY "Everyone can view feature flags" ON feature_flags
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage feature flags" ON feature_flags
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- RLS Policies for draft_leads
CREATE POLICY "Users can view own draft leads" ON draft_leads
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Users can create own draft leads" ON draft_leads
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Users can update own draft leads" ON draft_leads
  FOR UPDATE USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Set up pg_cron jobs
-- Note: pg_cron jobs need to be set up via cron.schedule in the database
-- We'll add comments here indicating what jobs should be created
COMMENT ON EXTENSION pg_cron IS 'Extension for running periodic jobs in PostgreSQL';

-- These jobs would typically be set up after the extension is enabled:
-- SELECT cron.schedule('detect-stalled-leads', '*/1 * * * *', $$SELECT detect_and_mark_stalled_leads()$$);
-- SELECT cron.schedule('cleanup-expired-drafts-daily', '0 3 * * *', $$SELECT fn_cleanup_expired_drafts()$$);
-- SELECT cron.schedule('purge-deleted-records-daily', '0 2 * * *', $$SELECT purge_deleted_records()$$);
-- SELECT cron.schedule('refresh-materialized-views', '*/5 * * * *', $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_funnel_snapshot, mv_counselor_performance$$);

-- Create materialized views
CREATE MATERIALIZED VIEW mv_funnel_snapshot AS
SELECT
  l.stage,
  COUNT(*) AS total_leads,
  COUNT(*) FILTER (WHERE l.status = 'active') AS active_leads,
  COUNT(*) FILTER (WHERE l.status = 'stalled') AS stalled_leads,
  COUNT(*) FILTER (WHERE l.status = 'completed') AS completed_leads,
  COUNT(*) FILTER (WHERE l.status = 'dropped') AS dropped_leads,
  COUNT(DISTINCT l.student_id) AS unique_students,
  COUNT(DISTINCT l.consultant_id) AS unique_consultants
FROM leads l
GROUP BY l.stage
WITH DATA;

CREATE MATERIALIZED VIEW mv_counselor_performance AS
SELECT
  l.consultant_id,
  p.full_name AS consultant_name,
  COUNT(l.id) AS total_leads_assigned,
  COUNT(*) FILTER (WHERE l.status = 'completed') AS successful_placements,
  COUNT(*) FILTER (WHERE l.status = 'stalled') AS stalled_leads,
  AVG(EXTRACT(EPOCH FROM (l.updated_at - l.created_at))/86400) AS avg_days_per_lead,
  COUNT(*) FILTER (WHERE l.stage = 'enrollment' AND l.status = 'completed') AS enrollments_this_month
FROM leads l
JOIN profiles p ON l.consultant_id = p.id
WHERE l.consultant_id IS NOT NULL
GROUP BY l.consultant_id, p.full_name
WITH DATA;

-- Create indexes on materialized views for better query performance
CREATE UNIQUE INDEX idx_mv_funnel_snapshot_stage ON mv_funnel_snapshot(stage);
CREATE INDEX idx_mv_counselor_performance_consultant_id ON mv_counselor_performance(consultant_id);

-- Set up Supabase Realtime publication
-- Supabase realtime is typically configured automatically, but we can ensure tables are added
-- ALTER PUBLICATION supabase_realtime ADD TABLE leads, reminders, activity_logs, notifications, documents;
-- Note: In Supabase, the realtime publication is usually managed automatically

-- Insert initial data for stage threshold configs
INSERT INTO stage_threshold_configs (stage, threshold_hours, escalation_level, notification_template) VALUES
  ('initial_contact', 24, 1, 'Initial contact follow-up needed'),
  ('document_collection', 48, 2, 'Document collection overdue'),
  ('application_submission', 72, 2, 'Application submission pending'),
  ('admission_decision', 96, 3, 'Admission decision overdue'),
  ('visa_processing', 168, 3, 'Visa processing delayed'),
  ('enrollment', 336, 3, 'Enrollment follow-up needed')
ON CONFLICT (stage) DO UPDATE SET
  threshold_hours = EXCLUDED.threshold_hours,
  escalation_level = EXCLUDED.escalation_level,
  notification_template = EXCLUDED.notification_template,
  updated_at = NOW();

-- Insert some initial feature flags
INSERT INTO feature_flags (key, name, description, is_enabled, rollout_percentage, target_roles) VALUES
  ('enable_sms_notifications', 'SMS Notifications', 'Enable SMS notifications for leads', false, 0, ARRAY['admin', 'super_admin']),
  ('enable_whatsapp_integration', 'WhatsApp Integration', 'Enable WhatsApp communication channel', false, 0, ARRAY['admin', 'super_admin']),
  ('enable_video_counseling', 'Video Counseling', 'Enable video counseling sessions', false, 0, ARRAY['consultant', 'admin', 'super_admin']),
  ('enable_scholarship_matching', 'Scholarship Matching', 'Automated scholarship matching system', false, 0, ARRAY['consultant', 'admin', 'super_admin'])
ON CONFLICT (key) DO NOTHING;