'use client'

/**
 * useLiveDays
 *
 * Calculates and live-updates the number of days a lead has been in the current stage.
 * Ticks every minute to show real-time progression without constant re-renders.
 *
 * Usage:
 *   const days = useLiveDays(lead.stage_entered_at)
 *   // Returns integer days, updates every 60 seconds
 */

import { useState, useEffect, useMemo } from 'react'

export function useLiveDays(stageEnteredAt: string) {
  const [now, setNow] = useState(() => Date.now())

  // Tick every 60 seconds (1 minute)
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  return useMemo(() => {
    const ms = now - Date.parse(stageEnteredAt)
    return Math.max(0, Math.floor(ms / 86_400_000)) // ms to days
  }, [now, stageEnteredAt])
}
