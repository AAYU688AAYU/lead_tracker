# Quick Developer Reference

Fast lookup for common tasks, questions, and scenarios.

---

## 🎯 Before You Code — Critical Checks

### "Can I use column X?"

```bash
# Search the actual schema (ground truth)
grep -n "column_x" supabase/migrations/20260914000001_initial_schema.sql

# If found: Use it
# If NOT found: Either:
#   a) Use a different column name (check AGENT_GUIDE.md §1 for renames)
#   b) Create a migration to add the column (ask before doing this)
#   c) Abandon this approach and ask for clarification
```

### "What does the README say vs. what does the schema have?"

See **[docs/guides/AGENT_GUIDE.md §1](AGENT_GUIDE.md)** — reconciliation table.

Key mismatches:
- Docs: `assigned_consultant_id` | Schema: `consultant_id`
- Docs: `is_stalled` boolean | Schema: `lead_status = 'stalled'` enum
- Docs: 6 stage names (Inquiry, Counseling...) | Schema: 6 different names (initial_contact, document_collection...)

**Always use the schema names.**

### "Does this trigger already exist?"

```bash
# Common triggers that exist but may not be wired in the UI:
# - tr_notify_student_on_stage_change
# - tr_notify_student_on_reassignment
# - tr_notify_student_on_document_rejection
# - tr_auto_assign_lead (round-robin)
# - tr_enforce_stage_transition (FSM)

# Check if it exists:
grep -n "CREATE TRIGGER.*tr_name" supabase/migrations/

# If exists, verify it's connected to:
#   1. Database: Fires correctly on INSERT/UPDATE
#   2. Notifications table: Row is created
#   3. Frontend: Realtime subscription receives the notification
#   4. UI: Component displays it

# If any layer missing → that's the task, not rebuilding the trigger
```

---

## 💾 Making Changes — Step-by-Step

### "I need to add a new field to a table"

```bash
# 1. Create migration
cd supabase
supabase migration new add_field_to_leads

# 2. Edit the SQL file created (migrations/20260918xxxxxx_add_field_to_leads.sql)
ALTER TABLE leads ADD COLUMN new_field TEXT DEFAULT 'default_value';

# 3. Test locally
supabase db push

# 4. Verify in TypeScript schema (generate types)
supabase gen types typescript --local

# 5. Update docs (README, TEST_PLAN, USER_FLOW if this affects behavior)

# 6. Commit the migration
git add supabase/migrations/
git commit -m "feat: add new_field to leads table

- Stores X information from Y form
- Used by Z feature
- Includes NOT NULL constraint with default"

# 7. Commit TypeScript type updates (if auto-generated)
git add frontend/lib/supabase/types.ts
git commit -m "chore: update Supabase types after new_field migration"
```

### "I need to create a new API endpoint"

```typescript
// frontend/app/api/leads/[id]/route.ts

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Setup Supabase client
    const supabase = createServerClient(...);

    // 2. Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Validate input with Zod
    const body = await request.json();
    const validationResult = leadUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // 4. Enforce RLS (if not handled at DB layer)
    // Update query — RLS policies will prevent unauthorized access

    // 5. Execute query
    const { data, error } = await supabase
      .from("leads")
      .update(validationResult.data)
      .eq("id", params.id)
      .select();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to update lead" },
        { status: 500 }
      );
    }

    // 6. Audit log (if sensitive operation)
    await createAuditLogEntry(user.id, "UPDATE_LEAD", { lead_id: params.id });

    // 7. Return response
    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### "I need to add a React component with Realtime updates"

```typescript
// frontend/app/components/lead-status-display.tsx

import { useEffect, useState } from 'react';
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription';

interface LeadStatusDisplayProps {
  leadId: string;
}

