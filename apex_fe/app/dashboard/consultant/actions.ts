'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type {
  Lead, Profile, PipelineStageLabel,
  Document, CommunicationLog, LeadStage, LeadStatus,
} from '@/lib/supabase/types'
import type { StageStep, DocumentRow } from '@/app/status/actions'
import type {
  MutationState,
  CommLogEntry,
  ConsultantLeadDetail,
  ConsultantDashboardData,
} from './types'

// ---------------------------------------------------------------------------
// Narrow query-result types
// ---------------------------------------------------------------------------
type LeadRow    = Pick<Lead, 'id' | 'reference_code' | 'stage' | 'status' | 'student_id' | 'notes' | 'created_at' | 'updated_at' | 'stage_entered_at' | 'program_id'>
type StageRow   = Pick<PipelineStageLabel, 'stage' | 'label' | 'sort_order'>
type CommRow    = Pick<CommunicationLog, 'id' | 'lead_id' | 'channel' | 'summary' | 'created_at'>
type DocRow     = Pick<Document, 'id' | 'lead_id' | 'file_name' | 'file_url' | 'status' | 'rejection_reason' | 'created_at'>
type ProfileRow = Pick<Profile, 'id' | 'full_name' | 'email'>
type ProgramRow = { id: string; name: string }

// ---------------------------------------------------------------------------
// getConsultantLeads
// ---------------------------------------------------------------------------

export async function getConsultantLeads(consultantId: string): Promise<ConsultantDashboardData> {
  const authDb = await createClient()
  const svcDb  = createServiceClient()

  const { data: leadRows } = await authDb
    .from('leads')
    .select('id, reference_code, stage, status, student_id, program_id, notes, created_at, updated_at, stage_entered_at')
    .eq('consultant_id', consultantId)
    .order('updated_at', { ascending: false })

  const leads = (leadRows ?? []) as LeadRow[]

  const { data: stageRows } = await svcDb
    .from('pipeline_stage_labels')
    .select('stage, label, sort_order, stall_threshold_hours')
    .order('sort_order', { ascending: true })

  const stages = ((stageRows ?? []) as (StageRow & { stall_threshold_hours: number })[]).map(s => ({
    stage: s.stage, label: s.label, sort_order: s.sort_order, stall_threshold_hours: s.stall_threshold_hours,
  })) satisfies StageStep[]

  // Unread notification count for the bell icon.
  // Uses svcDb (service role) so auth.uid() is not required — we filter
  // explicitly by consultantId. This is consistent with all other cross-table
  // reads in this file and avoids the SSR cookie timing issue with authDb.
  const { count: unreadCount } = await svcDb
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', consultantId)
    .eq('is_read', false)

  const unread_notifications = unreadCount ?? 0

  const stageMap = new Map(stages.map(s => [s.stage, s.label]))

  if (leads.length === 0) return { stages, leads: [], unread_notifications }

  const leadIds    = leads.map(l => l.id)
  const studentIds = [...new Set(leads.map(l => l.student_id))]
  const programIds = [...new Set(leads.map(l => l.program_id).filter(Boolean))]

  // Student profiles
  const { data: profileRows } = await authDb
    .from('profiles')
    .select('id, full_name, email')
    .in('id', studentIds)

  const profileMap = new Map(
    ((profileRows ?? []) as ProfileRow[]).map(p => [p.id, p])
  )

  // Programs — service client because RLS requires authenticated; keep consistent with pattern
  const programMap = new Map<string, string>()
  if (programIds.length > 0) {
    const { data: programRows } = await svcDb
      .from('programs')
      .select('id, name')
      .in('id', programIds)
    for (const p of ((programRows ?? []) as ProgramRow[])) {
      programMap.set(p.id, p.name)
    }
  }

  const { data: commRows } = await svcDb
    .from('communication_logs')
    .select('id, lead_id, channel, summary, created_at')
    .in('lead_id', leadIds)
    .order('created_at', { ascending: false })

  const commMap        = new Map<string, CommLogEntry[]>()
  const lastContactMap = new Map<string, string>()
  for (const row of ((commRows ?? []) as CommRow[])) {
    const list = commMap.get(row.lead_id) ?? []
    list.push({ id: row.id, channel: row.channel, summary: row.summary, created_at: row.created_at })
    commMap.set(row.lead_id, list)
    if (!lastContactMap.has(row.lead_id)) lastContactMap.set(row.lead_id, row.created_at)
  }

  const { data: docRows } = await svcDb
    .from('documents')
    .select('id, lead_id, file_name, file_url, status, rejection_reason, created_at')
    .in('lead_id', leadIds)
    .order('created_at', { ascending: false })

  const resolvedDocs: (DocRow & { resolved_url: string })[] = await Promise.all(
    ((docRows ?? []) as DocRow[]).map(async d => {
      let resolved = d.file_url
      if (d.file_url.startsWith('storage:')) {
        const { data: signed } = await svcDb.storage
          .from('documents')
          .createSignedUrl(d.file_url.slice('storage:'.length), 60 * 60)
        if (signed?.signedUrl) resolved = signed.signedUrl
      }
      return { ...d, resolved_url: resolved }
    })
  )

  const docsMap = new Map<string, DocumentRow[]>()
  for (const d of resolvedDocs) {
    const list = docsMap.get(d.lead_id) ?? []
    list.push({
      id: d.id, file_name: d.file_name, file_url: d.resolved_url,
      status: d.status as DocumentRow['status'],
      rejection_reason: d.rejection_reason, created_at: d.created_at,
    })
    docsMap.set(d.lead_id, list)
  }

  const leadDetails: ConsultantLeadDetail[] = leads.map(l => {
    const p = profileMap.get(l.student_id)
    return {
      id:               l.id,
      reference_code:   l.reference_code,
      stage:            l.stage,
      stage_label:      stageMap.get(l.stage) ?? l.stage,
      status:           l.status,
      notes:            l.notes,
      created_at:       l.created_at,
      updated_at:       l.updated_at,
      stage_entered_at: l.stage_entered_at,
      student_id:       l.student_id,
      student_name:     p?.full_name ?? p?.email ?? 'Unknown',
      student_email:    p?.email ?? '',
      program_name:     programMap.get(l.program_id) ?? '',
      last_contacted:   lastContactMap.get(l.id) ?? null,
      comm_logs:        commMap.get(l.id) ?? [],
      documents:        docsMap.get(l.id) ?? [],
    }
  })

  return { stages, leads: leadDetails, unread_notifications }
}

