# هيكل مشروع ERP Pro

## البنية العامة للمشروع

```
erp-pro/
├── src/                          # الكود المصدري الرئيسي
│   ├── app/                      # صفحات Next.js App Router
│   │   ├── layout.tsx            # التخطيط الجذري (RTL + Cairo font)
│   │   ├── globals.css           # أنماط CSS العامة
│   │   ├── not-found.tsx         # صفحة 404
│   │   ├── login/                # صفحة تسجيل الدخول
│   │   │   └── page.tsx
│   │   ├── api/                  # مسارات API
│   │   │   ├── auth/             # مصادقة
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   ├── me/route.ts
│   │   │   │   └── forgot-password/route.ts
│   │   │   ├── data/             # بيانات CRUD
│   │   │   │   ├── [doctype]/route.ts
│   │   │   │   ├── [doctype]/[name]/route.ts
│   │   │   │   └── [doctype]/bulk/route.ts
│   │   │   ├── dashboard/        # لوحة التحكم
│   │   │   │   └── kpis/route.ts
│   │   │   ├── reports/          # التقارير
│   │   │   │   └── [reportName]/route.ts
│   │   │   └── method/           # طرق ERPNext
│   │   │       └── [...path]/route.ts
│   │   └── (dashboard)/          # صفحات لوحة التحكم (محمية)
│   │       ├── layout.tsx        # تخطيط لوحة التحكم (شريط جانبي + علوي)
│   │       ├── page.tsx          # الصفحة الرئيسية
│   │       ├── accounting/       # المحاسبة (8 صفحات)
│   │       ├── sales/            # المبيعات (7 صفحات)
│   │       ├── purchases/        # المشتريات (5 صفحات)
│   │       ├── inventory/        # المخزون (6 صفحات)
│   │       ├── manufacturing/    # التصنيع (4 صفحات)
│   │       ├── hr/               # الموارد البشرية (11 صفحة)
│   │       ├── crm/              # العملاء (5 صفحات)
│   │       ├── operations/       # العمليات (3 صفحات)
│   │       ├── settings/         # الإعدادات (5 صفحات)
│   │       ├── reports/          # التقارير
│   │       └── audit-log/        # سجل العمليات
│   ├── components/               # المكونات
│   │   ├── erp/                  # مكونات ERP مخصصة (10 مكونات)
│   │   │   ├── app-sidebar.tsx   # الشريط الجانبي
│   │   │   ├── app-header.tsx    # الشريط العلوي
│   │   │   ├── data-table.tsx    # جدول بيانات متقدم
│   │   │   ├── kpi-card.tsx      # بطاقة مؤشر أداء
│   │   │   ├── doc-form.tsx      # نموذج مستند
│   │   │   ├── dynamic-row-table.tsx  # جدول صفوف ديناميكي
│   │   │   ├── status-badge.tsx  # شارة حالة
│   │   │   ├── global-search.tsx # بحث شامل
│   │   │   ├── export-button.tsx # زر تصدير
│   │   │   ├── error-boundary.tsx # حد حدود الأخطاء
│   │   │   └── page-skeleton.tsx # هيكل تحميل الصفحة
│   │   ├── ui/                   # مكونات shadcn/ui (50 مكون)
│   │   └── providers.tsx         # مزودو التطبيق (Theme + QueryClient)
│   ├── lib/                      # المكتبات والأدوات
│   │   ├── client/               # أدوات العميل
│   │   │   ├── api.ts            # عميل API
│   │   │   ├── hooks.ts          # React Query Hooks
│   │   │   └── query-client.ts   # إعدادات Query Client
│   │   ├── server/               # أدوات الخادم
│   │   │   └── backend.ts        # اتصال ERPNext
│   │   ├── core/                 # الأنواع والمساعدات
│   │   │   ├── types.ts          # تعريفات الأنواع
│   │   │   └── helpers.ts        # دوال مساعدة
│   │   ├── utils.ts              # أدوات عامة (cn, formatCurrency...)
│   │   └── db.ts                 # اتصال Prisma
│   ├── stores/                   # مخازن Zustand
│   │   └── auth-store.ts         # مخزن المصادقة
│   ├── hooks/                    # Hooks مخصصة
│   │   ├── use-toast.ts          # إشعارات
│   │   └── use-mobile.ts         # كشف الجوال
│   └── proxy.ts                  # Middleware (حماية المسارات)
├── prisma/                       # Prisma ORM
│   └── schema.prisma             # مخطط قاعدة البيانات
├── docker/                       # إعدادات Docker
│   └── mariadb/conf.d/erp.cnf
├── public/                       # ملفات عامة
│   ├── favicon.ico
│   ├── logo.svg
│   └── robots.txt
├── docs/                         # التوثيق
│   └── DEVELOPMENT_PLAN.md       # خطة التطوير الشاملة
├── next.config.ts                # إعدادات Next.js
├── tailwind.config.ts            # إعدادات Tailwind
├── tsconfig.json                 # إعدادات TypeScript
├── components.json               # إعدادات shadcn/ui
├── package.json                  # الحزم والتبعيات
├── Dockerfile                    # بناء Docker
├── docker-compose.yml            # تشغيل Docker متكامل
├── Caddyfile                     # إعدادات Caddy proxy
```

