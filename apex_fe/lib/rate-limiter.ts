/**
 * In-memory rate limiter for server actions.
 * 
 * Design notes:
 * - Uses Map<key, bucket> for O(1) lookups
 * - Tracks (count, reset_time) per key
 * - Supports custom window durations and max attempts
 * - Suitable for production with <10k concurrent keys; for larger scale,
 *   replace with Redis (e.g., @upstash/ratelimit)
 * 
 * Usage:
 *   const limiter = new RateLimiter({ 
 *     windowMs: 15 * 60 * 1000,  // 15 minutes
 *     maxAttempts: 10
 *   })
 *   
 *   if (!limiter.check(clientIp)) {
 *     return { status: 'error', message: 'Too many attempts. Please try again later.' }
 *   }
 */

export interface RateLimiterOptions {
  windowMs: number      // Window duration in milliseconds
  maxAttempts: number   // Max attempts per window
}

interface BucketEntry {
  count: number
  resetAt: number
}

export class RateLimiter {
  private buckets: Map<string, BucketEntry> = new Map()
  private windowMs: number
  private maxAttempts: number
  private cleanupIntervalId?: NodeJS.Timeout

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs
    this.maxAttempts = options.maxAttempts

    // Cleanup old entries every 10 minutes to prevent memory leak
    this.cleanupIntervalId = setInterval(() => this.cleanup(), 10 * 60 * 1000)
  }

  /**
   * Check if the key is within rate limit.
   * Returns true if allowed, false if rate-limited.
   */
  check(key: string): boolean {
    const now = Date.now()
    const bucket = this.buckets.get(key)

    if (!bucket || now >= bucket.resetAt) {
      // Create new bucket or reset expired one
      this.buckets.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      })
      return true
    }

    if (bucket.count >= this.maxAttempts) {
      return false
    }

    bucket.count++
    return true
  }

  /**
   * Get remaining attempts for a key.
   * Useful for showing rate limit info to the user.
   */
  getRemaining(key: string): number {
    const now = Date.now()
    const bucket = this.buckets.get(key)

    if (!bucket || now >= bucket.resetAt) {
      return this.maxAttempts
    }

    return Math.max(0, this.maxAttempts - bucket.count)
  }

  /**
   * Get reset time (in seconds) for a key.
   */
  getResetIn(key: string): number {
    const now = Date.now()
    const bucket = this.buckets.get(key)

    if (!bucket || now >= bucket.resetAt) {
      return 0
    }

    return Math.ceil((bucket.resetAt - now) / 1000)
  }

  /**
   * Clean up expired entries to prevent memory leak.
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, bucket] of this.buckets.entries()) {
      if (now >= bucket.resetAt) {
        this.buckets.delete(key)
      }
    }
  }

  /**
   * Destroy the rate limiter (clear intervals).
   */
  destroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
    }
    this.buckets.clear()
  }
}

// Singleton instance for the lookup endpoint
// 15-minute window, max 10 attempts per IP
export const statusLookupLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
})

// Singleton instance for the upload endpoint
// 15-minute window, max 5 uploads per IP (conservative)
export const statusUploadLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
})
