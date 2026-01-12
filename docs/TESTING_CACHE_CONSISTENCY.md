# Cache Consistency Testing Guide

## Overview

This document describes the comprehensive testing strategy to prevent stale-cache bugs across the application.

## Test Coverage

### ✅ Unit Tests

**Location:** `src/__tests__/cacheConsistency.test.ts`

Tests verify that every mutation function:
- Calls `dataCache.delete()` with correct key
- Calls `dataCache.set()` with updated state
- Does NOT call `refreshData()` where cache is updated directly

**Coverage:**
- ✅ Students: addStudent, updateStudent, deleteStudent
- ✅ Teachers: addTeacher, updateTeacher, deleteTeacher
- ✅ Admins: addAdmin, updateAdmin, deleteAdmin
- ✅ Assignments: addAssignment, updateAssignment, deleteAssignment
- ✅ Tickets: createTicket, updateRecitationTicket, approveAndSendTicket, deleteTicket

**Run:** `pnpm test:cache`

---

### ✅ Cache Utility Tests

**Location:** `src/__tests__/dataCache.test.ts`

Tests verify:
- Data storage and retrieval
- TTL expiration
- Delete functionality
- Stale data prevention

**Run:** `pnpm test src/__tests__/dataCache.test.ts`

---

### ✅ E2E Tests

**Location:** `e2e/cache-consistency.spec.ts`

Tests simulate real user scenarios:
1. **Assignment Visibility** - Teacher creates, Student sees immediately
2. **Student Creation** - Admin creates, appears immediately
3. **Teacher Update** - Changes visible immediately
4. **Ticket Approval** - Assignment visible to student immediately
5. **Stale Cache Prevention** - Cache doesn't serve stale data

**Run:** `pnpm test:e2e:cache`

---

## Running Tests

### Unit Tests
```bash
# Run all tests
pnpm test

# Run cache consistency tests only
pnpm test:cache

# Watch mode
pnpm test:watch
```

### E2E Tests
```bash
# Run all E2E tests
pnpm test:e2e

# Run cache consistency E2E tests only
pnpm test:e2e:cache

# Run with UI
pnpm test:e2e:ui
```

---

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

**Build will FAIL if:**
- Any cache consistency test fails
- E2E tests detect stale cache
- Missing cache invalidation detected

---

## Dev-Only Monitoring

**Location:** `src/utils/cacheMonitor.ts`

In development mode, the cache monitor logs warnings when:
- Mutations occur after cache writes
- Potential stale cache detected

**Usage:**
```typescript
import { trackMutation, trackCacheWrite, checkStaleCache } from '@/utils/cacheMonitor';

// Track mutation
trackMutation('students');

// Track cache write
trackCacheWrite('students');

// Check for stale cache
checkStaleCache('students');
```

---

## Test Failures

### If Unit Tests Fail

**Error:** "Cache not invalidated"
**Fix:** Ensure mutation function calls `dataCache.delete(key)` before `dataCache.set(key, updatedState)`

**Error:** "refreshData() called unnecessarily"
**Fix:** Remove `refreshData()` call if cache is updated directly

### If E2E Tests Fail

**Error:** "Data not visible immediately"
**Fix:** Check that cache invalidation is implemented correctly in mutation function

**Error:** "Stale cache detected"
**Fix:** Verify cache is invalidated before setting new state

---

## Adding New Tests

### For New Mutation Functions

1. Add test case in `src/__tests__/cacheConsistency.test.ts`:
```typescript
it('newMutation must invalidate cache', async () => {
  // Test cache invalidation pattern
});
```

2. Add E2E test if user-visible:
```typescript
test('New mutation visible immediately', async ({ page }) => {
  // Test user scenario
});
```

---

## Success Criteria

✅ All mutation functions have cache invalidation tests
✅ E2E tests cover critical user flows
✅ CI blocks deployment on test failures
✅ No user needs hard refresh to see data
✅ Cache remains fast AND correct

---

## Troubleshooting

### Tests pass locally but fail in CI

- Check environment variables are set
- Verify test credentials are configured
- Ensure database/test data is available

### E2E tests flaky

- Increase timeouts for slow operations
- Add explicit waits for async operations
- Check for race conditions in test setup

---

## Future Enhancements

- [ ] Add performance benchmarks for cache operations
- [ ] Monitor cache hit/miss rates in production
- [ ] Add cache size monitoring
- [ ] Implement cache warming strategies
