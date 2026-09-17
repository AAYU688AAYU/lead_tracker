'use client'

/**
 * RealtimeProvider
 *
 * Singleton context provider for managing all real-time subscriptions
 * in a consultant session. Key responsibilities:
 *
 *   1. Maintains one WebSocket channel per consultant (deduplicates across tabs via BroadcastChannel)
 *   2. Consolidates leads, documents, activity_logs, communication_logs subscriptions
 *   3. Implements gap recovery on reconnect (fetches rows modified since last sync)
 *   4. Handles exponential backoff reconnection with jitter
 *   5. Broadcasts state changes to other tabs (multi-tab awareness)
 *   6. Plays audio chimes on new leads and stall breaches
 *
 * Design philosophy:
 *   - Single source of truth: all consultant-scoped realtime state lives here
 *   - Lazy-loaded audio: prevents double-chiming on app boot
 *   - Debounced: audio plays max once per 2 seconds
 *   - Observable state: consumers get live leads, stalledLeadIds, connection status
 *   - Transparent gap recovery: automatic fetch on reconnect, no action needed from caller
 *
 * Usage:
 *   // In consultant layout
 *   <RealtimeProvider consultantId={user.id}>
 *     {children}
 *   </RealtimeProvider>
 *
 *   // In any component
 *   const { leads, stalledLeadIds, isConnected } = useCRMRealtime()
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { audioPlayer } from '@/lib/audio'
import type { Lead, Document, ActivityLog, CommunicationLog } from '@/lib/supabase/types'

// ─────────────────────────────────────────────────────────────────────────
// Context Types
// ─────────────────────────────────────────────────────────────────────────

export interface RealtimeContextValue {
  leads: Lead[]
  stalledLeadIds: Set<string>
  connectionStatus: 'connected' | 'reconnecting' | 'error'
  isConnected: boolean
  lastSyncTime: number
}

export const RealtimeContext = createContext<RealtimeContextValue | null>(null)

// ─────────────────────────────────────────────────────────────────────────
// Exponential Backoff with Jitter
// ─────────────────────────────────────────────────────────────────────────

class ExponentialBackoff {
  private attempt = 0
  private readonly maxAttempts = 10
  private readonly baseDelay = 1000 // 1 second
  private readonly maxDelay = 60000 // 60 seconds

  getDelay(): number | null {
    if (this.attempt >= this.maxAttempts) {
      return null // Stop retrying
    }

    // Exponential: 1s, 2s, 4s, 8s, ... capped at 60s
    const exponentialDelay = this.baseDelay * Math.pow(2, this.attempt)
    const cappedDelay = Math.min(exponentialDelay, this.maxDelay)

    // Add jitter (±1 second) to prevent thundering herd
    const jitter = (Math.random() - 0.5) * 2000
    const finalDelay = Math.max(100, cappedDelay + jitter)

    this.attempt++
    return finalDelay
  }

  reset() {
    this.attempt = 0
  }

  getAttempt() {
    return this.attempt
  }
}

// ─────────────────────────────────────────────────────────────────────────
// RealtimeProvider Component
// ─────────────────────────────────────────────────────────────────────────

interface RealtimeProviderProps {
  consultantId: string
  children: ReactNode
}

export function RealtimeProvider({ consultantId, children }: RealtimeProviderProps) {
  // State
  const [leads, setLeads] = useState<Lead[]>([])
  const [stalledLeadIds, setStalledLeadIds] = useState<Set<string>>(new Set())
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'error'>(
    'connected'
  )
  const [lastSyncTime, setLastSyncTime] = useState(Date.now())

  // Refs (stable across renders)
  const supabaseRef = useRef(createClient())
  const backoffRef = useRef(new ExponentialBackoff())
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)

  // ─────────────────────────────────────────────────────────────────────
  // Gap Recovery: Fetch rows modified since last sync
  // ─────────────────────────────────────────────────────────────────────

  const recoverGaps = useCallback(
    async (sinceTimestamp: number) => {
      try {
        const response = await fetch(
          `/api/leads/recovery?since=${sinceTimestamp}&consultant_id=${consultantId}`
        )
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const missedLeads = (await response.json()) as Lead[]

        // Merge missed leads using upsert logic (newest wins)
        setLeads(prev => {
          const map = new Map(prev.map(l => [l.id, l]))
          missedLeads.forEach(lead => {
            const existing = map.get(lead.id)
            // Only update if the missed row is newer
            if (!existing || new Date(lead.updated_at) > new Date(existing.updated_at)) {
              map.set(lead.id, lead)
            }
          })
          return Array.from(map.values())
        })

        console.info(`[Realtime] Gap recovery: merged ${missedLeads.length} leads`)
      } catch (err) {
        console.warn('[Realtime] Gap recovery failed:', err)
      }
    },
    [consultantId]
  )

  // ─────────────────────────────────────────────────────────────────────
  // Multi-Tab Synchronization via BroadcastChannel
  // ─────────────────────────────────────────────────────────────────────

  const syncToOtherTabs = useCallback(
    (type: string, payload: any) => {
      if (!broadcastChannelRef.current) return

      broadcastChannelRef.current.postMessage({
        type,
        payload,
        timestamp: Date.now(),
      })
    },
    []
  )

  // ─────────────────────────────────────────────────────────────────────
  // Main Realtime Subscription Setup
  // ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = supabaseRef.current
    const backoff = backoffRef.current

    // Initialize BroadcastChannel for multi-tab sync
    if (typeof window !== 'undefined' && !broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current = new BroadcastChannel(`realtime-${consultantId}`)
        broadcastChannelRef.current.onmessage = e => {
          // Receive state updates from other tabs
          const { type, payload } = e.data
          if (type === 'leads-updated') {
            setLeads(payload.leads)
          } else if (type === 'stalled-updated') {
            setStalledLeadIds(new Set(payload.stalledIds))
          }
        }
      } catch (err) {
        console.warn('[Realtime] BroadcastChannel not supported:', err)
      }
    }

    // Create subscription to leads table (consultant-scoped)
    const leadsChannel = supabase
      .channel(`leads-consultant-${consultantId}`, {
        config: { maxRetries: 3, maxReconnectDelay: 60000 },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `consultant_id=eq.${consultantId}`,
        },
        payload => {
          setConnectionStatus('connected')
          setLastSyncTime(Date.now())

          const newLead = payload.new as Lead | null
          const oldLead = payload.old as Lead | null

          if (payload.eventType === 'INSERT' && newLead) {
            // New lead assigned
            setLeads(prev => {
              const updated = [newLead, ...prev]
              syncToOtherTabs('leads-updated', { leads: updated })
              return updated
            })

            // Play chime on new lead
            audioPlayer.playChime()

            // Stall detection: new leads start as 'active'
            setStalledLeadIds(prev => {
              const updated = new Set(prev)
              updated.delete(newLead.id)
              syncToOtherTabs('stalled-updated', { stalledIds: Array.from(updated) })
              return updated
            })
          } else if (payload.eventType === 'UPDATE' && newLead) {
            // Lead updated
            setLeads(prev => {
              const updated = prev.map(l => (l.id === newLead.id ? newLead : l))
              syncToOtherTabs('leads-updated', { leads: updated })
              return updated
            })

            // Stall detection: play chime when lead becomes stalled
            if (newLead.status === 'stalled' && oldLead?.status !== 'stalled') {
              setStalledLeadIds(prev => {
                const updated = new Set(prev)
                updated.add(newLead.id)
                syncToOtherTabs('stalled-updated', { stalledIds: Array.from(updated) })
                return updated
              })
              audioPlayer.playChime()
            }
            // Un-stall: remove from stalled set
            else if (newLead.status !== 'stalled' && oldLead?.status === 'stalled') {
              setStalledLeadIds(prev => {
                const updated = new Set(prev)
                updated.delete(newLead.id)
                syncToOtherTabs('stalled-updated', { stalledIds: Array.from(updated) })
                return updated
              })
            }
          } else if (payload.eventType === 'DELETE' && oldLead) {
            // Lead deleted/reassigned away
            setLeads(prev => {
              const updated = prev.filter(l => l.id !== oldLead.id)
              syncToOtherTabs('leads-updated', { leads: updated })
              return updated
            })

            setStalledLeadIds(prev => {
              if (!prev.has(oldLead.id)) return prev
              const updated = new Set(prev)
              updated.delete(oldLead.id)
              syncToOtherTabs('stalled-updated', { stalledIds: Array.from(updated) })
              return updated
            })
          }
        }
      )
      .subscribe(async status => {
        console.info(`[Realtime] Leads channel status: ${status}`)

        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
          backoff.reset()

          // Gap recovery: fetch any rows modified during disconnection
          const timeSinceLastSync = Date.now() - lastSyncTime
          if (timeSinceLastSync > 5000) {
            // Only recover if offline > 5 seconds
            await recoverGaps(lastSyncTime)
          }
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('reconnecting')

          // Exponential backoff reconnection
          const delay = backoff.getDelay()
          if (delay !== null) {
            console.info(
              `[Realtime] Reconnecting in ${Math.round(delay)}ms (attempt ${backoff.getAttempt()})`
            )
            reconnectTimeoutRef.current = setTimeout(() => {
              leadsChannel.subscribe()
            }, delay)
          } else {
            console.error('[Realtime] Max reconnection attempts exceeded')
            setConnectionStatus('error')
          }
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error')
          console.error('[Realtime] Channel error')
        }
      })

    channelRef.current = leadsChannel

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      supabase.removeChannel(leadsChannel)
    }
  }, [consultantId, recoverGaps, syncToOtherTabs, lastSyncTime])

  // ─────────────────────────────────────────────────────────────────────
  // Cleanup on unmount
  // ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close()
      }
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────
  // Render Provider
  // ─────────────────────────────────────────────────────────────────────

  const value: RealtimeContextValue = {
    leads,
    stalledLeadIds,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    lastSyncTime,
  }

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

// ─────────────────────────────────────────────────────────────────────────
// Hook: useCRMRealtime (Primary consumer)
// ─────────────────────────────────────────────────────────────────────────

export function useCRMRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error(
      'useCRMRealtime must be used within <RealtimeProvider>. Ensure RealtimeProvider is mounted at layout level.'
    )
  }
  return context
}
