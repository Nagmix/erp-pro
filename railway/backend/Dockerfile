٩# ============================================================
# ERP Pro - ERPNext Backend Dockerfile for Railway
# ============================================================
# هذا الملف يشغّل جميع خدمات ERPNext في حاوية واحدة:
#   - gunicorn (خادم الويب - المنفذ 8000)
#   - scheduler (جدولة المهام)
#   - worker-default (معالج المهام الافتراضي)
#   - worker-long (معالج المهام الطويلة)
#   - worker-short (معالج المهام القصيرة)
#   - socketio (خادم WebSocket - المنفذ 9000)
#
# يحتاج إلى:
#   - خدمة MySQL/MariaDB (Railway Managed أو حاوية منفصلة)
#   - خدمة Redis (Railway Managed أو حاوية منفصلة)
# ============================================================

FROM frappe/erpnext:v16 AS base

USER root

# تثبيت supervisor لإدارة العمليات المتعددة
RUN apt-get update && apt-get install -y --no-install-recommends \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# إنشاء مجلدات الإعداد
RUN mkdir -p /var/log/supervisor && \
    mkdir -p /etc/supervisor/conf.d

# إعداد supervisor لإدارة جميع عمليات ERPNext
COPY supervisord.conf /etc/supervisor/supervisord.conf

# سكريبت التهيئة - ينشئ الموقع عند أول تشغيل
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# المنافذ
EXPOSE 8000 9000


ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
