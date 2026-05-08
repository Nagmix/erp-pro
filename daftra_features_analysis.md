# Daftra (دفترة) ERP System — Comprehensive Feature Analysis

> Source: https://docs.daftra.com/ — Full documentation extraction
> Document count: 426+ settings articles, 420+ operations articles, 237+ reports articles, 480+ accounting articles

---

## 1. الإعدادات (Settings) — 426 Articles

### 1.1 إدارة التطبيقات (Application Management) — 80 Articles

#### 1.1.1 إدارة التطبيقات العامة (General App Management) — 5 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| تفعيل/تعطيل التطبيقات | Enable/disable system modules per account | Toggle modules: Accounting, Sales, Inventory, HR, CRM, Operations |
| إدارة التطبيقات | Central app management dashboard | View, activate, configure all system applications |

#### 1.1.2 إدارة الحسابات (Account Management) — 6 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| إعدادات الحسابات العامة | Configure general accounting preferences | Fiscal years, closing periods, account routing, defaults |
| توجيه الحسابات (16) | Account mapping/routing rules | Map system transactions to specific GL accounts automatically |

#### 1.1.3 إدارة العمليات (Operations Management) — 8 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| تفعيل تطبيق الإيجارات والوحدات | Enable rental & unit management module | Activate rental, booking, and unit features |
| تفعيل أوامر الشغل | Enable work orders module | Activate work order tracking |
| تفعيل تتبع الوقت | Enable time tracking module | Track employee hours on projects |
| تفعيل دورات العمل | Enable workflow engine | Create custom workflow types |

#### 1.1.4 إدارة المبيعات (Sales Management) — 11 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| تفعيل تطبيق المبيعات | Enable sales module | Activate invoices, quotes, POS |
| إعدادات المبيعات (47) | Comprehensive sales settings | Pricing, discounts, payment, invoice issuance, credit limits |

#### 1.1.5 إدارة المخزون والمشتريات (Inventory & Purchasing) — 5 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| تفعيل تطبيق المخزون | Enable inventory module | Products, warehouses, stock movements |
| تفعيل تطبيق المشتريات | Enable purchasing module | Purchase orders, supplier management |

#### 1.1.6 إدارة الموارد البشرية (HR Management) — 8 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| تفعيل تطبيق الموظفين | Enable HR module | Employee records, attendance, payroll |
| إعدادات الحضور والانصراف | Attendance & departure settings | Shifts, overtime, leave management |

#### 1.1.7 إدارة علاقات العملاء (CRM Management) — 7 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| تفعيل تطبيق CRM | Enable customer relationship management | Customer tracking, appointments, statuses |

---

### 1.2 إدارة التطبيقات الخارجية (External App Integrations) — 34 Articles

| Integration | Description | Key Capabilities |
|---|---|---|
| **إستقطاعات الفاتورة بعد الضريبة** (1) | Post-tax invoice deductions | Deduct amounts after tax calculation |
| **الربط مع زِد (Zid)** (3) | E-commerce platform integration | Sync orders, products (Push/Pull bidirectional), map branches/warehouses, sync last 12 months |
| **الربط مع شوبيفاي (Shopify)** (3) | Shopify store integration | Sync invoices, products, map default warehouse/branch/customer, sync last 2 months |
| **الربط مع متجر سلة (Salla)** (5) | Salla e-commerce platform integration | Sync orders, products, inventory movements |
| **الربط مع منصة رصد (Rasad)** (7) | Rasad platform integration | Sync data with Rasad observation platform |
| **الربط مع ووكومرس (WooCommerce)** (2) | WooCommerce integration | Sync invoices, items, REST API key auth, sync last 2 months, warehouse-level sync |
| **برنامج إعدادات الطباعة المتعددة** (1) | Multi-printer setup program | Desktop app for printer management, auto-print to kitchen/cashier, category-based routing, font size control, extra fields on receipts, branch-specific printer config |
| **تقرير مبيعات - فلترة بحسب المندوب** (1) | Sales report filtered by sales rep | Filter sales by salesperson, compare performance |
| **تقرير مبيعات - نوع الفاتورة وحالة الدفع** (1) | Sales report by invoice type & payment status | Filter by: paid/unpaid/partially paid, sales/return/credit note |

---

### 1.3 إعدادات الترقيم المتسلسل (Sequential Numbering) — 3 Articles
| Feature | Description |
|---|---|
| إضافة بادئة إلى الترقيم المتسلسل | Add prefix to sequential document numbering |
| ترقيم تلقائي | Auto-numbering for all document types |
| تخصيص التسلسل | Customize numbering sequences per document type |

---

### 1.4 إعدادات الضرائب (Tax Settings) — 11 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| إضافة نوع ضريبة | Add tax type with name, percentage, included/excluded | Create VAT, selective tax, service tax, withholding tax |
| ضريبة متضمنة | Tax included in price | Price shown = product + tax combined |
| ضريبة غير متضمنة | Tax excluded from price | Tax added on top of product price |
| تعطيل نوع ضريبة | Deactivate tax type | Soft-disable, preserves historical data |
| إقرار ضريبي ربع سنوي | Quarterly VAT return | Generate quarterly tax declaration report |
| ضريبة خدمات | Service tax with minimum | Apply service charge with minimum threshold |
| ضريبة استقطاع | Withholding tax | Deduct tax from service provider payments |
| ضريبة انتقائية | Selective/excise tax | Apply to specific products only |
| Auto-creation of GL accounts | Creates 3 GL accounts per tax | Main tax account + collected tax + paid tax sub-accounts |

