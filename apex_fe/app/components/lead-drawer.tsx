'use client'

/**
 * LeadDetailDrawer — Phase 7
 *
 * Phase 5 behaviour entirely preserved.
 * Phase 7 adds four Realtime subscriptions that are active only while the
 * drawer is open (enabled = isOpen && leadId !== null):
 *
 *   1. leads           filtered to id=eq.<leadId>
 *      UPDATE → patches stage/stage_label/status/stage_entered_at.
 *      Uses the minimum necessary fields so optimistic local changes
 *      (e.g. a stage advance the user just clicked) are not clobbered.
 *
 *   2. documents       filtered to lead_id=eq.<leadId>
 *      INSERT → prepends new document row.
 *      UPDATE → patches status + rejection_reason in place.
 *
 *   3. activity_logs   filtered to lead_id=eq.<leadId>
 *      INSERT → prepends a new TimelineEntry with kind='activity'.
 *      (Not subscribed on student dashboard — this is consultant/admin only.)
 *
 *   4. communication_logs filtered to lead_id=eq.<leadId>
 *      INSERT → prepends a new TimelineEntry with kind='communication',
 *               and if the lead was stalled, optimistically flips status
 *               to 'active' (mirrors the DB trigger trg_unstall_on_contact).
 *
 * All four channels are cleaned up when the drawer closes (enabled = false
 * causes the hooks to skip subscribing and remove any existing channel).
 *
 * Desktop (≥ md):   480 px right-side panel, dimmed backdrop.
 * Mobile (< md):    Full-screen overlay with a ← back arrow.
 *
 * Section order (top → bottom):
 *   1. Header        — student name, program, reference code, close control
 *   2. Stage control — "Advance to [next]" + inline confirm; admin-only reassign
 *   3. Contact info  — email + phone tap-to-contact links
 *   4. Documents     — list with Approve / Reject (inline textarea) per pending item
 *   5. Log contact   — channel select + summary textarea + submit
 *   6. Timeline      — activity_logs + communication_logs merged, reverse-chrono
 */

import {
  useEffect,
  useRef,
  useCallback,
  useState,
  useActionState,
  useTransition,
  useId,
} from 'react'
import {
  advanceStageFromDrawer,
  logCommunicationFromDrawer,
  reviewDocumentFromDrawer,
  reassignConsultantFromDrawer,
  getLeadDetail,
} from './lead-drawer-actions'
import type {
  LeadDetailFull,
  TimelineEntry,
  DrawerMutationState,
  ConsultantSelectOption,
} from './lead-drawer-types'
import { INITIAL_DRAWER_STATE } from './lead-drawer-types'
import type { DocumentRow } from '@/app/status/types'
import { DocStatusBadge } from '@/app/components/lead-detail'
import {
  useLeadsRealtime,
  useDocumentsRealtime,
  useActivityLogsRealtime,
  useCommunicationLogsRealtime,
} from '@/lib/hooks/use-leads-realtime'

// ---------------------------------------------------------------------------
// Design-token helpers (match globals.css)
// ---------------------------------------------------------------------------

const inputBase =
  'mt-1 block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-white ' +
  'px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)] ' +
  'focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ' +
  'disabled:opacity-50'

const btnPrimary =
  'rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white ' +
  'transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ' +
  'focus:ring-offset-2 disabled:opacity-50'

const btnOutline =
  'rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-3 py-1.5 text-xs ' +
  'font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] ' +
  'hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ' +
  'focus:ring-offset-1 disabled:opacity-50'

const btnDestructive =
  'rounded-[var(--radius-sm)] border border-[var(--destructive)] px-3 py-1.5 text-xs ' +
  'font-medium text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)] ' +
  'hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--destructive)] ' +
  'focus:ring-offset-1 disabled:opacity-50'

const STAGE_ORDER = ['inquiry', 'consultation', 'documents', 'application', 'decision', 'enrolled']

