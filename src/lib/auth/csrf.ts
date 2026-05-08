import { randomBytes } from 'crypto';
import type { NextResponse } from 'next/server';
import { CSRF_COOKIE } from '@/lib/auth/csrf-constants';

export { CSRF_COOKIE, CSRF_HEADER } from '@/lib/auth/csrf-constants';

export function generateCsrfToken(): string {
  return randomBytes(24).toString('hex');
}

export function applyCsrfCookie(response: NextResponse, token: string, maxAgeSec: number): void {
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec,
  });
}
