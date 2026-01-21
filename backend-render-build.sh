#!/bin/bash
set -e

# Change to backend directory
cd backend || { echo "Error: backend directory not found"; exit 1; }

# Install pnpm using corepack (without enable)
corepack prepare pnpm@9.0.0 --activate

# Use pnpm to install dependencies (pnpm can read package-lock.json)
pnpm install --frozen-lockfile --prefer-offline
