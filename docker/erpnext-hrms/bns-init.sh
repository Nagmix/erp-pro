#!/bin/bash
# ============================================================
# bns-init.sh — Bunnyshell bootstrap for ERP Pro backend (v2)
# Runs as the container command (entrypoint.sh already ran and
# linked sites/assets -> baked assets).
# Steps:
#   1. Wait for MariaDB
#   2. Write common_site_config.json (direct file write — robust)
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

log() { echo "[bns-init] $(date '+%F %T') $*" | tee -a sites/bns-init.log; }

mkdir -p sites

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

# ---------- 2. common_site_config.json (direct write, then sync via bench) ----------
CFG="sites/common_site_config.json"
if [ ! -f "$CFG" ]; then
  log "Writing ${CFG} directly ..."
  cat > "$CFG" <<JSON
{
  "db_host": "${DB_HOST}",
  "db_port": ${DB_PORT},
  "redis_cache": "${REDIS_CACHE}",
  "redis_queue": "${REDIS_QUEUE}",
  "redis_socketio": "${REDIS_SOCKETIO}",
  "socketio_port": ${SOCKETIO_PORT}
}
JSON
fi
# Best-effort sync via bench (in case the file existed with stale values)
bench set-config -g db_host "$DB_HOST" >> sites/bns-init.log 2>&1 || true
bench set-config -gp db_port "$DB_PORT" >> sites/bns-init.log 2>&1 || true
bench set-config -g redis_cache "$REDIS_CACHE" >> sites/bns-init.log 2>&1 || true
bench set-config -g redis_queue "$REDIS_QUEUE" >> sites/bns-init.log 2>&1 || true
bench set-config -g redis_socketio "$REDIS_SOCKETIO" >> sites/bns-init.log 2>&1 || true
bench set-config -gp socketio_port "$SOCKETIO_PORT" >> sites/bns-init.log 2>&1 || true
ls -1 apps > sites/apps.txt 2>/dev/null || true

# ---------- 3. Create site (first boot only) ----------
hrms_installed() {
  python3 - "$SITE_DIR/site_config.json" <<'PY'
import json, sys
try:
    cfg = json.load(open(sys.argv[1]))
    sys.exit(0 if "hrms" in cfg.get("installed_apps", []) else 1)
except Exception:
    sys.exit(1)
PY
}

if [ ! -f "${SITE_DIR}/site_config.json" ]; then
  log "Creating site '${SITE_NAME}' (new-site + erpnext) — this can take several minutes ..."
  if [ -n "$MARIADB_ROOT_PASSWORD" ]; then
    bench new-site "$SITE_NAME" \
      --db-host "$DB_HOST" \
      --mariadb-root-password "$MARIADB_ROOT_PASSWORD" \
      --admin-password "$ADMIN_PASSWORD" \
      --install-app erpnext >> sites/bns-init.log 2>&1
    NS_RC=$?
  else
    bench new-site "$SITE_NAME" \
      --db-host "$DB_HOST" \
      --admin-password "$ADMIN_PASSWORD" \
      --install-app erpnext >> sites/bns-init.log 2>&1
    NS_RC=$?
  fi

  if [ "$NS_RC" = "0" ]; then
    log "Site created — installing HRMS ..."
    bench --site "$SITE_NAME" install-app hrms >> sites/bns-init.log 2>&1 || log "WARN: HRMS install failed (check bns-init.log)"
    bench --site "$SITE_NAME" set-maintenance-mode off >> sites/bns-init.log 2>&1 || true
    bench --site "$SITE_NAME" enable-scheduler >> sites/bns-init.log 2>&1 || true
    log "Site '${SITE_NAME}' is ready"
  else
    log "ERROR: bench new-site failed (rc=${NS_RC}) — see sites/bns-init.log. Starting services anyway for debugging."
  fi
else
  log "Site '${SITE_NAME}' already exists — running migrate ..."
  bench --site "$SITE_NAME" migrate >> sites/bns-init.log 2>&1 || true
  bench --site "$SITE_NAME" set-maintenance-mode off >> sites/bns-init.log 2>&1 || true
  if hrms_installed; then
    log "HRMS already installed"
  else
    log "HRMS missing — installing ..."
    bench --site "$SITE_NAME" install-app hrms >> sites/bns-init.log 2>&1 || log "WARN: HRMS install failed"
  fi
fi

bench use "$SITE_NAME" >/dev/null 2>&1 || true

# ---------- 3.5 Backup configuration (INF-04) ----------
# الاحتفاظ بـ 7 نسخ + نسخة ليلية كاملة (قاعدة البيانات + الملفات)
bench --site "$SITE_NAME" set-config backup_limit 7 >> sites/bns-init.log 2>&1 || true
bench --site "$SITE_NAME" set-config backup_on_restart true >> sites/bns-init.log 2>&1 || true

# ---------- 4. Start everything ----------
log "Starting background processes: socketio, workers, scheduler ..."
(
  while [ ! -f "${SITE_DIR}/site_config.json" ]; do sleep 5; done
  while true; do node /home/frappe/frappe-bench/apps/frappe/socketio.js; sleep 5; done
) &
(
  while [ ! -f "${SITE_DIR}/site_config.json" ]; do sleep 5; done
  while true; do bench worker --queue short,default; sleep 5; done
) &
(
  while [ ! -f "${SITE_DIR}/site_config.json" ]; do sleep 5; done
  while true; do bench worker --queue long,default,short; sleep 5; done
) &
(
  while [ ! -f "${SITE_DIR}/site_config.json" ]; do sleep 5; done
  while true; do bench schedule; sleep 5; done
) &

# ---------- 4.5 Nightly backup loop (INF-04) ----------
# نسخة احتياطية كاملة كل 24 ساعة (قاعدة البيانات + الملفات) — استبقاء 7 نسخ
(
  while [ ! -f "${SITE_DIR}/site_config.json" ]; do sleep 5; done
  sleep 120
  while true; do
    log "Running nightly backup (--with-files) ..."
    bench --site "$SITE_NAME" backup --with-files >> sites/bns-init.log 2>&1 \
      || log "WARN: nightly backup failed"
    sleep 86400
  done
) &

log "Starting Gunicorn on :8000 ..."
exec /usr/local/bin/start.sh
