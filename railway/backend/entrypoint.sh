#!/bin/bash
# ============================================================
# ERPNext Backend Entry Point for Railway
# ============================================================
# هذا السكريبت يعمل عند تشغيل الحاوية ويقوم بـ:
# 1. تهيئة الموقع إذا لم يكن موجوداً (new-site)
# 2. ضبط إعدادات قاعدة البيانات و Redis
# 3. تشغيل جميع خدمات ERPNext عبر supervisor
# ============================================================

set -e

echo "=== ERP Pro Backend - Starting ==="

# متغيرات البيئة المطلوبة (Railway يوفرها تلقائياً للخدمات المرتبطة)
SITE_NAME="${SITE_NAME:-erppro}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-erppro_db}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin}"

# Redis — إذا كانت خدمة Redis متصلة في Railway
REDIS_CACHE="${REDIS_CACHE:-redis://127.0.0.1:6379}"
REDIS_QUEUE="${REDIS_QUEUE:-redis://127.0.0.1:6379}"
REDIS_SOCKETIO="${REDIS_SOCKETIO:-redis://127.0.0.1:6379}"

BENCH_DIR="/home/frappe/frappe-bench"
SITES_DIR="${BENCH_DIR}/sites"
SITE_DIR="${SITES_DIR}/${SITE_NAME}"
COMMON_SITE_CONFIG="${SITES_DIR}/common_site_config.json"

echo "  SITE_NAME      = ${SITE_NAME}"
echo "  DB_HOST        = ${DB_HOST}"
echo "  DB_PORT        = ${DB_PORT}"
echo "  DB_NAME        = ${DB_NAME}"

# ============================================================
# 1. ضبط common_site_config.json — إعدادات مشتركة لجميع المواقع
# ============================================================
echo "[1/4] Configuring common_site_config.json..."

cat > "${COMMON_SITE_CONFIG}" <<EOJSON
{
  "db_host": "${DB_HOST}",
  "db_port": ${DB_PORT},
  "redis_cache": "${REDIS_CACHE}",
  "redis_queue": "${REDIS_QUEUE}",
  "redis_socketio": "${REDIS_SOCKETIO}",
  "socketio_port": 9000
}
EOJSON

echo "  ✓ common_site_config.json written"

# ============================================================
# 2. إنشاء الموقع إذا لم يكن موجوداً
# ============================================================
echo "[2/4] Checking site..."

if [ ! -d "${SITE_DIR}" ]; then
  echo "  Site '${SITE_NAME}' not found. Creating new site..."

  cd "${BENCH_DIR}"

  # انتظر قاعدة البيانات أن تكون جاهزة
  echo "  Waiting for database to be ready..."
  for i in $(seq 1 30); do
    if mysqladmin ping -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USER}" -p"${DB_PASSWORD}" --silent 2>/dev/null; then
      echo "  ✓ Database is ready!"
      break
    fi
    if [ "$i" -eq 30 ]; then
      echo "  ⚠ Database not ready after 30s, proceeding anyway..."
    fi
    sleep 1
  done

  # إنشاء الموقع الجديد
  bench new-site "${SITE_NAME}" \
    --db-host "${DB_HOST}" \
    --db-port "${DB_PORT}" \
    --db-name "${DB_NAME}" \
    --db-user "${DB_USER}" \
    --db-password "${DB_PASSWORD}" \
    --admin-password "${ADMIN_PASSWORD}" \
    --install-app erpnext \
    --install-app frappe \
    --set-default \
    || echo "  ⚠ Site creation had issues (may already exist)"

  echo "  ✓ Site creation completed"
else
  echo "  ✓ Site '${SITE_NAME}' already exists"
fi

# ============================================================
# 3. ضبط site_config.json للوقع
# ============================================================
echo "[3/4] Updating site config..."

SITE_CONFIG="${SITE_DIR}/site_config.json"
if [ -f "${SITE_CONFIG}" ]; then
  # تحديث الإعدادات الموجودة
  python3 -c "
import json
with open('${SITE_CONFIG}') as f:
    config = json.load(f)
config['db_name'] = '${DB_NAME}'
config['db_host'] = '${DB_HOST}'
config['db_port'] = ${DB_PORT}
config['db_user'] = '${DB_USER}'
config['db_password'] = '${DB_PASSWORD}'
with open('${SITE_CONFIG}', 'w') as f:
    json.dump(config, f, indent=2)
" 2>/dev/null || echo "  ⚠ Could not update site_config.json"
fi

echo "  ✓ Site config updated"

# ============================================================
# 4. تشغيل supervisor — جميع خدمات ERPNext
# ============================================================
echo "[4/4] Starting all ERPNext services via supervisor..."

exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
