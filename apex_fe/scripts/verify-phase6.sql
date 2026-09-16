-- =============================================================================
-- verify-phase6.sql
-- Phase 6 — Admin Console: Definition-of-Done verification
-- Run each numbered block in Supabase Dashboard → SQL Editor
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP: Quick orientation — list consultants and their open lead counts
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  p.id,
  p.full_name,
  p.email,
  p.is_accepting_leads,
  p.max_lead_capacity,
  COUNT(l.id) FILTER (WHERE l.status = 'active')  AS active_leads,
  COUNT(l.id) FILTER (WHERE l.status = 'stalled') AS stalled_leads,
  COUNT(l.id) FILTER (WHERE l.status = 'completed') AS completed_leads
FROM profiles p
LEFT JOIN leads l ON l.consultant_id = p.id AND l.status != 'dropped'
WHERE p.role = 'consultant'
GROUP BY p.id
ORDER BY p.full_name;


-- =============================================================================
-- TEAM SCREEN
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 1: is_accepting_leads toggle — after flipping via UI
-- Replace <CONSULTANT_ID> with the consultant you toggled.
-- Expected: is_accepting_leads = true (or false depending on direction)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT id, full_name, is_accepting_leads
FROM profiles
WHERE id = '<CONSULTANT_ID>';


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 2: Offboard — after clicking Confirm offboard
-- Replace <FROM_ID> and <TO_ID> with the offboarded and replacement IDs.
--
-- 2a) All previously-active/stalled leads from the offboarded consultant
--     should now belong to the replacement.
-- Expected: 0 rows
-- ─────────────────────────────────────────────────────────────────────────────
SELECT id, reference_code, stage, status
FROM leads
WHERE consultant_id = '<FROM_ID>'
  AND status IN ('active', 'stalled');


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 2b: activity_logs — one 'reassignment' entry per moved lead
-- Replace <FROM_ID> with the offboarded consultant's ID.
-- Expected: N rows where N = number of moved leads, type = 'reassignment'
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  al.id,
  al.lead_id,
  al.type,
  al.content,
  al.created_at
FROM activity_logs al
JOIN leads l ON l.id = al.lead_id
WHERE al.type = 'reassignment'
ORDER BY al.created_at DESC
LIMIT 20;


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 2c: notifications — one row to the replacement consultant
-- Replace <TO_ID> with the replacement consultant's ID.
-- Expected: 1 unread notification of type 'reassignment'
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  id,
  user_id,
  type,
  content,
  is_read,
  created_at
FROM notifications
WHERE user_id = '<TO_ID>'
  AND type    = 'reassignment'
ORDER BY created_at DESC
LIMIT 5;


-- =============================================================================
-- PIPELINE SETTINGS SCREEN
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 3: Current pipeline_stage_labels — confirm labels and thresholds
-- Expected: 6 rows ordered by sort_order
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  sort_order,
  stage,
  label,
  stall_threshold_hours
FROM pipeline_stage_labels
ORDER BY sort_order;


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 4: After editing a label in the UI — confirm write landed
-- Replace <STAGE_KEY> with the stage you edited, e.g. 'inquiry'.
-- Expected: label = the new text you typed
-- ─────────────────────────────────────────────────────────────────────────────
SELECT stage, label, stall_threshold_hours
FROM pipeline_stage_labels
WHERE stage = '<STAGE_KEY>';


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 5: After editing stall_threshold_hours
-- Replace <STAGE_KEY> and <NEW_HOURS> with what you entered in the UI.
-- Expected: stall_threshold_hours = <NEW_HOURS>
-- ─────────────────────────────────────────────────────────────────────────────
SELECT stage, stall_threshold_hours
FROM pipeline_stage_labels
WHERE stage = '<STAGE_KEY>';


-- =============================================================================
-- ANALYTICS SCREEN
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 6: Live stage snapshot — active+stalled counts per stage
-- This should match the bar chart values on the Analytics screen
-- (no date filter, no consultant filter — all active+stalled leads)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  psl.sort_order,
  psl.label,
  psl.stage,
  COUNT(l.id) AS live_count
FROM pipeline_stage_labels psl
LEFT JOIN leads l
  ON l.stage  = psl.stage
  AND l.status IN ('active', 'stalled')
GROUP BY psl.sort_order, psl.label, psl.stage
ORDER BY psl.sort_order;


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 7: Conversion rate — enrolled ÷ total created (current calendar year)
-- Adjust the date range to match what you have set in the UI filter.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  COUNT(*)                                         AS total_created,
  COUNT(*) FILTER (WHERE stage = 'enrolled')       AS enrolled_count,
  ROUND(
    COUNT(*) FILTER (WHERE stage = 'enrolled')::numeric
    / NULLIF(COUNT(*), 0) * 100,
    1
  )                                                AS conversion_pct
FROM leads
WHERE created_at >= date_trunc('year', now())
  AND created_at <= now();


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 8: Per-consultant conversion — useful for validating the consultant
-- filter on the Analytics screen
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  p.full_name                                       AS consultant,
  COUNT(l.id)                                       AS total_leads,
  COUNT(l.id) FILTER (WHERE l.stage = 'enrolled')  AS enrolled,
  ROUND(
    COUNT(l.id) FILTER (WHERE l.stage = 'enrolled')::numeric
    / NULLIF(COUNT(l.id), 0) * 100,
    1
  )                                                 AS conversion_pct
FROM profiles p
LEFT JOIN leads l ON l.consultant_id = p.id
WHERE p.role = 'consultant'
GROUP BY p.id, p.full_name
ORDER BY conversion_pct DESC NULLS LAST;
