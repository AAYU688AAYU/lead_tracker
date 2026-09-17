/**
 * API Authorization Guards
 * Phase 10: Enforce server-side authorization on all API endpoints
 *
 * Pattern:
 * 1. Always get authenticated user from session (never from params)
 * 2. Verify resource owner matches authenticated user
 * 3. Use explicit query filters, never trust client input
 * 4. Log unauthorized access attempts
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'

/**
 * Require authentication on API route
 *
 * Usage:
 * ```
 * const user = await requireAuth(request)
 * if (!user) return
 * ```
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ data?: any; error?: NextResponse }> {
  const user = await getCurrentUser()
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { data: user }
}

/**
 * Verify user owns resource
 *
 * Usage:
 * ```
 * const ownsResource = verifyResourceOwnership(
 *   userId,      // from query param (untrusted)
 *   user.id      // from session (trusted)
 * )
 * if (!ownsResource) {
 *   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
 * }
 * ```
 */
export function verifyResourceOwnership(
  requestedId: string | null,
  authenticatedId: string
): boolean {
  if (!requestedId) return false
  return requestedId === authenticatedId
}

/**
 * Verify consultant is accessing their own data
 *
 * Usage:
 * ```
 * const allowed = verifyConsultantAccess(
 *   consultantIdFromQuery,
 *   user.id
 * )
 * if (!allowed) {
 *   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
 * }
 * ```
 */
export function verifyConsultantAccess(
  requestedConsultantId: string | null,
  authenticatedUserId: string
): boolean {
  if (!requestedConsultantId) return false
  return requestedConsultantId === authenticatedUserId
}

/**
 * Verify admin access
 *
 * Usage:
 * ```
 * const userRole = await getUserRole(user.id)
 * if (userRole !== 'admin') {
 *   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
 * }
 * ```
 */
export async function requireAdminAccess(
  userId: string,
  supabase: any
): Promise<{ allowed: boolean; error?: NextResponse }> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role !== 'admin') {
      return {
        allowed: false,
        error: NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        ),
      }
    }

    return { allowed: true }
  } catch (err) {
    return {
      allowed: false,
      error: NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
    }
  }
}

/**
 * Sanitize query parameters
 *
 * Ensures query parameters are strings/numbers and within expected bounds
 */
export function sanitizeQueryParams(
  params: Record<string, string | null>,
  schema: Record<string, { type: string; default?: any; min?: number; max?: number }>
): Record<string, any> {
  const result: Record<string, any> = {}

  for (const [key, config] of Object.entries(schema)) {
    const value = params[key]

    if (value === null || value === undefined) {
      result[key] = config.default
      continue
    }

    if (config.type === 'string') {
      result[key] = String(value).substring(0, 255) // Max 255 chars
    } else if (config.type === 'number') {
      const num = parseInt(value)
      result[key] = Math.min(
        Math.max(num, config.min || 0),
        config.max || Number.MAX_SAFE_INTEGER
      )
    } else if (config.type === 'enum') {
      result[key] = (config.default as string[]).includes(value)
        ? value
        : config.default
    }
  }

  return result
}

/**
 * Log unauthorized access attempt
 *
 * Usage in server action or middleware:
 * ```
 * logUnauthorizedAccess(user.id, 'notifications_api', {
 *   attempted_user_id: queryParam,
 *   reason: 'Resource owner mismatch'
 * })
 * ```
 */
export async function logUnauthorizedAccess(
  userId: string,
  resource: string,
  details: Record<string, any>,
  supabase?: any
): Promise<void> {
  try {
    if (!supabase) {
      const { createClient } = await import('@/lib/supabase/server')
      supabase = createClient()
    }

    await supabase
      .from('activity_logs')
      .insert({
        lead_id: null,
        actor_id: userId,
        type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        content: JSON.stringify({
          resource,
          details,
          timestamp: new Date().toISOString(),
        }),
      })
      .catch(() => {}) // Silent fail on logging errors
  } catch (err) {
    // Log locally if DB logging fails
    console.warn('[logUnauthorizedAccess] Failed to log attempt:', err)
  }
}
