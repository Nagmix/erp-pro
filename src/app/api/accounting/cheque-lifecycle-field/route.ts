import { NextRequest, NextResponse } from 'next/server';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';
import { verifyErpSessionToken } from '@/lib/server/jwt-session';
import { chequeLifecycleFieldExists, ensureChequeLifecycleField } from '@/lib/server/cheque-lifecycle-field';

function auth(request: NextRequest) {
  const token = request.cookies.get('erp_session')?.value;
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  const tok = bearer || token;
  const payload = tok ? verifyErpSessionToken(tok) : null;
  return { payload, tok };
}

function allowAccountingSetup(payload: NonNullable<ReturnType<typeof verifyErpSessionToken>>) {
  const roles = payload?.roles || [];
  const norm = roles.map((r) => r.toLowerCase());
  return (
    norm.some((r) => r.includes('accounts manager') || r.includes('system manager')) ||
    norm.some((r) => r.includes('accounts user')) ||
    norm.some((r) => r.includes('sales master manager'))
  );
}

export async function GET(request: NextRequest) {
  try {
    const { payload } = auth(request);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'يجب تسجيل الدخول' }, { status: 401 });
    }
    if (!allowAccountingSetup(payload)) {
      return NextResponse.json(
        { success: false, error: 'صلاحية محاسبة أو مدير نظام مطلوبة' },
        { status: 403 }
      );
    }
    const userSession = getFrappeSidFromRequest(request);
    const exists = await chequeLifecycleFieldExists(userSession);
    return NextResponse.json({ success: true, data: { exists } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل التحقق من الحقل';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { payload } = auth(request);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'يجب تسجيل الدخول' }, { status: 401 });
    }
    if (!allowAccountingSetup(payload)) {
      return NextResponse.json(
        { success: false, error: 'صلاحية محاسبة أو مدير نظام مطلوبة لإنشاء الحقل' },
        { status: 403 }
      );
    }
    const userSession = getFrappeSidFromRequest(request);
    const data = await ensureChequeLifecycleField(userSession);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل إنشاء حقل دورة الشيك';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
