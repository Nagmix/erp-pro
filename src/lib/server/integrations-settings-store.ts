/**
 * إعدادات التكاملات المحفوظة محلياً (عرض تخطيط — M-26).
 */
import fs from 'fs';
import path from 'path';

const FILE_NAME = 'integrations-local.json';

export type IntegrationsLocalSettings = {
  shopify: string;
  salla: string;
  zid: string;
  woo: string;
  smsProvider: string;
  waProvider: string;
  notes: string;
};

function filePath(): string {
  const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dir, FILE_NAME);
}

const defaults = (): IntegrationsLocalSettings => ({
  shopify: '',
  salla: '',
  zid: '',
  woo: '',
  smsProvider: 'Unifonic',
  waProvider: 'Meta',
  notes: '',
});

export function loadIntegrationsLocal(): IntegrationsLocalSettings {
  try {
    const raw = fs.readFileSync(filePath(), 'utf8');
    const data = JSON.parse(raw) as Partial<IntegrationsLocalSettings>;
    return { ...defaults(), ...data };
  } catch {
    return defaults();
  }
}

async function mirrorIntegrationsToSqlite(merged: IntegrationsLocalSettings): Promise<void> {
  try {
    const { prisma } = await import('@/lib/server/prisma');
    await prisma.appLocalSettings.upsert({
      where: { id: 'integrations' },
      create: { id: 'integrations', payload: JSON.stringify(merged) },
      update: { payload: JSON.stringify(merged) },
    });
  } catch {
    /* لا قاعدة أو تعذّر Prisma */
  }
}

export function saveIntegrationsLocal(next: IntegrationsLocalSettings): IntegrationsLocalSettings {
  const fp = filePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  const merged = { ...defaults(), ...next };
  fs.writeFileSync(fp, JSON.stringify(merged, null, 2), 'utf8');
  void mirrorIntegrationsToSqlite(merged);
  return merged;
}

/** دمج ملف `data/` مع SQLite عند القراءة من الخادم — يفضّل الأحدث حسب `updatedAt` في قاعدة البيانات مقابل وقت الملف. */
export async function loadIntegrationsLocalResolved(): Promise<IntegrationsLocalSettings> {
  const fp = filePath();
  let fromFile: IntegrationsLocalSettings;
  let fileMtime = 0;
  try {
    const st = fs.statSync(fp);
    fileMtime = st.mtimeMs;
    const raw = fs.readFileSync(fp, 'utf8');
    fromFile = { ...defaults(), ...(JSON.parse(raw) as Partial<IntegrationsLocalSettings>) };
  } catch {
    fromFile = defaults();
    fileMtime = 0;
  }

  try {
    const { prisma } = await import('@/lib/server/prisma');
    const row = await prisma.appLocalSettings.findUnique({ where: { id: 'integrations' } });
    if (!row?.payload) return fromFile;
    const fromDb = { ...defaults(), ...(JSON.parse(row.payload) as Partial<IntegrationsLocalSettings>) };
    const dbTime = row.updatedAt.getTime();
    const fileNonEmpty =
      (fromFile.shopify || '').trim() ||
      (fromFile.salla || '').trim() ||
      (fromFile.zid || '').trim() ||
      (fromFile.woo || '').trim();
    const dbNonEmpty =
      (fromDb.shopify || '').trim() ||
      (fromDb.salla || '').trim() ||
      (fromDb.zid || '').trim() ||
      (fromDb.woo || '').trim();
    if (fileNonEmpty && dbNonEmpty) {
      return fileMtime >= dbTime ? fromFile : fromDb;
    }
    if (fileNonEmpty) return fromFile;
    if (dbNonEmpty) return fromDb;
    return fromFile;
  } catch {
    return fromFile;
  }
}
