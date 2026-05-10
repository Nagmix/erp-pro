import { NextRequest, NextResponse } from 'next/server';
import { getList, createDoc, updateDoc, deleteDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


const DOCTYPE = 'Tax Declaration';

// GET /api/accounting/tax-declarations — list all
export async function GET(request: NextRequest) {
  try {
    const sid = getFrappeSidFromRequest(request);
    const data = await getList(DOCTYPE, {
      fields: ['name', 'quarter', 'year', 'filing_date', 'declaration_type', 'taxable_sales', 'taxable_purchases', 'sales_tax', 'purchase_tax', 'net_tax_payable', 'status', 'creation', 'modified'],
      limit: 500,
      order_by: 'creation desc',
    }, sid);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحميل الإقرارات';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/accounting/tax-declarations — create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sid = getFrappeSidFromRequest(request);
    const doc = await createDoc(DOCTYPE, {
      doctype: DOCTYPE,
      quarter: String(body.quarter ?? 'Q1'),
      year: Number(body.year ?? new Date().getFullYear()),
      filing_date: String(body.filingDate ?? body.filing_date ?? new Date().toISOString().slice(0, 10)),
      declaration_type: String(body.declarationType ?? body.declaration_type ?? 'standard'),
      taxable_sales: Number(body.taxableSales ?? body.taxable_sales ?? 0),
      taxable_purchases: Number(body.taxablePurchases ?? body.taxable_purchases ?? 0),
      sales_tax: Number(body.salesTax ?? body.sales_tax ?? 0),
      purchase_tax: Number(body.purchaseTax ?? body.purchase_tax ?? 0),
      net_tax_payable: Number(body.netTaxPayable ?? body.net_tax_payable ?? 0),
      status: String(body.status ?? 'مسودة'),
    }, sid);
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل إنشاء الإقرار';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT /api/accounting/tax-declarations — update
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, ...data } = body;
    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم الإقرار مطلوب' }, { status: 400 });
    }
    const sid = getFrappeSidFromRequest(request);
    const doc = await updateDoc(DOCTYPE, String(name), {
      ...(data.quarter !== undefined && { quarter: String(data.quarter) }),
      ...(data.year !== undefined && { year: Number(data.year) }),
      ...(data.filingDate !== undefined && { filing_date: String(data.filingDate) }),
      ...(data.filing_date !== undefined && { filing_date: String(data.filing_date) }),
      ...(data.declarationType !== undefined && { declaration_type: String(data.declarationType) }),
      ...(data.declaration_type !== undefined && { declaration_type: String(data.declaration_type) }),
      ...(data.taxableSales !== undefined && { taxable_sales: Number(data.taxableSales) }),
      ...(data.taxable_purchases !== undefined && { taxable_purchases: Number(data.taxable_purchases) }),
      ...(data.salesTax !== undefined && { sales_tax: Number(data.salesTax) }),
      ...(data.purchaseTax !== undefined && { purchase_tax: Number(data.purchaseTax) }),
      ...(data.netTaxPayable !== undefined && { net_tax_payable: Number(data.netTaxPayable) }),
      ...(data.status !== undefined && { status: String(data.status) }),
    }, sid);
    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحديث الإقرار';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE /api/accounting/tax-declarations — delete
export async function DELETE(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get('name') || request.nextUrl.searchParams.get('id');
    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم الإقرار مطلوب' }, { status: 400 });
    }
    const sid = getFrappeSidFromRequest(request);
    await deleteDoc(DOCTYPE, String(name), sid);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل حذف الإقرار';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
