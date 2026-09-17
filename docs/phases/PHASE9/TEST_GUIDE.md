# Phase 9: Automation & Background Jobs — Testing Guide

**Objective:** Validate all automation components work end-to-end  
**Duration:** 2-3 hours for comprehensive testing  
**Prerequisites:** Local Supabase instance or staging environment with Phase 9 migration applied

---

## Pre-Test Setup

### 1. Environment Preparation

```bash
# Install dependencies
npm install

# Start local Supabase (if using local environment)
supabase start

# Deploy Edge Function
supabase functions deploy auto-respond-lead

# Verify migration applied
supabase migration list
```

### 2. Test Data Creation

```sql
-- Create test university
INSERT INTO universities (name, country) 
VALUES ('Test University', 'United States') 
RETURNING id AS university_id;

-- Create test program (substitute university_id from above)
INSERT INTO programs (university_id, name, degree_level)
VALUES ('$UNIVERSITY_ID', 'Computer Science', 'Bachelor')
RETURNING id AS program_id;

-- Create test profiles
INSERT INTO profiles (id, role, full_name, email, phone)
VALUES (
  gen_random_uuid(),
  'student',
  'Test Student',
  'test.student+phase9@example.com',
  '+1234567890'
) RETURNING id AS student_id;

INSERT INTO profiles (id, role, full_name, email, phone)
VALUES (
  gen_random_uuid(),
  'consultant',
  'Test Consultant',
  'test.consultant@example.com',
  '+1234567891'
) RETURNING id AS consultant_id;

INSERT INTO profiles (id, role, full_name, email, phone)
VALUES (
  gen_random_uuid(),
  'admin',
  'Test Admin',
  'test.admin@example.com',
  '+1234567892'
) RETURNING id AS admin_id;
```

### 3. Configuration

```bash
# Set environment variables in .env or Supabase project settings
export RESEND_API_KEY="re_test_key_here"
export TWILIO_ACCOUNT_SID="AC..."
export TWILIO_AUTH_TOKEN="your_token"
export TWILIO_WHATSAPP_NUMBER="+1234567890"
export TWILIO_WHATSAPP_TEMPLATE_SID="HX..."
export SUPABASE_WEBHOOK_SECRET="your_webhook_secret"
export NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Test Scenarios

### Test Suite 1: Auto-Response Edge Function

#### TC-01: Email and WhatsApp Sent on Lead Creation

**Objective:** Verify auto-response triggers on new lead INSERT

**Steps:**
1. Create a new lead via API:
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "student_id": "'$STUDENT_ID'",
    "program_id": "'$PROGRAM_ID'",
    "consultant_id": null,
    "stage": "inquiry"
  }'
```

2. Wait 3-5 seconds for Edge Function execution

3. Check email inbox (test.student+phase9@example.com):
   - Subject: "Application Dossier Received – Welcome, Test Student"
   - Contains reference code
   - Contains portal link
   - Contains program name and next steps

4. Check WhatsApp:
   - Message received at +1234567890
   - Contains student name, country, reference code (first 8 chars)
   - Contains portal link

**Expected Result:**
- ✅ Email received within 5 seconds
- ✅ WhatsApp received within 5 seconds
- ✅ Both contain reference code
- ✅ Portal link is clickable

**Verification Query:**
```sql
SELECT 
  channel, status, external_message_id, created_at
FROM communication_logs
WHERE lead_id = '$LEAD_ID'
ORDER BY created_at;
-- Should show: email (sent/failed), whatsapp (sent/failed)
```

---

#### TC-02: Webhook Signature Verification

**Objective:** Verify signature validation prevents spoofing

**Steps:**
1. Call Edge Function with invalid signature:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/auto-respond-lead \
  -H "Content-Type: application/json" \
  -H "x-supabase-signature: invalid_signature" \
  -d '{"type":"INSERT","record":{"id":"test"}}'
```

**Expected Result:**
- ✅ Returns 401 Unauthorized
- ✅ No email/WhatsApp sent
- ✅ No communication_logs entry created

---

#### TC-03: Error Handling — One Channel Failure

**Objective:** Verify partial success (one channel fails, other succeeds)

**Steps:**
1. Temporarily disable Twilio credentials (set TWILIO_ACCOUNT_SID to invalid value)
2. Create new lead
3. Wait for execution
4. Check results

**Expected Result:**
- ✅ Email sent successfully (status = DELIVERED)
- ✅ WhatsApp failed (status = FAILED, error message logged)
- ✅ Edge Function returns 200 OK with partial success
- ✅ Both communication_logs entries created

**Verification Query:**
```sql
SELECT 
  lead_id, channel, status, external_message_id
