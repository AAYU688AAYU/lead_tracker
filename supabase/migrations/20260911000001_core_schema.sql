-- ==============================================================================
-- 1. EXTENSIONS & ENUMS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'consultant', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE admission_stage AS ENUM (
        'Inquiry', 
        'Counseling', 
        'Document Collection', 
        'Application', 
        'Fee/Verification', 
        'Admitted'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE doc_type AS ENUM ('TRANSCRIPT', 'IELTS_SCORECARD', 'PASSPORT', 'STATEMENT_OF_PURPOSE', 'RESUME');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE doc_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE comm_channel AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE comm_status AS ENUM ('QUEUED', 'DELIVERED', 'FAILED', 'READ');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. CORE RELATIONAL TABLES
-- ==============================================================================

-- Profiles Table (Mirrors or links to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    phone TEXT,
    branch_location TEXT DEFAULT 'Global Online',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Universities Catalog
CREATE TABLE IF NOT EXISTS public.universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    ranking_global INTEGER,
    partnership_tier TEXT DEFAULT 'Standard',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Programs Catalog
CREATE TABLE IF NOT EXISTS public.programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    program_name TEXT NOT NULL,
    degree_level TEXT NOT NULL,
    annual_tuition_usd NUMERIC(10, 2),
    intake_seasons TEXT[] DEFAULT ARRAY['Fall', 'Spring'],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Leads (Student Application Pipeline)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_consultant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
    target_country TEXT NOT NULL,
    stage admission_stage NOT NULL DEFAULT 'Inquiry',
    is_stalled BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_status TEXT NOT NULL DEFAULT 'NONE',
    notes TEXT,
    metadata JSONB DEFAULT '{
        "student_name": null,
        "gpa": null,
        "ielts_overall": null,
        "target_intake": "Fall 2027",
        "budget_range_usd": "25k-40k"
    }'::jsonb,
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_leads_student ON public.leads(student_id);
CREATE INDEX IF NOT EXISTS idx_leads_consultant ON public.leads(assigned_consultant_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_stalled ON public.leads(is_stalled) WHERE is_stalled = TRUE;
CREATE INDEX IF NOT EXISTS idx_leads_updated ON public.leads(updated_at);

-- Academic Documents Vault
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    document_type doc_type NOT NULL,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    verification_status doc_status NOT NULL DEFAULT 'PENDING',
    review_notes TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Activity Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    details TEXT NOT NULL,
    change_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Communication Logs (Email & WhatsApp Status)
CREATE TABLE IF NOT EXISTS public.communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    channel comm_channel NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT,
    content_snippet TEXT NOT NULL,
    external_message_id TEXT,
    status comm_status NOT NULL DEFAULT 'QUEUED',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Stall Reminders
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    consultant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    stage_at_stall admission_stage NOT NULL,
    hours_inactive NUMERIC(6, 1) NOT NULL,
    message TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    resolved_at TIMESTAMPTZ
);

-- Stage SLA Threshold Configurations
CREATE TABLE IF NOT EXISTS public.stage_threshold_configs (
    stage admission_stage PRIMARY KEY,
    threshold_hours INTEGER NOT NULL,
    severity TEXT NOT NULL DEFAULT 'MEDIUM',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Default SLA Thresholds Seed
INSERT INTO public.stage_threshold_configs (stage, threshold_hours, severity) VALUES
('Inquiry', 24, 'HIGH'),
('Counseling', 48, 'MEDIUM'),
('Document Collection', 72, 'MEDIUM'),
('Application', 48, 'HIGH'),
('Fee/Verification', 24, 'CRITICAL'),
('Admitted', 999999, 'NONE')
ON CONFLICT (stage) DO UPDATE 
SET threshold_hours = EXCLUDED.threshold_hours,
    severity = EXCLUDED.severity;
