import { NextRequest, NextResponse } from 'next/server';
import { verifyErpSessionToken, frappeSidFromPayload } from '@/lib/server/jwt-session';
import { logoutErpSession } from '@/lib/server/backend';
import { revokeJti } from '@/lib/server/token-revocation';
import { CSRF_COOKIE } from '@/lib/auth/csrf-constants';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  const raw = request.cookies.get('erp_session')?.value?.trim();
  if (raw) {
    const payload = verifyErpSessionToken(raw);
    const sid = frappeSidFromPayload(payload);
    if (sid) await logoutErpSession(sid);
    // MED-04: إبطال توكن ERP Pro نفسه (JWT يبقى مشروطاً حتى exp — يُسجل في قائمة الإبطال)
    if (payload?.jti) {
      await revokeJti(payload.jti, Math.max(0, payload.exp - Math.floor(Date.now() / 1000)));
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('erp_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  response.cookies.set(CSRF_COOKIE, '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
