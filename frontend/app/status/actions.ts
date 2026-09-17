'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { statusLookupLimiter, statusUploadLimiter } from '@/lib/rate-limiter'
import { getClientIp, enforceMinimumTime, logOperation, logError, withTiming } from '@/lib/server-utils'
import { parseLookupFormData, parseUploadFormData } from './validation'
import type { Lead, PipelineStageLabel, Document, CommunicationLog, Profile } from '@/lib/supabase/types'
import type {
  StageStep, DocumentRow, LookupResult, LookupState, UploadState,
} from './types'

// Re-export types so existing imports of these from 'actions' keep working
export type { StageStep, DocumentRow, LookupResult, LookupState, UploadState }

// ---------------------------------------------------------------------------
// Narrow internal query-result types (not exported)
// ---------------------------------------------------------------------------

type LeadRow      = Pick<Lead, 'id' | 'stage' | 'status' | 'student_id'>
type StageRow     = Pick<PipelineStageLabel, 'stage' | 'label' | 'sort_order'>
type CommRow      = Pick<CommunicationLog, 'created_at'>
type DocRow       = Pick<Document, 'id' | 'file_name' | 'file_url' | 'status' | 'rejection_reason' | 'created_at'>
type ProfileIdRow = Pick<Profile, 'id'>

// ---------------------------------------------------------------------------
// lookupApplication — matches reference_code + email to a lead row.
// 
// Improvements in this version:
// 1. Rate limiting (10 attempts per IP per 15 minutes)
// 2. Input validation with Zod
// 3. Constant-time response (minimum 150ms to prevent timing attacks)
// 4. Audit logging with operation timing
// 5. Client IP extraction for rate limiting and audit
// ---------------------------------------------------------------------------

export async function lookupApplication(
  _prevState: LookupState,
  formData: FormData,
): Promise<LookupState> {
  const startTime = Date.now()
  const clientIp = await getClientIp()

  try {
    // 1. RATE LIMITING — check before any processing
    if (!statusLookupLimiter.check(clientIp)) {
      const resetIn = statusLookupLimiter.getResetIn(clientIp)
      logOperation('status-lookup', 'rate_limit_exceeded', {
        ip: clientIp,
        reset_in_seconds: resetIn,
      })
      
      // Enforce timing even on rate limit to prevent info leakage
      await enforceMinimumTime(startTime)
      
      return {
        status: 'error',
        message: `Too many attempts. Please try again in ${resetIn} seconds.`,
      }
    }

    // 2. VALIDATION — parse and validate input
    const parsed = parseLookupFormData(formData)
    if (!parsed.success) {
      logOperation('status-lookup', 'validation_failed', {
        ip: clientIp,
        errors: parsed.error.issues.map(i => i.code).join(','),
      })
      
      await enforceMinimumTime(startTime)
      
      // Generic message — never reveal which field failed
      return { status: 'error', message: 'Invalid input. Please check and try again.' }
    }

    const { reference_code, email } = parsed.data
    const db = createServiceClient()

    // Use withTiming to wrap the actual lookup
    const { result: lookupResult, duration } = await withTiming(
      async () => {
        // 3. Find profile by email (case-insensitive)
        const { data: profileRow } = await db
          .from('profiles')
          .select('id')
          .ilike('email', email)
          .maybeSingle()

        const profile = profileRow as ProfileIdRow | null
        if (!profile) return null

        // 4. Find the lead by reference_code that belongs to this student.
        //    Both must match in the same row to confirm identity.
        const { data: leadRow } = await db
          .from('leads')
          .select('id, stage, status, student_id')
          .eq('reference_code', reference_code)
          .eq('student_id', profile.id)
          .maybeSingle()

        const lead = leadRow as LeadRow | null
        if (!lead) return null

        // 5. Fetch all pipeline stage labels ordered by sort_order
        const { data: stageRows, error: stageErr } = await db
          .from('pipeline_stage_labels')
          .select('stage, label, sort_order')
          .order('sort_order', { ascending: true })

        if (stageErr || !stageRows) {
          throw new Error('Could not load pipeline stages')
        }

        const stages = (stageRows as StageRow[]).map((s) => ({
          stage:      s.stage,
          label:      s.label,
          sort_order: s.sort_order,
        }))

        // 6. Most recent communication log for this lead
        const { data: commRow } = await db
          .from('communication_logs')
          .select('created_at')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const lastContacted = (commRow as CommRow | null)?.created_at ?? null

        // 7. Documents for this lead
        const { data: docRows } = await db
          .from('documents')
          .select('id, file_name, file_url, status, rejection_reason, created_at')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })

        // Resolve signed URLs for private-bucket paths
        const documents: DocumentRow[] = await Promise.all(
          ((docRows ?? []) as DocRow[]).map(async (d) => {
            let resolvedUrl = d.file_url
            if (d.file_url.startsWith('storage:')) {
              const storagePath = d.file_url.slice('storage:'.length)
              const { data: signed } = await db
                .storage
                .from('documents')
                .createSignedUrl(storagePath, 60 * 60)
              if (signed?.signedUrl) resolvedUrl = signed.signedUrl
            }
            return {
              id:               d.id,
              file_name:        d.file_name,
              file_url:         resolvedUrl,
              status:           d.status as DocumentRow['status'],
              rejection_reason: d.rejection_reason,
              created_at:       d.created_at,
            }
          })
        )

        return {
          lead_id:        lead.id,
          student_id:     lead.student_id,
          current_stage:  lead.stage,
          lead_status:    lead.status,
          stages,
          last_contacted: lastContacted,
          documents,
        }
      },
      'status-lookup',
      'database_query'
    )

    // 8. Check result
    if (!lookupResult) {
      logOperation('status-lookup', 'not_found', {
        ip: clientIp,
        duration,
      })
      
      await enforceMinimumTime(startTime)
      return { status: 'not_found' }
    }

    // 9. Success — log and return
    logOperation('status-lookup', 'success', {
      ip: clientIp,
      lead_id: lookupResult.lead_id,
      duration,
    })

    await enforceMinimumTime(startTime)

    return {
      status: 'success',
      result: lookupResult,
    }
  } catch (err) {
    logError('status-lookup', 'unexpected_error', err, { ip: clientIp })
    
    await enforceMinimumTime(startTime)
    
    return {
      status: 'error',
      message: 'An unexpected error occurred. Please try again.',
    }
  }
}

