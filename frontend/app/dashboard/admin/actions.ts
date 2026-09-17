'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Lead, Profile, PipelineStageLabel } from '@/lib/supabase/types'
import type {
  AssignState,
  AdminLeadRow,
  ConsultantOption,
  AdminLeadsData,
} from './types'

// ---------------------------------------------------------------------------
// Narrow query-result types
// ---------------------------------------------------------------------------
type LeadRow    = Pick<Lead, 'id' | 'reference_code' | 'stage' | 'status' | 'student_id' | 'consultant_id' | 'created_at' | 'updated_at'>
type StageRow   = Pick<PipelineStageLabel, 'stage' | 'label' | 'sort_order'>
type ProfileRow = Pick<Profile, 'id' | 'full_name' | 'email'>

// ---------------------------------------------------------------------------
// getAdminLeads
// ---------------------------------------------------------------------------

export async function getAdminLeads(): Promise<AdminLeadsData> {
  const authDb = await createClient()
  const svcDb  = createServiceClient()

  const { data: leadRows } = await authDb
    .from('leads')
    .select('id, reference_code, stage, status, student_id, consultant_id, created_at, updated_at')
    .order('updated_at', { ascending: false })

  const leads = (leadRows ?? []) as LeadRow[]

  // Stage labels with stall_threshold_hours for the pipeline table
  const { data: stageRows } = await svcDb
    .from('pipeline_stage_labels')
    .select('stage, label, sort_order, stall_threshold_hours')
    .order('sort_order', { ascending: true })

  const stages = ((stageRows ?? []) as (StageRow & { stall_threshold_hours: number })[]).map(s => ({
    stage: s.stage,
    label: s.label,
    sort_order: s.sort_order,
    stall_threshold_hours: s.stall_threshold_hours,
  }))

  const stageMap = new Map(stages.map(s => [s.stage, s.label]))

  // All referenced profiles in one query
  const allIds = [...new Set([
    ...leads.map(l => l.student_id),
    ...leads.filter(l => l.consultant_id).map(l => l.consultant_id as string),
  ])]

  const profileMap = new Map<string, ProfileRow>()
  if (allIds.length > 0) {
    const { data: profileRows } = await authDb
      .from('profiles')
      .select('id, full_name, email')
      .in('id', allIds)
    for (const p of ((profileRows ?? []) as ProfileRow[])) {
      profileMap.set(p.id, p)
    }
  }

  // All consultant profiles with capacity fields
  const { data: consultantRows } = await authDb
    .from('profiles')
    .select('id, full_name, email, is_accepting_leads, max_lead_capacity')
    .eq('role', 'consultant')
    .order('full_name')

  type ConsultantRow = Pick<Profile, 'id' | 'full_name' | 'email' | 'is_accepting_leads' | 'max_lead_capacity'>
  const allConsultants = (consultantRows ?? []) as ConsultantRow[]

  // Count open (active+stalled) leads per consultant
  const openCountMap = new Map<string, number>()
  for (const l of leads) {
    if (l.consultant_id && (l.status === 'active' || l.status === 'stalled')) {
      openCountMap.set(l.consultant_id, (openCountMap.get(l.consultant_id) ?? 0) + 1)
    }
  }

  const consultants: ConsultantOption[] = allConsultants.map(c => ({
    id:                 c.id,
    name:               c.full_name ?? c.email,
    email:              c.email,
    is_accepting_leads: c.is_accepting_leads,
    open_leads:         openCountMap.get(c.id) ?? 0,
    max_lead_capacity:  c.max_lead_capacity,
  }))

  const adminLeads: AdminLeadRow[] = leads.map(l => {
    const student    = profileMap.get(l.student_id)
    const consultant = l.consultant_id ? profileMap.get(l.consultant_id) : null
    return {
      id:              l.id,
      reference_code:  l.reference_code,
      stage:           l.stage,
      stage_label:     stageMap.get(l.stage) ?? l.stage,
      status:          l.status,
      created_at:      l.created_at,
      updated_at:      l.updated_at,
      student_id:      l.student_id,
      student_name:    student?.full_name ?? student?.email ?? 'Unknown',
      student_email:   student?.email ?? '',
      consultant_id:   l.consultant_id ?? null,
      consultant_name: consultant?.full_name ?? consultant?.email ?? null,
    }
  })

  return { stages, leads: adminLeads, consultants }
}

// ---------------------------------------------------------------------------
// assignConsultant
// ---------------------------------------------------------------------------

export async function assignConsultant(
  _prev: AssignState,
  formData: FormData,
): Promise<AssignState> {
  const lead_id       = ((formData.get('lead_id')       as string | null) ?? '').trim()
  const consultant_id = ((formData.get('consultant_id') as string | null) ?? '').trim() || null

  if (!lead_id) return { status: 'error', message: 'Missing lead.' }

  const authDb = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbw = authDb as any

  const { error } = await dbw
    .from('leads')
    .update({ consultant_id: consultant_id ?? null })
    .eq('id', lead_id)

  if (error) {
    console.error('[admin] assignConsultant error:', error)
    return { status: 'error', message: 'Could not assign consultant. Please try again.' }
  }

  let consultant_name: string | null = null
  if (consultant_id) {
    const { data: pRow } = await authDb
      .from('profiles')
      .select('full_name, email')
      .eq('id', consultant_id)
      .single()
    const p = pRow as Pick<Profile, 'full_name' | 'email'> | null
    consultant_name = p?.full_name ?? p?.email ?? null
  }

  revalidatePath('/dashboard/admin')
  return { status: 'success', consultant_id, consultant_name }
}

