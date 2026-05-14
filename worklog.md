---
Task ID: 1
Agent: Main Agent
Task: إصلاح مشروع ERP Pro - Dockerfile, entrypoint, toLowerCase errors

Work Log:
- استنساخ المشروع من GitHub إلى بيئة العمل
- إصلاح Dockerfile: تثبيت yarn عالمياً، إنشاء symlinks لـ npm/yarn، تشغيل bench get-app hrms بـ --skip-assets كمستخدم frappe مع PATH
- إصلاح entrypoint.sh: إضافة symlinks لـ yarn/npm، إضافة PATH=/usr/local/bin لجميع أوامر su - frappe، إضافة بناء assets بعد إنشاء الموقع، إضافة تثبيت HRMS يدوي كـ fallback
- إصلاح خطأ toLowerCase في route-access.ts: حماية من القيم undefined/null في مصفوفة الأدوار
- إصلاح خطأ toLowerCase في report-access.ts: نفس الحماية
- تحسين auth-store.ts: فلترة الأدوار للتأكد من أنها نصوص صالحة
- تحسين installed-apps-store.ts: تحسين دالة isAppInstalled
- بناء المشروع محلياً بنجاح
- رفع جميع التغييرات إلى GitHub

Stage Summary:
- Dockerfile معدّل لدعم yarn و HRMS
- entrypoint.sh معدّل لدعم PATH و yarn و HRMS
- خطأ toLowerCase مصلح في route-access.ts و report-access.ts
- auth-store.ts محسّن لفلترة الأدوار
- البناء المحلي ناجح
- تم الدفع إلى GitHub: a170ab2
