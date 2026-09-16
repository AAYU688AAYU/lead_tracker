import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { IntakeForm } from './intake-form'
import type { Program, University } from '@/lib/supabase/types'

export const metadata: Metadata = {
  title: 'Apply — Apex',
  description: 'Submit your student application.',
}

// ---------------------------------------------------------------------------
// Data shape passed to the client form
// ---------------------------------------------------------------------------
export interface ProgramOption {
  id:              string
  name:            string
  degree_level:    string | null
  university_id:   string
  university_name: string
}

// The Supabase join shape returned by .select('... universities(name)')
// Cast is necessary because the hand-authored Database type has Relationships: []
// which causes the query-builder inference to resolve to never[].
type ProgramRow = Program & { universities: Pick<University, 'name'> | null }

// ---------------------------------------------------------------------------
// Page — Server Component
// Fetches programs grouped by university for the dropdown.
// The Phase 2 migration adds anon SELECT on universities + programs so this
// works without a session.
// ---------------------------------------------------------------------------
export default async function ApplyPage() {
  const supabase = await createClient()

  const { data: rawRows } = await supabase
    .from('programs')
    .select('id, name, degree_level, university_id, universities(name)')
    .order('name')

  // Assert the join shape — Supabase returns it correctly at runtime even
  // though the TS types can't express it without Relationships populated.
  const rows = (rawRows ?? []) as unknown as ProgramRow[]

  const programOptions: ProgramOption[] = rows.map((p) => ({
    id:              p.id,
    name:            p.name,
    degree_level:    p.degree_level,
    university_id:   p.university_id,
    university_name: p.universities?.name ?? 'Unknown University',
  }))

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-[560px]">
        {/* Single marketing line above the form */}
        <p className="mb-8 text-sm text-[var(--text-muted)]">
          A consultant will review your application within 24 hours.
        </p>

        <IntakeForm programs={programOptions} />
      </div>
    </main>
  )
}
