#!/bin/bash
# ============================================================
# bns-init.sh — Bunnyshell bootstrap for ERP Pro backend
# Runs as the container command (entrypoint.sh already ran and
# linked sites/assets -> baked assets).
# Steps:
#   1. Wait for MariaDB
#   2. Write common_site_config.json (db/redis/socketio)
#   3. Create site + install erpnext + hrms (first boot only)
#   4. Start gunicorn (foreground) + socketio/workers/scheduler (background)
# ============================================================
set -u
cd /home/frappe/frappe-bench

DB_HOST="${DB_HOST:-mariadb}"
DB_PORT="${DB_PORT:-3306}"
SITE_NAME="${SITE_NAME:-erppro}"
MARIADB_ROOT_PASSWORD="${MARIADB_ROOT_PASSWORD:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin}"
REDIS_CACHE="${REDIS_CACHE:-redis://redis-cache:6379}"
REDIS_QUEUE="${REDIS_QUEUE:-redis://redis-queue:6379}"
REDIS_SOCKETIO="${REDIS_SOCKETIO:-redis://redis-socketio:6379}"
SOCKETIO_PORT="${SOCKETIO_PORT:-9000}"
SITE_DIR="sites/${SITE_NAME}"

log() { echo "[bns-init] $(date '+%F %T') $*"; }

# ---------- 1. Wait for MariaDB ----------
log "Waiting for MariaDB at ${DB_HOST}:${DB_PORT} ..."
DB_OK=0
for i in $(seq 1 120); do
  if (echo > "/dev/tcp/${DB_HOST}/${DB_PORT}") >/dev/null 2>&1; then
    log "MariaDB is reachable (attempt ${i})"
    DB_OK=1
    break
  fi
  sleep 2
done
if [ "$DB_OK" != "1" ]; then
  log "ERROR: MariaDB not reachable after 240s — starting services anyway"
fi

# ---------- 2. Write common_site_config.json ----------
log "Writing common_site_config.json ..."
bench set-config -g db_host "$DB_HOST" || true
bench set-config -gp db_port "$DB_PORT" || true
bench set-config -g redis_cache "$REDIS_CACHE" || true
bench set-config -g redis_queue "$REDIS_QUEUE" || true
bench set-config -g redis_socketio "$REDIS_SOCKETIO" || true
bench set-config -gp socketio_port "$SOCKETIO_PORT" || true
ls -1 apps > sites/apps.txt 2>/dev/null || true

# ---------- 3. Create site (first boot only) ----------
if [ ! -f "${SITE_DIR}/site_config.json" ]; then
  log "Creating site '${SITE_NAME}' (new-site + erpnext + hrms) — this can take several minutes ..."
  if [ -n "$MARIADB_ROOT_PASSWORD" ]; then
    bench new-site "$SITE_NAME" \
      --no-mariadb-socket \
      --db-host "$DB_HOST" \
      --mariadb-root-password "$MARIADB_ROOT_PASSWORD" \
      --admin-password "$ADMIN_PASSWORD" \
      --install-app erpnext 2>&1 | tee -a sites/bns-init.log
    NS_RC=${PIPESTATUS[0]}
  else
    bench new-site "$SITE_NAME" \
      --no-mariadb-socket \
      --db-host "$DB_HOST" \
      --admin-password "$ADMIN_PASSWORD" \
      --install-app erpnext 2>&1 | tee -a sites/bns-init.log
    NS_RC=${PIPESTATUS[0]}
  fi

  if [ "$NS_RC" = "0" ]; then
    log "Site created — installing HRMS ..."
    bench --site "$SITE_NAME" install-app hrms 2>&1 | tee -a sites/bns-init.log || log "WARN: HRMS install failed (check bns-init.log)"
    bench --site "$SITE_NAME" set-maintenance-mode off || true
    bench --site "$SITE_NAME" enable-scheduler || true
    log "Site '${SITE_NAME}' is ready"
  else
    log "ERROR: bench new-site failed (rc=${NS_RC}) — see sites/bns-init.log. Starting services anyway for debugging."
  fi
else
  log "Site '${SITE_NAME}' already exists — running migrate ..."
  bench --site "$SITE_NAME" migrate 2>&1 | tail -5 || true
  bench --site "$SITE_NAME" set-maintenance-mode off || true
fi

bench use "$SITE_NAME" >/dev/null 2>&1 || true

# ---------- 4. Start everything ----------
log "Starting background processes: socketio, workers, scheduler ..."
(
  while [ ! -f "${SITE_DIR}/site_config.json" ]; do sleep 5; done
  while true; do node /home/frappe/frappe-bench/apps/frappe/socketio.js; log "socketio exited — restarting in 5s"; sleep 5; done
) &
(
  while [ ! -f "${SITE_DIR}/site_config.json" ]; do sleep 5; done
  while true; do bench worker --queue short,default; log "worker-short exited — restarting in 5s"; sleep 5; done
) &
(
  while [ ! -f "${SITE_DIR}/site_config.json" ]; do sleep 5; done
  while true; do bench worker --queue long,default,short; log "worker-long exited — restarting in 5s"; sleep 5; done
) &
(
  while [ ! -f "${SITE_DIR}/site_config.json" ]; do sleep 5; done
  while true; do bench schedule; log "scheduler exited — restarting in 5s"; sleep 5; done
) &

log "Starting Gunicorn on :8000 ..."
exec /usr/local/bin/start.sh