FROM communication_logs
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
```

---

### Test Suite 2: Audit Triggers

#### TC-04: Lead Stage Change Audit

**Objective:** Verify stage changes are logged with old/new values

**Steps:**
1. Get a lead ID from previous tests
2. Update lead stage:
```sql
UPDATE leads SET stage = 'consultation' WHERE id = '$LEAD_ID';
```

3. Query audit log:
```sql
SELECT content FROM activity_logs
WHERE lead_id = '$LEAD_ID' AND type = 'STAGE_CHANGED'
ORDER BY created_at DESC LIMIT 1;
```

**Expected Result:**
- ✅ activity_logs entry created with type = 'STAGE_CHANGED'
- ✅ content contains JSONB with old_values, new_values
- ✅ old_values shows stage: 'inquiry'
- ✅ new_values shows stage: 'consultation'
- ✅ changed_fields array shows "stage: inquiry → consultation"

**Sample Content:**
```json
{
  "old_values": {
    "stage": "inquiry",
    "status": "active",
    "consultant_id": null,
    "stage_entered_at": "2026-09-17T10:00:00+00:00",
    "updated_at": "2026-09-17T10:00:00+00:00"
  },
  "new_values": {
    "stage": "consultation",
    "status": "active",
    "consultant_id": "$CONSULTANT_ID",
    "stage_entered_at": "2026-09-17T10:05:00+00:00",
    "updated_at": "2026-09-17T10:05:00+00:00"
  },
  "changed_fields": [
    "stage: inquiry → consultation",
    "consultant_id: null → $CONSULTANT_ID",
    "stage_entered_at: updated"
  ]
}
```

---

#### TC-05: Consultant Assignment Audit

**Objective:** Verify consultant changes are tracked

**Steps:**
1. Update lead's consultant:
```sql
UPDATE leads 
SET consultant_id = '$NEW_CONSULTANT_ID' 
WHERE id = '$LEAD_ID';
```

2. Check audit trail:
```sql
SELECT * FROM activity_logs
WHERE lead_id = '$LEAD_ID' AND type = 'CONSULTANT_CHANGED'
ORDER BY created_at DESC LIMIT 1;
```

**Expected Result:**
- ✅ activity_logs entry with type = 'CONSULTANT_CHANGED'
- ✅ JSONB shows old consultant_id (null or prev ID) → new consultant_id

---

#### TC-06: Document Versioning

**Objective:** Verify prior document versions are marked superseded

**Steps:**
1. Upload first document:
```sql
INSERT INTO documents (lead_id, uploaded_by, file_url, file_name, status)
VALUES (
  '$LEAD_ID',
  '$STUDENT_ID',
  'https://example.com/transcript_v1.pdf',
  'transcript.pdf',
  'pending'
) RETURNING id AS doc1_id;
```

2. Upload "updated" version (same file name):
```sql
INSERT INTO documents (lead_id, uploaded_by, file_url, file_name, status)
VALUES (
  '$LEAD_ID',
  '$STUDENT_ID',
  'https://example.com/transcript_v2.pdf',
  'transcript_v2.pdf',
  'pending'
) RETURNING id AS doc2_id;
```

3. Check document statuses:
```sql
SELECT id, file_name, status, is_current, version_number
FROM documents
WHERE lead_id = '$LEAD_ID'
ORDER BY created_at;
```

**Expected Result:**
- ✅ First document: status = 'superseded', is_current = FALSE
- ✅ Second document: status = 'pending', is_current = TRUE
- ✅ activity_logs shows DOCUMENT_UPLOADED event with supersession note

---

#### TC-07: Consultant Deactivation Cascading

**Objective:** Verify leads flagged when consultant deactivated

**Steps:**
1. Get a consultant with active leads:
```sql
SELECT id, full_name FROM profiles
WHERE role = 'consultant' AND id IN (
  SELECT DISTINCT consultant_id FROM leads WHERE status = 'active' LIMIT 1
);
```

2. Deactivate consultant:
```sql
UPDATE profiles SET is_active = FALSE WHERE id = '$CONSULTANT_ID';
```

3. Check notifications to admins:
```sql
SELECT * FROM notifications
WHERE type = 'admin_message'
AND content LIKE '%deactivated%'
ORDER BY created_at DESC LIMIT 1;
```

4. Check lead notes:
```sql
SELECT notes FROM leads
WHERE consultant_id = '$CONSULTANT_ID' AND status = 'active'
LIMIT 1;
```

**Expected Result:**
- ✅ All admins receive notification about deactivation
- ✅ Notification shows number of leads requiring reassignment
- ✅ Lead notes updated with REASSIGNMENT_REQUIRED flag
- ✅ activity_logs entries created for each affected lead

---

### Test Suite 3: Stall Detection

#### TC-08: Lead Marked Stalled After Threshold

**Objective:** Verify lead marked stalled when inactivity exceeds threshold

**Steps:**
1. Create a lead in 'consultation' stage with old stage_entered_at:
```sql
INSERT INTO leads (student_id, program_id, stage, stage_entered_at, status)
VALUES (
  '$STUDENT_ID',
  '$PROGRAM_ID',
  'consultation',
  NOW() - INTERVAL '73 hours',  -- consultation threshold is 72 hours
  'active'
) RETURNING id AS stalled_lead_id;
```

2. Wait for pg_cron to run (every 1 minute):
   - Monitor: SELECT COUNT(*) FROM leads WHERE status = 'stalled';

3. After ~1 minute, check:
```sql
SELECT status, updated_at FROM leads WHERE id = '$STALLED_LEAD_ID';
```

4. Check notification sent to consultant:
```sql
SELECT * FROM notifications
WHERE type = 'lead_stalled'
ORDER BY created_at DESC LIMIT 1;
```

5. Check stall event logged:
```sql
SELECT * FROM activity_logs
WHERE lead_id = '$STALLED_LEAD_ID' AND type = 'STALL_TRIGGERED'
ORDER BY created_at DESC LIMIT 1;
```

**Expected Result:**
- ✅ Lead status changed to 'stalled'
- ✅ Notification sent to assigned consultant (or admins if unassigned)
- ✅ activity_logs contains STALL_TRIGGERED with inactivity hours
- ✅ Stall metrics logged to activity_logs (STALL_DETECTION_METRICS)

---

#### TC-09: Contact Clears Stall Status

**Objective:** Verify immediate unstall when communication logged

**Steps:**
1. Log communication for stalled lead:
```sql
INSERT INTO communication_logs (lead_id, actor_id, channel, summary)
VALUES ('$STALLED_LEAD_ID', '$CONSULTANT_ID', 'call', 'Consultation call held');
```

2. Immediately check lead status (same transaction):
```sql
SELECT status FROM leads WHERE id = '$STALLED_LEAD_ID';
```

**Expected Result:**
- ✅ Lead status immediately changed to 'active' (no cron lag)
- ✅ lead.last_contacted_at updated to communication timestamp
- ✅ No "unstall" notification sent (only stall notifications sent)

**Verification:**
```sql
SELECT type, content FROM activity_logs
WHERE lead_id = '$STALLED_LEAD_ID'
ORDER BY created_at DESC LIMIT 5;
-- Should show: STALL_TRIGGERED, then later activity
```

---

### Test Suite 4: Data Maintenance Jobs

#### TC-10: Draft Lead Cleanup

**Objective:** Verify expired drafts are deleted

**Steps:**
1. Create old draft leads (inquiry stage, older than 7 days):
```sql
INSERT INTO leads (student_id, program_id, stage, status, created_at)
SELECT
  p.id,
  '$PROGRAM_ID',
  'inquiry',
  'active',
  NOW() - INTERVAL '8 days'
