/**
 * Materialized Views DDL
 * 
 * SQL definitions for analytics materialized views.
 * These should be created in Supabase via the SQL editor.
 * 
 * Views provided:
 * - mv_leads_by_stage_daily: Daily snapshot of lead counts per stage
 * - mv_conversion_funnel: Funnel progression metrics
 * - mv_consultant_performance: Per-consultant KPIs
 * - mv_lead_velocity: Time-to-conversion metrics
 * - Refresh RPC and Summary RPC functions
 */

-- ============================================================================
-- 1. Daily Stage Counts Materialized View
-- ============================================================================
-- Materializes daily snapshot of active/stalled leads per stage
-- Enables efficient trend analysis and historical queries

CREATE MATERIALIZED VIEW mv_leads_by_stage_daily AS
SELECT
  CAST(l.created_at::date AS text) as date,
  l.stage,
  psl.label as stage_label,
  psl.sort_order,
  l.consultant_id,
  COUNT(CASE WHEN l.status = 'active' THEN 1 END) as active_count,
  COUNT(CASE WHEN l.status = 'stalled' THEN 1 END) as stalled_count,
  COUNT(*) as total_count
FROM leads l
LEFT JOIN pipeline_stage_labels psl ON psl.stage = l.stage
GROUP BY
  CAST(l.created_at::date AS text),
  l.stage,
  psl.label,
  psl.sort_order,
  l.consultant_id
ORDER BY date DESC, psl.sort_order ASC;

CREATE INDEX idx_mv_daily_stage_date ON mv_leads_by_stage_daily(date DESC);
CREATE INDEX idx_mv_daily_stage_consultant ON mv_leads_by_stage_daily(consultant_id);

-- ============================================================================
-- 2. Conversion Funnel Materialized View
-- ============================================================================
-- Tracks progression through pipeline stages with timing metrics

CREATE MATERIALIZED VIEW mv_conversion_funnel AS
WITH stage_progression AS (
  SELECT
    l.id,
    l.created_at,
    l.consultant_id,
    l.stage,
    EXTRACT(EPOCH FROM (
      l.stage_entered_at - l.created_at
    )) / 3600.0 as hours_to_stage
  FROM leads l
  WHERE l.stage != 'application'  -- exclude stage before progression
)
SELECT
  CASE
    WHEN stage = 'application' THEN 'applications'
    WHEN stage = 'interview' THEN 'interviews'
    WHEN stage = 'offer' THEN 'offers'
    WHEN stage = 'enrolled' THEN 'enrolled'
    ELSE 'other'
  END as metric,
  l.created_at::date,
  COUNT(*) as count,
  ROUND(
    100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM leads), 0),
    1
  ) as percentage,
  ROUND(COALESCE(AVG(sp.hours_to_stage), 0)::numeric, 1) as avg_conversion_time_hours,
  1 as sort_order
FROM leads l
LEFT JOIN stage_progression sp ON sp.id = l.id
WHERE l.stage IN ('application', 'interview', 'offer', 'enrolled')
GROUP BY
  CASE
    WHEN stage = 'application' THEN 'applications'
    WHEN stage = 'interview' THEN 'interviews'
    WHEN stage = 'offer' THEN 'offers'
    WHEN stage = 'enrolled' THEN 'enrolled'
    ELSE 'other'
  END,
  l.created_at::date
ORDER BY created_at DESC, sort_order ASC;

CREATE INDEX idx_mv_funnel_metric ON mv_conversion_funnel(metric);
CREATE INDEX idx_mv_funnel_date ON mv_conversion_funnel(created_at DESC);

-- ============================================================================
-- 3. Consultant Performance Materialized View
-- ============================================================================
-- Aggregates key consultant KPIs for performance dashboards

