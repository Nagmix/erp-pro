# ============================================================
# ERP Pro — ERPNext Backend for Railway
# ============================================================
# صورة واحدة تُشغّل جميع خدمات Frappe/ERPNext v16 عبر supervisor:
#   - gunicorn (API server)      → port 8000
#   - scheduler                  → background jobs
#   - worker-default             → default queue
#   - worker-long                → long-running queue
#   - worker-short               → short-lived queue
#   - socketio                   → WebSocket server → port 9000
#
# ملاحظات Railway:
#   - لا يوجد VOLUME (Railway يدير التخزين بطريقته الخاصة)
#   - MariaDB و Redis كخدمات مُدارة من Railway
#   - الإدخال عبر entrypoint.sh الذي يُهيئ الموقع عند أول تشغيل
#   - مسارات COPY نسبية من جذر المستودع (Railway build context = repo root)
# ============================================================

FROM frappe/erpnext:v16

# ------------------------------------------------------------------
# تثبيت الحزم الإضافية
# ------------------------------------------------------------------
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    supervisor \
    curl \
    redis-tools \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/log/supervisor \
    && mkdir -p /var/run/supervisor

# ------------------------------------------------------------------
# نسخ ملفات الإعداد
# المسارات نسبية من جذر المستودع لأن Railway يستخدم repo root كـ build context
# ------------------------------------------------------------------
COPY railway/backend/supervisord.conf /etc/supervisor/conf.d/erpnext.conf
COPY railway/backend/entrypoint.sh   /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

# ------------------------------------------------------------------
# إعداد مجلدات العمل (بدون VOLUME — Railway يدير التخزين)
# ------------------------------------------------------------------
RUN mkdir -p /home/frappe/frappe-bench/sites \
    && mkdir -p /home/frappe/frappe-bench/logs \
    && mkdir -p /home/frappe/frappe-bench/sites/assets \
    && chown -R frappe:frappe /home/frappe/frappe-bench/sites \
    && chown -R frappe:frappe /home/frappe/frappe-bench/logs

# ------------------------------------------------------------------
# المنافذ
# ------------------------------------------------------------------
# 8000 → gunicorn (Frappe/ERPNext API) — Railway healthcheck target
# 9000 → socketio (WebSocket للتحديثات الفورية)
EXPOSE 8000 9000

# ------------------------------------------------------------------
# متغيرات البيئة الافتراضية
# ------------------------------------------------------------------
ENV SITE_NAME="erppro" \
    DB_HOST="" \
    DB_PORT="3306" \
    DB_NAME="erpnext" \
    DB_USER="root" \
    DB_PASSWORD="" \
    ADMIN_PASSWORD="admin" \
    REDIS_CACHE="" \
    REDIS_QUEUE="" \
    REDIS_SOCKETIO="" \
    SOCKETIO_PORT="9000" \
    FRAPPE_WORKER_TIMEOUT="120" \
    GUNICORN_WORKERS="2" \
    FORCE_SITE_MIGRATE="false"

# ------------------------------------------------------------------
# نقطة الإدخال — تهيئة الموقع + تشغيل supervisor
# ------------------------------------------------------------------
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# الأمر الافتراضي — تشغيل supervisor في المقدمة
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/erpnext.conf"]
