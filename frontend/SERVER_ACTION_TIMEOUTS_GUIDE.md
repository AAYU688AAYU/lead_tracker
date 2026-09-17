# Server Action Timeouts Guide

**Phase 10 MEDIUM #14**: Comprehensive timeout protection for all server actions to prevent hanging requests and improve UX.

## Overview

Server actions can hang indefinitely due to:
- Slow database queries or N+1 problems
- Unresponsive external APIs (Resend, Twilio, Supabase)
- Network timeouts
- Memory leaks or infinite loops
- Browser tab closure (connection kept open on server)

This implementation adds configurable timeout protection to all server actions with graceful error handling and automatic logging.

## Features

### 1. Preset Timeout Configurations

```typescript
// Fast operations: 5 seconds (auth, simple updates)
TIMEOUT_PRESETS.FAST

// Standard operations: 15 seconds (form submissions, queries with joins)
TIMEOUT_PRESETS.STANDARD

// Slow operations: 30 seconds (file uploads, complex calculations)
TIMEOUT_PRESETS.SLOW

// Very slow operations: 60 seconds (bulk operations, heavy analysis)
TIMEOUT_PRESETS.VERY_SLOW

// Database-specific: 20 seconds (database operations with indexes)
TIMEOUT_PRESETS.DATABASE

// External API calls: 25 seconds (account for network latency)
TIMEOUT_PRESETS.EXTERNAL_API
```

### 2. Multiple Wrapping Strategies

#### Basic Timeout
Reject if operation exceeds timeout.

```typescript
export const myAction = withTimeout(
  async (formData: FormData) => { ... },
  'STANDARD', // or 15000 for raw milliseconds
  'myAction'
)
```

#### Timeout with Retries
Automatically retry with exponential backoff if timeout occurs.

```typescript
export const criticalAction = withTimeoutAndRetry(
  async (data) => { ... },
  'STANDARD',
  'criticalAction',
  2 // max 2 retries
)
```

#### Timeout with Metrics
Collect detailed metrics for monitoring and alerting.

```typescript
export const monitoredAction = withTimeoutAndMetrics(
  async (data) => { ... },
  'STANDARD',
  'monitoredAction',
  (metrics) => {
    // Send to monitoring service
    console.log(`Action took ${metrics.duration}ms`)
  }
)
```

#### Abort-Based Timeout
For actions that need to handle cancellation gracefully.

```typescript
export const cancellableAction = withAbortTimeout(
  async (signal: AbortSignal, data) => {
    const response = await fetch(url, { signal })
    // Automatically aborted if timeout exceeds
    return response
  },
  'EXTERNAL_API',
  'cancellableAction'
)
```

### 3. Error Handling

All timeout wrappers throw `TimeoutError` which inherits from `Error`:

```typescript
interface TimeoutError extends Error {
  isTimeout: boolean
  message: string // User-friendly message
}
```

Client-side handling:

```typescript
import { TimeoutError } from '@/lib/server-actions-timeout'

try {
  const result = await myAction(formData)
} catch (error) {
  if (error instanceof TimeoutError) {
    // Handle timeout specifically
    setError('Operation took too long. Please try again.')
  } else {
    // Handle other errors
    setError(error?.message || 'An error occurred')
  }
}
```

### 4. Automatic Logging

All operations are logged automatically:

```
[ACTION_SLOW] "submitApplication" took 8500ms (timeout: 15000ms)
[ACTION_TIMEOUT] "getAnalytics" timed out after 30001ms (limit: 30000ms)
[ACTION_ERROR] "advanceStage" failed after 120ms: Database connection error
[ACTION_RETRY] "sendEmail" attempt 1 failed, retrying in 1000ms...
[ACTION_RETRY_SUCCESS] "sendEmail" succeeded on attempt 2 after 3200ms
```

Logs include:
- Action name
- Duration
- Status (timeout, error, slow)
- Helpful context

## Implementation

### Step 1: Identify Server Actions

All files with `'use server'` directive:
- `app/apply/actions.ts`
- `app/auth/password-reset/actions.ts`
- `app/status/actions.ts`
- `app/dashboard/student/actions.ts`
- `app/dashboard/consultant/actions.ts`
- `app/dashboard/admin/actions.ts`
- `app/dashboard/admin/analytics/actions.ts`
- `app/dashboard/admin/team/actions.ts`
- `app/dashboard/admin/pipeline-settings/actions.ts`
- `app/dashboard/admin/consultants/[id]/actions.ts`
- `app/dashboard/consultant/notifications/actions.ts`
- API route handlers (`app/api/*/route.ts`)

