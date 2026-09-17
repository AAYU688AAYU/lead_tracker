/**
 * Retry Logic with Exponential Backoff
 *
 * Phase 10 #10: Improve edge function error handling with retry logic
 *
 * Provides:
 * - Configurable retry attempts
 * - Exponential backoff algorithm
 * - Jitter to prevent thundering herd
 * - Circuit breaker pattern
 * - Error classification (retryable vs permanent)
 */

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number          // Total attempts (including first)
  initialDelayMs: number       // First backoff delay in milliseconds
  maxDelayMs: number           // Maximum backoff delay
  backoffMultiplier: number    // Exponential backoff factor
  jitterFraction: number       // Jitter as fraction of delay (0-1)
  timeout?: number             // Per-attempt timeout in milliseconds
}

/**
 * Standard retry presets for common scenarios
 */
export const RETRY_PRESETS = {
  // Aggressive: Quick retries for transient failures
  AGGRESSIVE: {
    maxAttempts: 2,
    initialDelayMs: 50,
    maxDelayMs: 500,
    backoffMultiplier: 2,
    jitterFraction: 0.1,
  },

  // Moderate: Balanced approach for external APIs
  MODERATE: {
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 2000,
    backoffMultiplier: 2,
    jitterFraction: 0.2,
  },

  // Conservative: Patient retries for unreliable services
  CONSERVATIVE: {
    maxAttempts: 5,
    initialDelayMs: 200,
    maxDelayMs: 10000,
    backoffMultiplier: 2.5,
    jitterFraction: 0.3,
  },

  // Database: For database connection failures
  DATABASE: {
    maxAttempts: 4,
    initialDelayMs: 50,
    maxDelayMs: 1000,
    backoffMultiplier: 2,
    jitterFraction: 0.15,
  },

  // External API: For Resend, Twilio, etc.
  EXTERNAL_API: {
    maxAttempts: 3,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    jitterFraction: 0.25,
  },
}

/**
 * Classify errors as retryable or permanent
 *
 * RETRYABLE:
 * - Network timeouts
 * - 429 (Rate Limited)
 * - 502/503/504 (Server errors)
 * - Connection errors
 *
 * PERMANENT:
 * - 400/401/403/404 (Client errors)
 * - 422 (Validation error)
 * - Invalid configuration
 */
export function isRetryableError(error: unknown): boolean {
  // Network/timeout errors are retryable
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Timeout, connection refused, etc.
    if (
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('enetunreach') ||
      message.includes('ehostunreach') ||
      message.includes('temporarily unavailable') ||
      message.includes('service unavailable')
    ) {
      return true
    }

    // Resource exhausted
    if (message.includes('too many') || message.includes('quota')) {
      return true
    }
  }

  // HTTP status codes
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as Record<string, unknown>).status

    if (typeof status === 'number') {
      // Rate limiting
      if (status === 429) return true
      // Server errors (temporary)
      if (status >= 500 && status <= 599) return true
      // Client errors (permanent) — don't retry
      if (status >= 400 && status <= 499) return false
    }
  }

  // Unknown errors default to retryable to be safe
  return true
}

