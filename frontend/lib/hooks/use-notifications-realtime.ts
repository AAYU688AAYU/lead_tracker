'use client'

/**
 * useNotificationsRealtime
 *
 * Subscribes to INSERT events on the `notifications` table filtered to
 * `user_id=eq.<userId>`.  Calls `onNotification` for each new row, and
 * maintains an `unreadCount` delta so the bell badge updates in real time.
 *
 * The hook does NOT load the full notification list — it only tracks the
 * live delta on top of the initialCount that was server-rendered.
 *
 * Usage:
 *   const unreadCount = useNotificationsRealtime({
 *     userId:       consultantId,
 *     initialCount: serverRenderedUnreadCount,
 *   })
 */

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Notification } from '@/lib/supabase/types'

type NotificationPayload = RealtimePostgresChangesPayload<Partial<Notification>>

interface UseNotificationsRealtimeOptions {
  userId:       string | null
  initialCount: number
  enabled?:     boolean
}

/**
 * Returns the live unread notification count, starting from `initialCount`
 * and incrementing as new notification rows arrive via Realtime.
 */
export function useNotificationsRealtime(
  options: UseNotificationsRealtimeOptions,
): number {
  const { userId, initialCount, enabled = true } = options

  // Start from the server-rendered count.  Each new INSERT bumps it by 1.
  // We do NOT decrement here — mark-as-read is handled by a separate action
  // that revalidates the server component, which re-seeds initialCount.
  const [unreadCount, setUnreadCount] = useState(initialCount)

  // Sync when the server-rendered seed changes (e.g. after marking as read).
  useEffect(() => { setUnreadCount(initialCount) }, [initialCount])

  const supabase = useRef(createClient())

  useEffect(() => {
    if (!enabled || !userId) return

    const channelName = `notifications-user-${userId}`
    const channel = supabase.current
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (_payload: NotificationPayload) => {
          // Every INSERT on this user's notifications = one more unread.
          setUnreadCount(n => n + 1)
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[useNotificationsRealtime] channel error', channelName)
        }
      })

    return () => {
      supabase.current.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId])

  return unreadCount
}
