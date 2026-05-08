import { NextRequest, NextResponse } from 'next/server';
import { authenticatePosRequest } from '@/lib/server/pos-api-auth';
import { posCheckReadiness } from '@/lib/server/pos-service';

export async function GET(request: NextRequest) {
  const auth = authenticatePosRequest(request);
  if (!auth.ok) return auth.response;

  const company = request.nextUrl.searchParams.get('company')?.trim();
  if (!company) {
    return NextResponse.json({ success: false, error: 'معامل company مطلوب' }, { status: 400 });
  }

  try {
    const data = await posCheckReadiness(company, auth.sid);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل التحقق من الجاهزية';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
