-- Phase 10: Add Missing Database Indexes for Common Queries
-- This migration adds indexes for frequently-accessed queries identified in code analysis

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Missing: email lookup (case-insensitive via ILIKE in status lookup)
-- Used in: app/status/actions.ts (lookupApplication), auth flows
-- Query pattern: WHERE email ILIKE ?

CREATE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON profiles(LOWER(email))
  WHERE email IS NOT NULL;

-- Missing: actor_id lookup in activity_logs (foreign key query)
-- Used in: audit logging, querying actions by user
-- Also add to communication_logs for consistency

CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id
  ON activity_logs(actor_id)
  WHERE actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_communication_logs_actor_id
  ON communication_logs(actor_id)
  WHERE actor_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- LEADS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Missing: reference_code lookup (exact match)
-- Used in: app/status/actions.ts (lookupApplication)
-- Query pattern: WHERE reference_code = ?

CREATE INDEX IF NOT EXISTS idx_leads_reference_code
  ON leads(reference_code);

-- Missing: lead lookups by consultant + created date
-- Used in: consultant dashboard, analytics
-- Query pattern: WHERE consultant_id = ? ORDER BY created_at DESC

CREATE INDEX IF NOT EXISTS idx_leads_consultant_created_at
  ON leads(consultant_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Missing: stage + created_at lookups
-- Used in: funnel analysis, stage-based filtering
-- Query pattern: WHERE stage = ? ORDER BY created_at DESC

CREATE INDEX IF NOT EXISTS idx_leads_stage_created_at
  ON leads(stage, created_at DESC)
  WHERE deleted_at IS NULL;

-- Missing: status + updated_at
-- Used in: active lead filtering, recent activity
-- Query pattern: WHERE status = 'active' ORDER BY updated_at DESC

CREATE INDEX IF NOT EXISTS idx_leads_status_updated_at
  ON leads(status, updated_at DESC)
  WHERE deleted_at IS NULL AND status = 'active';

-- ─────────────────────────────────────────────────────────────────────────────
-- DOCUMENTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Missing: lead_id + created_at (for document list in lead drawer)
-- Used in: lead-drawer-actions.ts (getLeadDetail)
-- Query pattern: WHERE lead_id = ? ORDER BY created_at DESC

CREATE INDEX IF NOT EXISTS idx_documents_lead_created_at
  ON documents(lead_id, created_at DESC);

-- Missing: lead_id + status (for filtering documents by approval status)
-- Used in: document review workflows
-- Query pattern: WHERE lead_id = ? AND status = 'pending'

CREATE INDEX IF NOT EXISTS idx_documents_lead_status
  ON documents(lead_id, status)
  WHERE status IN ('pending', 'approved', 'rejected');

-- ─────────────────────────────────────────────────────────────────────────────
-- COMMUNICATION_LOGS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Missing: lead_id + created_at (for communication timeline)
-- Used in: lead-drawer-actions.ts (getLeadDetail), activity timeline
-- Query pattern: WHERE lead_id = ? ORDER BY created_at DESC

CREATE INDEX IF NOT EXISTS idx_communication_logs_lead_created_at
  ON communication_logs(lead_id, created_at DESC);

-- Missing: lead_id + channel (for filtering by communication type)
-- Used in: communication filtering, statistics
-- Query pattern: WHERE lead_id = ? AND channel = 'email'

CREATE INDEX IF NOT EXISTS idx_communication_logs_lead_channel
  ON communication_logs(lead_id, channel);

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Missing: user_id + id (for notification lookup)
-- Used in: app/api/notifications/[id]/route.ts (PATCH, mark as read)
-- Query pattern: WHERE user_id = ? AND id = ?

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created
  ON notifications(user_id, created_at DESC);

-- Missing: explicit id + user_id index for ownership verification
-- Used in: authorization checks before updates
-- Query pattern: WHERE id = ? AND user_id = ?

CREATE INDEX IF NOT EXISTS idx_notifications_id_user
  ON notifications(id, user_id)
  WHERE is_read = FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- PIPELINE_STAGE_LABELS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Missing: stage exact match (for label lookup)
-- Used in: lead drawer, status page (fetch label by stage)
-- Query pattern: WHERE stage = ? (no specific order needed, small table)

CREATE INDEX IF NOT EXISTS idx_pipeline_stage_labels_stage_unique
  ON pipeline_stage_labels(stage);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROGRAMS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Missing: university_id + created_at (for filtering programs by university)
-- Used in: program selection in forms
-- Query pattern: WHERE university_id = ? ORDER BY name

CREATE INDEX IF NOT EXISTS idx_programs_university_created
  ON programs(university_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- UNIVERSITIES TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Missing: country + created_at (for filtering universities by location)
-- Used in: location-based program search
-- Query pattern: WHERE country = ? ORDER BY name

CREATE INDEX IF NOT EXISTS idx_universities_country_created
  ON universities(country, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- PASSWORD_RESET_TOKENS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Missing: token exact match (for token validation)
-- Note: Already has idx_password_reset_tokens_token from phase 10 password reset
-- But adding expires_at + used_at for cleanup queries

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_used
  ON password_reset_tokens(expires_at, used_at)
  WHERE used_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- EMAIL_VERIFICATION_TOKENS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Missing: expires_at + verified_at for cleanup queries
-- Similar to password reset tokens

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_verified
  ON email_verification_tokens(expires_at, verified_at)
  WHERE verified_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ─────────────────────────────────────────────────────────────────────────────

-- For analytics queries: leads by stage and consultant
CREATE INDEX IF NOT EXISTS idx_leads_stage_consultant_status
  ON leads(stage, consultant_id, status)
  WHERE deleted_at IS NULL;

-- For consultant dashboard: leads by consultant, status, and stage
CREATE INDEX IF NOT EXISTS idx_leads_consultant_status_stage
  ON leads(consultant_id, status, stage)
  WHERE deleted_at IS NULL AND status IN ('active', 'stalled');

-- For activity timeline: lead + type + created_at
CREATE INDEX IF NOT EXISTS idx_activity_logs_lead_type_created
  ON activity_logs(lead_id, type, created_at DESC)
  WHERE type IN ('stage_advance', 'reassignment', 'status_change');

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTIAL INDEXES FOR SOFT-DELETE SUPPORT
-- ─────────────────────────────────────────────────────────────────────────────
-- These indexes only include non-deleted records, reducing index size

-- For querying active leads (soft-delete aware)
CREATE INDEX IF NOT EXISTS idx_leads_active_consultant_stage
  ON leads(consultant_id, stage)
  WHERE deleted_at IS NULL AND status = 'active';

-- For querying profiles that are active
CREATE INDEX IF NOT EXISTS idx_profiles_active_role
  ON profiles(role)
  WHERE is_active = TRUE;

-- For querying active documents
CREATE INDEX IF NOT EXISTS idx_documents_active_lead_status
  ON documents(lead_id, status)
  WHERE is_deleted = FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEX NAMING CONVENTION
-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes follow the pattern: idx_{table}_{columns}
-- - Single column: idx_{table}_{column}
-- - Multiple columns: idx_{table}_{col1}_{col2}
-- - Partial indexes: Add WHERE clause comment
-- - Reverse order: Use DESC in column definition
--
-- Examples:
--   idx_leads_reference_code              Single column exact match
--   idx_leads_consultant_created_at       Composite: range + sort
--   idx_activity_logs_lead_type_created   Complex: multiple columns + sort
--   idx_leads_active_consultant_stage     Partial index (active records only)

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES
-- ─────────────────────────────────────────────────────────────────────────────
-- After running this migration, verify indexes are created:
--
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND indexname LIKE 'idx_%'
-- ORDER BY indexname;
--
-- Check index sizes (to identify bloated indexes):
-- SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) as size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY pg_relation_size(indexrelid) DESC;
--
-- Check index usage (to identify unused indexes):
-- SELECT indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- AND idx_scan = 0
-- ORDER BY pg_relation_size(indexrelid) DESC;
