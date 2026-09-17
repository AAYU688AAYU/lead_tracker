/**
 * Error UI Components & Hooks
 *
 * Provides React components and hooks for displaying error messages
 * consistently across the application.
 *
 * Components:
 * - ErrorBoundary: Catches React errors and displays fallback UI
 * - ErrorAlert: Inline error message card
 * - useErrorToast: Hook for showing error toasts
 *
 * Patterns:
 * - Use ErrorBoundary at route/page level to catch uncaught errors
 * - Use useErrorToast in forms and server actions
 * - Use ErrorAlert for inline validation errors in forms
 */

'use client'

import React, { ReactNode, useState } from 'react'
import type { ErrorMessage } from './error-messages'
import { resolveErrorMessage } from './error-messages'

/**
 * Error Boundary — catches React errors and displays fallback UI
 */
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, retry: () => void) => ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  retry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback?.(this.state.error, this.retry) || (
          <DefaultErrorFallback error={this.state.error} retry={this.retry} />
        )
      )
    }

    return this.props.children
  }
}

/**
 * Default error fallback UI
 */
function DefaultErrorFallback({
  error,
  retry,
}: {
  error: Error
  retry: () => void
}) {
  return (
    <div
      className="rounded-[var(--radius-md)] border border-[var(--border-error)] bg-[var(--background-error)] px-4 py-3"
      role="alert"
      aria-live="polite"
    >
      <h2 className="mb-2 font-semibold text-[var(--text-error)]">
        Something went wrong
      </h2>
      <p className="mb-3 text-sm text-[var(--text)]">
        {error.message}
      </p>
      <button
        onClick={retry}
        className="rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
      >
        Try again
      </button>
    </div>
  )
}

/**
 * Error Alert — inline error message card
 */
interface ErrorAlertProps {
  error: ErrorMessage | null
  onDismiss?: () => void
}

export function ErrorAlert({ error, onDismiss }: ErrorAlertProps) {
  if (!error) return null

  const bgClass = {
    auth: 'bg-[var(--background-error)]',
    validation: 'bg-[var(--background-warning)]',
    network: 'bg-[var(--background-warning)]',
    server: 'bg-[var(--background-error)]',
    permission: 'bg-[var(--background-error)]',
    notfound: 'bg-[var(--background-warning)]',
    ratelimit: 'bg-[var(--background-warning)]',
    unknown: 'bg-[var(--background-error)]',
  }

  const borderClass = {
    auth: 'border-[var(--border-error)]',
    validation: 'border-[var(--border-warning)]',
    network: 'border-[var(--border-warning)]',
    server: 'border-[var(--border-error)]',
    permission: 'border-[var(--border-error)]',
    notfound: 'border-[var(--border-warning)]',
    ratelimit: 'border-[var(--border-warning)]',
    unknown: 'border-[var(--border-error)]',
  }

  const textClass = {
    auth: 'text-[var(--text-error)]',
    validation: 'text-[var(--text-warning)]',
    network: 'text-[var(--text-warning)]',
    server: 'text-[var(--text-error)]',
    permission: 'text-[var(--text-error)]',
    notfound: 'text-[var(--text-warning)]',
    ratelimit: 'text-[var(--text-warning)]',
    unknown: 'text-[var(--text-error)]',
  }

  return (
    <div
      className={`rounded-[var(--radius-md)] border ${borderClass[error.category]} ${bgClass[error.category]} px-4 py-3`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3
            className={`font-semibold ${textClass[error.category]}`}
          >
            {error.title}
          </h3>
          <p className="mt-1 text-sm text-[var(--text)]">
            {error.message}
          </p>
          {error.supportText && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {error.supportText}
            </p>
          )}
          {error.action && error.actionFn && (
            <button
              onClick={error.actionFn}
              className="mt-2 text-sm font-medium text-[var(--accent)] hover:underline"
            >
              {error.action}
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-[var(--text-muted)] hover:text-[var(--text)]"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Toast Error Notification — appears at bottom of screen
 */
interface Toast {
  id: string
  error: ErrorMessage
  timestamp: number
}

export function useErrorToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showError = (error: unknown, context?: string) => {
    const errorMsg = resolveErrorMessage(error, context)
    const id = Math.random().toString(36).slice(2)
    const toast: Toast = {
      id,
      error: errorMsg,
      timestamp: Date.now(),
    }

    setToasts(prev => [...prev, toast])

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      dismissToast(id)
    }, 5000)

    return id
  }

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const clearAll = () => {
    setToasts([])
  }

  return {
    toasts,
    showError,
    dismissToast,
    clearAll,
  }
}

/**
 * Toast Container — renders all active toasts
 * Place this at the root level or in a layout
 */
interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 space-y-2"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="animate-in fade-in slide-in-from-bottom-4 max-w-sm"
        >
          <ErrorAlert
            error={toast.error}
            onDismiss={() => onDismiss(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * Form field error display
 * Use below input fields for validation feedback
 */
interface FieldErrorProps {
  error?: string
  className?: string
}

export function FieldError({ error, className = '' }: FieldErrorProps) {
  if (!error) return null

  return (
    <p
      className={`mt-1 text-xs text-[var(--text-error)] ${className}`}
      role="alert"
    >
      {error}
    </p>
  )
}

/**
 * Inline error state for form inputs
 * Returns classes and error state for input field
 */
export function useFieldError(error?: string) {
  const hasError = !!error
  const classes = hasError
    ? 'border-[var(--border-error)] focus-visible:ring-[var(--accent-error)]'
    : ''

  return {
    hasError,
    classes,
    error,
  }
}
