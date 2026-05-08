import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordResetFromErp } from '@/lib/server/backend';
import { isForgotPasswordRateLimited } from '@/lib/server/forgot-password-rate-limit';

function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (isForgotPasswordRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: 'عدد كبير من الطلبات. حاول لاحقاً.' },
      { status: 429 }
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  const { email } = body;

  if (!email) {
    return NextResponse.json(
      { success: false, error: 'البريد الإلكتروني مطلوب' },
      { status: 400 }
    );
  }

  if (process.env.ERPNEXT_TRY_LOGIN === 'true') {
    try {
      await requestPasswordResetFromErp(email.trim());
    } catch {
      /* generic response below */
    }
  }

  return NextResponse.json({
    success: true,
    message: 'إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رابط إعادة التعيين',
  });
}
