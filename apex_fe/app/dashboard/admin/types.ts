/**
 * Types and initial state constants for the admin dashboard.
 * Lives in a separate file (not 'use server') so they can be imported
 * by both the server actions file and client components.
 */

import type { StageStep } from '@/app/status/actions'

export type AssignState =
  | { status: 'idle' }
  | { status: 'error';   message: string }
  | { status: 'success'; consultant_id: string | null; consultant_name: string | null }

export const INITIAL_ASSIGN_STATE: AssignState = { status: 'idle' }

export interface AdminLeadRow {
  id:               string
  reference_code:   string
  stage:            string
  stage_label:      string
  status:           string
  created_at:       string
  updated_at:       string
  student_id:       string
  student_name:     string
  student_email:    string
  consultant_id:    string | null
  consultant_name:  string | null
}

export interface ConsultantOption {
  id:                 string
  name:               string
  email:              string
  is_accepting_leads: boolean
  open_leads:         number
  max_lead_capacity:  number | null
}

export interface AdminLeadsData {
  stages:      StageStep[]
  leads:       AdminLeadRow[]
  consultants: ConsultantOption[]
}

// ---------------------------------------------------------------------------
// Phase 6 — Team screen
// ---------------------------------------------------------------------------

export interface TeamConsultantRow {
  id:                 string
  full_name:          string
  email:              string
  is_accepting_leads: boolean
  max_lead_capacity:  number | null
  active_leads:       number   // status = 'active'
  stalled_leads:      number   // status = 'stalled'
  /** leads with status 'completed' for this consultant */
  completed_leads:    number
  /** conversion rate: completed / (active + stalled + completed + dropped) */
  conversion_rate:    number   // 0–1
}

export type ToggleAcceptingState =
  | { status: 'idle' }
  | { status: 'error';   message: string }
  | { status: 'success'; consultant_id: string; is_accepting_leads: boolean }

export const INITIAL_TOGGLE_STATE: ToggleAcceptingState = { status: 'idle' }

export type OffboardState =
  | { status: 'idle' }
  | { status: 'error';   message: string }
  | { status: 'success'; moved: number }

export const INITIAL_OFFBOARD_STATE: OffboardState = { status: 'idle' }

// ---------------------------------------------------------------------------
// Phase 6 — Pipeline Settings screen
// ---------------------------------------------------------------------------

export interface PipelineStageRow {
  stage:                 string
  label:                 string
  sort_order:            number
  stall_threshold_hours: number
}

export type SaveFieldState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved';  field: string }
  | { status: 'error';  field: string; message: string }

export const INITIAL_SAVE_FIELD_STATE: SaveFieldState = { status: 'idle' }

// ---------------------------------------------------------------------------
// Phase 6 — Analytics screen
// ---------------------------------------------------------------------------

export interface StageCounts {
  stage:       string
  label:       string
  sort_order:  number
  count:       number  // current live count of active+stalled leads in this stage
}

export interface AnalyticsData {
  stageCounts:      StageCounts[]
  totalCreated:     number   // within date range
  enrolledCount:    number   // leads reaching 'enrolled' within date range
  conversionRate:   number   // enrolledCount / totalCreated, or 0 if none
  consultants:      Array<{ id: string; name: string }>  // for the filter dropdown
}
