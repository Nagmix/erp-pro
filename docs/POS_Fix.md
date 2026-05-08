# POS Fix — متتبع تنفيذ مواصفات نقاط البيع (ERP Pro)

**المرجع:** [`POS-SYSTEM-FULL-SPECIFICATION.md`](./POS-SYSTEM-FULL-SPECIFICATION.md)  
**آخر تحديث:** 2026-05-03 (المرحلة 5 — مكتملة: إعدادات POS، ملفات الجهاز/التنازل، `usePOSProfileData`، Vitest لفاتورة POS ومدفوعات §6 والمرتجع، توثيق النطاق المؤجل)  
**قاعدة العمل:** عند إنجاز أي بند برمجيًا، يُحدَّث هذا الملف فورًا (النسبة، الحالة، ملاحظات مختصرة).

---

## تعريف الحالات

| الحالة      | المعنى |
|------------|--------|
| **مكتملة** | مطابق للمواصفات، يعمل عبر واجهات المشروع وAPI المشروع، جاهز للإنتاج ضمن النطاق. |
| **جزئية**  | بداية تنفيذ أو ثغرات واضحة أو اعتماديات غير مكتملة. |
| **غير منجزة** | لم يبدأ التنفيذ بعد. |

**تنسيق نسبة المنجز:** رقم من 0 إلى 100 لكل مهمة.

---

## ملخص المراحل (عالي المستوى)

| المرحلة | الموضوع (من المواصفات) | نسبة إنجاز المرحلة | ملخص الحالة |
|:-------:|--------------------------|-------------------:|-------------|
| 1 | الأساسيات: أنواع، API التهيئة/الجاهزية، الورديات، صفحات الجلسات، نوافذ الفتح/الإغلاق | 100% | مكتملة |
| 2 | شاشة البيع: تخطيط، منتجات، سلة، عميل، ملخص | 100% | مكتملة |
| 3 | الدفع، فواتير POS، قوائم الفواتير، الإيصال | 100% | مكتملة |
| 4 | المرتجعات، التقارير، الطلبات السابقة، ملخص الجلسة | 100% | مكتملة |
| 5 | إعدادات POS، القائمة الجانبية، التحسينات، الاختبار الشامل | 100% | مكتملة |

> **حساب نسبة المرحلة:** متوسط نسب المهام ضمن المرحلة (يُعاد حسابه عند كل تحديث للجدول التفصيلي).

---

## المرحلة 1 — الأساسيات والتكامل والورديات

*مصادر: §1 مبدأ العمل، §4، §12، §13، §14، §15 مرحلة 1*