---

### 1.5 إعدادات SMTP (Email Settings) — 2 Articles
| Feature | Description |
|---|---|
| إعدادات SMTP | Configure outgoing email server settings |
| بريد إلكتروني | System email for notifications & invoices |

---

### 1.6 الرسائل النصية القصيرة SMS (SMS Module) — 37 Articles

#### 1.6.1 إعدادات الرسائل النصية SMS (SMS Settings) — 5 Articles
| Feature | Description |
|---|---|
| تفعيل تطبيق الرسائل النصية | Enable SMS module |
| إعدادات المزود | Configure SMS gateway provider |
| رصيد الرسائل | Track SMS credit balance |

#### 1.6.2 قواعد الإرسال الآلي SMS (Auto-send Rules) — 11 Articles
| Feature | Description | Trigger Events |
|---|---|---|
| قاعدة عروض أسعار جديدة | Auto-send for quotations | On create, on status change, delayed send |
| قاعدة إشعار دائن جديد | Auto-send for credit notes | On create, on update |
| قاعدة فواتير جديدة | Auto-send for invoices | On create, on payment, on overdue |
| قاعدة أوامر بيع | Auto-send for sales orders | On create, on status change |
| صلاحية الإرسال | Send validity window | Time-limited retry window |
| طريقة الإرسال | Send via SMS or Email | Choose channel per rule |
| قالب الرسالة | Link to SMS template | Use predefined message templates |
| توقيت الإرسال | Timing options | Immediate or delayed (hours/days/months) |

#### 1.6.3 قوالب SMS (SMS Templates) — 4 Articles
| Feature | Description |
|---|---|
| إضافة قالب SMS | Create reusable SMS message templates with variables |
| متغيرات القالب | Dynamic placeholders for customer name, invoice #, amounts |

---

### 1.7 الفروع (Branches) — 24 Articles

#### 1.7.1 إدارة الفروع (Branch Management) — 14 Articles
| Feature | Description | Key Operations |
|---|---|---|
| إضافة فرع جديد | Add new business branch | Name, address, tax number, contact info |
| تعيين مستودعات الفرع | Assign warehouses to branch | Link inventory locations |
| صلاحيات الفرع | Branch-level permissions | Control user access per branch |
| تحويل بين الفروع | Inter-branch transfers | Transfer stock, funds between branches |
| إعدادات الفرع الافتراضي | Default branch settings | Set primary branch for operations |
| تقارير حسب الفرع | Branch-level reporting | Filter all reports by branch |
| ميزة إضافة الفروع | Multi-branch capability | Centralized management of multiple locations |

---

### 1.8 القوالب (Templates) — 93 Articles

#### 1.8.1 الشروط والأحكام (Terms & Conditions) — 2 Articles
| Feature | Description |
|---|---|
| إدارة الشروط والأحكام | Create T&C documents (text or file upload) |
| ربط بالفاتورة | Attach T&C to invoices; customer must agree before payment |

#### 1.8.2 قواعد الإرسال الآلي للبريد (Auto Email Rules) — 3 Articles
| Feature | Description |
|---|---|
| قواعد إرسال آلي | Auto-send emails on events (invoice creation, payment, etc.) |
| تأخير الإرسال | Delayed email sending |
| قالب البريد | Link to email template |

#### 1.8.3 قوالب البريد الإلكتروني (Email Templates) — 2 Articles
| Feature | Description |
|---|---|
| تصميم قالب البريد | Design email templates with variables |
| متغيرات ديناميكية | Dynamic placeholders for business/customer data |

#### 1.8.4 قوالب للطباعة (Print Templates) — 44 Articles
| Template Type | Description |
|---|---|
| تصاميم الفواتير / عروض الأسعار | Invoice & quotation design builder with drag-and-drop |
| تصاميم فواتير الشراء / مرتجعات المشتريات | Purchase invoice & return designs |
| ملصقات المنتجات | Product label/QR code templates |
| الأذون المخزنية | Stock authorization document designs |
| أوامر الشغل | Work order print templates |
| سندات القبض | Receipt voucher templates |
| القيود اليومية | Journal entry templates |
| مذكرة الاستلام | Delivery note templates |
| عروض الأسعار | Quotation templates |
| **Features**: Custom font/size/alignment, image insertion, HTML code, custom tables, variable placeholders, A4/custom sizes, margin settings, show/hide currency symbol, show paid/remaining amounts, show warehouse field, show order source, show creation time, bilingual (AR/EN) templates, QR code per product |

---

### 1.9 طرق الدفع (Payment Methods) — 23 Articles