### Step 2: Wrap Existing Functions

Before:
```typescript
'use server'

export async function submitApplication(
  _prevState: ApplyState,
  formData: FormData
): Promise<ApplyState> {
  // ... implementation
}
```

After:
```typescript
'use server'

import { withTimeout } from '@/lib/server-actions-timeout'

const submitApplicationImpl = async (
  _prevState: ApplyState,
  formData: FormData
): Promise<ApplyState> => {
  // ... implementation
}

export const submitApplication = withTimeout(
  submitApplicationImpl,
  'SLOW', // 30 second timeout
  'submitApplication'
)
```

### Step 3: Choose Appropriate Timeout

Reference `lib/server-actions-registry.ts` for recommended timeouts:

```typescript
import { SERVER_ACTIONS_REGISTRY } from '@/lib/server-actions-registry'

// Find your action
const action = SERVER_ACTIONS_REGISTRY.find(
  (a) => a.name === 'submitApplication'
)
console.log(action.recommendedTimeout) // 'SLOW'
console.log(action.rationale) // Why this timeout
```

### Step 4: Test Timeout Behavior

```typescript
// In development, test with artificial delays
const testTimeout = withTimeout(
  async () => {
    await new Promise((resolve) => setTimeout(resolve, 25000))
    return 'done'
  },
  'FAST', // 5 second timeout
  'testAction'
)

// This will timeout and throw TimeoutError
try {
  await testTimeout()
} catch (error) {
  console.log(error.message)
  // "Server action "testAction" exceeded timeout of 5000ms..."
}
```

## Action Registry

Complete mapping of all server actions with timeout recommendations:

### Apply Flow
| Action | File | Timeout | Rationale |
|--------|------|---------|-----------|
| `submitApplication` | app/apply/actions.ts | SLOW (30s) | File uploads, external emails |
| `setPassword` | app/apply/actions.ts | FAST (5s) | Simple password hash & update |

### Auth Flow
| Action | File | Timeout | Rationale |
|--------|------|---------|-----------|
| `requestPasswordReset` | app/auth/password-reset/actions.ts | FAST (5s) | Generate token, send email |
| `completePasswordReset` | app/auth/password-reset/actions.ts | FAST (5s) | Verify token, update password |
| `changePassword` | app/auth/password-reset/actions.ts | FAST (5s) | Update password, audit log |

### Status Lookup
| Action | File | Timeout | Rationale |
|--------|------|---------|-----------|
| `lookupApplication` | app/status/actions.ts | FAST (5s) | Indexed lead lookup |
| `uploadDocuments` | app/status/actions.ts | SLOW (30s) | File uploads, storage |

### Consultant Dashboard
| Action | File | Timeout | Rationale |
|--------|------|---------|-----------|
| `getConsultantLeads` | app/dashboard/consultant/actions.ts | STANDARD (15s) | Materialized view queries |
| `logCommunication` | app/dashboard/consultant/actions.ts | FAST (5s) | Simple record creation |
| `advanceLeadStage` | app/dashboard/consultant/actions.ts | STANDARD (15s) | Updates, emails, automation |

### Admin Dashboard
| Action | File | Timeout | Rationale |
|--------|------|---------|-----------|
| `bulkAssignLeads` | app/dashboard/admin/actions.ts | SLOW (30s) | Bulk updates with audit logs |
| `getAnalytics` | app/dashboard/admin/analytics/actions.ts | VERY_SLOW (60s) | Complex aggregations |
| `deactivateConsultant` | app/dashboard/admin/team/actions.ts | SLOW (30s) | Bulk operations, reassignment |
| `getConsultantPortfolio` | app/dashboard/admin/consultants/[id]/actions.ts | STANDARD (15s) | Materialized views |

## Monitoring & Alerts

### Log Levels

```
[ACTION_SLOW] — Operation took 80%+ of timeout (warning level)
[ACTION_ERROR] — Operation failed with exception (error level)
[ACTION_TIMEOUT] — Exceeded timeout threshold (error level)
[ACTION_RETRY] — Retrying after timeout/failure (info level)
[ACTION_RETRY_SUCCESS] — Succeeded after retry (info level)
```

### Recommended Alerts

Set up monitoring for:
1. **Timeout Rate**: Alert if >1% of actions timeout
2. **Slow Operations**: Alert if >10% of actions are slow
3. **Retry Rate**: Alert if >5% of actions need retries
4. **External API Failures**: Alert on external service timeouts

### Example Monitoring Integration

