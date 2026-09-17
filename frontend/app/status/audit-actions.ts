'use server'

/**
 * Audit logging actions for document access and operations.
 * Separated from main actions.ts to keep concerns clear.
 */

import { createServiceClient } from '@/lib/supabase/service'
import { getClientIp, logOperation, logError } from '@/lib/server-utils'

/**
 * Log document access (viewing/downloading).
 * Called client-side when student views or downloads a document.
 */
export async function logDocumentAccess(
  documentId: string,
  leadId: string,
  action: 'viewed' | 'downloaded' = 'viewed'
): Promise<{ success: boolean; error?: string }> {
  try {
    const clientIp = await getClientIp()
    const db = createServiceClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbw = db as any

    // Insert audit log entry
    const { error } = await dbw
      .from('activity_logs')
      .insert({
        lead_id: leadId,
        type: `document_${action}`,
        content: JSON.stringify({
          document_id: documentId,
          action,
          ip_address: clientIp,
          timestamp: new Date().toISOString(),
        }),
      })

    if (error) {
      logError('audit-actions', `log_document_${action}`, error, {
        document_id: documentId,
        lead_id: leadId,
      })
      return { success: false, error: error.message }
    }

    logOperation('audit-actions', `document_${action}_logged`, {
      document_id: documentId,
      lead_id: leadId,
      ip: clientIp,
    })

    return { success: true }
  } catch (err) {
    logError('audit-actions', 'unexpected_error', err, {
      document_id: documentId,
      lead_id: leadId,
    })
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Log lookup failure (too many attempts, validation failure, etc.)
 * Helps detect abuse patterns.
 */
export async function logLookupFailure(
  failureType: 'validation' | 'not_found' | 'rate_limit' | 'error',
  details?: Record<string, unknown>
): Promise<{ success: boolean }> {
  try {
    const clientIp = await getClientIp()

    logOperation('audit-actions', 'lookup_failure', {
      failure_type: failureType,
      ip: clientIp,
      ...details,
    })

    // In future: could insert into a separate abuse_reports table for admin review
    return { success: true }
  } catch (err) {
    logError('audit-actions', 'log_lookup_failure_failed', err)
    return { success: false }
  }
}
