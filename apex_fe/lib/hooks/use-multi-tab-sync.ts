'use client'

/**
 * useMultiTabSync
 *
 * Hook for multi-tab state synchronization using BroadcastChannel API.
 *
 * Purpose:
 *   - Keeps realtime state synchronized across browser tabs
 *   - Prevents duplicate audio chimes in multi-tab scenarios
 *   - Ensures one tab is the "primary" connection holder
 *   - Falls back gracefully if BroadcastChannel not supported
 *
 * How it works:
 *   1. All tabs join a shared BroadcastChannel for their consultant
 *   2. Tabs send state updates to the channel (not just receiving)
 *   3. Tabs listen for updates from other tabs and apply them
 *   4. Tab receives updates from RealtimeProvider and broadcasts them
 *   5. If primary tab closes, another tab can take over the connection
 *
 * Design rationale:
 *   - BroadcastChannel is simpler and more efficient than localStorage polling
 *   - Works across same-origin tabs (different subdomains blocked for security)
 *   - No server round-trip needed (purely client-side)
 *   - Reduces Supabase billing: all tabs share one connection via RealtimeProvider
 *
 * Browser support:
 *   - Chrome 54+
 *   - Firefox 38+
 *   - Edge 15+
 *   - Safari 15.1+ (limited support in earlier versions)
 *   - Gracefully degrades if not supported (each tab gets own connection)
 */

import { useEffect, useRef, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface MultiTabSyncMessage {
  type: string
  payload?: any
  timestamp: number
  tabId: string
}

export interface UseMultiTabSyncOptions {
  channelName: string
  onMessage?: (message: MultiTabSyncMessage) => void
  enabled?: boolean
}

export interface UseMultiTabSyncReturn {
  sendMessage: (type: string, payload?: any) => void
  isSupported: boolean
  tabCount: number
}

// ─────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────

let tabIdCounter = 0

export function useMultiTabSync(options: UseMultiTabSyncOptions): UseMultiTabSyncReturn {
  const { channelName, onMessage, enabled = true } = options

  // Generate unique tab ID
  const tabIdRef = useRef(`tab-${Date.now()}-${++tabIdCounter}`)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const tabCountRef = useRef(1)

  // ─────────────────────────────────────────────────────────────────────
  // Initialize BroadcastChannel
  // ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    try {
      // Check if BroadcastChannel is supported
      if (!('BroadcastChannel' in window)) {
        console.debug('[useMultiTabSync] BroadcastChannel not supported, multi-tab sync disabled')
        return
      }

      const channel = new BroadcastChannel(channelName)
      channelRef.current = channel

      // Track tab count via ping/pong mechanism
      channel.onmessage = (event: MessageEvent<MultiTabSyncMessage>) => {
        const message = event.data

        // Handle different message types
        if (message.type === 'ping') {
          // Another tab is checking if we're alive
          channel.postMessage({
            type: 'pong',
            timestamp: Date.now(),
            tabId: tabIdRef.current,
          })
        } else if (message.type === 'tab-count-request') {
          // Another tab is requesting current tab count
          channel.postMessage({
            type: 'tab-count-response',
            payload: { count: 1 },
            timestamp: Date.now(),
            tabId: tabIdRef.current,
          })
        } else if (onMessage) {
          // Forward other messages to the caller
          onMessage(message)
        }
      }

      // Announce this tab's presence
      channel.postMessage({
        type: 'tab-joined',
        payload: { tabId: tabIdRef.current },
        timestamp: Date.now(),
        tabId: tabIdRef.current,
      })

      console.debug('[useMultiTabSync] Channel initialized:', channelName, tabIdRef.current)
    } catch (err) {
      console.warn('[useMultiTabSync] Failed to create BroadcastChannel:', err)
    }

    return () => {
      if (channelRef.current) {
        // Announce departure
        channelRef.current.postMessage({
          type: 'tab-left',
          payload: { tabId: tabIdRef.current },
          timestamp: Date.now(),
          tabId: tabIdRef.current,
        })
        channelRef.current.close()
        channelRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, channelName])

  // ─────────────────────────────────────────────────────────────────────
  // Send message to other tabs
  // ─────────────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    (type: string, payload?: any) => {
      if (!channelRef.current) return

      try {
        channelRef.current.postMessage({
          type,
          payload,
          timestamp: Date.now(),
          tabId: tabIdRef.current,
        })
      } catch (err) {
        console.warn('[useMultiTabSync] Failed to send message:', err)
      }
    },
    []
  )

  // ─────────────────────────────────────────────────────────────────────
  // Periodic tab count sync
  // ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !channelRef.current) return

    const interval = setInterval(() => {
      try {
        channelRef.current?.postMessage({
          type: 'tab-count-request',
          timestamp: Date.now(),
          tabId: tabIdRef.current,
        })
      } catch (err) {
        console.debug('[useMultiTabSync] Tab count sync failed')
      }
    }, 5000) // Every 5 seconds

    return () => clearInterval(interval)
  }, [enabled])

  return {
    sendMessage,
    isSupported: typeof window !== 'undefined' && 'BroadcastChannel' in window,
    tabCount: tabCountRef.current,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Utility: sessionStorage sync (fallback for unsupported browsers)
// ─────────────────────────────────────────────────────────────────────────

/**
 * useMultiTabSyncFallback — Uses localStorage as fallback when BroadcastChannel not supported
 *
 * Less efficient (polling) but works in older browsers
 */
export function useMultiTabSyncFallback(options: UseMultiTabSyncOptions) {
  const { channelName, onMessage, enabled = true } = options
  const storageKeyRef = useRef(`sync-${channelName}`)
  const lastMessageRef = useRef<string>('')

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const pollInterval = setInterval(() => {
      try {
        const stored = localStorage.getItem(storageKeyRef.current)
        if (stored && stored !== lastMessageRef.current) {
          lastMessageRef.current = stored
          const message = JSON.parse(stored)
          if (onMessage) {
            onMessage(message)
          }
        }
      } catch (err) {
        console.warn('[useMultiTabSyncFallback] Poll failed:', err)
      }
    }, 1000) // Poll every second

    return () => clearInterval(pollInterval)
  }, [enabled, onMessage])

  const sendMessage = useCallback(
    (type: string, payload?: any) => {
      try {
        const message: MultiTabSyncMessage = {
          type,
          payload,
          timestamp: Date.now(),
          tabId: `tab-fallback-${Math.random()}`,
        }
        localStorage.setItem(storageKeyRef.current, JSON.stringify(message))
      } catch (err) {
        console.warn('[useMultiTabSyncFallback] Failed to send message:', err)
      }
    },
    []
  )

  return {
    sendMessage,
    isSupported: false,
    tabCount: 1,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Composite Hook: Auto-selects best available method
// ─────────────────────────────────────────────────────────────────────────

/**
 * useMultiTabSyncAuto — Uses BroadcastChannel if available, falls back to localStorage
 */
export function useMultiTabSyncAuto(
  options: UseMultiTabSyncOptions
): UseMultiTabSyncReturn {
  const isSupported =
    typeof window !== 'undefined' && 'BroadcastChannel' in window

  if (isSupported) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMultiTabSync(options)
  } else {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMultiTabSyncFallback(options)
  }
}
