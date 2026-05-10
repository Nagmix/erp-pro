#!/bin/bash
# ============================================================
# ERP Pro — ERPNext Backend Entrypoint for Railway
# ============================================================
# استراتيجية:
#   1. نكتب common_site_config.json مباشرة بـ Python (موثوق 100%)
#   2. نبدأ supervisor فوراً
#   3. إنشاء الموقع في الخلفية
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
log "SITE_NAME       : ${SITE_NAME}"
log "DB_HOST         : ${DB_HOST:-<not set>}"
log "DB_PORT         : ${DB_PORT:-3306}"
log "PORT (Railway)  : ${PORT:-8000}"
log "REDIS_URL       : ${REDIS_URL:-<not set>}"
log "REDIS_HOST      : ${REDIS_HOST:-<not set>}"
log "REDIS_CACHE     : ${REDIS_CACHE:-<not set>}"
log "REDIS_QUEUE     : ${REDIS_QUEUE:-<not set>}"
log "REDIS_SOCKETIO  : ${REDIS_SOCKETIO:-<not set>}"
log "============================================"

# ----------------------------------------------------------
# 1. ضمان وجود المجلدات
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
    log "Created bench symlink -> ${BENCH_REAL}"
fi
if [ ! -L "/home/frappe/frappe-bench/env/bin/node" ] && [ ! -f "/home/frappe/frappe-bench/env/bin/node" ]; then
    NODE_REAL=$(which node 2>/dev/null || echo "/usr/local/bin/node")
    ln -sf "${NODE_REAL}" /home/frappe/frappe-bench/env/bin/node 2>/dev/null || true
    log "Created node symlink -> ${NODE_REAL}"
fi

log "Directories and symlinks verified."

# ----------------------------------------------------------
# 2. كتابة common_site_config.json مباشرة بـ Python
#    هذا هو الإصلاح الرئيسي — بدل bench set-config
#    اللي يفشل بصمت لأن الموقع ما أنشئ بعد
# ----------------------------------------------------------

log "Writing common_site_config.json directly with Python (reliable method)..."

cd "$BENCH_DIR"

python3 << 'PYTHON_SCRIPT'
import json
import os
import re
import sys

config = {}
config_path = os.environ.get('COMMON_CONFIG', '/home/frappe/frappe-bench/sites/common_site_config.json')

# قراءة الإعدادات الموجودة إن وجدت
if os.path.exists(config_path):
    try:
        with open(config_path) as f:
            config = json.load(f)
        print(f"[CONFIG] Read existing config: {json.dumps(config, indent=2)}")
    except Exception as e:
        print(f"[CONFIG] Could not read existing config: {e}")
        config = {}

# ----------------------------------------------------------
# إعدادات قاعدة البيانات
# ----------------------------------------------------------
db_host = os.environ.get('DB_HOST', '')
db_port = os.environ.get('DB_PORT', '')

if db_host:
    config['db_host'] = db_host
    print(f"[CONFIG] Set db_host = {db_host}")
if db_port:
    config['db_port'] = int(db_port)
    print(f"[CONFIG] Set db_port = {db_port}")

# ----------------------------------------------------------
# إعدادات Redis — الأولوية:
#   1. REDIS_URL (من Railway Redis Service)
#   2. REDIS_HOST + REDIS_PORT + REDIS_PASSWORD
#   3. REDIS_CACHE + REDIS_QUEUE + REDIS_SOCKETIO (فردية)
# ----------------------------------------------------------
redis_url = os.environ.get('REDIS_URL', '').strip()
redis_host = os.environ.get('REDIS_HOST', '').strip()
redis_port = os.environ.get('REDIS_PORT', '6379').strip()
redis_password = os.environ.get('REDIS_PASSWORD', '').strip()

redis_cache_env = os.environ.get('REDIS_CACHE', '').strip()
redis_queue_env = os.environ.get('REDIS_QUEUE', '').strip()
redis_socketio_env = os.environ.get('REDIS_SOCKETIO', '').strip()

print(f"[CONFIG] REDIS_URL = '{redis_url}'")
print(f"[CONFIG] REDIS_HOST = '{redis_host}'")
print(f"[CONFIG] REDIS_CACHE env = '{redis_cache_env}'")
print(f"[CONFIG] REDIS_QUEUE env = '{redis_queue_env}'")
print(f"[CONFIG] REDIS_SOCKETIO env = '{redis_socketio_env}'")