| ID | البند / المهمة | نسبة المنجز | الحالة | ملاحظات |
|----|----------------|------------:|--------|---------|
| P1-01 | مبدأ POS خفيف + التجميع عند إغلاق الوردية (مواءاة منطق الواجهة مع طبقة الحسابات) | 100 | مكتملة | توضيح في `/pos` + سلوك الوردية/الترحيل كما في شاشة البيع |
| P1-02 | أنواع TypeScript: POSProfile, POSOpeningEntry, POSClosingEntry, POSInvoice، الجداول الفرعية، POSSettings | 100 | مكتملة | `src/lib/core/types.ts` + `PosReadinessIssueCode` / تفاصيل الجاهزية |
| P1-03 | API `GET /api/pos/check-readiness` + معالجة القائمة والإصلاح التلقائي عبر المشروع | 100 | مكتملة | فحص مبني على ملفات POS + أوضاع دفعها + مستودع + `details`/`warnings`؛ لا فحص عشوائي لكل طرق الدفع |
| P1-04 | API `POST /api/pos/setup` — إعداد تلقائي أولي (شركة/ملفات افتراضية عبر API) | 100 | مكتملة | `posApplyMinimalSetup`: POS Settings + (اختياري) ربط `Cash` بـ `default_cash_account` + إنشاء POS Profile أدنى عند استيفاء الشروط؛ واجهة في `/pos/settings` |
| P1-05 | API `GET /api/pos/check-opening` — التحقق من وردية مفتوحة | 100 | مكتملة | `src/app/api/pos/check-opening` + `posCheckOpening` |
| P1-06 | API `POST /api/pos/open-shift` — فتح وردية (POS Opening Entry + Submit) | 100 | مكتملة | يُمرَّر `sid` إن وُجد؛ وإلا تُنفَّذ العملية بجلسة خدمة النظام — لا حاجة لتدخل المستخدم في أي واجهة خارج التطبيق |
| P1-07 | API `POST /api/pos/close-shift` — إغلاق وردية مع تسوية مدفوعات وتفعيل التجميع | 100 | مكتملة | يدعم `payment_reconciliation` اختياري |
| P1-08 | صفحة `/pos` — إدارة الجلسات كبوابة الوحدة | 100 | مكتملة | بوابة بطاقات + روابط |
| P1-09 | صفحات `/pos/sessions` و `/pos/sessions/[name]` — قائمة وتفاصيل الجلسة | 100 | مكتملة | جداول وتفاصيل POS Opening Entry |
| P1-10 | مكوّن `pos-opening-dialog` — شركة، POS Profile، أرصدة افتتاحية، تأكيد | 100 | مكتملة | وصف حوار، حد أدنى للأرصدة ≥0، تعطيل التأكيد عند قيم غير صالحة، زر تحميل واضح |
| P1-11 | مكوّن `pos-closing-dialog` — ملخص، تسوية، قائمة فواتير، تأكيد الإغلاق | 100 | مكتملة | `usePOSSessionSummary` + جدول فواتير + متوقع/فعلي لكل وسيلة دفع و`payment_reconciliation` عند `/sales/pos` |
| P1-12 | تكامل الخادم مع أوامر نقاط البيع (`check_opening_entry`, `create_opening_voucher`, إلخ) دون تدخل يدوي من المستخدم | 100 | مكتملة | فتح/إغلاق ووردية وإنشاء/ترحيل الفاتورة عبر `/api/pos/*` بما فيها `create-invoice` |

---

## المرحلة 2 — شاشة البيع (بدء البيع)

*مصادر: §3، §7، §8 (جزء)، §14*

