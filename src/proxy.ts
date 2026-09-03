import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecretBytes } from '@/lib/auth/jwt-secret';
import { canAccessPath } from '@/lib/auth/route-access';
import { CSRF_COOKIE, CSRF_HEADER } from '@/lib/auth/csrf-constants';
import fs from 'fs';
import path from 'path';

// ============================================================
// Next.js 16+ proxy (edge gateway — export named `proxy`).
// JWT signature verified with jose (DEVELOPMENT_PLAN 2.4).
// CSRF double-submit on mutating /api/* (DEVELOPMENT_PLAN 2.1).
// ============================================================

const PUBLIC_API_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/forgot-password',
  // حالة الإعداد فقط — لا تكشف أي شيء حساس وتحتاجها صفحة الدخول قبل وجود جلسة
  '/api/setup/status',
]);

// SEC-01: نقاط نهاية معالج الإعداد — عامة فقط قبل اكتمال الإعداد
// (معالج الإعداد لا يملك جلسة بعد). بعد الاكتمال تصبح محمية بجلسة إدارية.
const PRE_SETUP_PUBLIC_PATHS = new Set([
  '/api/setup/status',
  '/api/setup/test-connection',
  '/api/setup/execute',
]);

function isSetupApiPath(pathname: string): boolean {
  return pathname === '/api/setup' || pathname.startsWith('/api/setup/');
}

function isPublicApiPath(pathname: string, setupDone: boolean): boolean {
  if (PUBLIC_API_PATHS.has(pathname)) return true;
  // SEC-01: لا wildcard عام لمسارات الإعداد — العامة فقط قبل اكتمال الإعداد
  if (!setupDone && PRE_SETUP_PUBLIC_PATHS.has(pathname)) return true;
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

// ─── فحص اكتمال الإعداد ──────────────────────────────────────
// تخزين مؤقت لحالة الإعداد لتقليل قراءات الملف
let _setupCompleteCache: boolean | null = null;
let _setupCheckTime = 0;
const SETUP_CHECK_TTL = 10_000; // 10 ثوانٍ

function isSetupComplete(): boolean {
  const now = Date.now();
  if (_setupCompleteCache !== null && (now - _setupCheckTime) < SETUP_CHECK_TTL) {
    return _setupCompleteCache;
  }
  try {
    const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
    const configPath = path.join(dir, 'app-config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw) as { setupComplete?: boolean };
    _setupCompleteCache = config.setupComplete === true;
    _setupCheckTime = now;
    return _setupCompleteCache;
  } catch {
    _setupCompleteCache = false;
    _setupCheckTime = now;
    return false;
  }
}

function redirectToSetup(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/setup', request.url));
}

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

    // ─── حارس الإعداد ────────────────────────────────────────
    // إذا لم يكن الإعداد مكتملاً، أعد التوجيه إلى صفحة الإعداد
    // المسارات المعفاة: /api/*, /_next/*, /setup, /login, /forbidden, الملفات الثابتة
    const isApiRoute = pathname === '/api' || pathname.startsWith('/api/');
    const setupDone = isSetupComplete();

    if (!setupDone) {
      if (!isApiRoute) {
        return redirectToSetup(request);
      }
      // لطلبات API: إذا كان الإعداد غير مكتمل، اسمح فقط بمسارات الإعداد العامة
      if (!isPublicApiPath(pathname, setupDone)) {
        return NextResponse.json(
          { success: false, error: 'الإعداد غير مكتمل. يرجى إكمال الإعداد أولاً.' },
          { status: 503 }
        );
      }
    }

    if (isApiRoute) {
      if (isPublicApiPath(pathname, setupDone)) {
        return NextResponse.next();
      }

      // SEC-01: بعد اكتمال الإعداد — كل مسارات /api/setup/* الأخرى تتطلب جلسة صالحة
      // (تستدعيها صفحات لوحة التحكم المحمية)، ويسدها الحارس العام أدناه للمجهولين.
      // ملاحظة: قبل اكتمال الإعداد أي مسار setup غير معتمد يُردّ بـ 503 من الحارس أعلاه.

      // Try cookie first, then fall back to Authorization Bearer header
      let sessionToken = request.cookies.get('erp_session')?.value?.trim() || '';
      if (!sessionToken) {
        const authHeader = request.headers.get('authorization') || '';
        if (authHeader.startsWith('Bearer ')) {
          sessionToken = authHeader.slice(7).trim();
        }
      }

      if (!sessionToken) {
        return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
      }

      const session = await verifySessionCookie(sessionToken);
      if (!session) {
        return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
      }

      // SEC-01: مسارات الإعداد بعد الاكتمال — للمدراء فقط
      if (isSetupApiPath(pathname) && setupDone) {
        const ADMIN_ROLES = new Set(['Administrator', 'System Manager']);
        if (!session.roles.some((r) => ADMIN_ROLES.has(r))) {
          return NextResponse.json(
            { success: false, error: 'عمليات الإعداد تتطلب صلاحيات مدير النظام' },
            { status: 403 }
          );
        }
      }

      if (MUTATING.has(request.method) && !csrfOk(request)) {
        return NextResponse.json({ success: false, error: 'CSRF غير صالح' }, { status: 403 });
      }

      return NextResponse.next();
    }

    // Try cookie first, then fall back to Authorization Bearer header
    let pageSessionToken = request.cookies.get('erp_session')?.value?.trim() || '';
    if (!pageSessionToken) {
      const authHeader = request.headers.get('authorization') || '';
      if (authHeader.startsWith('Bearer ')) {
        pageSessionToken = authHeader.slice(7).trim();
      }
    }

    if (!pageSessionToken) {
      return redirectToLogin(request, pathname);
    }

    const session = await verifySessionCookie(pageSessionToken);
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
