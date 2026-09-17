'use client'

/**
 * useStudentRealtime
 *
 * Student-scoped realtime hook for /portal/student dashboard.
 *
 * Key design decisions:
 *   1. Separate from consultant realtime (architectural boundary enforcement)
 *   2. Single-lead focused: each student sees only their own leads
 *   3. Document updates included: students see upload status and approval decisions
 *   4. Activity logs excluded: students never see consultant work logs (per spec)
 *   5. Self-contained: doesn't rely on RealtimeProvider (which is consultant-scoped)
 *
 * Why separate from RealtimeProvider?
 *   - Students and consultants have opposite roles and data access patterns
 *   - Consultant realtime: many leads, consultant-scoped filtering
 *   - Student realtime: one or few leads, student-scoped filtering
 *   - Separate contexts prevent accidentally sharing data across roles
 *   - RLS policies are enforced at Supabase level (student only sees own data)
 *
 * Features:
 *   - Maintains student leads array with live updates
 *   - Tracks document status changes (pending → approved/rejected)
 *   - Monitors stage/status changes (consultant actions visible in real time)
 *   - Tracks consultant assignment changes
 *   - Connection status for offline indicators
 *
 * Usage:
 *   const { leads, isConnected, connectionStatus } = useStudentRealtime(studentId)
 *
 *   // Show each lead with live updates
 *   leads.forEach(lead => (
 *     <LeadRow
 *       lead={lead}
 *       isLive={isConnected}
 *     />
 *   ))
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Lead, Document } from '@/lib/supabase/types'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export type StudentRealtimeStatus = 'connected' | 'reconnecting' | 'error'

export interface StudentLead extends Lead {
  documents: StudentDocument[]
}

export interface StudentDocument extends Document {
  created_at: string
  updated_at: string
}

export interface UseStudentRealtimeOptions {
  studentId: string | null
  enabled?: boolean
}

export interface UseStudentRealtimeReturn {
  leads: StudentLead[]
  connectionStatus: StudentRealtimeStatus
  isConnected: boolean
}

// ─────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────

export function useStudentRealtime(
  options: UseStudentRealtimeOptions
): UseStudentRealtimeReturn {
  const { studentId, enabled = true } = options

  // State
  const [leads, setLeads] = useState<StudentLead[]>([])
  const [connectionStatus, setConnectionStatus] = useState<StudentRealtimeStatus>('connected')

  // Refs
  const supabaseRef = useRef(createClient())
  const leadsChannelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)
  const docsChannelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)

  // ─────────────────────────────────────────────────────────────────────
  // Leads Subscription: student's own leads only
  // ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !studentId) {
      setConnectionStatus('connected')
      return
    }

    const supabase = supabaseRef.current

    const leadsChannel = supabase
      .channel(`student-leads-${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `student_id=eq.${studentId}`,
        },
        (payload: RealtimePostgresChangesPayload<Partial<Lead>>) => {
          setConnectionStatus('connected')

          const newLead = payload.new as Lead | null
          const oldLead = payload.old as Lead | null

          if (payload.eventType === 'INSERT' && newLead) {
            // New lead created
            setLeads(prev => [
              {
                ...newLead,
                documents: [],
              },
              ...prev,
            ])
          } else if (payload.eventType === 'UPDATE' && newLead) {
            // Lead updated (stage, status, consultant assignment)
            setLeads(prev =>
              prev.map(l =>
                l.id === newLead.id
                  ? {
                      ...l,
                      ...newLead,
                      // Preserve documents array
                      documents: l.documents,
                    }
                  : l
              )
            )
          } else if (payload.eventType === 'DELETE' && oldLead) {
            // Lead deleted (shouldn't happen in practice, but handle it)
            setLeads(prev => prev.filter(l => l.id !== oldLead.id))
          }
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('reconnecting')
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error')
        }
      })

    leadsChannelRef.current = leadsChannel

    return () => {
      supabase.removeChannel(leadsChannel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, studentId])

  // ─────────────────────────────────────────────────────────────────────
  // Documents Subscription: student's documents only
  // Filters to documents where lead_id is in this student's leads
  // ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !studentId) return

    const supabase = supabaseRef.current

    const docsChannel = supabase
      .channel(`student-docs-${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
        },
        (payload: RealtimePostgresChangesPayload<Partial<Document>>) => {
          const doc = payload.new as Document | null
          const oldDoc = payload.old as Document | null

          // Only process documents for leads we're tracking
          // (RLS enforces this, but we also filter client-side for safety)
          const targetLeadId = doc?.lead_id || oldDoc?.lead_id
          if (!targetLeadId) return

          setLeads(prev =>
            prev.map(lead => {
              if (lead.id !== targetLeadId) return lead

              if (payload.eventType === 'INSERT' && doc) {
                // New document uploaded
                return {
                  ...lead,
                  documents: [
                    {
                      ...doc,
                      created_at: doc.created_at,
                      updated_at: doc.updated_at,
                    } as StudentDocument,
                    ...lead.documents,
                  ],
                }
              } else if (payload.eventType === 'UPDATE' && doc) {
                // Document status updated (approved/rejected)
                return {
                  ...lead,
                  documents: lead.documents.map(d =>
                    d.id === doc.id
                      ? ({
                          ...d,
                          status: doc.status,
                          rejection_reason: doc.rejection_reason,
                          updated_at: doc.updated_at,
                        } as StudentDocument)
                      : d
                  ),
                }
              } else if (payload.eventType === 'DELETE' && oldDoc) {
                // Document deleted (shouldn't happen, but handle)
                return {
                  ...lead,
                  documents: lead.documents.filter(d => d.id !== oldDoc.id),
                }
              }

              return lead
            })
          )
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('reconnecting')
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error')
        }
      })

    docsChannelRef.current = docsChannel

    return () => {
      supabase.removeChannel(docsChannel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, studentId])

  // ─────────────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      const supabase = supabaseRef.current
      if (leadsChannelRef.current) {
        supabase.removeChannel(leadsChannelRef.current)
      }
      if (docsChannelRef.current) {
        supabase.removeChannel(docsChannelRef.current)
      }
    }
  }, [])

  return {
    leads,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helper Hooks
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get student leads with connection status helper
 */
export function useStudentLeads(studentId: string | null) {
  return useStudentRealtime({ studentId })
}

/**
 * Get status label for UI display
 */
export function useStudentConnectionStatusLabel(
  connectionStatus: StudentRealtimeStatus
): string {
  switch (connectionStatus) {
    case 'connected':
      return 'Live updates enabled'
    case 'reconnecting':
      return 'Reconnecting to updates...'
    case 'error':
      return 'Updates offline — changes may be delayed'
    default:
      return 'Unknown'
  }
}

/**
 * Get status indicator (emoji + styling)
 */
export function useStudentConnectionStatusIcon(connectionStatus: StudentRealtimeStatus) {
  switch (connectionStatus) {
    case 'connected':
      return {
        emoji: '🟢',
        className: 'text-emerald-600',
        label: 'Live',
      }
    case 'reconnecting':
      return {
        emoji: '🟡',
        className: 'text-yellow-600 animate-pulse',
        label: 'Reconnecting',
      }
    case 'error':
      return {
        emoji: '🔴',
        className: 'text-red-600',
        label: 'Offline',
      }
    default:
      return {
        emoji: '⚪',
        className: 'text-gray-400',
        label: 'Unknown',
      }
  }
}
