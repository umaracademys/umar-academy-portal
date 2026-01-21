#!/bin/bash
set -e

# Debug: Show where we are
echo "=== Build Script Debug Info ==="
echo "Current working directory: $(pwd)"
echo "Script path (BASH_SOURCE[0]): ${BASH_SOURCE[0]}"
echo "Listing current directory:"
ls -la | head -10
echo "================================"

# Get the directory where this script is located (if called directly)
if [ -f "${BASH_SOURCE[0]}" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    # If script is in PATH or current dir, use current directory
    SCRIPT_DIR="$(pwd)"
fi

# Get the project root (where the script is located, which should be repo root)
PROJECT_ROOT="$SCRIPT_DIR"

# Try to find backend directory
# First, try from project root (where script is located)
if [ -d "$PROJECT_ROOT/backend" ]; then
    BACKEND_DIR="$PROJECT_ROOT/backend"
# Then try from current working directory
elif [ -d "$(pwd)/backend" ]; then
    BACKEND_DIR="$(pwd)/backend"
# Check if we're already in backend directory
elif [ -f "$(pwd)/package.json" ] && [ -f "$(pwd)/server.js" ]; then
    BACKEND_DIR="$(pwd)"
# Last resort: try to find it
elif [ -d "backend" ]; then
    BACKEND_DIR="$(pwd)/backend"
else
    echo "Error: Could not find backend directory"
    echo "Current directory: $(pwd)"
    echo "Script directory: $SCRIPT_DIR"
    echo "Project root: $PROJECT_ROOT"
    echo "Listing project root:"
    ls -la "$PROJECT_ROOT" | head -20
    echo "Listing current directory:"
    ls -la | head -20
    exit 1
fi

echo "Changing to backend directory: $BACKEND_DIR"
cd "$BACKEND_DIR" || { echo "Error: Failed to change to backend directory"; exit 1; }

# Install pnpm using corepack (without enable)
corepack prepare pnpm@9.0.0 --activate

# Use pnpm to install dependencies (pnpm can read package-lock.json)
# Backend doesn't need a build step - it's a Node.js server that runs directly
pnpm install --frozen-lockfile --prefer-offline

echo "✅ Backend dependencies installed successfully"
