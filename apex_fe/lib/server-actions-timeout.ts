/**
 * Server Actions Timeout Protection
 * Phase 10 MEDIUM #14: Wrap all server actions with configurable timeouts
 *
 * Prevents server actions from hanging indefinitely due to slow queries,
 * external API calls, or network issues. Implements graceful timeout handling
 * with clear error messages and automatic logging.
 */

/**
 * Timeout configuration presets for different action types
 */
export const TIMEOUT_PRESETS = {
  // Fast operations: auth, simple updates
  FAST: {
    timeoutMs: 5000, // 5 seconds
    description: 'Fast operations (auth, simple updates)',
  },

  // Standard operations: form submissions, queries with joins
  STANDARD: {
    timeoutMs: 15000, // 15 seconds
    description: 'Standard operations (form submissions, queries)',
  },

  // Slow operations: file uploads, complex calculations, external API calls
  SLOW: {
    timeoutMs: 30000, // 30 seconds
    description: 'Slow operations (uploads, complex calculations)',
  },

  // Very slow operations: bulk operations, migrations, heavy analysis
  VERY_SLOW: {
    timeoutMs: 60000, // 60 seconds
    description: 'Very slow operations (bulk ops, heavy analysis)',
  },

  // Database-specific: suited for database operations
  DATABASE: {
    timeoutMs: 20000, // 20 seconds
    description: 'Database operations with indexes',
  },

  // External API calls: account for network latency
  EXTERNAL_API: {
    timeoutMs: 25000, // 25 seconds
    description: 'External API calls with retries',
  },
}

export type TimeoutPresetKey = keyof typeof TIMEOUT_PRESETS

/**
 * Custom error for timeout violations
 */
export class TimeoutError extends Error {
  constructor(
    actionName: string,
    timeoutMs: number,
    public readonly isTimeout: boolean = true
  ) {
    super(
      `Server action "${actionName}" exceeded timeout of ${timeoutMs}ms. ` +
        'This operation took too long. Please try again, or contact support if the issue persists.'
    )
    this.name = 'TimeoutError'
  }
}

/**
 * Wraps a server action with timeout protection
 *
 * @param fn The async server action function
 * @param timeoutMs Timeout in milliseconds (or preset key)
 * @param actionName Name of the action (for logging/errors)
 * @returns The wrapped function with timeout protection
 *
 * @example
 * // Using milliseconds
 * export const myAction = withTimeout(
 *   async (formData) => { ... },
 *   15000,
 *   'myAction'
 * )
 *
 * @example
 * // Using preset
 * export const myAction = withTimeout(
 *   async (formData) => { ... },
 *   'STANDARD',
 *   'myAction'
 * )
 */
export function withTimeout<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  timeoutMs: number | TimeoutPresetKey,
  actionName: string
): (...args: TArgs) => Promise<TReturn> {
  // Resolve preset or use raw milliseconds
  const resolvedTimeoutMs =
    typeof timeoutMs === 'string'
      ? TIMEOUT_PRESETS[timeoutMs].timeoutMs
      : timeoutMs

  return async (...args: TArgs): Promise<TReturn> => {
    const startTime = Date.now()

    return Promise.race([
      // Execute the function
      (async () => {
        try {
          const result = await fn(...args)
          const duration = Date.now() - startTime

          // Warn if close to timeout (>80%)
          if (duration > resolvedTimeoutMs * 0.8) {
            console.warn(
              `[ACTION_SLOW] "${actionName}" took ${duration}ms (timeout: ${resolvedTimeoutMs}ms)`
            )
          }

          return result
        } catch (error) {
          const duration = Date.now() - startTime
          console.error(`[ACTION_ERROR] "${actionName}" failed after ${duration}ms:`, error)
          throw error
        }
      })(),

      // Timeout promise
      new Promise<TReturn>((_, reject) => {
        setTimeout(() => {
          const duration = Date.now() - startTime
          console.error(
            `[ACTION_TIMEOUT] "${actionName}" timed out after ${duration}ms (limit: ${resolvedTimeoutMs}ms)`
          )
          reject(new TimeoutError(actionName, resolvedTimeoutMs))
        }, resolvedTimeoutMs)
      }),
    ])
  }
}

/**
 * Decorator-style timeout wrapper for use with class methods
 * Primarily for reference; Next.js server actions typically use function exports
 */
export function Timeout(preset: TimeoutPresetKey = 'STANDARD') {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      return withTimeout(originalMethod.bind(this), preset, propertyKey)(
        ...args
      )
    }

    return descriptor
  }
}

/**
 * Abort-based timeout for more granular control
 * Useful when the action needs to handle cancellation
 */
