-- =============================================================================
-- Phase 7 — Realtime subscriptions & stall-detection job
-- =============================================================================
--
-- This migration does four things:
--
--   1. Enables Supabase Realtime on every table that the UI subscribes to.
--   2. Replaces fn_mark_stalled_leads() with a version that:
--        • processes each lead in its own exception-handled block
--        • inserts a notifications row for the consultant (or all admins if null)
--        • logs failures without aborting the batch
--   3. Schedules the updated function with pg_cron (every 15 minutes).
--   4. Adds fn_unstall_on_contact — a trigger that immediately flips
--        leads.status → 'active' the moment a communication_logs row
--        is inserted for a stalled lead (same-transaction, no cron lag).
--        This is the DB-level enforcement of what Phase 5 already does
--        optimistically in the application layer.
--
-- Safe to run multiple times — all objects use CREATE OR REPLACE / IF NOT EXISTS.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Enable Realtime publications
-- ---------------------------------------------------------------------------
-- Supabase uses the `supabase_realtime` publication.  Adding a table is
-- idempotent: Postgres ignores the statement when the table is already a
-- member of the publication.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  -- leads — needed by all four dashboard subscriptions
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename  = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;

  -- documents — consultant detail, admin detail, student status
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename  = 'documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
  END IF;

  -- activity_logs — lead-detail drawer (consultant + admin only)
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename  = 'activity_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
  END IF;

  -- communication_logs — lead-detail drawer (consultant + admin only)
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename  = 'communication_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_logs;
  END IF;

  -- notifications — bell badge on consultant dashboard
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename  = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. Replication identity for tables that lack a replica identity
-- ---------------------------------------------------------------------------
-- Supabase Realtime requires REPLICA IDENTITY FULL (or at minimum DEFAULT
-- which relies on a PK) to broadcast old + new row values on UPDATE/DELETE.
-- All tables here have UUID PKs so DEFAULT is fine.  We set FULL only on
-- activity_logs and communication_logs (append-only, never updated) so the
-- payload carries the full row on DELETE if ever needed.
-- ---------------------------------------------------------------------------

ALTER TABLE public.activity_logs      REPLICA IDENTITY FULL;
ALTER TABLE public.communication_logs REPLICA IDENTITY FULL;


-- ---------------------------------------------------------------------------
-- 3. Improved stall-detection function
-- ---------------------------------------------------------------------------
-- Replaces the Phase 1 stub.  Key changes:
--   • Per-lead EXCEPTION block so one bad row never aborts the whole batch.
--   • Inserts a notifications row for consultant (or ALL admins when null).
--   • Wraps every INSERT / UPDATE in the same subtransaction so failures
--     are isolated.
--   • Returns a JSONB summary: { processed, stalled, failed }.
-- ---------------------------------------------------------------------------

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
  -- Cache admin IDs once for the whole batch (admins get notified when
  -- consultant_id is NULL on a lead).
  SELECT ARRAY_AGG(id)
  INTO   v_admin_ids
  FROM   public.profiles
  WHERE  role = 'admin';

  -- Iterate every active lead whose stage timer has expired AND that has
  -- received no communication since entering the current stage.
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

      -- 3a. Flip the lead to stalled.
      UPDATE public.leads
      SET    status = 'stalled'
      WHERE  id     = rec.lead_id
        AND  status = 'active';   -- guard against race with the trigger

      -- 3b. Insert notification(s).
      IF rec.consultant_id IS NOT NULL THEN
        -- Notify the assigned consultant.
        INSERT INTO public.notifications (user_id, type, content)
        VALUES (
          rec.consultant_id,
          'lead_stalled',
          format(
            'Lead in "%s" stage has stalled — no contact since %s.',
            rec.stage,
            to_char(rec.stage_entered_at AT TIME ZONE 'UTC', 'DD Mon YYYY HH24:MI UTC')
          )
        );
      ELSE
        -- No consultant assigned — notify every admin.
        IF v_admin_ids IS NOT NULL THEN
          FOREACH v_notif_user_id IN ARRAY v_admin_ids LOOP
            INSERT INTO public.notifications (user_id, type, content)
            VALUES (
              v_notif_user_id,
              'lead_stalled',
              format(
                'Unassigned lead %s in "%s" stage has stalled.',
                rec.lead_id,
                rec.stage
              )
            );
          END LOOP;
        END IF;
      END IF;

      v_stalled := v_stalled + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Log but do not re-raise — other leads must keep processing.
      v_failed := v_failed + 1;
      RAISE WARNING
        '[fn_mark_stalled_leads] lead_id=% failed: % — %',
        rec.lead_id, SQLSTATE, SQLERRM;
    END;  -- ── end per-lead block ──────────────────────────────────────────

  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'stalled',   v_stalled,
    'failed',    v_failed
  );
