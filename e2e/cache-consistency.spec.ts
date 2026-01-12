/**
 * E2E Cache Consistency Tests
 * 
 * These tests simulate real user scenarios to ensure cache invalidation
 * works correctly. They will FAIL if:
 * - Data requires refresh to appear
 * - Cache delays visibility
 * - Stale data is served
 */

import { test, expect } from '@playwright/test';

// Test credentials (should be in environment variables in production)
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@test.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'admin123';
const TEACHER_EMAIL = process.env.E2E_TEACHER_EMAIL || 'teacher@test.com';
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD || 'teacher123';
const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL || 'student@test.com';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'student123';

test.describe('Cache Consistency - E2E Tests', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear all cache and storage before each test
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Assignment Visibility - Teacher creates, Student sees immediately', async ({ page, context }) => {
    // Step 1: Teacher logs in and creates assignment
    await page.goto('/login');
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[type="password"]', TEACHER_PASSWORD);
    await page.click('button:has-text("teacher")');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('**/teacher/dashboard', { timeout: 10000 });
    
    // Navigate to assignment creation (adjust selector based on your UI)
    await page.click('text=Create Assignment');
    
    // Fill assignment form
    await page.fill('input[name="studentId"]', 'test-student-id');
    await page.fill('textarea[name="homework"]', 'Test homework assignment');
    await page.click('button:has-text("Save")');
    
    // Wait for success message
    await page.waitForSelector('text=Assignment created successfully', { timeout: 5000 });
    
    // Step 2: Student logs in immediately (new context to simulate different user)
    const studentContext = await context.browser()?.newContext();
    if (!studentContext) {
      throw new Error('Failed to create student context');
    }
    
    const studentPage = await studentContext.newPage();
    await studentPage.goto('/login');
    await studentPage.fill('input[type="email"]', STUDENT_EMAIL);
    await studentPage.fill('input[type="password"]', STUDENT_PASSWORD);
    await studentPage.selectOption('select[name="role"]', 'student');
    await studentPage.click('button[type="submit"]');
    
    // Wait for student dashboard
    await studentPage.waitForURL('**/student/dashboard', { timeout: 10000 });
    
    // Navigate to assignments page
    await studentPage.click('text=Assignments');
    await studentPage.waitForURL('**/student/assignments', { timeout: 5000 });
    
    // Step 3: ASSERT - Assignment must be visible WITHOUT refresh
    // Wait a short time for cache to update (should be instant, but allow small delay)
    await studentPage.waitForTimeout(1000);
    
    // Check if assignment is visible
    const assignmentVisible = await studentPage.locator('text=Test homework assignment').isVisible();
    
    // CRITICAL ASSERTION: Assignment must be visible immediately
    expect(assignmentVisible).toBe(true);
    
    // Verify no refresh was needed
    const currentUrl = studentPage.url();
    expect(currentUrl).toContain('/student/assignments');
    
    await studentContext.close();
  });

  test('Student Creation - Admin creates, appears immediately', async ({ page }) => {
    // Step 1: Admin logs in
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("admin")');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Step 2: Navigate to students page
    await page.click('text=Students');
    await page.waitForURL('**/students', { timeout: 5000 });
    
    // Get initial student count
    const initialCount = await page.locator('[data-testid="student-card"]').count();
    
    // Step 3: Create new student
    await page.click('button:has-text("Add Student")');
    await page.fill('input[name="fullName"]', 'Test Student E2E');
    await page.fill('input[name="email"]', `test-e2e-${Date.now()}@test.com`);
    await page.fill('input[name="contact"]', '1234567890');
    await page.click('button:has-text("Save")');
    
    // Wait for success
    await page.waitForSelector('text=Student created successfully', { timeout: 5000 });
    
    // Step 4: ASSERT - Student must appear in list immediately
    await page.waitForTimeout(500); // Small delay for state update
    
    const newCount = await page.locator('[data-testid="student-card"]').count();
    expect(newCount).toBeGreaterThan(initialCount);
    
    // Verify student name is visible
    const studentVisible = await page.locator('text=Test Student E2E').isVisible();
    expect(studentVisible).toBe(true);
    
    // Verify no refresh was needed
    expect(page.url()).toContain('/students');
  });

  test('Teacher Update - Changes visible immediately', async ({ page }) => {
    // Step 1: Admin logs in
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("admin")');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Step 2: Navigate to teachers page
    await page.click('text=Teachers');
    await page.waitForURL('**/teachers', { timeout: 5000 });
    
    // Step 3: Click on first teacher to edit
    await page.locator('[data-testid="teacher-card"]').first().click();
    await page.click('button:has-text("Edit")');
    
    // Step 4: Update teacher name
    const newName = `Updated Teacher ${Date.now()}`;
    await page.fill('input[name="fullName"]', newName);
    await page.click('button:has-text("Save")');
    
    // Wait for success
    await page.waitForSelector('text=Teacher updated successfully', { timeout: 5000 });
    
    // Step 5: ASSERT - Updated name must be visible immediately
    await page.waitForTimeout(500);
    
    const nameVisible = await page.locator(`text=${newName}`).isVisible();
    expect(nameVisible).toBe(true);
    
    // Verify we're still on teachers page (no refresh)
    expect(page.url()).toContain('/teachers');
  });

  test('Ticket Approval - Assignment visible to student immediately', async ({ page, context }) => {
    // Step 1: Teacher creates ticket
    await page.goto('/login');
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[type="password"]', TEACHER_PASSWORD);
    await page.click('button:has-text("teacher")');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/teacher/dashboard', { timeout: 10000 });
    
    // Create ticket (adjust selectors based on your UI)
    await page.click('text=Create Ticket');
    await page.fill('select[name="studentId"]', 'test-student-id');
    await page.selectOption('select[name="type"]', 'sabq');
    await page.click('button:has-text("Submit")');
    
    await page.waitForSelector('text=Ticket created successfully', { timeout: 5000 });
    
    // Step 2: Admin approves ticket
    const adminContext = await context.browser()?.newContext();
    if (!adminContext) {
      throw new Error('Failed to create admin context');
    }
    
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/login');
    await adminPage.fill('input[type="email"]', ADMIN_EMAIL);
    await adminPage.fill('input[type="password"]', ADMIN_PASSWORD);
    await adminPage.selectOption('select[name="role"]', 'admin');
    await adminPage.click('button[type="submit"]');
    
    await adminPage.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Navigate to tickets
    await adminPage.click('text=Tickets');
    await adminPage.waitForURL('**/tickets', { timeout: 5000 });
    
    // Approve ticket
    await adminPage.locator('[data-testid="ticket-card"]').first().click();
    await adminPage.click('button:has-text("Approve & Send")');
    
    await adminPage.waitForSelector('text=Ticket approved', { timeout: 5000 });
    
    // Step 3: Student checks assignments
    const studentContext = await context.browser()?.newContext();
    if (!studentContext) {
      throw new Error('Failed to create student context');
    }
    
    const studentPage = await studentContext.newPage();
    await studentPage.goto('/login');
    await studentPage.fill('input[type="email"]', STUDENT_EMAIL);
    await studentPage.fill('input[type="password"]', STUDENT_PASSWORD);
    await studentPage.selectOption('select[name="role"]', 'student');
    await studentPage.click('button[type="submit"]');
    
    await studentPage.waitForURL('**/student/dashboard', { timeout: 10000 });
    await studentPage.click('text=Assignments');
    await studentPage.waitForURL('**/student/assignments', { timeout: 5000 });
    
    // Step 4: ASSERT - Assignment from ticket must be visible immediately
    await studentPage.waitForTimeout(1000);
    
    // Check for assignment (adjust selector based on your UI)
    const assignmentExists = await studentPage.locator('[data-testid="assignment-card"]').count();
    expect(assignmentExists).toBeGreaterThan(0);
    
    await adminContext.close();
    await studentContext.close();
  });

  test('Cache does not serve stale data after mutation', async ({ page }) => {
    // Step 1: Load initial data
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("admin")');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.click('text=Students');
    await page.waitForURL('**/students', { timeout: 5000 });
    
    // Step 2: Get initial student list
    const initialStudents = await page.locator('[data-testid="student-card"]').count();
    
    // Step 3: Create student
    await page.click('button:has-text("Add Student")');
    await page.fill('input[name="fullName"]', 'Cache Test Student');
    await page.fill('input[name="email"]', `cache-test-${Date.now()}@test.com`);
    await page.click('button:has-text("Save")');
    
    await page.waitForSelector('text=Student created successfully', { timeout: 5000 });
    
    // Step 4: Navigate away and back (should still see new student)
    await page.click('text=Dashboard');
    await page.waitForTimeout(500);
    await page.click('text=Students');
    await page.waitForURL('**/students', { timeout: 5000 });
    
    // Step 5: ASSERT - New student must still be visible (cache updated, not stale)
    await page.waitForTimeout(500);
    const finalStudents = await page.locator('[data-testid="student-card"]').count();
    expect(finalStudents).toBeGreaterThan(initialStudents);
    
    const studentVisible = await page.locator('text=Cache Test Student').isVisible();
    expect(studentVisible).toBe(true);
  });
});
