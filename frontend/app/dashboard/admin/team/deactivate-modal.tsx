'use client'

/**
 * DeactivateModal — TASK #6
 *
 * Confirmation modal for consultant deactivation:
 * - Shows consultant name and active lead count
 * - Explains consequences: "Deactivating will flag all N for reassignment"
 * - Warning: "This cannot be undone"
 * - Actions: Cancel | Deactivate and flag leads
 */

import { useActionState } from 'react'
import { deactivateConsultant } from './actions'
import { INITIAL_OFFBOARD_STATE } from '../types'
import type { OffboardState } from '../types'
import type { TeamConsultantRow } from '../types'

interface DeactivateModalProps {
  consultant: TeamConsultantRow
  isOpen: boolean
  onClose: () => void
}

export function DeactivateModal({
  consultant,
  isOpen,
  onClose,
}: DeactivateModalProps) {
  const [state, action, pending] = useActionState<OffboardState, FormData>(
    deactivateConsultant,
    INITIAL_OFFBOARD_STATE,
  )

  if (!isOpen) return null

  if (state.status === 'success') {
    // Show success state briefly then close
    setTimeout(() => {
      onClose()
    }, 1500)

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-[var(--radius-md)] bg-white p-6 shadow-lg max-w-md w-full mx-4">
          <h2 className="text-lg font-semibold text-[var(--accent)] mb-2">
            ✓ Consultant deactivated
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            {state.moved} lead{state.moved === 1 ? '' : 's'} flagged for reassignment.
          </p>
        </div>
      </div>
    )
  }

  const openLeads = consultant.active_leads + consultant.stalled_leads

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-[var(--radius-md)] bg-white shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--destructive)]">
            Deactivate {consultant.full_name}?
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            This action cannot be undone.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <div className="rounded-[var(--radius-md)] bg-[var(--background)] p-3 text-sm text-[var(--text)]">
            <p className="font-medium mb-2">Consequences:</p>
            <ul className="space-y-1 text-xs text-[var(--text-muted)] list-disc list-inside">
              <li>Consultant will be marked as inactive</li>
              <li>
                {openLeads} active/stalled lead{openLeads === 1 ? '' : 's'} will be flagged for
                reassignment
              </li>
              <li>All super-admins will be notified</li>
              <li>Activity logs will record this event</li>
            </ul>
          </div>

          <form action={action} className="space-y-3">
            <input type="hidden" name="consultant_id" value={consultant.id} />

            {state.status === 'error' && (
              <p role="alert" className="text-xs text-[var(--destructive)]">
                {state.message}
              </p>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-[var(--radius-sm)] border border-[var(--destructive)] bg-[var(--destructive)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--destructive)] focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {pending ? 'Deactivating…' : 'Deactivate and flag leads'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
