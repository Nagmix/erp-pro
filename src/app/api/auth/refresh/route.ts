import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { signErpSessionToken, verifyErpSessionToken } from '@/lib/server/jwt-session';
import { applyCsrfCookie, generateCsrfToken } from '@/lib/auth/csrf';
import { callMethod } from '@/lib/server/backend';
import { isJtiRevoked, revokeJti } from '@/lib/server/token-revocation';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


function ttlSecFromPayload(sk?: 's' | 'l'): number {
  const longDays = Math.min(90, Math.max(7, parseInt(process.env.AUTH_REMEMBER_ME_DAYS || '30', 10)));
  const shortHours = Math.min(72, Math.max(1, parseInt(process.env.AUTH_SESSION_HOURS || '12', 10)));
  if (sk === 'l') return longDays * 24 * 3600;
  return shortHours * 3600;
}

function unauthorized(error: string): NextResponse {
  return NextResponse.json({ success: false, error }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const cookieToken = request.cookies.get('erp_session')?.value;
  const raw = (auth?.replace('Bearer ', '') || cookieToken)?.trim();
  if (!raw) {
    return unauthorized('غير مصرح');
  }

  const payload = verifyErpSessionToken(raw);
  if (!payload) {
    return unauthorized('جلسة غير صالحة');
  }

  // MED-04: توكن سبق إبطاله (logout أو تدوير refresh سابق) = رفض فوري
  if (await isJtiRevoked(payload.jti)) {
    return unauthorized('تم إبطال هذه الجلسة — سجل الدخول من جديد');
  }

  // MED-04: لم يعد التجديد "إلى ما لا نهاية" — نتحقق من جلسة Frappe (sid)
  // عند كل refresh؛ إذا ماتت الجلسة في الخادم لا يُصدر توكن جديد
  if (payload.sid && payload.sid !== 'demo-session') {
    try {
      const msg = (await callMethod('frappe.auth.get_logged_user', {}, payload.sid)) as unknown;
      const serverUser =
        typeof msg === 'string' ? msg : String((msg as { message?: string })?.message ?? '');
      if (!serverUser || serverUser.toLowerCase() !== String(payload.userId).toLowerCase()) {
        return unauthorized('انتهت جلسة الخادم — سجل الدخول من جديد');
      }
    } catch {
      return unauthorized('انتهت جلسة الخادم — سجل الدخول من جديد');
    }
  }

  const ttl = ttlSecFromPayload(payload.sk);
  const expSec = Math.floor(Date.now() / 1000) + ttl;

  // MED-04: تدوير jti — التوكن القديم يُبطل فور إصدار الجديد
  const oldJti = payload.jti;
  const newJti = randomUUID();

  const token = signErpSessionToken({
    sid: payload.sid,
    userId: payload.userId,
    fullName: payload.fullName,
    email: payload.email,
    roles: payload.roles,
    exp: expSec,
    sk: payload.sk,
    jti: newJti,
  });

  if (oldJti) {
    await revokeJti(oldJti, Math.max(0, payload.exp - Math.floor(Date.now() / 1000)));
  }

  const response = NextResponse.json({
    success: true,
    data: {
      token,
      user: {
        id: payload.userId,
        name: payload.fullName,
        fullName: payload.fullName,
        email: payload.email,
        roles: payload.roles,
      },
    },
  });

  response.cookies.set('erp_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ttl,
    path: '/',
  });
  applyCsrfCookie(response, generateCsrfToken(), ttl);

  return response;
}
