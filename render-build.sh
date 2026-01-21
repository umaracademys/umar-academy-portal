#!/bin/bash
set -e

# Install pnpm using corepack (without enable)
# Corepack is built into Node.js and doesn't require npm
corepack prepare pnpm@9.0.0 --activate

# Use pnpm from corepack
# Note: --no-optional removed because esbuild and rollup need their platform-specific optional dependencies
pnpm install --frozen-lockfile --prefer-offline

# Build Mushaf package
pnpm --filter @umar-academy/mushaf build

# Build frontend
pnpm run build:fast
