/**
 * Realtime Subscription with Auto-Reconnect & Exponential Backoff
 *
 * Phase 10 #12: Auto-reconnect for realtime with exponential backoff
 *
 * This is a drop-in replacement for direct Supabase channel.subscribe() calls.
 * Provides automatic reconnection on failure with exponential backoff and jitter.
 *
 * Features:
 * - Auto-reconnect on CHANNEL_ERROR and TIMED_OUT
 * - Exponential backoff: 1s → 2s → 4s → 8s (max 30s)
 * - Jitter: prevents thundering herd
 * - Max attempts: prevents infinite retry loops
 * - Recovery data fetch: optionally fetches missed updates after reconnect
 * - Detailed logging for debugging
 *
 * USAGE (Enhanced version):
 * ```typescript
 * const channel = supabase
 *   .channel(name)
 *   .on('postgres_changes', config, handler)
 *   .subscribe() // Original behavior (no reconnect)
 *
 * // With auto-reconnect:
 * useRealtimeWithRecovery({
 *   channel,
 *   onConnected: () => console.log('Connected'),
 *   onError: (error) => console.error('Error:', error),
 *   onRecoveryNeeded: async () => {
 *     const missed = await fetch(`/api/recovery?since=${lastTimestamp}`)
 *     // Apply missed updates
 *   },
 * })
 * ```
 */

import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type RealtimeStatus = 'connected' | 'reconnecting' | 'error'

/**
 * Reconnect configuration
 */
export interface RealtimeRecoveryConfig {
  // Initial backoff delay in milliseconds
  initialDelayMs?: number
  // Maximum backoff delay in milliseconds
  maxDelayMs?: number
  // Exponential backoff multiplier
  backoffMultiplier?: number
  // Jitter as fraction of delay (0-1)
  jitterFraction?: number
  // Maximum reconnection attempts before giving up
  maxAttempts?: number
  // Optional: function to fetch missed updates after reconnect
  recoveryFn?: (timestamp: string) => Promise<void>
}

/**
 * Default configuration for exponential backoff
 */
const DEFAULT_CONFIG: RealtimeRecoveryConfig = {
  initialDelayMs: 1000,      // 1 second
  maxDelayMs: 30000,         // 30 seconds max
  backoffMultiplier: 2,      // Double each time
  jitterFraction: 0.2,       // 20% random variation
  maxAttempts: 10,           // Give up after 10 attempts
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(
  attempt: number,
  config: Required<RealtimeRecoveryConfig>
): number {
  // Exponential: delay * (multiplier ^ attempt)
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt)
  
  // Cap at maximum
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs)
  
  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * config.jitterFraction * Math.random()
  
  return Math.round(cappedDelay + jitter)
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Enhanced realtime subscription with auto-reconnect
 *
 * This hook wraps a Supabase channel and manages reconnection logic.
 * It handles CHANNEL_ERROR and TIMED_OUT states automatically.
 */
export interface UseRealtimeWithRecoveryOptions {
  channel: RealtimeChannel
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error | null, attempt: number) => void
  onRecoveryNeeded?: () => Promise<void>
  config?: RealtimeRecoveryConfig
  onStatusChange?: (status: RealtimeStatus) => void
}

