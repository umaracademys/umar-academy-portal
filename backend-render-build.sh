#!/bin/bash
set -e

# Find backend directory (handle different working directories)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR" && pwd)"

# Try to find backend directory
if [ -d "$PROJECT_ROOT/backend" ]; then
    BACKEND_DIR="$PROJECT_ROOT/backend"
elif [ -d "backend" ]; then
    BACKEND_DIR="$(pwd)/backend"
elif [ -f "package.json" ] && [ -f "server.js" ]; then
    # We're already in the backend directory
    BACKEND_DIR="$(pwd)"
else
    echo "Error: Could not find backend directory"
    echo "Current directory: $(pwd)"
    echo "Script directory: $SCRIPT_DIR"
    echo "Project root: $PROJECT_ROOT"
    ls -la
    exit 1
fi

echo "Changing to backend directory: $BACKEND_DIR"
cd "$BACKEND_DIR" || { echo "Error: Failed to change to backend directory"; exit 1; }

# Install pnpm using corepack (without enable)
corepack prepare pnpm@9.0.0 --activate

# Use pnpm to install dependencies (pnpm can read package-lock.json)
pnpm install --frozen-lockfile --prefer-offline
