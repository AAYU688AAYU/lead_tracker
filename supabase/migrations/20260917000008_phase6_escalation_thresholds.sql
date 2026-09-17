-- =============================================================================
-- Migration: Phase 6 — Escalation Thresholds and Severity Levels
-- =============================================================================
-- Adds two-tier alert system to pipeline_stage_labels:
--   1. escalation_threshold_hours: how many hours after stall_threshold to escalate
--   2. severity_level: CRITICAL | HIGH | MEDIUM | NONE (for alert routing/prioritization)

-- Add columns to pipeline_stage_labels
ALTER TABLE pipeline_stage_labels
ADD COLUMN escalation_threshold_hours INTEGER NOT NULL DEFAULT 4,
ADD COLUMN severity_level TEXT NOT NULL DEFAULT 'MEDIUM';

-- Set appropriate severity levels per stage
UPDATE pipeline_stage_labels
SET severity_level = 'HIGH'
WHERE stage IN ('inquiry', 'application', 'consultation', 'documents');

UPDATE pipeline_stage_labels
SET severity_level = 'CRITICAL'
WHERE stage = 'decision';

UPDATE pipeline_stage_labels
SET severity_level = 'NONE'
WHERE stage = 'enrolled';

-- Add comment for future developers
COMMENT ON COLUMN pipeline_stage_labels.escalation_threshold_hours IS 
'Hours after stall_threshold to trigger escalation alert. E.g., if stall_threshold=24h and escalation_threshold=4h, escalation fires at 28h.';

COMMENT ON COLUMN pipeline_stage_labels.severity_level IS
'Stage criticality for alert routing: CRITICAL (immediate), HIGH (urgent), MEDIUM (standard), NONE (informational)';
