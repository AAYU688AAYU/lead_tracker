# Phase 9: Automation & Background Jobs — Implementation Guide

**Date:** September 17, 2026  
**Status:** Implementation Complete  
**Effort:** ~9 hours of work condensed

---

## Executive Overview

Phase 9 implements the complete automation infrastructure for lead management:

- ✅ **Auto-Response Edge Function**: Webhook-triggered email + WhatsApp on lead creation
- ✅ **Audit Triggers**: Comprehensive change tracking with JSONB diffs
- ✅ **Data Maintenance**: Scheduled cleanup and soft-delete purging
- ✅ **Materialized Views**: Real-time funnel and performance analytics
- ✅ **Enhanced Stall Detection**: 1-minute frequency with metrics logging

---

## Components Implemented

### 1. Auto-Response Edge Function

**File:** `supabase/functions/auto-respond-lead/index.ts`

**Trigger:** Database Webhook on `leads` table INSERT

**Architecture:**
1. Verify webhook signature (HMAC-SHA256) — prevents spoofing
2. Fetch student profile (email, full_name, phone)
3. Fetch program details (for context in messages)
4. Parallel execution: 
   - Send HTML welcome email via Resend
   - Send WhatsApp via Twilio (using approved template)
5. Log both successes and failures to `communication_logs`

