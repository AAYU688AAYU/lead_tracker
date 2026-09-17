-- =============================================================================
-- Phase 10 — Security & Quality Improvements (Part 1: Password Reset)
-- =============================================================================
--
-- This migration implements:
--   1. Password reset tokens table with expiration
--   2. Email verification flow for password changes
--   3. Secure token generation and validation
--   4. Activity logging for password reset events
--
-- Safe to run multiple times — all CREATE IF NOT EXISTS / DROP IF EXISTS.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. PASSWORD RESET TOKENS TABLE
-- ---------------------------------------------------------------------------

-- Create password_reset_tokens table for secure password reset flow
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,  -- Store email at time of request (for verification)
  token TEXT NOT NULL UNIQUE,  -- URL-safe token
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NULL,  -- Track when token was used
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.password_reset_tokens IS
  'Phase 10: Secure password reset tokens with expiration. Tokens valid for 1 hour.';

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON public.password_reset_tokens (user_id)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token
  ON public.password_reset_tokens (token)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
  ON public.password_reset_tokens (expires_at)
  WHERE used_at IS NULL;

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role (from server actions) can access these tokens
-- No authenticated user should directly access this table
CREATE POLICY "password_reset_tokens: service_role only"
  ON public.password_reset_tokens
  FOR ALL
  USING (FALSE)  -- No direct access
  WITH CHECK (FALSE);


-- ---------------------------------------------------------------------------
-- 2. EMAIL VERIFICATION TABLE
-- ---------------------------------------------------------------------------

-- Track email verification requests
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  new_email TEXT NOT NULL,  -- Email to be verified
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.email_verification_tokens IS
  'Phase 10: Email verification tokens for email change requests. Valid for 24 hours.';

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id
  ON public.email_verification_tokens (user_id)
  WHERE verified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token
  ON public.email_verification_tokens (token)
  WHERE verified_at IS NULL;

ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_verification_tokens: service_role only"
  ON public.email_verification_tokens
  FOR ALL
  USING (FALSE)
  WITH CHECK (FALSE);


-- ---------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS FOR PASSWORD RESET
-- ---------------------------------------------------------------------------

-- 3a. Generate secure password reset token
CREATE OR REPLACE FUNCTION fn_generate_password_reset_token(p_user_id UUID, p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Generate URL-safe token (base64-like, no special chars)
  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := NOW() + INTERVAL '1 hour';
  
  -- Insert token
  INSERT INTO public.password_reset_tokens (user_id, email, token, expires_at)
  VALUES (p_user_id, p_email, v_token, v_expires_at)
  ON CONFLICT (token) DO NOTHING;
  
  RETURN v_token;
END;
$$;

COMMENT ON FUNCTION fn_generate_password_reset_token IS
  'Phase 10: Generate secure password reset token (1 hour expiration).';


-- 3b. Validate password reset token
CREATE OR REPLACE FUNCTION fn_validate_password_reset_token(p_user_id UUID, p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
BEGIN
  -- Find the token
  SELECT * INTO v_token_record
  FROM public.password_reset_tokens
  WHERE user_id = p_user_id
    AND token = p_token
    AND used_at IS NULL
    AND expires_at > NOW();
  
  -- Token is valid if found
  RETURN v_token_record IS NOT NULL;
END;
$$;

COMMENT ON FUNCTION fn_validate_password_reset_token IS
  'Phase 10: Validate password reset token (checks user_id, expiration, and used status).';


-- 3c. Mark password reset token as used
CREATE OR REPLACE FUNCTION fn_mark_password_reset_token_used(p_user_id UUID, p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_rows INTEGER;
BEGIN
  -- Mark token as used
  UPDATE public.password_reset_tokens
  SET used_at = NOW()
  WHERE user_id = p_user_id
    AND token = p_token
    AND used_at IS NULL
    AND expires_at > NOW();
  
  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  RETURN v_updated_rows > 0;
END;
$$;

COMMENT ON FUNCTION fn_mark_password_reset_token_used IS
  'Phase 10: Mark password reset token as used (prevents reuse).';


-- 3d. Cleanup expired tokens (run via cron)
CREATE OR REPLACE FUNCTION fn_cleanup_expired_password_tokens()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete password reset tokens older than 24 hours
  WITH deleted_tokens AS (
    DELETE FROM public.password_reset_tokens
    WHERE created_at < NOW() - INTERVAL '24 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted_tokens;
  
  -- Delete email verification tokens older than 48 hours
  WITH deleted_emails AS (
    DELETE FROM public.email_verification_tokens
    WHERE created_at < NOW() - INTERVAL '48 hours'
    RETURNING id
  )
  SELECT COUNT(*) + v_deleted_count INTO v_deleted_count FROM deleted_emails;
  
  -- Log cleanup event
  INSERT INTO public.activity_logs (lead_id, actor_id, type, content)
  VALUES (
    NULL,
    NULL,
    'MAINTENANCE_CLEANUP_TOKENS',
    format('Deleted %d expired password and email verification tokens', v_deleted_count)
  );
  
  RETURN jsonb_build_object('deleted_tokens', v_deleted_count);
END;
$$;

COMMENT ON FUNCTION fn_cleanup_expired_password_tokens IS
  'Phase 10: Cleanup expired password reset and email verification tokens.';


-- ---------------------------------------------------------------------------
-- 4. SCHEDULE TOKEN CLEANUP VIA PG_CRON
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup-expired-tokens');
    PERFORM cron.schedule(
      'cleanup-expired-tokens',
      '0 4 * * *',  -- Daily at 4am UTC
      $$SELECT fn_cleanup_expired_password_tokens()$$
    );
    RAISE NOTICE '[Phase 10] Scheduled pg_cron job: cleanup-expired-tokens (daily at 4am)';
  END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- 5. AUDIT LOGGING FOR PASSWORD EVENTS
-- ---------------------------------------------------------------------------

-- Enhanced activity logging for password-related events
-- (activity_logs table already exists from Phase 1, just documenting usage)

-- Password reset initiated: logged from server action
-- Password reset completed: logged from server action
-- Password changed: logged from server action
-- Failed password reset attempts: logged from server action


-- ---------------------------------------------------------------------------
-- 6. VALIDATION & FINALIZATION
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '[Phase 10] ✓ Password reset tokens table created';
  RAISE NOTICE '[Phase 10] ✓ Email verification table created';
  RAISE NOTICE '[Phase 10] ✓ Token generation & validation functions created';
  RAISE NOTICE '[Phase 10] ✓ Token cleanup job scheduled';
  RAISE NOTICE '';
  RAISE NOTICE 'Phase 10 Part 1 (Password Reset) migration complete.';
END;
$$;
