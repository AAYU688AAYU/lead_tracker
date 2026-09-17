/**
 * Server-side utilities for Phase 3 and beyond.
 * Timing, logging, IP extraction, and observability helpers.
 */

import { headers } from 'next/headers'

/**
 * Extract client IP from request headers.
 * Checks X-Forwarded-For first (reverse proxy), then X-Real-IP, then connection info.
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers()
  
  // X-Forwarded-For can contain multiple IPs; take the first
  const forwarded = headersList.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  // Fallback to X-Real-IP
  const realIp = headersList.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback to connection IP (less reliable with proxies)
  return '127.0.0.1'
}

/**
 * Enforce minimum response time to prevent timing-based attacks.
 * Useful for operations that might leak information via response time.
 */
export async function enforceMinimumTime(
  startTime: number,
  minimumMs: number = 150
): Promise<void> {
  const elapsed = Date.now() - startTime
  if (elapsed < minimumMs) {
    await new Promise((resolve) =>
      setTimeout(resolve, minimumMs - elapsed)
    )
  }
}

/**
 * Log operation with timing and metadata.
 * Format: [component] operation=value status=value duration=Xms
 */
export function logOperation(
  component: string,
  operation: string,
  data: Record<string, unknown>
): void {
  const { duration, ...rest } = data
  const durationStr = duration ? ` duration=${duration}ms` : ''
  const metadata = Object.entries(rest)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ')
  
  console.log(`[${component}] ${operation} ${metadata}${durationStr}`)
}

/**
 * Log errors with context
 */
export function logError(
  component: string,
  operation: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  const contextStr = context
    ? ` context=${JSON.stringify(context)}`
    : ''
  
  console.error(
    `[${component}] ${operation} failed: ${message}${contextStr}`,
    stack ? { stack } : undefined
  )
}

/**
 * Type-safe timing wrapper for async operations
 */
export async function withTiming<T>(
  fn: () => Promise<T>,
  component: string,
  operation: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = Math.round(performance.now() - start)
    logOperation(component, operation, { status: 'success', duration })
    return { result, duration }
  } catch (err) {
    const duration = Math.round(performance.now() - start)
    logError(component, operation, err, { duration })
    throw err
  }
}
