'use client'

/**
 * useRealtimeStatus
 *
 * Tracks the real-time connection status by monitoring Supabase client events.
 * Returns connection state: 'connected' | 'reconnecting' | 'disconnected'
 *
 * Usage:
 *   const { status, isConnected } = useRealtimeStatus()
 *   // Renders connection indicator badge
 */

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export type RealtimeStatus = 'connected' | 'reconnecting' | 'disconnected'

export function useRealtimeStatus() {
  const [status, setStatus] = useState<RealtimeStatus>('connected')
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current

    // Listen for connection state changes
    const channel = supabase.channel('connection-status', {
      config: { broadcast: { self: true } },
    })

    channel.on('system', { event: 'login' }, () => {
      setStatus('connected')
    })

    channel
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStatus('connected')
        } else if (status === 'CHANNEL_ERROR') {
          setStatus('disconnected')
        } else if (status === 'TIMED_OUT') {
          setStatus('reconnecting')
        }
      })

    // Also track auth session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setStatus('connected')
      } else if (event === 'SIGNED_OUT') {
        setStatus('disconnected')
      }
    })

    return () => {
      channel.unsubscribe()
      subscription?.unsubscribe()
    }
  }, [])

  return {
    status,
    isConnected: status === 'connected',
  }
}
