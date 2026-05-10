import { NextRequest, NextResponse } from 'next/server';
import { verifyErpSessionToken } from '@/lib/server/jwt-session';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


function legacyPayload(token: string): {
  userId: string;
  fullName: string;
  email: string;
  roles: string[];
  exp: number;
} | null {
  if (process.env.AUTH_ALLOW_LEGACY_TOKEN !== '1') return null;
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as {
      userId?: string;
      fullName?: string;
      email?: string;
      roles?: string[];
      exp?: number;
    };
    if (!decoded.userId) return null;
    const expMs =
      decoded.exp && decoded.exp > 1_000_000_000_000 ? decoded.exp : (decoded.exp || 0) * 1000;
    if (expMs && Date.now() > expMs) return null;
    return {
      userId: decoded.userId,
      fullName: decoded.fullName || decoded.userId,
      email: decoded.email || '',
      roles: decoded.roles || [],
      exp: decoded.exp || 0,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cookieToken = request.cookies.get('erp_session')?.value;
  const token = (authHeader?.replace('Bearer ', '') || cookieToken)?.trim();

  if (!token) {
    return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
  }

  const jwt = verifyErpSessionToken(token);
  if (jwt) {
    return NextResponse.json({
      success: true,
      user: {
        id: jwt.userId,
        name: jwt.fullName || jwt.userId,
        fullName: jwt.fullName || jwt.userId,
        email: jwt.email || '',
        roles: jwt.roles || [],
      },
    });
  }

  const legacy = legacyPayload(token);
  if (legacy) {
    return NextResponse.json({
      success: true,
      user: {
        id: legacy.userId,
        name: legacy.fullName,
        fullName: legacy.fullName,
        email: legacy.email,
        roles: legacy.roles,
      },
    });
  }

  return NextResponse.json({ success: false, error: 'رمز غير صالح' }, { status: 401 });
}
