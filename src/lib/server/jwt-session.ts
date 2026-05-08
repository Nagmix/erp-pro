import crypto from 'crypto';
import { getJwtSecretString } from '@/lib/auth/jwt-secret';

/** HS256 JWT for ERP Pro session (signed; payload includes optional Frappe `sid`). */
const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

function getSecret(): string {
  return getJwtSecretString();
}

export type ErpSessionPayload = {
  sid?: string;
  userId: string;
  fullName: string;
  email: string;
  roles: string[];
  /** Unix timestamp (seconds), standard JWT `exp` */
  exp: number;
  iat: number;
  /** short vs long (remember me) — used on refresh */
  sk?: 's' | 'l';
};

export function signErpSessionToken(payload: Omit<ErpSessionPayload, 'iat'> & { iat?: number }): string {
  const secret = getSecret();
  const body: ErpSessionPayload = {
    ...payload,
    iat: payload.iat ?? Math.floor(Date.now() / 1000),
  };
  const payloadPart = Buffer.from(JSON.stringify(body)).toString('base64url');
  const data = `${HEADER}.${payloadPart}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyErpSessionToken(token: string): ErpSessionPayload | null {
  try {
    const secret = getSecret();
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const data = `${h}.${p}`;
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    const sigBuf = Buffer.from(s, 'base64url');
    const expBuf = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    const json = Buffer.from(p, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as ErpSessionPayload;
    if (!payload.userId || typeof payload.exp !== 'number') return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Frappe session id for Cookie header, or undefined to use server system session (demo / no sid). */
export function frappeSidFromPayload(payload: ErpSessionPayload | null): string | undefined {
  if (!payload?.sid) return undefined;
  if (payload.sid === 'demo-session') return undefined;
  return payload.sid;
}
