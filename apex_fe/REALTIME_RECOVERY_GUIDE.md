# Realtime Auto-Reconnect with Exponential Backoff — Phase 10 #12

## Overview

This guide documents the realtime subscription recovery system for handling network disconnections and automatic reconnection.

**Goal:** Ensure realtime subscriptions gracefully handle network issues:
- Auto-reconnect on connection loss
- Exponential backoff with jitter
- Recovery of missed updates
- Proper error handling and logging

## Problem Statement

**Before (Phase 9):**
```typescript
// Simple subscription, no reconnection logic
channel.subscribe((status) => {
  if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
    // User stuck with stale data until page refresh
    console.error('Connection lost')
  }
})
```

**Issues:**
- Network disconnection → stuck with stale data
- User must refresh page to reconnect
- No recovery of missed updates
- No exponential backoff (unnecessary retry storms)
- Thundering herd problem (all clients reconnect simultaneously)

## Solution

### 1. Enhanced Hook with Auto-Reconnect

Created `lib/hooks/use-realtime-with-recovery.ts` with:

```typescript
// Automatic reconnection with exponential backoff
const status = useRealtimeWithRecovery({
  channel,
  onConnected: () => console.log('Realtime connected'),
  onError: (error, attempt) => console.error(`Attempt ${attempt}: ${error}`),
  onRecoveryNeeded: async () => {
    // Fetch missed updates after reconnect
  },
  config: REALTIME_RECOVERY_PRESETS.MODERATE, // or custom config
})

// Return status: 'connected' | 'reconnecting' | 'error'
```

### 2. Exponential Backoff with Jitter

**Algorithm:**
```
delay = min(initialDelay * (multiplier ^ attempt) + jitter, maxDelay)

Example (MODERATE preset):
  Attempt 0: ~1s + jitter
  Attempt 1: ~2s + jitter (if first fails)
  Attempt 2: ~4s + jitter
  Attempt 3: ~8s + jitter
  Attempt 4-9: ~30s + jitter (capped)
```

**Benefits:**
- Gradually increases wait time
- Allows server time to recover
- Jitter prevents thundering herd
- Jitter = delay * 0.2 * random() → ±20% variation

### 3. Recovery Mechanism

After successful reconnection, optionally fetch missed updates:

```typescript
const handleRecovery = async () => {
  // Fetch updates since last successful connection
  const response = await fetch(
    `/api/leads/recovery?lead_id=${leadId}&since=${lastTimestamp}`
  )
  const missedUpdates = await response.json()
  // Apply missed updates to local state
}

useRealtimeWithRecovery({
  channel,
  onRecoveryNeeded: handleRecovery,
})
```

## Presets

### AGGRESSIVE
- For stable networks (WiFi, wired)
- Quick retries (3 attempts)
- Short max delay (5s)

```typescript
initialDelayMs: 500,
maxDelayMs: 5000,
backoffMultiplier: 1.5,
jitterFraction: 0.1,
maxAttempts: 3,
```

### MODERATE (Default)
- Balanced for typical conditions
- Medium patience (10 attempts)
- Reasonable backoff (1-30s)

```typescript
initialDelayMs: 1000,
maxDelayMs: 30000,
backoffMultiplier: 2,
jitterFraction: 0.2,
maxAttempts: 10,
```

### CONSERVATIVE
- For unreliable networks
- Long patience (15 attempts)
- Large backoff (2-60s)

```typescript
initialDelayMs: 2000,
maxDelayMs: 60000,
backoffMultiplier: 2.5,
jitterFraction: 0.3,
maxAttempts: 15,
```

### MOBILE
- For cellular connections
- Very patient (20 attempts)
- Large backoff (3-90s)

```typescript
initialDelayMs: 3000,
maxDelayMs: 90000,
backoffMultiplier: 2,
jitterFraction: 0.3,
maxAttempts: 20,
```

## Usage Patterns

### Pattern 1: Basic Auto-Reconnect

