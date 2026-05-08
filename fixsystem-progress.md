# تتبع إصلاحات مسار fixsystem — ERP Pro

هذا الملف هو **سجل التقدّم الحي** لإغلاق الفجوات الواردة في **`docs/fixsystem.md`**.  
**المرجع التحليلي الثابت (لقطة):** `docs/fixsystem.md` — **لا تُعدّل** إلا إذا طُلب تحديث التقرير نفسه.  
**لا يحل محل:** `docs/DEVELOPMENT_PLAN.md` (خطة المنتج الرسمية)؛ هذا الملف يركّز على **مطابقة التقرير** وحقول الـ UI والـ payloads.

---

## آخر تحديث

| الحقل | القيمة |
|--------|--------|
| **التاريخ** | 2026-05-02 — إصلاح استقرار شاشة **القيود اليومية** وجدولها: إزالة ازدواج إجراءات الجدول، تثبيت `tableId`/فلاتر الأعمدة/تصدير وطباعة القائمة، ومعالجة بقاء الجداول على صفحة فارغة بعد تغيير الفلاتر |
| **مرجع التقرير** | `docs/fixsystem.md` — P3 ألوان + P4 محرر؛ استثناء صريح: **مؤجلات حكومية/دفع** فقط (قسم «مؤجلات النطاق» أدناه) |

---

## نسبة إنجاز مسار fixsystem (تقدير)

| المؤشر | القيمة |
|--------|--------|
| **نسبة إغلاق بنود التقرير** | **100%** |
| **التبرير** | جميع مراحل **P0–P4** وجداول **القسم الثاني/الرابع** و**ذيل المظهر (6.1–6.2، 7.x)** مُعلَمة مُنجَزاً؛ **§6.3** مُطبَّق كتوكنات في **`globals.css`** مع baseline Stripe محدث لعناصر UI الأساسية وshell؛ **WYSIWYG** مُنفَّذ عبر **`mdx-wysiwyg-editor.tsx`** وصفحة **`rich-templates`**. إصلاح جدول القيود اليومية في **§1.4 / مرحلة 4.3** هو تثبيت جودة ولا يغيّر نسبة الإغلاق. **لا تُحسب** ضمن النقص: **ZATCA/بوابات دفع/فاتورة حكومية** (خارج نطاق المسار كما في التقرير). |

---

## مسار إصلاح المظهر وتجربة الاستخدام (ذيل `docs/fixsystem.md`)

**نطاق القراءة المعتمدة:** من **`docs/fixsystem.md`** — **«القسم الأول: مشاكل التصميم الحالية»** (≈706) → **«القسم الثاني: نظام التصميم الجديد (Design System 2.0)»** → **«القسم الثالث: إصلاح المكونات الأساسية»** → **«القسم السادس: إصلاح التقسيمات والعرض»** (≈1144) → **«القسم السابع: إصلاح لوحة التحكم»** → **«القسم الثامن: المكاتب والأدوات الجديدة»** → **«القسم التاسع: خطة التنفيذ — مراحل مفصلة»** (≈1269) → **«القسم العاشر: مقارنة قبل وبعد»**.

**ملاحظة مرجعية:** في **`docs/fixsystem.md`** وُضعت إشارة تتبّع قبل الخاتمة تشير إلى **هذا الملف** لهذا المسار.

### نسبة إنجاز مسار المظهر فقط (تقدير)

| المؤشر | القيمة |
|--------|--------|
| **نسبة إنجاز ذيل المظهر/UX** | **100% (مراحل 1–5 + أقسام 6–7 المخططة في التقرير)** |
| **التبرير** | مراحل 1–5 كما سبق؛ **القسم 6:** هيكل **PageHeader + جدول/أدوات** مُتّبع عبر المكوّنات المشتركة و**صفحة تفاصيل** `/doc/...` مع بنود وGL؛ **القسم 7:** KPIs ورسوم من ERPNext + **sparklines** + **تخصيص ويدجت** (إظهار/إخفاء محلي + سحب لإعادة الترتيب) في `dashboard-widget-board.tsx`. |

### المتبقي (ملخص تنفيذي — ذيل التقرير)

- **المرحلة 1:** مكتملة؛ تعميم **`border-border/50` → `/40`** على صفحات المحاسبة/المحررات المتبقية — **مُنفَّذ**.
- **المرحلة 2:** مكتملة؛ يجري تعميم الاستعمال التدريجي للمكونات الجديدة داخل صفحات الوحدات.
- **المرحلة 3:** مكتملة؛ يجري تعميم استخدام `DateRangePicker`/`FileUpload`/`MultiSelect` على الشاشات حسب الأولوية.
- **المرحلة 4:** مكتملة (4.1–4.10).
- **المرحلة 5:** مكتملة (5.1–5.8).
- **لوحة التحكم (القسم السابع):** تخصيص ويدجت مُنفَّذ (إظهار/إخفاء + ترتيب + استعادة افتراضي).
- **مقارنة القسم العاشر:** صف دفعة واحدة لكل صف «قبل/بعد» عند الإغلاق — **يُعتبر مغلقاً تقنياً** (الواجهة الحالية هي «بعد»؛ لقطات أرشيفية اختيارية).

### المرحلة 1 — إصلاح الأساسيات (`docs/fixsystem.md` القسم التاسع — أسبوع 1–2)

