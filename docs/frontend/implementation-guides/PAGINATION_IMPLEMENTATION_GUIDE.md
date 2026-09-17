# Pagination Implementation Guide

**Phase 10 LOW #16**: Implement pagination for admin list queries to improve performance and UX for large datasets.

## Overview

Pagination is critical for admin interfaces handling thousands of leads/consultants. Benefits:

1. **Performance**: Load only needed data (~25 items vs 10,000)
2. **UX**: Faster page load, responsive interface
3. **Database**: Reduced resource usage per query
4. **Mobile**: Better experience on slow connections

## Strategy

### Where Pagination Applies

| List | Current | Target | Priority |
|------|---------|--------|----------|
| Admin leads list | All leads | 25/page | HIGH |
| Consultant team | All consultants | 20/page | HIGH |
| Analytics details | All records | 50/page | MEDIUM |
| Document list | All documents | 15/page | MEDIUM |
| Communication log | All items | 30/page | LOW |
| Activity/audit log | All events | 50/page | LOW |

### Implementation Methods

#### Option 1: Offset-Based (Simpler, Current Best Practice)

```sql
SELECT * FROM leads
ORDER BY created_at DESC
LIMIT 25 OFFSET 0    -- Page 1
LIMIT 25 OFFSET 25   -- Page 2
LIMIT 25 OFFSET 50   -- Page 3
```

**Pros**: Simple, works with any database, familiar
**Cons**: Slower for very large offsets, doesn't handle real-time insertions well

#### Option 2: Cursor-Based (Better for Real-Time)

```sql
SELECT * FROM leads
WHERE id > :cursor
ORDER BY id ASC
LIMIT 26  -- One extra to check if more pages exist
```

**Pros**: Consistent pagination even if data changes, faster for large datasets
**Cons**: More complex, harder to jump to arbitrary pages

### Decision

**Use offset-based pagination initially** (simpler, sufficient for <100k records). Upgrade to cursor-based if scale requires.

## Implementation

### 1. Add Query Parameters

**Before**:
```tsx
export async function getAdminLeads() {
  const leads = await supabase
    .from('leads')
    .select('*')
  
  return leads
}
```

**After**:
```tsx
import { PAGINATION_PRESETS } from '@/lib/pagination'

export async function getAdminLeads(page: number = 1) {
  const config = PAGINATION_PRESETS.ADMIN_LEADS
  const offset = (page - 1) * config.pageSize
  
  // Get paginated leads
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + config.pageSize - 1)
  
  if (leadsError) throw leadsError
  
  const total = leads?.length ?? 0
  
  return {
    leads: leads ?? [],
    total,
    page,
    pageSize: config.pageSize,
  }
}
```

### 2. Update Page Component

**Before**:
```tsx
const { leads } = await getAdminLeads()
```

**After**:
```tsx
import { parsePaginationParams, PAGINATION_PRESETS } from '@/lib/pagination'

interface PageProps {
  searchParams?: Promise<{ page?: string; limit?: string }>
}

export default async function AdminPage({ searchParams }: PageProps) {
  const params = await searchParams ?? {}
  const { page, limit } = parsePaginationParams(
    { page: params.page, limit: params.limit },
    PAGINATION_PRESETS.ADMIN_LEADS
  )
  
  const { leads, total } = await getAdminLeads(page)
  const pagination = calculatePagination(
    (page - 1) * limit,
    limit,
    total
  )
  
  return (
    <main>
      <LeadAssignList leads={leads} />
      <PaginationNav
        currentPage={page}
        totalPages={pagination.totalPages}
        baseUrl="/dashboard/admin"
      />
    </main>
  )
}
```

### 3. Create Pagination UI Component

```tsx
'use client'

import Link from 'next/link'

interface PaginationNavProps {
  currentPage: number
  totalPages: number
  baseUrl: string
}

export function PaginationNav({
  currentPage,
  totalPages,
  baseUrl,
}: PaginationNavProps) {
  return (
    <nav
      className="flex items-center justify-between border-t border-[var(--border)] pt-4"
      aria-label="Pagination navigation"
    >
      <div className="text-sm text-[var(--text-muted)]">
        Page {currentPage} of {totalPages}
      </div>

      <div className="flex gap-2">
        {/* Previous */}
        {currentPage > 1 && (
          <Link
            href={`${baseUrl}?page=${currentPage - 1}`}
            className="px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] border border-[var(--border)] hover:bg-[var(--background-hover)]"
          >
            ← Previous
          </Link>
        )}

        {/* Page numbers */}
        <div className="flex gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) =>
                p === 1 ||
                p === totalPages ||
                (p >= currentPage - 2 && p <= currentPage + 2)
            )
            .map((p, idx, arr) => (
              <div key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="px-1">…</span>
                )}
                {p === currentPage ? (
                  <span className="px-3 py-2 text-sm font-medium text-[var(--accent)]">
                    {p}
                  </span>
                ) : (
                  <Link
                    href={`${baseUrl}?page=${p}`}
                    className="px-3 py-2 text-sm rounded-[var(--radius-md)] border border-transparent hover:border-[var(--border)]"
                  >
                    {p}
                  </Link>
                )}
              </div>
            ))}
        </div>

        {/* Next */}
        {currentPage < totalPages && (
          <Link
            href={`${baseUrl}?page=${currentPage + 1}`}
            className="px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] border border-[var(--border)] hover:bg-[var(--background-hover)]"
          >
            Next →
          </Link>
        )}
      </div>
    </nav>
  )
}
```

### 4. Handle Edge Cases

