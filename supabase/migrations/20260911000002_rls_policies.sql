-- ==============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all sensitive tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_threshold_configs ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    );
$$;

-- Helper function: Check if current user is Consultant
CREATE OR REPLACE FUNCTION public.is_consultant()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'consultant'
    );
$$;

--------------------------------------------------------------------------------
-- 1. PROFILES POLICIES
--------------------------------------------------------------------------------
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_super_admin() OR public.is_consultant());

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

--------------------------------------------------------------------------------
-- 2. LEADS POLICIES (3-ROLE ENFORCEMENT)
--------------------------------------------------------------------------------
-- Role 1 (Student): Read own application records
CREATE POLICY "Students can view own applications"
    ON public.leads FOR SELECT
    USING (auth.uid() = student_id);

-- Role 1 (Student): Insert own application record
CREATE POLICY "Students can insert own application"
    ON public.leads FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Role 2 (Consultant): View assigned student leads
CREATE POLICY "Consultants can view assigned leads"
    ON public.leads FOR SELECT
    USING (auth.uid() = assigned_consultant_id);

-- Role 2 (Consultant): Update stage, notes, and contact time for assigned leads
CREATE POLICY "Consultants can update assigned leads"
    ON public.leads FOR UPDATE
    USING (auth.uid() = assigned_consultant_id);

-- Role 3 (Super Admin): Full unrestricted access
CREATE POLICY "Super Admins have full access to leads"
    ON public.leads FOR ALL
    USING (public.is_super_admin());

--------------------------------------------------------------------------------
-- 3. DOCUMENTS VAULT POLICIES
--------------------------------------------------------------------------------
CREATE POLICY "Students view own documents"
    ON public.documents FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.leads 
        WHERE leads.id = documents.lead_id AND leads.student_id = auth.uid()
    ));

CREATE POLICY "Students upload documents to own applications"
    ON public.documents FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.leads 
        WHERE leads.id = documents.lead_id AND leads.student_id = auth.uid()
    ));

CREATE POLICY "Consultants view assigned student documents"
    ON public.documents FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.leads 
        WHERE leads.id = documents.lead_id AND leads.assigned_consultant_id = auth.uid()
    ));

CREATE POLICY "Consultants verify assigned student documents"
    ON public.documents FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.leads 
        WHERE leads.id = documents.lead_id AND leads.assigned_consultant_id = auth.uid()
    ));

CREATE POLICY "Admins full document access"
    ON public.documents FOR ALL
    USING (public.is_super_admin());

--------------------------------------------------------------------------------
-- 4. REMINDERS POLICIES
--------------------------------------------------------------------------------
CREATE POLICY "Consultants manage own reminders"
    ON public.reminders FOR ALL
    USING (auth.uid() = consultant_id OR public.is_super_admin());
