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
   bash render-build.sh
   ```
   
   **OR** if you prefer the inline command:
   ```bash
   corepack prepare pnpm@9.0.0 --activate && pnpm install --frozen-lockfile --no-optional --prefer-offline && pnpm --filter @umar-academy/mushaf build && pnpm run build:fast
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
buildCommand: bash render-build.sh
```

The `render-build.sh` script:
1. Uses `corepack prepare` (built into Node.js, doesn't require npm)
2. Activates pnpm@9.0.0
3. Installs dependencies with frozen lockfile
4. Builds the Mushaf package
5. Builds the frontend

## Why This Works

- `corepack prepare` is built into Node.js and doesn't require npm to be functional
- `corepack prepare` doesn't require `enable` (which modifies system files)
- Works even when npm is completely broken
- Matches the `packageManager: "pnpm@9.0.0"` in package.json
- Uses a shell script for better error handling and readability

## ⚠️ IMPORTANT: Dashboard Override

**If you see `npm install && npm run build` in the build logs, Render is using the default build command from the dashboard, NOT from `render.yaml`.**

**You MUST update the Build Command in the Render dashboard to:**
```bash
bash render-build.sh
```

Or clear the Build Command field entirely to use `render.yaml`.