# Render Build Command Fix

## Problem
Render is trying to execute `render.yaml` as a command, which means the build command in the Render dashboard is incorrectly set.

## Solution

### Step 1: Update Build Command in Render Dashboard

1. Go to your Render dashboard: https://dashboard.render.com
2. Navigate to your **Frontend Service** (umar-academy-frontend)
3. Click on **Settings** tab
4. Find the **Build Command** field
5. **Clear** the current value (which is probably set to `render.yaml`)
6. **Set it to:**
   ```bash
   npm install -g pnpm@9.0.0 && pnpm install --frozen-lockfile --no-optional --prefer-offline && pnpm --filter @umar-academy/mushaf build && pnpm run build:fast
   ```
7. Click **Save Changes**
8. Trigger a new deploy

### Step 2: Verify render.yaml (Optional)

The `render.yaml` file is correct and will be used if you clear the dashboard build command. However, dashboard settings take precedence over `render.yaml`.

### Alternative: Use render.yaml Only

If you want to use `render.yaml` exclusively:
1. In the Render dashboard, **clear/delete** the Build Command field (leave it empty)
2. Render will then read the `buildCommand` from `render.yaml`

## Current Build Command (from render.yaml)

```yaml
buildCommand: npm install -g pnpm@9.0.0 && pnpm install --frozen-lockfile --no-optional --prefer-offline && pnpm --filter @umar-academy/mushaf build && pnpm run build:fast
```

This command:
1. Installs pnpm@9.0.0 globally using npm
2. Installs dependencies with frozen lockfile
3. Builds the Mushaf package
4. Builds the frontend

## Why This Works

- `npm install -g pnpm` works in Render's read-only filesystem (installs to npm's global directory)
- Matches the `packageManager: "pnpm@9.0.0"` in package.json
- Avoids `corepack enable` which requires write access to system directories
