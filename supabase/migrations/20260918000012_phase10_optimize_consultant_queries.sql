-- Phase 10: Optimize N+1 queries in consultant dashboard
-- Creates materialized views and indexes for efficient consultant portfolio fetching

-- 1. Materialized view: consultant_portfolio_view
-- Denormalizes consultant leads with student names in one query
CREATE MATERIALIZED VIEW consultant_portfolio_view AS
SELECT
  l.id,
  l.consultant_id,
  l.reference_code,
  l.stage,
  l.status,
  l.student_id,
  l.created_at,
  l.target_country,
  l.stalled_at,
  p.full_name as student_name,
  p.email as student_email
FROM leads l
LEFT JOIN profiles p ON l.student_id = p.id
WHERE l.status != 'dropped';

-- Create index on consultant_portfolio_view for fast lookups
CREATE INDEX idx_consultant_portfolio_view_consultant_id 
  ON consultant_portfolio_view(consultant_id);

-- 2. Materialized view: consultant_metrics_view
-- Pre-calculates key metrics for consultants to avoid expensive aggregations
CREATE MATERIALIZED VIEW consultant_metrics_view AS
SELECT
  c.id as consultant_id,
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT CASE WHEN l.stage = 'enrolled' THEN l.id END) as enrolled_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'stalled' THEN l.id END) as stalled_leads,
  COUNT(DISTINCT CASE WHEN l.stage = 'enrolled' AND l.created_at >= NOW() - INTERVAL '30 days' THEN l.id END) as admitted_thirty_days,
  ROUND(COALESCE(AVG(EXTRACT(DAY FROM (NOW() - l.created_at))), 0)::numeric, 1) as avg_lead_age_days
FROM profiles c
LEFT JOIN leads l ON c.id = l.consultant_id AND l.status != 'dropped'
WHERE c.role = 'consultant'
GROUP BY c.id;

-- Create index on consultant_metrics_view for fast lookups
CREATE INDEX idx_consultant_metrics_view_consultant_id 
  ON consultant_metrics_view(consultant_id);

-- 3. Indexes for common queries
-- Index on leads for consultant lookups
CREATE INDEX idx_leads_consultant_status 
  ON leads(consultant_id, status) 
  WHERE status != 'dropped';

-- Index on leads for student lookups (used in portfolio table)
CREATE INDEX idx_leads_student_created 
  ON leads(student_id, created_at DESC) 
  WHERE status != 'dropped';

-- Index on pipeline_stage_labels for label lookups
CREATE INDEX idx_pipeline_stage_labels_stage 
  ON pipeline_stage_labels(stage);

-- Index on profiles for role-based lookups
CREATE INDEX idx_profiles_role 
  ON profiles(role) 
  WHERE role = 'consultant';

-- 4. Function to refresh materialized views (to be called periodically or on demand)
CREATE OR REPLACE FUNCTION refresh_consultant_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY consultant_portfolio_view;
  REFRESH MATERIALIZED VIEW CONCURRENTLY consultant_metrics_view;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT SELECT ON consultant_portfolio_view TO authenticated;
GRANT SELECT ON consultant_metrics_view TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_consultant_views TO authenticated;
