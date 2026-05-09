import { NextRequest, NextResponse } from 'next/server';
import { appendAppAuditLog } from '@/lib/server/app-audit-log';

/** تحديث مزامنة تكامل معيّن — سجل تدقيق فقط حالياً */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as { key?: string };
  const key = body.key?.trim();
  if (!key) {
    return NextResponse.json({ success: false, error: 'مطلوب مفتاح التكامل' }, { status: 400 });
  }
  await appendAppAuditLog('integration_sync', 'settings', { integrationKey: key });
  return NextResponse.json({
    success: true,
    data: {
      key,
      syncedAt: new Date().toISOString(),
      message: 'تم تسجيل طلب المزامنة',
    },
  });
}
