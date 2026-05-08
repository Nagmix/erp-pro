import { NextRequest, NextResponse } from 'next/server';
import { verifyErpSessionToken } from '@/lib/server/jwt-session';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';
import { canAccessPath } from '@/lib/auth/route-access';

export type PosAuthOk = {
  userId: string;
  roles: string[];
  /** معرّف جلسة المستخدم في الخدمة المحاسبية عند توفرها (تحسين ربط العمليات بالمستخدم) */
  sid?: string;
};

/**
 * مصادقة مسارات `/api/pos/*`: JWT صالح + صلاحية مسار `/pos`.
 */
export function authenticatePosRequest(request: NextRequest):
  | { ok: true } & PosAuthOk
  | { ok: false; response: NextResponse } {
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  const cookieTok = request.cookies.get('erp_session')?.value;
  const tok = bearer || cookieTok;
  if (!tok) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: 'يجب تسجيل الدخول' }, { status: 401 }),
    };
  }
  const payload = verifyErpSessionToken(tok);
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: 'جلسة منتهية أو غير صالحة' }, { status: 401 }),
    };
  }
  if (!canAccessPath('/pos', payload.roles)) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: 'لا صلاحية لوحدة نقاط البيع' }, { status: 403 }),
    };
  }
  const sid = getFrappeSidFromRequest(request);
  return { ok: true, userId: payload.userId, roles: payload.roles, sid };
}
