import { NextRequest, NextResponse } from 'next/server';
import { authenticatePosRequest } from '@/lib/server/pos-api-auth';
import { posListSessions } from '@/lib/server/pos-service';

export async function GET(request: NextRequest) {
  const auth = authenticatePosRequest(request);
  if (!auth.ok) return auth.response;

  const status = request.nextUrl.searchParams.get('status')?.trim();
  const limitRaw = request.nextUrl.searchParams.get('limit');
  const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;

  try {
    const data = await posListSessions(auth.sid, {
      ...(status ? { status } : {}),
      ...(limit && !Number.isNaN(limit) ? { limit } : {}),
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل جلب الجلسات';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
