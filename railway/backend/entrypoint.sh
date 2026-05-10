#!/bin/bash
# ============================================================
# ERP Pro — ERPNext Backend Entrypoint for Railway
# ============================================================
# استراتيجية:
#   1. نكتب common_site_config.json مباشرة بـ Python (موثوق 100%)
#   2. نكتب سكربت Python منفصل للتحقق من MariaDB (بدون مشاكل quoting)
#   3. نبدأ supervisor فوراً
#   4. إنشاء الموقع في الخلفية
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
log "MYSQL_ROOT_PW   : ${MYSQL_ROOT_PASSWORD:+<set>}${MYSQL_ROOT_PASSWORD:-<not set>}"
log "RAILWAY_DOMAIN  : ${RAILWAY_PUBLIC_DOMAIN:-<not set>}"
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
# 1.5 ★ الحل الأساسي: symlink باسم نطاق Railway → الموقع
# ERPNext يطابق Host header مع مجلدات في sites/
# لو ما لقى مجلد باسم النطاق = 404 "does not exist"
# الحل: نربط النطاق بالموقع عبر symlink
# ----------------------------------------------------------
RAILWAY_PUB_DOMAIN="${RAILWAY_PUBLIC_DOMAIN:-}"
RAILWAY_PUB_DOMAIN="${RAILWAY_PUB_DOMAIN#https://}"
RAILWAY_PUB_DOMAIN="${RAILWAY_PUB_DOMAIN#http://}"
RAILWAY_PUB_DOMAIN="${RAILWAY_PUB_DOMAIN%/}"

if [ -n "$RAILWAY_PUB_DOMAIN" ] && [ -n "$SITE_NAME" ]; then
    SYMLINK_PATH="${SITES_DIR}/${RAILWAY_PUB_DOMAIN}"
    SITE_PATH="${SITE_NAME}"

    # إنشاء مجلد الموقع لو ما موجود
    mkdir -p "${SITES_DIR}/${SITE_PATH}"

    # إنشاء symlink نسبي (مهم! المسار المطلق يسبب مشاكل)
    cd "$SITES_DIR"
    if [ ! -L "$RAILWAY_PUB_DOMAIN" ] || [ "$(readlink "$RAILWAY_PUB_DOMAIN")" != "$SITE_PATH" ]; then
        rm -f "$RAILWAY_PUB_DOMAIN" 2>/dev/null || true
        ln -sf "$SITE_PATH" "$RAILWAY_PUB_DOMAIN"
        log "★ Created relative symlink: ${RAILWAY_PUB_DOMAIN} → ${SITE_NAME}"
    else
        log "★ Symlink already exists: ${RAILWAY_PUB_DOMAIN} → ${SITE_NAME}"
    fi
    cd "$BENCH_DIR"
    chown -R frappe:frappe "$SITES_DIR" 2>/dev/null || true
else
    log "WARNING: RAILWAY_PUBLIC_DOMAIN or SITE_NAME not set — skipping domain symlink"
fi

# ★★★ حل احتياطي مهم: symlink على مستوى bench ★★★
# لو sites_path ما اتعيين صح في wsgi_wrapper، Frappe بيدور على الموقع في:
#   /home/frappe/frappe-bench/erppro/  (غلط!)
# بدال:
#   /home/frappe/frappe-bench/sites/erppro/  (صح!)
# هذا الـ symlink يخلي المسار الغلط يشتغل بعد:
#   /home/frappe/frappe-bench/erppro → sites/erppro
BENCH_LEVEL_SYMLINK="${BENCH_DIR}/${SITE_NAME}"
if [ -n "$SITE_NAME" ] && [ -d "${SITES_DIR}/${SITE_NAME}" ]; then
    cd "$BENCH_DIR"
    if [ ! -L "$SITE_NAME" ] && [ ! -d "$SITE_NAME" ]; then
        ln -sf "sites/${SITE_NAME}" "$SITE_NAME"
        log "★ Created bench-level symlink: ${BENCH_DIR}/${SITE_NAME} → sites/${SITE_NAME}"
    elif [ -L "$SITE_NAME" ]; then
        log "★ Bench-level symlink already exists: ${SITE_NAME} → $(readlink "$SITE_NAME")"
    else
        log "WARNING: ${BENCH_DIR}/${SITE_NAME} exists as a real directory (not symlink)"
    fi
    cd "$BENCH_DIR"
    chown -R frappe:frappe "$BENCH_DIR" 2>/dev/null || true
