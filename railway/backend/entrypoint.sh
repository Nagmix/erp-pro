#!/bin/bash
# ============================================================
# ERP Pro — ERPNext Backend Entrypoint for Railway
# ============================================================
# هذا السكربت يُنفَّذ عند كل تشغيل للحاوية ويقوم بـ:
#
#   1. التحقق من اتصال قاعدة البيانات (MariaDB)
#   2. التحقق من اتصال Redis (عبر Python — بدون redis-cli)
#   3. إنشاء موقع Frappe جديد إذا لم يكن موجوداً
#   4. تحديث إعدادات الموقع (db_host, redis, إلخ)
#   5. تشغيل migrate إذا طُلب ذلك
#   6. تعيين الموقع كافتراضي (default)
#   7. تسليم التحكم إلى CMD (supervisord)
#
# ============================================================

set -e

# ----------------------------------------------------------
# دوال مساعدة
# ----------------------------------------------------------

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ENTRYPOINT] $*"
}

wait_for_db() {
    local max_retries=60
    local retry=0
    local db_host="${DB_HOST}"
    local db_port="${DB_PORT:-3306}"

    if [ -z "$db_host" ]; then
        log "WARNING: DB_HOST is not set — skipping DB wait check"
        return 0
    fi

    log "Waiting for MariaDB at ${db_host}:${db_port} ..."
    while ! mysqladmin ping -h "$db_host" -P "$db_port" -u "$DB_USER" -p"$DB_PASSWORD" --silent 2>/dev/null; do
        retry=$((retry + 1))
        if [ $retry -ge $max_retries ]; then
            log "ERROR: MariaDB not available after ${max_retries} retries — exiting"
            exit 1
        fi
        log "  Attempt ${retry}/${max_retries} — MariaDB not ready, waiting 5s ..."
        sleep 5
    done
    log "MariaDB is ready!"
}

# فحص Redis عبر Python (متوفر في صورة ERPNext)
# لأن redis-cli غير مثبت في الصورة الافتراضية
wait_for_redis() {
    local redis_url="$1"
    local label="$2"
    local max_retries=15
    local retry=0

    if [ -z "$redis_url" ]; then
        log "WARNING: ${label} is not set — skipping Redis wait check"
        return 0
    fi

    # استخراج host و port من URL مثل redis://host:port أو redis://host:port/db
    local redis_host
    local redis_port
    redis_host=$(echo "$redis_url" | sed -E 's#^redis://([^:/]+).*#\1#')
    redis_port=$(echo "$redis_url" | sed -E 's#^redis://[^:/]+:([0-9]+).*#\1#')
    redis_port="${redis_port:-6379}"

    log "Waiting for Redis (${label}) at ${redis_host}:${redis_port} ..."
    while ! python3 -c "
import socket, sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(3)
try:
    s.connect(('${redis_host}', ${redis_port}))
    s.close()
    sys.exit(0)
except:
    sys.exit(1)
" 2>/dev/null; do
        retry=$((retry + 1))
        if [ $retry -ge $max_retries ]; then
            log "WARNING: Redis (${label}) not available after ${max_retries} retries — continuing anyway"
            return 0
        fi
        log "  Attempt ${retry}/${max_retries} — Redis (${label}) not ready, waiting 3s ..."
        sleep 3
    done
    log "Redis (${label}) is ready!"
}

# ----------------------------------------------------------
# بداية التنفيذ
# ----------------------------------------------------------

log "============================================"
log "ERP Pro — ERPNext Backend (Railway)"
log "============================================"
log "Site Name : ${SITE_NAME}"
log "DB Host   : ${DB_HOST:-<not set>}"
log "DB Port   : ${DB_PORT:-3306}"
log "DB Name   : ${DB_NAME}"
log "DB User   : ${DB_USER}"
log "Redis Cache   : ${REDIS_CACHE:-<not set>}"
log "Redis Queue   : ${REDIS_QUEUE:-<not set>}"
log "Redis Socketio: ${REDIS_SOCKETIO:-<not set>}"
log "============================================"

