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
    let moduleDefs: { name: string; disabled: number }[] = [];
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
        const modulesData = await modulesRes.json() as { data?: { name: string; disabled: number }[] };
        moduleDefs = modulesData.data || [];
      }
    } catch {
      // فشل جلب الوحدات
    }

    // 3. جلب التطبيقات المثبتة
    let installedApps: string[] = [];

    // الطريقة 1: جلب من Installed Application doctype
    try {
      const appsRes = await fetch(
        `${host}/api/resource/Installed Application?fields=["app_name"]&limit_page_length=50`,
        {
          method: 'GET',
          headers,
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

    // طريقة بديلة: استخدام frappe.client.get_list
    if (installedApps.length === 0) {
      try {
        const appsRes = await fetch(
          `${host}/api/method/frappe.client.get_list`,
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              doctype: 'Installed Application',
              fields: ['app_name'],
              limit_page_length: 50,
            }),
            signal: AbortSignal.timeout(10000),
          }
        );
        if (appsRes.ok) {
          const appsData = await appsRes.json() as { message?: { app_name: string }[] };
          if (Array.isArray(appsData.message)) {
            installedApps = appsData.message.map((a: { app_name: string }) => a.app_name);
          }
        }
      } catch {
        // تجاهل
      }
    }

    // طريقة أخيرة: إذا لم نتمكن من جلب التطبيقات، نفترض أن erpnext مثبت لأننا سجلنا الدخول بنجاح
    if (installedApps.length === 0) {
      installedApps = ['erpnext'];
    }

    // 4. تحليل حالة كل وحدة
    const moduleStatus = Object.entries(MODULE_MAP).map(([id, info]) => {
      // فحص هل الوحدة مفعلة (غير معطلة في Module Def)
      let moduleEnabled = false;
      for (const moduleName of info.modules) {
        const moduleDef = moduleDefs.find((m) => m.name === moduleName);
        if (moduleDef) {
          // إذا Module Def موجود وغير معطل → مفعّل
          moduleEnabled = moduleDef.disabled !== 1;
        } else {
          // إذا Module Def غير موجود → نفترض أنه مفعّل (ERPNext الافتراضي)
          moduleEnabled = true;
        }
      }

      // فحص هل جميع التطبيقات المطلوبة مثبتة
      const appInstalled = info.requiredApps.every((app) =>
        installedApps.some((ia) => ia.toLowerCase().includes(app.toLowerCase()))
      );

      // الوحدات التي تتطلب تطبيقات غير مثبتة
      const missingApps = info.requiredApps.filter(
        (app) => !installedApps.some((ia) => ia.toLowerCase().includes(app.toLowerCase()))
      );

      return {
        id,
        label: info.label,
        description: info.description,
        enabled: moduleEnabled,
        appInstalled,
        canToggle: true, // يمكن دائماً تبديل الحالة (تفعيل/تعطيل)
        missingApps,
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
