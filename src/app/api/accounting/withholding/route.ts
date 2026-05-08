import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/accounting/withholding — list all
export async function GET() {
  try {
    const entries = await db.withholdingEntry.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحميل سجلات الاستقطاع';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/accounting/withholding — create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entry = await db.withholdingEntry.create({
      data: {
        supplier: String(body.supplier ?? ''),
        invoiceNo: String(body.invoiceNo ?? ''),
        amount: Number(body.amount ?? 0),
        withholdingRate: Number(body.withholdingRate ?? 0),
        withheldAmount: Number(body.withheldAmount ?? 0),
        paymentStatus: String(body.paymentStatus ?? 'غير مدفوع'),
      },
    });
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل إنشاء سجل الاستقطاع';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE /api/accounting/withholding — delete (pass id in query)
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف السجل مطلوب' }, { status: 400 });
    }
    await db.withholdingEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل حذف سجل الاستقطاع';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
