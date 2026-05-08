# متتبع التحويل الشامل — Stripe UI (Arabic + RTL)

هذا الملف هو المرجع الرسمي لمتابعة تحويل واجهات ERP Pro إلى نمط SaaS احترافي مستوحى من Stripe.

حالات التنفيذ:
- ⬜ لم يبدأ
- 🟨 قيد التنفيذ
- ✅ جاهز

---

## 1) واجهات التطبيق (App Pages)

| المعرف | الاسم | المسار | النطاق | الحالة | ملاحظات QA |
|---|---|---|---|---|---|
| page-dashboard-home | لوحة التحكم | `src/app/(dashboard)/page.tsx` | عام | ✅ | Stripe batch-11 |
| page-dashboard-reports | التقارير | `src/app/(dashboard)/reports/page.tsx` | عام | ✅ | Stripe batch-11 |
| page-dashboard-audit-log | سجل العمليات | `src/app/(dashboard)/audit-log/page.tsx` | عام | ✅ | Stripe batch-11 |
| page-login | تسجيل الدخول | `src/app/login/page.tsx` | عام | ✅ | Stripe batch-11 |
| page-portal | بوابة العميل | `src/app/portal/page.tsx` | عام | ✅ | Stripe batch-11 |
| page-forbidden | الوصول المرفوض | `src/app/forbidden/page.tsx` | عام | ✅ | Stripe batch-11 |
| page-doc-detail | تفاصيل المستند | `src/app/(dashboard)/doc/[slug]/[name]/page.tsx` | عام | ✅ | Stripe batch-11 |
| page-accounting-chart-of-accounts | دليل الحسابات | `src/app/(dashboard)/accounting/chart-of-accounts/page.tsx` | المحاسبة | ✅ | مرجع التصميم |
| page-accounting-sales-invoice | فواتير المبيعات | `src/app/(dashboard)/accounting/sales-invoice/page.tsx` | المحاسبة | ✅ | |
| page-accounting-sales-invoice-new | إنشاء فاتورة مبيعات | `src/app/(dashboard)/accounting/sales-invoice/new/page.tsx` | المحاسبة | ✅ | |
| page-accounting-purchase-invoice | فواتير المشتريات | `src/app/(dashboard)/accounting/purchase-invoice/page.tsx` | المحاسبة | ✅ | |
| page-accounting-purchase-invoice-new | إنشاء فاتورة مشتريات | `src/app/(dashboard)/accounting/purchase-invoice/new/page.tsx` | المحاسبة | ✅ | |
| page-accounting-journal-entry | القيود اليومية | `src/app/(dashboard)/accounting/journal-entry/page.tsx` | المحاسبة | ✅ | |
| page-accounting-journal-entry-new | إنشاء قيد يومية | `src/app/(dashboard)/accounting/journal-entry/new/page.tsx` | المحاسبة | ✅ | |
| page-accounting-payment-entry | المدفوعات | `src/app/(dashboard)/accounting/payment-entry/page.tsx` | المحاسبة | ✅ | |
| page-accounting-cost-centers | مراكز التكلفة | `src/app/(dashboard)/accounting/cost-centers/page.tsx` | المحاسبة | ✅ | |
| page-accounting-expenses | المصروفات | `src/app/(dashboard)/accounting/expenses/page.tsx` | المحاسبة | ✅ | |
| page-accounting-assets | الأصول الثابتة | `src/app/(dashboard)/accounting/assets/page.tsx` | المحاسبة | ✅ | |
| page-accounting-cheques | الشيكات | `src/app/(dashboard)/accounting/cheques/page.tsx` | المحاسبة | ✅ | |
| page-accounting-fiscal-year | السنوات المالية | `src/app/(dashboard)/accounting/fiscal-year/page.tsx` | المحاسبة | ✅ | |
| page-accounting-period-closing | إقفال الفترة | `src/app/(dashboard)/accounting/period-closing/page.tsx` | المحاسبة | ✅ | |
| page-accounting-bank-and-cash | الخزائن والبنوك | `src/app/(dashboard)/accounting/bank-and-cash/page.tsx` | المحاسبة | ✅ | |
| page-sales-customers | العملاء | `src/app/(dashboard)/sales/customers/page.tsx` | المبيعات | ✅ | Stripe batch-02 |
| page-sales-suppliers | الموردون (مبيعات) | `src/app/(dashboard)/sales/suppliers/page.tsx` | المبيعات | ✅ | Stripe batch-05 |
| page-sales-quotations | عروض الأسعار | `src/app/(dashboard)/sales/quotations/page.tsx` | المبيعات | ✅ | Stripe batch-03 |
| page-sales-sales-orders | أوامر البيع | `src/app/(dashboard)/sales/sales-orders/page.tsx` | المبيعات | ✅ | Stripe batch-02 |
| page-sales-pos | نقاط البيع | `src/app/(dashboard)/sales/pos/page.tsx` | المبيعات | ✅ | Stripe batch-04 |
| page-sales-delivery-notes | إشعارات التسليم | `src/app/(dashboard)/sales/delivery-notes/page.tsx` | المبيعات | ✅ | Stripe batch-04 |
| page-sales-integrations | تكاملات المبيعات | `src/app/(dashboard)/sales/integrations/page.tsx` | المبيعات | ✅ | Stripe batch-05 |
| page-sales-purchase-orders | طلبات شراء من المبيعات | `src/app/(dashboard)/sales/purchase-orders/page.tsx` | المبيعات | ✅ | Stripe batch-12 (redirect مقصود إلى صفحة المشتريات) |
| page-purchases-suppliers | الموردون | `src/app/(dashboard)/purchases/suppliers/page.tsx` | المشتريات | ✅ | Stripe batch-02 |
| page-purchases-purchase-invoices | فواتير الشراء | `src/app/(dashboard)/purchases/purchase-invoices/page.tsx` | المشتريات | ✅ | Stripe batch-03 |
| page-purchases-purchase-orders | أوامر الشراء | `src/app/(dashboard)/purchases/purchase-orders/page.tsx` | المشتريات | ✅ | Stripe batch-03 |
| page-purchases-purchase-receipts | استلام المشتريات | `src/app/(dashboard)/purchases/purchase-receipts/page.tsx` | المشتريات | ✅ | Stripe batch-04 |
| page-purchases-rfq | طلب عروض أسعار | `src/app/(dashboard)/purchases/request-for-quotation/page.tsx` | المشتريات | ✅ | Stripe batch-05 |
| page-purchases-supplier-quotations | عروض الموردين | `src/app/(dashboard)/purchases/supplier-quotations/page.tsx` | المشتريات | ✅ | Stripe batch-05 |
| page-purchases-purchase-requests | طلبات الشراء | `src/app/(dashboard)/purchases/purchase-requests/page.tsx` | المشتريات | ✅ | Stripe batch-05 |
| page-inventory-items | الأصناف | `src/app/(dashboard)/inventory/items/page.tsx` | المخزون | ✅ | Stripe batch-06 |
| page-inventory-warehouses | المستودعات | `src/app/(dashboard)/inventory/warehouses/page.tsx` | المخزون | ✅ | Stripe batch-06 |
| page-inventory-stock-entry | حركة المخزون | `src/app/(dashboard)/inventory/stock-entry/page.tsx` | المخزون | ✅ | Stripe batch-06 |
| page-inventory-stock-levels | مستويات المخزون | `src/app/(dashboard)/inventory/stock-levels/page.tsx` | المخزون | ✅ | Stripe batch-06 |
| page-inventory-price-lists | قوائم الأسعار | `src/app/(dashboard)/inventory/price-lists/page.tsx` | المخزون | ✅ | Stripe batch-06 |
| page-inventory-stock-count | جرد المخزون | `src/app/(dashboard)/inventory/stock-count/page.tsx` | المخزون | ✅ | Stripe batch-06 |
| page-hr-employees | الموظفون | `src/app/(dashboard)/hr/employees/page.tsx` | الموارد البشرية | ✅ | Stripe batch-07 |
| page-hr-attendance | الحضور والانصراف | `src/app/(dashboard)/hr/attendance/page.tsx` | الموارد البشرية | ✅ | Stripe batch-07 |
| page-hr-leave-applications | طلبات الإجازة | `src/app/(dashboard)/hr/leave-applications/page.tsx` | الموارد البشرية | ✅ | Stripe batch-07 |
| page-hr-salary-slips | كشوف الرواتب | `src/app/(dashboard)/hr/salary-slips/page.tsx` | الموارد البشرية | ✅ | Stripe batch-07 |
| page-hr-salary-structures | هياكل الرواتب | `src/app/(dashboard)/hr/salary-structures/page.tsx` | الموارد البشرية | ✅ | Stripe batch-07 |
| page-hr-leave-types | أنواع الإجازات | `src/app/(dashboard)/hr/leave-types/page.tsx` | الموارد البشرية | ✅ | Stripe batch-07 |
| page-hr-shifts | الورديات | `src/app/(dashboard)/hr/shifts/page.tsx` | الموارد البشرية | ✅ | Stripe batch-07 |
| page-hr-contracts | العقود | `src/app/(dashboard)/hr/contracts/page.tsx` | الموارد البشرية | ✅ | Stripe batch-07 |
| page-hr-employee-requests | طلبات الموظفين | `src/app/(dashboard)/hr/employee-requests/page.tsx` | الموارد البشرية | ✅ | Stripe batch-07 |
| page-hr-leave-policies | سياسات الإجازات | `src/app/(dashboard)/hr/leave-policies/page.tsx` | الموارد البشرية | ✅ | Stripe batch-07 |
| page-hr-payroll-entry | مسير الرواتب | `src/app/(dashboard)/hr/payroll-entry/page.tsx` | الموارد البشرية | ✅ | Stripe batch-07 |
| page-hr-advances | سلف الموظفين | `src/app/(dashboard)/hr/advances/page.tsx` | الموارد البشرية | ✅ | Stripe batch-07 |
| page-hr-loans | قروض الموظفين | `src/app/(dashboard)/hr/loans/page.tsx` | الموارد البشرية | ✅ | Stripe batch-07 |
| page-hr-employee-documents | مستندات الموظفين | `src/app/(dashboard)/hr/employee-documents/page.tsx` | الموارد البشرية | ✅ | Stripe batch-07 |
| page-hr-org-chart | الهيكل التنظيمي | `src/app/(dashboard)/hr/org-chart/page.tsx` | الموارد البشرية | ✅ | Stripe batch-07 |
| page-hr-holidays | العطلات | `src/app/(dashboard)/hr/holidays/page.tsx` | الموارد البشرية | ✅ | Stripe batch-07 |
| page-manufacturing-bom | قوائم المواد | `src/app/(dashboard)/manufacturing/bom/page.tsx` | التصنيع | ✅ | Stripe batch-07 |
| page-manufacturing-work-orders | أوامر العمل | `src/app/(dashboard)/manufacturing/work-orders/page.tsx` | التصنيع | ✅ | Stripe batch-07 |
| page-manufacturing-production-plans | خطط الإنتاج | `src/app/(dashboard)/manufacturing/production-plans/page.tsx` | التصنيع | ✅ | Stripe batch-07 |
| page-manufacturing-workstations | محطات العمل | `src/app/(dashboard)/manufacturing/workstations/page.tsx` | التصنيع | ✅ | Stripe batch-07 |
| page-manufacturing-landed-cost-voucher | التكاليف الإضافية | `src/app/(dashboard)/manufacturing/landed-cost-voucher/page.tsx` | التصنيع | ✅ | Stripe batch-07 |
| page-crm-leads | العملاء المحتملون | `src/app/(dashboard)/crm/leads/page.tsx` | CRM | ✅ | Stripe batch-07 |
| page-crm-opportunities | الفرص | `src/app/(dashboard)/crm/opportunities/page.tsx` | CRM | ✅ | Stripe batch-07 |
| page-crm-customers | العملاء (CRM) | `src/app/(dashboard)/crm/customers/page.tsx` | CRM | ✅ | Stripe batch-07 |
| page-crm-appointments | المواعيد | `src/app/(dashboard)/crm/appointments/page.tsx` | CRM | ✅ | Stripe batch-07 |
| page-crm-activities | الأنشطة | `src/app/(dashboard)/crm/activities/page.tsx` | CRM | ✅ | Stripe batch-07 |
| page-crm-follow-ups | المتابعة | `src/app/(dashboard)/crm/follow-ups/page.tsx` | CRM | ✅ | Stripe batch-07 |
| page-crm-subscriptions | الاشتراكات | `src/app/(dashboard)/crm/subscriptions/page.tsx` | CRM | ✅ | Stripe batch-07 |
| page-crm-credits | النقاط والأرصدة | `src/app/(dashboard)/crm/credits/page.tsx` | CRM | ✅ | Stripe batch-07 |
| page-crm-timeline | سجل التفاعلات | `src/app/(dashboard)/crm/timeline/page.tsx` | CRM | ✅ | Stripe batch-07 |
| page-crm-portal | بوابة العميل (CRM) | `src/app/(dashboard)/crm/portal/page.tsx` | CRM | ✅ | Stripe batch-07 |
| page-crm-messages | الرسائل والإشعارات | `src/app/(dashboard)/crm/messages/page.tsx` | CRM | ✅ | Stripe batch-07 |
| page-operations-work-orders-ops | أوامر التشغيل | `src/app/(dashboard)/operations/work-orders-ops/page.tsx` | التشغيل | ✅ | Stripe batch-07 |
| page-operations-time-tracking | تتبع الوقت | `src/app/(dashboard)/operations/time-tracking/page.tsx` | التشغيل | ✅ | Stripe batch-07 |
| page-operations-rentals | الإيجارات | `src/app/(dashboard)/operations/rentals/page.tsx` | التشغيل | ✅ | Stripe batch-07 |
| page-operations-ess-attendance | حضور ESS | `src/app/(dashboard)/operations/ess-attendance/page.tsx` | التشغيل | ✅ | Stripe batch-07 |
| page-operations-mobile-expenses | مصروفات الجوال | `src/app/(dashboard)/operations/mobile-expenses/page.tsx` | التشغيل | ✅ | منجز سابقًا (قبل Batch-07) |
| page-operations-mobile-inventory-count | جرد الجوال | `src/app/(dashboard)/operations/mobile-inventory-count/page.tsx` | التشغيل | ✅ | Stripe batch-07 |
| page-operations-workflow-studio | دورات العمل | `src/app/(dashboard)/operations/workflow-studio/page.tsx` | التشغيل | ✅ | Stripe batch-07 |
| page-operations-developer-api | API المطورين | `src/app/(dashboard)/operations/developer-api/page.tsx` | التشغيل | ✅ | Stripe batch-07 |
| page-settings-home | الإعدادات العامة | `src/app/(dashboard)/settings/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-branches | الفروع | `src/app/(dashboard)/settings/branches/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-payment-methods | طرق الدفع | `src/app/(dashboard)/settings/payment-methods/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-tax-rules | قواعد الضرائب | `src/app/(dashboard)/settings/tax-rules/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-tax-rates | معدلات الضرائب | `src/app/(dashboard)/settings/tax-rates/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-print-templates | قوالب الطباعة | `src/app/(dashboard)/settings/print-templates/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-rich-templates | القوالب المتقدمة | `src/app/(dashboard)/settings/rich-templates/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-terms-and-conditions | الشروط والأحكام | `src/app/(dashboard)/settings/terms-and-conditions/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-custom-fields | الحقول المخصصة | `src/app/(dashboard)/settings/custom-fields/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-security | الأمان | `src/app/(dashboard)/settings/security/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-erp-backend | ربط ERPNext | `src/app/(dashboard)/settings/erp-backend/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-integrations | التكاملات | `src/app/(dashboard)/settings/integrations/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-account-routing | توجيه الحسابات | `src/app/(dashboard)/settings/account-routing/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-product-extensions | امتدادات المنتج | `src/app/(dashboard)/settings/product-extensions/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-module-settings | إعدادات الوحدات | `src/app/(dashboard)/settings/module-settings/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-module-settings-accounts | إعدادات المحاسبة | `src/app/(dashboard)/settings/module-settings/accounts/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-module-settings-hr | إعدادات الموارد البشرية | `src/app/(dashboard)/settings/module-settings/hr/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-module-settings-stock | إعدادات المخزون | `src/app/(dashboard)/settings/module-settings/stock/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-module-settings-buying | إعدادات المشتريات | `src/app/(dashboard)/settings/module-settings/buying/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |
| page-settings-module-settings-selling | إعدادات المبيعات | `src/app/(dashboard)/settings/module-settings/selling/page.tsx` | الإعدادات | ✅ | Stripe batch-07 |

---

## 2) مكوّنات التصميم الأساسية (src/components/ui)

| المعرف | الاسم | المسار | الحالة | ملاحظات QA |
|---|---|---|---|---|
| ui-button | زر النظام | `src/components/ui/button.tsx` | ✅ | baseline Stripe مطبّق |
| ui-input | حقل إدخال النظام | `src/components/ui/input.tsx` | ✅ | baseline Stripe مطبّق |
| ui-table | جدول النظام | `src/components/ui/table.tsx` | ✅ | baseline Stripe مطبّق |
| ui-card | بطاقة النظام | `src/components/ui/card.tsx` | ✅ | baseline Stripe مطبّق |
| ui-select | قائمة منسدلة | `src/components/ui/select.tsx` | ✅ | baseline Stripe مطبّق |
| ui-dialog | نافذة حوار | `src/components/ui/dialog.tsx` | ✅ | baseline Stripe مطبّق |
| ui-alert-dialog | حوار تأكيد | `src/components/ui/alert-dialog.tsx` | ✅ | baseline Stripe مطبّق |
| ui-popover | نافذة منبثقة | `src/components/ui/popover.tsx` | ✅ | baseline Stripe مطبّق |
| ui-badge | شارة | `src/components/ui/badge.tsx` | ✅ | baseline Stripe مطبّق |
| ui-tabs | تبويبات | `src/components/ui/tabs.tsx` | ✅ | baseline Stripe مطبّق |
| ui-form | نموذج عام | `src/components/ui/form.tsx` | ✅ | baseline Stripe مطبّق |
| ui-textarea | حقل نص متعدد | `src/components/ui/textarea.tsx` | ✅ | baseline Stripe مطبّق |
| ui-date-picker | منتقي تاريخ | `src/components/ui/date-picker.tsx` | ✅ | baseline Stripe مطبّق |
| ui-date-range-picker | منتقي نطاق تاريخ | `src/components/ui/date-range-picker.tsx` | ✅ | baseline Stripe مطبّق |
| ui-file-upload | رفع ملفات | `src/components/ui/file-upload.tsx` | ✅ | baseline Stripe مطبّق |
| ui-multi-select | اختيار متعدد | `src/components/ui/multi-select.tsx` | ✅ | baseline Stripe مطبّق |
| ui-sidebar-primitive | Sidebar primitive | `src/components/ui/sidebar.tsx` | ✅ | baseline Stripe مطبّق |

---

## 3) مكوّنات ERP المشتركة (src/components/erp)

| المعرف | الاسم | المسار | الحالة | ملاحظات QA |
|---|---|---|---|---|
| erp-page-header | رأس الصفحة | `src/components/erp/page-header.tsx` | ✅ | shell phase مطبّق |
| erp-app-sidebar | الشريط الجانبي | `src/components/erp/app-sidebar.tsx` | ✅ | shell phase مطبّق |
| erp-app-header | الشريط العلوي | `src/components/erp/app-header.tsx` | ✅ | shell phase مطبّق |
| erp-list-query-alert | تنبيه الاستعلام | `src/components/erp/list-query-alert.tsx` | ✅ | baseline Stripe مطبّق |
| erp-data-table | جدول ERP | `src/components/erp/data-table.tsx` | ✅ | baseline Stripe مطبّق |
| erp-doc-form | نموذج المستند | `src/components/erp/doc-form.tsx` | ✅ | baseline Stripe مطبّق |
| erp-form-field | حقل نموذج موحد | `src/components/erp/form-field.tsx` | ✅ | baseline Stripe مطبّق |
| erp-erp-link-combobox | رابط ERP Combobox | `src/components/erp/erp-link-combobox.tsx` | ✅ | baseline Stripe مطبّق |
| erp-kpi-card | بطاقة KPI | `src/components/erp/kpi-card.tsx` | ✅ | baseline Stripe مطبّق |
| erp-empty-state | حالة فراغ | `src/components/erp/empty-state.tsx` | ✅ | baseline Stripe مطبّق |
| erp-global-search | البحث العام | `src/components/erp/global-search.tsx` | ✅ | baseline Stripe مطبّق |
| erp-dashboard-widget-board | لوحة الويدجت | `src/components/erp/dashboard-widget-board.tsx` | ✅ | baseline Stripe مطبّق |

---

## 4) حالة الدفعة الحالية

| الدفعة | العناصر | الحالة | ملاحظات |
|---|---|---|---|
| Batch-01 | `ui-button`, `ui-input`, `ui-table`, `ui-card`, `erp-app-sidebar`, `erp-app-header`, `erp-page-header` | ✅ | تم تطبيق baseline Stripe + RTL |
| Batch-02 | `page-sales-customers`, `page-purchases-suppliers`, `page-sales-sales-orders` | ✅ | PageShell + RTL + تبسيط النمط وتهدئة tabs/filters |
| Batch-03 | `page-sales-quotations`, `page-purchases-purchase-orders`, `page-purchases-purchase-invoices` | ✅ | PageShell + RTL + تبسيط واجهات القوائم والتبويبات |
| Batch-04 | `page-sales-delivery-notes`, `page-sales-pos`, `page-purchases-purchase-receipts` | ✅ | توحيد page shell، تحسين RTL لعناصر Select، وتهدئة نمط POS |
| Batch-05 | `page-sales-suppliers`, `page-sales-integrations`, `page-purchases-rfq`, `page-purchases-supplier-quotations`, `page-purchases-purchase-requests` | ✅ | دفعة موسعة: PageHeader/KPI/PageShell + RTL وتوحيد نمط الصفحات |
| Batch-06 | `page-inventory-items`, `page-inventory-warehouses`, `page-inventory-stock-entry`, `page-inventory-stock-levels`, `page-inventory-price-lists`, `page-inventory-stock-count` | ✅ | دفعة أكبر (6 صفحات): توحيد PageHeader/KPI/PageShell ورفع اتساق RTL |
| Batch-07 | `page-hr-*`, `page-manufacturing-*`, `page-crm-*`, `page-operations-*`, `page-settings-*` (59 صفحة) | ✅ | تنفيذ فعلي على كامل نطاق Batch-07: RTL + Tabs muted/35 + إزالة h-9 من أزرار الهيدر حيث وجدت |
| Batch-08 | `ui-select`, `ui-dialog`, `ui-alert-dialog`, `ui-popover`, `ui-badge`, `ui-tabs`, `ui-form`, `ui-textarea`, `ui-date-picker`, `ui-date-range-picker`, `ui-file-upload`, `ui-multi-select`, `ui-sidebar-primitive` | ✅ | توحيد مكونات التصميم الأساسية على نمط Stripe (حدود خفيفة، ظلال هادئة، وتجانس حالات التركيز) |
| Batch-09 | `erp-list-query-alert`, `erp-data-table`, `erp-doc-form`, `erp-form-field`, `erp-erp-link-combobox`, `erp-kpi-card`, `erp-empty-state`, `erp-global-search`, `erp-dashboard-widget-board` | ✅ | توحيد مكونات ERP المشتركة بصريًا على نمط Stripe مع الحفاظ على منطق التشغيل |
| Batch-10 | `erp-app-header`, `erp-app-sidebar`, `erp-page-header`, `globals.css` | ✅ | صقل نهائي: تهدئة micro-interactions وإزالة المؤثرات اللامعة الزائدة للحفاظ على مظهر SaaS نظيف |
| Batch-11 | `page-dashboard-home`, `page-dashboard-reports`, `page-dashboard-audit-log`, `page-login`, `page-portal`, `page-forbidden`, `page-doc-detail` | ✅ | إغلاق النطاق العام بالكامل بتوحيد RTL والـPageHeader وتهدئة المؤثرات البصرية |
| Batch-12 | `page-sales-purchase-orders` | ✅ | إغلاق آخر عنصر متبقٍ: الصفحة Redirect مقصود لمسار `/purchases/purchase-orders` |

---

## 5) ملحق الجرد الكامل للمكوّنات (Technical Inventory)

### مكونات `ui/` (مشمولة بالكامل)

`src/components/ui/accordion.tsx`, `src/components/ui/alert-dialog.tsx`, `src/components/ui/alert.tsx`, `src/components/ui/aspect-ratio.tsx`, `src/components/ui/avatar.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/breadcrumb.tsx`, `src/components/ui/button.tsx`, `src/components/ui/calendar.tsx`, `src/components/ui/card.tsx`, `src/components/ui/carousel.tsx`, `src/components/ui/chart.tsx`, `src/components/ui/checkbox.tsx`, `src/components/ui/collapsible.tsx`, `src/components/ui/command.tsx`, `src/components/ui/context-menu.tsx`, `src/components/ui/date-picker.tsx`, `src/components/ui/date-range-picker.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/drawer.tsx`, `src/components/ui/dropdown-menu.tsx`, `src/components/ui/erp-field.tsx`, `src/components/ui/file-upload.tsx`, `src/components/ui/form.tsx`, `src/components/ui/hover-card.tsx`, `src/components/ui/input-otp.tsx`, `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/menubar.tsx`, `src/components/ui/modern-icon.tsx`, `src/components/ui/multi-select.tsx`, `src/components/ui/navigation-menu.tsx`, `src/components/ui/pagination.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/progress.tsx`, `src/components/ui/radio-group.tsx`, `src/components/ui/resizable.tsx`, `src/components/ui/scroll-area.tsx`, `src/components/ui/select.tsx`, `src/components/ui/separator.tsx`, `src/components/ui/sheet.tsx`, `src/components/ui/sidebar.tsx`, `src/components/ui/skeleton.tsx`, `src/components/ui/slider.tsx`, `src/components/ui/sonner.tsx`, `src/components/ui/switch.tsx`, `src/components/ui/table.tsx`, `src/components/ui/tabs.tsx`, `src/components/ui/textarea.tsx`, `src/components/ui/toast.tsx`, `src/components/ui/toaster.tsx`, `src/components/ui/toggle-group.tsx`, `src/components/ui/toggle.tsx`, `src/components/ui/tooltip.tsx`.

### مكونات `erp/` (مشمولة بالكامل)

`src/components/erp/app-header.tsx`, `src/components/erp/app-sidebar.tsx`, `src/components/erp/confirmation-dialog.tsx`, `src/components/erp/context-rail.tsx`, `src/components/erp/currency-input.tsx`, `src/components/erp/dashboard-widget-board.tsx`, `src/components/erp/data-table.tsx`, `src/components/erp/doc-form.tsx`, `src/components/erp/dynamic-row-table.tsx`, `src/components/erp/empty-state.tsx`, `src/components/erp/erp-link-combobox.tsx`, `src/components/erp/erp-tabbed-form.tsx`, `src/components/erp/error-boundary.tsx`, `src/components/erp/export-button.tsx`, `src/components/erp/form-field.tsx`, `src/components/erp/global-search.tsx`, `src/components/erp/header-notifications.tsx`, `src/components/erp/input-icon.tsx`, `src/components/erp/keyboard-shortcuts-dialog.tsx`, `src/components/erp/kpi-card.tsx`, `src/components/erp/list-query-alert.tsx`, `src/components/erp/mdx-wysiwyg-editor.tsx`, `src/components/erp/page-header.tsx`, `src/components/erp/page-skeleton.tsx`, `src/components/erp/settings-hub-tiles.tsx`, `src/components/erp/status-badge.tsx`.

