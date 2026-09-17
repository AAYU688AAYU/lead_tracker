# Comprehensive Audit Logging — Phase 10 #9

## Overview

This document outlines the audit logging system for tracking all sensitive admin actions in the Lead Tracker CRM.

**Goal:** Provide non-repudiation for sensitive operations:
- Admin user management
- Lead assignment and status changes
- Document approvals/rejections
- Pipeline configuration changes
- Password operations

## System Architecture

### Audit Log Table

```sql
CREATE TABLE activity_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    UUID        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  actor_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  type       TEXT        NOT NULL,
  content    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Key Properties:**
- **Immutable:** INSERT-only, no UPDATE/DELETE after creation
- **Actor tracking:** `actor_id` identifies who performed the action
- **Action types:** Standardized enum for consistency
- **Timestamped:** Automatic `created_at` for timeline
- **Lead-linked:** Most actions tied to specific lead (null for global actions)

### Audit Logger Utility

Created `lib/audit/audit-logger.ts` with:

```typescript
enum AuditActionType {
  CONSULTANT_DEACTIVATED,
  CONSULTANT_OFFBOARDED,
  LEAD_REASSIGNED,
  LEAD_STAGE_ADVANCED,
  LEAD_STATUS_CHANGED,
  DOCUMENT_APPROVED,
  DOCUMENT_REJECTED,
  // ... 15+ action types
}

// Create audit log entries
createAuditLogEntry(context: AuditContext): AuditLogEntry
createBulkAuditLogEntries(contexts: AuditContext[]): AuditLogEntry[]

// Log to database
logAuditEntry(db, context): Promise<boolean>
logBulkAuditEntries(db, contexts): Promise<boolean>

// Query audit logs
queryAuditLogs(db, filters): Promise<AuditLog[] | null>

// Export for compliance
formatAuditLogsAsCSV(logs): string
```

## Implementation Patterns

### Pattern 1: Simple Action Logging

```typescript
'use server'

import { logAuditEntry, AuditActionType } from '@/lib/audit/audit-logger'

export async function toggleConsultantAccepting(
  consultant_id: string,
  new_value: boolean
) {
  const authDb = await createClient()
  const { data: { user } } = await authDb.auth.getUser()

  // Perform action
  const { error } = await db.from('profiles').update({
    is_accepting_leads: new_value
  }).eq('id', consultant_id)

  if (error) throw error

  // Log audit entry
  await logAuditEntry(db, {
    actor_id: user?.id,
    action: AuditActionType.CONSULTANT_TOGGLED_ACCEPTING,
    resource_id: consultant_id,
    new_value: new_value.toString(),
  })

  return { success: true }
}
```

### Pattern 2: Bulk Action Logging

```typescript
import { logBulkAuditEntries, AuditActionType } from '@/lib/audit/audit-logger'

export async function offboardConsultant(from_id: string, to_id: string) {
  // Perform bulk update
  const leads = await db.from('leads')
    .select('id')
    .eq('consultant_id', from_id)
    .in('status', ['active', 'stalled'])

  const { error: updateErr } = await db.from('leads').update({
    consultant_id: to_id
  }).eq('consultant_id', from_id)

  if (updateErr) throw updateErr

  // Bulk audit logging
  const auditContexts = leads.map(lead => ({
    actor_id: user?.id,
    action: AuditActionType.LEAD_REASSIGNED,
    lead_id: lead.id,
    old_value: 'Old Consultant',
    new_value: 'New Consultant',
  }))

  await logBulkAuditEntries(db, auditContexts)

  return { success: true }
}
```

### Pattern 3: Non-Fatal Audit Logging

```typescript
// If audit logging fails, the primary action is already done.
// Log the error but don't fail the operation.

const success = await logAuditEntry(db, {
  actor_id: user?.id,
  action: AuditActionType.LEAD_REASSIGNED,
  lead_id: leadId,
  old_value: oldName,
  new_value: newName,
})

if (!success) {
  // Log audit failure but continue
  console.warn('[audit] Failed to log audit entry for lead reassignment')
}

