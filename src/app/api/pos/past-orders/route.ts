import { NextRequest, NextResponse } from 'next/server';
import { authenticatePosRequest } from '@/lib/server/pos-api-auth';
import { posPastOrders } from '@/lib/server/pos-service';

export async function GET(request: NextRequest) {
  const auth = authenticatePosRequest(request);
  if (!auth.ok) return auth.response;

  const posProfile = request.nextUrl.searchParams.get('pos_profile')?.trim();
  const company = request.nextUrl.searchParams.get('company')?.trim();
  const limitRaw = request.nextUrl.searchParams.get('limit');
  const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;

  try {
    const data = await posPastOrders(auth.sid, {
      pos_profile: posProfile,
      company,
      limit: limit && !Number.isNaN(limit) ? limit : undefined,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'تعذر جلب الطلبات';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
