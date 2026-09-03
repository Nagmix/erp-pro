import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordResetFromErp } from '@/lib/server/backend';
import { checkRateLimit, clientIpFromRequest } from '@/lib/server/rate-limit';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // MED-03: عدّاد Redis مشترك + IP بمنطق rightmost-trusted
  const ip = clientIpFromRequest(request);
  const rate = await checkRateLimit(`forgot-password:${ip}`, {
    windowMs: 60_000,
    max: 10,
  });
  if (!rate.allowed) {
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
