'use client'

/**
 * useNotifications
 *
 * Comprehensive notification management hook for consultants.
 *
 * Features:
 *   1. Real-time unread count tracking (via Realtime subscription)
 *   2. Paginated notification fetching (for notification center)
 *   3. Mark as read / Mark all read actions
 *   4. Notification filtering by type
 *   5. Connection status monitoring
 *
 * Design philosophy:
 *   - Extends Phase 7's useNotificationsRealtime with full management capabilities
 *   - Combines realtime updates (for badge) + server-side pagination (for list)
 *   - Optimistic updates for instant UX feedback
 *   - Revalidation on server actions to keep data fresh
 *
 * Scenarios handled:
 *   1. New notification arrives → badge increments immediately (realtime)
 *   2. User opens notification center → fetches paginated history (server)
 *   3. User marks notification read → optimistic update + server revalidation
 *   4. User marks all read → bulk action with feedback
 *   5. Connection lost → badge shows last known count
 *   6. App refocused → revalidates unread count
 *
 * Usage:
 *   const {
 *     notifications,
 *     unreadCount,
 *     isLoading,
 *     hasMore,
 *     markAsRead,
 *     markAllRead,
 *     fetchMore,
 *     connectionStatus,
 *   } = useNotifications(consultantId)
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Notification } from '@/lib/supabase/types'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'lead_assigned'
  | 'lead_stalled'
  | 'stall_resolved'
  | 'lead_reassigned'
  | 'stage_advanced'
  | 'admin_message'
  | 'document_reviewed'

export type NotificationFilterType = 'all' | NotificationType

export interface NotificationWithMetadata extends Notification {
  type: NotificationType
  lead_id?: string
}

export interface UseNotificationsOptions {
  consultantId: string | null
  enabled?: boolean
  pageSize?: number
}

export interface UseNotificationsReturn {
  // List data
  notifications: NotificationWithMetadata[]
  isLoading: boolean
  hasMore: boolean

  // Unread count
  unreadCount: number

  // Actions
  markAsRead: (notificationId: string) => Promise<void>
  markAllRead: () => Promise<void>
  fetchMore: () => Promise<void>

  // Status
  connectionStatus: 'connected' | 'reconnecting' | 'error'
  isConnected: boolean

  // Current filter
  filter: NotificationFilterType
  setFilter: (filter: NotificationFilterType) => void
}

// ─────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────

export function useNotifications(
  options: UseNotificationsOptions
): UseNotificationsReturn {
  const { consultantId, enabled = true, pageSize = 15 } = options

  // State
  const [notifications, setNotifications] = useState<NotificationWithMetadata[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'error'>(
    'connected'
  )
  const [filter, setFilter] = useState<NotificationFilterType>('all')
  const [currentPage, setCurrentPage] = useState(0)

  // Refs
  const supabaseRef = useRef(createClient())
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)
  const pageOffsetRef = useRef(0)
  const hasMoreRef = useRef(true)

  // ─────────────────────────────────────────────────────────────────────
  // Real-time unread count subscription
  // ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !consultantId) return

    const supabase = supabaseRef.current

    // Subscribe to INSERT events only (unread count delta)
    const channel = supabase
      .channel(`notifications-${consultantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${consultantId}`,
        },
        (payload: RealtimePostgresChangesPayload<Partial<Notification>>) => {
          setConnectionStatus('connected')
          setUnreadCount(prev => prev + 1)

          // Prepend to notification list if already loaded
          const newNotif = payload.new as Notification
          setNotifications(prev => [
            {
              ...newNotif,
              type: (newNotif.type || 'admin_message') as NotificationType,
            },
            ...prev,
          ])
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('reconnecting')
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error')
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, consultantId])

  // ─────────────────────────────────────────────────────────────────────
  // Fetch paginated notifications from server
  // ─────────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(
    async (page: number = 0) => {
      if (!consultantId || !enabled) return

      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          consultant_id: consultantId,
          page: page.toString(),
          limit: pageSize.toString(),
          filter: filter === 'all' ? '' : filter,
        })

        const response = await fetch(`/api/notifications?${params.toString()}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const data = await response.json()
        const { notifications: newNotifs, unread_count, has_more } = data

        if (page === 0) {
          // First page: replace list
          setNotifications(newNotifs)
          setUnreadCount(unread_count)
        } else {
          // Subsequent pages: append to list
          setNotifications(prev => [...prev, ...newNotifs])
        }

        hasMoreRef.current = has_more
        pageOffsetRef.current = page
      } catch (err) {
        console.error('[useNotifications] Fetch failed:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [consultantId, enabled, pageSize, filter]
  )

  // Initial fetch
  useEffect(() => {
    if (enabled && consultantId) {
      fetchNotifications(0)
    }
  }, [enabled, consultantId, filter, fetchNotifications])

  // ─────────────────────────────────────────────────────────────────────
  // Mark as read
  // ─────────────────────────────────────────────────────────────────────

  const markAsRead = useCallback(
    async (notificationId: string) => {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))

      try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
          method: 'PATCH',
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
      } catch (err) {
        console.error('[useNotifications] Mark as read failed:', err)
        // Revert optimistic update
        setNotifications(prev =>
          prev.map(n => (n.id === notificationId ? { ...n, is_read: false } : n))
        )
        setUnreadCount(prev => prev + 1)
      }
    },
    []
  )

  // ─────────────────────────────────────────────────────────────────────
  // Mark all read
  // ─────────────────────────────────────────────────────────────────────

  const markAllRead = useCallback(async () => {
    if (!consultantId) return

    // Optimistic update
    const previousNotifs = notifications
    const previousUnreadCount = unreadCount
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)

    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultant_id: consultantId }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    } catch (err) {
      console.error('[useNotifications] Mark all read failed:', err)
      // Revert optimistic update
      setNotifications(previousNotifs)
      setUnreadCount(previousUnreadCount)
    }
  }, [consultantId, notifications, unreadCount])

  // ─────────────────────────────────────────────────────────────────────
  // Fetch more (pagination)
  // ─────────────────────────────────────────────────────────────────────

  const fetchMore = useCallback(async () => {
    if (!hasMoreRef.current || isLoading) return
    await fetchNotifications(pageOffsetRef.current + 1)
  }, [isLoading, fetchNotifications])

  // ─────────────────────────────────────────────────────────────────────
  // Revalidate on app focus (catch missed updates)
  // ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !consultantId) return

    const handleFocus = () => {
      // Refetch when tab regains focus to catch any missed notifications
      fetchNotifications(0)
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [enabled, consultantId, fetchNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    hasMore: hasMoreRef.current,
    markAsRead,
    markAllRead,
    fetchMore,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    filter,
    setFilter,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helper Hooks
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get notification type label for UI display
 */
