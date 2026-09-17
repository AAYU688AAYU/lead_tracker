import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getConsultantDetail } from './actions'
import { PortfolioTable } from './portfolio-table'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ConsultantDetailPage({ params }: PageProps) {
  const { id: consultantId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profileData as { role: string } | null)?.role !== 'admin') {
    redirect('/dashboard/admin')
  }

  const data = await getConsultantDetail(consultantId)
  if (!data) redirect('/dashboard/admin/team')

  const { consultant, metrics, portfolio } = data

  // Format metrics for display
  const conversionPct = Math.round(metrics.conversionRate * 100)
  const capacityPct =
    consultant.max_lead_capacity
      ? Math.round((portfolio.length / consultant.max_lead_capacity) * 100)
      : 0

  return (
    <main className="min-h-full bg-[var(--background)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href="/dashboard/admin/team"
              className="mb-4 inline-flex items-center gap-2 text-xs text-[var(--accent)] hover:underline"
            >
              ← Back to Team
            </Link>
            <h1 className="text-2xl font-semibold text-[var(--text)]">
              {consultant.full_name}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {consultant.email}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-2 text-right">
              <p className="text-xs text-[var(--text-muted)]">Accepting leads</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                {consultant.is_accepting_leads ? 'Yes' : 'No'}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-2 text-right">
              <p className="text-xs text-[var(--text-muted)]">Capacity</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                {portfolio.length} {consultant.max_lead_capacity && `/ ${consultant.max_lead_capacity}`}
              </p>
            </div>
          </div>
        </div>

        {/* ── Performance Metrics ──────────────────────────────────────── */}
        <section aria-labelledby="metrics-heading">
          <h2
            id="metrics-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          >
            Performance summary
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Conversion Rate */}
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-4">
              <p className="text-xs text-[var(--text-muted)]">Conversion rate</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--accent)]">
                {portfolio.length === 0 ? '—' : `${conversionPct}%`}
              </p>
              {portfolio.length > 0 && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {metrics.conversionRate === 0
                    ? 'No admissions yet'
                    : `${Math.round(metrics.conversionRate * portfolio.length)} of ${portfolio.length} leads`}
                </p>
              )}
            </div>

            {/* Avg Lead Age */}
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-4">
              <p className="text-xs text-[var(--text-muted)]">Avg lead age</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--text)]">
                {portfolio.length === 0 ? '—' : `${metrics.avgLeadAgeDays}d`}
              </p>
              {portfolio.length > 0 && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Days in pipeline
                </p>
              )}
            </div>

            {/* Admitted (30d) */}
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-4">
              <p className="text-xs text-[var(--text-muted)]">Admitted (30d)</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--text)]">
                {metrics.totalAdmittedThirtyDays}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Last 30 days
              </p>
            </div>

            {/* Stalled Count */}
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-4">
              <p className="text-xs text-[var(--text-muted)]">Currently stalled</p>
              <p
                className={`mt-2 text-3xl font-semibold ${
                  metrics.stalledLeadsCount > 0
                    ? 'text-[var(--stalled)]'
                    : 'text-[var(--text)]'
                }`}
              >
                {metrics.stalledLeadsCount}
              </p>
              {metrics.stalledLeadsCount > 0 && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Needs attention
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Portfolio Table ──────────────────────────────────────────── */}
        <section aria-labelledby="portfolio-heading">
          <h2
            id="portfolio-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          >
            Portfolio — {portfolio.length} {portfolio.length === 1 ? 'lead' : 'leads'}
          </h2>
          <PortfolioTable leads={portfolio} />
        </section>
      </div>
    </main>
  )
}