## إحصائيات المشروع

| الفئة | العدد |
|--------|-------|
| صفحات لوحة التحكم | 57 صفحة |
| مسارات API | 11 مسار |
| مكونات ERP مخصصة | 10 مكونات |
| مكونات UI (shadcn) | 50 مكوناً |
| مكتبات/أدوات | 7 ملفات |
| مخازن الحالة | 1 (auth-store) |
| Hooks مخصصة | 2 |

## وحدات لوحة التحكم

### المحاسبة والمالية (8 صفحات)
- `chart-of-accounts` - دليل الحسابات
- `journal-entry` - قيود اليومية
- `sales-invoice` - فواتير المبيعات
- `purchase-invoice` - فواتير المشتريات
- `payment-entry` - المدفوعات
- `expenses` - المصروفات
- `cost-centers` - مراكز التكلفة
- `assets` - الأصول الثابتة
- `cheques` - الشيكات

### المبيعات (7 صفحات)
- `customers` - العملاء
- `suppliers` - الموردون
- `quotations` - عروض الأسعار
- `sales-orders` - أوامر البيع
- `delivery-notes` - مذكرات التسليم
- `pos` - نقاط البيع
- `purchase-orders` - أوامر الشراء

### المشتريات (5 صفحات)
- `purchase-orders` - أوامر الشراء
- `purchase-invoices` - فواتير الشراء
- `supplier-quotations` - عروض أسعار الموردين
- `purchase-requests` - طلبات الشراء
- `purchase-receipts` - إيصالات الاستلام

### المخزون (6 صفحات)
- `items` - الأصناف والمنتجات
- `warehouses` - المستودعات
- `stock-entry` - حركات المخزون
- `stock-count` - الجرد
- `stock-levels` - مستويات المخزون
- `price-lists` - قوائم الأسعار

### التصنيع (4 صفحات)
- `bom` - قوائم المواد
- `work-orders` - أوامر العمل
- `production-plans` - خطط الإنتاج
- `workstations` - محطات العمل

### الموارد البشرية (11 صفحة)
- `employees` - الموظفون
- `attendance` - الحضور
- `leave-applications` - طلبات الإجازة
- `leave-types` - أنواع الإجازات
- `holidays` - العطلات
- `shifts` - الورديات
- `contracts` - العقود
- `salary-slips` - قسائم الرواتب
- `salary-structures` - هياكل الرواتب
- `org-chart` - الهيكل التنظيمي
- `employee-requests` - طلبات الموظفين

### العملاء CRM (5 صفحات)
- `leads` - العملاء المحتملون
- `opportunities` - الفرص
- `activities` - الأنشطة
- `follow-ups` - المتابعات
- `appointments` - المواعيد

### العمليات (3 صفحات)
- `work-orders-ops` - أوامر شغل
- `time-tracking` - تتبع الوقت
- `rentals` - الإيجارات

### الإعدادات (5 صفحات)
- الصفحة الرئيسية
- `payment-methods` - طرق الدفع
- `tax-rates` - معدلات الضرائب
- `tax-rules` - قواعد الضرائب
- `branches` - الفروع

### أخرى (2 صفحة)
- `reports` - التقارير
- `audit-log` - سجل العمليات
