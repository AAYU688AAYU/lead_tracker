# Loading UI Components Guide

## Overview

Apex CRM provides a comprehensive set of loading UI components to provide visual feedback during async operations. These components follow these principles:

1. **Always show something** — never leave user wondering if something is happening
2. **Match content shape** — skeleton loaders resemble final content
3. **Use appropriate level** — spinner, progress bar, or skeleton based on operation
4. **Announce to assistive tech** — aria-live and sr-only for screen readers
5. **Keep it brief** — most operations should complete quickly

## Components

### 1. LoadingSpinner

Simple spinning icon for inline loading states.

**File:** `app/components/loading-spinner.tsx`

**Usage:**
```tsx
import { LoadingSpinner } from '@/app/components/loading-spinner'

export function MyComponent() {
  const [loading, setLoading] = useState(false)
  
  return (
    <div>
      {loading && <LoadingSpinner size="md" label="Loading data..." />}
    </div>
  )
}
```

**Props:**
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `label`: Screen reader announcement (optional)

**When to use:**
- Simple async operations (API calls, mutations)
- Inside buttons or form fields
- Short-lived operations (<5 seconds)

### 2. FullScreenSpinner

Full-screen overlay for page-level loading.

**Usage:**
```tsx
import { FullScreenSpinner } from '@/app/components/loading-spinner'

export function MyPage() {
  if (pageLoading) {
    return <FullScreenSpinner label="Loading dashboard..." />
  }
  
  return <Dashboard />
}
```

**Props:**
- `label`: Loading message (default: 'Loading...')

**When to use:**
- Initial page load
- Heavy operations that block interaction
- Page transitions

### 3. LoadingButton

Button that shows loading state with disabled state.

**Usage:**
```tsx
import { LoadingButton } from '@/app/components/loading-spinner'

export function SubmitForm() {
  const [submitting, setSubmitting] = useState(false)
  
  return (
    <LoadingButton
      isLoading={submitting}
      loadingText="Saving..."
      className="w-full px-4 py-2 bg-accent text-white rounded"
      onClick={handleSubmit}
    >
      Save
    </LoadingButton>
  )
}
```

**Props:**
- `isLoading`: Boolean indicating loading state
- `disabled`: Additional disabled state (optional)
- `children`: Button text
- `loadingText`: Text to show while loading (default: 'Loading...')
- `className`: Tailwind classes for button styling

**When to use:**
- Form submissions
- Action buttons that trigger async operations
- Prevent double-submission

### 4. UploadProgress

Progress bar with file name and percentage.

**Usage:**
```tsx
import { UploadProgress } from '@/app/components/loading-spinner'

export function FileUpload() {
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState('document.pdf')
  
  return (
    <UploadProgress progress={progress} fileName={fileName} />
  )
}
```

**Props:**
- `progress`: 0-100 percentage
- `fileName`: Name of file being uploaded (optional)

**When to use:**
- File uploads
- Large data transfers
- Operations where progress can be tracked

### 5. PageLoadingBar

Minimal progress bar at top of page.

**Usage:**
```tsx
import { PageLoadingBar } from '@/app/components/loading-spinner'

export function App() {
  const [pageLoading, setPageLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  
  return (
    <>
      <PageLoadingBar isVisible={pageLoading} progress={progress} />
      <YourContent />
    </>
  )
}
```

**Props:**
- `isVisible`: Show/hide the bar (default: true)
- `progress`: 0-100 percentage (default: 50)

**When to use:**
- Page navigation/transitions
- Background data loading
- Subtle indication of work in progress

### 6. Skeleton Loaders

Pre-built skeleton shapes for common content types.

**File:** `app/components/skeleton.tsx`

**Available:**
- `SkeletonMetricCard` — for dashboard metrics
- `SkeletonKanbanColumn` — for kanban stage
- `SkeletonLeadCard` — for lead entries
- `SkeletonTableRow` — for table rows
- `SkeletonList` — for list items
- `SkeletonFormField` — for form inputs
- `SkeletonParagraph` — for text content

**Usage:**
```tsx
import { SkeletonMetricCard } from '@/app/components/skeleton'

export function MetricsSection() {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        <SkeletonMetricCard />
        <SkeletonMetricCard />
        <SkeletonMetricCard />
      </div>
    )
  }
  
  return <RealMetrics />
}
```

**When to use:**
- Initial page load (via loading.tsx)
- Content regions with known shape
- Replace content placeholder during hydration

### 7. DocumentUploadWithProgress

Complete document upload component with drag-drop, validation, and progress.

**File:** `app/components/document-upload-with-progress.tsx`

**Usage:**
```tsx
import { DocumentUploadWithProgress } from '@/app/components/document-upload-with-progress'

export function DocumentSection({ leadId }) {
  return (
    <DocumentUploadWithProgress
      leadId={leadId}
      maxSizeMB={10}
      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
      onSuccess={(docId, fileName) => {
        console.log(`Uploaded: ${fileName}`)
      }}
      onError={(error) => {
        console.error(error)
      }}
    />
  )
}
```

