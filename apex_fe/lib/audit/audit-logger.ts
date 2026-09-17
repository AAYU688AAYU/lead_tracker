/**
 * Comprehensive Audit Logging System
 *
 * Phase 10 #9: Audit logging for all sensitive admin actions
 *
 * This module provides centralized audit logging for:
 * - Admin user management (toggle accepting, offboard, deactivate)
 * - Lead management (reassign, stage advance, status change)
 * - Document management (approve, reject)
 * - Pipeline settings changes (labels, thresholds, severity)
 * - Password operations (reset, change)
 *
 * AUDIT LOG ENTRY STRUCTURE:
 * {
 *   lead_id: UUID | null            // null for non-lead actions (auth, global settings)
 *   actor_id: UUID                  // Admin/user performing the action
 *   type: string                    // Action type: 'reassignment', 'stage_advance', etc.
 *   content: string                 // Human-readable description
 *   created_at: timestamp           // Automatic
 * }
 *
 * COMPLIANCE:
 * - All admin actions logged (non-repudiation)
 * - Immutable audit trail (INSERT only, no UPDATE/DELETE)
 * - Automatic timestamps
 * - Actor identification (who performed the action)
 * - Action details (what was changed)
 */

export enum AuditActionType {
  // Team management
  CONSULTANT_DEACTIVATED = 'consultant_deactivated',
  CONSULTANT_OFFBOARDED = 'consultant_offboarded',
  CONSULTANT_TOGGLED_ACCEPTING = 'consultant_toggled_accepting',

  // Lead management
  LEAD_REASSIGNED = 'lead_reassigned',
  LEAD_STAGE_ADVANCED = 'lead_stage_advanced',
  LEAD_STATUS_CHANGED = 'lead_status_changed',
  LEAD_NOTES_UPDATED = 'lead_notes_updated',

  // Document management
  DOCUMENT_APPROVED = 'document_approved',
  DOCUMENT_REJECTED = 'document_rejected',
  DOCUMENT_UPLOADED = 'document_uploaded',

  // Pipeline settings
  PIPELINE_STAGE_LABEL_UPDATED = 'pipeline_stage_label_updated',
  PIPELINE_STALL_THRESHOLD_UPDATED = 'pipeline_stall_threshold_updated',
  PIPELINE_ESCALATION_THRESHOLD_UPDATED = 'pipeline_escalation_threshold_updated',
  PIPELINE_SEVERITY_LEVEL_UPDATED = 'pipeline_severity_level_updated',

  // Authentication
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  PASSWORD_CHANGED = 'password_changed',

  // Communication
  COMMUNICATION_LOGGED = 'communication_logged',
}

/**
 * Audit log entry to insert into database
 */
export interface AuditLogEntry {
  lead_id: string | null
  actor_id: string | null // null for service-role actions
  type: AuditActionType | string
  content: string
}

/**
 * Rich audit context for detailed logging
 */
export interface AuditContext {
  actor_id: string | null
  action: AuditActionType | string
  lead_id?: string | null
  resource_id?: string
  old_value?: string
  new_value?: string
  reason?: string
  [key: string]: unknown
}

/**
 * Format audit context into human-readable content
 */
export function formatAuditContent(context: AuditContext): string {
  const { action, old_value, new_value, reason, resource_id } = context

  switch (action) {
    // Team management
    case AuditActionType.CONSULTANT_DEACTIVATED:
      return `Consultant deactivated. All active/stalled leads flagged for reassignment.${reason ? ` Reason: ${reason}` : ''}`

    case AuditActionType.CONSULTANT_OFFBOARDED:
      return `Consultant offboarded. All active/stalled leads reassigned to replacement consultant.${reason ? ` Reason: ${reason}` : ''}`

    case AuditActionType.CONSULTANT_TOGGLED_ACCEPTING:
      return `Consultant lead acceptance toggled to ${new_value ? 'enabled' : 'disabled'}.`

    // Lead management
    case AuditActionType.LEAD_REASSIGNED:
      return `Lead reassigned from consultant ${old_value} to ${new_value}.`

    case AuditActionType.LEAD_STAGE_ADVANCED:
      return `Lead stage advanced from ${old_value} to ${new_value}.`

    case AuditActionType.LEAD_STATUS_CHANGED:
      return `Lead status changed from ${old_value} to ${new_value}.`

    case AuditActionType.LEAD_NOTES_UPDATED:
      return `Lead notes updated.${reason ? ` Updated by: ${reason}` : ''}`

    // Document management
    case AuditActionType.DOCUMENT_APPROVED:
      return `Document ${resource_id} approved.`

    case AuditActionType.DOCUMENT_REJECTED:
      return `Document ${resource_id} rejected.${reason ? ` Reason: ${reason}` : ''}`

    case AuditActionType.DOCUMENT_UPLOADED:
      return `Document ${resource_id} uploaded.`

    // Pipeline settings
    case AuditActionType.PIPELINE_STAGE_LABEL_UPDATED:
      return `Pipeline stage label updated. Stage: ${resource_id}, New label: ${new_value}.`

    case AuditActionType.PIPELINE_STALL_THRESHOLD_UPDATED:
      return `Pipeline stall threshold updated. Stage: ${resource_id}, Changed from ${old_value}h to ${new_value}h.`

    case AuditActionType.PIPELINE_ESCALATION_THRESHOLD_UPDATED:
      return `Pipeline escalation threshold updated. Stage: ${resource_id}, Changed from ${old_value}h to ${new_value}h.`

    case AuditActionType.PIPELINE_SEVERITY_LEVEL_UPDATED:
      return `Pipeline severity level updated. Stage: ${resource_id}, Changed from ${old_value} to ${new_value}.`

    // Authentication
    case AuditActionType.PASSWORD_RESET_REQUESTED:
      return `Password reset requested for account.`

    case AuditActionType.PASSWORD_RESET_COMPLETED:
      return `Password reset completed successfully.`

    case AuditActionType.PASSWORD_CHANGED:
      return `Password changed for account.`

    // Communication
    case AuditActionType.COMMUNICATION_LOGGED:
      return `Communication logged via ${resource_id}.${reason ? ` Summary: ${reason}` : ''}`

    default:
      return `Action performed: ${action}.${reason ? ` Details: ${reason}` : ''}`
  }
}

