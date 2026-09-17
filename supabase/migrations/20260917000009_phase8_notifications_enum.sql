-- Phase 8 — Notification types enum and schema enhancements
-- This migration creates notification_type enum, adds type column, indexes, RLS policies, and helper functions

-- Create notification_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'notification_type'
  ) THEN
    CREATE TYPE notification_type AS ENUM (
      'lead_assigned',        -- Consultant: new lead assigned to your portfolio
      'lead_stalled',         -- Consultant: lead inactive in current stage > threshold
      'stall_resolved',       -- Consultant: stalled lead moved to active/completed
      'lead_reassigned',      -- Consultant: lead reassigned away from you or to you
      'stage_advanced',       -- Consultant: lead advanced to next stage
      'document_reviewed',    -- Consultant/Student: document approved/rejected
      'admin_message',        -- Consultant/Student: message from admin
      'team_update'           -- Team: general team updates (Phase 9+)
    );
    RAISE NOTICE '[Phase 8] Created notification_type enum';
  END IF;
END;
$$;


-- Enhance notifications table with type column
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS type notification_type DEFAULT 'admin_message'::notification_type;

COMMENT ON COLUMN public.notifications.type IS
  'Notification category: lead_assigned, lead_stalled, stall_resolved, stage_advanced, etc.';


-- Add supporting indexes for performance
-- Notifications by user and type (for filtering in notification center)
CREATE INDEX IF NOT EXISTS idx_notifications_user_type
  ON public.notifications (user_id, type)
  WHERE is_read = FALSE;

-- Recent notifications (used for pagination)
CREATE INDEX IF NOT EXISTS idx_notifications_user_recent
  ON public.notifications (user_id, created_at DESC)
  WHERE is_read = FALSE;

-- Unread notifications by type (for badge/category counts)
CREATE INDEX IF NOT EXISTS idx_notifications_type_unread
  ON public.notifications (type, is_read)
  WHERE is_read = FALSE;


-- Update RLS policies
-- Notifications already have RLS from Phase 1-7
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users see only their own notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'users_see_own_notifications'
  ) THEN
    CREATE POLICY users_see_own_notifications
      ON public.notifications
      FOR SELECT
      USING (auth.uid() = user_id);
    RAISE NOTICE '[Phase 8] Created RLS policy: users_see_own_notifications';
  END IF;
END;
$$;

-- Policy: Users update only their own notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'users_update_own_notifications'
  ) THEN
    CREATE POLICY users_update_own_notifications
      ON public.notifications
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    RAISE NOTICE '[Phase 8] Created RLS policy: users_update_own_notifications';
  END IF;
END;
$$;

-- Policy: Users delete only their own notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'users_delete_own_notifications'
  ) THEN
    CREATE POLICY users_delete_own_notifications
      ON public.notifications
      FOR DELETE
      USING (auth.uid() = user_id);
    RAISE NOTICE '[Phase 8] Created RLS policy: users_delete_own_notifications';
  END IF;
END;
$$;


-- Create helper function for notifications
CREATE OR REPLACE FUNCTION fn_create_notification(
  p_user_id    UUID,
  p_type       notification_type,
  p_content    TEXT,
  p_lead_id    UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, content, is_read, created_at)
  VALUES (p_user_id, p_type, p_content, FALSE, NOW())
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;



COMMENT ON FUNCTION fn_create_notification IS
  'Phase 8: Create a notification with type validation. Returns notification ID.';
