import { NextRequest, NextResponse } from 'next/server';
import { authenticatePosRequest } from '@/lib/server/pos-api-auth';
import { posCloseShift } from '@/lib/server/pos-service';

export async function POST(request: NextRequest) {
  const auth = authenticatePosRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      pos_opening_entry?: string;
      payment_reconciliation?: { mode_of_payment: string; closing_amount: number }[];
      period_end_date?: string;
    };

    if (!body.pos_opening_entry?.trim()) {
      return NextResponse.json(
        { success: false, error: 'pos_opening_entry مطلوب' },
        { status: 400 }
      );
    }

    const data = await posCloseShift(auth.sid, {
      pos_opening_entry: body.pos_opening_entry.trim(),
      payment_reconciliation: body.payment_reconciliation,
      period_end_date: body.period_end_date,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل إغلاق الوردية';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