| Payment Method | Description | Key Features |
|---|---|---|
| **Tabby** | Buy now pay later | Public key, secret key, bank account number |
| **Tamara** | BNPL platform | API Key, notification token, public key |
| **Stripe** | International payment gateway | Standard Stripe integration |
| **Tap** | Regional payment gateway | Tap payment processing |
| **2Checkout** | Global payment platform | International card processing |
| **Paymob** | Egyptian payment gateway | Local payment methods |
| **Paytabs** | Regional payment processor | Middle East focused |
| **PayPal** | Global payment | PayPal integration |
| **تحويل بنكي** | Bank transfer | Link to specific bank account/cash vault |
| **نقدي** | Cash | Default cash payment |
| **شيك** | Check payment | Check processing |
| **وسيلة دفع مخصصة** | Custom payment method | Create any payment type with same config options |
| **Features**: Enable/disable per method, set as default (⭐), online customer activation, link to specific cash vault, payment fees with taxes, per-branch availability |

---

### 1.10 عن دفترة (About Daftra) — 9 Articles
System information, version details, release notes.

---

## 2. التشغيل (Operations) — 420 Articles

### 2.1 الإيجارات والوحدات (Rentals & Units) — 121 Articles

#### 2.1.1 إدارة وحدات الإيجار (Rental Unit Management) — 17 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| أنواع الوحدات | Rental unit types (e.g., 4×4 cars, apartments) | Name, status, pricing method (daily/hourly/both), taxes, images |
| وحدات الإيجار | Individual rental units | Name, type, status, priority, description, add expenses |
| درجة الأولوية | Unit priority for auto-assignment | Priority 1 = highest, auto-selected first |
| إضافة مصروف لوحدة | Add expense to unit | Track unit-related costs |

#### 2.1.2 إعدادات الإيجارات والوحدات (Rental Settings) — 11 Articles
| Feature (AR) | Description |
|---|---|
| الإعدادات العامة | Enable rental module, draft invoices for bookings, show daily line items |
| إنشاء فواتير مسودة | Create draft invoices for bookings (vs. regular) |
| عرض بنود الفاتورة لكل يوم | Split rental period into daily invoice lines |
| تمكين حجز العميل | Allow customer self-booking online |
| الحالة الأولية لأمر الحجز | Default booking status (confirmed/pending/cancelled/completed) |
| مدفوعات العميل | Enable customer online payment for bookings |
| حقول إضافية للحجوزات | Custom fields for booking orders (drag-and-drop) |
| حقول إضافية للوحدات | Custom fields for rental units |
| حقول إضافية لواجهة المتجر | Fields visible to customers on online store |

#### 2.1.3 أوامر حجز الوحدات (Unit Booking Orders) — 13 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| أمر حجز تلقائي | Auto-booking order | Select unit type, dates, system auto-selects available unit by priority |
| أمر حجز يدوي | Manual booking order | Select specific unit, customer, dates, currency |
| حالات أوامر الحجز | Booking statuses | Confirmed, pending, cancelled, completed |
| تغيير حالة الحجز | Change booking status | Staff confirms/cancels bookings |
| فاتورة تلقائية | Auto-generate invoice | Invoice created with booking |
| وسوم ومرفقات | Tags & attachments | Add tags for search, attachments up to 5MB |

#### 2.1.4 تسعير وحدات الإيجار (Rental Unit Pricing) — 13 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| قواعد التسعير | Pricing rules per unit type | Name, status, currency, pricing method (hourly/daily/both) |
| التسعير بالساعات | Hourly pricing | Set hourly rate, minimum hours |
| التسعير بالأيام | Daily pricing | Set daily rate, check-in/check-out times |
| التسعير بالأيام والساعات | Combined pricing | Daily rate + hourly rate for remaining hours |
| الأسعار الموسمية | Seasonal pricing | Different prices for specific date ranges |
| الفترة الزمنية للحجز | Booking time intervals | 5/15/30/60 minute intervals for start times |
| قاعدة التسعير الموسمية | Seasonal pricing rule | Must match unit type pricing method |

#### 2.1.5 عقود الإيجار (Rental Contracts) — 10 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| عرض عقد إيجار | View rental contract | Details, activity log, installments schedule |
| تفاصيل العقد | Contract details | Terms, dates, parties |
| سجل النشاطات | Activity log | All modifications and actions on contract |
| الأقساط | Installment schedule | Amounts, due dates, payment status per installment |

---

### 2.2 الحجوزات (Bookings) — 9 Articles

| Feature (AR) | Description | Key Operations |
|---|---|---|
| إدارة الحجوزات | General booking management | Create, view, filter bookings |
| حجز العملاء أونلاين | Customer self-booking online | Search available units, select dates, book, pay online |
| البحث عن الوحدات المتاحة | Search available units | Filter by date range, unit type |
| تأكيد الحجز | Confirm booking | Staff approval of customer bookings |
| الدفع أونلاين | Online payment for bookings | Customer pays upon booking |

---

### 2.3 أوامر الشغل (Work Orders) — 65 Articles

#### 2.3.1 إدارة أوامر الشغل (Work Order Management) — 17 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| إنشاء أمر شغل | Create work order | Assign to employee, set priority, status, due date |
| حالات أمر الشغل | Work order statuses | Custom statuses (pending, in-progress, completed, etc.) |
| تصنيف أوامر الشغل | Categorize work orders | By type, priority, department |
| تعيين موظف | Assign employee to work order | Track who's responsible |
| مرفقات وملاحظات | Attachments & notes | Add files, notes, comments |

