import { NextRequest, NextResponse } from 'next/server';
import { authenticatePosRequest } from '@/lib/server/pos-api-auth';
import { posOpenShift } from '@/lib/server/pos-service';

export async function POST(request: NextRequest) {
  const auth = authenticatePosRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      company?: string;
      pos_profile?: string;
      user?: string;
      balance_details?: { mode_of_payment: string; opening_amount: number }[];
      posting_date?: string;
      period_start_date?: string;
    };

    if (!body.company?.trim() || !body.pos_profile?.trim()) {
      return NextResponse.json(
        { success: false, error: 'company و pos_profile مطلوبان' },
        { status: 400 }
      );
    }

    const balance_details = Array.isArray(body.balance_details) ? body.balance_details : [];
    if (balance_details.length === 0) {
      return NextResponse.json(
        { success: false, error: 'يجب إرسال balance_details (وسيلة دفع واحدة على الأقل)' },
        { status: 400 }
      );
    }

    const user = body.user?.trim() || auth.userId;

    const data = await posOpenShift(auth.sid, {
      company: body.company.trim(),
      pos_profile: body.pos_profile.trim(),
      user,
      balance_details,
      posting_date: body.posting_date,
      period_start_date: body.period_start_date,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل فتح الوردية';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
