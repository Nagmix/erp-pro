#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting server at $(date)" >> /tmp/erp-prod.log
  NODE_ENV=production npx next start -p 3000 -H 0.0.0.0 >> /tmp/erp-prod.log 2>&1
  echo "Server stopped at $(date), restarting in 3s..." >> /tmp/erp-prod.log
  sleep 3
done
