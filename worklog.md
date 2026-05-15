---
Task ID: 2
Agent: Main Agent
Task: إصلاح خطأ صفحة المصروفات — HRMS مثبت لكن DocTypes لم تُنشأ

Work Log:
- تحليل ملف السجلات الجديد: لا يزال خطأ 404 على Expense Claim
- فحص مباشر لخادم ERPNext عبر curl:
  - HRMS مثبت كتطبيق (frappe 16.18.0, erpnext 16.18.1, hrms 16.7.0)
  - Module Def HR موجود مع app_name=hrms
  - Employee doctype يعمل (HR-EMP- prefix records)
  - Expense Claim Type يعمل (5 سجلات عربية)
  - لكن: DocType Expense Claim غير موجود! ("DocType Expense Claim غير موجود")
  - لكن: لا توجد DocTypes في وحدة HR (قائمة فارغة!)
  - Naming Series DocType لا يعمل في v16 (ImportError)
  - Series DocType غير موجود
- محاولة تشغيل migrate عبر API — جميع الطرق فشلت (not whitelisted)
- تعديل entrypoint.sh: إضافة فحص Expense Claim DocType — إذا غير موجود، يشغل migrate تلقائياً
- تحسين install-hrms API: إضافة isHrmsFullyInstalled() الذي يميز بين "التطبيق مثبت" و"DocTypes موجودة"
- إصلاح naming-series route: إضافة docTypeExists لجميع النتائج وتجنب أخطاء Naming Series/Series في v16
- تحديث HrmsRequiredBanner: عرض تعليمات واضحة لإعادة نشر الخادم مع FORCE_SITE_MIGRATE=true

Stage Summary:
- السبب الجذري: HRMS مثبت كتطبيق لكن bench migrate لم يُشغّل بعد التثبيت
- الحل المباشر: المستخدم يحتاج لإعادة نشر الخادم الخلفي مع FORCE_SITE_MIGRATE=true
- الحل الدائم: entrypoint.sh سيفحص تلقائياً ويشغل migrate عند الحاجة في النشرات القادمة
- الملفات المعدلة: 4 ملفات