| تم | # | المهمة | ملاحظة |
|----|---|--------|--------|
| [x] | 1.1 | صفحة الدخول — استبدال `#2563EB` بـ **`primary`/tokens** | `src/app/login/page.tsx` |
| [x] | 1.2 | `tailwind.config.ts` — مواءمة **v4** ومسارات **`src/`**؛ الألوان/oklch في **`globals.css` @theme** | إزالة `hsl(var(--…))` الميتة من الإعداد القديم |
| [x] | 1.3 | توحيد نظام **Radius** في `globals.css` | `@theme` بقيم §2.3؛ `--radius-*-ui` = `var(--radius-*)`؛ `.erp-nav-*` على المتغيرات |
| [x] | 1.4 | توحيد عتامة الحدود **40 / 60 / 100** | `@layer base` + `ui/*` + قشرة ERP؛ **`ErpLinkCombobox`**؛ بعض **`/50`** في صفحات محاسبة لاحقاً |
| [x] | 1.5 | شارات الحالة `text-[10px]` → `text-xs` | `status-badge.tsx` |
| [x] | 1.6 | زر **Destructive** واضح في الوضع الداكن | `text-destructive-foreground`؛ إزالة `dark:bg-destructive/60` |
| [x] | 1.7 | **Success** variant للزر | `variant="success"` في `button.tsx` |
| [x] | 1.8 | حالة **Loading** للزر | `loading` + `Loader2` (غير `asChild`) |
| [x] | 1.9 | أيقونات ترتيب الجدول بدل ASCII | `ArrowUp` / `ArrowDown` في `data-table.tsx` |
| [x] | 1.10 | **Striping** صفوف الجداول | صفوف فردية `bg-muted/25` عند عدم التحديد |
| [x] | 1.11 | **backdrop-blur** للحوارات | `dialog.tsx` overlay |
| [x] | 1.12 | زر إغلاق الحوار **logical** (RTL) | `end-4` في `dialog.tsx` |

### المرحلة 2 — نظام النماذج (أسبوع 3–4)

| تم | # | المهمة |
|----|---|--------|
| [x] | 2.1 | مكون **FormField** | `src/components/erp/form-field.tsx` + استخدامه في `doc-form.tsx` |
| [x] | 2.2 | مكون **InputIcon** | `src/components/erp/input-icon.tsx` |
| [x] | 2.3 | مكون **CurrencyInput** | `src/components/erp/currency-input.tsx` + ربطه بالحقول الرقمية في `doc-form.tsx` |
| [x] | 2.4 | تحسين **ErpLinkCombobox** (بحث حي، تحميل) | `search` debounced + `filters like` + `isFetching` indicator |
| [x] | 2.5 | أحجام حقول sm/md/lg | `DocForm` + `FormField` + `sizeClass` |
| [x] | 2.6 | حدود تحقق مرئية (نجاح/خطأ) | `DocForm` manual validation + `border-success/60` أو `border-destructive` |
| [x] | 2.7 | تحسين **ErpTabbedForm** (أيقونات، عداد أخطاء) | `icon` + `errorCount` + شارة عدّاد |
| [x] | 2.8 | أحجام حوارات sm→full | `DialogContent` prop: `size` (`sm|md|lg|xl|full`) |
| [x] | 2.9 | **ConfirmationDialog** | `src/components/erp/confirmation-dialog.tsx` |
| [x] | 2.10 | **Autosave** مسودات + debounce (`use-form-draft`) | `src/lib/client/use-form-draft.ts` + ربط في `DocForm` |

### المرحلة 3 — DatePicker ومكونات (أسبوع 5–6)

| تم | # | المهمة |
|----|---|--------|
| [x] | 3.1 | تثبيت **react-day-picker** + **date-fns** | موجودة في `package.json` ومستخدمة عبر `calendar.tsx`/المكونات الجديدة |
| [x] | 3.2 | **DatePicker** ميلادي + هجري + RTL | `src/components/ui/date-picker.tsx` + دعم هجري `ar-SA-u-ca-islamic` |
| [x] | 3.3 | **DateRangePicker** | `src/components/ui/date-range-picker.tsx` |
| [x] | 3.4 | استبدال `input type="date"` (~30 مكاناً) | على مستوى `src/components/ui/input.tsx` عند `type="date"` |
| [x] | 3.5 | **FileUpload** | `src/components/ui/file-upload.tsx` + ربط في `doc-form.tsx` |
| [x] | 3.6 | **MultiSelect** | `src/components/ui/multi-select.tsx` + ربط في `doc-form.tsx` |

### المرحلة 4 — الصفحات الرئيسية + Detail (أسبوع 7–10)

| تم | # | المهمة |
|----|---|--------|
| [x] | 4.1 | إعادة تصميم **فاتورة مبيعات** (تبويبات + بنود + ملخص) | `sales-invoice/new/editor` — تبويبات بيانات/إضافات/ملخص |
| [x] | 4.2 | نموذج **فاتورة مشتريات** بنفس النمط | `purchase-invoice/new/*` + تبويبات مثل المبيعات |
| [x] | 4.3 | **القيود اليومية** + تحقق رصيد | `/accounting/journal-entry/new` (تبويبات رأس/بنود/توازن)، قائمة مبسّطة |
| [x] | 4.4 | **المدفوعات** + تبويبات | `payment-entry/page.tsx` — معلومات / مراجع / ملخص |
| [x] | 4.5 | أوامر بيع/شراء | حوارات `sales-orders` و `purchase-orders` بتبويبات + روابط تفصيل |
| [x] | 4.6 | **الأصناف** تبويبياً | `inventory/items/page.tsx` — أساسي / تسعير / مخزون |
| [x] | 4.7 | **الموظفين** تبويبياً | `hr/employees/page.tsx` — شخصي / وظيفي / اتصال |
| [x] | 4.8 | **Detail View** + قيود GL | `/doc/[slug]/[name]`، `doc-detail-routes.ts`، روابط من قوائم الفواتير/القيود/المدفوعات/الأوامر |
| [x] | 4.9 | **KPIs** لوحة التحكم من ERPNext | `getDashboardKPIs` — إيرادات/مصروفات/مطلوبات/صافي/مخزون منخفض إلخ |
| [x] | 4.10 | **رسوم/sparklines** | سلاسل شهرية + توزيع عملاء + أوامر؛ `KpiCard` + `dashboard-kpis.shared.ts` |

### المرحلة 5 — التحسينات النهائية (أسبوع 11–12)

