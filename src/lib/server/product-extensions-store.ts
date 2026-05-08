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

const FILE = 'product-extensions-settings.json';

export type { ProductExtensionsSettings, ReportScheduleRow } from '@/lib/product-extensions-settings.shared';

const defaults = PRODUCT_EXTENSIONS_DEFAULTS;

function filePath(): string {
  const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dir, FILE);
}

export function loadProductExtensionsSettings(): ProductExtensionsSettings {
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

export function saveProductExtensionsSettings(next: ProductExtensionsSettings): void {
  const p = filePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(
    p,
    JSON.stringify({ ...next, updatedAt: new Date().toISOString() }, null, 2),
    'utf8'
  );
}
