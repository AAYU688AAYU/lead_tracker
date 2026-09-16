'use client'

/**
 * TeamTable — client component for /dashboard/admin/team
 *
 * Responsibilities:
 *  - Render the consultant table with all computed stats
 *  - is_accepting_leads toggle (optimistic, useActionState)
 *  - Per-row "Offboard" button that opens an inline confirmation panel
 *    where the admin picks a replacement consultant and confirms
 */

import { useActionState, useState, useCallback } from 'react'
import { toggleAccepting, offboardConsultant } from './actions'
import type {
  TeamConsultantRow,
  ToggleAcceptingState,
  OffboardState,
} from '../types'
import { INITIAL_TOGGLE_STATE, INITIAL_OFFBOARD_STATE } from '../types'

// ---------------------------------------------------------------------------
// Design-token helpers
// ---------------------------------------------------------------------------

const btnBase =
  'rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 disabled:opacity-50'

const btnOutline =
  btnBase +
  ' border border-[var(--border)] bg-white text-[var(--text-muted)] ' +
  'hover:border-[var(--accent)] hover:text-[var(--accent)]'

const btnDestructive =
  btnBase +
  ' border border-[var(--destructive)] bg-white text-[var(--destructive)] ' +
  'hover:bg-[var(--destructive)] hover:text-white'

const btnPrimary =
  btnBase +
  ' bg-[var(--accent)] text-white hover:opacity-90'

// ---------------------------------------------------------------------------
// ToggleForm — is_accepting_leads switch for a single row
// ---------------------------------------------------------------------------

