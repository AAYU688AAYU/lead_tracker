# Comprehensive Input Validation with Zod — Phase 10 #8

## Overview

This document outlines the comprehensive Zod validation schema implementation for all server actions and API inputs in the Lead Tracker CRM.

**Goal:** Ensure all user inputs are validated consistently using Zod before processing, providing:
- Type-safe input validation
- Clear error messages
- Centralized schema definitions
- Easy migration path for existing validation

## Schema Files Created

### 1. **`lib/schemas/auth.ts`** — Authentication
Validates:
- `signInSchema` — Email + password login
- `passwordResetRequestSchema` — Request password reset
- `passwordResetCompleteSchema` — Complete reset with new password
- `setPasswordSchema` — Set initial password (after signup)
- `changePasswordSchema` — Change current password

**Key features:**
- Email validation (format + lowercase)
- Password complexity (12+ chars, uppercase, lowercase, digit, special char)
- Password confirmation matching
- Current password validation (for change)

### 2. **`lib/schemas/leads.ts`** — Lead Management
Validates:
- `advanceStageSchema` — Move lead to next stage
- `updateLeadStatusSchema` — Change lead status (active, stalled, completed, dropped)
- `logCommunicationSchema` — Log communication with lead
- `reviewDocumentSchema` — Approve/reject documents with reason
- `updateLeadNotesSchema` — Update lead notes
- `reassignConsultantSchema` — Reassign lead to different consultant
- `advanceStageKanbanSchema` — Drag-and-drop stage movement
- `consultantDetailSchema` — Fetch consultant details (admin)
- `assignConsultantSchema` — Assign consultant to lead (admin)

**Key features:**
- UUID validation for all IDs
- Enum validation for stages, statuses, channels, actions
- String length constraints with min/max
- Conditional validation (rejection reason required if action='rejected')
- Dashboard context tracking (consultant vs admin)

### 3. **`lib/schemas/admin.ts`** — Admin Dashboard
Validates:
- `toggleAcceptingSchema` — Toggle consultant lead acceptance
- `deactivateConsultantSchema` — Deactivate consultant
- `offboardConsultantSchema` — Offboard consultant (reassign leads)
- `updateStageLabelSchema` — Update pipeline stage label
- `updateStallThresholdSchema` — Update stall threshold (hours)
- `updateEscalationThresholdSchema` — Update escalation threshold
- `updateSeverityLevelSchema` — Update severity level
- `analyticsQuerySchema` — Query analytics data