// ---------------------------------------------------------------------------
// advanceStage — used by LeadCard detail view (existing pattern)
// ---------------------------------------------------------------------------

const STAGE_ORDER: LeadStage[] = [
  'inquiry', 'consultation', 'documents', 'application', 'decision', 'enrolled',
]

export async function advanceStage(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const lead_id       = ((formData.get('lead_id')       as string | null) ?? '').trim()
  const current_stage = ((formData.get('current_stage') as string | null) ?? '').trim() as LeadStage

  if (!lead_id || !current_stage) return { status: 'error', message: 'Missing lead or stage.' }

  const idx = STAGE_ORDER.indexOf(current_stage)
  if (idx === -1 || idx === STAGE_ORDER.length - 1) {
    return { status: 'error', message: 'Lead is already at the final stage.' }
  }

  const next_stage = STAGE_ORDER[idx + 1]
  const authDb = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbw = authDb as any

  const { error } = await dbw
    .from('leads')
    .update({ stage: next_stage, status: 'active' })
    .eq('id', lead_id)

  if (error) {
    console.error('[consultant] advanceStage error:', error)
    return { status: 'error', message: 'Could not advance stage. Please try again.' }
  }

  revalidatePath('/dashboard/consultant')
  return { status: 'success' }
}

// ---------------------------------------------------------------------------
// advanceStageKanban — called by Kanban drag-drop; enforces forward-only moves
// ---------------------------------------------------------------------------

