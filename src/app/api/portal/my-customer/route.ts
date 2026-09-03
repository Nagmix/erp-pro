// GET /api/portal/my-customer — SEC-10: الربط الإلزامي مستخدم↔عميل من الخادم
//
// يعيد العميل (العملاء) المرتبطين بحساب المستخدم الحالي عبر سجل Contact
// في ERPNext (حقل البريد الإلكتروني + روابط Dynamic Link → Customer).
// البوابة (src/app/portal) تعتمد على هذه النتيجة حصراً — لا إدخال يدوي
// لمعرّف العميل، وبالتالي لا IDOR عبر تخمين CUST-xxxx.

import { NextRequest, NextResponse } from 'next/server';
import { callMethod, getList, getDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sid = getFrappeSidFromRequest(request);
  if (!sid) {
    return NextResponse.json(
      { success: false, error: 'غير مصرح' },
      { status: 401 }
    );
  }

  try {
    // 1) هوية المستخدم الحالية من جلسة ERPNext نفسها (وليس من ادعاء الواجهة)
    let user = '';
    try {
      const msg = (await callMethod('frappe.auth.get_logged_user', {}, sid)) as unknown;
      user = typeof msg === 'string' ? msg : String((msg as { message?: string })?.message ?? '');
    } catch {
      user = '';
    }
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'تعذر التحقق من هوية المستخدم' },
        { status: 401 }
      );
    }

    // 2) جهات الاتصال المرتبطة بهذا البريد
    const contacts = (await getList(
      'Contact',
      {
        fields: ['name'],
        filters: [['email_id', '=', user]],
        limit: 10,
      },
      sid
    )) as Array<{ name: string }>;

    if (!contacts || contacts.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: { customers: [], user, message: 'لا يوجد جهة اتصال مرتبطة بحسابك' },
        },
        { status: 200 }
      );
    }

    // 3) العملاء المرتبطون عبر Dynamic Link داخل جهات الاتصال
    const customers = new Set<string>();
    for (const c of contacts) {
      try {
        const doc = (await getDoc('Contact', c.name, sid)) as {
          links?: Array<{ link_doctype?: string; link_name?: string }>;
        };
        for (const link of doc?.links ?? []) {
          if (link?.link_doctype === 'Customer' && link?.link_name) {
            customers.add(link.link_name);
          }
        }
      } catch {
        // تجاهل جهة اتصال لا يملك المستخدم صلاحية قراءتها
      }
    }

    return NextResponse.json(
      { success: true, data: { customers: Array.from(customers), user } },
      { status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل جلب ربط العميل';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
