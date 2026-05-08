import { NextRequest, NextResponse } from 'next/server';
import {
  buildLoyaltyPointEntrySyntheticReport,
  listReportsForRefDoctype,
  resolveReportExecutionName,
  runReport,
} from '@/lib/server/backend';
import { ensureReportAllowed } from '@/lib/server/report-access';
import { verifyErpSessionToken } from '@/lib/server/jwt-session';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';
import { getReportDef } from '@/lib/reports/catalog';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportName: string }> }
) {
  const { reportName } = await params;
  const token = request.cookies.get('erp_session')?.value;
  const payload = token ? verifyErpSessionToken(token) : null;
  const roles = payload?.roles || [];
  const gate = ensureReportAllowed(reportName, roles);
  if (!gate.ok) {
    return NextResponse.json({ success: false, error: gate.reason || 'غير مصرح' }, { status: 403 });
  }
  const def = getReportDef(reportName);
  if (!def) {
    return NextResponse.json({ success: false, error: 'التقرير غير مدعوم' }, { status: 404 });
  }
  const searchParams = request.nextUrl.searchParams;

  let filters: Record<string, unknown> = {};
  try {
    const filtersParam = searchParams.get('filters');
    if (filtersParam) {
      filters = JSON.parse(filtersParam);
    }
  } catch {
    // Ignore parse errors
  }

  const frappeSid = getFrappeSidFromRequest(request);
  const mergedFilters = { ...(def.defaultFilters || {}), ...filters };

  try {
    if (def.id === 'crm-loyalty') {
      const reportDocs = await listReportsForRefDoctype('Loyalty Point Entry', frappeSid);
      if (reportDocs.length === 0) {
        const synthetic = await buildLoyaltyPointEntrySyntheticReport(mergedFilters, frappeSid);
        return NextResponse.json({ success: true, data: synthetic });
      }
    }

    const erpReportName = await resolveReportExecutionName(def, frappeSid);
    const result = (await runReport(erpReportName, mergedFilters, frappeSid)) as { message?: unknown };
    return NextResponse.json({ success: true, data: result?.message ?? result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
