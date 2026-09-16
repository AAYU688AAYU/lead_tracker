import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/(auth)/login/actions'
import { getConsultantLeads } from './actions'
import { KanbanBoard } from './kanban-board'
import { NotificationBell } from '@/app/components/notification-bell'
import type { Profile } from '@/lib/supabase/types'

type ProfileRow = Pick<Profile, 'full_name' | 'email' | 'role'>

export default async function ConsultantDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as ProfileRow | null

  if (profile?.role !== 'consultant') {
    redirect(profile?.role === 'admin' ? '/dashboard/admin' : '/dashboard/student')
  }

  const { stages, leads, unread_notifications } = await getConsultantLeads(user.id)

  // ── Metrics ──────────────────────────────────────────────────────────────
  const activeCount  = leads.filter(l => l.status === 'active').length
  const stalledCount = leads.filter(l => l.status === 'stalled').length

  const now              = new Date()
  const monthStart       = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const createdThisMonth = leads.filter(l => l.created_at >= monthStart).length
  const enrolledThisMonth = leads.filter(
    l => l.status === 'completed' && l.stage === 'enrolled' && l.created_at >= monthStart
  ).length
  const conversionPct =
    createdThisMonth === 0
      ? null
      : Math.round((enrolledThisMonth / createdThisMonth) * 100)

  const displayName = profile?.full_name ?? profile?.email ?? 'Consultant'

  return (
    <div className="flex min-h-full flex-col bg-[var(--background)]">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between gap-4 px-4 sm:px-6">

          {/* Left: app name + role label */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-semibold text-[var(--text)] truncate">
              Apex CRM
            </span>
            <span
              className="hidden sm:inline text-xs text-[var(--text-muted)]"
              aria-label="Signed in as consultant"
            >
              Consultant
            </span>
          </div>

          {/* Right: live notification bell + sign out */}
          <div className="flex items-center gap-3 shrink-0">
            {/*
              NotificationBell is a Client Component.
              It receives the server-rendered seed count and subscribes to
              Realtime for live increments — no manual refresh required.
            */}
            <NotificationBell
              userId={user.id}
              initialUnread={unread_notifications}
            />

            {/* Sign out */}
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Page body ───────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-screen-xl space-y-6">

          {/* Page title */}
          <div>
            <h1 className="text-lg font-semibold text-[var(--text)]">{displayName}</h1>
            <p className="text-sm text-[var(--text-muted)]">Pipeline</p>
          </div>

          {/* ── Metrics row ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Active leads"         value={String(activeCount)} />
            <MetricCard label="Stalled"              value={String(stalledCount)} highlight={stalledCount > 0} />
            <MetricCard
              label="Conversion this month"
              value={conversionPct === null ? '—' : `${conversionPct}%`}
              sub={
                conversionPct !== null
                  ? `${enrolledThisMonth} enrolled of ${createdThisMonth} created`
                  : 'No leads created this month'
              }
            />
          </div>

          {/* ── Kanban / mobile list ─────────────────────────────────────── */}
          <section aria-labelledby="pipeline-heading">
            <h2
              id="pipeline-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
            >
              Pipeline
            </h2>
            {/*
              Phase 7: consultantId is passed so KanbanBoard can scope its
              Realtime subscription to consultant_id = this user's id.
            */}
            <KanbanBoard
              stages={stages}
              initialLeads={leads}
              consultantId={user.id}
            />
          </section>

        </div>
      </main>

    </div>
  )
}

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  sub,
  highlight = false,
}: {
  label:      string
  value:      string
  sub?:       string
  highlight?: boolean
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3">
      <p className="text-xs text-[var(--text-muted)] leading-snug">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${highlight ? 'text-[var(--stalled)]' : 'text-[var(--text)]'}`}>
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{sub}</p>
      )}
    </div>
  )
}
