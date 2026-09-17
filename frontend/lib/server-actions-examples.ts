/**
 * Server Actions Timeout Examples
 * Demonstrates real-world patterns for wrapping server actions
 *
 * These are example implementations to copy and adapt for actual actions
 */

'use server'

import {
  withTimeout,
  withTimeoutAndRetry,
  withTimeoutAndMetrics,
  withAbortTimeout,
  TIMEOUT_PRESETS,
} from './server-actions-timeout'
import type { ActionMetrics } from './server-actions-timeout'

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 1: Simple Action with Basic Timeout
// Use for: Fast operations (auth, simple updates)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example: Simple password change action
 * Timeout: FAST (5 seconds)
 * Why: Just hash password, update auth, audit log
 */
export const exampleChangePassword = withTimeout(
  async (currentPassword: string, newPassword: string) => {
    // Validate passwords
    if (!currentPassword || !newPassword) {
      throw new Error('Passwords required')
    }

    // Verify current password (fast DB lookup)
    // const isValid = await verifyPassword(currentPassword)

    // Update password in auth (fast)
    // await updateAuthPassword(newPassword)

    // Log to audit (fast insert)
    // await logAuditEntry('PASSWORD_CHANGED', { user: userId })

    return { success: true, message: 'Password changed' }
  },
  'FAST', // 5 seconds
  'changePassword'
)

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 2: Action with Retries
// Use for: Critical operations that may fail transiently
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example: Send notification to user
 * Timeout: STANDARD (15 seconds)
 * Retries: 2 attempts
 * Why: May timeout due to network, but should succeed on retry
 */
export const exampleSendNotification = withTimeoutAndRetry(
  async (userId: string, message: string) => {
    // Validate inputs
    if (!userId || !message) {
      throw new Error('User ID and message required')
    }

    // Create notification (fast)
    // await db.notifications.create({ userId, message })

    // Send email (medium, may fail transiently)
    // await resend.emails.send({ to: userEmail, subject: 'New Notification', ... })

    // Update realtime (fast)
    // await supabase.broadcast('notifications', { type: 'new', userId })

    return { success: true }
  },
  'STANDARD', // 15 seconds
  'sendNotification',
  2 // Retry up to 2 times (exponential backoff)
)

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 3: Action with Metrics Collection
// Use for: Important operations requiring monitoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example: Get consultant analytics
 * Timeout: VERY_SLOW (60 seconds)
 * Metrics: Collect for monitoring dashboard
 * Why: Complex aggregations, may vary based on data volume
 */
const handleAnalyticsMetrics = (metrics: ActionMetrics) => {
  // Log metrics
  console.log(`[ANALYTICS_METRIC] Action "${metrics.actionName}" completed in ${metrics.duration}ms`)

  // Send to monitoring service (Sentry, DataDog, etc.)
  // if (metrics.status === 'timeout') {
  //   sentry.captureMessage('Analytics query timed out', 'error')
  // }
  //
  // if (metrics.duration! > TIMEOUT_PRESETS.VERY_SLOW.timeoutMs * 0.8) {
  //   datadog.gauge('action.slow', 1, {
  //     action: metrics.actionName,
  //     percentOfTimeout: (metrics.duration! / metrics.timeoutMs) * 100,
  //   })
  // }
}

export const exampleGetAnalytics = withTimeoutAndMetrics(
  async (filters: Record<string, any>) => {
    // Validate filters
    if (!filters) {
      throw new Error('Filters required')
    }

    // Query materialized view (can be slow)
    // const data = await db.query(`
    //   SELECT * FROM consultant_metrics_view
    //   WHERE created_at >= $1 AND created_at <= $2
    // `, [filters.startDate, filters.endDate])

    // Aggregate results (can be slow)
    // const aggregated = await aggregateResults(data)

    // Format for response (fast)
    return {
      success: true,
      data: {
        /* aggregated results */
      },
    }
  },
  'VERY_SLOW', // 60 seconds
  'getAnalytics',
  handleAnalyticsMetrics
)

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 4: Action with Abort Signal
// Use for: External API calls that can be canceled
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example: Fetch data from external API
 * Timeout: EXTERNAL_API (25 seconds)
 * Why: Network latency, API may be slow or unresponsive
 * Abort: Request cancelled if timeout exceeds
 */
