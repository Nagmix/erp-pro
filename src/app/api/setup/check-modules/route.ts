import { NextRequest, NextResponse } from 'next/server';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';

/** خريطة الوحدات من معرّف ERP Pro إلى وحدات ERPNext */
const MODULE_MAP: Record<string, { label: string; description: string; modules: string[]; requiredApps: string[] }> = {
  accounting: { label: 'المحاسبة والمالية', description: 'الفواتير، القيود، التقارير المالية، المدفوعات', modules: ['Accounts'], requiredApps: ['erpnext'] },
  sales: { label: 'المبيعات', description: 'عروض الأسعار، أوامر البيع، فواتير المبيعات', modules: ['Selling'], requiredApps: ['erpnext'] },
  purchases: { label: 'المشتريات', description: 'طلبات الشراء، فواتير المشتريات، الموردون', modules: ['Buying'], requiredApps: ['erpnext'] },
  inventory: { label: 'المخزون', description: 'إدارة المخزون، حركات المخزون، الجرد', modules: ['Stock'], requiredApps: ['erpnext'] },
  hr: { label: 'الموارد البشرية', description: 'الموظفون، الإجازات، الرواتب، الحضور', modules: ['HR'], requiredApps: ['hrms'] },
  crm: { label: 'إدارة العملاء', description: 'العملاء المحتملون، الفرص، الاتصالات', modules: ['CRM'], requiredApps: ['erpnext'] },
  manufacturing: { label: 'التصنيع', description: 'أوامر العمل، قوائم المواد، محطات العمل', modules: ['Manufacturing'], requiredApps: ['erpnext'] },
  projects: { label: 'المشاريع', description: 'إدارة المشاريع، المهام، الجداول الزمنية', modules: ['Projects'], requiredApps: ['erpnext'] },
};

/**
 * جلب التطبيقات المثبتة من ERPNext بطريقة موثوقة
 * يستخدم Installed Applications (Single DocType) الذي يرجع app_name بشكل صحيح
 * بدلاً من Installed Application (Child Table) الذي لا يرجع app_name في list queries
 */
async function fetchInstalledApps(host: string, headers: Record<string, string>): Promise<string[]> {
  const apps: string[] = [];

  // ─── الطريقة 1: جلب Installed Applications (Single DocType) ───
  // هذه الطريقة الأكثر موثوقية لأنها ترجع app_name في child table
  try {
    const appsRes = await fetch(
      `${host}/api/method/frappe.client.get`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctype: 'Installed Applications',
          name: 'Installed Applications',
        }),
        signal: AbortSignal.timeout(10000),
      }
    );
    if (appsRes.ok) {
      const appsData = await appsRes.json() as {
        message?: {
          installed_applications?: { app_name?: string; app_version?: string }[];
        };
      };
      const installedList = appsData.message?.installed_applications;
      if (Array.isArray(installedList) && installedList.length > 0) {
        for (const app of installedList) {
          const appName = app.app_name;
          if (appName && typeof appName === 'string' && appName.trim()) {
            apps.push(appName.trim());
          }
        }
        if (apps.length > 0) {
          return apps;
        }
      }
    }
  } catch {
    // تجاهل - نجرب الطريقة التالية
  }

  // ─── الطريقة 2: جلب كل سجل Installed Application فردي ───
  // أولاً نحصل على أسماء السجلات، ثم نقرأ كل واحد
  try {
    const listRes = await fetch(
      `${host}/api/resource/Installed Application?fields=["name"]&limit_page_length=50`,
      {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000),
      }
    );
    if (listRes.ok) {
      const listData = await listRes.json() as { data?: { name: string }[] };
      const records = listData.data || [];
      for (const rec of records) {
        try {
          const detailRes = await fetch(
            `${host}/api/resource/Installed Application/${encodeURIComponent(rec.name)}`,
            {
              method: 'GET',
              headers,
              signal: AbortSignal.timeout(5000),
            }
          );
          if (detailRes.ok) {
            const detailData = await detailRes.json() as { data?: { app_name?: string } };
            const appName = detailData.data?.app_name;
            if (appName && typeof appName === 'string' && appName.trim()) {
              apps.push(appName.trim());
            }
          }
        } catch {
          // تجاهل خطأ السجل الفردي
        }
      }
      if (apps.length > 0) {
        return apps;
      }
    }
  } catch {
    // تجاهل
  }

  // ─── الطريقة 3: فحص وحدات ERPNext لمعرفة التطبيقات المثبتة ───
  // إذا وحدة HR موجودة → hrms مثبت
  // إذا وحدات Accounts/Selling/... موجودة → erpnext مثبت
  try {
    let hasErpnext = false;
    let hasHrms = false;

    // فحص وجود وحدات ERPNext
    for (const moduleName of ['Accounts', 'Selling', 'Buying', 'Stock']) {
      try {
        const modRes = await fetch(
          `${host}/api/resource/Module Def/${encodeURIComponent(moduleName)}`,
          {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(5000),
          }
        );
        if (modRes.ok) {
          hasErpnext = true;
          break;
        }
      } catch {
        // تجاهل
      }
    }

    // فحص وجود وحدة HR (تدل على HRMS مثبت)
    try {
      const hrRes = await fetch(
        `${host}/api/resource/Module Def/HR`,
        {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(5000),
        }
      );
      if (hrRes.ok) {
        hasHrms = true;
      }
    } catch {
      // تجاهل
    }

    if (hasErpnext) apps.push('erpnext');
    if (hasHrms) apps.push('hrms');
    if (apps.length > 0) {
      return apps;
    }
  } catch {
    // تجاهل
  }

  // ─── طريقة أخيرة: إذا سجلنا الدخول بنجاح، نفترض erpnext مثبت ───
  apps.push('erpnext');
  return apps;
}

