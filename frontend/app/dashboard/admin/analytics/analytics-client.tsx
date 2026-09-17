'use client'

/**
 * AnalyticsClient
 *
 * Handles the date-range + consultant filters entirely on the client using
 * useSearchParams / useRouter so the page re-fetches with fresh server data
 * without a full navigation. Filter changes update the URL search params,
 * which the server page reads and passes back down as props.
 *
 * Two views:
 *  1. Horizontal bar chart — current count of leads per stage (live snapshot)
 *  2. Conversion rate summary stat — enrolled ÷ total created in date range
 *
 * No third-party chart library — built with plain div bars using design tokens.
 */

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import type { AnalyticsData } from '../types'

// ---------------------------------------------------------------------------
// Design helpers
// ---------------------------------------------------------------------------

const labelCls = 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide'

// ---------------------------------------------------------------------------
// FilterBar
// ---------------------------------------------------------------------------

function FilterBar({
  consultants,
  from,
  to,
  consultantId,
}: {
  consultants:  AnalyticsData['consultants']
  from:         string
  to:           string
  consultantId: string
}) {
  const router   = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const push = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(window.location.search)
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname],
  )

  const inputCls =
    'rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-2 py-1.5 ' +
    'text-sm text-[var(--text)] focus-visible:border-[var(--accent)] focus-visible:outline-none ' +
    'focus-visible:ring-1 focus-visible:ring-[var(--accent)]'

  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Date from */}
      <div className="flex flex-col gap-1">
        <label htmlFor="analytics-from" className={labelCls}>From</label>
        <input
          id="analytics-from"
          type="date"
          defaultValue={from}
          className={inputCls}
          onChange={e => push('from', e.target.value)}
        />
      </div>

      {/* Date to */}
      <div className="flex flex-col gap-1">
        <label htmlFor="analytics-to" className={labelCls}>To</label>
        <input
          id="analytics-to"
          type="date"
          defaultValue={to}
          className={inputCls}
          onChange={e => push('to', e.target.value)}
        />
      </div>

      {/* Consultant filter */}
      <div className="flex flex-col gap-1">
        <label htmlFor="analytics-consultant" className={labelCls}>Consultant</label>
        <select
          id="analytics-consultant"
          defaultValue={consultantId}
          className={inputCls}
          onChange={e => push('consultantId', e.target.value)}
        >
          <option value="">All consultants</option>
          {consultants.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StageBarChart — plain horizontal bars, no external library
// ---------------------------------------------------------------------------

function StageBarChart({ stageCounts }: { stageCounts: AnalyticsData['stageCounts'] }) {
  const max = Math.max(...stageCounts.map(s => s.count), 1)  // avoid /0

  return (
    <section aria-labelledby="bar-chart-heading">
      <h2
        id="bar-chart-heading"
        className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]"
      >
        Leads by stage — current snapshot
      </h2>

      <div
        role="list"
        aria-label="Lead counts by pipeline stage"
        className="space-y-3"
      >
        {stageCounts.map(s => {
          const pct = Math.round((s.count / max) * 100)
          return (
            <div
              key={s.stage}
              role="listitem"
              className="grid items-center gap-3"
              style={{ gridTemplateColumns: '10rem 1fr 2.5rem' }}
            >
              {/* Stage label */}
              <span
                className="truncate text-sm text-[var(--text)]"
                title={s.label}
              >
                {s.label}
              </span>

              {/* Bar track */}
              <div
                className="h-5 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--background)] border border-[var(--border)]"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-[var(--radius-sm)] bg-[var(--accent)] transition-all"
                  style={{ width: s.count === 0 ? '0%' : `${Math.max(pct, 2)}%` }}
                />
              </div>

              {/* Count */}
              <span
                className="text-right text-sm font-medium tabular-nums text-[var(--text)]"
                aria-label={`${s.count} lead${s.count === 1 ? '' : 's'}`}
              >
                {s.count}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// ConversionStat
// ---------------------------------------------------------------------------

function ConversionStat({
  enrolledCount,
  totalCreated,
  conversionRate,
}: {
  enrolledCount:  number
  totalCreated:   number
  conversionRate: number
}) {
  const pct = Math.round(conversionRate * 100)

  return (
    <section
      aria-labelledby="conversion-heading"
      className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-6 py-5"
    >
      <h2
        id="conversion-heading"
        className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]"
      >
        Overall conversion
      </h2>
      <p className="text-4xl font-semibold tabular-nums text-[var(--accent)]">
        {totalCreated === 0 ? '—' : `${pct}%`}
      </p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        {totalCreated === 0
          ? 'No leads created in this date range.'
          : `${enrolledCount} enrolled out of ${totalCreated} leads created in the selected range.`}
      </p>
    </section>
  )
}

// ---------------------------------------------------------------------------
// AnalyticsClient — main export
// ---------------------------------------------------------------------------

export function AnalyticsClient({
  data,
  from,
  to,
  consultantId,
}: {
  data:         AnalyticsData
  from:         string
  to:           string
  consultantId: string
}) {
  return (
    <div className="space-y-8">
      {/* Filters */}
      <FilterBar
        consultants={data.consultants}
        from={from}
        to={to}
        consultantId={consultantId}
      />

      {/* Conversion stat */}
      <ConversionStat
        enrolledCount={data.enrolledCount}
        totalCreated={data.totalCreated}
        conversionRate={data.conversionRate}
      />

      {/* Bar chart */}
      <StageBarChart stageCounts={data.stageCounts} />
    </div>
  )
}
