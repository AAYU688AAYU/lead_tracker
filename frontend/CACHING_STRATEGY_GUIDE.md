# Caching Strategy Guide

**Phase 10 LOW #17**: Implement caching for static and semi-static data using ISR (Incremental Static Regeneration) and request-level caching.

## Overview

Caching reduces database load and improves response times for frequently-accessed, rarely-changed data:

| Data | Change Frequency | Query Frequency | Cacheable? | Strategy |
|------|-----------------|-----------------|-----------|----------|
| Pipeline stages | Daily (admin) | Per page load | ✅ YES | ISR 1hr |
| Programs | Weekly (admin) | Per form load | ✅ YES | ISR 24hr |
| Universities | Weekly (admin) | Per form load | ✅ YES | ISR 24hr |
| Consultant profiles | Hourly (updates) | Per dashboard load | ⚠️ MAYBE | Request cache 10min |
| Lead data | Continuous (real-time) | Every action | ❌ NO | No cache |
| Settings | Daily | Per page load | ✅ YES | ISR 1hr |

## Caching Layers

### Layer 1: Request-Level Caching (Next.js native)
- Automatic deduplication within single request
- Free with Next.js 15+
- Example: Multiple components fetching same pipeline stages

```typescript
// Automatically cached within request
const stages1 = await getPipelineStages()  // DB query
const stages2 = await getPipelineStages()  // Cached (no query)
```

### Layer 2: Route Segment Config Caching
- Cache entire page/segment
- Configured via `revalidate` export
- Example: Static admin settings page

```typescript
export const revalidate = 3600  // Revalidate every hour
```

### Layer 3: ISR (Incremental Static Regeneration)
- Pre-render static pages
- Regenerate on-demand or on schedule
- Example: Programs catalog page

```typescript
export const revalidate = 86400  // Regenerate daily
export const dynamicParams = false  // Only generate params we know about
```

### Layer 4: On-Demand Revalidation
- Manually trigger cache clear
- Example: Admin updates pipeline stages

```typescript
import { revalidatePath } from 'next/cache'

export async function updatePipelineStage(stage: string, label: string) {
  // ... update database
  revalidatePath('/dashboard/admin/pipeline-settings')
  revalidatePath('/')  // Regenerate all pages using this data
}
```

## Cacheable Data Sources

### 1. Pipeline Stages (HIGHEST PRIORITY)

**Current**: Fetched on every admin page load, every form submission
**Cacheable**: Yes (changes only when admin updates settings)

```typescript
// lib/cache/stages.ts
import { unstable_cache } from 'next/cache'

export const getPipelineStagesUncached = async () => {
  const supabase = createServiceClient()
  return await supabase
    .from('pipeline_stage_labels')
    .select('stage, label, sort_order, stall_threshold_hours')
    .order('sort_order', { ascending: true })
}

// Cache for 1 hour
export const getPipelineStages = unstable_cache(
  getPipelineStagesUncached,
  ['pipeline-stages'],
  { revalidate: 3600, tags: ['pipeline-stages'] }
)
```

**Usage in page**:
```typescript
export const revalidate = 3600  // ISR every hour

export default async function AdminPage() {
  const stages = await getPipelineStages()
  // ...
}
```

**Clear on update**:
```typescript
import { revalidatePath } from 'next/cache'

export async function updatePipelineStageLabel(stage: string, label: string) {
  await updateDatabase(stage, label)
  revalidatePath('/')  // Clear all pages
  revalidateTag('pipeline-stages')  // Or just this tag
}
```

### 2. Programs & Universities (HIGH PRIORITY)

**Current**: Fetched on intake form load, admin pages
**Cacheable**: Yes (rarely changes, admin-controlled)

```typescript
// lib/cache/programs.ts
import { unstable_cache } from 'next/cache'

export const getProgramsUncached = async () => {
  const supabase = createServiceClient()
  return await supabase
    .from('programs')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
}

// Cache for 24 hours
export const getPrograms = unstable_cache(
  getProgramsUncached,
  ['programs'],
  { revalidate: 86400, tags: ['programs'] }
)

export const getUniversities = unstable_cache(
  async () => {
    const supabase = createServiceClient()
    return await supabase
      .from('universities')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
  },
  ['universities'],
  { revalidate: 86400, tags: ['universities'] }
)
```