else
    log "WARNING: Cannot create bench-level symlink — SITE_NAME or site dir not found"
fi

# ----------------------------------------------------------
# 2. كتابة سكربت التحقق من MariaDB في ملف منفصل
#    هذا يتجنب مشاكل quoting في python3 -c "..."
# ----------------------------------------------------------
cat > /tmp/wait_for_mariadb.py << 'PYEOF'
#!/usr/bin/env python3
"""Wait for MariaDB to be reachable via TCP socket."""
import socket
import sys
import os

host = os.environ.get('DB_HOST', '')
port = int(os.environ.get('DB_PORT', '3306'))

if not host:
    print("[MARIADB-CHECK] ERROR: DB_HOST is not set!")
    sys.exit(1)

print(f"[MARIADB-CHECK] Checking {host}:{port} ...")

# Method 1: Use getaddrinfo (handles both IPv4 and IPv6)
try:
    results = socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
    print(f"[MARIADB-CHECK] DNS resolved {len(results)} addresses")
    for af, socktype, proto, canonname, sa in results:
        family_name = {2: 'IPv4', 10: 'IPv6', 30: 'IPv6'}.get(af, f'AF_{af}')
        try:
            s = socket.socket(af, socktype, proto)
            s.settimeout(3)
            s.connect(sa)
            s.close()
            print(f"[MARIADB-CHECK] SUCCESS via {family_name} ({sa[0]})")
            sys.exit(0)
        except Exception as e:
            print(f"[MARIADB-CHECK] {family_name} ({sa[0]}) failed: {e}")
except Exception as e:
    print(f"[MARIADB-CHECK] getaddrinfo failed: {e}")

# Method 2: Try direct IPv6
try:
    s = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    s.settimeout(3)
    s.connect((host, port))
    s.close()
    print("[MARIADB-CHECK] SUCCESS via direct IPv6")
    sys.exit(0)
except Exception as e:
    print(f"[MARIADB-CHECK] Direct IPv6 failed: {e}")

# Method 3: Try direct IPv4
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(3)
    s.connect((host, port))
    s.close()
    print("[MARIADB-CHECK] SUCCESS via direct IPv4")
    sys.exit(0)
except Exception as e:
    print(f"[MARIADB-CHECK] Direct IPv4 failed: {e}")

print("[MARIADB-CHECK] FAILED - all methods failed")
sys.exit(1)
PYEOF

chmod +x /tmp/wait_for_mariadb.py

# تشغيل تشخيص سريع
log "=== MariaDB Network Diagnostics ==="
python3 /tmp/wait_for_mariadb.py || log "MariaDB not reachable yet (may still be starting)"

# محاولة mysqladmin ping (أدق طريقة للتحقق من MariaDB)
if command -v mysqladmin &>/dev/null; then
    log "Trying mysqladmin ping..."
    mysqladmin ping -h "${DB_HOST}" -P "${DB_PORT:-3306}" -u "${DB_USER}" -p"${DB_PASSWORD}" 2>&1 || log "mysqladmin ping failed (MariaDB may still be initializing)"
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

# ★ إعداد default_site — الموقع الافتراضي
# ERPNext في v16 لا يدعم currentsite.txt بعد الآن
# لازم نحدد default_site في common_site_config.json
site_name = os.environ.get('SITE_NAME', 'erppro')
config['default_site'] = site_name
print(f"[CONFIG] Set default_site = {site_name}")

# ★ إعداد serve_default_site — مهم جداً!
# بدون هذا الإعداد، ERPNext يفشل في العثور على الموقع المناسب
# لأنه يطابق اسم النطاق (Host header) مع اسم الموقع.
# النطاق في Railway يكون مثل: erpnext-backend-production-xxxx.up.railway.app
# بينما اسم الموقع هو 'erppro' — فما في تطابق = 404 Not Found!
# serve_default_site=1 يخلي ERPNext يخدم الموقع الافتراضي لأي نطاق
config['serve_default_site'] = 1

# ★ إعداد allow_cors — للسماح بالطلبات من فرونت اند مختلف
config['allow_cors'] = '*'

# ★ إعداد skip_setup_wizard — لتفادي مشاكل معالجة الإعداد
# config['skip_setup_wizard'] = 1

