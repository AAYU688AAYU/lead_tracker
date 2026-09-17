/**
 * JWT Role Extraction Utilities
 *
 * Phase 10 Optimization: Extract user role from JWT custom claims instead of
 * making database queries. Provides graceful fallback to DB query if claims
 * are not available.
 *
 * OPTIMIZATION: Removes database query from middleware path
 * - Middleware: 1 query → 0 queries (JWT claims only)
 * - Fallback: DB query only if JWT claims missing
 */

import type { User } from '@supabase/supabase-js'

export type UserRole = 'student' | 'consultant' | 'admin' | 'super_admin'

/**
 * Extract user role from JWT custom claims in user metadata
 *
 * This is the primary method — no database query required.
 * Used in middleware and edge functions where DB access is expensive.
 *
 * PERFORMANCE: O(1) — direct object property access
 *
 * @param user - Supabase Auth User object
 * @returns Role from JWT claims, or null if not found
 */
export function getRoleFromJwtClaims(user: User | null): UserRole | null {
  if (!user) return null

  // JWT custom claims are stored in user_metadata.role
  const role = user.user_metadata?.role

  if (!role || !isValidRole(role)) {
    return null
  }

  return role as UserRole
}

/**
 * Type guard for validating user role strings
 *
 * @param value - Value to validate
 * @returns True if value is a valid UserRole
 */
function isValidRole(value: unknown): value is UserRole {
  const validRoles: UserRole[] = ['student', 'consultant', 'admin', 'super_admin']
  return typeof value === 'string' && validRoles.includes(value as UserRole)
}

/**
 * Fallback: Get role from database if JWT claims are missing
 *
 * This should only be called if JWT claims are not available.
 * Use in server components/actions where DB access is acceptable.
 *
 * PERFORMANCE: O(1) with index — much faster than full table scan
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @returns Role from database, or null if not found
 */
export async function getRoleFromDatabase(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.warn('[jwt-utils] Failed to fetch role from database:', error)
      return null
    }

    const role = data.role
    if (!isValidRole(role)) {
      console.warn('[jwt-utils] Invalid role from database:', role)
      return null
    }

    return role as UserRole
  } catch (err) {
    console.error('[jwt-utils] Error fetching role from database:', err)
    return null
  }
}

/**
 * Get user role with graceful fallback
 *
 * PRIMARY FLOW (Middleware):
 * 1. Try JWT claims first (O(1), no DB query)
 * 2. If missing, fallback to database query (O(1) with index)
 * 3. If both fail, return null
 *
 * This ensures:
 * - Fast path for most requests (JWT claims present)
 * - Graceful degradation if JWT claims missing (rare edge cases)
 * - Never blocks on slow database query for authenticated users
 *
 * @param user - Supabase Auth User
 * @param supabase - Supabase client (optional, for fallback)
 * @returns Role from JWT or database
 */
export async function getUserRole(
  user: User | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any,
): Promise<UserRole | null> {
  if (!user) return null

  // PRIMARY: Try JWT claims first (no DB query)
  const jwtRole = getRoleFromJwtClaims(user)
  if (jwtRole) {
    return jwtRole
  }

  // FALLBACK: If JWT claims missing and DB client provided
  if (supabase) {
    console.debug('[jwt-utils] JWT role missing, falling back to database')
    return getRoleFromDatabase(supabase, user.id)
  }

  // No role found in either source
  console.warn('[jwt-utils] Could not determine user role from JWT or database')
  return null
}

/**
 * Dashboard routing helper
 *
 * Returns the appropriate dashboard path for a given role.
 * Extracted to separate function for reusability.
 *
 * @param role - User role
 * @returns Dashboard URL path
 */
export function getDashboardPathForRole(role: UserRole | null): string {
  switch (role) {
    case 'consultant':
      return '/dashboard/consultant'
    case 'admin':
    case 'super_admin':
      return '/dashboard/admin'
    case 'student':
    default:
      return '/dashboard/student'
  }
}

/**
 * Check if user has admin access
 *
 * @param role - User role
 * @returns True if role is admin or super_admin
 */
export function isAdmin(role: UserRole | null): boolean {
  return role === 'admin' || role === 'super_admin'
}

/**
 * Check if user has consultant access
 *
 * @param role - User role
 * @returns True if role is consultant or admin or super_admin
 */
export function isConsultant(role: UserRole | null): boolean {
  return role === 'consultant' || isAdmin(role)
}
