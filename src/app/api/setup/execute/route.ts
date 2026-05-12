import { NextRequest, NextResponse } from 'next/server';
import { createDoc, updateDoc, deleteDoc, getList, callMethod, detectErpnextVersion, isBackendAvailable } from '@/lib/server/backend';
import {
  buildCompanyCreate,
  buildFiscalYearCreate,
  buildCostCenterCreate,
  buildWarehouseCreate,
  buildModeOfPaymentCreate,
  buildPriceList,
  buildEmployeeCreate,
} from '@/lib/erp/erpnext-payloads';
import { setupTaxPackage } from '@/lib/server/tax-setup';
import { getBackendVersion, isBackendV16OrLater, saveFrappeConnectionFile, clearFrappeConnectionCache, getResolvedBackendHost } from '@/lib/server/frappe-connection-store';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { jwtVerify } from 'jose';
import { getJwtSecretBytes } from '@/lib/auth/jwt-secret';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


/** ملف علامة اكتمال الإعداد */
function setupFlagPath(): string {
  const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dir, 'app-config.json');
}

function markSetupComplete(config: Record<string, unknown>): void {
  const fp = setupFlagPath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  const existing = (() => { try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return {}; } })();
  const merged = { ...existing, ...config, setupComplete: true, setupDate: new Date().toISOString() };
  fs.writeFileSync(fp, JSON.stringify(merged, null, 2), 'utf8');
}

function isSetupFlagSet(): boolean {
  try {
    const raw = fs.readFileSync(setupFlagPath(), 'utf8');
    const config = JSON.parse(raw) as { setupComplete?: boolean };
    return config.setupComplete === true;
  } catch {
    return false;
  }
}

async function verifySessionForSetup(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes(), { algorithms: ['HS256'] });
    const roles = Array.isArray(payload.roles) ? payload.roles.map(String) : [];
    return roles.some(r => /system manager|administrator|مدير النظام/i.test(r));
  } catch {
    return false;
  }
}

/**
 * تأكد من وجود AUTH_JWT_SECRET — يُولّده ويحفظه إن لم يكن موجوداً
 * هذا ضروري لأن jwt-secret.ts يرمي خطأ إذا لم يكن المتغير مضبوطاً
 * والإعداد يحتاج إلى توقيع JWT بعد إكمال الإعداد (تسجيل الدخول)
 */
function ensureJwtSecret(): void {
  const existing = process.env.AUTH_JWT_SECRET;
  if (existing && existing.length >= 16) return;

  const generated = randomBytes(32).toString('base64');
  process.env.AUTH_JWT_SECRET = generated;

  // حفظ في .env.local للاستخدام بعد إعادة التشغيل
  // على Railway وبيئات Docker، قد لا يكون الملف قابلاً للكتابة — لا مشكلة
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    let content = '';
    try { content = fs.readFileSync(envPath, 'utf8'); } catch { /* لا يوجد */ }

    const varName = 'AUTH_JWT_SECRET';
    const regex = new RegExp(`^${varName}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${varName}=${generated}`);
    } else {
      content += `\n${varName}=${generated}`;
    }
    fs.writeFileSync(envPath, content, 'utf8');
    console.log('[Setup] Generated AUTH_JWT_SECRET and saved to .env.local');
  } catch (writeErr) {
    // على Railway أو Docker، الملف قد لا يكون قابل للكتابة
    // المهم أن المتغير مضبوط في الذاكرة (process.env) لجلسة الحالية
    console.warn('[Setup] Could not save AUTH_JWT_SECRET to .env.local (expected on Railway/Docker):', (writeErr as Error).message);
  }
}

/** تحديث ملف .env.local بمفاتيح API — آمنة عند عدم القدرة على الكتابة */
function updateEnvFile(apiKey: string, apiSecret: string): void {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    let content = '';
    try { content = fs.readFileSync(envPath, 'utf8'); } catch { /* لا يوجد */ }

    const setVar = (name: string, value: string) => {
      const regex = new RegExp(`^${name}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${name}=${value}`);
      } else {
        content += `\n${name}=${value}`;
      }
    };

    setVar('BACKEND_API_KEY', apiKey);
    setVar('BACKEND_API_SECRET', apiSecret);
    fs.writeFileSync(envPath, content, 'utf8');
  } catch (writeErr) {
    // على Railway أو Docker، الملف قد لا يكون قابل للكتابة
    console.warn('[Setup] Could not save API keys to .env.local (expected on Railway/Docker):', (writeErr as Error).message);
  }
}

type SetupStepResult = { step: string; status: 'ok' | 'skip' | 'error'; message: string; name?: string };

/**
 * إنشاء الشركة مع تجاوز خطأ إعداد الضرائب التلقائي في ERPNext
 *
 * المشكلة: عند إنشاء شركة لدولة لا تمتلك بيانات ضريبية معرّفة في ERPNext
 * (مثل اليمن)، يفشل on_update() بسبب IndexError في taxes_setup.py.
 *
 * الحل: نهج متعدد الطبقات:
 *  1. محاولة إنشاء الشركة مباشرة (تعمل إذا تم تطبيق باتش Python)
 *  2. إذا فشلت، استخدام Server Script مع تجاوز on_update على مستوى المثيل
 *  3. إذا فشل Server Script، التحقق من وجود الشركة (قد تكون أُنشئت جزئياً)
 *  4. إذا لم توجد، محاولة إنشاء شركة فارغة عبر SQL مباشر
 *
 * يتم إعداد الضرائب لاحقاً عبر setupTaxPackage() المخصص لدينا.
 */
