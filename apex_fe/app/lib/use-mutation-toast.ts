'use client';

import { useEffect } from 'react';
import { useToast } from './use-toast';

export interface MutationState {
  status?: 'idle' | 'pending' | 'success' | 'error';
  error?: string;
  message?: string;
}

/**
 * useMutationToast Hook
 * Automatically shows error/success toasts based on mutation state
 * Usage:
 *   const [state, formAction, pending] = useActionState(action, INITIAL_STATE)
 *   useMutationToast(state, 'Lead updated successfully')
 */
export function useMutationToast(
  state: MutationState,
  successMessage?: string,
  onError?: (error: string) => void
) {
  const { addToast } = useToast();

  useEffect(() => {
    if (state.status === 'error') {
      const errorMsg = state.error || state.message || 'An error occurred';
      addToast('error', errorMsg);
      onError?.(errorMsg);
    }
  }, [state.status, state.error, state.message, addToast, onError]);

  useEffect(() => {
    if (state.status === 'success' && successMessage) {
      addToast('success', successMessage);
    }
  }, [state.status, successMessage, addToast]);
}

/**
 * useErrorHandler Hook
 * Converts try/catch errors into toast notifications
 * Usage:
 *   const { showError } = useErrorHandler()
 *   try {
 *     await someApi()
 *   } catch (err) {
 *     showError(err)
 *   }
 */
export function useErrorHandler() {
  const { addToast } = useToast();

  const showError = (error: unknown, fallbackMessage = 'Something went wrong') => {
    let message = fallbackMessage;

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }

    addToast('error', message);
  };

  return { showError };
}
