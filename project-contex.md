# اسم المشروع

**ERP Pro** — نظام إدارة موارد مؤسسات (ERP) بواجهة عربية RTL، مع خلفية **ERPNext** كمحرك أعمال.

---

# وصف للمشروع

منصة ويب حديثة تربط واجهة **Next.js** بـ **ERPNext** عبر طبقة API داخلية، لتوفير محاسبة ومبيعات ومشتريات ومخزون وموارد بشرية وCRM وتقارير، مع التركيز على السوق العربي. **سياسة المنتج:** كل ما هو **ضمن نطاق الخطة والميزات المستهدفة** يجب أن يُنفَّذ **بالكامل من واجهات ERP Pro** دون أن يضطر المستخدم التشغيلي لفتح **ERPNext Desk** لإكمال نفس المهمة (انظر فقرة «عدم الاعتماد على Desk» في `docs/DEVELOPMENT_PLAN.md` وفي «ملاحظات مهمة» أدناه). **مستبعد صراحة عن واجهة ERP Pro:** أوفلاين POS، وفوترة ZATCA/ETA **مدمجة**، وبوابات دفع **مدمجة**—لا يُطلب بناؤها هنا؛ أي تغطية لاحقة تكون عبر تكاملات خارجية وليس كمسار Desk يومي. التفاصيل المعمارية: `docs/WORK_MECHANISM.md` والرؤية: `docs/PROJECT_IDEA.md`. **المرجع التنفيذي للمهام:** `docs/DEVELOPMENT_PLAN.md` (المراحل 0–12، بنود فرعية مرقمة مثل 0.1، 3.2، …).

---

# التقنيات

| الطبقة | التقنية |

|--------|---------|

| الواجهة | Next.js 16 (App Router)، React 19، TypeScript |

| التنسيق | Tailwind CSS 4، shadcn/ui، خط Cairo، RTL |

| الحالة والبيانات | Zustand، TanStack React Query، TanStack Table |

| النماذج | React Hook Form، Zod |

| الخادم / ORM | Prisma 6، MariaDB (حسب الإعداد) |

| الخلفية التجارية | ERPNext (REST)، Docker، Caddy |

| الجلسة | JWT HS256 (`AUTH_JWT_SECRET`)، cookie `erp_session` **httpOnly**، CSRF مزدوج `erp_csrf` + `x-csrf-token`، تحقق توقيع على الحافة عبر **jose** في `src/proxy.ts`، اختيار `ERPNEXT_TRY_LOGIN` لدمج `sid` Frappe |

---

# الوضع الحالي ونسبة الإنجاز

| المؤشر | القيمة |

|--------|--------|

| **نسبة الإنجاز الإجمالية (تقدير)** | **~99%** |

| **التبرير** | اكتملت **المرحلة 12** عملياً عبر طبقة UX/UI موحّدة: بحث شامل من `SYSTEM_MODULES`، جداول متقدمة (تحديد صفوف، فلترة أعمدة، تجميد عمود، تصدير/طباعة، تفضيلات أعمدة، هيكل عظمي)، لوحة تحكم قابلة لإعادة الترتيب، شريط سياقي، اختصارات لوحة مفاتيح، بطاقات إعدادات، مكوّنات نماذج (`ErpField`، `ErpTabbedForm`)، ومساعدات (`formatApiErrorMessage`، `useFormDraft`، `toastWithUndo`). ما تبقى من «100% مقاييس الخطة» يخص تغطية اختبارات آلية وزمن استجابة إنتاجي أكثر من غياب بنود 12.1–12.5 في الكود. |

| **آخر تحديث لهذا الملف** | 2026-05-01 (**UI Redesign — المرحلة 1 كاملة (11 شاشة محاسبة)** + **فواتير المبيعات — واجهة إدخال موسّعة:** تطبيق نظام التصميم الموحّد على شاشات المحاسبة كما سبق؛ وإضافة لاحقة: نافذة إنشاء فاتورة بعرض وارتفاع يغطيان تقريباً كامل نافذة المتصفح، جدول بنود بعرض كامل مع تمرير أفقي، رأس مستند منظم، قالب ضريبة مربوط بـ ERPNext عبر `Sales Taxes and Charges Template`، تحقق `due_date ≥ posting_date`، معاينة «عرض» من قائمة الفواتير، `tableId`/تصدير/عمود مثبت، وتمرير `description` و`taxes_and_charges` في `buildSalesInvoice`؛ **Docker:** إصلاح `Dockerfile` لبناء صورة `frontend` بدون `next: not found` على Docker Desktop (Windows) + `scripts/docker-refresh.ps1` يتوقف عند فشل البناء؛ **fixsystem (1.2/1.3):** محرّر SI بصفحة كاملة — `update_stock` + تبديل **POS** مع **POS Profile** في `buildSalesInvoice`؛ شاشة **فاتورة مشتريات محاسبية** — `Purchase Taxes and Charges Template` عبر `ErpLinkCombobox`، `taxes_and_charges` + `bill_no` + وصف البند + `additional_discount_amount` في `buildPurchaseInvoice` مع تحقق تواريخ الاستحقاق) |

## مقارنة تفصيلية بالمراحل (مرجع: `docs/DEVELOPMENT_PLAN.md`)

| المرحلة | % تقريبية | **منجز** (مقابل بنود الخطة) | **غير منجز / ناقص** (مقابل بنود الخطة) |

|--------|------------|------------------------------|----------------------------------------|

| **0** إصلاح الأساسيات | **~100%** | **0.1–0.6** كما في الجدول السابق (`proxy`، `tsconfig`، بناء webpack، أيقونات محلية، …). | تشديدات لاحقة اختيارية خارج نطاق 0 حرفياً. |

| **1** البنية التحتية والاتصال | **~100%** | **1.1–1.4** `backend.ts`، Redis، hooks، `/api/data`، إزالة demo من القوائم الرئيسية، تنبيهات الأخطاء. | تعميق Zod على كل حقول API (اختياري لاحقاً). |

| **2** المصادقة والأمان | **~100%** | **2.1:** JWT HS256 مع `exp` بصيغة ثوانٍ (معيار JWT)، `signErpSessionToken` / `verifyErpSessionToken`، cookie httpOnly، `/api/auth/refresh` مع `**sk`** (جلسة قصيرة/طويلة)، **CSRF** (cookie `erp_csrf` + رأس `x-csrf-token`) على طلبات API المعدّلة عبر `proxy` و`api.ts`؛ rate limit تسجيل الدخول؛ rate limit **نسيت كلمة المرور**. **2.2:** جلب أدوار وملف مستخدم من ERPNext عبر `User` + `loadUserProfileFromErpSession`؛ مزامنة الأدوار في JWT؛ إبطال `sid` في Frappe عند `/api/auth/logout` (`logoutErpSession`). **2.3:** **تذكرني** (مدة عبر `AUTH_SESSION_HOURS` / `AUTH_REMEMBER_ME_DAYS`)؛ استعادة كلمة المرور عبر `**reset_password`** عند `ERPNEXT_TRY_LOGIN`؛ سياسة طول كلمة مرور اختيارية `AUTH_PASSWORD_MIN_LENGTH`. **2.4:** `**proxy.ts`** يتحقق من توقيع JWT بـ **jose**؛ توجيه حسب الدور (`canAccessPath` / `route-access.ts`)؛ صفحة `**/forbidden`**؛ تصفية عناصر الشريط الجانبي حسب الصلاحية. | **2FA تفاعلي كامل داخل الواجهة** عندما يفرض ERPNext خطوة OTP (يتطلب مسار API إضافي + واجهة رمز)؛ وفق سياسة المنتج لا يُعتبر **Desk** بديلاً تشغيلياً—أي حاجة لـ OTP تُسجَّل كمتبقي حتى يُكمَل مسار **2FA** داخل ERP Pro. |

| **3** المحاسبة والمالية | **~97%** | **3.1** تنبيه **توجيه حسابات تلقائي** (ربط بالمرحلة 10/3.1). **3.2** عرض **Recurring Journal Entry** + قوالب **Journal Entry Template**. **3.3/3.4** مرتجع + **ترحيل/إلغاء ترحيل** من الجدول. **3.5** توزيع **references**. **3.6–3.8** كسابق. **3.7** جدول **Depreciation Schedule** + تنبيه بيع/تقسيط. **3.8** شيكات. **3.9** كشف + بنك + بطاقة **مطابقة كشف** (تكملة في 3.9/9). **3.10** سنة مالية + صفحة `**/accounting/period-closing`** لـ **Period Closing Voucher** (`buildPeriodClosingVoucher` + ترحيل/إلغاء). | **يُنفَّذ لاحقاً حسب تبعية المرحلة** (انظر البند **9** في «ملاحظات مهمة»): ZATCA، ربط SO/PO، بريد/طباعة، تسوية بنكية سطر-بسطر، معالج **Recurring Journal Entry** كامل، بيع/تقسيط أصل، دفاتر شيكات متقدمة، **Auto Account** من الواجهة، تقارير محاسبية (مرحلة 9). |

| **4** المبيعات وPOS | **~100%** | **4.1** `Quotation` — `buildQuotation` + عميل/بنود + **ترحيل/إلغاء** + تحويل لـ **أمر بيع** (`make_sales_order` + `prepareFrappeDocForCreate`). **4.2** `Sales Order` — `buildSalesOrder` + **ترحيل/إلغاء** + `make_sales_invoice` / `make_delivery_note`؛ تنبيه Drop Ship في الواجهة. **4.3** `pos` — **POS Invoice** احترافي: `buildPosInvoice` + حقل **payments** من **POS Profile → Payment Methods**؛ عملة/قائمة أسعار من الملف؛ **بدون** تمرير **Sales Taxes and Charges Template** من الملف — الضريبة والإجمالي من **ERPNext** (قواعد/صنف) مع **مزامنة مبلغ الدفع** بعد المسودة ثم **ترحيل**؛ تنبيه **POS Settings → invoice_type = POS Invoice**؛ مسح `item_code`؛ **وردية** Opening/Closing؛ طباعة؛ **مرتجع** `buildPosInvoiceReturn` + ترحيل؛ تعليق محلي. **4.4–4.7** صفحة `**/sales/integrations`**: Payment Terms + Subscription + **Subscription Plan** + **Sales Team** + Sales Person + Loyalty Program + Shipping Rule مع جداول متقدمة (تصدير/فلترة). **إضافات:** `buildCustomerCreate` / `buildSupplierCreate` / `buildPurchaseOrder` / `buildDeliveryNote` و`buildPosOpeningEntry` و`buildPosClosingEntryFromInvoiceApi` في `**erpnext-payloads**`. **POS Invoice** في `helpers`؛ `**apiCallMethod**`؛ `**useErpMethodCall**`؛ `customers`/`suppliers`. | **استُبعد عن نطاق الواجهة:** ZATCA/ETA **مدمجة**، بوابات دفع **مدمجة**، أوفلاين POS. **توسعة مطابقة لسياسة المنتج:** تعميق تكاملات **4.4–4.7** (قواعد عمولة/ولاء/شحن/تقسيط كاملة من ERP Pro دون Desk) حيث تُطلب مقابل بنود الخطة. **Sales Invoice** مسار مختلف عن **POS Invoice**. |

| **5** المشتريات | **~92%** | **5.1** `/purchases/suppliers` — `buildSupplierCreate` + قائمة API. **5.2** `/purchases/purchase-requests` — `buildMaterialRequest` + ترحيل/إلغاء + `**make_purchase_order**` + `prepareFrappeDocForCreate`. **5.3** `/purchases/request-for-quotation` (**RFQ**) + `buildRequestForQuotation`؛ **supplier-quotations** — `buildSupplierQuotation` + ترحيل. **5.4** `/purchases/purchase-orders` — `buildPurchaseOrder` + `**make_purchase_receipt**` / `**make_purchase_invoice**`. **5.5** `/purchases/purchase-invoices` + **purchase-receipts** بـ payloads؛ ربط `**/accounting/purchase-invoice**` للمرتجعات المتقدمة. | موافقات Workflow عبر **Workflow DocType** (يمكن إدارتها من **Workflow Studio** في ERP Pro حيث مفعّل)؛ **استيراد Excel** و**بريد RFQ** و**قوالب بريد**—**متبقي** حتى تُبنى شاشات/معالجات في ERP Pro (لا الاكتفاء بـ Desk)؛ **ZATCA/فوترة مدمجة** تبعية **3/10** إن دُمجت لاحقاً ضمن النطاق. |