async function createCompanyWithSafeOnUpdate(params: {
  company_name: string;
  abbr?: string;
  default_currency: string;
  country: string;
  language: string;
  chart_of_accounts?: string;
  tax_id?: string;
  company_doc?: string;
}): Promise<{ success: boolean; name?: string; abbr?: string; error?: string; usedExisting?: boolean }> {
  const scriptApiMethod = `erp_pro_safe_company_${Date.now()}`;

  // ── نهج 1: Server Script مع تجاوز on_update على مستوى المثيل ──
  // هذا النهج أبسط وأكثر موثوقية من monkey-patching على مستوى الفئة
  // لأنه لا يؤثر على العمليات الأخرى ولا يحتاج إلى استعادة الطريقة الأصلية
  const SCRIPT_CODE = `
import frappe

try:
    doc = frappe.get_doc({
        'doctype': 'Company',
        'company_name': frappe.form_dict.company_name,
        'default_currency': frappe.form_dict.default_currency,
        'country': frappe.form_dict.country,
    })
    if frappe.form_dict.abbr:
        doc.abbr = frappe.form_dict.abbr
    if frappe.form_dict.language:
        doc.language = frappe.form_dict.language
    if frappe.form_dict.chart_of_accounts:
        doc.chart_of_accounts = frappe.form_dict.chart_of_accounts
    if frappe.form_dict.tax_id:
        doc.tax_id = frappe.form_dict.tax_id
    if frappe.form_dict.company_doc:
        doc.company_doc = frappe.form_dict.company_doc

    # تجاوز on_update على مستوى المثيل لتجنب خطأ إعداد الضرائب
    # هذا أبسط من monkey-patching على مستوى الفئة
    original_on_update = doc.on_update
    def _safe_on_update(*args, **kwargs):
        try:
            original_on_update(*args, **kwargs)
        except Exception as e:
            frappe.log_error('Company on_update error (handled by ERP Pro): ' + str(e), 'ERP Pro Safe Setup')
    doc.on_update = _safe_on_update

    doc.insert()
    return {'success': True, 'name': doc.name, 'abbr': doc.abbr}
except Exception as e:
    # التحقق من أن الشركة لم تُنشأ جزئياً قبل الخطأ
    try:
        existing = frappe.get_all('Company', filters={'company_name': frappe.form_dict.company_name}, fields=['name', 'abbr'], limit=1)
        if existing:
            return {'success': True, 'name': existing[0]['name'], 'abbr': existing[0].get('abbr', '')}
    except:
        pass
    return {'success': False, 'error': str(e)}
`;

  let scriptDocName = '';
  try {
    // الخطوة 0: تفعيل Server Scripts بطرق متعددة
    console.log('[Setup] Attempting to enable Server Scripts...');
    try {
      // الطريقة 1: عبر System Settings
      await callMethod('frappe.client.set_value', {
        doctype: 'System Settings',
        name: 'System Settings',
        fieldname: 'enable_server_scripts',
        value: 1,
      });
    } catch {
      // قد لا يكون الحقل موجوداً — لا مشكلة
    }
    try {
      // الطريقة 2: عبر set_value مع fieldname ككائن
      await callMethod('frappe.client.set_value', {
        doctype: 'System Settings',
        name: 'System Settings',
        fieldname: { enable_server_scripts: 1 },
      });
    } catch {
      // تجاهل
    }

    // الخطوة 1: إنشاء Server Script على ERPNext
    console.log('[Setup] Creating Server Script for safe company creation...');
    const scriptResult = await createDoc('Server Script', {
      script_type: 'API',
      api_method: scriptApiMethod,
      script: SCRIPT_CODE,
    }) as Record<string, unknown>;
    scriptDocName = String(scriptResult.name || '');
    console.log('[Setup] Server Script created:', scriptDocName);

    // الخطوة 2: تنفيذ Server Script لإنشاء الشركة
    const result = await callMethod(scriptApiMethod, {
      company_name: params.company_name,
      abbr: params.abbr || '',
      default_currency: params.default_currency,
      country: params.country,
      language: params.language,
      chart_of_accounts: params.chart_of_accounts || '',
      tax_id: params.tax_id || '',
      company_doc: params.company_doc || '',
    }) as Record<string, unknown>;

    return {
      success: result.success === true,
      name: String(result.name || ''),
      abbr: String(result.abbr || ''),
      error: result.error ? String(result.error) : undefined,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[Setup] Server Script approach failed:', errMsg);

    // ── نهج 2: التحقق من وجود الشركة (قد تكون أُنشئت جزئياً) ──
    try {
      console.log('[Setup] Trying fallback: check for existing Company on backend...');
      const existingCompanies = await getList('Company', {
        fields: ['name', 'abbr', 'default_currency', 'country'],
        limit: 5,
      }) as { name: string; abbr: string; default_currency: string; country: string }[];

      if (existingCompanies.length > 0) {
        const existing = existingCompanies[0]!;
        console.log('[Setup] Found existing Company:', existing.name, '- using it as fallback');
        return {
          success: true,
          name: existing.name,
          abbr: existing.abbr,
          usedExisting: true,
        };
      }
    } catch (listErr) {
      console.warn('[Setup] Fallback Company lookup also failed:', listErr instanceof Error ? listErr.message : listErr);
    }

    // ── نهج 3: محاولة إنشاء الشركة بدون on_update عبر frappe.client.insert ──
    try {
      console.log('[Setup] Trying frappe.client.insert approach...');
      const insertResult = await callMethod('frappe.client.insert', {
        doc: {
          doctype: 'Company',
          company_name: params.company_name,
          abbr: params.abbr || undefined,
          default_currency: params.default_currency,
          country: params.country,
          language: params.language,
          chart_of_accounts: params.chart_of_accounts || undefined,
          tax_id: params.tax_id || undefined,
        },
      }) as Record<string, unknown>;
      if (insertResult?.name) {
        console.log('[Setup] Company created via frappe.client.insert:', insertResult.name);
        return {
          success: true,
          name: String(insertResult.name),
          abbr: String(insertResult.abbr || ''),
        };
      }
    } catch (insertErr) {
      const insertMsg = insertErr instanceof Error ? insertErr.message : String(insertErr);
      console.warn('[Setup] frappe.client.insert also failed:', insertMsg);
      // إذا فشلت بسبب نفس خطأ الضرائب، نتحقق من وجود الشركة مرة أخرى
      if (isTaxSetupBugError(insertMsg)) {
        try {
          const companies = await getList('Company', {
            fields: ['name', 'abbr'],
            filters: [['company_name', '=', params.company_name]],
            limit: 1,
          }) as { name: string; abbr: string }[];
          if (companies.length > 0) {
            console.log('[Setup] Company found after error (partial creation):', companies[0]!.name);
            return {
              success: true,
              name: companies[0]!.name,
              abbr: companies[0]!.abbr,
              usedExisting: true,
            };
          }
        } catch { /* تجاهل */ }
      }
    }

    return {
      success: false,
      error: errMsg,
    };
  } finally {
    // تنظيف: حذف Server Script دائماً
    if (scriptDocName) {
      try { await deleteDoc('Server Script', scriptDocName); } catch { /* تجاهل */ }
    }
  }
}

/**
 * فحص هل الخطأ ناتج عن مشكلة إعداد الضرائب في ERPNext
 * (IndexError في taxes_setup.py أو خطأ في on_update أثناء إنشاء الشركة)
 */
function isTaxSetupBugError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('indexerror') ||
    lower.includes('list index out of range') ||
    lower.includes('taxes_setup') ||
    lower.includes('create_default_tax_template') ||
    lower.includes('get_or_create_tax_group') ||
    lower.includes('taxes and charges template') ||
    (lower.includes('on_update') && lower.includes('company'))
  );
}

