import { NextRequest, NextResponse } from 'next/server';
import { callMethod } from '@/lib/server/backend';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const method = path.join('.');
  const body = await request.json().catch(() => ({}));

  try {
    const result = await callMethod(method, body);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