**Usage**:
```typescript
// app/apply/page.tsx
export const revalidate = 86400  // Regenerate daily

export default async function ApplyPage() {
  const programs = await getPrograms()
  const universities = await getUniversities()
  // ...
}
```

### 3. Consultant Profiles (MEDIUM PRIORITY)

**Current**: Fetched every admin dashboard load
**Cacheable**: Partially (frequently updated, but list itself changes rarely)

```typescript
// lib/cache/consultants.ts
export const getConsultantListUncached = async () => {
  const supabase = createServiceClient()
  return await supabase
    .from('profiles')
    .select('id, full_name, email, is_accepting_leads, max_lead_capacity')
    .eq('role', 'consultant')
    .order('full_name')
}

// Cache for 10 minutes (balance between freshness and performance)
export const getConsultantList = unstable_cache(
  getConsultantListUncached,
  ['consultants-list'],
  { revalidate: 600, tags: ['consultants-list'] }
)
```

**Revalidate on update**:
```typescript
import { revalidateTag } from 'next/cache'

export async function updateConsultantCapacity(id: string, capacity: number) {
  await updateDatabase(id, capacity)
  revalidateTag('consultants-list')  // Immediately clear cache
}
```

## Implementation Patterns

### Pattern 1: Simple Cached Query

```typescript
// lib/cache/data.ts
import { unstable_cache } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'

const getDataUncached = async (id: string) => {
  const supabase = createServiceClient()
  return await supabase
    .from('my_table')
    .select('*')
    .eq('id', id)
    .single()
}

export const getData = unstable_cache(
  getDataUncached,
  ['data'],  // Cache key
  {
    revalidate: 3600,  // 1 hour
    tags: ['data-tag'],  // For on-demand revalidation
  }
)
```

### Pattern 2: Page with ISR

```typescript
// app/page.tsx
import { revalidate } from 'next/cache'

export const revalidate = 3600  // Regenerate every hour

export default async function Page() {
  const data = await getData()
  return <div>{data}</div>
}
```

### Pattern 3: Manual Revalidation on Update

```typescript
// app/admin/actions.ts
'use server'

import { revalidateTag, revalidatePath } from 'next/cache'

export async function updateData(id: string, value: string) {
  // Update database
  await db.table.update({ value }).eq('id', id)

  // Clear specific tag
  revalidateTag('data-tag')

  // Or clear entire path
  revalidatePath('/dashboard')

  // Or clear everything
  revalidatePath('/', 'layout')
}
```

### Pattern 4: Conditional Caching

```typescript
// Cache only when user is authenticated
export const getSecureData = unstable_cache(
  async (userId: string) => {
    const supabase = createServiceClient()
    return await supabase
      .from('private_data')
      .select('*')
      .eq('user_id', userId)
  },
  ['secure-data'],
  {
    revalidate: 1800,  // 30 minutes
    tags: ['secure-data'],
  }
)
```

## Strategy by Feature

### Admin Dashboard

**Current load**:
- Pipeline stages: 3 queries/page
- Consultants: 2 queries/page
- Leads: 1 query/page
- Total: ~6 queries

**With caching**:
- Pipeline stages: 1 DB query per hour
- Consultants: 1 DB query per 10 minutes
- Leads: 6 queries (not cached, real-time)
- **Reduction**: ~95% for cached queries

**Implementation**:
```typescript
// app/dashboard/admin/page.tsx
export const revalidate = 600  // ISR every 10 minutes

export default async function AdminPage() {
  const stages = await getPipelineStages()  // Request cache
  const consultants = await getConsultantList()  // Request cache
  const leads = await getLeads()  // Real-time, no cache
  // ...
}
```

### Intake Form

**Current load**:
- Programs: 1 query per form load
- Universities: 1 query per form load

**With caching**:
- Programs: 1 DB query per 24 hours
- Universities: 1 DB query per 24 hours
- **Reduction**: ~99.97% for form loads

**Implementation**:
```typescript
// app/apply/page.tsx
export const revalidate = 86400  // ISR daily

export default async function ApplyPage() {
  const programs = await getPrograms()
  const universities = await getUniversities()
  // ...
}
```

## Monitoring Cache Effectiveness

### Metrics to Track

```typescript
// lib/cache/metrics.ts
export async function logCacheHit(key: string, duration: number) {
  console.log(`[CACHE_HIT] ${key} in ${duration}ms`)
  // Send to monitoring service
}

export async function logCacheMiss(key: string, duration: number) {
  console.log(`[CACHE_MISS] ${key} in ${duration}ms`)
  // Send to monitoring service
}
```

