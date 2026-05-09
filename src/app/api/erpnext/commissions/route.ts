import { NextRequest, NextResponse } from 'next/server';
import { getList, createDoc } from '@/lib/server/backend';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const fields = sp.get('fields') ? JSON.parse(sp.get('fields')!) : undefined;
    const limit = Number(sp.get('limit') || '100');
    const filters = sp.get('filters') ? JSON.parse(sp.get('filters')!) : undefined;
    const order_by = sp.get('order_by') || 'creation desc';
    const sub = sp.get('sub');

    const doctype = sub === 'calculations' ? 'Commission Calculation' : 'Sales Commission Rule';

    const data = await getList(doctype, { fields, filters, limit, order_by });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const doctype = body._doctype || 'Sales Commission Rule';
    delete body._doctype;
    const data = await createDoc(doctype, body);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
