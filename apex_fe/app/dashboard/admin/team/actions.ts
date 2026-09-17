'use server'

/**
 * Server actions for the Team screen (/dashboard/admin/team).
 *
 * getTeam()            — read all consultants with computed stats
 * toggleAccepting()    — flip is_accepting_leads for one consultant
 * offboardConsultant() — bulk-reassign all active/stalled leads from one
 *                        consultant to another, writing activity_logs +
 *                        notifications for each moved lead
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Lead, Profile } from '@/lib/supabase/types'
import type {
  TeamConsultantRow,
  ToggleAcceptingState,
  OffboardState,
} from '../types'

// ---------------------------------------------------------------------------
// Narrow query-result types
// ---------------------------------------------------------------------------
type ProfileRow = Pick<
  Profile,
  'id' | 'full_name' | 'email' | 'is_accepting_leads' | 'max_lead_capacity'
>
type LeadRow = Pick<Lead, 'id' | 'consultant_id' | 'status'>

// ---------------------------------------------------------------------------
// getTeam — fetch all consultants with computed lead stats
// ---------------------------------------------------------------------------

export async function getTeam(): Promise<TeamConsultantRow[]> {
  const svcDb = createServiceClient()

  // All consultant profiles
  const { data: profileRows, error: profileErr } = await svcDb
    .from('profiles')
    .select('id, full_name, email, is_accepting_leads, max_lead_capacity')
    .eq('role', 'consultant')
    .order('full_name')

  if (profileErr) {
    console.error('[team] getTeam profiles error:', profileErr)
    return []
  }

  const consultants = (profileRows ?? []) as ProfileRow[]
  if (consultants.length === 0) return []

  const ids = consultants.map(c => c.id)

  // All non-dropped leads assigned to these consultants
  const { data: leadRows, error: leadErr } = await svcDb
    .from('leads')
    .select('id, consultant_id, status')
    .in('consultant_id', ids)
    .neq('status', 'dropped')

  if (leadErr) {
    console.error('[team] getTeam leads error:', leadErr)
  }

  const leads = (leadRows ?? []) as LeadRow[]

  return consultants.map(c => {
    const mine = leads.filter(l => l.consultant_id === c.id)
    const active    = mine.filter(l => l.status === 'active').length
    const stalled   = mine.filter(l => l.status === 'stalled').length
    const completed = mine.filter(l => l.status === 'completed').length
    const total     = active + stalled + completed

    return {
      id:                 c.id,
      full_name:          c.full_name,
      email:              c.email,
      is_accepting_leads: c.is_accepting_leads,
      max_lead_capacity:  c.max_lead_capacity,
      active_leads:       active,
      stalled_leads:      stalled,
      completed_leads:    completed,
      conversion_rate:    total > 0 ? completed / total : 0,
    }
  })
}

// ---------------------------------------------------------------------------
// toggleAccepting — flip is_accepting_leads for a consultant
// ---------------------------------------------------------------------------

export async function toggleAccepting(
  _prev: ToggleAcceptingState,
  formData: FormData,
): Promise<ToggleAcceptingState> {
  const consultant_id      = ((formData.get('consultant_id') as string | null) ?? '').trim()
  const new_value_raw      = ((formData.get('new_value')     as string | null) ?? '').trim()

  if (!consultant_id) return { status: 'error', message: 'Missing consultant.' }

  const new_value = new_value_raw === 'true'

  const authDb = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbw = authDb as any

  // Verify caller is admin
  const { data: { user } } = await authDb.auth.getUser()
  if (!user) return { status: 'error', message: 'Not authenticated.' }

  const { data: callerProfile } = await authDb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if ((callerProfile as { role: string } | null)?.role !== 'admin') {
    return { status: 'error', message: 'Admin access required.' }
  }

  const { error } = await dbw
    .from('profiles')
    .update({ is_accepting_leads: new_value })
    .eq('id', consultant_id)

  if (error) {
    console.error('[team] toggleAccepting error:', error)
    return { status: 'error', message: 'Could not update consultant. Please try again.' }
  }

  revalidatePath('/dashboard/admin/team')
  return { status: 'success', consultant_id, is_accepting_leads: new_value }
}

// ---------------------------------------------------------------------------
// offboardConsultant — bulk-reassign all active/stalled leads to a replacement
// ---------------------------------------------------------------------------

export async function offboardConsultant(
  _prev: OffboardState,
  formData: FormData,
): Promise<OffboardState> {
  const from_id = ((formData.get('from_id') as string | null) ?? '').trim()
  const to_id   = ((formData.get('to_id')   as string | null) ?? '').trim()

  if (!from_id) return { status: 'error', message: 'Missing consultant to offboard.' }
  if (!to_id)   return { status: 'error', message: 'Select a replacement consultant.' }
  if (from_id === to_id) return { status: 'error', message: 'Replacement must be a different consultant.' }

  const authDb = await createClient()
  const svcDb  = createServiceClient()

  // Verify caller is admin
  const { data: { user } } = await authDb.auth.getUser()
  if (!user) return { status: 'error', message: 'Not authenticated.' }

  const { data: callerProfile } = await authDb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if ((callerProfile as { role: string } | null)?.role !== 'admin') {
    return { status: 'error', message: 'Admin access required.' }
  }

  // Fetch replacement consultant name (for notification content)
  const { data: toProfile } = await svcDb
    .from('profiles')
    .select('full_name, email')
    .eq('id', to_id)
    .single()
  const toName = (toProfile as Pick<Profile, 'full_name' | 'email'> | null)?.full_name
    ?? (toProfile as Pick<Profile, 'full_name' | 'email'> | null)?.email
    ?? 'Unknown'

  // Fetch all active/stalled leads for the departing consultant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbr = svcDb as any
  const { data: leadRows, error: fetchErr } = await dbr
    .from('leads')
    .select('id, reference_code, stage')
    .eq('consultant_id', from_id)
    .in('status', ['active', 'stalled'])

  if (fetchErr) {
    console.error('[team] offboard fetch leads error:', fetchErr)
    return { status: 'error', message: 'Could not fetch leads. Please try again.' }
  }

  type OffboardLead = { id: string; reference_code: string; stage: string }
  const leads = (leadRows ?? []) as OffboardLead[]

  if (leads.length === 0) {
    return { status: 'success', moved: 0 }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbw = svcDb as any

  // Bulk update consultant_id
  const { error: updateErr } = await dbw
    .from('leads')
    .update({ consultant_id: to_id })
    .eq('consultant_id', from_id)
    .in('status', ['active', 'stalled'])

  if (updateErr) {
    console.error('[team] offboard update leads error:', updateErr)
    return { status: 'error', message: 'Could not reassign leads. Please try again.' }
  }

  // Write one activity_log row per moved lead
  const activityRows = leads.map(l => ({
    lead_id:  l.id,
    actor_id: user.id,
    type:     'reassignment',
    content:  `Lead reassigned to ${toName} during consultant offboarding.`,
  }))

  const { error: actErr } = await dbw
    .from('activity_logs')
    .insert(activityRows)

  if (actErr) {
    // Non-fatal — leads are already moved; log and continue
    console.error('[team] offboard activity_logs error:', actErr)
  }

  // Write one notification to the replacement consultant
  const { error: notifErr } = await dbw
    .from('notifications')
    .insert({
      user_id: to_id,
      type:    'reassignment',
      content: `${leads.length} lead${leads.length === 1 ? '' : 's'} have been reassigned to you following a consultant offboarding.`,
      is_read: false,
    })

  if (notifErr) {
    console.error('[team] offboard notification error:', notifErr)
  }

  revalidatePath('/dashboard/admin/team')
  revalidatePath('/dashboard/admin')
  return { status: 'success', moved: leads.length }
}


// ---------------------------------------------------------------------------
// deactivateConsultant — TASK #6
// Marks consultant as inactive, flags all their leads for reassignment
// ---------------------------------------------------------------------------

export async function deactivateConsultant(
  _prev: OffboardState,
  formData: FormData,
): Promise<OffboardState> {
  const consultant_id = ((formData.get('consultant_id') as string | null) ?? '').trim()

  if (!consultant_id) return { status: 'error', message: 'Missing consultant.' }

  const authDb = await createClient()
  const svcDb = createServiceClient()

  // Verify caller is admin
  const { data: { user } } = await authDb.auth.getUser()
  if (!user) return { status: 'error', message: 'Not authenticated.' }

  const { data: callerProfile } = await authDb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((callerProfile as { role: string } | null)?.role !== 'admin') {
    return { status: 'error', message: 'Admin access required.' }
  }

  // Fetch consultant profile
  const { data: consultantRow } = await svcDb
    .from('profiles')
    .select('full_name, email')
    .eq('id', consultant_id)
    .single()

  const consultantName =
    (consultantRow as { full_name?: string; email?: string } | null)?.full_name ||
    (consultantRow as { full_name?: string; email?: string } | null)?.email ||
    'Unknown'

  // Mark consultant as inactive
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbw = svcDb as any

  const { error: deactivateErr } = await dbw
    .from('profiles')
    .update({ is_active: false })
    .eq('id', consultant_id)

  if (deactivateErr) {
    console.error('[team] deactivateConsultant error:', deactivateErr)
    return { status: 'error', message: 'Could not deactivate consultant. Please try again.' }
  }

  // Fetch all active/stalled leads for this consultant
  const { data: leadRows } = await dbw
    .from('leads')
    .select('id, reference_code, stage')
    .eq('consultant_id', consultant_id)
    .in('status', ['active', 'stalled'])

  type FlaggedLead = { id: string; reference_code: string; stage: string }
  const leads = (leadRows ?? []) as FlaggedLead[]

  if (leads.length === 0) {
    revalidatePath('/dashboard/admin/team')
    return { status: 'success', moved: 0 }
  }

  // Clear consultant_id for all their active/stalled leads (flag for reassignment)
  const { error: clearErr } = await dbw
    .from('leads')
    .update({ consultant_id: null })
    .eq('consultant_id', consultant_id)
    .in('status', ['active', 'stalled'])

  if (clearErr) {
    console.error('[team] deactivateConsultant clear leads error:', clearErr)
    return { status: 'error', message: 'Could not flag leads for reassignment. Please try again.' }
  }

  // Write activity_logs for each flagged lead
  const activityRows = leads.map(l => ({
    lead_id: l.id,
    actor_id: user.id,
    type: 'deactivation',
    content: `Lead flagged for reassignment due to consultant deactivation (${consultantName}).`,
  }))

  const { error: actErr } = await dbw
    .from('activity_logs')
    .insert(activityRows)

  if (actErr) {
    console.error('[team] deactivateConsultant activity logs error:', actErr)
  }

  // Notify all super-admins
  const { data: superAdmins } = await svcDb
    .from('profiles')
    .select('id')
    .eq('role', 'super_admin')

  const notificationRows = (superAdmins ?? []).map(
    (admin: { id: string }) => ({
      user_id: admin.id,
      type: 'deactivation',
      content: `${consultantName} has been deactivated. ${leads.length} lead${leads.length === 1 ? '' : 's'} flagged for reassignment.`,
      is_read: false,
    })
  )

  if (notificationRows.length > 0) {
    const { error: notifErr } = await dbw
      .from('notifications')
      .insert(notificationRows)

    if (notifErr) {
      console.error('[team] deactivateConsultant notification error:', notifErr)
    }
  }

  revalidatePath('/dashboard/admin/team')
  revalidatePath('/dashboard/admin')
  return { status: 'success', moved: leads.length }
}