const CHANNEL_LABELS: Record<string, string> = {
  call:      'Call',
  email:     'Email',
  whatsapp:  'WhatsApp',
  in_person: 'In person',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtFull(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Inline mutation feedback
// ---------------------------------------------------------------------------

function InlineFeedback({ state }: { state: DrawerMutationState }) {
  if (state.status === 'idle') return null
  if (state.status === 'success') return (
    <p role="status" aria-live="polite" className="text-xs text-[var(--accent)]">Saved.</p>
  )
  return (
    <p role="alert" aria-live="polite" className="text-xs text-[var(--destructive)]">
      {state.message}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Section 2 — Stage control
// ---------------------------------------------------------------------------

function StageSection({
  lead,
  dashboard,
  onStageAdvanced,
}: {
  lead:            LeadDetailFull
  dashboard:       string
  onStageAdvanced: (nextStage: string, nextLabel: string) => void
}) {
  const [state, formAction, pending] = useActionState<DrawerMutationState, FormData>(
    advanceStageFromDrawer, INITIAL_DRAWER_STATE,
  )
  const [confirming, setConfirming] = useState(false)

  const idx        = STAGE_ORDER.indexOf(lead.stage)
  const isLast     = idx === STAGE_ORDER.length - 1
  const isTerminal = lead.status === 'dropped'
  const hidden     = isLast || isTerminal

  const nextStageKey = !hidden ? STAGE_ORDER[idx + 1] : null
  const nextLabel    = nextStageKey
    ? (lead.stages.find(s => s.stage === nextStageKey)?.label ?? nextStageKey)
    : null

  useEffect(() => {
    if (state.status === 'success' && state.next_stage && nextLabel) {
      onStageAdvanced(state.next_stage, nextLabel)
      setConfirming(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Current stage
        </span>
        <span className="text-sm font-semibold text-[var(--text)]">{lead.stage_label}</span>
        {lead.status === 'stalled' && (
          <span className="ml-1 text-xs text-[var(--stalled)]">(stalled)</span>
        )}
      </div>

      {!hidden && nextLabel && (
        <div className="space-y-2">
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={btnPrimary}
            >
              Advance to {nextLabel} →
            </button>
          ) : (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] p-3 space-y-2">
              <p className="text-sm text-[var(--text)]">
                Move lead to <strong>{nextLabel}</strong>?
              </p>
              <div className="flex items-center gap-2">
                <form action={formAction}>
                  <input type="hidden" name="lead_id"       value={lead.id} />
                  <input type="hidden" name="current_stage" value={lead.stage} />
                  <input type="hidden" name="dashboard"     value={dashboard} />
                  <button type="submit" disabled={pending} className={btnPrimary}>
                    {pending ? 'Moving…' : 'Confirm'}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                  className={btnOutline}
                >
                  Cancel
                </button>
                <InlineFeedback state={state} />
              </div>
            </div>
          )}
          {!confirming && state.status === 'error' && <InlineFeedback state={state} />}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section 2b — Admin reassign control
// ---------------------------------------------------------------------------

function ReassignSection({
  lead,
  consultants,
  onReassigned,
}: {
  lead:         LeadDetailFull
  consultants:  ConsultantSelectOption[]
  onReassigned: (cId: string | null, cName: string | null) => void
}) {
  const [state, formAction, pending] = useActionState<DrawerMutationState, FormData>(
    reassignConsultantFromDrawer, INITIAL_DRAWER_STATE,
  )
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (state.status === 'success') {
      onReassigned(
        (state.consultant_id !== undefined ? state.consultant_id : null) ?? null,
        state.consultant_name ?? null,
      )
      setEditing(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  if (!editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Consultant
        </span>
        <span className="text-sm text-[var(--text)]">
          {lead.consultant_name ?? (
            <span className="text-[var(--text-muted)]">Unassigned</span>
          )}
        </span>
        <button type="button" onClick={() => setEditing(true)} className={btnOutline}>
          {lead.consultant_name ? 'Reassign…' : 'Assign…'}
        </button>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="lead_id" value={lead.id} />
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-[var(--text-muted)]">
          Reassign to consultant
        </label>
        <select
          name="consultant_id"
          defaultValue={lead.consultant_id ?? ''}
          disabled={pending}
          className={`${inputBase} text-xs`}
          aria-label="Select consultant"
        >
          <option value="">— Unassigned —</option>
          {consultants.map(c => {
            const atCap = c.max_lead_capacity != null && c.open_leads >= c.max_lead_capacity
            return (
              <option
                key={c.id}
                value={c.id}
                disabled={atCap && c.id !== lead.consultant_id}
              >
                {c.name}
                {atCap ? ' (at capacity)' : ''}
                {!c.is_accepting_leads ? ' (not accepting)' : ''}
                {` · ${c.open_leads} open`}
              </option>
            )
          })}
        </select>
      </div>
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={() => setEditing(false)} disabled={pending} className={btnOutline}>
        Cancel
      </button>
      {state.status === 'error' && (
        <span role="alert" className="w-full text-xs text-[var(--destructive)]">
          {state.message}
        </span>
      )}
    </form>
  )
}

// ---------------------------------------------------------------------------
// Section 4 — Document review panel
// ---------------------------------------------------------------------------

function DocumentReviewItem({
  doc,
  dashboard,
  onReviewed,
}: {
  doc:        DocumentRow
  dashboard:  string
  onReviewed: (docId: string, newStatus: 'approved' | 'rejected', reason: string | null) => void
}) {
  const [state, formAction, pending] = useActionState<DrawerMutationState, FormData>(
    reviewDocumentFromDrawer, INITIAL_DRAWER_STATE,
  )
  const [showReject, setShowReject] = useState(false)
  const [reason,     setReason]     = useState('')
  const reasonId = useId()

  useEffect(() => {
    if (state.status === 'success' && state.doc_id && state.new_doc_status) {
      onReviewed(
        state.doc_id,
        state.new_doc_status,
        state.new_doc_status === 'rejected' ? reason : null,
      )
      setShowReject(false)
      setReason('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const isPending = doc.status === 'pending'

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <a
            href={doc.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
          >
            {doc.file_name}
          </a>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Uploaded {fmt(doc.created_at)}
          </p>
          {doc.status === 'rejected' && doc.rejection_reason && (
            <p className="mt-1 text-xs text-[var(--destructive)]">
              <span className="font-medium">Reason: </span>{doc.rejection_reason}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <DocStatusBadge status={doc.status} />
          {isPending && (
            <div className="flex gap-2">
              <form action={formAction}>
                <input type="hidden" name="doc_id"    value={doc.id} />
                <input type="hidden" name="action"    value="approved" />
                <input type="hidden" name="dashboard" value={dashboard} />
                <button type="submit" disabled={pending} className={btnPrimary + ' py-1.5 text-xs'}>
                  {pending ? '…' : 'Approve'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setShowReject(s => !s)}
                className={btnDestructive}
              >
                {showReject ? 'Cancel' : 'Reject'}
              </button>
            </div>
          )}
        </div>
      </div>

      {isPending && showReject && (
        <form action={formAction} className="mt-2 space-y-2">
          <input type="hidden" name="doc_id"    value={doc.id} />
          <input type="hidden" name="action"    value="rejected" />
          <input type="hidden" name="dashboard" value={dashboard} />
          <div>
            <label
              htmlFor={reasonId}
              className="block text-xs font-medium text-[var(--text-muted)]"
            >
              Rejection reason <span className="text-[var(--destructive)]">*</span>
            </label>
            <textarea
              id={reasonId}
              name="rejection_reason"
              required
              rows={2}
              maxLength={300}
              disabled={pending}
              value={reason}
              onChange={e => setReason(e.target.value)}
              className={`${inputBase} resize-none text-xs`}
              placeholder="e.g. Document is blurry, please re-upload"
            />
          </div>
          <button
            type="submit"
            disabled={pending || reason.trim() === ''}
            className={
              'rounded-[var(--radius-sm)] bg-[var(--destructive)] px-3 py-1.5 text-xs font-semibold ' +
              'text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 ' +
              'focus:ring-[var(--destructive)] focus:ring-offset-1 disabled:opacity-50'
            }
          >
            {pending ? '…' : 'Confirm reject'}
          </button>
        </form>
      )}

      {state.status === 'error' && (
        <p role="alert" className="mt-1 text-xs text-[var(--destructive)]">{state.message}</p>
      )}
    </li>
  )
}

function DocumentSection({
  docs,
  dashboard,
  onReviewed,
}: {
  docs:       DocumentRow[]
  dashboard:  string
  onReviewed: (docId: string, newStatus: 'approved' | 'rejected', reason: string | null) => void
}) {
  if (docs.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">No documents uploaded yet.</p>
  }
  return (
    <ul className="divide-y divide-[var(--border)]" aria-label="Lead documents">
      {docs.map(doc => (
        <DocumentReviewItem
          key={doc.id}
          doc={doc}
          dashboard={dashboard}
          onReviewed={onReviewed}
        />
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------------------
// Section 5 — Log contact form
// ---------------------------------------------------------------------------

function LogContactSection({
  leadId,
  dashboard,
  onLogged,
}: {
  leadId:    string
  dashboard: string
  onLogged:  (entry: TimelineEntry) => void
}) {
  const [state, formAction, pending] = useActionState<DrawerMutationState, FormData>(
    logCommunicationFromDrawer, INITIAL_DRAWER_STATE,
  )
  const [summary, setSummary] = useState('')
  const [channel, setChannel] = useState('call')
  const formRef  = useRef<HTMLFormElement>(null)
  const summaryId = useId()

  useEffect(() => {
    if (state.status === 'success' && state.new_comm_entry) {
      onLogged({
        id:         state.new_comm_entry.id,
        kind:       'communication',
        type:       state.new_comm_entry.channel,
        content:    state.new_comm_entry.summary,
        actor_name: state.new_comm_entry.actor_name,
        created_at: state.new_comm_entry.created_at,
      })
      setSummary('')
      setChannel('call')
      formRef.current?.reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const tooShort  = summary.trim().length > 0 && summary.trim().length < 10
  const canSubmit = summary.trim().length >= 10 && !pending

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-3">
      <input type="hidden" name="lead_id"   value={leadId} />
      <input type="hidden" name="dashboard" value={dashboard} />

      <div className="flex gap-3">
        <div className="w-36 shrink-0">
          <label className="block text-xs font-medium text-[var(--text-muted)]">Channel</label>
          <select
            name="channel"
            value={channel}
            onChange={e => setChannel(e.target.value)}
            disabled={pending}
            className={`${inputBase} text-xs`}
          >
            {Object.entries(CHANNEL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label
            htmlFor={summaryId}
            className="block text-xs font-medium text-[var(--text-muted)]"
          >
            Summary <span className="text-[var(--destructive)]">*</span>
          </label>
          <textarea
            id={summaryId}
            name="summary"
            rows={3}
            maxLength={1000}
            required
            disabled={pending}
            value={summary}
            onChange={e => setSummary(e.target.value)}
            className={`${inputBase} resize-none text-sm`}
            placeholder="What was discussed or agreed…"
            aria-describedby={`${summaryId}-hint`}
          />
          <p
            id={`${summaryId}-hint`}
            className={`mt-0.5 text-xs ${
              tooShort
                ? 'text-[var(--stalled)]'
                : summary.length > 900
                  ? 'text-[var(--stalled)]'
                  : 'text-[var(--text-muted)]'
            }`}
          >
            {tooShort
              ? `${10 - summary.trim().length} more character${10 - summary.trim().length !== 1 ? 's' : ''} required`
              : `${summary.length}/1000`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={!canSubmit} className={btnPrimary}>
          {pending ? 'Saving…' : 'Log contact'}
        </button>
        <InlineFeedback state={state} />
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Section 6 — Activity timeline
// ---------------------------------------------------------------------------

const TIMELINE_ICONS: Record<string, React.ReactNode> = {
  lead_created: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  stage_advanced: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  call: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.18 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.36 6.36l.63-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  email: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  whatsapp: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  in_person: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
}

function getTimelineIcon(entry: TimelineEntry) {
  const icon = TIMELINE_ICONS[entry.type]
  if (icon) return icon
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function getTimelineLabel(entry: TimelineEntry): string {
  if (entry.kind === 'communication') {
    return CHANNEL_LABELS[entry.type] ?? entry.type
  }
  const labels: Record<string, string> = {
    lead_created:   'Lead created',
    stage_advanced: 'Stage advanced',
    stage_change:   'Stage changed',
    status_changed: 'Status changed',
    doc_approved:   'Document approved',
    doc_rejected:   'Document rejected',
  }
  return labels[entry.type] ?? entry.type.replace(/_/g, ' ')
}

function TimelineSection({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">No activity yet.</p>
  }

  return (
    <ol aria-label="Activity timeline" className="space-y-0">
      {entries.map((entry, idx) => {
        const isLast     = idx === entries.length - 1
        const dotColor   = entry.kind === 'communication' ? 'bg-[var(--accent)]'        : 'bg-[var(--text-muted)]'
        const iconColor  = entry.kind === 'communication' ? 'text-[var(--accent)]'       : 'text-[var(--text-muted)]'

        return (
          <li key={entry.id} className="relative flex gap-3">
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-[13px] top-6 h-full w-px bg-[var(--border)]"
              />
            )}
            <span
              className={`relative z-10 mt-1 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[var(--radius-pill)] border-2 border-white ring-1 ring-[var(--border)] ${dotColor} ${iconColor}`}
              aria-hidden
            >
              {getTimelineIcon(entry)}
            </span>
            <div className="pb-5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-[var(--text)]">
                  {getTimelineLabel(entry)}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  by {entry.actor_name}
                </span>
              </div>
              <time dateTime={entry.created_at} className="text-[11px] text-[var(--text-muted)]">
                {fmtFull(entry.created_at)}
              </time>
              {entry.content && (
                <p className="mt-1 text-xs text-[var(--text)]">{entry.content}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DrawerSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6" aria-label="Loading lead details…" aria-busy>
      <div className="h-5 w-2/3 rounded bg-[var(--border)]" />
      <div className="h-3 w-1/3 rounded bg-[var(--border)]" />
      <div className="mt-6 space-y-3">
        <div className="h-3 w-full rounded bg-[var(--border)]" />
        <div className="h-3 w-5/6 rounded bg-[var(--border)]" />
        <div className="h-3 w-4/6 rounded bg-[var(--border)]" />
      </div>
      <div className="mt-4 space-y-3">
        <div className="h-3 w-full rounded bg-[var(--border)]" />
        <div className="h-3 w-3/4 rounded bg-[var(--border)]" />
      </div>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
      {children}
    </h3>
  )
}

function Divider() {
  return <hr className="border-[var(--border)]" />
}

// ---------------------------------------------------------------------------
// Main drawer component
// ---------------------------------------------------------------------------

export interface LeadDetailDrawerProps {
  isOpen:           boolean
  leadId:           string | null
  role:             'consultant' | 'admin'
  dashboard:        'consultant' | 'admin'
  consultants?:     ConsultantSelectOption[]
  onClose:          () => void
  onStageAdvanced?: (leadId: string, nextStage: string) => void
}

export function LeadDetailDrawer({
  isOpen,
  leadId,
  role,
  dashboard,
  consultants = [],
  onClose,
  onStageAdvanced,
}: LeadDetailDrawerProps) {
  const [lead,       setLead]       = useState<LeadDetailFull | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [, startTransition]         = useTransition()

  const drawerRef = useRef<HTMLDivElement>(null)
  const closeRef  = useRef<HTMLButtonElement>(null)

  // ── Fetch lead data when the drawer opens ─────────────────────────────
  useEffect(() => {
    if (!isOpen || !leadId) { setLead(null); return }
    setLoading(true)
    setFetchError(null)
    startTransition(async () => {
      try {
        const data = await getLeadDetail(leadId)
        if (data) {
          setLead(data)
        } else {
          setFetchError('Lead not found.')
        }
      } catch {
        setFetchError('Failed to load lead details. Please try again.')
      } finally {
        setLoading(false)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, leadId])

  // ── Escape key ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  // ── Focus management ──────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => closeRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // ── Scroll lock on body ───────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // ── Focus trap ────────────────────────────────────────────────────────
  const handleDrawerKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const drawer = drawerRef.current
    if (!drawer) return
    const focusable = drawer.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last?.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
  }, [])

  // ── Phase 7: leads Realtime — patch stage/status only ────────────────
  // Only active when the drawer is open and a lead is loaded.
  const drawerActive = isOpen && !!leadId

  useLeadsRealtime(
    {
      filter:        leadId ? `id=eq.${leadId}` : undefined,
      channelSuffix: `drawer-lead-${leadId ?? 'none'}`,
      enabled:       drawerActive,
    },
    useCallback((payload) => {
      if (payload.eventType !== 'UPDATE') return
      const updated = payload.new as {
        stage?:            string
        status?:           string
        stage_entered_at?: string
      }
      if (!updated) return

      setLead(prev => {
        if (!prev) return prev
        const nextStage = updated.stage ?? prev.stage
        const nextLabel = prev.stages.find(s => s.stage === nextStage)?.label ?? nextStage
        return {
          ...prev,
          stage:            nextStage,
          stage_label:      nextLabel,
          status:           updated.status           ?? prev.status,
          stage_entered_at: updated.stage_entered_at ?? prev.stage_entered_at,
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leadId]),
  )

  // ── Phase 7: documents Realtime ───────────────────────────────────────
  useDocumentsRealtime(
    {
      filter:        leadId ? `lead_id=eq.${leadId}` : undefined,
      channelSuffix: `drawer-docs-${leadId ?? 'none'}`,
      enabled:       drawerActive,
    },
    useCallback((payload) => {
      if (payload.eventType === 'DELETE') return

      const doc = payload.new as {
        id?:               string
        file_name?:        string
        file_url?:         string
        status?:           string
        rejection_reason?: string | null
        created_at?:       string
      }
      if (!doc.id) return

      setLead(prev => {
        if (!prev) return prev
        const existingIdx = prev.documents.findIndex(d => d.id === doc.id)
        if (existingIdx === -1) {
          // New document uploaded — prepend.
          const newDoc: DocumentRow = {
            id:               doc.id!,
            file_name:        doc.file_name ?? '',
            file_url:         doc.file_url  ?? '',
            status:           (doc.status ?? 'pending') as DocumentRow['status'],
            rejection_reason: doc.rejection_reason ?? null,
            created_at:       doc.created_at ?? new Date().toISOString(),
          }
          return { ...prev, documents: [newDoc, ...prev.documents] }
        }
        // Status update (approve / reject).
        const nextDocs = [...prev.documents]
        nextDocs[existingIdx] = {
          ...nextDocs[existingIdx],
          status:           (doc.status ?? nextDocs[existingIdx].status) as DocumentRow['status'],
          rejection_reason: doc.rejection_reason ?? null,
        }
        return { ...prev, documents: nextDocs }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leadId]),
  )

  // ── Phase 7: activity_logs Realtime (consultant/admin only) ──────────
  useActivityLogsRealtime(
    {
      leadId:  drawerActive ? leadId : null,
      enabled: drawerActive,
    },
    useCallback((payload) => {
      if (payload.eventType !== 'INSERT') return
      const row = payload.new as {
        id?:         string
        type?:       string
        content?:    string | null
        actor_id?:   string | null
        created_at?: string
      }
      if (!row.id) return

      const entry: TimelineEntry = {
        id:         row.id,
        kind:       'activity',
        type:       row.type ?? 'unknown',
        content:    row.content ?? '',
        // actor_id is nullable (service-role triggers); label appropriately
        actor_name: row.actor_id ? 'System' : 'System',
        created_at: row.created_at ?? new Date().toISOString(),
      }

      setLead(prev => {
        if (!prev) return prev
        // Deduplicate: don't prepend if this entry already exists (e.g. via
        // the optimistic insert in logCommunicationFromDrawer's onLogged cb).
        if (prev.timeline.some(t => t.id === entry.id)) return prev
        return { ...prev, timeline: [entry, ...prev.timeline] }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leadId]),
  )

  // ── Phase 7: communication_logs Realtime ─────────────────────────────
  useCommunicationLogsRealtime(
    {
      leadId:  drawerActive ? leadId : null,
      enabled: drawerActive,
    },
    useCallback((payload) => {
      if (payload.eventType !== 'INSERT') return
      const row = payload.new as {
        id?:         string
        channel?:    string
        summary?:    string
        actor_id?:   string | null
        created_at?: string
      }
      if (!row.id) return

      const entry: TimelineEntry = {
        id:         row.id,
        kind:       'communication',
        type:       row.channel ?? 'call',
        content:    row.summary ?? '',
        actor_name: 'Consultant',
        created_at: row.created_at ?? new Date().toISOString(),
      }

      setLead(prev => {
        if (!prev) return prev
        // Deduplicate (same entry may have been added optimistically by
        // handleCommLogged from the LogContactSection).
        if (prev.timeline.some(t => t.id === entry.id)) return prev

        // Mirror the DB trigger: if the lead was stalled, flip to active.
        const nextStatus = prev.status === 'stalled' ? 'active' : prev.status

        return {
          ...prev,
          status:         nextStatus,
          last_contacted: entry.created_at,
          timeline:       [entry, ...prev.timeline],
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leadId]),
  )

  // ── Optimistic state updaters (unchanged from Phase 5) ───────────────

  function handleStageAdvanced(nextStage: string, nextLabel: string) {
    setLead(prev => prev
      ? { ...prev, stage: nextStage, stage_label: nextLabel, status: 'active', stage_entered_at: new Date().toISOString() }
      : prev
    )
    if (leadId) onStageAdvanced?.(leadId, nextStage)
  }

  function handleDocReviewed(docId: string, newStatus: 'approved' | 'rejected', reason: string | null) {
    setLead(prev => {
      if (!prev) return prev
      return {
        ...prev,
        documents: prev.documents.map(d =>
          d.id === docId ? { ...d, status: newStatus, rejection_reason: reason } : d
        ),
      }
    })
  }

  function handleCommLogged(entry: TimelineEntry) {
    setLead(prev => {
      if (!prev) return prev
      return {
        ...prev,
        last_contacted: entry.created_at,
        status:  prev.status === 'stalled' ? 'active' : prev.status,
        timeline: [entry, ...prev.timeline],
      }
    })
  }

  function handleReassigned(cId: string | null, cName: string | null) {
    setLead(prev => prev
      ? { ...prev, consultant_id: cId, consultant_name: cName }
      : prev
    )
  }

  // ── Render ────────────────────────────────────────────────────────────
  if (!isOpen) return null

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          'fixed inset-0 z-40 bg-black/40',
          'transition-opacity duration-200 ease-in-out',
          isOpen ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />

      {/* ── Drawer panel ─────────────────────────────────────────────── */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={lead ? `Lead detail: ${lead.student_name}` : 'Lead detail'}
        onKeyDown={handleDrawerKeyDown}
        className={[
          'fixed z-50',
          'md:inset-y-0 md:right-0 md:w-[480px]',
          'inset-0 md:inset-auto',
          'flex flex-col bg-white shadow-2xl',
          'transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          {lead ? (
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold text-[var(--text)]">
                {lead.student_name}
              </h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {lead.program_name && (
                  <span className="text-sm text-[var(--text-muted)] truncate max-w-[240px]">
                    {lead.program_name}
                  </span>
                )}
                <span className="font-mono text-xs font-bold tracking-widest text-[var(--text-muted)]">
                  {lead.reference_code}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-8 w-1/2 animate-pulse rounded bg-[var(--border)]" />
          )}

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close lead detail"
            className="shrink-0 rounded-[var(--radius-sm)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
          >
            <svg aria-hidden className="hidden h-5 w-5 md:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <svg aria-hidden className="h-5 w-5 md:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading && <DrawerSkeleton />}

          {fetchError && !loading && (
            <div className="px-5 py-6">
              <p role="alert" className="text-sm text-[var(--destructive)]">{fetchError}</p>
            </div>
          )}

          {!loading && !fetchError && lead && (
            <div className="divide-y divide-[var(--border)]">

              {/* 2. Stage control */}
              <section aria-labelledby="drawer-stage-heading" className="px-5 py-5 space-y-4">
                <h3 id="drawer-stage-heading" className="sr-only">Stage</h3>
                <StageSection
                  lead={lead}
                  dashboard={dashboard}
                  onStageAdvanced={handleStageAdvanced}
                />
                {role === 'admin' && (
                  <ReassignSection
                    lead={lead}
                    consultants={consultants}
                    onReassigned={handleReassigned}
                  />
                )}
              </section>

              {/* 3. Contact info */}
              <section aria-labelledby="drawer-contact-heading" className="px-5 py-5">
                <SectionHeading>
                  <span id="drawer-contact-heading">Contact</span>
                </SectionHeading>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <svg className="h-4 w-4 shrink-0 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <a href={`mailto:${lead.student_email}`} className="text-[var(--accent)] underline-offset-2 hover:underline break-all">
                      {lead.student_email}
                    </a>
                  </li>
                  {lead.student_phone ? (
                    <li className="flex items-center gap-2 text-sm">
                      <svg className="h-4 w-4 shrink-0 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.18 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.36 6.36l.63-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <a href={`tel:${lead.student_phone}`} className="text-[var(--accent)] underline-offset-2 hover:underline">
                        {lead.student_phone}
                      </a>
                    </li>
                  ) : (
                    <li className="text-sm text-[var(--text-muted)]">No phone on record.</li>
                  )}
                </ul>
                {lead.last_contacted && (
                  <p className="mt-3 text-xs text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--text)]">Last contacted:</span>{' '}
                    {fmt(lead.last_contacted)}
                  </p>
                )}
              </section>

              {/* 4. Documents */}
              <section aria-labelledby="drawer-docs-heading" className="px-5 py-5">
                <SectionHeading>
                  <span id="drawer-docs-heading">Documents</span>
                  {lead.documents.filter(d => d.status === 'pending').length > 0 && (
                    <span className="ml-2 rounded-[var(--radius-pill)] bg-[var(--stalled)] px-1.5 py-0.5 text-[10px] font-bold text-white normal-case">
                      {lead.documents.filter(d => d.status === 'pending').length} pending
                    </span>
                  )}
                </SectionHeading>
                <DocumentSection
                  docs={lead.documents}
                  dashboard={dashboard}
                  onReviewed={handleDocReviewed}
                />
              </section>

              {/* 5. Log contact */}
              <section aria-labelledby="drawer-log-heading" className="px-5 py-5">
                <SectionHeading>
                  <span id="drawer-log-heading">Log contact</span>
                </SectionHeading>
                <LogContactSection
                  leadId={lead.id}
                  dashboard={dashboard}
                  onLogged={handleCommLogged}
                />
              </section>

              {/* 6. Timeline */}
              <section aria-labelledby="drawer-timeline-heading" className="px-5 py-5">
                <SectionHeading>
                  <span id="drawer-timeline-heading">Activity</span>
                </SectionHeading>
                <TimelineSection entries={lead.timeline} />
              </section>

            </div>
          )}
        </div>
      </div>
    </>
  )
}
