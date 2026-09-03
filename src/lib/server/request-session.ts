import type { NextRequest } from 'next/server';
import { frappeSidFromPayload, verifyErpSessionToken } from '@/lib/server/jwt-session';

function bearerOrCookieToken(request: NextRequest): string | undefined {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  return request.cookies.get('erp_session')?.value?.trim();
}

/**
 * Frappe `sid` for backend requests. Undefined → `backend.ts` uses system session.
 * SEC-12: signed JWT only — the legacy unsigned base64 token path was removed entirely.
 */
export function getFrappeSidFromRequest(request: NextRequest): string | undefined {
  const token = bearerOrCookieToken(request);
  if (!token) return undefined;

  const jwtPayload = verifyErpSessionToken(token);
  if (jwtPayload) return frappeSidFromPayload(jwtPayload);

  return undefined;
}

/** أدوار المستخدم من توكن الجلسة (فارغة للمجهول/التوكن غير الصالح). */
export function getUserRolesFromRequest(request: NextRequest): string[] {
  const token = bearerOrCookieToken(request);
  if (!token) return [];
  const payload = verifyErpSessionToken(token);
  return payload?.roles ?? [];
}

/** هل المستخدم مدير نظام (System Manager أو Administrator)؟ — بوابة الإدارة الموحدة. */
export function isSystemManager(roles: string[]): boolean {
  return roles.some((r) => {
    const k = (r || '').toLowerCase();
    return k === 'system manager' || k === 'administrator' || k.includes('system manager');
  });
}