// ---------------------------------------------------------------------------
// uploadDocument — stores file + metadata with audit logging
//
// Improvements in this version:
// 1. Rate limiting (5 uploads per IP per 15 minutes)
// 2. Input validation with Zod
// 3. Audit logging for compliance
// 4. IP tracking for investigation
// 5. Detailed error tracking
// ---------------------------------------------------------------------------

export async function uploadDocument(
  _prevState: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const startTime = Date.now()
  const clientIp = await getClientIp()

  try {
    // 1. RATE LIMITING
    if (!statusUploadLimiter.check(clientIp)) {
      const resetIn = statusUploadLimiter.getResetIn(clientIp)
      logOperation('status-upload', 'rate_limit_exceeded', {
        ip: clientIp,
        reset_in_seconds: resetIn,
      })
      
      return {
        status: 'error',
        message: `Too many uploads. Please try again in ${resetIn} seconds.`,
      }
    }

    // 2. VALIDATION
    const parsed = parseUploadFormData(formData)
    if (!parsed.success) {
      logOperation('status-upload', 'validation_failed', {
        ip: clientIp,
        errors: parsed.error.issues.map(i => i.code).join(','),
      })
      
      return {
        status: 'error',
        message: 'Invalid file or form data. Please try again.',
      }
    }

    const { lead_id, student_id, file } = parsed.data
    const db = createServiceClient()

    // Use withTiming to wrap the upload process
    const { result: uploadResult, duration } = await withTiming(
      async () => {
        // 3. Verify lead ownership (security check)
        const { data: leadCheck } = await db
          .from('leads')
          .select('id')
          .eq('id', lead_id)
          .eq('student_id', student_id)
          .maybeSingle()

        if (!leadCheck) {
          throw new Error('Lead not found or access denied')
        }

        // 4. Upload to storage
        const ext       = file.name.split('.').pop() ?? 'bin'
        const timestamp = Date.now()
        const storagePath = `leads/${lead_id}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

        const arrayBuffer = await file.arrayBuffer()
        const uint8 = new Uint8Array(arrayBuffer)

        const { data: storageData, error: storageErr } = await db
          .storage
          .from('documents')
          .upload(storagePath, uint8, {
            contentType: file.type,
            upsert:      false,
          })

        if (storageErr || !storageData) {
          throw new Error(`Storage upload failed: ${storageErr?.message}`)
        }

        const file_url = `storage:${storageData.path}`

        // 5. Insert document row
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbw = db as any
        const { data: docRow, error: docErr } = await dbw
          .from('documents')
          .insert({
            lead_id,
            uploaded_by:      student_id,
            file_url,
            file_name:        file.name,
            status:           'pending',
            rejection_reason: null,
          })
          .select('id, file_name, file_url, status, rejection_reason, created_at')
          .single()

        if (docErr || !docRow) {
          // Cleanup orphaned file
          db.storage.from('documents').remove([storagePath])
          throw new Error(`Document insert failed: ${docErr?.message}`)
        }

        const d = docRow as DocRow

        // 6. LOG AUDIT TRAIL
        //    Important: Do this AFTER successful document insert so we have docRow.id
        void dbw
          .from('activity_logs')
          .insert({
            lead_id,
            actor_id:  student_id,
            type:      'document_uploaded',
            content:   JSON.stringify({
              document_id: d.id,
              file_name:   file.name,
              file_size:   file.size,
              mime_type:   file.type,
              ip_address:  clientIp,
            }),
          })
          .then(() => {
            logOperation('status-upload', 'audit_logged', {
              document_id: d.id,
              ip: clientIp,
            })
          })
          .catch((auditErr: unknown) => {
            // Log audit failure but don't fail the upload
            logError('status-upload', 'audit_logging_failed', auditErr, {
              document_id: d.id,
            })
          })

        // 7. Resolve signed URL for the newly uploaded file
        let resolvedUrl = d.file_url
        if (d.file_url.startsWith('storage:')) {
          const { data: signed } = await db
            .storage
            .from('documents')
            .createSignedUrl(d.file_url.slice('storage:'.length), 60 * 60)
          if (signed?.signedUrl) resolvedUrl = signed.signedUrl
        }

        return {
          id:               d.id,
          file_name:        d.file_name,
          file_url:         resolvedUrl,
          status:           d.status as DocumentRow['status'],
          rejection_reason: d.rejection_reason,
          created_at:       d.created_at,
        }
      },
      'status-upload',
      'upload_process'
    )

    // Log success
    logOperation('status-upload', 'success', {
      ip: clientIp,
      document_id: uploadResult.id,
      duration,
    })

    return {
      status:   'success',
      document: uploadResult,
    }
  } catch (err) {
    logError('status-upload', 'unexpected_error', err, { ip: clientIp })
    
    return {
      status: 'error',
      message: 'File upload failed. Please try again.',
    }
  }
}
