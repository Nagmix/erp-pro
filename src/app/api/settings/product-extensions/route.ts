import { NextRequest, NextResponse } from 'next/server';
import type { ProductExtensionsSettings } from '@/lib/product-extensions-settings.shared';
import { loadProductExtensionsSettings, saveProductExtensionsSettings } from '@/lib/server/product-extensions-store';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


const MASK = '••••••••';

/** SEC-14: قناع الحقول الحساسة للاستجابات (الحقول الحقيقية لكل منصة) */
function maskExtensionSecrets(d: ProductExtensionsSettings): ProductExtensionsSettings {
  return {
    ...d,
    sms: { ...d.sms, apiKey: d.sms?.apiKey ? MASK : '' },
    ecommerce: {
      salla: { ...d.ecommerce.salla, webhookSecret: d.ecommerce?.salla?.webhookSecret ? MASK : '' },
      zid: { ...d.ecommerce.zid, apiToken: d.ecommerce?.zid?.apiToken ? MASK : '' },
      shopify: { ...d.ecommerce.shopify, accessToken: d.ecommerce?.shopify?.accessToken ? MASK : '' },
    },
  };
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: maskExtensionSecrets(await loadProductExtensionsSettings()),
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ProductExtensionsSettings;
  const prev = await loadProductExtensionsSettings();
  const keepIfMasked = (next: string | undefined, prevVal: string): string =>
    next === MASK ? prevVal : (next ?? prevVal);
  const merged: ProductExtensionsSettings = {
    ...prev,
    ...body,
    sms: {
      ...prev.sms,
      ...body.sms,
      apiKey: keepIfMasked(body.sms?.apiKey, prev.sms?.apiKey ?? ''),
    },
    ecommerce: {
      salla: {
        ...prev.ecommerce.salla,
        ...body.ecommerce?.salla,
        webhookSecret: keepIfMasked(
          body.ecommerce?.salla?.webhookSecret,
          prev.ecommerce?.salla?.webhookSecret ?? ''
        ),
      },
      zid: {
        ...prev.ecommerce.zid,
        ...body.ecommerce?.zid,
        apiToken: keepIfMasked(body.ecommerce?.zid?.apiToken, prev.ecommerce?.zid?.apiToken ?? ''),
      },
      shopify: {
        ...prev.ecommerce.shopify,
        ...body.ecommerce?.shopify,
        accessToken: keepIfMasked(
          body.ecommerce?.shopify?.accessToken,
          prev.ecommerce?.shopify?.accessToken ?? ''
        ),
      },
    },
    reportSchedules: body.reportSchedules ?? prev.reportSchedules,
  };
  saveProductExtensionsSettings(merged);
  return NextResponse.json({ success: true, data: maskExtensionSecrets(merged) });
}
