import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/(auth)/login/actions'
import { getStudentDashboardData } from './actions'
import { LeadRow } from './lead-panel'
import type { UserRole } from '@/lib/supabase/types'

type ProfileRow = {
  full_name: string | null
  email:     string | null
  role:      UserRole
}

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as ProfileRow | null

  if (profile?.role !== 'student') {
    redirect(profile?.role === 'admin' ? '/dashboard/admin' : '/dashboard/consultant')
  }

  const { stages, leads } = await getStudentDashboardData(user.id)

  // Counts for the summary strip
  const total     = leads.length
  const active    = leads.filter((l) => l.status === 'active').length
  const completed = leads.filter((l) => l.status === 'completed').length

  return (
    <main className="min-h-full bg-[var(--background)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text)]">
              {profile?.full_name ?? profile?.email ?? 'Your account'}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">Student dashboard</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-[var(--text-muted)] underline-offset-2 hover:text-[var(--text)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
            >
              Sign out
            </button>
          </form>
        </div>

        {/* ── Summary strip ───────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Applications" value={String(total)} />
          <StatCard label="Active"       value={String(active)} />
          <StatCard label="Completed"    value={String(completed)} />
        </div>

        {/* ── Application list ────────────────────────────────────────── */}
        <section aria-labelledby="applications-heading">
          <h2
            id="applications-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          >
            Your applications
          </h2>

          {leads.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-6 py-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">No applications yet.</p>
              <a
                href="/apply"
                className="mt-4 inline-block text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
              >
                Submit an application →
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {leads.map((lead, idx) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  stages={stages}
                  studentId={user.id}
                  defaultOpen={idx === 0}   // expand the first (most recent) lead by default
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--text)]">{value}</p>
    </div>
  )
}
