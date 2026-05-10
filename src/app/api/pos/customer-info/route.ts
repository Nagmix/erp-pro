import { NextRequest, NextResponse } from 'next/server';
import { authenticatePosRequest } from '@/lib/server/pos-api-auth';
import { posGetCustomerInfo } from '@/lib/server/pos-service';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  const auth = authenticatePosRequest(request);
  if (!auth.ok) return auth.response;

  const name = request.nextUrl.searchParams.get('name')?.trim();
  if (!name) {
    return NextResponse.json({ success: false, error: 'معرّف العميل (name) مطلوب' }, { status: 400 });
  }

  try {
    const data = await posGetCustomerInfo(auth.sid, name);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'تعذر جلب بيانات العميل';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
