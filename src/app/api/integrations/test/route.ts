import { NextRequest, NextResponse } from 'next/server';
import { appendAppAuditLog } from '@/lib/server/app-audit-log';
import { getList, getDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest, getUserRolesFromRequest, isSystemManager } from '@/lib/server/request-session';
import { assertSafeExternalUrl } from '@/lib/server/ssrf-guard';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


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

/**
 * POST /api/integrations/test
 * اختبار اتصال حقيقي لمنصات التجارة الإلكترونية
 * يتحقق من وجود إعدادات التكامل في ERPNext ويحاول قراءة البيانات
 */
export async function POST(request: NextRequest) {
  // MED-01: اختبار التكامل إدارة — للمدراء فقط (كان متاحاً لأي مستخدم مسجل)
  if (!isSystemManager(getUserRolesFromRequest(request))) {
    return NextResponse.json(
      { success: false, error: 'اختبار التكاملات يتطلب صلاحية مدير النظام' },
      { status: 403 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: 'JSON غير صالح' }, { status: 400 });
  }

  const sid = getFrappeSidFromRequest(request);
  const messages: { platform: string; status: 'ok' | 'warning' | 'error'; message: string }[] = [];

  // Shopify test
  const shopify = typeof body.shopify === 'string' ? body.shopify.trim() : '';
  if (shopify) {
    try {
      // Check if Shopify Settings exists in ERPNext
      const settings = await getDoc('Shopify Settings', 'Shopify Settings', sid).catch(() => null);
      if (settings && (settings as any).shopify_url) {
        messages.push({ platform: 'Shopify', status: 'ok', message: `متصل بـ ${(settings as any).shopify_url}` });
      } else if (/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shopify) || /^https?:\/\//i.test(shopify)) {
        messages.push({ platform: 'Shopify', status: 'warning', message: 'صيغة العنوان مقبولة — لم يتم العثور على إعدادات Shopify في ERPNext' });
      } else {
        messages.push({ platform: 'Shopify', status: 'error', message: 'صيغة العنوان غير صالحة — استخدم store.myshopify.com أو رابط HTTPS' });
      }
    } catch {
      messages.push({ platform: 'Shopify', status: 'warning', message: 'صيغة العنوان مقبولة — لم يتم العثور على إعدادات Shopify' });
    }
  }

  // Salla test
  const salla = typeof body.salla === 'string' ? body.salla.trim() : '';
  if (salla) {
    try {
      const settings = await getDoc('Salla Settings', 'Salla Settings', sid).catch(() => null);
      if (settings) {
        messages.push({ platform: 'Salla', status: 'ok', message: 'إعدادات Salla متصلة بـ ERPNext' });
      } else {
        messages.push({ platform: 'Salla', status: 'warning', message: salla.length >= 2 ? 'تم تسجيل معرف المتجر — لم يتم العثور على إعدادات Salla في ERPNext' : 'المعرف قصير جداً' });
      }
    } catch {
      messages.push({ platform: 'Salla', status: 'warning', message: 'لم يتم العثور على إعدادات Salla في ERPNext' });
    }
  }

  // Zid test
  const zid = typeof body.zid === 'string' ? body.zid.trim() : '';
  if (zid) {
    try {
      const settings = await getDoc('Zid Settings', 'Zid Settings', sid).catch(() => null);
      if (settings) {
        messages.push({ platform: 'Zid', status: 'ok', message: 'إعدادات Zid متصلة بـ ERPNext' });
      } else {
        messages.push({ platform: 'Zid', status: 'warning', message: zid.length >= 2 ? 'تم تسجيل المعرف — لم يتم العثور على إعدادات Zid في ERPNext' : 'المعرف قصير جداً' });
      }
    } catch {
      messages.push({ platform: 'Zid', status: 'warning', message: 'لم يتم العثور على إعدادات Zid في ERPNext' });
    }
  }

  // WooCommerce test
  const woo = typeof body.woo === 'string' ? body.woo.trim() : '';
  if (woo) {
    try {
      const settings = await getDoc('WooCommerce Settings', 'WooCommerce Settings', sid).catch(() => null);
      if (settings && (settings as any).woocommerce_server_url) {
        messages.push({ platform: 'WooCommerce', status: 'ok', message: `متصل بـ ${(settings as any).woocommerce_server_url}` });
      } else if (looksLikeHttpsUrl(woo)) {
        // Try to verify the URL is reachable (basic check)
        try {
          // MED-01: حرس SSRF — منع النطاقات الداخلية بعد حل DNS والمنافذ غير القياسية
          const safeUrl = await assertSafeExternalUrl(woo);
          const response = await fetch(safeUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
          if (response.ok) {
            messages.push({ platform: 'WooCommerce', status: 'ok', message: `الخادم يستجيب (${response.status}) — لم يتم العثور على إعدادات WooCommerce في ERPNext` });
          } else {
            messages.push({ platform: 'WooCommerce', status: 'warning', message: `الخادم استجاب بـ ${response.status} — تحقق من صلاحيات API` });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : '';
          messages.push({ platform: 'WooCommerce', status: 'error', message: msg || 'لم يتمكن من الاتصال بالخادم — تحقق من الرابط' });
        }
      } else {
        messages.push({ platform: 'WooCommerce', status: 'error', message: 'أدخل رابطاً كاملاً يبدأ بـ https://' });
      }
    } catch {
      messages.push({ platform: 'WooCommerce', status: 'warning', message: 'لم يتم العثور على إعدادات WooCommerce في ERPNext' });
    }
  }

  if (messages.length === 0) {
    messages.push({ platform: 'عام', status: 'warning', message: 'لا حقول للتحقق — عبّئ عنوان متجر واحد على الأقل' });
  }

  await appendAppAuditLog('integrations_connectivity_check', 'settings', { results: messages });
  return NextResponse.json({ success: true, data: { messages } });
}