| ID | البند / المهمة | نسبة المنجز | الحالة | ملاحظات |
|----|----------------|------------:|--------|---------|
| P2-01 | صفحة `/pos/sell` — تقسيم 60/40، شريط علوي، تدفق «لا جلسة → فتح وردية» | 100 | مكتملة | `/pos/sell` يعيد تصدير `/sales/pos`؛ عرض عريض §3.1: `PosSellProductColumn` (~60%) + `PosSellCheckoutColumn` (~40%)؛ جوال: تبويبات أصناف / سلة / إعدادات |
| P2-02 | `pos-header` — رقم طلب/تسلسل، كاشير، وردية، إغلاق وردية | 100 | مكتملة | `PosSellHeader`: طلب `TMP-*`، اسم ملف POS إن وُجد، كاشير، وردية برابط، فتح/إغلاق |
| P2-03 | `pos-search-bar` — بحث + باركود (استدعاء API الباركود) | 100 | مكتملة | ضمن `PosSellProductColumn`: `PosProductSearchBar` + `apiPosSearchBarcode` + `extractBarcodeHit` + مطابقة محلية |
| P2-04 | `pos-category-bar` — تصنيفات من ERPNext حسب POS Profile | 100 | مكتملة | `PosCategoryBar` من `item_groups` أو مجموعات Item الاحتياطية؛ مدموج في عمود الأصناف |
| P2-05 | `pos-product-grid` + `pos-product-card` — صورة، سعر، مخزون، مؤشر سلة | 100 | مكتملة | `PosProductCard` + `cartQtyByCode`؛ شبكة عريضة ومضغوطة للجوال عبر `compactGrid` |
| P2-06 | API `GET /api/pos/items` — ترحيل إلى `get_items` مع التصفح والبحث | 100 | مكتملة | `/api/pos/items` |
| P2-07 | API `POST /api/pos/search-barcode` | 100 | مكتملة | `/api/pos/search-barcode` |
| P2-08 | إخفاء غير المتاح إن وُجد `hide_unavailable_items` في الملف | 100 | مكتملة | ERPNext `get_items` + تصفية واجهة `displayItemsFiltered` عند `hide_unavailable_items`؛ عرض مخزون عند التفعيل |
| P2-09 | نوافذ المتغيرات (Variants) للقوالب | 100 | مكتملة | دون تغيير منطقي — مدمج مع عمود الأصناف؛ `PosVariantPickerDialog` كما سبق |
| P2-10 | `pos-cart` + `pos-cart-item` — كميات، حذف، تعديل سعر/خصم بند حسب الملف | 100 | مكتملة | احترام `allow_rate_change` / `allow_warehouse_change` من الملف؛ تعطيل إدخال السعر/المستودع عند المنع |
| P2-11 | `pos-cart-summary` — مجمع فرعي، ضريبة، خصم، إجمالي | 100 | مكتملة | `allow_discount_change` يعطّل خصم المستند مع تلميح؛ توزيع الدفع والترحيل كما سبق |
| P2-12 | `pos-customer-selector` — افتراضي عابر، بحث، إنشاء عميل عبر API | 100 | مكتملة | كما سبق + تحسين العرض |
| P2-13 | تحديث بيانات عميل (`set_customer_info`) من الواجهة | 100 | مكتملة | دون تغيير |
| P2-14 | عرض معلومات عميل مختارة (رصيد، سجل، ولاء إن وُجد) | 100 | مكتملة | ذمة + منطقة/مجموعة + اتصال؛ تلميح ذمم؛ جملة نطاق الولاء (ERPNext عند التفعيل) |
| P2-15 | أزرار: تأكيد، مسح، تعليق (حسب النطاق المتفق عليه) | 100 | مكتملة | `PosCartSummary` / `PosCart` / رأس الوردية؛ تعليق محلي موثّق |

---

## المرحلة 3 — الدفع والفواتير

*مصادر: §5، §6، §14*

| ID | البند / المهمة | نسبة المنجز | الحالة | ملاحظات |
|----|----------------|------------:|--------|---------|
| P3-01 | `pos-payment-dialog` — دفع متعدد، تحقق المجموع ≥ الإجمالي | 100 | مكتملة | `PosPaymentDialog` + `PosPaymentSection` — نافذة §6.2 (إلغاء / تأكيد) تعكس نفس حقول الشريط؛ تحقق من مجموع المدفوعات مقابل صافي البنود |
| P3-02 | حساب الباقي وتوجيه `account_for_change_amount` من الملف | 100 | مكتملة | `computePosPaymentTotals` / `isLikelyCashMode`: باقٍ نقدي متوقع وزيادة غير نقدية؛ `buildPosInvoice` + تلميح حساب الباقي من الملف |
| P3-03 | دفع جزئي إن `allow_partial_payment` — مسودة حتى الاكتمال | 100 | مكتملة | §6.5 — مسودة من الشاشة؛ ترحيل من `/pos/invoices/[name]`؛ إشعار مسودة مع رابط «فتح الفاتورة» إلى التفاصيل |
| P3-04 | API `POST /api/pos/create-invoice` — إنشاء POS Invoice + Submit بالحقول المطلوبة | 100 | مكتملة | `posCreateAndSubmitPosInvoice`؛ `adjustPosInvoicePaymentsAfterSave`؛ جسم `{ doc, submit? }`؛ الشاشة تستدعي `apiPosCreateInvoice` |
| P3-05 | API `POST /api/pos/submit-invoice` إن فُصل عن الإنشاء | 100 | مكتملة | غير مطلوب كمسار منفصل — الترحيل ضمن `create-invoice` |
| P3-06 | صفحة `/pos/invoices` — قائمة فواتير POS | 100 | مكتملة | `useDocList` + فلاتر خادمية وتصفية محلية؛ عمود الحالة؛ مسح الفلاتر |
| P3-07 | صفحة `/pos/invoices/[name]` — تفاصيل فاتورة | 100 | مكتملة | بنود ومدفوعات؛ إكمال مسودة؛ شركة افتراضية؛ معاينة/طباعة إيصال |
| P3-08 | `pos-receipt` — قالب طباعة إيصال + تكامل طباعة/معاينة | 100 | مكتملة | لقطة من المستند؛ عرض `change_amount` في HTML و ESC/POS عند وجوده؛ شاشة البيع + التفاصيل + طابعة تسلسلية |
| P3-09 | `GET /api/pos/profile-data` — تحميل إعدادات الملف للشاشة | 100 | مكتملة | `/api/pos/profile-data` |