FROM profiles p
WHERE p.role = 'student' LIMIT 3;
```

2. Manually trigger cleanup function:
```sql
SELECT fn_cleanup_expired_drafts();
```

3. Verify drafts deleted:
```sql
SELECT COUNT(*) FROM leads
WHERE stage = 'inquiry' AND created_at < NOW() - INTERVAL '7 days';
```

4. Check cleanup logged:
```sql
SELECT content FROM activity_logs
WHERE type = 'MAINTENANCE_CLEANUP_DRAFTS'
ORDER BY created_at DESC LIMIT 1;
```

**Expected Result:**
- ✅ Old draft leads deleted
- ✅ Cleanup logged with count
- ✅ activity_logs shows deletion count

---

#### TC-11: Soft-Deleted Record Purging

**Objective:** Verify old soft-deleted records hard-deleted

**Steps:**
1. Soft-delete a document (future: admin will mark deleted_at):
```sql
UPDATE documents
SET deleted_at = NOW() - INTERVAL '91 days'
WHERE id = '$DOC_ID';
```

2. Manually trigger purge function:
```sql
SELECT fn_purge_deleted_records();
```

3. Verify hard-deleted:
```sql
SELECT COUNT(*) FROM documents WHERE id = '$DOC_ID';
-- Should return 0
```

4. Check purge logged:
```sql
SELECT content FROM activity_logs
WHERE type = 'MAINTENANCE_PURGE_DELETED'
ORDER BY created_at DESC LIMIT 1;
```

**Expected Result:**
- ✅ Soft-deleted documents older than 90 days are hard-deleted
- ✅ Purge event logged with count
- ✅ Profiles preserved (for FK integrity)

---

### Test Suite 5: Materialized Views

#### TC-12: Funnel Snapshot View

**Objective:** Verify mv_funnel_snapshot aggregates correctly

**Steps:**
1. Create several test leads at different stages:
```sql
-- Inquiry stage
INSERT INTO leads (student_id, consultant_id, program_id, stage, status)
VALUES ('$S1', '$C1', '$P1', 'inquiry', 'active');

