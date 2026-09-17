import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAnalytics } from './actions'
import { AnalyticsClient } from './analytics-client'

// ---------------------------------------------------------------------------
// Default date range helpers — current calendar year
// ---------------------------------------------------------------------------

function defaultDateRange() {
  const now   = new Date()
  const year  = now.getFullYear()
  const pad   = (n: number) => String(n).padStart(2, '0')
  const from  = `${year}-01-01`
  const to    = `${year}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return { from, to }
}

// ---------------------------------------------------------------------------
// AnalyticsPage — Server Component
// ---------------------------------------------------------------------------

export default async function AnalyticsPage(props: PageProps<'/dashboard/admin/analytics'>) {
  // Auth guard
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

  // Resolve search params — Next.js 15 searchParams is a Promise
  const sp = await props.searchParams

  const defaults = defaultDateRange()
  const from         = (typeof sp?.from         === 'string' && sp.from)         ? sp.from         : defaults.from
  const to           = (typeof sp?.to           === 'string' && sp.to)           ? sp.to           : defaults.to
  const consultantId = (typeof sp?.consultantId === 'string' && sp.consultantId) ? sp.consultantId : ''

  const data = await getAnalytics({ from, to, consultantId })

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[var(--text)]">Analytics</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Live pipeline snapshot and date-range conversion metrics.
        </p>
      </div>

      {/* ── Client component — handles filters, chart, stat ─────────── */}
      <AnalyticsClient
        data={data}
        from={from}
        to={to}
        consultantId={consultantId}
      />
    </main>
  )
}