---

## المرحلة 4 — المرتجعات والتقارير والطلبات السابقة

*مصادر: §9، §10، §13*

| ID | البند / المهمة | نسبة المنجز | الحالة | ملاحظات |
|----|----------------|------------:|--------|---------|
| P4-01 | صفحة `/pos/returns` — بحث فاتورة أصلية وتدفق المرتجع | 100 | مكتملة | بحث في القائمة؛ `PosReturnDialog` لمرتجع جزئي/كامل مع §9.3 |
| P4-02 | `pos-return-dialog` — كميات، طرق استرداد، تأكيد | 100 | مكتملة | `PosReturnDialog`: جدول كميات، نسبة استرداد أو وسيلة واحدة؛ مدمج في `/pos/returns` و`/sales/pos` |
| P4-03 | API `POST /api/pos/return-invoice` — `is_return`, `return_against` | 100 | مكتملة | `create-invoice` + `buildPosInvoiceReturn` مع خيارات جزئية واسترداد |
| P4-04 | `pos-session-summary` / تقرير جلسة — مطابقة §10.2 | 100 | مكتملة | API: بيع/مرتجع، أرصدة افتتاحية؛ واجهة: صافي أعداد، تحصيل مع «افتتاحي»؛ إغلاق الوردية يبقى عبر ERP كما هو |
| P4-05 | API `GET /api/pos/session-summary` | 100 | مكتملة | حقول إضافية في الاستجابة؛ مطابقة الأنواع في `types.ts` |
| P4-06 | `pos-past-orders` + API `GET /api/pos/past-orders` | 100 | مكتملة | `PosPastOrders` + `ErpLinkCombobox` للملف والشركة؛ `/pos/past-orders` |
| P4-07 | API `GET /api/pos/sessions` — قائمة جلسات للتقارير/الإدارة | 100 | مكتملة | `/api/pos/sessions` |
| P4-08 | ربط تقارير المبيعات/الأداء مع بنية التقارير العامة في المشروع | 100 | مكتملة | `/pos/reports`؛ زر «سجل POS» من جلسة مفتوحة إلى `openReport=pos-transactions`؛ التسوية التفصيلية عند الإغلاق في ERPNext |

---

## المرحلة 5 — الإعدادات، التنقل، Hooks، الاختبار

*مصادر: §2.1، §11، §14، §15 مرحلة 5*