CREATE MATERIALIZED VIEW mv_consultant_performance AS
SELECT
  p.id as consultant_id,
  p.full_name as consultant_name,
  COUNT(CASE WHEN l.status = 'active' THEN 1 END) as active_leads,
  COUNT(CASE WHEN l.status = 'stalled' THEN 1 END) as stalled_leads,
  (
    SELECT l2.stage
    FROM leads l2
    WHERE l2.consultant_id = p.id
    GROUP BY l2.stage
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) as avg_stage,
  COUNT(CASE WHEN l.stage = 'application' THEN 1 END) as total_applications,
  COUNT(CASE WHEN l.stage = 'enrolled' THEN 1 END) as total_enrolled,
  ROUND(
    100.0 * COUNT(CASE WHEN l.stage = 'enrolled' THEN 1 END) /
    NULLIF(COUNT(CASE WHEN l.stage = 'application' THEN 1 END), 0),
    1
  ) as conversion_rate,
  ROUND(
    COALESCE(AVG(
      EXTRACT(EPOCH FROM (
        CASE WHEN l.stage IN ('offer', 'enrolled')
          THEN l.stage_entered_at - l.created_at
          ELSE NULL
        END
      )) / 3600.0
    ), 0)::numeric,
    1
  ) as avg_time_to_offer_hours,
  ROUND(
    COALESCE(AVG(
      EXTRACT(EPOCH FROM (
        CASE WHEN l.stage = 'enrolled'
          THEN l.stage_entered_at - l.created_at
          ELSE NULL
        END
      )) / 3600.0
    ), 0)::numeric,
    1
  ) as avg_time_to_enrollment_hours,
  MAX(l.updated_at)::date as recent_activity_date,
  CURRENT_DATE as metric_date
FROM profiles p
LEFT JOIN leads l ON l.consultant_id = p.id
WHERE p.role = 'consultant'
GROUP BY p.id, p.full_name
ORDER BY conversion_rate DESC NULLS LAST;

CREATE INDEX idx_mv_consultant_perf_id ON mv_consultant_performance(consultant_id);
CREATE INDEX idx_mv_consultant_perf_rate ON mv_consultant_performance(conversion_rate DESC NULLS LAST);

-- ============================================================================
-- 4. Lead Velocity Materialized View
-- ============================================================================
-- Captures time-to-conversion metrics and pipeline velocity

CREATE MATERIALIZED VIEW mv_lead_velocity AS
WITH stage_transitions AS (
  SELECT
    l.id,
    'application_to_interview' as transition,
    EXTRACT(EPOCH FROM (
      (SELECT MAX(l2.stage_entered_at)
       FROM leads l2 WHERE l2.id = l.id AND l2.stage = 'interview')
      - l.created_at
    )) / 3600.0 as hours_elapsed
  FROM leads l
  WHERE l.stage IN ('interview', 'offer', 'enrolled')
  
  UNION ALL
  
  SELECT
    l.id,
    'interview_to_offer' as transition,
    EXTRACT(EPOCH FROM (
      (SELECT MAX(l2.stage_entered_at)
       FROM leads l2 WHERE l2.id = l.id AND l2.stage = 'offer')
      -
      (SELECT MAX(l2.stage_entered_at)
       FROM leads l2 WHERE l2.id = l.id AND l2.stage = 'interview')
    )) / 3600.0 as hours_elapsed
  FROM leads l
  WHERE l.stage IN ('offer', 'enrolled')
  
  UNION ALL
  
  SELECT
    l.id,
    'offer_to_enrollment' as transition,
    EXTRACT(EPOCH FROM (
      (SELECT MAX(l2.stage_entered_at)
       FROM leads l2 WHERE l2.id = l.id AND l2.stage = 'enrolled')
      -
      (SELECT MAX(l2.stage_entered_at)
       FROM leads l2 WHERE l2.id = l.id AND l2.stage = 'offer')
    )) / 3600.0 as hours_elapsed
  FROM leads l
  WHERE l.stage = 'enrolled'
)
SELECT
  transition as metric,
  ROUND(AVG(hours_elapsed)::numeric, 1) as avg_hours,
  ROUND(MIN(hours_elapsed)::numeric, 1) as min_hours,
  ROUND(MAX(hours_elapsed)::numeric, 1) as max_hours,
  ROUND(
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hours_elapsed)::numeric,
    1
  ) as median_hours,
  COUNT(*) as sample_count,
  CASE
    WHEN transition = 'application_to_interview' THEN 1
    WHEN transition = 'interview_to_offer' THEN 2
    WHEN transition = 'offer_to_enrollment' THEN 3
    ELSE 99
  END as sort_order
