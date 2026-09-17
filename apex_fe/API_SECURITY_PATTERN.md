# API Security Pattern — Phase 10

**Objective:** Ensure all API routes enforce server-side authorization and never trust client-provided user IDs or query parameters.

---

## Golden Rules

### Rule 1: Always Authenticate First
```typescript
const user = await getCurrentUser()
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Rule 2: Never Trust User ID from Query/Body
```typescript
// ❌ WRONG — User controls their own ID
const userId = searchParams.get('user_id')

// ✅ CORRECT — Get ID from authenticated session
const user = await getCurrentUser()
const userId = user.id
```

### Rule 3: Always Verify Resource Ownership
```typescript
// ❌ WRONG — Trusts query param
const notifications = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', searchParams.get('user_id'))

// ✅ CORRECT — Uses authenticated user ID
const notifications = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', user.id)
```

### Rule 4: Use Explicit Query Filters
```typescript
// ❌ WRONG — Generic query, relies on RLS
const { data } = await supabase
  .from('leads')
  .select('*')

// ✅ CORRECT — Explicit filter for authenticated user
const { data } = await supabase
  .from('leads')
  .select('*')
  .eq('consultant_id', user.id)
  .eq('status', 'active')
```

---

## API Endpoint Pattern

### Template: Consultant-Only Endpoint

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/server'
import { 
  verifyConsultantAccess, 
  logUnauthorizedAccess,
  sanitizeQueryParams 
} from '@/lib/api/auth-guard'

/**
 * GET /api/consultant/leads
 *
 * Fetch leads assigned to the authenticated consultant
 */
export async function GET(request: NextRequest) {
  try {
    // 1. AUTHENTICATE
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // 2. AUTHORIZE — Verify this endpoint is for authenticated user
    // (If endpoint was consultant/:id/leads, verify ownership)
    const consultantId = searchParams.get('consultant_id')
    if (consultantId && !verifyConsultantAccess(consultantId, user.id)) {
      await logUnauthorizedAccess(user.id, 'consultant_leads_api', {
        attempted_consultant_id: consultantId,
        reason: 'Consultant ID mismatch'
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. SANITIZE INPUTS
    const params = sanitizeQueryParams(
      {
        page: searchParams.get('page'),
        limit: searchParams.get('limit'),
        status: searchParams.get('status'),
      },
      {
        page: { type: 'number', default: 0, min: 0 },
        limit: { type: 'number', default: 50, min: 1, max: 100 },
        status: { 
          type: 'enum', 
          default: 'active',
          options: ['active', 'stalled', 'completed', 'dropped']
        },
      }
    )

    // 4. QUERY with explicit filters (use authenticated user.id, not params)
    const supabase = createClient()
    const offset = params.page * params.limit

    const { data, count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('consultant_id', user.id)  // ← Use authenticated ID
      .eq('status', params.status)
      .order('updated_at', { ascending: false })
      .range(offset, offset + params.limit - 1)

    if (error) throw error

    return NextResponse.json({
      leads: data,
      total: count,
      page: params.page,
    })
  } catch (err) {
    console.error('[GET /api/consultant/leads] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Common Vulnerabilities Fixed

### Vulnerability #1: Query Parameter ID Trusting
**Before:**
```typescript
const userId = searchParams.get('user_id')
const data = await db.from('users').select('*').eq('id', userId)
```

**After:**
```typescript
const user = await getCurrentUser()
const data = await db.from('users').select('*').eq('id', user.id)
```

---

### Vulnerability #2: Missing Authorization Check
**Before:**
```typescript
export async function GET(request: NextRequest) {
  const { data } = await supabase.from('data').select('*')
  return NextResponse.json(data)
}
```

**After:**
```typescript
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { data } = await supabase
    .from('data')
    .select('*')
    .eq('user_id', user.id)
  return NextResponse.json(data)
}
```

---

### Vulnerability #3: Incomplete Resource Ownership Verification
**Before:**
```typescript
const notificationId = params.id
const { error } = await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('id', notificationId)  // ← No user_id check!
```

**After:**
```typescript
const notificationId = params.id
const user = await getCurrentUser()

// 1. Verify the notification belongs to this user
const { data: notification } = await supabase
  .from('notifications')
  .select('id')
  .eq('id', notificationId)
  .eq('user_id', user.id)
  .single()

if (!notification) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

// 2. Now update it
const { error } = await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('id', notificationId)
```

---

## Checklist for New API Endpoints

- [ ] **Authenticate:** Get user from session, verify not null
- [ ] **Authorize:** Verify user owns/can access resource
- [ ] **Sanitize:** Validate and limit query parameters
- [ ] **Filter:** Use explicit SQL filters with authenticated user ID
- [ ] **Error Messages:** Don't leak information (use generic messages)
- [ ] **Logging:** Log unauthorized access attempts
- [ ] **Status Codes:** Use correct HTTP codes (401, 403, 404)
- [ ] **Testing:** Test with wrong user ID, missing auth, etc.

---

## Testing Unauthorized Access

```bash
# Test 1: Missing authentication
curl -X GET http://localhost:3000/api/consultant/leads

# Test 2: Wrong consultant ID
curl -X GET "http://localhost:3000/api/consultant/leads?consultant_id=OTHER_USER_ID" \
  -H "Cookie: auth_token=VALID_TOKEN"

# Test 3: Accessing other user's notifications
curl -X GET "http://localhost:3000/api/notifications?user_id=OTHER_USER_ID" \
  -H "Cookie: auth_token=YOUR_TOKEN"

# Should all return 401 or 403
```

---

## Current API Endpoints (Audited Phase 10)

| Endpoint | Status | Notes |
|----------|--------|-------|
| GET /api/notifications | ✅ Secure | Uses user.id from session |
| PATCH /api/notifications/[id] | ✅ Secure | Verifies ownership before update |
| PATCH /api/notifications/read-all | ✅ Secure | Uses user.id from session |
| GET /api/leads/recovery | ✅ Secure | Verifies consultant_id matches user.id |

---

## Future Audits

All new API endpoints must follow this pattern. Regular audits recommended:
- Monthly security review of all `/api/` routes
- Test each endpoint with wrong user IDs
- Monitor `/api/activity_logs` for `UNAUTHORIZED_ACCESS_ATTEMPT` entries
- Use this checklist for code reviews

---

## References

- OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- CWE-639: Authorization Bypass: https://cwe.mitre.org/data/definitions/639.html
- OWASP Top 10 - A01:2021 Broken Access Control: https://owasp.org/Top10/A01_2021-Broken_Access_Control/
