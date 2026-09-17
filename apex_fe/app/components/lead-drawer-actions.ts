'use server'

/**
 * Server actions for the Phase 5 Lead Detail Drawer.
 * Used by both consultant and admin drawer instances.
 *
 * All write actions call revalidatePath for the calling dashboard so the
 * board/list behind the drawer reflects changes when the drawer closes.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type {
  Lead,
  Profile,
  Document,
  ActivityLog,
  CommunicationLog,
  PipelineStageLabel,
  LeadStage,
} from '@/lib/supabase/types'
import type { DocumentRow } from '@/app/status/types'
import type { DrawerMutationState, TimelineEntry, LeadDetailFull } from './lead-drawer-types'

// ---------------------------------------------------------------------------
// Narrow internal types
// ---------------------------------------------------------------------------
type LeadRow    = Pick<Lead,    'id' | 'reference_code' | 'stage' | 'status' | 'notes' | 'stage_entered_at' | 'student_id' | 'consultant_id' | 'program_id' | 'created_at' | 'updated_at'>
type StageRow   = Pick<PipelineStageLabel, 'stage' | 'label' | 'sort_order'>
type ProfileRow = Pick<Profile, 'id' | 'full_name' | 'email' | 'phone'>
type DocRow     = Pick<Document,'id' | 'file_name' | 'file_url' | 'status' | 'rejection_reason' | 'created_at'>
type ActRow     = Pick<ActivityLog,    'id' | 'type' | 'content' | 'actor_id' | 'created_at'>
type CommRow    = Pick<CommunicationLog,'id' | 'channel' | 'summary' | 'actor_id' | 'created_at'>
type ProgramRow = { id: string; name: string }

// ---------------------------------------------------------------------------
// getLeadDetail — full denormalised lead for the drawer
// ---------------------------------------------------------------------------

export async function getLeadDetail(leadId: string): Promise<LeadDetailFull | null> {
  if (!leadId) return null

  const authDb = await createClient()
  const svcDb  = createServiceClient()

  // Lead row — auth client enforces RLS (consultant sees only own leads, admin sees all)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbr = authDb as any
  const { data: leadRow, error: leadErr } = await dbr
    .from('leads')
    .select('id, reference_code, stage, status, notes, stage_entered_at, student_id, consultant_id, program_id, created_at, updated_at')
    .eq('id', leadId)
    .single()

  if (leadErr || !leadRow) {
    console.error('[drawer] getLeadDetail lead error:', leadErr)
    return null
  }
  const lead = leadRow as LeadRow

  // Stage labels
  const { data: stageRows } = await svcDb
    .from('pipeline_stage_labels')
    .select('stage, label, sort_order')
    .order('sort_order', { ascending: true })
  const stages = ((stageRows ?? []) as StageRow[]).map(s => ({
    stage: s.stage, label: s.label, sort_order: s.sort_order,
  }))
  const stageMap = new Map(stages.map(s => [s.stage, s.label]))

  // Student profile
  const { data: studentRow } = await authDb
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('id', lead.student_id)
    .single()
  const student = studentRow as ProfileRow | null

  // Consultant profile (if assigned)
  let consultantName: string | null = null
  if (lead.consultant_id) {
    const { data: cRow } = await svcDb
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', lead.consultant_id)
      .single()
    const c = cRow as ProfileRow | null
    consultantName = c?.full_name ?? c?.email ?? null
  }

  // Program name
  let programName = ''
  if (lead.program_id) {
    const { data: pRow } = await svcDb
      .from('programs')
      .select('id, name')
      .eq('id', lead.program_id)
      .single()
    const p = pRow as ProgramRow | null
    programName = p?.name ?? ''
  }

  // Documents — resolve signed URLs
  const { data: docRows } = await svcDb
    .from('documents')
    .select('id, file_name, file_url, status, rejection_reason, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  const documents: DocumentRow[] = await Promise.all(
    ((docRows ?? []) as DocRow[]).map(async d => {
      let resolvedUrl = d.file_url
      if (d.file_url.startsWith('storage:')) {
        const { data: signed } = await svcDb.storage
          .from('documents')
          .createSignedUrl(d.file_url.slice('storage:'.length), 60 * 60)
        if (signed?.signedUrl) resolvedUrl = signed.signedUrl
      }
      return {
        id: d.id, file_name: d.file_name, file_url: resolvedUrl,
        status: d.status as DocumentRow['status'],
        rejection_reason: d.rejection_reason, created_at: d.created_at,
      }
    })
  )

  // Activity logs
  const { data: actRows } = await svcDb
    .from('activity_logs')
    .select('id, type, content, actor_id, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  // Communication logs
  const { data: commRows } = await svcDb
    .from('communication_logs')
    .select('id, channel, summary, actor_id, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  // Resolve actor names for timeline (batch unique actor ids)
  const actorIds = new Set<string>()
  for (const r of ((actRows ?? []) as ActRow[]))  if (r.actor_id)  actorIds.add(r.actor_id)
  for (const r of ((commRows ?? []) as CommRow[])) if (r.actor_id) actorIds.add(r.actor_id)

  const actorMap = new Map<string, string>()
  if (actorIds.size > 0) {
    const { data: actorRows } = await svcDb
      .from('profiles')
      .select('id, full_name, email')
      .in('id', [...actorIds])
    for (const p of ((actorRows ?? []) as Pick<Profile, 'id' | 'full_name' | 'email'>[])) {
      actorMap.set(p.id, p.full_name ?? p.email)
    }
  }

  // Most recent comm log timestamp (for "last contacted" display)
  const lastContacted = (commRows ?? []).length > 0
    ? ((commRows as CommRow[])[0].created_at)
    : null

  // Build timeline: merge activity_logs + communication_logs, sort desc
  const timeline: TimelineEntry[] = []

  for (const r of ((actRows ?? []) as ActRow[])) {
    timeline.push({
      id:         r.id,
      kind:       'activity',
      type:       r.type,
      content:    r.content ?? '',
      actor_name: r.actor_id ? (actorMap.get(r.actor_id) ?? 'System') : 'System',
      created_at: r.created_at,
    })
  }
  for (const r of ((commRows ?? []) as CommRow[])) {
    timeline.push({
      id:         r.id,
      kind:       'communication',
      type:       r.channel,
      content:    r.summary,
      actor_name: actorMap.get(r.actor_id) ?? 'Unknown',
      created_at: r.created_at,
    })
  }
  timeline.sort((a, b) => b.created_at.localeCompare(a.created_at))

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
    student_name:     student?.full_name ?? student?.email ?? 'Unknown',
    student_email:    student?.email ?? '',
    student_phone:    student?.phone ?? null,
    program_name:     programName,
    consultant_id:    lead.consultant_id ?? null,
    consultant_name:  consultantName,
    last_contacted:   lastContacted,
    stages,
    documents,
    timeline,
  }
}

// ---------------------------------------------------------------------------
// advanceStageFromDrawer — forward-only, one step at a time
// ---------------------------------------------------------------------------

const STAGE_ORDER: LeadStage[] = [
  'inquiry', 'consultation', 'documents', 'application', 'decision', 'enrolled',
]

export async function advanceStageFromDrawer(
  _prev: DrawerMutationState,
  formData: FormData,
): Promise<DrawerMutationState> {
  const lead_id       = ((formData.get('lead_id')       as string | null) ?? '').trim()
  const current_stage = ((formData.get('current_stage') as string | null) ?? '').trim() as LeadStage
  const dashboard     = ((formData.get('dashboard')     as string | null) ?? 'consultant').trim()

  if (!lead_id || !current_stage) return { status: 'error', message: 'Missing required fields.' }

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
    console.error('[drawer] advanceStage error:', error)
    return { status: 'error', message: 'Could not advance stage. Please try again.' }
  }

  revalidatePath(dashboard === 'admin' ? '/dashboard/admin' : '/dashboard/consultant')
  return { status: 'success', next_stage }
}

// ---------------------------------------------------------------------------
// logCommunicationFromDrawer
// If lead status is 'stalled', flip it back to 'active' after logging.
// ---------------------------------------------------------------------------

export async function logCommunicationFromDrawer(
  _prev: DrawerMutationState,
  formData: FormData,
): Promise<DrawerMutationState> {
  const lead_id   = ((formData.get('lead_id')   as string | null) ?? '').trim()
  const channel   = ((formData.get('channel')   as string | null) ?? '').trim()
  const summary   = ((formData.get('summary')   as string | null) ?? '').trim()
  const dashboard = ((formData.get('dashboard') as string | null) ?? 'consultant').trim()

  if (!lead_id) return { status: 'error', message: 'Missing lead.' }
  if (!['call', 'email', 'whatsapp', 'in_person'].includes(channel)) {
    return { status: 'error', message: 'Select a valid channel.' }
  }
  if (!summary || summary.length < 10) {
    return { status: 'error', message: 'Summary must be at least 10 characters.' }
  }
  if (summary.length > 1000) {
    return { status: 'error', message: 'Summary must be 1000 characters or fewer.' }
  }

  const authDb = await createClient()
  const { data: { user } } = await authDb.auth.getUser()
  if (!user) return { status: 'error', message: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbw = authDb as any

  const { error: logErr } = await dbw.from('communication_logs').insert({
    lead_id, actor_id: user.id, channel, summary,
  })
  if (logErr) {
    console.error('[drawer] logCommunication error:', logErr)
    return { status: 'error', message: 'Could not save communication log. Please try again.' }
  }

  // Flip stalled → active
  const { data: leadRow } = await dbw
    .from('leads')
    .select('status')
    .eq('id', lead_id)
    .single()

  if ((leadRow as { status: string } | null)?.status === 'stalled') {
    await dbw.from('leads').update({ status: 'active' }).eq('id', lead_id)
  }

  revalidatePath(dashboard === 'admin' ? '/dashboard/admin' : '/dashboard/consultant')
  return { status: 'success', new_comm_entry: { id: crypto.randomUUID(), channel, summary, created_at: new Date().toISOString(), actor_name: user.email ?? '' } }
}

// ---------------------------------------------------------------------------
// reviewDocumentFromDrawer — approve or reject a document
// ---------------------------------------------------------------------------

export async function reviewDocumentFromDrawer(
  _prev: DrawerMutationState,
  formData: FormData,
): Promise<DrawerMutationState> {
  const doc_id           = ((formData.get('doc_id')           as string | null) ?? '').trim()
  const action           = ((formData.get('action')           as string | null) ?? '').trim()
  const rejection_reason = ((formData.get('rejection_reason') as string | null) ?? '').trim() || null
  const dashboard        = ((formData.get('dashboard')        as string | null) ?? 'consultant').trim()

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
    console.error('[drawer] reviewDocument error:', error)
    return { status: 'error', message: 'Could not update document. Please try again.' }
  }

  revalidatePath(dashboard === 'admin' ? '/dashboard/admin' : '/dashboard/consultant')
  return { status: 'success', doc_id, new_doc_status: action as 'approved' | 'rejected' }
}

// ---------------------------------------------------------------------------
// reassignConsultantFromDrawer — admin only
// ---------------------------------------------------------------------------

export async function reassignConsultantFromDrawer(
  _prev: DrawerMutationState,
  formData: FormData,
): Promise<DrawerMutationState> {
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
    console.error('[drawer] reassignConsultant error:', error)
    return { status: 'error', message: 'Could not reassign. Please try again.' }
  }

  let consultant_name: string | null = null
  if (consultant_id) {
    const svcDb = createServiceClient()
    const { data: pRow } = await svcDb
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
// TIER 2: updateLeadNotesFromDrawer — update lead notes (admin/consultant)
// ---------------------------------------------------------------------------

export async function updateLeadNotesFromDrawer(
  _prev: DrawerMutationState,
  formData: FormData,
): Promise<DrawerMutationState> {
  const lead_id = ((formData.get('lead_id') as string | null) ?? '').trim()
  const notes = ((formData.get('notes') as string | null) ?? '').trim().slice(0, 1000)

  if (!lead_id) return { status: 'error', message: 'Missing lead.' }

  const authDb = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbw = authDb as any

  const { error } = await dbw
    .from('leads')
    .update({ notes: notes || null })
    .eq('id', lead_id)

  if (error) {
    console.error('[drawer] updateLeadNotes error:', error)
    return { status: 'error', message: 'Could not save notes.' }
  }

  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/consultant')
  return { status: 'success' }
}
