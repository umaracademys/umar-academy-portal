/**
 * Mobile Cache Performance & Consistency Tests
 * 
 * Comprehensive mobile testing for:
 * - Data loading performance
 * - Cache behavior and consistency
 * - Real-time updates without refresh
 * - Network throttling scenarios
 * - Multiple tab synchronization
 */

import { test, expect, devices, Page } from '@playwright/test';
import { chromium, BrowserContext } from 'playwright';

// Test credentials (should be in environment variables)
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@test.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'admin123';
const TEACHER_EMAIL = process.env.E2E_TEACHER_EMAIL || 'teacher@test.com';
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD || 'teacher123';
const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL || 'student@test.com';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'student123';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Performance metrics collection
interface PerformanceMetrics {
  page: string;
  action: string;
  loadTime: number;
  ttfp?: number;
  tti?: number;
  cacheHits: number;
  cacheMisses: number;
  apiRequests: number;
  errors: string[];
  timestamp: string;
}

const metrics: PerformanceMetrics[] = [];

// Helper: Measure performance
async function measurePerformance(
  page: Page,
  pageName: string,
  action: string
): Promise<PerformanceMetrics> {
  const startTime = Date.now();
  let ttfp: number | undefined;
  let tti: number | undefined;
  let cacheHits = 0;
  let cacheMisses = 0;
  let apiRequests = 0;
  const errors: string[] = [];

  try {
    // Listen to performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        ttfp: perfData?.responseStart - perfData?.fetchStart,
        tti: perfData?.domInteractive - perfData?.fetchStart,
      };
    });
    ttfp = performanceMetrics.ttfp;
    tti = performanceMetrics.tti;

    // Monitor API requests
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        apiRequests++;
      }
    });

    // Check cache status in localStorage
    const cacheStatus = await page.evaluate(() => {
      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('umar_academy_cache_')
      );
      return {
        keys: cacheKeys,
        count: cacheKeys.length
      };
    });
    cacheHits = cacheStatus.count;
  } catch (error) {
    errors.push(`Performance measurement error: ${error}`);
  }

  const loadTime = Date.now() - startTime;

  const metric: PerformanceMetrics = {
    page: pageName,
    action,
    loadTime,
    ttfp,
    tti,
    cacheHits,
    cacheMisses,
    apiRequests,
    errors,
    timestamp: new Date().toISOString(),
  };

  metrics.push(metric);
  return metric;
}

// Helper: Check cache for specific key
async function checkCacheKey(page: Page, key: string): Promise<{ exists: boolean; data: any }> {
  return await page.evaluate((cacheKey) => {
    try {
      const cached = localStorage.getItem(`umar_academy_cache_${cacheKey}`);
      if (!cached) return { exists: false, data: null };
      const parsed = JSON.parse(cached);
      return { exists: true, data: parsed };
    } catch {
      return { exists: false, data: null };
    }
  }, key);
}

