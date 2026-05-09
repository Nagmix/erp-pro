/**
 * إعدادات منصات التجارة الإلكترونية — تخزين دائم (ملف + مرآة SQLite).
 * يحلّ محلّ localStorage في واجهة ربط المتاجر الإلكترونية.
 */
import fs from 'fs';
import path from 'path';
import { getDoc, updateDoc, createDoc } from './backend';

const FILE_NAME = 'ecommerce-platform.json';

const ERPNEXT_DOCTYPE = 'Ecommerce Integration Settings';
const ERPNEXT_DOC_NAME = 'Config';

export type PlatformId = 'salla' | 'zid' | 'shopify' | 'woocommerce';

export type PlatformConfig = {
  platform: PlatformId;
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  storeUrl: string;
  syncProducts: boolean;
  syncOrders: boolean;
  syncStock: boolean;
  syncInterval: string;
  syncDirection: string;
  lastSync: string | null;
  lastSyncStatus: 'success' | 'failed' | null;
};

export type EcommercePlatformSettings = {
  platforms: PlatformConfig[];
};

function filePath(): string {
  const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dir, FILE_NAME);
}

const defaultPlatform = (platform: PlatformId): PlatformConfig => ({
  platform,
  apiUrl: '',
  apiKey: '',
  apiSecret: '',
  storeUrl: '',
  syncProducts: false,
  syncOrders: false,
  syncStock: false,
  syncInterval: '1h',
  syncDirection: 'import',
  lastSync: null,
  lastSyncStatus: null,
});

const defaults = (): EcommercePlatformSettings => ({
  platforms: [
    defaultPlatform('salla'),
    defaultPlatform('zid'),
    defaultPlatform('shopify'),
    defaultPlatform('woocommerce'),
  ],
});

/** Load from local JSON only (sync, for internal use) */
function loadEcommercePlatformSettingsLocal(): EcommercePlatformSettings {
  try {
    const raw = fs.readFileSync(filePath(), 'utf8');
    const data = JSON.parse(raw) as Partial<EcommercePlatformSettings>;
    const base = defaults();
    if (Array.isArray(data.platforms)) {
      const platformIds: PlatformId[] = ['salla', 'zid', 'shopify', 'woocommerce'];
      for (const pid of platformIds) {
        if (!data.platforms.find((p) => p.platform === pid)) {
          data.platforms.push(defaultPlatform(pid));
        }
      }
      base.platforms = data.platforms;
    }
    return base;
  } catch {
    return defaults();
  }
}

async function syncToErpnext(data: EcommercePlatformSettings, sid?: string) {
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
    console.error('[ecommerce-platform] ERPNext sync failed:', (err as Error).message);
  }
}

async function loadFromErpnext(sid?: string): Promise<EcommercePlatformSettings | null> {
  try {
    const doc = await getDoc(ERPNEXT_DOCTYPE, ERPNEXT_DOC_NAME, sid) as Record<string, unknown> | null;
    if (doc?.config_json) {
      const data = JSON.parse(doc.config_json as string) as Partial<EcommercePlatformSettings>;
      const base = defaults();
      if (Array.isArray(data.platforms)) {
        const platformIds: PlatformId[] = ['salla', 'zid', 'shopify', 'woocommerce'];
        for (const pid of platformIds) {
          if (!data.platforms.find((p) => p.platform === pid)) {
            data.platforms.push(defaultPlatform(pid));
          }
        }
        base.platforms = data.platforms;
      }
      return base;
    }
  } catch {
    // Not found or error — fall back to local
  }
  return null;
}

export async function loadEcommercePlatformSettings(sid?: string): Promise<EcommercePlatformSettings> {
  // Try ERPNext first, fall back to local
  const erpData = await loadFromErpnext(sid);
  if (erpData) return erpData;
  return loadEcommercePlatformSettingsLocal();
}

async function mirrorToSqlite(merged: EcommercePlatformSettings): Promise<void> {
  try {
    const { prisma } = await import('@/lib/server/prisma');
    await prisma.appLocalSettings.upsert({
      where: { id: 'ecommerce-platform' },
      create: { id: 'ecommerce-platform', payload: JSON.stringify(merged) },
      update: { payload: JSON.stringify(merged) },
    });
  } catch {
    /* لا قاعدة أو تعذّر Prisma */
  }
}

export function saveEcommercePlatformSettings(next: Partial<EcommercePlatformSettings>, sid?: string): EcommercePlatformSettings {
  const current = loadEcommercePlatformSettingsLocal();
  const merged: EcommercePlatformSettings = {
    platforms: Array.isArray(next.platforms) ? next.platforms : current.platforms,
  };
  // Ensure all 4 platforms exist
  const platformIds: PlatformId[] = ['salla', 'zid', 'shopify', 'woocommerce'];
  for (const pid of platformIds) {
    if (!merged.platforms.find((p) => p.platform === pid)) {
      merged.platforms.push(defaultPlatform(pid));
    }
  }
  const fp = filePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(merged, null, 2), 'utf8');
  void mirrorToSqlite(merged);
  // Non-blocking ERPNext sync
  syncToErpnext(merged, sid).catch(() => {});
  return merged;
}

/** Update a single platform config */
export function updatePlatformConfig(
  platform: PlatformId,
  patch: Partial<PlatformConfig>,
  sid?: string,
): EcommercePlatformSettings {
  const current = loadEcommercePlatformSettingsLocal();
  const platforms = current.platforms.map((p) =>
    p.platform === platform ? { ...p, ...patch, platform } : p
  );
  return saveEcommercePlatformSettings({ platforms }, sid);
}

/** دمج ملف `data/` مع SQLite — يفضّل الأحدث حسب `updatedAt`. */
export async function loadEcommercePlatformSettingsResolved(): Promise<EcommercePlatformSettings> {
  const fp = filePath();
  let fromFile: EcommercePlatformSettings;
  let fileMtime = 0;
  try {
    const st = fs.statSync(fp);
    fileMtime = st.mtimeMs;
    const raw = fs.readFileSync(fp, 'utf8');
    fromFile = { ...defaults(), ...(JSON.parse(raw) as Partial<EcommercePlatformSettings>) };
  } catch {
    fromFile = defaults();
    fileMtime = 0;
  }

  try {
    const { prisma } = await import('@/lib/server/prisma');
    const row = await prisma.appLocalSettings.findUnique({ where: { id: 'ecommerce-platform' } });
    if (!row?.payload) return fromFile;
    const fromDb = { ...defaults(), ...(JSON.parse(row.payload) as Partial<EcommercePlatformSettings>) };
    const fileHasData = fromFile.platforms.some((p) => p.apiKey || p.storeUrl);
    const dbHasData = fromDb.platforms.some((p) => p.apiKey || p.storeUrl);
    if (fileHasData && dbHasData) {
      return fileMtime >= row.updatedAt.getTime() ? fromFile : fromDb;
    }
    if (fileHasData) return fromFile;
    if (dbHasData) return fromDb;
    return fromFile;
  } catch {
    return fromFile;
  }
}
