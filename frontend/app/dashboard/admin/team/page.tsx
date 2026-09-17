import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTeam } from './actions'
import { TeamTable } from './team-table'

export default async function TeamPage() {
  // Auth guard — double-check role server-side (middleware already covers this,
  // but defence-in-depth is the pattern used throughout the app)
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

  const consultants = await getTeam()

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text)]">Team</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage consultant capacity, availability, and offboarding.
        </p>
      </div>

      {/* ── Consultant table ─────────────────────────────────────────── */}
      <TeamTable initialConsultants={consultants} />
    </main>
  )
}
