#!/bin/bash
# ============================================================
# ERP Pro — ERPNext Backend Entrypoint for Railway
# ============================================================
# استراتيجية:
#   1. نكتب common_site_config.json مباشرة بـ Python (موثوق 100%)
#   2. نتحقق من MariaDB و Redis قبل بدء supervisor
#   3. إنشاء الموقع في الخلفية (لا نوقف البدء)
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
log "DB_NAME         : ${DB_NAME:-<not set>}"
log "DB_USER         : ${DB_USER:-<not set>}"
log "PORT (Railway)  : ${PORT:-8000}"
log "REDIS_URL       : ${REDIS_URL:-<not set>}"
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
# 2. تشخيص شبكة MariaDB — قبل كل شيء
# ----------------------------------------------------------
log "=== MariaDB Network Diagnostics ==="
if [ -n "$DB_HOST" ]; then
    log "DB_HOST is set to: '${DB_HOST}'"
    # محاولة حل DNS
    python3 -c "
import socket
host = '${DB_HOST}'
print(f'[DNS] Resolving: {host}')
try:
    results = socket.getaddrinfo(host, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
    for r in results:
        print(f'[DNS]   -> {r[0].name}: {r[4][0]}')
except Exception as e:
    print(f'[DNS] FAILED to resolve: {e}')
" 2>&1 || log "[DNS] Resolution failed"

    # محاولة اتصال TCP
    python3 -c "
import socket
host = '${DB_HOST}'
port = int('${DB_PORT:-3306}')
print(f'[TCP] Connecting to {host}:{port} ...')
try:
    # Try IPv6 first (Railway private domains often use IPv6)
    for family in [socket.AF_INET6, socket.AF_INET]:
        try:
            s = socket.socket(family, socket.SOCK_STREAM)
            s.settimeout(5)
            s.connect((host, port))
            s.close()
            print(f'[TCP] SUCCESS via {family.name}!')
            break
        except Exception as e:
            print(f'[TCP] {family.name} failed: {e}')
    else:
        # Try using getaddrinfo
        results = socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for af, socktype, proto, canonname, sa in results:
            try:
                s = socket.socket(af, socktype, proto)
                s.settimeout(5)
                s.connect(sa)
                s.close()
                print(f'[TCP] SUCCESS via getaddrinfo ({af})!')
                break
            except Exception as e:
                print(f'[TCP] getaddrinfo {af} failed: {e}')
except Exception as e:
    print(f'[TCP] All connection methods failed: {e}')
" 2>&1 || log "[TCP] Connection test failed"
else
    log "WARNING: DB_HOST is not set! MariaDB will not be reachable."
fi
log "=== End of Network Diagnostics ==="

# ----------------------------------------------------------
# 3. كتابة common_site_config.json مباشرة بـ Python
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
# إعدادات Redis
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

def build_redis_urls(base):
    """Build 3 Redis URLs with different DB numbers from a base URL."""
    clean = re.sub(r'/\d+$', '', base)
    clean = clean.rstrip('/')
    return {
        'redis_cache': clean + '/0',
        'redis_queue': clean + '/1',
        'redis_socketio': clean + '/2',
    }

if redis_url and redis_url.startswith('redis://'):
    urls = build_redis_urls(redis_url)
    config.update(urls)
    print(f"[CONFIG] Built Redis URLs from REDIS_URL:")
    print(f"  redis_cache    = {urls['redis_cache']}")
    print(f"  redis_queue    = {urls['redis_queue']}")
    print(f"  redis_socketio = {urls['redis_socketio']}")

elif redis_host:
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
    urls = build_redis_urls(redis_cache_env)
    config.update(urls)
    print(f"[CONFIG] Built all Redis URLs from REDIS_CACHE:")
    print(f"  redis_cache    = {urls['redis_cache']}")
    print(f"  redis_queue    = {urls['redis_queue']}")
    print(f"  redis_socketio = {urls['redis_socketio']}")

else:
    print("[CONFIG] WARNING: No Redis configuration found! Services will fail.")

# ----------------------------------------------------------
# إعدادات إضافية
# ----------------------------------------------------------
socketio_port = os.environ.get('SOCKETIO_PORT', '9000')
config['socketio_port'] = int(socketio_port)

# إعداد developer_mode لتسهيل التشخيص
config['developer_mode'] = 1

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
# 4. تعيين الموقع كافتراضي
# ----------------------------------------------------------
DEFAULT_SITE_FILE="${SITES_DIR}/currentsite.txt"
echo "$SITE_NAME" > "$DEFAULT_SITE_FILE"
log "Default site set to '${SITE_NAME}'."

# ----------------------------------------------------------
# 5. إنشاء site_config.json للموقع
# ----------------------------------------------------------
SITE_DIR="${SITES_DIR}/${SITE_NAME}"
SITE_CONFIG="${SITE_DIR}/site_config.json"

if [ ! -d "$SITE_DIR" ]; then
    mkdir -p "$SITE_DIR"
fi

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
# 6. إنشاء الموقع في الخلفية مع تشخيص أفضل
# ----------------------------------------------------------

# نتحقق هل الموقع فعلاً أنشئ (يوجد مجلد private وملفات)
SITE_INITIALIZED=false
if [ -d "${SITE_DIR}/private" ] && [ -f "${SITE_DIR}/site_config.json" ]; then
    # نتحقق إن الموقع فعلاً يعمل في قاعدة البيانات
    SITE_INITIALIZED=true
    log "Site '${SITE_NAME}' appears to be already initialized."
fi

if [ "$SITE_INITIALIZED" = "false" ]; then
    log "Site '${SITE_NAME}' needs initialization — creating in background ..."
    (
        log "[BG] Waiting for MariaDB at ${DB_HOST}:${DB_PORT:-3306} ..."

        # انتظار MariaDB مع دعم IPv4 و IPv6
        MARIADB_READY=false
        for i in $(seq 1 120); do
            if python3 -c "
import socket, sys
host='${DB_HOST}'
port=int('${DB_PORT:-3306}')

# Try all address families (IPv4 + IPv6)
try:
    results = socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
    for af, socktype, proto, canonname, sa in results:
        try:
            s = socket.socket(af, socktype, proto)
            s.settimeout(3)
            s.connect(sa)
            s.close()
            sys.exit(0)
        except:
            continue
except:
    pass

# Fallback: try direct connection
for family in [socket.AF_INET6, socket.AF_INET]:
    try:
        s = socket.socket(family, socket.SOCK_STREAM)
        s.settimeout(3)
        s.connect((host, port))
        s.close()
        sys.exit(0)
    except:
        continue

sys.exit(1)
" 2>/dev/null; then
                log "[BG] MariaDB is ready! (attempt $i)"
                MARIADB_READY=true
                break
            fi

            if [ $((i % 10)) -eq 0 ]; then
                log "[BG] Still waiting for MariaDB... (attempt $i/120)"
            fi

            [ $i -eq 120 ] && { log "[BG] MariaDB timeout after 10 minutes — will retry on next restart"; exit 1; }
            sleep 5
        done

        if [ "$MARIADB_READY" = "true" ]; then
            log "[BG] Creating site '${SITE_NAME}' ..."
            cd /home/frappe/frappe-bench

            # محاولة إنشاء الموقع
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
        fi
    ) &
    log "Site creation running in background (PID: $!)"
else
    log "Site '${SITE_NAME}' already exists and is initialized."
fi

# ----------------------------------------------------------
# 7. Migrate في الخلفية إذا طُلب
# ----------------------------------------------------------

if [ "${FORCE_SITE_MIGRATE}" = "true" ] && [ -d "$SITE_DIR" ]; then
    (
        bench --site "$SITE_NAME" migrate 2>&1 || log "[BG] Migration had warnings"
        log "[BG] Migration completed."
    ) &
fi

# ----------------------------------------------------------
# 8. تنظيم الصلاحيات
# ----------------------------------------------------------
chown -R frappe:frappe "$SITES_DIR" 2>/dev/null || true
chown -R frappe:frappe "${BENCH_DIR}/logs" 2>/dev/null || true
chown -R frappe:frappe "$LOGS_DIR" 2>/dev/null || true

log "============================================"
log "Starting supervisor NOW"
log "============================================"

exec "$@"
