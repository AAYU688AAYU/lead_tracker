'use server'

import { createServiceClient } from '@/lib/supabase/service'
import type { Lead, PipelineStageLabel, Document, CommunicationLog, Profile } from '@/lib/supabase/types'
import type {
  StageStep, DocumentRow, LookupResult, LookupState, UploadState,
} from './types'

// Re-export types so existing imports of these from 'actions' keep working
// (type-only re-exports are fine in a 'use server' file — they vanish at runtime)
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
// Uses the service-role client because anon has no SELECT on leads/profiles.
// On no match a single generic message is returned — never indicate which
// field was wrong to avoid leaking whether an email exists in the system.
// ---------------------------------------------------------------------------

export async function lookupApplication(
  _prevState: LookupState,
  formData: FormData,
): Promise<LookupState> {
  const reference_code = ((formData.get('reference_code') as string | null) ?? '').trim().toUpperCase()
  const email          = ((formData.get('email')          as string | null) ?? '').trim().toLowerCase()

  // Basic presence check — do NOT indicate which field is missing
  if (!reference_code || !email) {
    return { status: 'not_found' }
  }

  const db = createServiceClient()

  try {
    // 1. Find profile by email (case-insensitive)
    const { data: profileRow } = await db
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle()

    const profile = profileRow as ProfileIdRow | null
    if (!profile) return { status: 'not_found' }

    // 2. Find the lead by reference_code that belongs to this student.
    //    We deliberately do NOT run separate queries for reference_code and
    //    student_id — both must match in the same row to confirm identity.
    const { data: leadRow } = await db
      .from('leads')
      .select('id, stage, status, student_id')
      .eq('reference_code', reference_code)
      .eq('student_id', profile.id)
      .maybeSingle()

    const lead = leadRow as LeadRow | null
    if (!lead) return { status: 'not_found' }

    // 3. Fetch all pipeline stage labels ordered by sort_order
    const { data: stageRows, error: stageErr } = await db
      .from('pipeline_stage_labels')
      .select('stage, label, sort_order')
      .order('sort_order', { ascending: true })

    if (stageErr || !stageRows) {
      console.error('[status] pipeline_stage_labels fetch error:', stageErr)
      return { status: 'error', message: 'Could not load application data. Please try again.' }
    }

    const stages = (stageRows as StageRow[]).map((s) => ({
      stage:      s.stage,
      label:      s.label,
      sort_order: s.sort_order,
    }))

    // 4. Most recent communication log for this lead
    const { data: commRow } = await db
      .from('communication_logs')
      .select('created_at')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastContacted = (commRow as CommRow | null)?.created_at ?? null

    // 5. Documents for this lead — show file_name, status, rejection_reason
    const { data: docRows } = await db
      .from('documents')
      .select('id, file_name, file_url, status, rejection_reason, created_at')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })

    // Resolve signed URLs for private-bucket paths (prefixed with "storage:")
    const documents: DocumentRow[] = await Promise.all(
      ((docRows ?? []) as DocRow[]).map(async (d) => {
        let resolvedUrl = d.file_url
        if (d.file_url.startsWith('storage:')) {
          const storagePath = d.file_url.slice('storage:'.length)
          const { data: signed } = await db
            .storage
            .from('documents')
            .createSignedUrl(storagePath, 60 * 60) // 1-hour expiry
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
      status: 'success',
      result: {
        lead_id:        lead.id,
        student_id:     lead.student_id,
        current_stage:  lead.stage,
        lead_status:    lead.status,
        stages,
        last_contacted: lastContacted,
        documents,
      },
    }
  } catch (err) {
    console.error('[status] lookupApplication unexpected error:', err)
    return { status: 'error', message: 'An unexpected error occurred. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// uploadDocument — inserts a document row and stores the file in Supabase
// Storage bucket "documents". Accepts FormData with: lead_id, student_id,
// and the file itself.
// ---------------------------------------------------------------------------

const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const MAX_BYTES     = 10 * 1024 * 1024  // 10MB

export async function uploadDocument(
  _prevState: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const lead_id    = ((formData.get('lead_id')    as string | null) ?? '').trim()
  const student_id = ((formData.get('student_id') as string | null) ?? '').trim()
  const file       = formData.get('file') as File | null

  // Validate required fields (server-side guard — client also validates)
  if (!lead_id || !student_id) {
    return { status: 'error', message: 'Session expired. Please look up your application again.' }
  }

  if (!file || file.size === 0) {
    return { status: 'error', message: 'Please select a file to upload.' }
  }

  // Type check
  if (!ALLOWED_MIME.has(file.type)) {
    return { status: 'error', message: 'Only PDF, JPG, and PNG files are accepted.' }
  }

  // Size check
  if (file.size > MAX_BYTES) {
    return { status: 'error', message: 'File must be 10MB or smaller.' }
  }

  const db  = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbw = db as any

  try {
    // Verify the lead still exists and belongs to this student (prevents
    // forged lead_id/student_id pairs from writing documents to other leads)
    const { data: leadCheck } = await db
      .from('leads')
      .select('id')
      .eq('id', lead_id)
      .eq('student_id', student_id)
      .maybeSingle()

    if (!leadCheck) {
      return { status: 'error', message: 'Application not found. Please look up your application again.' }
    }

    // Upload to Supabase Storage
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
      console.error('[status] storage upload error:', storageErr)
      return { status: 'error', message: 'File upload failed. Please try again.' }
    }

    // The bucket is private. Store the storage path as file_url so it can be
    // used to generate short-lived signed URLs when the student views their
    // document list. We prefix with "storage:" to distinguish paths from
    // any legacy absolute URLs that may already exist.
    const file_url = `storage:${storageData.path}`

    // Insert document row
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
      console.error('[status] documents insert error:', docErr)
      // Best-effort cleanup — don't block on the result
      db.storage.from('documents').remove([storageData.path])
      return { status: 'error', message: 'Could not save your document. Please try again.' }
    }

    const d = docRow as DocRow

    // Resolve a 1-hour signed URL for the newly uploaded file so the client
    // can link to it immediately without a separate round-trip.
    let resolvedUrl = d.file_url
    if (d.file_url.startsWith('storage:')) {
      const { data: signed } = await db
        .storage
        .from('documents')
        .createSignedUrl(d.file_url.slice('storage:'.length), 60 * 60)
      if (signed?.signedUrl) resolvedUrl = signed.signedUrl
    }

    return {
      status:   'success',
      document: {
        id:               d.id,
        file_name:        d.file_name,
        file_url:         resolvedUrl,
        status:           d.status as DocumentRow['status'],
        rejection_reason: d.rejection_reason,
        created_at:       d.created_at,
      },
    }
  } catch (err) {
    console.error('[status] uploadDocument unexpected error:', err)
    return { status: 'error', message: 'An unexpected error occurred. Please try again.' }
  }
}
