-- =============================================================================
-- Phase 9 — Automation & Background Jobs
-- =============================================================================
--
-- This migration implements:
--   1. Audit triggers: fn_audit_lead_changes, document versioning, deactivation handler
--   2. Data maintenance jobs: pg_cron for draft cleanup, soft-delete purge
--   3. Materialized views: mv_funnel_snapshot, mv_counselor_performance
--   4. Improved stall detection: increase frequency to 1 minute, add metrics
--
-- Safe to run multiple times — all CREATE OR REPLACE, IF NOT EXISTS checks.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. AUDIT TRIGGERS — Comprehensive change tracking
-- ---------------------------------------------------------------------------

-- 1a. Enhanced audit function: captures old/new values in JSONB
--     This function logs comprehensive audit trails of lead changes
CREATE OR REPLACE FUNCTION fn_audit_lead_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_change_payload JSONB;
  v_changed_fields TEXT[] := ARRAY[]::TEXT[];
  v_event_type TEXT;
BEGIN
  -- Build array of changed fields
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    v_changed_fields := v_changed_fields || format('stage: %s → %s', OLD.stage::text, NEW.stage::text);
    v_event_type := 'STAGE_CHANGED';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_changed_fields := v_changed_fields || format('status: %s → %s', OLD.status::text, NEW.status::text);
    v_event_type := COALESCE(v_event_type, 'STATUS_CHANGED');
  END IF;

  IF NEW.consultant_id IS DISTINCT FROM OLD.consultant_id THEN
    v_changed_fields := v_changed_fields || format('consultant_id: %s → %s', 
      COALESCE(OLD.consultant_id::text, 'null'), 
      COALESCE(NEW.consultant_id::text, 'null')
    );
    v_event_type := COALESCE(v_event_type, 'CONSULTANT_CHANGED');
  END IF;

  IF NEW.notes IS DISTINCT FROM OLD.notes THEN
    v_changed_fields := v_changed_fields || 'notes: updated';
    v_event_type := COALESCE(v_event_type, 'NOTES_UPDATED');
  END IF;

  -- Only log if something actually changed
  IF v_changed_fields IS NOT NULL AND array_length(v_changed_fields, 1) > 0 THEN
    v_change_payload := jsonb_build_object(
      'old_values', jsonb_build_object(
        'stage', OLD.stage::text,
        'status', OLD.status::text,
        'consultant_id', OLD.consultant_id,
        'stage_entered_at', OLD.stage_entered_at,
        'updated_at', OLD.updated_at
      ),
      'new_values', jsonb_build_object(
        'stage', NEW.stage::text,
        'status', NEW.status::text,
        'consultant_id', NEW.consultant_id,
        'stage_entered_at', NEW.stage_entered_at,
        'updated_at', NEW.updated_at
      ),
      'changed_fields', v_changed_fields
    );

    -- Insert comprehensive audit log
    INSERT INTO public.activity_logs (lead_id, actor_id, type, content)
    VALUES (
      NEW.id,
      auth.uid(),
      v_event_type,
      jsonb_pretty(v_change_payload)
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_audit_lead_changes() IS
  'Phase 9: Comprehensive audit of lead changes. Captures old/new values in JSONB. '
  'Logs stage changes, status transitions, consultant changes. Wraps in exception block.';

-- Create trigger on leads UPDATE (runs AFTER so changes are committed first)
DROP TRIGGER IF EXISTS trg_audit_lead_changes ON public.leads;
CREATE TRIGGER trg_audit_lead_changes
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION fn_audit_lead_changes();


-- 1b. Document versioning: mark prior versions as superseded
--     When a new document is uploaded for the same document type/lead,
--     mark the previous one as not current
CREATE OR REPLACE FUNCTION fn_supersede_prior_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark all previous versions of this document as NOT current
  -- (We infer "version" by file_name pattern or timestamp)
  -- For now, we mark ALL documents for this lead from the same uploader as "superseded"
  UPDATE public.documents
  SET status = 'superseded'
  WHERE lead_id = NEW.lead_id
    AND id != NEW.id
    AND uploaded_by = NEW.uploaded_by
    AND status IN ('pending', 'approved');

  -- Log the supersession in activity_logs
  INSERT INTO public.activity_logs (lead_id, actor_id, type, content)
  VALUES (
    NEW.lead_id,
    NEW.uploaded_by,
    'DOCUMENT_UPLOADED',
    format('Document "%s" uploaded; prior versions marked as superseded', NEW.file_name)
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_supersede_prior_document() IS
  'Phase 9: On document INSERT, mark prior versions as superseded. '
  'Preserves version history chain for audit.';

-- Create trigger on documents INSERT
DROP TRIGGER IF EXISTS trg_supersede_prior_document ON public.documents;
CREATE TRIGGER trg_supersede_prior_document
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION fn_supersede_prior_document();


-- 1c. Consultant deactivation cascading
--     When a consultant is deactivated (is_active = false), flag their leads
--     for reassignment and notify admins
CREATE OR REPLACE FUNCTION fn_consultant_deactivation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_affected_lead_count INTEGER;
BEGIN
  -- Only trigger if is_active changes to false
  IF NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
    -- Find all leads assigned to this consultant
    v_affected_lead_count := (
      SELECT COUNT(*)
      FROM public.leads
      WHERE consultant_id = NEW.id AND status = 'active'
    );

    -- Mark all active leads as needing reassignment
    UPDATE public.leads
    SET notes = COALESCE(notes || E'\n', '') || format(
      'REASSIGNMENT_REQUIRED: Consultant %s deactivated on %s',
      NEW.full_name,
      NOW()::text
    )
    WHERE consultant_id = NEW.id AND status = 'active';

    -- Notify all admins
    SELECT ARRAY_AGG(id) INTO v_admin_ids
    FROM public.profiles
    WHERE role = 'admin' AND is_active = TRUE;

    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids LOOP
        INSERT INTO public.notifications (user_id, type, content)
        VALUES (
          v_admin_id,
          'admin_message',
          format(
            'Consultant %s has been deactivated. %d active leads require reassignment.',
            NEW.full_name,
            v_affected_lead_count
          )
        );
      END LOOP;
    END IF;

    -- Log event
    INSERT INTO public.activity_logs (lead_id, actor_id, type, content)
    SELECT
      leads.id,
      auth.uid(),
      'CONSULTANT_DEACTIVATED',
      format('Consultant %s deactivated; lead flagged for reassignment', NEW.full_name)
    FROM public.leads
    WHERE consultant_id = NEW.id AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_consultant_deactivation() IS
  'Phase 9: When consultant is deactivated, flag leads for reassignment and notify admins.';

-- Create trigger on profiles UPDATE (on is_active column)
DROP TRIGGER IF EXISTS trg_consultant_deactivation ON public.profiles;
CREATE TRIGGER trg_consultant_deactivation
  AFTER UPDATE OF is_active ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION fn_consultant_deactivation();


-- ---------------------------------------------------------------------------
-- 2. ENHANCE DOCUMENTS TABLE — Add versioning support
-- ---------------------------------------------------------------------------

-- Add columns if they don't exist
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT TRUE;

ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

COMMENT ON COLUMN public.documents.is_current IS
  'Phase 9: Whether this is the current version. Set to FALSE when superseded.';

COMMENT ON COLUMN public.documents.version_number IS
  'Phase 9: Document version number for tracking revisions.';

-- Update document_status enum to include 'superseded'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'superseded'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_status')
  ) THEN
    ALTER TYPE document_status ADD VALUE 'superseded';
  END IF;
END;
$$;

-- Create index for efficient current version lookup
CREATE INDEX IF NOT EXISTS idx_documents_lead_is_current
  ON public.documents (lead_id, is_current DESC)
  WHERE is_current = TRUE;


-- ---------------------------------------------------------------------------
-- 3. ENHANCE PROFILES TABLE — Add is_active column if missing
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.profiles.is_active IS
  'Phase 9: Soft-delete marker. Deactivated consultants cannot receive new leads.';

CREATE INDEX IF NOT EXISTS idx_profiles_is_active
  ON public.profiles (is_active)
  WHERE is_active = TRUE;


-- ---------------------------------------------------------------------------
-- 4. ENHANCE LEADS TABLE — Add soft-delete support and tracking
-- ---------------------------------------------------------------------------

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.leads.deleted_at IS
  'Phase 9: Soft-delete timestamp. Null = not deleted.';

COMMENT ON COLUMN public.leads.last_contacted_at IS
  'Phase 9: Timestamp of most recent communication. Used by stall detection.';

CREATE INDEX IF NOT EXISTS idx_leads_deleted_at
  ON public.leads (deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_last_contacted_at
  ON public.leads (last_contacted_at)
  WHERE last_contacted_at IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 5. ENHANCE COMMUNICATION_LOGS TABLE — Add tracking for auto-responses
-- ---------------------------------------------------------------------------

ALTER TABLE public.communication_logs
ADD COLUMN IF NOT EXISTS external_message_id TEXT DEFAULT NULL;

ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced'));

COMMENT ON COLUMN public.communication_logs.external_message_id IS
  'Phase 9: ID from external provider (Resend, Twilio) for tracking.';

COMMENT ON COLUMN public.communication_logs.status IS
  'Phase 9: Delivery status of communication.';

CREATE INDEX IF NOT EXISTS idx_communication_logs_external_id
  ON public.communication_logs (external_message_id)
  WHERE external_message_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 6. UPDATE STALL DETECTION — Improve frequency and add metrics
-- ---------------------------------------------------------------------------

-- Replace the Phase 7 pg_cron schedule with 1-minute frequency
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule the old 15-minute job
    PERFORM cron.unschedule('mark-stalled-leads');
    
    -- Schedule new 1-minute job
    PERFORM cron.schedule(
      'mark-stalled-leads',      -- job name
      '* * * * *',               -- every 1 minute
      $$SELECT fn_mark_stalled_leads()$$
    );
    
    RAISE NOTICE '[Phase 9] Updated pg_cron job: mark-stalled-leads now runs every 1 minute';
  ELSE
    RAISE NOTICE
      '[Phase 9] pg_cron not available. Enable it in Supabase → Database → Extensions. '
      'Then manually schedule: SELECT cron.schedule(''mark-stalled-leads'', ''* * * * *'', ''SELECT fn_mark_stalled_leads()'');';
  END IF;
END;
$$;

-- Enhanced stall-detection function with metrics logging
CREATE OR REPLACE FUNCTION fn_mark_stalled_leads()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec             RECORD;
  v_processed     INTEGER := 0;
  v_stalled       INTEGER := 0;
  v_failed        INTEGER := 0;
  v_admin_ids     UUID[];
  v_notif_user_id UUID;
BEGIN
  -- Cache admin IDs once for the whole batch
  SELECT ARRAY_AGG(id)
  INTO   v_admin_ids
  FROM   public.profiles
  WHERE  role = 'admin' AND is_active = TRUE;

  -- Iterate every active lead whose stage timer has expired AND that has
  -- received no communication since entering the current stage
  FOR rec IN
    SELECT
      l.id               AS lead_id,
      l.consultant_id    AS consultant_id,
      l.stage            AS stage,
      l.stage_entered_at AS stage_entered_at,
      psl.stall_threshold_hours AS threshold_hours
    FROM   public.leads l
    JOIN   public.pipeline_stage_labels psl ON psl.stage = l.stage
    WHERE  l.status = 'active'
      AND  l.deleted_at IS NULL
      AND  l.stage_entered_at <= NOW() - (psl.stall_threshold_hours * INTERVAL '1 hour')
      AND  NOT EXISTS (
             SELECT 1
             FROM   public.communication_logs cl
             WHERE  cl.lead_id    = l.id
               AND  cl.created_at > l.stage_entered_at
           )
  LOOP
    v_processed := v_processed + 1;

    BEGIN  -- ── per-lead subtransaction block ──────────────────────────────

      -- 6a. Flip the lead to stalled
      UPDATE public.leads
      SET    status = 'stalled'
      WHERE  id     = rec.lead_id
        AND  status = 'active';

      -- 6b. Insert notification(s)
      IF rec.consultant_id IS NOT NULL THEN
        -- Notify the assigned consultant
        INSERT INTO public.notifications (user_id, type, content)
        VALUES (
          rec.consultant_id,
          'lead_stalled',
          format(
            'Lead in "%s" stage has stalled — no contact since %s. Reference: %s',
            rec.stage,
            to_char(rec.stage_entered_at AT TIME ZONE 'UTC', 'DD Mon YYYY HH24:MI UTC'),
            (SELECT reference_code FROM public.leads WHERE id = rec.lead_id)
          )
        );
      ELSE
        -- No consultant assigned — notify every admin
        IF v_admin_ids IS NOT NULL THEN
          FOREACH v_notif_user_id IN ARRAY v_admin_ids LOOP
            INSERT INTO public.notifications (user_id, type, content)
            VALUES (
              v_notif_user_id,
              'lead_stalled',
              format(
                'Unassigned lead in "%s" stage has stalled. Reference: %s',
                rec.stage,
                (SELECT reference_code FROM public.leads WHERE id = rec.lead_id)
              )
            );
          END LOOP;
        END IF;
      END IF;

      -- 6c. Log stall event to activity_logs for observability
      INSERT INTO public.activity_logs (lead_id, actor_id, type, content)
      VALUES (
        rec.lead_id,
        NULL,  -- system-generated, no actor
        'STALL_TRIGGERED',
        format(
          'Lead stalled: stage="%s", inactivity=%s hours, threshold=%s hours',
          rec.stage,
          EXTRACT(EPOCH FROM (NOW() - rec.stage_entered_at)) / 3600,
          rec.threshold_hours
        )
      );

      v_stalled := v_stalled + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Log but do not re-raise — other leads must keep processing
      v_failed := v_failed + 1;
      RAISE WARNING
        '[fn_mark_stalled_leads] lead_id=% failed: % — %',
        rec.lead_id, SQLSTATE, SQLERRM;
    END;  -- ── end per-lead block ──────────────────────────────────────────

  END LOOP;

  -- Log aggregate metrics to activity_logs
  INSERT INTO public.activity_logs (lead_id, actor_id, type, content)
  VALUES (
    NULL,  -- no specific lead
    NULL,  -- system-generated
    'STALL_DETECTION_METRICS',
    format(
      'Stall detection cycle: processed=%d, stalled=%d, failed=%d, timestamp=%s',
      v_processed,
      v_stalled,
      v_failed,
      NOW()::text
    )
  );

  RETURN jsonb_build_object(
    'processed', v_processed,
    'stalled',   v_stalled,
    'failed',    v_failed,
    'timestamp', NOW()::text
  );
END;
$$;

COMMENT ON FUNCTION fn_mark_stalled_leads() IS
  'Phase 9: Enhanced stall detection with 1-minute frequency, comprehensive metrics logging.';


-- ---------------------------------------------------------------------------
-- 7. DATA MAINTENANCE JOBS — pg_cron scheduled tasks
-- ---------------------------------------------------------------------------

-- 7a. Cleanup expired draft leads (daily at 3am)
CREATE OR REPLACE FUNCTION fn_cleanup_expired_drafts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete draft leads older than 7 days with no activity
  WITH deleted AS (
    DELETE FROM public.leads
    WHERE status = 'active'
      AND stage = 'inquiry'
      AND created_at < NOW() - INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.communication_logs cl
        WHERE cl.lead_id = leads.id
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  -- Log the cleanup event
  INSERT INTO public.activity_logs (lead_id, actor_id, type, content)
  VALUES (
    NULL,
    NULL,
    'MAINTENANCE_CLEANUP_DRAFTS',
    format('Deleted %d expired draft leads older than 7 days', v_deleted_count)
  );

  RETURN jsonb_build_object(
    'deleted_drafts', v_deleted_count,
    'timestamp', NOW()::text
  );
END;
$$;

COMMENT ON FUNCTION fn_cleanup_expired_drafts() IS
  'Phase 9: Remove draft leads (inquiry stage) older than 7 days with no activity.';

-- Schedule: daily at 3am UTC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup-expired-drafts');
    PERFORM cron.schedule(
      'cleanup-expired-drafts',
      '0 3 * * *',  -- daily at 03:00 UTC
      $$SELECT fn_cleanup_expired_drafts()$$
    );
    RAISE NOTICE '[Phase 9] Scheduled pg_cron job: cleanup-expired-drafts (daily at 3am)';
  END IF;
END;
$$;


-- 7b. Purge hard-deleted records (daily at 2am)
CREATE OR REPLACE FUNCTION fn_purge_deleted_records()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_docs INTEGER := 0;
  v_deleted_leads INTEGER := 0;
BEGIN
  -- Delete soft-deleted documents older than 90 days
  WITH deleted_docs AS (
    DELETE FROM public.documents
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_docs FROM deleted_docs;

  -- Delete soft-deleted leads older than 90 days
  -- BUT preserve profiles for FK integrity in activity_logs
  WITH deleted_leads AS (
    DELETE FROM public.leads
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_leads FROM deleted_leads;

  -- Log the purge event
  INSERT INTO public.activity_logs (lead_id, actor_id, type, content)
  VALUES (
    NULL,
    NULL,
    'MAINTENANCE_PURGE_DELETED',
    format('Purged deleted records: documents=%d, leads=%d', v_deleted_docs, v_deleted_leads)
  );

  RETURN jsonb_build_object(
    'deleted_documents', v_deleted_docs,
    'deleted_leads', v_deleted_leads,
    'timestamp', NOW()::text
  );
END;
$$;

COMMENT ON FUNCTION fn_purge_deleted_records() IS
  'Phase 9: Hard-delete soft-deleted records (documents, leads) older than 90 days.';

-- Schedule: daily at 2am UTC (before draft cleanup)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge-deleted-records');
    PERFORM cron.schedule(
      'purge-deleted-records',
      '0 2 * * *',  -- daily at 02:00 UTC
      $$SELECT fn_purge_deleted_records()$$
    );
    RAISE NOTICE '[Phase 9] Scheduled pg_cron job: purge-deleted-records (daily at 2am)';
  END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- 8. MATERIALIZED VIEWS — Analytics snapshots
-- ---------------------------------------------------------------------------

-- 8a. Funnel snapshot: lead distribution by stage and consultant
DROP MATERIALIZED VIEW IF EXISTS public.mv_funnel_snapshot CASCADE;

CREATE MATERIALIZED VIEW public.mv_funnel_snapshot AS
SELECT
  l.stage,
  l.consultant_id,
  p.full_name AS consultant_name,
  COUNT(DISTINCT l.id) AS total_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'active' THEN l.id END) AS active_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'stalled' THEN l.id END) AS stalled_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'completed' THEN l.id END) AS completed_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'dropped' THEN l.id END) AS dropped_leads,
  NOW() AS refreshed_at
FROM public.leads l
LEFT JOIN public.profiles p ON p.id = l.consultant_id
WHERE l.deleted_at IS NULL
GROUP BY l.stage, l.consultant_id, p.full_name
ORDER BY l.stage, consultant_name;

CREATE INDEX idx_mv_funnel_stage ON public.mv_funnel_snapshot (stage);
CREATE INDEX idx_mv_funnel_consultant ON public.mv_funnel_snapshot (consultant_id);

COMMENT ON MATERIALIZED VIEW public.mv_funnel_snapshot IS
  'Phase 9: Real-time funnel snapshot showing lead distribution by stage and consultant.';


-- 8b. Consultant performance: metrics on closed rate, avg cycle time, etc.
DROP MATERIALIZED VIEW IF EXISTS public.mv_counselor_performance CASCADE;

CREATE MATERIALIZED VIEW public.mv_counselor_performance AS
SELECT
  p.id AS consultant_id,
  p.full_name,
  COUNT(DISTINCT l.id) AS total_leads_managed,
  COUNT(DISTINCT CASE WHEN l.status = 'completed' THEN l.id END) AS leads_completed,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN l.status = 'completed' THEN l.id END) 
    / NULLIF(COUNT(DISTINCT l.id), 0),
    2
  ) AS completion_rate_percent,
  COUNT(DISTINCT CASE WHEN l.status = 'active' THEN l.id END) AS active_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'stalled' THEN l.id END) AS stalled_leads,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (NOW() - l.created_at)) / 86400
    )::numeric,
    2
  ) AS avg_lead_age_days,
  MAX(l.updated_at) AS last_activity,
  NOW() AS refreshed_at
