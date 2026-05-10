#!/bin/bash
# ============================================================
# ERP Pro — ERPNext Backend Entrypoint for Railway
# ============================================================
# استراتيجية سريعة: نكتب الإعدادات ونبدأ supervisor فوراً
# إنشاء الموقع يتم في الخلفية — gunicorn يبدأ خلال ثواني
# ============================================================

set -e

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ENTRYPOINT] $*"
}

# ----------------------------------------------------------
# اكتشاف المسارات الحقيقية
# ----------------------------------------------------------

BENCH_CMD=$(which bench 2>/dev/null || echo "bench")
NODE_CMD=$(which node 2>/dev/null || echo "/usr/local/bin/node")
GUNICORN_CMD=$(which gunicorn 2>/dev/null || echo "/home/frappe/frappe-bench/env/bin/gunicorn")

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
log "DB Name        : ${DB_NAME}"
log "PORT (Railway) : ${PORT:-8000}"
log "bench path     : ${BENCH_CMD}"
log "node path      : ${NODE_CMD}"
log "gunicorn path  : ${GUNICORN_CMD}"
log "Redis Cache    : ${REDIS_CACHE:-<not set>}"
log "Redis Queue    : ${REDIS_QUEUE:-<not set>}"
log "Redis Socketio : ${REDIS_SOCKETIO:-<not set>}"
log "============================================"

# ----------------------------------------------------------
# 1. إنشاء المجلدات المفقودة (ضمان)
# ----------------------------------------------------------

mkdir -p "$LOGS_DIR"
mkdir -p "${BENCH_DIR}/logs"
mkdir -p "$SITES_DIR"
mkdir -p "${SITES_DIR}/assets"
chown -R frappe:frappe "$LOGS_DIR" 2>/dev/null || true
chown -R frappe:frappe "${BENCH_DIR}/logs" 2>/dev/null || true
chown -R frappe:frappe "$SITES_DIR" 2>/dev/null || true

log "Directories verified."

# ----------------------------------------------------------
# 2. إعداد common_site_config.json
# ----------------------------------------------------------

log "Configuring common_site_config.json ..."

cd "$BENCH_DIR"

if [ ! -f "$COMMON_CONFIG" ]; then
    echo '{}' > "$COMMON_CONFIG"
fi

# تعيين قاعدة البيانات
if [ -n "$DB_HOST" ]; then
    $BENCH_CMD set-config -g db_host "$DB_HOST" 2>/dev/null || true
fi
if [ -n "$DB_PORT" ]; then
    $BENCH_CMD set-config -g db_port "$(printf '%d' "$DB_PORT")" 2>/dev/null || true
fi

# تعيين Redis
if [ -n "$REDIS_CACHE" ]; then
    $BENCH_CMD set-config -g redis_cache "$REDIS_CACHE" 2>/dev/null || true
fi
if [ -n "$REDIS_QUEUE" ]; then
    $BENCH_CMD set-config -g redis_queue "$REDIS_QUEUE" 2>/dev/null || true
fi
if [ -n "$REDIS_SOCKETIO" ]; then
    $BENCH_CMD set-config -g redis_socketio "$REDIS_SOCKETIO" 2>/dev/null || true
fi

# إعدادات عامة
$BENCH_CMD set-config -g socketio_port "${SOCKETIO_PORT:-9000}" 2>/dev/null || true

log "common_site_config.json updated."

# ----------------------------------------------------------
# 3. تعيين الموقع كافتراضي
# ----------------------------------------------------------

DEFAULT_SITE_FILE="${SITES_DIR}/currentsite.txt"
echo "$SITE_NAME" > "$DEFAULT_SITE_FILE"
log "Default site set to '${SITE_NAME}'."

# ----------------------------------------------------------
# 4. إنشاء الموقع في الخلفية (إذا لم يكن موجوداً)
# ----------------------------------------------------------

SITE_DIR="${SITES_DIR}/${SITE_NAME}"

if [ ! -d "$SITE_DIR" ]; then
    log "Site '${SITE_NAME}' does not exist — will create in background ..."

    (
        log "[BG] Waiting for MariaDB at ${DB_HOST}:${DB_PORT:-3306} ..."
        for i in $(seq 1 60); do
            if mysqladmin ping -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$DB_PASSWORD" --silent 2>/dev/null; then
                log "[BG] MariaDB is ready!"
                break
            fi
            if [ $i -eq 60 ]; then
                log "[BG] ERROR: MariaDB not available after 60 retries"
                exit 1
            fi
            sleep 5
        done

        log "[BG] Creating site '${SITE_NAME}' ..."
        $BENCH_CMD new-site "$SITE_NAME" \
            --db-host "$DB_HOST" \
            --db-port "${DB_PORT:-3306}" \
            --db-name "$DB_NAME" \
            --db-user "$DB_USER" \
            --db-password "$DB_PASSWORD" \
            --admin-password "$ADMIN_PASSWORD" \
            --install-app erpnext \
            --install-app frappe \
            --set-default \
            --verbose 2>&1 || {
                log "[BG] WARNING: Site creation had errors — database may already exist"
            }

        echo "$SITE_NAME" > "$DEFAULT_SITE_FILE"
        chown -R frappe:frappe "$SITES_DIR" 2>/dev/null || true
        log "[BG] Site '${SITE_NAME}' setup completed!"
    ) &
    log "Site creation running in background (PID: $!)"
else
    log "Site '${SITE_NAME}' already exists — skipping creation."
fi

# ----------------------------------------------------------
# 5. تشغيل migrate إذا طُلب ذلك (في الخلفية)
# ----------------------------------------------------------

if [ "${FORCE_SITE_MIGRATE}" = "true" ] && [ -d "$SITE_DIR" ]; then
    log "Running bench migrate in background ..."
    (
        $BENCH_CMD --site "$SITE_NAME" migrate 2>&1 || {
            log "[BG] WARNING: Migration had warnings/errors"
        }
        log "[BG] Migration completed."
    ) &
fi

# ----------------------------------------------------------
# 6. تنظيم الصلاحيات
# ----------------------------------------------------------

chown -R frappe:frappe "$SITES_DIR" 2>/dev/null || true
chown -R frappe:frappe "${BENCH_DIR}/logs" 2>/dev/null || true
chown -R frappe:frappe "$LOGS_DIR" 2>/dev/null || true

# ----------------------------------------------------------
# 7. تحديث مسارات supervisor بالمسارات الحقيقية
# ----------------------------------------------------------

SUPERVISOR_CONF="/etc/supervisor/conf.d/erpnext.conf"

# استبدال المسارات الثابتة بالمسارات المكتشفة
if [ -f "$SUPERVISOR_CONF" ]; then
    sed -i "s|/home/frappe/frappe-bench/env/bin/bench|${BENCH_CMD}|g" "$SUPERVISOR_CONF"
    sed -i "s|/home/frappe/frappe-bench/env/bin/node|${NODE_CMD}|g" "$SUPERVISOR_CONF"
    sed -i "s|/home/frappe/frappe-bench/env/bin/gunicorn|${GUNICORN_CMD}|g" "$SUPERVISOR_CONF"
    log "Supervisor paths updated: bench=${BENCH_CMD}, node=${NODE_CMD}, gunicorn=${GUNICORN_CMD}"
fi

log "============================================"
log "Entrypoint complete — starting supervisor NOW"
log "============================================"

exec "$@"