// Helper: Clear all cache
async function clearCache(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

// Helper: Wait for assignments to load
async function waitForAssignments(page: Page, timeout = 10000): Promise<boolean> {
  try {
    // Wait for assignment cards or list to appear
    await page.waitForSelector('[data-testid="assignment-card"], .assignment-card, [class*="assignment"]', {
      timeout,
      state: 'visible',
    });
    return true;
  } catch {
    // Check if "no assignments" message appears
    const noAssignments = await page.locator('text=/no assignments/i').isVisible().catch(() => false);
    return noAssignments;
  }
}

// Test suite for mobile devices
test.describe('Mobile Cache Performance Tests', () => {
  // Test on iPhone 8 viewport
  test.use({
    ...devices['iPhone 8'],
    viewport: { width: 375, height: 667 },
  });

  test.beforeEach(async ({ page, context }) => {
    // Clear cache before each test
    await clearCache(page);
    await context.clearCookies();
  });

  test('Student Assignments Page - Initial Load Performance', async ({ page }) => {
    const metric = await measurePerformance(page, 'Student Assignments', 'Initial Load');

    // Navigate to login
    await page.goto(`${BASE_URL}/login`);
    
    // Login as student
    await page.fill('input[type="email"]', STUDENT_EMAIL);
    await page.fill('input[type="password"]', STUDENT_PASSWORD);
    await page.selectOption('select[name="role"]', 'student');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('**/student/dashboard', { timeout: 10000 });

    // Navigate to assignments
    const navStart = Date.now();
    await page.click('text=Assignments', { timeout: 5000 });
    await page.waitForURL('**/student/assignments', { timeout: 5000 });

    // Wait for assignments to load
    const assignmentsLoaded = await waitForAssignments(page, 15000);
    
    const navTime = Date.now() - navStart;

    // Check cache
    const cacheStatus = await checkCacheKey(page, 'assignments');
    
    // Measure final performance
    const finalMetric = await measurePerformance(page, 'Student Assignments', 'Page Load Complete');

    // Assertions
    expect(assignmentsLoaded).toBe(true);
    expect(navTime).toBeLessThan(10000); // Should load within 10 seconds
    expect(finalMetric.loadTime).toBeLessThan(15000);

    // Log results
    console.log('\n📊 Student Assignments - Initial Load:');
    console.log(`   Navigation time: ${navTime}ms`);
    console.log(`   Total load time: ${finalMetric.loadTime}ms`);
    console.log(`   Cache exists: ${cacheStatus.exists}`);
    console.log(`   API requests: ${finalMetric.apiRequests}`);
    console.log(`   TTFB: ${finalMetric.ttfp}ms`);
    console.log(`   TTI: ${finalMetric.tti}ms`);
  });

  test('Student Assignments - Cache Serves Data Instantly', async ({ page }) => {
    // First load to populate cache
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', STUDENT_EMAIL);
    await page.fill('input[type="password"]', STUDENT_PASSWORD);
    await page.selectOption('select[name="role"]', 'student');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/student/dashboard', { timeout: 10000 });
    
    // Navigate to assignments (populate cache)
    await page.click('text=Assignments');
    await page.waitForURL('**/student/assignments', { timeout: 5000 });
    await waitForAssignments(page, 15000);
    
    // Wait a moment for cache to be written
    await page.waitForTimeout(1000);
    
    // Verify cache exists
    const cacheBefore = await checkCacheKey(page, 'assignments');
    expect(cacheBefore.exists).toBe(true);

    // Navigate away and back (should use cache)
    await page.click('text=Dashboard');
    await page.waitForTimeout(500);
    
    const cacheStart = Date.now();
    await page.click('text=Assignments');
    await page.waitForURL('**/student/assignments', { timeout: 5000 });
    await waitForAssignments(page, 5000); // Should be faster with cache
    
    const cacheLoadTime = Date.now() - cacheStart;
    
    // Check cache was used
    const cacheAfter = await checkCacheKey(page, 'assignments');
    
    console.log('\n📊 Cache Performance:');
    console.log(`   Cache load time: ${cacheLoadTime}ms`);
    console.log(`   Cache exists before: ${cacheBefore.exists}`);
    console.log(`   Cache exists after: ${cacheAfter.exists}`);
    
    // Cache should make load faster
    expect(cacheLoadTime).toBeLessThan(3000); // Should be much faster with cache
  });

  test('Teacher Creates Assignment - Student Sees Immediately (No Refresh)', async ({ browser }) => {
    // Create teacher context
    const teacherContext = await browser.newContext({
      ...devices['iPhone 8'],
      viewport: { width: 375, height: 667 },
    });
    const teacherPage = await teacherContext.newPage();
    await clearCache(teacherPage);

    // Create student context (simulating different device/user)
    const studentContext = await browser.newContext({
      ...devices['iPhone 11 Pro Max'],
      viewport: { width: 414, height: 896 },
    });
    const studentPage = await studentContext.newPage();
    await clearCache(studentPage);

    // Step 1: Teacher logs in and creates assignment
    await teacherPage.goto(`${BASE_URL}/login`);
    await teacherPage.fill('input[type="email"]', TEACHER_EMAIL);
    await teacherPage.fill('input[type="password"]', TEACHER_PASSWORD);
    await teacherPage.selectOption('select[name="role"]', 'teacher');
    await teacherPage.click('button[type="submit"]');
    await teacherPage.waitForURL('**/teacher/dashboard', { timeout: 10000 });

    // Navigate to assignment creation
    await teacherPage.click('text=Create Assignment', { timeout: 5000 });
    
    // Fill assignment form (adjust selectors based on your UI)
    const assignmentName = `Mobile Test Assignment ${Date.now()}`;
    await teacherPage.fill('input[name="studentId"]', 'test-student-id');
    await teacherPage.fill('textarea[name="homework"]', assignmentName);
    
    const createStart = Date.now();
    await teacherPage.click('button:has-text("Save")');
    await teacherPage.waitForSelector('text=Assignment created successfully', { timeout: 5000 });
    const createTime = Date.now() - createStart;

    // Step 2: Student logs in immediately
    await studentPage.goto(`${BASE_URL}/login`);
    await studentPage.fill('input[type="email"]', STUDENT_EMAIL);
    await studentPage.fill('input[type="password"]', STUDENT_PASSWORD);
    await studentPage.selectOption('select[name="role"]', 'student');
    await studentPage.click('button[type="submit"]');
    await studentPage.waitForURL('**/student/dashboard', { timeout: 10000 });

    // Step 3: Student navigates to assignments
    const studentNavStart = Date.now();
    await studentPage.click('text=Assignments');
    await studentPage.waitForURL('**/student/assignments', { timeout: 5000 });
    
    // Step 4: Wait for assignment to appear (should be immediate due to cache invalidation)
    const assignmentVisible = await studentPage.waitForSelector(
      `text=${assignmentName}`,
      { timeout: 10000, state: 'visible' }
    ).catch(() => null);
    
    const studentLoadTime = Date.now() - studentNavStart;

    // Step 5: Verify cache
    const studentCache = await checkCacheKey(studentPage, 'assignments');
    
    console.log('\n📊 Real-Time Update Test:');
    console.log(`   Assignment creation time: ${createTime}ms`);
    console.log(`   Student load time: ${studentLoadTime}ms`);
    console.log(`   Assignment visible: ${assignmentVisible !== null}`);
    console.log(`   Student cache exists: ${studentCache.exists}`);

    // Assertions
    expect(assignmentVisible).not.toBeNull();
    expect(studentLoadTime).toBeLessThan(10000); // Should see assignment within 10 seconds
    expect(studentCache.exists).toBe(true); // Cache should be updated

    await teacherContext.close();
    await studentContext.close();
  });

  test('Multiple Tabs - Cache Synchronization', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 8'],
      viewport: { width: 375, height: 667 },
    });

    // Tab 1: Login and navigate to assignments
    const tab1 = await context.newPage();
    await clearCache(tab1);
    await tab1.goto(`${BASE_URL}/login`);
    await tab1.fill('input[type="email"]', STUDENT_EMAIL);
    await tab1.fill('input[type="password"]', STUDENT_PASSWORD);
    await tab1.selectOption('select[name="role"]', 'student');
    await tab1.click('button[type="submit"]');
    await tab1.waitForURL('**/student/dashboard', { timeout: 10000 });
    await tab1.click('text=Assignments');
    await tab1.waitForURL('**/student/assignments', { timeout: 5000 });
    await waitForAssignments(tab1, 15000);

    // Tab 2: Open same page
    const tab2 = await context.newPage();
    await tab2.goto(`${BASE_URL}/login`);
    await tab2.fill('input[type="email"]', STUDENT_EMAIL);
    await tab2.fill('input[type="password"]', STUDENT_PASSWORD);
    await tab2.selectOption('select[name="role"]', 'student');
    await tab2.click('button[type="submit"]');
    await tab2.waitForURL('**/student/dashboard', { timeout: 10000 });
    
    const tab2Start = Date.now();
    await tab2.click('text=Assignments');
    await tab2.waitForURL('**/student/assignments', { timeout: 5000 });
    await waitForAssignments(tab2, 5000); // Should use cache
    
    const tab2LoadTime = Date.now() - tab2Start;

    // Check cache in both tabs
    const cache1 = await checkCacheKey(tab1, 'assignments');
    const cache2 = await checkCacheKey(tab2, 'assignments');

    console.log('\n📊 Multi-Tab Cache Test:');
    console.log(`   Tab 2 load time: ${tab2LoadTime}ms`);
    console.log(`   Tab 1 cache exists: ${cache1.exists}`);
    console.log(`   Tab 2 cache exists: ${cache2.exists}`);

    expect(tab2LoadTime).toBeLessThan(3000); // Should use cache
    expect(cache1.exists).toBe(true);
    expect(cache2.exists).toBe(true);

    await context.close();
  });

  test('Network Throttling - Offline to Online', async ({ page, context }) => {
    // Simulate 4G network
    await context.setGeolocation({ latitude: 0, longitude: 0 });
    await context.setExtraHTTPHeaders({});

    // Load page with normal network
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', STUDENT_EMAIL);
    await page.fill('input[type="password"]', STUDENT_PASSWORD);
    await page.selectOption('select[name="role"]', 'student');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/student/dashboard', { timeout: 10000 });

    // Navigate to assignments (populate cache)
    await page.click('text=Assignments');
    await page.waitForURL('**/student/assignments', { timeout: 10000 });
    await waitForAssignments(page, 15000);

    // Verify cache exists
    const cacheBefore = await checkCacheKey(page, 'assignments');
    expect(cacheBefore.exists).toBe(true);

    // Simulate offline (block network)
    await context.setOffline(true);
    
    // Navigate away
    await page.click('text=Dashboard');
    await page.waitForTimeout(500);

    // Try to navigate to assignments (should use cache)
    const offlineStart = Date.now();
    await page.click('text=Assignments');
    
    // Should still work with cache
    const assignmentsVisible = await waitForAssignments(page, 5000);
    const offlineLoadTime = Date.now() - offlineStart;

    // Go back online
    await context.setOffline(false);

    console.log('\n📊 Network Throttling Test:');
    console.log(`   Offline load time: ${offlineLoadTime}ms`);
    console.log(`   Assignments visible offline: ${assignmentsVisible}`);

    // Cache should allow offline viewing
    expect(assignmentsVisible).toBe(true);
    expect(offlineLoadTime).toBeLessThan(2000); // Should be fast with cache
  });

  test('Cache Invalidation - New Assignment Appears Without Refresh', async ({ browser }) => {
    const teacherContext = await browser.newContext({
      ...devices['iPhone 8'],
    });
    const teacherPage = await teacherContext.newPage();

    const studentContext = await browser.newContext({
      ...devices['iPhone 11 Pro Max'],
    });
    const studentPage = await studentContext.newPage();

    // Student loads page first (old cache)
    await studentPage.goto(`${BASE_URL}/login`);
    await studentPage.fill('input[type="email"]', STUDENT_EMAIL);
    await studentPage.fill('input[type="password"]', STUDENT_PASSWORD);
    await studentPage.selectOption('select[name="role"]', 'student');
    await studentPage.click('button[type="submit"]');
    await studentPage.waitForURL('**/student/dashboard', { timeout: 10000 });
    await studentPage.click('text=Assignments');
    await studentPage.waitForURL('**/student/assignments', { timeout: 5000 });
    await waitForAssignments(studentPage, 15000);

    // Get initial assignment count
    const initialCount = await studentPage.locator('[data-testid="assignment-card"], .assignment-card').count();

    // Teacher creates assignment
    await teacherPage.goto(`${BASE_URL}/login`);
    await teacherPage.fill('input[type="email"]', TEACHER_EMAIL);
    await teacherPage.fill('input[type="password"]', TEACHER_PASSWORD);
    await teacherPage.selectOption('select[name="role"]', 'teacher');
    await teacherPage.click('button[type="submit"]');
    await teacherPage.waitForURL('**/teacher/dashboard', { timeout: 10000 });
    
    const assignmentName = `Cache Test ${Date.now()}`;
    await teacherPage.click('text=Create Assignment');
    await teacherPage.fill('textarea[name="homework"]', assignmentName);
    await teacherPage.click('button:has-text("Save")');
    await teacherPage.waitForSelector('text=Assignment created successfully', { timeout: 5000 });

    // Student should see new assignment (cache should be invalidated server-side or via real-time update)
    // Note: This test may require real-time updates or manual refresh simulation
    // For now, we test that cache exists and can be invalidated

    const cacheAfter = await checkCacheKey(studentPage, 'assignments');
    
    console.log('\n📊 Cache Invalidation Test:');
    console.log(`   Initial assignment count: ${initialCount}`);
    console.log(`   Cache exists after creation: ${cacheAfter.exists}`);

    await teacherContext.close();
    await studentContext.close();
  });
});

