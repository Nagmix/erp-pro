// GET /api/data/[doctype] - List documents
// POST /api/data/[doctype] - Create document
// All requests are proxied internally - client never sees the backend

import { NextRequest, NextResponse } from 'next/server';
import { getList, createDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


// DocTypes that may not exist in all ERPNext installations — return empty list gracefully
const GRACEFUL_404_DOTYPES = new Set([
  'Cheque Book',
  'Recurring Journal Entry',
  'Journal Entry Template',
  'Bank Transaction',
  'Loyalty Point Entry',
  'Expense Claim Type',
  'Expense Claim',
]);

// DocTypes that require HRMS module — specific error message when not available
const HRMS_DOTYPES = new Set([
  'Expense Claim',
  'Expense Claim Type',
  'Employee Advance',
  'Travel Request',
  'Training Event',
  'Training Result',
  'Attendance',
  'Leave Application',
  'Salary Slip',
  'Salary Structure',
]);

function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message || '';
  return /404|not found|does not exist|غير مسموح|not permitted/i.test(msg);
}

function isFieldPermissionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message || '';
  return /Field not permitted in query|DataError/i.test(msg);
}

// GET - List documents
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ doctype: string }> }
) {
  const { doctype } = await params;
  try {
    const userSession = getFrappeSidFromRequest(request);
    const searchParams = request.nextUrl.searchParams;

    const options: Record<string, unknown> = {};
    if (searchParams.get('fields')) {
      try { options.fields = JSON.parse(searchParams.get('fields')!); } catch { /* ignore */ }
    }
    if (searchParams.get('filters')) {
      try { options.filters = JSON.parse(searchParams.get('filters')!); } catch { /* ignore */ }
    }
    if (searchParams.get('or_filters')) {
      try { options.or_filters = JSON.parse(searchParams.get('or_filters')!); } catch { /* ignore */ }
    }
    if (searchParams.get('order_by')) options.order_by = searchParams.get('order_by')!;
    if (searchParams.get('limit')) options.limit = parseInt(searchParams.get('limit')!);
    if (searchParams.get('offset')) options.offset = parseInt(searchParams.get('offset')!);

    const data = await getList(doctype, options, userSession);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحميل البيانات';
    // معالجة أنواع المستندات غير الموجودة — إرجاع قائمة فارغة بدلاً من خطأ
    if (GRACEFUL_404_DOTYPES.has(doctype) || isNotFoundError(error) || isFieldPermissionError(error)) {
      return NextResponse.json({ success: true, data: [] });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST - Create document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ doctype: string }> }
) {
  const { doctype } = await params;
  try {
    const userSession = getFrappeSidFromRequest(request);
    const body = await request.json();

    const data = await createDoc(doctype, body, userSession);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل إنشاء السجل';
    // تحقق إن كان نوع المستند غير موجود (يتطلب HRMS)
    if (HRMS_DOTYPES.has(doctype) && isNotFoundError(error)) {
      return NextResponse.json({
        success: false,
        error: 'نوع المستند «' + doctype + '» غير متوفر على الخادم. تأكد من تثبيت وحدة الموارد البشرية (HRMS) وإعادة تشغيل الخادم، ثم أعد المحاولة من صفحة إعداد الخادم.',
      }, { status: 500 });
    }
    if (isNotFoundError(error)) {
      return NextResponse.json({
        success: false,
        error: 'نوع المستند «' + doctype + '» غير موجود على الخادم. تحقق من إعدادات النظام.',
      }, { status: 500 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
