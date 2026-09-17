'use client'

/**
 * useLeadsRealtime
 *
 * Subscribes to postgres_changes on the `leads` table for a given filter.
 * The caller supplies an `onLeadChange` callback that receives a typed
 * RealtimePostgresChangesPayload and decides how to update its own state.
 *
 * Usage patterns:
 *   // Consultant — filtered to their own leads
 *   useLeadsRealtime({ filter: `consultant_id=eq.${consultantId}` }, handler)
 *
 *   // Student — filtered to a single lead
 *   useLeadsRealtime({ filter: `id=eq.${leadId}` }, handler)
 *
 *   // Admin — no filter (receives all leads)
 *   useLeadsRealtime({}, handler)
 *
 * The Supabase client instance is created once per hook invocation and
 * stored in a ref so the channel is not re-created on every render.
 *
 * Cleanup: the channel is removed when the component unmounts or when
 * `filter` / `channelSuffix` changes.
 *
 * Returns: connection status ('connected' | 'reconnecting' | 'error')
 */

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Lead } from '@/lib/supabase/types'

export type LeadChangePayload = RealtimePostgresChangesPayload<Partial<Lead>>
export type RealtimeSubscriptionStatus = 'connected' | 'reconnecting' | 'error'

interface UseLeadsRealtimeOptions {
  /** Supabase filter string, e.g. `consultant_id=eq.abc123`.  Omit for all rows. */
  filter?: string
  /** Appended to the channel name to make it unique per consumer. */
  channelSuffix?: string
  /** Disable subscription — useful when the caller has no ID yet. */
  enabled?: boolean
}

export function useLeadsRealtime(
  options: UseLeadsRealtimeOptions,
  onLeadChange: (payload: LeadChangePayload) => void,
): RealtimeSubscriptionStatus {
  const { filter, channelSuffix = 'default', enabled = true } = options
  const [status, setStatus] = useState<RealtimeSubscriptionStatus>('connected')

  // Stable ref for the callback — avoids re-subscribing when the handler
  // identity changes between renders (common with inline arrow functions).
  const handlerRef = useRef(onLeadChange)
  useEffect(() => { handlerRef.current = onLeadChange })

  const supabase = useRef(createClient())

  useEffect(() => {
    if (!enabled) return

    const channelName = filter
      ? `leads-${channelSuffix}-${filter}`
      : `leads-${channelSuffix}-all`

    const channelConfig = filter
      ? { event: '*' as const, schema: 'public' as const, table: 'leads', filter }
      : { event: '*' as const, schema: 'public' as const, table: 'leads' }

    const channel = supabase.current
      .channel(channelName)
      .on(
        'postgres_changes',
        channelConfig,
        (payload) => {
          setStatus('connected')
          handlerRef.current(payload as LeadChangePayload)
        },
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === 'CHANNEL_ERROR') {
          console.error('[useLeadsRealtime] channel error', channelName)
          setStatus('error')
        } else if (subscriptionStatus === 'SUBSCRIBED') {
          setStatus('connected')
        } else if (subscriptionStatus === 'TIMED_OUT') {
          setStatus('reconnecting')
        }
      })

    return () => {
      supabase.current.removeChannel(channel)
    }
  // Re-subscribe only when structural options change, not the callback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, filter, channelSuffix])

  return status
}


/**
 * useDocumentsRealtime
 *
 * Same pattern as useLeadsRealtime but for the `documents` table.
 * Used by all dashboards and the lead-detail drawer.
 */

import type { Document } from '@/lib/supabase/types'

export type DocumentChangePayload = RealtimePostgresChangesPayload<Partial<Document>>

interface UseDocumentsRealtimeOptions {
  filter?: string
  channelSuffix?: string
  enabled?: boolean
}

