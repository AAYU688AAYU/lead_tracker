'use client'

/**
 * KanbanBoard — Phase 7
 *
 * Phase 5 behaviour is entirely preserved.
 * Phase 7 adds two Realtime subscriptions:
 *
 *   1. leads table  filtered to consultant_id = <consultantId>
 *      • UPDATE → re-fetches the full card via getLeadCardData and merges it
 *        into local state (handles stage advance, status change, stall flip).
 *      • INSERT → fetches and appends the new card (newly assigned lead).
 *      • DELETE → removes the card (lead unassigned or dropped at DB level).
 *
 *   2. documents table filtered to lead_id in the consultant's current set.
 *      Documents change inside the open Drawer; the Drawer handles its own
 *      doc subscription directly (Task 8).  Here we only need to patch the
 *      card-level document list so stale counts don't show after the drawer
 *      closes — a lightweight UPDATE to the card's documents array.
 *
 * Design decisions:
 *   • We do NOT do a full-page revalidation on every Realtime event — that
 *     would be a hard navigation and defeat the purpose.  Instead we merge
 *     the live payload into the existing leads[] state.
 *   • getLeadCardData is a server action, so it uses the auth client (RLS).
 *     If the lead is no longer accessible (re-assigned to another consultant),
 *     it returns null and we remove the card.
 *   • The existing optimistic drag-drop and drawer stage-advance paths are
 *     unchanged and still work — Realtime confirms them or overrides if the
 *     server disagrees.
 *   • Debounce: rapid events for the same lead_id are coalesced via a
 *     per-lead pending flag so only one in-flight refresh runs at a time.
 */

import {
  useState,
  useTransition,
  useRef,
  createContext,
  useContext,
  useCallback,
} from 'react'
import { advanceStageKanban, getLeadCardData } from './actions'
import type { ConsultantLeadDetail } from './types'
import type { StageStep } from '@/app/status/actions'
import { LeadDetailDrawer } from '@/app/components/lead-drawer'
import {
  useLeadsRealtime,
  useDocumentsRealtime,
} from '@/lib/hooks/use-leads-realtime'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysInStage(stage_entered_at: string): number {
  const ms = Date.now() - Date.parse(stage_entered_at)
  return Math.max(0, Math.floor(ms / 86_400_000))
}

function stageIndex(stages: StageStep[], stage: string): number {
  return stages.findIndex(s => s.stage === stage)
}

// ---------------------------------------------------------------------------
// Drag context — lets cards call board-level handlers without prop drilling
// ---------------------------------------------------------------------------

interface DragCtx {
  draggedLead: ConsultantLeadDetail | null
  onDragStart: (lead: ConsultantLeadDetail) => void
  onDragEnd:   () => void
}

const DragContext = createContext<DragCtx>({
  draggedLead: null,
  onDragStart: () => {},
  onDragEnd:   () => {},
})

// ---------------------------------------------------------------------------
// StalledPip — small amber dot + "Stalled" text
// ---------------------------------------------------------------------------

function StalledPip() {
  return (
    <span className="flex items-center gap-1" aria-label="Stalled">
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--stalled)]"
      />
      <span className="text-[11px] text-[var(--stalled)]">Stalled</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// KanbanCard — draggable lead card (desktop) / static row (mobile delegate)
// ---------------------------------------------------------------------------

