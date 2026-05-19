// GET /api/data/[doctype] - List documents
// POST /api/data/[doctype] - Create document
// All requests are proxied internally - client never sees the backend

import { NextRequest, NextResponse } from 'next/server';
import { getList, createDoc, getDoc } from '@/lib/server/backend';
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

// DocTypes that need auto-fill of company defaults (currency, exchange_rate, cost_center)
const DOCTYPES_NEED_COMPANY_DEFAULTS = new Set([
  'Sales Invoice',
  'Purchase Invoice',
  'Payment Entry',
  'Journal Entry',
  'Expense Claim',
  'Purchase Order',
  'Sales Order',
  'Quotation',
  'Supplier Quotation',
  'Delivery Note',
  'Purchase Receipt',
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

/**
 * إضافة القيم الافتراضية للشركة تلقائياً عند إنشاء المستندات
 * يشمل: currency, exchange_rate, cost_center
 */
async function autoFillCompanyDefaults(
  doctype: string,
  body: Record<string, unknown>,
  userSession?: string
): Promise<Record<string, unknown>> {
  if (!DOCTYPES_NEED_COMPANY_DEFAULTS.has(doctype)) return body;

  const result = { ...body };

  try {
    // جلب إعدادات الشركة الأولى
    const companies = (await getList('Company', {
      fields: ['name', 'default_currency', 'default_cost_center', 'cost_center'],
      limit: 1,
    }, userSession)) as Array<Record<string, unknown>>;

    if (companies.length === 0) return result;
    const company = companies[0]!;
    const companyName = String(company.name);
    const companyCurrency = String(company.default_currency || 'YER');

    // تعيين اسم الشركة إذا لم يكن موجوداً
    if (!result.company) result.company = companyName;

    // تعيين العملة وسعر الصرف للفواتير والمستندات المالية
    if (!result.currency) {
      result.currency = companyCurrency;
    }
    if (!result.exchange_rate && result.exchange_rate !== 0) {
      result.exchange_rate = 1;
    }

    // تعيين مركز التكلفة الافتراضي للعناصر الفرعية
    // جلب مركز التكلفة الورقي (غير المجمّع)
    if (!result.cost_center) {
      try {
        const costCenters = (await getList('Cost Center', {
          fields: ['name', 'is_group'],
          filters: [['is_group', '=', '0'], ['company', '=', companyName]],
          limit: 1,
        }, userSession)) as Array<Record<string, unknown>>;

        if (costCenters.length > 0) {
          result.cost_center = String(costCenters[0]!.name);
        }
      } catch { /* تجاهل */ }
    }

    // تعيين مركز التكلفة للعناصر الفرعية (items, expenses, accounts)
    const childTableFields = ['items', 'expenses', 'accounts'];
    for (const field of childTableFields) {
      const children = result[field];
      if (Array.isArray(children)) {
        result[field] = children.map((child: Record<string, unknown>) => {
          if (!child.cost_center && result.cost_center) {
            return { ...child, cost_center: result.cost_center };
          }
          return child;
        });
      }
    }

    // إعدادات خاصة بمطالبات المصروفات
    if (doctype === 'Expense Claim') {
      if (!result.approval_status) {
        result.approval_status = 'Approved';
      }
      // payable_account من إعدادات الشركة
      if (!result.payable_account) {
        try {
          const companyDoc = (await getDoc('Company', companyName, userSession)) as Record<string, unknown>;
          if (companyDoc.default_expense_claim_payable_account) {
            result.payable_account = String(companyDoc.default_expense_claim_payable_account);
          }
        } catch { /* تجاهل */ }
      }
    }

    // إعدادات خاصة بقسائم الدفع
    if (doctype === 'Payment Entry') {
      // ✅ استنتاج party_type تلقائياً من payment_type إذا لم يُحدد
      if (!result.party_type || String(result.party_type).trim() === '') {
        const paymentType = String(result.payment_type || '');
        if (paymentType === 'Receive') {
          result.party_type = 'Customer';
        } else if (paymentType === 'Pay') {
          result.party_type = 'Supplier';
        }
        // Internal Transfer لا يحتاج party_type
      }
    }

  } catch (error) {
    // لا نوقف إنشاء المستند بسبب فشل جلب الإعدادات الافتراضية
    console.warn('[autoFillCompanyDefaults] Failed:', error instanceof Error ? error.message : error);
  }

  return result;
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
    let body = await request.json() as Record<string, unknown>;

    // ✅ إضافة القيم الافتراضية تلقائياً (currency, exchange_rate, cost_center, etc.)
    body = await autoFillCompanyDefaults(doctype, body, userSession);

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
