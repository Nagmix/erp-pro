import { NextRequest, NextResponse } from 'next/server';
import { authenticatePosRequest } from '@/lib/server/pos-api-auth';
import { posCreateAndSubmitPosInvoice } from '@/lib/server/pos-service';

export async function POST(request: NextRequest) {
  const auth = authenticatePosRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      doc?: Record<string, unknown>;
      /** إذا `false` يُحفظ كمسودة دون ترحيل (دفع جزئي عند السماح من ملف نقطة البيع) */
      submit?: boolean;
    };
    if (!body.doc || typeof body.doc !== 'object' || Array.isArray(body.doc)) {
      return NextResponse.json({ success: false, error: 'حقل doc مطلوب' }, { status: 400 });
    }

    const data = await posCreateAndSubmitPosInvoice(auth.sid, body.doc, {
      submit: body.submit !== false,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل إنشاء أو ترحيل الفاتورة';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
