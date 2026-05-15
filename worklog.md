---
Task ID: 1
Agent: Main Agent
Task: إصلاح خطأ صفحة المصروفات — ربطها بوحدة HRMS

Work Log:
- تحليل ملف السجلات: خطأ 404 على /resource/Expense Claim و /resource/Naming Series/Expense Claim و /resource/Series
- فحص backend.ts و API routes وصفحات المصروفات الأربع
- تحديد السبب الجذري: Expense Claim هو DocType تابع لـ HRMS وغير موجود على الموقع (erppro)
- إنشاء API endpoint جديد: /api/setup/install-hrms (POST لتثبيت، GET للتشخيص)
- إصلاح naming-series route لإرجاع docTypeExists وعدم محاولة جلب Naming Series لـ DocTypes غير موجودة
- تحديث صفحة المصروفات (expenses) لاستخدام useHrmsCheck و HrmsRequiredBanner مع زر تثبيت
- تحديث صفحة المصاريف اليومية (daily-expenses) بنفس الفحص
- تحديث صفحة مصروفات الجوال (mobile-expenses) بنفس الفحص
- تحديث صفحة المصروفات بالمدة (expenses-by-period) بنفس الفحص
- تحديث HrmsRequiredBanner بإضافة زر "تثبيت HRMS الآن" يعمل عبر API
- بناء المشروع بنجاح ودفع الكود إلى GitHub

Stage Summary:
- الملفات المعدلة: 7 ملفات
- API جديد: POST/GET /api/setup/install-hrms
- المشكلة الجذرية: HRMS app غير مثبت على الموقع (erppro) في ERPNext backend
- الحل: إضافة آلية تثبيت HRMS عبر Frappe API + تحسين تجربة المستخدم بعرض بانر مع زر تثبيت
