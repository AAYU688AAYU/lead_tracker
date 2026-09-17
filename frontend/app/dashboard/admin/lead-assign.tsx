'use client'

/**
 * LeadAssignList — Phase 7
 *
 * Phase 5 behaviour fully preserved.
 * Phase 7 adds two Realtime subscriptions (unfiltered — admin sees all rows):
 *
 *   1. leads table  — no filter
 *      • UPDATE → re-fetches the single AdminLeadRow via getAdminLeadRow and
 *        merges it in-place (handles stage/status/consultant changes).
 *      • INSERT → fetches and appends the new lead to the list.
 *      • DELETE → removes the lead from the list.
 *
 *   2. documents table — no filter
 *      Carries no data the admin list needs to display, but the open Drawer
 *      (LeadDetailDrawer, Task 8) handles its own document subscription.
 *      We include a documents subscription here only to keep the admin
 *      list's document counts current if they are ever surfaced in future
 *      phases; for now the handler is a no-op that at least keeps the
 *      channel alive.
 *
 * Design: same per-lead pendingRefresh debounce used in KanbanBoard.
 */

import {
  useState,
  useCallback,
  useTransition,
  useRef,
} from 'react'
import { getAdminLeadRow } from './actions'
import type { AdminLeadRow, ConsultantOption } from './types'
import type { StageStep } from '@/app/status/actions'
import { MiniStepper } from '@/app/components/lead-detail'
import { LeadDetailDrawer } from '@/app/components/lead-drawer'
import type { ConsultantSelectOption } from '@/app/components/lead-drawer-types'
import {
  useLeadsRealtime,
  useDocumentsRealtime,
} from '@/lib/hooks/use-leads-realtime'

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const btnOutline =
  'rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-2.5 py-1 text-xs ' +
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
    <span className={`inline-block rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? styles.dropped}`}>
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// TIER 2 #7: Consolidated reassign — removed inline form, now uses drawer only
// This component now just displays the consultant name and a "Reassign" button
// that opens the lead detail drawer (which handles reassignment)
// ---------------------------------------------------------------------------