export const exampleFetchExternalData = withAbortTimeout(
  async (signal: AbortSignal, url: string) => {
    // Validate URL
    if (!url) {
      throw new Error('URL required')
    }

    try {
      // Fetch with abort signal (request cancelled on timeout)
      const response = await fetch(url, {
        signal,
        // Note: timeout is not a valid fetch option, but signal handles cancellation
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request cancelled due to timeout')
      }
      throw error
    }
  },
  'EXTERNAL_API', // 25 seconds
  'fetchExternalData'
)

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 5: Complex Action with File Upload
// Use for: Operations handling file uploads
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example: Upload document for lead
 * Timeout: SLOW (30 seconds)
 * Why: File upload + storage write + virus scan + DB insert
 */
export const exampleUploadDocument = withTimeoutAndRetry(
  async (
    _prevState: any,
    formData: FormData
  ): Promise<{ success: boolean; error?: string; documentId?: string }> => {
    try {
      // Validate form data
      const file = formData.get('file') as File | null
      const leadId = formData.get('leadId') as string | null

      if (!file || !leadId) {
        throw new Error('File and lead ID required')
      }

      // Check file size (fast)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File too large (max 10MB)')
      }

      // Scan for viruses (medium - depends on service)
      // const isSafe = await virusScan(file)
      // if (!isSafe) {
      //   throw new Error('File contains potential threats')
      // }

      // Upload to storage (slow - network IO)
      // const uploadResult = await uploadToStorage(file, `leads/${leadId}/${file.name}`)
      // if (!uploadResult.success) {
      //   throw new Error('Upload failed')
      // }

      // Create document record (fast)
      // const document = await db.documents.create({
      //   lead_id: leadId,
      //   file_name: file.name,
      //   file_url: uploadResult.url,
      //   file_size: file.size,
      //   mime_type: file.type,
      // })

      // Log audit (fast)
      // await logAuditEntry('DOCUMENT_UPLOADED', {
      //   lead_id: leadId,
      //   document_id: document.id,
      //   file_size: file.size,
      // })

      return {
        success: true,
        documentId: 'doc-123', // document.id
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  },
  'SLOW', // 30 seconds
  'uploadDocument',
  1 // Retry once if timeout
)

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 6: Bulk Operation with Progress Tracking
// Use for: Operations affecting many records
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example: Bulk assign leads to consultants
 * Timeout: SLOW (30 seconds)
 * Why: Multiple DB updates, may need to check availability, send emails
 */
export const exampleBulkAssignLeads = withTimeout(
  async (assignmentMap: Record<string, string>) => {
    // Validate input
    if (!assignmentMap || Object.keys(assignmentMap).length === 0) {
      throw new Error('At least one assignment required')
    }

    const results = {
      assigned: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Process each assignment
    for (const [leadId, consultantId] of Object.entries(assignmentMap)) {
      try {
        // Verify lead exists and is unassigned
        // const lead = await db.leads.findById(leadId)
        // if (!lead) throw new Error(`Lead ${leadId} not found`)
        // if (lead.consultant_id) throw new Error(`Lead ${leadId} already assigned`)

        // Verify consultant exists and is accepting
        // const consultant = await db.profiles.findById(consultantId)
        // if (!consultant?.is_accepting) throw new Error(`Consultant ${consultantId} not accepting`)

        // Update lead
        // await db.leads.update(leadId, { consultant_id: consultantId })

        // Create activity log (audit trail)
        // await db.activity_logs.create({
        //   lead_id: leadId,
        //   actor_id: currentUserId,
        //   type: 'LEAD_ASSIGNED',
        //   content: `Lead assigned to ${consultant.name}`,
        // })

        results.assigned++
      } catch (error) {
        results.failed++
        results.errors.push(
          `Lead ${leadId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    // Log summary
    console.info('[BULK_ASSIGN_SUMMARY]', results)

    return results
  },
  'SLOW', // 30 seconds
  'bulkAssignLeads'
)

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 7: Real-Time Data Fetch with Fresh Data
// Use for: Operations requiring always-fresh data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example: Get consultant lead list with real-time updates
 * Timeout: STANDARD (15 seconds)
 * Why: Queries materialized view + applies complex filters
 */
export const exampleGetConsultantLeads = withTimeout(
  async (consultantId: string, filters: Record<string, any> = {}) => {
    // Validate consultant ID
    if (!consultantId) {
      throw new Error('Consultant ID required')
    }

    // Query materialized view (fast due to denormalization)
    // const leads = await db.query(`
    //   SELECT * FROM consultant_portfolio_view
    //   WHERE consultant_id = $1
    // `, [consultantId])

    // Apply client filters (fast in-memory)
    // let filtered = leads
    // if (filters.stage) {
    //   filtered = filtered.filter((l) => l.stage === filters.stage)
    // }
    // if (filters.searchQuery) {
    //   filtered = filtered.filter((l) =>
    //     l.student_name?.includes(filters.searchQuery) ||
    //     l.reference_code?.includes(filters.searchQuery)
    //   )
    // }

    // Sort and paginate
    // const sorted = filtered.sort((a, b) =>
    //   (b.updated_at ?? 0) - (a.updated_at ?? 0)
    // )
    // const paginated = sorted.slice(0, 50)

    return {
      success: true,
      leads: [], // paginated
      total: 0, // filtered.length
    }
  },
  'STANDARD', // 15 seconds
  'getConsultantLeads'
)

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 8: Client-Side Error Handling Pattern
// ─────────────────────────────────────────────────────────────────────────────

/**
 * React component showing how to handle timeout errors
 * This is pseudo-code to show the pattern
 */
export function ExampleComponent() {
  // This would be in a React component (client-side)
  /*
  import { TimeoutError } from '@/lib/server-actions-timeout'
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    setError(null)

    try {
      const result = await exampleUploadDocument(null, formData)
      
      if (result.success) {
        // Success
        console.log('Document uploaded:', result.documentId)
      } else {
        setError(result.error || 'Upload failed')
      }
    } catch (err) {
      if (err instanceof TimeoutError) {
        setError('Upload is taking too long. Please try again or contact support.')
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      handleSubmit(formData)
    }}>
      <input type="file" name="file" required />
      <input type="hidden" name="leadId" value={leadId} />
      
      {error && <div className="error">{error}</div>}
      
      <button disabled={loading} type="submit">
        {loading ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  )
  */
}

// ─────────────────────────────────────────────────────────────────────────────
// Implementation Checklist
// ─────────────────────────────────────────────────────────────────────────────

/*
For each server action, follow this checklist:

1. ✓ Import timeout utility: 
   import { withTimeout } from '@/lib/server-actions-timeout'

2. ✓ Choose appropriate timeout from presets:
   - FAST (5s): auth, simple updates
   - STANDARD (15s): form submissions, query joins
   - SLOW (30s): file uploads, external APIs
   - VERY_SLOW (60s): analytics, bulk ops

3. ✓ Create implementation function:
   const actionImpl = async (...args) => { ... }

4. ✓ Wrap with timeout:
   export const action = withTimeout(actionImpl, 'PRESET', 'actionName')

5. ✓ Test timeout behavior:
   - Normal operation completes
   - Timeout error thrown if exceeds limit
   - Client handles TimeoutError gracefully

6. ✓ Handle in client UI:
   try {
     await action(args)
   } catch (err) {
     if (err instanceof TimeoutError) {
       // Show timeout message
     }
   }

7. ✓ Deploy and monitor:
   - Watch for [ACTION_TIMEOUT] logs
   - Verify timeout is appropriate
   - Adjust if needed based on metrics
*/
