'use client'

/**
 * useToast
 *
 * Simple client-side toast notification hook for temporary messages.
 * Automatically dismisses after 4 seconds or on manual dismiss.
 *
 * Usage:
 *   const { toast, showToast, dismissToast } = useToast()
 *   if (error) showToast({ type: 'error', message: 'Failed!' })
 *   return <ToastContainer {...toast} onDismiss={dismissToast} />
 */

import { useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  isVisible: boolean
}

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = useCallback((opts: {
    type: ToastType
    message: string
    duration?: number
  }) => {
    const { type, message, duration = 4000 } = opts
    const id = Math.random().toString(36)

    setToast({ id, type, message, isVisible: true })

    const timeout = setTimeout(() => {
      setToast(prev =>
        prev?.id === id ? { ...prev, isVisible: false } : prev
      )
    }, duration)

    return () => clearTimeout(timeout)
  }, [])

  const dismissToast = useCallback(() => {
    setToast(null)
  }, [])

  return { toast, showToast, dismissToast }
}
