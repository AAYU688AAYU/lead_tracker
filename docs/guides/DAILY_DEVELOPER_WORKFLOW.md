# Daily Developer Workflow & Git Procedures

Professional workflow to keep your codebase synchronized, prevent conflicts, and maintain code quality while working both manually and with agents.

---

## 🌅 Start of Day — Before Making Any Changes

### 1. Sync Local Repository (5 minutes)

```bash
# Open terminal in project root
cd ~/lead_tracker

# Ensure you're on main branch
git checkout main

# Fetch all remote changes (doesn't modify your files)
git fetch origin

# Check if you're behind
git status

# Expected output: "Your branch is up to date with 'origin/main'"
# If BEHIND: proceed to step 2
# If AHEAD: you have unpushed commits (investigate)
```

### 2. Update Your Local Branch (if behind)

```bash
# Option A: Fast-forward merge (if no local changes)
git merge origin/main

# Option B: If you have local uncommitted changes
# First, stash them
git stash

# Then update
git merge origin/main

# Then restore your changes
git stash pop

# Resolve any conflicts (see Conflict Resolution section)
```

### 3. Check for New Migrations

```bash
# List migration files to see if new ones were added
ls -la supabase/migrations/

# If new migrations exist, apply them to local database
cd supabase
supabase db pull  # Sync remote schema changes

# Or if using GitHub as source of truth:
git diff HEAD~5 supabase/migrations/  # See recent migration changes
supabase db push  # Apply to local Postgres
```

### 4. Install Updated Dependencies

```bash
cd frontend

# Check if package-lock.json changed
git diff HEAD supabase/package-lock.json

# If changed, reinstall
npm ci  # Use 'ci' (clean install) not 'install' for reproducible builds
```

### 5. Rebuild & Verify Local Environment

```bash
# Clear Next.js cache
rm -rf .next

# Run type check (catches schema issues early)
npm run type-check

# Run linting
npm run lint

# Run tests (optional but recommended)
npm run test:run  # or 'test' if watch mode is default

# Expected: All pass ✅ (if any fail, check step 2-4)
```

### 6. Create Your Feature Branch

```bash
# Do NOT work on main branch directly
git checkout -b feature/my-feature-name

# Confirm you're on the right branch
git branch  # You should see * feature/my-feature-name

# Set up remote tracking
git push -u origin feature/my-feature-name
```

**Branch Naming Conventions:**
- `feature/student-document-upload` — New functionality
- `fix/consultant-kanban-refresh-bug` — Bug fixes
- `docs/update-schema-guide` — Documentation only
- `refactor/api-response-validation` — Code quality
- `test/e2e-admin-login` — Test additions
- `chore/upgrade-tailwind-config` — Tooling/dependencies

---

## 💻 During Development — Commit Frequently & Specifically

### 7. Make Changes in Small, Logical Pieces

**Rule: One feature/fix per commit, not multiple features stacked**

```bash
# ✅ GOOD: Three commits for three logical pieces
git add frontend/app/leads/lead-card.tsx
git commit -m "feat: add lead status badge component

- Display lead stage with color coding
- Support all 6 pipeline stages
- Responsive design for mobile viewports"

git add frontend/lib/schemas/lead.ts
git commit -m "feat: add lead validation schema

- Validate lead_stage enum against schema
- Add status transition rules
- Document valid state combinations"

git add frontend/app/leads/page.tsx
git commit -m "feat: integrate lead status badge in leads table

- Replace plain text stage with badge component
- Apply consistent styling across all views
- Update TypeScript types"

# ❌ BAD: Multiple unrelated changes in one commit
git add .
git commit -m "update leads stuff"
```

### 8. Before Every Commit: Local Verification

```bash
# Stage ONLY the files you changed for this specific feature
git add frontend/app/leads/lead-card.tsx

# Review what you're about to commit
git diff --staged

# If satisfied, commit with descriptive message (see format below)
git commit -m "feat: add lead status badge component

- Display lead stage with color coding
- Support all 6 pipeline stages
- Responsive design for mobile viewports"

# Pre-commit hook will run automatically:
# ✓ Checks for .env file commits
# ✓ Detects hardcoded secrets
# ✓ Enforces naming conventions
```

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

**Example:**

```
feat: add lead status badge with color coding

The lead card now displays the current pipeline stage with
appropriate color coding (blue for initial, yellow for stalled, etc).
Supports all 6 stages defined in lead_stage enum.

- Use Tailwind color utility classes
- Mobile-responsive (stacks on small screens)
- Accessibility: includes aria-label for screen readers

Fixes #456
Co-authored-by: Agent Name <agent@kiro.dev>
```

**Rules:**
- **Type:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- **Subject:** Imperative mood, 50 characters max, no period
- **Body:** Detailed explanation, wrap at 72 characters, justify the change
- **Footer:** Reference issues (`Fixes #123`) and co-authors if using agents

---

## 🔀 Mid-Development — Keeping Up With Team Changes

### 9. Periodically Sync With Remote (Every 2-4 hours or before sync points)

