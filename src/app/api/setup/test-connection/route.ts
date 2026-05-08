import { NextRequest, NextResponse } from 'next/server';
import {
  saveFrappeConnectionFile,
  clearFrappeConnectionCache,
} from '@/lib/server/frappe-connection-store';

/**
 * POST /api/setup/test-connection
 * اختبار الاتصال بخادم ERPNext — يُستخدم في معالج الإعداد الأولي فقط
 * لا يتطلب مصادقة لأنه يُنفّذ قبل إعداد النظام
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
        { success: false, error: 'عنوان الخادم غير صالح. مثال: http://192.168.1.100:8000' },
        { status: 400 }
      );
    }

    // 1. اختبار Ping
    let pingOk = false;
    try {
      const pingRes = await fetch(`${host}/api/method/ping`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      pingOk = pingRes.ok;
    } catch {
      pingOk = false;
    }

    if (!pingOk) {
      return NextResponse.json({
        success: false,
        error: 'تعذر الاتصال بالخادم. تأكد من أن العنوان صحيح وأن الخادم يعمل.',
        step: 'ping',
      });
    }

    // 2. محاولة تسجيل الدخول
    if (!adminPassword) {
      return NextResponse.json({
        success: true,
        ping: true,
        login: false,
        message: 'الخادم متاح لكن لم يتم التحقق من بيانات الدخول',
      });
    }

    let loginOk = false;
    let sid = '';
    try {
      const loginRes = await fetch(`${host}/api/method/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ usr: adminUser, pwd: adminPassword }),
      });
      const setCookie = loginRes.headers.get('set-cookie');
      const extractedSid = setCookie?.match(/sid=([^;]+)/)?.[1];
      if (loginRes.ok && extractedSid) {
        loginOk = true;
        sid = extractedSid;
      }
    } catch {
      loginOk = false;
    }

    if (!loginOk) {
      return NextResponse.json({
        success: false,
        error: 'فشل تسجيل الدخول. تأكد من اسم المستخدم وكلمة المرور.',
        step: 'login',
        ping: true,
      });
    }

    // 3. محاولة توليد مفاتيح API
    let apiKey = '';
    let apiSecret = '';
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

        if (apiKey && apiSecret) {
          saveFrappeConnectionFile({
            backendHost: host,
            apiKey,
            apiSecret,
          });
          clearFrappeConnectionCache();
        }
      }
    } catch {
      // فشل توليد المفاتيح — ليس حرجاً
    }

    // حفظ المضيف وبيانات الدخول على الأقل
    if (!apiKey || !apiSecret) {
      saveFrappeConnectionFile({ backendHost: host });
      clearFrappeConnectionCache();
      process.env.BACKEND_ADMIN_USER = adminUser;
      process.env.BACKEND_ADMIN_PASSWORD = adminPassword;
    }

    return NextResponse.json({
      success: true,
      ping: true,
      login: true,
      apiKeys: Boolean(apiKey && apiSecret),
      message: apiKey && apiSecret
        ? 'تم الاتصال بنجاح وتوليد مفاتيح الواجهة البرمجية'
        : 'تم تسجيل الدخول بنجاح. سيتم توليد مفاتيح الواجهة البرمجية أثناء الإعداد.',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل اختبار الاتصال';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