/**
 * Create a standardized audit log entry
 *
 * USAGE:
 * ```typescript
 * const auditEntry = createAuditLogEntry({
 *   actor_id: userId,
 *   action: AuditActionType.LEAD_REASSIGNED,
 *   lead_id: leadId,
 *   old_value: oldConsultantName,
 *   new_value: newConsultantName,
 * })
 *
 * const { error } = await db.from('activity_logs').insert(auditEntry)
 * ```
 */
export function createAuditLogEntry(context: AuditContext): AuditLogEntry {
  return {
    lead_id: context.lead_id ?? null,
    actor_id: context.actor_id ?? null,
    type: context.action,
    content: formatAuditContent(context),
  }
}

/**
 * Bulk audit log creation
 *
 * USAGE:
 * ```typescript
 * const entries = leads.map(lead =>
 *   createAuditLogEntry({
 *     actor_id: userId,
 *     action: AuditActionType.LEAD_REASSIGNED,
 *     lead_id: lead.id,
 *     old_value: 'Old Consultant',
 *     new_value: 'New Consultant',
 *   })
 * )
 *
 * const { error } = await db.from('activity_logs').insert(entries)
 * ```
 */
export function createBulkAuditLogEntries(
  contexts: AuditContext[]
): AuditLogEntry[] {
  return contexts.map(createAuditLogEntry)
}

/**
 * Log audit entry with error handling
 *
 * USAGE:
 * ```typescript
 * await logAuditEntry(db, {
 *   actor_id: userId,
 *   action: AuditActionType.CONSULTANT_DEACTIVATED,
 *   resource_id: consultantId,
 *   reason: 'Consultant left company',
 * })
 * ```
 */
export async function logAuditEntry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  context: AuditContext
): Promise<boolean> {
  try {
    const entry = createAuditLogEntry(context)
    const { error } = await db.from('activity_logs').insert(entry)

    if (error) {
      console.error('[audit] Failed to log audit entry:', error, { context })
      return false
    }

    return true
  } catch (err) {
    console.error('[audit] Unexpected error logging audit entry:', err, { context })
    return false
  }
}

/**
 * Bulk audit logging with error handling
 *
 * NON-FATAL: If audit logging fails, the primary action is already done.
 * Log the error but don't throw.
 *
 * USAGE:
 * ```typescript
 * // After updating consultant offboarding
 * await logBulkAuditEntries(db, leads.map(lead => ({
 *   actor_id: userId,
 *   action: AuditActionType.LEAD_REASSIGNED,
 *   lead_id: lead.id,
 *   old_value: 'Old Consultant',
 *   new_value: 'New Consultant',
 * })))
 * ```
 */
export async function logBulkAuditEntries(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  contexts: AuditContext[]
): Promise<boolean> {
  if (contexts.length === 0) {
    return true
  }

  try {
    const entries = createBulkAuditLogEntries(contexts)
    const { error } = await db.from('activity_logs').insert(entries)

    if (error) {
      console.error('[audit] Failed to log bulk audit entries:', error, {
        count: contexts.length,
      })
      return false
    }

    return true
  } catch (err) {
    console.error('[audit] Unexpected error logging bulk audit entries:', err, {
      count: contexts.length,
    })
    return false
  }
}

/**
 * Audit log query helper
 *
 * Retrieves audit logs for a lead or global actions
 */
export async function queryAuditLogs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  filters: {
    lead_id?: string | null
    actor_id?: string | null
    type?: string | string[]
    from_date?: Date
    to_date?: Date
    limit?: number
  }
): Promise<Array<{
  id: string
  lead_id: string | null
  actor_id: string | null
  type: string
  content: string
  created_at: string
}> | null> {
  try {
    let query = db.from('activity_logs').select('*')

    if (filters.lead_id !== undefined) {
      query = query.eq('lead_id', filters.lead_id)
    }

    if (filters.actor_id) {
      query = query.eq('actor_id', filters.actor_id)
    }

    if (filters.type) {
      if (Array.isArray(filters.type)) {
        query = query.in('type', filters.type)
      } else {
        query = query.eq('type', filters.type)
      }
    }

    if (filters.from_date) {
      query = query.gte('created_at', filters.from_date.toISOString())
    }

    if (filters.to_date) {
      query = query.lte('created_at', filters.to_date.toISOString())
    }

    query = query.order('created_at', { ascending: false })

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('[audit] Failed to query audit logs:', error, { filters })
      return null
    }

    return data
  } catch (err) {
    console.error('[audit] Unexpected error querying audit logs:', err, { filters })
    return null
  }
}

/**
 * Export audit logs for compliance/reporting
 *
 * Returns CSV format for easy import into Excel/analysis tools
 */
export function formatAuditLogsAsCSV(logs: Array<{
  id: string
  lead_id: string | null
  actor_id: string | null
  type: string
  content: string
  created_at: string
}>): string {
  const headers = ['ID', 'Lead ID', 'Actor ID', 'Type', 'Content', 'Created At']
  const rows = logs.map(log => [
    log.id,
    log.lead_id || '',
    log.actor_id || '',
    log.type,
    `"${log.content.replace(/"/g, '""')}"`, // Escape quotes in CSV
    log.created_at,
  ])

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n')

  return csv
}