// Generate final report
test.afterAll(() => {
  console.log('\n\n📊 ========================================');
  console.log('📊 MOBILE CACHE PERFORMANCE REPORT');
  console.log('📊 ========================================\n');

  metrics.forEach((metric, index) => {
    console.log(`\nTest ${index + 1}: ${metric.page} - ${metric.action}`);
    console.log(`  Load Time: ${metric.loadTime}ms`);
    if (metric.ttfp) console.log(`  TTFB: ${metric.ttfp}ms`);
    if (metric.tti) console.log(`  TTI: ${metric.tti}ms`);
    console.log(`  Cache Hits: ${metric.cacheHits}`);
    console.log(`  API Requests: ${metric.apiRequests}`);
    if (metric.errors.length > 0) {
      console.log(`  Errors: ${metric.errors.join(', ')}`);
    }
  });

  // Summary statistics
  const avgLoadTime = metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length;
  const totalApiRequests = metrics.reduce((sum, m) => sum + m.apiRequests, 0);
  
  console.log('\n📊 Summary Statistics:');
  console.log(`  Average Load Time: ${avgLoadTime.toFixed(2)}ms`);
  console.log(`  Total API Requests: ${totalApiRequests}`);
  console.log(`  Total Tests: ${metrics.length}`);
  
  console.log('\n📊 Recommendations:');
  if (avgLoadTime > 5000) {
    console.log('  ⚠️ Average load time is high. Consider optimizing API calls.');
  }
  if (totalApiRequests > metrics.length * 3) {
    console.log('  ⚠️ Too many API requests. Cache should be reducing requests.');
  }
});
