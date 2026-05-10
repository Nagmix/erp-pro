// GET  /api/print-formats/builder — Get print format builder data
// PUT  /api/print-formats/builder — Save print format builder layout

import { NextRequest, NextResponse } from 'next/server';
import { getDoc, updateDoc, callMethod } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


// GET — Get print format builder data (format + DocType fields)
export async function GET(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);
    const name = request.nextUrl.searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'اسم تنسيق الطباعة مطلوب' },
        { status: 400 }
      );
    }

    // Get the print format document
    const format = await getDoc('Print Format', name, userSession) as Record<string, unknown>;
    const docType = format?.doc_type as string;

    if (!docType) {
      return NextResponse.json(
        { success: false, error: 'لم يتم العثور على نوع المستند المرتبط' },
        { status: 400 }
      );
    }

    // Get DocType fields
    let docTypeFields: unknown[] = [];
    try {
      const docTypeDoc = await callMethod('frappe.client.get_doc', {
        doctype: 'DocType',
        name: docType,
      }, userSession) as Record<string, unknown>;
      docTypeFields = Array.isArray(docTypeDoc?.fields) ? docTypeDoc.fields : [];
    } catch {
      // If we can't get DocType fields, return empty
    }

    // Parse existing layout from print_format_builder_data
    let sections: unknown[] = [];
    try {
      const builderData = format?.print_format_builder_data;
      if (typeof builderData === 'string' && builderData.trim()) {
        sections = JSON.parse(builderData);
      } else if (Array.isArray(builderData)) {
        sections = builderData;
      }
    } catch {
      // Ignore parse errors
    }

    return NextResponse.json({
      success: true,
      data: {
        ...format,
        docTypeFields,
        sections,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحميل منشئ التنسيق';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT — Save print format builder layout
export async function PUT(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);
    const body = await request.json() as {
      name: string;
      layout: unknown[];
    };

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'اسم تنسيق الطباعة مطلوب' },
        { status: 400 }
      );
    }

    const data = await updateDoc('Print Format', body.name, {
      print_format_builder_data: JSON.stringify(body.layout),
      print_format_builder: 1,
    }, userSession);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل حفظ تنسيق الطباعة';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