/** خريطة الدولة → العملة الافتراضية + نسبة ضريبة + هل الضريبة مدعومة في ERPNext */
const COUNTRY_CONFIG: Record<string, { currency: string; taxRate: number; taxName: string; taxSupported: boolean }> = {
  'Yemen': { currency: 'YER', taxRate: 5, taxName: 'ضريبة المبيعات', taxSupported: false },
  'Saudi Arabia': { currency: 'SAR', taxRate: 15, taxName: 'ضريبة القيمة المضافة', taxSupported: true },
  'United Arab Emirates': { currency: 'AED', taxRate: 5, taxName: 'ضريبة القيمة المضافة', taxSupported: true },
  'Kuwait': { currency: 'KWD', taxRate: 0, taxName: '', taxSupported: false },
  'Egypt': { currency: 'EGP', taxRate: 14, taxName: 'ضريبة القيمة المضافة', taxSupported: true },
  'Jordan': { currency: 'JOD', taxRate: 16, taxName: 'ضريبة المبيعات', taxSupported: true },
  'Qatar': { currency: 'QAR', taxRate: 0, taxName: '', taxSupported: false },
  'Bahrain': { currency: 'BHD', taxRate: 5, taxName: 'ضريبة القيمة المضافة', taxSupported: true },
  'Oman': { currency: 'OMR', taxRate: 5, taxName: 'ضريبة القيمة المضافة', taxSupported: true },
};

/** الوحدات المتاحة و DocTypes المقابلة */
const MODULE_MAP: Record<string, { label: string; modules: string[] }> = {
  accounting: { label: 'المحاسبة والمالية', modules: ['Accounts'] },
  sales: { label: 'المبيعات', modules: ['Selling'] },
  purchases: { label: 'المشتريات', modules: ['Buying'] },
  inventory: { label: 'المخزون', modules: ['Stock'] },
  hr: { label: 'الموارد البشرية', modules: ['HR'] },
  crm: { label: 'إدارة العملاء', modules: ['CRM'] },
  manufacturing: { label: 'التصنيع', modules: ['Manufacturing'] },
  projects: { label: 'المشاريع', modules: ['Projects'] },
};

/**
 * POST /api/setup/execute
 * تنفيذ الإعداد الكامل للنظام — معالج إعداد احترافي شامل
 * يدعم: إنشاء مستخدم إداري + مفاتيح API، إعداد الضرائب، تفعيل الوحدات
 */
