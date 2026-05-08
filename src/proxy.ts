import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecretBytes } from '@/lib/auth/jwt-secret';
import { canAccessPath } from '@/lib/auth/route-access';
import { CSRF_COOKIE, CSRF_HEADER } from '@/lib/auth/csrf-constants';

// ============================================================
// Next.js 16+ proxy (edge gateway — export named `proxy`).
// JWT signature verified with jose (DEVELOPMENT_PLAN 2.4).
// CSRF double-submit on mutating /api/* (DEVELOPMENT_PLAN 2.1).
// ============================================================

const PUBLIC_API_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/setup/status',
  '/api/setup/test-connection',
  '/api/setup/execute',
]);

function isPublicApiPath(pathname: string): boolean {
  if (PUBLIC_API_PATHS.has(pathname)) return true;
  // Allow any /api/setup/* sub-path for future extensibility
  if (pathname.startsWith('/api/setup/')) return true;
  return false;
}

function isStaticAssetPath(pathname: string): boolean {
  if (pathname === '/api' || pathname.startsWith('/api/')) return false;
  if (!pathname.includes('.')) return false;
  const ext = pathname.split('.').pop()?.toLowerCase() || '';
  const staticExts = [
    'js',
    'css',
    'woff',
    'woff2',
    'ttf',
    'eot',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'png',
    'svg',
    'ico',
    'map',
    'json',
  ];
  return staticExts.includes(ext);
}

function decodeJwtPayloadUnsafe(token: string): { userId?: string; roles?: string[]; exp?: number } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (b64.length % 4)) % 4;
    const json = atob(b64 + '='.repeat(pad));
    return JSON.parse(json) as { userId?: string; roles?: string[]; exp?: number };
  } catch {
    return null;
  }
}

// Legacy token support removed for security — all sessions must use signed JWT

async function verifySessionCookie(token: string): Promise<{ userId: string; roles: string[] } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes(), { algorithms: ['HS256'] });
    const userId = typeof payload.userId === 'string' ? payload.userId : null;
    if (!userId) return null;
    const roles = Array.isArray(payload.roles) ? payload.roles.map(String) : [];
    return { userId, roles };
  } catch {
    // Token verification failed — no legacy fallback for security
    return null;
  }
}

function csrfOk(request: NextRequest): boolean {
  const tokenCookie = request.cookies.get(CSRF_COOKIE)?.value;
  const tokenHeader = request.headers.get(CSRF_HEADER) || request.headers.get('X-CSRF-Token');
  if (!tokenCookie || !tokenHeader) return false;
  return tokenCookie === tokenHeader;
}

function redirectToLogin(request: NextRequest, pathname: string): NextResponse {
  const loginUrl = new URL('/login', request.url);
  if (pathname !== '/') {
    loginUrl.searchParams.set('redirect', pathname);
  }
  return NextResponse.redirect(loginUrl);
}

function redirectToForbidden(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/forbidden', request.url));
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    if (pathname.startsWith('/_next')) {
      return NextResponse.next();
    }
    if (isStaticAssetPath(pathname)) {
      return NextResponse.next();
    }
    if (pathname === '/login' || pathname.startsWith('/login/')) {
      return NextResponse.next();
    }
    if (pathname === '/setup' || pathname.startsWith('/setup/')) {
      return NextResponse.next();
    }
    if (pathname === '/forbidden') {
      return NextResponse.next();
    }

    const isApiRoute = pathname === '/api' || pathname.startsWith('/api/');
    if (isApiRoute) {
      if (isPublicApiPath(pathname)) {
        return NextResponse.next();
      }

      const sessionCookie = request.cookies.get('erp_session')?.value;
      if (!sessionCookie?.trim()) {
        return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
      }

      const session = await verifySessionCookie(sessionCookie.trim());
      if (!session) {
        return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
      }

      if (MUTATING.has(request.method) && !csrfOk(request)) {
        return NextResponse.json({ success: false, error: 'CSRF غير صالح' }, { status: 403 });
      }

      return NextResponse.next();
    }

    const sessionCookie = request.cookies.get('erp_session')?.value;
    if (!sessionCookie?.trim()) {
      return redirectToLogin(request, pathname);
    }

    const session = await verifySessionCookie(sessionCookie.trim());
    if (!session) {
      return redirectToLogin(request, pathname);
    }

    if (!canAccessPath(pathname, session.roles)) {
      return redirectToForbidden(request);
    }

    return NextResponse.next();
  } catch (error) {
    // Defensive: any unhandled error in the proxy should return a clean error
    // rather than crashing the edge function and returning a 500
    console.error('[Proxy Error]', error);
    return NextResponse.json(
      { success: false, error: 'خطأ داخلي في البوابة' },
      { status: 500 }
    );
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|_next/data|favicon.ico).*)'],
};