/**
 * فحص حالة الوحدة (مفعلة/معطلة) من Module Def
 */
async function fetchModuleStatus(host: string, headers: Record<string, string>): Promise<Map<string, boolean>> {
  const moduleStatusMap = new Map<string, boolean>();

  try {
    const modulesRes = await fetch(
      `${host}/api/resource/Module Def?fields=["name","disabled"]&limit_page_length=100`,
      {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000),
      }
    );
    if (modulesRes.ok) {
      const modulesData = await modulesRes.json() as { data?: { name: string; disabled: number | boolean }[] };
      const moduleDefs = modulesData.data || [];
      for (const m of moduleDefs) {
        const isDisabled = m.disabled === 1 || m.disabled === true;
        moduleStatusMap.set(m.name, !isDisabled);
      }
    }
  } catch {
    // تجاهل
  }

  // إذا لم نحصل على أي وحدات، نفحص كل وحدة فردية
  if (moduleStatusMap.size === 0) {
    const allModules = Object.values(MODULE_MAP).flatMap((info) => info.modules);
    for (const moduleName of allModules) {
      try {
        const modRes = await fetch(
          `${host}/api/resource/Module Def/${encodeURIComponent(moduleName)}`,
          {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(5000),
          }
        );
        if (modRes.ok) {
          const modData = await modRes.json() as { data?: { disabled?: number | boolean } };
          const isDisabled = modData.data?.disabled === 1 || modData.data?.disabled === true;
          moduleStatusMap.set(moduleName, !isDisabled);
        } else {
          // الوحدة غير موجودة → التطبيق غير مثبت
          moduleStatusMap.set(moduleName, false);
        }
      } catch {
        moduleStatusMap.set(moduleName, false);
      }
    }
  }

  return moduleStatusMap;
}

/**
 * مقارنة آمنة لاسم التطبيق (غير حساسة للحالة)
 */
function isAppMatch(installedApp: unknown, requiredApp: string): boolean {
  if (typeof installedApp !== 'string' || !installedApp) return false;
  return installedApp.toLowerCase().includes(requiredApp.toLowerCase());
}

/**
 * POST /api/setup/check-modules
 * يفحص الوحدات المثبتة والمفعلة على خادم ERPNext
 * يُستخدم عند ربط خادم موجود لمعرفة الوحدات المتاحة
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const host = String(body.host || '').trim().replace(/\/$/, '');
    const adminUser = String(body.admin_user || 'Administrator').trim();
    const adminPassword = String(body.admin_password || '');

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

    const headers: Record<string, string> = {
      Accept: 'application/json',
      Cookie: `sid=${sid}`,
    };

    // 2. جلب حالة الوحدات (Module Def) من ERPNext
    const moduleStatusMap = await fetchModuleStatus(host, headers);

    // 3. جلب التطبيقات المثبتة بطريقة موثوقة
    const installedApps = await fetchInstalledApps(host, headers);

    // 4. تحليل حالة كل وحدة
    const moduleStatus = Object.entries(MODULE_MAP).map(([id, info]) => {
      // فحص هل الوحدة مفعلة (غير معطلة في Module Def)
      let moduleEnabled = false;
      let moduleExists = false;
      for (const moduleName of info.modules) {
        if (moduleStatusMap.has(moduleName)) {
          moduleExists = true;
          moduleEnabled = moduleStatusMap.get(moduleName) === true;
        } else {
          // إذا Module Def غير موجود → التطبيق غير مثبت
          moduleExists = false;
          moduleEnabled = false;
        }
      }

      // فحص هل جميع التطبيقات المطلوبة مثبتة
      const appInstalled = info.requiredApps.every((app) =>
        installedApps.some((ia) => isAppMatch(ia, app))
      );

      // الوحدات التي تتطلب تطبيقات غير مثبتة
      const missingApps = info.requiredApps.filter(
        (app) => !installedApps.some((ia) => isAppMatch(ia, app))
      );

      // لا يمكن التفعيل إذا التطبيق غير مثبت
      const canToggle = appInstalled;

      return {
        id,
        label: info.label,
        description: info.description,
        enabled: moduleEnabled && moduleExists,
        appInstalled,
        canToggle,
        missingApps,
        moduleExists,
      };
    });

    return NextResponse.json({
      success: true,
      modules: moduleStatus,
      installedApps,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل فحص الوحدات';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
