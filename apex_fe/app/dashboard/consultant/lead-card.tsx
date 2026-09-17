'use client'

import { useActionState, useState } from 'react'
import {
  advanceStage,
  updateLeadStatus,
  logCommunication,
  reviewDocument,
} from './actions'
import type { ConsultantLeadDetail, CommLogEntry, MutationState } from './types'
import { INITIAL_MUTATION_STATE } from './types'
import type { StageStep, DocumentRow } from '@/app/status/actions'
import { MiniStepper, DocStatusBadge } from '@/app/components/lead-detail'
import type { LeadStatus } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const inputBase =
  'mt-1 block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-white ' +
  'px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)] ' +
  'focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] ' +
  'disabled:opacity-50'

const btnPrimary =
  'rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white ' +
  'transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ' +
  'focus-visible:ring-offset-1 disabled:opacity-50'

const btnOutline =
  'rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-3 py-1.5 text-xs ' +
  'font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] ' +
  'hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ' +
  'focus-visible:ring-offset-1 disabled:opacity-50'

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
    stalled:   'bg-[var(--background)] text-[var(--stalled)] border border-[var(--stalled)]',
    completed: 'bg-[var(--accent)] text-white',
    dropped:   'bg-[var(--background)] text-[var(--text-muted)] border border-[var(--border)]',
  }
  return (
    <span className={`inline-block rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status] ?? styles.dropped}`}>
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Inline mutation error/success banner
// ---------------------------------------------------------------------------

function MutationBanner({ state }: { state: MutationState }) {
  if (state.status === 'idle') return null
  if (state.status === 'success') return (
    <p role="status" aria-live="polite" className="text-xs text-[var(--accent)]">Saved.</p>
  )
  return (
    <p role="alert" aria-live="polite" className="text-xs text-[var(--destructive)]">{state.message}</p>
  )
}

// ---------------------------------------------------------------------------
// Stage advance + status controls
// ---------------------------------------------------------------------------

const STAGE_ORDER = ['inquiry', 'consultation', 'documents', 'application', 'decision', 'enrolled']
const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'active',    label: 'Active' },
  { value: 'stalled',   label: 'Stalled' },
  { value: 'completed', label: 'Completed' },
  { value: 'dropped',   label: 'Dropped' },
]

