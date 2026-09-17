# Monitoring & Alerting Setup Guide

## Overview

Apex CRM includes a health check endpoint for monitoring uptime and system health. This guide covers setup, configuration, and best practices for production monitoring.

## Health Check Endpoint

**URL:** `/api/health`  
**Method:** GET or HEAD  
**Response Time:** <500ms (typical)  
**Cache:** 10 seconds (public)

### Response Format

**Status 200 (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2026-09-17T12:00:00.000Z",
  "checks": {
    "api": { "status": "up", "responseTime": 5 },
    "database": { "status": "up", "responseTime": 25 }
  }
}
```

**Status 503 (Unhealthy):**
```json
{
  "status": "degraded",
  "timestamp": "2026-09-17T12:00:00.000Z",
  "checks": {
    "api": { "status": "up", "responseTime": 3 },
    "database": { "status": "down", "responseTime": 5000 }
  }
}
```

### HTTP Status Codes

- **200 OK** — All systems healthy
- **503 Service Unavailable** — One or more systems degraded/down

## Monitoring Services Setup

### 1. Uptime Robot (Free)

Simple uptime monitoring with email alerts.

**Setup:**
1. Visit https://uptimerobot.com
2. Sign up (free tier: 50 monitors)
3. Add new monitor:
   - URL: `https://apexcrm.com/api/health`
   - Type: HTTP(s)
   - Interval: 60 seconds (standard)
   - Timeout: 30 seconds
   - Method: GET
4. Add alerts:
   - Email on down
   - SMS on down (paid)
   - Webhook on down (optional)

**Pros:**
- Simple, free tier
- Email/SMS alerts
- Public status page
- Response time tracking

**Cons:**
- Limited monitoring depth
- No error budget tracking
- Webhook on paid plan only

### 2. Pingdom (Paid, Recommended)

Professional uptime monitoring with detailed alerting.

**Setup:**
1. Visit https://www.pingdom.com
2. Sign up
3. Create check:
   - URL: `https://apexcrm.com/api/health`
   - Check interval: 60 seconds
   - Enable "Verify SSL certificate"
4. Set alerts:
   - Down alerts (email, SMS, Slack, PagerDuty)
   - Performance alerts (>2s response time)
   - Regional redundancy checks

**Pros:**
- Multiple regions for redundancy
- Advanced alerting (Slack, PagerDuty, etc.)
- Performance tracking
- API-driven configuration
- RUM (Real User Monitoring)

**Cons:**
- Paid service (~$10/month+)
- Requires account setup

### 3. DataDog (Recommended for Comprehensive Monitoring)

Enterprise monitoring with application performance and infrastructure insights.

**Setup:**
1. Create DataDog account at https://www.datadoghq.com
2. Add Synthetics check:
   - Navigate to Synthetics → New Test
   - Type: API Test
   - URL: `https://apexcrm.com/api/health`
   - Frequency: 1 minute
   - Regions: US-East, EU, APAC
3. Configure alerts:
   - Create Monitor → Synthetics
   - Alert conditions:
     - Endpoint down in 2+ regions
     - Response time > 2 seconds for 5 minutes
     - Error rate > 5%
4. Send to Slack/PagerDuty:
   - Notification → Create team
   - Slack integration (post failures)

**Advanced Monitoring with DataDog:**

```
Application Logs:
- Ingest JSON stdout from Next.js
- Query: service:apex_crm status:error
- Alert on error rate > 5%

Infrastructure:
- Vercel integration for deployment metrics
- Database query performance (Supabase logs)
- Edge function execution times

RUM (Real User Monitoring):
- Frontend error tracking
- Page load performance
- User journey tracking
```

**Pros:**
- Comprehensive observability
- Multiple alert channels
- Error tracking and session replay
- Infrastructure insights
- Advanced dashboards

**Cons:**
- Paid service (~$15-100+/month)
- Steeper learning curve
- Requires log configuration

