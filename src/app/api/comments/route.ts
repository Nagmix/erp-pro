// GET /api/comments - Fetch comments for a document
// POST /api/comments - Add a comment to a document

import { NextRequest, NextResponse } from 'next/server';
import { getList, createDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


// GET - Fetch comments for a document
export async function GET(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const doctype = searchParams.get('doctype');
    const name = searchParams.get('name');

    if (!doctype || !name) {
      return NextResponse.json(
        { success: false, error: 'يجب تحديد نوع المستند واسمه' },
        { status: 400 }
      );
    }

    // Fetch Communication records linked to this document
    const communications = await getList('Communication', {
      fields: [
        'name',
        'content',
        'communication_type as comment_type',
        'sender',
        'sender_full_name as comment_by',
        'creation',
        'reference_doctype',
        'reference_name',
      ],
      filters: [
        ['reference_doctype', '=', doctype],
        ['reference_name', '=', name],
        ['communication_type', '=', 'Communication'],
      ],
      order_by: 'creation asc',
      limit: 200,
    }, userSession);

    // Fetch Comment records linked to this document
    const comments = await getList('Comment', {
      fields: [
        'name',
        'content',
        'comment_type',
        'comment_by',
        'creation',
        'reference_doctype',
        'reference_name',
      ],
      filters: [
        ['reference_doctype', '=', doctype],
        ['reference_name', '=', name],
        ['comment_type', '=', 'Comment'],
      ],
      order_by: 'creation asc',
      limit: 200,
    }, userSession);

    // Combine and sort by creation date
    const combined = [
      ...(Array.isArray(communications) ? communications : []),
      ...(Array.isArray(comments) ? comments : []),
    ] as Record<string, unknown>[];
    combined.sort((a, b) => {
      const dateA = new Date(String(a.creation)).getTime();
      const dateB = new Date(String(b.creation)).getTime();
      return dateA - dateB;
    });

    return NextResponse.json({ success: true, data: combined });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحميل التعليقات';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST - Add a comment to a document
export async function POST(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);
    const body = await request.json();
    const { doctype, name, content } = body as { doctype: string; name: string; content: string };

    if (!doctype || !name || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: 'يجب تحديد نوع المستند واسمه ومحتوى التعليق' },
        { status: 400 }
      );
    }

    const data = await createDoc('Comment', {
      comment_type: 'Comment',
      reference_doctype: doctype,
      reference_name: name,
      content: content.trim(),
    }, userSession);

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل إضافة التعليق';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