**Key Features:**
- Signature verification (security)
- Parallel external API calls (performance)
- Per-channel error handling (one failure doesn't block the other)
- Comprehensive logging for audit trail
- Retry-safe: logs include external_message_id for deduplication

**Deployment:**
```bash
supabase functions deploy auto-respond-lead
```

**Environment Variables Required:**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
RESEND_API_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_NUMBER
TWILIO_WHATSAPP_TEMPLATE_SID
```

---

### 2. Audit Triggers

**Database Functions:**

#### a. `fn_audit_lead_changes()`
- Fires: AFTER UPDATE on leads
- Captures: old/new values in JSONB format
- Logs: stage changes, status transitions, consultant changes
- Benefit: Full audit trail for compliance/debugging

#### b. `fn_supersede_prior_document()`
- Fires: AFTER INSERT on documents
- Marks: previous versions of document as 'superseded'
- Preserves: version history chain
- Benefit: Document versioning for re-uploads

#### c. `fn_consultant_deactivation()`
- Fires: AFTER UPDATE of `is_active` on profiles
- Action: Flags all consultant's leads for reassignment
- Notifies: All admins via notifications table
- Logs: Event in activity_logs
- Benefit: Prevents orphaned leads when consultant leaves

---

### 3. Schema Enhancements

**Leads Table:**
- Added: `deleted_at TIMESTAMPTZ` — soft-delete support
- Added: `last_contacted_at TIMESTAMPTZ` — tracks contact recency for stall detection

**Documents Table:**
- Added: `is_current BOOLEAN` — version tracking
- Added: `version_number INTEGER` — semantic versioning
- Updated: `document_status` enum to include 'superseded'

**Profiles Table:**
- Added: `is_active BOOLEAN` — deactivation support

**Communication Logs Table:**
- Added: `external_message_id TEXT` — tracking for email/WhatsApp IDs
- Added: `status TEXT` — 'sent', 'failed', 'bounced'

---

### 4. Enhanced Stall Detection

**Changes from Phase 7:**
- Frequency: 15 minutes → **1 minute** (more responsive)
- Metrics: Now logs aggregate statistics to `activity_logs`
- Query: Excludes soft-deleted leads (`deleted_at IS NULL`)
- Timestamps: Uses `last_contacted_at` from communication_logs

**Function:** `fn_mark_stalled_leads()`
- Returns JSONB: `{processed, stalled, failed, timestamp}`
- Exception handling: Per-lead error blocks don't abort batch
- Notifications: Enhanced with reference_code for lead identification

**pg_cron Schedule:**
```sql
SELECT cron.schedule(
  'mark-stalled-leads',
  '* * * * *',  -- Every 1 minute
  'SELECT fn_mark_stalled_leads()'
);
```

---

### 5. Data Maintenance Jobs

#### a. `fn_cleanup_expired_drafts()`
- **Schedule:** Daily at 3:00 AM UTC
- **Logic:** DELETE leads in 'inquiry' stage older than 7 days with no communication
- **Benefit:** Removes stale draft applications
- **Safety:** Only deletes if no consultant activity

#### b. `fn_purge_deleted_records()`
- **Schedule:** Daily at 2:00 AM UTC (before draft cleanup)
- **Logic:** Hard-delete soft-deleted records (documents, leads) older than 90 days
- **Safety:** Preserves profiles for FK integrity in activity_logs
- **Compliance:** Respects 90-day retention policy

---

### 6. Materialized Views

#### a. `mv_funnel_snapshot`
**Purpose:** Real-time stage distribution by consultant

**Columns:**
- stage (inquiry, consultation, documents, application, decision, enrolled)
- consultant_id, consultant_name
- total_leads, active_leads, stalled_leads, completed_leads, dropped_leads
- refreshed_at

**Use Case:** Dashboard showing pipeline by stage and owner

**Query Example:**
```sql
SELECT * FROM mv_funnel_snapshot WHERE stage = 'documents' ORDER BY active_leads DESC;
```

#### b. `mv_counselor_performance`
**Purpose:** Consultant KPIs and efficiency metrics

**Columns:**
- consultant_id, full_name
- total_leads_managed, leads_completed, completion_rate_percent
- active_leads, stalled_leads
- avg_lead_age_days, last_activity
- refreshed_at

**Use Case:** Admin analytics dashboard, performance rankings

**Query Example:**
```sql
SELECT * FROM mv_counselor_performance ORDER BY completion_rate_percent DESC LIMIT 10;
```

#### Refresh Job: `fn_refresh_materialized_views()`
- **Schedule:** Every 5 minutes
- **Method:** CONCURRENT REFRESH (prevents read blocking)
- **Logging:** Refresh time logged to activity_logs
- **Performance:** Typically completes in <1 second

---

## Database Migration

**File:** `supabase/migrations/20260917000010_phase9_automation_maintenance.sql`

**Applies:**
1. ✅ Audit trigger functions (3)
2. ✅ Schema enhancements (4 tables)
3. ✅ Stall detection improvement
4. ✅ Data maintenance jobs (2)
5. ✅ Materialized views (2)
6. ✅ Supporting indexes (8+)
7. ✅ pg_cron job scheduling

**Pre-requisites:**
- pg_cron extension enabled in Supabase
- CONCURRENTLY refresh must have unique indexes (already created)

**Deployment:**
```bash
# Via Supabase CLI
supabase migration up

# Or manual SQL in Supabase console
# Run the full migration file
```

---

## External Services Configuration

### Resend (Email)

1. Create account: https://resend.com
2. Verify sender domain (e.g., admissions@apexcrm.com)
3. Get API key from Settings → API Keys
4. Add to environment: `RESEND_API_KEY`

**Email Template:** HTML-styled welcome dossier with:
- Greeting with student name
- Application reference code
- Portal link
- Next steps
- Professional footer

### Twilio WhatsApp

1. Create account: https://www.twilio.com
2. Enable WhatsApp: Phone Numbers → Manage → WhatsApp
3. Register template with Meta:
   - Template name: e.g., "admission_welcome"
   - Message: 
     ```
     Hello {{1}}, your admission inquiry for {{2}} has been received (Ref: #{{3}}).
     Your Educational Advisor will contact you within 24 hours.
     Track your application: {{4}}
     ```
   - Variables: name, country, ref_code, portal_url
4. Once approved by Meta, get ContentSid from Twilio
5. Add to environment:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_NUMBER`
   - `TWILIO_WHATSAPP_TEMPLATE_SID`

**Important:** WhatsApp template approval by Meta can take 24-48 hours. Start this process early.

---

## Monitoring & Observability

### Activity Logs Queries

**Stall detection metrics:**
```sql
SELECT 
  content,
  created_at,
  (content::jsonb->>'processed')::int as processed,
  (content::jsonb->>'stalled')::int as stalled,
  (content::jsonb->>'failed')::int as failed
FROM activity_logs
WHERE type = 'STALL_DETECTION_METRICS'
ORDER BY created_at DESC
LIMIT 20;
```

**Audit trail for a lead:**
```sql
SELECT 
  created_at,
  type,
  content,
  actor_id
FROM activity_logs
WHERE lead_id = 'xxxxx'
ORDER BY created_at DESC;
```

**Auto-response delivery status:**
```sql
SELECT 
  lead_id,
  channel,
  status,
  external_message_id,
  created_at
FROM communication_logs
WHERE type = 'auto_respond'
ORDER BY created_at DESC;
```

### Alerting

**Monitor for:**
1. Stall detection failures (v_failed > 0)
2. Failed email/WhatsApp sends (status = 'FAILED')
3. Slow materialized view refreshes (>5 seconds)
4. Maintenance job errors in activity_logs

---

## Testing & Validation

### 1. Auto-Response Edge Function

**Test:** Create a test lead via API
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "test-uuid",
    "consultant_id": null,
    "program_id": "test-program-uuid",
    "stage": "inquiry"
  }'
```

**Verify:**
1. Email received at test student email (check spam folder)
2. WhatsApp message received
3. communication_logs shows two entries (email + whatsapp)
4. Both entries have external_message_ids

### 2. Audit Triggers

**Test:** Update a lead
```sql
UPDATE leads SET stage = 'consultation' WHERE id = 'test-lead-id';
```

**Verify:**
```sql
SELECT * FROM activity_logs 
WHERE lead_id = 'test-lead-id' 
  AND type IN ('STAGE_CHANGED', 'stage_change')
ORDER BY created_at DESC;
```

**Check:** JSONB contains old_values, new_values, changed_fields

### 3. Document Versioning

**Test:** Upload same document type twice
```sql
INSERT INTO documents (lead_id, uploaded_by, file_url, file_name, status)
VALUES ('test-lead-id', 'user-uuid', 'https://...', 'transcript.pdf', 'pending');

INSERT INTO documents (lead_id, uploaded_by, file_url, file_name, status)
VALUES ('test-lead-id', 'user-uuid', 'https://...', 'transcript_v2.pdf', 'pending');
```

**Verify:**
```sql
SELECT id, file_name, status, is_current FROM documents
WHERE lead_id = 'test-lead-id'
ORDER BY created_at;
```

**Check:** First document should have status='superseded', is_current=FALSE

### 4. Stall Detection

**Test:** Create lead and wait (or manually set stage_entered_at in past)
```sql
UPDATE leads SET stage_entered_at = NOW() - INTERVAL '72 hours'
WHERE id = 'test-lead-id' AND stage = 'consultation';
```

**Wait:** 1-2 minutes for cron job to run

**Verify:**
```sql
SELECT status FROM leads WHERE id = 'test-lead-id';
-- Should show 'stalled'

SELECT * FROM notifications 
WHERE user_id = 'consultant-uuid' 
  AND type = 'lead_stalled'
ORDER BY created_at DESC LIMIT 1;
```

### 5. Materialized Views

**Test:** Query the views
```sql
SELECT * FROM mv_funnel_snapshot;
SELECT * FROM mv_counselor_performance;
```

**Verify:** Data is present and refreshed_at is recent

### 6. Maintenance Jobs

**Manual trigger for testing:**
```sql
SELECT fn_cleanup_expired_drafts();
SELECT fn_purge_deleted_records();
```

**Verify:** activity_logs contains MAINTENANCE_* entries with deleted counts

---

## Deployment Checklist

- [ ] pg_cron extension enabled in Supabase (Database → Extensions)
- [ ] Migration applied: `20260917000010_phase9_automation_maintenance.sql`
- [ ] Edge function code deployed: `supabase functions deploy auto-respond-lead`
- [ ] Environment variables set in Supabase Functions:
  - [ ] RESEND_API_KEY
  - [ ] TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER
  - [ ] TWILIO_WHATSAPP_TEMPLATE_SID
  - [ ] SUPABASE_WEBHOOK_SECRET
  - [ ] NEXT_PUBLIC_APP_URL
- [ ] Database webhook created for leads.INSERT → Edge Function URL
- [ ] Test email/WhatsApp sent successfully
- [ ] Audit trail visible in activity_logs
- [ ] Stall detection running (check every minute)
- [ ] Materialized views refreshing (check every 5 minutes)
- [ ] Maintenance jobs scheduled (check pg_cron.job table)

---

## Troubleshooting

### Edge Function Not Firing

**Check:**
1. Webhook configured in Supabase: Database → Webhooks
2. Webhook URL points to deployed Edge Function
3. HTTP method set to POST
4. Events: INSERT on leads table

**Test webhook:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/auto-respond-lead \
  -H "Content-Type: application/json" \
  -d '{"type":"INSERT","record":{"id":"test"}}'
```

### Email/WhatsApp Not Sending

**Check:**
1. RESEND_API_KEY is valid (test at https://resend.com)
2. Twilio credentials are correct (test at https://console.twilio.com)
3. Student email/phone is valid
4. Look for errors in Supabase Function logs

**Query logs:**
```sql
SELECT * FROM activity_logs WHERE type LIKE 'COMMUNICATION%' ORDER BY created_at DESC;
SELECT * FROM communication_logs ORDER BY created_at DESC;
```

### Stall Detection Not Running

**Check:**
1. pg_cron enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
2. Job scheduled: `SELECT * FROM cron.job WHERE jobname = 'mark-stalled-leads';`
3. Check job status: `SELECT * FROM cron.job_run_details LIMIT 10;`

**Manually trigger:**
```sql
SELECT fn_mark_stalled_leads();
```

### Materialized Views Not Refreshing

**Check:**
1. Job scheduled: `SELECT * FROM cron.job WHERE jobname = 'refresh-materialized-views';`
2. Manually refresh:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_funnel_snapshot;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_counselor_performance;
```

---

## Performance Considerations

| Operation | Frequency | Est. Duration | Impact |
|-----------|-----------|---------------|--------|
| Stall detection | Every 1 min | <1 second | Low (indexed queries) |
| MV refresh | Every 5 min | <1 second | Low (CONCURRENT) |
| Draft cleanup | Daily @ 3am | <1 second | Low (scheduled off-peak) |
| Purge deleted | Daily @ 2am | <5 seconds | Low (scheduled off-peak) |
| Auto-response | Per lead INSERT | <2 seconds | External API latency |

---

## Future Enhancements

1. **Email retry logic** — Re-attempt failed sends after 1 hour
2. **WhatsApp template variants** — Different messages by program/country
3. **Communication analytics** — Delivery rate tracking over time
4. **Advanced stall rules** — Stage-specific thresholds, consultant availability
5. **Audit archive** — Archive old activity_logs to cold storage after 1 year
6. **Performance view caching** — Cache materialized views in Redis for faster dashboard loads

---

## References

- Supabase Webhooks: https://supabase.com/docs/guides/database/webhooks
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- pg_cron: https://github.com/citusdata/pg_cron
- Resend API: https://resend.com/docs
- Twilio WhatsApp: https://www.twilio.com/en-us/messaging/channels/whatsapp
- JSONB in PostgreSQL: https://www.postgresql.org/docs/current/datatype-json.html

---

**Phase 9 Implementation Complete** ✅