### 4. Self-Hosted Option (Advanced)

Using open-source tools (Prometheus + Grafana + Alertmanager).

**Architecture:**
```
Your Server
├── Prometheus (scrapes /api/health every 60s)
├── AlertManager (triggers on rules)
└── Grafana (dashboards + alerts)

External Notifications
├── Email (via SMTP)
├── Slack (webhook)
└── PagerDuty (API)
```

**Setup:**
```bash
# 1. Install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.47.0/prometheus-2.47.0.linux-amd64.tar.gz
tar xvfz prometheus-2.47.0.linux-amd64.tar.gz
cd prometheus-2.47.0.linux-amd64

# 2. Configure prometheus.yml
cat > prometheus.yml << 'EOF'
global:
  scrape_interval: 60s
  evaluation_interval: 60s

scrape_configs:
  - job_name: 'apex-crm-health'
    static_configs:
      - targets: ['https://apexcrm.com/api/health']
    metrics_path: '/api/health'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - 'alert_rules.yml'
EOF

# 3. Create alert rules (alert_rules.yml)
cat > alert_rules.yml << 'EOF'
groups:
  - name: apex_crm
    interval: 60s
    rules:
      - alert: ApexCRMDown
        expr: up{job="apex-crm-health"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Apex CRM is down"

      - alert: ApexCRMDegraded
        expr: up{job="apex-crm-health"} == 1 AND database_status != "up"
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Apex CRM database is degraded"
EOF

# 4. Run Prometheus
./prometheus --config.file=prometheus.yml

# 5. Install Grafana
docker run -d -p 3000:3000 grafana/grafana

# 6. Add Prometheus data source in Grafana (http://localhost:9090)
```

**Pros:**
- Free and open-source
- Full control
- No vendor lock-in

**Cons:**
- Requires infrastructure management
- More complex setup
- Need to maintain alert configuration

## Alert Configuration

### Alert Rules

**Critical Alerts (Immediate Action):**
- Endpoint returns 503 for >2 minutes
- Response time >5 seconds (potential outage)
- Database connection failure

**Warning Alerts (Check Status):**
- Response time 2-5 seconds (degradation)
- 50% of health checks failing (network issue)
- Error rate >5% (issues starting)

**Info Alerts (Monitoring):**
- Response time >1 second (trending)
- Deployment started (informational)

### Slack Webhook Integration

**Setup in DataDog/Pingdom:**
```
1. Go to Slack → Create Incoming Webhook
2. Copy webhook URL: https://hooks.slack.com/services/XXX/YYY/ZZZ
3. Add to monitoring service alerts
4. Test with:
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test alert"}' \
     https://hooks.slack.com/services/XXX/YYY/ZZZ
```

**Alert Message Format:**
```
🚨 CRITICAL: Apex CRM Health Check Failed
Status: 503 Service Unavailable
Time: 2026-09-17 12:00:00 UTC
Issue: Database connection down
Response Time: 5000ms
Check: https://apexcrm.com/api/health
Action: Check Supabase console and logs
```

### PagerDuty Integration

**Setup:**
1. Create PagerDuty account
2. Create service "Apex CRM"
3. Create escalation policy (immediate → on-call → manager)
4. Configure integrations:
   - DataDog: API Events
   - Slack: Incident notifications
5. Assign team members

**Escalation Policy Example:**
```
Level 1 (5 min): On-call engineer → SMS + Phone
Level 2 (10 min): Lead engineer → SMS + Phone + Email
Level 3 (15 min): Engineering manager → Email + Slack
```

## Dashboard Setup

### Key Metrics to Display

**Real-time (updated every 60s):**
- Overall status (🟢 Healthy / 🟡 Degraded / 🔴 Down)
- Current uptime (%)
- API response time (ms)
- Database response time (ms)
- Checks failing (0 of N regions)

