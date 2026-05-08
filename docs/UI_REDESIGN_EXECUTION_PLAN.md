# خطة تنفيذ إعادة تصميم واجهات ERP Pro

> **تاريخ الإنشاء:** 2026-05-01
> **المرجع:** `.cursor/rules/ui-design-system.mdc`
> **النموذج المعتمد:** `src/app/(dashboard)/accounting/chart-of-accounts/page.tsx`

---

## نظرة عامة

تهدف هذه الخطة إلى تطبيق نمط التصميم الموحّد على **جميع شاشات النظام** (88+ شاشة) بشكل تدريجي عبر **10 مراحل**. كل مرحلة تستهدف وحدة واحدة أو مجموعة متقاربة وظيفياً.

### أولوية التنفيذ
1. الشاشات الأكثر استخداماً يومياً (محاسبة، مبيعات، مشتريات)
2. الشاشات ذات الجداول والنماذج المعقدة
3. شاشات الإعدادات والتقارير والعمليات

### ما يتم تطبيقه على كل شاشة
- [ ] هيكل الصفحة (`PageHeader` + `ListQueryAlert` + `dir="rtl"`)
- [ ] شريط الأدوات (بحث + فلاتر segmented)
- [ ] رأس الجدول (sticky, uppercase, tracking-wider)
- [ ] صفوف البيانات (h-10, hover, أزرار إجراءات)
- [ ] حوارات الإدخال (fieldsets + FormField + أزرار نظيفة)
- [ ] حوار الحذف (أيقونة destructive)
- [ ] Skeleton loading + Empty state
- [ ] أزرار بدون gradient/shadow (حسب القواعد)
- [ ] RTL كامل على جميع المكونات

---

## المرحلة 0 — المرجع ✅ (مكتملة)

| # | الشاشة | المسار | الحالة |
|---|---|---|---|
| 0.1 | دليل الحسابات | `accounting/chart-of-accounts` | ✅ مكتمل — النموذج المعتمد |

---

## المرحلة 1 — المحاسبة والمالية (Accounting)

**الأولوية:** عالية جداً — الوحدة الأساسية في النظام
**عدد الشاشات:** 11

| # | الشاشة (عربي) | الشاشة (English) | المسار | DocType | الحالة |
|---|---|---|---|---|---|
| 1.1 | فواتير المبيعات | Sales Invoice | `accounting/sales-invoice` | Sales Invoice | ✅ |
| 1.2 | فواتير المشتريات | Purchase Invoice | `accounting/purchase-invoice` | Purchase Invoice | ✅ |
| 1.3 | القيود اليومية | Journal Entry | `accounting/journal-entry` | Journal Entry | ✅ |
| 1.4 | المدفوعات | Payment Entry | `accounting/payment-entry` | Payment Entry | ✅ |
| 1.5 | مراكز التكلفة | Cost Centers | `accounting/cost-centers` | Cost Center | ✅ |
| 1.6 | المصروفات | Expenses | `accounting/expenses` | Expense Claim | ✅ |
| 1.7 | الأصول الثابتة | Assets | `accounting/assets` | Asset | ✅ |
| 1.8 | الشيكات | Cheques | `accounting/cheques` | Payment Entry | ✅ |
| 1.9 | السنوات المالية | Fiscal Year | `accounting/fiscal-year` | Fiscal Year | ✅ |
| 1.10 | إقفال الفترة | Period Closing | `accounting/period-closing` | Period Closing Voucher | ✅ |
| 1.11 | الخزائن والبنوك | Bank & Cash | `accounting/bank-and-cash` | Bank Account | ✅ |

---

## المرحلة 2 — المبيعات (Sales)

**الأولوية:** عالية — دورة البيع اليومية
**عدد الشاشات:** 7

