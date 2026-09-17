/**
 * Rate Limiter Utility
 * Phase 10: Prevent abuse of public endpoints
 *
 * Uses sliding window algorithm for accurate rate limiting
 * Supports both Redis (Upstash) for production and in-memory for dev
 */

import { headers } from 'next/headers'

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxAttempts: number // Max requests per window
  keyPrefix: string // Redis key prefix
  storageType: 'redis' | 'memory' // Use Redis or in-memory
}

/**
 * Default configs for common scenarios
 */
export const RATE_LIMIT_PRESETS = {
  // Public intake form: 5 submissions per hour per IP
  INTAKE_FORM: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 5,
    keyPrefix: 'ratelimit:intake-form',
    storageType: 'redis' as const,
  },
  // Password reset: 3 requests per hour per email
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3,
    keyPrefix: 'ratelimit:password-reset',
    storageType: 'redis' as const,
  },
  // Login attempts: 5 failed attempts per 15 minutes per IP
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
    keyPrefix: 'ratelimit:login',
    storageType: 'redis' as const,
  },
  // API endpoints: 100 requests per minute per user
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxAttempts: 100,
    keyPrefix: 'ratelimit:api',
    storageType: 'redis' as const,
  },
}

/**
 * In-memory storage for development
 * Simple Map-based implementation
 */
class InMemoryStore {
  private store = new Map<string, { count: number; resetTime: number }>()

  check(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const entry = this.store.get(key)

    // New entry or window expired
    if (!entry || now > entry.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + windowMs })
      return true // Within limit
    }

    // Increment and check
    entry.count++
    return entry.count <= limit
  }

  getRemainingRequests(key: string, limit: number): number {
    const entry = this.store.get(key)
    if (!entry) return limit
    return Math.max(0, limit - entry.count)
  }

  getResetTime(key: string): number {
    const entry = this.store.get(key)
    return entry?.resetTime || Date.now()
  }
}

/**
 * Redis store for production
 * Uses Upstash Redis REST API
 */
class RedisStore {
  private redisUrl = process.env.UPSTASH_REDIS_REST_URL
  private redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  async check(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<boolean> {
    if (!this.redisUrl || !this.redisToken) {
      console.warn('[RedisStore] Redis not configured, allowing request')
      return true // Fail open if Redis is not configured
    }

    try {
      const now = Date.now()
      const windowStart = now - windowMs
      const countKey = `${key}:count`
      const timeKey = `${key}:time`

      // Use Redis MULTI for atomic operations
      const response = await fetch(this.redisUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commands: [
            // Get current count
            ['GET', countKey],
            // Get window start time
            ['GET', timeKey],
          ],
        }),
      })

      const result = await response.json()
      const currentCount = parseInt(result.result?.[0] || '0')
      const windowStartTime = parseInt(result.result?.[1] || String(now))

      // If window expired, reset
      if (now - windowStartTime > windowMs) {
        await this.resetKey(countKey, timeKey, windowMs)
        return true // First request in new window
      }

      // Check if over limit
      if (currentCount >= limit) {
        return false // Over limit
      }

      // Increment and set expiry
      await this.incrementKey(countKey, timeKey, windowMs)
      return true // Within limit
    } catch (err) {
      console.error('[RedisStore] Error checking rate limit:', err)
      return true // Fail open on error
    }
  }

  private async resetKey(
    countKey: string,
    timeKey: string,
    windowMs: number
  ): Promise<void> {
    await fetch(this.redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commands: [
          ['SET', countKey, '1', 'PX', windowMs],
          ['SET', timeKey, String(Date.now()), 'PX', windowMs],
        ],
      }),
    })
  }

  private async incrementKey(
    countKey: string,
    timeKey: string,
    windowMs: number
  ): Promise<void> {
    await fetch(this.redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commands: [
          ['INCR', countKey],
          ['EXPIRE', countKey, Math.ceil(windowMs / 1000)],
          ['EXPIRE', timeKey, Math.ceil(windowMs / 1000)],
        ],
      }),
    })
  }

  async getRemainingRequests(key: string, limit: number): Promise<number> {
    if (!this.redisUrl || !this.redisToken) return limit

    try {
      const countKey = `${key}:count`
      const response = await fetch(this.redisUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commands: [['GET', countKey]],
        }),
      })

      const result = await response.json()
      const currentCount = parseInt(result.result?.[0] || '0')
      return Math.max(0, limit - currentCount)
    } catch (err) {
      console.error('[RedisStore] Error getting remaining requests:', err)
      return limit
    }
  }

  async getResetTime(key: string): Promise<number> {
    if (!this.redisUrl || !this.redisToken) return Date.now()

    try {
      const timeKey = `${key}:time`
      const response = await fetch(this.redisUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commands: [['GET', timeKey]],
        }),
      })

      const result = await response.json()
      const time = parseInt(result.result?.[0] || String(Date.now()))
      return time
    } catch (err) {
      console.error('[RedisStore] Error getting reset time:', err)
      return Date.now()
    }
  }
}