// ---------------------------------------------------------------------------
// getAdminLeadRow — Phase 7
// Re-fetches the minimal denormalized AdminLeadRow for a single lead so
// LeadAssignList can patch its local state after a Realtime event.
// Returns null if the lead is not found (deleted or RLS blocked).
// ---------------------------------------------------------------------------

export async function getAdminLeadRow(leadId: string): Promise<AdminLeadRow | null> {
  if (!leadId) return null

  const authDb = await createClient()
  const svcDb  = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbr = authDb as any

  const { data: leadRow, error } = await dbr
    .from('leads')
    .select('id, reference_code, stage, status, student_id, consultant_id, created_at, updated_at')
    .eq('id', leadId)
    .single()

  if (error || !leadRow) return null
  const lead = leadRow as LeadRow

  // Stage label
  const { data: stageRows } = await svcDb
    .from('pipeline_stage_labels')
    .select('stage, label, sort_order')
    .order('sort_order', { ascending: true })
  const stageMap = new Map(
    ((stageRows ?? []) as StageRow[]).map(s => [s.stage, s.label])
  )

  // Student + consultant profiles
  const ids = [lead.student_id, lead.consultant_id].filter((id): id is string => !!id)
  const profileMap = new Map<string, ProfileRow>()
  if (ids.length > 0) {
    const { data: profileRows } = await authDb
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ids)
    for (const p of ((profileRows ?? []) as ProfileRow[])) {
      profileMap.set(p.id, p)
    }
  }

  const student    = profileMap.get(lead.student_id)
  const consultant = lead.consultant_id ? profileMap.get(lead.consultant_id) : null

  return {
    id:              lead.id,
    reference_code:  lead.reference_code,
    stage:           lead.stage,
    stage_label:     stageMap.get(lead.stage) ?? lead.stage,
    status:          lead.status,
    created_at:      lead.created_at,
    updated_at:      lead.updated_at,
    student_id:      lead.student_id,
    student_name:    student?.full_name ?? student?.email ?? 'Unknown',
    student_email:   student?.email ?? '',
    consultant_id:   lead.consultant_id ?? null,
    consultant_name: consultant?.full_name ?? consultant?.email ?? null,
  }
}

// ---------------------------------------------------------------------------
// getEscalatedStalls — TASK #2
// Fetches leads where: status='stalled' AND stalled_since > threshold + escalation_threshold
// For now, we calculate this on the client since we don't have a stalled_since column yet.
// In production, this would be a single SQL query on the server.
// ---------------------------------------------------------------------------

export async function getEscalatedStalls(
  leadIds: string[],
  stages: Array<{ stage: string; label: string; stall_threshold_hours: number }>,
): Promise<AdminLeadRow[]> {
  if (leadIds.length === 0) return []

  const authDb = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbr = authDb as any

  // Fetch all leads
  const { data: leadRows } = await dbr
    .from('leads')
    .select('id, reference_code, stage, status, student_id, consultant_id, created_at, updated_at, stalled_at')
    .in('id', leadIds)

  const leads = (leadRows ?? []) as Array<LeadRow & { stalled_at: string | null }>

  // Filter to stalled leads
  const stalledLeads = leads.filter(l => l.status === 'stalled' && l.stalled_at)

  if (stalledLeads.length === 0) return []

  // Find which are past escalation threshold
  const now = new Date()
  const stageThresholdMap = new Map(stages.map(s => [s.stage, s.stall_threshold_hours || 24]))

  const escalatedLeadIds = stalledLeads
    .filter(l => {
      const stalledTime = new Date(l.stalled_at!)
      const hoursSince = (now.getTime() - stalledTime.getTime()) / (1000 * 60 * 60)
      const threshold = stageThresholdMap.get(l.stage) || 24
      // Escalation threshold is threshold + 4 hours (for most stages)
      const escalationThreshold = threshold + 4
      return hoursSince > escalationThreshold
    })
    .map(l => l.id)

  if (escalatedLeadIds.length === 0) return []

  // Fetch full details for escalated leads
  const { data: escalatedRows } = await dbr
    .from('leads')
    .select('id, reference_code, stage, status, student_id, consultant_id, created_at, updated_at')
    .in('id', escalatedLeadIds)

  const stageMap = new Map(stages.map(s => [s.stage, s.label]))

  // Fetch all profiles
  const escalatedLeads = (escalatedRows ?? []) as LeadRow[]
  const allIds = [...new Set([
    ...escalatedLeads.map(l => l.student_id),
    ...escalatedLeads.filter(l => l.consultant_id).map(l => l.consultant_id as string),
  ])]

  const profileMap = new Map<string, ProfileRow>()
  if (allIds.length > 0) {
    const { data: profileRows } = await authDb
      .from('profiles')
      .select('id, full_name, email')
      .in('id', allIds)
    for (const p of ((profileRows ?? []) as ProfileRow[])) {
      profileMap.set(p.id, p)
    }
  }

  return escalatedLeads.map(l => {
    const student = profileMap.get(l.student_id)
    const consultant = l.consultant_id ? profileMap.get(l.consultant_id) : null
    return {
      id: l.id,
      reference_code: l.reference_code,
      stage: l.stage,
      stage_label: stageMap.get(l.stage) ?? l.stage,
      status: l.status,
      created_at: l.created_at,
      updated_at: l.updated_at,
      student_id: l.student_id,
      student_name: student?.full_name ?? student?.email ?? 'Unknown',
      student_email: student?.email ?? '',
      consultant_id: l.consultant_id ?? null,
      consultant_name: consultant?.full_name ?? consultant?.email ?? null,
    }
  })
}