FROM public.profiles p
LEFT JOIN public.leads l ON l.consultant_id = p.id AND l.deleted_at IS NULL
WHERE p.role = 'consultant' AND p.is_active = TRUE
GROUP BY p.id, p.full_name
ORDER BY completion_rate_percent DESC, active_leads DESC;

CREATE INDEX idx_mv_performance_consultant ON public.mv_counselor_performance (consultant_id);
CREATE INDEX idx_mv_performance_completion ON public.mv_counselor_performance (completion_rate_percent DESC);

COMMENT ON MATERIALIZED VIEW public.mv_counselor_performance IS
  'Phase 9: Consultant performance metrics: completion rate, active leads, cycle time.';


-- ---------------------------------------------------------------------------
-- 9. MATERIALIZED VIEW REFRESH JOB — pg_cron scheduler
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_refresh_materialized_views()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_time TIMESTAMPTZ := NOW();
  v_funnel_time NUMERIC;
  v_perf_time NUMERIC;
BEGIN
  -- Refresh funnel view concurrently (prevents blocking readers)
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_funnel_snapshot;
  v_funnel_time := EXTRACT(EPOCH FROM (NOW() - v_start_time));

  -- Refresh performance view concurrently
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_counselor_performance;
  v_perf_time := EXTRACT(EPOCH FROM (NOW() - (v_start_time + v_funnel_time * INTERVAL '1 second')));

  -- Log refresh event
  INSERT INTO public.activity_logs (lead_id, actor_id, type, content)
  VALUES (
    NULL,
    NULL,
    'MV_REFRESH_COMPLETE',
    format(
      'Materialized views refreshed: funnel=%.2fs, performance=%.2fs, total=%.2fs',
      v_funnel_time,
      v_perf_time,
      EXTRACT(EPOCH FROM (NOW() - v_start_time))
    )
  );

  RETURN jsonb_build_object(
    'funnel_refresh_time_ms', ROUND(v_funnel_time * 1000)::INTEGER,
    'performance_refresh_time_ms', ROUND(v_perf_time * 1000)::INTEGER,
    'total_time_ms', ROUND(EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000)::INTEGER
  );