# ----------------------------------------------------------
# دالة مساعدة: بناء 3 Redis URLs من base URL
# نضيف أرقام قاعدة بيانات مختلفة:
#   redis_cache    -> DB 0
#   redis_queue    -> DB 1
#   redis_socketio -> DB 2
# ----------------------------------------------------------
def build_redis_urls(base):
    """Build 3 Redis URLs with different DB numbers from a base URL."""
    # إزالة رقم DB الموجود في النهاية إن وُجد
    clean = re.sub(r'/\d+$', '', base)
    # إزالة الـ slash في النهاية إن وُجد
    clean = clean.rstrip('/')
    return {
        'redis_cache': clean + '/0',
        'redis_queue': clean + '/1',
        'redis_socketio': clean + '/2',
    }

if redis_url and redis_url.startswith('redis://'):
    # REDIS_URL من Railway: redis://default:PASSWORD@HOST:PORT
    urls = build_redis_urls(redis_url)
    config.update(urls)
    print(f"[CONFIG] Built Redis URLs from REDIS_URL:")
    print(f"  redis_cache    = {urls['redis_cache']}")
    print(f"  redis_queue    = {urls['redis_queue']}")
    print(f"  redis_socketio = {urls['redis_socketio']}")

elif redis_host:
    # بناء من REDIS_HOST + REDIS_PORT + REDIS_PASSWORD
    if redis_password:
        auth = f':{redis_password}@'
    else:
        auth = ''

    base = f'redis://{auth}{redis_host}:{redis_port}'
    urls = build_redis_urls(base)
    config.update(urls)
    print(f"[CONFIG] Built Redis URLs from REDIS_HOST/PORT:")
    print(f"  redis_cache    = {urls['redis_cache']}")
    print(f"  redis_queue    = {urls['redis_queue']}")
    print(f"  redis_socketio = {urls['redis_socketio']}")

elif redis_cache_env and redis_queue_env and redis_socketio_env:
    # استخدام الروابط الفردية — نضيف أرقام DB مختلفة
    # لأن Railway Redis يعطي نفس URL لكل الثلاثة
    # نضيف /0 و /1 و /2 لكل واحد
    if '/0' not in redis_cache_env and '/1' not in redis_cache_env and '/2' not in redis_cache_env:
        config['redis_cache'] = redis_cache_env.rstrip('/') + '/0'
    else:
        config['redis_cache'] = redis_cache_env

    if '/0' not in redis_queue_env and '/1' not in redis_queue_env and '/2' not in redis_queue_env:
        config['redis_queue'] = redis_queue_env.rstrip('/') + '/1'
    else:
        config['redis_queue'] = redis_queue_env

    if '/0' not in redis_socketio_env and '/1' not in redis_socketio_env and '/2' not in redis_socketio_env:
        config['redis_socketio'] = redis_socketio_env.rstrip('/') + '/2'
    else:
        config['redis_socketio'] = redis_socketio_env

    print(f"[CONFIG] Built Redis URLs from individual env vars:")
    print(f"  redis_cache    = {config['redis_cache']}")
    print(f"  redis_queue    = {config['redis_queue']}")
    print(f"  redis_socketio = {config['redis_socketio']}")

elif redis_cache_env:
    # فقط REDIS_CACHE متوفر — نبني الثلاثة منه
    urls = build_redis_urls(redis_cache_env)
    config.update(urls)
    print(f"[CONFIG] Built all Redis URLs from REDIS_CACHE:")
    print(f"  redis_cache    = {urls['redis_cache']}")
    print(f"  redis_queue    = {urls['redis_queue']}")
    print(f"  redis_socketio = {urls['redis_socketio']}")

else:
    print("[CONFIG] WARNING: No Redis configuration found! Services will fail.")
    print("[CONFIG] Set REDIS_URL or REDIS_CACHE/QUEUE/SOCKETIO or REDIS_HOST environment variables.")

# ----------------------------------------------------------
# إعدادات إضافية
# ----------------------------------------------------------
socketio_port = os.environ.get('SOCKETIO_PORT', '9000')
config['socketio_port'] = int(socketio_port)

# ----------------------------------------------------------
# كتابة الملف
# ----------------------------------------------------------
with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)
    f.write('\n')