export async function advanceStageKanban(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const lead_id    = ((formData.get('lead_id')    as string | null) ?? '').trim()
  const from_stage = ((formData.get('from_stage') as string | null) ?? '').trim() as LeadStage
  const to_stage   = ((formData.get('to_stage')   as string | null) ?? '').trim() as LeadStage

  if (!lead_id || !from_stage || !to_stage) {
    return { status: 'error', message: 'Missing required fields.' }
  }

  const fromIdx = STAGE_ORDER.indexOf(from_stage)
  const toIdx   = STAGE_ORDER.indexOf(to_stage)

  if (fromIdx === -1 || toIdx === -1) {
    return { status: 'error', message: 'Invalid stage value.' }
  }

  // Backward moves are not permitted via drag — Lead Detail only
  if (toIdx <= fromIdx) {
    return { status: 'error', message: 'Backward stage moves must be done from the Lead Detail view.' }
  }

  // Only allow advancing one step at a time via drag
  if (toIdx !== fromIdx + 1) {
    return { status: 'error', message: 'You can only drag a lead to the next stage.' }
  }

  const authDb = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbw = authDb as any

  const { error } = await dbw
    .from('leads')
    .update({ stage: to_stage, status: 'active' })
    .eq('id', lead_id)

  if (error) {
    console.error('[consultant] advanceStageKanban error:', error)
    return { status: 'error', message: 'Could not move lead. Please try again.' }
  }

  revalidatePath('/dashboard/consultant')
  return { status: 'success' }
}

// ---------------------------------------------------------------------------
// updateLeadStatus
// ---------------------------------------------------------------------------

export async function updateLeadStatus(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const lead_id = ((formData.get('lead_id') as string | null) ?? '').trim()
  const status  = ((formData.get('status')  as string | null) ?? '').trim() as LeadStatus

  if (!lead_id || !['stalled', 'completed', 'dropped', 'active'].includes(status)) {
    return { status: 'error', message: 'Invalid status.' }
  }

  const authDb = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbw = authDb as any

  const { error } = await dbw.from('leads').update({ status }).eq('id', lead_id)
  if (error) {
    console.error('[consultant] updateLeadStatus error:', error)
    return { status: 'error', message: 'Could not update status. Please try again.' }
  }

  revalidatePath('/dashboard/consultant')
  return { status: 'success' }
}

// ---------------------------------------------------------------------------
// logCommunication
// ---------------------------------------------------------------------------