END;
$$;

COMMENT ON FUNCTION fn_mark_stalled_leads() IS
  'Phase 7: scans active leads, marks overdue ones as stalled, inserts notifications. '
  'Each lead is wrapped in its own exception block. Returns { processed, stalled, failed }.';


-- ---------------------------------------------------------------------------
-- 4. Schedule fn_mark_stalled_leads via pg_cron (every 15 minutes)
-- ---------------------------------------------------------------------------
-- pg_cron must be enabled in the Supabase project (Database → Extensions).
-- The DO block checks for the extension first so the migration can still
-- run even if pg_cron is not enabled (the job simply won't be registered
-- and can be added manually later).
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_extension
    WHERE  extname = 'pg_cron'
  ) THEN
    -- Remove any existing schedule under this name before re-creating so
    -- the migration is idempotent.
    PERFORM cron.unschedule('mark-stalled-leads')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'mark-stalled-leads'
    );

    PERFORM cron.schedule(
      'mark-stalled-leads',    -- job name
      '*/15 * * * *',          -- every 15 minutes
      $$SELECT fn_mark_stalled_leads()$$
    );

    RAISE NOTICE 'pg_cron job "mark-stalled-leads" scheduled (every 15 min).';
  ELSE
    RAISE NOTICE
      'pg_cron extension not found. Enable it in Supabase → Database → Extensions, '
      'then run: SELECT cron.schedule(''mark-stalled-leads'', ''*/15 * * * *'', '
      '''SELECT fn_mark_stalled_leads()'');';
  END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- 5. Immediate un-stall trigger
-- ---------------------------------------------------------------------------
-- Phase 5 already does an optimistic status flip in the application layer
-- (logCommunicationFromDrawer).  This trigger is the DB-level guarantee:
-- the moment any communication_logs row is inserted for a lead whose status
-- is 'stalled', the lead's status is reset to 'active' inside the same
-- transaction — no cron lag, no race window.
--
-- The trigger fires AFTER INSERT so the communication row is committed
-- first, satisfying the "communication after stage_entered_at" check in
-- fn_mark_stalled_leads if the cron happens to run concurrently.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_unstall_on_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when the lead is currently stalled.  The UPDATE is a no-op
  -- for any other status, keeping the trigger cheap for the common case.
  UPDATE public.leads
  SET    status = 'active'
  WHERE  id     = NEW.lead_id
    AND  status = 'stalled';

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_unstall_on_contact() IS
  'Phase 7: immediately flips leads.status → active when a communication log '
  'is inserted for a stalled lead.  Same-transaction guarantee.';

-- Drop before re-creating so the migration is idempotent.
DROP TRIGGER IF EXISTS trg_unstall_on_contact ON public.communication_logs;

CREATE TRIGGER trg_unstall_on_contact
  AFTER INSERT ON public.communication_logs
  FOR EACH ROW
  EXECUTE FUNCTION fn_unstall_on_contact();


-- ---------------------------------------------------------------------------
-- 6. Indexes to support the stall-detection query efficiently
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_leads_status_stage_entered_at
  ON public.leads (status, stage_entered_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_comms_lead_created
  ON public.communication_logs (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE is_read = FALSE;
