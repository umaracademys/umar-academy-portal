# Testing Setup Guide

## Initial Setup

### 1. Install Playwright Browsers

After installing dependencies, you need to install Playwright browsers:

```bash
# Install all browsers
pnpm exec playwright install

# Install only Chromium (faster, for most tests)
pnpm exec playwright install chromium

# Install with system dependencies (for CI)
pnpm exec playwright install --with-deps chromium
```

### 2. Verify Installation

Run a simple test to verify everything is set up:

```bash
pnpm test:e2e:cache
```

## Common Issues

### Error: Executable doesn't exist

**Problem:** Playwright browsers not installed

**Solution:**
```bash
pnpm exec playwright install chromium
```

### Error: Browser launch failed

**Problem:** Missing system dependencies (Linux/CI)

**Solution:**
```bash
pnpm exec playwright install --with-deps chromium
```

### Tests fail with timeout

**Problem:** Backend not running or wrong URL

**Solution:**
- Ensure backend is running on `http://localhost:3001`
- Or set `BASE_URL` environment variable
- Check test credentials in environment variables

## Environment Variables

Set these for E2E tests:

```bash
export BASE_URL=http://localhost:5173
export E2E_ADMIN_EMAIL=admin@test.com
export E2E_ADMIN_PASSWORD=admin123
export E2E_TEACHER_EMAIL=teacher@test.com
export E2E_TEACHER_PASSWORD=teacher123
export E2E_STUDENT_EMAIL=student@test.com
export E2E_STUDENT_PASSWORD=student123
```

## CI/CD Setup

For CI environments, add to your workflow:

```yaml
- name: Install Playwright browsers
  run: pnpm exec playwright install --with-deps chromium
```