function ToggleForm({
  consultantId,
  currentValue,
  onToggled,
}: {
  consultantId:  string
  currentValue:  boolean
  onToggled:     (id: string, val: boolean) => void
}) {
  const [state, action, pending] = useActionState<ToggleAcceptingState, FormData>(
    toggleAccepting,
    INITIAL_TOGGLE_STATE,
  )

  // Propagate success back up
  if (state.status === 'success' && state.consultant_id === consultantId) {
    // Call only when value actually differs from what the parent already has
    // (avoid re-render loop — parent will update currentValue on next render)
  }

  const displayed = state.status === 'success' && state.consultant_id === consultantId
    ? state.is_accepting_leads
    : currentValue

  return (
    <form
      action={async (fd: FormData) => {
        const result = await action(fd) as unknown as ToggleAcceptingState
        if (result && 'status' in result && result.status === 'success') {
          onToggled(result.consultant_id, result.is_accepting_leads)
        }
      }}
    >
      <input type="hidden" name="consultant_id" value={consultantId} />
      <input type="hidden" name="new_value"     value={String(!displayed)} />
      <button
        type="submit"
        disabled={pending}
        aria-label={displayed ? 'Accepting leads — click to stop' : 'Not accepting — click to enable'}
        className={[
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2',
          'disabled:opacity-50',
          displayed ? 'bg-[var(--accent)]' : 'bg-[var(--border)]',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform',
            displayed ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
      {state.status === 'error' && (
        <span role="alert" className="ml-2 text-xs text-[var(--destructive)]">
          {state.message}
        </span>
      )}
    </form>
  )
}

// ---------------------------------------------------------------------------
// OffboardPanel — inline confirmation panel for a single consultant
// ---------------------------------------------------------------------------

function OffboardPanel({
  consultant:    c,
  replacements:  others,
  onComplete:    handleComplete,
  onCancel:      handleCancel,
}: {
  consultant:   TeamConsultantRow
  replacements: TeamConsultantRow[]
  onComplete:   (moved: number) => void
  onCancel:     () => void
}) {
  const [state, action, pending] = useActionState<OffboardState, FormData>(
    offboardConsultant,
    INITIAL_OFFBOARD_STATE,
  )

  if (state.status === 'success') {
    // Bubble up so parent can close the panel
    handleComplete(state.moved)
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="from_id" value={c.id} />

      <p className="text-sm text-[var(--text)]">
        This will reassign all{' '}
        <span className="font-semibold">{c.active_leads + c.stalled_leads}</span>{' '}
        active / stalled lead{c.active_leads + c.stalled_leads === 1 ? '' : 's'} from{' '}
        <span className="font-semibold">{c.full_name}</span> to:
      </p>

      <select
        name="to_id"
        required
        disabled={pending}
        defaultValue=""
        className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
        aria-label="Select replacement consultant"
      >
        <option value="" disabled>— Select replacement consultant —</option>
        {others.map(o => (
          <option key={o.id} value={o.id}>
            {o.full_name} ({o.email}) · {o.active_leads + o.stalled_leads} open
            {o.max_lead_capacity != null
              ? ` / ${o.max_lead_capacity}`
              : ''}
          </option>
        ))}
      </select>

      {state.status === 'error' && (
        <p role="alert" className="text-xs text-[var(--destructive)]">{state.message}</p>
      )}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className={btnDestructive}>
          {pending ? 'Reassigning…' : 'Confirm offboard'}
        </button>
        <button type="button" onClick={handleCancel} disabled={pending} className={btnOutline}>
          Cancel
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// TeamTable — main export
// ---------------------------------------------------------------------------

export function TeamTable({ initialConsultants }: { initialConsultants: TeamConsultantRow[] }) {
  const [consultants, setConsultants] = useState<TeamConsultantRow[]>(initialConsultants)
  const [offboardingId, setOffboardingId] = useState<string | null>(null)
  const [offboardMsg,   setOffboardMsg]   = useState<string | null>(null)

  const handleToggled = useCallback((id: string, val: boolean) => {
    setConsultants(prev =>
      prev.map(c => c.id === id ? { ...c, is_accepting_leads: val } : c)
    )
  }, [])

  const handleOffboardComplete = useCallback((moved: number) => {
    setOffboardMsg(
      moved === 0
        ? 'No active leads to move.'
        : `${moved} lead${moved === 1 ? '' : 's'} successfully reassigned.`
    )
    setOffboardingId(null)
    // Remove the offboarded consultant from the local list so the table
    // reflects the change immediately (they still exist in DB — just hidden here)
    // Actually keep them visible but zero out their open leads
    setConsultants(prev =>
      prev.map(c => c.id === offboardingId
        ? { ...c, active_leads: 0, stalled_leads: 0 }
        : c
      )
    )
  }, [offboardingId])

  return (
    <div className="space-y-4">
      {/* ── Flash message ──────────────────────────────────────────── */}
      {offboardMsg && (
        <div
          role="status"
          className="rounded-[var(--radius-md)] border border-[var(--accent)] bg-emerald-50 px-4 py-2 text-sm text-[var(--accent)]"
        >
          {offboardMsg}
          <button
            type="button"
            onClick={() => setOffboardMsg(null)}
            className="ml-3 text-xs underline underline-offset-2 hover:no-underline focus:outline-none"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────── */}
      {consultants.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No consultants found.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-white text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-right">Active</th>
                <th className="px-4 py-3 text-right">Stalled</th>
                <th className="px-4 py-3 text-right">Conversion</th>
                <th className="px-4 py-3 text-right">Capacity</th>
                <th className="px-4 py-3 text-center">Accepting</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {consultants.map(c => {
                const isOffboarding = offboardingId === c.id
                const openLeads     = c.active_leads + c.stalled_leads
                const atCapacity    = c.max_lead_capacity != null && openLeads >= c.max_lead_capacity

                return (
                  <>
                    <tr
                      key={c.id}
                      className={[
                        'hover:bg-[var(--background)]',
                        isOffboarding ? 'bg-[var(--background)]' : '',
                      ].join(' ')}
                    >
                      {/* Name */}
                      <td className="px-4 py-3 font-medium text-[var(--text)]">
                        {c.full_name}
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-[var(--text-muted)]">{c.email}</td>

                      {/* Active */}
                      <td className="px-4 py-3 text-right text-[var(--text)]">
                        {c.active_leads}
                      </td>

                      {/* Stalled */}
                      <td className="px-4 py-3 text-right">
                        {c.stalled_leads > 0
                          ? <span className="font-medium text-[var(--stalled)]">{c.stalled_leads}</span>
                          : <span className="text-[var(--text-muted)]">0</span>}
                      </td>

                      {/* Conversion */}
                      <td className="px-4 py-3 text-right text-[var(--text)]">
                        {c.completed_leads === 0 && c.active_leads + c.stalled_leads === 0
                          ? <span className="text-[var(--text-muted)]">—</span>
                          : `${Math.round(c.conversion_rate * 100)}%`}
                      </td>

                      {/* Capacity */}
                      <td className="px-4 py-3 text-right">
                        <span className={atCapacity ? 'font-medium text-[var(--stalled)]' : 'text-[var(--text)]'}>
                          {openLeads}
                        </span>
                        <span className="text-[var(--text-muted)]">
                          {' / '}{c.max_lead_capacity ?? '∞'}
                        </span>
                      </td>

                      {/* Accepting toggle */}
                      <td className="px-4 py-3 text-center">
                        <ToggleForm
                          consultantId={c.id}
                          currentValue={c.is_accepting_leads}
                          onToggled={handleToggled}
                        />
                      </td>

                      {/* Offboard action */}
                      <td className="px-4 py-3 text-right">
                        {isOffboarding ? null : (
                          <button
                            type="button"
                            onClick={() => {
                              setOffboardMsg(null)
                              setOffboardingId(c.id)
                            }}
                            className={btnDestructive}
                            aria-label={`Offboard ${c.full_name}`}
                          >
                            Offboard
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Inline offboard confirmation panel */}
                    {isOffboarding && (
                      <tr key={`${c.id}-offboard`}>
                        <td
                          colSpan={8}
                          className="bg-[var(--background)] px-4 py-4"
                        >
                          <div className="rounded-[var(--radius-md)] border border-[var(--destructive)] bg-white p-4">
                            <h3 className="mb-3 text-sm font-semibold text-[var(--destructive)]">
                              Offboard {c.full_name}
                            </h3>
                            <OffboardPanel
                              consultant={c}
                              replacements={consultants.filter(x => x.id !== c.id)}
                              onComplete={handleOffboardComplete}
                              onCancel={() => setOffboardingId(null)}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
