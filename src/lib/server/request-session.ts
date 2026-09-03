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
