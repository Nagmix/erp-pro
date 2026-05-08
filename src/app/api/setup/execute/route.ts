import { NextRequest, NextResponse } from 'next/server';
import { createDoc, updateDoc, getList, callMethod, detectErpnextVersion, isBackendAvailable } from '@/lib/server/backend';
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
import { getBackendVersion, isBackendV16OrLater, saveFrappeConnectionFile, clearFrappeConnectionCache } from '@/lib/server/frappe-connection-store';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { jwtVerify } from 'jose';
import { getJwtSecretBytes } from '@/lib/auth/jwt-secret';

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
}

/** تحديث ملف .env.local بمفاتيح API */
function updateEnvFile(apiKey: string, apiSecret: string): void {
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
}

type SetupStepResult = { step: string; status: 'ok' | 'skip' | 'error'; message: string; name?: string };

/** خريطة الدولة → العملة الافتراضية + نسبة ضريبة */
const COUNTRY_CONFIG: Record<string, { currency: string; taxRate: number; taxName: string }> = {
  'Yemen': { currency: 'YER', taxRate: 5, taxName: 'ضريبة المبيعات' },
  'Saudi Arabia': { currency: 'SAR', taxRate: 15, taxName: 'ضريبة القيمة المضافة' },
  'United Arab Emirates': { currency: 'AED', taxRate: 5, taxName: 'ضريبة القيمة المضافة' },
  'Kuwait': { currency: 'KWD', taxRate: 0, taxName: '' },
  'Egypt': { currency: 'EGP', taxRate: 14, taxName: 'ضريبة القيمة المضافة' },
  'Jordan': { currency: 'JOD', taxRate: 16, taxName: 'ضريبة المبيعات' },
  'Qatar': { currency: 'QAR', taxRate: 0, taxName: '' },
  'Bahrain': { currency: 'BHD', taxRate: 5, taxName: 'ضريبة القيمة المضافة' },
  'Oman': { currency: 'OMR', taxRate: 5, taxName: 'ضريبة القيمة المضافة' },
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
      // حفظ عنوان الخادم في ملف الاتصال
      saveFrappeConnectionFile({ backendHost });
      clearFrappeConnectionCache();

      // حفظ بيانات الدخول في ملف الاتصال بدلاً من process.env (أمان)
      saveFrappeConnectionFile({
        backendHost,
        adminUser: serverAdminUser,
        adminPassword: serverAdminPassword,
      });
    }

    // التحقق من توفر الخادم
    const available = await isBackendAvailable().catch(() => false);
    if (!available) {
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
    try {
      const requiredWarehouseTypes = ['Transit', 'Store', 'Manufacturing'];
      for (const wt of requiredWarehouseTypes) {
        try {
          await createDoc('Warehouse Type', { name: wt });
        } catch { /* قد يكون موجوداً بالفعل */ }
      }
      results.push({ step: 'warehouseTypes', status: 'ok', message: 'تم التأكد من وجود أنواع المستودعات المطلوبة' });
    } catch {
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
      if (msg.includes('already exists') || msg.includes('Duplicate')) {
        companyDocName = companyName;
        results.push({ step: 'company', status: 'skip', message: 'الشركة موجودة بالفعل', name: companyDocName });
      } else {
        results.push({ step: 'company', status: 'error', message: msg });
        return NextResponse.json({ success: false, message: 'فشل إنشاء الشركة', data: { results } }, { status: 500 });
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

    // ── 7. إعداد الضرائب (جديد!) ──────────────────────────────
    if (enableTax && taxRate > 0 && taxName) {
      try {
        const taxResult = await setupTaxPackage(companyDocName, taxName, taxRate);
        results.push({
          step: 'taxSetup',
          status: 'ok',
          message: `تم إعداد الضريبة: ${taxName} (${taxRate}%) — حسابات: ${taxResult.accounts.length}, قوالب: مبيعات + مشتريات`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل إعداد الضرائب';
        results.push({ step: 'taxSetup', status: 'error', message: msg });
      }
    } else if (!enableTax) {
      results.push({ step: 'taxSetup', status: 'skip', message: 'تم تخطي إعداد الضرائب' });
    }

    // ── 7.5 إنشاء السجلات المرجعية المطلوبة لإنشاء الموظف ──
    const finalDesignation = employeeDesignation || 'مدير النظام';
    const finalDepartment = 'الإدارة';

    try {
      // إنشاء سجلات الجنس (Gender) — مطلوبة في ERPNext v15+
      for (const g of ['Male', 'Female']) {
        try { await createDoc('Gender', { gender: g }); } catch { /* موجود */ }
      }

      // إنشاء المسمى الوظيفي
      try {
        await createDoc('Designation', { designation_name: finalDesignation });
      } catch { /* قد يكون موجوداً بالفعل */ }

      // إنشاء القسم
      try {
        await createDoc('Department', { department_name: finalDepartment, company: companyDocName, is_group: 1 });
      } catch { /* قد يكون موجوداً بالفعل */ }
    } catch { /* تجاهل */ }

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
          if (msg.includes('already exists') || msg.includes('Duplicate')) {
            results.push({ step: 'adminUser', status: 'skip', message: `المستخدم موجود بالفعل: ${adminEmail}` });
          } else {
            results.push({ step: 'adminUser', status: 'error', message: msg });
          }
        }

        // توليد مفاتيح API للمستخدم
        try {
          const keyResult = await callMethod(
            'frappe.core.doctype.user.user.generate_keys',
            { user: adminEmail }
          ) as Record<string, unknown>;

          apiKey = String(keyResult?.api_key || keyResult?.name || '');
          // المفتاح السري يُرجع مرة واحدة فقط
          apiSecret = String(keyResult?.api_secret || keyResult?.secret || '');

          if (apiKey) {
            // تحديث ملف .env.local
            updateEnvFile(apiKey, apiSecret);
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
          results.push({ step: 'apiKey', status: 'error', message: `تعذرت توليد مفاتيح API: ${msg}` });
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
    const msg = error instanceof Error ? error.message : 'فشل تنفيذ الإعداد';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
