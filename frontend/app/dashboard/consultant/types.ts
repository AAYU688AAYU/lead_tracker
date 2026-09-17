/**
 * Types and initial state constants for the consultant dashboard.
 * Lives in a separate file (not 'use server') so they can be imported
 * by both the server actions file and client components.
 */

export type MutationState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success' }

export const INITIAL_MUTATION_STATE: MutationState = { status: 'idle' }

export interface CommLogEntry {
  id:         string
  channel:    string
  summary:    string
  created_at: string
}

export interface ConsultantLeadDetail {
  id:               string
  reference_code:   string
  stage:            string
  stage_label:      string
  status:           string
  notes:            string | null
  created_at:       string
  updated_at:       string
  /** ISO timestamp — set by DB trigger only when stage changes */
  stage_entered_at: string
  student_id:       string
  student_name:     string
  student_email:    string
  /** Populated by joining programs; empty string if program not found */
  program_name:     string
  last_contacted:   string | null
  comm_logs:        CommLogEntry[]
  documents:        import('@/app/status/actions').DocumentRow[]
}

export interface ConsultantDashboardData {
  stages: (import('@/app/status/actions').StageStep & { stall_threshold_hours?: number })[]
  leads:  ConsultantLeadDetail[]
  /** Unread notification count for the bell icon */
  unread_notifications: number
}
