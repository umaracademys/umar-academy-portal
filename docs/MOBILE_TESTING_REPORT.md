# Mobile Cache Performance Testing Guide

## Overview

This document describes the mobile testing suite for cache consistency and performance on mobile devices.

## Test Suite

**Location:** `e2e/mobile-cache-performance.spec.ts`

## Test Scenarios

### 1. Student Assignments - Initial Load Performance
- **Viewport:** iPhone 8 (375x667)
- **Tests:**
  - Initial page load time
  - Time to First Paint (TTFP)
  - Time to Interactive (TTI)
  - API request count
  - Cache status

### 2. Cache Serves Data Instantly
- **Viewport:** iPhone 8 (375x667)
- **Tests:**
  - Second load uses cache
  - Load time improvement with cache
  - Cache persistence

### 3. Real-Time Updates (Teacher → Student)
- **Viewports:** iPhone 8 (Teacher) + iPhone 11 Pro Max (Student)
- **Tests:**
  - Teacher creates assignment
  - Student sees assignment immediately
  - No refresh required
  - Cache invalidation timing

### 4. Multiple Tabs - Cache Synchronization
- **Viewport:** iPhone 8 (375x667)
- **Tests:**
  - Cache shared across tabs
  - Load time with shared cache
  - Cache consistency

### 5. Network Throttling - Offline to Online
- **Viewport:** iPhone 8 (375x667)
- **Tests:**
  - Offline access with cache
  - Online recovery
  - Cache persistence during network issues

### 6. Cache Invalidation
- **Viewports:** iPhone 8 (Teacher) + iPhone 11 Pro Max (Student)
- **Tests:**
  - Cache invalidation on new data
  - Assignment count updates
  - Real-time visibility

## Running Tests

```bash
# Run all mobile tests
pnpm test:e2e:mobile

# Run with UI
pnpm test:e2e:mobile:ui

# Run specific test
pnpm exec playwright test e2e/mobile-cache-performance.spec.ts -g "Student Assignments"
```

## Performance Metrics Collected

1. **Load Time:** Total time to load page/complete action
2. **TTFP:** Time to First Paint
3. **TTI:** Time to Interactive
4. **Cache Hits:** Number of cache entries found
5. **API Requests:** Number of API calls made
6. **Errors:** Any errors encountered

## Expected Results

### Performance Targets

- **Initial Load:** < 15 seconds
- **Cache Load:** < 3 seconds
- **Real-Time Update:** < 10 seconds
- **Offline Load:** < 2 seconds

### Cache Behavior

- Cache should exist after first load
- Second load should use cache (faster)
- New data should invalidate cache
- Cache should persist across tabs
- Cache should work offline

## Test Environment

### Devices Tested
- iPhone 8 (375x667)
- iPhone 11 Pro Max (414x896)

### Network Conditions
- 4G (default)
- Offline mode
- Network throttling

## Test Credentials

Set these environment variables:
- `E2E_STUDENT_EMAIL`
- `E2E_STUDENT_PASSWORD`
- `E2E_TEACHER_EMAIL`
- `E2E_TEACHER_PASSWORD`
- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`

## Report Generation

After all tests complete, a comprehensive report is generated with:
- Performance metrics per test
- Summary statistics
- Recommendations for optimization
- Error logs (if any)

## Troubleshooting

### Tests Fail with Timeout
- Check network connectivity
- Verify test credentials
- Ensure backend is running
- Check viewport selectors match your UI

### Cache Not Found
- Verify cache keys match (`umar_academy_cache_*`)
- Check localStorage is accessible
- Ensure cache is being set in production code

### Performance Issues
- Check API response times
- Verify cache is being used
- Check for unnecessary API calls
- Review network throttling settings

## CI/CD Integration

These tests can be integrated into CI/CD pipeline:

```yaml
- name: Run Mobile Cache Tests
  run: pnpm test:e2e:mobile
```

## Future Enhancements

- [ ] Add screenshot comparison
- [ ] Add video recording of tests
- [ ] Add more device profiles
- [ ] Add network condition variations
- [ ] Add performance budgets
- [ ] Add lighthouse integration
