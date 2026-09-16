'use client'

/**
 * LeadRow — Phase 7
 *
 * Expandable per-lead row used in the student dashboard.
 *
 * Phase 5 behaviour fully preserved.
 * Phase 7 adds two Realtime subscriptions scoped to this lead's id:
 *
 *   1. leads table filtered to `id=eq.<leadId>`
 *      Reflects stage advances, consultant assignment changes, and status
 *      flips (active ↔ stalled) in real time.
 *      The spec explicitly includes leads AND documents for the student view
 *      and explicitly EXCLUDES activity_logs.
 *
 *   2. documents table filtered to `lead_id=eq.<leadId>`
 *      Reflects document status changes (pending → approved / rejected)
 *      and new uploads.
 *
 * State design:
 *   The component lifts the mutable lead fields (stage, stage_label, status,
 *   consultant) and the documents array into local useState, seeded from
 *   the server-rendered props.  Realtime events patch only the changed
 *   fields — no full re-fetch needed for the student view because the
 *   realtime payload itself contains the updated values.
 *
 *   stage_label is derived by looking up stages[].label — the stages array
 *   is static (changes only when an admin edits pipeline settings, which
 *   doesn't require realtime for this view).
 */

import { useState, useCallback } from 'react'
import { MiniStepper, LeadDetailPanel } from '@/app/components/lead-detail'
import type { StageStep, DocumentRow } from '@/app/status/actions'
import type { ConsultantBrief } from './actions'
import {
  useLeadsRealtime,
  useDocumentsRealtime,
} from '@/lib/hooks/use-leads-realtime'

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    active:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
    stalled:   'bg-[var(--background)] text-[var(--stalled)] border border-[var(--stalled)]',
    completed: 'bg-[var(--accent)] text-white',
    dropped:   'bg-[var(--background)] text-[var(--text-muted)] border border-[var(--border)]',
  }
  return (
    <span
      className={`inline-block rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium capitalize ${colours[status] ?? colours.dropped}`}
    >
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// ConsultantCard
// ---------------------------------------------------------------------------

function ConsultantCard({ consultant }: { consultant: ConsultantBrief | null }) {
  if (!consultant) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Your consultant
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Not yet assigned — we&apos;ll notify you once a consultant is allocated to your application.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Your consultant
      </p>

      <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-6">
        <span className="text-sm font-medium text-[var(--text)]">
          {consultant.full_name}
        </span>

        <a
          href={`mailto:${consultant.email}`}
          className="flex items-center gap-1.5 text-sm text-[var(--accent)] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 rounded-[var(--radius-sm)]"
          aria-label={`Email ${consultant.full_name}`}
        >
          <svg
            aria-hidden
            className="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          {consultant.email}
        </a>

        {consultant.phone && (
          <a
            href={`tel:${consultant.phone}`}
            className="flex items-center gap-1.5 text-sm text-[var(--accent)] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 rounded-[var(--radius-sm)]"
            aria-label={`Call ${consultant.full_name}`}
          >
            <svg
              aria-hidden
              className="h-3.5 w-3.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.09 6.09l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            {consultant.phone}
          </a>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LeadRow — summary row + expandable detail panel + Phase 7 realtime
// ---------------------------------------------------------------------------

/** Mutable lead fields that Realtime can change. */
interface LiveLeadState {
  stage:      string
  stage_label: string
  status:     string
}

export function LeadRow({
  lead,
  stages,
  studentId,
  defaultOpen = false,
}: {
  lead: {
    id:             string
    reference_code: string
    stage:          string
    stage_label:    string
    status:         string
    created_at:     string
    last_contacted: string | null
    documents:      DocumentRow[]
    consultant:     ConsultantBrief | null
  }
  stages:       StageStep[]
  studentId:    string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  // ── Phase 7: lift mutable fields into local state ────────────────────
  const [liveState, setLiveState] = useState<LiveLeadState>({
    stage:       lead.stage,
    stage_label: lead.stage_label,
    status:      lead.status,
  })

  const [liveDocs, setLiveDocs] = useState<DocumentRow[]>(lead.documents)

  // Stage label lookup (static for the life of this component mount)
  const stageMap = new Map(stages.map(s => [s.stage, s.label]))

  // ── Phase 7: leads subscription (leads + status only, no activity_logs) ─
  useLeadsRealtime(
    {
      filter:        `id=eq.${lead.id}`,
      channelSuffix: `student-lead-${lead.id}`,
    },
    useCallback((payload) => {
      if (payload.eventType !== 'UPDATE') return

      const updated = payload.new as {
        stage?:  string
        status?: string
      }
      if (!updated) return

      setLiveState(prev => {
        const nextStage  = updated.stage  ?? prev.stage
        const nextStatus = updated.status ?? prev.status
        const nextLabel  = stageMap.get(nextStage) ?? nextStage
        return {
          stage:       nextStage,
          stage_label: nextLabel,
          status:      nextStatus,
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lead.id]),
  )

  // ── Phase 7: documents subscription ──────────────────────────────────
  // Student sees document status changes (approved / rejected) in real time.
  useDocumentsRealtime(
    {
      filter:        `lead_id=eq.${lead.id}`,
      channelSuffix: `student-docs-${lead.id}`,
    },
    useCallback((payload) => {
      if (payload.eventType === 'DELETE') return // docs are never deleted in the schema

      const doc = payload.new as {
        id?:               string
        file_name?:        string
        file_url?:         string
        status?:           string
        rejection_reason?: string | null
        created_at?:       string
      }
      if (!doc.id) return

      setLiveDocs(prev => {
        const idx = prev.findIndex(d => d.id === doc.id)
        if (idx === -1) {
          // New document uploaded by this student.
          return [
            {
              id:               doc.id!,
              file_name:        doc.file_name ?? '',
              file_url:         doc.file_url ?? '',
              status:           (doc.status ?? 'pending') as DocumentRow['status'],
              rejection_reason: doc.rejection_reason ?? null,
              created_at:       doc.created_at ?? new Date().toISOString(),
            },
            ...prev,
          ]
        }
        // Status changed (approved / rejected).
        const next = [...prev]
        next[idx] = {
          ...next[idx],
          status:           (doc.status ?? next[idx].status) as DocumentRow['status'],
          rejection_reason: doc.rejection_reason ?? null,
        }
        return next
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lead.id]),
  )

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white">
      {/* ── Summary row ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={`lead-detail-${lead.id}`}
        className="w-full px-5 py-4 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: reference code + stage label */}
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold tracking-widest text-[var(--text)]">
                {lead.reference_code}
              </span>
              {/* Live status badge — updates without page refresh */}
              <StatusBadge status={liveState.status} />
            </div>
            <span className="text-sm text-[var(--text-muted)]">
              {/* Live stage label */}
              {liveState.stage_label} · Applied{' '}
              {new Date(lead.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
          </div>

          {/* Right: mini stepper + chevron */}
          <div className="flex items-center gap-4">
            {/* Live stage in stepper */}
            <MiniStepper
              stages={stages}
              currentStage={liveState.stage}
              leadStatus={liveState.status}
            />
            {/* Chevron */}
            <svg
              className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </button>

      {/* ── Detail panel ────────────────────────────────────────────────── */}
      {open && (
        <div
          id={`lead-detail-${lead.id}`}
          className="border-t border-[var(--border)] px-5 py-6 space-y-5"
        >
          {/* Consultant contact — shown first so it's the first thing a student sees */}
          <ConsultantCard consultant={lead.consultant} />

          <LeadDetailPanel
            leadId={lead.id}
            studentId={studentId}
            currentStage={liveState.stage}
            leadStatus={liveState.status}
            stages={stages}
            lastContacted={lead.last_contacted}
            initialDocs={liveDocs}
            referenceCode={lead.reference_code}
          />
        </div>
      )}
    </div>
  )
}
