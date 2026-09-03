import { NextRequest, NextResponse } from 'next/server';
import { callMethod } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';
import { checkRateLimit, clientIpFromRequest } from '@/lib/server/rate-limit';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';

// MED-03: محدد المعدل أصبح مشتركاً عبر Redis (يبقى بعد restart ويُشارك بين النسخ)
// بدل عدّاد في الذاكرة، وIP العميل يُستخرج بمنطق rightmost-trusted
const WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const method = path.join('.');
  const body = await request.json().catch(() => ({}));

  // Rate limiting (MED-03: Redis مشترك + rightmost-trusted XFF)
  const ip = clientIpFromRequest(request);
  const rateCheck = await checkRateLimit(`method:${ip}`, {
    windowMs: WINDOW_SECONDS * 1000,
    max: MAX_REQUESTS_PER_WINDOW,
  });

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { success: false, error: 'تم تجاوز الحد المسموح من الطلبات — حاول مرة أخرى بعد قليل' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rateCheck.resetAt / 1000)),
        },
      }
    );
  }

  try {
    const userSession = getFrappeSidFromRequest(request);
    const result = await callMethod(method, body, userSession);
    return NextResponse.json(
      { success: true, data: result },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateCheck.remaining),
          'X-RateLimit-Reset': String(Math.ceil(rateCheck.resetAt / 1000)),
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