// Primary action already completed successfully
return { success: true }
```

## Audit Action Types

### Team Management

| Action | Logged When | Content Example |
|--------|-------------|-----------------|
| `CONSULTANT_DEACTIVATED` | Consultant marked inactive | "Consultant deactivated. All active/stalled leads flagged for reassignment." |
| `CONSULTANT_OFFBOARDED` | Leads reassigned during offboarding | "Consultant offboarded. All active/stalled leads reassigned to replacement consultant." |
| `CONSULTANT_TOGGLED_ACCEPTING` | Lead acceptance toggled | "Consultant lead acceptance toggled to enabled." |

### Lead Management

| Action | Logged When | Content Example |
|--------|-------------|-----------------|
| `LEAD_REASSIGNED` | Lead assigned to different consultant | "Lead reassigned from John Doe to Jane Smith." |
| `LEAD_STAGE_ADVANCED` | Lead moved to next stage | "Lead stage advanced from in_progress to interview_scheduled." |
| `LEAD_STATUS_CHANGED` | Lead status updated | "Lead status changed from active to stalled." |
| `LEAD_NOTES_UPDATED` | Lead notes modified | "Lead notes updated." |

### Document Management

| Action | Logged When | Content Example |
|--------|-------------|-----------------|
| `DOCUMENT_APPROVED` | Document approved by consultant/admin | "Document UUID approved." |
| `DOCUMENT_REJECTED` | Document rejected with reason | "Document UUID rejected. Reason: Missing signatures." |
| `DOCUMENT_UPLOADED` | Document uploaded by student | "Document UUID uploaded." |

### Pipeline Settings

| Action | Logged When | Content Example |
|--------|-------------|-----------------|
| `PIPELINE_STAGE_LABEL_UPDATED` | Stage label changed | "Pipeline stage label updated. Stage: interview_scheduled, New label: Interview Scheduled (Updated)." |
| `PIPELINE_STALL_THRESHOLD_UPDATED` | Stall threshold changed | "Pipeline stall threshold updated. Stage: in_progress, Changed from 72h to 96h." |
| `PIPELINE_ESCALATION_THRESHOLD_UPDATED` | Escalation threshold changed | "Pipeline escalation threshold updated. Stage: in_progress, Changed from 48h to 60h." |
| `PIPELINE_SEVERITY_LEVEL_UPDATED` | Severity level changed | "Pipeline severity level updated. Stage: decision_pending, Changed from MEDIUM to HIGH." |

### Authentication

| Action | Logged When | Content Example |
|--------|-------------|-----------------|
| `PASSWORD_RESET_REQUESTED` | User requests password reset | "Password reset requested for account." |
| `PASSWORD_RESET_COMPLETED` | Password reset completed | "Password reset completed successfully." |
| `PASSWORD_CHANGED` | User changes password | "Password changed for account." |

### Communication

| Action | Logged When | Content Example |
|--------|-------------|-----------------|
| `COMMUNICATION_LOGGED` | Consultant logs communication | "Communication logged via email." |

## Querying Audit Logs

### Find all actions by a user

```typescript
const logs = await queryAuditLogs(db, {
  actor_id: 'user-id-123',
  limit: 100,
})
```

### Find all actions affecting a lead

```typescript
const logs = await queryAuditLogs(db, {
  lead_id: 'lead-id-456',
  limit: 50,
})
```

### Find all admin actions in date range

```typescript
const logs = await queryAuditLogs(db, {
  type: [
    AuditActionType.CONSULTANT_DEACTIVATED,
    AuditActionType.CONSULTANT_OFFBOARDED,
    AuditActionType.LEAD_REASSIGNED,
  ],
  from_date: new Date('2024-01-01'),
  to_date: new Date('2024-12-31'),
  limit: 1000,
})
```

## Reporting & Compliance

### Export Audit Logs for Compliance

```typescript
const logs = await queryAuditLogs(db, {
  from_date: new Date('2024-01-01'),
  type: AuditActionType.CONSULTANT_DEACTIVATED,
})

const csv = formatAuditLogsAsCSV(logs)

