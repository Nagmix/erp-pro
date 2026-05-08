// GET /api/dashboard/kpis
// Returns dashboard KPI data from the internal backend

import { NextRequest, NextResponse } from 'next/server';
import { getDashboardKPIs } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

export async function GET(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);
    const kpis = await getDashboardKPIs(userSession);
    return NextResponse.json({ success: true, data: kpis });
  } catch {
    return NextResponse.json(
      { success: false, error: 'فشل تحميل البيانات' },
      { status: 500 }
    );
  }
}
