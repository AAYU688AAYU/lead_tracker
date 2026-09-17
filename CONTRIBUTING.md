# Contributing Guide

Thank you for contributing to Lead Tracker! This guide explains our development workflow, coding standards, and process for submitting changes.

## Getting Started

1. **Setup local environment:** Follow [SETUP.md](SETUP.md)
2. **Read architecture:** Review [docs/architecture/README.md](docs/architecture/README.md)
3. **Understand our stack:** Next.js 15, Supabase, TypeScript, React 19

## Development Workflow

### 1. Create a Feature Branch

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