```typescript
const onMetrics = (metrics: ActionMetrics) => {
  // Send to monitoring service (e.g., Sentry, DataDog)
  if (metrics.status === 'timeout') {
    logger.error('Action timeout', {
      action: metrics.actionName,
      duration: metrics.duration,
      timeout: metrics.timeoutMs,
    })
  }

  if (metrics.duration! > metrics.timeoutMs * 0.8) {
    logger.warn('Slow action', {
      action: metrics.actionName,
      duration: metrics.duration,
      timeout: metrics.timeoutMs,
      percentOfTimeout: (metrics.duration! / metrics.timeoutMs) * 100,
    })
  }
}

export const myAction = withTimeoutAndMetrics(
  async (data) => { ... },
  'STANDARD',
  'myAction',
  onMetrics
)
```

## Best Practices

### 1. Choose Conservative Timeouts
- Base on 95th percentile latency + buffer
- For external APIs: account for network latency (add 5-10s)
- For file uploads: use SLOW (30s minimum)
- For analytics: use VERY_SLOW (60s for complex queries)

### 2. Combine with Retry Logic
For non-idempotent operations, use `withTimeoutAndRetry`:
```typescript
export const criticaAction = withTimeoutAndRetry(
  async (data) => { ... },
  'STANDARD',
  'criticalAction',
  2 // Retry up to 2 times
)
```

### 3. Abort Long-Running Fetches
Use `withAbortTimeout` for external API calls:
```typescript
export const fetchData = withAbortTimeout(
  async (signal) => {
    return fetch(url, { signal, timeout: 10000 })
  },
  'EXTERNAL_API',
  'fetchData'
)
```

### 4. Handle Timeouts in UI
```typescript
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const handleSubmit = async (formData: FormData) => {
  setIsLoading(true)
  setError(null)

  try {
    const result = await submitApplication(formData)
    // Success
  } catch (err) {
    if (err instanceof TimeoutError) {
      setError('Taking longer than usual. Please try again.')
    } else if (err instanceof Error) {
      setError(err.message)
    }
  } finally {
    setIsLoading(false)
  }
}
```

### 5. Log Contextual Information
Include relevant metadata in logs:
```typescript
console.error('[ACTION_ERROR]', {
  action: 'submitApplication',
  duration: 3421,
  userId: currentUser?.id,
  formData: { /* sanitized */ },
  error: error.message,
})
```

## Performance Targets

After implementing timeouts:

| Metric | Target | How to Measure |
|--------|--------|-----------------|
| P95 Latency | <timeout | Monitor via logs or APM |
| Timeout Rate | <0.5% | Track [ACTION_TIMEOUT] logs |
| Slow Rate | <10% | Track [ACTION_SLOW] logs |
| Mean Time to Timeout | 80%+ of limit | Indicates timeout is well-configured |

## Troubleshooting

### Actions Frequently Timing Out
1. Check action implementation for N+1 queries
2. Verify database indexes exist (see DATABASE_INDEXING_GUIDE.md)
3. Check if external API is slow (use withAbortTimeout)
4. Consider caching if appropriate (see LOW #17)
5. Increase timeout conservatively only as last resort

### Actions Complete but Close to Timeout
1. These should be optimized before production
2. Increase timeout moderately (add 10% buffer)
3. Profile to find bottlenecks
4. Consider breaking into smaller operations

### Unexpected Timeouts in Production
1. Check if database is under load
2. Verify external API status
3. Check network latency from server location
4. Review error logs for root cause

## Migration Checklist

- [ ] Review all server actions in project
- [ ] Assign timeout recommendation from registry
- [ ] Wrap functions with appropriate timeout
- [ ] Test timeout behavior locally
- [ ] Handle TimeoutError in client UI
- [ ] Deploy and monitor for 1 week
- [ ] Adjust timeouts based on production metrics
- [ ] Document any custom timeouts with rationale
- [ ] Set up monitoring and alerts
- [ ] Train team on timeout handling patterns

## Files

- `lib/server-actions-timeout.ts` - Core timeout utilities and wrappers
- `lib/server-actions-registry.ts` - Centralized action registry with recommendations
- `SERVER_ACTION_TIMEOUTS_GUIDE.md` - This guide

## Related Guides

- `EDGE_FUNCTION_RESILIENCE.md` — Similar pattern for edge functions
- `DATABASE_INDEXING_GUIDE.md` — Optimize slow queries
- `N_PLUS_1_OPTIMIZATION.md` — Fix performance issues
- `JWT_MIDDLEWARE_OPTIMIZATION.md` — Fast middleware
