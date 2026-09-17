'use server'

/**
 * Consultant metrics calculations — extracted for reusability
 *
 * Used by both the current month view and historical trend calculations.
 * All scoped to a single consultant via consultant_id.
 */

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Lead } from '@/lib/supabase/types'

type LeadRow = Pick<
  Lead,
  'id' | 'status' | 'stage' | 'created_at'
>

export interface ConsultantMetrics {
  active_leads: number
  stalled_leads: number
  conversion_rate: number | null
  enrolled_this_month: number
  created_this_month: number
  period_label: string // e.g. "This month", "Last month"
}

/**
 * getConsultantMetrics
 *
 * Calculates core metrics for a consultant over a specified time period.
 * If no period is specified, defaults to the current calendar month.
 *
 * Returns:
 *   - active_leads: count(status='active')
 *   - stalled_leads: count(status='stalled')
 *   - conversion_rate: (enrolled / created) * 100, rounded
 *   - enrolled_this_month: count(status='completed' AND stage='enrolled')
 *   - created_this_month: count(created_at in period)
 *   - period_label: human-readable label (e.g. "This month", "Oct 2026")
 */

export async function getConsultantMetrics(
  consultantId: string,
  opts?: {
    startDate?: Date
    endDate?: Date
    periodLabel?: string
  }
): Promise<ConsultantMetrics> {
  const authDb = await createClient()

  // Default to current calendar month if no period specified
  const now = new Date()
  const start = opts?.startDate ?? new Date(now.getFullYear(), now.getMonth(), 1)
  const end = opts?.endDate ?? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const label = opts?.periodLabel ?? 'This month'

  const startISO = start.toISOString()
  const endISO = end.toISOString()

  const { data: leadRows } = await authDb
    .from('leads')
    .select('id, status, stage, created_at')
    .eq('consultant_id', consultantId)

  const leads = (leadRows ?? []) as LeadRow[]

  // Calculate metrics
  const activeLead = leads.filter(l => l.status === 'active').length
  const stalledLeads = leads.filter(l => l.status === 'stalled').length

  const createdThisMonth = leads.filter(
    l => l.created_at >= startISO && l.created_at <= endISO
  ).length
  const enrolledThisMonth = leads.filter(
    l =>
      l.status === 'completed' &&
      l.stage === 'enrolled' &&
      l.created_at >= startISO &&
      l.created_at <= endISO
  ).length

  const conversionRate =
    createdThisMonth === 0
      ? null
      : Math.round((enrolledThisMonth / createdThisMonth) * 100)

  return {
    active_leads: activeLead,
    stalled_leads: stalledLeads,
    conversion_rate: conversionRate,
    enrolled_this_month: enrolledThisMonth,
    created_this_month: createdThisMonth,
    period_label: label,
  }
}

/**
 * getConsultantMetricsTrend
 *
 * Compares metrics for two periods (e.g., this month vs last month).
 * Returns metrics for both periods plus calculated deltas.
 */

export interface MetricsTrend {
  current: ConsultantMetrics
  previous: ConsultantMetrics
  active_leads_delta: number | null // positive = increase
  stalled_leads_delta: number | null
  conversion_rate_delta: number | null // percentage points
}

export async function getConsultantMetricsTrend(
  consultantId: string,
  opts?: {
    offset?: number // number of months back to compare (default: 1 = last month)
  }
): Promise<MetricsTrend> {
  const { offset = 1 } = opts ?? {}

  // Current period (this month)
  const now = new Date()
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // Previous period
  const prevEnd = new Date(currentStart.getTime() - 1)
  const prevStart = new Date(
    prevEnd.getFullYear(),
    prevEnd.getMonth() - (offset - 1),
    1
  )

  const current = await getConsultantMetrics(consultantId, {
    startDate: currentStart,
    endDate: currentEnd,
    periodLabel: 'This month',
  })

  const previous = await getConsultantMetrics(consultantId, {
    startDate: prevStart,
    endDate: prevEnd,
    periodLabel: `${prevStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}`,
  })

  return {
    current,
    previous,
    active_leads_delta: current.active_leads - previous.active_leads,
    stalled_leads_delta: current.stalled_leads - previous.stalled_leads,
    conversion_rate_delta:
      current.conversion_rate !== null && previous.conversion_rate !== null
        ? current.conversion_rate - previous.conversion_rate
        : null,
  }
}