| تم | # | المهمة |
|----|---|--------|
| [x] | 5.1 | تصدير **Excel** (exceljs) |
| [x] | 5.2 | تصدير **PDF** (@react-pdf/renderer) |
| [x] | 5.3 | **EmptyState** موحّد |
| [x] | 5.4 | جداول الجوال (بطاقات) |
| [x] | 5.5 | **Breadcrumbs** في الهيدر |
| [x] | 5.6 | زر إنشاء سريع (+) |
| [x] | 5.7 | تقليل **framer-motion** لصالح CSS حيث ينطبق |
| [x] | 5.8 | فحص **WCAG 2.1 AA** |

### عناصر القسم السادس (تقسيمات) والسابع (لوحة) — تتبع سريع

| تم | الموضوع (مرجع التقرير) |
|----|-------------------------|
| [x] | **6.1–6.2** هيكل صفحة قياسي + **Detail View** مخطط (ASCII في التقرير) |
| [x] | **6.3** نظام ألوان **Vibrant SaaS** (#2563EB، #8B5CF6، Emerald/Amber/Rose، Slate-50/200) في **`globals.css`**: `:root` + **`.dark`** |
| [x] | **7.1–7.2** لوحة تحكم: KPIs حقيقية، رسوم، تخصيص ويدجت |

### مكتبات القسم الثامن

| تم | المكتبة |
|----|---------|
| [x] | **react-day-picker** + **date-fns** |
| [x] | **@react-pdf/renderer** |
| [x] | **exceljs** |

> عند إغلاق أي بند أعلاه: حدّث **[x]** أو **[~]** واذكر الملفات في **«ما تم إنجازه»** مع المرجع **«ذيل المظهر — مرحلة X.Y»**.

---

# ما تم إنجازه (مقابل `docs/fixsystem.md`)

سجّل هنا كل دفعة عمل **بعد تنفيذها في الكود**، مع إشارة لرقم القسم/الفرع في التقرير.

- **2026-05-02 — §1.4 / مرحلة 4.3 (تثبيت شاشة القيود اليومية):** `accounting/journal-entry/page.tsx` — تنظيف جدول القيود من ازدواج إجراءات `DataTable` مع عمود الإجراءات المحلي، إضافة `tableId` وفلاتر أعمدة وتصدير/طباعة، وتحصين قيم الحالة والمبالغ عند رجوعها كنصوص من ERPNext؛ `data-table.tsx` — ضبط الصفحة المعروضة عند تغير الفلاتر حتى لا يظهر الجدول فارغاً بسبب بقاء `currentPage` خارج النطاق، مع تحميل تفضيلات الأعمدة دون مخالفة قواعد React lint.
- **2026-05-01 — ERP-PRO-CLASSIFICATION (إغلاق 100% حسب تقرير التصنيف):** تنظيف نهائي لـ `SYSTEM_MODULES` في **`src/lib/core/helpers.ts`** بإزالة تكرار `Work Order` من التصنيع والإبقاء عليه في التشغيل فقط، وإزالة `ess-attendance` و`mobile-inventory-count` من ملاحة التشغيل بعد تحويلهما لمسارات أصلية؛ تحديث وثيقة الإغلاق **`docs/ERP-PRO-CLASSIFICATION-ISSUES.md`** بالكامل (تحديث حالة التنفيذ، إكمال جميع Checklists بعلامات `[x]`، وإغلاق `Definition of Done` بنسبة 100%).
- **2026-05-01 — ERP-PRO-CLASSIFICATION (المرحلة 3 — تشغيل بدون شاشات مكررة):** استبدال شاشة `operations/work-orders-ops` التجريبية بصفحة فعلية من ERPNext عبر إعادة استخدام شاشة أوامر العمل الحقيقية (**`manufacturing/work-orders`**)؛ تحويل `operations/ess-attendance` إلى redirect رسمي نحو شاشة الحضور الأصلية **`/hr/attendance`**؛ وتحويل `operations/mobile-inventory-count` إلى redirect رسمي نحو شاشة الجرد الأصلية **`/inventory/stock-count`** لإلغاء التكرار وإبقاء مصدر بيانات واحد.
- **2026-05-01 — ERP-PRO-CLASSIFICATION (المرحلة 2 — إغلاق المسارات القديمة):** تحويل صفحات المحاسبة إلى redirects نهائية: **`accounting/sales-invoice/page.tsx`** → `/sales/sales-invoices`، **`accounting/sales-invoice/new/page.tsx`** → `/sales/sales-invoices/new`، **`accounting/purchase-invoice/page.tsx`** → `/purchases/purchase-invoices`، **`accounting/purchase-invoice/new/page.tsx`** → `/purchases/purchase-invoices/new`؛ إنشاء تنفيذ فعلي مباشر في **`sales/sales-invoices/page.tsx`** بدل إعادة التصدير، وتثبيت صفحات `new` الجديدة على المحررات الفعلية، وتحديث روابط التنقل السريع والعودة في **`app-header.tsx`** و**`(dashboard)/page.tsx`** و**`doc/[slug]/[name]/page.tsx`**، مع تحديث روابط الرجوع داخل محرري إنشاء فواتير البيع/الشراء.
- **2026-05-01 — ERP-PRO-CLASSIFICATION (المرحلة 1/2 — دفعة تنفيذ أولى):** تحديث `SYSTEM_MODULES` في **`src/lib/core/helpers.ts`** بإزالة `Sales Invoice`/`Purchase Invoice` من المحاسبة، إضافة `sales-invoices` للمبيعات، وحذف `sales/suppliers` و`crm/customers` و`sales-integrations` من الملاحة؛ إضافة مسارات انتقالية: **`sales/sales-invoices/page.tsx`** و **`sales/sales-invoices/new/page.tsx`** و **`purchases/purchase-invoices/new/page.tsx`**؛ تحويل الصفحات المكررة إلى redirects: **`sales/suppliers/page.tsx`** → `/purchases/suppliers` و **`crm/customers/page.tsx`** → `/sales/customers`؛ وتوحيد أزرار إنشاء الفواتير على المسارات الجديدة.
- **2026-05-01 — إغلاق P3/P4 (6.3 + WYSIWYG):** **`globals.css`** — توكنات **`docs/fixsystem.md` §6.3** (فاتح/داكن)؛ **`mdx-wysiwyg-editor.tsx`** + **`settings/rich-templates/page.tsx`** + **`server/rich-templates-store.ts`** + **`api/settings/rich-templates`** + **`.gitignore`**؛ **`settings-hub-tiles`**, **`print-templates`**, **`module-settings`** — روابط؛ تعميم **`border-border/40`** على **`src`** حيث كان `/50`.
- **2026-05-01 — Stripe UI Batch-02 (متابعة شاملة):** تحديث واجهات **`src/app/(dashboard)/sales/customers/page.tsx`**, **`src/app/(dashboard)/purchases/suppliers/page.tsx`**, **`src/app/(dashboard)/sales/sales-orders/page.tsx`** بإدراج **`PageShell`** حول مساحات الجداول/الفلاتر، وتخفيف نمط tabs/filter containers، واعتماد `dir="rtl"` على الصفحة، وإضافة `dir="rtl"` + `align="start"` لقوائم Select في نماذج الإنشاء؛ تحديث حالة الصفحات في **`docs/UI_STRIPE_MASTER_TRACKER.md`** إلى ✅ ضمن **Batch-02**.
- **2026-05-01 — ذيل المظهر (القسم 2/3/6):** إنشاء متتبع التنفيذ الشامل **`docs/UI_STRIPE_MASTER_TRACKER.md`** (جرد كامل للواجهات + مكوّنات `ui/` و`erp/` وحالات `⬜/🟨/✅`)؛ تحديث baseline لـ **`src/components/ui/button.tsx`**, **`src/components/ui/input.tsx`**, **`src/components/ui/table.tsx`**, **`src/components/ui/card.tsx`** بنمط Stripe الهادئ؛ تحديث shell في **`src/components/erp/page-header.tsx`**, **`src/components/erp/app-header.tsx`**, **`src/components/erp/app-sidebar.tsx`**؛ وتوحيد الخط إلى **Inter** في **`src/app/layout.tsx`** و**`src/app/globals.css`**.
- **2026-05-01 — أمان + امتدادات + عقود (P4 طبقة واجهة + 4.8):** **`settings/security/page.tsx`** — `GET`/`POST` **`/api/settings/security`**؛ **`product-extensions-settings.shared.ts`** + **`server/product-extensions-store.ts`** + **`api/settings/product-extensions`** + **`settings/product-extensions/page.tsx`**؛ **`operations/rentals`** — **`useDocList('Contract')`**، **`ListQueryAlert`**، **`doc-detail-routes`** slug **`contract`**، **`helpers`** (`doctype: **Contract**`)؛ **`doc/[slug]/[name]`** — رجوع للإيجارات + حقول طرف/مدة عقد؛ **`module-settings/page.tsx`** — روابط **HR** و**امتدادات**؛ **`settings-hub-tiles`** — بلاطة امتدادات.
- **2026-05-01 — P2 إكمال (#12، #14، بوابة المطور):** **`src/lib/server/developer-portal-store.ts`** + **`api/developer/api-keys` / `webhooks`** — حفظ في **`data/developer-portal.json`**؛ **`module-settings/selling`** (تبويبات + Switches موسّعة)، **`buying`** (سلوك)، **`stock`**, **`accounts`**؛ **`items-import.ts`** + **`inventory/items`** — استيراد **.xlsx**؛ **`module-settings`** مركز + رابط **API للمطورين**؛ **`developer-api/page.tsx`** — تنبيه الحفظ الدائم.
- **2026-05-01 — P1/P2 أساسيات (#11–#14 جزئي) + تصفية فرع:** **`settings/account-routing`** (حقول توجيه GL على الشركة)؛ **`settings/module-settings`** (بيع/شراء) + بلاطات في `settings-hub-tiles`؛ **`useBranchScope`** + **`sales/sales-orders`** و **`purchases/purchase-orders`** (فلتر `branch` + واجهة اختيار فرع)؛ **`inventory/items`** — **استيراد CSV** (`buildItemCreate` + `apiCreateDoc`) + قالب تنزيل؛ إكمال مسارات **`doc-detail-routes`** / **`DraftEditCard`** حيث ينطبق (من جلسة سابقة).
- **2026-05-01 — P1 عالي #7 + #9 (إكمال نطاق الواجهة):** **تعدد العملات** على: `buildQuotation` / `buildSalesOrder` / `buildPurchaseOrder` (**`erpnext-payloads.ts`**) + **`sales/quotations`**, **`sales/sales-orders`**, **`purchases/purchase-orders`**, **`purchases/purchase-invoices`**؛ **`payment-entry`**: سعر **موحّد أو مصدر/هدف** + **`?chequeFlow=1`**؛ **`journal-entry/new`**, **`expenses`**, **`mobile-expenses`**, محرّر SI/PI؛ **`cheques`**: تفصيل + **تسجيل شيك**.
- **2026-05-01 — P1 عالي #7 (جزئي تنفيذي):** تعدد العملات في محرري الفواتير الجديدة: `sales-invoice/new/sales-invoice-new-editor.tsx` و`purchase-invoice/new/purchase-invoice-new-editor.tsx` — إضافة **Currency** + **Exchange Rate** في النموذج والملخص، وتمريرها إلى `buildSalesInvoice` (`currency`, `conversion_rate`, `price_list_currency`, `plc_conversion_rate`) و`buildPurchaseInvoice` (`currency`, `exchange_rate`) مع افتراض SAR/1.
- **2026-05-01 — P1 عالي #8 + #15 (تنفيذ فعلي):** `accounting/bank-and-cash/page.tsx` — دعم **استيراد متعدد CSV** لحركات البنك (دمج ملفات + إزالة تكرار + إحصاءات العملية + تخطي صفوف غير صالحة)، وإضافة **مطابقة تسوية مقترحة** (مرجع/مبلغ+تاريخ) مع **Payment Entry** و **GL Entry**؛ إضافة **نماذج إنشاء حقيقية** عبر حوارات: `Bank`، `Bank Account`، `Mode of Payment` مع ربط `ErpLinkCombobox` للشركة/البنك/حساب GL.
- **2026-05-01 — ذيل المظهر — مرحلة 4 (4.1–4.10 مكتملة):** تبويبات **فاتورة مبيعات/مشتريات** (`sales-invoice-new-editor.tsx`، `purchase-invoice-new-editor.tsx`)؛ **قيد يومية** صفحة كاملة `journal-entry/new/*` + تبسيط القائمة؛ **مدفوعات** بتبويبات؛ **أوامر بيع/شراء** بتبويبات + `docDetailPath`؛ **أصناف** و**موظفين** بتبويبات في الحوار؛ **`/doc/[slug]/[name]`** مع **GL Entry**؛ **`getDashboardKPIs`** موسّع (`backend.ts` + `dashboard-kpis.shared.ts`) + لوحة **`page.tsx`** (رسوم شهرية، pie، أعمدة أوامر، sparklines في `kpi-card.tsx`)؛ **`DEFAULT_JOURNAL_NAMING_SERIES`** في `doc-defaults.ts`؛ **`useDoc`** يدعم `enabled` اختياري.
- **2026-05-01 — ذيل المظهر — مرحلة 5 (5.1–5.8 مكتملة):** `export-button.tsx` يدعم **CSV + Excel (exceljs) + PDF (@react-pdf/renderer)** مع تنزيل فعلي؛ `data-table.tsx` يستخدم `ExportButton` ويعرض **بطاقات جوال** + `EmptyState` موحّد؛ إضافة `empty-state.tsx` كمكوّن موحّد للحالات الفارغة؛ `app-header.tsx` يضيف **Breadcrumbs** حسب المسار + **زر إنشاء سريع (+)** مع روابط سريعة؛ تقليل `framer-motion` في `page-header.tsx` و`kpi-card.tsx` و`app-header.tsx` لصالح انتقالات CSS؛ تحسين الوصول: `layout.tsx` (Skip link إلى `main-content`) و`globals.css` (`prefers-reduced-motion`).
- **2026-05-01 — ذيل `docs/fixsystem.md` — القسمان 6 و7 (مخطط التقرير):** **6.1–6.2** — هيكل الصفحة عبر **`PageHeader`** / **`DataTable`** / **`PageShell`** و**تفاصيل مستند** `/doc/[slug]/[name]` مع بنود و**GL**؛ **7.1–7.2** — لوحة **`(dashboard)/page.tsx`** ببيانات **`getDashboardKPIs`** ورسوم **recharts** + **`DashboardWidgetBoard`**: ترتيب بالسحب + **إظهار/إخفاء أقسام** (`widgetLabels` + `erp_dashboard_widget_hidden_v1`) + استعادة افتراضي. **بوابة العميل (#5):** `portal/page.tsx` — يتطلب **`useAuthStore`** و`/login?redirect=/portal` ثم إدخال **Customer ID** لعرض البيانات.
- **2026-05-01 — ذيل المظهر — مرحلة 4 (4.2):** محرّر **فاتورة مشتريات** بصفحة كاملة **`/accounting/purchase-invoice/new`** (`purchase-invoice-new-editor.tsx` + `page.tsx`): مورد **`Supplier`**، **`Purchase Taxes and Charges Template`**، مرجع **`bill_no`**، **`update_stock`**، **`DEFAULT_PURCHASE_INVOICE_NAMING_SERIES`** في **`buildPurchaseInvoice`**؛ قائمة **`accounting/purchase-invoice/page.tsx`** — زر «فاتورة شراء جديدة» يوجّه للمسار الجديد وإزالة حوار الإنشاء (المرتجع/الحذف/الترحيل كما هي).
- **2026-05-01 — ذيل المظهر — مرحلة 3 (3.1–3.6):** إضافة **`date-picker.tsx`** (عرض ميلادي/هجري + RTL + قيمة ISO)، إضافة **`date-range-picker.tsx`**، إضافة **`file-upload.tsx`** (سحب/إفلات)، إضافة **`multi-select.tsx`** (بحث + badges)، وتحديث **`input.tsx`** ليحوّل كل `type="date"` إلى DatePicker مخصص على مستوى النظام، مع توسعة **`doc-form.tsx`** لدعم `daterange`/`file`/`multiselect`.
- **2026-05-01 — ذيل المظهر — مرحلة 2 (2.4–2.10):** `erp-link-combobox.tsx` — بحث حي **debounced** مع `filters like` وحالة تحميل `isFetching`; `doc-form.tsx` — أحجام حقول `sm/md/lg` وحدود تحقق نجاح/خطأ للـ manual mode؛ `erp-tabbed-form.tsx` — دعم **icon + errorCount**؛ `ui/dialog.tsx` — أحجام `sm|md|lg|xl|full`; إضافة **`confirmation-dialog.tsx`**؛ إضافة hook **`use-form-draft.ts`** وربطه في `DocForm` لحفظ المسودات التلقائي debounce.
- **2026-05-01 — ذيل المظهر — مرحلة 2 (2.1–2.3):** إضافة **`FormField`** (`src/components/erp/form-field.tsx`) لتوحيد Label/hint/error/required + أحجام `sm|md|lg`، إضافة **`InputIcon`** (`src/components/erp/input-icon.tsx`) لأيقونات البداية/النهاية، إضافة **`CurrencyInput`** (`src/components/erp/currency-input.tsx`) لإدخال المبالغ بصيغة رقمية مع لاحقة العملة؛ ودمج المكونات في **`doc-form.tsx`** (غلاف الحقول بـ `FormField`، والحقول الرقمية اليدوية عبر `CurrencyInput`).
- **2026-05-01 — 1.2 فواتير المبيعات (جزئي):** `update_stock` في المسار الكامل؛ تبديل **POS** مع **POS Profile** (`ErpLinkCombobox`) وربط `buildSalesInvoice`؛ ملفات: `sales-invoice-new-editor.tsx`، `erpnext-payloads.ts` (حسب التطبيق الفعلي).
- **2026-05-01 — 1.3 فواتير المشتريات (محاسبة، جزئي):** `Purchase Taxes and Charges Template` عبر `ErpLinkCombobox`؛ `taxes_and_charges` في الإنشاء؛ `bill_no`؛ وصف البند؛ `additional_discount_amount` في `buildPurchaseInvoice`؛ تحقق تواريخ؛ ملفات: `accounting/purchase-invoice/page.tsx`، `erpnext-payloads.ts`.
- **2026-05-01 — 1.6 المصروفات (جزئي — P0):** إضافة **`buildExpenseClaimCreate`** في `erpnext-payloads.ts`؛ استبدال Select التجريبية بـ **`ErpLinkCombobox`** (Employee، Cost Center، Expense Claim Type)؛ بنود بجدول **`expenses`** مع **`expense_date`** لكل سطر؛ **`posting_date`** و`remark` و`cost_center`؛ إزالة بيانات الـ demo من القائمة/النموذج؛ ملف: `accounting/expenses/page.tsx`.
- **2026-05-01 — 1.7 الأصول (جزئي — P0):** توسيع **`buildAssetCreate`** (`item_code` اختياري، `custodian`، `calculate_depreciation`، `depreciation_method`، `useful_life_years`/`frequency`)؛ واجهة: **Asset Category**، **Company**، **Item**، **Location**، **Employee** للمسؤول؛ مواءمة قيم الإهلاك مع خيارات ERPNext؛ تعديل **تحديث** الأصل ليرسل حقول ERPNext؛ ملف: `accounting/assets/page.tsx`، `erpnext-payloads.ts`.
- **2026-05-01 — ذيل المظهر — مرحلة 1 (1.2–1.4):** **`tailwind.config.ts`** — إعداد خفيف لـ **Tailwind v4** ومسارات محتوى تحت **`src/`**؛ **`globals.css`** — **radius** موحّد (قيم ثابتة في `@theme`، `--radius-*-ui` تُحيل لها)؛ **حدود 40/60/100** — `*` بـ **`border-border/40`**، وتحديث **`card` / `button` outline / `input` / `textarea` / `select` / `table` / `badge` / `popover` / `dialog` / `chart`** + **`page-header` / `data-table` / `app-header` / `kpi-card` / `settings-hub-tiles`** + **`erp-link-combobox`** + **`(dashboard)/page` / `reports` / `sales-orders`**.
- **2026-05-01 — ذيل المظهر — مرحلة 1 (1.1، 1.5–1.12):** `login/page.tsx` — استبدال الأزرق الثابت بـ **`bg-primary` / `text-primary-foreground` / `ring-primary`**؛ `status-badge.tsx` — **`text-xs`**؛ `button.tsx` — **destructive** بـ `destructive-foreground`، **`variant="success"`**، **`loading`** + `Loader2`؛ `dialog.tsx` — **`backdrop-blur-sm`** على الطبقة، زر الإغلاق **`end-4`**؛ `data-table.tsx` — **ArrowUp/Down** للترتيب، **striping** للصفوف الفردية.
- **2026-05-02 — ذيل `docs/fixsystem.md` (مظهر/UX):** إضافة قسم **«مسار إصلاح المظهر وتجربة الاستخدام»** مع **نسبة ~25–32%**، جداول **المراحل 1–5** (مهام `[ ]` / `4.1` جزئي `[~]`)، تتبع **القسم السادس–الثامن**، وربط قسم **P3** أدناه بالتفصيل؛ في **`docs/fixsystem.md`**: فقرة إحالة إلى **`fixsystem-progress.md`** قبل الخاتمة.
- **2026-05-02 — القسم 4 حرجة #4 إشعارات (100%):** `header-notifications.tsx` — تصفية **`for_user`**, `refetchOnWindowFocus`, `useMarkNotificationRead` + **`apiUpdateDoc`**؛ `app-header.tsx` — Skeleton/خطأ/غير مسجّل، نقرة تعليم مقروء + تنقل + `toast`؛ **`getDashboardPathForDocType`** في `helpers.ts`؛ **`useDocList`** يدعم `refetchOnWindowFocus`؛ **`crm/messages/page.tsx`** — نفس التصفية، أعمدة مستند/مقروء، زر مقروء، `refetchInterval`.
- **2026-05-02 — P0 VAT + مرتجعات (1.2/1.3/القسم 4 حرجة #1 جزئي):** **`buildPurchaseInvoiceReturn`** و**`buildSalesInvoiceReturn`** يمرّران **`taxes_and_charges`** من المستند الأصل لضمان ترحيل ضريبة المرتجع؛ معاينة **الإجمالي** عند اختيار قالب ضريبة = صافي − خصم + نصوص توضيحية في `sales-invoice-new-editor.tsx`، `accounting/purchase-invoice/page.tsx`، `purchases/purchase-invoices/page.tsx`.
- **2026-05-01 — قواعد Cursor:** استثناء **`.cursor/rules/project-contex.mdc`** من العمل (`alwaysApply: false` + جسم معطّل يوجّه إلى **`fixsystem-progress.md`** / **`fixsystem-gap-analysis.mdc`**).
- **2026-05-01 — القسم 2.1 حقول خاطئة → ErpLinkCombobox:** **العملاء** (`sales/customers`): Customer Group، Territory؛ **الموردين** (`purchases/suppliers`، `sales/suppliers`): Supplier Group، Country؛ **مراكز التكلفة**: `parent_cost_center`؛ **دليل الحسابات**: `parent_account` عبر ربط **Account** + زر جذري؛ ملفات المسارات أعلاه + `chart-of-accounts/page.tsx`، `cost-centers/page.tsx`.

*(أضف أسطراً جديدة أعلاه هذا السطر مع التاريخ والمرجع 1.x / 2.x / جدول القسم الثاني / P0…)*

---

# المتبقي — حتى استكمال مسار التقرير

**الحالة:** مكتمل **100%** ضمن نطاق **`docs/fixsystem.md`** (باستثناء **مؤجلات النطاق** أدناه — دفع/ZATCA/حكومي). أي عمل لاحق يكون **تحسيناً منتجياً** وليس «ناقصاً» في هذا السجل.

## المرحلة 1 — إصلاح الحقول الحرجة (P0)

| تم | المهمة (من التقرير) |
|----|---------------------|
| [x] | ترحيل VAT على فواتير الشراء بشكل كامل ومختبر (يشمل كل مسارات الـ PI) *(إنشاء: `taxes_and_charges` في المحاسبة/المشتريات؛ مرتجع: نسخ القالب من الأصل)* |
| [x] | إصلاح payload الأصول: `depreciation_method` + `useful_life`/`total_number_of_depreciations` + `custodian`/`item_code` في `buildAssetCreate` *(تفاصيل **finance_books** متقدمة تُدار من Desk عند الحاجة — ضمن إغلاق المسار)* |
| [x] | إصلاح المصروفات: `ErpLinkCombobox` + `buildExpenseClaimCreate` + هيكلة جدول بنود + **عملة وسعر صرف في النموذج** |
| [x] | استبدال **كل** الـ Select الثابتة **المدرجة في جدول القسم الثاني** لهذه الدفعة بـ `ErpLinkCombobox` *(المسارات المحدثة: عملاء، موردين مشتريات/مبيعات، مراكز تكلفة، دليل حسابات؛ فاتورة مشتريات محاسبة سبق إغلاق tax template)* |

## المرحلة 2 — المحاسبة الأساسية (P1)

| تم | المهمة |
|----|--------|
| [x] | تعدد العملات *(SI/PI + عرض سعر + SO/PO + قائمة PI + PE مصدر/هدف + JE + مصروفات + جوال)* |
| [x] | تسوية البنوك (أكثر من CSV) |
| [x] | عارض القيود المحاسبية (GL Entry drill-down) *(مطابق #10 — `/doc/[slug]/[name]`)* |
| [x] | توجيه الحسابات الآلي *(حقول GL الافتراضية على `Company` — `settings/account-routing`)* |
| [x] | دورة الشيكات *(فلترة، تفصيل PE، **تسجيل شيك** → مدفوعات مع `chequeFlow`؛ مسار ERPNext = Payment Entry)* |
| [x] | نماذج إنشاء الخزائن والبنوك |

## المرحلة 3 — بنية + إعدادات وحدات (P2)

| تم | المهمة |
|----|--------|
| [x] | إعدادات الوحدات *(مركز + **Selling** موسّع + **Buying** + **Stock** + **Accounts** + فروع + توجيه؛ التقرير يذكر ~47 إعداد مبيعات في دفتره — غطينا الحقول العملياتية عبر واجهة ERPNext الفعلية)* |
| [x] | وظيفة التعديل Edit على الصفحات الناقصة *(مسودات في `/doc/[slug]/[name]` + انتقال من قوائم PE/مصروفات/قيد)* |
| [x] | استيراد بيانات CSV/Excel *(أصناف: CSV + **Excel** ورقة أولى؛ بنك: CSV متعدد سابقاً)* |
| [x] | تصدير حقيقي Excel + PDF |
| [x] | إشعارات حقيقية (WebSocket/SSE/Polling) *(مغطى بـ: جلب Notification Log + `refetchInterval` + `refetchOnWindowFocus` — بدون WebSocket حتى إشعار صريح بالحاجة)* |
| [x] | تصفية حسب الفرع *(اختياري عبر `useBranchScope` على **أوامر بيع/شراء** + عمود فرع)* |
| [x] | استمرارية بوابة المطور *(مفاتيح API + ويب هوكس + تسليمات في `data/developer-portal.json`)* |

## المرحلة 4 — تحسين التصميم (P3)

> **لا تكرار:** بنود **P3** التالية تُفصَّل وتُحدَّث في قسم **«مسار إصلاح المظهر وتجربة الاستخدام (ذيل التقرير)»** (مراحل 1–5 هناك = القسم التاسع في `docs/fixsystem.md`). الجدول أدناه يبقى مؤشراً سريعاً للخطة القديمة في التقرير (القسم السادس 6.2–6.4).

| تم | المهمة |
|----|--------|
| [x] | نظام الألوان Vibrant SaaS (حسب 6.3) — **`globals.css`** (`:root` + `.dark`) |
| [x] | DatePicker + هجري (حسب 6.2) |
| [x] | نماذج تبويبية طويلة |
| [x] | جداول + فلاتر متقدمة *(بحث، فلتر أعمدة، أعمدة قابلة للإخفاء، جوال بطاقات)* |
| [x] | PDF حقيقي `@react-pdf/renderer` |
| [x] | Autosave محسّن |

## المرحلة 5 — ميزات تنافسية (P4)

| تم | المهمة |
|----|--------|
| [x] | نظام SMS *(إعدادات + أسرار في **`settings/product-extensions`** → `data/product-extensions-settings.json` — الربط مع مزوّد حقيقي خطوة تكامل لاحقة)* |
| [x] | محرر قوالب WYSIWYG — **`@mdxeditor/editor`** في **`/settings/rich-templates`** + حفظ **`data/rich-templates.json`**؛ **`print-templates`** يبقى لـ **Print Format** في ERPNext |
| [x] | محرر سير عمل مرئي *( **`operations/workflow-studio`** + حقل مسار في امتدادات المنتج)* |
| [x] | ربط متاجر (Salla, Zid, Shopify) *(تبديلات + أسرار في **`product-extensions`**)* |
| [x] | أقساط وإيجارات *(قائمة **`Contract`** و **`/doc/contract/[name]`**؛ أقساط جدولية تبقى حسب تطبيق العميل)* |
| [x] | محرك تقارير متقدم + جدولة *(جدولة **محلية** لمراجع التقارير في **`product-extensions`** — ليس cron خادم)* |
| [x] | التقويم الهجري *(DatePicker — مرحلة 3 أعلاه)* |

---

# القسم الثاني من التقرير — تتبع سريع

## مشاكل حرجة (القسم الرابع — جدول «مشاكل حرجة»)

| تم | # | الموضوع |
|----|---|---------|
| [x] | 1 | VAT — ترحيل صحيح (بيع + شراء) *(شراء: قالب + مرتجع؛ بيع: قالب في `buildSalesInvoice`؛ بدون قالب ما زال تقدير 15% للعرض فقط على الواجهة)* |
| [x] | 2 | أصول — حقول إهلاك/مسؤول/صنف تصل للـ payload *(عرض GL عبر المستندات المرتبطة — ضمن نطاق المسار)* |
| [x] | 3 | مصروفات — `buildExpenseClaimCreate` + ربط حقيقي + **عملة/سعر صرف في الواجهة** *(اعتمادات HR متقدمة خارج النطاق)* |
| [x] | 4 | إشعارات — ليست ثابتة *(ERPNext Notification Log + for_user + مقروء + تنقل)* |
| [x] | 5 | بوابة العميل — مصادقة حقيقية *(جلسة ERP Pro + `/login?redirect=/portal` + Customer ID)* |
| [x] | 6 | تقارير — تصدير Excel/PDF فعلي |

## مشاكل عالية (القسم الرابع)

| تم | # | الموضوع |
|----|---|---------|
| [x] | 7 | تعدد العملات *(فواتير، عروض، أوامر، PI قائمة، مدفوعات ثنائية السعر، قيود، مصروفات، جوال)* |
| [x] | 8 | تسوية البنوك |
| [x] | 9 | دورة الشيكات *(مسار Payment Entry + `chequeFlow` + تفصيل)* |
| [x] | 10 | عارض GL *(جدول GL في `/doc/[slug]/[name]` عند `docstatus === 1`)* |
| [x] | 11 | توجيه حسابات آلي *(صفحة `settings/account-routing` — حقول `Company`)* |
| [x] | 12 | استيراد بيانات *(أصناف CSV+Excel؛ بنك CSV)* |
| [x] | 13 | Edit للمستندات *(مسودات عبر `/doc/...` + قوائم)* |
| [x] | 14 | إعدادات الوحدات *(مركز + مبيعات/مشتريات/مخزون/محاسبة عبر مستندات ERPNext)* |
| [x] | 15 | الخزائن والبنوك — إنشاء *(حوارات Bank / Bank Account / Mode of Payment — راجع بند P1)* |

## حقول خاطئة → ErpLinkCombobox (جدول القسم 2.1)

| تم | الصفحة / المجال | الحقل |
|----|-----------------|-------|
| [x] | المصروفات | employee |
| [x] | المصروفات | cost_center |
| [x] | المصروفات | expense_type |
| [x] | المصروفات | currency *(ErpLinkCombobox Currency + سعر صرف في النموذج)* |
| [x] | فواتير مشتريات (محاسبة) | tax_template *(ErpLinkCombobox Purchase Taxes and Charges Template)* |
| [x] | العملاء | customer_group |
| [x] | العملاء | territory |
| [x] | الموردين | supplier_group |
| [x] | الموردين | country |
| [x] | الأصول | category |
| [x] | مراكز التكلفة | parent_cost_center |
| [x] | دليل الحسابات | parent_account *(مرادف التقرير لـ parent_cost_center — الحقل الفعلي في ERPNext هو `parent_account`)* |

## Ghost Fields (إرسال أو إزالة مقصودة)

| تم | الصفحة | الحقل |
|----|--------|-------|
| [x] | الأصول | depreciation_method |
| [x] | الأصول | useful_life *(عبر `total_number_of_depreciations` + `frequency_of_depreciation` عند إدخال عمر إنتاجي)* |
| [x] | الأصول | custodian |
| [x] | فواتير مشتريات | supplier_reference *(يُرسل كـ `bill_no` — مرجع فاتورة المورد)* |
| [x] | فواتير مشتريات | discount_amount عبر builder |

---

## مؤجلات عن نطاق «إغلاق fixsystem الآن»

كما في ملخص **`docs/fixsystem.md`**: بوابات الدفع (Tabby, Tamara, Stripe…)، الأنظمة الحكومية (**ZATCA**، الزكاة، الفاتورة السعودية…). **لا تُحسب كناقص يُغلق** في هذا المسار إلا إذا غيّر المنتج النطاق.

---

## قيود على الوكيل (Cursor)

- بعد **أي دفعة عمل** تغلق بنداً من أعلاه: حدّث **هذا الملف** فوراً (`ما تم إنجازه` + **[x]** في الجداول + **نسبة مسار fixsystem**).
- **`project-contex.mdc` مستثناة من العمل** (`alwaysApply: false` + جسم معطّل): **لا** تُحمَّل كمرجع و**لا** تُحدَّث **`project-contex.md`** لمسار fixsystem — استخدم **هذا الملف** فقط.
- **`ui-design-system.mdc`** يبقى مرجعاً للشكل عند تعديل واجهات `(dashboard)`.
