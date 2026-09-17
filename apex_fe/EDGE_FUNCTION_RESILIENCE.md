# Edge Function Resilience & Error Handling — Phase 10 #10

## Overview

This document outlines the resilience patterns and error handling improvements for Supabase edge functions.

**Goal:** Ensure edge functions gracefully handle transient failures and prevent cascading outages:
- Retry logic with exponential backoff
- Circuit breaker pattern
- Timeout protection
- Error classification (retryable vs permanent)
- Graceful degradation on partial failures

## Problem Statement

**Before (Phase 9):**
```typescript
// Single attempt, no retry
const response = await fetch("https://api.resend.com/emails", { /* ... */ })
if (!response.ok) {
  throw new Error(`Resend API error`)
}
// If Resend has momentary network issue → failure
```

**Issues:**
- Transient network errors cause immediate failure
- External API rate limits (429) not retried
- No protection against cascading failures
- No timeout protection (hung requests)
- Retry logic scattered across functions

## Solution

### 1. Centralized Retry Utility (`_shared/retry.ts`)

Created reusable retry logic at `supabase/functions/_shared/retry.ts`:

#### Retry Function

```typescript
// Basic usage with presets
const result = await retry(
  () => externalAPI.call(),
  RETRY_PRESETS.EXTERNAL_API  // 3 attempts, exp backoff, jitter
)

// Advanced usage with custom config
const result = await retry(
  () => fetch(url),
  {
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 2000,
    backoffMultiplier: 2,
    jitterFraction: 0.2,
    timeout: 5000,  // 5 second timeout per attempt
  },
  (error, attempt) => {
    console.log(`Attempt ${attempt} failed: ${error.message}`)
  }
)
```

#### Retry Presets

```typescript
RETRY_PRESETS.AGGRESSIVE        // 2 attempts, fast (50-500ms)
RETRY_PRESETS.MODERATE          // 3 attempts, balanced (100-2000ms)
RETRY_PRESETS.CONSERVATIVE      // 5 attempts, patient (200-10000ms)
RETRY_PRESETS.DATABASE          // 4 attempts for DB (50-1000ms)
RETRY_PRESETS.EXTERNAL_API      // 3 attempts for APIs (500-5000ms)
```

#### Exponential Backoff Algorithm

```
delay = min(initialDelay * (multiplier ^ attempt) + jitter, maxDelay)

Example (MODERATE preset):
  Attempt 1: 100ms + jitter
  Attempt 2: 200ms + jitter (after first failure)
  Attempt 3: 400ms + jitter (after second failure, capped at 2000ms)
```

**Benefits:**
- Spreads retries over time
- Reduces thundering herd (jitter randomizes timing)
- Exponential backoff gives slow services time to recover
- Timeout prevents hung requests

### 2. Circuit Breaker Pattern

```typescript
const breaker = new CircuitBreaker({
  failureThreshold: 5,      // Open after 5 failures
  successThreshold: 3,      // Close after 3 successes (half-open)
  timeout: 60000,           // 1 minute before retrying
})

// Use in edge function
try {
  const result = await breaker.execute(() => externalAPI.call())
} catch (error) {
  if (error.message.includes('Circuit breaker is OPEN')) {
    // Service is down, use fallback
    return sendLocalFallback()
  }
}
```

#### States

```
CLOSED (normal)    → failures → OPEN (fail fast)
                   ↓
            timeout passes
                   ↓
HALF_OPEN         → successes → CLOSED
(test mode)        → failure → OPEN
```

**Benefits:**
- Fails fast when external service is down
- Prevents wasting retries on dead services
- Auto-recovers after timeout
- Protects downstream systems

### 3. Error Classification

```typescript
isRetryableError(error)  // true/false

RETRYABLE:
- Network timeouts
- 429 (Rate Limited)
- 502/503/504 (Temporary server errors)
- Connection refused/reset
- Service unavailable

PERMANENT (don't retry):
- 400/401/403/404 (Client/auth errors)
- 422 (Validation error)
- Invalid configuration
```

## Implementation in Edge Functions

### Auto-Respond Edge Function

**Before (Phase 9):**
```typescript
// Single attempt, no retry, no circuit breaker
const emailResult = await sendEmailViaResend(...)
const whatsappResult = await sendWhatsAppViaTwilio(...)
```

**After (Phase 10):**
```typescript
// With retry and circuit breaker
const resendBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 60000,
})

async function sendEmailViaResend(...) {
  return await resendBreaker.execute(async () =>
    retry(
      async () => {
        const response = await fetch("https://api.resend.com/emails", { ... })
        if (!response.ok) throw new Error(...)
        return response.json()
      },
      RETRY_PRESETS.EXTERNAL_API,
      (error, attempt) => {
        console.log(`[resend] Attempt ${attempt}: ${error.message}`)
      }
    )
  )
}
```

### Error Handling Flow

```
1. Call external API
   ↓
2. If error:
   - Is retryable? Yes → retry with backoff
   - Is retryable? No → fail immediately
   - All retries exhausted? → fail
   ↓
3. If repeated failures:
   - Circuit breaker opens
   - Fails fast on subsequent calls
   - Auto-recovers after timeout
   ↓
4. Partial success OK:
   - Email failed, WhatsApp succeeded? Log both, return OK
   - Don't cascade failures across channels
```

## Usage Examples

### Example 1: Retry External API

