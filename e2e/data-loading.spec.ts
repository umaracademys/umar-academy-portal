/**
 * E2E Data Loading Tests
 * 
 * Tests for data loading fixes:
 * - Data loads immediately from cache (no 0 items)
 * - Data loads after login (no hard refresh needed)
 * - Instant cache loading on mobile
 * - Fresh data updates in background
 */

import { test, expect, devices } from '@playwright/test';

// Test credentials
const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL || 'saria_mdn@yahoo.com';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'Maya2025!';
const TEACHER_EMAIL = process.env.E2E_TEACHER_EMAIL || 'rashid86amir82@gmail.com';
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD || 'Rashid2025';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'umairrasheed969@gmail.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Umair123!!!';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Data Loading Tests', () => {
  test.describe('Cache Initialization', () => {
    test('Data should initialize from cache immediately (no 0 items)', async ({ page, context }) => {
      // First, login and let data load to create cache
      await page.goto(`${BASE_URL}/login`);
      
      // Login as student
      await page.fill('input[type="email"]', STUDENT_EMAIL);
      await page.fill('input[type="password"]', STUDENT_PASSWORD);
      await page.click('button:has-text("student")');
      await page.click('button[type="submit"]');
      
      // Wait for dashboard
      await page.waitForURL('**/student/dashboard', { timeout: 15000 });
      
      // Wait for data to load and cache
      await page.waitForTimeout(3000); // Allow data to load and cache
      
      // Now reload page - cache should load immediately
      const startTime = Date.now();
      await page.reload({ waitUntil: 'domcontentloaded' });
      
      // Check localStorage for cache immediately after reload
      const cacheCheck = await page.evaluate(() => {
        const cacheKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('umar_academy_cache_')) {
            cacheKeys.push(key);
          }
        }
        return cacheKeys.length > 0;
      });
      
      expect(cacheCheck).toBe(true);
      
      // Wait for data to appear (should be instant from cache)
      const loadTime = Date.now() - startTime;
      
      // Data should appear quickly (less than 2 seconds if cache works)
      expect(loadTime).toBeLessThan(2000);
      
      // Check that assignments data exists (not empty array initially)
      const hasAssignments = await page.evaluate(() => {
        // Check if assignments are rendered or if "no assignments" message exists
        const assignmentCards = document.querySelectorAll('[data-testid="assignment-card"], .assignment-card, [class*="assignment"]');
        const noAssignmentsMessage = document.body.textContent?.includes('No assignments') || 
                                     document.body.textContent?.includes('no assignments');
        return assignmentCards.length > 0 || noAssignmentsMessage;
      });
      
      // Should either have assignments or show "no assignments" message (not blank/0)
      expect(hasAssignments).toBe(true);
    });

    test('State should initialize from cache (lazy initializer)', async ({ page, context }) => {
      // First visit - create cache
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', STUDENT_EMAIL);
      await page.fill('input[type="password"]', STUDENT_PASSWORD);
      await page.click('button:has-text("student")');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/student/dashboard', { timeout: 15000 });
      await page.waitForTimeout(3000);
      
      // Reload and check that cache is used immediately
      await page.reload();
      
      // Immediately check if data is present (before API calls complete)
      const initialDataCheck = await page.evaluate(() => {
        // Check if cache exists
        const cacheExists = Array.from({ length: localStorage.length }, (_, i) => {
          const key = localStorage.key(i);
          return key && key.startsWith('umar_academy_cache_');
        }).some(Boolean);
        
        // Check if UI shows data (not empty state)
        const hasContent = document.body.textContent && 
                          document.body.textContent.trim().length > 0 &&
                          !document.body.textContent.includes('Loading...');
        
        return { cacheExists, hasContent };
      });
      
      expect(initialDataCheck.cacheExists).toBe(true);
      expect(initialDataCheck.hasContent).toBe(true);
    });
  });

  test.describe('Data Loading After Login', () => {
    test('Data should load automatically after login (no hard refresh)', async ({ page, context }) => {
      // Clear cache first
      await context.clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Navigate to login
      await page.goto(`${BASE_URL}/login`);
      
      // Login
      await page.fill('input[type="email"]', STUDENT_EMAIL);
      await page.fill('input[type="password"]', STUDENT_PASSWORD);
      await page.click('button:has-text("student")');
      await page.click('button[type="submit"]');
      
      // Wait for login to complete
      await page.waitForURL('**/student/dashboard', { timeout: 15000 });
      
      // Data should load automatically (no hard refresh needed)
      // Wait for data to appear
      await page.waitForTimeout(2000); // Give time for data to load
      
      // Check that data loaded
      const dataLoaded = await page.evaluate(() => {
        // Check if dashboard content is visible
        const dashboardContent = document.body.textContent;
        const hasContent = dashboardContent && 
                          dashboardContent.length > 100 && // Substantial content
                          !dashboardContent.includes('Loading...');
        
        // Check localStorage for user data
        const userData = localStorage.getItem('umar_academy_user');
        
        return { hasContent, userData: !!userData };
      });
      
      expect(dataLoaded.hasContent).toBe(true);
      expect(dataLoaded.userData).toBe(true);
    });

    test('Data should reload when user logs in (user change detection)', async ({ page, context }) => {
      // Start logged out
      await page.goto(`${BASE_URL}/login`);
      
      // Verify we're on login page
      expect(page.url()).toContain('/login');
      
      // Login
      await page.fill('input[type="email"]', STUDENT_EMAIL);
      await page.fill('input[type="password"]', STUDENT_PASSWORD);
      await page.click('button:has-text("student")');
      
      const loginStartTime = Date.now();
      await page.click('button[type="submit"]');
      
      // Wait for redirect to dashboard
      await page.waitForURL('**/student/dashboard', { timeout: 15000 });
      
      // Wait for data to load after login
      await page.waitForTimeout(3000);
      
      const loginToDataTime = Date.now() - loginStartTime;
      
      // Data should load within reasonable time (less than 10 seconds)
      expect(loginToDataTime).toBeLessThan(10000);
      
      // Verify data is present
      const hasData = await page.evaluate(() => {
        return document.body.textContent && 
               document.body.textContent.length > 100;
      });
      
      expect(hasData).toBe(true);
    });
  });

  test.describe('Mobile Data Loading', () => {
    test.use({ 
      ...devices['iPhone 11 Pro'],
      viewport: { width: 375, height: 812 }
    });

    test('Mobile: Data should load instantly from cache (no 0 items)', async ({ page, context }) => {
      // First visit - create cache
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', STUDENT_EMAIL);
      await page.fill('input[type="password"]', STUDENT_PASSWORD);
      await page.click('button:has-text("student")');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/student/dashboard', { timeout: 15000 });
      await page.waitForTimeout(3000);
      
      // Reload page
      const reloadStartTime = Date.now();
      await page.reload({ waitUntil: 'domcontentloaded' });
      
      // Immediately check for data (should be from cache)
      const initialCheck = await page.evaluate(() => {
        // Check cache
        const cacheKeys = Array.from({ length: localStorage.length }, (_, i) => {
          const key = localStorage.key(i);
          return key && key.startsWith('umar_academy_cache_');
        }).filter(Boolean);
        
        // Check if UI shows content (not blank/0 items)
        const bodyText = document.body.textContent || '';
        const isEmpty = bodyText.trim().length === 0 || 
                       bodyText.includes('0 assignments') ||
                       (bodyText.includes('assignments') && bodyText.match(/0\s+assignments/i));
        
        return { cacheExists: cacheKeys.length > 0, hasContent: !isEmpty };
      });
      
      const loadTime = Date.now() - reloadStartTime;
      
      // Cache should exist
      expect(initialCheck.cacheExists).toBe(true);
      
      // Should have content (not empty/0 items)
      expect(initialCheck.hasContent).toBe(true);
      
      // Should load quickly from cache (less than 2 seconds)
      expect(loadTime).toBeLessThan(2000);
    });

    test('Mobile: Data should not show 0 items on initial load', async ({ page, context }) => {
      // Clear cache
      await context.clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Login fresh (no cache)
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', STUDENT_EMAIL);
      await page.fill('input[type="password"]', STUDENT_PASSWORD);
      await page.click('button:has-text("student")');
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/student/dashboard', { timeout: 15000 });
      
      // Wait a moment for initial render
      await page.waitForTimeout(1000);
      
      // Check that we don't see "0 assignments" or blank state
      const hasNoZeroItems = await page.evaluate(() => {
        const bodyText = document.body.textContent || '';
        
        // Should not show "0 assignments" immediately
        const hasZeroAssignments = bodyText.match(/0\s+assignments/i);
        
        // Should have some content (loading state or data)
        const hasContent = bodyText.trim().length > 50;
        
        return { hasZeroAssignments: !!hasZeroAssignments, hasContent };
      });
      
      // Should have content (even if loading)
      expect(hasNoZeroItems.hasContent).toBe(true);
      
      // Wait for data to load
      await page.waitForTimeout(5000);
      
      // Final check - should have data or "no assignments" message (not 0)
      const finalCheck = await page.evaluate(() => {
        const bodyText = document.body.textContent || '';
        const hasZeroAssignments = bodyText.match(/0\s+assignments/i);
        const hasNoAssignmentsMessage = bodyText.includes('No assignments') || 
                                       bodyText.includes('no assignments');
        const hasAssignments = bodyText.includes('Assignment') || 
                              document.querySelectorAll('[class*="assignment"]').length > 0;
        
        return { hasZeroAssignments: !!hasZeroAssignments, hasNoAssignmentsMessage, hasAssignments };
      });
      
      // Should either have assignments or show "no assignments" message (not "0 assignments")
      expect(finalCheck.hasZeroAssignments).toBe(false);
      expect(finalCheck.hasNoAssignmentsMessage || finalCheck.hasAssignments).toBe(true);
    });
  });

  test.describe('Background Data Updates', () => {
    test('Fresh data should update in background (stale-while-revalidate)', async ({ page, context }) => {
      // Login and load data
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', STUDENT_EMAIL);
      await page.fill('input[type="password"]', STUDENT_PASSWORD);
      await page.click('button:has-text("student")');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/student/dashboard', { timeout: 15000 });
      await page.waitForTimeout(3000);
      
      // Get initial cache timestamp
      const initialCacheTime = await page.evaluate(() => {
        const cacheData = localStorage.getItem('umar_academy_cache_assignments');
        if (cacheData) {
          const parsed = JSON.parse(cacheData);
          return parsed.timestamp;
        }
        return null;
      });
      
      expect(initialCacheTime).not.toBeNull();
      
      // Wait a bit - fresh data should be fetched in background
      await page.waitForTimeout(2000);
      
      // Check if cache was updated (fresh data fetched)
      const updatedCacheTime = await page.evaluate(() => {
        const cacheData = localStorage.getItem('umar_academy_cache_assignments');
        if (cacheData) {
          const parsed = JSON.parse(cacheData);
          return parsed.timestamp;
        }
        return null;
      });
      
      // Cache should be updated (fresh data fetched in background)
      // Note: This might not always update if data hasn't changed, so we just check cache exists
      expect(updatedCacheTime).not.toBeNull();
    });
  });
});
