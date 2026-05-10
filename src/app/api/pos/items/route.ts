import { NextRequest, NextResponse } from 'next/server';
import { authenticatePosRequest } from '@/lib/server/pos-api-auth';
import { posGetItems } from '@/lib/server/pos-service';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  const auth = authenticatePosRequest(request);
  if (!auth.ok) return auth.response;

  const sp = request.nextUrl.searchParams;
  const pos_profile = sp.get('pos_profile')?.trim();
  if (!pos_profile) {
    return NextResponse.json({ success: false, error: 'pos_profile مطلوب' }, { status: 400 });
  }

  const start = sp.get('start') ? parseInt(sp.get('start')!, 10) : undefined;
  const page_length = sp.get('page_length') ? parseInt(sp.get('page_length')!, 10) : undefined;
  const price_list = sp.get('price_list')?.trim() ?? null;
  const item_group = sp.get('item_group')?.trim() ?? '';
  const search_term = sp.get('search')?.trim() ?? '';

  try {
    const data = await posGetItems(auth.sid, {
      pos_profile,
      start: start && !Number.isNaN(start) ? start : undefined,
      page_length: page_length && !Number.isNaN(page_length) ? page_length : undefined,
      price_list: price_list || null,
      item_group,
      search_term,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل جلب الأصناف';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