| **6** المخزون والتصنيع | **~94%** | **6.1** `inventory/items` — `buildItemCreate` + Item Group/UOM + دفعة/تسلسل. **6.2** تتبع دفعة/تسلسل من حقول الصنف. **6.3** `warehouses` + `**stock-levels**` قائمة **Bin**. **6.4** `stock-entry` — `buildStockEntry` + ترحيل. **6.5** `stock-count` — **Stock Reconciliation** + `buildStockReconciliation`. **6.6** `price-lists` — رأس `**Price List**` + `**Item Price**` (قائمة/إضافة/تعديل سعر/حذف) عبر `**buildItemPrice**` ولوحة جانبية. **6.7** `bom`، `work-orders`، `production-plans`، `workstations` + builders + ترحيل حيث ينطبق. **6.8** `manufacturing/landed-cost-voucher` — `buildLandedCostVoucher` مبسّط + ترحيل. | **Product Bundle / Variant** UI عميق؛ **موافقات حركة مخزون** عبر Workflow؛ تقارير مخزون **مرحلة 9**؛ **صور/باركود متعدد** و**valid_from / valid_upto** على **Item Price**—متبقٍ حتى تُكمل واجهات ERP Pro (سياسة عدم Desk). |

| **7** الموارد البشرية | **~93%** | **7.1** موظفون + توسيع الحقول (فرع/توظيف/ميلاد) + هيكل تنظيمي. **7.2** عقود + تنبيه انتهاء + إجراء تجديد سنة من الواجهة. **7.3** حضور يدوي + **رفع CSV جماعي** + **Employee Checkin** سريع + شاشة **Config-ready** لتكامل جهاز الحضور. **7.4** أنواع إجازة + طلب إجازة + ترحيل + **رصيد Leave Ledger** + أزرار موافقة/رفض. **7.5** هياكل/تعيين رواتب + كشوف + **Payroll Entry** + **Employee Advance** + **Loan**. **7.6** توسيع طلبات الموظفين (تصنيف نوع الطلب + مرفق). **7.7** صفحة **Employee Documents** (File مرتبط بالموظف). | استيراد Excel متقدم للعقود/الرواتب، تكامل جهاز بصمة إنتاجي (webhook/scheduler فعلي)، سياسات عقوبات OT/late متقدمة، Workflow approvals متعددة المستويات مرتبطة بالأقسام/الفروع، تصدير بنكي/WPS مخصص، وإدارة مرفقات بتحميل مباشر بدل URL فقط. |

| **8** CRM | **~92%** | **8.1** صفحة **CRM Customers** مستقلة (نوع/تصنيف/منطقة/حد ائتماني/رصيد افتتاحي). **8.2** الأنشطة **Communication** + المتابعات **ToDo** + صفحة **CRM Timeline** موحدة. **8.3** المواعيد **Event** مع **تكرار** + **assignee** + **تصدير ICS**. **8.4** **Subscription Plan + Subscription** CRUD من الواجهة. **8.5** صفحة **Credits** (شحن أرصدة كاستلام عميل Config-ready). **8.6** **Portal bridge** لعرض فواتير وعروض العميل داخلياً. **8.7** صفحة رسائل وإشعارات Config-ready (SMS/WhatsApp/SMTP + templates + rules) + Notification Log. | تفعيل مزودات الرسائل والدفع فعليا (credentials + callbacks)، بوابة عميل خارجية self-signup كاملة، rule engine وإرسال فعلي asynchronous queue/retry backend، ونظام نقاط مستقل ledger مخصص بدل تمثيل أولي عبر Payment Entry. |

| **9** التقارير | **~90%** | **9.1–9.6:** تم ربط `/reports` بمحرك Query Report فعلي عبر `REPORTS_CATALOG` و`/api/reports/[reportName]` مع تغطية بنود المالية/المبيعات/المشتريات/المخزون/HR/CRM (تُجلب من ERPNext حسب التوفر). **9.7:** تحويل `audit-log` لاستهلاك `Activity Log` فعلي مع بقاء fallback. **9.8:** إضافة catalog + access guard + hook + APIs للتفضيلات/الجدولة/التصدير config-ready. | تحسينات عمق لكل تقرير (mapping أعمدة/رسوم بيانية متخصصة/تجميعات domain-specific)، وجدولة بريد تنفيذية فعلية بجدولة خلفية دائمة، وتصدير PDF/Excel backend-grade بدلاً endpoint تمهيدي. |

| **10** الإعدادات والتكاملات | **~88%** | **10.1–10.2:** تحسينات إعدادات النظام + تحويل `settings/branches` لاستهلاك `Branch` من ERPNext بدل demo. **10.3:** صفحة `settings/print-templates` (Print Format). **10.4:** صفحة `settings/terms-and-conditions` وربط DocType. **10.5:** صفحة `settings/integrations` موحدة Config-ready. **10.6:** صفحة `settings/security` (سياسات + سجل دخول). **10.7:** صفحة `settings/custom-fields` (Custom Field builder). إضافة API مركزي `api/settings/config` للإعدادات config-ready. **10.x تهيئة الخلفية:** صفحة **`/settings/erp-backend`** + `api/settings/frappe-backend` + `frappe-connection-store` (`data/frappe-backend.json`) + مصادقة **token** في `backend.ts`؛ توثيق **`docs/ERPNEXT_LOCAL_WITHOUT_DOCKER.md`**. | ربط دائم للإعدادات بكيان إعدادات مركزي persistent على ERPNext أو DB، adapters حية لموصلات المتاجر/SMS/WhatsApp، وتفعيل enforcement أمني تلقائي من صفحة Security في runtime على كل البيئات. |

| **11** الجوال والمتقدم | **~90%** | **11.1:** `src/app/portal/page.tsx` أصبح يشمل عمليات تشغيل: عرض فواتير/عروض/تسليمات + إجراء **موافقة وتحويل عرض سعر** (`make_sales_order`) + إجراء **إنشاء دفعة** من الفاتورة (`get_payment_entry` ثم إنشاء `Payment Entry`). **11.2–11.4:** تكاملات DocType فعلية (`Employee Checkin`، `Expense Claim`، `Stock Reconciliation`) من واجهات الجوال. **11.5:** الإيجارات قائمة بتغطية تشغيلية أساسية. **11.6–11.7:** تتبع الوقت وأوامر الشغل موجودان وظيفياً مع UX عملي. **11.8:** واجهات المطورين أصبحت أعمق: `api-keys` مع `scopes` و`revoke`، `webhooks` مع `dispatch + retry` وسجل deliveries، وOpenAPI محدّث. **11.9:** Workflow Studio مربوط بقراءة/إنشاء `Workflow` DocType. | المتبقي للوصول 100% إنتاجي: مصادقة portal مؤسسية (JWT/OTP/self-signup) بدلاً من إدخال customer id، Swagger UI تفاعلي محلي كامل + OAuth2/scoped auth enforcement على جميع API endpoints، webhook queue durable (DB/Redis) بدل memory، OCR/Barcode خدمات حقيقية، ربط `time-tracking` و`work-orders-ops` بـ ERP doctype مباشر مع تحويل فوترة تلقائي، وتوسعة الإيجارات للتسعير الموسمي والحجز الآلي والعقود المتقدمة. |

