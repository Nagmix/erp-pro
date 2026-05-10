# ============================================================
# ERP Pro — دليل نشر Railway الكامل
# ============================================================
#
# النظام يحتاج 4 خدمات على Railway:
#
#   1. erp-pro-web     → الواجهة الأمامية (Next.js)
#   2. erpnext-backend  → الواجهة الخلفية (ERPNext v16)
#   3. MySQL Database   → قاعدة البيانات (Railway Managed)
#   4. Redis            → التخزين المؤقت (Railway Managed)
#
# ============================================================

# ============================================================
# الخطوة 1: إنشاء مشروع جديد على Railway
# ============================================================
# من لوحة تحكم Railway:
#   New Project → Empty Project
#   سمّه: erp-pro

# ============================================================
# الخطوة 2: إضافة قاعدة بيانات MySQL
# ============================================================
# من المشروع:
#   New Service → Database → Add MySQL
#   سمّه: erp-db
#   بعد الإنشاء، احفظ متغيرات البيئة التالية:
#     MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE

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
#   أضف متغيرات البيئة:
#     SITE_NAME=erppro
#     DB_HOST=${{MySQL.MYSQLHOST}}
#     DB_PORT=${{MySQL.MYSQLPORT}}
#     DB_NAME=${{MySQL.MYSQLDATABASE}}
#     DB_USER=${{MySQL.MYSQLUSER}}
#     DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
#     ADMIN_PASSWORD=كلمة_مرور_الادمن_الخاصة_بك
#     REDIS_CACHE=redis://${{Redis.REDISHOST}}:${{Redis.REDISPORT}}
#     REDIS_QUEUE=redis://${{Redis.REDISHOST}}:${{Redis.REDISPORT}}
#     REDIS_SOCKETIO=redis://${{Redis.REDISHOST}}:${{Redis.REDISPORT}}
#   سمّه: erpnext-backend

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
#     DATABASE_URL=file:/app/data/custom.db
#     AUTH_JWT_SECRET=سرك_الخاص_بتوقيع_JWT
#   سمّه: erp-pro-web

# ============================================================
# ملاحظات مهمة:
# ============================================================
# - Railway يوفر ربط تلقائي بين الخدمات في نفس المشروع
# - استخدم ${{ServiceName.VARIABLE}} للإشارة لمتغيرات خدمة أخرى
# - الواجهة الأمامية تحتاج ربط المنفذ 3000 (Generate Domain)
# - Backend لا يحتاج ربط منفذ خارجي (الواجهة تتواصل معه داخلياً)
# - تأكد من أن MySQL و Redis يعملان قبل الـ Backend
# - أول تشغيل للـ Backend سيأخذ وقت أطول (تهيئة الموقع)