/**
 * Calculate delay with exponential backoff and jitter
 *
 * Formula: min(initialDelay * (multiplier ^ attempt) + random_jitter, maxDelay)
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt)

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs)

  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * config.jitterFraction * Math.random()
  const finalDelay = cappedDelay + jitter

  return Math.round(finalDelay)
}

/**
 * Sleep helper for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute function with retry logic
 *
 * USAGE:
 * ```typescript
 * const result = await retry(
 *   () => fetchFromExternalAPI(),
 *   RETRY_PRESETS.EXTERNAL_API
 * )
 * ```
 *
 * ADVANCED:
 * ```typescript
 * const result = await retry(
 *   async () => {
 *     const response = await fetch(url)
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`)
 *     return response.json()
 *   },
 *   {
 *     maxAttempts: 3,
 *     initialDelayMs: 100,
 *     maxDelayMs: 2000,
 *     backoffMultiplier: 2,
 *     jitterFraction: 0.2,
 *     timeout: 5000,
 *   },
 *   (error, attempt) => {
 *     console.log(`Attempt ${attempt} failed: ${error.message}`)
 *   }
 * )
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = RETRY_PRESETS.MODERATE,
  onRetry?: (error: Error, attempt: number) => void
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      // Create promise for the function execution
      const executionPromise = fn()

      // Add timeout if configured
      const result = config.timeout
        ? await Promise.race([
            executionPromise,
            sleep(config.timeout).then(() => {
              throw new Error(`Operation timeout after ${config.timeout}ms`)
            }),
          ])
        : await executionPromise

      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if error is retryable
      if (!isRetryableError(error)) {
        // Permanent error, don't retry
        throw lastError
      }

      // Last attempt, don't retry
      if (attempt === config.maxAttempts - 1) {
        break
      }

      // Retry with backoff
      const delay = calculateBackoffDelay(attempt, config)

      if (onRetry) {
        onRetry(lastError, attempt + 1)
      }

      await sleep(delay)
    }
  }

  // All retries exhausted
  throw lastError || new Error('Retry exhausted with unknown error')
}

/**
 * Circuit breaker for preventing cascading failures
 *
 * USAGE:
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   failureThreshold: 5,
 *   successThreshold: 3,
 *   timeout: 60000,
 * })
 *
 * try {
 *   const result = await breaker.execute(() => externalCall())
 * } catch (error) {
 *   if (error.message.includes('Circuit breaker is OPEN')) {
 *     // Service is down, use fallback
 *   }
 * }
 * ```
 */
export class CircuitBreaker {
  private failureCount = 0
  private successCount = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  private lastFailureTime: number | null = null

  constructor(
    private config: {
      failureThreshold: number  // Failures before opening
      successThreshold: number  // Successes before closing (half-open)
      timeout: number           // Milliseconds before retrying (OPEN -> HALF_OPEN)
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // If circuit is OPEN, check if timeout has passed
    if (this.state === 'OPEN') {
      const now = Date.now()
      if (
        this.lastFailureTime &&
        now - this.lastFailureTime > this.config.timeout
      ) {
        this.state = 'HALF_OPEN'
        this.successCount = 0
        console.log('[CircuitBreaker] Entering HALF_OPEN state')
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await fn()

      // Success
      if (this.state === 'HALF_OPEN') {
        this.successCount++
        if (this.successCount >= this.config.successThreshold) {
          this.state = 'CLOSED'
          this.failureCount = 0
          this.successCount = 0
          console.log('[CircuitBreaker] Recovered to CLOSED state')
        }
      } else if (this.state === 'CLOSED') {
        this.failureCount = Math.max(0, this.failureCount - 1)
      }

      return result
    } catch (error) {
      // Failure
      this.failureCount++
      this.lastFailureTime = Date.now()

      if (this.state === 'HALF_OPEN') {
        // Reopen on half-open failure
        this.state = 'OPEN'
        console.log('[CircuitBreaker] Reopening circuit after half-open failure')
      } else if (
        this.state === 'CLOSED' &&
        this.failureCount >= this.config.failureThreshold
      ) {
        // Open on threshold
        this.state = 'OPEN'
        console.log('[CircuitBreaker] Opening circuit after failures')
      }

      throw error
    }
  }

  getState(): string {
    return `${this.state} (failures: ${this.failureCount}, successes: ${this.successCount})`
  }

  reset(): void {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = null
  }
}

/**
 * Retry decorator for methods
 *
 * USAGE (if using TypeScript decorators):
 * ```typescript
 * class ExternalAPI {
 *   @RetryDecorator(RETRY_PRESETS.EXTERNAL_API)
 *   async fetchData() { /* ... */ }
 * }
 * ```
 */
export function RetryDecorator(config: RetryConfig = RETRY_PRESETS.MODERATE) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      return retry(
        () => originalMethod.apply(this, args),
        config,
        (error, attempt) => {
          console.log(`[${propertyKey}] Attempt ${attempt}: ${error.message}`)
        }
      )
    }

    return descriptor
  }
}
