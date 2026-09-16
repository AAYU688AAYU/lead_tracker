'use server'

/**
 * Server actions for the Analytics screen (/dashboard/admin/analytics).
 *
 * getAnalytics(filters) — returns:
 *   - stageCounts:    live snapshot of active+stalled leads per stage (current moment,
 *                     filtered by consultant if provided — date range does NOT apply here
 *                     because it's a "right now" count, not cumulative)
 *   - totalCreated:   leads created within the date range (filtered by consultant)
 *   - enrolledCount:  leads that reached stage='enrolled' within the date range
 *                     (proxy: created_at in range + stage='enrolled'; the more precise
 *                     signal would be stage_entered_at but the schema notes that column
 *                     tracks the *last* stage change, so enrolled + created_at in range
 *                     is the safe, schema-accurate definition)
 *   - conversionRate: enrolledCount / totalCreated
 *   - consultants:    all consultants for the filter dropdown
 */

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Lead, Profile, PipelineStageLabel } from '@/lib/supabase/types'
import type { AnalyticsData, StageCounts } from '../types'
import { redirect } from 'next/navigation'

// ---------------------------------------------------------------------------
// Filter shape (passed from the client via searchParams on the page)
// ---------------------------------------------------------------------------

export interface AnalyticsFilters {
  from:          string   // ISO date string, e.g. "2026-01-01"
  to:            string   // ISO date string, e.g. "2026-12-31"
  consultantId:  string   // '' = all
}

// ---------------------------------------------------------------------------
// Narrow types
// ---------------------------------------------------------------------------
type LeadRow    = Pick<Lead, 'id' | 'stage' | 'status' | 'consultant_id' | 'created_at'>
type StageRow   = Pick<PipelineStageLabel, 'stage' | 'label' | 'sort_order'>
type ProfileRow = Pick<Profile, 'id' | 'full_name' | 'email'>

// ---------------------------------------------------------------------------
// getAnalytics
// ---------------------------------------------------------------------------

export async function getAnalytics(filters: AnalyticsFilters): Promise<AnalyticsData> {
  const authDb = await createClient()
  const svcDb  = createServiceClient()

  // Verify caller is admin
  const { data: { user } } = await authDb.auth.getUser()
  if (!user) redirect('/login')

  const { data: callerProfile } = await authDb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if ((callerProfile as { role: string } | null)?.role !== 'admin') {
    redirect('/dashboard/admin')
  }

  // ── Stage labels ─────────────────────────────────────────────────────────
  const { data: stageRows } = await svcDb
    .from('pipeline_stage_labels')
    .select('stage, label, sort_order')
    .order('sort_order', { ascending: true })

  const stages = ((stageRows ?? []) as StageRow[])

  // ── All leads (service client — admin should see everything) ─────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbr = svcDb as any
  const { data: allLeadRows, error: leadErr } = await dbr
    .from('leads')
    .select('id, stage, status, consultant_id, created_at')

  if (leadErr) {
    console.error('[analytics] getAnalytics leads error:', leadErr)
  }

  const allLeads = ((allLeadRows ?? []) as LeadRow[])

  // ── Consultant list for filter dropdown ──────────────────────────────────
  const { data: consultantRows } = await svcDb
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'consultant')
    .order('full_name')

  const consultants = ((consultantRows ?? []) as ProfileRow[]).map(c => ({
    id:   c.id,
    name: c.full_name ?? c.email,
  }))

  // ── Stage counts — live snapshot ─────────────────────────────────────────
  // "Right now": active + stalled leads at each stage.
  // Consultant filter applies; date range does NOT (it's a current snapshot).
  const snapshotLeads = filters.consultantId
    ? allLeads.filter(l => l.consultant_id === filters.consultantId)
    : allLeads

  const stageCounts: StageCounts[] = stages.map(s => ({
    stage:      s.stage,
    label:      s.label,
    sort_order: s.sort_order,
    count:      snapshotLeads.filter(
      l => l.stage === s.stage && (l.status === 'active' || l.status === 'stalled')
    ).length,
  }))

  // ── Date-range filtered leads ─────────────────────────────────────────────
  // Parse range — default to a wide window if empty/invalid
  const fromDate = filters.from ? new Date(filters.from + 'T00:00:00.000Z') : new Date(0)
  const toDate   = filters.to   ? new Date(filters.to   + 'T23:59:59.999Z') : new Date()

  const rangeLeads = allLeads.filter(l => {
    const created = new Date(l.created_at)
    const inRange = created >= fromDate && created <= toDate
    const inConsultant = !filters.consultantId || l.consultant_id === filters.consultantId
    return inRange && inConsultant
  })

  const totalCreated  = rangeLeads.length
  const enrolledCount = rangeLeads.filter(l => l.stage === 'enrolled').length
  const conversionRate = totalCreated > 0 ? enrolledCount / totalCreated : 0

  return {
    stageCounts,
    totalCreated,
    enrolledCount,
    conversionRate,
    consultants,
  }
}