```typescript
import { useRealtimeWithRecovery } from '@/lib/hooks/use-realtime-with-recovery'

export function MyComponent() {
  const [data, setData] = useState(initialData)

  const channel = supabase
    .channel('my-channel')
    .on('postgres_changes', config, (payload) => {
      // Update local state on change
      setData(payload.new)
    })

  const realtimeStatus = useRealtimeWithRecovery({
    channel,
    onConnected: () => console.log('✅ Realtime connected'),
    onError: (error, attempt) => {
      console.warn(`⚠️ Reconnection attempt ${attempt}`)
    },
  })

  return (
    <div>
      <ConnectionStatus status={realtimeStatus} />
      {/* Component content */}
    </div>
  )
}
```

### Pattern 2: With Recovery Fetch

```typescript
const realtimeStatus = useRealtimeWithRecovery({
  channel,
  onRecoveryNeeded: async () => {
    // Fetch missed updates from API
    const response = await fetch(
      `/api/recovery?table=leads&since=${lastUpdate}`
    )
    const missed = await response.json()

    // Replay missed updates
    missed.forEach(update => {
      handleLeadUpdate(update)
    })
  },
  config: REALTIME_RECOVERY_PRESETS.MODERATE,
})
```

### Pattern 3: Lead Drawer with Recovery

```typescript
import { useRealtimeWithLeadRecovery } from '@/lib/hooks/use-realtime-with-recovery'

export function LeadDrawer({ leadId }) {
  const [activities, setActivities] = useState([])

  const channel = supabase
    .channel(`lead-${leadId}`)
    .on('postgres_changes', { table: 'activity_logs', filter: `lead_id=eq.${leadId}` },
      (payload) => {
        setActivities(prev => [payload.new, ...prev])
      }
    )

  // Automatically recovers missed updates after reconnect
  const status = useRealtimeWithLeadRecovery(
    channel,
    leadId,
    (newStatus) => console.log(`Status: ${newStatus}`)
  )

  return (
    <div>
      <StatusIndicator status={status} />
      <ActivityList items={activities} />
    </div>
  )
}
```

### Pattern 4: Custom Configuration

```typescript
const realtimeStatus = useRealtimeWithRecovery({
  channel,
  config: {
    initialDelayMs: 2000,
    maxDelayMs: 45000,
    backoffMultiplier: 2,
    jitterFraction: 0.25,
    maxAttempts: 8,
  },
  onConnected: () => setConnected(true),
  onError: (error, attempt) => {
    metrics.track('realtime_reconnection_failed', { attempt })
  },
})
```

## Implementation Details

### State Transitions

```
CONNECTED
  ↓ (network loss)
RECONNECTING (attempt 1, wait 1s + jitter)
  ↓ (retry fails)
RECONNECTING (attempt 2, wait 2s + jitter)
  ↓ (retry fails)
RECONNECTING (attempt 3, wait 4s + jitter)
  ↓ (success after backoff)
CONNECTED + RECOVERY
  ↓ (recovery complete)
CONNECTED

OR (if max attempts exceeded)

RECONNECTING (attempt 10)
  ↓ (give up)
ERROR
```

### Connection Status Hook

```typescript
interface UseRealtimeWithRecoveryOptions {
  channel: RealtimeChannel
  onConnected?: () => void          // Called when connected
  onDisconnected?: () => void       // Called when disconnected
  onError?: (error, attempt) => void // Called on each failed attempt
  onRecoveryNeeded?: () => Promise<void> // Called after reconnect
  config?: RealtimeRecoveryConfig   // Backoff configuration
  onStatusChange?: (status) => void // Called on status changes
}

// Returns: 'connected' | 'reconnecting' | 'error'
const status = useRealtimeWithRecovery(options)
```

## Error Handling

### Graceful Degradation

```typescript
// Show stale data with warning
if (status === 'reconnecting') {
  return (
    <>
      <WarningBanner message="Connection unstable, showing cached data" />
      <DataList data={cachedData} />
    </>
  )
}

// Show error state
if (status === 'error') {
  return (
    <>
      <ErrorBanner message="Connection lost, please refresh" />
      <RefreshButton onClick={() => location.reload()} />
    </>
  )
}
```

### Logging

Auto-logged events:
```
[realtime-recovery] Reconnecting (attempt 1/10) in 1000ms
[realtime-recovery] Successfully reconnected
[realtime-recovery] Fetching missed updates...
[realtime-recovery] Channel error detected, attempting reconnect...
[realtime-recovery] Subscription timed out, attempting reconnect...
```

