import { NextRequest, NextResponse } from 'next/server';
import { callMethod } from '@/lib/server/backend';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;
    if (!name) return NextResponse.json({ success: false, error: 'الاسم مطلوب' }, { status: 400 });

    const data = await callMethod('erpnext.utilities.doctype.auto_repeat.auto_repeat.make_auto_repeat_doc', {
      auto_repeat: name,
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
