# آلية عمل نظام ERP Pro

## المعمارية العامة

يعمل النظام وفق معمارية ثلاثية الطبقات تفصل بين العرض والمنطق والبيانات، مع تواصل آمن بين كل طبقة:

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│   المتصفح       │     │   خادم Next.js       │     │   خادم ERPNext       │
│   (المستخدم)    │────→│   (الواجهة + API)    │────→│   (الخلفية المخفية)  │
│                 │     │   المنفذ: 3000       │     │   المنفذ: 8000       │
│  - React UI    │←────│   - SSR / CSR        │←────│   - REST API         │
│  - Zustand     │     │   - API Routes       │     │   - MariaDB          │
│  - React Query │     │   - proxy.ts         │     │   - Redis            │
│  - RTL/Arabic  │     │   - Auth System      │     │   - Workers          │
└─────────────────┘     └──────────────────────┘     └──────────────────────┘
```

## تدفق العمل الأساسي

### 1. المصادقة وتسجيل الدخول

```
المستخدم → صفحة /login → إدخال بيانات الاعتماد
    ↓
API /api/auth/login → التحقق من البيانات
    ↓
إنشاء رمز جلسة (Base64 حالياً / JWT مستقبلاً)
    ↓
تخزين الرمز في: localStorage + Cookie (erp_session)
    ↓
إعادة التوجيه إلى لوحة التحكم (/)
    ↓
proxy.ts (middleware) → التحقق من Cookie في كل طلب
```

**آلية الحماية المزدوجة**: يتم تخزين رمز الجلسة في كلاً من `localStorage` (للوصول السريع من JavaScript) و`erp_session` cookie (للتحقق من جانب الخادم عبر proxy.ts). هذا يضمن أن الـ middleware يمكنه التحقق من الجلسة حتى لو لم يتم إرسال Authorization header.

### 2. تدفق البيانات (CRUD)

```
المستخدم → إجراء (إنشاء/قراءة/تحديث/حذف)
    ↓
React Query Hook (useDocList, useDoc, useCreateDoc...)
    ↓
API Route /api/data/[doctype] أو /api/data/[doctype]/[name]
    ↓
خادم ERPNext (إذا متوفر) أو بيانات تجريبية (Demo Mode)
    ↓
الاستجابة ← معالجة الأخطاء ← التحديث التلقائي للواجهة
```

### 3. نظام الأدوار والصلاحيات

```
المستخدم يسجل الدخول ← يتم تحميل الأدوار من الجلسة
    ↓
المكونات تعرض/تخفي العناصر حسب الدور
    ↓
API Routes تتحقق من الصلاحيات قبل التنفيذ
    ↓
proxy.ts يتحقق من المصادقة قبل الوصول لأي مسار محمي
```

## المكونات الرئيسية

### proxy.ts (Middleware)
يعمل كبوابة حماية لجميع المسارات. يتدفق كالتالي:
1. يتحقق إذا كان المسار عاماً (login, api, static files)
2. يقرأ `erp_session` cookie
3. يفك تشفير الرمز ويتحقق من صلاحيته وانتهاء الصلاحية
4. إذا غير مصادق → يعيد توجيه إلى `/login` مع حفظ المسار الأصلي
5. إذا مصادق → يسمح بالمرور

### Auth Store (Zustand)
يدير حالة المصادقة بالكامل:
- `login()`: إرسال بيانات الاعتماد إلى API وتخزين الجلسة
- `demoLogin()`: دخول تجريبي سريع مع بيانات admin/admin
- `logout()`: مسح الجلسة وإعادة التوجيه
- `checkAuth()`: التحقق من الجلسة عند تحميل أي صفحة محمية

### React Query Layer
طبقة إدارة البيانات الذكية:
- `useDocList(doctype)`: جلب قائمة مستندات مع فلاتر وصفحات
- `useDoc(doctype, name)`: جلب مستند واحد
- `useCreateDoc()`, `useUpdateDoc()`, `useDeleteDoc()`: عمليات الكتابة
- تخزين مؤقت تلقائي وإعادة محاولة عند الفشل

### API Routes
طبقة الوسط بين الواجهة والخلفية:
- `/api/auth/*`: المصادقة (تسجيل دخول، خروج، التحقق، نسيان كلمة المرور)
- `/api/data/[doctype]`: عمليات CRUD على أي نوع مستند
- `/api/reports/[reportName]`: التقارير
- `/api/method/[...path]`: استدعاء طرق ERPNext المخصصة
- `/api/dashboard/kpis`: مؤشرات لوحة التحكم

## وضع التشغيل

### وضع التطوير (Demo Mode)
- يعمل بدون خادم ERPNext
- يستخدم بيانات تجريبية hardcoded
- مصادقة تجريبية (admin/admin, accountant/accountant, sales/sales, hr/hr)
- مناسب للتطوير والعرض التجريبي

### وضع الإنتاج (ERPNext Connected)
- يتصل بخادم ERPNext عبر REST API
- مصادقة JWT حقيقية عبر ERPNext
- بيانات حقيقية من قاعدة بيانات MariaDB
- صلاحيات حقيقية من نظام ERPNext

**عنوان ERPNext ومفاتيح API (من خادم Next فقط):**

- المتغير **`BACKEND_HOST`** (مثل `http://127.0.0.1:8000`) أو الملف **`data/frappe-backend.json`** (يُدار من صفحة **`/settings/erp-backend`** أو سكربت `scripts/frappe-bootstrap-keys.mjs`).
- عند تعيين **`BACKEND_API_KEY`** و**`BACKEND_API_SECRET`** (أو المكافئ في الملف)، يستخدم `src/lib/server/backend.ts` رأس **`Authorization: token …`** لطلبات النظام بدل الاعتماد على جلسة `sid` للمسؤول.
- لتشغيل bench محلياً بدون Docker (مثلاً عبر WSL2): **`docs/ERPNEXT_LOCAL_WITHOUT_DOCKER.md`**.

## التقنيات المستخدمة

| الطبقة | التقنية | الغرض |
|--------|---------|-------|
| الواجهة | Next.js 16 + React 19 | عرض واجهة المستخدم |
| التصميم | Tailwind CSS 4 + shadcn/ui | مكونات وتنسيق |
| الحالة | Zustand | إدارة حالة المصادقة |
| البيانات | React Query (TanStack) | إدارة بيانات الخادم |
| الجداول | TanStack Table | جداول بيانات متقدمة |
| الرسوم | Recharts | رسوم بيانية وتحليلات |
| النماذج | React Hook Form + Zod | نماذج وتحقق |
| الخلفية | ERPNext (Python/Frappe) | محرك الأعمال |
| قاعدة البيانات | MariaDB | تخزين البيانات |
| التخزين المؤقت | Redis | أداء عالي |
| الحاوية | Docker Compose | تشغيل متكامل |
| الخادم الوكيل | Caddy | SSL وتوجيه |
