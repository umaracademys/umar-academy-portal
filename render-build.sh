#!/bin/bash
set -e

# Install pnpm using corepack (without enable)
# Corepack is built into Node.js and doesn't require npm
corepack prepare pnpm@9.0.0 --activate

# Use pnpm from corepack
pnpm install --frozen-lockfile --no-optional --prefer-offline

# Build Mushaf package
pnpm --filter @umar-academy/mushaf build

# Build frontend
pnpm run build:fast
