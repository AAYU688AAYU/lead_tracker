'use client'

import { useActionState, useState, useCallback, useRef } from 'react'
import { parsePhoneNumber, isValidPhoneNumber, AsYouType } from 'libphonenumber-js'
import { submitApplication, setPassword } from './actions'
import { INITIAL_STATE, INITIAL_SET_PASSWORD_STATE } from './types'
import type { ApplyFormState, SetPasswordState } from './types'
import type { ProgramOption } from './page'

// ---------------------------------------------------------------------------
// Validation utilities
// ---------------------------------------------------------------------------

function validateEmailSync(value: string): boolean {
  if (!value) return false
  // RFC 5322 simplified — good enough for client-side
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

function validatePhoneSync(value: string): boolean {
  if (!value) return false
  // Use libphonenumber-js to validate — handles international formats
  try {
    return isValidPhoneNumber(value)
  } catch {
    // If parsing fails, fall back to digit count (at least 7)
    const digits = value.replace(/\D/g, '')
    return digits.length >= 7
  }
}

/**
 * Format phone number as user types — applies international formatting.
 * Safely handles parsing errors by returning the original input.
 */
function formatPhoneAsYouType(input: string): string {
  if (!input) return ''
  try {
    const formatter = new AsYouType()
    return formatter.input(input) || input
  } catch {
    return input
  }
}

// Debounce hook — reusable for any function
function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => callback(...args), delay)
    }) as T,
    [callback, delay],
  )
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return (
    <p role="alert" className="mt-1 text-sm text-[var(--destructive)]">
      {messages[0]}
    </p>
  )
}

