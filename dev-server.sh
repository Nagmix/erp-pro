#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting Next.js dev server..."
  NODE_OPTIONS="--max-old-space-size=4096" npx next dev -p 3000 2>&1 | tee /tmp/next-live.log
  EXIT_CODE=$?
  echo "Server stopped with exit code $EXIT_CODE. Restarting in 5 seconds..."
  sleep 5
done