```bash
# Check if new changes were pushed while you were coding
git fetch origin

# See what changed on main
git log --oneline main..origin/main

# If new changes exist AND you have local commits
git rebase origin/main

# or if you prefer merge:
git merge origin/main

# Handle any conflicts (see Conflict Resolution)
```

### 10. Handle Merge Conflicts

**Conflict Resolution Workflow:**

```bash
# If conflict occurs during merge/rebase
git status

# Expected: Shows "both modified: <file>"

# Open the conflicted file and look for:
# <<<<<<< HEAD          (your changes)
# your code here
# =======
# their code here
# >>>>>>> feature/other-branch

# DECISION POINTS:
# 1. Keep your version: Delete their block
# 2. Keep their version: Delete your block  
# 3. Keep both: Manually merge the logic

# After fixing, stage the resolved file
git add frontend/app/leads/lead-card.tsx

# Complete the merge/rebase
git rebase --continue   # if rebasing
git commit              # if merging
```

**Prevention Tips:**
- Communicate with team about what files you're changing
- Avoid changing the same lines as teammates
- Merge from main frequently (daily if possible)
- Keep branches short-lived (finish within 1-2 days)

---

## 🧪 Before Creating PR — Final Quality Checks

### 11. Comprehensive Pre-PR Verification

```bash
# Ensure you're up to date with main first
git fetch origin
git merge origin/main

# Run full test suite (not just your changes)
npm run test:run

# Type check must pass (no `any` types, all nulls handled)
npm run type-check

# Linting must pass
npm run lint

# Build must succeed
npm run build

# Check bundle size didn't balloon
npm run build 2>&1 | grep "Route" | head -20

# Database migrations (if any changes)
cd ../supabase
supabase db push
supabase migration list  # Confirm migration applied

# Return to frontend
cd ../frontend
```

**Failure? Don't create PR yet.** Fix locally, commit, then verify again.

### 12. Push to Remote & Create Pull Request

```bash
# Push your commits
git push origin feature/my-feature-name

# Create PR on GitHub
# - Title: Short, descriptive (matches commit subject)
# - Description: Copy from commit message body + add testing notes
# - Checklist: Verify all items (see template below)
```

**PR Template to Include in Description:**

```markdown
## Description
Brief summary of changes (2-3 sentences)

## Type of Change
- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally with `npm run test`
- [ ] Type checking passes
- [ ] Build succeeds
- [ ] Database migrations tested (if applicable)
- [ ] No new console warnings/errors

## Verification Checklist
- [ ] Code follows project style guide
- [ ] No hardcoded secrets or credentials
- [ ] Documentation updated (README, guides)
- [ ] Tests added/updated for new code
- [ ] No breaking changes to public APIs
```

---

## ✅ Code Review & Merge — Collaboration with Team & Agents

### 13. Review Requested

When another developer or agent requests review:

1. **For Agent-Generated Code:**
   - Check commit messages are descriptive (not "update code")
   - Verify all files are necessary (no accidental unrelated changes)
   - Confirm schema changes match actual migrations (not docs)
   - Look for hardcoded values that should be configurable
   - Ensure error handling for edge cases
   - Check that Realtime subscriptions are cleaned up properly

2. **Add Review Comments:**
   ```
   # ✅ Approve with suggestions
   This looks good overall. Consider:
   - Unsubscribe from Realtime in useEffect cleanup
   - Add validation for empty lead name
   
   # ❌ Request changes
   This won't work because:
   - The 'assigned_consultant_id' column doesn't exist (see AGENT_GUIDE.md §1)
   - Should use 'consultant_id' instead
   ```

### 14. Address Feedback

```bash
# After review feedback received, don't create new commit for small fixes
# Instead, amend the existing commit:

git add frontend/app/leads/lead-card.tsx
git commit --amend

# This updates the most recent commit without creating a new one
# (only do this if you haven't pushed yet)

# If already pushed, force-push (only if you're the only one on the branch)
git push --force-with-lease origin feature/my-feature-name

# If multiple people on the branch, create a new commit instead
git add frontend/app/leads/lead-card.tsx
git commit -m "review: address feedback on lead status badge

- Unsubscribe from Realtime in cleanup function
- Add validation for empty lead name"
```

### 15. Merge to Main

Once approved:

```bash
# Ensure your branch is up to date
git fetch origin
git merge origin/main

# Fix any new conflicts with latest main

# Merge to main (via GitHub UI or CLI)
# Strategy: "Squash and merge" if small feature, or "Create a merge commit"

# GitHub will handle the merge automatically

# After merge, switch back to main and clean up
git checkout main
git pull origin main

# Delete local feature branch
git branch -d feature/my-feature-name

# Delete remote feature branch (GitHub usually does this automatically)
git push origin --delete feature/my-feature-name
```

---

## 🎯 Working With Agents — Guidelines for AI Collaboration

### 16. Agent-Specific Procedures

**Before Dispatching an Agent:**