| # | الشاشة (عربي) | الشاشة (English) | المسار | DocType | الحالة |
|---|---|---|---|---|---|
| 2.1 | العملاء | Customers | `sales/customers` | Customer | ⬜ |
| 2.2 | الموردين | Suppliers | `sales/suppliers` | Supplier | ⬜ |
| 2.3 | عروض الأسعار | Quotations | `sales/quotations` | Quotation | ⬜ |
| 2.4 | أوامر البيع | Sales Orders | `sales/sales-orders` | Sales Order | ⬜ |
| 2.5 | نقاط البيع (POS) | POS | `sales/pos` | POS Invoice | ⬜ |
| 2.6 | إشعارات التسليم | Delivery Notes | `sales/delivery-notes` | Delivery Note | ⬜ |
| 2.7 | تكاملات المبيعات | Sales Integrations | `sales/integrations` | Payment Terms Template | ⬜ |

---

## المرحلة 3 — المشتريات (Purchases)

**الأولوية:** عالية — دورة الشراء
**عدد الشاشات:** 7

| # | الشاشة (عربي) | الشاشة (English) | المسار | DocType | الحالة |
|---|---|---|---|---|---|
| 3.1 | الموردون | Suppliers | `purchases/suppliers` | Supplier | ⬜ |
| 3.2 | فواتير الشراء | Purchase Invoices | `purchases/purchase-invoices` | Purchase Invoice | ⬜ |
| 3.3 | أوامر الشراء | Purchase Orders | `purchases/purchase-orders` | Purchase Order | ⬜ |
| 3.4 | استلام المشتريات | Purchase Receipts | `purchases/purchase-receipts` | Purchase Receipt | ⬜ |
| 3.5 | طلب عروض أسعار | Request for Quotation | `purchases/request-for-quotation` | Request for Quotation | ⬜ |
| 3.6 | عروض أسعار الموردين | Supplier Quotations | `purchases/supplier-quotations` | Supplier Quotation | ⬜ |
| 3.7 | طلبات الشراء | Purchase Requests | `purchases/purchase-requests` | Material Request | ⬜ |

---

## المرحلة 4 — المخزون (Inventory)

**الأولوية:** عالية — إدارة المخزون
**عدد الشاشات:** 6

| # | الشاشة (عربي) | الشاشة (English) | المسار | DocType | الحالة |
|---|---|---|---|---|---|
| 4.1 | الأصناف | Items | `inventory/items` | Item | ⬜ |
| 4.2 | المستودعات | Warehouses | `inventory/warehouses` | Warehouse | ⬜ |
| 4.3 | حركة المخزون | Stock Entry | `inventory/stock-entry` | Stock Entry | ⬜ |
| 4.4 | مستويات المخزون | Stock Levels | `inventory/stock-levels` | Bin | ⬜ |
| 4.5 | قوائم الأسعار | Price Lists | `inventory/price-lists` | Price List | ⬜ |
| 4.6 | جرد المخزون | Stock Reconciliation | `inventory/stock-count` | Stock Reconciliation | ⬜ |

---

## المرحلة 5 — الموارد البشرية (HR)

**الأولوية:** متوسطة-عالية — وحدة كبيرة (16 شاشة)
**عدد الشاشات:** 16

| # | الشاشة (عربي) | الشاشة (English) | المسار | DocType | الحالة |
|---|---|---|---|---|---|
| 5.1 | الموظفين | Employees | `hr/employees` | Employee | ⬜ |
| 5.2 | الحضور والانصراف | Attendance | `hr/attendance` | Attendance | ⬜ |
| 5.3 | طلبات الإجازة | Leave Applications | `hr/leave-applications` | Leave Application | ⬜ |
| 5.4 | كشوف الرواتب | Salary Slips | `hr/salary-slips` | Salary Slip | ⬜ |
| 5.5 | هياكل الرواتب | Salary Structures | `hr/salary-structures` | Salary Structure | ⬜ |
| 5.6 | أنواع الإجازات | Leave Types | `hr/leave-types` | Leave Type | ⬜ |
| 5.7 | الورديات | Shifts | `hr/shifts` | Shift Type | ⬜ |
| 5.8 | العقود | Contracts | `hr/contracts` | Employee Contract | ⬜ |
| 5.9 | طلبات الموظفين | Employee Requests | `hr/employee-requests` | Attendance Request | ⬜ |
| 5.10 | سياسات الإجازات | Leave Policies | `hr/leave-policies` | Leave Policy | ⬜ |
| 5.11 | مسير الرواتب | Payroll Entry | `hr/payroll-entry` | Payroll Entry | ⬜ |
| 5.12 | سلف الموظفين | Employee Advances | `hr/advances` | Employee Advance | ⬜ |
| 5.13 | قروض الموظفين | Employee Loans | `hr/loans` | Loan | ⬜ |
| 5.14 | مستندات الموظفين | Employee Documents | `hr/employee-documents` | File | ⬜ |
| 5.15 | الهيكل التنظيمي | Org Chart | `hr/org-chart` | Employee | ⬜ |
| 5.16 | العطلات | Holidays | `hr/holidays` | Holiday List | ⬜ |

