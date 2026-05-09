import { NextRequest, NextResponse } from 'next/server';
import { getList, createDoc, deleteDoc, getDoc, updateDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

const DOCTYPE = 'Withholding Entry';

// GET /api/accounting/withholding — list all
export async function GET(request: NextRequest) {
  try {
    const sid = getFrappeSidFromRequest(request);
    const data = await getList(DOCTYPE, {
      fields: ['name', 'supplier', 'invoice_no', 'amount', 'withholding_rate', 'withheld_amount', 'payment_status', 'creation', 'modified'],
      limit: 500,
      order_by: 'creation desc',
    }, sid);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحميل سجلات الاستقطاع';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/accounting/withholding — create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sid = getFrappeSidFromRequest(request);
    const doc = await createDoc(DOCTYPE, {
      doctype: DOCTYPE,
      supplier: String(body.supplier ?? ''),
      invoice_no: String(body.invoiceNo ?? body.invoice_no ?? ''),
      amount: Number(body.amount ?? 0),
      withholding_rate: Number(body.withholdingRate ?? body.withholding_rate ?? 0),
      withheld_amount: Number(body.withheldAmount ?? body.withheld_amount ?? 0),
      payment_status: String(body.paymentStatus ?? body.payment_status ?? 'غير مدفوع'),
    }, sid);
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل إنشاء سجل الاستقطاع';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT /api/accounting/withholding — update
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, ...data } = body;
    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم السجل مطلوب' }, { status: 400 });
    }
    const sid = getFrappeSidFromRequest(request);
    const doc = await updateDoc(DOCTYPE, String(name), {
      ...(data.supplier !== undefined && { supplier: String(data.supplier) }),
      ...(data.invoiceNo !== undefined && { invoice_no: String(data.invoiceNo) }),
      ...(data.invoice_no !== undefined && { invoice_no: String(data.invoice_no) }),
      ...(data.amount !== undefined && { amount: Number(data.amount) }),
      ...(data.withholdingRate !== undefined && { withholding_rate: Number(data.withholdingRate) }),
      ...(data.withholding_rate !== undefined && { withholding_rate: Number(data.withholding_rate) }),
      ...(data.withheldAmount !== undefined && { withheld_amount: Number(data.withheldAmount) }),
      ...(data.withheld_amount !== undefined && { withheld_amount: Number(data.withheld_amount) }),
      ...(data.paymentStatus !== undefined && { payment_status: String(data.paymentStatus) }),
      ...(data.payment_status !== undefined && { payment_status: String(data.payment_status) }),
    }, sid);
    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحديث سجل الاستقطاع';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE /api/accounting/withholding — delete
export async function DELETE(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get('name') || request.nextUrl.searchParams.get('id');
    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم السجل مطلوب' }, { status: 400 });
    }
    const sid = getFrappeSidFromRequest(request);
    await deleteDoc(DOCTYPE, String(name), sid);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل حذف سجل الاستقطاع';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