```bash
# 1. Ensure your local repo is clean
git status
# Expected: "nothing to commit, working tree clean"

# 2. Sync with latest main
git fetch origin
git merge origin/main

# 3. Create feature branch and give agent context
git checkout -b feature/agent-task-name

# 4. Provide agent with:
# - AGENT_GUIDE.md (for schema/docs mismatches)
# - Exact task description (what needs to be built)
# - Acceptance criteria (how to verify it works)
# - Any schema constraints (tables, columns to use)
```

**Monitoring Agent Work:**

```bash
# While agent is working, periodically check:
git log --oneline feature/agent-task-name

# Expected: Small, descriptive commits
# Example:
# a1b2c3d feat: add lead status badge component
# d4e5f6g feat: add lead validation schema
# h7i8j9k feat: integrate badge in leads table

# If commits are vague ("update files", "fix code"), ask for clarification
```

**Agent Code Review Checklist:**

- [ ] Commits are atomic (one logical change per commit)
- [ ] Commit messages are descriptive and follow format
- [ ] No files changed that weren't mentioned in the task
- [ ] Schema references match actual migrations (check AGENT_GUIDE.md §1)
- [ ] TypeScript has no errors, linting passes
- [ ] Realtime subscriptions properly cleaned up
- [ ] Error handling for edge cases
- [ ] No hardcoded secrets or temporary debugging code
- [ ] Tests added/updated
- [ ] Documentation updated

**If Agent Work Needs Changes:**

```bash
# Ask agent to:
# 1. Fix in place (amend commits if not yet pushed)
# 2. Create specific follow-up commits for fixes
# 3. Not squash into main commit (keeps history clear)

# Example feedback:
"The lead status badge looks good, but:
1. The validation schema tries to use 'assigned_consultant_id' 
   which doesn't exist. Use 'consultant_id' per AGENT_GUIDE.md §1
2. Add a cleanup function to unsubscribe from Realtime
3. Add 2 test cases for edge cases (empty lead, stalled status)

Create a follow-up commit for these fixes (don't amend the existing one)."
```

---

## 🔄 End of Day — Before Leaving

### 17. Final Sync Before You Leave

```bash
# Push all your commits
git push origin feature/my-feature-name

# If PR already created, just push (it auto-updates)

# Check local repo is clean
git status
# Expected: "nothing to commit, working tree clean"

# Confirm your branch is pushed
git branch -vv
# Expected: Shows "feature/my-feature-name ... origin/feature/my-feature-name [ahead X]"
```

### 18. Next Morning — Resume Where You Left Off

```bash
# Follow "Start of Day" section (steps 1-6)
# This ensures you're not working on stale code
```

---

## 🚨 Emergency Procedures — If Something Goes Wrong

### Accidentally Committed to Main

```bash
# If you committed directly to main (DON'T PANIC):

# Option 1: Move commits to a feature branch
git branch feature/recovery-branch
git reset --soft origin/main
git checkout feature/recovery-branch

# Option 2: Revert and start over
git revert HEAD  # Creates a new commit undoing your changes
git push origin main
```

### Lost Commits (Before Push)

```bash
# Git has a safety net: reflog
git reflog

# Find your lost commit SHA
git reset --hard <commit-sha>

# Your commits are back
```

### Massive Merge Conflict

```bash
# Too complicated to fix manually:

# Abort the merge/rebase
git merge --abort
git rebase --abort

# Start fresh
git fetch origin
git rebase origin/main --strategy-option=ours  # Prefer your changes
git rebase origin/main --strategy-option=theirs  # Prefer their changes

# Then manually review and fix
```

### Need to Undo Your Last Commit (Before Push)

```bash
# Undo last commit but keep changes
git reset --soft HEAD~1

# Undo last commit and discard changes
git reset --hard HEAD~1
```

---

## 📋 Cheat Sheet — Common Commands

| Task | Command |
|------|---------|
| Start day | `git checkout main && git fetch origin && git merge origin/main` |
| Create feature branch | `git checkout -b feature/name && git push -u origin feature/name` |
| Make atomic commit | `git add <files> && git commit -m "type: message"` |
| Before PR | `npm run type-check && npm run lint && npm run test && npm run build` |
| Sync with main | `git fetch origin && git rebase origin/main` |
| Handle conflicts | `git status` → fix files → `git add` → `git rebase --continue` |
| Push to PR | `git push origin feature/name` |
| Amend last commit | `git add . && git commit --amend` (before push only) |
| View unpushed commits | `git log origin/main..HEAD` |
| Undo last commit | `git reset --soft HEAD~1` |
| View branch status | `git branch -vv` |

---

## 🎓 Learning Resources

- **Git Documentation:** `git help <command>`
- **Interactive Tutorial:** GitHub's "Hello World"
- **Visualization Tool:** `git log --graph --all --decorate --oneline`
- **Team Standards:** See [CONTRIBUTING.md](../../CONTRIBUTING.md)
- **Schema Reference:** See [AGENT_GUIDE.md](AGENT_GUIDE.md) for table/column names

---

**Remember:** Clear, frequent commits prevent conflicts. Sync early, sync often. Ask questions before pushing.