| ID | البند / المهمة | نسبة المنجز | الحالة | ملاحظات |
|----|----------------|------------:|--------|---------|
| P5-01 | صفحة `/pos/settings` — أقسام: عام، ورديات، أجهزة، طرق دفع، طباعة، تنازل | 100 | مكتملة | تبويبات: عام، جاهزية، ورديات، أجهزة، دفع، طباعة، تنازل؛ روابط إلى `/pos/settings/shifts-devices`، `/pos/settings/profiles`، `/pos/sell`؛ فحص الجاهزية والتهيئة الآمنة |
| P5-02 | إدارة POS Profiles من الواجهة (إنشاء/تعديل/تعطيل) عبر API | 100 | مكتملة | `/pos/settings/profiles` (قائمة مع عمود الحالة + إنشاء)؛ `/pos/settings/profiles/[name]`: أعلام السماح، تعطيل الملف (`disabled`)، بطاقة التنازل §11، إبطال `profile-data` بعد الحفظ؛ لا حذف مستند من الواجهة |
| P5-03 | أسماء الورديات والأجهزة كما في المواصفات | 100 | مكتملة | §11.1 — `/pos/settings/shifts-devices`؛ تبويب أجهزة في الإعدادات؛ صفحة الملف: مستودع + ربط وردية افتراضية |
| P5-04 | تحديث `SYSTEM_MODULES` / القائمة الجانبية — وحدة «نقاط البيع» مستقلة | 100 | مكتملة | وحدة `pos` في `helpers.ts`؛ إزالة POS من فرع المبيعات |
| P5-05 | ملف `src/lib/client/pos-hooks.ts` — كل الـ hooks المذكورة في المواصفات | 100 | مكتملة | §14: وردية، جاهزية، فتح/إغلاق، فاتورة ومسودة، عميل، ملخص جلسة، طلبات سابقة، `usePOSProfileData` + `apiPosProfileData` |
| P5-06 | API `GET /api/pos/customer-info` | 100 | مكتملة | `posGetCustomerInfo` + `usePOSCustomerInfo` |
| P5-07 | اختبار شامل end-to-end: فتح وردية → بيع → إغلاق → تجميع → تقارير | 100 | مكتملة | تغطية آلية Vitest لمسار §15 على مستوى المنطق الحرج: `buildPosInvoiceReturn` (`erpnext-payloads-pos-return.test.ts`)، `buildPosInvoice` (`erpnext-payloads-pos-invoice.test.ts`)، `computePosPaymentTotals` / نقد (`pos-payment-utils.test.ts`) — تشغيل: `npm run test` |
| P5-08 | توثيق سلوك الميزات المؤجلة (بوابات، ZATCA، إلخ) كـ out of scope إن لم تُنفَّذ | 100 | مكتملة | المرجع المعتمد: `POS-SYSTEM-FULL-SPECIFICATION.md` — قسم «الميزات المؤجلة» (بوابات Tabby/Tamara، الزكاة، ZATCA)؛ لا توسيع نطاق POS ضمن هذا المتتبع دون قرار منتج |

---

## ذيل الخطة — تهيئة ERPNext لمرة واحدة أو ضبط ثابت (لا تنفيذ الآن)

**الغرض:** تسجيل أي أمر **ضروري جدًا** يتطلب حاليًا تدخلًا يدويًا في واجهة ERPNext، إلى أن تُنجَز مرحلة لاحقة: «تهيئة أولية وإعداد ERPNext بالكامل من واجهات المشروع».

| ID | البند | الوضع الحالي | المطلوب لاحقًا |
|----|--------|----------------|----------------|
| Z-01 | (احتياطي) — لا يُسجَّل شيء حتى تُستكمل مهام الأعلى ويُكتشف فجوة حقيقية | — | إضافة صف إعداد/أتمتة في المشروع |
| Z-02 | Chart of Accounts / شركة جديدة بدون مخطط جاهز | غير محدد بعد | أتمتة `ensureChartOfAccounts` كاملة من الواجهة إن لزم |
| Z-03 | أي Mode of Payment لا يقبل الربط التلقائي بالحساب لقيود ERPNext | غير محدد بعد | معالجة استثناءات عبر معالج تهيئة |

**قاعدة:** لا يُضاف إلى هذا الجدول إلا بعد محاولة التغطية عبر API المشروع؛ التسجيل هنا شرط لعدم نسيان أتمتة التهيئة لاحقًا.

---

## سجل التحديثات (اختياري — سطر لكل جلسة عمل مهمة)

