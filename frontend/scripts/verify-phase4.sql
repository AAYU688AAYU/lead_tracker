-- =============================================================================
-- verify-phase4.sql
-- Run each block in Supabase Dashboard → SQL Editor
-- Copy the label above each block so you know what you're checking.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 1: Consultant profiles exist with correct roles
-- Expected: 2 rows, both role = 'consultant'
-- ─────────────────────────────────────────────────────────────────────────────
SELECT id, role, full_name, email
FROM profiles
WHERE email IN ('test.consultant@apex.test', 'consultant.beta@apex.test')
ORDER BY email;


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 2: Lead distribution — each consultant owns their leads only
-- Expected:
--   Consultant Alpha  → 4 leads (inquiry, consultation, documents, application)
--   Consultant Beta   → 2 leads (inquiry, decision)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  p.full_name       AS consultant,
  l.stage,
  l.status,
  ROUND(EXTRACT(EPOCH FROM (NOW() - l.stage_entered_at)) / 86400) AS days_in_stage,
  l.id              AS lead_id
FROM leads l
JOIN profiles p ON p.id = l.consultant_id
WHERE p.role = 'consultant'
ORDER BY p.full_name, l.stage;


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 3: Stalled lead exists for Alpha
-- Expected: 1 row — documents / stalled, ~10 days in stage
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  l.id,
  l.stage,
  l.status,
  l.stage_entered_at,
  ROUND(EXTRACT(EPOCH FROM (NOW() - l.stage_entered_at)) / 86400) AS days_in_stage
FROM leads l
JOIN profiles p ON p.id = l.consultant_id
WHERE p.email = 'test.consultant@apex.test'
  AND l.status = 'stalled';


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 4: Unread notification for Alpha
-- Expected: 1 row, is_read = false
-- ─────────────────────────────────────────────────────────────────────────────
SELECT n.id, n.type, n.content, n.is_read, n.created_at
FROM notifications n
JOIN profiles p ON p.id = n.user_id
WHERE p.email = 'test.consultant@apex.test';


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 5: After drag-forward test (run AFTER you drag a card in the UI)
-- Replace <LEAD_ID> with the ID of the lead you dragged.
-- Expected:
--   stage          = the new stage you dropped into
--   stage_entered_at = within the last few minutes (not the old date)
--   updated_at       = within the last few minutes
--   status           = 'active'
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  id,
  stage,
  status,
  stage_entered_at,
  updated_at,
  NOW() - stage_entered_at AS time_since_stage_change
FROM leads
WHERE id = '<LEAD_ID>';


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 6: Full lead audit — use after all testing
-- Shows every lead with student name, consultant name, stage, days in stage
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  p_c.full_name                                                   AS consultant,
  p_s.full_name                                                   AS student,
  l.stage,
  l.status,
  ROUND(EXTRACT(EPOCH FROM (NOW() - l.stage_entered_at)) / 86400) AS days_in_stage,
  l.stage_entered_at,
  l.updated_at,
  l.id
FROM leads l
JOIN profiles p_c ON p_c.id = l.consultant_id
JOIN profiles p_s ON p_s.id = l.student_id
ORDER BY p_c.full_name, l.updated_at DESC;
