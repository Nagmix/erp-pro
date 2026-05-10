import { NextRequest, NextResponse } from 'next/server';
import { authenticatePosRequest } from '@/lib/server/pos-api-auth';
import { posSearchBarcode } from '@/lib/server/pos-service';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  const auth = authenticatePosRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { search_value?: string };
    const search_value = body.search_value?.trim();
    if (!search_value) {
      return NextResponse.json({ success: false, error: 'search_value مطلوب' }, { status: 400 });
    }

    const data = await posSearchBarcode(auth.sid, search_value);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل البحث بالباركود';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
