# ============================================================
# ERP Pro — ERPNext Backend for Railway
# ============================================================
# ملاحظات مهمة عن frappe/erpnext:v16:
#   - gunicorn في /home/frappe/frappe-bench/env/bin/gunicorn ✅
#   - bench ليس في env/bin — نُنشئ symlink
#   - node ليس في env/bin — نُنشئ symlink
#   - /home/frappe/logs/ غير موجود — نُنشئه
# ============================================================

FROM frappe/erpnext:v16

USER root

# ------------------------------------------------------------------
# اكتشاف المسارات الحقيقية + إنشاء symlinks
# هذا يضمن إن supervisord.conf يشتغل بالمسارات المتوقعة
# ------------------------------------------------------------------
RUN BENCH_REAL=$(which bench 2>/dev/null || echo "/usr/local/bin/bench") \
    && NODE_REAL=$(which node 2>/dev/null || echo "/usr/local/bin/node") \
    && echo "bench is at: ${BENCH_REAL}" \
    && echo "node is at: ${NODE_REAL}" \
    && ln -sf "${BENCH_REAL}" /home/frappe/frappe-bench/env/bin/bench \
    && ln -sf "${NODE_REAL}" /home/frappe/frappe-bench/env/bin/node \
    && echo "Symlinks created!"

# ------------------------------------------------------------------
# تثبيت supervisor
# ------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/log/supervisor \
    && mkdir -p /var/run/supervisor

# ------------------------------------------------------------------
# إنشاء مجلدات ضرورية لتشغيل Frappe
# /home/frappe/logs/ مطلوب لـ RotatingFileHandler في frappe logger
# ------------------------------------------------------------------
RUN mkdir -p /home/frappe/logs \
    && mkdir -p /home/frappe/frappe-bench/logs \
    && mkdir -p /home/frappe/frappe-bench/sites \
    && mkdir -p /home/frappe/frappe-bench/sites/assets \
    && chown -R frappe:frappe /home/frappe/logs \
    && chown -R frappe:frappe /home/frappe/frappe-bench/logs \
    && chown -R frappe:frappe /home/frappe/frappe-bench/sites \
    && chmod 777 /home/frappe/logs \
    && echo "Directories created with proper permissions!"

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
# نقطة الإدخال
# ------------------------------------------------------------------
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/erpnext.conf"]