# ★ إعداد إضافي — إضافة نطاق Railway للموقع
# هذا يضمن إن ERPNext يتعرف على النطاق الخارجي
railway_domain = os.environ.get('RAILWAY_PUBLIC_DOMAIN', '').replace('https://', '').replace('http://', '').strip('/')
if railway_domain:
    config['host_name'] = railway_domain
    print(f"[CONFIG] Set host_name = {railway_domain}")

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
# ★ إنشاء ملف currentsite (بدون .txt!) — Frappe يبحث عن هذا الملف
# بعض إصدارات Frappe تستخدم currentsite.txt وبعضها currentsite
# ننشئ الاثنين عشان نضمن
echo "$SITE_NAME" > "${SITES_DIR}/currentsite"
echo "$SITE_NAME" > "${SITES_DIR}/currentsite.txt"
log "Default site set to '${SITE_NAME}' (currentsite + currentsite.txt)."

# ----------------------------------------------------------
# 5. إنشاء site_config.json للموقع
# ----------------------------------------------------------
SITE_DIR="${SITES_DIR}/${SITE_NAME}"
SITE_CONFIG="${SITE_DIR}/site_config.json"

if [ ! -d "$SITE_DIR" ]; then
    mkdir -p "$SITE_DIR"
fi

# ضمان وجود مجلدات الموقع المطلوبة (logs, private, public, locks)
# Frappe يحتاجها وإلا يفشل migrate
mkdir -p "${SITE_DIR}/logs"
mkdir -p "${SITE_DIR}/private"
mkdir -p "${SITE_DIR}/private/backups"
mkdir -p "${SITE_DIR}/public"
mkdir -p "${SITE_DIR}/locks"
chown -R frappe:frappe "$SITE_DIR" 2>/dev/null || true

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

# إضافة بيانات root لـ MariaDB — مطلوبة لـ bench new-site
# بدونها، bench يسأل تفاعلياً عن كلمة مرور root ويفشل في الخلفية
root_password = os.environ.get('MYSQL_ROOT_PASSWORD', '')
if root_password:
    site_config['root_login'] = 'root'
    site_config['root_password'] = root_password
    print(f"[SITE_CONFIG] Added root_login=root, root_password=<set>")
else:
    print(f"[SITE_CONFIG] WARNING: MYSQL_ROOT_PASSWORD not set! bench new-site will fail!")

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
# 6. إنشاء الموقع في الخلفية — كمستخدم frappe
# ----------------------------------------------------------

# نتحقق هل الموقع فعلاً أنشئ بشكل كامل
# الطريقة الوحيدة الموثوقة: نتحقق من وجود جدول tabDocType في قاعدة البيانات
SITE_INITIALIZED=false
if command -v mysql &>/dev/null; then
    # تحقق من وجود الجداول الأساسية في قاعدة البيانات
    if mysql -h "${DB_HOST}" -P "${DB_PORT:-3306}" -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" \
        -e "SELECT name FROM tabDocType LIMIT 1;" 2>/dev/null | grep -q "name"; then
        SITE_INITIALIZED=true
        log "Site '${SITE_NAME}' is fully initialized (tabDocType exists)."
    else
        log "Site '${SITE_NAME}' database exists but tables are missing — needs setup."
    fi
else
    # بدون mysql، نتحقق من مجلد private فقط
    if [ -d "${SITE_DIR}/private" ] && [ -d "${SITE_DIR}/public" ]; then
        SITE_INITIALIZED=true
        log "Site '${SITE_NAME}' appears to be already initialized (file check)."
    fi
fi