# ----------------------------------------------------------
# 1. الانتظار حتى تكون الخدمات جاهزة
# ----------------------------------------------------------

wait_for_db
wait_for_redis "$REDIS_CACHE"   "cache"
wait_for_redis "$REDIS_QUEUE"   "queue"
wait_for_redis "$REDIS_SOCKETIO" "socketio"

# ----------------------------------------------------------
# 2. إعداد common_site_config.json
# ----------------------------------------------------------

BENCH_DIR="/home/frappe/frappe-bench"
SITES_DIR="${BENCH_DIR}/sites"
COMMON_CONFIG="${SITES_DIR}/common_site_config.json"

log "Configuring common_site_config.json ..."

# إنشاء الملف إذا لم يكن موجوداً
if [ ! -f "$COMMON_CONFIG" ]; then
    echo '{}' > "$COMMON_CONFIG"
fi

# تحديث الإعدادات عبر bench (أو مباشرة عبر Python)
cd "$BENCH_DIR"

# تعيين قاعدة البيانات
if [ -n "$DB_HOST" ]; then
    bench set-config -g db_host "$DB_HOST" 2>/dev/null || true
fi
if [ -n "$DB_PORT" ]; then
    bench set-config -g db_port "$(printf '%d' "$DB_PORT")" 2>/dev/null || true
fi

# تعيين Redis
if [ -n "$REDIS_CACHE" ]; then
    bench set-config -g redis_cache "$REDIS_CACHE" 2>/dev/null || true
fi
if [ -n "$REDIS_QUEUE" ]; then
    bench set-config -g redis_queue "$REDIS_QUEUE" 2>/dev/null || true
fi
if [ -n "$REDIS_SOCKETIO" ]; then
    bench set-config -g redis_socketio "$REDIS_SOCKETIO" 2>/dev/null || true
fi

# إعدادات عامة
bench set-config -g socketio_port "${SOCKETIO_PORT:-9000}" 2>/dev/null || true

log "common_site_config.json updated."

# ----------------------------------------------------------
# 3. إنشاء الموقع إذا لم يكن موجوداً
# ----------------------------------------------------------

SITE_DIR="${SITES_DIR}/${SITE_NAME}"

if [ ! -d "$SITE_DIR" ]; then
    log "Site '${SITE_NAME}' does not exist — creating new site ..."

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
        --verbose 2>&1 || {
            log "WARNING: Failed to create site '${SITE_NAME}'"
            log "This could be because the database already has data."
            log "Attempting to proceed with existing database ..."
        }

    log "Site '${SITE_NAME}' creation attempt completed!"
else
    log "Site '${SITE_NAME}' already exists — skipping creation."
fi

# ----------------------------------------------------------
# 4. تعيين الموقع كافتراضي
# ----------------------------------------------------------

DEFAULT_SITE_FILE="${SITES_DIR}/currentsite.txt"

echo "$SITE_NAME" > "$DEFAULT_SITE_FILE"
log "Default site set to '${SITE_NAME}'."

# ----------------------------------------------------------
# 5. تشغيل migrate إذا طُلب ذلك
# ----------------------------------------------------------

if [ "${FORCE_SITE_MIGRATE}" = "true" ]; then
    log "Running bench migrate (FORCE_SITE_MIGRATE=true) ..."
    bench --site "$SITE_NAME" migrate 2>&1 || {
        log "WARNING: Migration had warnings/errors but continuing ..."
    }
    log "Migration completed."
fi

# ----------------------------------------------------------
# 6. تنظيم الصلاحيات
# ----------------------------------------------------------

chown -R frappe:frappe "$SITES_DIR" 2>/dev/null || true
chown -R frappe:frappe "${BENCH_DIR}/logs" 2>/dev/null || true

log "============================================"
log "Entrypoint complete — handing off to CMD"
log "============================================"

# ----------------------------------------------------------
# 7. تنفيذ الأمر المُمرَّر (CMD)
# ----------------------------------------------------------

exec "$@"
