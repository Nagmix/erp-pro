import { NextResponse } from 'next/server';

const rateLimitConfig = {
  windowSeconds: 60,
  maxRequestsPerWindow: 120,
  burstLimit: 40,
  strategy: 'token-bucket',
};

export async function GET() {
  return NextResponse.json({ success: true, data: rateLimitConfig });
}
