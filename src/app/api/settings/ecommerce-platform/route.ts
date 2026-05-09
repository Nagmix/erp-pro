import { NextRequest, NextResponse } from 'next/server';
import { appendAppAuditLog } from '@/lib/server/app-audit-log';
import {
  loadEcommercePlatformSettingsResolved,
  saveEcommercePlatformSettings,
  updatePlatformConfig,
  type PlatformConfig,
  type PlatformId,
} from '@/lib/server/ecommerce-platform-store';

export async function GET() {
  const data = await loadEcommercePlatformSettingsResolved();
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    platforms?: PlatformConfig[];
    platform?: PlatformId;
    patch?: Partial<PlatformConfig>;
  };

  let saved;

  if (body.platform && body.patch) {
    // Update a single platform
    saved = updatePlatformConfig(body.platform, body.patch);
    await appendAppAuditLog('ecommerce_platform_config_updated', `settings:${body.platform}`);
  } else if (body.platforms) {
    // Full save of all platforms
    saved = saveEcommercePlatformSettings({ platforms: body.platforms });
    await appendAppAuditLog('ecommerce_platform_configs_saved', 'settings');
  } else {
    return NextResponse.json({ success: false, error: 'بيانات غير كافية للحفظ' }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: saved });
}
