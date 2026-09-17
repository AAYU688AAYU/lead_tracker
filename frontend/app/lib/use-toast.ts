'use client';

import { useState, useCallback } from 'react';

export type ToastType = 'error' | 'success' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * useToast Hook
 * Manages toast notifications for errors, successes, and warnings
 * Usage:
 *   const { toasts, addToast, removeToast } = useToast()
 *   addToast('error', 'Something went wrong')
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (type: ToastType, message: string, action?: Toast['action']) => {
      const id = Math.random().toString(36).substring(2);
      setToasts((prev) => [...prev, { id, type, message, action }]);
      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return { toasts, addToast, removeToast, clearAll };
}
