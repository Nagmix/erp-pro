import { NextRequest, NextResponse } from 'next/server';
import { appendAppAuditLog } from '@/lib/server/app-audit-log';
import {
  loadEcommercePlatformSettingsResolved,
  saveEcommercePlatformSettings,
  updatePlatformConfig,
  maskPlatformSecrets,
  type PlatformConfig,
  type PlatformId,
} from '@/lib/server/ecommerce-platform-store';

const MASK = '••••••••';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


export async function GET() {
  // SEC-14: إخفاء مفاتيح API في القوائم — تُعاد كاملة مرة واحدة عند الإنشاء فقط
  const data = await loadEcommercePlatformSettingsResolved();
  return NextResponse.json({
    success: true,
    data: { ...data, platforms: data.platforms.map(maskPlatformSecrets) },
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    platforms?: PlatformConfig[];
    platform?: PlatformId;
    patch?: Partial<PlatformConfig>;
  };

  let saved;

  if (body.platform && body.patch) {
    // SEC-14: القيمة المقنّعة تعني "بدون تغيير" — أبقِ المفتاح الحالي
    const patch = { ...body.patch };
    const current = await loadEcommercePlatformSettingsResolved();
    const existing = current.platforms.find((p) => p.platform === body.platform);
    if (patch.apiKey === MASK) patch.apiKey = existing?.apiKey ?? '';
    if (patch.apiSecret === MASK) patch.apiSecret = existing?.apiSecret ?? '';
    saved = updatePlatformConfig(body.platform, patch);
    await appendAppAuditLog('ecommerce_platform_config_updated', `settings:${body.platform}`);
  } else if (body.platforms) {
    // Full save of all platforms
    // SEC-14: استبدل القيم المقنّعة بالمفاتيح الحقيقية المحفوظة
    const current = await loadEcommercePlatformSettingsResolved();
    const byPlatform = new Map(current.platforms.map((p) => [p.platform, p]));
    const merged = body.platforms.map((p) => {
      const existing = byPlatform.get(p.platform);
      return {
        ...p,
        apiKey: p.apiKey === MASK ? (existing?.apiKey ?? '') : p.apiKey,
        apiSecret: p.apiSecret === MASK ? (existing?.apiSecret ?? '') : p.apiSecret,
      };
    });
    saved = saveEcommercePlatformSettings({ platforms: merged });
    await appendAppAuditLog('ecommerce_platform_configs_saved', 'settings');
  } else {
    return NextResponse.json({ success: false, error: 'بيانات غير كافية للحفظ' }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: saved });
}