// Download as audit-report-2024.csv
fs.writeFileSync('audit-report-2024.csv', csv)
```

### CSV Format

```
ID,Lead ID,Actor ID,Type,Content,Created At
uuid1,lead-123,user-456,consultant_deactivated,"Consultant deactivated. All active/stalled leads flagged for reassignment.",2024-01-15T10:30:00Z
uuid2,lead-124,user-456,lead_reassigned,"Lead reassigned from John Doe to Jane Smith.",2024-01-15T10:31:00Z
```

## Best Practices

### 1. Always Log Admin Actions

Every admin action should be logged:
```typescript
// ✅ GOOD
await logAuditEntry(db, {
  actor_id: user.id,
  action: AuditActionType.LEAD_REASSIGNED,
  lead_id: leadId,
  old_value: oldName,
  new_value: newName,
})

// ❌ BAD
// Forgot to log the action
```

### 2. Non-Fatal Audit Logging

Never fail primary action if audit logging fails:
```typescript
// ✅ GOOD
const auditSuccess = await logAuditEntry(db, { /* ... */ })
if (!auditSuccess) {
  console.warn('Audit logging failed but primary action succeeded')
}

// ❌ BAD
if (!auditSuccess) {
  throw new Error('Audit logging failed') // Fails primary action
}
```

### 3. Include Context

Always provide enough context:
```typescript
// ✅ GOOD
await logAuditEntry(db, {
  actor_id: user.id,
  action: AuditActionType.LEAD_REASSIGNED,
  lead_id: leadId,
  old_value: 'John Doe',      // WHO moved FROM
  new_value: 'Jane Smith',     // WHO moved TO
  reason: 'Consultant offboarding', // WHY
})

// ❌ BAD - Missing context
await logAuditEntry(db, {
  actor_id: user.id,
  action: AuditActionType.LEAD_REASSIGNED,
  lead_id: leadId,
})
```

### 4. Bulk Operations

Use bulk logging for efficiency:
```typescript
// ✅ GOOD - Single DB call for 100 leads
const contexts = leads.map(lead => ({
  actor_id: user.id,
  action: AuditActionType.LEAD_REASSIGNED,
  lead_id: lead.id,
  old_value: oldName,
  new_value: newName,
}))
await logBulkAuditEntries(db, contexts)

// ❌ BAD - 100 DB calls (slow)
for (const lead of leads) {
  await logAuditEntry(db, { /* ... */ })
}
```

## Schema Integration

### Create Audit Indexes (Already in migrations)

```sql
CREATE INDEX idx_activity_logs_lead_id ON activity_logs(lead_id);
CREATE INDEX idx_activity_logs_actor_id ON activity_logs(actor_id);
CREATE INDEX idx_activity_logs_type_created ON activity_logs(type, created_at DESC);
CREATE INDEX idx_activity_logs_lead_type ON activity_logs(lead_id, type);
```

These indexes enable fast queries for:
- Finding all actions on a lead
- Finding all actions by a user
- Finding actions by type
- Time-range queries

## Sensitive Actions to Audit

### Currently Logged (Already in code)

✅ Consultant offboarding
✅ Consultant deactivation  
✅ Document upload
✅ Password reset
✅ Password change
✅ Unauthorized access attempts

### Need Integration

🔶 Lead reassignment (admin dashboard)
🔶 Stage advancement (consultant/admin)
🔶 Lead status changes
🔶 Document approval/rejection
🔶 Pipeline settings changes
🔶 Communication logging

## Implementation Roadmap

### Phase 1: Core Infrastructure (DONE)
- ✅ Audit logger utility created
- ✅ Action type enums defined
- ✅ Logging functions implemented

### Phase 2: Admin Actions (READY)
- Consultant team management (offboard, deactivate, toggle)
- Lead management (reassign, stage, status)
- Pipeline settings

### Phase 3: Consultant Actions
- Communication logging
- Document review
- Lead stage advancement

### Phase 4: Reporting
- Audit query UI
- Compliance report generation
- Timeline visualization

## Files Modified

- `lib/audit/audit-logger.ts` — Audit logging utilities
- This file: `AUDIT_LOGGING_GUIDE.md` — Documentation

## References

- [NIST Audit Logging Guidelines](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-53a-rev3.pdf)
- [CIS Controls: Logging and Monitoring](https://www.cisecurity.org/controls/logging-and-monitoring)
- [PCI DSS Requirement 10 - Logging and Monitoring](https://www.pcisecuritystandards.org/)
