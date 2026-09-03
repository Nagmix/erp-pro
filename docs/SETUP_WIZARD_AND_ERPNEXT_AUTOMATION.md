⚠️ قبل أي تعديل:
1. اقرأ كل ملف من الملفات التالية بالكامل:
   - src/app/api/auth/login/route.ts
   - src/lib/server/backend.ts
   - docker-compose.yml
   - src/proxy.ts أو src/middleware.ts
   - src/app/(dashboard)/layout.tsx
   - src/stores/auth-store.ts
   - src/app/login/page.tsx

2. سجّل في worklog.md حالة كل ملف:
   - هل الملف موجود؟
   - هل يختلف عما هو متوقع في هذا المستند؟
   - ما الدوال والمتغيرات الموجودة فعلاً؟

3. إذا وجدت تعارضاً بين هذا المستند والواقع:
   - لا تنفّذ الخطوة
   - سجّل التعارض في worklog.md
   - اطلب التوجيه من المستخدم

4. لا تنشئ ملفاً جديداً قبل التأكد أنه غير موجود باسم آخر
# دليل إتمتة إخفاء ERPNext وبناء واجهة الإعداد الأولى
## ERP Pro - Setup Wizard & ERPNext White-Label Automation Guide

> **الهدف**: هذا المستند دليل كامل للـ Agent لتنفيذ:
> 1. واجهة إعداد أولى احترافية (Setup Wizard) مثل نظام دفترة
> 2. أتمتة كاملة لجميع عمليات ERPNext بدون أي تدخل يدوي
> 3. إخفاء ERPNext بالكامل عن المستخدم النهائي (White-Label)
> 4. أتمتة إنشاء مفاتيح API وحفظها تلقائياً
>
> **⚠️ تحذيرات حرجة للـ Agent**:
> - لا تعدّل أي ملف بدون قراءته أولاً بالكامل وفهم سياقه
> - لا تحذف أي كود موجود - فقط أضف أو عدّل
> - اختبر كل خطوة قبل الانتقال للتالية
> - لا تلمس ملفات Docker أو قاعدة البيانات مباشرة
> - احتفظ بنسخة احتياطية من كل ملف قبل تعديله
> - لا تستخدم `any` في TypeScript - استخدم أنواع محددة دائماً
> - لا تضع بيانات حساسة (كلمات مرور، مفاتيح) في الكود - استخدم `.env`

---

## جدول المحتويات