**Props:**
- `leadId`: ID of lead for document association
- `onSuccess`: Callback on successful upload (documentId, fileName)
- `onError`: Callback on error (error message)
- `disabled`: Disable upload input
- `accept`: File types (default: '.pdf,.doc,.docx,.jpg,.jpeg,.png')
- `maxSizeMB`: Max file size in MB (default: 10)

**Features:**
- Drag and drop support
- File validation (size, type)
- Progress tracking (%)
- Visual feedback at each stage
- Error handling with user-friendly messages
- Screen reader announcements

## Loading States by Operation Type

### Server Actions (useActionState)
```tsx
import { useActionState } from 'react'
import { LoadingButton } from '@/app/components/loading-spinner'

export function MyForm() {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE)
  
  return (
    <form action={formAction}>
      <LoadingButton
        isLoading={pending}
        loadingText="Saving..."
        className="..."
        type="submit"
      >
        Save
      </LoadingButton>
    </form>
  )
}
```

### Async Fetch Operations
```tsx
import { useEffect, useState } from 'react'
import { LoadingSpinner } from '@/app/components/loading-spinner'

export function DataFetch() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
  }, [])
  
  return loading ? <LoadingSpinner /> : <DataDisplay data={data} />
}
```

### Initial Page Load
```tsx
// app/dashboard/loading.tsx
import { SkeletonMetricCard } from '@/app/components/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <h1>Dashboard</h1>
      <div className="grid grid-cols-3 gap-3">
        <SkeletonMetricCard />
        <SkeletonMetricCard />
        <SkeletonMetricCard />
      </div>
    </div>
  )
}
```

### File Upload
```tsx
import { DocumentUploadWithProgress } from '@/app/components/document-upload-with-progress'

export function DocumentUpload({ leadId }) {
  return (
    <DocumentUploadWithProgress
      leadId={leadId}
      onSuccess={() => alert('Uploaded!')}
    />
  )
}
```

## Accessibility Considerations

### Screen Reader Support

All loading components include:
- **aria-label** for describing the loading state
- **role="status"** for status messages
- **aria-live="polite"** for announcements
- **sr-only** text for context-specific announcements

**Example:**
```tsx
<div role="status" aria-live="polite" className="sr-only">
  Uploading document - 45% complete
</div>
```

### ARIA Attributes

**LoadingSpinner:**
- `role="status"` — indicates status message
- `aria-label` — describes what's loading

**UploadProgress:**
- `role="progressbar"` — indicates progress
- `aria-valuenow` — current progress (0-100)
- `aria-valuemin` — minimum (0)
- `aria-valuemax` — maximum (100)

**PageLoadingBar:**
- `role="progressbar"` — indicates progress
- `aria-label` — identifies as page loading

### Focus Management

- Loading spinners don't steal focus
- Disabled buttons remain focusable (just disabled)
- Full-screen spinners don't trap keyboard (escape to continue)
- Overlay spinners use `inset-0 z-50` for visibility but don't prevent navigation

## Performance Best Practices

### Don't Overload
```tsx
// BAD: Too many loading indicators
<LoadingSpinner /> ... <LoadingSpinner /> ... <LoadingSpinner />

// GOOD: Single indicator per operation
<LoadingSpinner size="md" label="Loading..." />
```

### Minimum Duration
```tsx
// BAD: Shows/hides too quickly (janky)
const [loading, setLoading] = useState(false)
setLoading(true)
await fetch(url) // 10ms
setLoading(false)

// GOOD: Show for minimum time (usually handled by API)
// APIs should take >200ms for perceived loading
```

### Skeleton Placement
```tsx
// BAD: Skeleton in wrong place
<div>
  <SkeletonMetricCard /> {/* Hidden by CSS */}
</div>

// GOOD: Skeleton replaces real content
{loading ? <SkeletonMetricCard /> : <MetricCard />}
```

## Troubleshooting

### Spinner Not Showing
- Check `display` CSS (not hidden)
- Verify parent has `position: relative` if using absolute positioning
- Check z-index (use `z-50` for overlays)

### Progress Not Updating
- Ensure state updates trigger re-render
- Use `Math.round()` for progress to avoid fractional values
- Verify XMLHttpRequest `progress` event fires

### Skeleton Height Mismatch
- Ensure skeleton height matches final content
- Use `h-[XYZpx]` exact heights not `h-auto`
- Test after final content loads

### Screen Reader Not Announcing
- Verify `aria-live="polite"` is set
- Check that element is in DOM when announced
- Use `aria-live="assertive"` for urgent updates
- Add `aria-label` or text content for context

## References

- [Loading UI Best Practices](https://www.nngroup.com/articles/progress-indicators/)
- [Skeleton Screens](https://www.nngroup.com/articles/skeleton-screens/)
- [ARIA: progressbar](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/progressbar_role)
- [ARIA: status](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/status_role)