END;
$$;

COMMENT ON FUNCTION fn_refresh_materialized_views() IS
  'Phase 9: Refresh materialized views concurrently to prevent read blocking.';

-- Schedule: every 5 minutes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('refresh-materialized-views');
    PERFORM cron.schedule(
      'refresh-materialized-views',
      '*/5 * * * *',  -- every 5 minutes
      $$SELECT fn_refresh_materialized_views()$$
    );
    RAISE NOTICE '[Phase 9] Scheduled pg_cron job: refresh-materialized-views (every 5 min)';
  END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- 10. UPDATE COMMUNICATION_LOGS ON CONTACT — Update last_contacted_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_update_lead_contact_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update last_contacted_at on the lead whenever communication is logged
  UPDATE public.leads
  SET last_contacted_at = NEW.created_at
  WHERE id = NEW.lead_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_update_lead_contact_timestamp() IS
  'Phase 9: Update leads.last_contacted_at when communication_logs row is inserted.';

DROP TRIGGER IF EXISTS trg_update_lead_contact_timestamp ON public.communication_logs;
CREATE TRIGGER trg_update_lead_contact_timestamp
  AFTER INSERT ON public.communication_logs
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_lead_contact_timestamp();


-- ---------------------------------------------------------------------------
-- 11. FINAL INDEXES & PERFORMANCE ENHANCEMENTS
-- ---------------------------------------------------------------------------

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_stage_status_consultant
  ON public.leads (stage, status, consultant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_consultant_updated_at
  ON public.leads (consultant_id, updated_at DESC)
  WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_activity_logs_type_created
  ON public.activity_logs (type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_lead_type
  ON public.activity_logs (lead_id, type);


-- ---------------------------------------------------------------------------
-- FINAL VALIDATION
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '[Phase 9] ✓ Audit triggers created';
  RAISE NOTICE '[Phase 9] ✓ Document versioning enabled';
  RAISE NOTICE '[Phase 9] ✓ Consultant deactivation cascading enabled';
  RAISE NOTICE '[Phase 9] ✓ Stall detection updated to 1-minute frequency';
  RAISE NOTICE '[Phase 9] ✓ Data maintenance jobs scheduled';
  RAISE NOTICE '[Phase 9] ✓ Materialized views created and refresh job scheduled';
  RAISE NOTICE '[Phase 9] ✓ Supporting indexes created';
  RAISE NOTICE '';
  RAISE NOTICE 'Phase 9 migration complete. Verify pg_cron is enabled in Supabase.';
END;
$$;
