#!/bin/bash
echo "=== ERP Pro Server Update ==="
cd /home/ubuntu/erp-pro || exit 1

echo "[1/5] Pulling latest code..."
git pull origin main

echo "[2/5] Installing dependencies..."
npm install

echo "[3/5] Building project..."
npm run build

echo "[4/5] Restarting application..."
pm2 restart erp-pro

echo "[5/5] Restarting Cloudflare tunnel..."
pkill -f cloudflared
sleep 2
nohup cloudflared tunnel --url http://localhost:3000 --protocol http2 > /tmp/cloudflared.log 2>&1 &
sleep 5

echo ""
echo "=== Update Complete! ==="
echo "Cloudflare tunnel URL:"
grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1
echo ""
echo "App status:"
pm2 list
