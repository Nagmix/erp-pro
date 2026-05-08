import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/accounting/tax-declarations — list all
export async function GET() {
  try {
    const declarations = await db.taxDeclaration.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: declarations });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحميل الإقرارات';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/accounting/tax-declarations — create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const declaration = await db.taxDeclaration.create({
      data: {
        quarter: String(body.quarter ?? 'Q1'),
        year: Number(body.year ?? new Date().getFullYear()),
        filingDate: String(body.filingDate ?? new Date().toISOString().slice(0, 10)),
        declarationType: String(body.declarationType ?? 'standard'),
        taxableSales: Number(body.taxableSales ?? 0),
        taxablePurchases: Number(body.taxablePurchases ?? 0),
        salesTax: Number(body.salesTax ?? 0),
        purchaseTax: Number(body.purchaseTax ?? 0),
        netTaxPayable: Number(body.netTaxPayable ?? 0),
        status: String(body.status ?? 'مسودة'),
      },
    });
    return NextResponse.json({ success: true, data: declaration }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل إنشاء الإقرار';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT /api/accounting/tax-declarations — update (pass id in body)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الإقرار مطلوب' }, { status: 400 });
    }
    const declaration = await db.taxDeclaration.update({
      where: { id: String(id) },
      data: {
        ...(data.quarter !== undefined && { quarter: String(data.quarter) }),
        ...(data.year !== undefined && { year: Number(data.year) }),
        ...(data.filingDate !== undefined && { filingDate: String(data.filingDate) }),
        ...(data.declarationType !== undefined && { declarationType: String(data.declarationType) }),
        ...(data.taxableSales !== undefined && { taxableSales: Number(data.taxableSales) }),
        ...(data.taxablePurchases !== undefined && { taxablePurchases: Number(data.taxablePurchases) }),
        ...(data.salesTax !== undefined && { salesTax: Number(data.salesTax) }),
        ...(data.purchaseTax !== undefined && { purchaseTax: Number(data.purchaseTax) }),
        ...(data.netTaxPayable !== undefined && { netTaxPayable: Number(data.netTaxPayable) }),
        ...(data.status !== undefined && { status: String(data.status) }),
      },
    });
    return NextResponse.json({ success: true, data: declaration });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحديث الإقرار';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
