'use client'

/**
 * OperationalLine — TASK #1 + TASK #4
 *
 * Displays: "38 active engagements · 5 stalled · 2 unassigned · Last evaluated 42s ago"
 * 
 * Shows operational context at a glance + data freshness indicator.
 * Auto-updates timestamp every second for recency feedback.
 * TASK #4: Subscribes to Realtime leads changes to update counts live.
 */

import { useEffect, useState, useCallback } from 'react'
import { useLeadsRealtime } from '@/lib/hooks/use-leads-realtime'
import type { LeadChangePayload } from '@/lib/hooks/use-leads-realtime'

interface OperationalLineProps {
  totalActive: number
  totalStalled: number
  totalUnassigned: number
  evaluatedAt: Date
}

export function OperationalLine({
  totalActive: initialActive,
  totalStalled: initialStalled,
  totalUnassigned: initialUnassigned,
  evaluatedAt,
}: OperationalLineProps) {
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [totalActive, setTotalActive] = useState(initialActive)
  const [totalStalled, setTotalStalled] = useState(initialStalled)
  const [totalUnassigned, setTotalUnassigned] = useState(initialUnassigned)

  // Update "evaluated X seconds ago" every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const diff = Math.floor((now.getTime() - evaluatedAt.getTime()) / 1000)
      setSecondsAgo(diff)
    }, 1000)

    return () => clearInterval(interval)
  }, [evaluatedAt])

  // TASK #4: Subscribe to lead changes for live count updates
  useLeadsRealtime(
    { channelSuffix: 'operational-line' },
    useCallback((payload: LeadChangePayload) => {
      const { new: newLead, old: oldLead } = payload
      const oldStatus = (oldLead as { status?: string })?.status
      const newStatus = (newLead as { status?: string })?.status
      const oldConsultantId = (oldLead as { consultant_id?: string })?.consultant_id
      const newConsultantId = (newLead as { consultant_id?: string })?.consultant_id

      // Handle status changes
      if (oldStatus !== newStatus) {
        if (oldStatus === 'active') setTotalActive(p => Math.max(0, p - 1))
        if (newStatus === 'active') setTotalActive(p => p + 1)

        if (oldStatus === 'stalled') setTotalStalled(p => Math.max(0, p - 1))
        if (newStatus === 'stalled') setTotalStalled(p => p + 1)
      }

      // Handle assignment changes (consultant_id)
      if (oldConsultantId !== newConsultantId) {
        if (!oldConsultantId && newConsultantId) {
          setTotalUnassigned(p => Math.max(0, p - 1))
        } else if (oldConsultantId && !newConsultantId) {
          setTotalUnassigned(p => p + 1)
        }
      }
    }, [])
  )

  // Format time indicator
  const formatTime = (secs: number): string => {
    if (secs < 60) return `${secs}s`
    if (secs < 3600) return `${Math.floor(secs / 60)}m`
    return `${Math.floor(secs / 3600)}h`
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-6 py-4">
      <div className="flex items-baseline justify-between gap-4">
        {/* ── Main line ──────────────────────────────────────────── */}
        <p className="text-sm text-[var(--text)]">
          <span className="font-medium">{totalActive}</span>
          <span className="text-[var(--text-muted)]"> active engagements · </span>
          <span className={totalStalled > 0 ? 'font-medium text-[var(--stalled)]' : 'font-medium'}>
            {totalStalled}
          </span>
          <span className="text-[var(--text-muted)]"> stalled · </span>
          <span className={totalUnassigned > 0 ? 'font-medium text-[var(--stalled)]' : 'font-medium'}>
            {totalUnassigned}
          </span>
          <span className="text-[var(--text-muted)]"> unassigned</span>
        </p>

        {/* ── Timestamp ──────────────────────────────────────────– */}
        <p className="whitespace-nowrap text-xs text-[var(--text-muted)]">
          Last evaluated {formatTime(secondsAgo)} ago
        </p>
      </div>
    </div>
  )
}
