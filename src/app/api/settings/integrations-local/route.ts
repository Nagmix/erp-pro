import { NextRequest, NextResponse } from 'next/server';
import { appendAppAuditLog } from '@/lib/server/app-audit-log';
import {
  loadIntegrationsLocalResolved,
  saveIntegrationsLocal,
  type IntegrationsLocalSettings,
} from '@/lib/server/integrations-settings-store';

export async function GET() {
  const data = await loadIntegrationsLocalResolved();
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<IntegrationsLocalSettings>;
  const saved = saveIntegrationsLocal({
    shopify: typeof body.shopify === 'string' ? body.shopify : '',
    salla: typeof body.salla === 'string' ? body.salla : '',
    zid: typeof body.zid === 'string' ? body.zid : '',
    woo: typeof body.woo === 'string' ? body.woo : '',
    smsProvider: typeof body.smsProvider === 'string' ? body.smsProvider : '',
    waProvider: typeof body.waProvider === 'string' ? body.waProvider : '',
    notes: typeof body.notes === 'string' ? body.notes : '',
  });
  await appendAppAuditLog('integrations_local_saved', 'settings');
  return NextResponse.json({ success: true, data: saved });
}
