// GET  /api/print-formats — List print formats for a doctype
// POST /api/print-formats — Create a new print format
// PUT  /api/print-formats — Update a print format

import { NextRequest, NextResponse } from 'next/server';
import { getList, createDoc, updateDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


// GET — List print formats for a given doctype
export async function GET(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);
    const doctype = request.nextUrl.searchParams.get('doctype');

    if (!doctype) {
      return NextResponse.json(
        { success: false, error: 'معامل doctype مطلوب' },
        { status: 400 }
      );
    }

    const data = await getList('Print Format', {
      fields: ['name', 'doc_type', 'standard', 'custom_format', 'print_format_builder', 'module'],
      filters: [['doc_type', '=', doctype]],
      order_by: 'name asc',
      limit: 200,
    }, userSession);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحميل تنسيقات الطباعة';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST — Create a new print format
export async function POST(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);
    const body = await request.json() as {
      name: string;
      doc_type: string;
      standard?: string;
      custom_format?: number;
      print_format_builder?: number;
    };

    if (!body.name || !body.doc_type) {
      return NextResponse.json(
        { success: false, error: 'اسم التنسيق ونوع المستند مطلوبان' },
        { status: 400 }
      );
    }

    const doc: Record<string, unknown> = {
      doctype: 'Print Format',
      name: body.name,
      doc_type: body.doc_type,
      standard: body.standard || 'No',
      custom_format: body.custom_format ?? 1,
      print_format_builder: body.print_format_builder ?? 1,
    };

    const data = await createDoc('Print Format', doc, userSession);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل إنشاء تنسيق الطباعة';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT — Update a print format
export async function PUT(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);
    const body = await request.json() as Record<string, unknown>;
    const name = body.name as string;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'اسم التنسيق مطلوب للتحديث' },
        { status: 400 }
      );
    }

    const { name: _name, ...fields } = body;
    const data = await updateDoc('Print Format', name, fields, userSession);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحديث تنسيق الطباعة';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
