import { NextRequest, NextResponse } from 'next/server';
import { authenticatePosRequest } from '@/lib/server/pos-api-auth';
import { posSessionSummary } from '@/lib/server/pos-service';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  const auth = authenticatePosRequest(request);
  if (!auth.ok) return auth.response;

  const poe = request.nextUrl.searchParams.get('pos_opening_entry')?.trim();

  try {
    const data = await posSessionSummary(auth.sid, {
      pos_opening_entry: poe,
      frappeUserName: auth.userId,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'تعذر جلب ملخص الوردية';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