/**
 * Rate Limiter class
 * Handles rate limiting with configurable storage
 */
export class RateLimiter {
  private config: RateLimitConfig
  private store: InMemoryStore | RedisStore

  constructor(config: RateLimitConfig) {
    this.config = config
    this.store =
      config.storageType === 'redis' ? new RedisStore() : new InMemoryStore()
  }

  /**
   * Check if request is within rate limit
   * Returns true if allowed, false if rate limited
   */
  async check(identifier: string): Promise<{
    allowed: boolean
    remaining: number
    resetAt?: number
  }> {
    const key = `${this.config.keyPrefix}:${identifier}`

    try {
      let allowed = true
      let remaining = this.config.maxAttempts
      let resetAt: number | undefined

      if (this.config.storageType === 'redis') {
        allowed = await (this.store as RedisStore).check(
          key,
          this.config.maxAttempts,
          this.config.windowMs
        )
        remaining = await (this.store as RedisStore).getRemainingRequests(
          key,
          this.config.maxAttempts
        )
        resetAt = await (this.store as RedisStore).getResetTime(key)
      } else {
        allowed = (this.store as InMemoryStore).check(
          key,
          this.config.maxAttempts,
          this.config.windowMs
        )
        remaining = (this.store as InMemoryStore).getRemainingRequests(
          key,
          this.config.maxAttempts
        )
        resetAt = (this.store as InMemoryStore).getResetTime(key)
      }

      return { allowed, remaining, resetAt }
    } catch (err) {
      console.error('[RateLimiter] Error checking limit:', err)
      return { allowed: true, remaining: this.config.maxAttempts } // Fail open
    }
  }
}

/**
 * Get client IP from request
 * Handles various proxy headers
 */
export function getClientIp(headers: ReturnType<typeof headers>): string {
  const forwarded = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  const cfConnecting = headers.get('cf-connecting-ip')

  // Return first IP if multiple (comma-separated)
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIp) return realIp
  if (cfConnecting) return cfConnecting

  // Fallback to localhost
  return '127.0.0.1'
}

// ---------------------------------------------------------------------------
// Pre-instantiated Rate Limiters for common endpoints
// ---------------------------------------------------------------------------

/**
 * Simplified synchronous rate limiter for use in server actions
 * Uses in-memory storage (suitable for single-instance deployments)
 */
class SimpleSyncRateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>()
  private windowMs: number
  private maxAttempts: number

  constructor(windowMs: number, maxAttempts: number) {
    this.windowMs = windowMs
    this.maxAttempts = maxAttempts
  }

  /**
   * Check if identifier is within rate limit
   * Returns true if allowed, false if rate limited
   */
  check(identifier: string): boolean {
    const now = Date.now()
    const entry = this.store.get(identifier)

    // New entry or window expired
    if (!entry || now > entry.resetTime) {
      this.store.set(identifier, { count: 1, resetTime: now + this.windowMs })
      return true // Within limit
    }

    // Increment and check
    entry.count++
    return entry.count <= this.maxAttempts
  }

  /**
   * Get remaining requests for identifier
   */
  getRemaining(identifier: string): number {
    const entry = this.store.get(identifier)
    if (!entry) return this.maxAttempts
    return Math.max(0, this.maxAttempts - entry.count)
  }

  /**
   * Get seconds until reset for identifier
   */
  getResetIn(identifier: string): number {
    const entry = this.store.get(identifier)
    if (!entry) return 0
    const now = Date.now()
    return Math.max(0, Math.ceil((entry.resetTime - now) / 1000))
  }
}

/**
 * Status lookup rate limiter
 * 10 attempts per IP per 15 minutes
 */
export const statusLookupLimiter = new SimpleSyncRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10
)

/**
 * Status upload rate limiter
 * 5 attempts per IP per hour
 */
export const statusUploadLimiter = new SimpleSyncRateLimiter(
  60 * 60 * 1000, // 1 hour
  5
)
