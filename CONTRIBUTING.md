# Contributing Guide

Thank you for contributing to Lead Tracker! This guide explains our development workflow, coding standards, and process for submitting changes.

## ⚡ Quick Start for New Contributors

**Before Your First Commit:**

1. **Setup local environment:** Follow [SETUP.md](SETUP.md)
2. **Read architecture:** Review [docs/architecture/README.md](docs/architecture/README.md)
3. **Understand our stack:** Next.js 15, Supabase, TypeScript, React 19
4. **CRITICAL: Understand schema mismatches** See [docs/guides/AGENT_GUIDE.md](docs/guides/AGENT_GUIDE.md) §1 — the documentation has errors about column names. Always verify against the actual migrations file before coding.
5. **Daily workflow:** Follow [docs/guides/DAILY_DEVELOPER_WORKFLOW.md](docs/guides/DAILY_DEVELOPER_WORKFLOW.md) for step-by-step procedures before, during, and after making changes

---

## 📚 Essential Documentation for Developers

These guides form the core of our development practices. **Read them in order:**

| Guide | Purpose | Read When |
|-------|---------|-----------|
| **[DAILY_DEVELOPER_WORKFLOW.md](docs/guides/DAILY_DEVELOPER_WORKFLOW.md)** | Step-by-step workflow (start of day → end of day) | First thing every morning |
| **[QUICK_DEVELOPER_REFERENCE.md](docs/guides/QUICK_DEVELOPER_REFERENCE.md)** | Fast lookup for common tasks and debugging | While coding, anytime you're stuck |
| **[AGENT_GUIDE.md](docs/guides/AGENT_GUIDE.md)** | Schema/docs mismatches, source of truth hierarchy | Before using the database or dispatching an agent |
| **SETUP.md** | Initial environment setup | One-time, at the start |
| **[docs/architecture/README.md](docs/architecture/README.md)** | System design and architecture reasoning | Once, for deep understanding |

---

## What Makes This Repository Special

This is a professional, multi-role SaaS platform (students, consultants, admins) with real-time features, database-enforced constraints, and audit logging. Your changes must:
- **Preserve data integrity** — Database triggers and RLS policies are your allies, not obstacles
- **Handle real-time correctly** — Realtime subscriptions must clean up; data races are possible
- **Never break auth** — JWT claims and middleware security are production hardening; test them
- **Keep schema/docs in sync** — When you change the database, update README + TEST_PLAN + USER_FLOW simultaneously

## Working With AI Agents (Kiro, Claude, etc.)

### For Developers Using Agents

**Guardrails for Agent-Generated Code:**

Agents can make excellent contributions, but they must follow strict rules to prevent logical errors and regressions. Use these guidelines:

#### 1. **Agent Must Know the Ground Truth (Before Dispatching)**

```bash
# Ensure agent has context of schema mismatches
# Point agent to: docs/guides/AGENT_GUIDE.md sections 1-2

# Example brief to agent:
"Build a feature to reassign leads. Reference AGENT_GUIDE.md §1:
- Use 'consultant_id' column (NOT 'assigned_consultant_id')
- Stage names are from lead_stage enum (NOT 'Inquiry', 'Counseling', etc.)
- Verify your code against migrations before committing"
```

#### 2. **Agent Commit Standards**

Agents must follow these rules:

✅ **Required:**
- Atomic commits (one feature per commit, not multiple features stacked)
- Descriptive commit messages with body explaining the "why"
- Reference to this guide in the commit message (e.g., "See CONTRIBUTING.md §X")
- Each commit focuses on a single logical change
- Database migration commits separate from application code commits

❌ **Not Allowed:**
- Vague commit messages ("update files", "fix code", "work in progress")
- Multiple unrelated changes in one commit (e.g., database schema + React component + tests in one commit)
- Committing directly to `main` (always use feature branches)
- Auto-squashing into previous commits without asking
- Guessing at column names from README instead of checking migrations

#### 3. **Verify Agent Work Before Merging**

Use this checklist:

```markdown
## Agent Code Review Checklist

- [ ] **Commits are descriptive** — Not "update code" but "feat: add lead reassignment with email notification"
- [ ] **One logical change per commit** — Can see 3 separate commits for 3 separate features
- [ ] **Schema verification** — Agent checked `supabase/migrations/` for column names (not guessed from README)
- [ ] **TypeScript compilation** — No errors, no `any` types, all nulls handled
- [ ] **Linting passes** — `npm run lint` with no errors
- [ ] **Tests added** — New code has tests; coverage 80%+
- [ ] **Realtime cleanup** — Subscriptions unsubscribed in useEffect cleanup
- [ ] **Error handling** — Edge cases handled (empty data, network errors, auth failures)
- [ ] **Documentation updated** — README/TEST_PLAN/USER_FLOW changed if schema changed
- [ ] **No debugging code** — No hardcoded URLs, temp variables, or console.logs
- [ ] **No credentials** — Pre-commit hook should have caught this, but double-check

If ALL checks pass → Approve. If ANY fails → Request specific changes, don't merge.
```