export function getNotificationLabel(type: NotificationType): string {
  switch (type) {
    case 'lead_assigned':
      return 'New Lead'
    case 'lead_stalled':
      return 'Lead Stalled'
    case 'stall_resolved':
      return 'Stall Resolved'
    case 'lead_reassigned':
      return 'Lead Reassigned'
    case 'stage_advanced':
      return 'Stage Updated'
    case 'document_reviewed':
      return 'Document Reviewed'
    case 'admin_message':
      return 'Admin Message'
    default:
      return 'Notification'
  }
}

/**
 * Get notification icon/emoji for UI display
 */
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'lead_assigned':
      return '✨'
    case 'lead_stalled':
      return '⚠️'
    case 'stall_resolved':
      return '✅'
    case 'lead_reassigned':
      return '↔️'
    case 'stage_advanced':
      return '📈'
    case 'document_reviewed':
      return '📄'
    case 'admin_message':
      return 'ℹ️'
    default:
      return '📬'
  }
}

/**
 * Get notification priority (for sorting/styling)
 */
export function getNotificationPriority(type: NotificationType): number {
  // Higher = more important
  switch (type) {
    case 'lead_stalled':
      return 100
    case 'lead_assigned':
      return 80
    case 'document_reviewed':
      return 60
    case 'stage_advanced':
      return 50
    case 'stall_resolved':
      return 40
    case 'lead_reassigned':
      return 30
    case 'admin_message':
      return 20
    default:
      return 0
  }
}

/**
 * Get CSS color for notification type
 */
export function getNotificationColor(
  type: NotificationType
): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (type) {
    case 'lead_assigned':
      return 'success'
    case 'lead_stalled':
      return 'danger'
    case 'stall_resolved':
      return 'success'
    case 'stage_advanced':
      return 'info'
    case 'document_reviewed':
      return 'info'
    case 'lead_reassigned':
      return 'default'
    case 'admin_message':
      return 'info'
    default:
      return 'default'
  }
}
