import { NextRequest, NextResponse } from 'next/server';
import { authenticatePosRequest } from '@/lib/server/pos-api-auth';
import { posSetCustomerInfo } from '@/lib/server/pos-service';

/**
 * تحديث حقل عميل من الواجهة — يمر عبر `set_customer_info` في الخلفية.
 */
export async function POST(request: NextRequest) {
  const auth = authenticatePosRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      customer?: string;
      fieldname?: string;
      value?: string;
    };
    const customer = body.customer?.trim();
    const fieldname = body.fieldname?.trim();
    if (!customer || !fieldname) {
      return NextResponse.json({ success: false, error: 'customer و fieldname مطلوبان' }, { status: 400 });
    }

    await posSetCustomerInfo(auth.sid, {
      customer,
      fieldname,
      value: typeof body.value === 'string' ? body.value : '',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحديث بيانات العميل';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
