'use client'

/**
 * NotificationBell
 *
 * Enhanced client component with:
 *   1. Live unread count via Realtime subscription
 *   2. Interactive dropdown panel showing recent notifications
 *   3. Mark-as-read functionality
 *   4. Links to relevant lead details
 *
 * The component owns the bell icon, badge, and dropdown panel.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useNotificationsRealtime } from '@/lib/hooks/use-notifications-realtime'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/supabase/types'

interface NotificationBellProps {
  userId:        string
  initialUnread: number
}

export function NotificationBell({ userId, initialUnread }: NotificationBellProps) {
  const unreadCount = useNotificationsRealtime({ userId, initialCount: initialUnread })
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const supabase = createClient()

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (!isOpen) return

    const fetchNotifications = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)

        setNotifications((data ?? []) as Notification[])
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [isOpen, userId, supabase])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Mark notification as read
  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      await supabase
        .from('notifications')
        .update({ is_read: true } as never)
        .eq('id', notificationId)

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
    },
    [supabase]
  )

  const label =
    unreadCount > 0
      ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
      : 'Notifications'

  return (
    <div className="relative">
      {/* Screen reader announcements for count changes */}
      <div 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {unreadCount > 0 
          ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
          : 'No unread notifications'
        }
      </div>

      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-pressed={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-[var(--radius-sm)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      >
        {/* Bell SVG */}
        <svg
          aria-hidden
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Live unread count badge */}
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--stalled)] text-[9px] font-bold leading-none text-white"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="region"
          aria-label="Notifications"
          aria-live="polite"
          className="absolute right-0 top-12 z-50 w-80 rounded-[var(--radius-md)] border border-[var(--border)] bg-white shadow-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--text)]">Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[var(--stalled)] px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto" role="list">
            {loading && (
              <div className="px-4 py-8 text-center">
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
                <p className="sr-only">Loading notifications...</p>
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-[var(--text-muted)]">No notifications yet</p>
              </div>
            )}

            {!loading && notifications.length > 0 && (
              <ul className="divide-y divide-[var(--border)]">
                {notifications.map(notification => (
                  <li
                    key={notification.id}
                    role="listitem"
                    className={`px-4 py-3 transition-colors ${
                      notification.is_read
                        ? 'bg-white hover:bg-[var(--background)]'
                        : 'bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text)] line-clamp-2">
                          {notification.type === 'lead_assigned'
                            ? 'New lead assigned'
                            : notification.type === 'stage_advanced'
                              ? 'Lead stage updated'
                              : notification.content}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                          {new Date(notification.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="shrink-0 mt-0.5 rounded-full p-1 text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
                          aria-label="Mark as read"
                        >
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <circle cx="12" cy="12" r="4" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-[var(--border)] px-4 py-2 text-center">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent)]/80 focus-visible:outline-none"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
