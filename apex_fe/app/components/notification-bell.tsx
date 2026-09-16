'use client'

/**
 * NotificationBell
 *
 * Replaces the static bell button in consultant/page.tsx (which was a pure
 * Server Component render of a hardcoded count).  This client component:
 *
 *   1. Receives `initialUnread` from the server-rendered page.
 *   2. Opens a Realtime subscription on `notifications` filtered to
 *      `user_id = userId` and increments the badge on every INSERT.
 *   3. Clears the live delta when the user clicks the bell (the page must
 *      perform a server revalidation to reset `initialUnread` properly —
 *      clicking shows a toast/panel; that is left to future phases).
 *
 * The component is intentionally self-contained: it owns only the bell icon
 * + badge; the surrounding header layout stays in page.tsx.
 */

import { useNotificationsRealtime } from '@/lib/hooks/use-notifications-realtime'

interface NotificationBellProps {
  userId:        string
  initialUnread: number
}

export function NotificationBell({ userId, initialUnread }: NotificationBellProps) {
  const unreadCount = useNotificationsRealtime({ userId, initialCount: initialUnread })

  const label =
    unreadCount > 0
      ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
      : 'Notifications'

  return (
    <button
      type="button"
      aria-label={label}
      className="relative rounded-[var(--radius-sm)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
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
  )
}
