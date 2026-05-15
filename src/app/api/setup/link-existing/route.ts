import { NextRequest, NextResponse } from 'next/server';
import {
  saveFrappeConnectionFile,
  clearFrappeConnectionCache,
} from '@/lib/server/frappe-connection-store';
import fs from 'fs';
import path from 'path';

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
  const existing = (() => {
    try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
    catch { return {}; }
  })();
  const merged = { ...existing, ...config, setupComplete: true, setupDate: new Date().toISOString() };
  fs.writeFileSync(fp, JSON.stringify(merged, null, 2), 'utf8');
}

/**
 * POST /api/setup/link-existing
 * ربط خادم ERPNext موجود يحتوي بالفعل على شركة مسجلة
 * يُستخدم عند اكتشاف شركة موجودة أثناء اختبار الاتصال
 * يحفظ إعدادات الاتصال ويضع علامة اكتمال الإعداد
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

    // 2. محاولة توليد مفاتيح API
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

    // 4. جلب بيانات الشركة الموجودة
    let companyInfo: { name: string; abbr: string; default_currency: string; country: string } | null = null;
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
          companyInfo = companiesData.data[0]!;
        }
      }
    } catch {
      // فشل جلب الشركات — ليس حرجاً
    }

    if (!companyInfo) {
      return NextResponse.json({
        success: false,
        error: 'لم يتم العثور على شركة مسجلة على الخادم.',
      });
    }

    // 5. وضع علامة اكتمال الإعداد
    markSetupComplete({
      companyName: companyInfo.name,
      companyAbbr: companyInfo.abbr,
      currency: companyInfo.default_currency,
      country: companyInfo.country,
      linkedExisting: true,
    });

    return NextResponse.json({
      success: true,
      message: 'تم ربط الخادم الموجود بنجاح',
      company: companyInfo,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل ربط الخادم الموجود';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
