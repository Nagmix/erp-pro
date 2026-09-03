// POST /api/data/[doctype]/bulk-delete - Bulk delete documents

import { NextRequest, NextResponse } from 'next/server';
import { deleteDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';
import { isDoctypeAllowed } from '@/lib/server/doctype-allowlist';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ doctype: string }> }
) {
  const { doctype } = await params;
  // SEC-04: قائمة سماح أنواع المستندات
  if (!isDoctypeAllowed(doctype)) {
    return NextResponse.json(
      { success: false, error: `نوع المستند "${doctype}" غير مسموح عبر بروكسي البيانات` },
      { status: 403 }
    );
  }
  const body = await request.json();
  const names = body.names as string[];

  if (!Array.isArray(names) || names.length === 0) {
    return NextResponse.json(
      { success: false, error: 'يجب توفير قائمة أسماء للحذف' },
      { status: 400 }
    );
  }

  const userSession = getFrappeSidFromRequest(request);

  try {
    const results = await Promise.allSettled(
      names.map((name) => deleteDoc(doctype, name, userSession))
    );

    const failed = results
      .map((r, i) => ({
        name: names[i],
        ok: r.status === 'fulfilled',
        error: r.status === 'rejected' ? (r.reason as Error).message : undefined,
      }))
      .filter((r) => !r.ok);

    if (failed.length === 0) {
      return NextResponse.json({ success: true, deleted: names.length });
    }

    if (failed.length === names.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'فشل حذف جميع السجلات',
          details: failed,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: names.length - failed.length,
      failed,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
