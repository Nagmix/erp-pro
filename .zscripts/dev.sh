#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "=========================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting ERP Pro Server"
echo "=========================================="

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "[INIT] Installing dependencies..."
  bun install 2>/dev/null || npm install 2>/dev/null || true
fi

# Build if needed
if [ ! -f ".next/BUILD_ID" ]; then
  echo "[INIT] Building production bundle..."
  npx next build 2>/dev/null || true
fi

# Try to run db:push (may fail without Prisma, that's ok)
echo "[INIT] Setting up database..."
bun run db:push 2>/dev/null || true

echo "[INIT] Starting Next.js production server on port 3000..."
exec node node_modules/.bin/next start -p 3000 -H 0.0.0.0