function StageControls({
  leadId,
  currentStage,
  currentStatus,
  stageLabel,
}: {
  leadId:        string
  currentStage:  string
  currentStatus: string
  stageLabel:    string
}) {
  const [advState, advAction, advPending]     = useActionState<MutationState, FormData>(advanceStage,      INITIAL_MUTATION_STATE)
  const [statState, statAction, statPending]  = useActionState<MutationState, FormData>(updateLeadStatus,  INITIAL_MUTATION_STATE)

  const isLastStage = currentStage === STAGE_ORDER[STAGE_ORDER.length - 1]

  return (
    <div className="space-y-3">
      {/* Advance stage */}
      <div className="flex items-center gap-3">
        <form action={advAction}>
          <input type="hidden" name="lead_id"       value={leadId} />
          <input type="hidden" name="current_stage" value={currentStage} />
          <button
            type="submit"
            disabled={advPending || isLastStage}
            className={btnPrimary}
            title={isLastStage ? 'Already at final stage' : `Advance past ${stageLabel}`}
          >
            {advPending ? 'Advancing…' : isLastStage ? 'Final stage' : 'Advance stage →'}
          </button>
        </form>
        <MutationBanner state={advState} />
      </div>

      {/* Status override */}
      <form action={statAction} className="flex items-center gap-2">
        <input type="hidden" name="lead_id" value={leadId} />
        <select
          name="status"
          defaultValue={currentStatus}
          disabled={statPending}
          className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-2 py-1.5 text-xs text-[var(--text)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] disabled:opacity-50"
          aria-label="Set lead status"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button type="submit" disabled={statPending} className={btnOutline}>
          {statPending ? 'Saving…' : 'Set status'}
        </button>
        <MutationBanner state={statState} />
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Communication log — entry form + history list
// ---------------------------------------------------------------------------

const CHANNEL_LABELS: Record<string, string> = {
  call:       'Call',
  email:      'Email',
  whatsapp:   'WhatsApp',
  in_person:  'In person',
}

function CommLogSection({ leadId, commLogs }: { leadId: string; commLogs: CommLogEntry[] }) {
  const [state, action, pending] = useActionState<MutationState, FormData>(logCommunication, INITIAL_MUTATION_STATE)
  const [charCount, setCharCount] = useState(0)

  return (
    <div className="space-y-4">
      {/* Entry form */}
      <form action={action} noValidate className="space-y-3">
        <input type="hidden" name="lead_id" value={leadId} />

        <div className="flex gap-3">
          {/* Channel */}
          <div className="w-36 shrink-0">
            <label className="block text-xs font-medium text-[var(--text-muted)]">Channel</label>
            <select
              name="channel"
              disabled={pending}
              className={`${inputBase} text-xs`}
              defaultValue="call"
            >
              {Object.entries(CHANNEL_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Summary */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Summary <span className="text-[var(--destructive)]">*</span>
            </label>
            <textarea
              name="summary"
              required
              rows={2}
              maxLength={1000}
              disabled={pending}
              onChange={e => setCharCount(e.target.value.length)}
              className={`${inputBase} resize-none text-xs`}
              placeholder="Brief note on what was discussed…"
            />
            <p className={`mt-0.5 text-right text-xs tabular-nums ${charCount > 900 ? 'text-[var(--stalled)]' : 'text-[var(--text-muted)]'}`}>
              {charCount}/1000
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? 'Saving…' : 'Log contact'}
          </button>
          <MutationBanner state={state} />
        </div>
      </form>

      {/* History */}
      {commLogs.length > 0 && (
        <ul className="divide-y divide-[var(--border)]" aria-label="Communication history">
          {commLogs.map(log => (
            <li key={log.id} className="py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="mr-2 inline-block rounded-[var(--radius-pill)] border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)] capitalize">
                    {CHANNEL_LABELS[log.channel] ?? log.channel}
                  </span>
                  <span className="text-xs text-[var(--text)]">{log.summary}</span>
                </div>
                <time className="shrink-0 text-xs text-[var(--text-muted)]" dateTime={log.created_at}>
                  {new Date(log.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
      {commLogs.length === 0 && (
        <p className="text-xs text-[var(--text-muted)]">No contact logged yet.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Document review — approve / reject each pending document
// ---------------------------------------------------------------------------

function DocumentReviewItem({ doc }: { doc: DocumentRow }) {
  const [state, action, pending] = useActionState<MutationState, FormData>(reviewDocument, INITIAL_MUTATION_STATE)
  const [showReject, setShowReject] = useState(false)

  const isActionable = doc.status === 'pending'

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start gap-3">
        {/* File info */}
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
            Uploaded {new Date(doc.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </p>
          {doc.status === 'rejected' && doc.rejection_reason && (
            <p className="mt-1 text-xs text-[var(--destructive)]">
              <span className="font-medium">Reason: </span>{doc.rejection_reason}
            </p>
          )}
        </div>

        {/* Badge + action buttons */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <DocStatusBadge status={doc.status} />

          {isActionable && (
            <div className="flex gap-2">
              {/* Approve */}
              <form action={action}>
                <input type="hidden" name="doc_id" value={doc.id} />
                <input type="hidden" name="action" value="approved" />
                <button type="submit" disabled={pending} className={btnPrimary}>
                  {pending ? '…' : 'Approve'}
                </button>
              </form>

              {/* Reject toggle */}
              <button
                type="button"
                onClick={() => setShowReject(s => !s)}
                className="rounded-[var(--radius-sm)] border border-[var(--destructive)] px-3 py-1.5 text-xs font-medium text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--destructive)] focus-visible:ring-offset-1"
              >
                {showReject ? 'Cancel' : 'Reject'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rejection reason input — shown only when reject is toggled */}
      {isActionable && showReject && (
        <form action={action} className="mt-2 flex items-end gap-2">
          <input type="hidden" name="doc_id" value={doc.id} />
          <input type="hidden" name="action" value="rejected" />
          <div className="flex-1">
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              Rejection reason <span className="text-[var(--destructive)]">*</span>
            </label>
            <input
              name="rejection_reason"
              type="text"
              required
              maxLength={300}
              disabled={pending}
              className={`${inputBase} text-xs`}
              placeholder="e.g. Document is blurry, please re-upload"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mb-1 rounded-[var(--radius-sm)] bg-[var(--destructive)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--destructive)] focus-visible:ring-offset-1 disabled:opacity-50"
          >
            {pending ? '…' : 'Confirm reject'}
          </button>
        </form>
      )}

      {/* Per-doc mutation feedback */}
      {state.status !== 'idle' && (
        <div className="mt-1">
          <MutationBanner state={state} />
        </div>
      )}
    </li>
  )
}

function DocumentReviewSection({ documents }: { documents: DocumentRow[] }) {
  if (documents.length === 0) {
    return <p className="text-xs text-[var(--text-muted)]">No documents uploaded yet.</p>
  }
  return (
    <ul className="divide-y divide-[var(--border)]" aria-label="Documents for review">
      {documents.map(doc => <DocumentReviewItem key={doc.id} doc={doc} />)}
    </ul>
  )
}

// ---------------------------------------------------------------------------
// Tabbed detail panel — Pipeline | Communications | Documents
// ---------------------------------------------------------------------------

type Tab = 'pipeline' | 'comms' | 'docs'

function DetailPanel({
  lead,
  stages,
}: {
  lead:   ConsultantLeadDetail
  stages: StageStep[]
}) {
  const [tab, setTab] = useState<Tab>('pipeline')

  const pendingDocs = lead.documents.filter(d => d.status === 'pending').length
  const lastContacted = lead.last_contacted
    ? new Date(lead.last_contacted).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  const tabBtn = (t: Tab, label: string, badge?: number) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      className={[
        'flex items-center gap-1.5 border-b-2 pb-2 text-xs font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1',
        tab === t
          ? 'border-[var(--accent)] text-[var(--accent)]'
          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]',
      ].join(' ')}
    >
      {label}
      {!!badge && (
        <span className="rounded-[var(--radius-pill)] bg-[var(--stalled)] px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
          {badge}
        </span>
      )}
    </button>
  )

  return (
    <div className="space-y-4">
      {/* Stage controls */}
      <StageControls
        leadId={lead.id}
        currentStage={lead.stage}
        currentStatus={lead.status}
        stageLabel={lead.stage_label}
      />

      {/* Notes */}
      {lead.notes && (
        <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 py-2">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Notes</p>
          <p className="text-sm text-[var(--text)]">{lead.notes}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-5 border-b border-[var(--border)]">
        {tabBtn('pipeline', 'Pipeline')}
        {tabBtn('comms',    'Communications', lead.comm_logs.length > 0 ? undefined : undefined)}
        {tabBtn('docs',     'Documents', pendingDocs > 0 ? pendingDocs : undefined)}
      </div>

      {tab === 'pipeline' && (
        <div>
          <PipelineView stages={stages} lead={lead} />
          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <p className="text-xs text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text)]">Last contacted:</span>{' '}
              {lastContacted ?? 'No contact logged yet'}
            </p>
          </div>
        </div>
      )}

      {tab === 'comms' && (
        <CommLogSection leadId={lead.id} commLogs={lead.comm_logs} />
      )}

      {tab === 'docs' && (
        <DocumentReviewSection documents={lead.documents} />
      )}
    </div>
  )
}

// Vertical pipeline view (read-only) reused from shared logic
function PipelineView({ stages, lead }: { stages: StageStep[]; lead: ConsultantLeadDetail }) {
  const currentOrder = stages.find(s => s.stage === lead.stage)?.sort_order ?? 0
  const isStalled    = lead.status === 'stalled'

  return (
    <ol aria-label="Application pipeline" className="relative space-y-0">
      {stages.map((step, idx) => {
        const isLast    = idx === stages.length - 1
        const isCurrent = step.stage === lead.stage
        const isDone    = step.sort_order < currentOrder
        const lineColor = isDone ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
        const labelColor = isCurrent
          ? (isStalled ? 'text-[var(--stalled)] font-semibold' : 'text-[var(--accent)] font-semibold')
          : 'text-[var(--text-muted)]'

        return (
          <li key={step.stage} className="relative flex gap-4" aria-current={isCurrent ? 'step' : undefined}>
            {!isLast && (
              <span aria-hidden className={`absolute left-[11px] top-6 h-full w-0.5 ${lineColor}`} />
            )}
            <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-pill)]">
              {isDone ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--accent)]" aria-hidden>
                  <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              ) : isCurrent ? (
                <span className={`flex h-6 w-6 items-center justify-center rounded-[var(--radius-pill)] ring-2 ring-offset-2 ${isStalled ? 'bg-[var(--stalled)] ring-[var(--stalled)]' : 'bg-[var(--accent)] ring-[var(--accent)]'}`} aria-hidden>
                  <span className="h-2 w-2 rounded-[var(--radius-pill)] bg-white" />
                </span>
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-pill)] border-2 border-[var(--border)] bg-white" aria-hidden />
              )}
            </span>
            <div className="pb-7 pt-0.5">
              <p className={`text-sm ${labelColor}`}>
                {step.label}
                {isCurrent && isStalled && <span className="ml-2 text-xs font-normal text-[var(--stalled)]">(stalled)</span>}
              </p>
              {isCurrent && <p className="mt-0.5 text-xs text-[var(--text-muted)]">Current stage</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ---------------------------------------------------------------------------
// LeadCard — the top-level expandable card for the consultant dashboard
// ---------------------------------------------------------------------------

export function LeadCard({
  lead,
  stages,
  defaultOpen = false,
}: {
  lead:         ConsultantLeadDetail
  stages:       StageStep[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const pendingDocs = lead.documents.filter(d => d.status === 'pending').length

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white">
      {/* Summary row — clickable toggle */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={`lead-detail-${lead.id}`}
        className="w-full px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* Left: student name + ref code + stage */}
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--text)]">{lead.student_name}</span>
              <StatusBadge status={lead.status} />
              {pendingDocs > 0 && (
                <span
                  title={`${pendingDocs} document${pendingDocs > 1 ? 's' : ''} pending review`}
                  className="rounded-[var(--radius-pill)] bg-[var(--stalled)] px-1.5 py-0.5 text-[10px] font-bold text-white leading-none"
                >
                  {pendingDocs} pending
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-[var(--text-muted)]">{lead.reference_code}</span>
              <span className="text-xs text-[var(--text-muted)]">·</span>
              <span className="text-xs text-[var(--text-muted)]">{lead.stage_label}</span>
              <span className="text-xs text-[var(--text-muted)]">·</span>
              <span className="text-xs text-[var(--text-muted)]">
                Updated {new Date(lead.updated_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short',
                })}
              </span>
            </div>
          </div>

          {/* Right: mini stepper + chevron */}
          <div className="flex items-center gap-4">
            <MiniStepper stages={stages} currentStage={lead.stage} leadStatus={lead.status} />
            <svg
              className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </button>

      {/* Detail panel */}
      {open && (
        <div
          id={`lead-detail-${lead.id}`}
          className="border-t border-[var(--border)] px-5 py-5"
        >
          <DetailPanel lead={lead} stages={stages} />
        </div>
      )}
    </div>
  )
}