**Key features:**
- UUID validation for consultant/lead IDs
- Cross-field validation (can't offboard to self)
- Number coercion and range validation (1-8760 hours)
- Enum validation for stages and severity levels
- Graceful date parsing with fallback

### 4. **`lib/schemas/apply.ts`** — Application & Intake
Validates:
- `submitApplicationSchema` — Public student intake form
- `setApplicationPasswordSchema` — Set password after applying

**Key features:**
- Name validation (letters + spaces/hyphens/apostrophes)
- International phone number validation
- Email validation with length limits
- UUID validation for program_id
- Optional notes field
- Password complexity (same as auth)

### 5. **`lib/schemas/notifications.ts`** — Notifications
Validates:
- `notificationQuerySchema` — Query parameters (page, limit, type)
- `markNotificationAsReadSchema` — Mark single notification read
- `bulkDeleteNotificationsSchema` — Delete multiple notifications
- `getNotificationsSchema` — Server action notification fetch

**Key features:**
- Number coercion with range validation (0-50 for limit)
- UUID validation for notification IDs
- Array validation with min/max items
- Graceful query param defaults

## Usage Patterns

### Pattern 1: Simple Form Validation

```typescript
'use server'

import { signInSchema } from '@/lib/schemas/auth'

export async function signIn(formData: FormData) {
  // Validate input
  const result = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next'),
  })

  if (!result.success) {
    // Return validation errors to client
    return { 
      status: 'error', 
      errors: result.error.flatten() 
    }
  }

  // Use validated data
  const { email, password, next } = result.data
  
  // ... perform action with type-safe data
}
```

### Pattern 2: API Route Validation

```typescript
// app/api/notifications/route.ts

import { notificationQuerySchema } from '@/lib/schemas/notifications'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  // Validate query parameters
  const result = notificationQuerySchema.safeParse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
    type: searchParams.get('type'),
  })

  if (!result.success) {
    return Response.json(
      { error: 'Invalid query parameters', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const { page, limit, type } = result.data
  // ... fetch notifications
}
```

### Pattern 3: Discriminated Unions (Advanced)

For complex input types, use discriminated unions:

```typescript
import { z } from 'zod'

const leadActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('advance_stage'),
    lead_id: z.string().uuid(),
    current_stage: z.enum(['initial_contact', 'in_progress', ...]),
  }),
  z.object({
    action: z.literal('update_status'),
    lead_id: z.string().uuid(),
    status: z.enum(['active', 'stalled', 'completed', 'dropped']),
  }),
])

// Type-safe handling
const input = leadActionSchema.parse(formData)
if (input.action === 'advance_stage') {
  // TypeScript knows input.current_stage exists here
}
```

## Migration Guide

### For Existing Server Actions

**Before:**
```typescript
export async function updateLeadStatus(formData: FormData) {
  const leadId = formData.get('lead_id') as string
  const status = formData.get('status') as string
  
  // Manual validation
  if (!leadId || !status) {
    return { status: 'error', message: 'Missing required fields' }
  }
  
  if (!isValidUUID(leadId)) {
    return { status: 'error', message: 'Invalid lead ID' }
  }
  
  if (!['active', 'stalled', 'completed', 'dropped'].includes(status)) {
    return { status: 'error', message: 'Invalid status' }
  }
  
  // ... rest of action
}
```

**After:**
```typescript
import { updateLeadStatusSchema } from '@/lib/schemas/leads'

export async function updateLeadStatus(formData: FormData) {
  // One-line validation with Zod
  const result = updateLeadStatusSchema.safeParse({
    lead_id: formData.get('lead_id'),
    status: formData.get('status'),
  })
  
  if (!result.success) {
    return { status: 'error', errors: result.error.flatten() }
  }
  
  const { lead_id, status } = result.data
  // ... rest of action
}
```

**Benefits:**
- ✅ Single source of truth for validation rules
- ✅ Type-safe (TypeScript knows fields exist)
- ✅ Better error messages
- ✅ Easier to maintain (change once, everywhere updates)

## Error Handling

### Recommended Pattern

```typescript
import { z } from 'zod'

export async function myAction(formData: FormData) {
  const result = mySchema.safeParse({...})
  
  if (!result.success) {
    const errors = result.error.flatten()
    
    return {
      status: 'error',
      message: 'Validation failed',
      fieldErrors: errors.fieldErrors, // { email: ['Invalid email'] }
      formErrors: errors.formErrors,   // General form errors
    }
  }
  
  // Proceed with validated data
}
```

### Client-Side Error Display

```typescript
// In a React component with useActionState

const [state, formAction] = useActionState(myAction, null)

return (
  <form action={formAction}>
    <input name="email" />
    {state?.fieldErrors?.email && (
      <span className="error">{state.fieldErrors.email[0]}</span>
    )}
    {state?.formErrors?.[0] && (
      <div className="alert">{state.formErrors[0]}</div>
    )}
  </form>
)
```

## Validation Rules Reference

### String Validations
```typescript
z.string()
  .min(1)              // Required
  .min(8)              // Minimum length
  .max(255)            // Maximum length
  .email()             // Email format
  .url()               // URL format
  .uuid()              // UUID format
  .regex(/pattern/)    // Custom regex
  .toLowerCase()       // Transform to lowercase
  .trim()              // Trim whitespace
  .optional()          // Make optional
  .nullable()          // Allow null
```

### Number Validations
```typescript
z.number()
  .int()               // Integer only
  .min(1)              // Minimum value
  .max(100)            // Maximum value
  .pipe(z.coerce.number())  // Coerce from string
```

### Array Validations
```typescript
z.array(
  z.string().uuid()    // Each item must be UUID
)
  .min(1)              // At least 1 item
  .max(100)            // At most 100 items
```

### Enum Validations
```typescript
z.enum(['active', 'stalled', 'completed'], {
  message: 'Invalid status'
})
```

### Refinement (Custom Logic)
```typescript
z.object({
  password: z.string(),
  confirmPassword: z.string(),
})
.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],  // Which field to attach error to
  }
)
```

## Schema Composition

### Extending Schemas

```typescript
// Base schema
const userBaseSchema = z.object({
  email: z.string().email(),
  full_name: z.string(),
})

// Extended schema
const userWithPasswordSchema = userBaseSchema.extend({
  password: z.string().min(8),
})

// Merged schema
const combinedSchema = userBaseSchema.merge(otherSchema)

// Partial schema (all fields optional)
const userUpdateSchema = userBaseSchema.partial()

// Picked fields only
const emailOnlySchema = userBaseSchema.pick({ email: true })
```

## Type Safety

All schemas automatically generate TypeScript types:

```typescript
import type { z } from 'zod'
import { submitApplicationSchema } from '@/lib/schemas/apply'

// Automatically generated type matching schema
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>

// Now use in function signature
function processApplication(data: SubmitApplicationInput) {
  // TypeScript knows all fields exist and types
  console.log(data.email) // string
  console.log(data.phone) // string
}
```

## Testing Validation

```typescript
import { submitApplicationSchema } from '@/lib/schemas/apply'

describe('submitApplicationSchema', () => {
  it('accepts valid input', () => {
    const result = submitApplicationSchema.safeParse({
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '+1 (555) 123-4567',
      program_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = submitApplicationSchema.safeParse({
      full_name: 'John Doe',
      email: 'not-an-email',
      phone: '+1 (555) 123-4567',
      program_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    
    expect(result.success).toBe(false)
    expect(result.error.flatten().fieldErrors.email).toBeDefined()
  })
})
```

## Performance Considerations

### Schema Caching
```typescript
// Good: Define schema once, reuse
const schema = submitApplicationSchema

export async function action1(data) {
  return schema.safeParse(data)
}

export async function action2(data) {
  return schema.safeParse(data)
}
```

### Avoid Repeated Parsing
```typescript
// Bad: Parse twice
const validated1 = schema.safeParse(data)
const validated2 = schema.safeParse(data)

// Good: Parse once
const result = schema.safeParse(data)
if (result.success) {
  const data = result.data
}
```

## Files Modified

- `lib/schemas/auth.ts` — Authentication schemas
- `lib/schemas/leads.ts` — Lead management schemas
- `lib/schemas/admin.ts` — Admin dashboard schemas
- `lib/schemas/apply.ts` — Application/intake schemas
- `lib/schemas/notifications.ts` — Notification schemas
- This file: `ZOD_VALIDATION_GUIDE.md` — Documentation

## Next Steps: Schema Integration

To complete the implementation:

1. Update `app/(auth)/login/actions.ts` to use `signInSchema`
2. Update `app/apply/actions.ts` to use `submitApplicationSchema`
3. Update `app/dashboard/consultant/actions.ts` to use lead schemas
4. Update `app/dashboard/admin/team/actions.ts` to use admin schemas
5. Update API routes to use notification schemas
6. Add test suites for each schema

## References

- [Zod Documentation](https://zod.dev/)
- [Zod Validation Guide](https://zod.dev/?id=basic-usage)
- [TypeScript Type Inference](https://zod.dev/?id=type-inference)
