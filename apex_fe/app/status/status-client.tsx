'use client'

import { useActionState } from 'react'
import { lookupApplication } from './actions'
import { INITIAL_LOOKUP_STATE } from './types'
import type { LookupState } from './types'
import { LeadDetailPanel } from '@/app/components/lead-detail'

// ---------------------------------------------------------------------------
// Design-system primitives (local to this file)
// ---------------------------------------------------------------------------

const inputBase =
  'mt-1 block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-white ' +
  'px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)] ' +
  'focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ' +
  'disabled:opacity-50'

function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor:   string
  children:  React.ReactNode
  required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--text)]">
      {children}
      {required && (
        <span className="ml-0.5 text-[var(--destructive)]" aria-hidden>*</span>
      )}
    </label>
  )
}

// ---------------------------------------------------------------------------
// Lookup form — shown to unauthenticated visitors
// ---------------------------------------------------------------------------

function LookupForm({
  state,
  action,
  pending,
}: {
  state:   LookupState
  action:  (payload: FormData) => void
  pending: boolean
}) {
  return (
    <form action={action} noValidate className="space-y-5" aria-label="Application lookup form">
      {state.status === 'not_found' && (
        <div
          role="alert"
          className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--text-muted)]"
        >
          We couldn&apos;t find an application with that reference code and email.
        </div>
      )}

      {state.status === 'error' && (
        <div
          role="alert"
          className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--destructive)]"
        >
          {state.message}
        </div>
      )}

      <div>
        <Label htmlFor="reference_code" required>Reference code</Label>
        <input
          id="reference_code"
          name="reference_code"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          disabled={pending}
          className={`${inputBase} font-mono uppercase tracking-widest`}
          placeholder="e.g. A1B2C3D4"
          maxLength={8}
        />
      </div>

      <div>
        <Label htmlFor="email" required>Email address</Label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          className={inputBase}
          placeholder="you@example.com"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 disabled:opacity-60 sm:w-auto"
      >
        {pending ? 'Looking up…' : 'Look up application'}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Root client component
// ---------------------------------------------------------------------------

export function StatusClient() {
  const [lookupState, lookupAction, lookupPending] = useActionState<LookupState, FormData>(
    lookupApplication,
    INITIAL_LOOKUP_STATE,
  )

  if (lookupState.status === 'success') {
    const r = lookupState.result
    return (
      <div className="space-y-6">
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white p-6">
          <LeadDetailPanel
            leadId={r.lead_id}
            studentId={r.student_id}
            currentStage={r.current_stage}
            leadStatus={r.lead_status}
            stages={r.stages}
            lastContacted={r.last_contacted}
            initialDocs={r.documents}
            referenceCode={undefined}  // not shown on the public page — they already proved they know it
          />
        </div>
        <button
          type="button"
          onClick={() => window.location.replace('/status')}
          className="text-sm text-[var(--accent)] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
        >
          ← Look up a different application
        </button>
      </div>
    )
  }

  return (
    <LookupForm
      state={lookupState}
      action={lookupAction}
      pending={lookupPending}
    />
  )
}
