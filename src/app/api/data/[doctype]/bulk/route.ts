import { NextRequest, NextResponse } from 'next/server';
import { createDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ doctype: string }> }
) {
  const { doctype } = await params;
  const body = await request.json();
  const docs = body.docs as Record<string, unknown>[];

  if (!Array.isArray(docs)) {
    return NextResponse.json(
      { success: false, error: 'docs must be an array' },
      { status: 400 }
    );
  }

  const userSession = getFrappeSidFromRequest(request);

  try {
    const results = await Promise.all(
      docs.map((doc) => createDoc(doctype, doc, userSession))
    );
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
