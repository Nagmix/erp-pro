import { NextRequest, NextResponse } from 'next/server';
import {
  saveFrappeConnectionFile,
  clearFrappeConnectionCache,
} from '@/lib/server/frappe-connection-store';
import fs from 'fs';
import path from 'path';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';

/** خريطة الوحدات من معرّف ERP Pro إلى وحدات ERPNext
 *  requiredApps: التطبيقات المطلوب تثبيتها لعمل الوحدة
 *  - وحدة HR تتطلب تطبيق HRMS المنفصل (ERPNext v16+)
 */
const MODULE_MAP: Record<string, { label: string; modules: string[]; requiredApps: string[] }> = {
  accounting: { label: 'المحاسبة والمالية', modules: ['Accounts'], requiredApps: ['erpnext'] },
  sales: { label: 'المبيعات', modules: ['Selling'], requiredApps: ['erpnext'] },
  purchases: { label: 'المشتريات', modules: ['Buying'], requiredApps: ['erpnext'] },
  inventory: { label: 'المخزون', modules: ['Stock'], requiredApps: ['erpnext'] },
  hr: { label: 'الموارد البشرية', modules: ['HR'], requiredApps: ['hrms'] },
  crm: { label: 'إدارة العملاء', modules: ['CRM'], requiredApps: ['erpnext'] },
  manufacturing: { label: 'التصنيع', modules: ['Manufacturing'], requiredApps: ['erpnext'] },
  projects: { label: 'المشاريع', modules: ['Projects'], requiredApps: ['erpnext'] },
};

/** ملف علامة اكتمال الإعداد */
function setupFlagPath(): string {
  const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dir, 'app-config.json');
}

function markSetupComplete(config: Record<string, unknown>): void {
  const fp = setupFlagPath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  const existing = (() => {
    try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
    catch { return {}; }
  })();
  const merged = { ...existing, ...config, setupComplete: true, setupDate: new Date().toISOString() };
  fs.writeFileSync(fp, JSON.stringify(merged, null, 2), 'utf8');
}

