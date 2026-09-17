# E2E Testing Guide for Phase 4

This guide documents recommended E2E tests for Phase 4 enhancements using Playwright or Cypress.

## Test Framework Setup

Install Playwright (recommended for Next.js):
```bash
npm install -D @playwright/test
```

Or use Cypress:
```bash
npm install -D cypress
```

## Recommended E2E Tests

### 1. Drag-Drop & Stage Advancement

**Test**: Dragging a lead card to the next stage should advance it

```typescript
// tests/consultant-dashboard.spec.ts
import { test, expect } from '@playwright/test'

test('drag lead card to next stage', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('input[name="email"]', 'consultant@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard/consultant')

  // Find first lead card in "inquiry" column
  const leadCard = await page.locator('[data-testid="lead-card"]:first-child')
  const leadName = await leadCard.textContent()

  // Drag to next column
  const nextColumn = await page.locator('[data-testid="stage-column"][data-stage="consultation"]')
  await leadCard.dragTo(nextColumn)

  // Verify success toast
  await expect(page.locator('text=Advanced lead')).toBeVisible()

  // Verify card moved
  await expect(nextColumn.locator(`text=${leadName}`)).toBeVisible()
})

test('drag-drop error shows toast on failure', async ({ page }) => {
  // ... setup ...
  
  // Try invalid drag (backward)
  await leadCard.dragTo(previousColumn)
  
  // Should not move and show error (optional - depends on implementation)
  await page.waitForTimeout(500)
  // Card stays in original position
})
```

### 2. Realtime Lead Subscription

**Test**: New lead appears on dashboard when assigned in another session

```typescript
test('new assigned lead appears via realtime', async ({ page, context }) => {
  // Page 1: Consultant dashboard
  await page.goto('/dashboard/consultant')
  const leadCount = await page.locator('[data-testid="lead-count"]').count()

  // Page 2: Simulate admin assigning a lead
  const page2 = await context.newPage()
  await page2.goto('/dashboard/admin')
  // ... simulate lead assignment via API or UI ...

  // Page 1: Wait for new lead to appear
  await expect(page.locator('[data-testid="lead-count"]')).toHaveCount(leadCount + 1)
  
  // Verify realtime status shows 'connected'
  await expect(page.locator('[data-testid="connection-status"]')).toContainText('Live')
})
```

### 3. Metrics Calculations

**Test**: Metrics accurately reflect current leads

```typescript
test('metrics show correct counts', async ({ page }) => {
  await page.goto('/dashboard/consultant')

  // Count active leads manually
  const activeLeads = await page.locator('[data-status="active"]').count()
  const stalledLeads = await page.locator('[data-status="stalled"]').count()

  // Verify metric cards
  await expect(page.locator('[data-testid="metric-active"]')).toContainText(String(activeLeads))
  await expect(page.locator('[data-testid="metric-stalled"]')).toContainText(String(stalledLeads))
})
```

### 4. Notification Bell

**Test**: Notifications display correctly and mark as read

```typescript
test('notification bell shows unread count', async ({ page }) => {
  await page.goto('/dashboard/consultant')

  // Check initial unread count
  const badge = page.locator('[data-testid="notification-badge"]')
  const initialCount = parseInt(await badge.textContent())

  // Click bell to open dropdown
  await page.click('[data-testid="notification-bell"]')
  
  // Verify notifications appear
  const notifications = await page.locator('[data-testid="notification-item"]').count()
  expect(notifications).toBeGreaterThan(0)

  // Click mark-as-read
  await page.click('[data-testid="mark-read-btn"]:first-child')
  
  // Badge should decrease
  await expect(badge).toContainText(String(initialCount - 1))
})
```

### 5. Mobile List View

**Test**: Mobile layout shows stage tabs and filtered list

```typescript
test('mobile view shows stage tabs', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 }) // iPhone size

  await page.goto('/dashboard/consultant')

  // Kanban hidden
  await expect(page.locator('[data-testid="kanban-board"]')).not.toBeVisible()

  // Stage tabs visible
  const stageTabs = await page.locator('[data-testid="stage-tab"]').count()
  expect(stageTabs).toBeGreaterThan(0)

  // Click a stage tab
  await page.click('[data-testid="stage-tab"][data-stage="consultation"]')

  // Verify list filters
  const leads = await page.locator('[data-testid="lead-item"]').count()
  expect(leads).toBeGreaterThan(0)
})
```

### 6. Stalled Lead Escalation

**Test**: Right-click context menu appears on stalled leads

```typescript
test('stalled lead shows context menu', async ({ page }) => {
  await page.goto('/dashboard/consultant')

  // Find stalled lead
  const stalledLead = page.locator('[data-status="stalled"]:first-child')

  // Right-click
  await stalledLead.click({ button: 'right' })

  // Verify context menu
  await expect(page.locator('text=Contact student')).toBeVisible()
  await expect(page.locator('text=View details')).toBeVisible()

  // Click "Contact student"
  const emailLink = page.locator('[data-testid="context-email"]')
  const href = await emailLink.getAttribute('href')
  expect(href).toContain('mailto:')
})
```

### 7. Keyboard Shortcuts

**Test**: Pressing '?' shows keyboard shortcuts modal

```typescript
test('keyboard shortcuts modal', async ({ page }) => {
  await page.goto('/dashboard/consultant')

  // Press '?'
  await page.press('body', '?')

  // Modal appears
  await expect(page.locator('[data-testid="keyboard-help-modal"]')).toBeVisible()
  await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible()

  // Press Escape to close
  await page.press('body', 'Escape')
  await expect(page.locator('[data-testid="keyboard-help-modal"]')).not.toBeVisible()
})
```

## Test Data Setup

Create test data fixtures:

```typescript
// tests/fixtures/leads.ts
export const TEST_LEADS = [
  {
    id: 'lead-1',
    student_name: 'Alice Johnson',
    program_name: 'MBA',
    stage: 'inquiry',
    status: 'active',
    days_in_stage: 3,
  },
  {
    id: 'lead-2',
    student_name: 'Bob Smith',
    program_name: 'MS Computer Science',
    stage: 'consultation',
    status: 'stalled',
    days_in_stage: 8,
  },
]
```

## Running Tests

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test tests/consultant-dashboard.spec.ts

# Run in UI mode (interactive)
npx playwright test --ui

# Run headed (see browser)
npx playwright test --headed

# Debug a test
npx playwright test --debug
```

## CI/CD Integration

Add to `.github/workflows/e2e.yml`:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npx playwright install
      - run: npm run test:e2e
```

## Coverage Focus Areas (Phase 4)

- ✅ Drag-drop stage advancement (forward only)
- ✅ Error handling & toast notifications
- ✅ Realtime updates (leads, documents, notifications)
- ✅ Metrics calculations & trends
- ✅ Mobile responsive behavior
- ✅ Keyboard shortcuts & help modal
- ✅ Connection status indicator
- ✅ Stalled lead escalation flow

## Next Steps

1. Set up Playwright configuration
2. Create test fixtures and utilities
3. Implement tests incrementally
4. Integrate into CI/CD pipeline
5. Maintain > 80% coverage for critical paths
