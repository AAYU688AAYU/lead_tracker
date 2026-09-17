'use client'

/**
 * ConnectionStatus
 *
 * Displays real-time connection status indicator in the header.
 * Shows:
 *   🟢 Connected (live)
 *   🟡 Reconnecting (spinner)
 *   🔴 Disconnected (red, with refresh prompt)
 */

import { useRealtimeStatus } from '@/lib/hooks/use-realtime-status'

export function ConnectionStatus() {
  const { status, isConnected } = useRealtimeStatus()

  if (status === 'connected') {
    return (
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-muted)]">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse"
          aria-hidden
        />
        <span className="hidden sm:inline">Live</span>
      </div>
    )
  }

  if (status === 'reconnecting') {
    return (
      <div
        className="flex items-center gap-1.5 text-[10px] font-medium text-amber-600"
        role="status"
        aria-label="Reconnecting to server"
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-amber-600 animate-spin"
          aria-hidden
        />
        <span className="hidden sm:inline">Reconnecting</span>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--destructive)]"
      role="alert"
      aria-label="Disconnected from server"
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--destructive)]"
        aria-hidden
      />
      <span className="hidden sm:inline">Offline</span>
    </div>
  )
}
