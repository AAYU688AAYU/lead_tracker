'use server'

/**
 * Consultant Detail Actions — TASK #5
 *
 * getConsultantDetail()      — fetch consultant profile, metrics, portfolio
 * bulkReassignLeads()        — reassign multiple selected leads to replacement
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Lead, Profile } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConsultantMetrics {
  conversionRate: number       // enrolled / total assigned
  avgLeadAgeDays: number       // average age of leads in days
  totalAdmittedThirtyDays: number
  stalledLeadsCount: number
}

export interface PortfolioLead {
  id: string
  reference_code: string
  student_name: string
  stage: string
  stage_label: string
  status: string
  created_at: string
  days_in_stage: number
  target_country: string | null
}

export interface ConsultantDetailData {
  consultant: {
    id: string
    full_name: string
    email: string
    role: string
    join_date: string | null
    is_accepting_leads: boolean
    max_lead_capacity: number | null
  }
  metrics: ConsultantMetrics
  portfolio: PortfolioLead[]
}

// ---------------------------------------------------------------------------
// getConsultantDetail
// ---------------------------------------------------------------------------

export async function getConsultantDetail(
  consultantId: string,
): Promise<ConsultantDetailData | null> {
  const authDb = await createClient()
  const svcDb = createServiceClient()

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

  // OPTIMIZATION: Use service client for all queries and leverage materialized views
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbr = svcDb as any

  // Query 1: Fetch consultant profile (single query)
  const { data: consultantRow, error: consultErr } = await dbr
    .from('profiles')
    .select('id, full_name, email, role, created_at, is_accepting_leads, max_lead_capacity')
    .eq('id', consultantId)
    .single()

  if (consultErr || !consultantRow) {
    console.error('[consultant-detail] fetch profile error:', consultErr)
    return null
  }

  type ConsultantRow = Pick<
    Profile,
    'id' | 'full_name' | 'email' | 'role' | 'is_accepting_leads' | 'max_lead_capacity'
  > & { created_at: string }

  const consultant = consultantRow as ConsultantRow

  // OPTIMIZATION: Use materialized view + batch join to get portfolio in ONE query
  // This replaces 3 separate queries (leads, student profiles, stage labels) with one
  const { data: portfolioRows } = await dbr
    .from('consultant_portfolio_view')
    .select('id, reference_code, stage, status, student_id, created_at, target_country, student_name, student_email')
    .eq('consultant_id', consultantId)

  type PortfolioRow = {
    id: string
    reference_code: string
    stage: string
    status: string
    student_id: string
    created_at: string
    target_country: string | null
    student_name: string | null
    student_email: string | null
  }

  const portfolioRows_typed = (portfolioRows ?? []) as PortfolioRow[]

  // Query 2: Fetch stage labels (cached by Supabase)
  const { data: stageRows } = await dbr
    .from('pipeline_stage_labels')
    .select('stage, label, sort_order')
    .order('sort_order', { ascending: true })

  const stageMap = new Map(
    ((stageRows ?? []) as Array<{ stage: string; label: string }>).map(s => [s.stage, s.label])
  )

  // OPTIMIZATION: Use pre-calculated metrics from materialized view
  // This replaces expensive client-side aggregations with pre-computed values
  const { data: metricsRow } = await dbr
    .from('consultant_metrics_view')
    .select('total_leads, enrolled_leads, stalled_leads, admitted_thirty_days, avg_lead_age_days')
    .eq('consultant_id', consultantId)
    .single()

  type MetricsRow = {
    total_leads: number
    enrolled_leads: number
    stalled_leads: number
    admitted_thirty_days: number
    avg_lead_age_days: number
  }

  const metrics = (metricsRow ?? {
    total_leads: 0,
    enrolled_leads: 0,
    stalled_leads: 0,
    admitted_thirty_days: 0,
    avg_lead_age_days: 0,
  }) as MetricsRow

  // Calculate conversion rate from pre-computed metrics
  const conversionRate = metrics.total_leads > 0 ? metrics.enrolled_leads / metrics.total_leads : 0

  // Build portfolio from materialized view data (no additional joins needed)
  const portfolio: PortfolioLead[] = portfolioRows_typed.map(row => {
    const daysInStage = Math.floor(
      (new Date().getTime() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    return {
      id: row.id,
      reference_code: row.reference_code,
      student_name: row.student_name ?? row.student_email ?? 'Unknown',
      stage: row.stage,
      stage_label: stageMap.get(row.stage) ?? row.stage,
      status: row.status,
      created_at: row.created_at,
      days_in_stage: daysInStage,
      target_country: row.target_country,
    }
  })

  return {
    consultant: {
      id: consultant.id,
      full_name: consultant.full_name ?? 'Unknown',
      email: consultant.email,
      role: consultant.role,
      join_date: consultant.created_at,
      is_accepting_leads: consultant.is_accepting_leads,
      max_lead_capacity: consultant.max_lead_capacity,
    },
    metrics: {
      conversionRate,
      avgLeadAgeDays: Math.round(metrics.avg_lead_age_days),
      totalAdmittedThirtyDays: metrics.admitted_thirty_days,
      stalledLeadsCount: metrics.stalled_leads,
    },
    portfolio,
  }
}
