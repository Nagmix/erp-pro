import { NextResponse } from 'next/server';
import { loadFrappeConnectionFile } from '@/lib/server/frappe-connection-store';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';

/**
 * GET /api/setup/installed-apps
 * يرجع قائمة التطبيقات المثبتة على خادم ERPNext
 * يُستخدم لفحص توفر التطبيقات المطلوبة للوحدات (مثل HRMS لوحدة HR)
 */
export async function GET() {
  try {
    const conn = loadFrappeConnectionFile();
    if (!conn?.backendHost) {
      return NextResponse.json({ success: false, installedApps: [], error: 'لم يتم ربط الخادم بعد' });
    }

    // تسجيل الدخول للحصول على SID
    let sid = '';
    try {
      const loginRes = await fetch(`${conn.backendHost}/api/method/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ usr: conn.adminUser, pwd: conn.adminPassword }),
      });
      const setCookie = loginRes.headers.get('set-cookie');
      const extractedSid = setCookie?.match(/sid=([^;]+)/)?.[1];
      if (!loginRes.ok || !extractedSid) {
        return NextResponse.json({ success: false, installedApps: [], error: 'فشل تسجيل الدخول' });
      }
      sid = extractedSid;
    } catch {
      return NextResponse.json({ success: false, installedApps: [], error: 'تعذر الاتصال بالخادم' });
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      Cookie: `sid=${sid}`,
    };

    const installedApps = await fetchInstalledApps(conn.backendHost, headers);

    return NextResponse.json({
      success: true,
      installedApps,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل جلب التطبيقات المثبتة';
    return NextResponse.json({ success: false, installedApps: [], error: msg });
  }
}

/**
 * جلب التطبيقات المثبتة من ERPNext بطريقة موثوقة
 */
async function fetchInstalledApps(host: string, headers: Record<string, string>): Promise<string[]> {
  const apps: string[] = [];

  // ─── الطريقة 1: جلب Installed Applications (Single DocType) ───
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
          installed_applications?: { app_name?: string }[];
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
        if (apps.length > 0) return apps;
      }
    }
  } catch {
    // تجاهل
  }

  // ─── الطريقة 2: جلب كل سجل Installed Application فردي ───
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
            { method: 'GET', headers, signal: AbortSignal.timeout(5000) }
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
      if (apps.length > 0) return apps;
    }
  } catch {
    // تجاهل
  }

  // ─── الطريقة 3: فحص وحدات ERPNext ───
  try {
    let hasErpnext = false;
    let hasHrms = false;

    for (const moduleName of ['Accounts', 'Selling', 'Buying', 'Stock']) {
      try {
        const modRes = await fetch(
          `${host}/api/resource/Module Def/${encodeURIComponent(moduleName)}`,
          { method: 'GET', headers, signal: AbortSignal.timeout(5000) }
        );
        if (modRes.ok) { hasErpnext = true; break; }
      } catch { /* تجاهل */ }
    }

    try {
      const hrRes = await fetch(
        `${host}/api/resource/Module Def/HR`,
        { method: 'GET', headers, signal: AbortSignal.timeout(5000) }
      );
      if (hrRes.ok) hasHrms = true;
    } catch { /* تجاهل */ }

    if (hasErpnext) apps.push('erpnext');
    if (hasHrms) apps.push('hrms');
    if (apps.length > 0) return apps;
  } catch {
    // تجاهل
  }

  // ─── طريقة أخيرة ───
  apps.push('erpnext');
  return apps;
}
