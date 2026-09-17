# Error Handling & User Feedback Guide

**Task #20 (LOW Priority)** — Improved error messages and user feedback.

## Overview

This guide implements centralized error handling across the application with user-friendly, context-aware error messages. Instead of showing technical errors to users, we translate errors into plain language with clear next steps.

## Philosophy

Users don't understand HTTP 503s or database constraint violations. Our job is to:
1. **Identify** what went wrong (network, validation, permission, server issue)
2. **Translate** into user-friendly language
3. **Suggest** the next step (retry, check fields, contact support)
4. **Enable** recovery (retry button, form hints, etc.)

### Error Categories

All errors fall into one of eight categories:

| Category | What Happened | User Action |
|----------|---------------|------------|
| **auth** | Login/session issue | Log in again |
| **validation** | Invalid input | Check form fields |
| **network** | Connection problem | Retry or check internet |
| **server** | Server-side issue (5xx) | Retry later |
| **permission** | Unauthorized action (403) | Contact admin |
| **notfound** | Resource doesn't exist (404) | Go back or refresh |
| **ratelimit** | Too many requests (429) | Wait and retry |
| **unknown** | Something unexpected | Retry or contact support |

## Core Components

### 1. Error Message Resolver

**File:** `lib/errors/error-messages.ts`

Maps any error type to a consistent `ErrorMessage` structure:

```typescript
interface ErrorMessage {
  title: string           // "Invalid email or password"
  message: string         // User-friendly explanation
  action?: string         // "Log in" or "Retry"
  actionFn?: () => void   // Handler for action button
  supportText?: string    // "Contact support@example.com"
  retryable: boolean      // Can user retry?
  category: ErrorCategory // 'auth', 'validation', etc.
  statusCode?: number     // HTTP status code
}
```

**Usage:**

```typescript
import { resolveErrorMessage } from '@/lib/errors/error-messages'

try {
  await submitForm(data)
} catch (error) {
  const errorMsg = resolveErrorMessage(error, 'submitting form')
  showToast(errorMsg)
}
```

### 2. UI Components

**File:** `lib/errors/error-ui.tsx`

#### ErrorBoundary

Catches unhandled React errors and displays fallback UI:

```typescript
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

#### ErrorAlert

Inline error card (use in forms):

```typescript
<ErrorAlert error={errorMsg} onDismiss={() => setError(null)} />
```

#### useErrorToast Hook

Show toast notifications:

```typescript
const { toasts, showError, dismissToast } = useErrorToast()

try {
  await saveData()
} catch (error) {
  showError(error, 'saving data')
}

return <ToastContainer toasts={toasts} onDismiss={dismissToast} />
```

## Implementation Patterns

### Pattern 1: Form Submission with Error Handling

```typescript
'use client'

import { useState } from 'react'
import { useErrorToast, ErrorAlert } from '@/lib/errors/error-ui'
import { ErrorMessages } from '@/lib/errors/error-messages'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { showError, toasts } = useErrorToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      // Validate locally first
      if (!email.includes('@')) {
        showError(ErrorMessages.validation.invalidEmail())
        return
      }

      if (password.length < 8) {
        showError(ErrorMessages.validation.passwordTooWeak())
        return
      }

      // Call server action
      const result = await loginAction(email, password)
      
      if (!result.success) {
        showError(result.error, 'logging in')
        return
      }

      // Success — navigate
      window.location.href = '/dashboard'
    } catch (error) {
      // Server error
      showError(error, 'logging in')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Log in</button>
    </form>
  )
}
```

### Pattern 2: Server Action with Error Recovery

```typescript
'use server'

import { ErrorMessages } from '@/lib/errors/error-messages'
import { withTimeoutAndRetry } from '@/lib/server-actions-timeout'

export async function updateLeadAction(
  leadId: string,
  updates: LeadUpdates
): Promise<{ success: boolean; error?: ErrorMessage }> {
  try {
    // Validate
    if (!leadId) {
      return { success: false, error: ErrorMessages.validation.fieldRequired('Lead ID') }
    }

    // Call with timeout and retry
    const lead = await withTimeoutAndRetry(
      () => updateLeadInDb(leadId, updates),
      { maxRetries: 2, timeoutMs: 5000 }
    )

    return { success: true }
  } catch (error) {
    // Resolve to user-friendly message
    const errorMsg = resolveErrorMessage(error, 'updating lead')
    return { success: false, error: errorMsg }
  }
}
```

### Pattern 3: Async Operation with Spinner

```typescript
'use client'

import { useState } from 'react'
import { useErrorToast, ErrorAlert, ToastContainer } from '@/lib/errors/error-ui'

