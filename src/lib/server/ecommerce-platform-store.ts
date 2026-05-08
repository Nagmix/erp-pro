/**
 * إعدادات منصات التجارة الإلكترونية — تخزين دائم (ملف + مرآة SQLite).
 * يحلّ محلّ localStorage في واجهة ربط المتاجر الإلكترونية.
 */
import fs from 'fs';
import path from 'path';

const FILE_NAME = 'ecommerce-platform.json';

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

export function loadEcommercePlatformSettings(): EcommercePlatformSettings {
  try {
    const raw = fs.readFileSync(filePath(), 'utf8');
    const data = JSON.parse(raw) as Partial<EcommercePlatformSettings>;
    const base = defaults();
    if (Array.isArray(data.platforms)) {
      // Ensure all 4 platforms exist
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

export function saveEcommercePlatformSettings(next: Partial<EcommercePlatformSettings>): EcommercePlatformSettings {
  const current = loadEcommercePlatformSettings();
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
  return merged;
}

/** Update a single platform config */
export function updatePlatformConfig(
  platform: PlatformId,
  patch: Partial<PlatformConfig>
): EcommercePlatformSettings {
  const current = loadEcommercePlatformSettings();
  const platforms = current.platforms.map((p) =>
    p.platform === platform ? { ...p, ...patch, platform } : p
  );
  return saveEcommercePlatformSettings({ platforms });
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
