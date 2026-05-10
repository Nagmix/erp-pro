// GET /api/version-history - Fetch version history for a document
// Proxies to ERPNext Version doctype

import { NextRequest, NextResponse } from 'next/server';
import { getList } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const doctype = searchParams.get('doctype');
  const name = searchParams.get('name');

  if (!doctype || !name) {
    return NextResponse.json(
      { success: false, error: 'يجب تحديد نوع المستند واسمه' },
      { status: 400 }
    );
  }

  try {
    const userSession = getFrappeSidFromRequest(request);

    const rows = await getList('Version', {
      fields: ['name', 'ref_doctype', 'docname', 'owner', 'creation', 'data'],
      filters: [
        ['ref_doctype', '=', doctype],
        ['docname', '=', name],
      ],
      order_by: 'creation desc',
      limit: 50,
    }, userSession);

    // Parse the `data` JSON field for each version entry
    const parsed = (rows as Record<string, unknown>[]).map((row) => {
      let parsedData: unknown = null;
      const rawData = row.data;
      if (typeof rawData === 'string' && rawData) {
        try {
          parsedData = JSON.parse(rawData);
        } catch {
          parsedData = null;
        }
      } else if (rawData && typeof rawData === 'object') {
        parsedData = rawData;
      }

      return {
        name: String(row.name ?? ''),
        ref_doctype: String(row.ref_doctype ?? ''),
        docname: String(row.docname ?? ''),
        owner: String(row.owner ?? ''),
        creation: String(row.creation ?? ''),
        data: parsedData,
      };
    });

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحميل سجل التعديلات';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
