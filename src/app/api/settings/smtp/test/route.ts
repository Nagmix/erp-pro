import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { loadSmtpConfig } from '@/lib/server/smtp-config-store';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { to?: string };
  const to = typeof body.to === 'string' ? body.to.trim() : '';
  if (!to) {
    return NextResponse.json({ success: false, error: 'عنوان المستلم مطلوب' }, { status: 400 });
  }

  const cfg = await loadSmtpConfig();
  if (!cfg || !cfg.pass) {
    return NextResponse.json({ success: false, error: 'لم يُحفظ إعداد SMTP أو كلمة المرور' }, { status: 400 });
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
      to,
      subject: 'ERP Pro — اختبار SMTP',
      text: 'تم إرسال هذه الرسالة من صفحة إعدادات البريد للتحقق من الربط.',
    });
    return NextResponse.json({ success: true, message: 'تم الإرسال' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'فشل الإرسال';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
