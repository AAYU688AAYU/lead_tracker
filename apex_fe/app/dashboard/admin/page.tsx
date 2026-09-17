import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/(auth)/login/actions'
import { getAdminLeads, getEscalatedStalls } from './actions'
import { LeadAssignList } from './lead-assign'
import { OperationalLine } from './operational-line'
import { AttentionList } from './attention-list'
import { FunnelVisualization } from './funnel-visualization'
import type { Profile } from '@/lib/supabase/types'

type ProfileRow = Pick<Profile, 'full_name' | 'email' | 'role'>

export async function generateMetadata(): Promise<Metadata> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return {
        title: 'Admin Dashboard — Apex CRM',
        description: 'Manage admissions pipeline and team',
      }
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, email, role')
      .eq('id', user.id)
      .single()

    const profile = profileData as ProfileRow | null
    const displayName = profile?.full_name ?? profile?.email ?? 'Admin'

    return {
      title: `${displayName} — Admin Dashboard — Apex CRM`,
      description: 'Manage consultant capacity, track escalations, and monitor admissions pipeline.',
      openGraph: {
        title: `Admin Dashboard — Apex CRM`,
        description: 'Full pipeline visibility and team management',
        type: 'website',
      },
    }
  } catch (error) {
    return {
      title: 'Admin Dashboard — Apex CRM',
      description: 'Manage admissions pipeline and team',
    }
  }
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as ProfileRow | null
  if (profile?.role !== 'admin') {
    redirect(profile?.role === 'consultant' ? '/dashboard/consultant' : '/dashboard/student')
  }

  const { stages, leads, consultants } = await getAdminLeads()
  const evaluatedAt = new Date()

  // ── Summary figures ────────────────────────────────────────────────────
  const totalLeads      = leads.length
  const totalStalled    = leads.filter(l => l.status === 'stalled').length
  const totalUnassigned = leads.filter(l => !l.consultant_id).length
  const totalActive     = leads.filter(l => l.status === 'active').length

  // Pipeline summary — active + stalled counts per stage
  const stageSummary = stages.map(s => ({
    ...s,
    active:  leads.filter(l => l.stage === s.stage && l.status === 'active').length,
    stalled: leads.filter(l => l.stage === s.stage && l.status === 'stalled').length,
  }))

  // Find stage with most leads for funnel highlight
  const stageWithMostLeads = stageSummary.reduce((max, s) => 
    (s.active + s.stalled > max.active + max.stalled) ? s : max
  )

  // Per-consultant open lead counts for the capacity table
  const openCountMap = new Map<string, number>()
  for (const l of leads) {
    if (l.consultant_id && (l.status === 'active' || l.status === 'stalled')) {
      openCountMap.set(l.consultant_id, (openCountMap.get(l.consultant_id) ?? 0) + 1)
    }
  }

  // Fetch escalated stalls
  const stalledLeadIds = leads.filter(l => l.status === 'stalled').map(l => l.id)
  const escalatedStalls = await getEscalatedStalls(stalledLeadIds, stages)

  // Prepare data for attention list
  const attentionListData = {
    escalatedStalls,
    unassignedLeads: leads.filter(l => !l.consultant_id),
  }

  return (
    <main className="min-h-full bg-[var(--background)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-10">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text)]">
              {profile?.full_name ?? profile?.email}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">Admin dashboard</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-[var(--text-muted)] underline-offset-2 hover:text-[var(--text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              Sign out
            </button>
          </form>
        </div>

        {/* ── Operational Line (TASK #1) ──────────────────────────────── */}
        <OperationalLine
          totalActive={totalActive}
          totalStalled={totalStalled}
          totalUnassigned={totalUnassigned}
          evaluatedAt={evaluatedAt}
        />

        {/* ── Funnel Visualization (TASK #3) ──────────────────────────── */}
        <FunnelVisualization
          stageSummary={stageSummary}
          highlightStage={stageWithMostLeads.stage}
        />

        {/* ── Attention List (TASK #2) ────────────────────────────────── */}
        <AttentionList
          escalatedStalls={attentionListData.escalatedStalls}
          unassignedLeads={attentionListData.unassignedLeads}
          stages={stages}
          consultants={consultants}
        />

        {/* ── Consultant capacity ─────────────────────────────────────── */}
        <section aria-labelledby="capacity-heading">
          <h2
            id="capacity-heading"
            className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          >
            Consultant capacity
          </h2>
          {consultants.length > 0 ? (
            <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--background)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Open leads</th>
                    <th className="px-4 py-3">Capacity</th>
                    <th className="px-4 py-3">Accepting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {consultants.map(c => {
                    const atCapacity = c.max_lead_capacity != null && c.open_leads >= c.max_lead_capacity
                    return (
                      <tr key={c.id} className="hover:bg-[var(--background)]">
                        <td className="px-4 py-3 font-medium text-[var(--text)]">{c.name}</td>
                        <td className="px-4 py-3 text-[var(--text)]">{c.open_leads}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{c.max_lead_capacity ?? '—'}</td>
                        <td className="px-4 py-3">
                          {c.is_accepting_leads && !atCapacity
                            ? <span className="text-xs font-medium text-[var(--accent)]">Yes</span>
                            : <span className="text-xs text-[var(--text-muted)]">No</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No consultants yet.</p>
          )}
        </section>

        {/* ── All leads — with assignment ──────────────────────────────── */}
        <section aria-labelledby="all-leads-heading">
          <h2
            id="all-leads-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          >
            All leads
            {totalUnassigned > 0 && (
              <span className="ml-2 rounded-[var(--radius-pill)] bg-[var(--stalled)] px-2 py-0.5 text-[10px] font-bold text-white">
                {totalUnassigned} unassigned
              </span>
            )}
          </h2>
          <LeadAssignList
            leads={leads}
            stages={stages}
            consultants={consultants}
          />
        </section>

      </div>
    </main>
  )
}
