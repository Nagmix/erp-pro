import { NextRequest, NextResponse } from 'next/server';
import { setupTaxPackage } from '@/lib/server/tax-setup';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';
import { verifyErpSessionToken } from '@/lib/server/jwt-session';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


function parseBody(raw: unknown): { company?: string; title?: string; rate?: number } {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  const company = typeof o.company === 'string' ? o.company.trim() : undefined;
  const title = typeof o.title === 'string' ? o.title.trim() : undefined;
  const rate = typeof o.rate === 'number' ? o.rate : typeof o.rate === 'string' ? parseFloat(o.rate) : NaN;
  return { company, title, rate: Number.isFinite(rate) ? rate : undefined };
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('erp_session')?.value;
    const authHeader = request.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const tok = bearer || token;
    const payload = tok ? verifyErpSessionToken(tok) : null;
    if (!payload) {
      return NextResponse.json({ success: false, error: 'يجب تسجيل الدخول' }, { status: 401 });
    }
    const roles = payload?.roles || [];
    const norm = roles.map((r) => r.toLowerCase());
    const allowed =
      norm.some((r) => r.includes('accounts manager') || r.includes('system manager')) ||
      norm.some((r) => r.includes('accounts user')) ||
      norm.some((r) => r.includes('sales master manager'));
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'صلاحية المحاسبة أو مدير النظام مطلوبة لإنشاء الحسابات والقوالب' },
        { status: 403 }
      );
    }

    const body = parseBody(await request.json());
    if (!body.company || !body.title || body.rate === undefined) {
      return NextResponse.json(
        { success: false, error: 'أرسل company و title و rate' },
        { status: 400 }
      );
    }

    const userSession = getFrappeSidFromRequest(request);
    const data = await setupTaxPackage(body.company, body.title, body.rate, userSession);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل إعداد الضريبة';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
