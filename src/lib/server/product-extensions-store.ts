/**
 * إعدادات امتدادات المنتج (SMS، متاجر، جدولة تقارير محلية) — طبقة ERP Pro.
 * ليست بديل تكامل ERPNext الكامل؛ تُخزَّن للواجهة والربط اللاحق.
 */
import fs from 'fs';
import path from 'path';
import {
  PRODUCT_EXTENSIONS_DEFAULTS,
  type ProductExtensionsSettings,
} from '@/lib/product-extensions-settings.shared';
import { getDoc, updateDoc, createDoc } from './backend';

const FILE = 'product-extensions-settings.json';

const ERPNEXT_DOCTYPE = 'Product Extension Settings';
const ERPNEXT_DOC_NAME = 'Config';

export type { ProductExtensionsSettings, ReportScheduleRow } from '@/lib/product-extensions-settings.shared';

const defaults = PRODUCT_EXTENSIONS_DEFAULTS;

function filePath(): string {
  const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dir, FILE);
}

/** Load from local JSON only (sync, for internal use) */
function loadProductExtensionsSettingsLocal(): ProductExtensionsSettings {
  try {
    const raw = fs.readFileSync(filePath(), 'utf8');
    const j = JSON.parse(raw) as Partial<ProductExtensionsSettings>;
    return {
      ...defaults,
      ...j,
      sms: { ...defaults.sms, ...j.sms },
      ecommerce: {
        salla: { ...defaults.ecommerce.salla, ...j.ecommerce?.salla },
        zid: { ...defaults.ecommerce.zid, ...j.ecommerce?.zid },
        shopify: { ...defaults.ecommerce.shopify, ...j.ecommerce?.shopify },
      },
      reportSchedules: Array.isArray(j.reportSchedules) ? j.reportSchedules : [],
    };
  } catch {
    return { ...defaults };
  }
}

async function syncToErpnext(data: ProductExtensionsSettings, sid?: string) {
  try {
    const existing = await getDoc(ERPNEXT_DOCTYPE, ERPNEXT_DOC_NAME, sid).catch(() => null);
    const jsonStr = JSON.stringify(data);
    if (existing) {
      await updateDoc(ERPNEXT_DOCTYPE, ERPNEXT_DOC_NAME, { config_json: jsonStr }, sid);
    } else {
      await createDoc(ERPNEXT_DOCTYPE, {
        doctype: ERPNEXT_DOCTYPE,
        name: ERPNEXT_DOC_NAME,
        __newname: ERPNEXT_DOC_NAME,
        config_json: jsonStr,
      }, sid);
    }
  } catch (err) {
    console.error('[product-extensions] ERPNext sync failed:', (err as Error).message);
  }
}

async function loadFromErpnext(sid?: string): Promise<ProductExtensionsSettings | null> {
  try {
    const doc = await getDoc(ERPNEXT_DOCTYPE, ERPNEXT_DOC_NAME, sid) as Record<string, unknown> | null;
    if (doc?.config_json) {
      const j = JSON.parse(doc.config_json as string) as Partial<ProductExtensionsSettings>;
      return {
        ...defaults,
        ...j,
        sms: { ...defaults.sms, ...j.sms },
        ecommerce: {
          salla: { ...defaults.ecommerce.salla, ...j.ecommerce?.salla },
          zid: { ...defaults.ecommerce.zid, ...j.ecommerce?.zid },
          shopify: { ...defaults.ecommerce.shopify, ...j.ecommerce?.shopify },
        },
        reportSchedules: Array.isArray(j.reportSchedules) ? j.reportSchedules : [],
      };
    }
  } catch {
    // Not found or error — fall back to local
  }
  return null;
}

export async function loadProductExtensionsSettings(sid?: string): Promise<ProductExtensionsSettings> {
  // Try ERPNext first, fall back to local
  const erpData = await loadFromErpnext(sid);
  if (erpData) return erpData;
  return loadProductExtensionsSettingsLocal();
}

export function saveProductExtensionsSettings(next: ProductExtensionsSettings, sid?: string): void {
  const p = filePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const data = { ...next, updatedAt: new Date().toISOString() };
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  // Non-blocking ERPNext sync
  syncToErpnext(data, sid).catch(() => {});
}