## Performance Considerations

### Backoff Timing

| Preset | Total Max Time | Attempts | Best For |
|--------|---|---|---|
| AGGRESSIVE | ~8 seconds | 3 | Stable networks |
| MODERATE | ~17 minutes | 10 | Typical conditions |
| CONSERVATIVE | ~30 minutes | 15 | Unstable networks |
| MOBILE | ~51 minutes | 20 | Cellular networks |

### Network Efficiency

- Jitter prevents simultaneous reconnects from all clients
- Example: 1000 clients with 1s backoff + 20% jitter
  - Without jitter: All attempt at t=1s (thundering herd)
  - With jitter: Spread across t=0.8-1.2s (distributed load)

### Memory Usage

- Minimal overhead: One timer per subscription
- Cleaned up on unmount
- No memory leaks if component unmounts during reconnect

## Testing

### Test Disconnect & Reconnect

```typescript
import { renderHook, waitFor } from '@testing-library/react'

test('auto-reconnects on channel error', async () => {
  const mockChannel = {
    subscribe: jest.fn(),
  } as any

  const { result } = renderHook(() =>
    useRealtimeWithRecovery({
      channel: mockChannel,
      config: REALTIME_RECOVERY_PRESETS.AGGRESSIVE,
    })
  )

  expect(result.current).toBe('connected')

  // Simulate channel error
  mockChannel.subscribe.mock.calls[0][0]('CHANNEL_ERROR')

  // Check reconnecting state
  expect(result.current).toBe('reconnecting')

  // After backoff
  await waitFor(() => {
    expect(result.current).toBe('connected')
  }, { timeout: 2000 })
})
```

### Test Recovery Fetch

```typescript
test('fetches missed updates on reconnect', async () => {
  const onRecovery = jest.fn()

  renderHook(() =>
    useRealtimeWithRecovery({
      channel: mockChannel,
      onRecoveryNeeded: onRecovery,
      config: REALTIME_RECOVERY_PRESETS.AGGRESSIVE,
    })
  )

  // Simulate connection error and recovery
  mockChannel.subscribe.mock.calls[0][0]('CHANNEL_ERROR')
  // ... wait for reconnect ...
  mockChannel.subscribe.mock.calls[0][0]('SUBSCRIBED')

  await waitFor(() => {
    expect(onRecovery).toHaveBeenCalled()
  })
})
```

## Migration Guide

### From Old Pattern

**Before:**
```typescript
const channel = supabase.channel(name)
  .on('postgres_changes', config, handler)
  .subscribe()

// No reconnection logic
```

**After:**
```typescript
const channel = supabase.channel(name)
  .on('postgres_changes', config, handler)

const status = useRealtimeWithRecovery({
  channel,
  config: REALTIME_RECOVERY_PRESETS.MODERATE,
})

// Automatically handles reconnection
```

### Integration Checklist

- [ ] Replace `.subscribe()` with `useRealtimeWithRecovery()`
- [ ] Add `onRecoveryNeeded` callback if data consistency matters
- [ ] Display connection status to user (StatusIndicator component)
- [ ] Test disconnection scenarios
- [ ] Add metrics/monitoring for reconnection events
- [ ] Update error boundaries to handle 'error' status

## Monitoring

### Metrics to Track

```typescript
// Track reconnection success rate
metrics.track('realtime_reconnected', {
  attempts: attemptCount,
  timeToReconnect: reconnectDuration,
  preset: 'MODERATE',
})

// Track max attempts exceeded
metrics.track('realtime_max_attempts_exceeded', {
  maxAttempts: 10,
  lastAttempt: 10,
})

// Track recovery failures
metrics.track('realtime_recovery_failed', {
  reason: 'api_error',
  statusCode: 500,
})
```

## Files Modified

- `lib/hooks/use-realtime-with-recovery.ts` — Auto-reconnect hook
- This file: `REALTIME_RECOVERY_GUIDE.md` — Documentation

## References

- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Network Resilience Patterns](https://www.microsoft.com/en-us/research/publication/eventual-consistency-today-limiting-inconsistency-in-distributed-systems/)
