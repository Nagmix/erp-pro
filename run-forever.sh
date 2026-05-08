#!/bin/bash
while true; do
  cd /home/z/my-project
  NODE_OPTIONS="--max-old-space-size=2048" node node_modules/.bin/next start -p 3000 -H 0.0.0.0 >> /tmp/next-server.log 2>&1
  echo "[$(date)] Server exited. Restarting in 3s..." >> /tmp/next-server.log
  sleep 3
done