```typescript
import { retry, RETRY_PRESETS } from '../_shared/retry.ts'

async function fetchProgramDetails(programId: string) {
  return await retry(
    async () => {
      const response = await fetch(`https://api.programs.com/${programId}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    },
    RETRY_PRESETS.EXTERNAL_API
  )
}
```

### Example 2: Circuit Breaker for Third-Party Service

```typescript
import { CircuitBreaker } from '../_shared/retry.ts'

const analyticsBreaker = new CircuitBreaker({
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 120000,
})

async function trackAnalyticsEvent(event: AnalyticsEvent) {
  try {
    await analyticsBreaker.execute(async () => {
      const response = await fetch('https://analytics.service.com/track', {
        method: 'POST',
        body: JSON.stringify(event),
      })
      if (!response.ok) throw new Error(`Analytics failed: ${response.status}`)
    })
  } catch (error) {
    if (error.message.includes('Circuit breaker is OPEN')) {
      console.log('Analytics service is down, using local queue')
      // Queue event locally for later retry
    } else {
      throw error
    }
  }
}
```

### Example 3: Combined Retry + Circuit Breaker

```typescript
async function sendNotificationViaService(notification: Notification) {
  const notificationBreaker = new CircuitBreaker({
    failureThreshold: 10,
    successThreshold: 5,
    timeout: 300000, // 5 minutes
  })

  return await notificationBreaker.execute(async () =>
    retry(
      async () => {
        // Attempt to send with retry
        const response = await fetch('https://notification-service.com/send', {
          method: 'POST',
          body: JSON.stringify(notification),
          headers: { 'Authorization': `Bearer ${token}` },
        })

        if (!response.ok) {
          const error = new Error(`Service error: ${response.status}`)
          ;(error as any).status = response.status
          throw error
        }

        return response.json()
      },
      RETRY_PRESETS.EXTERNAL_API,
      (error, attempt) => {
        console.log(`[notification] Attempt ${attempt}: ${error.message}`)
      }
    )
  )
}
```

## Configuration Reference

### RetryConfig

```typescript
interface RetryConfig {
  maxAttempts: number       // Total attempts (1-10)
  initialDelayMs: number    // First backoff delay
  maxDelayMs: number        // Max delay between attempts
  backoffMultiplier: number // Exponential factor (1.5-3)
  jitterFraction: number    // Random variation (0-1)
  timeout?: number          // Per-attempt timeout
}
```

### CircuitBreakerConfig

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number  // Failures before opening (3-20)
  successThreshold: number  // Successes to close (1-10)
  timeout: number           // Milliseconds before half-open
}
```

## Testing

### Test Retry Logic

```typescript
import { assertEquals } from "https://deno.land/std@0.140.0/testing/asserts.ts"
import { retry, RETRY_PRESETS } from '../_shared/retry.ts'

Deno.test("retry succeeds on second attempt", async () => {
  let attempts = 0
  const result = await retry(async () => {
    attempts++
    if (attempts === 1) throw new Error("Transient error")
    return "success"
  })
  
  assertEquals(result, "success")
  assertEquals(attempts, 2)
})

Deno.test("retry fails on permanent error", async () => {
  let attempts = 0
  try {
    await retry(async () => {
      attempts++
      const error = new Error("400 Bad Request")
      ;(error as any).status = 400
      throw error
    })
  } catch (error) {
    assertEquals(attempts, 1) // No retries for 400
  }
})
```

### Test Circuit Breaker

```typescript
const breaker = new CircuitBreaker({
  failureThreshold: 2,
  successThreshold: 1,
  timeout: 100,
})

// After 2 failures, circuit opens
await breaker.execute(() => Promise.reject("error 1"))
await breaker.execute(() => Promise.reject("error 2"))

// Now fails fast
try {
  await breaker.execute(() => Promise.resolve("ok"))
} catch (error) {
  assertEquals(error.message, "Circuit breaker is OPEN")
}

// After timeout, transitions to half-open
await sleep(150)
await breaker.execute(() => Promise.resolve("ok")) // Succeeds
// Circuit closes after 1 success
```

## Monitoring & Observability

### Log Attempts

```typescript
await retry(
  () => externalAPI.call(),
  RETRY_PRESETS.EXTERNAL_API,
  (error, attempt) => {
    console.log(`[api] Retry ${attempt}/${3}: ${error.message}`)
    // Can send to observability platform (Sentry, Datadog, etc.)
  }
)
```

### Track Circuit Breaker State

```typescript
const breaker = new CircuitBreaker({ /* ... */ })

// Monitor state changes
console.log(breaker.getState()) // "CLOSED (failures: 0, successes: 0)"

// Can send metrics to monitoring system
metrics.gauge('circuit_breaker.resend.state', breaker.getState())
```

## Best Practices

1. **Choose right preset:** Use `EXTERNAL_API` for third-party services, `DATABASE` for DB, etc.

2. **Don't retry on client errors:** 400/401/403 shouldn't retry, they're permanent

3. **Timeout protection:** Always include timeout to prevent hung requests

4. **Graceful degradation:** Partial success OK (email failed but SMS sent)

5. **Log failures:** Always log for debugging and monitoring

6. **Monitor circuit breakers:** Watch for services going down

7. **Test retry logic:** Unit tests for error handling

8. **Use jitter:** Prevents thundering herd on mass retries

## Files Modified

- `supabase/functions/_shared/retry.ts` — Retry and circuit breaker utilities
- `supabase/functions/auto-respond-lead/index.ts` — Enhanced with retry logic
- This file: `EDGE_FUNCTION_RESILIENCE.md` — Documentation

## References

- [Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Google SRE Book: Dealing with Overload](https://sre.google/sre-book/handling-overload/)
