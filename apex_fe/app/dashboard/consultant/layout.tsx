'use client'

/**
 * Consultant Dashboard Layout
 *
 * Wraps all consultant routes with:
 *   1. RealtimeProvider — singleton realtime state for all consultant pages
 *   2. Authentication guard — redirects if not consultant
 *
 * Why a layout?
 *   - RealtimeProvider needs to be mounted once at the consultant route level
 *   - All child routes (kanban, lead-detail, notifications) can use useCRMRealtime
 *   - Ensures single WebSocket connection per consultant session
 *   - Prevents multiple connections in multi-tab scenarios (BroadcastChannel deduplicates)
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/client'
import { RealtimeProvider } from '@/app/providers/realtime-provider'
import type { ReactNode } from 'react'

interface ConsultantLayoutProps {
  children: ReactNode
}

/**
 * Wrapper component that enforces consultant role and provides realtime context
 */
function ConsultantLayoutContent({ children }: ConsultantLayoutProps) {
  const router = useRouter()
  const { user, profile, isLoading } = useAuth()

  // Guard: redirect if not consultant
  useEffect(() => {
    if (!isLoading && (!user || profile?.role !== 'consultant')) {
      router.push(profile?.role === 'admin' ? '/dashboard/admin' : '/dashboard/student')
    }
  }, [user, profile?.role, isLoading, router])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
      </div>
    )
  }

  // Not authenticated or wrong role
  if (!user || profile?.role !== 'consultant') {
    return null
  }

  // Render with RealtimeProvider
  return (
    <RealtimeProvider consultantId={user.id}>
      {children}
    </RealtimeProvider>
  )
}

export default function ConsultantLayout({ children }: ConsultantLayoutProps) {
  return <ConsultantLayoutContent>{children}</ConsultantLayoutContent>
}