function Label({ htmlFor, children, required }: {
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

const inputBase =
  'mt-1 block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-white ' +
  'px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)] ' +
  'focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] ' +
  'disabled:opacity-50'

const inputError =
  'border-[var(--destructive)] focus-visible:border-[var(--destructive)] focus-visible:ring-[var(--destructive)]'

// ---------------------------------------------------------------------------
// Set-password form (inline in confirmation panel)
// ---------------------------------------------------------------------------

function SetPasswordForm({ userId, email }: { userId: string; email: string }) {
  const [pwState, pwAction, pwPending] = useActionState<SetPasswordState, FormData>(
    setPassword,
    INITIAL_SET_PASSWORD_STATE,
  )

  // Once the password is set, go straight to the dashboard.
  if (pwState.status === 'success') {
    const loginHref = `/login?email=${encodeURIComponent(email)}&next=/dashboard/student`
    return (
      <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-4 py-4">
        <div className="flex items-start gap-3">
          {/* success icon */}
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
          </svg>
          <div>
            <p className="text-sm font-medium text-[var(--text)]">Password set.</p>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              Sign in with your email and this password to view your full application
              status and upload documents.
            </p>
            <a
              href={loginHref}
              className="mt-3 inline-block rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              Sign in to your dashboard →
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-4 py-4">
      {/* Section heading */}
      <div className="mb-3 flex items-center gap-2">
        <svg className="h-4 w-4 text-[var(--text-muted)]" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p className="text-sm font-semibold text-[var(--text)]">Create your password</p>
      </div>
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        Set a password to access your dashboard where you can track your application
        progress and upload documents.
      </p>

      {/* Error banner */}
      {pwState.status === 'error' && pwState.error && (
        <div role="alert"
          className="mb-4 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--destructive)]">
          {pwState.error}
        </div>
      )}

      <form action={pwAction} noValidate className="space-y-4">
        {/* Pass userId as a hidden field — the action needs it to call updateUserById */}
        <input type="hidden" name="userId" value={userId} />

        {/* Password */}
        <div>
          <Label htmlFor="pw_password" required>Password</Label>
          <input
            id="pw_password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={pwPending}
            className={inputBase}
            placeholder="At least 8 characters"
          />
        </div>

        {/* Confirm password */}
        <div>
          <Label htmlFor="pw_confirm" required>Confirm password</Label>
          <input
            id="pw_confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={pwPending}
            className={inputBase}
            placeholder="Repeat password"
          />
        </div>

        <button
          type="submit"
          disabled={pwPending}
          className="w-full rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto"
        >
          {pwPending ? 'Saving…' : 'Set password →'}
        </button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Confirmation panel
// ---------------------------------------------------------------------------

function ConfirmationPanel({
  referenceCode,
  email,
  userId,
}: {
  referenceCode: string
  email:         string
  userId:        string
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(referenceCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white p-8"
    >
      {/* Heading */}
      <div className="mb-6">
        <svg className="mb-4 h-10 w-10 text-[var(--accent)]" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
        </svg>
        <h1 className="text-xl font-semibold text-[var(--text)]">Application received</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          We&apos;ll be in touch within 24 hours.
        </p>
      </div>

      {/* Reference code */}
      <div className="mb-8 rounded-[var(--radius-sm)] bg-[var(--background)] px-4 py-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Reference code
        </p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl font-bold tracking-widest text-[var(--text)]">
            {referenceCode}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy reference code"
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Save this code — you&apos;ll need it to track your application.
        </p>

        {/* Direct link to status page with pre-filled reference code and email */}
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <a
            href={`/status?code=${encodeURIComponent(referenceCode)}&email=${encodeURIComponent(email)}`}
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5" />
            </svg>
            Track application →
          </a>
        </div>
      </div>

      {/* What happens next */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-[var(--text)]">What happens next</h2>
        <ol className="space-y-3">
          {NEXT_STEPS.map(({ step, title, body }) => (
            <li key={step} className="flex gap-3">
              <span aria-hidden
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--accent)] text-xs font-semibold text-white">
                {step}
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--text)]">{title}</p>
                <p className="text-sm text-[var(--text-muted)]">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Set password — required before accessing the dashboard ──────── */}
      <div>
        <SetPasswordForm userId={userId} email={email} />
      </div>
    </div>
  )
}

const NEXT_STEPS = [
  {
    step:  '1',
    title: 'Consultant review',
    body:  'A consultant will be assigned to your application and reach out within 24 hours.',
  },
  {
    step:  '2',
    title: 'Initial consultation',
    body:  "You'll discuss your goals, eligibility, and required documents.",
  },
  {
    step:  '3',
    title: 'Application submission',
    body:  'Your consultant will guide you through the full university application process.',
  },
]

// ---------------------------------------------------------------------------
// Programs grouped by university for <optgroup>
// ---------------------------------------------------------------------------

function groupByUniversity(
  programs: ProgramOption[],
): Map<string, { name: string; programs: ProgramOption[] }> {
  const map = new Map<string, { name: string; programs: ProgramOption[] }>()
  for (const p of programs) {
    if (!map.has(p.university_id)) {
      map.set(p.university_id, { name: p.university_name, programs: [] })
    }
    map.get(p.university_id)!.programs.push(p)
  }
  return new Map(
    [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name)),
  )
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

export function IntakeForm({ programs }: { programs: ProgramOption[] }) {
  const [state, action, pending] = useActionState<ApplyFormState, FormData>(
    submitApplication,
    INITIAL_STATE,
  )

  // Controlled field state — values survive server error re-renders.
  const [fullName,  setFullName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [phone,     setPhone]     = useState('')
  const [programId, setProgramId] = useState('')
  const [notes,     setNotes]     = useState('')

  // Client-side validation state — for real-time feedback on blur
  const [clientErrors, setClientErrors] = useState<Record<string, boolean>>({})

  // Debounced validation functions
  const validateEmailDebounced = useDebounce((value: string) => {
    setClientErrors(prev => ({
      ...prev,
      email: !validateEmailSync(value),
    }))
  }, 300)

  const validatePhoneDebounced = useDebounce((value: string) => {
    setClientErrors(prev => ({
      ...prev,
      phone: !validatePhoneSync(value),
    }))
  }, 300)

  // Handle email blur — trigger debounced validation
  const handleEmailBlur = useCallback(() => {
    if (email.trim()) {
      validateEmailDebounced(email)
    } else {
      setClientErrors(prev => ({ ...prev, email: false }))
    }
  }, [email, validateEmailDebounced])

  // Handle phone blur — trigger debounced validation
  const handlePhoneBlur = useCallback(() => {
    if (phone.trim()) {
      validatePhoneDebounced(phone)
    } else {
      setClientErrors(prev => ({ ...prev, phone: false }))
    }
  }, [phone, validatePhoneDebounced])

  // Clear client errors when user starts typing (optimistic)
  const handleEmailChange = (value: string) => {
    setEmail(value)
    setClientErrors(prev => ({ ...prev, email: false }))
  }

  const handlePhoneChange = (value: string) => {
    // Apply auto-formatting as user types
    const formatted = formatPhoneAsYouType(value)
    setPhone(formatted)
    setClientErrors(prev => ({ ...prev, phone: false }))
  }

  const grouped = groupByUniversity(programs)

  // ── Success state ─────────────────────────────────────────────────────────
  if (state.status === 'success' && state.referenceCode) {
    return (
      <ConfirmationPanel
        referenceCode={state.referenceCode}
        email={state.submittedEmail ?? ''}
        userId={state.userId ?? ''}
      />
    )
  }

  // ── Form (idle + error) ───────────────────────────────────────────────────
  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} noValidate className="space-y-6" aria-label="Student application form">
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white p-6 sm:p-8">

        <h1 className="mb-6 text-xl font-semibold text-[var(--text)]">Student Application</h1>

        {/* Server-side submission error summary */}
        {state.status === 'error' && state.serverError && (
          <div role="alert"
            className="mb-6 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--destructive)]">
            {state.serverError}
          </div>
        )}

        {/* Full name */}
        <div className="space-y-1">
          <Label htmlFor="full_name" required>Full name</Label>
          <input
            id="full_name" name="full_name" type="text" autoComplete="name"
            required minLength={2} disabled={pending}
            value={fullName} onChange={(e) => setFullName(e.target.value)}
            aria-describedby={fe.full_name ? 'full_name_error' : undefined}
            aria-invalid={!!fe.full_name}
            className={[inputBase, fe.full_name ? inputError : ''].join(' ')}
            placeholder="Jane Smith"
          />
          <span id="full_name_error"><FieldError messages={fe.full_name} /></span>
        </div>

        {/* Email */}
        <div className="mt-5 space-y-1">
          <Label htmlFor="email" required>Email</Label>
          <input
            id="email" name="email" type="email" autoComplete="email"
            required disabled={pending}
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            onBlur={handleEmailBlur}
            aria-describedby={[
              'email_hint',
              clientErrors.email && !fe.email && 'email_client_error',
              fe.email && 'email_error',
            ].filter(Boolean).join(' ')}
            aria-invalid={!!(fe.email || clientErrors.email)}
            className={[inputBase, (fe.email || clientErrors.email) ? inputError : ''].join(' ')}
            placeholder="jane@example.com"
          />
          <p id="email_hint" className="mt-1 text-xs text-[var(--text-muted)]">
            We&apos;ll use this to send updates about your application
          </p>
          {clientErrors.email && !fe.email && (
            <p id="email_client_error" role="alert" className="mt-1 text-sm text-[var(--stalled)]">
              Please enter a valid email address
            </p>
          )}
          <span id="email_error"><FieldError messages={fe.email} /></span>
        </div>

        {/* Phone */}
        <div className="mt-5 space-y-1">
          <Label htmlFor="phone" required>Phone</Label>
          <input
            id="phone" name="phone" type="tel" autoComplete="tel"
            required disabled={pending}
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onBlur={handlePhoneBlur}
            aria-describedby={[
              'phone_hint',
              clientErrors.phone && !fe.phone && 'phone_client_error',
              fe.phone && 'phone_error',
            ].filter(Boolean).join(' ')}
            aria-invalid={!!(fe.phone || clientErrors.phone)}
            className={[inputBase, (fe.phone || clientErrors.phone) ? inputError : ''].join(' ')}
            placeholder="+1 555 000 0000"
          />
          <p id="phone_hint" className="mt-1 text-xs text-[var(--text-muted)]">
            International formats accepted, e.g. +44 7700 900000
          </p>
          {clientErrors.phone && !fe.phone && (
            <p id="phone_client_error" role="alert" className="mt-1 text-sm text-[var(--stalled)]">
              Please enter a valid phone number
            </p>
          )}
          <span id="phone_error"><FieldError messages={fe.phone} /></span>
        </div>

        {/* Program of interest */}
        <div className="mt-5 space-y-1">
          <Label htmlFor="program_id" required>Program of interest</Label>
          {programs.length === 0 ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              No programs are available at the moment. Please check back later.
            </p>
          ) : (
            <select
              id="program_id" name="program_id" required disabled={pending}
              value={programId} onChange={(e) => setProgramId(e.target.value)}
              aria-describedby={fe.program_id ? 'program_id_error' : undefined}
              aria-invalid={!!fe.program_id}
              className={[inputBase, fe.program_id ? inputError : ''].join(' ')}
            >
              <option value="" disabled>Select a program…</option>
              {[...grouped.entries()].map(([uid, { name: uniName, programs: uniPrograms }]) => (
                <optgroup key={uid} label={uniName}>
                  {uniPrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.degree_level ? ` — ${p.degree_level}` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          <span id="program_id_error"><FieldError messages={fe.program_id} /></span>
        </div>

        {/* Notes */}
        <div className="mt-5 space-y-1">
          <Label htmlFor="notes">
            Notes <span className="text-[var(--text-muted)] font-normal">(optional)</span>
          </Label>
          <textarea
            id="notes" name="notes" rows={4} maxLength={500} disabled={pending}
            value={notes} onChange={(e) => setNotes(e.target.value)}
            aria-describedby={fe.notes ? 'notes_error' : 'notes_hint'}
            aria-invalid={!!fe.notes}
            className={[inputBase, 'resize-y', fe.notes ? inputError : ''].join(' ')}
            placeholder="Anything else you'd like us to know…"
          />
          <div className="flex items-start justify-between">
            <span id="notes_error"><FieldError messages={fe.notes} /></span>
            <p
              id="notes_hint"
              className={[
                'ml-auto shrink-0 text-xs tabular-nums',
                notes.length > 450  ? 'text-[var(--stalled)]'     : 'text-[var(--text-muted)]',
                notes.length >= 500 ? 'text-[var(--destructive)]' : '',
              ].join(' ')}
              aria-live="polite"
            >
              {notes.length}/500
            </p>
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto"
      >
        {pending ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  )
}