export function useDocumentsRealtime(
  options: UseDocumentsRealtimeOptions,
  onDocumentChange: (payload: DocumentChangePayload) => void,
): RealtimeSubscriptionStatus {
  const { filter, channelSuffix = 'default', enabled = true } = options
  const [status, setStatus] = useState<RealtimeSubscriptionStatus>('connected')

  const handlerRef = useRef(onDocumentChange)
  useEffect(() => { handlerRef.current = onDocumentChange })

  const supabase = useRef(createClient())

  useEffect(() => {
    if (!enabled) return

    const channelName = filter
      ? `documents-${channelSuffix}-${filter}`
      : `documents-${channelSuffix}-all`

    const channelConfig = filter
      ? { event: '*' as const, schema: 'public' as const, table: 'documents', filter }
      : { event: '*' as const, schema: 'public' as const, table: 'documents' }

    const channel = supabase.current
      .channel(channelName)
      .on(
        'postgres_changes',
        channelConfig,
        (payload) => {
          setStatus('connected')
          handlerRef.current(payload as DocumentChangePayload)
        },
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === 'CHANNEL_ERROR') {
          console.error('[useDocumentsRealtime] channel error', channelName)
          setStatus('error')
        } else if (subscriptionStatus === 'SUBSCRIBED') {
          setStatus('connected')
        } else if (subscriptionStatus === 'TIMED_OUT') {
          setStatus('reconnecting')
        }
      })

    return () => {
      supabase.current.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, filter, channelSuffix])

  return status
}


/**
 * useActivityLogsRealtime
 *
 * Subscribes to the `activity_logs` table filtered by a single lead_id.
 * Used only in the Lead Detail drawer — never on the student dashboard
 * (per spec: "student status page subscribes to leads and documents only,
 *  never activity_logs").
 */

import type { ActivityLog } from '@/lib/supabase/types'

export type ActivityLogChangePayload = RealtimePostgresChangesPayload<Partial<ActivityLog>>

interface UseActivityLogsRealtimeOptions {
  leadId: string | null
  enabled?: boolean
}

export function useActivityLogsRealtime(
  options: UseActivityLogsRealtimeOptions,
  onActivityChange: (payload: ActivityLogChangePayload) => void,
): RealtimeSubscriptionStatus {
  const { leadId, enabled = true } = options
  const [status, setStatus] = useState<RealtimeSubscriptionStatus>('connected')

  const handlerRef = useRef(onActivityChange)
  useEffect(() => { handlerRef.current = onActivityChange })

  const supabase = useRef(createClient())

  useEffect(() => {
    if (!enabled || !leadId) return

    const channelName = `activity-logs-lead-${leadId}`
    const channel = supabase.current
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'activity_logs',
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          setStatus('connected')
          handlerRef.current(payload as ActivityLogChangePayload)
        },
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === 'CHANNEL_ERROR') {
          console.error('[useActivityLogsRealtime] channel error', channelName)
          setStatus('error')
        } else if (subscriptionStatus === 'SUBSCRIBED') {
          setStatus('connected')
        } else if (subscriptionStatus === 'TIMED_OUT') {
          setStatus('reconnecting')
        }
      })

    return () => {
      supabase.current.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, leadId])

  return status
}


/**
 * useCommunicationLogsRealtime
 *
 * Subscribes to the `communication_logs` table filtered by a single lead_id.
 * Used only in the Lead Detail drawer (same caveat as activity_logs above).
 */

import type { CommunicationLog } from '@/lib/supabase/types'

export type CommunicationLogChangePayload = RealtimePostgresChangesPayload<Partial<CommunicationLog>>

interface UseCommunicationLogsRealtimeOptions {
  leadId: string | null
  enabled?: boolean
}

export function useCommunicationLogsRealtime(
  options: UseCommunicationLogsRealtimeOptions,
  onCommChange: (payload: CommunicationLogChangePayload) => void,
): RealtimeSubscriptionStatus {
  const { leadId, enabled = true } = options
  const [status, setStatus] = useState<RealtimeSubscriptionStatus>('connected')

  const handlerRef = useRef(onCommChange)
  useEffect(() => { handlerRef.current = onCommChange })

  const supabase = useRef(createClient())

  useEffect(() => {
    if (!enabled || !leadId) return

    const channelName = `comm-logs-lead-${leadId}`
    const channel = supabase.current
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'communication_logs',
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          setStatus('connected')
          handlerRef.current(payload as CommunicationLogChangePayload)
        },
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === 'CHANNEL_ERROR') {
          console.error('[useCommunicationLogsRealtime] channel error', channelName)
          setStatus('error')
        } else if (subscriptionStatus === 'SUBSCRIBED') {
          setStatus('connected')
        } else if (subscriptionStatus === 'TIMED_OUT') {
          setStatus('reconnecting')
        }
      })

    return () => {
      supabase.current.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, leadId])

  return status
}