1. [المرحلة الأولى: تعديل Docker Compose لإخفاء ERPNext](#المرحلة-الأولى)
2. [المرحلة الثانية: بناء نظام اكتشاف ERPNext التلقائي](#المرحلة-الثانية)
3. [المرحلة الثالثة: بناء طبقة الإعداد الآلي (Setup Engine)](#المرحلة-الثالثة)
4. [المرحلة الرابعة: بناء واجهة الإعداد الأولى (Setup Wizard UI)](#المرحلة-الرابعة)
5. [المرحلة الخامسة: أتمتة إنشاء مفاتيح API](#المرحلة-الخامسة)
6. [المرحلة السادسة: إخفاء ERPNext (White-Label)](#المرحلة-السادسة)
7. [المرحلة السابعة: تعديل نظام المصادقة](#المرحلة-السابعة)
8. [المرحلة الثامنة: تعديل API Routes لتنظيف الاستجابات](#المرحلة-الثامنة)
9. [المرحلة التاسعة: حماية المسارات ومنع الوصول المباشر](#المرحلة-التاسعة)
10. [المرحلة العاشرة: برنامج التثبيت المحلي (Installer)](#المرحلة-العاشرة)
11. [ملف الأنواع TypeScript المرجعي](#ملف-الأنواع)
12. [جدول ERPNext API الكامل](#جدول-api)
13. [قائمة التحقق النهائية](#قائمة-التحقق)

---

## المرحلة الأولى: تعديل Docker Compose لإخفاء ERPNext {#المرحلة-الأولى}

### الهدف
منع وصول المستخدم النهائي لـ ERPNext عبر المتصفح نهائياً.

### الملف: `docker-compose.yml`

### ⚠️ التغييرات المطلوبة بدقة:

**1. خدمة `backend` - إزالة تعريض المنفذ 8000:**

```yaml
  backend:
    image: frappe/erpnext:v15.52.1
    container_name: erppro-backend
    restart: unless-stopped
    environment:
      # ... نفس الإعدادات الحالية ...
    volumes:
      - backend_sites:/home/frappe/frappe-bench/sites
      - backend_assets:/home/frappe/frappe-bench/sites/assets
    depends_on:
      mariadb:
        condition: service_healthy
      redis-cache:
        condition: service_started
      redis-queue:
        condition: service_started
      redis-socketio:
        condition: service_started
    networks:
      - erppro-network
    # ❌ احذف أي سطر ports يحتوي على "8000:8000"
    # ❌ احذف أي سطر expose يحتوي على "8000"
    # ✅ ERPNext متاح فقط داخل شبكة Docker عبر اسم الخدمة "backend:8000"
```

**2. خدمة `frontend` - التواصل عبر الشبكة الداخلية فقط:**

```yaml
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: erppro-frontend
    restart: unless-stopped
    environment:
      BACKEND_HOST: http://backend:8000     # ← التواصل عبر اسم الخدمة داخل Docker
      BACKEND_ADMIN_USER: ${ADMIN_USER:-Administrator}
      BACKEND_ADMIN_PASSWORD: ${ADMIN_PASSWORD:-admin}
      DATABASE_URL: file:/app/data/custom.db
      SETUP_MODE: ${SETUP_MODE:-auto}       # ← جديد: وضع الإعداد الآلي
    ports:
      - "3000:3000"                          # ← المنفذ الوحيد المرئي للمستخدم
    depends_on:
      - backend
    networks:
      - erppro-network
```

**3. خدمة MariaDB - إخفاء المنفذ 3306:**

```yaml
  mariadb:
    # ... نفس الإعدادات ...
    # ❌ احذف: ports: - "3306:3306"
    # ✅ قاعدة البيانات متاحة فقط داخل شبكة Docker
    networks:
      - erppro-network
```

**4. إضافة خدمة إعداد آلي (مرة واحدة):**

```yaml
  # خدمة الإعداد الآلي - تعمل مرة واحدة ثم تتوقف
  setup-init:
    image: frappe/erpnext:v15.52.1
    container_name: erppro-setup
    restart: "no"                           # تتوقف بعد الانتهاء
    command: >
      sh -c "
        wait-for-it mariadb:3306 --timeout=120 -- &&
        bench new-site ${SITE_NAME:-erppro}
          --db-root-password ${DB_ROOT_PASSWORD:?set DB_ROOT_PASSWORD in .env}
          --admin-password ${ADMIN_PASSWORD:-admin}
          --install-app erpnext
          --set-default
      "
    environment:
      FRAPPE_SITE_NAME_HEAD: ${SITE_NAME:-erppro}
      DB_HOST: mariadb
      DB_PORT: 3306
      DB_NAME: ${DB_NAME:-erppro_db}
      DB_USER: ${DB_USER:-erppro_user}
      DB_PASSWORD: ${DB_PASSWORD:?set DB_PASSWORD in .env}
    depends_on:
      mariadb:
        condition: service_healthy
    volumes:
      - backend_sites:/home/frappe/frappe-bench/sites
    networks:
      - erppro-network
```

### ⚠️ قواعد صارمة:
- لا تضيف `ports` لأي خدمة باستثناء `frontend:3000`
- لا تغير أسماء الخدمات (backend, mariadb, redis-cache) لأن الكود يعتمد عليها
- لا تحذف أي volume موجود
- لا تغير إعدادات environment الحالية - فقط أضف الجديدة

---

## المرحلة الثانية: بناء نظام اكتشاف ERPNext التلقائي {#المرحلة-الثانية}

### الهدف
النظام يكتشف تلقائياً هل ERPNext يعمل وهل تم إعداده أم لا، ويعرض الواجهة المناسبة.

### الملف الجديد: `src/lib/server/setup-detector.ts`

```typescript
// ============================================================
// نظام اكتشاف حالة ERPNext والإعداد
// يعمل على الخادم فقط (Server-Side)
// ============================================================

export type SystemStatus =
  | 'first_time'      // أول مرة - ERPNext غير مُعد
  | 'setup_in_progress' // الإعداد جارٍ
  | 'ready'           // النظام جاهز للاستخدام
  | 'backend_offline'  // ERPNext لا يعمل
  | 'demo_mode';      // وضع تجريبي بدون ERPNext

export interface SetupStatus {
  status: SystemStatus;
  backendAvailable: boolean;
  backendConfigured: boolean;
  siteExists: boolean;
  adminUserCreated: boolean;
  apiKeysGenerated: boolean;
  companySetup: boolean;
  chartOfAccountsSetup: boolean;
  currentStep: number;
  totalSteps: number;
  message: string;
}

const BACKEND_HOST = process.env.BACKEND_HOST || 'http://localhost:8000';

/**
 * فحص هل ERPNext يعمل
 */
async function isBackendReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_HOST}/api/method/ping`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * فحص هل تم إنشاء الموقع (Site) في ERPNext
 */
async function isSiteCreated(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_HOST}/api/method/frappe.client.get_list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctype: 'System Settings',
        fields: ['setup_complete'],
      }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data?.message?.setup_complete === '1';
  } catch {
    return false;
  }
}

/**
 * فحص هل تم إنشاء مفاتيح API
 */
async function areApiKeysConfigured(): Promise<boolean> {
  // نفحص من خلال متغيرات البيئة أو ملف الإعداد المحلي
  return !!(process.env.ERPNEXT_API_KEY && process.env.ERPNEXT_API_SECRET);
}

/**
 * فحص هل تم إعداد الشركة
 */
async function isCompanySetup(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_HOST}/api/method/frappe.client.get_count`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    // إذا وصلنا لهنا فالخادم يعمل
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * الحصول على حالة النظام الكاملة
 */
export async function getSystemStatus(): Promise<SetupStatus> {
  const backendAvailable = await isBackendReachable();

  // إذا ERPNext لا يعمل → وضع تجريبي
  if (!backendAvailable) {
    return {
      status: 'demo_mode',
      backendAvailable: false,
      backendConfigured: false,
      siteExists: false,
      adminUserCreated: false,
      apiKeysGenerated: false,
      companySetup: false,
      chartOfAccountsSetup: false,
      currentStep: 0,
      totalSteps: 7,
      message: 'النظام يعمل بالوضع التجريبي - خادم ERPNext غير متاح',
    };
  }

  const siteExists = await isSiteCreated();
  const apiKeysGenerated = await areApiKeysConfigured();
  const companySetup = await isCompanySetup();

  // تحديد الحالة بناءً على الفحوصات
  let status: SystemStatus;
  let currentStep = 0;
  let message = '';

  if (!siteExists) {
    status = 'first_time';
    currentStep = 0;
    message = 'مرحباً بك! لنبدأ إعداد النظام';
  } else if (!apiKeysGenerated) {
    status = 'first_time';
    currentStep = 4;
    message = 'إعداد النظام قيد الإكمال';
  } else if (!companySetup) {
    status = 'first_time';
    currentStep = 5;
    message = 'إعداد الشركة قيد الإكمال';
  } else {
    status = 'ready';
    currentStep = 7;
    message = 'النظام جاهز للاستخدام';
  }

  return {
    status,
    backendAvailable: true,
    backendConfigured: siteExists && apiKeysGenerated,
    siteExists,
    adminUserCreated: siteExists,
    apiKeysGenerated,
    companySetup,
    chartOfAccountsSetup: siteExists,
    currentStep,
    totalSteps: 7,
    message,
  };
}
```

### الملف الجديد: `src/app/api/setup/status/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getSystemStatus } from '@/lib/server/setup-detector';

export async function GET() {
  try {
    const status = await getSystemStatus();
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'فشل في فحص حالة النظام' },
      { status: 500 }
    );
  }
}
```

---

## المرحلة الثالثة: بناء طبقة الإعداد الآلي (Setup Engine) {#المرحلة-الثالثة}

### الهدف
محرك إعداد يتواصل مع ERPNext في الخلفية وينفّذ جميع عمليات الإعداد بدون تدخل المستخدم في ERPNext.

### الملف الجديد: `src/lib/server/setup-engine.ts`

```typescript
// ============================================================
// محرك الإعداد الآلي - يتواصل مع ERPNext في الخلفية
// المستخدم لا يرى ERPNext إطلاقاً
// ============================================================

const BACKEND_HOST = process.env.BACKEND_HOST || 'http://localhost:8000';

// --- أنواع البيانات ---

export interface SetupFormData {
  // الخطوة 1: بيانات الشركة
  companyName: string;
  companyAbbrev: string;
  country: string;
  currency: string;
  language: string;
  industry: string;
  taxId?: string;
  commercialRegister?: string;

  // الخطوة 2: بيانات المدير
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;

  // الخطوة 3: الوحدات
  modules: {
    accounting: boolean;
    sales: boolean;
    purchases: boolean;
    inventory: boolean;
    manufacturing: boolean;
    hr: boolean;
    crm: boolean;
    projects: boolean;
  };

  // الخطوة 4: المالية
  fiscalYearStart: string;   // مثال: "2026-01-01"
  fiscalYearEnd: string;     // مثال: "2026-12-31"
  defaultTaxRate: number;    // مثال: 15
  taxTemplate: 'vat' | 'sales_tax' | 'none';

  // الخطوة 5: دليل الحسابات
  chartOfAccountsTemplate: 'standard' | 'trading' | 'service' | 'manufacturing' | 'custom';

  // الخطوة 6: الخزائن والبنوك
  defaultCashAccount: string;
  defaultBankAccount?: string;
  bankName?: string;
  bankAccountNumber?: string;
}

export interface SetupStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;   // 0-100
  message?: string;
  error?: string;
}

// --- دوال التواصل مع ERPNext ---

/**
 * تسجيل دخول كمدير ERPNext (داخلي)
 */
async function backendLogin(password: string): Promise<string | null> {
  try {
    const response = await fetch(`${BACKEND_HOST}/api/method/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usr: 'Administrator',
        pwd: password,
      }),
    });

    if (!response.ok) return null;

    const setCookie = response.headers.get('set-cookie');
    const sid = setCookie?.match(/sid=([^;]+)/)?.[1];
    return sid || null;
  } catch {
    return null;
  }
}

/**
 * تنفيذ طلب API على ERPNext مع جلسة المدير
 */
async function erpnextRequest(
  method: string,
  path: string,
  body?: unknown,
  sid?: string,
  retries: number = 3
): Promise<unknown> {
  const url = `${BACKEND_HOST}/api${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Server error' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}

// --- خطوات الإعداد الفردية ---

/**
 * الخطوة 1: إنشاء الموقع (Site) - يتم عبر Docker وليس هنا
 * هذه الخطوة تتحقق فقط أن الموقع يعمل
 */
async function verifySite(sid: string): Promise<boolean> {
  try {
    const result = await erpnextRequest('GET', '/method/frappe.client.get_list', undefined, sid);
    return !!result;
  } catch {
    return false;
  }
}

/**
 * الخطوة 2: إعداد الشركة
 */
async function setupCompany(data: SetupFormData, sid: string): Promise<void> {
  // إنشاء الشركة
  await erpnextRequest('POST', '/resource/Company', {
    doctype: 'Company',
    company_name: data.companyName,
    abbr: data.companyAbbrev,
    country: data.country,
    default_currency: data.currency,
    language: data.language,
    tax_id: data.taxId || undefined,
  }, sid);

  // تعيين الشركة كافتراضية
  await erpnextRequest('POST', '/method/frappe.client.set_value', {
    doctype: 'System Settings',
    name: 'System Settings',
   fieldname: 'default_company',
    value: data.companyName,
  }, sid);
}

/**
 * الخطوة 3: إعداد الوحدات (Modules)
 */
async function setupModules(data: SetupFormData, sid: string): Promise<void> {
  const moduleMap: Record<string, string> = {
    accounting: 'Accounts',
    sales: 'Selling',
    purchases: 'Buying',
    inventory: 'Stock',
    manufacturing: 'Manufacturing',
    hr: 'HR',
    crm: 'CRM',
    projects: 'Projects',
  };

  // تفعيل الوحدات المختارة
  const enabledModules = Object.entries(data.modules)
    .filter(([, enabled]) => enabled)
    .map(([key]) => moduleMap[key])
    .filter(Boolean);

  await erpnextRequest('POST', '/method/frappe.client.set_value', {
    doctype: 'Module Def',
    name: 'Module Def',
    fieldname: 'module_name',
    value: enabledModules.join(','),
  }, sid);
}

/**
 * الخطوة 4: إنشاء دليل الحسابات
 */
async function setupChartOfAccounts(data: SetupFormData, sid: string): Promise<void> {
  // ERPNext ينشئ دليل حسابات تلقائياً عند إنشاء الشركة
  // لكن يمكن استبداله بقالب مخصص
  const templateMap: Record<string, string> = {
    standard: 'Standard',
    trading: 'Trading',
    service: 'Service',
    manufacturing: 'Manufacturing',
  };

  const template = templateMap[data.chartOfAccountsTemplate];
  if (template && template !== 'Standard') {
    // استدعاء إنشاء دليل حسابات من قالب
    await erpnextRequest('POST', '/method/erpnext.accounts.doctype.account.chart_of_accounts.chart_of_accounts.create_chart_of_accounts', {
      company: data.companyName,
      chart_template: template,
    }, sid);
  }
}

/**
 * الخطوة 5: إعداد الضرائب
 */
async function setupTax(data: SetupFormData, sid: string): Promise<void> {
  if (data.taxTemplate === 'none' || !data.defaultTaxRate) return;

  const taxName = data.taxTemplate === 'vat'
    ? `ضريبة القيمة المضافة ${data.defaultTaxRate}%`
    : `ضريبة المبيعات ${data.defaultTaxRate}%`;

  // إنشاء حساب الضريبة
  await erpnextRequest('POST', '/resource/Account', {
    doctype: 'Account',
    account_name: taxName,
    parent_account: 'Duties and Taxes - ' + data.companyAbbrev,
    account_type: 'Tax',
    company: data.companyName,
  }, sid);

  // إنشاء قالب الضريبة
  await erpnextRequest('POST', '/resource/Sales Taxes and Charges Template', {
    doctype: 'Sales Taxes and Charges Template',
    title: taxName,
    company: data.companyName,
    taxes: [{
      charge_type: 'On Net Total',
      account_head: taxName + ' - ' + data.companyAbbrev,
      rate: data.defaultTaxRate,
      description: taxName,
    }],
  }, sid);

  // إنشاء قالب ضريبة المشتريات
  await erpnextRequest('POST', '/resource/Purchase Taxes and Charges Template', {
    doctype: 'Purchase Taxes and Charges Template',
    title: taxName,
    company: data.companyName,
    taxes: [{
      charge_type: 'On Net Total',
      account_head: taxName + ' - ' + data.companyAbbrev,
      rate: data.defaultTaxRate,
      description: taxName,
    }],
  }, sid);
}

/**
 * الخطوة 6: إنشاء السنة المالية
 */
async function setupFiscalYear(data: SetupFormData, sid: string): Promise<void> {
  const yearName = `${data.fiscalYearStart.substring(0, 4)}-${data.fiscalYearEnd.substring(0, 4)}`;

  await erpnextRequest('POST', '/resource/Fiscal Year', {
    doctype: 'Fiscal Year',
    year: yearName,
    year_start_date: data.fiscalYearStart,
    year_end_date: data.fiscalYearEnd,
    disabled: 0,
  }, sid);
}

/**
 * الخطوة 7: إنشاء الخزائن والحسابات البنكية
 */
async function setupAccounts(data: SetupFormData, sid: string): Promise<void> {
  // إنشاء خزينة رئيسية
  await erpnextRequest('POST', '/resource/Mode of Payment', {
    doctype: 'Mode of Payment',
    mode_of_payment: 'نقدي',
    type: 'General',
    enabled: 1,
  }, sid);

  await erpnextRequest('POST', '/resource/Mode of Payment', {
    doctype: 'Mode of Payment',
    mode_of_payment: 'بنكي',
    type: 'Bank',
    enabled: 1,
  }, sid);

  await erpnextRequest('POST', '/resource/Mode of Payment', {
    doctype: 'Mode of Payment',
    mode_of_payment: 'شيك',
    type: 'Bank',
    enabled: 1,
  }, sid);

  // إنشاء حساب بنكي إذا تم تحديده
  if (data.bankName && data.bankAccountNumber) {
    await erpnextRequest('POST', '/resource/Bank Account', {
      doctype: 'Bank Account',
      account_name: data.bankName,
      bank: data.bankName,
      bank_account_no: data.bankAccountNumber,
      company: data.companyName,
    }, sid);
  }
}

/**
 * الخطوة 8: إنشاء مستخدم المدير وتوليد مفاتيح API
 */
async function setupAdminAndApiKeys(data: SetupFormData, sid: string): Promise<{
  apiKey: string;
  apiSecret: string;
}> {
  // إنشاء مستخدم المدير
  await erpnextRequest('POST', '/resource/User', {
    doctype: 'User',
    email: data.adminEmail,
    first_name: data.adminFullName.split(' ')[0] || data.adminFullName,
    last_name: data.adminFullName.split(' ').slice(1).join(' ') || '',
    roles: [
      { role: 'System Manager' },
      { role: 'Accounts Manager' },
      { role: 'Sales Manager' },
      { role: 'Purchase Manager' },
      { role: 'HR Manager' },
      { role: 'Stock Manager' },
    ],
    send_welcome_email: 0,
    new_password: data.adminPassword,
  }, sid);

  // توليد مفاتيح API للمدير
  const keyResult = await erpnextRequest('POST', '/method/frappe.core.doctype.user.user.generate_keys', {
    user: data.adminEmail,
  }, sid) as { message: { api_key: string; api_secret: string } };

  return {
    apiKey: keyResult.message.api_key,
    apiSecret: keyResult.message.api_secret,
  };
}

/**
 * الخطوة 9: إعداد العلامة التجارية (White-Label)
 */
async function setupBranding(sid: string): Promise<void> {
  // تغيير اسم النظام
  await erpnextRequest('POST', '/method/frappe.client.set_value', {
    doctype: 'System Settings',
    name: 'System Settings',
    fieldname: 'app_name',
    value: 'ERP Pro',
  }, sid);

  // تعطيل صفحة About
  await erpnextRequest('POST', '/method/frappe.client.set_value', {
    doctype: 'System Settings',
    name: 'System Settings',
    fieldname: 'disable_website_cache',
    value: '1',
  }, sid);

  // تعيين اللغة العربية كلغة افتراضية
  await erpnextRequest('POST', '/method/frappe.client.set_value', {
    doctype: 'System Settings',
    name: 'System Settings',
    fieldname: 'language',
    value: 'ar',
  }, sid);

  // تعطيل التسجيل الذاتي
  await erpnextRequest('POST', '/method/frappe.client.set_value', {
    doctype: 'System Settings',
    name: 'System Settings',
    fieldname: 'disable_signup',
    value: '1',
  }, sid);
}

// --- محرك الإعداد الرئيسي ---

export type SetupProgressCallback = (step: SetupStep, allSteps: SetupStep[]) => void;

export async function runFullSetup(
  data: SetupFormData,
  onProgress?: SetupProgressCallback
): Promise<{ success: boolean; error?: string; apiKey?: string; apiSecret?: string }> {
  const steps: SetupStep[] = [
    { id: 'verify_site', label: 'التحقق من خادم النظام', status: 'pending', progress: 0 },
    { id: 'setup_company', label: 'إنشاء الشركة', status: 'pending', progress: 0 },
    { id: 'setup_modules', label: 'تفعيل الوحدات', status: 'pending', progress: 0 },
    { id: 'setup_accounts', label: 'إنشاء دليل الحسابات', status: 'pending', progress: 0 },
    { id: 'setup_tax', label: 'إعداد الضرائب', status: 'pending', progress: 0 },
    { id: 'setup_fiscal_year', label: 'إنشاء السنة المالية', status: 'pending', progress: 0 },
    { id: 'setup_payment', label: 'إنشاء الخزائن والحسابات', status: 'pending', progress: 0 },
    { id: 'setup_admin_api', label: 'إنشاء المدير ومفاتيح API', status: 'pending', progress: 0 },
    { id: 'setup_branding', label: 'تخصيص العلامة التجارية', status: 'pending', progress: 0 },
  ];

  const updateStep = (index: number, update: Partial<SetupStep>) => {
    steps[index] = { ...steps[index], ...update };
    onProgress?.(steps[index], steps);
  };

  try {
    // تسجيل دخول كمدير ERPNext
    const sid = await backendLogin(data.adminPassword || 'admin');
    if (!sid) {
      // محاولة بكلمة المرور الافتراضية
      const defaultSid = await backendLogin('admin');
      if (!defaultSid) {
        return { success: false, error: 'فشل الاتصال بخادم النظام' };
      }
    }
    const activeSid = sid || await backendLogin('admin') as string;

    // الخطوة 1: التحقق من الموقع
    updateStep(0, { status: 'in_progress', progress: 10, message: 'جاري التحقق من الخادم...' });
    const siteOk = await verifySite(activeSid);
    if (!siteOk) {
      updateStep(0, { status: 'failed', progress: 0, error: 'خادم النظام غير جاهز' });
      return { success: false, error: 'خادم النظام غير جاهز' };
    }
    updateStep(0, { status: 'completed', progress: 100, message: 'الخادم جاهز' });

    // الخطوة 2: إعداد الشركة
    updateStep(1, { status: 'in_progress', progress: 10, message: 'جاري إنشاء الشركة...' });
    await setupCompany(data, activeSid);
    updateStep(1, { status: 'completed', progress: 100, message: 'تم إنشاء الشركة' });

    // الخطوة 3: تفعيل الوحدات
    updateStep(2, { status: 'in_progress', progress: 10, message: 'جاري تفعيل الوحدات...' });
    await setupModules(data, activeSid);
    updateStep(2, { status: 'completed', progress: 100, message: 'تم تفعيل الوحدات' });

    // الخطوة 4: دليل الحسابات
    updateStep(3, { status: 'in_progress', progress: 10, message: 'جاري إنشاء دليل الحسابات...' });
    await setupChartOfAccounts(data, activeSid);
    updateStep(3, { status: 'completed', progress: 100, message: 'تم إنشاء دليل الحسابات' });

    // الخطوة 5: الضرائب
    updateStep(4, { status: 'in_progress', progress: 10, message: 'جاري إعداد الضرائب...' });
    await setupTax(data, activeSid);
    updateStep(4, { status: 'completed', progress: 100, message: 'تم إعداد الضرائب' });

    // الخطوة 6: السنة المالية
    updateStep(5, { status: 'in_progress', progress: 10, message: 'جاري إنشاء السنة المالية...' });
    await setupFiscalYear(data, activeSid);
    updateStep(5, { status: 'completed', progress: 100, message: 'تم إنشاء السنة المالية' });

    // الخطوة 7: الخزائن
    updateStep(6, { status: 'in_progress', progress: 10, message: 'جاري إنشاء الخزائن...' });
    await setupAccounts(data, activeSid);
    updateStep(6, { status: 'completed', progress: 100, message: 'تم إنشاء الخزائن' });

    // الخطوة 8: المدير ومفاتيح API
    updateStep(7, { status: 'in_progress', progress: 10, message: 'جاري إنشاء المدير ومفاتيح API...' });
    const keys = await setupAdminAndApiKeys(data, activeSid);
    updateStep(7, { status: 'completed', progress: 100, message: 'تم إنشاء المدير ومفاتيح API' });

    // الخطوة 9: العلامة التجارية
    updateStep(8, { status: 'in_progress', progress: 10, message: 'جاري تخصيص العلامة التجارية...' });
    await setupBranding(activeSid);
    updateStep(8, { status: 'completed', progress: 100, message: 'تم تخصيص العلامة التجارية' });

    // حفظ مفاتيح API في ملف .env أو قاعدة البيانات
    await saveApiKeys(keys.apiKey, keys.apiSecret);

    return {
      success: true,
      apiKey: keys.apiKey,
      apiSecret: keys.apiSecret,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء الإعداد',
    };
  }
}

/**
 * حفظ مفاتيح API تلقائياً
 */
async function saveApiKeys(apiKey: string, apiSecret: string): Promise<void> {
  // الطريقة 1: حفظ في ملف .env
  const fs = await import('fs/promises');
  const path = await import('path');
  const envPath = path.join(process.cwd(), '.env');

  let envContent = '';
  try {
    envContent = await fs.readFile(envPath, 'utf-8');
  } catch {
    // الملف غير موجود - سننشئه
  }

  // تحديث أو إضافة المفاتيح
  const updateEnvVar = (content: string, key: string, value: string): string => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    }
    return content + `\n${key}=${value}`;
  };

  envContent = updateEnvVar(envContent, 'ERPNEXT_API_KEY', apiKey);
  envContent = updateEnvVar(envContent, 'ERPNEXT_API_SECRET', apiSecret);
  envContent = updateEnvVar(envContent, 'ERPNEXT_URL', BACKEND_HOST);
  envContent = updateEnvVar(envContent, 'SYSTEM_SETUP_COMPLETE', 'true');

  await fs.writeFile(envPath, envContent, 'utf-8');

  // تحديث متغيرات البيئة في العملية الحالية
  process.env.ERPNEXT_API_KEY = apiKey;
  process.env.ERPNEXT_API_SECRET = apiSecret;
  process.env.SYSTEM_SETUP_COMPLETE = 'true';
}
```

### الملف الجديد: `src/app/api/setup/initiate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { runFullSetup, type SetupFormData } from '@/lib/server/setup-engine';

export async function POST(request: NextRequest) {
  let body: SetupFormData;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  // التحقق من الحقول المطلوبة
  const requiredFields: (keyof SetupFormData)[] = [
    'companyName', 'companyAbbrev', 'country', 'currency',
    'adminFullName', 'adminEmail', 'adminPassword',
  ];

  for (const field of requiredFields) {
    if (!body[field]) {
      return NextResponse.json(
        { success: false, error: `الحقل ${field} مطلوب` },
        { status: 400 }
      );
    }
  }

  // التحقق من قوة كلمة المرور
  if (body.adminPassword.length < 8) {
    return NextResponse.json(
      { success: false, error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' },
      { status: 400 }
    );
  }

  try {
    const result = await runFullSetup(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'تم إعداد النظام بنجاح',
        apiKeyConfigured: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء إعداد النظام' },
      { status: 500 }
    );
  }
}
```

---

## المرحلة الرابعة: بناء واجهة الإعداد الأولى (Setup Wizard UI) {#المرحلة-الرابعة}

### الهدف
واجهة إعداد احترافية مثل دفترة - 7 خطوات بالعربية.

### المواصفات التفصيلية للواجهة

#### الملف الجديد: `src/app/setup/page.tsx`

> **⚠️ تعليمات مهمة للـ Agent**:
> - هذه الصفحة يجب أن تكون **مستقلة تماماً** عن صفحة login
> - لا تستخدم layout الـ dashboard
> - الصفحة تتصل مباشرة بـ `/api/setup/*`
> - استخدم نفس ألوان النظام الرئيسي
> - كل خطوة لها تحقق (validation) قبل الانتقال للتالية
> - شريط تقدم يوضح الخطوة الحالية من الإجمالي
> - زر "رجوع" و"التالي" في كل خطوة
> - في الخطوة الأخيرة: شاشة تقدم حية مع تحديثات كل خطوة إعداد

#### هيكل الخطوات (7 خطوات مثل دفترة):

```
الخطوة 1: الترحيب واختيار اللغة
├── شعار ERP Pro كبير في المنتصف
├── "مرحباً بك في ERP Pro"
├── اختيار اللغة (العربية / English)
└── زر "ابدأ الإعداد"

الخطوة 2: بيانات الشركة
├── اسم الشركة (إلزامي)
├── اختصار الشركة (يُنشأ تلقائياً من الاسم - قابل للتعديل)
├── الدولة (قائمة منسدلة - مسبقة التعريف)
├── العملة (تتغير تلقائياً حسب الدولة)
├── النشاط التجاري (قائمة منسدلة)
├── الرقم الضريبي (اختياري)
├── رقم السجل التجاري (اختياري)
└── زر "التالي"

الخطوة 3: بيانات المدير
├── الاسم الكامل (إلزامي)
├── البريد الإلكتروني (إلزامي - مع تحقق الصيغة)
├── كلمة المرور (إلزامي - 8 أحرف + مؤشر قوة)
├── تأكيد كلمة المرور (إلزامي - مطابقة)
└── زر "التالي"

الخطوة 4: اختيار الوحدات
├── بطاقات تفاعلية لكل وحدة (8 وحدات)
├── كل بطاقة: أيقونة + اسم + وصف مختصر + toggle
├── المحاسبة مفعّلة افتراضياً ولا يمكن تعطيلها
├── باقي الوحدات يمكن تفعيل/تعطيل كل منها
└── زر "التالي"

الخطوة 5: الإعدادات المالية
├── بداية السنة المالية (قائمة: يناير، أبريل، يوليو، أكتوبر)
├── نوع الضريبة (ضريبة قيمة مضافة / ضريبة مبيعات / بدون)
├── نسبة الضريبة الافتراضية (رقم - يتغير حسب الدولة)
├── قالب دليل الحسابات (معياري / تجاري / خدمي / صناعي)
└── زر "التالي"

الخطوة 6: الخزائن والبنوك
├── اسم الخزينة الرئيسية (افتراضي: "الخزينة الرئيسية")
├── إضافة حساب بنكي (اختياري)
│   ├── اسم البنك
│   ├── رقم الحساب البنكي
│   └── IBAN (اختياري)
└── زر "التالي"

الخطوة 7: المراجعة والبدء
├── ملخص جميع البيانات المدخلة في بطاقات
├── إمكانية العودة لتعديل أي خطوة
├── زر "ابدأ إعداد النظام" (كبير وبارز)
└── بعد الضغط: شاشة تقدم حية
    ├── شريط تقدم كلي (0-100%)
    ├── قائمة خطوات الإعداد مع حالة كل واحدة
    │   ├── ✅ تم إنشاء الشركة
    │   ├── ✅ تم تفعيل الوحدات
    │   ├── ⟳ جاري إنشاء دليل الحسابات...
    │   ├── ○ إعداد الضرائب
    │   ├── ○ إنشاء السنة المالية
    │   ├── ○ إنشاء الخزائن
    │   ├── ○ إنشاء المدير ومفاتيح API
    │   └── ○ تخصيص العلامة التجارية
    └── بعد الانتهاء: زر "ابدأ استخدام النظام" → redirect إلى /
```

#### قائمة الدول والعملات المسبقة:

```typescript
const COUNTRIES = [
  { code: 'SA', name: 'المملكة العربية السعودية', currency: 'SAR', currencyName: 'ريال سعودي', taxRate: 15, language: 'ar' },
  { code: 'AE', name: 'الإمارات العربية المتحدة', currency: 'AED', currencyName: 'درهم إماراتي', taxRate: 5, language: 'ar' },
  { code: 'EG', name: 'جمهورية مصر العربية', currency: 'EGP', currencyName: 'جنيه مصري', taxRate: 14, language: 'ar' },
  { code: 'JO', name: 'المملكة الأردنية الهاشمية', currency: 'JOD', currencyName: 'دينار أردني', taxRate: 16, language: 'ar' },
  { code: 'KW', name: 'دولة الكويت', currency: 'KWD', currencyName: 'دينار كويتي', taxRate: 0, language: 'ar' },
  { code: 'BH', name: 'مملكة البحرين', currency: 'BHD', currencyName: 'دينار بحريني', taxRate: 5, language: 'ar' },
  { code: 'OM', name: 'سلطنة عمان', currency: 'OMR', currencyName: 'ريال عماني', taxRate: 5, language: 'ar' },
  { code: 'QA', name: 'دولة قطر', currency: 'QAR', currencyName: 'ريال قطري', taxRate: 0, language: 'ar' },
  { code: 'IQ', name: 'جمهورية العراق', currency: 'IQD', currencyName: 'دينار عراقي', taxRate: 15, language: 'ar' },
  { code: 'LB', name: 'الجمهورية اللبنانية', currency: 'LBP', currencyName: 'ليرة لبنانية', taxRate: 11, language: 'ar' },
  { code: 'PS', name: 'فلسطين', currency: 'ILS', currencyName: 'شيقل', taxRate: 16, language: 'ar' },
  { code: 'SY', name: 'الجمهورية العربية السورية', currency: 'SYP', currencyName: 'ليرة سورية', taxRate: 0, language: 'ar' },
  { code: 'YE', name: 'الجمهورية اليمنية', currency: 'YER', currencyName: 'ريال يمني', taxRate: 5, language: 'ar' },
  { code: 'SD', name: 'جمهورية السودان', currency: 'SDG', currencyName: 'جنيه سوداني', taxRate: 15, language: 'ar' },
  { code: 'LY', name: 'دولة ليبيا', currency: 'LYD', currencyName: 'دينار ليبي', taxRate: 0, language: 'ar' },
  { code: 'DZ', name: 'الجمهورية الجزائرية', currency: 'DZD', currencyName: 'دينار جزائري', taxRate: 19, language: 'ar' },
  { code: 'TN', name: 'الجمهورية التونسية', currency: 'TND', currencyName: 'دينار تونسي', taxRate: 19, language: 'ar' },
  { code: 'MA', name: 'المملكة المغربية', currency: 'MAD', currencyName: 'درهم مغربي', taxRate: 20, language: 'ar' },
] as const;
```

#### وصف بطاقات الوحدات:

```typescript
const MODULES = [
  {
    id: 'accounting',
    name: 'المحاسبة والمالية',
    description: 'دليل الحسابات، القيود اليومية، الفواتير، المدفوعات، الأصول الثابتة',
    icon: 'Calculator',
    required: true,   // لا يمكن تعطيله
    color: '#2563EB',
  },
  {
    id: 'sales',
    name: 'المبيعات',
    description: 'عروض الأسعار، أوامر البيع، نقاط البيع، الفوترة الإلكترونية',
    icon: 'ShoppingCart',
    required: false,
    color: '#16A34A',
  },
  {
    id: 'purchases',
    name: 'المشتريات',
    description: 'طلبات الشراء، أوامر الشراء، فواتير الشراء، إدارة الموردين',
    icon: 'PackageSearch',
    required: false,
    color: '#F59E0B',
  },
  {
    id: 'inventory',
    name: 'المخزون',
    description: 'الأصناف، المستودعات، حركات المخزون، الجرد، قوائم الأسعار',
    icon: 'Warehouse',
    required: false,
    color: '#8B5CF6',
  },
  {
    id: 'manufacturing',
    name: 'التصنيع',
    description: 'قوائم المواد BOM، أوامر العمل، خطط الإنتاج، محطات العمل',
    icon: 'Factory',
    required: false,
    color: '#EC4899',
  },
  {
    id: 'hr',
    name: 'الموارد البشرية',
    description: 'الموظفون، الحضور، الإجازات، المرتبات، العقود',
    icon: 'Users',
    required: false,
    color: '#06B6D4',
  },
  {
    id: 'crm',
    name: 'العملاء CRM',
    description: 'العملاء المحتملون، الفرص، المواعيد، المتابعات',
    icon: 'UserCheck',
    required: false,
    color: '#F97316',
  },
  {
    id: 'projects',
    name: 'المشاريع',
    description: 'إدارة المشاريع، المهام، تتبع الوقت، الفوترة',
    icon: 'FolderKanban',
    required: false,
    color: '#6366F1',
  },
] as const;
```

---

## المرحلة الخامسة: أتمتة إنشاء مفاتيح API {#المرحلة-الخامسة}

### الهدف
المستخدم لا يرى أو يتعامل مع مفاتيح API إطلاقاً. النظام ينشئها ويحفظها تلقائياً.

### الآلية (مضمنة في setup-engine.ts أعلاه):

```
تدفق أتمتة مفاتيح API:

1. بعد إنشاء مستخدم المدير في ERPNext
   ↓
2. النظام يستدعي: frappe.core.doctype.user.user.generate_keys
   مع جلسة المدير (sid)
   ↓
3. ERPNext يُرجع: { api_key: "xxx", api_secret: "yyy" }
   ↓
4. النظام يحفظ المفاتيح تلقائياً في:
   ├── ملف .env (للإعدادات الدائمة)
   └── process.env (للاستخدام الفوري)
   ↓
5. من هذه اللحظة، كل طلبات API تستخدم المفاتيح تلقائياً
   ↓
6. المستخدم لا يعرف شيئاً عن هذا
```

### ملاحظات للـ Agent:
- المفاتيح تُنشأ **مرة واحدة فقط** عند أول إعداد
- إذا كانت المفاتيح موجودة في `.env` لا تنشئها مرة أخرى
- احفظ المفاتيح في `.env` وليس في الكود المصدري أبداً
- أضف `.env` إلى `.gitignore` (موجود بالفعل)

---

## المرحلة السادسة: إخفاء ERPNext (White-Label) {#المرحلة-السادسة}

### الهدف
المستخدم النهائي لا يرى أو يشعر بوجود ERPNext إطلاقاً.

### 6.1 إخفاء المنفذ 8000 (تم في المرحلة الأولى عبر Docker Compose)

### 6.2 تنظيف استجابات API من أي إشارة لـ ERPNext

#### الملف الجديد: `src/lib/server/response-sanitizer.ts`

```typescript
// ============================================================
// منظف الاستجابات - يزيل أي إشارة لـ ERPNext أو Frappe
// ============================================================

/** كلمات ممنوعة يجب استبدالها في أي استجابة */
const BANNED_TERMS: Record<string, string> = {
  'ERPNext': 'ERP Pro',
  'erpnext': 'erp-pro',
  'Frappe': 'ERP Pro',
  'frappe': 'erp-pro',
  'FRAPPE': 'ERP_PRO',
  'erp_next': 'erp_pro',
  'ERP_NEXT': 'ERP_PRO',
  '/api/method/frappe': '/api/method',
  '/api/resource/': '/api/data/',
  'bench': 'system',
};

/**
 * تنظيف كائن من أي إشارة لـ ERPNext
 * يعمل بشكل متكرر على جميع الخصائص المتداخلة
 */
export function sanitizeResponse<T>(data: T): T {
  if (typeof data === 'string') {
    let cleaned = data;
    for (const [banned, replacement] of Object.entries(BANNED_TERMS)) {
      cleaned = cleaned.replaceAll(banned, replacement);
    }
    return cleaned as T;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponse(item)) as T;
  }

  if (data && typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      // تنظيف المفتاح أيضاً
      let cleanKey = key;
      for (const [banned, replacement] of Object.entries(BANNED_TERMS)) {
        cleanKey = cleanKey.replaceAll(banned, replacement);
      }
      sanitized[cleanKey] = sanitizeResponse(value);
    }
    return sanitized as T;
  }

  return data;
}

/**
 * تنظيف رسائل الخطأ
 */
export function sanitizeErrorMessage(message: string): string {
  let cleaned = message;
  for (const [banned, replacement] of Object.entries(BANNED_TERMS)) {
    cleaned = cleaned.replaceAll(banned, replacement);
  }
  // إخفاء المسارات الداخلية
  cleaned = cleaned.replace(/\/home\/frappe\/[^\s]*/g, '[مسار داخلي]');
  cleaned = cleaned.replace(/\/opt\/[^\s]*/g, '[مسار داخلي]');
  cleaned = cleaned.replace(/Traceback[\s\S]*$/g, 'حدث خطأ داخلي');
  return cleaned;
}

/**
 * خصائص يجب إزالتها من أي استجابة
 */
const REMOVED_PROPERTIES = new Set([
  'frappe_version',
  'erpnext_version',
  'setup_complete',
  'installer_version',
  'frappe_server_version',
]);

/**
 * إزالة الخصائص الحساسة من الاستجابة
 */
export function removeSensitiveProperties<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map(item => removeSensitiveProperties(item)) as T;
  }

  if (data && typeof data === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (!REMOVED_PROPERTIES.has(key)) {
        cleaned[key] = removeSensitiveProperties(value);
      }
    }
    return cleaned as T;
  }

  return data;
}
```

### 6.3 تغيير العلامة التجارية في ERPNext (مضمن في setup-engine.ts - خطوة setupBranding)

### 6.4 إخفاء في HTML والصفحات

#### القواعد:
1. لا رابط لـ `localhost:8000` في أي مكان في الواجهة
2. لا كلمة "ERPNext" أو "Frappe" في أي نص مرئي
3. لا شعار ERPNext في أي مكان
4. كل الروابط الخارجية تمر عبر الواجهة الأمامية فقط
5. صفحة 404 مخصصة بدون أي إشارة لـ ERPNext
6. رسائل الخطأ مخصصة بدون تفاصيل تقنية داخلية

### 6.5 إخفاء في رسائل البريد الإلكتروني (للمستقبل)

```typescript
// عند إعداد ERPNext - تعطيل البريد الإلكتروني الافتراضي
await erpnextRequest('POST', '/method/frappe.client.set_value', {
  doctype: 'Email Settings',
  name: 'Email Settings',
  fieldname: 'footer',
  value: 'ERP Pro - نظام إدارة موارد المؤسسات',
}, sid);
```

---

## المرحلة السابعة: تعديل نظام المصادقة {#المرحلة-السابعة}

### الهدف
عندما يكون ERPNext متاحاً، استخدم مصادقته الحقيقية بدلاً من المصادقة التجريبية.

### الملف: `src/app/api/auth/login/route.ts`

### ⚠️ التعديلات المطلوبة:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { isBackendAvailable, authenticateUser } from '@/lib/server/backend';

// الحسابات التجريبية (تُستخدم فقط عندما ERPNext غير متاح)
const DEMO_ACCOUNTS: Record<string, { password: string; name: string; email: string; roles: string[] }> = {
  admin: {
    password: 'admin',
    name: 'مدير النظام',
    email: 'admin@erp-pro.com',
    roles: ['System Manager', 'Accounts Manager', 'Sales Manager', 'HR Manager'],
  },
  // ... باقي الحسابات التجريبية ...
};

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: 'اسم المستخدم وكلمة المرور مطلوبان' },
      { status: 400 }
    );
  }

  // === التغيير الرئيسي: فحص هل ERPNext متاح ===
  const backendAvailable = await isBackendAvailable();

  if (backendAvailable) {
    // ---- مسار ERPNext الحقيقي ----
    const result = await authenticateUser(username, password);

    if (result.success && result.user) {
      const token = createSessionToken(
        result.user.id,
        result.user.name,
        result.user.email,
        result.user.roles
      );

      const response = NextResponse.json({
        success: true,
        data: {
          token,
          user: {
            id: result.user.id,
            name: result.user.name,
            fullName: result.user.name,
            email: result.user.email,
            roles: result.user.roles,
          },
        },
      });

      response.cookies.set('erp_session', token, {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        maxAge: 12 * 60 * 60,
        path: '/',
      });

      // حفظ جلسة ERPNext أيضاً
      if (result.session) {
        response.cookies.set('backend_sid', result.session, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 12 * 60 * 60,
          path: '/',
        });
      }

      return response;
    }

    return NextResponse.json(
      { success: false, error: result.error || 'بيانات الدخول غير صحيحة' },
      { status: 401 }
    );
  }

  // ---- مسار تجريبي (بدون ERPNext) ----
  const demoAccount = DEMO_ACCOUNTS[username];
  if (demoAccount && demoAccount.password === password) {
    const token = createSessionToken(username, demoAccount.name, demoAccount.email, demoAccount.roles);

    const response = NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: username,
          name: demoAccount.name,
          fullName: demoAccount.name,
          email: demoAccount.email,
          roles: demoAccount.roles,
        },
      },
    });

    response.cookies.set('erp_session', token, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 12 * 60 * 60,
      path: '/',
    });

    return response;
  }

  return NextResponse.json(
    { success: false, error: 'بيانات الدخول غير صحيحة' },
    { status: 401 }
  );
}

function createSessionToken(userId: string, fullName: string, email: string, roles: string[]): string {
  const tokenData = {
    sid: 'session',
    userId,
    fullName,
    email,
    roles,
    exp: Date.now() + 12 * 60 * 60 * 1000,
  };
  return Buffer.from(JSON.stringify(tokenData)).toString('base64');
}
```

---

## المرحلة الثامنة: تعديل API Routes لتنظيف الاستجابات {#المرحلة-الثامنة}

### الهدف
كل استجابة من ERPNext تُنظَّف قبل إرسالها للمستخدم.

### الملف: `src/app/api/data/[doctype]/route.ts`

### ⚠️ التعديل المطلوب: لف كل استجابة بدالة التنظيف

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getList, createDoc, isBackendAvailable } from '@/lib/server/backend';
import { sanitizeResponse, removeSensitiveProperties, sanitizeErrorMessage } from '@/lib/server/response-sanitizer';

export async function GET(request: NextRequest, { params }: { params: Promise<{ doctype: string }> }) {
  const { doctype } = await params;
  const backendAvailable = await isBackendAvailable();

  if (!backendAvailable) {
    // إرجاع بيانات تجريبية (كما هو حالياً)
    return NextResponse.json({ success: true, data: getDemoData(doctype) });
  }

  try {
    const url = new URL(request.url);
    const fields = url.searchParams.get('fields');
    const filters = url.searchParams.get('filters');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let data = await getList(doctype, {
      fields: fields ? JSON.parse(fields) : undefined,
      filters: filters ? JSON.parse(filters) : undefined,
      limit,
      offset,
    });

    // === تنظيف الاستجابة قبل الإرسال ===
    data = sanitizeResponse(data);
    data = removeSensitiveProperties(data);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    return NextResponse.json(
      { success: false, error: sanitizeErrorMessage(message) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ doctype: string }> }) {
  const { doctype } = await params;
  const backendAvailable = await isBackendAvailable();

  if (!backendAvailable) {
    return NextResponse.json(
      { success: false, error: 'الخادم غير متاح حالياً' },
      { status: 503 }
    );
  }

  try {
    let body = await request.json();
    let data = await createDoc(doctype, body);

    // === تنظيف الاستجابة ===
    data = sanitizeResponse(data);
    data = removeSensitiveProperties(data);

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطأ في إنشاء المستند';
    return NextResponse.json(
      { success: false, error: sanitizeErrorMessage(message) },
      { status: 500 }
    );
  }
}
```

### ⚠️ يجب تطبيق نفس النمط على جميع ملفات API Routes:
- `/api/data/[doctype]/[name]/route.ts`
- `/api/data/[doctype]/bulk/route.ts`
- `/api/reports/[reportName]/route.ts`
- `/api/method/[...path]/route.ts`
- `/api/dashboard/kpis/route.ts`

---

## المرحلة التاسعة: حماية المسارات ومنع الوصول المباشر {#المرحلة-التاسعة}

### الهدف
1. المستخدم غير المُعَد يرى صفحة الإعداد وليس لوحة التحكم
2. لا وصول مباشر لـ ERPNext عبر أي وسيلة

### الملف: `src/proxy.ts` (الـ middleware)

### ⚠️ التعديلات المطلوبة:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // === المسارات العامة (لا تحتاج مصادقة) ===
  const publicPaths = [
    '/login',
    '/setup',              // ← جديد: صفحة الإعداد
    '/api/auth/login',
    '/api/auth/forgot-password',
    '/api/setup/status',   // ← جديد: فحص حالة الإعداد
    '/api/setup/initiate', // ← جديد: بدء الإعداد
  ];

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  const isStaticFile = pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.endsWith('.svg');

  if (isPublicPath || isStaticFile) {
    return NextResponse.next();
  }

  // === حماية مسارات API ===
  if (pathname.startsWith('/api/')) {
    // السماح لمسارات الإعداد
    if (pathname.startsWith('/api/setup/')) {
      return NextResponse.next();
    }

    // باقي مسارات API تحتاج مصادقة
    const session = request.cookies.get('erp_session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // === التحقق من حالة النظام ===
  const setupComplete = process.env.SYSTEM_SETUP_COMPLETE === 'true';
  const session = request.cookies.get('erp_session')?.value;

  // إذا النظام لم يُعَد بعد → توجيه لصفحة الإعداد
  if (!setupComplete && !session) {
    return NextResponse.redirect(new URL('/setup', request.url));
  }

  // إذا لا توجد جلسة → توجيه لصفحة الدخول
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## المرحلة العاشرة: برنامج التثبيت المحلي (Installer) {#المرحلة-العاشرة}

### الهدف
برنامج تثبيت يعمل بدون إنترنت بعد تحميل الصور مرة واحدة.

### الملف الجديد: `scripts/install.bat` (لويندوز)

```batch
@echo off
chcp 65001 >nul
title ERP Pro - برنامج التثبيت
color 0A

echo.
echo ╔══════════════════════════════════════════╗
echo ║       ERP Pro - برنامج التثبيت          ║
echo ║     نظام إدارة موارد المؤسسات            ║
echo ╚══════════════════════════════════════════╝
echo.

:: فحص Docker
echo [1/6] فحص Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker غير مثبت!
    echo يرجى تثبيت Docker Desktop من: https://docker.com
    pause
    exit /b 1
)
echo ✅ Docker متوفر

:: فحص Node.js
echo [2/6] فحص Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js غير مثبت!
    echo يرجى تثبيت Node.js من: https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js متوفر

:: تحميل صور Docker من الملفات المحلية
echo [3/6] تحميل صور Docker المحلية...
if exist "docker-images\mariadb.tar" (
    echo    تحميل MariaDB...
    docker load -i docker-images\mariadb.tar
    echo    ✅ تم
) else (
    echo    ⚠️ ملف mariadb.tar غير موجود - سيتم التحميل من الإنترنت
)

if exist "docker-images\redis.tar" (
    echo    تحميل Redis...
    docker load -i docker-images\redis.tar
    echo    ✅ تم
) else (
    echo    ⚠️ ملف redis.tar غير موجود - سيتم التحميل من الإنترنت
)

if exist "docker-images\erpnext.tar" (
    echo    تحميل ERPNext...
    docker load -i docker-images\erpnext.tar
    echo    ✅ تم
) else (
    echo    ⚠️ ملف erpnext.tar غير موجود - سيتم التحميل من الإنترنت
)

if exist "docker-images\caddy.tar" (
    echo    تحميل Caddy...
    docker load -i docker-images\caddy.tar
    echo    ✅ تم
) else (
    echo    ⚠️ ملف caddy.tar غير موجود - سيتم التحميل من الإنترنت
)

:: تثبيت التبعيات
echo [4/6] تثبيت التبعيات...
cd app
call npm install
if errorlevel 1 (
    echo ❌ فشل تثبيت التبعيات
    pause
    exit /b 1
)
echo ✅ تم تثبيت التبعيات

:: بناء المشروع
echo [5/6] بناء المشروع...
call npm run build
if errorlevel 1 (
    echo ❌ فشل البناء
    pause
    exit /b 1
)
echo ✅ تم البناء

:: تشغيل الحاويات
echo [6/6] تشغيل النظام...
cd ..
docker compose up -d
if errorlevel 1 (
    echo ❌ فشل تشغيل الحاويات
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════╗
echo ║     ✅ تم التثبيت بنجاح!               ║
echo ║                                          ║
echo ║  افتح المتصفح على:                      ║
echo ║  http://localhost:3000                   ║
echo ║                                          ║
echo ║  اتبع خطوات الإعداد الأولى               ║
echo ╚══════════════════════════════════════════╝
echo.

:: فتح المتصفح تلقائياً
start http://localhost:3000

pause
```

### الملف الجديد: `scripts/export-images.bat` (لتصدير الصور للاستخدام المحلي)

```batch
@echo off
chcp 65001 >nul
echo تصدير صور Docker للنقل المحلي...
echo.

mkdir docker-images 2>nul

echo [1/4] تصدير MariaDB...
docker save mariadb:10.6 -o docker-images\mariadb.tar

echo [2/4] تصدير Redis...
docker save redis:7-alpine -o docker-images\redis.tar

echo [3/4] تصدير ERPNext...
docker save frappe/erpnext:v15.52.1 -o docker-images\erpnext.tar

echo [4/4] تصدير Caddy...
docker save caddy:2 -o docker-images\caddy.tar

echo.
echo ✅ تم التصدير بنجاح!
echo الملفات في مجلد: docker-images\
echo الحجم الإجمالي:
dir /s docker-images\*.tar | findstr "File(s)"
echo.
echo انسخ مجلد docker-images مع المشروع للتثبيت بدون إنترنت
pause
```

---

## ملف الأنواع TypeScript المرجعي {#ملف-الأنواع}

### الملف: `src/lib/core/setup-types.ts`

```typescript
// ============================================================
// أنواع بيانات الإعداد - مرجع شامل للـ Agent
// ============================================================

/** حالة النظام الكاملة */
export type SystemStatus =
  | 'first_time'        // أول مرة - يحتاج إعداد
  | 'setup_in_progress' // الإعداد جارٍ
  | 'ready'             // جاهز للاستخدام
  | 'backend_offline'   // ERPNext لا يعمل
  | 'demo_mode';        // وضع تجريبي

/** بيانات نموذج الإعداد */
export interface SetupFormData {
  companyName: string;
  companyAbbrev: string;
  country: string;
  currency: string;
  language: string;
  industry: string;
  taxId?: string;
  commercialRegister?: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
  modules: SetupModules;
  fiscalYearStart: string;
  fiscalYearEnd: string;
  defaultTaxRate: number;
  taxTemplate: 'vat' | 'sales_tax' | 'none';
  chartOfAccountsTemplate: 'standard' | 'trading' | 'service' | 'manufacturing' | 'custom';
  defaultCashAccount: string;
  defaultBankAccount?: string;
  bankName?: string;
  bankAccountNumber?: string;
}

/** الوحدات المتاحة */
export interface SetupModules {
  accounting: boolean;      // دائماً true
  sales: boolean;
  purchases: boolean;
  inventory: boolean;
  manufacturing: boolean;
  hr: boolean;
  crm: boolean;
  projects: boolean;
}

/** خطوة إعداد */
export interface SetupStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  message?: string;
  error?: string;
}

/** استجابة حالة النظام */
export interface SetupStatusResponse {
  success: boolean;
  data: {
    status: SystemStatus;
    backendAvailable: boolean;
    backendConfigured: boolean;
    siteExists: boolean;
    adminUserCreated: boolean;
    apiKeysGenerated: boolean;
    companySetup: boolean;
    chartOfAccountsSetup: boolean;
    currentStep: number;
    totalSteps: number;
    message: string;
  };
}

/** استجابة بدء الإعداد */
export interface SetupInitiateResponse {
  success: boolean;
  data?: {
    message: string;
    apiKeyConfigured: boolean;
  };
  error?: string;
}

/** معلومات الدولة */
export interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  currencyName: string;
  taxRate: number;
  language: string;
}

/** معلومات الوحدة */
export interface ModuleInfo {
  id: keyof SetupModules;
  name: string;
  description: string;
  icon: string;
  required: boolean;
  color: string;
}
```

---

## جدول ERPNext API الكامل {#جدول-api}

### جميع نقاط النهاية (Endpoints) المستخدمة في الإعداد والتشغيل:

| العملية | الطريقة | نقطة النهاية | الطلب | الاستجابة |
|---------|--------|-------------|-------|----------|
| تسجيل دخول | POST | `/api/method/login` | `{ usr, pwd }` | `{ message: { user, full_name } }` + Cookie `sid` |
| فحص الاتصال | GET | `/api/method/ping` | - | `""` (200 OK) |
| إنشاء مستند | POST | `/api/resource/{doctype}` | `{ doctype, ...fields }` | `{ data: { ...doc } }` |
| جلب قائمة | GET | `/api/resource/{doctype}?fields=&filters=&limit=` | - | `{ data: [...] }` |
| جلب مستند | GET | `/api/resource/{doctype}/{name}` | - | `{ data: { ...doc } }` |
| تحديث مستند | PUT | `/api/resource/{doctype}/{name}` | `{ doctype, name, ...fields }` | `{ data: { ...doc } }` |
| حذف مستند | DELETE | `/api/resource/{doctype}/{name}` | - | `{ message: "ok" }` |
| تعيين قيمة | POST | `/api/method/frappe.client.set_value` | `{ doctype, name, fieldname, value }` | `{ message: value }` |
| جلب قيمة | GET | `/api/method/frappe.client.get_value?doctype=&fieldname=&name=` | - | `{ message: value }` |
| جلب عدد | GET | `/api/method/frappe.client.get_count?doctype=&filters=` | - | `{ message: number }` |
| توليد مفاتيح API | POST | `/api/method/frappe.core.doctype.user.user.generate_keys` | `{ user: "email" }` | `{ message: { api_key, api_secret } }` |
| تقديم مستند | POST | `/api/method/frappe.client.submit` | `{ doc: { doctype, name } }` | `{ data: { ...doc } }` |
| إلغاء مستند | POST | `/api/method/frappe.client.cancel` | `{ doc: { doctype, name } }` | `{ data: { ...doc } }` |
| تشغيل تقرير | POST | `/api/method/frappe.desk.query_report.run` | `{ report_name, filters }` | `{ result: [...], columns: [...] }` |
| استدعاء طريقة عامة | POST | `/api/method/{method_path}` | `{ ...args }` | `{ message: result }` |

### أنواع المستندات (DocTypes) المستخدمة:

| DocType | الوصف | يُستخدم في |
|---------|-------|-----------|
| `Company` | الشركة | الإعداد - الخطوة 2 |
| `User` | المستخدم | الإعداد - الخطوة 3 |
| `Account` | حساب محاسبي | دليل الحسابات |
| `Cost Center` | مركز تكلفة | مراكز التكلفة |
| `Customer` | عميل | المبيعات/CRM |
| `Supplier` | مورد | المشتريات |
| `Item` | صنف/منتج | المخزون |
| `Warehouse` | مستودع | المخزون |
| `Sales Invoice` | فاتورة مبيعات | المحاسبة/المبيعات |
| `Purchase Invoice` | فاتورة مشتريات | المحاسبة/المشتريات |
| `Payment Entry` | سند دفع | المحاسبة |
| `Journal Entry` | قيد يومية | المحاسبة |
| `Sales Order` | أمر بيع | المبيعات |
| `Purchase Order` | أمر شراء | المشتريات |
| `Employee` | موظف | الموارد البشرية |
| `Salary Structure` | هيكل راتب | الموارد البشرية |
| `Fiscal Year` | سنة مالية | الإعداد - الخطوة 5 |
| `Mode of Payment` | طريقة دفع | الإعداد - الخطوة 6 |
| `Bank Account` | حساب بنكي | الإعداد - الخطوة 6 |
| `Sales Taxes and Charges Template` | قالب ضريبة مبيعات | الإعداد - الخطوة 5 |
| `Purchase Taxes and Charges Template` | قالب ضريبة مشتريات | الإعداد - الخطوة 5 |
| `System Settings` | إعدادات النظام | White-Label |
| `Stock Entry` | حركة مخزون | المخزون |
| `BOM` | قائمة مواد | التصنيع |
| `Work Order` | أمر عمل | التصنيع |

---

## قائمة التحقق النهائية {#قائمة-التحقق}

### بعد تنفيذ جميع المراحل، تحقق من:

#### إخفاء ERPNext:
- [ ] `localhost:8000` لا يفتح في المتصفح (محظور)
- [ ] لا كلمة "ERPNext" في أي صفحة مرئية
- [ ] لا كلمة "Frappe" في أي صفحة مرئية
- [ ] لا شعار ERPNext في أي مكان
- [ ] رسائل الخطأ لا تكشف تفاصيل داخلية
- [ ] استجابات API لا تحتوي على إشارات لـ ERPNext

#### واجهة الإعداد:
- [ ] فتح `localhost:3000` لأول مرة → توجيه لصفحة `/setup`
- [ ] جميع خطوات الإعداد تعمل (7 خطوات)
- [ ] شريط التقدم يتحرك بشكل حي
- [ ] بعد الإعداد → توجيه تلقائي للوحة التحكم
- [ ] إعادة فتح `localhost:3000` بعد الإعداد → توجيه لصفحة الدخول مباشرة

#### أتمتة API:
- [ ] مفاتيح API تُنشأ تلقائياً بدون تدخل المستخدم
- [ ] مفاتيح API تُحفظ في `.env` تلقائياً
- [ ] جميع عمليات CRUD تعمل عبر ERPNext
- [ ] البيانات التجريبية لا تظهر عند توفر ERPNext

#### المصادقة:
- [ ] تسجيل الدخول ببيانات ERPNext الحقيقية يعمل
- [ ] تسجيل الدخول التجريبي يعمل (عند عدم توفر ERPNext)
- [ ] تسجيل الخروج يمسح الجلسة بالكامل
- [ ] حماية المسارات تعمل (غير المصادق → /login)

#### Docker:
- [ ] `docker compose up -d` يبدأ كل شيء
- [ ] فقط المنفذ 3000 مرئي من الخارج
- [ ] ERPNext يعمل داخلياً فقط
- [ ] إعادة التشغيل بعد فشل (restart: unless-stopped)

#### التثبيت المحلي:
- [ ] `scripts/export-images.bat` يصدّر الصور
- [ ] `scripts/install.bat` يثبّت بدون إنترنت
- [ ] المتصفح يفتح تلقائياً بعد التثبيت

---

## ⚠️ تحذيرات نهائية للـ Agent

1. **لا تنفّذ كل المراحل مرة واحدة** - نفّذ مرحلة تلو الأخرى واختبر كل واحدة
2. **لا تحذف الكود التجريبي** - أبقِه كـ fallback عندما ERPNext غير متاح
3. **لا تغيّر أسماء الملفات أو المسارات** الموجودة - فقط أضف ملفات جديدة
4. **اختبر كل ملف TypeScript** بأنه يجمع بدون أخطاء قبل الانتقال
5. **لا تضع بيانات حساسة في الكود** - استخدم `.env` دائماً
6. **لا تعدّل ملفات shadcn/ui** في `src/components/ui/` - هي ملفات مكتبة
7. **احتفظ بنسخة من كل ملف قبل تعديله** - استخدم `git stash` أو انسخ الملف
8. **إذا واجهت خطأ TypeScript لا تستطيع حله** - لا تستخدم `any` - استخدم `unknown` مع type guard
9. **لا تلمس ملفات قاعدة البيانات** أو ملفات Docker الموجودة بدون ضرورة
10. **بعد كل مرحلة** - شغّل `npm run build` وتأكد من نجاح البناء
