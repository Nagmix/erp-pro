import { NextRequest, NextResponse } from 'next/server';
import { verifyErpSessionToken } from '@/lib/server/jwt-session';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cookieToken = request.cookies.get('erp_session')?.value;
  const token = (authHeader?.replace('Bearer ', '') || cookieToken)?.trim();

  if (!token) {
    return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
  }

  // SEC-12: التوقيعات الموثّقة فقط — دعم التوكن القديم غير الموقَّع أُزيل كلياً
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

  return NextResponse.json({ success: false, error: 'رمز غير صالح' }, { status: 401 });
}
