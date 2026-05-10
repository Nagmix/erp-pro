# ============================================================
# ERP Pro — ERPNext Backend for Railway
# ============================================================
# صورة واحدة تُشغّل جميع خدمات Frappe/ERPNext v16 عبر supervisor:
#   - gunicorn (API server)      → PORT env variable (Railway standard)
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
#   - gunicorn يستمع على PORT (الذي Railway يعيّنه تلقائياً)
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
# Railway يعيّن PORT تلقائياً — gunicorn يستمع عليه
# 9000 → socketio (WebSocket للتحديثات الفورية)
EXPOSE 8000 9000

# ------------------------------------------------------------------
# فحص الصحة داخل Docker (أكثر موثوقية من railway.toml)
# يعطي 120 ثانية قبل أول فحص (start-period)
# ثم يفحص كل 10 ثوان
# ------------------------------------------------------------------
HEALTHCHECK --interval=10s --timeout=5s --start-period=120s --retries=6 \
    CMD curl -f http://localhost:${PORT:-8000}/api/method/ping || exit 1

# ------------------------------------------------------------------
# نقطة الإدخال — تهيئة الموقع + تشغيل supervisor
# ------------------------------------------------------------------
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# الأمر الافتراضي — تشغيل supervisor في المقدمة
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/erpnext.conf"]
