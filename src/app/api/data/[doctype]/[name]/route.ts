// GET /api/data/[doctype]/[name] - Get single document
// PUT /api/data/[doctype]/[name] - Update document
// DELETE /api/data/[doctype]/[name] - Delete document
// POST /api/data/[doctype]/[name] - Submit/Cancel document

import { NextRequest, NextResponse } from 'next/server';
import { getDoc, updateDoc, deleteDoc, submitDoc, cancelDoc, amendDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';
import { isDoctypeAllowed } from '@/lib/server/doctype-allowlist';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';

/** SEC-04: فحص موحد في بداية كل معالج */
async function guardDoctype<T extends { doctype: string }>(
  params: Promise<T>
): Promise<T | null> {
  const p = await params;
  if (!isDoctypeAllowed(p.doctype)) return null;
  return p;
}


// GET - Single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ doctype: string; name: string }> }
) {
  try {
    const p = await guardDoctype(params);
    if (!p) {
      return NextResponse.json({ success: false, error: 'نوع المستند غير مسموح عبر بروكسي البيانات' }, { status: 403 });
    }
    const { doctype, name } = p;
    const userSession = getFrappeSidFromRequest(request);
    const data = await getDoc(doctype, name, userSession);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحميل البيانات';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT - Update document
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ doctype: string; name: string }> }
) {
  try {
    const p = await guardDoctype(params);
    if (!p) {
      return NextResponse.json({ success: false, error: 'نوع المستند غير مسموح عبر بروكسي البيانات' }, { status: 403 });
    }
    const { doctype, name } = p;
    const userSession = getFrappeSidFromRequest(request);
    const body = await request.json();
    const data = await updateDoc(doctype, name, body, userSession);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحديث السجل';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ doctype: string; name: string }> }
) {
  try {
    const p = await guardDoctype(params);
    if (!p) {
      return NextResponse.json({ success: false, error: 'نوع المستند غير مسموح عبر بروكسي البيانات' }, { status: 403 });
    }
    const { doctype, name } = p;
    const userSession = getFrappeSidFromRequest(request);
    await deleteDoc(doctype, name, userSession);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل حذف السجل';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST - Submit or Cancel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ doctype: string; name: string }> }
) {
  try {
    const p = await guardDoctype(params);
    if (!p) {
      return NextResponse.json({ success: false, error: 'نوع المستند غير مسموح عبر بروكسي البيانات' }, { status: 403 });
    }
    const { doctype, name } = p;
    const userSession = getFrappeSidFromRequest(request);
    const body = await request.json();
    
    let data;
    if (body.action === 'submit') {
      data = await submitDoc(doctype, name, userSession);
    } else if (body.action === 'cancel') {
      data = await cancelDoc(doctype, name, userSession);
    } else if (body.action === 'amend') {
      data = await amendDoc(doctype, name, userSession);
    } else {
      return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تنفيذ الإجراء';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
