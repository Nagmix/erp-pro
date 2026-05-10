# ============================================================
# ERP Pro — ERPNext Backend for Railway
# ============================================================
# صورة واحدة تُشغّل جميع خدمات Frappe/ERPNext v16 عبر supervisor:
#   - gunicorn (API server)      → PORT env variable
#   - scheduler                  → background jobs
#   - worker-default             → default queue
#   - worker-long                → long-running queue
#   - worker-short               → short-lived queue
#   - socketio                   → WebSocket server → port 9000
#
# ملاحظات مهمة عن frappe/erpnext:v16:
#   - bench متوفر في PATH (لا تحتاج المسار الكامل)
#   - node متوفر في /usr/local/bin/node
#   - السجلات تذهب إلى /home/frappe/logs/ (يجب إنشاؤه)
#   - لا يوجد VOLUME (Railway يدير التخزين)
# ============================================================

FROM frappe/erpnext:v16

# ------------------------------------------------------------------
# تثبيت الحزم الإضافية + اكتشاف المسارات الحقيقية
# ------------------------------------------------------------------
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/log/supervisor \
    && mkdir -p /var/run/supervisor \
    && echo "=== Discovering paths ===" \
    && which bench && which node && which gunicorn \
    && echo "=== Done ==="

# ------------------------------------------------------------------
# إنشاء مجلدات مفقودة ضرورية لتشغيل Frappe
# ------------------------------------------------------------------
RUN mkdir -p /home/frappe/logs \
    && mkdir -p /home/frappe/frappe-bench/logs \
    && mkdir -p /home/frappe/frappe-bench/sites \
    && mkdir -p /home/frappe/frappe-bench/sites/assets \
    && chown -R frappe:frappe /home/frappe/logs \
    && chown -R frappe:frappe /home/frappe/frappe-bench/logs \
    && chown -R frappe:frappe /home/frappe/frappe-bench/sites

# ------------------------------------------------------------------
# نسخ ملفات الإعداد
# ------------------------------------------------------------------
COPY railway/backend/supervisord.conf /etc/supervisor/conf.d/erpnext.conf
COPY railway/backend/entrypoint.sh   /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

# ------------------------------------------------------------------
# المنافذ
# ------------------------------------------------------------------
EXPOSE 8000 9000

# ------------------------------------------------------------------
# فحص الصحة
# ------------------------------------------------------------------
HEALTHCHECK --interval=10s --timeout=5s --start-period=120s --retries=6 \
    CMD curl -f http://localhost:${PORT:-8000}/api/method/ping || exit 1

# ------------------------------------------------------------------
# نقطة الإدخال — تهيئة الموقع + تشغيل supervisor
# ------------------------------------------------------------------
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# الأمر الافتراضي — تشغيل supervisor في المقدمة
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/erpnext.conf"]