| **12** تحسين التصميم والتجربة | **~95%** | **12.1:** ألوان دلالية موجودة مسبقاً (`success`/`warning`/`info`/`destructive`) + `--desk-row-selected` + تمييز صفوف مختارة؛ شريط سياقي `ContextRailProvider` + `useContextRail`؛ بطاقات إعدادات `SettingsHubTiles` في `/settings`. **12.2:** Skeleton في `DataTable` عند التحميل؛ Sonner موجود؛ بحث `Ctrl+K` مبني على مسارات حقيقية (`navigation-search-items.ts` + `global-search.tsx`؛ `erp-page-enter`؛ نافذة اختصارات `?` + زر مساعدة في الهيدر؛ `formatApiErrorMessage`؛ `useFormDraft`؛ `toastWithUndo`. **12.3:** `DashboardWidgetBoard` (dnd-kit + حفظ ترتيب) + KPIs/رسوم كما كانت حية من API؛ زر «مساعد اللوحة» يفتح الشريط السياقي. **12.4:** `ErpField`، `ErpTabbedForm`، جاهزية مسودات. **12.5:** `DataTable`: تعديل خلية مزدوج النقر عند `onCellCommit`؛ sticky عمود أول؛ فلترة رأس؛ CSV + طباعة؛ تفضيلات أعمدة بـ `tableId`؛ تحديد متعدد + `bulkActions` — **مثال تشغيلي:** `/inventory/items`. | تعميم اختياري: تمرير `tableId`/bulk على بقية الصفحات؛ محرر Undo أعمق من مستوى toast؛ حفظ مسودات مربوطة بـ DocType لكل نموذج طويل؛ لوحات حسب الدور بمنطق أدوار JWT (حالياً تخصيص المستخدم عبر ترتيب widgets محلي فقط). |

**مقاييس النجاح من الخطة:** تغطية **دفترة/UX** للمرحلة 12 أصبحت مدمجة في المكوّنات المشتركة أعلاه؛ ما يزال على المدى الطويل وفق الخطة: **30+ تقرير** كتغطية موضوعية أعمق، **CRUD 100%** لكل DocType، **زمن استجابة <2ث** و**تغطية اختبارات** — راجع جدول «مقاييس النجاح» في نهاية `docs/DEVELOPMENT_PLAN.md`.

---

# ما تم إنجازه

- **هيكل المنتج:** Next.js 16، RTL، ~57 صفحة لوحة تحكم، مكونات ERP، Docker/Caddy/Prisma، توثيق `docs/*`.
- **API:** مصادقة، بيانات، KPIs، تقارير، method proxy، bulk.
- **طبقة ERPNext:** `backend.ts` مع `loadUserProfileFromErpSession`، `requestPasswordResetFromErp`، `logoutErpSession`.
- **واجهة البيانات:** React Query + `api.ts` مع رأس CSRF للطلبات المعدّلة.

### تحديث 2026-05-01 — فواتير المبيعات (`accounting/sales-invoice`)

- **نافذة إنشاء:** `DialogContent` بأبعاد تقارب **كامل الشاشة** (`100dvh`/`100vw` مع هامش ضيق)، هيكل رأس + تمرير مركزي + شريط إجراءات سفلي ثابت؛ عمود جانبي للملخص على الشاشات العريضة.
- **بنود الفاتورة:** جدول HTML بعرض أدنى للأعمدة وتمرير أفقي؛ ارتفاعات `h-9`/`h-10` وخط `text-[13px]`؛ إبقاء أزرار ترحيل بأسلوب outline/ghost حسب نظام التصميم.
- **إصلاحات وظيفية:** ربط **قالب الضريبة** بـ `buildSalesInvoice` → حقل `taxes_and_charges`؛ إرسال **وصف البند** إلى ERPNext؛ إزالة زر «تعديل» الوهمي واستبداله بـ **معاينة قراءة** (`useDoc` + حوار).
- **التحقق:** Zod `refine` لتاريخ الاستحقاق مقابل تاريخ الفاتورة؛ تهيئة `due_date` عند فتح الحوار إن كان فارغاً أو أسبق من تاريخ الفاتورة.
- **لاحقاً بنفس اليوم:** تبسيط نصوص واجهة الإدخال (بدون تسمية منتج خارجية في الواجهة)، حدود وألوان أوضح، **`naming_series`** عبر `DEFAULT_SALES_INVOICE_NAMING_SERIES` في `src/lib/erp/doc-defaults.ts`، و`**ErpLinkCombobox**`: زر إضافة يفتح تبويباً جديداً (`?create=1`) مع تحديث القائمة عند العودة/فتح القائمة؛ مسارات في `erp-link-create-route.ts`؛ دعم `consumeCreateQueryParam` في صفحات الأصناف/العملاء/المستودعات/مراكز التكلفة.
- **إعادة بناء نافذة إدخال فاتورة المبيعات (مرجع أنماط لوحات الفواتير الحديثة مثل Flowbite / قوالب admin للفوترة):** هيكل «مستند» داخل إطار فاتح، رأس علوي نظيف مع شارات التسلسل والشركة، عمود رئيسي بعرض محدود للقراءة، أقسام بفواصل `Separator`، جدول بنود بصفوف متناوبة وإطار واحد، عمود ملخص جانبي ثابت على `xl`، وتذييل إجراءات مسطح.
- **محرّر فاتورة بصفحة كاملة (`/accounting/sales-invoice/new`):** استبدال نافذة الحوار بمسار مستقل يستخدم كامل مساحة لوحة التحكم؛ **`react-resizable-panels`** (مكوّن `ResizablePanelGroup`) لتقسيم قابل للسحب بين البنود والملخص على `xl`؛ **`framer-motion`** لدخول الرأس وتحريك صفوف البنود ونبض الإجمالي؛ **`@radix-ui/react-scroll-area`** لمخطط التمرير؛ على الجوال تخطيط عمودي مكدس. زر «فاتورة جديدة» يوجّه إلى هذا المسار.
- **تحسينات تصميم متقدمة (2026-05-01):** تطبيق **مكتبات حديثة** لتحسين المظهر والألوان والهوامش والتباعد في محرّر الفاتورة الكامل؛ **إصلاح التزاحم**: زيادة `padding` (من `p-5` إلى `p-6`/`p-7`)، زيادة `gap` بين الأقسام (من `gap-6` إلى `gap-7`)، زيادة ارتفاع الحقول (من `h-9` إلى `h-10`)، وزيادة المسافات داخل الجدول (`p-2.5` بدل `p-2`)؛ **تحسين الألوان**: تدرجات `from-card via-card to-primary/[0.03]` في أقسام البيانات الأساسية، تدرجات `to-blue-500/[0.02]` في قسم الإضافات، وتأثيرات blur دائرية `blur-3xl` للخلفية؛ **أيقونات جديدة**: إضافة `Receipt`، `TrendingUp`، `Percent`، `Coins` من `lucide-react`؛ **قسم الملخص المالي**: تصميم **فخم** مع `border-2 border-primary/30`، خلفية `from-primary/5 via-primary/[0.08] to-primary/10`، ظلال `shadow-lg shadow-primary/10`، أيقونة `TrendingUp`، Badge تقديري `gap-1.5`، صناديق `rounded-lg bg-background/40 px-4 py-3` للصافي الفرعي والضريبة والخصم، **الإجمالي النهائي** في `rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 px-5 py-4 ring-1 ring-primary/30` مع `text-3xl font-black`، و`framer-motion` متقدم (`scale 0.9→1`، `spring stiffness=500`). **التزام RTL إجباري**: `dir="rtl"` على كل الأقسام والحقول الرئيسية (الجدول، contextColumn، header).؛ **تحسين الجدول**: رأس `from-muted/80 via-muted/90 to-muted`، صفوف `hover:bg-muted/30`، خلايا `border-border/50 bg-background/50 focus:bg-background`، أيقونات أكبر `h-4 w-4` لـ Trash.؛ **تحسين الرأس**: `rounded-xl border border-border/60 bg-gradient-to-l from-card via-card/95 to-muted/30 p-5 shadow-sm`، زر عودة `h-10`، عناوين `font-extrabold`، أزرار إجراءات `h-10` مع `font-semibold shadow-sm`.

### تحديث 2026-05-01 — إغلاق فجوات `docs/fixsystem.md` (محاسبة 1.2 و 1.3)

- **1.2 فواتير المبيعات:** في `sales-invoice-new-editor.tsx` — خيار **تحديث المخزون** (`update_stock` في `buildSalesInvoice` للفاتورة العادية)؛ تبديل **فاتورة نقطة بيع** مع **`ErpLinkCombobox`** لـ **POS Profile** وتحقق Zod عند التفعيل (مرجع التقرير: `is_pos`، `update_stock`).
- **1.3 فواتير المشتريات:** في `accounting/purchase-invoice/page.tsx` — **`ErpLinkCombobox`** لـ **Purchase Taxes and Charges Template** + `taxes_and_charges` في الطلب؛ **مرجع المورد** → **`bill_no`**؛ **وصف البند** و**`additional_discount_amount`** عبر `buildPurchaseInvoice`؛ تحقق **`due_date ≥ posting_date`**؛ معاينة ضريبة عند اختيار قالب («حسب القالب»).

### تحديث 2026-05-01 — Docker (بناء الواجهة + سكربت التحديث)

- **`Dockerfile`:** تثبيت الاعتماديات داخل مرحلة `builder` مباشرة (`npm install` بعد نسخ `package.json` و`package-lock.json`) بدل نسخ مجلد `node_modules` من مرحلة سابقة؛ يعالج فشل `sh: next: not found` الذي يظهر أحياناً على **Docker Desktop (Windows)** بسبب كسر روابط `.bin` عند النسخ بين الطبقات، مع الإبقاء على مرونة إذا كان الـ lock أقل انسجاماً مؤقتاً مع `package.json`.
- **`scripts/docker-refresh.ps1`:** بعد `docker compose build` يُفحص `$LASTEXITCODE`؛ عند الفشل يتوقف السكربت ولا يُشغّل `docker compose up` حتى لا يبقى المستخدم على صورة قديمة مع رسالة «Done» مضللة.

### تحديث 2026-05-01 — قواعد Cursor مرتبطة بـ `docs/fixsystem.md`

- **`fixsystem-progress.md`** (جذر المشروع): ملف تتبع **المنجز/المتبقي** لمسار إصلاحات **`docs/fixsystem.md`** — يُحدَّث من الوكيل عند إغلاق فجوات التقرير **دون** الاعتماد على **`project-contex.md`** لهذا المسار.
- **`.cursor/rules/fixsystem-gap-analysis.mdc`:** **`alwaysApply: true`** — مرجع **`docs/fixsystem.md`** + تحديث **`fixsystem-progress.md`** بعد كل دفعة ذات صلة؛ مؤجلات التقرير (بوابات، ZATCA/حكومي)؛ قواعد Combobox / Ghost Fields / أسماء الحقول؛ **لا تعديل `fixsystem.md` تلقائياً**.
- **`.cursor/rules/fixsystem-payloads-forms.mdc`:** **`globs`** لـ `erpnext-payloads` و`(dashboard)` و`erp/**` — نفس مسار التتبع في **`fixsystem-progress.md`**.

### هذه الجلسة (Aurora Light + Slate Sidebar — إعادة تصميم جذرية للنظام كاملاً — 2026-04-30)

- **لوحة ألوان جديدة كلياً (`src/app/globals.css`):**
  - خلفية النظام **Aurora-tinted near-white** (مزيج دافئ/بارد) مع تدرجات شعاعية خفيفة على `body`.
  - **سايدبار `Indigo-Slate` داكن دائماً** (حتى في الوضع الفاتح) ليكون مغايراً تماماً للخلفية، مع `--sidebar-border` و`--sidebar-soft` و`--sidebar-muted` متناسقة.
  - علامة براند **gradient indigo→violet→fuchsia** عبر `--brand-from/via/to` و**accent سماوي** للمسات الحديثة.
  - مقياس موحّد لـ `--radius-sm/md/lg/xl-ui`، `--space-1..10`، `--shadow-xs/sm/md/lg-ui`.
  - utilities جديدة: `erp-glass`، `erp-glass-dark`، `erp-soft-pulse`، `erp-brand-text`، `erp-nav-item` (مع مؤشر gradient شريط جانبي عند active)، و`erp-nav-sub`.
  - شريط تمرير منحوت برفيع وملون بالعلامة التجارية.
- **إدارة حالة UI مركزية (`src/stores/ui-store.ts`):** Zustand store جديد مع `persist` لـ`sidebarCollapsed`/`toggleSidebar`/`setSidebarCollapsed` ليتزامن طي/توسيع الشريط الجانبي مع padding اللاي‌أوت.
- **`AppSidebar` (`src/components/erp/app-sidebar.tsx`):** إعادة بناء بالكامل:
  - تكامل مع `useUIStore` بدل state محلي.
  - اعتماد `solar:*-bold-duotone` لكامل الموديولات.
  - `TooltipProvider` لكل عناصر التنقل عند الانطواء.
  - شعار جديد بحلقة gradient + أيقونة `solar:layers-bold-duotone` + اسم بـ`erp-brand-text`.
  - `NavLeaf` موحّد لعناصر التنقل (يدعم الوضعين collapsed/expanded).
  - أنماط `erp-nav-item`/`erp-nav-sub` للـ active/hover مع مؤشرات gradient.
  - زر طي يستخدم `toggleSidebar` من المتجر.
  - عرض السايدبار 260px (موسّع) / 76px (مطوي) مع ظل عميق `shadow-[-12px_0_40px_-20px_oklch(0.22_0.05_268/0.6)]`.
  - النسخة المحمولة بعرض `w-72` وبخلفية ضبابية محدّثة، وبطاقة مستخدم بحلقة gradient.
- **`AppHeader` (`src/components/erp/app-header.tsx`):**
  - زجاج `erp-glass` + ارتفاع `h-16` + حد سفلي ناعم.
  - بحث بحجم أكبر وحوافٍ `--radius-md-ui` مع focus ring تفاعلي.
  - فاصل عمودي + **Quick stats chips** بحركات framer-motion للدخول.
  - أزرار أيقونة (مساعدة/ثيم/إشعارات) ghost rounded-xl مع حالات تحويم بحدود العلامة.
  - شارة إشعارات بـ`bg-gradient-to-br from-destructive` مع ring.
  - Popover إشعارات أوسع وقائمة بحلقات دلالية.
  - أيقونات `solar:magnifer-bold-duotone` / `solar:bell-bing-bold-duotone`.
- **`(dashboard)/layout.tsx`:** ربط padding المحتوى بـ`useUIStore.collapsed` لمزامنة عرض السايدبار (`lg:pr-[76px]` / `lg:pr-[260px]`).
- **مكوّنات هيكلية موحّدة (`src/components/erp/page-header.tsx`):** ثلاث مكوّنات قابلة لإعادة الاستخدام لكل الصفحات:
  - **`PageHeader`**: عنوان + وصف (قبل `React.ReactNode`) + breadcrumbs + أيقونة محورية بـ`accent`، حركة دخول framer-motion، تدرجات زخرفية، وأزرار إجراءات.
  - **`KpiStrip`**: شبكة مرنة (2/3/4/5 أعمدة) لبطاقات KPI.
  - **`PageShell`**: غلاف محتوى موحّد بحدود/ظلال/Radius.
- **`DataTable` (`src/components/erp/data-table.tsx`):** تحديث الحاوية الرئيسية لاعتماد `--radius-lg-ui` و`--shadow-xs-ui` ومراحل تحويم خفيفة.
- **تطبيق التصميم الجديد على ~25 صفحة تشغيلية:**
  - Sales: `sales-orders`, `customers`, `quotations`, `delivery-notes`.
  - Purchases: `purchase-orders`, `suppliers`, `purchase-invoices`.
  - HR: `employees`, `attendance`, `leave-applications`, `salary-slips`.
  - CRM: `leads`, `activities`, `opportunities`.
  - Inventory: `items`, `stock-levels`, `warehouses`.
  - Manufacturing: `work-orders`, `bom`.
  - Accounting: `chart-of-accounts`, `sales-invoice`, `payment-entry`, `expenses`, `journal-entry`.
  - Settings: `settings`, `settings/branches`, `settings/security`.
  - Reports: `reports`، Dashboard `/`.
  - في كل صفحة: استبدال العناوين/الأوصاف/الأزرار اليدوية بـ`PageHeader`، وكل بطاقات الإحصاء بـ`KpiStrip` + `KpiCard` معنونة بألوان دلالية (`primary`/`success`/`warning`/`info`/`destructive`).
- **التحقق:** `npx tsc --noEmit` ناجح (Exit 0) + `ReadLints` على كل الملفات أعاد `No linter errors found`.

### هذه الجلسة (Vibrant SaaS Pass 2 — مكونات حديثة + حركات + توحيد بصري — 2026-04-30)

- **إثراء `globals.css`:** إضافة utilities حديثة: `erp-glass` (زجاج)، `erp-shimmer` (شيمر بديل لاحق للسكلتون)، `erp-glow-chip` (هالة لطيفة)، و`erp-page-accent`.
- **`Badge` (`src/components/ui/badge.tsx`):** متغيرات جديدة (`success`/`warning`/`info`/`soft`) مع pill شكل وحدود ملونة دلالية، وتدرج للعناصر الافتراضية والمدمّرة.
- **`KpiCard` (`src/components/erp/kpi-card.tsx`):** اعتماد `framer-motion` لحركة دخول/تحويم، وإضافة `accent` مع لوحة لون مخصصة لكل بطاقة (chip + glow on hover) + تباين أعلى وأرقام بـ`tabular-nums`.
- **`StatusBadge` (`src/components/erp/status-badge.tsx`):** تحويل إلى نمط soft pills بدلاً من ألوان صلبة (مع ring inset دلالية)، الحفاظ على توافق helpers الحالية.
- **`DataTable` (`src/components/erp/data-table.tsx`):** عنوان جدول بشريط gradient، أزرار أعلى الجدول بحواف وحجم موحدين (`h-9` + radius جديد)، زر إضافة بـgradient، شريط إجراءات جماعية أنعم.
- **`AppHeader` (`src/components/erp/app-header.tsx`):** هيدر بزجاج (`backdrop-blur-xl`) ارتفاع 16، أزرار أيقونات `rounded-xl` بحوافٍ تفاعلية، شارة إشعار بـgradient وحلقة ring.
- **`AppSidebar` (`src/components/erp/app-sidebar.tsx`):** شعار بـgradient (Solar `widget-5-bold-duotone`) وعرض اسم المنتج بتدرج primary→info، عرض موسّع 260px، ظل اتجاه RTL طبيعي.
- **صفحة لوحة التحكم (`src/app/(dashboard)/page.tsx`):** تمرير `accent` لكل KPI بحيث يصبح لكل مؤشر هوية لونية (Revenue=success، Expenses=warning، Receivables=info، Payables=destructive، إلخ).
- **التحقق:** `npx tsc --noEmit` ناجح + `ReadLints` بدون أخطاء.

### هذه الجلسة (خطة إعادة تصميم شاملة Vibrant SaaS — 2026-04-30)

- **إنشاء مرجع الخطة:** إضافة `docs/UI_REDESIGN_MASTER_PLAN.md` كمرجع ثابت لتنفيذ إعادة التصميم الجذرية مرحلياً دون تنفيذ دفعة واحدة.
- **نواة التصميم (Design Foundation):** تحديث شامل لـ `src/app/globals.css`:
  - توسيع design tokens (ألوان، مسافات، radius، shadows، surface layers).
  - صقل light/dark palette بأسلوب **Vibrant SaaS** مع تباين أعلى.
  - إضافة utilities بصرية مشتركة (`erp-shell`, `erp-soft-surface`, `erp-page-enter`).
- **إعادة تصميم المكونات الأساسية (Core UI):**
  - `src/components/ui/input.tsx`
  - `src/components/ui/button.tsx`
  - `src/components/ui/select.tsx`
  - `src/components/ui/card.tsx`
  - `src/components/ui/textarea.tsx`
  - `src/components/ui/table.tsx`
  - `src/components/ui/form.tsx`
  - التحسينات شملت: حواف موحّدة، حدود/ظلال حديثة، حالات focus/hover/error أوضح، وارتفاعات متسقة للنماذج.
- **استقرار RTL/LTR:** تحسين قواعد الاتجاه في `globals.css` لمكونات select/inputs، ومعالجة تعارضات محاذاة واضحة في:
  - `src/app/(dashboard)/reports/page.tsx`
  - `src/app/(dashboard)/sales/pos/page.tsx`
  - `src/app/(dashboard)/accounting/chart-of-accounts/page.tsx`
- **Rollout مرحلي على الشاشات:** تفعيل pass بصري وانتقالي على صفحات تشغيلية من دفعات مختلفة:
  - `src/app/(dashboard)/page.tsx`
  - `src/app/(dashboard)/sales/sales-orders/page.tsx`
  - `src/app/(dashboard)/purchases/purchase-orders/page.tsx`
  - `src/app/(dashboard)/accounting/payment-entry/page.tsx`
  - `src/app/(dashboard)/inventory/stock-levels/page.tsx`
  - `src/app/(dashboard)/hr/employees/page.tsx`
  - `src/app/(dashboard)/crm/leads/page.tsx`
  - `src/app/(dashboard)/settings/security/page.tsx`
  - `src/app/(dashboard)/operations/time-tracking/page.tsx`
- **التحقق:** `ReadLints` على جميع الملفات المعدلة أعاد `No linter errors found`.

### هذه الجلسة (ترقية مكتبات حديثة للأيقونات والواجهة — 2026-04-30)

- **مكتبات جديدة مضافة:** `@iconify/react` و`@phosphor-icons/react` في `package.json` لتبني مكتبات أيقونات حديثة ومرنة.
- **طبقة أيقونات موحّدة:** إنشاء `src/components/ui/modern-icon.tsx` كمكوّن مركزي يدعم Iconify وPhosphor مع fallback قابل لإعادة الاستخدام عبر النظام.
- **تطبيق مباشر على مكونات التنقل الأساسية:**
  - `src/components/erp/app-header.tsx`: استبدال أيقونات البحث/الإشعارات/المساعدة بأيقونات حديثة موحّدة.
  - `src/components/erp/app-sidebar.tsx`: توحيد أيقونات الموديولات والتنقل السفلي وزر القائمة المحمولة عبر Iconify.
- **التحقق:** `ReadLints` على الملفات المعدلة أعاد `No linter errors found`.

### هذه الجلسة (ربط ERPNext محلي + مفاتيح API — 2026-04-30)

- **`docs/ERPNEXT_LOCAL_WITHOUT_DOCKER.md`:** تشغيل **bench/WSL** بدل Docker مؤقتاً، إخفاء Desk عملياً، متغيرات البيئة، وربط تلقائي للمفاتيح.
- **`src/lib/server/frappe-connection-store.ts`:** قراءة/كتابة `data/frappe-backend.json` (مع تجاوز عبر `BACKEND_HOST` و`BACKEND_API_KEY`/`BACKEND_API_SECRET`).
- **`src/lib/server/backend.ts`:** دعم **`Authorization: token api_key:api_secret`** لطلبات النظام عند توفر المفاتيح.
- **`src/app/api/settings/frappe-backend/route.ts`:** GET للحالة؛ POST `save` أو `bootstrap` (login + `generate_keys`) بصلاحية **System Manager** أو رأس **`x-frappe-setup-secret`**.
- **`src/app/(dashboard)/settings/erp-backend/page.tsx`:** واجهة تهيئة المشروع؛ **`settings-hub-tiles`** + **`navigation-search-items`**.
- **`scripts/frappe-bootstrap-keys.mjs`:** توليد المفاتيح من CLI.
- **`.gitignore`:** استبعاد `data/frappe-backend.json`.
- **`PROJECT.md`:** رابط للتوثيق.
- **`npx tsc --noEmit`:** ناجح.

### هذه الجلسة (إصلاح عطل جلب البيانات والجداول — 2026-04-30)

- **`src/lib/client/api.ts`:**
  - تحسين `request()` للتعامل الآمن مع ردود non-JSON بدل السقوط الصامت عند `response.json()`.
  - توحيد رسائل الخطأ لتشمل رمز HTTP عند الفشل (`فشل الطلب (status)`).
  - ترميز أسماء DocType عبر `encodeURIComponent` لكل مسارات البيانات (`list/get/create/update/delete/submit/cancel/amend`) لمنع مشاكل المسارات التي تحتوي مسافات.
  - تشديد `apiRunReport()` ليرمي خطأ واضح عند فشل API بدل إرجاع `null` بصمت.
- **`src/lib/server/backend.ts`:**
  - إضافة `normalizeConnectionErrorMessage()` لتحويل أخطاء الاتصال (`ECONNREFUSED`/`ENOTFOUND`/timeout) إلى رسالة تشغيلية واضحة:
    - «تحقق من الإعدادات في `/settings/erp-backend`».
  - ربط هذه المعالجة داخل `internalRequest()` قبل إعادة رمي الخطأ.
- **إصلاح خطأ Frappe Traceback (doctype مكرر):**
  - **`src/lib/server/backend.ts` / `getList()`:** حذف `params.set('doctype', doctype)` لأن المسار أصلاً يعتمد `/resource/${doctype}`؛ هذا منع تمرير `doctype` مرتين وأزال خطأ:
    - `TypeError: get_list() got multiple values for argument 'doctype'`.
- **تنظيف صياغات الواجهة للمستخدم النهائي (إزالة نصوص مرحلية/وكلاء):**
  - **تم تحديث النصوص** في:
    - `src/app/(dashboard)/accounting/bank-and-cash/page.tsx`
    - `src/app/(dashboard)/accounting/journal-entry/page.tsx`
    - `src/app/(dashboard)/accounting/assets/page.tsx`
    - `src/app/(dashboard)/sales/quotations/page.tsx`
    - `src/app/(dashboard)/hr/salary-slips/page.tsx`
    - `src/app/(dashboard)/hr/shifts/page.tsx`
    - `src/app/(dashboard)/hr/attendance/page.tsx`
    - `src/app/(dashboard)/crm/appointments/page.tsx`
    - `src/app/(dashboard)/crm/messages/page.tsx`
    - `src/app/(dashboard)/crm/subscriptions/page.tsx`
    - `src/app/(dashboard)/purchases/suppliers/page.tsx`
    - `src/app/(dashboard)/settings/integrations/page.tsx`
    - `src/app/(dashboard)/settings/security/page.tsx`
    - `src/app/(dashboard)/settings/print-templates/page.tsx`
    - `src/app/(dashboard)/accounting/fiscal-year/page.tsx`
- **متابعة تنظيف إضافية (بعد بلاغ استمرار النصوص):**
  - `src/app/(dashboard)/accounting/journal-entry/page.tsx`:
    - استبدال عنواني `Recurring Journal Entry (قيود تلقائية مجدولة)` و`Recurring Journal Entry (من الخلفية)` بصياغة عربية تشغيلية: **القيود اليومية المتكررة**.
  - `src/app/(dashboard)/accounting/fiscal-year/page.tsx`:
    - تغيير عنوان الجدول من **سنوات مالية (من الخلفية)** إلى **السنوات المالية**.
  - `src/app/(dashboard)/accounting/payment-entry/page.tsx`:
    - استبدال placeholder **من الخلفية** في اختيار طريقة الدفع بصياغة تشغيلية واضحة.
  - `src/app/(dashboard)/settings/erp-backend/page.tsx`:
    - إزالة الإشارة التشغيلية إلى **Desk** من وصف الصفحة.
- **تحقق سببي لخطأ `doctype`:**
  - تم فحص جميع استدعاءات الواجهة للتأكد من عدم وجود نداءات مباشرة تمرر `doctype` كـ query إضافي لمسارات `/api/data/*` خارج طبقة API المركزية.
  - الإصلاح الفعلي بقي في `src/lib/server/backend.ts` (عدم إرسال `doctype` في query عند مسار `/resource/${doctype}`).
- **التحقق:** `npx tsc --noEmit` ناجح بعد الإصلاحات.

### هذه الجلسة (مراجعة شاملة للنصوص وتجربة UI — 2026-04-30)

- **تنظيف نصوص المستخدم النهائية (إزالة مراجع مرحلية/تقنية):**
  - `src/app/(dashboard)/accounting/chart-of-accounts/page.tsx`:
    - إزالة صياغة `Account / Company default` ومرجع المراحل/الخطة.
    - استبدال الوصف بنص تشغيلي واضح للمستخدم.
  - `src/app/(dashboard)/sales/integrations/page.tsx`:
    - إزالة العنوان المرحلي (`المرحلة 4.4–4.7`) من واجهة المستخدم.
    - تبسيط وصف الصفحة وإزالة المرجع إلى ملف الخطة.
  - `src/app/(dashboard)/page.tsx`:
    - إزالة عبارات تعتمد على «المرحلة 9» في الرسائل الفارغة.
    - تحويل المساعد النصي إلى صياغة تشغيلية غير مرحلية.
- **تحسينات تجربة ومظهر عامة (تؤثر على جميع الشاشات):**
  - `src/components/erp/app-sidebar.tsx`:
    - استبدال `ScrollArea` بـ `overflow-y-auto` مباشر لضمان تمرير واضح وثابت داخل الشريط الجانبي.
    - تحسين طابع الشريط البصري (`bg-sidebar` + ظل أنعم) وترتيب المسافات.
  - `src/app/globals.css`:
    - اعتماد `direction: rtl` افتراضياً على مستوى `body`.
    - فرض محاذاة يمين لحقول الإدخال/النص (إلا الحقول المعلّمة `dir="ltr"` للأرقام/الأكواد).
    - تحسين لوحة الألوان الأساسية (`primary`/`accent`/`sidebar`) في الوضعين الفاتح والداكن.
- **التحقق الفني:** `npx tsc --noEmit` ناجح، و`ReadLints` بدون أخطاء على الملفات المعدلة.

### هذه الجلسة (Global Redesign Pass — 2026-04-30)

- **تنظيف نصوص تشغيلية متبقية ظاهرة للمستخدم:**
  - `src/app/(dashboard)/accounting/chart-of-accounts/page.tsx`: تبسيط رسالة التوجيه التلقائي للحسابات وإزالة الصياغات المرجعية (`Account / Company default` + ربط مراحل الخطة).
  - `src/app/(dashboard)/sales/integrations/page.tsx`: إزالة عنوان/ذيل مرحليين وربط الصفحة بوصف تشغيلي مباشر.
  - `src/app/(dashboard)/page.tsx`: إزالة رسائل تعتمد على أرقام مراحل واستبدالها برسائل UX حيادية.
- **إعادة تصميم مكونات النظام المشتركة (تؤثر على جميع الشاشات):**
  - `src/components/ui/button.tsx`:
    - حواف أنعم (`rounded-lg`)، انتقالات أوضح، وتحسين hover/shadow للأزرار الأساسية.
  - `src/components/ui/card.tsx`:
    - تحديث شكل البطاقات (`rounded-2xl`) مع ظلال متدرجة أنعم.
  - `src/components/ui/input.tsx`:
    - توحيد شكل حقول الإدخال بحواف `rounded-lg` وانتقالات متسقة.
  - `src/components/ui/table.tsx`:
    - اعتماد محاذاة `text-right` للرؤوس والخلايا افتراضياً لدعم RTL بشكل بصري صحيح في الجداول.
- **تحسينات تجربة تنقل وهيكل الصفحة:**
  - `src/components/erp/app-sidebar.tsx`:
    - تفعيل تمرير مباشر ثابت (`overflow-y-auto`) داخل الشريط الجانبي.
    - تحسين الخلفية/الظل/المسافات لترتيب بصري أكثر احترافية.
  - `src/components/erp/app-header.tsx`:
    - تحسين مظهر الهيدر (حدود/blur/shadow) وتوحيد نمط أزرار الأدوات.
  - `src/app/globals.css`:
    - فرض `direction: rtl` على مستوى `body`.
    - محاذاة يمين افتراضية لمدخلات النص (`input/textarea`) مع الحفاظ على حقول `dir="ltr"` للأرقام والأكواد.
    - تحسين palette الألوان الأساسية (`primary/accent/sidebar`) للوضعين الفاتح/الداكن.
- **التحقق النهائي لهذه الدفعة:** `npx tsc --noEmit` ناجح + `ReadLints` بدون أخطاء على الملفات المعدلة.

### هذه الجلسة (Pass تنظيف شامل للشاشات — متابعة تنفيذ — 2026-04-30)

- **تنظيف نصوص تشغيلية متبقية في الواجهات (بدون عبارات مرحلية/مرجعية):**
  - `src/app/(dashboard)/sales/quotations/page.tsx`: استبدال وصف العنوان بنص تشغيلي مباشر.
  - `src/app/(dashboard)/purchases/purchase-orders/page.tsx`: إزالة صياغة "مرحلة 5.4".
  - `src/app/(dashboard)/hr/employees/page.tsx`: تحديث الوصف ورسالة الخطأ لتكون محايدة للمستخدم.
  - `src/app/(dashboard)/hr/contracts/page.tsx`: تبسيط وصف الصفحة.
  - `src/app/(dashboard)/hr/leave-applications/page.tsx`: تبسيط وصف الصفحة.
  - `src/app/(dashboard)/hr/employee-requests/page.tsx`: تبسيط وصف الصفحة.
  - `src/app/(dashboard)/sales/customers/page.tsx`: إزالة بطاقة الترقيم المرحلي واستبدالها ببطاقة تشغيلية.
  - `src/app/(dashboard)/inventory/price-lists/page.tsx`: تبسيط وصف لوحة أسعار الأصناف.
  - `src/app/(dashboard)/purchases/purchase-requests/page.tsx`: إعادة صياغة ملاحظة التحويل لأمر شراء.
  - `src/app/(dashboard)/inventory/stock-levels/page.tsx`: إزالة وصف "مرحلة 6.3".
  - `src/app/(dashboard)/crm/leads/page.tsx`: تنظيف الوصف ووسم الحالة من المرجع التقني.
  - `src/app/(dashboard)/sales/sales-orders/page.tsx`: إعادة صياغة Alert وبطاقة المؤشر لتكون تشغيلية.
  - `src/app/(dashboard)/reports/page.tsx`: استبدال "ERPNext Query Report" بوسم "تقرير تحليلي".
  - `src/app/(dashboard)/page.tsx`: استبدال أوصاف KPI ورسالة الموافقات بنصوص تشغيلية حيادية.
  - `src/app/(dashboard)/accounting/chart-of-accounts/page.tsx`: تنعيم رسالة خطأ الشركة.
  - `src/app/(dashboard)/accounting/period-closing/page.tsx`: إزالة الإشارة المرجعية من رسالة تحقق الملاحظات.
- **تحسين نصوص POS المعروضة للمستخدم:**
  - `src/app/(dashboard)/sales/pos/page.tsx`:
    - إزالة الصياغات المرجعية من ترويسة تنبيه الإعداد.
    - تبسيط شرح حساب الضريبة/الإجمالي لصياغة تشغيلية مباشرة.
    - تنظيف سطر الضريبة في قالب الطباعة.
- **التحقق الفني لهذه الدفعة:** `npx tsc --noEmit` ناجح + `ReadLints` بدون أخطاء.

### هذه الجلسة (Pass نهائي dashboard cleanup — 2026-04-30)

- **تنظيف إضافي لعبارات المستخدم في صفحات رئيسية:**
  - `crm/leads`: وصف الصفحة + وسم "الحالة" (إزالة الإشارة المرجعية التقنية).
  - `inventory/stock-levels`: إزالة وصف "مرحلة 6.3" واستبداله بوصف تشغيلي.
  - `accounting/journal-entry`: تبسيط عنوان القوالب الدورية.
  - `hr/attendance`: وصف تشغيلي محايد.
  - `sales/sales-orders`: إعادة صياغة تنبيه التتبع وبطاقة حالة التسليم/الفوترة.
  - `reports/page`: تحويل وسم التقرير إلى "تقرير تحليلي".
  - `purchases/request-for-quotation`: تحسين placeholder الرسالة للمورد.
  - `dashboard/page`: تحسين أوصاف KPI لتكون حيادية تشغيلية.
  - `sales/integrations`: إزالة إشارات مرجعية من أوصاف البطاقات.
  - `hr/employees`: تنعيم رسالة خطأ إنشاء الموظف.
  - `accounting/chart-of-accounts`: تنعيم رسالة خطأ تحديد الشركة.
  - `accounting/period-closing`: إزالة الإشارة المرجعية من رسالة تحقق الملاحظات.
  - `sales/pos`: تنعيم نصوص ضريبة/تنبيه إعدادات POS لتصبح تشغيلية وواضحة.
- **تحقق نظافة النصوص:** مسح شامل داخل `src/app/(dashboard)` بكلمات مرجعية (`المرحلة`، `DEVELOPMENT_PLAN`، `project-contex`، `Config-ready`، `Desk`، `من الخلفية`...) أعاد **No matches found**.

### هذه الجلسة (Visual polish pass — 2026-04-30)

- **تحسينات مكونات مشتركة عالية التأثير:**
  - `src/components/erp/kpi-card.tsx`:
    - تحديث شكل البطاقة (حدود/ظل/حركة hover) وتوضيح hierarchy بصرياً.
    - نقل وصف البطاقة أسفل مؤشرات النسبة لتحسين القراءة.
    - تحسين شكل حاوية الأيقونة (حواف + إطار خفيف).
  - `src/components/erp/data-table.tsx`:
    - تحسين Toolbar (مساحات وأزرار بحواف أنعم).
    - تحسين حقل البحث ومظهر حاوية الجدول (`rounded-2xl` + border/hover shadow).
  - `src/components/erp/app-sidebar.tsx`:
    - صقل الحدود والتمرير (`overflow-y-auto` + scrollbar thin) وتحسين فصل الأقسام بصرياً.
- **تحسين نصوص صفحة إعداد الربط:**
  - `src/app/(dashboard)/settings/erp-backend/page.tsx`:
    - تبسيط العناوين والرسائل لتكون تشغيلية أقل تقنية.
    - تحسين نصوص الـ toast ورسوم الحقول لتناسب المستخدم النهائي.
- **التحقق الفني:** `npx tsc --noEmit` ناجح و`ReadLints` بدون أخطاء.

### هذه الجلسة (Visual polish pass — high-usage pages — 2026-04-30)

- **توحيد التخطيط والاستجابة في الصفحات الأعلى استخداماً:**
  - `src/app/(dashboard)/sales/sales-orders/page.tsx`: تحسين ترتيب الترويسة إلى layout مرن (`flex-col` على الشاشات الصغيرة) وتوحيد شبكة بطاقات الملخص إلى `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` مع حدود أوضح (`border-border/70`) وتنسيق Alert أكثر هدوءاً.
  - `src/app/(dashboard)/sales/quotations/page.tsx`: نفس نمط الترويسة والبطاقات لضمان اتساق بصري بين صفحات دورة المبيعات.
  - `src/app/(dashboard)/purchases/purchase-orders/page.tsx`: توحيد شبكة الـ KPI cards والترويسة مع نمط المبيعات لرفع قابلية القراءة وسهولة المقارنة.
  - `src/app/(dashboard)/hr/employees/page.tsx`: تحسين استجابة البطاقات الملخصة وإضافة حدود موحدة للبطاقات مع الحفاظ على ألوان الدلالة.
- **صقل لوحة التحكم والتقارير:**
  - `src/app/(dashboard)/page.tsx`: تقليل padding العلوي داخل widgets وإعادة إظهار حدود cards في أقسام charts/lists/monthly بدلاً من الخلفية الشفافة لتحسين التمايز البصري.
  - `src/app/(dashboard)/reports/page.tsx`: تكبير عنوان الصفحة (`text-2xl`) وتحسين بطاقات التقارير بحدود واضحة وظلال أنعم، وتحديث حاوية فلاتر التقرير داخل dialog بحواف وحدود أكثر احترافية.
- **التحقق الفني لهذه الدفعة:** `ReadLints` على الملفات الستة المستهدفة أعاد **No linter errors found**.

### هذه الجلسة (سياسة منتج — عدم مسار Desk التشغيلي — 2026-04-30)

- **`docs/DEVELOPMENT_PLAN.md`:** إضافة قسم **«سياسة منتج إلزامية: واجهة ERP Pro دون مسار Desk اليومي»**؛ مواءمة فقرة نطاق POS/ZATCA/بوابات مع السياسة؛ أي فجوة حالية تُعامل كدين تقني حتى تُغطّى بواجهة.
- **`project-contex.md`:** تحديث **وصف المشروع**، **آخر تحديث**، عمود المتبقي في جدول المراحل (**2، 3، 4، 5، 6**)، قسم **المتبقي** (مرحلة 4، جدول 5/6)، **ملاحظات مهمة** (بند 7 + إعادة ترقيم تبعيات إلى 9)، وجدول التبعيات ليعكس الإكمال من ERP Pro.
- **`.cursor/rules/project-contex.mdc`:** تذكير للوكيل بعدم اعتبار Desk مساراً مقبولاً للميزات ضمن النطاق.

### هذه الجلسة (المرحلة 4 — ضبط النطاق + تكاملات — 2026-04-30)

- **`docs/DEVELOPMENT_PLAN.md`:** حذف بنود **4.4 (ZATCA)** و**4.5 (بوابات دفع)** من نطاق المنتج؛ إزالة **أوفلاين** من **4.3**؛ إعادة ترقيم تكاملات المبيعات إلى **4.4–4.7**؛ إضافة سطر إنجاز **[x]** لعرض **Loyalty Program** و**Shipping Rule** من الواجهة.
- **`src/app/(dashboard)/sales/integrations/page.tsx`:** إزالة تبويبي ZATCA وPayment Gateway؛ الإبقاء على تقسيط/اشتراكات + عمولات + ولاء + شحن مع جداول متقدمة وربط **Subscription Plan** و**Sales Team**.
- **`src/lib/core/helpers.ts`:** تسمية القائمة **تكاملات المبيعات (4.4–4.7)** وdoctype القائمة **Payment Terms Template**.
- **`src/app/(dashboard)/sales/pos/page.tsx`:** إزالة أي صياغة تلمّح إلى POS أوفلاين.
- **`docs/PROJECT_STATUS.md`:** مواءمة قسم المبيعات مع التكاملات 4.4–4.7 بدل فوترة إلكترونية داخل الواجهة.
- **إصلاح بناء:** حذف `}` زائد في `src/app/(dashboard)/sales/delivery-notes/page.tsx`؛ **`npx tsc --noEmit`** و**`npm run build`** ناجحان.

### هذه الجلسة (المرحلتان 9 و 10 — تقارير + إعدادات/تكاملات — 2026-04-30)

- **محرك التقارير (9.8):** إضافة `src/lib/reports/catalog.ts` لتعريف شامل للتقارير، و`src/lib/server/report-access.ts` لصلاحيات report-level، وتحديث API `src/app/api/reports/[reportName]/route.ts` ليستخدم report-id + whitelist + roles gate.
- **تقارير 9.1–9.6:** تحديث `src/app/(dashboard)/reports/page.tsx` للاعتماد على `useRunReport` من `src/lib/client/hooks.ts` ونتائج ERPNext الفعلية عند فتح التقرير.
- **9.7 + ميزات متقدمة:** تحديث `src/app/(dashboard)/audit-log/page.tsx` لجلب `Activity Log` فعليًا، وإضافة APIs: `src/app/api/reports/favorites/route.ts` و`src/app/api/reports/schedules/route.ts` و`src/app/api/reports/export/route.ts`.
- **10.1–10.7:** إضافة صفحات جديدة:
  - `src/app/(dashboard)/settings/print-templates/page.tsx`
  - `src/app/(dashboard)/settings/terms-and-conditions/page.tsx`
  - `src/app/(dashboard)/settings/integrations/page.tsx`
  - `src/app/(dashboard)/settings/security/page.tsx`
  - `src/app/(dashboard)/settings/custom-fields/page.tsx`
  - وتحويل `src/app/(dashboard)/settings/branches/page.tsx` للعمل على `Branch` API بدل بيانات تجريبية.
- **Settings API:** إضافة `src/app/api/settings/config/route.ts` كنقطة حفظ إعدادات Config-ready.
- **التحقق:** `npx tsc --noEmit` و`npm run build` ناجحان.

### هذه الجلسة (المرحلة 11 — الجوال والمتقدم — 2026-04-30)

- **11.2 ESS Attendance:** إضافة `src/app/(dashboard)/operations/ess-attendance/page.tsx` لتسجيل حضور/انصراف الجوال مع GPS وSelfie وQR بصيغة Config-ready وبطاقة يومية.
- **11.3 Mobile Expenses:** إضافة `src/app/(dashboard)/operations/mobile-expenses/page.tsx` لتسجيل المصروفات من الهاتف + صورة إيصال + OCR تجريبي + حالات Draft/Submitted.
- **11.4 Mobile Inventory Count:** إضافة `src/app/(dashboard)/operations/mobile-inventory-count/page.tsx` للجرد الميداني عبر الهاتف مع إدخال كميات وفروقات وتجهيز الربط مع Barcode scanner.
- **11.8 Developer API:** إضافة `src/app/(dashboard)/operations/developer-api/page.tsx` مع إدارة مفاتيح API وWebhooks وعرض OpenAPI مباشرة.
- **11.8 API Routes:** إضافة:
  - `src/app/api/developer/openapi/route.ts`
  - `src/app/api/developer/api-keys/route.ts`
  - `src/app/api/developer/webhooks/route.ts`
  - `src/app/api/developer/rate-limit/route.ts`
- **11.9 Workflow Studio:** إضافة `src/app/(dashboard)/operations/workflow-studio/page.tsx` لتعريف states/transitions والموافقات متعددة المستويات (Config-ready).
- **التنقل المركزي:** تحديث `src/lib/core/helpers.ts` لإضافة وحدات المرحلة 11 داخل `operations`.
- **دفعة الإكمال:** تحويل الصفحات الجديدة من local state إلى ربط فعلي مع DocTypes ERPNext:
  - `operations/ess-attendance` ← `Employee Checkin` (إنشاء + قراءة يومية).
  - `operations/mobile-expenses` ← `Expense Claim` (إنشاء + قائمة).
  - `operations/mobile-inventory-count` ← `Stock Reconciliation` (إنشاء تسوية فعلية + عرض آخر التسويات).
  - `operations/workflow-studio` ← `Workflow` (إنشاء/قراءة).
- **11.1 Web Portal:** إضافة صفحة مستقلة `src/app/portal/page.tsx` لتغطية بوابة عميل خارجية (تسجيل دخول/خروج مبسط + فواتير + عروض + تسليمات).
- **التحقق:** `npx tsc --noEmit` ناجح بعد دفعة الإكمال.
- **دفعة الإنهاء (اليوم):**
  - **Portal actions:** إضافة إجراءات تشغيل فعلية داخل `src/app/portal/page.tsx`:
    - موافقة/تحويل عرض السعر إلى `Sales Order` عبر `make_sales_order`.
    - إنشاء دفعة للفاتورة عبر `get_payment_entry` ثم إنشاء `Payment Entry`.
  - **Developer API hardening:**
    - `src/app/api/developer/api-keys/route.ts`: دعم scopes + revoke.
    - `src/app/api/developer/webhooks/route.ts`: dispatch event + retry تلقائي + delivery logs.
    - `src/app/api/developer/openapi/route.ts`: تحديث مخطط OpenAPI لنقاط النهاية الجديدة.
    - `src/app/(dashboard)/operations/developer-api/page.tsx`: واجهة إدارة scopes، revoke، test dispatch، وسجل deliveries.
  - **التحقق النهائي:** `npx tsc --noEmit` ناجح.

### هذه الجلسة (المرحلة 12 — تصميم وتجربة — 2026-04-30)

- `**src/lib/ui/navigation-search-items.ts**` + `**src/components/erp/global-search.tsx`:** بحث سريع مبني على `SYSTEM_MODULES` ومسارات إعدادات/تقارير، مع تخزين «آخر ما تم فتحه» في `localStorage`.
- `**src/components/erp/data-table.tsx`:** Skeleton تحميل؛ تحديد صفوف وتمييز لوني (`bg-desk-row-selected`)；فلترة أعمدة اختيارية؛ تجميد أول عمود؛ تصدير CSV (BOM UTF-8)؛ طباعة نافذة من محتوى الجدول؛ إخفاء أعمدة مع حفظ تفضيلات؛ شريط إجراءات جماعية؛ تعديل مباشر بالنقر المزدوج عند `onCellCommit`.
- `**src/app/globals.css`:** متغير `--desk-row-selected` + فئة `.bg-desk-row-selected` + حركة دخول `.erp-page-enter`.
- `**src/components/erp/context-rail.tsx**` + `**src/app/(dashboard)/layout.tsx`:** شريط جانبي سياقي ثانٍ؛ `**src/components/erp/keyboard-shortcuts-dialog.tsx**` + حدث `ERP_OPEN_SHORTCUTS_EVENT`؛ `**src/components/erp/app-header.tsx`:** زر مساعدة.
- `**src/components/erp/dashboard-widget-board.tsx**` + `**src/app/(dashboard)/page.tsx`:** لوحة تحكم قابلة لإعادة الترتيب (dnd-kit) مع حفظ ترتيب محلي و«مساعد اللوحة».
- `**src/components/erp/settings-hub-tiles.tsx**` + `**src/app/(dashboard)/settings/page.tsx`:** وصول سريع على شكل بطاقات.
- `**src/components/ui/erp-field.tsx**`, `**src/components/erp/erp-tabbed-form.tsx**`, `**src/hooks/use-form-draft.ts**`, `**src/lib/client/api-errors.ts**`, `**src/lib/ui/action-toast.ts**`.
- `**src/app/(dashboard)/inventory/items/page.tsx`:** تفعيل خيارات الجدول المتقدمة كمرجع تشغيلي للمرحلة 12.
- **التحقق:** `npx tsc --noEmit` ناجح؛ `npm run build` ناجح (بيئة المستخدم).

### جلسة سابقة (تكميل 6.6 + مسار PO موحّد — 2026-04-30)

- `**buildItemPrice**` في `**src/lib/erp/erpnext-payloads.ts**` لإنشاء سجلات `**Item Price**`.
- `**inventory/price-lists`:** لوحة **أسعار الأصناف** لكل قائمة (عرض، إضافة صنف+UOM+سعر، تعديل السعر، حذف)؛ `**useDoc**` لملء `**stock_uom**` تلقائياً عند اختيار الصنف.
- `**useDocList**` في `**src/lib/client/hooks.ts`:** معامل `**enabled**` لتعطيل الطلب حتى يكون السياق جاهزاً.
- **أوامر الشراء:** إزالة البند المكرر من وحدة **المبيعات** في `**helpers.ts**`؛ `**/sales/purchase-orders**` → `**redirect('/purchases/purchase-orders')**`؛ تحديث `**global-search.tsx**`.

### جلسة سابقة (المرحلة 5 + 6 — مشتريات ومخزون وتصنيع — 2026-04-30)

- `**src/lib/erp/erpnext-payloads.ts`:** `buildMaterialRequest`، `buildSupplierQuotation`، `buildPurchaseReceipt`، `buildRequestForQuotation`، `buildStockEntry`، `buildItemCreate`، `buildWarehouseCreate`، `buildBom`، `buildWorkOrder`، `buildProductionPlan`، `buildWorkstation`، `buildStockReconciliation`، `buildPriceList`، `buildLandedCostVoucher`.
- **المشتريات:** تحديث صفحات `**/purchases/***` (موردون، طلبات مواد، RFQ، عروض موردين، أوامر شراء مع تحويل PR/PI، استلام، فواتير شراء) مع `**ErpLinkCombobox**` و`useDefaultCompanyName` و`prepareFrappeDocForCreate` حيث يلزم.
- **المخزون:** `items`، `warehouses`، `stock-entry`، `**stock-count` → Stock Reconciliation**، `**price-lists` (رأس القائمة آنذاك)**، `**stock-levels` → Bin`**.
- **التصنيع:** `bom`، `work-orders`، `production-plans`، `workstations`، `**/manufacturing/landed-cost-voucher`**.
- `**src/lib/core/helpers.ts`:** عناصر فرعية جديدة (موردو المشتريات، RFQ، LCV، تصحيح doctype للجرد وBin).

### جلسة سابقة (المرحلة 4 — المبيعات وPOS — 2026-04-30)

- `**src/lib/erp/erpnext-payloads.ts`:** `buildCustomerCreate`، `buildSupplierCreate`، `buildQuotation`، `buildSalesOrder`، `buildDeliveryNote`، `buildPurchaseOrder`، توسيع `buildSalesInvoice` (POS + `additional_discount_amount`)، `**prepareFrappeDocForCreate**`.
- `**src/lib/client/api.ts` / `hooks.ts`:** `apiCallMethod` يرمي عند الفشل؛ `**useErpMethodCall**`.
- **عروض أسعار** `sales/quotations`: قائمة من API، نموذج `ErpLinkCombobox`، ترحيل، **تحويل → Sales Order** عبر `erpnext.selling.doctype.quotation.quotation.make_sales_order`.
- **أوامر بيع** `sales/sales-orders`: نموذج كامل + ترحيل/إلغاء + **فاتورة** / **إشعار تسليم** من `make_sales_invoice` / `make_delivery_note`.
- **إشعارات تسليم** `sales/delivery-notes`، **أوامر شراء** (صفحة قديمة تحت المبيعات؛ لاحقاً أُعيد توجيهها إلى `**/purchases/purchase-orders**`)، **عملاء/موردون** مرتبطون بأحمال إنشاء صحيحة.
- **POS** `sales/pos`: **POS Invoice**؛ بدون **Tax Template** من الملف؛ مزامنة مبلغ الدفع مع `grand_total` بعد المسودة ثم ترحيل؛ `apiUpdateDoc`؛ مدفوعات من **POS Profile**؛ **POS Settings**؛ سلة؛ وردية؛ طباعة؛ تعليق.
- `**src/lib/client/pos-serial-print.ts`:** طباعة ESC/POS عبر Web Serial (إصلاح أنواع `Uint8Array`).
- **تكاملات 4.4–4.7** `sales/integrations`: تبويبات + جداول DocType (شروط دفع، اشتراكات، باقات، فرق مبيعات، ولاء، شحن).
- `**helpers.ts` / `SYSTEM_MODULES`:** بند `sales-integrations`؛ تعديل POS إلى `Sales Invoice`؛ `accounting/sales-invoice` يمرّر خصم إضافي عبر `buildSalesInvoice`.

### جلسة سابقة (تعميم محاسبي + تبعيات مراحل — 2026-04-30)

- `**accounting/period-closing**` (جديد): **Period Closing Voucher** — `buildPeriodClosingVoucher`، نموذج، قائمة، **ترحيل/إلغاء ترحيل**؛ في `SYSTEM_MODULES` و`helpers.ts`.
- **3.3 / 3.4** `sales-invoice` + `purchase-invoice`: أعمدة **ترحيل** و**إلغاء ترحيل** (`useSubmitDoc` / `useCancelDoc`).
- **3.2** `journal-entry`: مكوّن **RecurringJournalEntryBlock** (قائمة `Recurring Journal Entry` عند التوفر) + نص يربط بـ project-contex.
- **3.7** `assets`: جدول **Depreciation Schedule** + فقرة بيع/تقسيط (تبعية مراحل).
- **3.1** `chart-of-accounts`: **Alert** لتوجيه الحسابات التلقائية (تبعية 10/3.1).
- **3.9** `bank-and-cash`: بطاقة **مطابقة كشف** (تبعية 3.9/9).
- **سابقاً في الجلسة نفسها:** **3.5** references في المدفوعات؛ **مرتجعات** SI/PI؛ **CSV** Bank Transaction؛ **3.10** Fiscal Year `disabled`.

### جلسة سابقة (توسيع المرحلة 3 — 2026-04-30)

- `**src/lib/erp/erpnext-payloads.ts**`, `**default-company.ts**`, `**use-account-balances.ts**`.
- `**src/components/erp/erp-link-combobox.tsx**`: اختيار مرتبط بقوائم DocType.
- **3.1** `accounting/chart-of-accounts`: `Account` من الـ API، `buildAccountCreate/Update`، استيراد CSV، رصيد عند توفر `get_balance_on`.
- **3.2** `accounting/journal-entry`: `buildJournalEntry`، بنود + تقديم/إلغاء/حذف، استيراد صفوف، **Journal Entry Template** من القائمة.
- **3.3 / 3.4** `sales-invoice` + `purchase-invoice`: `buildSalesInvoice` / `buildPurchaseInvoice` + **ErpLinkCombobox** (عميل/مورد/صنف/مستودع/مركز تكلفة).
- **3.5** `payment-entry`:** `buildPaymentEntry` + اختيار **Mode of Payment** وحسابات/طرف.
- **3.6** `cost-centers`:** `buildCostCenterCreate` + إصلاح تنسيق الأعمدة + رابط تقارير.
- **3.7** `assets`:** `buildAssetCreate` وحقول متوافقة مع **Asset** من الخلفية.
- **3.8** `cheques`:** قائمة **Payment Entry** مع تفضيل بندود الشيك.
- **3.9** `accounting/bank-and-cash` جديدة: **Bank** / **Bank Account** / **Mode of Payment**.
- **3.10** `accounting/fiscal-year` جديدة: **Fiscal Year** + نموذج.
- `**SYSTEM_MODULES` في `src/lib/core/helpers.ts`:** عناصر جديدة + تحديث doctype للشيكات.

### جلسة سابقة (إغلاق المرحلة 2 — 2026-04-30)

- `**jose**` في `**src/proxy.ts**`: تحقق توقيع HS256 على الحافة؛ CSRF للـ POST/PUT/PATCH/DELETE على `/api/*`؛ استثناء مسارات عامة؛ سياسات `**src/lib/auth/route-access.ts**` وإعادة توجيه إلى `**/forbidden**`.
- `**src/lib/auth/csrf.ts**`، `**csrf-constants.ts**`؛ تعيين/مسح **erp_csrf** في login وrefresh وlogout؛ `**src/lib/client/api.ts**` ورفع الملفات يرسلان الرأس.
- `**jwt-session**`: `exp` بالثواني؛ `**sk**` للجلسة الطويلة/القصيرة؛ `**src/lib/auth/jwt-secret.ts**` موحّد مع الوكيل.
- `**src/app/api/auth/login**`: تذكرني، أدوار من مستند User في ERPNext، سياسة كلمة مرور اختيارية.
- `**src/app/forbidden/page.tsx**`؛ `**src/lib/client/session-token.ts**`؛ إصلاح صفحة `**login**` للتحقق من JWT ثلاثي الأجزاء.
- `**app-sidebar**`: إخفاء الوحدات والروابط حسب `**canAccessPath**`.
- `**.env.example**`: `AUTH_SESSION_HOURS`، `AUTH_REMEMBER_ME_DAYS`، `AUTH_PASSWORD_MIN_LENGTH`.

---

# المتبقي

> الترتيب يطابق `**docs/DEVELOPMENT_PLAN.md**` (0 → 1 → 2، ثم 3–6، …).

> **سياسة:** أي مهمة **ضمن النطاق** ما زالت تتطلب **ERPNext Desk** للمستخدم التشغيلي تُدرَج هنا (أو في صف المرحلة أعلاه) كـ **متبقي إلزامي** حتى تُغطّى من واجهة ERP Pro؛ انظر أيضاً بند **7** في «ملاحظات مهمة».

### المرحلة 0

- **مكتملة** حسب **0.1–0.6** ضمن نطاق الكود الحالي.

### المرحلة 1

- **مكتملة** حسب **1.1–1.4** ضمن نطاق الطبقة والـ hooks والمسارات.

### المرحلة 2

- **مكتملة** حسب **2.1–2.4** للنطاق التالي: JWT + CSRF + أدوار ERPNext + تذكرني + استعادة مرور عبر Frappe + إبطال sid + proxy يتحقق من التوقيع + 403 + توجيه حسب الدور.
- **تحسين لاحق اختياري:** واجهة **2FA** كاملة عند طلب ERPNext لرمز تحقق؛ تعميق rate limiting على مسارات إضافية حسب الحاجة.

### المرحلة 3 — المحاسبة (3.1 → 3.10)

- **مُغطى في الكود:** ما سبق + **PCV** من الواجهة؛ **ترحيل فواتير** من الجداول؛ **RJE** (عرض) + **Depreciation Schedule** (عرض) + تنبيهات UI؛ بطاقة **مطابقة كشف** وAlert **Account routing**.  
- **للمقارنة مع 100% الخطة:** تفصيل **ZATCA**، **ربط SO/PO** (يعتمد 4/5)، **مطابقة بنك كاملة** (3.9 + غالباً 9)، **Recurring** كمنشئ جداول، **Auto Account** (3.1 + 10)، **بريد/طباعة** (3 + 4 + 12)، **أصول** بيع/تقسيط/استيراد Excel.

### المرحلة 4 — المبيعات (4.1–4.7)

- **منجز (مقابل `DEVELOPMENT_PLAN.md` + الكود):** **4.1** عروض + بنود + ترحيل + **تحويل → SO**؛ **4.2** SO + **SI / DN** من الترحيل؛ **4.3** POS بـ **POS Invoice** (مدفوعات الملف + ترحيل + مرتجع + وردية + طباعة + مسح + تعليق؛ **POS Settings**)؛ **4.4** تقسيط واشتراكات: **Payment Terms Template** + **Subscription** + **Subscription Plan**؛ **4.5** عمولات: **Sales Team** + **Sales Person**؛ **4.6** **Loyalty Program**؛ **4.7** **Shipping Rule** — كلها في `**/sales/integrations**` مع جداول متقدمة.
- **مستبعد عن نطاق واجهة ERP Pro:** فوترة ZATCA/ETA **مدمجة**، بوابات دفع Tabby/Stripe… **مدمجة**، وأوفلاين POS — لا يُطلب بناؤها في الواجهة؛ **لا يُعوَّض** عن ميزات **داخل النطاق** بمسار Desk يومي (انظر سياسة المنتج).

### المراحل 5 — 6

- **مكتمل وظيفياً في الواجهة + API** مقابل **5.1–5.5** و**6.1–6.8** (انظر جدول المراحل أعلاه).

#### نُفِّذ الآن (تكميلي على 5/6)

- **6.6 — أسعار الأصناف:** إدارة `**Item Price**` من `**/inventory/price-lists**` ضمن سياسة **عدم الاعتماد على Desk**.
- **تنظيم المسارات:** أوامر الشراء من الشريط فقط تحت **المشتريات**؛ الرابط القديم `**/sales/purchase-orders**` يعيد التوجيه.

#### متبقي مطابقة للخطة وسياسة عدم مسار Desk التشغيلي


| البند                                                                | أين يُعالَج أو لماذا يُؤجَّل                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **استيراد Excel** (موردين، أصناف، بنود)                              | مهمة واجهة مستقلة (حجم عمل)؛ يمكن لاحقاً ضمن **5/6** أو **10** حسب التصميم.    |
| **بريد RFQ تلقائي**                                                  | يعتمد على **بريد وقوالب Frappe/ERPNext**؛ ليس بديله شاشة بسيطة في الواجهة فقط. |
| **مقارنة عروض موردين** في شاشة واحدة مخصصة                           | تحسين UX اختياري؛ يمكن لاحقاً ضمن **5** أو **12**.                             |
| **تقارير مخزون/تصنيع** (لوحات، 30+ تقرير)                            | **المرحلة 9** حسب `**DEVELOPMENT_PLAN.md**`.                                   |
| **ZATCA / فوترة إلكترونية كاملة**                                    | **3 / 10** (+ **9** تقارير امتثال إن وُجدت)                                      |
| **موافقات Workflow مخصصة في الواجهة**                                | **Workflow Studio** + `Workflow` DocType في ERP Pro؛ تعميق اختياري لاحقاً (سياسة: لا مسار Desk يومي).                                       |
| **Product Bundle / Variant** وواجهات عميقة للصنف                     | تبقى جزئية في ERP Pro حتى توسيع صريح في **6.1** (لا الاكتفاء بـ Desk).        |
| **حقول متقدمة على Item Price** (صلاحية من/إلى، دفعة، عميل/مورد محدد) | غير مُعرَّضة حالياً في النموذج؛ يمكن إضافتها لاحقاً دون تغيير مرحلة الخطة.     |


### المرحلة 7 — الموارد البشرية (7.1 → 7.7)

- **مُغطى الآن:** موظفون موسعون + هيكل تنظيمي + عقود وتجديد + حضور يدوي/جماعي + Checkin + ورديات + عطلات + طلبات موظفين + أنواع/طلبات إجازة + سياسات/تخصيصات إجازة + هياكل/مسير/كشوف رواتب + سلف + قروض + مستندات موظفين.
- **المتبقي المطابق للخطة:** 
  - **7.1:** أقسام تعليم/خبرات/أصول/عهدة بقوالب أقوى وربط صلاحيات أدق.
  - **7.2:** استيراد عقود Excel وتدفقات إيقاف/استبدال بعلاقات سير عمل.
  - **7.3:** ربط بصمة إنتاجي (Scheduler/API) + دفاتر حضور period-based متقدمة + محرك عقوبات.
  - **7.4:** موافقات متعددة المستويات حسب المدير/القسم مع transitions workflow كاملة.
  - **7.5:** تصدير رواتب بنكي (WPS/SEPA حسب البلد) + ربط قيود محاسبية مخصصة.
  - **7.6–7.7:** نماذج dynamic لكل نوع طلب + تنبيهات انتهاء مستندات تلقائية.

### المرحلة 8 — CRM (8.1 → 8.7)

- **مُغطى الآن:** CRM Customers، Leads، Opportunities، Activities، Follow-ups، Appointments (recurring + ICS)، Timeline موحد، Subscriptions، Credits، Portal bridge، Messages config-ready + Notification Log.
- **المتبقي المطابق للخطة:**
  - **8.1:** استيراد Excel للعملاء + custom fields metadata-driven.
  - **8.2:** assignment ذكي وautomation lifecycle rules لكل عميل.
  - **8.3:** reminders فعلية عبر queue وربط مزودات الرسائل.
  - **8.4–8.5:** ربط الاشتراكات/الأرصدة ببوابة الدفع الفعلية وwebhooks.
  - **8.6:** self-signup/self-service customer portal خارجي/داخلي كامل.
  - **8.7:** قوالب متعددة اللغات مع retry engine ولوحة مراقبة إرسال.

### المرحلة 10 — الإعدادات والتكاملات

- **مُغطى الآن:**
  - **10.1:** تعزيز إعدادات النظام + API إعدادات config-ready (`/api/settings/config`) وربط أكبر بصفحات settings.
  - **10.2:** صفحة الفروع أصبحت CRUD فعلي على DocType `Branch` بدل بيانات محلية.
  - **10.3:** صفحة قوالب الطباعة `settings/print-templates` على `Print Format`.
  - **10.4:** صفحة شروط وأحكام `settings/terms-and-conditions` على `Terms and Conditions`.
  - **10.5:** صفحة تكاملات موحدة `settings/integrations` (Zid/Shopify/Salla/Woo/SMS/WhatsApp) بنمط Config-ready.
  - **10.6:** صفحة أمن `settings/security` (سياسات كلمة مرور/جلسة/IP + سجل دخول).
  - **10.7:** صفحة `settings/custom-fields` (منشئ حقول مخصصة عبر `Custom Field`).
- **المتبقي المطابق للخطة:**
  - توصيل persistence مؤسسي دائم للإعدادات (ليس in-memory فقط) وربطه بكيانات ERPNext/DB مستقرة.
  - تفعيل adapters إنتاجية مع مفاتيح حقيقية واختبارات webhooks ومراقبة أخطاء.
  - enforcement مباشر لسياسات الأمان على جميع المسارات من شاشة Security.

### المرحلة 9 — التقارير

- **مُغطى الآن:**
  - **9.1–9.6:** ربط `/reports` بتقارير ERPNext Query Reports عبر catalog شامل.
  - **9.7:** `audit-log` يقرأ `Activity Log` فعلياً (مع fallback عند غياب البيانات).
  - **9.8:** بناء محرك تقارير موحد:
    - `src/lib/reports/catalog.ts`
    - `src/lib/server/report-access.ts`
    - Hook `useRunReport` في `src/lib/client/hooks.ts`
    - APIs: `/api/reports/[reportName]`, `/api/reports/favorites`, `/api/reports/schedules`, `/api/reports/export`.
- **المتبقي المطابق للخطة:**
  - تحسين mapping بعض التقارير التخصصية حسب البيئة (أسماء reports تختلف بين مواقع ERPNext).
  - تصدير Excel/PDF backend-grade كامل + جدولة بريد فعلية بعمال خلفية ثابتة.
  - رسوم بيانية dashboard-level أدق لكل تقرير (series جاهزة للعرض التفاعلي).

### المرحلة 11 — متقدم

- **11.1 بوابة العميل (Web Portal):**
  - المتاح حالياً: `crm/portal` bridge داخلي + `src/app/portal/page.tsx` كبوابة خارجية تشغيلية تتضمن إجراءات موافقة عرض وإنشاء دفعة.
  - المتبقي: مصادقة عميل حقيقية، تحديث ملف عميل ذاتياً، سداد online gateway فعلي، وتدفق مرتجعات كامل.
- **11.2 تطبيق الحضور ESS:**
  - المتاح حالياً: `operations/ess-attendance` مربوط فعلياً بـ `Employee Checkin` مع سجل يومي.
  - المتبقي: geofence/IP policy enforcement ورفع صور binary.
- **11.3 تطبيق تسجيل المصروفات:**
  - المتاح حالياً: `operations/mobile-expenses` مرتبط بـ `Expense Claim` (إنشاء/عرض) مع OCR mock.
  - المتبقي: OCR فعلي (service/API) + سير اعتماد Expense Claim متعدد المستويات مع مرفقات حقيقية.
- **11.4 تطبيق جرد المخزون:**
  - المتاح حالياً: `operations/mobile-inventory-count` ينشئ `Stock Reconciliation` فعلياً.
  - المتبقي: ماسح باركود حي وتحسين إدخال الكميات أثناء الاتصال (لا يُستهدف **أوفلاين** أو مزامنة خلفية في نطاق المنتج).
- **11.5 الإيجارات والتأجير:**
  - المتاح حالياً: `operations/rentals` لإدارة أساسية للعقود والحالة والإيراد الشهري.
  - المتبقي: تسعير موسمي، حجوزات تلقائية، عقود مترابطة مع فوترة تلقائية عند الحجز.
- **11.6 تتبع الوقت:**
  - المتاح حالياً: `operations/time-tracking` (مؤقت + سجلات + مشاريع/أنشطة).
  - المتبقي: ربط الوقت المسجل بفواتير مبيعات/مشاريع تلقائياً وتسعير ساعي حسب المشروع/الموظف.
- **11.7 أوامر الشغل:**
  - المتاح حالياً: `operations/work-orders-ops` لإدارة أوامر تشغيل (جديد/تنفيذ/مكتمل/ملغي).
  - المتبقي: تحويل تلقائي للفوترة وربط أعمق بالمخزون وحجز قطع الغيار.
- **11.8 API للمطورين:**
  - المتاح حالياً: صفحة `operations/developer-api` + APIs (`openapi/api-keys/webhooks/rate-limit`) مع scopes + revoke + dispatch/retry + delivery logs.
  - المتبقي: Swagger UI تفاعلي كامل محلي، OAuth/tenant policies، وتخزين durable للـ queue والـ deliveries.
- **11.9 دورات العمل المتقدمة:**
  - المتاح حالياً: `operations/workflow-studio` مربوط بـ `Workflow` DocType (إنشاء/قراءة).
  - المتبقي: محرر مرئي drag-and-drop وربط كامل مع `Workflow` في ERPNext وقواعد approval enterprise.

### المرحلة 12 — تحسين التصميم والتجربة (12.1 → 12.5)

- **مُنفَّذ في الطبقة المشتركة والأمثلة:** انظر صف **المرحلة 12** في جدول «مقارنة تفصيلية بالمراحل» أعلاه (`DataTable`، `global-search`، `DashboardWidgetBoard`، `ContextRailProvider`، `SettingsHubTiles`، `ErpField`، `ErpTabbedForm`، أدوات المسودة/الأخطاء/التراجع الخفيف).
- **متبقي اختياري (تعميم وليس حجباً للمرحلة):**
  - تعميم `**tableId` / `columnFilters` / `selectable` / `stickyFirstColumn**` على كل الجداول ذات الصلة بدل صفحة الأصناف فقط.
  - **لوحات حسب الدور:** منطق افتراضي لترتيب/إظهار الـ widgets حسب `user.roles` من JWT (حالياً تخصيص فردي عبر localStorage).
  - **تبويبات نماذج** على نماذج طويلة محددة (مثل فواتير متعددة الأقسام) باستخدام `ErpTabbedForm` حيث يسهل على المستخدم.
  - **Undo/Redo** على مستوى المستند (ليس toast فقط) عند ربط مسار API صريح.
  - **مقاييس الخطة العامة:** اختبارات آلية، SLA استجابة، وتوسيع التقارير — خارج تعريف المرحلة 12 الضيق في `DEVELOPMENT_PLAN.md`.

---

# ملاحظات مهمة

1. عند كل تحديث لهذا الملف يدوياً: راعِ **التفصيل** في قسمَي **الوضع الحالي ونسبة الإنجاز** و**المتبقي** واربطهما ببنود `**docs/DEVELOPMENT_PLAN.md**`. **قاعدة Cursor `project-contex.mdc` معطّلة** — الوكيل لا يُفترض أن يُحدّث هذا الملف تلقائياً ضمن مسار **`docs/fixsystem.md`** (مرجع الوكيل: **`fixsystem-progress.md`**).
2. `**AUTH_JWT_SECRET**` إلزامي في الإنتاج؛ راجع `**.env.example**`.
3. `**AUTH_ALLOW_LEGACY_TOKEN**`: للترقية فقط من رموز قديمة.
4. `**proxy.ts**` فقط (لا `middleware.ts` معه في Next 16 الحالي).
5. `**npm run build**` و`**npm run build:webpack`** يستخدمان `**next build --webpack`**.
6. بعد تسجيل الدخول يجب أن يكون المتصفح يملك `**erp_csrf**` (وللطلبات عبر `api.ts` رأس `**x-csrf-token**`) لنجاح الطلبات المعدّلة؛ عند أخطاء **403 CSRF** أعد تسجيل الدخول أو امسح الكاش المحلي للجلسة القديمة.
7. **سياسة عدم الاعتماد على ERPNext Desk (إلزامية للنطاق):** أي ميزة **ضمن نطاق المنتج والخطة** يجب أن تُنجز **بالكامل من واجهات ERP Pro** (لا مسار يومي عبر Desk للمستخدم التشغيلي). **Desk** للصيانة/الطوارئ التقنية فقط. الاستثناءات **المستبعدة صراحة** (أوفلاين POS، ZATCA/بوابات **مدمجة** داخل التطبيق كما اتُفق) لا تُبنى في الواجهة ولا تُفسَّر كإذن بـ Desk لتعويض ميزة داخل النطاق. التفاصيل: قسم **«سياسة منتج إلزامية»** في `docs/DEVELOPMENT_PLAN.md`.
8. **تدقيق إغلاق المراحل 0–1–2 (مقابل `docs/DEVELOPMENT_PLAN.md`):** **0.1** `ignoreBuildErrors: false` في `next.config.ts`؛ **0.2** `User` فيه `fullName` و`name` في `lib/core/types.ts`؛ **0.3** دوال مساعدة مركزية (مثلاً `formatCurrency`، `cn`)؛ **0.4** أيقونات/metadata محلية في `layout`؛ **0.5** `src/proxy.ts` (بدل `middleware.ts` في Next 16) يحمي لوحة التحكم و`/api/*`؛ **0.6** لا يوجد `next-auth` في `package.json`. **1.1** `backend.ts` مع أخطاء واضحة وretry وRedis اختياري و`BACKEND_LOG_REQUESTS`؛ **1.2** `doc-hooks.ts` + `hooks.ts` (`useCreateDoc`…`useAmendDoc` و`useDocList`)؛ **1.3** `src/app/api/data/*` و`/api/reports/*` و`/api/method/*`؛ **1.4** لا `demoData` في صفحات `src/app` (تبقى `DEMO_ACCOUNTS` لمسار تسجيل الدخول فقط). **2.1–2.4** كما جدول المرحلة 2 أعلاه. **لا يُعتبر ناقصاً لإغلاق 0–2:** استبدال الاسم `middleware` بالـ `proxy`؛ **2FA واجهة** كما ورد «اختياري» في الخطة (لم يُنفَّذ مسار رمز داخل التطبيق)؛ **Zod** على كل حقول الـ API كما وصفت الخطة اختيارياً لاحقاً.
9. **تبعيات يجب تنفيذها في المرحلة التي تتطلبها (عند اختيار الميزة):** النتيجة النهائية لكل بند **ضمن النطاق** يجب أن تكون **قابلة للإنجاز من واجهة ERP Pro** (انظر سياسة «عدم الاعتماد على Desk» في `docs/DEVELOPMENT_PLAN.md`). مرجع سلوك Frappe/Desk يُستخدم **لتصميم API والحقول** فقط، لا كمسار تشغيل للمستخدم.
10. **تحليل الفجوات (`docs/fixsystem.md`) + التتبع:** التقرير لقطة تحليل؛ **لا يُستبدل** **`DEVELOPMENT_PLAN.md`**. تتبع تنفيذ إصلاحات التقرير يكون في **`fixsystem-progress.md`** (قواعد **`.cursor/rules/fixsystem-gap-analysis.mdc`**). عند تعارض **نطاق المنتج** (مستبعدات، Desk، ZATCA مدمج) رجع **`DEVELOPMENT_PLAN.md`** — **`project-contex.md`** ليس مرجع تتبع لمسار fixsystem.
11. **قاعدة `.cursor/rules/project-contex.mdc`:** **معطّلة** في المشروع (`alwaysApply: false` + جسم يوجّه للمسار البديل). لا تُستخدم كقاعدة تشغيلية للوكيل؛ مسار الإصلاحات والمنجز/المتبقي عبر **`fixsystem-progress.md`** و**`fixsystem-gap-analysis.mdc`**.

| الميزة / الفجوة                                                                                       | المرحلة الأنسب في `DEVELOPMENT_PLAN.md`                                             | ملاحظة تنفيذ                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ربط فواتير المبيعات/الشراء بـ **أمر بيع/شراء**، **دفعات مقدمة**، **Recurring Sales/Purchase Invoice** | **4** (مبيعات، POS) و **5** (مشتريات)                                               | يتطلب `Sales Order` / `Purchase Order` مكتملة وربط الحقول `items` و`against_sales_order` / `po_ref` حسب نموذج ERPNext؛ **الإكمال من ERP Pro**.                                                                               |
| **ZATCA** (المرحلتان 1 و2) و**فوترة إلكترونية**                                                       | **3** (استكمال) + **10** (تكاملات/إعدادات Company) + إن وُجدت **9** (تقارير امتثال) | إن دُمجت لاحقاً: عبر API الهيئة/تطبيق موازٍ؛ **إن وُجدت داخل النطاق** فيجب UI في ERP Pro، لا الاكتفاء بـ Desk.                                                                                                            |
| **بريد** و**قوالب طباعة** (فواتير، PDF، WYSIWYG)                                                      | **4**–**5** (مستندات مبيعات/مشتريات) و **12** (تجربة)                               | ربط `Email Account` / `Print Format` عبر API؛ **مصمم قوالب وإرسال من ERP Pro** عند اعتبار الميزة ضمن النطاق.                                                                                                                |
| **نقاط البيع POS** و**جلسات وريشة**                                                                   | **4.3**                                                                             | صفحة `**/sales/pos`** تُنشئ `**POS Invoice**` (مع **POS Settings → POS Invoice**)؛ وردية Opening/Closing؛ **Sales Invoice** لمسارات المحاسبة/أمر البيع. **أوفلاين POS** و**طابعات بلوتوث** خارج نطاق المنتج.            |
| **تسوية بنكية كاملة** (مطابقة every line مع Voucher)                                                  | **3.9** + **9** (تقارير/أدوات)                                                      | استيراد `Bank Transaction` + **واجهة مطابقة في ERP Pro** (مرجع منطق Frappe دون الاكتفاء بـ Desk للمستخدم).                                                                                                                 |
| **معالج Recurring Journal Entry** (إنشاء/تعديل جدول تلقائي)                                           | **3.2**                                                                             | العرض مضاف؛ الإنشاء الكامل **من ERP Pro** يتبع doctype RJE + صلاحيات.                                                                                                                                                       |
| **توجيه الحسابات التلقائي (Auto Account)**                                                            | **3.1** + **10** (إعدادات Company / القوالب)                                        | الضبط في `Company`/`Account`؛ **شاشات إعداد في ERP Pro** عند اعتبار الميزة ضمن النطاق.                                                                                                                                   |
| **أصول: بيع، تقسيط، استيراد Excel**                                                                   | **3.7** (+ **4** لربط فاتورة بيع أصل إن وُجد)                                       | `Asset` + دوال Frappe؛ **تدفقات البيع/التقسيط/الاستيراد من الواجهة** عند الطلب ضمن النطاق.                                                                                                                                 |
| **دفاتر شيكات** متقدمة (دفتر، حالات مقاص)                                                             | **3.8** (+ تقارير **9**)                                                            | توسعة في ERP Pro فوق `Payment Entry` / موديول `Cheque` عند الطلب.                                                                                                                                                         |
| **30+ تقرير محاسبي** / لوحات                                                                          | **9**                                                                               | استعلامات Query Report + صفحات `reports/`*.                                                                                                                                                                               |
| **CRM/عملاء/عروض** مرتبطة بفوترة                                                                      | **8** + **4**                                                                       | مسارات `Lead` → `Quotation` → `SO` → `SI`.                                                                                                                                                                                |
| **SMS / WhatsApp** للمستندات                                                                          | **10** + **3**/**4** (حدث «بعد فاتورة»)                                             | إعدادات وقوالب وإرسال **من ERP Pro** عند اعتبار التكامل ضمن النطاق.                                                                                                                                                        |


