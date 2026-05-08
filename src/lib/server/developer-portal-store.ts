/**
 * تخزين دائم لمفاتيح API والويب هوكس التجريبية (بوابة المطور).
 * المسار: <project>/data/developer-portal.json (مُستثنى من git)
 */
import fs from 'fs';
import path from 'path';

const FILE_NAME = 'developer-portal.json';
const MAX_DELIVERIES = 500;

export type ApiKeyScope = 'read' | 'write' | 'reports' | 'webhooks' | 'admin';

export type ApiKeyRow = {
  id: string;
  label: string;
  key: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  revokedAt?: string;
  lastUsedAt?: string;
};

export type WebhookRow = { id: string; event: string; url: string; createdAt: string };

export type DeliveryRow = {
  id: string;
  webhookId: string;
  event: string;
  payload: unknown;
  status: 'queued' | 'delivered' | 'failed';
  attempts: number;
  lastError?: string;
  nextRetryAt?: string;
  deliveredAt?: string;
};

export type DeveloperPortalFile = {
  apiKeys: ApiKeyRow[];
  webhooks: WebhookRow[];
  deliveries: DeliveryRow[];
  updatedAt?: string;
};

function filePath(): string {
  const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dir, FILE_NAME);
}

export function loadDeveloperPortalStore(): DeveloperPortalFile {
  const fp = filePath();
  try {
    const raw = fs.readFileSync(fp, 'utf8');
    const data = JSON.parse(raw) as DeveloperPortalFile;
    return {
      apiKeys: Array.isArray(data.apiKeys) ? data.apiKeys : [],
      webhooks: Array.isArray(data.webhooks) ? data.webhooks : [],
      deliveries: Array.isArray(data.deliveries) ? data.deliveries : [],
      updatedAt: data.updatedAt,
    };
  } catch {
    return { apiKeys: [], webhooks: [], deliveries: [] };
  }
}

function normalizeFile(data: Partial<DeveloperPortalFile>): DeveloperPortalFile {
  return {
    apiKeys: Array.isArray(data.apiKeys) ? data.apiKeys : [],
    webhooks: Array.isArray(data.webhooks) ? data.webhooks : [],
    deliveries: Array.isArray(data.deliveries) ? data.deliveries : [],
    updatedAt: data.updatedAt,
  };
}

async function mirrorToDatabase(payload: DeveloperPortalFile): Promise<void> {
  try {
    const { prisma } = await import('@/lib/server/prisma');
    await prisma.developerPortalBackup.upsert({
      where: { id: 'default' },
      create: { id: 'default', payload: JSON.stringify(payload) },
      update: { payload: JSON.stringify(payload) },
    });
  } catch {
    /* لا قاعدة */
  }
}

export function saveDeveloperPortalStore(next: DeveloperPortalFile): void {
  const fp = filePath();
  const dir = path.dirname(fp);
  fs.mkdirSync(dir, { recursive: true });
  let deliveries = next.deliveries;
  if (deliveries.length > MAX_DELIVERIES) {
    deliveries = deliveries.slice(0, MAX_DELIVERIES);
  }
  const payload: DeveloperPortalFile = {
    apiKeys: next.apiKeys,
    webhooks: next.webhooks,
    deliveries,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(fp, JSON.stringify(payload, null, 2), 'utf8');
  void mirrorToDatabase(payload);
}

/** يدمج ملف JSON مع SQLite ويختار الأحدث محتوىً عند وجود البيانات في المصدرين (M-22). */
export async function loadDeveloperPortalStoreResolved(): Promise<DeveloperPortalFile> {
  const fromFile = loadDeveloperPortalStore();
  let fromDb: DeveloperPortalFile | null = null;
  let dbTime = 0;
  try {
    const { prisma } = await import('@/lib/server/prisma');
    const row = await prisma.developerPortalBackup.findUnique({ where: { id: 'default' } });
    if (row?.payload) {
      fromDb = normalizeFile(JSON.parse(row.payload) as Partial<DeveloperPortalFile>);
      dbTime = row.updatedAt.getTime();
    }
  } catch {
    /* ignore */
  }

  const fileTime = fromFile.updatedAt ? Date.parse(fromFile.updatedAt) : 0;
  const fileHas =
    fromFile.apiKeys.length > 0 || fromFile.webhooks.length > 0 || (fromFile.deliveries?.length ?? 0) > 0;
  const dbHas =
    fromDb != null &&
    (fromDb.apiKeys.length > 0 || fromDb.webhooks.length > 0 || (fromDb.deliveries?.length ?? 0) > 0);

  if (fileHas && dbHas && fromDb) {
    return fileTime >= dbTime ? fromFile : fromDb;
  }
  if (fileHas) return fromFile;
  if (dbHas && fromDb) return fromDb;
  return fromFile;
}
