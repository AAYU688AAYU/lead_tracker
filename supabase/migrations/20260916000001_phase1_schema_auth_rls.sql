-- =============================================================================
-- Phase 1 — Database Schema, Auth, RLS, and Seed
-- Naming contract: apex_fe/.kiro/steering/naming-contract.md
-- Out of scope: applications multi-university table, escalation tiers,
--               multi-tenant branch support
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ---------------------------------------------------------------------------
-- 1. Enum types
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('student', 'consultant', 'admin');

CREATE TYPE lead_stage AS ENUM (
  'inquiry',
  'consultation',
  'documents',
  'application',
  'decision',
  'enrolled'
);

CREATE TYPE lead_status AS ENUM ('active', 'stalled', 'completed', 'dropped');

CREATE TYPE document_status AS ENUM ('pending', 'approved', 'rejected');


-- ---------------------------------------------------------------------------
-- 2. Core tables  (exact columns, types, nullability, and constraints from spec)
-- ---------------------------------------------------------------------------

-- 2a. profiles
CREATE TABLE profiles (
  id                 UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role               user_role   NOT NULL,
  full_name          TEXT        NOT NULL,
  email              TEXT        NOT NULL UNIQUE,
  phone              TEXT,
  max_lead_capacity  INTEGER,
  is_accepting_leads BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2b. universities
CREATE TABLE universities (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  country    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2c. programs
CREATE TABLE programs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id  UUID        NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  degree_level   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2d. leads
CREATE TABLE leads (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code   TEXT        NOT NULL UNIQUE,
  student_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consultant_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  program_id       UUID        NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  stage            lead_stage  NOT NULL DEFAULT 'inquiry',
  status           lead_status NOT NULL DEFAULT 'active',
  stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2e. pipeline_stage_labels
CREATE TABLE pipeline_stage_labels (
  stage                 lead_stage NOT NULL PRIMARY KEY,
  label                 TEXT       NOT NULL,
  sort_order            INTEGER    NOT NULL,
  stall_threshold_hours INTEGER    NOT NULL DEFAULT 72
);

-- 2f. documents
CREATE TABLE documents (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          UUID            NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  uploaded_by      UUID            NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  file_url         TEXT            NOT NULL,
  file_name        TEXT            NOT NULL,
  status           document_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 2g. activity_logs
CREATE TABLE activity_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    UUID        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  actor_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL,  -- nullable: service-role writes have no auth.uid()
  type       TEXT        NOT NULL,
  content    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2h. communication_logs
CREATE TABLE communication_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    UUID        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  actor_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  channel    TEXT        NOT NULL CHECK (channel IN ('call', 'email', 'whatsapp', 'in_person')),
  summary    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2i. notifications
CREATE TABLE notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2j. webhook_dedup
CREATE TABLE webhook_dedup (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT        NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_profiles_role             ON profiles(role);
CREATE INDEX idx_programs_university_id    ON programs(university_id);
CREATE INDEX idx_leads_student_id          ON leads(student_id);
CREATE INDEX idx_leads_consultant_id       ON leads(consultant_id);
CREATE INDEX idx_leads_program_id          ON leads(program_id);
CREATE INDEX idx_leads_stage               ON leads(stage);
CREATE INDEX idx_leads_status              ON leads(status);
CREATE INDEX idx_leads_updated_at          ON leads(updated_at);
CREATE INDEX idx_leads_reference_code      ON leads(reference_code);
CREATE INDEX idx_documents_lead_id         ON documents(lead_id);
CREATE INDEX idx_documents_status          ON documents(status);
CREATE INDEX idx_activity_logs_lead_id     ON activity_logs(lead_id);
CREATE INDEX idx_activity_logs_actor_id    ON activity_logs(actor_id);
CREATE INDEX idx_comms_lead_id             ON communication_logs(lead_id);
CREATE INDEX idx_notifications_user_id     ON notifications(user_id);
CREATE INDEX idx_notifications_is_read     ON notifications(is_read);
CREATE INDEX idx_webhook_dedup_key         ON webhook_dedup(idempotency_key);


-- ---------------------------------------------------------------------------
-- 4. Functions & Triggers
-- ---------------------------------------------------------------------------

-- 4a. updated_at maintenance (leads only — the only spec table that has updated_at)
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 4b. stage_entered_at — update ONLY when the stage column itself changes
CREATE OR REPLACE FUNCTION fn_leads_stage_entered_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_entered_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leads_stage_entered_at
  BEFORE UPDATE OF stage ON leads
  FOR EACH ROW EXECUTE FUNCTION fn_leads_stage_entered_at();

-- 4c. reference_code generation
--     Generates an 8-character uppercase alphanumeric code, retrying on collision.
CREATE OR REPLACE FUNCTION fn_generate_reference_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  code TEXT;
BEGIN
  LOOP
    -- 8 chars from [A-Z0-9]
    code := upper(
      substring(
        replace(replace(replace(encode(gen_random_bytes(6), 'base64'), '+', ''), '/', ''), '=', ''),
        1, 8
      )
    );
    EXIT WHEN NOT EXISTS (SELECT 1 FROM leads WHERE reference_code = code);
  END LOOP;
  NEW.reference_code = code;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leads_reference_code
  BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION fn_generate_reference_code();

-- 4d. Auto-create profile row on auth.users INSERT
--     full_name defaults to empty string if not supplied in metadata (satisfies NOT NULL).
--     The application's signup flow must pass full_name and role in raw_user_meta_data.
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();

-- 4e. Mark stalled leads — called from a scheduled job (pg_cron / Edge Function cron)
CREATE OR REPLACE FUNCTION fn_mark_stalled_leads()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE leads l
  SET    status = 'stalled'
  FROM   pipeline_stage_labels psl
  WHERE  psl.stage  = l.stage
    AND  l.status   = 'active'
    AND  l.stage_entered_at <= NOW() - (psl.stall_threshold_hours * INTERVAL '1 hour');

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- 4f. Auto-log stage changes into activity_logs
CREATE OR REPLACE FUNCTION fn_log_stage_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.activity_logs (lead_id, actor_id, type, content)
    VALUES (
      NEW.id,
      auth.uid(),   -- NULL when changed by a service-role script
      'stage_change',
      format('Stage changed from %s to %s', OLD.stage::text, NEW.stage::text)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leads_log_stage_change
  AFTER UPDATE OF stage ON leads
  FOR EACH ROW EXECUTE FUNCTION fn_log_stage_change();


-- ---------------------------------------------------------------------------
-- 5. Helper — role lookup used inside RLS policies
--    SECURITY DEFINER bypasses RLS on the profiles table itself.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_current_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;


-- ---------------------------------------------------------------------------
-- 6. Row-Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities           ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stage_labels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_dedup          ENABLE ROW LEVEL SECURITY;

-- ── profiles ──────────────────────────────────────────────────────────────
-- Own row select/update
CREATE POLICY "profiles: own row select"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: own row update"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Consultants can read (not write) profiles of students on their leads
CREATE POLICY "profiles: consultant sees assigned students"
  ON profiles FOR SELECT
  USING (
    fn_current_role() = 'consultant'
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.student_id    = profiles.id
        AND leads.consultant_id = auth.uid()
    )
  );

-- Admins unrestricted
CREATE POLICY "profiles: admin select all"
  ON profiles FOR SELECT
  USING (fn_current_role() = 'admin');

CREATE POLICY "profiles: admin update all"
  ON profiles FOR UPDATE
  USING (fn_current_role() = 'admin')
  WITH CHECK (fn_current_role() = 'admin');

-- ── universities ──────────────────────────────────────────────────────────
CREATE POLICY "universities: authenticated select"
  ON universities FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "universities: admin all"
  ON universities FOR ALL
  USING (fn_current_role() = 'admin')
  WITH CHECK (fn_current_role() = 'admin');

-- ── programs ──────────────────────────────────────────────────────────────
CREATE POLICY "programs: authenticated select"
  ON programs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "programs: admin all"
  ON programs FOR ALL
  USING (fn_current_role() = 'admin')
  WITH CHECK (fn_current_role() = 'admin');

-- ── leads ─────────────────────────────────────────────────────────────────
-- Students see only their own leads
CREATE POLICY "leads: student sees own"
  ON leads FOR SELECT
  USING (student_id = auth.uid());

-- Consultants select + update only leads where they are consultant_id
CREATE POLICY "leads: consultant sees assigned"
  ON leads FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "leads: consultant update assigned"
  ON leads FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

-- Students may insert leads for themselves
CREATE POLICY "leads: student insert own"
  ON leads FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Admins unrestricted
CREATE POLICY "leads: admin all"
  ON leads FOR ALL
  USING (fn_current_role() = 'admin')
  WITH CHECK (fn_current_role() = 'admin');

-- ── pipeline_stage_labels ─────────────────────────────────────────────────
-- Readable by all authenticated users; writable by admin only
CREATE POLICY "pipeline_stage_labels: authenticated select"
  ON pipeline_stage_labels FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "pipeline_stage_labels: admin all"
  ON pipeline_stage_labels FOR ALL
  USING (fn_current_role() = 'admin')
  WITH CHECK (fn_current_role() = 'admin');

-- ── documents ─────────────────────────────────────────────────────────────
-- Readable by whoever can read the parent lead
CREATE POLICY "documents: select via lead access"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = documents.lead_id
        AND (
          l.student_id       = auth.uid()
          OR l.consultant_id = auth.uid()
          OR fn_current_role() = 'admin'
        )
    )
  );

CREATE POLICY "documents: insert via lead access"
  ON documents FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = documents.lead_id
        AND (
          l.student_id       = auth.uid()
          OR l.consultant_id = auth.uid()
          OR fn_current_role() = 'admin'
        )
    )
  );

-- Status changes (approve/reject) by consultants on their leads, or admins
CREATE POLICY "documents: update via lead access"
  ON documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = documents.lead_id
        AND (
          l.consultant_id = auth.uid()
          OR fn_current_role() = 'admin'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = documents.lead_id
        AND (
          l.consultant_id = auth.uid()
          OR fn_current_role() = 'admin'
        )
    )
  );

