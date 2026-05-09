import { NextRequest, NextResponse } from 'next/server';
import { callMethod } from '@/lib/server/backend';

// Simple in-memory rate limiter
const requestCounts = new Map<string, { count: number; windowStart: number }>();
const WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 120;
const BURST_LIMIT = 40;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || (now - entry.windowStart) > WINDOW_SECONDS * 1000) {
    requestCounts.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetAt: now + WINDOW_SECONDS * 1000 };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetAt: entry.windowStart + WINDOW_SECONDS * 1000 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count, resetAt: entry.windowStart + WINDOW_SECONDS * 1000 };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of requestCounts) {
    if (now - entry.windowStart > WINDOW_SECONDS * 1000 * 2) {
      requestCounts.delete(ip);
    }
  }
}, 60000);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const method = path.join('.');
  const body = await request.json().catch(() => ({}));

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const rateCheck = checkRateLimit(ip);

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
    const result = await callMethod(method, body);
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
