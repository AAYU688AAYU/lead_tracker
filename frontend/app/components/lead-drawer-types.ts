/**
 * Types for the Phase 5 Lead Detail Drawer.
 * Kept in a separate non-'use server' file so they can be imported
 * by both server action files and client components.
 */

import type { StageStep, DocumentRow } from '@/app/status/types'

// ---------------------------------------------------------------------------
// Full lead shape for the drawer — superset of ConsultantLeadDetail
// ---------------------------------------------------------------------------

export interface LeadDetailFull {
  id:               string
  reference_code:   string
  stage:            string
  stage_label:      string
  status:           string
  notes:            string | null
  created_at:       string
  updated_at:       string
  stage_entered_at: string
  student_id:       string
  student_name:     string
  student_email:    string
  student_phone:    string | null
  program_name:     string
  consultant_id:    string | null
  consultant_name:  string | null
  last_contacted:   string | null
  stages:           StageStep[]
  documents:        DocumentRow[]
  timeline:         TimelineEntry[]
}

// ---------------------------------------------------------------------------
// Activity timeline entry — merged from activity_logs + communication_logs
// ---------------------------------------------------------------------------

export interface TimelineEntry {
  id:         string
  /** 'activity' or 'communication' */
  kind:       'activity' | 'communication'
  /** activity_logs.type OR communication_logs.channel */
  type:       string
  content:    string
  actor_name: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Mutation state — returned by all drawer server actions
// ---------------------------------------------------------------------------

export type DrawerMutationState =
  | { status: 'idle' }
  | { status: 'error';   message: string }
  | { status: 'success'; next_stage?: string; doc_id?: string; new_doc_status?: 'approved' | 'rejected'; consultant_id?: string | null; consultant_name?: string | null; new_comm_entry?: { id: string; channel: string; summary: string; created_at: string; actor_name: string } }

export const INITIAL_DRAWER_STATE: DrawerMutationState = { status: 'idle' }

// ---------------------------------------------------------------------------
// Consultant option for the reassign select (passed from admin page)
// ---------------------------------------------------------------------------

export interface ConsultantSelectOption {
  id:                 string
  name:               string
  is_accepting_leads: boolean
  open_leads:         number
  max_lead_capacity:  number | null
}
