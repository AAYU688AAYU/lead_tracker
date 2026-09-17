'use client'

/**
 * AttentionList — TASK #2
 *
 * Two visually distinct sections:
 *   SECTION A - Escalated Stalls: Consultant hasn't acted beyond escalation threshold
 *   SECTION B - Unassigned: Auto-assignment failed, manual intervention needed
 *
 * Different actions per section:
 *   A: "View case" → navigate to consultant case view
 *   B: "Assign" → open consultant selector with load info
 */

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { assignConsultant } from './actions'
import { INITIAL_ASSIGN_STATE } from './types'
import type { AdminLeadRow, ConsultantOption } from './types'
import type { StageStep } from '@/app/status/actions'

interface AttentionListProps {
  escalatedStalls: AdminLeadRow[]
  unassignedLeads: AdminLeadRow[]
  stages: StageStep[]
  consultants: ConsultantOption[]
}

export function AttentionList({
  escalatedStalls,
  unassignedLeads,
  stages,
  consultants,
}: AttentionListProps) {
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null)
  const [state, action, isPending] = useActionState(assignConsultant, INITIAL_ASSIGN_STATE)

  if (escalatedStalls.length === 0 && unassignedLeads.length === 0) {
    return null // No attention needed
  }

  return (
    <div className="space-y-8">
      {/* ─────────────────────────────────────────────────────────────── */}
      {/* SECTION A: Escalated Stalls                                   */}
      {/* ─────────────────────────────────────────────────────────────── */}
      {escalatedStalls.length > 0 && (
        <section
          aria-labelledby="escalated-heading"
          className="rounded-[var(--radius-md)] border-l-4 border-l-[var(--stalled)] bg-white p-6"
        >
          <h3
            id="escalated-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--stalled)]"
          >
            ⚠ Escalated stalls — {escalatedStalls.length} {escalatedStalls.length === 1 ? 'case' : 'cases'}
          </h3>
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            Consultant has not acted beyond the escalation threshold. Consider nudging them.
          </p>

          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            {escalatedStalls.map(lead => (
              <div
                key={lead.id}
                className="flex items-center justify-between gap-3 rounded bg-[var(--background)] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text)]">
                    {lead.student_name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {lead.consultant_name} • {lead.stage_label} • Stalled
                  </p>
                </div>
                <Link
                  href={`/dashboard/admin/consultants/${lead.consultant_id}`}
                  className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                >
                  View case
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* SECTION B: Unassigned                                         */}
      {/* ─────────────────────────────────────────────────────────────── */}
      {unassignedLeads.length > 0 && (
        <section
          aria-labelledby="unassigned-heading"
          className="rounded-[var(--radius-md)] border-l-4 border-l-[var(--stalled)] bg-white p-6"
        >
          <h3
            id="unassigned-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--stalled)]"
          >
            ⚠ Unassigned — {unassignedLeads.length} {unassignedLeads.length === 1 ? 'case' : 'cases'}
          </h3>
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            Auto-assignment failed. Manually assign a consultant.
          </p>

          <div className="space-y-3 border-t border-[var(--border)] pt-4">
            {unassignedLeads.map(lead => {
              const isAssigning = assigningLeadId === lead.id
              const availableConsultants = consultants.filter(
                c => c.is_accepting_leads && c.open_leads < (c.max_lead_capacity ?? Infinity)
              )

              return (
                <div
                  key={lead.id}
                  className="rounded bg-[var(--background)] p-3"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text)]">
                        {lead.student_name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {lead.reference_code}
                      </p>
                    </div>
                    <button
                      onClick={() => setAssigningLeadId(isAssigning ? null : lead.id)}
                      className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:opacity-50"
                      disabled={isPending}
                    >
                      {isAssigning ? 'Cancel' : 'Assign'}
                    </button>
                  </div>

                  {isAssigning && (
                    <div className="mt-3 space-y-2">
                      {availableConsultants.length === 0 ? (
                        <p className="text-xs text-[var(--stalled)]">
                          No consultants available. Adjust capacity or accepting status.
                        </p>
                      ) : (
                          <form
                            action={async (fd) => {
                              await action(fd)
                              setAssigningLeadId(null)
                            }}
                            className="space-y-2"
                          >
                            <input type="hidden" name="lead_id" value={lead.id} />
                            <p className="text-xs font-medium text-[var(--text-muted)]">
                              Select consultant:
                            </p>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {availableConsultants.map(c => {
                                const isFull =
                                  c.max_lead_capacity && c.open_leads >= c.max_lead_capacity
                                const capacityPct =
                                  c.max_lead_capacity
                                    ? Math.round((c.open_leads / c.max_lead_capacity) * 100)
                                    : 0

                                return (
                                  <button
                                    key={c.id}
                                    type="submit"
                                    name="consultant_id"
                                    value={c.id}
                                    className={`w-full text-left rounded border px-3 py-2.5 text-xs transition-colors disabled:opacity-50 ${
                                      isFull
                                        ? 'border-[var(--border)] bg-[var(--background)] cursor-not-allowed opacity-60'
                                        : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--background)]'
                                    }`}
                                    disabled={isFull}
                                    title={isFull ? 'Consultant is at capacity' : undefined}
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <span className="font-medium text-[var(--text)]">
                                        {c.name}
                                      </span>
                                      <span
                                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                          capacityPct >= 80
                                            ? 'bg-[var(--stalled)] text-white'
                                            : capacityPct >= 50
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                      >
                                        {capacityPct}%
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                                      <span>
                                        {c.open_leads}/{c.max_lead_capacity ?? '∞'} leads
                                      </span>
                                      <span>
                                        {c.is_accepting_leads ? '✓ Accepting' : '✗ Paused'}
                                      </span>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                            {state.status === 'error' && (
                              <p className="text-xs text-[var(--destructive)]">
                                {state.message}
                              </p>
                            )}
                          </form>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
