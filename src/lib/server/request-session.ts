import type { NextRequest } from 'next/server';
import { frappeSidFromPayload, verifyErpSessionToken } from '@/lib/server/jwt-session';

function bearerOrCookieToken(request: NextRequest): string | undefined {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  return request.cookies.get('erp_session')?.value?.trim();
}

/**
 * Frappe `sid` for backend requests. Undefined → `backend.ts` uses system session.
 * Supports signed JWT; legacy unsigned base64 JSON (dev only) if `AUTH_ALLOW_LEGACY_TOKEN=1`.
 */
export function getFrappeSidFromRequest(request: NextRequest): string | undefined {
  const token = bearerOrCookieToken(request);
  if (!token) return undefined;

  const jwtPayload = verifyErpSessionToken(token);
  if (jwtPayload) return frappeSidFromPayload(jwtPayload);

  if (process.env.AUTH_ALLOW_LEGACY_TOKEN === '1') {
    try {
      const raw = JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as {
        sid?: string;
        userId?: string;
        exp?: number;
      };
      if (raw.exp && Date.now() > raw.exp) return undefined;
      if (raw.sid && raw.sid !== 'demo-session') return raw.sid;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}