```typescript
import { validatePaginationParams } from '@/lib/pagination'

// Validate user input
const validation = validatePaginationParams(page, limit, total)

if (!validation.isValid) {
  console.warn(`Invalid pagination: ${validation.error}`)
  // Use corrected values if available
  if (validation.corrected) {
    const { page: correctedPage, limit: correctedLimit } = validation.corrected
    // Redirect or use corrected values
  }
}
```

## Performance Considerations

### Index for Pagination

Ensure your leads table is indexed by sort column:

```sql
-- For admin leads list (ordered by created_at DESC)
CREATE INDEX idx_leads_created_at_desc ON leads(created_at DESC)

-- For status filtering with pagination
CREATE INDEX idx_leads_status_created_at ON leads(status, created_at DESC)
```

### Query Optimization

**Before** (slower):
```sql
SELECT * FROM leads ORDER BY created_at DESC LIMIT 25 OFFSET 5000
-- Needs to scan 5000+ rows then discard them
```

**After** (faster with index):
```sql
SELECT * FROM leads 
WHERE created_at < (SELECT created_at FROM leads ORDER BY created_at DESC LIMIT 1 OFFSET 4999)
ORDER BY created_at DESC 
LIMIT 25
```

### Database Count Query

Getting `count(*)` for large tables can be slow:

```typescript
// Option 1: Always get exact count (fine for <100k)
const { count } = await supabase
  .from('leads')
  .select('*', { count: 'exact' })

// Option 2: Use estimate for faster response (PostgreSQL)
const { count } = await supabase
  .from('leads')
  .select('*', { count: 'estimated' })
  // Returns count estimate, much faster for very large tables
```

## URL Parameter Patterns

### Single Page

```
GET /dashboard/admin?page=2
```

**Response:**
```json
{
  "leads": [...],
  "pagination": {
    "page": 2,
    "limit": 25,
    "total": 1523,
    "totalPages": 61,
    "hasNextPage": true,
    "hasPreviousPage": true
  }
}
```

### With Filters

```
GET /dashboard/admin?status=stalled&stage=intake&page=2&limit=50
```

### Preserve Filters on Navigation

When clicking next/prev, preserve existing filters:

```typescript
function generateNextPageUrl(baseUrl: string, params: URLSearchParams): string {
  const current = new URLSearchParams(params)
  const page = Number(current.get('page') ?? 1)
  current.set('page', String(page + 1))
  return `${baseUrl}?${current.toString()}`
}
```

## SEO & Crawling

### rel=prev/next Links

```tsx
// In page metadata or HTML head
<link rel="prev" href="/admin?page=1" />
<link rel="next" href="/admin?page=3" />
```

### Disallow Pagination in robots.txt (optional)

```
Disallow: /dashboard/admin?page=*
```

## Testing

```typescript
import { parsePaginationParams, calculatePagination } from '@/lib/pagination'

describe('Pagination', () => {
  test('parses page parameter', () => {
    const result = parsePaginationParams(
      { page: '2', limit: '25' },
      { pageSize: 25 }
    )
    expect(result.page).toBe(2)
    expect(result.offset).toBe(25)
  })

  test('validates out-of-range page', () => {
    const result = calculatePagination(0, 25, 100)
    expect(result.totalPages).toBe(4)
    // page 0 should be clamped to 1
  })

  test('handles empty result set', () => {
    const result = calculatePagination(0, 25, 0)
    expect(result.totalPages).toBe(0)
    expect(result.hasNextPage).toBe(false)
  })
})
```

## Checklist for Implementation

### Phase 1: Leads List (Highest Priority)
- [ ] Create `PaginationNav` component
- [ ] Update `getAdminLeads()` to accept page parameter
- [ ] Update admin page to use `searchParams`
- [ ] Add `.range()` to Supabase query
- [ ] Get count from Supabase `{ count: 'exact' }`
- [ ] Calculate pagination metadata
- [ ] Add pagination navigation to page
- [ ] Test with 100+ leads
- [ ] Test edge cases (page > total, page 0, negative)

### Phase 2: Consultants List (High Priority)
- [ ] Apply same pattern to team page
- [ ] Update `getConsultants()` server action
- [ ] Add pagination nav to team list

### Phase 3: Analytics List (Medium Priority)
- [ ] Apply to analytics detail pages
- [ ] Consider cursor-based pagination if many events

### Phase 4: Optimize (Low Priority)
- [ ] Add database indexes if not present
- [ ] Monitor query performance
- [ ] Consider cursor-based pagination if needed
- [ ] Add caching for frequently viewed pages

## Migration Path

1. **Week 1**: Implement offset-based pagination on leads list
2. **Week 2**: Extend to other admin lists
3. **Week 3**: Monitor performance, optimize if needed
4. **Week 4+**: Consider upgrades to cursor-based if scale requires

## Gotchas

### Real-Time Subscriptions with Pagination
Be careful: Realtime updates might add items to page 1, shifting everything down. Consider:
- Refetch after realtime event
- Notify user: "New items available, refresh to see"
- Use cursor-based pagination for better consistency

### Caching + Pagination
If caching results, cache by (page, limit, filters) tuple:
```typescript
const cacheKey = `leads:${page}:${limit}:${JSON.stringify(filters)}`
```

### Deep Linking
Users can share `page=10` links. Ensure URL is bookmarkable and navigable.

## Files

- `lib/pagination.ts` — All utilities
- `components/PaginationNav.tsx` — UI component
- `PAGINATION_IMPLEMENTATION_GUIDE.md` — This guide

## Related

- `DATABASE_INDEXING_GUIDE.md` — Create indexes for pagination performance
- `SERVER_ACTION_TIMEOUTS_GUIDE.md` — Handle slow pagination queries with timeouts
