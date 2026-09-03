import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateUser,
  loadUserProfileFromErpSession,
} from '@/lib/server/backend';
import { signErpSessionToken } from '@/lib/server/jwt-session';
import { isLoginRateLimited } from '@/lib/server/login-rate-limit';
import { applyCsrfCookie, generateCsrfToken } from '@/lib/auth/csrf';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


/* ------------------------------------------------------------------
 * Demo accounts — ONLY available when DEMO_MODE is explicitly enabled
 * or when no ERPNext backend is configured (ERPNEXT_TRY_LOGIN not set).
 * These must NEVER be accessible in a production deployment.
 * ------------------------------------------------------------------ */
const DEMO_ACCOUNTS: Record<string, { password: string; name: string; email: string; roles: string[] }> = {
  admin: {
    password: 'admin',
    name: 'مدير النظام',
    email: 'admin@erp-pro.com',
    roles: ['System Manager', 'Accounts Manager', 'Sales Manager', 'HR Manager'],
  },
  accountant: {
    password: 'accountant',
    name: 'المحاسب',
    email: 'accountant@erp-pro.com',
    roles: ['Accounts Manager', 'Accounts User'],
  },
  sales: {
    password: 'sales',
    name: 'مدير المبيعات',
    email: 'sales@erp-pro.com',
    roles: ['Sales Manager', 'Sales User'],
  },
  hr: {
    password: 'hr',
    name: 'مدير الموارد البشرية',
    email: 'hr@erp-pro.com',
    roles: ['HR Manager', 'HR User'],
  },
};

/**
 * SEC-06: نمط الديمو فعال فقط بشرطين معاً (fail-closed):
 *  1) DEMO_MODE=true صراحةً، و
 *  2) البيئة ليست إنتاج (NODE_ENV !== 'production').
 *
 * قبل الإصلاح كان غياب ERPNEXT_TRY_LOGIN يُفعّل الديمو تلقائياً —
 * أي نشر منسي الإعداد كان يمنح حساب admin/admin للعامة.
 */
function isDemoModeActive(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.DEMO_MODE === 'true';
}

function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

function sessionTtlSec(rememberMe: boolean): number {
  const longDays = Math.min(90, Math.max(7, parseInt(process.env.AUTH_REMEMBER_ME_DAYS || '30', 10)));
  const shortHours = Math.min(72, Math.max(1, parseInt(process.env.AUTH_SESSION_HOURS || '12', 10)));
  return rememberMe ? longDays * 24 * 3600 : shortHours * 3600;
}

function passwordPolicyOk(password: string): { ok: boolean; message?: string } {
  const min = parseInt(process.env.AUTH_PASSWORD_MIN_LENGTH || '0', 10);
  if (min > 0 && password.length < min) {
    return { ok: false, message: `كلمة المرور يجب أن لا تقل عن ${min} أحرف` };
  }
  return { ok: true };
}

function buildAuthResponse(
  token: string,
  user: { id: string; name: string; fullName: string; email: string; roles: string[] },
  maxAgeSec: number
): NextResponse {
  const response = NextResponse.json({
    success: true,
    data: { token, user },
  });
  response.cookies.set('erp_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: maxAgeSec,
    path: '/',
  });
  applyCsrfCookie(response, generateCsrfToken(), maxAgeSec);
  return response;
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (isLoginRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: 'عدد كبير من المحاولات. حاول لاحقاً.' },
      { status: 429 }
    );
  }

  let body: { username?: string; password?: string; rememberMe?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const { username, password, rememberMe } = body;
  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: 'اسم المستخدم وكلمة المرور مطلوبان' },
      { status: 400 }
    );
  }

  const policy = passwordPolicyOk(password);
  if (!policy.ok) {
    return NextResponse.json({ success: false, error: policy.message }, { status: 400 });
  }

  const ttlSec = sessionTtlSec(rememberMe === true);
  const expSec = Math.floor(Date.now() / 1000) + ttlSec;
  const sk: 's' | 'l' = rememberMe === true ? 'l' : 's';

  const demoMode = isDemoModeActive();
  const tryErp = process.env.ERPNEXT_TRY_LOGIN === 'true';

  /* -------- Production auth flow: ERPNext backend -------- */
  if (tryErp) {
    const erp = await authenticateUser(username, password);
    if (erp.success && erp.session && erp.user) {
      let roles = erp.user.roles;
      let fullName = erp.user.fullName;
      let email = erp.user.email;
      if (erp.session) {
        const profile = await loadUserProfileFromErpSession(erp.session, erp.user.id);
        if (profile.roles.length > 0) roles = profile.roles;
        fullName = profile.fullName;
        email = profile.email;
      }

      const token = signErpSessionToken({
        sid: erp.session,
        userId: erp.user.id,
        fullName,
        email,
        roles,
        exp: expSec,
        sk,
      });
      return buildAuthResponse(
        token,
        {
          id: erp.user.id,
          name: erp.user.name,
          fullName,
          email,
          roles,
        },
        ttlSec
      );
    }

    // SEC-06: فشل دخول ERPNext = رفض. لا سقوط إلى حسابات الديمو في الإنتاج.
    // (كان الفشل يسقط للديمو عند تفعيله — الآن مسار الديمو منفصل تماماً أدناه)
    return NextResponse.json(
      { success: false, error: 'بيانات الدخول غير صحيحة.' },
      { status: 401 }
    );
  }

  /* -------- Demo auth flow: no ERPNext backend -------- */
  if (demoMode) {
    const demoAccount = DEMO_ACCOUNTS[username];
    if (demoAccount && demoAccount.password === password) {
      const token = signErpSessionToken({
        userId: username,
        fullName: demoAccount.name,
        email: demoAccount.email,
        roles: demoAccount.roles,
        exp: expSec,
        sk,
      });
      return buildAuthResponse(
        token,
        {
          id: username,
          name: demoAccount.name,
          fullName: demoAccount.name,
          email: demoAccount.email,
          roles: demoAccount.roles,
        },
        ttlSec
      );
    }

    return NextResponse.json(
      { success: false, error: 'بيانات الدخول غير صحيحة' },
      { status: 401 }
    );
  }

  /* -------- No auth method available (misconfigured) -------- */
  return NextResponse.json(
    { success: false, error: 'بيانات الدخول غير صحيحة.' },
    { status: 401 }
  );
}