export function useRealtimeWithRecovery(options: UseRealtimeWithRecoveryOptions): RealtimeStatus {
  const {
    channel,
    onConnected,
    onDisconnected,
    onError,
    onRecoveryNeeded,
    config: userConfig = {},
    onStatusChange,
  } = options

  const [status, setStatus] = useState<RealtimeStatus>('connected')
  const attemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const configRef = useRef({ ...DEFAULT_CONFIG, ...userConfig } as Required<RealtimeRecoveryConfig>)
  const lastSuccessfulConnectionRef = useRef<string>(new Date().toISOString())

  // Update status and notify callbacks
  const updateStatus = (newStatus: RealtimeStatus) => {
    if (status !== newStatus) {
      setStatus(newStatus)
      onStatusChange?.(newStatus)

      if (newStatus === 'connected') {
        onConnected?.()
      } else if (newStatus === 'error') {
        onDisconnected?.()
      }
    }
  }

  // Attempt to reconnect with exponential backoff
  const attemptReconnect = async (attemptNumber: number) => {
    if (attemptNumber >= configRef.current.maxAttempts) {
      const error = new Error('Max reconnection attempts reached')
      onError?.(error, attemptNumber)
      updateStatus('error')
      return
    }

    try {
      updateStatus('reconnecting')

      // Calculate backoff delay
      const delay = calculateBackoffDelay(attemptNumber, configRef.current)
      console.log(
        `[realtime-recovery] Reconnecting (attempt ${attemptNumber + 1}/${configRef.current.maxAttempts}) in ${delay}ms`
      )

      // Wait before reconnecting
      await sleep(delay)

      // Attempt to resubscribe
      const subscriptionStatus = await new Promise<string>((resolve) => {
        channel.subscribe((status) => {
          resolve(status)
        })
      })

      if (subscriptionStatus === 'SUBSCRIBED') {
        console.log('[realtime-recovery] Successfully reconnected')
        attemptsRef.current = 0
        lastSuccessfulConnectionRef.current = new Date().toISOString()
        updateStatus('connected')

        // Optionally fetch missed updates
        if (onRecoveryNeeded) {
          try {
            console.log('[realtime-recovery] Fetching missed updates...')
            await onRecoveryNeeded()
          } catch (err) {
            console.warn('[realtime-recovery] Recovery fetch failed:', err)
            // Don't fail the reconnection if recovery fails
          }
        }
      } else {
        // Subscription failed, retry
        attemptsRef.current++
        attemptReconnect(attemptsRef.current)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error('[realtime-recovery] Reconnection error:', error.message)
      onError?.(error, attemptNumber)

      // Retry with next attempt
      attemptsRef.current++
      attemptReconnect(attemptsRef.current)
    }
  }

  // Set up subscription status handler
  useEffect(() => {
    // Keep track of the original subscribe callback
    const handleSubscriptionStatus = (subscriptionStatus: string) => {
      console.log(`[realtime-recovery] Subscription status: ${subscriptionStatus}`)

      if (subscriptionStatus === 'SUBSCRIBED') {
        attemptsRef.current = 0
        lastSuccessfulConnectionRef.current = new Date().toISOString()
        updateStatus('connected')
      } else if (subscriptionStatus === 'CHANNEL_ERROR') {
        console.warn('[realtime-recovery] Channel error detected, attempting reconnect...')
        onError?.(null, attemptsRef.current)

        // Clear any pending reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }

        // Attempt reconnect
        attemptReconnect(attemptsRef.current)
      } else if (subscriptionStatus === 'TIMED_OUT') {
        console.warn('[realtime-recovery] Subscription timed out, attempting reconnect...')
        updateStatus('reconnecting')
        onError?.(null, attemptsRef.current)

        // Clear any pending reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }

        // Attempt reconnect
        attemptReconnect(attemptsRef.current)
      }
    }

    // Subscribe to channel status changes
    const subscription = channel.subscribe((status) => {
      handleSubscriptionStatus(status)
    })

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [channel, onError])

  return status
}

/**
 * Hook specifically for lead drawer recovery
 *
 * After reconnecting, fetches missed activity/communication updates
 */
export function useRealtimeWithLeadRecovery(
  channel: RealtimeChannel,
  leadId: string,
  onStatusChange?: (status: RealtimeStatus) => void
): RealtimeStatus {
  const lastTimestampRef = useRef(new Date().toISOString())

  const handleRecovery = async () => {
    try {
      // Fetch missed updates since last successful connection
      const response = await fetch(
        `/api/leads/recovery?lead_id=${leadId}&since=${lastTimestampRef.current}`
      )

      if (!response.ok) {
        throw new Error(`Recovery fetch failed: ${response.statusText}`)
      }

      const data = await response.json()
      lastTimestampRef.current = new Date().toISOString()

      // The component using this hook should re-fetch its data
      // or the recovery endpoint should broadcast updates via realtime
      console.log('[lead-recovery] Recovered', data)
    } catch (err) {
      console.warn('[lead-recovery] Recovery failed:', err)
      // Don't throw — let the parent handle the error
    }
  }

  return useRealtimeWithRecovery({
    channel,
    onRecoveryNeeded: handleRecovery,
    onStatusChange,
    config: {
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      jitterFraction: 0.2,
      maxAttempts: 5,
    },
  })
}

/**
 * Presets for common scenarios
 */
export const REALTIME_RECOVERY_PRESETS = {
  // Aggressive: Quick retries for stable networks
  AGGRESSIVE: {
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 1.5,
    jitterFraction: 0.1,
    maxAttempts: 3,
  },

  // Moderate: Balanced for typical networks
  MODERATE: {
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFraction: 0.2,
    maxAttempts: 10,
  },

  // Conservative: Patient retries for unstable networks
  CONSERVATIVE: {
    initialDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 2.5,
    jitterFraction: 0.3,
    maxAttempts: 15,
  },

  // Mobile: For cellular connections (high latency, frequent dropouts)
  MOBILE: {
    initialDelayMs: 3000,
    maxDelayMs: 90000,
    backoffMultiplier: 2,
    jitterFraction: 0.3,
    maxAttempts: 20,
  },
}
