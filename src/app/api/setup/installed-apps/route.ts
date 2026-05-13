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

    // جلب التطبيقات المثبتة
    let installedApps: string[] = [];

    try {
      const appsRes = await fetch(
        `${conn.backendHost}/api/resource/Installed Application?fields=["app_name"]&limit_page_length=50`,
        { method: 'GET', headers, signal: AbortSignal.timeout(10000) }
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

    // طريقة بديلة
    if (installedApps.length === 0) {
      try {
        const appsRes = await fetch(
          `${conn.backendHost}/api/method/frappe.client.get_list`,
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

    return NextResponse.json({
      success: true,
      installedApps,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل جلب التطبيقات المثبتة';
    return NextResponse.json({ success: false, installedApps: [], error: msg });
  }
}