-- Consultation stage
INSERT INTO leads (student_id, consultant_id, program_id, stage, status)
VALUES ('$S2', '$C1', '$P1', 'consultation', 'active');

-- Documents stage (stalled)
INSERT INTO leads (student_id, consultant_id, program_id, stage, status)
VALUES ('$S3', '$C2', '$P1', 'documents', 'stalled');

-- Application stage (completed)
INSERT INTO leads (student_id, consultant_id, program_id, stage, status)
VALUES ('$S4', '$C1', '$P1', 'application', 'completed');
```

2. Manually refresh materialized view:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_funnel_snapshot;
```

3. Query the view:
```sql
SELECT 
  stage, consultant_name, total_leads, active_leads, stalled_leads, completed_leads
FROM mv_funnel_snapshot
ORDER BY stage;
```

**Expected Result:**
- ✅ Consultant C1 shows 3 total leads (1 inquiry, 1 consultation, 1 application)
- ✅ Consultant C1 inquiry: 1 active, 0 stalled, 0 completed
- ✅ Consultant C1 consultation: 1 active, 0 stalled, 0 completed
- ✅ Consultant C1 application: 0 active, 0 stalled, 1 completed
- ✅ Consultant C2 documents: 0 active, 1 stalled, 0 completed

---

#### TC-13: Counselor Performance View

**Objective:** Verify mv_counselor_performance metrics

**Steps:**
1. Query the view:
```sql
SELECT 
  consultant_id, full_name, total_leads_managed, leads_completed,
  completion_rate_percent, active_leads, stalled_leads, avg_lead_age_days
FROM mv_counselor_performance
ORDER BY completion_rate_percent DESC;
```

2. Verify metrics for test consultant:
```sql
SELECT * FROM mv_counselor_performance
WHERE full_name = 'Test Consultant';
```

**Expected Result:**
- ✅ total_leads_managed = total leads assigned
- ✅ completion_rate_percent = (leads_completed / total_leads_managed) * 100
- ✅ active_leads + stalled_leads + other statuses = total_leads_managed
- ✅ avg_lead_age_days > 0 (calculated from created_at)

---

#### TC-14: Materialized View Auto-Refresh

**Objective:** Verify views refresh every 5 minutes via pg_cron

**Steps:**
1. Check pg_cron job status:
```sql
SELECT jobname, schedule, command FROM cron.job 
WHERE jobname = 'refresh-materialized-views';
```

2. Monitor view refresh time:
```sql
SELECT content FROM activity_logs
WHERE type = 'MV_REFRESH_COMPLETE'
ORDER BY created_at DESC LIMIT 5;
```

3. Verify consistent 5-minute intervals

**Expected Result:**
- ✅ Job scheduled: '*/5 * * * *' (every 5 minutes)
- ✅ activity_logs shows refresh every 5 minutes
- ✅ Refresh time typically <1 second
- ✅ No reader blocking (CONCURRENT REFRESH)

---