export async function logCommunication(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const lead_id = ((formData.get('lead_id') as string | null) ?? '').trim()
  const channel = ((formData.get('channel') as string | null) ?? '').trim()
  const summary = ((formData.get('summary') as string | null) ?? '').trim()

  if (!lead_id) return { status: 'error', message: 'Missing lead.' }
  if (!['call', 'email', 'whatsapp', 'in_person'].includes(channel)) {
    return { status: 'error', message: 'Select a valid channel.' }
  }
  if (!summary) return { status: 'error', message: 'Summary is required.' }
  if (summary.length > 1000) return { status: 'error', message: 'Summary must be 1000 characters or fewer.' }

  const authDb = await createClient()
  const { data: { user } } = await authDb.auth.getUser()
  if (!user) return { status: 'error', message: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbw = authDb as any
  const { error } = await dbw.from('communication_logs').insert({
    lead_id,
    actor_id: user.id,
    channel,
    summary,
  })

  if (error) {
    console.error('[consultant] logCommunication error:', error)
    return { status: 'error', message: 'Could not save communication log. Please try again.' }
  }

  revalidatePath('/dashboard/consultant')
  return { status: 'success' }
}

// ---------------------------------------------------------------------------
// reviewDocument
// ---------------------------------------------------------------------------

export async function reviewDocument(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const doc_id           = ((formData.get('doc_id')           as string | null) ?? '').trim()
  const action           = ((formData.get('action')           as string | null) ?? '').trim()
  const rejection_reason = ((formData.get('rejection_reason') as string | null) ?? '').trim() || null

  if (!doc_id) return { status: 'error', message: 'Missing document.' }
  if (!['approved', 'rejected'].includes(action)) {
    return { status: 'error', message: 'Action must be approved or rejected.' }
  }
  if (action === 'rejected' && !rejection_reason) {
    return { status: 'error', message: 'Provide a rejection reason.' }
  }

  const authDb = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbw = authDb as any

  const { error } = await dbw.from('documents').update({
    status:           action,
    rejection_reason: action === 'rejected' ? rejection_reason : null,
  }).eq('id', doc_id)

  if (error) {
    console.error('[consultant] reviewDocument error:', error)
    return { status: 'error', message: 'Could not update document. Please try again.' }
  }

  revalidatePath('/dashboard/consultant')
  return { status: 'success' }
}

// ---------------------------------------------------------------------------
// getLeadCardData — Phase 7
// Fetches the minimal denormalized shape for a SINGLE lead so the Kanban
// board can patch its local state after a Realtime event fires.
// Returns null if the lead is not found (e.g. it was re-assigned away).
// ---------------------------------------------------------------------------

export async function getLeadCardData(leadId: string): Promise<ConsultantLeadDetail | null> {
  if (!leadId) return null

  const authDb = await createClient()
  const svcDb  = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbr = authDb as any

  const { data: leadRow, error } = await dbr
    .from('leads')
    .select('id, reference_code, stage, status, student_id, program_id, notes, created_at, updated_at, stage_entered_at')
    .eq('id', leadId)
    .single()

  // Lead not found or no longer accessible by this consultant (RLS blocked).
  if (error || !leadRow) return null

  const lead = leadRow as LeadRow

  // Stage labels
  const { data: stageRows } = await svcDb
    .from('pipeline_stage_labels')
    .select('stage, label, sort_order, stall_threshold_hours')
    .order('sort_order', { ascending: true })
  const stages   = (stageRows ?? []) as (StageRow & { stall_threshold_hours: number })[]
  const stageMap = new Map(stages.map(s => [s.stage, s.label]))

  // Student profile
  const { data: profileRow } = await authDb
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', lead.student_id)
    .single()
  const profile = profileRow as ProfileRow | null

  // Program name
  let programName = ''
  if (lead.program_id) {
    const { data: programRow } = await svcDb
      .from('programs')
      .select('id, name')
      .eq('id', lead.program_id)
      .single()
    if (programRow) programName = (programRow as ProgramRow).name
  }

  // Most recent communication logs
  const { data: commRows } = await svcDb
    .from('communication_logs')
    .select('id, lead_id, channel, summary, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  const comms = (commRows ?? []) as CommRow[]
  const commLogs: CommLogEntry[] = comms.map(c => ({
    id: c.id, channel: c.channel, summary: c.summary, created_at: c.created_at,
  }))
  const lastContacted = comms[0]?.created_at ?? null

  // Documents
  const { data: docRows } = await svcDb
    .from('documents')
    .select('id, lead_id, file_name, file_url, status, rejection_reason, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  const resolvedDocs = await Promise.all(
    ((docRows ?? []) as DocRow[]).map(async d => {
      let resolved = d.file_url
      if (d.file_url.startsWith('storage:')) {
        const { data: signed } = await svcDb.storage
          .from('documents')
          .createSignedUrl(d.file_url.slice('storage:'.length), 60 * 60)
        if (signed?.signedUrl) resolved = signed.signedUrl
      }
      return { ...d, resolved_url: resolved }
    })
  )

  const documents: import('@/app/status/actions').DocumentRow[] = resolvedDocs.map(d => ({
    id:               d.id,
    file_name:        d.file_name,
    file_url:         d.resolved_url,
    status:           d.status as import('@/app/status/actions').DocumentRow['status'],
    rejection_reason: d.rejection_reason,
    created_at:       d.created_at,
  }))

  return {
    id:               lead.id,
    reference_code:   lead.reference_code,
    stage:            lead.stage,
    stage_label:      stageMap.get(lead.stage) ?? lead.stage,
    status:           lead.status,
    notes:            lead.notes,
    created_at:       lead.created_at,
    updated_at:       lead.updated_at,
    stage_entered_at: lead.stage_entered_at,
    student_id:       lead.student_id,
    student_name:     profile?.full_name ?? profile?.email ?? 'Unknown',
    student_email:    profile?.email ?? '',
    program_name:     programName,
    last_contacted:   lastContacted,
    comm_logs:        commLogs,
    documents,
  }
}
