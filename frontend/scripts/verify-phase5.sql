-- =============================================================================
-- verify-phase5.sql
-- Phase 5 — Lead Detail Drawer: Definition-of-Done verification
-- Run each numbered block in Supabase Dashboard → SQL Editor
-- Label is shown above each block so you know exactly what to expect.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP QUERY: Find your test lead IDs before running the checks below.
-- Run this first, note the lead IDs and reference codes for use below.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  l.id              AS lead_id,
  l.reference_code,
  l.stage,
  l.status,
  p_s.email         AS student_email,
  p_c.email         AS consultant_email
FROM leads l
JOIN profiles p_s ON p_s.id = l.student_id
LEFT JOIN profiles p_c ON p_c.id = l.consultant_id
ORDER BY l.updated_at DESC
LIMIT 20;


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 1  (DoD Item 1a): Document uploaded by student is present with status = 'pending'
-- Replace <LEAD_ID> with the lead you used to upload the test document.
-- Expected: 1+ rows, status = 'pending'
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  d.id,
  d.file_name,
  d.status,
  d.rejection_reason,
  d.created_at,
  p.email AS uploaded_by
FROM documents d
JOIN profiles p ON p.id = d.uploaded_by
WHERE d.lead_id = '<LEAD_ID>'
ORDER BY d.created_at DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 2  (DoD Item 1b): After approving via drawer — status flipped to 'approved'
-- Replace <DOC_ID> with the document you clicked Approve on.
-- Expected: status = 'approved', rejection_reason = NULL
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  id,
  file_name,
  status,
  rejection_reason
FROM documents
WHERE id = '<DOC_ID>';


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 3  (DoD Item 2): After rejecting second document with a reason
-- Replace <DOC_ID_2> with the second document's ID.
-- Expected: status = 'rejected', rejection_reason = the text you entered
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  id,
  file_name,
  status,
  rejection_reason
FROM documents
WHERE id = '<DOC_ID_2>';


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 4  (DoD Item 3a): Stalled lead — confirm status BEFORE logging contact
-- Replace <STALLED_LEAD_ID> with the stalled lead's ID.
-- Expected: status = 'stalled'
-- ─────────────────────────────────────────────────────────────────────────────
SELECT id, stage, status, updated_at
FROM leads
WHERE id = '<STALLED_LEAD_ID>';


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 5  (DoD Item 3b): After logging contact against the stalled lead
-- Run this immediately after clicking "Log contact" in the drawer.
-- Expected: status = 'active', communication_logs has 1 new row
-- ─────────────────────────────────────────────────────────────────────────────
SELECT id, stage, status, updated_at
FROM leads
WHERE id = '<STALLED_LEAD_ID>';

SELECT
  cl.id,
  cl.channel,
  cl.summary,
  cl.created_at,
  p.email AS logged_by
FROM communication_logs cl
JOIN profiles p ON p.id = cl.actor_id
WHERE cl.lead_id = '<STALLED_LEAD_ID>'
ORDER BY cl.created_at DESC
LIMIT 5;


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 6  (DoD Item 4): Reassign control — confirm consultant_id changed
-- Replace <LEAD_ID> and <NEW_CONSULTANT_ID> after using the drawer as admin.
-- Expected: consultant_id = <NEW_CONSULTANT_ID>
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  l.id,
  l.consultant_id,
  p.full_name AS assigned_consultant,
  p.email     AS consultant_email
FROM leads l
LEFT JOIN profiles p ON p.id = l.consultant_id
WHERE l.id = '<LEAD_ID>';


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 7  (Full audit): All documents for a lead — status + rejection reasons
-- Useful for confirming what the student sees on /status
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  d.id,
  d.file_name,
  d.status,
  d.rejection_reason,
  d.created_at,
  p.email AS uploaded_by
FROM documents d
JOIN profiles p ON p.id = d.uploaded_by
WHERE d.lead_id = '<LEAD_ID>'
ORDER BY d.created_at DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK 8  (Full audit): Activity timeline — merged logs for a lead
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 'activity'     AS kind, type, content, actor_id, created_at FROM activity_logs      WHERE lead_id = '<LEAD_ID>'
UNION ALL
SELECT 'communication' AS kind, channel, summary, actor_id, created_at FROM communication_logs WHERE lead_id = '<LEAD_ID>'
ORDER BY created_at DESC;
