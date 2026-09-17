'use client'

/**
 * Notification Center Page
 *
 * Full-page notification history and management interface.
 * Replaces the small dropdown from NotificationBell component.
 *
 * Features:
 *   1. Real-time unread count (via useNotifications hook)
 *   2. Paginated history with infinite scroll
 *   3. Filtering by notification type
 *   4. Mark as read / Mark all read actions
 *   5. Date grouping (Today, Yesterday, Earlier this week)
 *   6. Empty state messaging
 *   7. Connection status indicator
 *
 * Design approach:
 *   - Server-side pagination (efficient for large notification volumes)
 *   - Real-time updates for new notifications (via Realtime)
 *   - Optimistic UI updates for mark-as-read actions
 *   - Responsive layout: single column on desktop and mobile
 *
 * User flows:
 *   1. Open notifications → see full history with unread highlights
 *   2. Click "Mark all read" → bulk action with toast feedback
 *   3. Click notification → can navigate to related lead or action
 *   4. Scroll down → infinite load more
 *   5. Filter by type → see only stall alerts, assignments, etc.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth/client'
import { useNotifications, getNotificationIcon, getNotificationLabel } from '@/lib/hooks/use-notifications'
import { useConnectionStatusIcon } from '@/lib/hooks/use-crm-realtime'
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from './actions'

type NotificationFilterType = 'all' | 'lead_assigned' | 'lead_stalled' | 'stall_resolved' | 'lead_reassigned' | 'stage_advanced' | 'document_reviewed' | 'admin_message'

const FILTER_OPTIONS: Array<{ value: NotificationFilterType; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'lead_assigned', label: 'New Leads' },
  { value: 'lead_stalled', label: 'Stalled Leads' },
  { value: 'stall_resolved', label: 'Resolved' },
  { value: 'stage_advanced', label: 'Stage Updates' },
  { value: 'document_reviewed', label: 'Documents' },
  { value: 'admin_message', label: 'Admin' },
]

/**
 * Group notifications by date for display
 */
function groupNotificationsByDate(
  notifications: Array<{ created_at: string; is_read: boolean }>
) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const groups: {
    [key: string]: Array<{ created_at: string; is_read: boolean }>
  } = {
    'Today': [],
    'Yesterday': [],
    'Earlier this week': [],
    'Earlier': [],
  }

  notifications.forEach(notif => {
    const notifDate = new Date(notif.created_at)
    const notifDateOnly = new Date(
      notifDate.getFullYear(),
      notifDate.getMonth(),
      notifDate.getDate()
    )

    if (notifDateOnly.getTime() === today.getTime()) {
      groups['Today'].push(notif)
    } else if (notifDateOnly.getTime() === yesterday.getTime()) {
      groups['Yesterday'].push(notif)
    } else if (notifDateOnly.getTime() >= weekAgo.getTime()) {
      groups['Earlier this week'].push(notif)
    } else {
      groups['Earlier'].push(notif)
    }
  })

  return groups
}

/**
 * Format time for display
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function NotificationCenterPage() {
  const { user } = useAuth()
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    markAsRead,
    markAllRead,
    fetchMore,
    connectionStatus,
    filter,
    setFilter,
  } = useNotifications({ consultantId: user?.id || null })

  const observerTarget = useRef<HTMLDivElement>(null)

  // Infinite scroll observer
  useEffect(() => {
    if (!observerTarget.current || !hasMore || isLoading) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          fetchMore()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(observerTarget.current)
    return () => observer.disconnect()
  }, [hasMore, isLoading, fetchMore])

  // Handle mark all read
  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsAsReadAction()
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }, [])

  const groupedNotifications = groupNotificationsByDate(notifications)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">Notifications</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Stay updated on your leads and portfolio
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection status */}
            <div className="flex items-center gap-1 rounded-full bg-[var(--background)] px-3 py-1.5">
              <span
                className={
                  connectionStatus === 'connected'
                    ? 'inline-block h-2 w-2 rounded-full bg-emerald-500'
                    : connectionStatus === 'reconnecting'
                      ? 'inline-block h-2 w-2 rounded-full bg-yellow-500 animate-pulse'
                      : 'inline-block h-2 w-2 rounded-full bg-red-500'
                }
              />
              <span className="text-xs font-medium text-[var(--text-muted)]">
                {connectionStatus === 'connected'
                  ? 'Live'
                  : connectionStatus === 'reconnecting'
                    ? 'Syncing'
                    : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Mark all read button */}
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="mt-4 text-sm font-medium text-[var(--accent)] hover:opacity-80 transition-opacity"
          >
            Mark all read ({unreadCount})
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map(option => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === option.value
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--background)]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {notifications.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 text-5xl">🌿</div>
          <h2 className="text-lg font-semibold text-[var(--text)]">You're all caught up</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            No new notifications to show
          </p>
        </div>
      )}

      {/* Notifications list */}
      {notifications.length > 0 && (
        <div className="space-y-8">
          {Object.entries(groupedNotifications).map(([dateGroup, notifs]) =>
            notifs.length === 0 ? null : (
              <div key={dateGroup}>
                {/* Date group header */}
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {dateGroup}
                </h3>

                {/* Notifications in this group */}
                <div className="space-y-1">
                  {notifs.map(notification => (
                    <div
                      key={notification.id}
                      className={`group flex items-start gap-3 rounded-[var(--radius-sm)] px-4 py-3 transition-colors ${
                        !notification.is_read
                          ? 'bg-[var(--accent)]/5 border-l-4 border-[var(--accent)]'
                          : 'bg-transparent border-l-4 border-transparent hover:bg-[var(--background)]'
                      }`}
                    >
                      {/* Icon */}
                      <span className="shrink-0 text-lg">
                        {getNotificationIcon(notification.type as any)}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text)]">
                          {notification.content}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>

                      {/* Mark as read button */}
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="mt-0.5 shrink-0 rounded-full p-1 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--text)] hover:bg-[var(--border)]"
                          title="Mark as read"
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div
          ref={observerTarget}
          className="mt-8 flex justify-center py-4"
        >
          <button
            onClick={fetchMore}
            disabled={isLoading}
            className="text-sm font-medium text-[var(--accent)] hover:opacity-80 disabled:opacity-50"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
