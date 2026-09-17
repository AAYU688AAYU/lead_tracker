'use client'

/**
 * useCRMRealtime
 *
 * Primary hook for accessing consolidated realtime state in consultant dashboards.
 *
 * Features:
 *   - Single source of truth: connects to RealtimeProvider context
 *   - No new connections: leverages provider's single WebSocket
 *   - Consultant-scoped: automatically filtered to current consultant
 *   - Stall-aware: tracks which leads are in stalled status
 *   - Connection status: returns connectivity info for offline indicators
 *
 * Design philosophy:
 *   - Replaces scattered useLeadsRealtime + useDocumentsRealtime calls
 *   - Consolidates N connections into 1 (cost savings, performance boost)
 *   - Provides familiar React hook API (easy migration from Phase 7)
 *   - Lazy evaluation: state updates trigger re-renders only when needed
 *
 * Usage patterns:
 *
 *   // Consultant dashboard (kanban board)
 *   const { leads, stalledLeadIds, isConnected } = useCRMRealtime()
 *
 *   // Show stalled leads differently
 *   const leadWithStatus = leads.map(lead => ({
 *     ...lead,
 *     isStalled: stalledLeadIds.has(lead.id),
 *   }))
 *
 *   // Show connection status
 *   if (!isConnected) {
 *     return <OfflineIndicator />
 *   }
 *
 * Migration guide (from Phase 7):
 *   Before:
 *     const status = useLeadsRealtime({ filter: `consultant_id=eq.${id}` }, handleChange)
 *     const [leads, setLeads] = useState([])
 *
 *   After:
 *     const { leads, isConnected } = useCRMRealtime()
 *     // No handler needed, state is already managed by provider
 */

import { useContext } from 'react'
import { RealtimeContext, type RealtimeContextValue } from '@/app/providers/realtime-provider'

/**
 * Access consolidated consultant realtime state
 * Must be used within <RealtimeProvider> (mounted at consultant layout)
 *
 * @throws Error if provider not found
 * @returns Realtime state: leads, stalledLeadIds, connectionStatus, isConnected
 */
export function useCRMRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext)

  if (!context) {
    throw new Error(
      'useCRMRealtime must be used within <RealtimeProvider>. ' +
        'Ensure RealtimeProvider is mounted at the consultant layout level.'
    )
  }

  return context
}

/**
 * Typed variant: get realtime data with explicit type safety
 * Useful for components that want stricter type checking
 */
export function useCRMRealtimeTyped() {
  const { leads, stalledLeadIds, connectionStatus, isConnected, lastSyncTime } = useCRMRealtime()

  return {
    leads,
    stalledLeadIds,
    connectionStatus,
    isConnected,
    lastSyncTime,
  }
}

/**
 * Helper: check if a specific lead is stalled
 */
export function useIsLeadStalled(leadId: string | null): boolean {
  const { stalledLeadIds } = useCRMRealtime()
  return leadId ? stalledLeadIds.has(leadId) : false
}

/**
 * Helper: get stalled leads only
 */
export function useStalledLeads() {
  const { leads, stalledLeadIds } = useCRMRealtime()
  return leads.filter(lead => stalledLeadIds.has(lead.id))
}

/**
 * Helper: get active (non-stalled) leads
 */
export function useActiveLeads() {
  const { leads, stalledLeadIds } = useCRMRealtime()
  return leads.filter(lead => !stalledLeadIds.has(lead.id))
}

/**
 * Helper: get connection status as human-readable string
 */
export function useConnectionStatusLabel(): string {
  const { connectionStatus } = useCRMRealtime()

  switch (connectionStatus) {
    case 'connected':
      return 'Connected'
    case 'reconnecting':
      return 'Reconnecting...'
    case 'error':
      return 'Offline'
    default:
      return 'Unknown'
  }
}

/**
 * Helper: get icon for connection status (emoji or className)
 */
export function useConnectionStatusIcon(): {
  emoji: string
  className: string
  label: string
} {
  const { connectionStatus } = useCRMRealtime()

  switch (connectionStatus) {
    case 'connected':
      return {
        emoji: '🟢',
        className: 'text-emerald-600',
        label: 'Connected',
      }
    case 'reconnecting':
      return {
        emoji: '🟡',
        className: 'text-yellow-600 animate-pulse',
        label: 'Reconnecting',
      }
    case 'error':
      return {
        emoji: '🔴',
        className: 'text-destructive',
        label: 'Offline',
      }
    default:
      return {
        emoji: '⚪',
        className: 'text-gray-400',
        label: 'Unknown',
      }
  }
}
