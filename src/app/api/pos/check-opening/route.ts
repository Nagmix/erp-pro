import { NextRequest, NextResponse } from 'next/server';
import { authenticatePosRequest } from '@/lib/server/pos-api-auth';
import { posCheckOpening } from '@/lib/server/pos-service';

export async function GET(request: NextRequest) {
  const auth = authenticatePosRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const data = await posCheckOpening(auth.sid, auth.userId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل التحقق من الوردية';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
