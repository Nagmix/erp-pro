import { NextResponse } from 'next/server';
import { appendAppAuditLog } from '@/lib/server/app-audit-log';

type Body = {
  shopify?: string;
  salla?: string;
  zid?: string;
  woo?: string;
};

function looksLikeHttpsUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** تحقق شكلي من عناوين التكاملات — بدون OAuth أو مزامنة طلبات (M-26). */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: 'JSON غير صالح' }, { status: 400 });
  }

  const messages: string[] = [];

  const shopify = typeof body.shopify === 'string' ? body.shopify.trim() : '';
  if (shopify) {
    if (/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shopify) || /^https?:\/\//i.test(shopify)) {
      messages.push('Shopify: صيغة العنوان مقبولة.');
    } else {
      messages.push('Shopify: يُفضّل النطاق مثل store.myshopify.com أو رابط HTTPS كامل.');
    }
  }

  const salla = typeof body.salla === 'string' ? body.salla.trim() : '';
  if (salla) {
    messages.push(salla.length >= 2 ? 'Salla: تم تسجيل معرف/اسم المتجر.' : 'Salla: المعرف قصير جداً.');
  }

  const zid = typeof body.zid === 'string' ? body.zid.trim() : '';
  if (zid) {
    messages.push(zid.length >= 2 ? 'Zid: تم تسجيل المعرف.' : 'Zid: المعرف قصير جداً.');
  }

  const woo = typeof body.woo === 'string' ? body.woo.trim() : '';
  if (woo) {
    messages.push(looksLikeHttpsUrl(woo) ? 'WooCommerce: رابط يبدو صالحاً.' : 'WooCommerce: أدخل رابطاً كاملاً يبدأ بـ https://');
  }

  if (messages.length === 0) {
    messages.push('لا حقول للتحقق — عبّئ عنوان متجر واحد على الأقل.');
  }

  await appendAppAuditLog('integrations_connectivity_check', 'settings');
  return NextResponse.json({ success: true, data: { messages } });
}