if [ "$SITE_INITIALIZED" = "false" ]; then
    log "Site '${SITE_NAME}' needs initialization — creating in background ..."

    # ضمان صلاحيات frappe على كل المجلدات المطلوبة
    chown -R frappe:frappe "$SITES_DIR" 2>/dev/null || true
    chown -R frappe:frappe "${BENCH_DIR}" 2>/dev/null || true
    chown -R frappe:frappe "$LOGS_DIR" 2>/dev/null || true

    (
        log "[BG] Waiting for MariaDB at ${DB_HOST}:${DB_PORT:-3306} ..."

        # انتظار MariaDB باستخدام عدة طرق
        MARIADB_READY=false
        for i in $(seq 1 120); do
            # الطريقة 1: Python socket check
            if python3 /tmp/wait_for_mariadb.py; then
                log "[BG] MariaDB TCP is ready! (attempt $i)"
                MARIADB_READY=true
                break
            fi

            # الطريقة 2: mysqladmin ping (أدق — يتحقق من بروتوكول MySQL)
            if command -v mysqladmin &>/dev/null; then
                if mysqladmin ping -h "${DB_HOST}" -P "${DB_PORT:-3306}" -u "${DB_USER}" -p"${DB_PASSWORD}" 2>/dev/null; then
                    log "[BG] MariaDB is ready (mysqladmin ping)! (attempt $i)"
                    MARIADB_READY=true
                    break
                fi
            fi

            if [ $((i % 10)) -eq 0 ]; then
                log "[BG] Still waiting for MariaDB... (attempt $i/120)"
            fi

            [ $i -eq 120 ] && { log "[BG] MariaDB timeout after 10 minutes — will retry on next restart"; exit 1; }
            sleep 5
        done

        if [ "$MARIADB_READY" = "true" ]; then
            log "[BG] Creating site '${SITE_NAME}' as user 'frappe' ..."
            cd /home/frappe/frappe-bench

            # ضمان وجود مجلدات الموقع المطلوبة
            mkdir -p "/home/frappe/frappe-bench/sites/${SITE_NAME}/logs"
            mkdir -p "/home/frappe/frappe-bench/sites/${SITE_NAME}/private"
            mkdir -p "/home/frappe/frappe-bench/sites/${SITE_NAME}/private/backups"
            mkdir -p "/home/frappe/frappe-bench/sites/${SITE_NAME}/public"
            mkdir -p "/home/frappe/frappe-bench/sites/${SITE_NAME}/locks"
            chown -R frappe:frappe "/home/frappe/frappe-bench/sites/${SITE_NAME}" 2>/dev/null || true

            # تحقق من إن قاعدة البيانات موجودة ولديها جداول
            log "[BG] Checking if database '${DB_NAME}' has Frappe tables..."
            DB_HAS_TABLES=false
            if mysql -h "${DB_HOST}" -P "${DB_PORT:-3306}" -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" \
                -e "SELECT name FROM tabDocType LIMIT 1;" 2>/dev/null | grep -q "name"; then
                DB_HAS_TABLES=true
            fi

            if [ "$DB_HAS_TABLES" = "true" ]; then
                log "[BG] Database '${DB_NAME}' has Frappe tables! Running migrate..."
                su - frappe -c "cd /home/frappe/frappe-bench && bench --site ${SITE_NAME} migrate" 2>&1 || log "[BG] Migration had errors"
            else
                log "[BG] Database '${DB_NAME}' is empty or missing tables."

                # حذف قاعدة البيانات الفارغة إن وجدت
                mysql -h "${DB_HOST}" -P "${DB_PORT:-3306}" -u root -p"${MYSQL_ROOT_PASSWORD:-${DB_PASSWORD}}" \
                    -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`; CREATE DATABASE \`${DB_NAME}\`;" 2>/dev/null || {
                    # لو ما نقدر كـ root، نحاول كـ المستخدم العادي
                    log "[BG] Could not recreate DB as root, trying as user..."
                    mysql -h "${DB_HOST}" -P "${DB_PORT:-3306}" -u "${DB_USER}" -p"${DB_PASSWORD}" \
                        -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`; CREATE DATABASE \`${DB_NAME}\`;" 2>/dev/null || log "[BG] Could not recreate DB, will try new-site anyway"
                }

                log "[BG] Creating new site '${SITE_NAME}'..."

                # إنشاء الموقع كمستخدم frappe (مو root!)
                # --force مطلوب لأننا سوينا مجلد الموقع و site_config.json مسبقاً
                # --db-root-username و --db-root-password مطلوبين عشان ما يسأل تفاعلياً
                DB_ROOT_USER="root"
                DB_ROOT_PASS="${MYSQL_ROOT_PASSWORD:-}"

                if [ -z "$DB_ROOT_PASS" ]; then
                    log "[BG] WARNING: MYSQL_ROOT_PASSWORD is not set!"
                    log "[BG] Trying bench new-site without root credentials (may fail)..."
                    su - frappe -c "cd /home/frappe/frappe-bench && bench new-site ${SITE_NAME} \
                        --db-host ${DB_HOST} \
                        --db-port ${DB_PORT:-3306} \
                        --db-name ${DB_NAME} \
                        --db-user ${DB_USER} \
                        --db-password ${DB_PASSWORD} \
                        --admin-password ${ADMIN_PASSWORD} \
                        --install-app erpnext \
                        --install-app frappe \
                        --set-default \
                        --force \
                        --verbose" 2>&1
                else
                    log "[BG] Using root credentials for bench new-site..."
                    su - frappe -c "cd /home/frappe/frappe-bench && bench new-site ${SITE_NAME} \
                        --db-host ${DB_HOST} \
                        --db-port ${DB_PORT:-3306} \
                        --db-root-username ${DB_ROOT_USER} \
                        --db-root-password '${DB_ROOT_PASS}' \
                        --db-name ${DB_NAME} \
                        --db-user ${DB_USER} \
                        --db-password ${DB_PASSWORD} \
                        --admin-password ${ADMIN_PASSWORD} \
                        --install-app erpnext \
                        --install-app frappe \
                        --set-default \
                        --force \
                        --verbose" 2>&1
                fi

                SITE_RESULT=$?
                if [ $SITE_RESULT -ne 0 ]; then
                    log "[BG] bench new-site FAILED with exit code ${SITE_RESULT}"
                    log "[BG] Trying migrate as fallback..."
                    su - frappe -c "cd /home/frappe/frappe-bench && bench --site ${SITE_NAME} migrate" 2>&1 || log "[BG] Migration also had errors"
                else
                    log "[BG] Site '${SITE_NAME}' created successfully!"
                fi
            fi

            echo "$SITE_NAME" > "${SITES_DIR}/currentsite.txt"
            chown -R frappe:frappe "$SITES_DIR" 2>/dev/null || true

            # ★ تعيين الموقع كافتراضي بالطريقة الصحيحة لـ v16
            log "[BG] Setting default site via 'bench use'..."
            su - frappe -c "cd /home/frappe/frappe-bench && bench use ${SITE_NAME}" 2>&1 || log "[BG] bench use had warnings"

            # ★ إضافة نطاق Railway للموقع — هذا الحل الأساسي!
            # بدون هذا، ERPNext ما يتعرف على النطاق الخارجي
            RAILWAY_PUB_DOMAIN="${RAILWAY_PUBLIC_DOMAIN:-}"
            RAILWAY_PUB_DOMAIN="${RAILWAY_PUB_DOMAIN#https://}"
            RAILWAY_PUB_DOMAIN="${RAILWAY_PUB_DOMAIN#http://}"
            RAILWAY_PUB_DOMAIN="${RAILWAY_PUB_DOMAIN%/}"

            if [ -n "$RAILWAY_PUB_DOMAIN" ]; then
                log "[BG] Adding Railway domain '${RAILWAY_PUB_DOMAIN}' to site '${SITE_NAME}'..."
                su - frappe -c "cd /home/frappe/frappe-bench && bench --site ${SITE_NAME} add-domain ${RAILWAY_PUB_DOMAIN}" 2>&1 || log "[BG] add-domain had warnings (may already exist)"
            else
                log "[BG] RAILWAY_PUBLIC_DOMAIN not set — skipping add-domain"
            fi

            log "[BG] Site setup completed!"
        fi
    ) &
    log "Site creation running in background (PID: $!)"
else
    log "Site '${SITE_NAME}' already exists and is initialized."

    # حتى لو الموقع موجود، نتأكد من إعدادات التوجيه
    log "Ensuring serve_default_site is configured..."
    su - frappe -c "cd /home/frappe/frappe-bench && bench set-config -g serve_default_site 1" 2>&1 || true
    su - frappe -c "cd /home/frappe/frappe-bench && bench set-config -g default_site ${SITE_NAME}" 2>&1 || true
    su - frappe -c "cd /home/frappe/frappe-bench && bench set-config -g allow_cors '*'" 2>&1 || true

    # إضافة نطاق Railway لو موجود
    RAILWAY_PUB_DOMAIN="${RAILWAY_PUBLIC_DOMAIN:-}"
    RAILWAY_PUB_DOMAIN="${RAILWAY_PUB_DOMAIN#https://}"
    RAILWAY_PUB_DOMAIN="${RAILWAY_PUB_DOMAIN#http://}"
    RAILWAY_PUB_DOMAIN="${RAILWAY_PUB_DOMAIN%/}"

    if [ -n "$RAILWAY_PUB_DOMAIN" ]; then
        log "Adding Railway domain '${RAILWAY_PUB_DOMAIN}' to existing site..."
        su - frappe -c "cd /home/frappe/frappe-bench && bench --site ${SITE_NAME} add-domain ${RAILWAY_PUB_DOMAIN}" 2>&1 || log "add-domain had warnings (may already exist)"
    fi
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
