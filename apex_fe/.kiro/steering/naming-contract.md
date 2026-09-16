# Naming Contract — authoritative. To change a name, edit this file first, in its own commit, before touching code.

## Roles
`user_role` enum: student, consultant, admin

## Tables (full column detail lives in the Phase 1 prompt — this is the name/role reference)
profiles, universities, programs, leads, pipeline_stage_labels, documents,
activity_logs, communication_logs, notifications, webhook_dedup

## Fixed rules
- Consultant ownership column is always `consultant_id`, never `assigned_consultant_id`.
- Stall is a value of `leads.status` ('stalled'), never a separate boolean column.
- `leads.stage` values are fixed identity keys: inquiry, consultation, documents, application, decision, enrolled.
  Never rename these. Display names live in `pipeline_stage_labels.label` and are admin-editable there — nowhere else.
- Timestamp of entering the current stage is tracked separately from `updated_at` in `leads.stage_entered_at`,
  because `updated_at` changes on unrelated edits and cannot be used to compute "days in stage."