#### 2.3.2 إعدادات أوامر الشغل (Work Order Settings) — 5 Articles
| Feature (AR) | Description |
|---|---|
| إعدادات عامة | General work order settings |
| حالات مخصصة | Custom statuses for work orders |
| أنواع أوامر الشغل | Work order types |
| قوالب الطباعة | Print templates for work orders |

#### 2.3.3 العمليات على أوامر الشغل (Work Order Operations) — 13 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| تحويل إلى فاتورة | Convert to invoice | Generate sales invoice from work order |
| تغيير الحالة | Change status | Update work order progress |
| إضافة ملاحظة/مرفق | Add note/attachment | Document progress |
| إعادة تعيين | Reset work order | Revert to previous status |
| حذف أمر الشغل | Delete work order | Remove if needed |

---

### 2.4 تتبع الوقت (Time Tracking) — 42 Articles

#### 2.4.1 إعدادات تتبع الوقت (Time Tracking Settings) — 11 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| معدل الساعات للموظفين | Employee hourly rates | Set per-employee hourly cost, currency |
| معدل ساعة الأدمن | Admin hourly rate | Default admin rate for projects |
| النشاطات | Activity types | Categorize time tracking by activity |
| المشاريع | Projects | Create projects, assign employees with custom rates |
| حساب في التقارير المالية | Include in financial reports | Option to show time costs in P&L, expense reports |
| أول يوم في الأسبوع | First day of work week | Customize week start day |
| صلاحيات الموظفين | Employee permissions | Allow employees to track their own time |

#### 2.4.2 إنشاء فاتورة (Create Invoice from Time) — 3 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| فاتورة من تتبع الوقت | Invoice from tracked time | Filter by project/activity/employee/date |
| صيغة مجمعة | Consolidated format | Single line = total hours |
| صيغة مفصلة | Detailed format | Each time entry = separate line |

#### 2.4.3 تتبع الوقت (Time Tracking) — 8 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| إضافة سجل تتبع | Add time tracking entry | Project, activity, employee, hours, notes |
| حاسبة الوقت | Time calculator | Start/stop timer for automatic calculation |
| سجل يومي | Daily time log | View all entries per day |
| سجل أسبوعي | Weekly time log | Weekly overview grid |

---

### 2.5 دورات العمل (Workflows) — 84 Articles

#### 2.5.1 إدارة سجلات دورة العمل (Workflow Record Management) — 14 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| إنشاء مستند دورة عمل | Create workflow document | New document in workflow type |
| حالات المستند | Document statuses | Custom statuses per workflow type |
| إجراءات المستند | Document actions | Custom actions per workflow type |
| ملاحظات ومرفقات | Notes & attachments | Add to workflow documents |

#### 2.5.2 العمليات على مستند في دورة العمل (Document Operations in Workflow) — 13 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| تغيير الحالة | Change document status | Transition between workflow states |
| تنفيذ إجراء | Execute action | Perform workflow action |
| إضافة نموذج ذات صلة | Add related form | Custom form with drag-and-drop fields |
| سجل النشاطات | Activity log | Track all changes to document |

#### 2.5.3 تطبيق الحجوزات السياحية (Tourism Booking App) — 1 Article
| Feature | Description |
|---|---|
| حجوزات سياحية | Tourism booking workflow application |

#### 2.5.4 تطبيق الشحن (Shipping App) — 5 Articles
| Feature | Description |
|---|---|
| إدارة الشحن | Shipping workflow management |
| تتبع الشحنات | Shipment tracking |
| حالات الشحن | Shipping statuses |

#### 2.5.5 تطبيق خطوط السير للمناديب (Sales Rep Routes) — 1 Article
| Feature | Description |
|---|---|
| خطوط سير المناديب | Sales representative route planning & tracking |

#### 2.5.6 نوع دورة العمل (Workflow Types) — 17 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| إنشاء نوع دورة عمل | Create workflow type | Name, custom fields, statuses, actions |
| الحالات والإجراءات | Statuses & actions | Define workflow states and transitions |
| الحقول الإضافية | Custom fields | Drag-and-drop field builder (text, dropdown, date, email, map, etc.) |
| النماذج ذات الصلة | Related forms | Custom sub-forms with permissions (add/edit/view/delete) |
| صلاحيات دورة العمل | Workflow permissions | Per-branch, per-department, per-role permissions |
| قوالب الطباعة | Print templates | Custom print designs for workflow documents |
| مصمم النماذج | Form designer | Visual drag-and-drop form builder |
| إدارة قوالب الطباعة للنماذج | Print template management for forms | Custom print output for related forms |

---

### 2.6 PNR — 36 Articles

#### 2.6.1 إدارة الـ PNR (PNR Management) — 6 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| إنشاء PNR | Create PNR record | Passenger Name Record for travel bookings |
| إدارة PNR | Manage PNR records | View, edit, status tracking |

#### 2.6.2 إدارة ملفات الحجز (Booking File Management) — 13 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| ملفات الحجز | Booking files | Manage travel reservation details |
| ربط بالعملاء | Link to customers | Associate PNR with customer records |
| حالات الحجز | Booking statuses | Track reservation states |

---

## 3. التقارير (Reports) — 237 Articles