export function LeadStatusDisplay({ leadId }: LeadStatusDisplayProps) {
  const [lead, setLead] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to Realtime updates
  const subscription = useRealtimeSubscription(
    'leads',
    { event: '*', schema: 'public', table: 'leads', filter: `id=eq.${leadId}` },
    (payload) => {
      // Handle update, insert, or delete
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        setLead(payload.new);
      } else if (payload.eventType === 'DELETE') {
        setError('Lead was deleted');
      }
    }
  );

  // Fetch initial data
  useEffect(() => {
    const fetchLead = async () => {
      try {
        const response = await fetch(`/api/leads/${leadId}`);
        const data = await response.json();
        setLead(data[0]);
      } catch (err) {
        setError('Failed to load lead');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLead();

    // CRITICAL: Cleanup subscription when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, [leadId, subscription]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!lead) return <div>No lead found</div>;

  return (
    <div className="p-4 border rounded">
      <h3>{lead.name}</h3>
      <p className={`status-${lead.lead_stage}`}>{lead.lead_stage}</p>
      <time>{new Date(lead.updated_at).toLocaleString()}</time>
    </div>
  );
}
```

---

## 🔍 Debugging Common Issues

### "My component isn't updating when data changes"

**Checklist:**
1. ✅ Realtime subscription enabled: `supabase.channel('public:leads').subscribe()`
2. ✅ Subscription cleaned up on unmount: `return () => subscription.unsubscribe()`
3. ✅ Correct filter: `filter: 'id=eq.${leadId}'` (not `filter: 'id=${leadId}'`)
4. ✅ Realtime policy exists: Check RLS policy `realtime` action
5. ✅ Data actually changed in database (not just in memory)

```bash
# Verify RLS policy allows Realtime
psql
SELECT * FROM pg_policies WHERE policyname LIKE '%realtime%';
```

### "TypeScript error: Property 'X' does not exist on type 'Lead'"

**Solution:**
1. Regenerate types: `cd supabase && supabase gen types typescript --local`
2. Commit updated types: `git add frontend/lib/supabase/types.ts`
3. Restart development server: `npm run dev` in a new terminal
4. If error persists, the database column might not exist (check migrations)

### "Pre-commit hook blocks my commit"

**Common causes:**
1. Trying to commit `.env.local` — Remove it: `git rm --cached .env.local`
2. Detected secrets pattern — Either it's a real secret (don't commit!) or a false positive:
   ```bash
   # Bypass with caution (only if you're certain it's safe):
   git commit --no-verify
   ```
3. Real credentials in `.env.local.example` — Fix the file, remove credentials, re-add

---

## 📝 Documentation — When & What to Update

### "I added a new database column"

Update these files:
1. **README.md** — If it's a new feature, explain it in §16–17
2. **TEST_PLAN.md** — If it changes UX, add a test case
3. **USER_FLOW.md** — If it changes a user journey, update the screen details
4. **Commit message** — Include "Updates docs:" footer

```bash
git commit -m "feat: add new_field to leads

- Stores X from Y
- Used by Z feature
- Includes NOT NULL constraint

Updates docs: README.md (§16.2), USER_FLOW.md (Screen A5)"
```

### "I found a documentation error"

**If it's a schema/column name mismatch:**
1. Check `supabase/migrations/` for the actual name (source of truth)
2. Update README/TEST_PLAN/USER_FLOW to use the actual name
3. Add a note to [AGENT_GUIDE.md §1](AGENT_GUIDE.md) if it's a known mismatch
4. Commit: `git commit -m "docs: fix column name references (assigned_consultant_id → consultant_id)"`

**If it's an outdated procedure:**
1. Test the correct procedure locally
2. Update the guide
3. Commit: `git commit -m "docs: update deployment procedure for Phase 10"`

---

## 🤖 Working With Agents

### "What does the agent need to succeed?"

Provide:
1. **Task description** — "Build X to do Y"
2. **Acceptance criteria** — "Verify with Z test case"
3. **Schema context** — Point to AGENT_GUIDE.md §1 for mismatches
4. **Example brief** (copy-paste template):

```markdown
# Task: [Feature Name]

## Objective
[One sentence describing what to build]

## Requirements
1. [Specific requirement]
2. [Specific requirement]
3. [Specific requirement]

## Constraints (CRITICAL)
- Schema reference: Use supabase/migrations/20260914000001_initial_schema.sql
- Key columns: consultant_id (NOT assigned_consultant_id), lead_stage (NOT is_stalled)
- Related triggers: tr_notify_student_on_reassignment should already exist
- Do NOT guess: For any table/column, grep the migrations file first

## Acceptance Criteria
- [ ] Commits are atomic (separate DB/API/UI/tests)
- [ ] npm run type-check passes
- [ ] npm run test:run passes (80%+ coverage)
- [ ] [Specific verification step]
- [ ] Documentation updated

See: CONTRIBUTING.md §X (Working With Agents)
```

### "The agent made a mistake — how do I ask for fixes?"

Be specific:

```
❌ BAD: "This doesn't work"

✅ GOOD: "The lead validation schema uses 'assigned_consultant_id' 
(line 45) but this column doesn't exist in the actual migrations 
(checked supabase/migrations/20260914000001_initial_schema.sql). 

Should use 'consultant_id' instead. See AGENT_GUIDE.md §1.

Also add a test case for empty consultant_id (edge case)."
```

---

## 🚀 Deployment Checklist

Before merging to main (which triggers automatic staging deployment):

- [ ] All tests pass: `npm run test:run`
- [ ] Type check passes: `npm run type-check`
- [ ] No console errors: `npm run build 2>&1 | grep -i error`
- [ ] No secrets detected by pre-commit hook
- [ ] Documentation updated if schema changed
- [ ] Commit messages are descriptive (not "update code")
- [ ] Commits are atomic (not 5 features in 1 commit)
- [ ] PR description explains the change
- [ ] At least one code review approval

---

## 📞 When to Ask Questions

**Ask before coding if:**
- You're unsure about a column/table name (even if README mentions it)
- The task requires schema changes
- You're resolving an AGENT_GUIDE.md mismatch
- You're building a feature marked as "product decision pending"

**Ask during code review if:**
- Agent commit messages are vague
- A file is changed that wasn't mentioned in the task
- Schema name differs from what AGENT_GUIDE.md says

**Ask after deployment if:**
- Bug is in production
- User reports unexpected behavior
- Performance is degraded

---

## 📚 Essential Reference Files

1. **[CONTRIBUTING.md](../../CONTRIBUTING.md)** — Full workflow guide
2. **[DAILY_DEVELOPER_WORKFLOW.md](DAILY_DEVELOPER_WORKFLOW.md)** — Step-by-step daily procedures
3. **[AGENT_GUIDE.md](AGENT_GUIDE.md)** — Schema mismatches & source of truth hierarchy
4. **[docs/architecture/README.md](../architecture/README.md)** — System design & components
5. **[SETUP.md](../../SETUP.md)** — Local environment setup
6. **[docs/frontend/README.md](../frontend/README.md)** — Frontend structure & guides

---

**Last Updated:** September 2026