## Integration Tests

### IT-01: End-to-End Lead Lifecycle

**Objective:** Complete flow from creation through various stages

**Scenario:**
1. Student submits application → auto-response email + WhatsApp sent
2. Admin assigns consultant
3. Consultant logs communication → stall flag cleared
4. Consultant advances lead through stages → audit trail captured
5. Lead reaches 'enrolled' → completion_rate_percent updates in MV
6. Old communication_logs eventually purged in maintenance job

**Verification:**
- ✅ All events logged in activity_logs
- ✅ All communications in communication_logs
- ✅ Audit trail shows all stage transitions
- ✅ Metrics reflect final state
- ✅ Old records cleaned up per policy

---

### IT-02: High-Volume Stress Test

**Objective:** Verify stall detection handles 1000+ leads

**Setup:**
```sql
-- Create 1000 test leads in stalled state
INSERT INTO leads (student_id, consultant_id, program_id, stage, status, stage_entered_at)
SELECT
  p.id,
  c.id,
  '$PROGRAM_ID',
  'consultation',
  'active',
  NOW() - INTERVAL '73 hours'
FROM profiles p, profiles c
WHERE p.role = 'student' AND c.role = 'consultant'
LIMIT 1000;
```

**Test:**
```sql
-- Trigger stall detection
SELECT fn_mark_stalled_leads();

-- Monitor performance
EXPLAIN ANALYZE SELECT * FROM leads
WHERE status = 'active'
  AND deleted_at IS NULL
  AND stage_entered_at <= NOW() - (72 * INTERVAL '1 hour');
```

**Expected Result:**
- ✅ Function completes in <5 seconds
- ✅ All 1000 leads marked stalled
- ✅ All notifications created (or batched)
- ✅ No significant performance impact

---

## Performance Benchmarks

| Operation | Expected Duration | Acceptable Range |
|-----------|-------------------|------------------|
| Auto-response E2E | 2-3 seconds | <5 seconds |
| Stall detection (100 leads) | <500ms | <1 second |
| Stall detection (1000 leads) | <3 seconds | <5 seconds |
| MV refresh | <1 second | <5 seconds |
| Audit trigger | <50ms | <100ms |
| Document upload + supersede | <200ms | <500ms |

---

## Failure Scenarios

### FS-01: Database Connection Timeout

**Scenario:** DB temporarily unavailable during stall detection

**Expected Behavior:**
- ✅ Function logs EXCEPTION
- ✅ Partial results returned (some leads processed, some skipped)
- ✅ Failed count incremented
- ✅ Next cron cycle retries

---

### FS-02: Resend API Outage

**Scenario:** Email service returns 5xx error

**Expected Behavior:**
- ✅ communication_logs entry created with status = 'FAILED'
- ✅ external_message_id preserved (if available from response)
- ✅ WhatsApp still sent (parallel execution)
- ✅ Edge Function returns 200 OK (partial success)
- ✅ Admin alerted via monitoring

---

### FS-03: Twilio WhatsApp Template Rejected

**Scenario:** Template not approved by Meta

**Expected Behavior:**
- ✅ Twilio returns 400 error
- ✅ Edge Function logs error details
- ✅ communication_logs shows FAILED status
- ✅ Email still sent successfully
- ✅ Template approval process initiated

---

## Sign-Off Checklist

- [ ] TC-01: Email and WhatsApp sent on new lead
- [ ] TC-02: Webhook signature verification working
- [ ] TC-03: Partial success handled (one channel failure)
- [ ] TC-04: Stage change audit captured with JSONB
- [ ] TC-05: Consultant assignment tracked
- [ ] TC-06: Document versioning marks prior as superseded
- [ ] TC-07: Consultant deactivation cascades to leads
- [ ] TC-08: Lead marked stalled after threshold
- [ ] TC-09: Contact clears stall immediately
- [ ] TC-10: Draft cleanup deletes old leads
- [ ] TC-11: Soft-deleted purging works
- [ ] TC-12: Funnel snapshot aggregates correctly
- [ ] TC-13: Performance view calculates metrics
- [ ] TC-14: Views refresh every 5 minutes
- [ ] IT-01: End-to-end lead lifecycle complete
- [ ] IT-02: High-volume stress test passes
- [ ] All performance benchmarks met
- [ ] Failure scenarios handled gracefully

---

**Phase 9 Testing Complete** ✅