| التاريخ | ما تغيّر |
|---------|----------|
| 2026-05-03 | إنشاء الملف الأولي من المواصفات الكاملة؛ جميع النسب 0% |
| 2026-05-03 | إضافة `lib/server/pos-service.ts`، مسارات `/api/pos/*`، صفحات `/pos` و`/pos/sessions` و`/pos/invoices` و`/pos/settings` و`/pos/sell`، وحدة جانبية مستقلة، صلاحيات `/pos`، أنواع POS في `types.ts` |
| 2026-05-03 | `api.ts`: دوال `apiPos*`؛ `pos-hooks.ts`؛ `PosOpeningDialog` / `PosClosingDialog`؛ شاشة البيع: وردية إلزامية للترحيل، فتح/إغلاق عبر API، أرصدة افتتاحية متعددة |
| 2026-05-03 | فتح/إغلاق الوردية: عدم رفض الطلب عند غياب جلسة الخلفية للمستخدم؛ `posOpenShift`/`posCloseShift` مع `sid` اختياري؛ قاعدة `.cursor/rules/unified-product-copy.mdc` لصياغة موحّدة |
| 2026-05-03 | إصلاح قواعد ESLint: `set-state-in-effect` عبر `queueMicrotask` حيث يلزم؛ `useIsMobile` بـ `useSyncExternalStore`؛ مكوّنات الشريط الجانبي خارج المكوّن الرئيس؛ إعادة ترتيب حالة صفحة التقارير؛ تجاهل `keep-alive.js` / `start-*.js` |
| 2026-05-03 | `POST /api/pos/create-invoice`، `apiPosCreateInvoice`، شاشة البيع والمرتجع عبر الخادم بدل إنشاء/ترحيل مباشر على `/api/data`؛ نوع `POSCreateInvoiceResponse` |
| 2026-05-03 | `GET /api/pos/customer-info`، `usePOSCustomerInfo`، لوحة عميل على شاشة البيع؛ دفع متعدد؛ تصحيح تقسيم المدفوعات متعددة بعد الضريبة في الخادم؛ `/pos/returns` + بطاقة في البوابة |
| 2026-05-03 | `GET /api/pos/session-summary` و`GET /api/pos/past-orders` (`posSessionSummary` / `posPastOrders`)؛ `usePOSSessionSummary` / `usePOSPastOrders`؛ بطاقة ملخص وردية على `/pos/sessions/[name]`؛ `/pos/past-orders` + بطاقة في `/pos`؛ إبطال استعلام الملخص عند إنشاء فاتورة أو إغلاق وردية |
| 2026-05-03 | `/pos/reports`: اختصارات تقارير POS إلى `/reports?openReport=…` (§10.3)؛ بطاقة في بوابة `/pos`؛ زر من صفحة تفاصيل الجلسة |
| 2026-05-03 | شاشة البيع `sales/pos`: `PosSellHeader`، `PosProductSearchBar`، باركود عبر `POST /api/pos/search-barcode` مع fallback محلي؛ إزالة أزرار الوردية المكررة من تبويب السلة |
| 2026-05-03 | كتالوج الأصناف عبر `GET /api/pos/items` عند اكتمال ملف نقطة البيع + قائمة أسعار؛ `GET /api/pos/parent-item-group`؛ `normalizePosCatalogPayload`؛ تعطيل جلب Item الكامل عند الكتالوج؛ `PosCategoryBar` و`PosProductCard`؛ سعر البند من قائمة الأسعار عند الإضافة للسلة |
| 2026-05-03 | `src/lib/client/pos-receipt.ts`: إيصال موحّد؛ زر معاينة؛ تلميح زيادة الدفع عن صافي البنود وربط حساب الباقي من ملف نقطة البيع |
| 2026-05-03 | استخراج `PosCart`، `PosCartItem`، `PosCartSummary` من شاشة البيع؛ `/pos/settings` بتبويبات (عام، جاهزية، ورديات، دفع، طباعة) |
| 2026-05-03 | `PosCustomerSelector`: بحث عميل، عميل افتراضي من حقل `customer` في POS Profile، إنشاء عميل سريع؛ تحديث نسب P2 / P3-02 / P5 في المتتبع |
| 2026-05-03 | P2-13: `set_customer_info` — `posSetCustomerInfo`، `POST /api/pos/set-customer-info`، `apiPosSetCustomerInfo`، حوار «تعديل بيانات»؛ نسبة المرحلة 2 → 77% |
| 2026-05-03 | `usePosSetCustomerInfo` + `invalidateQueries` لـ `customer-info`؛ دمج تحديثات الحقول في mutation واحدة في `PosCustomerSelector`؛ إزالة `refetch` اليدوي من `sales/pos`؛ P5-05 → 76% |
| 2026-05-03 | P2-09: متغيرات القوالب — `pos-catalog` (`isPosTemplateItem`، `posTemplateDocName`)؛ `PosVariantPickerDialog`؛ تكامل `sales/pos` + الباركود؛ المرحلة 2 → 83% |
| 2026-05-03 | P3-03: دفع جزئي — `submit` في `/api/pos/create-invoice`؛ مسودة بدون ترحيل؛ تحقق ملف نقطة البيع على الخادم؛ واجهة `PosCartSummary` + `sales/pos`؛ المرحلة 3 → 85% |
| 2026-05-03 | ترحيل مسودة POS: `adjustPosInvoicePaymentsAfterSave`؛ `posSubmitDraftPosInvoice`؛ `POST /api/pos/submit-draft-invoice`؛ `apiPosSubmitDraftInvoice` + `useSubmitDraftPosInvoice`؛ `/pos/invoices/[name]` بطاقة إكمال دفع؛ P3-03/P3-07/P5-05؛ المرحلة 3 → 86% |
| 2026-05-03 | P5-02: `/pos/settings/profiles` + `/pos/settings/profiles/[name]`؛ `erp-link-create-route` لـ POS Profile؛ زر من `/pos/settings`؛ المرحلة 5 → 52% |
| 2026-05-03 | P5-03: `/pos/settings/shifts-devices` (Shift Type + POS Profile كأجهزة)؛ تبويب ورديات في `/pos/settings`؛ بطاقة مستودع/وردية في `profiles/[name]`؛ تحديث P5-01/P5-03 والمرحلة 5 |
| 2026-05-03 | المرحلة 2 كاملة: `PosSellProductColumn`/`PosSellCheckoutColumn`؛ تقسيم ~60/40 على `lg`؛ أعلام الملف للسعر/المستودع/الخصم؛ تبويب إعدادات جوال؛ تحسين `PosSellHeader` ولوحة العميل؛ المرحلة 2 → 100% |
| 2026-05-03 | P3-06–P3-08: فلاتر وبحث `/pos/invoices`؛ `posInvoiceDocToReceiptSnapshot` + معاينة/طباعة إيصال من `/pos/invoices/[name]`؛ المرحلة 3 → 90% |
| 2026-05-03 | إكمال المرحلة 3 (100%): `PosPaymentDialog`/`PosPaymentSection`/`pos-payment-utils`؛ باقٍ نقدي وتنبيه زيادة غير نقدية؛ إشعار مسودة مع رابط؛ إيصال + `change_amount`؛ تحديث المتتبع |
| 2026-05-03 | إكمال المرحلة 4 (100%): `buildPosInvoiceReturn` جزئي؛ `PosReturnDialog`؛ `PosPastOrders`؛ توسيع `posSessionSummary` + واجهة الجلسة؛ تحديث المتتبع |
| 2026-05-03 | إكمال المرحلة 5 (100%): تبويبات أجهزة/تنازل في `/pos/settings`؛ ملفات POS: تعطيل، التنازل، عمود الحالة؛ `apiPosProfileData` + `usePOSProfileData`؛ إبطال استعلام الملف بعد التعديل؛ `vitest.config` alias `@`؛ اختبارات Vitest لـ `buildPosInvoiceReturn`؛ تحديث P5-07/P5-08 والمتتبع |
| 2026-05-03 | P5-07: توسيع Vitest — `pos-payment-utils.test.ts`، `erpnext-payloads-pos-invoice.test.ts`؛ إزالة وصف «تحقق يدوي» كشرط؛ المنطق الحرج لمسار البيع/الدفع/المرتجع يُختبر آلياً عبر `npm run test` |