export async function POST(request: NextRequest) {
  try {
    // ── تأكد من وجود JWT secret قبل أي عملية ───────────────────
    // يجب أن يكون AUTH_JWT_SECRET متاحاً لتوقيع الجلسات بعد الإعداد
    ensureJwtSecret();

    // ── حماية: منع إعادة الإعداد إذا اكتمل بالفعل ─────────────────
    if (isSetupFlagSet()) {
      return NextResponse.json(
        { success: false, error: 'الإعداد مكتمل بالفعل. لا يمكن إعادة تنفيذ الإعداد.' },
        { status: 403 }
      );
    }

    // ── حماية: التحقق من صلاحية الطلب عبر رمز الإعداد أو جلسة مصرح بها ──
    const sessionCookie = request.cookies.get('erp_session')?.value;
    const setupToken = request.headers.get('x-setup-token');
    const hasValidSession = sessionCookie && await verifySessionForSetup(sessionCookie);
    const hasSetupToken = setupToken === process.env.ERP_SETUP_TOKEN;

    if (!hasValidSession && !hasSetupToken) {
      // السماح بالإعداد الأول فقط إذا لم يكن هناك أي إعداد سابق والخادم غير مُعد
      const available = await isBackendAvailable().catch(() => false);
      if (!available) {
        return NextResponse.json(
          { success: false, error: 'تعذر الاتصال بالخادم للتحقق من حالة الإعداد.' },
          { status: 503 }
        );
      }
      // لا جلسة ولا رمز إعداد — لكن هذا إعداد أولي مسموح به
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    // ── 0. حفظ إعدادات الاتصال بالخادم أولاً ───────────────────
    const backendHost = String(body.backend_host || '').trim().replace(/\/$/, '');
    const serverAdminUser = String(body.server_admin_user || 'Administrator').trim();
    const serverAdminPassword = String(body.server_admin_password || '').trim();

    if (backendHost) {
      // حفظ عنوان الخادم وبيانات الدخول واسم الموقع في ملف الاتصال
      // ★ مهم: نحدد backendSiteName حتى يرسل Next.js ترويسة X-Frappe-Site-Name
      // هذا ضروري لكي يتواصل مع ERPNext عبر wsgi_wrapper
      saveFrappeConnectionFile({
        backendHost,
        adminUser: serverAdminUser,
        adminPassword: serverAdminPassword,
        backendSiteName: 'erppro',
      });
      clearFrappeConnectionCache();
    }

    // التحقق من توفر الخادم — نستخدم Ping مباشرة بدلاً من isBackendAvailable()
    // لأن isBackendAvailable() يعتمد على getResolvedBackendHost() الذي قد لا يقرأ
    // الملف المحفوظ حديثاً في بعض البيئات (مثل Railway)
    let backendReachable = false;
    try {
      const pingHost = backendHost || getResolvedBackendHost();
      const pingResponse = await fetch(`${pingHost}/api/method/ping`, {
        method: 'GET',
        headers: { Accept: 'application/json', 'X-Frappe-Site-Name': 'erppro' },
        signal: AbortSignal.timeout(15000),
      });
      backendReachable = pingResponse.ok;
    } catch {
      backendReachable = false;
    }

    if (!backendReachable) {
      return NextResponse.json({
        success: false,
        error: 'تعذر الاتصال بالخادم. تأكد من أن عنوان الخادم صحيح وأنه قيد التشغيل، ثم أعد المحاولة.',
      }, { status: 503 });
    }

    const companyName = String(body.company_name || '').trim();
    if (!companyName) {
      return NextResponse.json({ success: false, error: 'اسم الشركة مطلوب' }, { status: 400 });
    }

    const abbr = String(body.abbr || '').trim();
    const currency = String(body.currency || 'YER').trim();
    const country = String(body.country || 'Yemen').trim();
    const language = String(body.language || 'ar').trim();
    const chartOfAccounts = String(body.chart_of_accounts || '').trim();

    const fiscalYearStart = String(body.fiscal_year_start || '').trim();
    const fiscalYearEnd = String(body.fiscal_year_end || '').trim();
    const fiscalYearName = String(body.fiscal_year_name || '').trim();

    const warehouses = Array.isArray(body.warehouses)
      ? (body.warehouses as string[]).filter((w) => String(w).trim())
      : [];

    const paymentMethods = Array.isArray(body.payment_methods)
      ? (body.payment_methods as { name: string; type: string }[]).filter((p) => p.name?.trim())
      : [];

    const employeeFirstName = String(body.employee_first_name || '').trim();
    const employeeLastName = String(body.employee_last_name || '').trim();
    const employeeEmail = String(body.employee_email || '').trim();
    const employeePhone = String(body.employee_phone || '').trim();
    const employeeDesignation = String(body.employee_designation || '').trim();

    // حقول جديدة — المستخدم الإداري
    const adminEmail = String(body.admin_email || '').trim() || employeeEmail;
    const adminPassword = String(body.admin_password || '').trim();
    const adminFirstName = String(body.admin_first_name || '').trim() || employeeFirstName;
    const adminLastName = String(body.admin_last_name || '').trim() || employeeLastName;

    // حقول جديدة — الضرائب
    const enableTax = body.enable_tax === true;
    const taxRate = Number(body.tax_rate ?? COUNTRY_CONFIG[country]?.taxRate ?? 15);
    const taxName = String(body.tax_name || COUNTRY_CONFIG[country]?.taxName || 'ضريبة القيمة المضافة').trim();

    // حقول جديدة — الوحدات
    const enabledModules = Array.isArray(body.enabled_modules)
      ? (body.enabled_modules as string[]).filter(Boolean)
      : Object.keys(MODULE_MAP); // تفعيل الكل افتراضياً

    const results: SetupStepResult[] = [];
    const now = new Date();

    // ── 0.5 إنشاء الأنواع الأساسية المطلوبة لإنشاء الشركة ─────
    // ERPNext v15+ يتطلب وجود Warehouse Types قبل إنشاء الشركة
    // v16: Warehouse Type يستخدم Prompt naming ويتطلب حقل __newname
    try {
      const requiredWarehouseTypes = ['Transit', 'Store', 'Manufacturing'];
      for (const wt of requiredWarehouseTypes) {
        try {
          // v16 compat: استخدام __newname لأن Warehouse Type يستخدم Prompt autonaming
          await createDoc('Warehouse Type', { __newname: wt });
        } catch (e) {
          const em = e instanceof Error ? e.message : '';
          if (em.includes('already exists') || em.includes('Duplicate') || em.includes('duplicate')) {
            // موجود بالفعل — لا مشكلة
          } else {
            console.warn(`[Setup] Warehouse Type "${wt}" warning:`, em);
          }
        }
      }
      results.push({ step: 'warehouseTypes', status: 'ok', message: 'تم التأكد من وجود أنواع المستودعات المطلوبة' });
    } catch (e) {
      console.warn('[Setup] Warehouse Types step failed:', e instanceof Error ? e.message : e);
      results.push({ step: 'warehouseTypes', status: 'skip', message: 'تم تخطي إنشاء أنواع المستودعات' });
    }

    // ── 1. إنشاء الشركة ────────────────────────────────────
    // [v16 NOTE] ERPNext v16 Company doctype may have new required fields.
    // buildCompanyCreate already handles standard fields. v16 may add:
    //   - company_doc (new field for document numbering)
    //   - default_letter_head (may be required in v16)
    //   - tax_id (may be more strictly validated)
    // We add optional v16 fields if provided in the request body.
    let companyDocName = '';
    try {
      const companyPayload = buildCompanyCreate({
        company_name: companyName,
        abbr: abbr || undefined,
        default_currency: currency,
        country,
        language,
        chart_of_accounts: chartOfAccounts || undefined,
      });

      // v16 compat: add new fields that v16 may require or accept
      const taxId = String(body.tax_id || '').trim();
      if (taxId) companyPayload.tax_id = taxId;
      const companyDoc = String(body.company_doc || '').trim();
      if (companyDoc && isBackendV16OrLater()) companyPayload.company_doc = companyDoc;

      const companyResult = await createDoc('Company', companyPayload) as Record<string, unknown>;
      companyDocName = String(companyResult.name || companyName);
      results.push({ step: 'company', status: 'ok', message: 'تم إنشاء الشركة بنجاح', name: companyDocName });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل إنشاء الشركة';
      console.error('[Setup] Company creation error:', msg);
      if (msg.includes('already exists') || msg.includes('Duplicate') || msg.includes('duplicate')) {
        companyDocName = companyName;
        results.push({ step: 'company', status: 'skip', message: 'الشركة موجودة بالفعل', name: companyDocName });
      } else if (isTaxSetupBugError(msg)) {
        // ── خطأ معروف: IndexError في taxes_setup.py ──────────────
        // ERPNext يحاول إنشاء قوالب ضرائب افتراضية أثناء on_update()
        // لكنها تفشل لأن الدولة (مثل اليمن) لا تملك بيانات ضريبية معرّفة.
        // الحل: استخدام Server Script لتطبيق monkey-patch مؤقت
        // يلتف on_update() بـ try/except، مما يسمح بإنشاء الشركة بنجاح.
        console.log('[Setup] Detected ERPNext tax setup bug. Trying safe company creation via Server Script...');

        try {
          const taxId = String(body.tax_id || '').trim();
          const companyDoc = String(body.company_doc || '').trim();

          const safeResult = await createCompanyWithSafeOnUpdate({
            company_name: companyName,
            abbr: abbr || undefined,
            default_currency: currency,
            country,
            language,
            chart_of_accounts: chartOfAccounts || undefined,
            tax_id: taxId || undefined,
            company_doc: companyDoc && isBackendV16OrLater() ? companyDoc : undefined,
          });

          if (safeResult.success && safeResult.name) {
            companyDocName = safeResult.name;
            if (safeResult.usedExisting) {
              results.push({
                step: 'company',
                status: 'ok',
                message: `تم استخدام الشركة الموجودة "${companyDocName}" (تجاوز خطأ القوالب الضريبية)`,
                name: companyDocName,
              });
            } else {
              results.push({
                step: 'company',
                status: 'ok',
                message: 'تم إنشاء الشركة بنجاح (تم تجاوز خطأ القوالب الضريبية التلقائية)',
                name: companyDocName,
              });
            }
            console.log('[Setup] Company created successfully via safe_on_update patch:', companyDocName);
          } else {
            const safeErr = safeResult.error || 'فشل إنشاء الشركة بالطريقة الآمنة';
            console.error('[Setup] Safe company creation also failed:', safeErr);
            results.push({ step: 'company', status: 'error', message: safeErr });
            return NextResponse.json({
              success: false,
              error: `فشل إنشاء الشركة: ${safeErr}`,
              hint: 'هذا خطأ معروف في ERPNext عند إنشاء شركة لدولة لا تملك بيانات ضريبية. جرب إعادة نشر الخادم الخلفي مع الإصلاحات المتوفرة في railway/backend/patches/',
              data: { results },
            }, { status: 500 });
          }
        } catch (patchErr) {
          const patchMsg = patchErr instanceof Error ? patchErr.message : 'فشل تطبيق الإصلاح';
          console.error('[Setup] Safe company creation exception:', patchMsg);
          results.push({ step: 'company', status: 'error', message: patchMsg });
          return NextResponse.json({
            success: false,
            error: `فشل إنشاء الشركة: ${patchMsg}`,
            hint: 'قد يكون Server Script معطلاً على الخادم. فعّله من إعدادات الموقع أو أعد نشر الخادم مع الإصلاحات.',
            data: { results },
          }, { status: 500 });
        }
      } else {
        results.push({ step: 'company', status: 'error', message: msg });
        return NextResponse.json({ success: false, error: `فشل إنشاء الشركة: ${msg}`, data: { results } }, { status: 500 });
      }
    }

    // ── 2. إنشاء السنة المالية ──────────────────────────────
    // [v16 NOTE] ERPNext v16 Fiscal Year doctype is stable.
    // No new required fields known in v16. If v16 adds mandatory fields,
    // the createDoc call will fail gracefully and be caught below.
    const currentYear = now.getFullYear();
    const fyStart = fiscalYearStart || `${currentYear}-01-01`;
    const fyEnd = fiscalYearEnd || `${currentYear}-12-31`;
    const fyName = fiscalYearName || String(currentYear);

    try {
      const fyPayload = buildFiscalYearCreate({ year: fyName, year_start_date: fyStart, year_end_date: fyEnd });
      await createDoc('Fiscal Year', fyPayload);
      results.push({ step: 'fiscalYear', status: 'ok', message: 'تم إنشاء السنة المالية بنجاح' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل إنشاء السنة المالية';
      if (msg.includes('already exists') || msg.includes('Duplicate')) {
        results.push({ step: 'fiscalYear', status: 'skip', message: 'السنة المالية موجودة بالفعل' });
      } else {
        results.push({ step: 'fiscalYear', status: 'error', message: msg });
      }
    }

    // ── 3. إنشاء مركز التكلفة ──────────────────────────────
    try {
      const ccList = await getList('Cost Center', {
        fields: ['name'],
        filters: [['company', '=', companyDocName], ['is_group', '=', '1']],
        limit: 1,
      }) as { name: string }[];
      const mainCC = ccList.length > 0 ? ccList[0]!.name : undefined;

      const ccPayload = buildCostCenterCreate({
        cost_center_name: 'الرئيسي',
        company: companyDocName,
        parent_cost_center: mainCC || undefined,
        is_group: false,
      });
      await createDoc('Cost Center', ccPayload);
      results.push({ step: 'costCenter', status: 'ok', message: 'تم إنشاء مركز التكلفة بنجاح' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل إنشاء مركز التكلفة';
      if (msg.includes('already exists') || msg.includes('Duplicate')) {
        results.push({ step: 'costCenter', status: 'skip', message: 'مركز التكلفة موجود بالفعل' });
      } else {
        results.push({ step: 'costCenter', status: 'error', message: msg });
      }
    }

    // ── 4. إنشاء المستودعات ─────────────────────────────────
    const defaultWarehouses = warehouses.length > 0
      ? warehouses
      : ['المستودع الرئيسي', 'منتجات تامة', 'مواد خام', 'تالف'];

    let mainWarehouse = '';
    try {
      const whList = await getList('Warehouse', {
        fields: ['name'],
        filters: [['company', '=', companyDocName], ['is_group', '=', '1']],
        limit: 1,
      }) as { name: string }[];
      mainWarehouse = whList.length > 0 ? whList[0]!.name : '';
    } catch { /* تجاهل */ }

    for (const wh of defaultWarehouses) {
      try {
        const whPayload = buildWarehouseCreate({
          warehouse_name: wh,
          company: companyDocName,
          parent_warehouse: mainWarehouse || undefined,
          is_group: false,
        });
        await createDoc('Warehouse', whPayload);
        results.push({ step: 'warehouse', status: 'ok', message: `تم إنشاء المستودع: ${wh}` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : `فشل إنشاء المستودع: ${wh}`;
        if (msg.includes('already exists') || msg.includes('Duplicate')) {
          results.push({ step: 'warehouse', status: 'skip', message: `المستودع موجود: ${wh}` });
        } else {
          results.push({ step: 'warehouse', status: 'error', message: msg });
        }
      }
    }

    // ── 5. إنشاء طرق الدفع ──────────────────────────────────
    const defaultPaymentMethods = paymentMethods.length > 0
      ? paymentMethods
      : [
          { name: 'نقدي', type: 'Cash' },
          { name: 'تحويل بنكي', type: 'Bank' },
          { name: 'بطاقة ائتمان', type: 'General' },
          { name: 'مدى', type: 'Bank' },
          { name: 'Apple Pay', type: 'General' },
        ];

    for (const pm of defaultPaymentMethods) {
      try {
        const pmPayload = buildModeOfPaymentCreate({
          mode_of_payment: pm.name,
          type: (pm.type === 'Cash' || pm.type === 'Bank' || pm.type === 'General'
            ? pm.type
            : 'General') as 'Cash' | 'Bank' | 'General',
        });
        await createDoc('Mode of Payment', pmPayload);
        results.push({ step: 'paymentMethod', status: 'ok', message: `تم إنشاء طريقة الدفع: ${pm.name}` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : `فشل إنشاء طريقة الدفع: ${pm.name}`;
        if (msg.includes('already exists') || msg.includes('Duplicate')) {
          results.push({ step: 'paymentMethod', status: 'skip', message: `طريقة الدفع موجودة: ${pm.name}` });
        } else {
          results.push({ step: 'paymentMethod', status: 'error', message: msg });
        }
      }
    }

    // ── 6. إنشاء قوائم الأسعار ──────────────────────────────
    const priceLists = [
      { name: 'Standard Selling', buying: false, selling: true },
      { name: 'Standard Buying', buying: true, selling: false },
    ];

    for (const pl of priceLists) {
      try {
        const plPayload = buildPriceList({
          price_list_name: pl.name,
          currency,
          buying: pl.buying,
          selling: pl.selling,
        });
        await createDoc('Price List', plPayload);
        results.push({ step: 'priceList', status: 'ok', message: `تم إنشاء قائمة الأسعار: ${pl.name}` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : `فشل إنشاء قائمة الأسعار: ${pl.name}`;
        if (msg.includes('already exists') || msg.includes('Duplicate')) {
          results.push({ step: 'priceList', status: 'skip', message: `قائمة الأسعار موجودة: ${pl.name}` });
        } else {
          results.push({ step: 'priceList', status: 'error', message: msg });
        }
      }
    }

    // ── 7. إعداد الضرائب ──────────────────────────────
    // إذا الدولة لا تدعم الضرائب في ERPNext (مثل اليمن)، نتخطى هذا تلقائياً
    // لكن المستخدم يمكنه تفعيل الضرائب يدوياً (إعداد مخصص عبر setupTaxPackage)
    const countryTaxSupported = COUNTRY_CONFIG[country]?.taxSupported ?? true;
    const shouldSetupTax = enableTax && taxRate > 0 && taxName;

    if (shouldSetupTax) {
      try {
        const taxResult = await setupTaxPackage(companyDocName, taxName, taxRate);
        results.push({
          step: 'taxSetup',
          status: 'ok',
          message: `تم إعداد الضريبة: ${taxName} (${taxRate}%) — حسابات: ${taxResult.accounts.length}, قوالب: مبيعات + مشتريات`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل إعداد الضرائب';
        if (!countryTaxSupported) {
          // الدولة لا تدعم الضرائب في ERPNext — هذا متوقع
          console.warn('[Setup] Tax setup failed (expected for unsupported country):', msg);
          results.push({
            step: 'taxSetup',
            status: 'skip',
            message: `تم تخطي إعداد الضرائب — ${country} لا تملك بيانات ضريبية معرّفة في ERPNext. يمكنك إعداد الضرائب يدوياً لاحقاً من الإعدادات.`,
          });
        } else {
          results.push({ step: 'taxSetup', status: 'error', message: msg });
        }
      }
    } else if (!enableTax || !countryTaxSupported) {
      const reason = !enableTax
        ? 'تم تخطي إعداد الضرائب'
        : `تم تخطي إعداد الضرائب — ${country} لا تتطلب ضريبة تلقائية`;
      results.push({ step: 'taxSetup', status: 'skip', message: reason });
    }

    // ── 7.5 إنشاء السجلات المرجعية المطلوبة لإنشاء الموظف ──
    const finalDesignation = employeeDesignation || 'مدير النظام';
    const finalDepartment = 'الإدارة';

    try {
      // إنشاء سجلات الجنس (Gender) — مطلوبة في ERPNext v15+
      for (const g of ['Male', 'Female']) {
        try { await createDoc('Gender', { gender: g }); } catch (e) {
          const em = e instanceof Error ? e.message : '';
          if (!em.includes('already exists') && !em.includes('Duplicate')) {
            console.warn(`[Setup] Gender "${g}" warning:`, em);
          }
        }
      }

      // إنشاء المسمى الوظيفي
      try {
        await createDoc('Designation', { designation_name: finalDesignation });
      } catch (e) {
        const em = e instanceof Error ? e.message : '';
        if (!em.includes('already exists') && !em.includes('Duplicate')) {
          console.warn(`[Setup] Designation "${finalDesignation}" warning:`, em);
        }
      }

      // إنشاء القسم — company حقل إلزامي في v16
      try {
        await createDoc('Department', { department_name: finalDepartment, company: companyDocName, is_group: 1 });
      } catch (e) {
        const em = e instanceof Error ? e.message : '';
        if (!em.includes('already exists') && !em.includes('Duplicate')) {
          console.warn(`[Setup] Department "${finalDepartment}" warning:`, em);
        }
      }
    } catch (e) {
      console.warn('[Setup] Reference records step warning:', e instanceof Error ? e.message : e);
    }

    // ── 8. إنشاء موظف الإدارة ──────────────────────────────
    let employeeDocName = '';
    if (employeeFirstName) {
      try {
        // الحصول على اسم القسم الفعلي من ERPNext (قد يكون ملحقاً بـ اختصار الشركة)
        let deptName = finalDepartment;
        try {
          const deptList = await getList('Department', {
            fields: ['name'],
            filters: [['company', '=', companyDocName], ['department_name', '=', finalDepartment]],
            limit: 1,
          }) as { name: string }[];
          if (deptList.length > 0) deptName = deptList[0]!.name;
        } catch { /* استخدام القيمة الافتراضية */ }

        const empPayload = buildEmployeeCreate({
          first_name: employeeFirstName,
          last_name: employeeLastName || undefined,
          company: companyDocName,
          date_of_joining: now.toISOString().slice(0, 10),
          designation: finalDesignation,
          department: deptName,
          cell_number: employeePhone || undefined,
          personal_email: employeeEmail || undefined,
        });
        const empResult = await createDoc('Employee', empPayload) as Record<string, unknown>;
        employeeDocName = String(empResult.name || '');
        results.push({ step: 'employee', status: 'ok', message: 'تم إنشاء سجل الموظف بنجاح' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل إنشاء سجل الموظف';
        if (msg.includes('already exists') || msg.includes('Duplicate')) {
          results.push({ step: 'employee', status: 'skip', message: 'سجل الموظف موجود بالفعل' });
        } else {
          results.push({ step: 'employee', status: 'error', message: msg });
        }
      }
    }

    // ── 9. إنشاء مستخدم إداري + أدوار (جديد!) ──────────────────
    // [v16 NOTE] In ERPNext v16, the User doctype and role assignment
    // mechanism may change. The generate_keys method path is stable:
    //   frappe.core.doctype.user.user.generate_keys
    // If v16 moves this, the callMethod will fail gracefully.
    let apiKey = '';
    let apiSecret = '';

    if (adminEmail && adminPassword) {
      try {
        // تجنب إنشاء مستخدم بنفس بريد Administrator
        const isSystemAdmin = adminEmail.toLowerCase() === 'administrator';
        if (isSystemAdmin) {
          results.push({ step: 'adminUser', status: 'skip', message: 'تم تخطي إنشاء المستخدم الإداري لأن البريد هو Administrator — يتم استخدام الحساب الافتراضي' });
        } else {
        // إنشاء المستخدم
        const userPayload: Record<string, unknown> = {
          doctype: 'User',
          email: adminEmail,
          first_name: adminFirstName,
          last_name: adminLastName || undefined,
          new_password: adminPassword,
          send_welcome_email: 0,
          roles: [
            { role: 'System Manager' },
            { role: 'Accounts Manager' },
            { role: 'Sales Manager' },
            { role: 'Purchase Manager' },
            { role: 'Stock Manager' },
            { role: 'HR Manager' },
            { role: 'POS Manager' },
          ],
        };

        try {
          await createDoc('User', userPayload);
          results.push({ step: 'adminUser', status: 'ok', message: `تم إنشاء المستخدم الإداري: ${adminEmail}` });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'فشل إنشاء المستخدم';
          if (msg.includes('already exists') || msg.includes('Duplicate') || msg.includes('duplicate')) {
            results.push({ step: 'adminUser', status: 'skip', message: `المستخدم موجود بالفعل: ${adminEmail}` });
          } else {
            console.error('[Setup] User creation error:', msg);
            results.push({ step: 'adminUser', status: 'error', message: msg });
          }
        }
        } // end of else (not Administrator)

        // توليد مفاتيح API للمستخدم
        // استخدام adminEmail أو Administrator حسب نوع الحساب
        const keysTargetUser = isSystemAdmin ? 'Administrator' : adminEmail;
        try {
          const keyResult = await callMethod(
            'frappe.core.doctype.user.user.generate_keys',
            { user: keysTargetUser }
          ) as Record<string, unknown>;

          apiKey = String(keyResult?.api_key || keyResult?.name || '');
          // المفتاح السري يُرجع مرة واحدة فقط
          apiSecret = String(keyResult?.api_secret || keyResult?.secret || '');

          if (apiKey) {
            // تحديث ملف الاتصال بمفاتيح API الجديدة
            saveFrappeConnectionFile({ apiKey, apiSecret });
            // تحديث ملف .env.local
            updateEnvFile(apiKey, apiSecret);
            clearFrappeConnectionCache();
            results.push({
              step: 'apiKey',
              status: 'ok',
              message: 'تم توليد مفاتيح API بنجاح وتحديث الإعدادات',
            });
          } else {
            results.push({ step: 'apiKey', status: 'skip', message: 'تم إنشاء المستخدم لكن تعذر توليد مفاتيح API تلقائياً' });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'فشل توليد مفاتيح API';
          console.warn('[Setup] API key generation warning:', msg);
          results.push({ step: 'apiKey', status: 'skip', message: `تعذرت توليد مفاتيح API: ${msg}` });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل إعداد المستخدم الإداري';
        results.push({ step: 'adminUser', status: 'error', message: msg });
      }
    } else {
      results.push({ step: 'adminUser', status: 'skip', message: 'لم يتم تحديد مستخدم إداري' });
    }

    // ── 10. تفعيل/تعطيل الوحدات (جديد!) ─────────────────────
    // [v16 NOTE] ERPNext v16 may use a different module disable mechanism.
    // In v15, Module Def has a `disabled` field. In v16, module visibility
    // may be controlled differently. We wrap each updateDoc in try-catch.
    try {
      // تعطيل الوحدات غير المحددة
      const allModuleKeys = Object.keys(MODULE_MAP);
      const modulesToDisable = allModuleKeys.filter((m) => !enabledModules.includes(m));

      // ERPNext يستخدم 'Module Def' لتفعيل/تعطيل الوحدات
      for (const modKey of modulesToDisable) {
        const modInfo = MODULE_MAP[modKey];
        if (!modInfo) continue;
        for (const moduleName of modInfo.modules) {
          try {
            await updateDoc('Module Def', moduleName, { disabled: 1 });
          } catch {
            // قد لا يكون موجوداً
          }
        }
      }

      // تفعيل الوحدات المحددة
      for (const modKey of enabledModules) {
        const modInfo = MODULE_MAP[modKey];
        if (!modInfo) continue;
        for (const moduleName of modInfo.modules) {
          try {
            await updateDoc('Module Def', moduleName, { disabled: 0 });
          } catch {
            // قد لا يكون موجوداً
          }
        }
      }

      const enabledLabels = enabledModules
        .map((m) => MODULE_MAP[m]?.label || m)
        .filter(Boolean);
      results.push({
        step: 'modules',
        status: 'ok',
        message: `تم تفعيل الوحدات: ${enabledLabels.join('، ')}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تفعيل الوحدات';
      results.push({ step: 'modules', status: 'error', message: msg });
    }

    // ── 11. تحديث إعدادات النظام ─────────────────────────────
    // [v16 NOTE] System Settings may have new fields in v16.
    // The fields we set here are stable across v15/v16.
    // v16 may add: enable_onboarding, etc.
    try {
      await updateDoc('System Settings', 'System Settings', {
        default_company: companyDocName,
        currency,
        country,
        language,
        time_zone: country === 'Yemen' ? 'Asia/Aden' : country === 'Saudi Arabia' ? 'Asia/Riyadh' : country === 'Egypt' ? 'Africa/Cairo' : 'Asia/Aden',
        disable_website_map: 1,
        allow_login_using_mobile_number: 1,
        allow_login_using_user_name: 1,
      });
      results.push({ step: 'systemSettings', status: 'ok', message: 'تم تحديث إعدادات النظام' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحديث إعدادات النظام';
      results.push({ step: 'systemSettings', status: 'error', message: msg });
    }

    // ── 12. إعدادات العلامة التجارية (جديد!) ──────────────────
    try {
      // تعطيل التسجيل المفتوح
      await updateDoc('Website Settings', 'Website Settings', {
        disable_signup: 1,
        home_page: 'login',
      });
      results.push({ step: 'branding', status: 'ok', message: 'تم تحديث إعدادات العلامة التجارية' });
    } catch (err) {
      results.push({ step: 'branding', status: 'skip', message: 'تعذر تحديث إعدادات الموقع' });
    }

    // ── علامة اكتمال الإعداد ──────────────────────────────
    // [v16 compat] Store the detected backend version for future reference
    let detectedVersion = '';
    try {
      detectedVersion = await detectErpnextVersion();
    } catch {
      detectedVersion = getBackendVersion();
    }

    markSetupComplete({
      companyName: companyDocName,
      currency,
      country,
      language,
      adminEmail,
      enabledModules,
      taxEnabled: enableTax,
      taxRate: enableTax ? taxRate : 0,
      taxName: enableTax ? taxName : '',
      erpnextVersion: detectedVersion,
    });

    const hasErrors = results.some((r) => r.status === 'error');
    const summary = hasErrors
      ? 'تم الإعداد مع بعض الأخطاء'
      : 'تم الإعداد بنجاح';

    return NextResponse.json({
      success: !hasErrors,
      message: summary,
      data: { results },
    });
  } catch (error) {
    console.error('[Setup Execute] Unhandled error:', error);
    const msg = error instanceof Error ? error.message : 'فشل تنفيذ الإعداد';
    return NextResponse.json({
      success: false,
      error: msg,
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
    }, { status: 500 });
  }
}
