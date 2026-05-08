#!/bin/bash
# ERP Pro - Production Deployment Script
# Handles: git pull, install, build, standalone fix, restart

set -e

PROJECT_DIR="/home/ubuntu/erp-pro"
BRANCH="main"
ENV_BACKUP="/home/ubuntu/erp-pro-env-backup"

echo "================================================"
echo "  ERP Pro - Production Deployment"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================"

cd "$PROJECT_DIR"

# Step 0: Backup .env BEFORE git operations (CRITICAL - .env must not be lost)
echo ""
echo "[0/7] Backing up .env file..."
if [ -f .env ]; then
  cp .env "$ENV_BACKUP"
  echo "  ✓ .env backed up"
else
  echo "  ⚠ No .env file found to backup"
fi

# Step 1: Pull latest code
echo ""
echo "[1/7] Pulling latest code from $BRANCH..."
git fetch origin "$BRANCH"
# Stash any local changes to .env before reset
git stash 2>/dev/null || true
git reset --hard "origin/$BRANCH"
# Restore .env from backup
if [ -f "$ENV_BACKUP" ]; then
  cp "$ENV_BACKUP" .env
  echo "  ✓ .env restored from backup"
fi
echo "  ✓ Code updated"

# Step 2: Install dependencies
echo ""
echo "[2/7] Installing dependencies..."
npm ci --production=false 2>/dev/null || npm install
echo "  ✓ Dependencies installed"

# Step 3: Build
echo ""
echo "[3/7] Building Next.js..."
NODE_ENV=production npm run build
echo "  ✓ Build complete"

# Step 4: Copy static files to standalone directory (CRITICAL for standalone mode)
echo ""
echo "[4/7] Copying static assets to standalone directory..."
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
echo "  ✓ Static assets copied"

# Step 5: Copy .env to standalone (from backup, not from git)
echo ""
echo "[5/7] Copying environment config..."
if [ -f "$ENV_BACKUP" ]; then
  cp "$ENV_BACKUP" .next/standalone/.env
  echo "  ✓ .env copied from backup to standalone"
elif [ -f .env ]; then
  cp .env .next/standalone/.env
  echo "  ✓ .env copied to standalone"
else
  echo "  ⚠ No .env file to copy!"
fi

# Step 6: Copy data directory to standalone
echo ""
echo "[6/7] Copying data directory to standalone..."
if [ -d data ]; then
  cp -r data .next/standalone/ 2>/dev/null || true
  echo "  ✓ data/ copied to standalone"
fi

# Step 7: Restart server
echo ""
echo "[7/7] Restarting server via PM2..."
pm2 restart erp-pro 2>/dev/null || {
  echo "  PM2 process not found, starting new..."
  cd .next/standalone
  pm2 start server.js --name erp-pro -- -p 3000 -H 0.0.0.0
  cd "$PROJECT_DIR"
}
echo "  ✓ Server restarted"

# Wait and verify
echo ""
echo "Verifying deployment..."
sleep 4

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login 2>/dev/null || echo "000")
CSS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/_next/static/css/ 2>/dev/null || echo "000")
LOGIN_RESULT=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Administrator","password":"admin"}' 2>/dev/null | head -c 50 || echo "failed")

if [ "$HTTP_CODE" = "200" ]; then
  echo "  ✓ Login page: HTTP $HTTP_CODE"
else
  echo "  ⚠ Login page: HTTP $HTTP_CODE (may need investigation)"
fi

if echo "$LOGIN_RESULT" | grep -q '"success":true'; then
  echo "  ✓ Login API: Working"
else
  echo "  ⚠ Login API: May need investigation"
fi

echo ""
echo "================================================"
echo "  Deployment Complete!"
echo "================================================"
