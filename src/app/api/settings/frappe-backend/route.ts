import { NextRequest, NextResponse } from 'next/server';
import { verifyErpSessionToken } from '@/lib/server/jwt-session';
import { isBackendAvailable } from '@/lib/server/backend';
import {
  clearFrappeConnectionCache,
  getResolvedBackendHost,
  loadFrappeConnectionFile,
  saveFrappeConnectionFile,
  usesFrappeTokenAuth,
} from '@/lib/server/frappe-connection-store';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


function parseKeysFromMessage(msg: unknown): { key: string; secret: string } | null {
  if (msg == null) return null;
  if (Array.isArray(msg) && msg.length >= 2) {
    const k = msg[0];
    const s = msg[1];
    if (typeof k === 'string' && typeof s === 'string') return { key: k, secret: s };
  }
  if (typeof msg === 'object') {
    const o = msg as Record<string, unknown>;
    const k = o.api_key ?? o.apiKey;
    const s = o.api_secret ?? o.apiSecret;
    if (typeof k === 'string' && typeof s === 'string') return { key: k, secret: s };
  }
  return null;
}

function canWrite(request: NextRequest): boolean {
  const secret = process.env.FRAPPE_BACKEND_SETUP_SECRET?.trim();
  if (secret && request.headers.get('x-frappe-setup-secret') === secret) return true;
  const raw = request.cookies.get('erp_session')?.value?.trim();
  const p = raw ? verifyErpSessionToken(raw) : null;
  return Boolean(p?.roles?.includes('System Manager'));
}

async function frappeLogin(
  host: string,
  usr: string,
  pwd: string
): Promise<{ sid: string } | { error: string }> {
  const base = host.replace(/\/$/, '');
  const res = await fetch(`${base}/api/method/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ usr, pwd }),
  });
  const setCookie = res.headers.get('set-cookie');
  const sid = setCookie?.match(/sid=([^;]+)/)?.[1];
  if (!res.ok || !sid) {
    const j = (await res.json().catch(() => ({}))) as { message?: string };
    return { error: typeof j.message === 'string' ? j.message : 'فشل تسجيل الدخول في الخادم' };
  }
  return { sid };
}

async function frappeGenerateKeys(
  host: string,
  sid: string,
  user: string
): Promise<{ key: string; secret: string } | { error: string }> {
  const base = host.replace(/\/$/, '');
  const res = await fetch(
    `${base}/api/method/frappe.core.doctype.user.user.generate_keys`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Cookie: `sid=${sid}`,
      },
      body: JSON.stringify({ user }),
    }
  );
  const j = (await res.json().catch(() => ({}))) as { message?: unknown; exc?: string };
  if (!res.ok) {
    const msg =
      typeof j.message === 'string'
        ? j.message
        : typeof j.exc === 'string'
          ? 'خطأ من الخادم'
          : 'فشل توليد المفاتيح';
    return { error: msg };
  }
  const pair = parseKeysFromMessage(j.message);
  if (!pair) return { error: 'استجابة غير متوقعة من generate_keys' };
  return pair;
}

/** قراءة حالة الربط (بدون كشف الأسرار). */
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('refresh') === '1') {
    clearFrappeConnectionCache();
  }
  const host = getResolvedBackendHost();
  const ping = await isBackendAvailable();
  const file = loadFrappeConnectionFile();
  return NextResponse.json({
    success: true,
    data: {
      backendHost: host,
      ping,
      hasApiToken: usesFrappeTokenAuth(),
      hasLocalFile: Boolean(file.apiKey && file.apiSecret),
    },
  });
}

type PostBody =
  | {
      action: 'save';
      backendHost?: string;
      apiKey?: string;
      apiSecret?: string;
    }
  | {
      action: 'bootstrap';
      backendHost: string;
      adminUser: string;
      adminPassword: string;
      /** مستخدم النظام الذي تُولَّد له المفاتيح (افتراضي Administrator) */
      frappeUser?: string;
    };

export async function POST(request: NextRequest) {
  if (!canWrite(request)) {
    return NextResponse.json(
      { success: false, error: 'غير مصرح: مطلوب صلاحية مدير النظام أو رأس تهيئة سري صحيح' },
      { status: 403 }
    );
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ success: false, error: 'JSON غير صالح' }, { status: 400 });
  }

  if (body.action === 'save') {
    saveFrappeConnectionFile({
      backendHost: body.backendHost?.trim() || undefined,
      apiKey: body.apiKey?.trim() || undefined,
      apiSecret: body.apiSecret?.trim() || undefined,
    });
    clearFrappeConnectionCache();
    const ping = await isBackendAvailable();
    return NextResponse.json({ success: true, data: { ping } });
  }

  if (body.action === 'bootstrap') {
    const host = body.backendHost.trim().replace(/\/$/, '');
    const adminUser = body.adminUser.trim();
    const adminPassword = body.adminPassword;
    const frappeUser = (body.frappeUser || 'Administrator').trim();

    const login = await frappeLogin(host, adminUser, adminPassword);
    if ('error' in login) {
      return NextResponse.json({ success: false, error: login.error }, { status: 400 });
    }

    const keys = await frappeGenerateKeys(host, login.sid, frappeUser);
    if ('error' in keys) {
      return NextResponse.json({ success: false, error: keys.error }, { status: 400 });
    }

    saveFrappeConnectionFile({
      backendHost: host,
      apiKey: keys.key,
      apiSecret: keys.secret,
    });
    clearFrappeConnectionCache();
    const ping = await isBackendAvailable();
    return NextResponse.json({
      success: true,
      data: {
        ping,
        message:
          'تم حفظ عنوان الخادم ومفاتيح الواجهة البرمجية بنجاح. أعد تشغيل التطبيق إن لزم الأمر.',
      },
    });
  }

  return NextResponse.json({ success: false, error: 'action غير معروف' }, { status: 400 });
}
