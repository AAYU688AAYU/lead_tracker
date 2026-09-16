-- =============================================================================
-- Phase 2 — Public intake form policies
-- Allows unauthenticated (anon) users to READ universities and programs
-- so the /apply form can populate its dropdown without a session.
-- Writes go through the service-role client in the server action.
-- =============================================================================

-- ── universities — anon read ──────────────────────────────────────────────
CREATE POLICY "universities: anon select"
  ON universities FOR SELECT
  USING (true);   -- all rows visible; no write access granted

-- ── programs — anon read ──────────────────────────────────────────────────
CREATE POLICY "programs: anon select"
  ON programs FOR SELECT
  USING (true);   -- all rows visible; no write access granted