export function withAbortTimeout<TArgs extends any[], TReturn>(
  fn: (
    signal: AbortSignal,
    ...args: TArgs
  ) => Promise<TReturn>,
  timeoutMs: number | TimeoutPresetKey,
  actionName: string
): (...args: TArgs) => Promise<TReturn> {
  const resolvedTimeoutMs =
    typeof timeoutMs === 'string'
      ? TIMEOUT_PRESETS[timeoutMs].timeoutMs
      : timeoutMs

  return async (...args: TArgs): Promise<TReturn> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.error(
        `[ACTION_TIMEOUT] "${actionName}" exceeded ${resolvedTimeoutMs}ms, aborting`
      )
      controller.abort()
    }, resolvedTimeoutMs)

    try {
      const result = await fn(controller.signal, ...args)
      clearTimeout(timeoutId)
      return result
    } catch (error) {
      clearTimeout(timeoutId)

      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.includes('abort'))
      ) {
        throw new TimeoutError(actionName, resolvedTimeoutMs)
      }

      throw error
    }
  }
}

/**
 * Timeout wrapper with automatic retries
 * Retries the action if it times out (with exponential backoff)
 */
export function withTimeoutAndRetry<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  timeoutMs: number | TimeoutPresetKey,
  actionName: string,
  maxRetries: number = 2
): (...args: TArgs) => Promise<TReturn> {
  const resolvedTimeoutMs =
    typeof timeoutMs === 'string'
      ? TIMEOUT_PRESETS[timeoutMs].timeoutMs
      : timeoutMs

  return async (...args: TArgs): Promise<TReturn> => {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now()

        const result = await Promise.race([
          fn(...args),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new TimeoutError(actionName, resolvedTimeoutMs))
            }, resolvedTimeoutMs)
          }),
        ])

        const duration = Date.now() - startTime
        if (attempt > 0) {
          console.info(
            `[ACTION_RETRY_SUCCESS] "${actionName}" succeeded on attempt ${attempt + 1} after ${duration}ms`
          )
        }

        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < maxRetries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000) // Exponential backoff, max 10s
          console.warn(
            `[ACTION_RETRY] "${actionName}" attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`
          )
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    console.error(
      `[ACTION_TIMEOUT_FINAL] "${actionName}" failed after ${maxRetries + 1} attempts`
    )
    throw lastError
  }
}

/**
 * Get detailed metrics about action execution
 * Can be used for monitoring and alerting
 */
export interface ActionMetrics {
  actionName: string
  startTime: number
  endTime?: number
  duration?: number
  timeoutMs: number
  status: 'pending' | 'success' | 'timeout' | 'error'
  error?: string
}

/**
 * Advanced timeout wrapper with metrics collection
 */
export function withTimeoutAndMetrics<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  timeoutMs: number | TimeoutPresetKey,
  actionName: string,
  onMetrics?: (metrics: ActionMetrics) => void
): (...args: TArgs) => Promise<TReturn> {
  const resolvedTimeoutMs =
    typeof timeoutMs === 'string'
      ? TIMEOUT_PRESETS[timeoutMs].timeoutMs
      : timeoutMs

  return async (...args: TArgs): Promise<TReturn> => {
    const metrics: ActionMetrics = {
      actionName,
      startTime: Date.now(),
      timeoutMs: resolvedTimeoutMs,
      status: 'pending',
    }

    try {
      const result = await Promise.race([
        fn(...args),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            metrics.status = 'timeout'
            reject(new TimeoutError(actionName, resolvedTimeoutMs))
          }, resolvedTimeoutMs)
        }),
      ])

      metrics.endTime = Date.now()
      metrics.duration = metrics.endTime - metrics.startTime
      metrics.status = 'success'

      onMetrics?.(metrics)
      return result
    } catch (error) {
      metrics.endTime = Date.now()
      metrics.duration = metrics.endTime - metrics.startTime
      metrics.status = error instanceof TimeoutError ? 'timeout' : 'error'
      metrics.error = error instanceof Error ? error.message : String(error)

      onMetrics?.(metrics)
      throw error
    }
  }
}

/**
 * Helper to compose multiple wrappers
 * Enables combining timeout, retries, metrics, and custom logic
 *
 * @example
 * export const myAction = compose(
 *   withTimeout('STANDARD', 'myAction'),
 *   withRetry({ maxAttempts: 2 }),
 *   // Original function last
 *   async (formData) => { ... }
 * )
 */
export function composeMiddleware<TArgs extends any[], TReturn>(
  ...middlewares: Array<
    (fn: (...args: TArgs) => Promise<TReturn>) => (...args: TArgs) => Promise<TReturn>
  >
): (fn: (...args: TArgs) => Promise<TReturn>) => (...args: TArgs) => Promise<TReturn> {
  return (fn: (...args: TArgs) => Promise<TReturn>) => {
    return middlewares.reduceRight((wrapped, middleware) => middleware(wrapped), fn)
  }
}