export function DataSync() {
  const [isLoading, setIsLoading] = useState(false)
  const { showError, toasts, dismissToast } = useErrorToast()

  async function handleSync() {
    setIsLoading(true)
    try {
      await syncDataAction()
      showSuccess('Data synced successfully')
    } catch (error) {
      showError(error, 'syncing data')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button onClick={handleSync} disabled={isLoading}>
        {isLoading ? 'Syncing...' : 'Sync data'}
      </button>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  )
}
```

### Pattern 4: Network Error Resilience

```typescript
import { withErrorContext } from '@/lib/errors/error-messages'

// Wrap async functions for automatic error handling
const fetchDataSafely = withErrorContext(
  async () => {
    const response = await fetch('/api/data')
    if (!response.ok) throw new Error(`API error: ${response.status}`)
    return response.json()
  },
  'fetching data'
)

// Usage
const { data, error } = await fetchDataSafely()

if (error) {
  console.error('Error:', error.message)
  showErrorUI(error)
}
```

## Pre-Built Error Messages

All common errors have pre-built messages in `ErrorMessages`:

### Authentication

```typescript
ErrorMessages.auth.invalidCredentials()
ErrorMessages.auth.sessionExpired()
ErrorMessages.auth.notAuthorized()
```

### Validation

```typescript
ErrorMessages.validation.passwordTooWeak()
ErrorMessages.validation.invalidEmail()
ErrorMessages.validation.invalidPhone()
ErrorMessages.validation.fieldRequired('Email')
ErrorMessages.validation.duplicateEntry('Email')
```

### Network

```typescript
ErrorMessages.network.offline()
ErrorMessages.network.timeout()
ErrorMessages.network.serverUnreachable()
```

### Rate Limiting

```typescript
ErrorMessages.rateLimit.tooManyRequests(60) // Wait 60 seconds
```

### Server

```typescript
ErrorMessages.server.internalError()
ErrorMessages.server.serviceUnavailable()
ErrorMessages.server.notFound()
```

### Business Logic

```typescript
ErrorMessages.lead.alreadyAssigned()
ErrorMessages.lead.statusTransitionInvalid()
ErrorMessages.lead.cannotDelete()
```

### File Operations

```typescript
ErrorMessages.file.uploadFailed()
ErrorMessages.file.fileTooLarge(5)       // 5 MB limit
ErrorMessages.file.invalidFileType('PDF, PNG')
```

## Migrating Existing Error Handling

### Before (Technical Errors)

```typescript
// Bad: Shows database error to user
catch (error) {
  setError('Unique constraint violation on email')
}
```

### After (User-Friendly)

```typescript
// Good: Shows actionable message
catch (error) {
  const msg = resolveErrorMessage(error, 'updating email')
  showToast(msg)
  // User sees: "Email already exists. Please try a different one."
}
```

## Best Practices

### ✅ Do

- **Resolve errors to user-friendly messages** before display
- **Provide action buttons** when user can retry (showError with actionFn)
- **Include context** when showing errors: `resolveErrorMessage(error, 'saving lead')`
- **Categorize errors** for consistent styling (error = red, warning = yellow)
- **Suggest next steps** in supportText (e.g., "Contact support@example.com")
- **Use ErrorBoundary** at route/layout level
- **Show retryable errors** prominently with retry button
- **Auto-dismiss** low-priority toasts after 5 seconds

### ❌ Don't

- **Show stack traces** to users
- **Expose database/server details** ("Foreign key constraint violated")
- **Use generic messages** like "Error" without context
- **Force user to contact support** without retry option
- **Mix error handling patterns** (pick toast or inline, not both)
- **Ignore network errors** (always retry with backoff)
- **Display raw JSON** from API responses

## Testing Error Scenarios

### Simulate Network Error

```typescript
// In browser DevTools:
// Network tab → throttle to "Offline"
// Observe error handling
```

### Simulate Rate Limit

```typescript
// Test with rapid form submissions
handleSubmit()
handleSubmit()
handleSubmit() // Should show rate limit error
```

### Simulate Server Error

```typescript
// Mock fetch to return 500
jest.mock('node-fetch', () => () =>
  Promise.resolve({
    ok: false,
    status: 500,
    text: () => Promise.resolve('Internal Server Error')
  })
)
```

## Files Created

- ✅ `lib/errors/error-messages.ts`: Error resolver and pre-built messages
- ✅ `lib/errors/error-ui.tsx`: React components and hooks
- ✅ `ERROR_HANDLING_GUIDE.md`: This guide

## Integration Checklist

To integrate this into your components:

- [ ] Wrap root layout with `<ErrorBoundary>`
- [ ] Add `<ToastContainer>` to root layout
- [ ] Replace `console.error()` with `showError()`
- [ ] Use `resolveErrorMessage()` before showing errors
- [ ] Add retry buttons to transient failures
- [ ] Test error flows with network throttling
- [ ] Update API routes to return consistent error shapes
- [ ] Add error context to all server actions

## Verification

To verify the implementation works:

1. **Navigate to a form** (login, apply, etc.)
2. **Submit invalid data** → Should show validation error
3. **Simulate offline** → Should show network error
4. **Click retry** → Should attempt again
5. **Check console** → Should not show raw stack traces to users

## Next Steps

→ **Task #21**: Phase 10 wrap-up and final documentation

→ Integrate error handling into all existing forms and server actions

→ Monitor error toasts in production via analytics
