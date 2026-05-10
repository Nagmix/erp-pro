#!/bin/bash
# ============================================================
# ERP Pro — Custom Healthcheck for Railway
# ============================================================
# المشكلة: /api/method/ping يحتاج موقع جاهز في قاعدة البيانات
# لكن إنشاء الموقع يجري في الخلفية ويأخذ 3-5 دقائق
# فـ Frappe يرجع خطأ لأنه ما يلقى الموقع
#
# الحل: نسكربت healthcheck ذكي:
#   1. يحاول /api/method/ping أولاً (لو الموقع جاهز)
#   2. لو فشل، يتحقق إن gunicorn يرد على البورت (TCP check)
#   3. يرجع نجاح طالما gunicorn يشتغل
# ============================================================

PORT="${PORT:-8080}"

# المحاولة الأولى: /api/method/ping (أفضل — يتأكد إن كل شيء يشتغل)
if curl -sf "http://localhost:${PORT}/api/method/ping" > /dev/null 2>&1; then
    echo "Healthcheck PASSED: /api/method/ping responded"
    exit 0
fi

# المحاولة الثانية: أي رد HTTP من gunicorn (مقبول أثناء إنشاء الموقع)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/" 2>/dev/null)
if [ -n "$HTTP_CODE" ] && [ "$HTTP_CODE" != "000" ]; then
    echo "Healthcheck PASSED: gunicorn responding (HTTP ${HTTP_CODE}, site may still be initializing)"
    exit 0
fi

# المحاولة الثالثة: TCP check على البورت
if python3 -c "
import socket, sys
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(3)
    s.connect(('localhost', ${PORT}))
    s.close()
    sys.exit(0)
except:
    sys.exit(1)
" 2>/dev/null; then
    echo "Healthcheck PASSED: gunicorn port ${PORT} is open (site still initializing)"
    exit 0
fi

echo "Healthcheck FAILED: gunicorn not responding on port ${PORT}"
exit 1