function ConsultantDisplay({
  lead,
  onOpenDrawer,
}: {
  lead:           AdminLeadRow
  onOpenDrawer:   (leadId: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[var(--text)]">
        {lead.consultant_name ?? (
          <span className="text-[var(--text-muted)]">Unassigned</span>
        )}
      </span>
      <button
        type="button"
        onClick={() => onOpenDrawer(lead.id)}
        className={btnOutline}
      >
        {lead.consultant_name ? 'Reassign…' : 'Assign…'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LeadAssignList — full lead list with per-row assignment + realtime
// ---------------------------------------------------------------------------

type LeadState = AdminLeadRow & { _optimistic?: boolean }

export function LeadAssignList({
  leads: initialLeads,
  stages,
  consultants,
}: {
  leads:       AdminLeadRow[]
  stages:      StageStep[]
  consultants: ConsultantOption[]
}) {
  const [leads, setLeads]         = useState<LeadState[]>(initialLeads)
  const [, startTransition]       = useTransition()
  const pendingRefresh            = useRef<Set<string>>(new Set())

  // Phase 5 — drawer state
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null)
  const drawerOpen = drawerLeadId !== null

  const handleOpenDrawer  = useCallback((leadId: string) => { setDrawerLeadId(leadId) }, [])
  const handleCloseDrawer = useCallback(() => { setDrawerLeadId(null) }, [])

  const drawerConsultants: ConsultantSelectOption[] = consultants.map(c => ({
    id:                 c.id,
    name:               c.name,
    is_accepting_leads: c.is_accepting_leads,
    open_leads:         c.open_leads,
    max_lead_capacity:  c.max_lead_capacity,
  }))

  // Filter state
  const [stageFilter,    setStageFilter]    = useState<string>('all')
  const [statusFilter,   setStatusFilter]   = useState<string>('all')
  const [assignedFilter, setAssignedFilter] = useState<string>('all')
  const [search,         setSearch]         = useState('')

  function handleAssigned(
    leadId: string,
    consultantId: string | null,
    consultantName: string | null,
  ) {
    // No longer needed — reassignment handled via drawer
    // Realtime updates will handle updating the UI when drawer closes
  }

  // ── Phase 7: leads Realtime subscription (unfiltered — admin sees all) ──
  useLeadsRealtime(
    { channelSuffix: 'admin' },
    useCallback((payload) => {
      const eventType = payload.eventType

      if (eventType === 'DELETE') {
        const oldId = (payload.old as { id?: string })?.id
        if (oldId) setLeads(prev => prev.filter(l => l.id !== oldId))
        return
      }

      const newRow = payload.new as { id?: string }
      const leadId = newRow?.id
      if (!leadId) return

      if (pendingRefresh.current.has(leadId)) return
      pendingRefresh.current.add(leadId)

      startTransition(async () => {
        try {
          const fresh = await getAdminLeadRow(leadId)
          if (fresh) {
            setLeads(prev => {
              const idx = prev.findIndex(l => l.id === fresh.id)
              if (idx === -1) {
                // New lead — prepend (most recent first, matching server sort)
                return [fresh, ...prev]
              }
              const next = [...prev]
              next[idx] = fresh
              return next
            })
          } else if (eventType === 'UPDATE') {
            // No longer accessible (shouldn't happen for admin, but guard anyway)
            setLeads(prev => prev.filter(l => l.id !== leadId))
          }
        } finally {
          pendingRefresh.current.delete(leadId)
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  )

  // ── Phase 7: documents Realtime subscription (unfiltered) ──────────────
  // Admin list doesn't surface per-row doc counts, so this is a forward-
  // compatibility channel that keeps the subscription alive without touching state.
  useDocumentsRealtime(
    { channelSuffix: 'admin' },
    useCallback(() => {
      // No-op for the list view — LeadDetailDrawer handles its own doc channel.
    }, []),
  )

  // ── Filters ─────────────────────────────────────────────────────────────
  const filtered = leads.filter(l => {
    if (stageFilter    !== 'all' && l.stage  !== stageFilter)    return false
    if (statusFilter   !== 'all' && l.status !== statusFilter)   return false
    if (assignedFilter === 'assigned'   && !l.consultant_id)     return false
    if (assignedFilter === 'unassigned' &&  l.consultant_id)     return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !l.reference_code.toLowerCase().includes(q) &&
        !l.student_name.toLowerCase().includes(q) &&
        !l.student_email.toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  const unassignedCount = leads.filter(l => !l.consultant_id).length

  return (
    <>
      <div className="space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search student or ref code…"
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] w-56"
          />

          {/* Stage filter */}
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-2 py-1.5 text-xs text-[var(--text)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
            aria-label="Filter by stage"
          >
            <option value="all">All stages</option>
            {stages.map(s => <option key={s.stage} value={s.stage}>{s.label}</option>)}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-2 py-1.5 text-xs text-[var(--text)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="stalled">Stalled</option>
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
          </select>

          {/* Assignment filter */}
          <select
            value={assignedFilter}
            onChange={e => setAssignedFilter(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-2 py-1.5 text-xs text-[var(--text)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
            aria-label="Filter by assignment"
          >
            <option value="all">All leads</option>
            <option value="unassigned">
              Unassigned{unassignedCount > 0 ? ` (${unassignedCount})` : ''}
            </option>
            <option value="assigned">Assigned</option>
          </select>

          <span className="ml-auto text-xs text-[var(--text-muted)]">
            {filtered.length} of {leads.length}
          </span>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">
            No leads match the current filters.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3">Consultant</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(lead => (
                  <tr key={lead.id} className="group hover:bg-[var(--background)]">
                    {/* Student */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--text)]">{lead.student_name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{lead.student_email}</p>
                    </td>

                    {/* Ref */}
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                      {lead.reference_code}
                    </td>

                    {/* Stage */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-[var(--text)]">
                          {lead.stage_label}
                        </span>
                        <MiniStepper
                          stages={stages}
                          currentStage={lead.stage}
                          leadStatus={lead.status}
                        />
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>

                    {/* Updated */}
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {new Date(lead.updated_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>

                    {/* Consultant assign */}
                    <td className="px-4 py-3">
                      <ConsultantDisplay
                        lead={lead}
                        onOpenDrawer={handleOpenDrawer}
                      />
                    </td>

                    {/* Open drawer */}
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => handleOpenDrawer(lead.id)}
                        aria-label={`Open details for ${lead.student_name}`}
                        className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--accent)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                      >
                        <svg
                          aria-hidden
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Phase 5 — Lead detail drawer (admin, with reassign) */}
      <LeadDetailDrawer
        isOpen={drawerOpen}
        leadId={drawerLeadId}
        role="admin"
        dashboard="admin"
        consultants={drawerConsultants}
        onClose={handleCloseDrawer}
      />
    </>
  )
}
