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
   npx -y pnpm@9.0.0 install --frozen-lockfile --no-optional --prefer-offline && npx -y pnpm@9.0.0 --filter @umar-academy/mushaf build && npx -y pnpm@9.0.0 run build:fast
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
buildCommand: npx -y pnpm@9.0.0 install --frozen-lockfile --no-optional --prefer-offline && npx -y pnpm@9.0.0 --filter @umar-academy/mushaf build && npx -y pnpm@9.0.0 run build:fast
```

This command:
1. Uses `npx` to run pnpm@9.0.0 without global installation (avoids broken npm)
2. Installs dependencies with frozen lockfile
3. Builds the Mushaf package
4. Builds the frontend

## Why This Works

- `npx -y pnpm@9.0.0` downloads and runs pnpm without needing global installation
- Works even when npm is broken in Render's environment
- `-y` flag automatically answers yes to prompts
- Matches the `packageManager: "pnpm@9.0.0"` in package.json
- Avoids `corepack enable` which requires write access to system directories
- Avoids `npm install -g` which may fail due to broken npm installation