FROM stage_transitions
WHERE hours_elapsed IS NOT NULL AND hours_elapsed > 0
GROUP BY transition, sort_order
ORDER BY sort_order ASC;

CREATE INDEX idx_mv_velocity_metric ON mv_lead_velocity(metric);

-- ============================================================================
-- 5. Refresh Function (RPC)
-- ============================================================================
-- Allows refreshing materialized views concurrently
-- Call with: supabase.rpc('refresh_analytics_views')

CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS json AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_leads_by_stage_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversion_funnel;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_consultant_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_lead_velocity;
  
  RETURN json_build_object(
    'success', true,
    'refreshed_at', NOW(),
    'views', ARRAY[
      'mv_leads_by_stage_daily',
      'mv_conversion_funnel',
      'mv_consultant_performance',
      'mv_lead_velocity'
    ]
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'refreshed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Analytics Summary Function (RPC)
-- ============================================================================
-- Provides KPI summary for dashboard cards
-- Call with: supabase.rpc('get_analytics_summary', { from_date: '2026-01-01', to_date: '2026-12-31' })

CREATE OR REPLACE FUNCTION get_analytics_summary(
  from_date DATE,
  to_date DATE
)
RETURNS json AS $$
DECLARE
  v_total_applications INTEGER;
  v_total_enrolled INTEGER;
  v_conversion_rate NUMERIC;
  v_avg_enrollment_hours NUMERIC;
  v_active_consultants INTEGER;
  v_health_score NUMERIC;
BEGIN
  -- Total applications created in date range
  SELECT COUNT(*)
  INTO v_total_applications
  FROM leads
  WHERE created_at::date >= from_date
    AND created_at::date <= to_date
    AND stage = 'application';

  -- Total enrolled in date range
  SELECT COUNT(*)
  INTO v_total_enrolled
  FROM leads
  WHERE created_at::date >= from_date
    AND created_at::date <= to_date
    AND stage = 'enrolled';

  -- Conversion rate
  v_conversion_rate := CASE
    WHEN v_total_applications > 0
      THEN ROUND((v_total_enrolled::numeric / v_total_applications) * 100, 2)
      ELSE 0
  END;

  -- Average time to enrollment
  SELECT ROUND(AVG(
    EXTRACT(EPOCH FROM (stage_entered_at - created_at)) / 3600.0
  )::numeric, 1)
  INTO v_avg_enrollment_hours
  FROM leads
  WHERE created_at::date >= from_date
    AND created_at::date <= to_date
    AND stage = 'enrolled';

  -- Active consultants (assigned leads in period)
  SELECT COUNT(DISTINCT consultant_id)
  INTO v_active_consultants
  FROM leads
  WHERE created_at::date >= from_date
    AND created_at::date <= to_date
    AND consultant_id IS NOT NULL;

  -- Pipeline health score (0-100 based on conversion and velocity)
  -- Formula: (conversion_rate * 0.6) + (100 - min(avg_hours/100, 100)) * 0.4
  v_health_score := ROUND(
    (COALESCE(v_conversion_rate, 0) * 0.6) +
    (100 - LEAST(COALESCE(v_avg_enrollment_hours, 0) / 100, 100)) * 0.4,
    1
  );

  RETURN json_build_object(
    'total_applications', v_total_applications,
    'total_enrolled', v_total_enrolled,
    'conversion_rate', v_conversion_rate,
    'avg_time_to_enrollment_hours', v_avg_enrollment_hours,
    'active_consultants', v_active_consultants,
    'pipeline_health_score', v_health_score
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant Permissions
-- ============================================================================
-- Materialized views should be readable by admins; RPCs should be callable by authenticated users

GRANT SELECT ON mv_leads_by_stage_daily TO authenticated;
GRANT SELECT ON mv_conversion_funnel TO authenticated;
GRANT SELECT ON mv_consultant_performance TO authenticated;
GRANT SELECT ON mv_lead_velocity TO authenticated;

GRANT EXECUTE ON FUNCTION refresh_analytics_views() TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_summary(DATE, DATE) TO authenticated;