---

## المرحلة 6 — التصنيع (Manufacturing)

**الأولوية:** متوسطة
**عدد الشاشات:** 5

| # | الشاشة (عربي) | الشاشة (English) | المسار | DocType | الحالة |
|---|---|---|---|---|---|
| 6.1 | قوائم المواد | Bill of Materials | `manufacturing/bom` | BOM | ⬜ |
| 6.2 | أوامر العمل | Work Orders | `manufacturing/work-orders` | Work Order | ⬜ |
| 6.3 | خطط الإنتاج | Production Plans | `manufacturing/production-plans` | Production Plan | ⬜ |
| 6.4 | محطات العمل | Workstations | `manufacturing/workstations` | Workstation | ⬜ |
| 6.5 | تكاليف إضافية (LCV) | Landed Cost Voucher | `manufacturing/landed-cost-voucher` | Landed Cost Voucher | ⬜ |

---

## المرحلة 7 — إدارة العملاء CRM

**الأولوية:** متوسطة
**عدد الشاشات:** 11

| # | الشاشة (عربي) | الشاشة (English) | المسار | DocType | الحالة |
|---|---|---|---|---|---|
| 7.1 | العملاء المحتملون | Leads | `crm/leads` | Lead | ⬜ |
| 7.2 | الفرص | Opportunities | `crm/opportunities` | Opportunity | ⬜ |
| 7.3 | العملاء | Customers (CRM) | `crm/customers` | Customer | ⬜ |
| 7.4 | المواعيد | Appointments | `crm/appointments` | Event | ⬜ |
| 7.5 | الأنشطة | Activities | `crm/activities` | Communication | ⬜ |
| 7.6 | المتابعة | Follow-ups | `crm/follow-ups` | ToDo | ⬜ |
| 7.7 | الاشتراكات والعضويات | Subscriptions | `crm/subscriptions` | Subscription | ⬜ |
| 7.8 | النقاط والأرصدة | Credits & Points | `crm/credits` | Payment Entry | ⬜ |
| 7.9 | سجل التفاعلات | CRM Timeline | `crm/timeline` | Communication | ⬜ |
| 7.10 | بوابة العميل | Customer Portal | `crm/portal` | Customer | ⬜ |
| 7.11 | الرسائل والإشعارات | Messages & Alerts | `crm/messages` | Notification Log | ⬜ |

---

## المرحلة 8 — التشغيل (Operations)

**الأولوية:** متوسطة-منخفضة
**عدد الشاشات:** 8

| # | الشاشة (عربي) | الشاشة (English) | المسار | DocType | الحالة |
|---|---|---|---|---|---|
| 8.1 | أوامر الشغل | Work Orders (Ops) | `operations/work-orders-ops` | Work Order | ⬜ |
| 8.2 | تتبع الوقت | Time Tracking | `operations/time-tracking` | Timesheet | ⬜ |
| 8.3 | الإيجارات | Rentals | `operations/rentals` | Rental Contract | ⬜ |
| 8.4 | حضور ESS للجوال | ESS Attendance | `operations/ess-attendance` | Employee Checkin | ⬜ |
| 8.5 | مصروفات الجوال | Mobile Expenses | `operations/mobile-expenses` | Expense Claim | ✅ |
| 8.6 | جرد المخزون بالجوال | Mobile Inventory Count | `operations/mobile-inventory-count` | Stock Reconciliation | ⬜ |
| 8.7 | دورات العمل المتقدمة | Workflow Studio | `operations/workflow-studio` | Workflow | ⬜ |
| 8.8 | API للمطورين | Developer API | `operations/developer-api` | API Key | ⬜ |

