import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { loadSmtpConfig } from '@/lib/server/smtp-config-store';
import { getList } from '@/lib/server/backend';
import { getFrappeSidFromRequest, getUserRolesFromRequest } from '@/lib/server/request-session';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';

/**
 * F-05 (تدقيق 2026-09): إرسال كشف حساب أرصدة العميل بالبريد — حقيقي عبر SMTP المخزن.
 * كانت الزر معطلاً أبدياً بشارة «قريباً».
 *
 * المدخلات: { customer, customerName?, email }
 * - يجلب قيود الدفع الخاصة بالعميل (party_type=Customer) ويحسب الرصيد.
 * - يبني كشف HTML بسيط ويُرسله عبر إعدادات SMTP المحفوظة.
 * - بوابة أدوار: نفس جمهور صفحة CRM/الأرصدة.
 */

const ALLOWED_ROLES = [
  'system manager',
  'administrator',
  'sales manager',
  'sales user',
  'accounts manager',
  'accounts user',
];

function ymd(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return isNaN(dt.getTime()) ? String(d) : dt.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const roles = getUserRolesFromRequest(request).map((r) => (r || '').toLowerCase());
  if (!roles.some((r) => ALLOWED_ROLES.includes(r))) {
    return NextResponse.json(
      { success: false, error: 'إرسال كشوف الحسابات يتطلب صلاحيات مبيعات أو محاسبة أو إدارة' },
      { status: 403 }
    );
  }

  let customer = '';
  let customerName = '';
  let email = '';
  try {
    const body = (await request.json()) as { customer?: string; customerName?: string; email?: string };
    customer = typeof body.customer === 'string' ? body.customer.trim() : '';
    customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    email = typeof body.email === 'string' ? body.email.trim() : '';
  } catch {
    return NextResponse.json({ success: false, error: 'JSON غير صالح' }, { status: 400 });
  }

  if (!customer || !email) {
    return NextResponse.json(
      { success: false, error: 'العميل والبريد الإلكتروني مطلوبان' },
      { status: 400 }
    );
  }
  // تحقق بسيط من صيغة البريد
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ success: false, error: 'صيغة البريد الإلكتروني غير صحيحة' }, { status: 400 });
  }

  const sid = getFrappeSidFromRequest(request);

  // قيود الدفع الخاصة بالعميل (مُرحّلة فقط)
  let entries: Array<Record<string, unknown>> = [];
  try {
    const rows = (await getList('Payment Entry', {
      fields: ['name', 'payment_type', 'posting_date', 'party', 'party_name', 'paid_amount', 'received_amount', 'currency', 'remarks'],
      filters: [['party_type', '=', 'Customer'], ['party', '=', customer], ['docstatus', '=', '1']] as string[][],
      order_by: 'posting_date asc',
      limit: 200,
    }, sid)) as Array<Record<string, unknown>>;
    entries = rows || [];
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'تعذر جلب قيود العميل' },
      { status: 500 }
    );
  }

  let received = 0;
  let paid = 0;
  const currency = String(entries[0]?.currency || 'YER');
  for (const e of entries) {
    const amount = Number(e.received_amount ?? e.paid_amount ?? 0);
    if (e.payment_type === 'Receive') received += amount;
    else paid += amount;
  }
  const balance = received - paid;

  const rowsHtml = entries
    .map(
      (e) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${ymd(String(e.posting_date || ''))}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${String(e.name || '')}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${e.payment_type === 'Receive' ? 'استلام' : 'صرف'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:left">${Number(e.received_amount ?? e.paid_amount ?? 0).toLocaleString('en-US')}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${String(e.remarks || '')}</td>
      </tr>`
    )
    .join('');

  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:640px;margin:auto">
    <h2 style="color:#1e3a5f">كشف حساب أرصدة — ${customerName || customer}</h2>
    <p>التاريخ: ${ymd(new Date())}</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="background:#1e3a5f;color:#fff">
        <th style="padding:8px 10px">التاريخ</th><th style="padding:8px 10px">القيود</th>
        <th style="padding:8px 10px">النوع</th><th style="padding:8px 10px">المبلغ</th>
        <th style="padding:8px 10px">ملاحظات</th>
      </tr></thead>
      <tbody>${rowsHtml || '<tr><td colspan="5" style="padding:12px;text-align:center">لا توجد قيود</td></tr>'}</tbody>
    </table>
    <h3 style="margin-top:16px">إجمالي الاستلام: ${received.toLocaleString('en-US')} ${currency}</h3>
    <h3 style="margin-top:4px">إجمالي الصرف: ${paid.toLocaleString('en-US')} ${currency}</h3>
    <h2 style="color:${balance >= 0 ? '#0a7d33' : '#b00020'}">الرصيد الحالي: ${balance.toLocaleString('en-US')} ${currency}</h2>
    <p style="color:#888;font-size:12px">أُرسل هذا الكشف تلقائياً من نظام ERP-Pro.</p>
  </div>`;

  const cfg = await loadSmtpConfig(sid);
  if (!cfg || !cfg.pass) {
    return NextResponse.json(
      { success: false, error: 'إعدادات SMTP غير محفوظة — اضبطها أولاً من صفحة إعدادات البريد' },
      { status: 400 }
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    await transporter.sendMail({
      from: cfg.fromName ? `"${cfg.fromName}" <${cfg.fromEmail}>` : cfg.fromEmail,
      to: email,
      subject: `كشف حساب — ${customerName || customer}`,
      html,
    });
    return NextResponse.json({
      success: true,
      data: { message: `أُرسل كشف الحساب (${entries.length} قيد) إلى ${email}` },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'فشل إرسال البريد' },
      { status: 500 }
    );
  }
}