**Trends (hourly/daily):**
- Uptime graph (last 7 days)
- Response time graph (avg, p95, p99)
- Incident timeline
- Alert frequency

**Example Grafana Dashboard:**
```
┌─────────────────────────────────────────┐
│ Apex CRM Health Dashboard               │
├─────────────────────────────────────────┤
│ Status: 🟢 Healthy | Uptime: 99.98%    │
├─────────────────────────────────────────┤
│ API Response Time     │ DB Response Time │
│ ▁▂▃▄▅▆▇█ 45ms avg   │ ▁▂▃▂▁▂▃▂ 25ms   │
├─────────────────────────────────────────┤
│ Last 24 Hours Uptime                    │
│ ████████████████████ 99.98%             │
├─────────────────────────────────────────┤
│ Recent Alerts                           │
│ • 2026-09-16 14:23 Database slow (OK)   │
│ • 2026-09-16 10:15 Network timeout (OK) │
└─────────────────────────────────────────┘
```

## Testing Health Checks

### Manual Testing

```bash
# Test GET request
curl -i https://apexcrm.com/api/health
# Response: 200 OK with JSON

# Test HEAD request
curl -I https://apexcrm.com/api/health
# Response: 200 OK (no body)

# Test with timing
curl -w "Time: %{time_total}s\n" https://apexcrm.com/api/health

# Test degraded scenario (simulate database failure)
# Check response is 503 with degraded status
```

### Load Testing

```bash
# Test health check under load using Apache Bench
ab -n 1000 -c 10 https://apexcrm.com/api/health
# Typical result: ~5000 requests/second on Vercel

# Using wrk (better tool)
wrk -t4 -c100 -d30s https://apexcrm.com/api/health
```

## Incident Response

### When Health Check Fails

**Immediate Actions (0-5 min):**
1. Check Slack alert for specific failure
2. Visit dashboard to see current status
3. Check Vercel deployment status
4. Check Supabase status page

**Diagnosis (5-15 min):**
1. Is API up? (ping /api/health)
2. Is database responsive? (Supabase console)
3. Are there recent deployments? (Vercel dashboard)
4. Check logs for errors:
   ```bash
   # Vercel logs
   vercel logs --tail
   
   # Supabase logs (RLS violations, slow queries)
   # Dashboard → Logs → Query Performance
   ```

**Recovery (15-60 min):**
1. Restart function (Vercel auto-scales)
2. Check database replication lag
3. Revert recent deployment if needed
4. Notify stakeholders

### Post-Incident

1. Document what happened (time, cause, impact)
2. Add to runbook for future reference
3. Update alert thresholds if needed
4. Consider improvements (redundancy, caching, etc.)

## Production Checklist

Before going live:

- [ ] Health check endpoint deployed and returning 200
- [ ] Uptime monitor configured (Uptime Robot or Pingdom)
- [ ] Slack alerts configured with webhook
- [ ] Dashboard created and shared with team
- [ ] Alert rules tested (manually trigger with broken DB)
- [ ] On-call schedule configured
- [ ] Runbook documented for incident response
- [ ] Team trained on alert handling
- [ ] Response time baselines established
- [ ] Backup monitoring service configured (if using single vendor)

## Performance Baseline

Target metrics for Apex CRM:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Response | <100ms | >500ms |
| Database Response | <50ms | >1000ms |
| Uptime | 99.9% | <99% |
| Error Rate | <0.1% | >5% |
| P95 Response Time | <200ms | >2000ms |

## References

- [Vercel Monitoring](https://vercel.com/docs/concepts/observability)
- [Supabase Monitoring](https://supabase.com/docs/guides/platform/logs)
- [Prometheus Metrics](https://prometheus.io/docs/introduction/overview/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [DataDog Synthetics](https://docs.datadoghq.com/synthetics/)
- [Uptime Robot Documentation](https://uptimerobot.com/help/)
- [PagerDuty Integration](https://support.pagerduty.com/docs)
