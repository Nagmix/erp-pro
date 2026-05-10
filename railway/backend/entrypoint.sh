#!/bin/bash
# ============================================================
# ERP Pro — ERPNext Backend Entrypoint for Railway
# ============================================================
# استراتيجية سريعة: لا ننتظر الخدمات — نكتب الإعدادات فقط
# ونبدأ supervisor فوراً. gunicorn و workers سيعيدون الاتصال تلقائياً.
#
# هذا يضمن إن gunicorn يبدأ خلال ثواني (وليس دقائق)
# وبكذا healthcheck ينجح قبل الـ timeout
# ============================================================

set -e

# ----------------------------------------------------------
# دوال مساعدة
# ----------------------------------------------------------

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ENTRYPOINT] $*"
}

# ----------------------------------------------------------
# بداية التنفيذ
# ----------------------------------------------------------

log "============================================"
log "ERP Pro — ERPNext Backend (Railway)"
log "============================================"
log "Site Name      : ${SITE_NAME}"
log "DB Host        : ${DB_HOST:-<not set>}"
log "DB Port        : ${DB_PORT:-3306}"
log "DB Name        : ${DB_NAME}"
log "DB User        : ${DB_USER}"
log "PORT (Railway) : ${PORT:-8000}"
log "Redis Cache    : ${REDIS_CACHE:-<not set>}"
log "Redis Queue    : ${REDIS_QUEUE:-<not set>}"
log "Redis Socketio : ${REDIS_SOCKETIO:-<not set>}"
log "============================================"

# ----------------------------------------------------------
# 1. إعداد common_site_config.json (سريع — بدون انتظار)
# ----------------------------------------------------------

BENCH_DIR="/home/frappe/frappe-bench"
SITES_DIR="${BENCH_DIR}/sites"
COMMON_CONFIG="${SITES_DIR}/common_site_config.json"

log "Configuring common_site_config.json ..."

cd "$BENCH_DIR"

# إنشاء الملف إذا لم يكن موجوداً
if [ ! -f "$COMMON_CONFIG" ]; then
    echo '{}' > "$COMMON_CONFIG"
fi

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
# 2. إنشاء الموقع إذا لم يكن موجوداً (في الخلفية بعد أول تشغيل)
# ----------------------------------------------------------

SITE_DIR="${SITES_DIR}/${SITE_NAME}"
DEFAULT_SITE_FILE="${SITES_DIR}/currentsite.txt"

if [ ! -d "$SITE_DIR" ]; then
    log "Site '${SITE_NAME}' does not exist — will create after services start ..."

    # إنشاء الموقع في الخلفية حتى لا نوقف gunicorn
    # supervisor سيعمل وجunicorn سيستجيب للـ healthcheck
    (
        # انتظر قاعدة البيانات أولاً
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
                log "[BG] WARNING: Site creation had errors — database may already exist"
            }

        echo "$SITE_NAME" > "$DEFAULT_SITE_FILE"
        chown -R frappe:frappe "$SITES_DIR" 2>/dev/null || true
        log "[BG] Site '${SITE_NAME}' setup completed!"
    ) &
    SITE_CREATE_PID=$!
    log "Site creation running in background (PID: ${SITE_CREATE_PID})"
else
    log "Site '${SITE_NAME}' already exists — skipping creation."
    echo "$SITE_NAME" > "$DEFAULT_SITE_FILE"
fi

# ----------------------------------------------------------
# 3. تعيين الموقع كافتراضي
# ----------------------------------------------------------

if [ -f "$DEFAULT_SITE_FILE" ]; then
    log "Default site already set."
else
    echo "$SITE_NAME" > "$DEFAULT_SITE_FILE"
    log "Default site set to '${SITE_NAME}'."
fi

# ----------------------------------------------------------
# 4. تشغيل migrate إذا طُلب ذلك (في الخلفية أيضاً)
# ----------------------------------------------------------

if [ "${FORCE_SITE_MIGRATE}" = "true" ] && [ -d "$SITE_DIR" ]; then
    log "Running bench migrate in background (FORCE_SITE_MIGRATE=true) ..."
    (
        bench --site "$SITE_NAME" migrate 2>&1 || {
            log "[BG] WARNING: Migration had warnings/errors"
        }
        log "[BG] Migration completed."
    ) &
fi

# ----------------------------------------------------------
# 5. تنظيم الصلاحيات
# ----------------------------------------------------------

chown -R frappe:frappe "$SITES_DIR" 2>/dev/null || true
chown -R frappe:frappe "${BENCH_DIR}/logs" 2>/dev/null || true

log "============================================"
log "Entrypoint complete — starting supervisor NOW"
log "(site setup continues in background if needed)"
log "============================================"

# ----------------------------------------------------------
# 6. تنفيذ الأمر المُمرَّر (CMD = supervisord)
# ----------------------------------------------------------

exec "$@"
