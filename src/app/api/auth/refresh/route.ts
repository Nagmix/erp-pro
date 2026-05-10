import { NextRequest, NextResponse } from 'next/server';
import { signErpSessionToken, verifyErpSessionToken } from '@/lib/server/jwt-session';
import { applyCsrfCookie, generateCsrfToken } from '@/lib/auth/csrf';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


function ttlSecFromPayload(sk?: 's' | 'l'): number {
  const longDays = Math.min(90, Math.max(7, parseInt(process.env.AUTH_REMEMBER_ME_DAYS || '30', 10)));
  const shortHours = Math.min(72, Math.max(1, parseInt(process.env.AUTH_SESSION_HOURS || '12', 10)));
  if (sk === 'l') return longDays * 24 * 3600;
  return shortHours * 3600;
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const cookieToken = request.cookies.get('erp_session')?.value;
  const raw = (auth?.replace('Bearer ', '') || cookieToken)?.trim();
  if (!raw) {
    return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
  }

  const payload = verifyErpSessionToken(raw);
  if (!payload) {
    return NextResponse.json({ success: false, error: 'جلسة غير صالحة' }, { status: 401 });
  }

  const ttl = ttlSecFromPayload(payload.sk);
  const expSec = Math.floor(Date.now() / 1000) + ttl;
  const token = signErpSessionToken({
    sid: payload.sid,
    userId: payload.userId,
    fullName: payload.fullName,
    email: payload.email,
    roles: payload.roles,
    exp: expSec,
    sk: payload.sk,
  });

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
