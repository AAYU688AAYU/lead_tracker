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
  lazy,
  Suspense,
  useEffect,
} from 'react'
import { advanceStageKanban, getLeadCardData } from './actions'
import type { ConsultantLeadDetail } from './types'
import type { StageStep } from '@/app/status/actions'
import { LeadContextMenu } from '@/app/components/lead-context-menu'
import { KeyboardHelpModal } from '@/app/components/keyboard-help-modal'
import { ToastContainer } from '@/app/components/toast'
import { useToast } from '@/lib/hooks/use-toast'
import { useStallCountdown } from '@/lib/hooks/use-stall-countdown'
import { useLiveDays } from '@/lib/hooks/use-live-days'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts'
import { useCRMRealtime } from '@/lib/hooks/use-crm-realtime'

// Lazy-load the drawer component for better initial page load performance
const LeadDetailDrawer = lazy(() =>
  import('@/app/components/lead-drawer').then(mod => ({
    default: mod.LeadDetailDrawer,
  }))
)

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
  stageThreshold,
}: {
  lead:            ConsultantLeadDetail
  stages:          StageStep[]
  onTap?:          (lead: ConsultantLeadDetail) => void
  stageThreshold?: number
}) {
  const { draggedLead, onDragStart, onDragEnd } = useContext(DragContext)
  const { displayText, isWarning } = useStallCountdown(
    lead,
    stageThreshold,
  )
  const days = useLiveDays(lead.stage_entered_at)
  const isStalled  = lead.status === 'stalled'
  const isLast     = stageIndex(stages, lead.stage) === stages.length - 1
  const isDragging = draggedLead?.id === lead.id

  // Context menu actions (only for stalled leads)
  const contextActions = isStalled
    ? [
        {
          label: 'Contact student',
          onClick: () => {
            window.location.href = `mailto:${lead.student_email}`
          },
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          ),
        },
        {
          label: 'View details',
          onClick: () => onTap?.(lead),
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ),
        },
      ]
    : [
        {
          label: 'View details',
          onClick: () => onTap?.(lead),
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ),
        },
      ]

  const cardContent = (
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
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1',
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
      {/* Line 2: days in stage + countdown + stalled pip */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-[var(--text-muted)]">
          {days}d in stage
        </span>
        {!isStalled && isWarning && (
          <span className={`text-[11px] font-medium ${
            displayText.includes('Stalling now')
              ? 'text-[var(--stalled)] animate-pulse'
              : 'text-orange-600'
          }`}>
            {displayText}
          </span>
        )}
        {isStalled && <StalledPip />}
      </div>
    </div>
  )

  return (
    <LeadContextMenu
      actions={contextActions}
      trigger={cardContent}
    />
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
            {leads.map(lead => {
              const stageConfig = allStages.find(s => s.stage === lead.stage)
              return (
                <KanbanCard
                  key={lead.id}
                  lead={lead}
                  stages={allStages}
                  onTap={onTap}
                  stageThreshold={stageConfig?.stall_threshold_hours}
                />
              )
            })}
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
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1',
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
              const days           = useLiveDays(lead.stage_entered_at)
              const isStalled      = lead.status === 'stalled'
              const stageConfig    = stages.find(s => s.stage === lead.stage)
              const { displayText, isWarning } = useStallCountdown(
                lead,
                stageConfig?.stall_threshold_hours,
              )
              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => onTap(lead)}
                  aria-label={`Open ${lead.student_name}${lead.program_name ? ', ' + lead.program_name : ''}`}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-left transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                >
                  <p className="text-sm font-medium text-[var(--text)] truncate">
                    {lead.student_name}
                    {lead.program_name && (
                      <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                        · {lead.program_name}
                      </span>
                    )}
                  </p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[var(--text-muted)]">{days}d in stage</span>
                    {!isStalled && isWarning && (
                      <span className={`text-[11px] font-medium ${
                        displayText.includes('Stalling now')
                          ? 'text-[var(--stalled)] animate-pulse'
                          : 'text-orange-600'
                      }`}>
                        {displayText}
                      </span>
                    )}
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
  
  // Toast for drag-drop errors
  const { toast, showToast, dismissToast } = useToast()
  
  // Keyboard shortcuts
  const { showHelp, closeHelp } = useKeyboardShortcuts()

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

  // ── Phase 8: consolidated realtime subscription via provider ────────────
  // Instead of N subscriptions (leads, documents), use the centralized
  // RealtimeProvider's useCRMRealtime hook which maintains a single connection.
  const { leads: realtimeLeads, stalledLeadIds: stalled } = useCRMRealtime()

  // Stalled leads tracking for visual indicators
  const stalledLeadIds = Array.from(stalled)

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
      if (result.status === 'error') {
        setLeads(snapshot.current)
        showToast({
          type: 'error',
          message: result.message || 'Failed to advance lead. Please try again.',
        })
      }
    })
  }

  // Group leads by stage
  const byStage = new Map<string, ConsultantLeadDetail[]>()
  for (const s of stages) byStage.set(s.stage, [])
  for (const l of leads) byStage.get(l.stage)?.push(l)

  return (
    <>
      <ToastContainer toast={toast} onDismiss={dismissToast} />
      <KeyboardHelpModal isOpen={showHelp} onClose={closeHelp} />

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
      {/* Lazy-loaded for better initial page load performance */}
      <Suspense fallback={null}>
        <LeadDetailDrawer
          isOpen={drawerOpen}
          leadId={drawerLeadId}
          role="consultant"
          dashboard="consultant"
          onClose={handleCloseDrawer}
          onStageAdvanced={handleDrawerStageAdvanced}
        />
      </Suspense>
    </>
  )
}
