'use client'

/**
 * Toast Components
 *
 * Provides ToastContainer (manages layout) and individual Toast (animated display).
 * Used with the useToast hook for temporary notifications.
 */

import type { Toast as ToastType } from '@/lib/hooks/use-toast'

interface ToastContainerProps {
  toast: ToastType | null
  onDismiss: () => void
}

export function ToastContainer({ toast, onDismiss }: ToastContainerProps) {
  if (!toast || !toast.isVisible) return null

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 pointer-events-none"
      role="region"
      aria-live="polite"
      aria-atomic="true"
    >
      <Toast
        type={toast.type}
        message={toast.message}
        onDismiss={onDismiss}
      />
    </div>
  )
}

interface ToastProps {
  type: ToastType['type']
  message: string
  onDismiss: () => void
}

function Toast({ type, message, onDismiss }: ToastProps) {
  const bgColor =
    type === 'error'
      ? 'bg-[var(--destructive)]'
      : type === 'success'
        ? 'bg-[var(--accent)]'
        : 'bg-[var(--text)]'

  const icon =
    type === 'error' ? (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ) : type === 'success' ? (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ) : (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    )

  return (
    <div
      className={`${bgColor} text-white rounded-[var(--radius-md)] shadow-lg p-4 flex items-start gap-3 pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-200`}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 text-white/70 hover:text-white focus-visible:outline-none"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