/**
 * POST /api/setup/activate-modules
 * يفعّل أو يعطّل وحدات ERPNext على الخادم الخلفي
 * يُستخدم عند ربط خادم موجود بعد أن يختار المستخدم الوحدات
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const host = String(body.host || '').trim().replace(/\/$/, '');
    const adminUser = String(body.admin_user || 'Administrator').trim();
    const adminPassword = String(body.admin_password || '');
    const enabledModules = Array.isArray(body.enabled_modules)
      ? (body.enabled_modules as string[]).filter(Boolean)
      : [];
    const companyInfo = body.company_info as { name: string; abbr: string; default_currency: string; country: string } | undefined;

    if (!host) {
      return NextResponse.json(
        { success: false, error: 'عنوان الخادم مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من صحة عنوان الخادم
    try {
      new URL(host);
    } catch {
      return NextResponse.json(
        { success: false, error: 'عنوان الخادم غير صالح' },
        { status: 400 }
      );
    }

    // 1. تسجيل الدخول للحصول على SID
    let sid = '';
    let apiKey = '';
    let apiSecret = '';
    try {
      const loginRes = await fetch(`${host}/api/method/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ usr: adminUser, pwd: adminPassword }),
      });
      const setCookie = loginRes.headers.get('set-cookie');
      const extractedSid = setCookie?.match(/sid=([^;]+)/)?.[1];
      if (!loginRes.ok || !extractedSid) {
        return NextResponse.json({
          success: false,
          error: 'فشل تسجيل الدخول. تأكد من اسم المستخدم وكلمة المرور.',
        });
      }
      sid = extractedSid;
    } catch {
      return NextResponse.json({
        success: false,
        error: 'تعذر الاتصال بالخادم.',
      });
    }

    // 2. محاولة توليد مفاتيح API
    try {
      const keysRes = await fetch(
        `${host}/api/method/frappe.core.doctype.user.user.generate_keys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: `sid=${sid}`,
          },
          body: JSON.stringify({ user: adminUser }),
        }
      );
      const keysData = (await keysRes.json().catch(() => ({}))) as { message?: unknown };

      if (keysRes.ok && keysData.message) {
        const msg = keysData.message;
        if (Array.isArray(msg) && msg.length >= 2) {
          apiKey = String(msg[0] || '');
          apiSecret = String(msg[1] || '');
        } else if (typeof msg === 'object' && msg !== null) {
          const obj = msg as Record<string, unknown>;
          apiKey = String(obj.api_key || obj.apiKey || '');
          apiSecret = String(obj.api_secret || obj.apiSecret || '');
        }
      }
    } catch {
      // فشل توليد المفاتيح — ليس حرجاً
    }

    // 3. حفظ إعدادات الاتصال
    saveFrappeConnectionFile({
      backendHost: host,
      adminUser: adminUser,
      adminPassword: adminPassword,
      backendSiteName: 'erppro',
      ...(apiKey && apiSecret ? { apiKey, apiSecret } : {}),
    });
    clearFrappeConnectionCache();

    // 4. جلب التطبيقات المثبتة للتحقق من التبعيات
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Cookie: `sid=${sid}`,
      ...(apiKey && apiSecret ? { Authorization: `token ${apiKey}:${apiSecret}` } : {}),
    };

    let installedApps: string[] = [];
    try {
      const appsRes = await fetch(
        `${host}/api/resource/Installed Application?fields=["app_name"]&limit_page_length=50`,
        {
          method: 'GET',
          headers: requestHeaders,
          signal: AbortSignal.timeout(10000),
        }
      );
      if (appsRes.ok) {
        const appsData = await appsRes.json() as { data?: { app_name: string }[] };
        if (appsData.data && appsData.data.length > 0) {
          installedApps = appsData.data.map((a: { app_name: string }) => a.app_name);
        }
      }
    } catch {
      // تجاهل
    }

    // 5. تفعيل/تعطيل الوحدات على ERPNext
    const allModuleKeys = Object.keys(MODULE_MAP);
    const modulesToDisable = allModuleKeys.filter((m) => !enabledModules.includes(m));
    const modulesToEnable = allModuleKeys.filter((m) => enabledModules.includes(m));

    const results: { module: string; action: string; success: boolean; message: string }[] = [];

    // التحقق من التبعيات قبل التفعيل — وحدة HR تتطلب تطبيق HRMS
    for (const modKey of modulesToEnable) {
      const modInfo = MODULE_MAP[modKey];
      if (!modInfo) continue;
      const missingApps = modInfo.requiredApps.filter(
        (app) => !installedApps.some((ia) => ia.toLowerCase().includes(app.toLowerCase()))
      );
      if (missingApps.length > 0) {
        results.push({
          module: modKey,
          action: 'enable',
          success: false,
          message: `لا يمكن تفعيل ${modInfo.label} — التطبيق المطلوب غير مثبت: ${missingApps.join('، ')}`,
        });
      }
    }

    // تعطيل الوحدات غير المحددة
    for (const modKey of modulesToDisable) {
      const modInfo = MODULE_MAP[modKey];
      if (!modInfo) continue;
      for (const moduleName of modInfo.modules) {
        try {
          await fetch(
            `${host}/api/resource/Module Def/${encodeURIComponent(moduleName)}`,
            {
              method: 'PUT',
              headers: requestHeaders,
              body: JSON.stringify({ disabled: 1 }),
              signal: AbortSignal.timeout(8000),
            }
          );
          results.push({ module: moduleName, action: 'disable', success: true, message: `تم تعطيل ${modInfo.label}` });
        } catch {
          results.push({ module: moduleName, action: 'disable', success: false, message: `فشل تعطيل ${modInfo.label}` });
        }
      }
    }

    // تفعيل الوحدات المحددة (فقط إذا كانت التبعيات متوفرة)
    for (const modKey of modulesToEnable) {
      const modInfo = MODULE_MAP[modKey];
      if (!modInfo) continue;
      // تخطي الوحدات التي تفتقر للتطبيقات المطلوبة
      const missingApps = modInfo.requiredApps.filter(
        (app) => !installedApps.some((ia) => ia.toLowerCase().includes(app.toLowerCase()))
      );
      if (missingApps.length > 0) continue;
      for (const moduleName of modInfo.modules) {
        try {
          await fetch(
            `${host}/api/resource/Module Def/${encodeURIComponent(moduleName)}`,
            {
              method: 'PUT',
              headers: requestHeaders,
              body: JSON.stringify({ disabled: 0 }),
              signal: AbortSignal.timeout(8000),
            }
          );
          results.push({ module: moduleName, action: 'enable', success: true, message: `تم تفعيل ${modInfo.label}` });
        } catch {
          results.push({ module: moduleName, action: 'enable', success: false, message: `فشل تفعيل ${modInfo.label}` });
        }
      }
    }

    // 5. جلب بيانات الشركة إذا لم تكن موجودة
    let company = companyInfo || null;
    if (!company) {
      try {
        const companiesRes = await fetch(
          `${host}/api/resource/Company?fields=["name","abbr","default_currency","country"]&limit_page_length=10`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Cookie: `sid=${sid}`,
              ...(apiKey && apiSecret ? { Authorization: `token ${apiKey}:${apiSecret}` } : {}),
            },
            signal: AbortSignal.timeout(8000),
          }
        );
        if (companiesRes.ok) {
          const companiesData = await companiesRes.json() as { data?: { name: string; abbr: string; default_currency: string; country: string }[] };
          if (companiesData.data && companiesData.data.length > 0) {
            company = companiesData.data[0]!;
          }
        }
      } catch {
        // تجاهل
      }
    }

    // 6. وضع علامة اكتمال الإعداد
    if (company) {
      markSetupComplete({
        companyName: company.name,
        companyAbbr: company.abbr,
        currency: company.default_currency,
        country: company.country,
        linkedExisting: true,
        enabledModules,
      });
    }

    const enabledLabels = enabledModules
      .map((m) => MODULE_MAP[m]?.label || m)
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      message: `تم تفعيل الوحدات: ${enabledLabels.join('، ')}`,
      company,
      results,
      enabledModules,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تفعيل الوحدات';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
