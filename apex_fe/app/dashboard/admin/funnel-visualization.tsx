'use client'

/**
 * FunnelVisualization — TASK #3
 *
 * Horizontal funnel showing leads per stage.
 * Stage with most engagements is highlighted in Arbor green.
 * Quiet design: muted Spruce bars, one highlighted segment.
 * No rainbow coloring or chart library.
 */

interface StageSummary {
  stage: string
  label: string
  sort_order: number
  active: number
  stalled: number
}

interface FunnelVisualizationProps {
  stageSummary: StageSummary[]
  highlightStage: string
}

export function FunnelVisualization({
  stageSummary,
  highlightStage,
}: FunnelVisualizationProps) {
  // Calculate max width for scaling bars
  const maxCount = Math.max(...stageSummary.map(s => s.active + s.stalled), 1)

  return (
    <section aria-labelledby="funnel-heading">
      <h2
        id="funnel-heading"
        className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]"
      >
        Pipeline funnel — current snapshot
      </h2>

      <div className="space-y-3">
        {stageSummary.map(s => {
          const total = s.active + s.stalled
          const pct = maxCount > 0 ? Math.round((total / maxCount) * 100) : 0
          const isHighlight = s.stage === highlightStage

          return (
            <div key={s.stage} className="flex items-center gap-3">
              {/* Stage label */}
              <div className="w-32 shrink-0">
                <p className="truncate text-sm font-medium text-[var(--text)]">
                  {s.label}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {s.active} active · {s.stalled} stalled
                </p>
              </div>

              {/* Funnel bar */}
              <div className="flex-1">
                <div
                  className={`h-8 rounded-[var(--radius-sm)] transition-all ${
                    isHighlight
                      ? 'bg-[#6BAD94]' // Arbor green
                      : 'bg-[#9CA39E]' // Spruce
                  }`}
                  style={{ width: `${Math.max(pct, 3)}%` }}
                  role="presentation"
                  aria-hidden="true"
                />
              </div>

              {/* Count label */}
              <div className="w-12 text-right">
                <p className="text-sm font-medium tabular-nums text-[var(--text)]">
                  {total}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-[#6BAD94]" />
          <span>Stage with most engagements</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-[#9CA39E]" />
          <span>Other stages</span>
        </div>
      </div>
    </section>
  )
}
