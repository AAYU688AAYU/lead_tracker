'use client'

/**
 * useStallCountdown
 *
 * Calculates and updates in real-time how soon a lead will become stalled.
 * Returns:
 *   - timeRemaining: milliseconds until stall (null if already stalled)
 *   - isWarning: true if within 1 hour of stalling
 *   - displayText: human-readable countdown ("47m until stall", "stalled now", etc.)
 *
 * Usage:
 *   const { displayText, isWarning } = useStallCountdown(lead, stageThreshold)
 *   // Re-renders every 30s to update countdown
 */

import { useState, useEffect, useMemo } from 'react'

interface UseStallCountdownOptions {
  stage_entered_at: string
  status: string
  stall_threshold_hours?: number
}

export function useStallCountdown(
  lead: UseStallCountdownOptions,
  stageThresholdHours?: number,
) {
  const [now, setNow] = useState(() => Date.now())

  const threshold = stageThresholdHours ?? 48 // Default 48h if not provided

  const timeInStageMs = now - Date.parse(lead.stage_entered_at)
  const thresholdMs = threshold * 3_600_000 // hours to ms
  const isStalled = lead.status === 'stalled'
  const timeRemaining = Math.max(0, thresholdMs - timeInStageMs)

  // Tick every 30 seconds to update countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(interval)
  }, [])

  return useMemo(() => {
    if (isStalled) {
      return {
        timeRemaining: null,
        isWarning: true,
        displayText: 'Stalled',
      }
    }

    const mins = Math.floor(timeRemaining / 60_000)
    const hours = Math.floor(timeRemaining / 3_600_000)

    let displayText: string
    let isWarning = false

    if (hours === 0) {
      displayText = mins === 0 ? 'Stalling now' : `${mins}m until stall`
      isWarning = true
    } else if (hours < 24) {
      displayText = `${hours}h until stall`
      isWarning = hours <= 1
    } else {
      const days = Math.floor(hours / 24)
      displayText = `${days}d until stall`
    }

    return {
      timeRemaining,
      isWarning,
      displayText,
    }
  }, [timeRemaining, isStalled])
}
