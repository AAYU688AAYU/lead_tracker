import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPipelineSettings } from './actions'
import { PipelineSettingsClient } from './pipeline-settings-client'

export default async function PipelineSettingsPage() {
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

  const stages = await getPipelineSettings()

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text)]">Pipeline Settings</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Edit stage labels and stall thresholds. Changes take effect immediately
          across the consultant dashboard and student status page — no redeploy needed.
        </p>
      </div>

      {/* ── Stage settings table ──────────────────────────────────────── */}
      <PipelineSettingsClient stages={stages} />

      {/* ── Help note ────────────────────────────────────────────────── */}
      <p className="mt-4 text-xs text-[var(--text-muted)]">
        Click a label or threshold field and then click away to save automatically.
        The stage key is fixed and cannot be changed.
      </p>
    </main>
  )
}