### 3.1 تقارير الـ PNR (PNR Reports) — 2 Articles
| Report | Description |
|---|---|
| تقرير PNR | PNR booking report |

### 3.2 تقارير الـ SMS (SMS Reports) — 2 Articles
| Report | Description |
|---|---|
| تقرير الرسائل النصية | SMS delivery and usage report |

### 3.3 تقارير التصنيع (Manufacturing Reports) — 1 Article
| Report | Description |
|---|---|
| تقرير التصنيع | Manufacturing/production report |

### 3.4 تقارير الحسابات العامة (General Accounting Reports) — 58 Articles

#### 3.4.1 تقارير الحسابات (Account Reports) — 16 Articles
| Report (AR) | Description | Key Features |
|---|---|---|
| قائمة الدخل (مستحق/نقدي) | Income Statement (Accrual/Cash) | Monthly/quarterly/annual, by branch, by cost center |
| الميزانية العمومية | Balance Sheet | Filter by period, branch, cost center, account levels |
| التدفقات النقدية | Cash Flow Statement | Operations/Investing/Financing, customizable categories |
| دليل الحسابات | Chart of Accounts report | Full or per-account report |
| الربح والخسارة | Profit & Loss (monthly/quarterly/annual) | Accrual or cash basis, branch filtering |
| ميزان المراجعة (مجاميع وأرصدة) | Trial Balance (Totals & Balances) | By account level, by branch |
| ميزان المراجعة (أرصدة فقط) | Trial Balance (Balances Only) | By account level, by branch |
| حساب الأستاذ | General Ledger | Per-account detail, filter by cost center (including "without cost center") |

#### 3.4.2 تقارير القيود اليومية (Journal Entry Reports) — 10 Articles
| Report (AR) | Description |
|---|---|
| تقرير القيود اليومية | Journal entries report by date range, branch |
| قيود اليومية التفصيلية | Detailed journal entry report |

#### 3.4.3 تقارير المصاريف المقسمة (Split Expense Reports) — 2 Articles
| Report | Description |
|---|---|
| المصاريف المقسمة | Expenses split by installment periods |

#### 3.4.4 تقارير المصروفات حسب المدة الزمنية (Expenses by Time Period) — 2 Articles
| Report | Description |
|---|---|
| المصروفات بالمدة الزمنية | Expense reports filtered by time period |

#### 3.4.5 تقرير سندات القبض المقسمة (Split Receipt Reports) — 2 Articles
| Report | Description |
|---|---|
| سندات القبض المقسمة | Receipt vouchers split by installment |

#### 3.4.6 تقرير سندات القبض بالمدة الزمنية (Receipts by Time Period) — 2 Articles
| Report | Description |
|---|---|
| سندات القبض بالمدة | Receipt vouchers filtered by time period |

#### Additional Accounting Reports
| Report | Description |
|---|---|
| تقرير الضرائب | Tax report by type, period (issued vs. paid) |
| الإقرار الضريبي | Tax declaration (quarterly VAT return) |
| بطاقة ضريبية للمورد | Supplier tax number in expense tax report |
| إهلاك الأصول | Asset depreciation report |

### 3.5 تقارير الشيكات (Check Reports) — 2 Articles
| Report | Description |
|---|---|
| تقرير الشيكات | Check tracking report (received/paid, status, dates) |

### 3.6 تقارير العملاء (Customer Reports) — 11 Articles
| Report | Description |
|---|---|
| أرصدة العملاء | Customer balances/aging report |
| كشف حساب العميل | Customer account statement |
| حركات العملاء | Customer transaction history |

### 3.7 تقارير المبيعات (Sales Reports) — 84 Articles

#### 3.7.1 أرباح مبيعات الأصناف (Product Sales Profits) — 4 Articles
| Report | Description |
|---|---|
| أرباح مبيعات الأصناف | Profit by product/category |

#### 3.7.2 تقارير اضافية (Additional Reports) — 2 Articles
| Report | Description |
|---|---|
| تقارير مبيعات إضافية | Extra sales analytics |

#### 3.7.3 تقارير الربح حسب الفترة (Profit by Period) — 3 Articles
| Report | Description |
|---|---|
| الربح حسب الفترة | Profit report by time period |

#### 3.7.4 تقارير الفواتير حسب المدة الزمنية (Invoices by Time Period) — 6 Articles
| Report | Description |
|---|---|
| الفواتير بالمدة الزمنية | Invoice reports filtered by period |

#### 3.7.5 تقارير المدفوعات المقسمة (Split Payment Reports) — 5 Articles
| Report | Description |
|---|---|
| المدفوعات المقسمة | Payments split by installments |

#### 3.7.6 تقارير المدفوعات بالمدة الزمنية (Payments by Time Period) — 4 Articles
| Report | Description |
|---|---|
| المدفوعات بالمدة | Payment reports by time period |

#### 3.7.7 تقارير مبيعات البنود المقسمة (Split Item Sales) — 6 Articles
| Report | Description |
|---|---|
| مبيعات البنود المقسمة | Item sales split by period |

#### 3.7.8 تقارير مبيعات المنتجات بالمدة الزمنية (Product Sales by Time) — 6 Articles
| Report | Description |
|---|---|
| مبيعات المنتجات بالمدة | Product sales filtered by time period |

