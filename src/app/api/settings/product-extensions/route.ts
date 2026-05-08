import { NextRequest, NextResponse } from 'next/server';
import type { ProductExtensionsSettings } from '@/lib/product-extensions-settings.shared';
import { loadProductExtensionsSettings, saveProductExtensionsSettings } from '@/lib/server/product-extensions-store';

export async function GET() {
  return NextResponse.json({ success: true, data: loadProductExtensionsSettings() });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ProductExtensionsSettings;
  const prev = loadProductExtensionsSettings();
  const merged: ProductExtensionsSettings = {
    ...prev,
    ...body,
    sms: { ...prev.sms, ...body.sms },
    ecommerce: {
      salla: { ...prev.ecommerce.salla, ...body.ecommerce?.salla },
      zid: { ...prev.ecommerce.zid, ...body.ecommerce?.zid },
      shopify: { ...prev.ecommerce.shopify, ...body.ecommerce?.shopify },
    },
    reportSchedules: body.reportSchedules ?? prev.reportSchedules,
  };
  saveProductExtensionsSettings(merged);
  return NextResponse.json({ success: true, data: merged });
}
