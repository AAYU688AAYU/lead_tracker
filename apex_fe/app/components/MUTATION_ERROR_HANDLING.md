# Error Handling in Mutations

This document explains the error handling system for async mutations (server actions) in Apex CRM.

## Components & Hooks

### 1. Error Toast Components
- **ErrorToast**: Red error message with auto-dismiss (6s)
- **SuccessToast**: Green success message with auto-dismiss (3s)
- **WarningToast**: Amber warning message with optional action

**Import:**
```tsx
import { ErrorToast, SuccessToast, WarningToast } from '@/app/components/error-toast'
```

### 2. useToast Hook
Manages toast state and display.

**Usage:**
```tsx
const { toasts, addToast, removeToast, clearAll } = useToast()

// Show error
addToast('error', 'Failed to update lead')

// Show success
addToast('success', 'Lead updated successfully')

// Show warning with action
addToast('warning', 'Some leads are stalled', {
  label: 'Review',
  onClick: () => { /* navigate */ }
})
```

### 3. useMutationToast Hook
Automatically shows toasts based on `useActionState` mutation state.

**Usage in Server Actions:**
```tsx
'use client'
import { useMutationToast } from '@/app/lib/use-mutation-toast'

export function MyComponent() {
  const [state, formAction, pending] = useActionState(serverAction, INITIAL_STATE)
  
  // Auto-show error/success toasts
  useMutationToast(state, 'Lead updated successfully', (error) => {
    console.error('Mutation failed:', error)
  })
  
  return (
    <form action={formAction}>
      {/* form contents */}
    </form>
  )
}
```

### 4. useErrorHandler Hook
For try/catch error handling in client code.

**Usage:**
```tsx
const { showError } = useErrorHandler()

try {
  await someApiCall()
} catch (err) {
  showError(err, 'Failed to fetch data')
}
```

## Toast Provider

The **ToastProvider** is wrapped in the root layout and automatically renders all active toasts.

**Location:** `app/layout.tsx`

No additional setup needed in child components — just use the hooks.

## Error State Structure

Server actions should return an error state following this interface:

```tsx
interface MutationState {
  status?: 'idle' | 'pending' | 'success' | 'error'
  error?: string    // User-friendly error message
  message?: string  // Alternative message field
  [key: string]: any // Other mutation-specific data
}
```

**Example server action:**
```tsx
export async function advanceLeadStage(formData: FormData) {
  try {
    const leadId = formData.get('lead_id')
    
    // Validation
    if (!leadId) {
      return { 
        status: 'error', 
        error: 'Lead ID is required' 
      }
    }
    
    // API call
    const result = await updateLead(leadId, { stage: 'next_stage' })
    
    return { 
      status: 'success', 
      next_stage: 'next_stage',
      message: 'Stage updated'
    }
  } catch (err) {
    return { 
      status: 'error', 
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}
```

## Best Practices

1. **Always include user-friendly error messages** — avoid technical jargon
2. **Use `useMutationToast` for server actions** — handles state automatically
3. **Show context in errors** — "Failed to reassign lead" is better than "Error"
4. **Use SuccessToast for confirmations** — confirms action completed
5. **Distinguish error types**:
   - User errors (validation): inline `<FieldError>` + toast
   - Server errors (500): ErrorToast auto-dismiss
   - Network errors: WarningToast with retry action
6. **Keep auto-dismiss duration reasonable**:
   - Error: 6s (needs attention)
   - Success: 3s (quick confirmation)
   - Warning: manual close (important info)

## Examples

### Example 1: Stage Advance with Error Handling
```tsx
function StageSection({ lead }) {
  const [state, formAction, pending] = useActionState(advanceStage, INITIAL_STATE)
  
  useMutationToast(state, `Lead moved to ${lead.next_stage}`)
  
  return (
    <form action={formAction}>
      <input type="hidden" name="lead_id" value={lead.id} />
      <button disabled={pending} type="submit">
        {pending ? 'Advancing…' : 'Advance'}
      </button>
      {state.status === 'error' && (
        <p className="text-sm text-red-600 mt-2">{state.error}</p>
      )}
    </form>
  )
}
```

### Example 2: Client-side Async with Error Handling
```tsx
function DocumentUpload({ leadId }) {
  const { showError } = useErrorHandler()
  const [uploading, setUploading] = useState(false)
  
  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('lead_id', leadId)
      
      const res = await fetch('/api/documents', { 
        method: 'POST',
        body: formData 
      })
      
      if (!res.ok) throw new Error('Upload failed')
      
      // Success handled by addToast in component
      addToast('success', 'Document uploaded')
    } catch (err) {
      showError(err, 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }
  
  return (
    <div>
      {/* upload UI */}
    </div>
  )
}
```

### Example 3: Reassignment with Confirmation
```tsx
function ReassignSection({ lead }) {
  const [state, formAction, pending] = useActionState(reassignLead, INITIAL_STATE)
  const { addToast } = useToast()
  
  useEffect(() => {
    if (state.status === 'success') {
      addToast('success', `Lead reassigned to ${state.consultant_name}`)
    } else if (state.status === 'error') {
      addToast('error', state.error || 'Failed to reassign')
    }
  }, [state, addToast])
  
  return (
    <form action={formAction}>
      <select name="consultant_id">
        {/* options */}
      </select>
      <button disabled={pending} type="submit">
        {pending ? 'Reassigning…' : 'Reassign'}
      </button>
    </form>
  )
}
```

## Integration Checklist

- [ ] Import `useMutationToast` or `useErrorHandler`
- [ ] Add toast hook to component
- [ ] Ensure server action returns proper error state
- [ ] Test error paths (validation, server errors, network failures)
- [ ] Verify toast messages are user-friendly
- [ ] Check that success toasts appear on completion
