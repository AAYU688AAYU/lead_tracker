/**
 * Shared types and initial state constants for the /status feature.
 * Kept separate from actions.ts because 'use server' files may only
 * export async functions — not objects, constants, or interfaces.
 *
 * Imported by: status/actions.ts, status/status-client.tsx,
 * components/lead-detail.tsx, and all dashboard modules that reference
 * StageStep or DocumentRow.
 */

// ---------------------------------------------------------------------------
// Pipeline stage step (shared across all three dashboards and /status)
// ---------------------------------------------------------------------------

export interface StageStep {
  stage:                 string
  label:                 string
  sort_order:            number
  stall_threshold_hours?: number  // populated by admin queries that fetch the full label row
}

// ---------------------------------------------------------------------------
// Document row (resolved — file_url is always a usable URL, never raw storage path)
// ---------------------------------------------------------------------------

export interface DocumentRow {
  id:               string
  file_name:        string
  file_url:         string
  status:           'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  created_at:       string
}

// ---------------------------------------------------------------------------
// Lookup action types
// ---------------------------------------------------------------------------

export interface LookupResult {
  lead_id:        string
  student_id:     string
  current_stage:  string
  lead_status:    string
  stages:         StageStep[]
  last_contacted: string | null
  documents:      DocumentRow[]
}

export type LookupState =
  | { status: 'idle' }
  | { status: 'not_found' }
  | { status: 'error';   message: string }
  | { status: 'success'; result: LookupResult }

export const INITIAL_LOOKUP_STATE: LookupState = { status: 'idle' }

// ---------------------------------------------------------------------------
// Upload action types
// ---------------------------------------------------------------------------

export type UploadState =
  | { status: 'idle' }
  | { status: 'error';   message: string }
  | { status: 'success'; document: DocumentRow }

export const INITIAL_UPLOAD_STATE: UploadState = { status: 'idle' }

// ---------------------------------------------------------------------------
// Upload progress tracking (client-side, not persisted)
// ---------------------------------------------------------------------------

export interface UploadProgress {
  isUploading: boolean
  progress:    number       // 0-100
  loaded:      number       // bytes
  total:       number       // bytes
}

export const INITIAL_UPLOAD_PROGRESS: UploadProgress = {
  isUploading: false,
  progress:    0,
  loaded:      0,
  total:       0,
}