function KanbanCard({
  lead,
  stages,
  onTap,
}: {
  lead:   ConsultantLeadDetail
  stages: StageStep[]
  onTap?: (lead: ConsultantLeadDetail) => void
}) {
  const { draggedLead, onDragStart, onDragEnd } = useContext(DragContext)

  const days       = daysInStage(lead.stage_entered_at)
  const isStalled  = lead.status === 'stalled'
  const isLast     = stageIndex(stages, lead.stage) === stages.length - 1
  const isDragging = draggedLead?.id === lead.id

  return (
    <div
      draggable={!isLast}
      onDragStart={e => {
        e.dataTransfer.setData('application/lead-id',    lead.id)
        e.dataTransfer.setData('application/lead-stage', lead.stage)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(lead)
      }}
      onDragEnd={onDragEnd}
      onClick={() => onTap?.(lead)}
      role="button"
      tabIndex={0}
      aria-label={`${lead.student_name}${lead.program_name ? ', ' + lead.program_name : ''}, ${days} day${days !== 1 ? 's' : ''} in stage${isStalled ? ', stalled' : ''}`}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTap?.(lead)
        }
      }}
      className={[
        'rounded-[var(--radius-md)] border bg-white px-3 py-3 text-left w-full',
        'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1',
        isLast
          ? 'cursor-default'
          : 'select-none cursor-grab active:cursor-grabbing',
        isDragging
          ? 'opacity-40 border-[var(--accent)]'
          : 'border-[var(--border)] hover:border-[var(--accent)]',
      ].join(' ')}
    >
      {/* Line 1: student name */}
      <p className="text-sm font-medium text-[var(--text)] leading-snug truncate">
        {lead.student_name}
      </p>
      {/* Line 1b: program name */}
      {lead.program_name && (
        <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">
          {lead.program_name}
        </p>
      )}
      {/* Line 2: days in stage + stalled pip */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-[var(--text-muted)]">
          {days}d in stage
        </span>
        {isStalled && <StalledPip />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KanbanColumn — one stage column (desktop only)
// ---------------------------------------------------------------------------

function KanbanColumn({
  stage,
  leads,
  allStages,
  onDrop,
  onTap,
}: {
  stage:     StageStep
  leads:     ConsultantLeadDetail[]
  allStages: StageStep[]
  onDrop:    (toStage: string) => void
  onTap:     (lead: ConsultantLeadDetail) => void
}) {
  const { draggedLead }         = useContext(DragContext)
  const [isOver, setIsOver]     = useState(false)

  function isValidTarget(draggedStage: string): boolean {
    const fromIdx = stageIndex(allStages, draggedStage)
    const toIdx   = stageIndex(allStages, stage.stage)
    return toIdx === fromIdx + 1
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsOver(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsOver(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsOver(false)
    const draggedStage = e.dataTransfer.getData('application/lead-stage')
    if (draggedStage && !isValidTarget(draggedStage)) return
    onDrop(stage.stage)
  }

  const count = leads.length

  return (
    <div
      className="flex min-w-[186px] flex-1 flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="mb-2 flex items-center justify-between px-0.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {stage.label}
        </span>
        <span className="rounded-full bg-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] leading-none">
          {count}
        </span>
      </div>

      <div
        className={[
          'flex-1 rounded-[var(--radius-md)] p-1.5 min-h-[120px]',
          isOver && draggedLead
            ? 'bg-[var(--accent)]/[0.06] outline outline-2 outline-[var(--accent)]/30 outline-offset-[-2px]'
            : 'bg-[var(--background)]',
        ].join(' ')}
      >
        {count === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--text-muted)]">
            No leads in {stage.label}
          </p>
        ) : (
          <div className="space-y-2">
            {leads.map(lead => (
              <KanbanCard key={lead.id} lead={lead} stages={allStages} onTap={onTap} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MobileStageList — mobile-only (< md)
// ---------------------------------------------------------------------------

function MobileStageList({
  stages,
  leads,
  onTap,
}: {
  stages: StageStep[]
  leads:  ConsultantLeadDetail[]
  onTap:  (lead: ConsultantLeadDetail) => void
}) {
  const [activeStage, setActiveStage] = useState(stages[0]?.stage ?? '')

  const countFor    = (s: string) => leads.filter(l => l.stage === s).length
  const visible     = leads.filter(l => l.stage === activeStage)
  const activeLabel = stages.find(s => s.stage === activeStage)?.label ?? activeStage

  return (
    <div className="flex flex-col gap-3">
      {/* Stage tab strip */}
      <div
        role="tablist"
        aria-label="Pipeline stages"
        className="flex gap-1.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {stages.map(s => {
          const active = s.stage === activeStage
          return (
            <button
              key={s.stage}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`mpanel-${s.stage}`}
              onClick={() => setActiveStage(s.stage)}
              className={[
                'flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5',
                'text-xs font-medium whitespace-nowrap',
                'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1',
                active
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-[var(--border)] bg-white text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]',
              ].join(' ')}
            >
              {s.label}
              <span
                className={[
                  'rounded-full px-1.5 py-px text-[10px] font-semibold leading-none',
                  active ? 'bg-white/25 text-white' : 'bg-[var(--border)] text-[var(--text-muted)]',
                ].join(' ')}
              >
                {countFor(s.stage)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Filtered list */}
      <div
        id={`mpanel-${activeStage}`}
        role="tabpanel"
        aria-label={activeLabel}
      >
        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">
            No leads in {activeLabel}
          </p>
        ) : (
          <div className="space-y-2">
            {visible.map(lead => {
              const days      = daysInStage(lead.stage_entered_at)
              const isStalled = lead.status === 'stalled'
              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => onTap(lead)}
                  aria-label={`Open ${lead.student_name}${lead.program_name ? ', ' + lead.program_name : ''}`}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-left transition-colors hover:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
                >
                  <p className="text-sm font-medium text-[var(--text)] truncate">
                    {lead.student_name}
                    {lead.program_name && (
                      <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                        · {lead.program_name}
                      </span>
                    )}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">{days}d in stage</span>
                    {isStalled && <StalledPip />}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KanbanBoard — public export
// ---------------------------------------------------------------------------

export function KanbanBoard({
  stages,
  initialLeads,
  consultantId,
}: {
  stages:       StageStep[]
  initialLeads: ConsultantLeadDetail[]
  /** Phase 7: needed to scope Realtime subscriptions to this consultant. */
  consultantId: string
}) {
  const [leads, setLeads]             = useState(initialLeads)
  const [draggedLead, setDraggedLead] = useState<ConsultantLeadDetail | null>(null)
  const [, startTransition]           = useTransition()
  const snapshot                      = useRef<ConsultantLeadDetail[]>(initialLeads)

  // Phase 5 — drawer state
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null)
  const drawerOpen = drawerLeadId !== null

  const handleTap = useCallback((lead: ConsultantLeadDetail) => {
    setDrawerLeadId(lead.id)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setDrawerLeadId(null)
  }, [])

  // Called by the drawer when a stage advance succeeds — keeps the board in
  // sync without a full page reload.
  const handleDrawerStageAdvanced = useCallback((leadId: string, nextStage: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l
      const nextLabel = stages.find(s => s.stage === nextStage)?.label ?? nextStage
      return {
        ...l,
        stage:            nextStage,
        stage_label:      nextLabel,
        stage_entered_at: new Date().toISOString(),
        status:           'active',
      }
    }))
  }, [stages])

  // ── Phase 7: per-lead in-flight guard ─────────────────────────────────
  // Prevents multiple concurrent getLeadCardData fetches for the same lead.
  const pendingRefresh = useRef<Set<string>>(new Set())

  // Merge a freshly-fetched card into local state.
  function applyLeadRefresh(fresh: ConsultantLeadDetail) {
    setLeads(prev => {
      const idx = prev.findIndex(l => l.id === fresh.id)
      if (idx === -1) {
        // New lead assigned to this consultant — append.
        return [...prev, fresh]
      }
      // Replace the existing card in place.
      const next = [...prev]
      next[idx] = fresh
      return next
    })
  }

  // ── Phase 7: leads Realtime subscription ──────────────────────────────
  useLeadsRealtime(
    {
      filter:        `consultant_id=eq.${consultantId}`,
      channelSuffix: consultantId,
    },
    useCallback((payload) => {
      const eventType = payload.eventType

      if (eventType === 'DELETE') {
        const oldId = (payload.old as { id?: string })?.id
        if (oldId) setLeads(prev => prev.filter(l => l.id !== oldId))
        return
      }

      // INSERT or UPDATE — re-fetch the full denormalized card.
      const newRow = payload.new as { id?: string }
      const leadId = newRow?.id
      if (!leadId) return

      // Debounce: skip if a fetch is already in flight for this lead.
      if (pendingRefresh.current.has(leadId)) return
      pendingRefresh.current.add(leadId)

      startTransition(async () => {
        try {
          const fresh = await getLeadCardData(leadId)
          if (fresh) {
            applyLeadRefresh(fresh)
          } else if (eventType === 'UPDATE') {
            // Lead is no longer accessible (re-assigned away from this consultant).
            setLeads(prev => prev.filter(l => l.id !== leadId))
          }
        } finally {
          pendingRefresh.current.delete(leadId)
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [consultantId]),
  )

  // ── Phase 7: documents Realtime subscription ──────────────────────────
  // Lead-level document changes (approve / reject) are handled with a
  // targeted patch so the card's document list stays current.
  const leadIds = leads.map(l => l.id)

  useDocumentsRealtime(
    {
      // Supabase Realtime filter supports `lead_id=in.(...)` syntax but has
      // a row-count cap; for large sets we fall back to filtering client-side.
      channelSuffix: `consultant-docs-${consultantId}`,
    },
    useCallback((payload) => {
      if (payload.eventType === 'DELETE') return // docs are never deleted in the schema

      const doc = payload.new as {
        id?: string; lead_id?: string; status?: string
        file_name?: string; file_url?: string
        rejection_reason?: string | null; created_at?: string
      }
      if (!doc.lead_id || !leadIds.includes(doc.lead_id)) return

      setLeads(prev => prev.map(lead => {
        if (lead.id !== doc.lead_id) return lead

        const existingIdx = lead.documents.findIndex(d => d.id === doc.id)
        if (existingIdx === -1) {
          // New document uploaded — prepend.
          const newDoc = {
            id:               doc.id ?? '',
            file_name:        doc.file_name ?? '',
            file_url:         doc.file_url ?? '',
            status:           (doc.status ?? 'pending') as 'pending' | 'approved' | 'rejected',
            rejection_reason: doc.rejection_reason ?? null,
            created_at:       doc.created_at ?? new Date().toISOString(),
          }
          return { ...lead, documents: [newDoc, ...lead.documents] }
        }

        // Existing doc updated (status change).
        const nextDocs = [...lead.documents]
        nextDocs[existingIdx] = {
          ...nextDocs[existingIdx],
          status:           (doc.status ?? nextDocs[existingIdx].status) as 'pending' | 'approved' | 'rejected',
          rejection_reason: doc.rejection_reason ?? null,
        }
        return { ...lead, documents: nextDocs }
      }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leadIds.join(',')]),
  )

  // ── Drag-drop handlers (unchanged from Phase 5) ───────────────────────

  function handleDragStart(lead: ConsultantLeadDetail) {
    snapshot.current = leads
    setDraggedLead(lead)
  }

  function handleDragEnd() { setDraggedLead(null) }

  function handleDrop(toStage: string) {
    if (!draggedLead) return
    const fromStage = draggedLead.stage
    const fromIdx   = stageIndex(stages, fromStage)
    const toIdx     = stageIndex(stages, toStage)

    if (toIdx !== fromIdx + 1) { setDraggedLead(null); return }

    const toLabel = stages[toIdx]?.label ?? toStage

    setLeads(prev =>
      prev.map(l =>
        l.id === draggedLead.id
          ? { ...l, stage: toStage, stage_label: toLabel, stage_entered_at: new Date().toISOString(), status: 'active' }
          : l
      )
    )
    setDraggedLead(null)

    const capturedLead = draggedLead
    startTransition(async () => {
      const fd = new FormData()
      fd.set('lead_id',    capturedLead.id)
      fd.set('from_stage', fromStage)
      fd.set('to_stage',   toStage)
      const result = await advanceStageKanban({ status: 'idle' }, fd)
      if (result.status === 'error') setLeads(snapshot.current)
    })
  }

  // Group leads by stage
  const byStage = new Map<string, ConsultantLeadDetail[]>()
  for (const s of stages) byStage.set(s.stage, [])
  for (const l of leads) byStage.get(l.stage)?.push(l)

  return (
    <>
      <DragContext.Provider value={{ draggedLead, onDragStart: handleDragStart, onDragEnd: handleDragEnd }}>
        {/* Desktop Kanban */}
        <div
          className="hidden md:flex gap-3 overflow-x-auto pb-4"
          style={{ alignItems: 'flex-start' }}
        >
          {stages.map(stage => (
            <KanbanColumn
              key={stage.stage}
              stage={stage}
              leads={byStage.get(stage.stage) ?? []}
              allStages={stages}
              onDrop={handleDrop}
              onTap={handleTap}
            />
          ))}
        </div>

        {/* Mobile stage-tab list */}
        <div className="md:hidden">
          <MobileStageList stages={stages} leads={leads} onTap={handleTap} />
        </div>
      </DragContext.Provider>

      {/* Phase 5 — Lead detail drawer (consultant, no reassign) */}
      <LeadDetailDrawer
        isOpen={drawerOpen}
        leadId={drawerLeadId}
        role="consultant"
        dashboard="consultant"
        onClose={handleCloseDrawer}
        onStageAdvanced={handleDrawerStageAdvanced}
      />
    </>
  )
}