-- ── activity_logs ─────────────────────────────────────────────────────────
CREATE POLICY "activity_logs: select via lead access"
  ON activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = activity_logs.lead_id
        AND (
          l.student_id       = auth.uid()
          OR l.consultant_id = auth.uid()
          OR fn_current_role() = 'admin'
        )
    )
  );

CREATE POLICY "activity_logs: insert via lead access"
  ON activity_logs FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = activity_logs.lead_id
        AND (
          l.student_id       = auth.uid()
          OR l.consultant_id = auth.uid()
          OR fn_current_role() = 'admin'
        )
    )
  );

-- ── communication_logs ────────────────────────────────────────────────────
CREATE POLICY "communication_logs: select via lead access"
  ON communication_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = communication_logs.lead_id
        AND (
          l.student_id       = auth.uid()
          OR l.consultant_id = auth.uid()
          OR fn_current_role() = 'admin'
        )
    )
  );

CREATE POLICY "communication_logs: insert via lead access"
  ON communication_logs FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = communication_logs.lead_id
        AND (
          l.student_id       = auth.uid()
          OR l.consultant_id = auth.uid()
          OR fn_current_role() = 'admin'
        )
    )
  );

-- ── notifications ─────────────────────────────────────────────────────────
-- Readable and writable only where user_id = auth.uid()
CREATE POLICY "notifications: own select"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications: own update"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins see all
CREATE POLICY "notifications: admin select all"
  ON notifications FOR SELECT
  USING (fn_current_role() = 'admin');

-- Inserts are from SECURITY DEFINER server functions — no user INSERT policy needed.

-- ── webhook_dedup ─────────────────────────────────────────────────────────
-- Only service-role (SECURITY DEFINER functions) should touch this table.
-- No authenticated user policies — RLS blocks all direct access.


-- ---------------------------------------------------------------------------
-- 7. Seed — pipeline_stage_labels
--    Six stages, sort_order 1–6, stall_threshold_hours 72 each.
-- ---------------------------------------------------------------------------
INSERT INTO pipeline_stage_labels (stage, label, sort_order, stall_threshold_hours)
VALUES
  ('inquiry',      'Inquiry',      1, 72),
  ('consultation', 'Consultation', 2, 72),
  ('documents',    'Documents',    3, 72),
  ('application',  'Application',  4, 72),
  ('decision',     'Decision',     5, 72),
  ('enrolled',     'Enrolled',     6, 72)
ON CONFLICT (stage) DO UPDATE
  SET label                 = EXCLUDED.label,
      sort_order            = EXCLUDED.sort_order,
      stall_threshold_hours = EXCLUDED.stall_threshold_hours;