#### 3.7.9 تقارير متابعة الفواتير المقسمة (Invoice Tracking Split) — 6 Articles
| Report | Description |
|---|---|
| متابعة الفواتير المقسمة | Invoice tracking and follow-up |

#### Additional Sales Reports
| Report | Description |
|---|---|
| المبيعات حسب المندوب | Sales by sales representative |
| نوع الفاتورة وحالة الدفع | Invoice type & payment status report |
| مبيعات يومية | Daily sales report |
| مبيعات شهرية | Monthly sales report |

### 3.8 تقارير المخزون (Inventory Reports) — 9 Articles
| Report | Description |
|---|---|
| تقرير المخزون | Inventory level report |
| حركة المخزون | Stock movement report |
| تقرير الجرد | Inventory count/audit report |

### 3.9 تقارير المشتريات (Purchase Reports) — 35 Articles

#### 3.9.1 تقارير المدفوعات بالمدة الزمنية (Payment by Time) — 4 Articles
| Report | Description |
|---|---|
| مدفوعات المشتريات بالمدة | Purchase payments by time period |

#### 3.9.2 تقارير الموردين (Supplier Reports) — 6 Articles
| Report | Description |
|---|---|
| أرصدة الموردين | Supplier balance/aging report |
| كشف حساب المورد | Supplier account statement |

#### 3.9.3 تقارير متابعة المشتريات المقسمة (Purchase Tracking Split) — 2 Articles
| Report | Description |
|---|---|
| متابعة المشتريات المقسمة | Purchase tracking by installment |

#### 3.9.4 تقارير مشتريات المنتجات (Product Purchase Reports) — 3 Articles
| Report | Description |
|---|---|
| مشتريات المنتجات | Product purchase report |

### 3.10 تقارير الموظفين (Employee Reports) — 28 Articles

#### 3.10.1 تقارير الحضور (Attendance Reports) — 4 Articles
| Report | Description |
|---|---|
| تقرير الحضور | Attendance report |
| تقرير الانصراف | Departure report |

#### 3.10.2 تقارير المرتبات (Salary Reports) — 3 Articles
| Report | Description |
|---|---|
| تقرير المرتبات | Payroll report |

#### 3.10.3 تقارير الموظفين (Employee Reports) — 5 Articles
| Report | Description |
|---|---|
| تقرير الموظفين | Employee information report |

#### 3.10.4 ملخص تقارير الحضور (Attendance Summary) — 2 Articles
| Report | Description |
|---|---|
| ملخص الحضور | Attendance summary report |

### 3.11 تقارير النقاط والأرصدة (Points & Balance Reports) — 2 Articles
| Report | Description |
|---|---|
| تقرير النقاط والأرصدة | Customer points and credit balance report |

### 3.12 سجل النشاطات للحساب (Account Activity Log) — 3 Articles
| Report | Description |
|---|---|
| سجل النشاطات | System activity log with filters |
| النشاط الحالي | Recent activity on dashboard |
| فلترة حسب التاريخ/المستخدم/الوحدة | Filter by date, user, unit |

### Report Export Capabilities
All reports support:
- **تصدير إلى إكسيل** (Excel export)
- **تصدير إلى CSV** (CSV export)
- **تصدير إلى PDF** (PDF export)
- **طباعة مباشرة** (Direct print)

---

## 4. الحسابات (Accounting) — 480 Articles

### 4.1 الحسابات العامة (General Accounting) — 226 Articles

#### 4.1.1 إعدادات الحسابات العامة (General Accounting Settings) — 45 Articles

##### السنوات المالية (Fiscal Years) — 4 Articles
| Feature | Description | Key Operations |
|---|---|---|
| إنشاء سنة مالية | Create fiscal year | Set start/end dates |
| إقفال السنة المالية | Close fiscal year | Lock period, auto-generate closing entries |
| إعادة فتح السنة | Reopen fiscal year | Reverse closing if needed |

##### الفترات المقفلة (Closed Periods) — 4 Articles
| Feature | Description | Key Operations |
|---|---|---|
| إقفال فترة | Close accounting period | Prevent edits in closed period |
| فتح فترة | Reopen period | Allow modifications |

##### توجيه الحسابات (Account Routing) — 16 Articles
| Feature | Description | Key Operations |
|---|---|---|
| توجيه حسابات المبيعات | Sales account routing | Map sales transactions to GL accounts |
| توجيه حسابات المشتريات | Purchase account routing | Map purchase transactions to GL accounts |
| توجيه حسابات المخزون | Inventory account routing | Map stock movements to GL accounts |
| توجيه حسابات الموظفين | HR account routing | Map payroll to GL accounts |
| توجيه حسابات الضرائب | Tax account routing | Map taxes to GL accounts |
| توجيه حسابات النظام | System account routing | Auto-assign accounts for system-generated entries |

##### عام (General) — 4 Articles
| Feature | Description |
|---|---|
| إعدادات عامة | Default currency, rounding rules, auto-numbering |