---

## المرحلة 9 — الإعدادات (Settings)

**الأولوية:** متوسطة — شاشات إدارية
**عدد الشاشات:** 10

| # | الشاشة (عربي) | الشاشة (English) | المسار | الحالة |
|---|---|---|---|---|
| 9.1 | الإعدادات العامة | General Settings | `settings` | ⬜ |
| 9.2 | الفروع | Branches | `settings/branches` | ⬜ |
| 9.3 | طرق الدفع | Payment Methods | `settings/payment-methods` | ⬜ |
| 9.4 | قواعد الضرائب | Tax Rules | `settings/tax-rules` | ⬜ |
| 9.5 | معدّلات الضرائب | Tax Rates | `settings/tax-rates` | ⬜ |
| 9.6 | قوالب الطباعة | Print Templates | `settings/print-templates` | ⬜ |
| 9.7 | الشروط والأحكام | Terms & Conditions | `settings/terms-and-conditions` | ⬜ |
| 9.8 | الحقول المخصصة | Custom Fields | `settings/custom-fields` | ⬜ |
| 9.9 | الأمان | Security | `settings/security` | ⬜ |
| 9.10 | ربط ERPNext | ERP Backend | `settings/erp-backend` | ⬜ |
| 9.11 | التكاملات | Integrations | `settings/integrations` | ⬜ |

---

## المرحلة 10 — الشاشات العامة والمستقلة

**الأولوية:** منخفضة — شاشات مساندة
**عدد الشاشات:** 5+

| # | الشاشة (عربي) | الشاشة (English) | المسار | الحالة |
|---|---|---|---|---|
| 10.1 | لوحة التحكم (Dashboard) | Dashboard | `/` (الصفحة الرئيسية) | ⬜ |
| 10.2 | التقارير | Reports | `reports` | ⬜ |
| 10.3 | سجل العمليات | Audit Log | `audit-log` | ⬜ |
| 10.4 | صفحة تسجيل الدخول | Login | `login` | ⬜ |
| 10.5 | صفحة بوابة العميل | Portal | `portal` | ⬜ |
| 10.6 | صفحة الوصول المرفوض | Forbidden | `forbidden` | ⬜ |

---

## ملخّص إحصائي

| المرحلة | الوحدة | عدد الشاشات | الأولوية |
|---|---|---|---|
| 0 | المرجع (دليل الحسابات) | 1 | ✅ مكتمل |
| 1 | المحاسبة والمالية | 11 | عالية جداً |
| 2 | المبيعات | 7 | عالية |
| 3 | المشتريات | 7 | عالية |
| 4 | المخزون | 6 | عالية |
| 5 | الموارد البشرية | 16 | متوسطة-عالية |
| 6 | التصنيع | 5 | متوسطة |
| 7 | إدارة العملاء CRM | 11 | متوسطة |
| 8 | التشغيل | 8 | متوسطة-منخفضة |
| 9 | الإعدادات | 11 | متوسطة |
| 10 | شاشات عامة ومستقلة | 6 | منخفضة |
| **المجموع** | | **89** | |

---

## تعليمات التنفيذ

1. **الترتيب:** نفّذ المراحل بالترتيب (1 → 10). داخل كل مرحلة، ابدأ بالشاشة الأكثر تعقيداً.
2. **المرجع:** كل شاشة يجب أن تتبع `.cursor/rules/ui-design-system.mdc` حرفياً.
3. **الاختبار:** بعد كل شاشة، شغّل `npx tsc --noEmit` و`ReadLints` للتحقق.
4. **التوثيق:** بعد إنهاء كل شاشة، حدّث حالتها من ⬜ إلى ✅ في هذا الملف.
5. **الدُفعات:** يمكن تنفيذ 3-5 شاشات في الجلسة الواحدة (حسب التعقيد).
6. **الشاشات الخاصة:** `POS` و`Org Chart` و`Dashboard` و`Reports` لها طبيعة خاصة وقد تحتاج تكييفاً للنمط (ليست جداول عادية).
