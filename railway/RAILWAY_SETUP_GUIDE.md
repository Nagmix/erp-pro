# ============================================================
# ERP Pro — دليل نشر Railway الكامل (محدّث)
# ============================================================
#
# النظام يحتاج 4 خدمات على Railway:
#
#   1. erp-pro-web      → الواجهة الأمامية (Next.js)
#   2. erpnext-backend   → الواجهة الخلفية (ERPNext v16)
#   3. MariaDB Database  → قاعدة البيانات (Railway Managed)
#   4. Redis             → التخزين المؤقت (Railway Managed)
#
# ============================================================

# ============================================================
# الخطوة 1: إنشاء مشروع جديد على Railway
# ============================================================
# من لوحة تحكم Railway:
#   New Project → Empty Project
#   سمّه: erp-pro

# ============================================================
# الخطوة 2: إضافة قاعدة بيانات MariaDB
# ============================================================
# من المشروع:
#   New Service → Database → Add MariaDB
#   سمّه: erp-db
#   بعد الإنشاء، احفظ متغيرات البيئة التالية:
#     MARIADBHOST, MARIADBPORT, MARIADBUSER, MARIADBPASSWORD, MARIADBDATABASE

# ============================================================
# الخطوة 3: إضافة Redis
# ============================================================
# من المشروع:
#   New Service → Database → Add Redis
#   سمّه: erp-redis
#   بعد الإنشاء، احفظ متغيرات البيئة:
#     REDISHOST, REDISPORT, REDIS_URL

# ============================================================
# الخطوة 4: نشر ERPNext Backend
# ============================================================
# من المشروع:
#   New Service → GitHub Repo → اختر مستودع erp-pro
#   في إعدادات الخدمة:
#     Root Directory: railway/backend
#     Builder: Dockerfile
#
#   أضف متغيرات البيئة:
#     SITE_NAME=erppro
#     DB_HOST=${{MariaDB.MARIADBHOST}}
#     DB_PORT=${{MariaDB.MARIADBPORT}}
#     DB_NAME=${{MariaDB.MARIADBDATABASE}}
#     DB_USER=${{MariaDB.MARIADBUSER}}
#     DB_PASSWORD=${{MariaDB.MARIADBPASSWORD}}
#     ADMIN_PASSWORD=كلمة_مرور_الادمن_الخاصة_بك
#     REDIS_CACHE=redis://${{Redis.REDISHOST}}:${{Redis.REDISPORT}}
#     REDIS_QUEUE=redis://${{Redis.REDISHOST}}:${{Redis.REDISPORT}}
#     REDIS_SOCKETIO=redis://${{Redis.REDISHOST}}:${{Redis.REDISPORT}}
#     SOCKETIO_PORT=9000
#     GUNICORN_WORKERS=2
#     FRAPPE_WORKER_TIMEOUT=120
#     FORCE_SITE_MIGRATE=false
#
#   سمّه: erpnext-backend
#
#   ملاحظة: عند أول نشر، FORCE_SITE_MIGRATE يمكن أن يبقى false
#   لأن entrypoint.sh سينشئ الموقع تلقائياً.
#   عند التحديثات اللاحقة، غيّره إلى true لتشغيل migrate.

# ============================================================
# هيكل مجلد railway/backend
# ============================================================
#
#   railway/backend/
#   ├── Dockerfile          → صورة Docker مبنية على frappe/erpnext:v16
#   ├── supervisord.conf    → إدارة العمليات (gunicorn + scheduler + workers + socketio)
#   ├── entrypoint.sh       → تهيئة الموقع عند أول تشغيل
#   ├── railway.toml        → إعدادات Railway (healthcheck, restart policy)
#   └── .dockerignore       → تجاهل ملفات أثناء بناء الصورة
#
# ============================================================
# كيف يعمل Backend على Railway
# ============================================================
#
#   1. تُبنى الصورة من frappe/erpnext:v16
#   2. entrypoint.sh ينتظر جاهزية MariaDB و Redis
#   3. إذا لم يكن الموقع موجوداً، يُنشأ تلقائياً مع erpnext
#   4. تُحدَّث إعدادات common_site_config.json
#   5. supervisor يُشغّل جميع العمليات:
#      - gunicorn (port 8000) → API
#      - scheduler            → مهام مجدولة
#      - worker-default       → طابور افتراضي
#      - worker-long          → طابور طويل
#      - worker-short         → طابور قصير
#      - socketio (port 9000) → WebSocket
#
# ============================================================
# الخطوة 5: نشر الواجهة الأمامية (Next.js)
# ============================================================
# من المشروع:
#   New Service → GitHub Repo → اختر مستودع erp-pro
#   في إعدادات الخدمة:
#     Root Directory: / (الجذر)
#     Builder: Dockerfile
#   أضف متغيرات البيئة:
#     BACKEND_HOST=http://${{erpnext-backend.RAILWAY_PRIVATE_DOMAIN}}:8000
#     BACKEND_SITE_NAME=erppro
#     BACKEND_ADMIN_USER=Administrator
#     BACKEND_ADMIN_PASSWORD=كلمة_مرور_الادمن
#     BACKEND_VERSION=v16
#     DATABASE_URL=file:/app/data/custom.db
#     AUTH_JWT_SECRET=سرك_الخاص_بتوقيع_JWT
#   سمّه: erp-pro-web
#   ربط المنفذ 3000 → Generate Domain

# ============================================================
# ملاحظات مهمة
# ============================================================
# - Railway يوفر ربط تلقائي بين الخدمات في نفس المشروع
# - استخدم ${{ServiceName.VARIABLE}} للإشارة لمتغيرات خدمة أخرى
# - الواجهة الأمامية تحتاج ربط المنفذ 3000 (Generate Domain)
# - Backend لا يحتاج ربط منفذ خارجي (الواجهة تتواصل معه داخلياً)
# - تأكد من أن MariaDB و Redis يعملان قبل الـ Backend
# - أول تشغيل للـ Backend سيأخذ وقت أطول (تهيئة الموقع)
# - لا يوجد VOLUME في Dockerfile — Railway يدير التخزين بطريقته
# - لتحديث الموقع بعد تغيير الكود، غيّر FORCE_SITE_MIGRATE=true مؤقتاً