### Expected Improvements

| Query Type | Before | After | Improvement |
|-----------|--------|-------|------------|
| Pipeline stages | 50ms | 2ms (1st), <1ms (cached) | 25-50x |
| Programs list | 80ms | 1ms (1st), <1ms (cached) | 80-80x |
| Consultant list | 100ms | 3ms (1st), <1ms (cached) | 30-100x |
| Admin dashboard total | 300ms+ | 100ms+ | 3-10x faster |

## Caching Gotchas

### 1. Request Cache is Per-Request

```typescript
// ✅ CORRECT: Cached within single request
const stages1 = await getPipelineStages()
const stages2 = await getPipelineStages()  // Not a new DB query

// ❌ WRONG: Different requests hit DB independently
// Request 1: const stages = await getPipelineStages()  // DB hit
// Request 2: const stages = await getPipelineStages()  // DB hit again
```

### 2. Stale Data Risk

If you cache for 1 hour but admin updates in 5 minutes:
- Users see stale data for up to 55 more minutes
- Use shorter revalidate for frequently-changing data
- Or use on-demand revalidation

### 3. Private Data Leaks

```typescript
// ❌ DANGEROUS: Caches private data globally
export const getUserData = unstable_cache(
  async (userId: string) => {
    return await db.private_data.get(userId)
  },
  ['user-data'],  // Cache shared across ALL users!
)

// ✅ CORRECT: Include user ID in cache key
export const getUserData = unstable_cache(
  async (userId: string) => {
    return await db.private_data.get(userId)
  },
  ['user-data', userId],  // Unique per user
)
```

### 4. Dynamic Routes

```typescript
// If params change, cache keys should reflect it
export const revalidate = 3600

export async function generateStaticParams() {
  // Generate params we know about upfront
  return [
    { stage: 'intake' },
    { stage: 'phone-screening' },
    // ... etc
  ]
}

export default async function StagePage({ params }: { params: { stage: string } }) {
  // Cached per stage
  const data = await getStagData(params.stage)
}
```

## Rollout Plan

### Phase 1: Low-Risk (Week 1)
- [ ] Cache pipeline stages (1 hour revalidate)
- [ ] Cache programs/universities (24 hour revalidate)
- [ ] Monitor for stale data issues

### Phase 2: Medium-Risk (Week 2)
- [ ] Cache consultant list (10 minute revalidate)
- [ ] Add on-demand revalidation to admin updates
- [ ] Monitor dashboard performance

### Phase 3: Advanced (Week 3+)
- [ ] Consider cursor-based pagination with caching
- [ ] Evaluate Redis for distributed caching
- [ ] Fine-tune revalidate durations based on actual usage

## Testing Cache

```typescript
// __tests__/cache.test.ts
import { getPipelineStages } from '@/lib/cache/stages'

describe('Caching', () => {
  test('returns cached result on second call', async () => {
    const start1 = Date.now()
    const result1 = await getPipelineStages()
    const duration1 = Date.now() - start1

    const start2 = Date.now()
    const result2 = await getPipelineStages()
    const duration2 = Date.now() - start2

    // Second call should be significantly faster
    expect(duration2).toBeLessThan(duration1 / 2)
    expect(result1).toEqual(result2)
  })

  test('revalidates after duration expires', async () => {
    // Mock time advance
    jest.useFakeTimers()
    
    const result1 = await getPipelineStages()
    
    // Advance 61 minutes
    jest.advanceTimersByTime(61 * 60 * 1000)
    
    // Should be fresh query
    const result2 = await getPipelineStages()
    
    expect(result1).toEqual(result2)
    jest.useRealTimers()
  })
})
```

## Files

- `lib/cache/stages.ts` — Pipeline stages caching
- `lib/cache/programs.ts` — Programs & universities caching
- `lib/cache/consultants.ts` — Consultant list caching
- `CACHING_STRATEGY_GUIDE.md` — This guide

## Related Guides

- `PAGINATION_IMPLEMENTATION_GUIDE.md` — Works well with caching
- `DATABASE_INDEXING_GUIDE.md` — Complement to caching
- `N_PLUS_1_OPTIMIZATION.md` — Reduce queries before caching

## References

- Next.js Caching: https://nextjs.org/docs/app/building-your-application/caching
- ISR: https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration
- On-Demand ISR: https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration#on-demand-revalidation
