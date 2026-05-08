import { NextRequest, NextResponse } from 'next/server';
import { authenticatePosRequest } from '@/lib/server/pos-api-auth';
import { posSubmitDraftPosInvoice } from '@/lib/server/pos-service';

export async function POST(request: NextRequest) {
  const auth = authenticatePosRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      name?: string;
      payments?: { mode_of_payment: string; amount: number }[];
    };
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم الفاتورة مطلوب' }, { status: 400 });
    }

    const data = await posSubmitDraftPosInvoice(auth.sid, name, {
      payments: body.payments,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل ترحيل الفاتورة';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
