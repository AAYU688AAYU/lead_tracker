'use client';

import { useEffect, useState } from 'react';

interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
  autoClose?: boolean;
  duration?: number;
}

/**
 * Error Toast Component
 * Displays an error message that auto-dismisses after duration (default 6s)
 * Used for mutation failures, network errors, and server action errors
 */
export function ErrorToast({
  message,
  onDismiss,
  autoClose = true,
  duration = 6000,
}: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!autoClose) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [autoClose, duration, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in"
    >
      <div className="rounded-[var(--radius-md)] border border-[var(--destructive)] bg-red-50 px-4 py-3 shadow-lg">
        <div className="flex items-start gap-3">
          {/* Error icon */}
          <div className="mt-0.5 flex-shrink-0">
            <svg
              className="h-5 w-5 text-[var(--destructive)]"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          {/* Message and close button */}
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--destructive)]">
              {message}
            </p>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              setIsVisible(false);
              onDismiss();
            }}
            className="flex-shrink-0 text-[var(--destructive)] hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--destructive)] focus-visible:ring-offset-2 rounded"
            aria-label="Dismiss error"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

interface WarningToastProps {
  message: string;
  onDismiss: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Warning Toast Component
 * For non-critical warnings (e.g., stalled lead notifications)
 */
export function WarningToast({
  message,
  onDismiss,
  action,
}: WarningToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in"
    >
      <div className="rounded-[var(--radius-md)] border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">
            <svg
              className="h-5 w-5 text-amber-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">{message}</p>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {action && (
              <button
                type="button"
                onClick={() => {
                  action.onClick();
                  setIsVisible(false);
                }}
                className="text-sm font-medium text-amber-700 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 rounded px-2 py-1"
              >
                {action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsVisible(false)}
              className="text-amber-600 hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 rounded"
              aria-label="Dismiss warning"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SuccessToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

/**
 * Success Toast Component
 * For successful mutations or operations
 */
export function SuccessToast({
  message,
  onDismiss,
  duration = 3000,
}: SuccessToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in"
    >
      <div className="rounded-[var(--radius-md)] border border-green-300 bg-green-50 px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 text-green-600"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm font-medium text-green-800">{message}</p>
        </div>
      </div>
    </div>
  );
}