#### 4. **Common Agent Mistakes & How to Prevent Them**

| Mistake | Prevention | Ask Agent To |
|---------|-----------|---|
| Uses `assigned_consultant_id` (doesn't exist) | Point to AGENT_GUIDE.md §1 before starting | Verify column exists in migrations/20260914000001_initial_schema.sql |
| Describes `is_stalled` boolean (doesn't exist) | Clarify: stall is `lead_status = 'stalled'`, not a separate field | Check schema for actual implementation |
| Builds `applications` table (not in schema) | Confirm with product owner if multi-university is really needed | Stop and ask; don't build without explicit approval |
| Commits 5 files in one commit | Emphasize atomic commits with one clear purpose | Split into 5 commits, each with dedicated task |
| Doesn't update docs when schema changes | Require simultaneous README + TEST_PLAN + USER_FLOW updates | Make docs-as-code a required checklist item |
| Forgets Realtime unsubscription | Review all `useEffect` hooks in PR | Add cleanup function: `return () => subscription.unsubscribe()` |
| Guesses at table/column names | Provide link to AGENT_GUIDE.md source-of-truth hierarchy | Share grep command: `grep -r "table_name" supabase/migrations/` |

#### 5. **Example: Correct Agent Brief**

```markdown
# Task: Add Lead Reassignment Feature

## Objective
Allow admins and consultants to reassign a lead from one consultant to another, 
with automatic email notification and Realtime update.

## Requirements
1. Database trigger that notifies student on reassignment
2. API endpoint to reassign (validate auth, consultant exists, lead not archived)
3. Realtime subscription to show reassignment in consultant's Kanban
4. Email template for notification

## Constraints (CRITICAL)
- **Schema reference:** Use `supabase/migrations/20260914000001_initial_schema.sql`
- **Column names:** Lead assignment uses `consultant_id` (NOT `assigned_consultant_id`)
- **Triggers:** `tr_notify_student_on_reassignment` should already exist; verify it fires
- **Do NOT guess:** For any table/column, check migrations first. Ask if missing.
- **Docs are secondary:** If README and schema disagree, schema wins

## Acceptance Criteria
- [ ] Commits are atomic (separate DB trigger, API, Realtime, email)
- [ ] `npm run type-check` passes
- [ ] `npm run test:run` passes (80%+ coverage)
- [ ] Realtime subscription cleans up on unmount
- [ ] Trigger verification: SELECT * FROM pg_trigger WHERE tgname = 'tr_notify_student_on_reassignment'
- [ ] README updated with new endpoint

See: CONTRIBUTING.md §X for working with agents
```

#### 6. **If Agent Creates Breaking Changes**

Breaking changes = schema changes, API changes, or significant refactors.

```bash
# Before merging, ask agent to:
git log --oneline feature/breaking-change

# If you see "feat: rename consultant_id to assigned_consultant_id"
# DO NOT MERGE. Instead:
# 1. Ask why the rename (docs confusion? improvement?)
# 2. If improvement: create a separate MIGRATION task, not a feature task
# 3. If docs confusion: fix the docs instead (no schema rename needed)
# 4. Confirm with product owner before any schema rename
```

### For Agents Writing Code in This Repository

#### Source of Truth Hierarchy (When Documentation Conflicts)

1. **Actual application code** (if it runs successfully against the DB)
2. **`supabase/migrations/20260914000001_initial_schema.sql`** (authoritative schema)
3. **`docs/guides/AGENT_GUIDE.md`** (reconciliation guide, updated real-time)
4. **`README.md`** (architecture reasoning is sound, column names sometimes wrong)
5. **`TEST_PLAN.md` / `USER_FLOW.md`** (useful for UX, some gaps are stale)

**When in doubt:** Ask. Surface ambiguities rather than guessing.

#### Critical Schema/Documentation Mismatches (Resolve Before Coding)

See [AGENT_GUIDE.md §1](docs/guides/AGENT_GUIDE.md) for the complete list. Key ones:

| What Docs Say | What Schema Actually Has | What To Do |
|---|---|---|
| `assigned_consultant_id` FK on leads | `consultant_id` | Use `consultant_id` in code |
| `is_stalled` boolean flag | `lead_status = 'stalled'` enum value | Check enum, not boolean |
| Stages: Inquiry → Counseling → Doc Collection | Stages: initial_contact, document_collection, application_submission | Use actual enum values |
| `applications` table (multi-university) | No such table; lead has exactly one `program_id` | Don't build without explicit approval |
| `escalation_threshold_hours` (two-tier logic) | `escalation_level INTEGER (1-3)` | Confirm which model is actually used |

**Rule:** Before writing code against a table/column, verify it exists:
```bash
grep -n "table_name" supabase/migrations/20260914000001_initial_schema.sql
```

If it doesn't exist, that's a migration task, not a code task. Flag it.

#### Atomic Commits (The Agent Standard)

Each commit should be a single, complete, independently testable unit:

```bash
# ✅ GOOD: Three separate commits
git commit -m "feat: add lead status badge component

- Display lead_stage enum value with color coding
- Support all 6 valid stage values
- Responsive on mobile (stack at 375px)"

git commit -m "feat: add ZOD validation for lead status updates

- Validate new status against lead_stage enum
- Enforce valid stage transitions (FSM)
- Include unit tests (100% coverage)"

git commit -m "feat: wire up lead status badge in leads table

- Replace plain text with badge component
- Subscribe to Realtime updates on leads.lead_stage
- Unsubscribe in useEffect cleanup"

# ❌ BAD: All mixed together
git commit -m "update leads

Added component, validation, and wired it all up together"
```

#### When Building New Features

Follow this checklist:

- [ ] **Schema verified** — Table/columns exist in migrations (not guessed from README)
- [ ] **Database-layer correctness** — Migrations created if needed; triggers fire correctly
- [ ] **API layer** — Endpoint validates input with Zod, checks auth, enforces RLS
- [ ] **UI layer** — Component displays data, handles loading/error states
- [ ] **Real-time** — Subscriptions properly cleaned up; no memory leaks
- [ ] **Error handling** — All failure paths covered (DB error, validation error, network error, auth error)
- [ ] **Tests** — 80%+ coverage, test edge cases (empty data, permission denials, network failures)
- [ ] **Documentation** — Updated README + TEST_PLAN + USER_FLOW if behavior changed
- [ ] **Commits** — Each commit is atomic, testable, and descriptive

---

```bash
# Always branch from main
git checkout main
git pull origin main

# Create feature branch (use descriptive name)
git checkout -b feature/student-document-upload
```

Branch naming convention:
- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation updates
- `refactor/` — Code refactoring
- `test/` — Test additions

### 2. Write Code & Tests

- Write **test cases** for new features
- Follow **TypeScript strict mode** (no `any` types)
- Use **component patterns** from [docs/development/STITCH_UI_UX_PROMPT.md](docs/development/STITCH_UI_UX_PROMPT.md)
- Keep **commits atomic** (one feature per commit)

### 3. Validate Locally

Before pushing, run:

```bash
cd frontend

# Type checking
npm run type-check

# Linting (if configured)
npm run lint

# Tests
npm run test

# Build
npm run build
```

All checks must pass.

### 4. Commit & Push

```bash
# Stage changes
git add .

# Write clear commit message
git commit -m "feature: add document upload for students

- Allow students to upload transcripts, test scores, LORs
- Validate file types (PDF, image only)
- Show upload progress bar
- Implements anti-tamper file versioning

Fixes #123"

# Push to your branch
git push origin feature/student-document-upload
```

Commit message format:
- **Type:** `feature`, `fix`, `docs`, `refactor`, `test`, `chore`
- **Subject:** Present tense, ~50 characters, no period
- **Body:** Detailed explanation (wrap at 72 chars)
- **Issue:** Reference GitHub issues with `Fixes #123`

### 5. Create Pull Request

On GitHub:

1. Create PR from your branch → `main`
2. Fill in the PR template:
   - **Description** — What does this change?
   - **Testing** — How was it tested?
   - **Checklist** — All items completed?

3. Ensure CI checks pass (TypeScript, tests, build)
4. Wait for code review

### 6. Code Review & Merge

- Address review feedback
- Push updates to the same branch (don't create new PRs)
- Merge after approval

Once merged, your changes deploy automatically to staging, and after another approval, to production.

## Coding Standards

### TypeScript

- **No `any` types** — Use explicit types
- **Strict mode enabled** — All files must pass `npm run type-check`
- **Null checks** — Handle null/undefined explicitly

```typescript
// ❌ Bad
const data: any = response.data

// ✅ Good
interface UserData {
  name: string
  email: string
}
const data: UserData = response.data
```

### React Components

- **Functional components** — No class components
- **Hooks for state** — Use `useState`, `useEffect`, etc.
- **Prop interfaces** — Define types for all props

```typescript
// ✅ Good
interface CardProps {
  title: string
  isHighlighted?: boolean
  onClose: () => void
}

export function Card({ title, isHighlighted, onClose }: CardProps) {
  return (
    <div className={isHighlighted ? 'bg-highlight' : ''}>
      <h3>{title}</h3>
      <button onClick={onClose}>Close</button>
    </div>
  )
}
```

### Database Changes

- **Migrations only** — Never modify schema directly
- **Reversible** — Migrations must support rollback
- **Tested** — Always test locally before submitting

```bash
# Create migration
supabase migration new add_user_preferences

# Edit the SQL file, then test
supabase db push

# Verify the change works
supabase local db shell
# SELECT * FROM user_preferences;
```

### Styling

- **Tailwind CSS** — Use utility classes
- **Consistency** — Follow existing patterns
- **Responsive** — Mobile-first design

```typescript
// ✅ Good
<div className="flex flex-col gap-4 md:flex-row">
  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
    Submit
  </button>
</div>
```

## Testing

### Writing Tests

```typescript
import { render, screen } from '@testing-library/react'
import { LoginForm } from './login-form'

describe('LoginForm', () => {
  it('submits form with valid email and password', async () => {
    render(<LoginForm />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    // Assert expected behavior
  })
})
```

### Coverage Requirements

- **New features:** 80%+ line coverage
- **Bug fixes:** 100% line coverage for the fix
- **Run coverage:** `npm run test:coverage`

## Server-Side Code (Edge Functions)

```typescript
// supabase/functions/send-notification/index.ts
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Handle webhook
  const { record } = await req.json()
  
  // Process
  const supabase = createClient(...)
  
  // Return response
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
```

## Documentation

- **Update README** if behavior changes
- **Document new APIs** in code comments
- **Update guides** if workflow changes

For major features, consider adding a guide in `docs/guides/`.

## Security Considerations

- **Never commit secrets** — Use `.env.local`
- **Validate user input** — Always use Zod schemas
- **Check auth** — Verify user role before database operations
- **Use RLS** — Row-level security policies in database
- **Rate limit** — Protect public endpoints

```typescript
// ✅ Good
import { validatePasswordComplexity } from '@/lib/auth/password-reset'

const result = validatePasswordComplexity(password, [email])
if (!result.isValid) {
  return { error: result.errors.join('; ') }
}
```

## Performance Guidelines

- **Bundle size** — Monitor with `npm run build`
- **Database queries** — Use indexes, avoid N+1
- **Real-time subscriptions** — Unsubscribe when component unmounts
- **Image optimization** — Use `next/image` component

## Performance Checklist Before PR

- [ ] No TypeScript errors
- [ ] No console warnings/errors
- [ ] Tests passing
- [ ] Build succeeds
- [ ] Database migrations tested
- [ ] Security considerations reviewed

## Common Issues

### TypeScript Error After Merge

```bash
# Clear build cache
rm -rf .next
npm run type-check
npm run build
```

### Database Migration Conflict

If multiple PRs add migrations:

```bash
# Squash and renumber
supabase migration list
# Edit timestamps to maintain order
```

### Need Help?

- **Architecture questions:** See [docs/architecture/README.md](docs/architecture/README.md)
- **Setup issues:** See [SETUP.md](SETUP.md)
- **Code patterns:** See [docs/development/](docs/development/)
- **Agent workflow:** See [docs/guides/AGENT_GUIDE.md](docs/guides/AGENT_GUIDE.md)

---

## Review Process

1. **Automated Checks** (1–5 min)
   - TypeScript: ✓
   - Tests: ✓
   - Build: ✓

2. **Peer Review** (4–24 hours)
   - Code quality
   - Architecture alignment
   - Security review

3. **Merge & Deploy**
   - Automatically deploys to staging
   - After approval, deploys to production

## Release & Versioning

Releases follow semantic versioning (MAJOR.MINOR.PATCH):
- `MAJOR` — Breaking changes
- `MINOR` — New features
- `PATCH` — Bug fixes

See [docs/phases/](docs/phases/) for version history.

---

**Questions?** Open an issue or contact the maintainers.

Thank you for making Lead Tracker better! 🚀
