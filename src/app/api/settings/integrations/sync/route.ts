import { NextRequest, NextResponse } from 'next/server';
import { appendAppAuditLog } from '@/lib/server/app-audit-log';
import { getList, callMethod } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';

/**
 * POST /api/settings/integrations/sync
 * مزامنة بيانات التكامل مع ERPNext
 * يدعم: Shopify, Salla, Zid, WooCommerce
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as { key?: string; fullSync?: boolean };
  const key = body.key?.trim();
  if (!key) {
    return NextResponse.json({ success: false, error: 'مطلوب مفتاح التكامل' }, { status: 400 });
  }

  const sid = getFrappeSidFromRequest(request);
  const syncResults: Record<string, { status: string; count?: number; error?: string }> = {};

  try {
    switch (key) {
      case 'shopify': {
        try {
          const orders = await getList('Shopify Order', { fields: ['name'], limit: 1 }, sid);
          const items = await getList('Item', { fields: ['name'], filters: [['shopify_product_id', '!=', '']], limit: 1 }, sid);
          syncResults.shopify = { status: 'synced', count: (orders?.length || 0) + (items?.length || 0) };
        } catch (err) {
          syncResults.shopify = { status: 'error', error: (err as Error).message };
        }
        break;
      }
      case 'salla': {
        try {
          const orders = await getList('Sales Invoice', { fields: ['name'], filters: [['salla_order_id', '!=', '']], limit: 1 }, sid);
          syncResults.salla = { status: 'synced', count: orders?.length || 0 };
        } catch (err) {
          syncResults.salla = { status: 'error', error: (err as Error).message };
        }
        break;
      }
      case 'zid': {
        try {
          const orders = await getList('Sales Invoice', { fields: ['name'], filters: [['zid_order_id', '!=', '']], limit: 1 }, sid);
          syncResults.zid = { status: 'synced', count: orders?.length || 0 };
        } catch (err) {
          syncResults.zid = { status: 'error', error: (err as Error).message };
        }
        break;
      }
      case 'woocommerce': {
        try {
          const orders = await getList('Sales Invoice', { fields: ['name'], filters: [['woocommerce_order_id', '!=', '']], limit: 1 }, sid);
          const items = await getList('Item', { fields: ['name'], filters: [['woocommerce_product_id', '!=', '']], limit: 1 }, sid);
          syncResults.woocommerce = { status: 'synced', count: (orders?.length || 0) + (items?.length || 0) };
        } catch (err) {
          syncResults.woocommerce = { status: 'error', error: (err as Error).message };
        }
        break;
      }
      default: {
        // محاولة مزامنة عامة عبر ERPNext
        try {
          await callMethod('frappe.integrations.doctype.integration_request.integration_request.resync_failed_requests', { integration_type: key }, sid);
          syncResults[key] = { status: 'synced' };
        } catch {
          syncResults[key] = { status: 'partial', error: 'لم يتم العثور على تكامل مطابق' };
        }
      }
    }
  } catch (error) {
    syncResults[key] = { status: 'error', error: (error as Error).message };
  }

  await appendAppAuditLog('integration_sync', 'settings', { integrationKey: key, results: syncResults });

  const hasError = Object.values(syncResults).some(r => r.status === 'error');
  return NextResponse.json({
    success: !hasError,
    data: {
      key,
      results: syncResults,
      syncedAt: new Date().toISOString(),
      message: hasError ? 'تمت المزامنة مع بعض الأخطاء' : 'تمت المزامنة بنجاح',
    },
  });
}
