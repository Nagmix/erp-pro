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
# ------------------------------------------------------------------
RUN BENCH_REAL=$(which bench 2>/dev/null || echo "/usr/local/bin/bench") \
    && NODE_REAL=$(which node 2>/dev/null || echo "/usr/local/bin/node") \
    && echo "bench is at: ${BENCH_REAL}" \
    && echo "node is at: ${NODE_REAL}" \
    && ln -sf "${BENCH_REAL}" /home/frappe/frappe-bench/env/bin/bench \
    && ln -sf "${NODE_REAL}" /home/frappe/frappe-bench/env/bin/node \
    && echo "Symlinks created!"

# ------------------------------------------------------------------
# تثبيت supervisor + أدوات تشخيص الشبكة + mariadb-client
# mariadb-client مهم لـ mysqladmin ping (أدق طريقة للتحقق من MariaDB)
# ------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    supervisor \
    curl \
    dnsutils \
    iputils-ping \
    mariadb-client \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/log/supervisor \
    && mkdir -p /var/run/supervisor

# ------------------------------------------------------------------
# إنشاء مجلدات ضرورية لتشغيل Frappe
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
# تثبيت yarn عالمياً (مطلوب لـ bench get-app الذي يشغّل yarn install)
# إنشاء symlinks في env/bin ليتمكن bench من الوصول لـ yarn و npm
# ------------------------------------------------------------------
RUN npm install -g yarn \
    && YARN_REAL=$(which yarn) \
    && NPM_REAL=$(which npm) \
    && ln -sf "${YARN_REAL}" /home/frappe/frappe-bench/env/bin/yarn \
    && ln -sf "${NPM_REAL}" /home/frappe/frappe-bench/env/bin/npm \
    && echo "yarn symlink: ${YARN_REAL} -> /home/frappe/frappe-bench/env/bin/yarn" \
    && echo "npm symlink: ${NPM_REAL} -> /home/frappe/frappe-bench/env/bin/npm"

# ------------------------------------------------------------------
# تثبيت تطبيق HRMS (الموارد البشرية)
# ERPNext v16 أصبح يعتمد على تطبيق HRMS منفصل
# ملاحظة: bench يرفض العمل كـ root، لذلك نتحول لمستخدم frappe
# --skip-assets لتسريع البناء (assets تُبنى لاحقاً في entrypoint)
# ------------------------------------------------------------------
RUN chown -R frappe:frappe /home/frappe/frappe-bench \
    && su - frappe -c "export PATH=/usr/local/bin:$PATH && cd /home/frappe/frappe-bench && bench get-app hrms --branch version-16 --skip-assets"

# ------------------------------------------------------------------
# نسخ ملفات الإعداد
# ------------------------------------------------------------------
COPY railway/backend/supervisord.conf /etc/supervisor/conf.d/erpnext.conf
COPY railway/backend/entrypoint.sh   /usr/local/bin/entrypoint.sh
COPY railway/backend/healthcheck.sh  /usr/local/bin/healthcheck.sh
COPY railway/backend/wsgi_wrapper.py /home/frappe/frappe-bench/wsgi_wrapper.py
COPY railway/backend/wsgi_wrapper.py /home/frappe/frappe-bench/sites/wsgi_wrapper.py

# ------------------------------------------------------------------
# نسخ ملفات إصلاح الأخطاء (patches)
# ------------------------------------------------------------------
COPY railway/backend/patches/ /home/frappe/frappe-bench/patches/
RUN chmod +x /home/frappe/frappe-bench/patches/*.py

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/healthcheck.sh

# ------------------------------------------------------------------
# المنافذ
# ------------------------------------------------------------------
EXPOSE 8000 9000

# ------------------------------------------------------------------
# فحص الصحة
# ------------------------------------------------------------------
HEALTHCHECK --interval=15s --timeout=10s --start-period=300s --retries=10 \
    CMD /usr/local/bin/healthcheck.sh

# ------------------------------------------------------------------
# نقطة الإدخال
# ------------------------------------------------------------------
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/erpnext.conf"]
