'use client'

/**
 * PortfolioTable — TASK #5
 *
 * Displays all leads for a consultant with sortable/filterable columns:
 * - Student name
 * - Stage
 * - Days in stage
 * - Stall status
 * - Target country
 * - Actions (click to open case view)
 */

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { PortfolioLead } from './actions'

interface PortfolioTableProps {
  leads: PortfolioLead[]
}

type SortKey = 'student_name' | 'stage' | 'days_in_stage' | 'status'
type SortOrder = 'asc' | 'desc'

export function PortfolioTable({ leads }: PortfolioTableProps) {
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [stallFilter, setStallFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('days_in_stage')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [search, setSearch] = useState('')

  // Get unique stages
  const stages = useMemo(
    () => [...new Set(leads.map(l => ({ stage: l.stage, label: l.stage_label })))],
    [leads]
  )

  // Filter and sort
  const filtered = useMemo(() => {
    let result = [...leads]

    // Stage filter
    if (stageFilter !== 'all') {
      result = result.filter(l => l.stage === stageFilter)
    }

    // Stall filter
    if (stallFilter === 'stalled') {
      result = result.filter(l => l.status === 'stalled')
    } else if (stallFilter === 'not-stalled') {
      result = result.filter(l => l.status !== 'stalled')
    }

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        l.reference_code.toLowerCase().includes(q) ||
        l.student_name.toLowerCase().includes(q)
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      if (sortKey === 'student_name') {
        aVal = a.student_name
        bVal = b.student_name
      } else if (sortKey === 'stage') {
        aVal = a.stage_label
        bVal = b.stage_label
      } else if (sortKey === 'days_in_stage') {
        aVal = a.days_in_stage
        bVal = b.days_in_stage
      } else if (sortKey === 'status') {
        aVal = a.status
        bVal = b.status
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }

      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      return sortOrder === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    })

    return result
  }, [leads, stageFilter, stallFilter, search, sortKey, sortOrder])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const SortIndicator = ({ isActive }: { isActive: boolean }) => (
    <span className={isActive ? 'text-[var(--accent)]' : 'text-transparent'}>
      {sortOrder === 'asc' ? '↑' : '↓'}
    </span>
  )

  if (leads.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">No leads in portfolio.</p>
      </div>
    )
  }

  return (
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
          {stages.map(s => (
            <option key={s.stage} value={s.stage}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Stall filter */}
        <select
          value={stallFilter}
          onChange={e => setStallFilter(e.target.value)}
          className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-2 py-1.5 text-xs text-[var(--text)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
          aria-label="Filter by stall status"
        >
          <option value="all">All statuses</option>
          <option value="stalled">Stalled</option>
          <option value="not-stalled">Not stalled</option>
        </select>

        <span className="ml-auto text-xs text-[var(--text-muted)]">
          {filtered.length} of {leads.length}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">No leads match the current filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <th
                  className="px-4 py-3 cursor-pointer hover:text-[var(--text)]"
                  onClick={() => handleSort('student_name')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center justify-between gap-2">
                    Student
                    <SortIndicator isActive={sortKey === 'student_name'} />
                  </div>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-[var(--text)]"
                  onClick={() => handleSort('stage')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center justify-between gap-2">
                    Stage
                    <SortIndicator isActive={sortKey === 'stage'} />
                  </div>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-[var(--text)] text-right"
                  onClick={() => handleSort('days_in_stage')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center justify-end gap-2">
                    Days in stage
                    <SortIndicator isActive={sortKey === 'days_in_stage'} />
                  </div>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-[var(--text)]"
                  onClick={() => handleSort('status')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center justify-between gap-2">
                    Status
                    <SortIndicator isActive={sortKey === 'status'} />
                  </div>
                </th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map(lead => (
                <tr key={lead.id} className="hover:bg-[var(--background)]">
                  {/* Student */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--text)]">{lead.student_name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{lead.reference_code}</p>
                  </td>

                  {/* Stage */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-[var(--text)]">{lead.stage_label}</span>
                  </td>

                  {/* Days in stage */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium tabular-nums text-[var(--text)]">
                      {lead.days_in_stage}d
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-medium capitalize ${
                        lead.status === 'stalled'
                          ? 'bg-[var(--background)] text-[var(--stalled)] border border-[var(--stalled)]'
                          : lead.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : lead.status === 'completed'
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--background)] text-[var(--text-muted)] border border-[var(--border)]'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>

                  {/* Country */}
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {lead.target_country ?? '—'}
                  </td>

                  {/* Open case */}
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/admin/consultants/${lead.id}`}
                      className="text-xs text-[var(--accent)] hover:underline focus-visible:outline-none"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
