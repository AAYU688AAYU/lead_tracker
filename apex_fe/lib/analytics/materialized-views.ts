/**
 * Materialized Views for Analytics
 *
 * Provides efficient, pre-aggregated analytics data for admin dashboards.
 * These views reduce N+1 queries and complex aggregations by materializing
 * common analytics patterns as database views.
 *
 * Views include:
 * - leads_by_stage_daily: daily snapshot of active lead counts per stage
 * - conversion_funnel: funnel metrics (applications → interviews → enrolled)
 * - consultant_performance: per-consultant metrics and KPIs
 * - lead_velocity: time-to-conversion and pipeline velocity metrics
 *
 * These are materialized views in PostgreSQL, refreshed periodically or on-demand.
 */

import { createServiceClient } from '@/lib/supabase/service'

/**
 * Daily stage snapshot — one row per stage per day with active lead count
 */
export interface DailyStageCounts {
  date: string // ISO date YYYY-MM-DD
  stage: string // e.g., 'application', 'interview', 'offer', 'enrolled'
  stage_label: string
  active_count: number
  stalled_count: number
  total_count: number
}

/**
 * Conversion funnel metrics across date range
 */
export interface ConversionFunnel {
  metric: string // 'applications' | 'interviews' | 'offers' | 'enrolled'
  count: number
  percentage: number // relative to applications (100% baseline)
  avg_conversion_time_hours: number // avg time to reach this stage
}

/**
 * Per-consultant performance metrics
 */
export interface ConsultantPerformance {
  consultant_id: string
  consultant_name: string
  active_leads: number
  stalled_leads: number
  avg_stage: string // most common stage
  total_applications: number
  total_enrolled: number
  conversion_rate: number // enrolled / applications
  avg_time_to_offer_hours: number
  avg_time_to_enrollment_hours: number
  recent_activity_date: string | null // last lead interaction
}

/**
 * Lead velocity and pipeline metrics
 */
export interface LeadVelocity {
  metric: string // 'avg_application_to_interview', 'avg_interview_to_offer', etc.
  avg_hours: number
  min_hours: number
  max_hours: number
  median_hours: number
  sample_count: number
}

/**
 * Query daily stage counts from materialized view
 * Used for trend charts and historical analysis
 */
export async function getDailyStageCounts(
  fromDate: string,
  toDate: string,
  consultantId?: string,
): Promise<DailyStageCounts[]> {
  const db = createServiceClient()

  let query = db
    .from('mv_leads_by_stage_daily')
    .select('date, stage, stage_label, active_count, stalled_count, total_count')
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: true })
    .order('stage', { ascending: true })

  if (consultantId) {
    query = query.eq('consultant_id', consultantId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[analytics] getDailyStageCounts error:', error)
    return []
  }

  return (data ?? []) as DailyStageCounts[]
}

/**
 * Query conversion funnel metrics
 * Shows progression from application through enrollment
 */
export async function getConversionFunnel(
  fromDate: string,
  toDate: string,
  consultantId?: string,
): Promise<ConversionFunnel[]> {
  const db = createServiceClient()

  let query = db
    .from('mv_conversion_funnel')
    .select('metric, count, percentage, avg_conversion_time_hours')
    .gte('created_at', fromDate)
    .lte('created_at', toDate)
    .order('sort_order', { ascending: true })

  if (consultantId) {
    query = query.eq('consultant_id', consultantId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[analytics] getConversionFunnel error:', error)
    return []
  }

  return (data ?? []) as ConversionFunnel[]
}

/**
 * Query consultant performance metrics
 * Returns aggregated KPIs per consultant
 */
export async function getConsultantPerformance(
  fromDate?: string,
  toDate?: string,
): Promise<ConsultantPerformance[]> {
  const db = createServiceClient()

  let query = db
    .from('mv_consultant_performance')
    .select(
      'consultant_id, consultant_name, active_leads, stalled_leads, avg_stage, ' +
      'total_applications, total_enrolled, conversion_rate, ' +
      'avg_time_to_offer_hours, avg_time_to_enrollment_hours, recent_activity_date'
    )
    .order('conversion_rate', { ascending: false })

  if (fromDate) {
    query = query.gte('metric_date', fromDate)
  }
  if (toDate) {
    query = query.lte('metric_date', toDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('[analytics] getConsultantPerformance error:', error)
    return []
  }

  return (data ?? []) as ConsultantPerformance[]
}

/**
 * Query lead velocity metrics
 * Shows time distributions for key pipeline transitions
 */
export async function getLeadVelocity(): Promise<LeadVelocity[]> {
  const db = createServiceClient()

  const { data, error } = await db
    .from('mv_lead_velocity')
    .select(
      'metric, avg_hours, min_hours, max_hours, median_hours, sample_count'
    )
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[analytics] getLeadVelocity error:', error)
    return []
  }

  return (data ?? []) as LeadVelocity[]
}

/**
 * Refresh materialized views on-demand
 * Call this after bulk lead updates or periodically (e.g., nightly)
 */
export async function refreshAnalyticsMaterializedViews(): Promise<{
  success: boolean
  refreshedAt: string
  views: string[]
}> {
  const db = createServiceClient()

  try {
    // PostgreSQL: REFRESH MATERIALIZED VIEW CONCURRENTLY
    // Wrapped in RPC to allow admin refresh from client side
    const { data, error } = await db.rpc('refresh_analytics_views')

    if (error) {
      console.error('[analytics] refresh error:', error)
      return {
        success: false,
        refreshedAt: new Date().toISOString(),
        views: [],
      }
    }

    return {
      success: true,
      refreshedAt: new Date().toISOString(),
      views: [
        'mv_leads_by_stage_daily',
        'mv_conversion_funnel',
        'mv_consultant_performance',
        'mv_lead_velocity',
      ],
    }
  } catch (err) {
    console.error('[analytics] refresh exception:', err)
    return {
      success: false,
      refreshedAt: new Date().toISOString(),
      views: [],
    }
  }
}

/**
 * Get analytics summary card data
 * Optimized single query for dashboard KPI cards
 */
export async function getAnalyticsSummary(
  fromDate: string,
  toDate: string,
): Promise<{
  totalApplications: number
  totalEnrolled: number
  conversionRate: number
  avgTimeToEnrollmentHours: number
  activeConsultants: number
  pipelineHealthScore: number // 0-100 based on velocity and conversion
}> {
  const db = createServiceClient()

  try {
    const { data, error } = await db.rpc(
      'get_analytics_summary',
      {
        from_date: fromDate,
        to_date: toDate,
      }
    )

    if (error) {
      console.error('[analytics] summary error:', error)
      return {
        totalApplications: 0,
        totalEnrolled: 0,
        conversionRate: 0,
        avgTimeToEnrollmentHours: 0,
        activeConsultants: 0,
        pipelineHealthScore: 0,
      }
    }

    const result = data as Record<string, number | null>

    return {
      totalApplications: result?.total_applications ?? 0,
      totalEnrolled: result?.total_enrolled ?? 0,
      conversionRate: result?.conversion_rate ?? 0,
      avgTimeToEnrollmentHours: result?.avg_time_to_enrollment_hours ?? 0,
      activeConsultants: result?.active_consultants ?? 0,
      pipelineHealthScore: result?.pipeline_health_score ?? 0,
    }
  } catch (err) {
    console.error('[analytics] summary exception:', err)
    return {
      totalApplications: 0,
      totalEnrolled: 0,
      conversionRate: 0,
      avgTimeToEnrollmentHours: 0,
      activeConsultants: 0,
      pipelineHealthScore: 0,
    }
  }
}