print(f"[CONFIG] Written to {config_path}:")
print(json.dumps(config, indent=2))
PYTHON_SCRIPT

log "common_site_config.json written successfully."

# التحقق من محتوى الملف
log "=== Verifying common_site_config.json ==="
cat "$COMMON_CONFIG" || true
log "=== End of config ==="

# ----------------------------------------------------------
# 3. تعيين الموقع كافتراضي
# ----------------------------------------------------------
DEFAULT_SITE_FILE="${SITES_DIR}/currentsite.txt"
echo "$SITE_NAME" > "$DEFAULT_SITE_FILE"
log "Default site set to '${SITE_NAME}'."

# ----------------------------------------------------------
# 4. إنشاء site_config.json للموقع
# ----------------------------------------------------------
SITE_DIR="${SITES_DIR}/${SITE_NAME}"
SITE_CONFIG="${SITE_DIR}/site_config.json"

if [ ! -d "$SITE_DIR" ]; then
    mkdir -p "$SITE_DIR"
fi

# كتابة إعدادات الموقع الأساسية
if [ ! -f "$SITE_CONFIG" ]; then
    python3 << PYTHON_SITE_CONFIG
import json, os

site_config = {
    "db_name": os.environ.get('DB_NAME', '${SITE_NAME}'),
    "db_password": os.environ.get('DB_PASSWORD', ''),
    "db_host": os.environ.get('DB_HOST', ''),
    "db_port": int(os.environ.get('DB_PORT', '3306')),
}
if os.environ.get('DB_USER'):
    site_config['db_user'] = os.environ.get('DB_USER')

config_path = '${SITE_CONFIG}'
with open(config_path, 'w') as f:
    json.dump(site_config, f, indent=2)
    f.write('\n')
print(f"[SITE_CONFIG] Written: {json.dumps(site_config, indent=2)}")
PYTHON_SITE_CONFIG
    chown -R frappe:frappe "$SITE_DIR" 2>/dev/null || true
    log "site_config.json created for '${SITE_NAME}'."
else
    log "site_config.json already exists for '${SITE_NAME}'."
fi

# ----------------------------------------------------------
# 5. إنشاء الموقع في الخلفية
# ----------------------------------------------------------

if [ ! -f "${SITE_DIR}/site_config.json" ] || [ ! -d "${SITE_DIR}/private" ]; then
    log "Site '${SITE_NAME}' needs initialization — creating in background ..."
    (
        log "[BG] Waiting for MariaDB ..."
        for i in $(seq 1 60); do
            if python3 -c "
import socket, sys
host='${DB_HOST}'
port=int('${DB_PORT:-3306}')
try:
    s=socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(3)
    s.connect((host, port))
    s.close()
    sys.exit(0)
except:
    sys.exit(1)
" 2>/dev/null; then
                log "[BG] MariaDB is ready!"
                break
            fi
            [ $i -eq 60 ] && { log "[BG] MariaDB timeout — will retry on next restart"; exit 1; }
            sleep 5
        done

        log "[BG] Creating site '${SITE_NAME}' ..."
        cd /home/frappe/frappe-bench

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

        echo "$SITE_NAME" > "${SITES_DIR}/currentsite.txt"
        chown -R frappe:frappe "$SITES_DIR" 2>/dev/null || true
        log "[BG] Site setup completed!"
    ) &
    log "Site creation running in background (PID: $!)"
else
    log "Site '${SITE_NAME}' already exists and is initialized."
fi

# ----------------------------------------------------------
# 6. Migrate في الخلفية إذا طُلب
# ----------------------------------------------------------

if [ "${FORCE_SITE_MIGRATE}" = "true" ] && [ -d "$SITE_DIR" ]; then
    (
        bench --site "$SITE_NAME" migrate 2>&1 || log "[BG] Migration had warnings"
        log "[BG] Migration completed."
    ) &
fi

# ----------------------------------------------------------
# 7. تنظيم الصلاحيات
# ----------------------------------------------------------
chown -R frappe:frappe "$SITES_DIR" 2>/dev/null || true
chown -R frappe:frappe "${BENCH_DIR}/logs" 2>/dev/null || true
chown -R frappe:frappe "$LOGS_DIR" 2>/dev/null || true

log "============================================"
log "Starting supervisor NOW"
log "============================================"

exec "$@"
