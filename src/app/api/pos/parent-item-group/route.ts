import { NextRequest, NextResponse } from 'next/server';
import { authenticatePosRequest } from '@/lib/server/pos-api-auth';
import { posGetParentItemGroup } from '@/lib/server/pos-service';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  const auth = authenticatePosRequest(request);
  if (!auth.ok) return auth.response;

  const pos_profile = request.nextUrl.searchParams.get('pos_profile')?.trim();
  if (!pos_profile) {
    return NextResponse.json({ success: false, error: 'pos_profile مطلوب' }, { status: 400 });
  }

  try {
    const data = await posGetParentItemGroup(auth.sid, pos_profile);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'تعذر جلب مجموعة الأصناف';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