#### 4.1.2 الأصول (Fixed Assets) — 22 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| إضافة أصل ثابت | Add fixed asset | Name, purchase price, cash account, useful life, depreciation method |
| طرق الإهلاك | Depreciation methods | Straight-line, declining balance, other methods |
| شراء أصل بالتقسيط | Installment purchase | Link to supplier, recurring payment schedule |
| استيراد الأصول بالإكسيل | Import assets from Excel | CSV format, field mapping, batch upload |
| إهلاك تلقائي | Auto-depreciation | System calculates and posts depreciation entries |
| بيع الأصل | Asset disposal | Record sale, calculate gain/loss |

#### 4.1.3 دليل الحسابات (Chart of Accounts) — 16 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| 5 حسابات أساسية | 5 root account types | Assets (1), Liabilities (2), Equity (3), Revenue (4), Expenses (5) |
| شجرة الحسابات | Account tree structure | Multi-level hierarchy (main → sub → leaf) |
| حساب رئيسي vs فرعي | Main vs. sub-accounts | Main = folder (can have children), Sub = leaf (posts transactions) |
| إضافة حساب جديد | Add new account | Type, code, name, parent, debit/credit nature |
| تعديل/حذف حساب | Edit/delete account | Cannot delete accounts with transactions |
| تعيين مركز تكلفة | Assign cost center | Link account to cost center, set percentage, auto-assignment |
| إنشاء تلقائي للحسابات | Auto-create GL accounts | Customers, suppliers, banks, warehouses, assets, taxes auto-create accounts |
| أرصدة الحسابات | Account balances | Real-time debit/credit balances displayed |
| تقرير الحساب | Per-account report | Detailed transaction report for any account |

#### 4.1.4 قيود اليومية (Journal Entries) — 37 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| إضافة قيد يدوي | Manual journal entry | Multi-line debit/credit entry |
| قيود آلية | Auto journal entries | System-generated from invoices, payments, etc. |
| استيراد من إكسيل | Import from Excel | Copy from spreadsheet, paste into journal entry |
| نسخ من جدول البيانات | Paste from spreadsheet | Bulk import journal entry lines |
| ربط بفاتورة/معاملة | Link to source transaction | Reference back to originating document |
| مرفقات القيد | Entry attachments | Attach supporting documents |
| مركز التكلفة | Cost center assignment | Assign cost center per line |
| تكرار القيد | Recurring journal entries | Auto-generate on schedule |
| عكس القيد | Reverse entry | Create reversal entry |

#### 4.1.5 مراكز التكلفة (Cost Centers) — 18 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| إنشاء مركز تكلفة | Create cost center | Name, parent, percentage allocation |
| مراكز تكلفة هرمية | Hierarchical cost centers | Parent-child structure with allocation % |
| ربط بالحسابات | Link to GL accounts | Auto-assign cost center to account transactions |
| تقرير مراكز التكلفة | Cost center reports | Track expenses/revenue by cost center |
| حسابات بدون مراكز تكلفة | Accounts without cost centers | Find unassigned transactions |

---

### 4.2 المالية (Financial) — 140 Articles

#### 4.2.1 المصروفات (Expenses) — 28 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| إضافة مصروف | Add expense | Amount, currency, category, supplier, taxes, cash account, cost center |
| سند صرف | Payment voucher | Record outgoing payments |
| مصروف متكرر | Recurring expense | Auto-generate on schedule (installments, rent, etc.) |
| استيراد المصروفات بالإكسيل | Import expenses from Excel | CSV upload with field mapping |
| تصنيف المصروفات | Expense categorization | Organize by type, department |
| ربط بالضرائب | Tax linking | Apply taxes to expenses |
| مرفقات المصروف | Expense attachments | Upload receipts/invoices |

#### 4.2.2 خزائن وحسابات بنكية (Cash Vaults & Bank Accounts) — 28 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| إضافة خزينة | Add cash vault | Name, status, GL account link, permissions (deposit/withdraw/view) |
| إضافة حساب بنكي | Add bank account | Name, account number, IBAN, GL account link |
| تحويل بين الخزائن | Transfer between vaults | Move funds between cash vaults |
| تحويل بين الحسابات البنكية | Transfer between bank accounts | Inter-bank transfers |
| استيراد كشف حساب البنك | Import bank statement | Upload CSV, auto-match transactions |
| مطابقة كشف الحساب | Bank reconciliation | Match bank statement with system transactions |
| كشف حساب البنك | Bank statement view | Red=withdrawals, Green=deposits |
| معاملات النظام | System transactions view | All transactions linked to bank account |
| إضافة سند صرف/قبض أثناء المطابقة | Add voucher during reconciliation | Create missing transactions inline |
| صلاحيات الخزينة | Vault permissions | Per-employee: deposit, withdraw, view |
| ربط وسيلة الدفع بخزينة | Link payment method to vault | Auto-select vault by payment method |
| حساب مصاريف الدفع | Payment method fees | Fees + taxes per payment method |

#### 4.2.3 سندات القبض (Receipt Vouchers) — 21 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| إضافة سند قبض | Add receipt voucher | Amount, customer, currency, cash account, cost center, taxes |
| ربط بالفاتورة | Link to invoice | Apply receipt to specific invoice |
| سند قبض متكرر | Recurring receipt voucher | Auto-generate on schedule |
| استيراد سندات القبض بالإكسيل | Import from Excel | CSV upload with field mapping |
| تصميم سند قبض | Receipt voucher print template | Custom print design |

---

