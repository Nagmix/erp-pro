#!/bin/bash
# ============================================================
# ERP Pro — ERPNext Backend Entrypoint for Railway
# ============================================================
# استراتيجية: نكتب الإعدادات ونبدأ supervisor فوراً
# بدون أي انتظار — كل شيء آخر في الخلفية
# ============================================================

set -e

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ENTRYPOINT] $*"
}

BENCH_DIR="/home/frappe/frappe-bench"
SITES_DIR="${BENCH_DIR}/sites"
LOGS_DIR="/home/frappe/logs"
COMMON_CONFIG="${SITES_DIR}/common_site_config.json"

log "============================================"
log "ERP Pro — ERPNext Backend (Railway)"
log "============================================"
log "Site Name      : ${SITE_NAME}"
log "DB Host        : ${DB_HOST:-<not set>}"
log "DB Port        : ${DB_PORT:-3306}"
log "PORT (Railway) : ${PORT:-8000}"
log "Redis Cache    : ${REDIS_CACHE:-<not set>}"
log "Redis Queue    : ${REDIS_QUEUE:-<not set>}"
log "Redis Socketio : ${REDIS_SOCKETIO:-<not set>}"
log "============================================"

# ----------------------------------------------------------
# 1. ضمان وجود المجلدات (مهم بعد إعادة تشغيل الحاوية)
# ----------------------------------------------------------

mkdir -p "$LOGS_DIR"
mkdir -p "${BENCH_DIR}/logs"
mkdir -p "$SITES_DIR"
mkdir -p "${SITES_DIR}/assets"
chown -R frappe:frappe "$LOGS_DIR" 2>/dev/null || true
chown -R frappe:frappe "${BENCH_DIR}/logs" 2>/dev/null || true
chown -R frappe:frappe "$SITES_DIR" 2>/dev/null || true

# ضمان وجود symlinks لـ bench و node
if [ ! -L "/home/frappe/frappe-bench/env/bin/bench" ] && [ ! -f "/home/frappe/frappe-bench/env/bin/bench" ]; then
    BENCH_REAL=$(which bench 2>/dev/null || echo "/usr/local/bin/bench")
    ln -sf "${BENCH_REAL}" /home/frappe/frappe-bench/env/bin/bench 2>/dev/null || true
    log "Created bench symlink → ${BENCH_REAL}"
fi
if [ ! -L "/home/frappe/frappe-bench/env/bin/node" ] && [ ! -f "/home/frappe/frappe-bench/env/bin/node" ]; then
    NODE_REAL=$(which node 2>/dev/null || echo "/usr/local/bin/node")
    ln -sf "${NODE_REAL}" /home/frappe/frappe-bench/env/bin/node 2>/dev/null || true
    log "Created node symlink → ${NODE_REAL}"
fi

log "Directories and symlinks verified."

# ----------------------------------------------------------
# 2. إعداد common_site_config.json
# ----------------------------------------------------------

log "Configuring common_site_config.json ..."

cd "$BENCH_DIR"

if [ ! -f "$COMMON_CONFIG" ]; then
    echo '{}' > "$COMMON_CONFIG"
fi

if [ -n "$DB_HOST" ]; then
    bench set-config -g db_host "$DB_HOST" 2>/dev/null || true
fi
if [ -n "$DB_PORT" ]; then
    bench set-config -g db_port "$(printf '%d' "$DB_PORT")" 2>/dev/null || true
fi
if [ -n "$REDIS_CACHE" ]; then
    bench set-config -g redis_cache "$REDIS_CACHE" 2>/dev/null || true
fi
if [ -n "$REDIS_QUEUE" ]; then
    bench set-config -g redis_queue "$REDIS_QUEUE" 2>/dev/null || true
fi
if [ -n "$REDIS_SOCKETIO" ]; then
    bench set-config -g redis_socketio "$REDIS_SOCKETIO" 2>/dev/null || true
fi

bench set-config -g socketio_port "${SOCKETIO_PORT:-9000}" 2>/dev/null || true

log "common_site_config.json updated."

# ----------------------------------------------------------
# 3. تعيين الموقع كافتراضي
# ----------------------------------------------------------

DEFAULT_SITE_FILE="${SITES_DIR}/currentsite.txt"
echo "$SITE_NAME" > "$DEFAULT_SITE_FILE"
log "Default site set to '${SITE_NAME}'."

# ----------------------------------------------------------
# 4. إنشاء الموقع في الخلفية
# ----------------------------------------------------------

SITE_DIR="${SITES_DIR}/${SITE_NAME}"

if [ ! -d "$SITE_DIR" ]; then
    log "Site '${SITE_NAME}' does not exist — creating in background ..."
    (
        log "[BG] Waiting for MariaDB ..."
        for i in $(seq 1 60); do
            if mysqladmin ping -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$DB_PASSWORD" --silent 2>/dev/null; then
                log "[BG] MariaDB is ready!"
                break
            fi
            [ $i -eq 60 ] && { log "[BG] MariaDB timeout"; exit 1; }
            sleep 5
        done

        log "[BG] Creating site '${SITE_NAME}' ..."
        bench new-site "$SITE_NAME" \
            --db-host "$DB_HOST" \
            --db-port "${DB_PORT:-3306}" \
            --db-name "$DB_NAME" \
            --db-user "$DB_USER" \
            --db-password "$DB_PASSWORD" \
            --admin-password "$ADMIN_PASSWORD" \
            --install-app erpnext \
            --install-app frappe \
            --set-default \
            --verbose 2>&1 || log "[BG] Site creation had errors (DB may already exist)"

        echo "$SITE_NAME" > "$DEFAULT_SITE_FILE"
        chown -R frappe:frappe "$SITES_DIR" 2>/dev/null || true
        log "[BG] Site setup completed!"
    ) &
    log "Site creation running in background (PID: $!)"
else
    log "Site '${SITE_NAME}' already exists."
fi

# ----------------------------------------------------------
# 5. Migrate في الخلفية إذا طُلب
# ----------------------------------------------------------

if [ "${FORCE_SITE_MIGRATE}" = "true" ] && [ -d "$SITE_DIR" ]; then
    (
        bench --site "$SITE_NAME" migrate 2>&1 || log "[BG] Migration had warnings"
        log "[BG] Migration completed."
    ) &
fi

# ----------------------------------------------------------
# 6. تنظيم الصلاحيات
# ----------------------------------------------------------

chown -R frappe:frappe "$SITES_DIR" 2>/dev/null || true
chown -R frappe:frappe "${BENCH_DIR}/logs" 2>/dev/null || true
chown -R frappe:frappe "$LOGS_DIR" 2>/dev/null || true

log "============================================"
log "Starting supervisor NOW"
log "============================================"

exec "$@"
