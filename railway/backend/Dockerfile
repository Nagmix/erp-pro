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
COPY railway/backend/healthcheck.sh  /usr/local/bin/healthcheck.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/healthcheck.sh

# ------------------------------------------------------------------
# المنافذ
# ------------------------------------------------------------------
EXPOSE 8000 9000

# ------------------------------------------------------------------
# فحص الصحة
# ------------------------------------------------------------------
HEALTHCHECK --interval=15s --timeout=10s --start-period=180s --retries=10 \
    CMD /usr/local/bin/healthcheck.sh

# ------------------------------------------------------------------
# نقطة الإدخال
# ------------------------------------------------------------------
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/erpnext.conf"]
