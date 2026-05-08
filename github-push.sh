#!/bin/bash
# ============================================================
# سكريبت رفع مشروع ERP Pro إلى GitHub
# ============================================================
# 
# المتطلبات:
# 1. إنشاء رمز وصول شخصي (PAT) على GitHub:
#    - اذهب إلى: https://github.com/settings/tokens/new
#    - اختر اسم: "ERP Pro Setup"
#    - اختر الصلاحيات: repo (كاملة), user
#    - انقر "Generate token"
#    - انسخ الرمز
#
# 2. تشغيل السكريبت:
#    chmod +x github-push.sh
#    ./github-push.sh YOUR_TOKEN
#
# أو بدلاً من ذلك، أدخل رمز التحقق الذي وصلك على بريدك الإلكتروني
# عند محاولة تسجيل الدخول من متصفح جديد
# ============================================================

set -e

TOKEN="${1:-}"
REPO_NAME="erp-pro"
REPO_DESC="ERP Pro - نظام إدارة موارد المؤسسات | Arabic RTL Enterprise Resource Planning System"
GITHUB_USER="Nagmix"

if [ -z "$TOKEN" ]; then
    echo "❌ يرجى تمرير رمز الوصول الشخصي (PAT) كمعامل"
    echo ""
    echo "الاستخدام: ./github-push.sh YOUR_GITHUB_TOKEN"
    echo ""
    echo "لإنشاء رمز وصول شخصي:"
    echo "1. اذهب إلى: https://github.com/settings/tokens/new"
    echo "2. اختر اسم: ERP Pro Setup"
    echo "3. اختر صلاحية: repo (كاملة)"
    echo "4. انقر Generate token وانسخ الرمز"
    exit 1
fi

echo "🚀 جارٍ إعداد مستودع GitHub..."

# إنشاء المستودع على GitHub
echo "📦 إنشاء المستودع $REPO_NAME..."
HTTP_CODE=$(curl -s -o /tmp/github_response.json -w "%{http_code}" \
    -X POST "https://api.github.com/user/repos" \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"$REPO_DESC\",\"private\":false,\"auto_init\":false}")

if [ "$HTTP_CODE" = "201" ]; then
    echo "✅ تم إنشاء المستودع بنجاح!"
elif [ "$HTTP_CODE" = "422" ]; then
    echo "⚠️ المستودع موجود بالفعل، سيتم التحديث..."
else
    echo "❌ فشل إنشاء المستودع (HTTP $HTTP_CODE)"
    cat /tmp/github_response.json
    exit 1
fi

# إعداد الـ remote
echo "🔗 إعداد الاتصال بـ GitHub..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://${GITHUB_USER}:${TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"

# رفع الكود
echo "📤 جارٍ رفع المشروع إلى GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 تم رفع المشروع بنجاح!"
    echo "🔗 رابط المستودع: https://github.com/${GITHUB_USER}/${REPO_NAME}"
    echo ""
    echo "⚠️ لا تنسَ حذف رمز الوصول من الـ remote URL بعد الانتهاء:"
    echo "   git remote set-url origin https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
else
    echo "❌ فشل رفع المشروع"
    exit 1
fi
