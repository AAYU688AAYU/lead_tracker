# Testing & Quality Assurance

QA procedures and testing standards for Lead Tracker.

## Contents

- **[Test Plan](TEST_PLAN.md)** — Comprehensive testing procedures, test cases, and coverage targets

## Testing Strategy

Lead Tracker follows a multi-layered testing approach:

1. **Unit Tests** — Component and utility function tests
2. **Integration Tests** — End-to-end flows (intake form, CRM pipeline, notifications)
3. **Real-Time Tests** — WebSocket subscription and synchronization validation
4. **Performance Tests** — Load testing for concurrent connections and database queries
5. **Security Tests** — RLS policy validation, authentication flow verification

## Running Tests Locally

```bash
cd frontend

# Run all tests
npm run test

# Run specific test file
npm run test -- auth.test.ts

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Pre-Deployment Checklist

Before deploying to production, verify:
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Type checking passes (`npm run type-check`)
- [ ] No console errors or warnings
- [ ] Real-time subscriptions tested with concurrent clients
- [ ] Database migrations verified on staging
- [ ] Performance baseline established
- [ ] Security audit completed

---

For phase-specific test reports, see [../phases/PHASE9/TEST_GUIDE.md](../phases/PHASE9/TEST_GUIDE.md) and [../phases/PHASE8/TEST_PLAN.md](../phases/PHASE8/TEST_PLAN.md).