### 4.3 دورة الشيكات (Check Cycle) — 46 Articles

#### 4.3.1 إدارة الشيكات المدفوعة (Paid Checks Management) — 10 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| إضافة شيك مدفوع | Add paid check (outgoing) | Check number, amount, bank, due date, beneficiary |
| حالات الشيك المدفوع | Paid check statuses | Issued, pending, cleared, bounced, cancelled |
| تحصيل الشيك | Clear check | Mark as cleared when bank processes |
| ارتداد الشيك | Bounce check | Record bounced check, auto-reversal |

#### 4.3.2 إدارة الشيكات المستلمة (Received Checks Management) — 9 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| إضافة شيك مستلم | Add received check (incoming) | Check number, amount, bank, due date, customer |
| حالات الشيك المستلم | Received check statuses | Received, deposited, cleared, bounced |
| إيداع الشيك | Deposit check | Send to bank for clearing |
| ارتداد الشيك المستلم | Bounce received check | Record return, update customer balance |

#### 4.3.3 إدارة دفاتر الشيكات (Check Book Management) — 7 Articles
| Feature (AR) | Description | Key Operations |
|---|---|---|
| إضافة دفتر شيكات | Add check book | Bank, starting number, ending number, status |
| تتبع أرقام الشيكات | Track check numbers | Sequential usage tracking |
| ربط بالحساب البنكي | Link to bank account | Associate check book with specific bank |

---

## 5. Payment Gateway Integrations (Summary)

| Gateway | Type | Region | Key Features |
|---|---|---|---|
| **Tabby** | BNPL | GCC | Buy now pay later, no fees/interest |
| **Tamara** | BNPL | GCC/Saudi | API Key + Notification Token + Public Key |
| **Stripe** | Card Processing | Global | International card payments |
| **Tap** | Payment Gateway | MENA | Regional payment methods |
| **2Checkout** | Payment Gateway | Global | International processing |
| **Paymob** | Payment Gateway | Egypt | Egyptian payment methods |
| **Paytabs** | Payment Gateway | MENA | Middle East focused |
| **PayPal** | Wallet | Global | Global digital wallet |

---

## 6. E-Commerce Platform Integrations (Summary)

| Platform | Sync Capabilities | Sync Period |
|---|---|---|
| **Zid (زِد)** | Bidirectional product & order sync, branch/warehouse mapping | Last 12 months |
| **Shopify** | Product & invoice sync, default warehouse/branch/customer | Last 2 months |
| **Salla (سلة)** | Order & product sync, inventory movements | Recent data |
| **WooCommerce** | Invoice & item sync, bidirectional, warehouse-level | Last 2 months |
| **Rasd (رصد)** | Platform data synchronization | Recent data |

---

## 7. Mobile & Desktop Applications

| Application | Platform | Key Features |
|---|---|---|
| تطبيق تسجيل الحضور ESS | Mobile | Employee self-service attendance |
| تطبيق تسجيل المصروفات السريع | Mobile | Quick expense recording |
| تطبيق جرد المخزون | Mobile | Inventory count/stocktake |
| تطبيق دفترة العام | Mobile | General Daftra mobile app |
| تطبيق نقاط البيع - سطح المكتب | Desktop (Windows) | Full POS system, offline capability, receipt printing |
| تطبيق نقاط البيع - للجوال | Mobile | Mobile POS |
| تطبيق قارئ الفاتورة الإلكترونية | Mobile | E-invoice QR scanner |
| برنامج إعدادات الطباعة المتعددة | Desktop (Windows) | Multi-printer management, auto-print to kitchen/cashier |

---

## 8. E-Invoice Compliance

| Country | Standard | Description |
|---|---|---|
| السعودية (Saudi Arabia) | فاتورة إلكترونية | ZATCA e-invoicing (Phase 1 & 2) — 25 articles |
| مصر (Egypt) | فاتورة إلكترونية | Egyptian e-invoice integration — 11 articles |
| الأردن (Jordan) | فاتورة إلكترونية أردنية | Jordanian Income & Sales Tax Dept — 3 articles |

---

## Key Takeaways for ERP Development Planning

1. **Massive Feature Breadth**: Daftra covers 10+ major modules with deep sub-features in each
2. **Industry-Specific Workflows**: Custom workflow engine supports tourism, shipping, car rental, real estate, legal, medical, etc.
3. **Strong Localization**: Multi-country e-invoicing (Saudi, Egypt, Jordan), Arabic-first UI, GCC payment gateways
4. **Extensive Integration Ecosystem**: 4 e-commerce platforms, 7+ payment gateways, SMS providers, email (SMTP)
5. **Customization Depth**: Custom fields on virtually every entity, print template designer, workflow builder with drag-and-drop forms
6. **Financial Rigor**: Full double-entry accounting, cost centers, fiscal year management, bank reconciliation, check lifecycle management
7. **Rental/Booking System**: Unique differentiator — comprehensive rental unit management with seasonal pricing, priority-based auto-assignment, online customer self-booking
8. **Time Tracking → Billing**: Track time on projects/activities and directly invoice from tracked hours
9. **Report System**: 237+ report articles covering every module with Excel/CSV/PDF export
10. **Multi-Branch**: Full branch management with inter-branch transfers and per-branch permissions

