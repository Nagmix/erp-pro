import { NextRequest, NextResponse } from 'next/server';
import { callMethod } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';
import { writeFile, readFile, mkdir, unlink, readdir, stat } from 'fs/promises';
import { join, basename, resolve, sep } from 'path';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


// ============================================================
// Types
// ============================================================

type BackupRecord = {
  id: string;
  name: string;
  date: string;
  size: number;
  type: 'database' | 'files' | 'full';
  status: 'completed' | 'failed' | 'in_progress';
  erpnextBackupId?: string;
};

type BackupIndex = {
  backups: BackupRecord[];
  autoBackupEnabled: boolean;
  autoBackupFrequency: 'daily' | 'weekly' | 'monthly';
  retentionCount: number;
};

const DATA_DIR = join(process.cwd(), 'data', 'backups');
const INDEX_FILE = join(DATA_DIR, 'backups-index.json');

// ============================================================
// Helpers
// ============================================================

async function ensureDataDir(): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    // directory may already exist
  }
}

async function readIndex(): Promise<BackupIndex> {
  const defaults: BackupIndex = {
    backups: [],
    autoBackupEnabled: false,
    autoBackupFrequency: 'daily',
    retentionCount: 10,
  };
  try {
    const raw = await readFile(INDEX_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<BackupIndex>;
    return { ...defaults, ...parsed, backups: Array.isArray(parsed.backups) ? parsed.backups : [] };
  } catch {
    return defaults;
  }
}

async function writeIndex(index: BackupIndex): Promise<void> {
  await ensureDataDir();
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 بايت';
  const units = ['بايت', 'ك.ب', 'م.ب', 'ج.ب', 'ت.ب'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i > 0 ? 1 : 0)} ${units[i] || 'بايت'}`;
}

function generateId(): string {
  return `bak_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================
// GET — List backups
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const sid = getFrappeSidFromRequest(request);
    const index = await readIndex();

    // Try to fetch ERPNext backup info for enrichment
    let erpBackups: unknown[] = [];
    try {
      const raw = await callMethod(
        'frappe.client.get_list',
        {
          doctype: 'Backup Manager',
          fields: ['name', 'creation', 'backup_size', 'backup_type', 'status'],
          limit_page_length: 50,
          limit: 50,
          order_by: 'creation desc',
        },
        sid
      );
      if (Array.isArray(raw)) {
        erpBackups = raw;
      }
    } catch {
      // ERPNext backup list not available — use local only
    }

    // Enrich local records with file sizes from actual files
    const enrichedBackups: BackupRecord[] = [];
    for (const backup of index.backups) {
      let actualSize = backup.size;
      try {
        const filePath = join(DATA_DIR, backup.id);
        const fileStat = await stat(filePath);
        if (fileStat.isFile()) {
          actualSize = fileStat.size;
        }
      } catch {
        // file may not exist, keep recorded size
      }
      enrichedBackups.push({ ...backup, size: actualSize });
    }

    // If ERPNext has backups we don't track locally, add them
    const localIds = new Set(enrichedBackups.map((b) => b.erpnextBackupId).filter(Boolean));
    for (const erp of erpBackups) {
      const e = erp as Record<string, unknown>;
      const erpId = String(e.name ?? '');
      if (localIds.has(erpId)) continue;

      enrichedBackups.push({
        id: generateId(),
        name: `نسخة ERPNext - ${erpId}`,
        date: String(e.creation ?? new Date().toISOString()),
        size: Number(e.backup_size ?? 0),
        type: (String(e.backup_type ?? 'full') as BackupRecord['type']) || 'full',
        status: 'completed' as const,
        erpnextBackupId: erpId,
      });
    }

    // Sort by date descending
    enrichedBackups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Save enriched list back
    index.backups = enrichedBackups;
    await writeIndex(index);

    return NextResponse.json({
      success: true,
      data: {
        backups: enrichedBackups,
        settings: {
          autoBackupEnabled: index.autoBackupEnabled,
          autoBackupFrequency: index.autoBackupFrequency,
          retentionCount: index.retentionCount,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    return NextResponse.json(
      { success: false, error: `فشل تحميل النسخ الاحتياطية: ${message}`, data: [] },
      { status: 500 }
    );
  }
}

// ============================================================
// POST — Create a new backup
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const sid = getFrappeSidFromRequest(request);
    const body = (await request.json().catch(() => ({}))) as { type?: string };
    const backupType: BackupRecord['type'] = (body.type as BackupRecord['type']) || 'full';

    const index = await readIndex();

    // Create an in_progress record immediately
    const newRecord: BackupRecord = {
      id: generateId(),
      name: `نسخة احتياطية - ${new Date().toISOString().slice(0, 10)}`,
      date: new Date().toISOString(),
      size: 0,
      type: backupType,
      status: 'in_progress',
    };

    index.backups.unshift(newRecord);
    await writeIndex(index);

    // Try to trigger ERPNext backup
    let erpnextSuccess = false;
    let erpnextMessage = '';
    let erpnextBackupId: string | undefined;

    try {
      // Try v16 path first: frappe.backup.backup
      try {
        const result = await callMethod(
          'frappe.backup.backup',
          { backup_type: backupType },
          sid
        );
        erpnextSuccess = true;
        erpnextMessage = 'تم إنشاء النسخة الاحتياطية بنجاح';
        if (result && typeof result === 'object') {
          erpnextBackupId = String((result as Record<string, unknown>).name ?? '');
        }
      } catch {
        // Fallback to v15 path: frappe.desk.page.backup.backup.backup
        const result = await callMethod(
          'frappe.desk.page.backup.backup.backup',
          { backup_type: backupType },
          sid
        );
        erpnextSuccess = true;
        erpnextMessage = 'تم إنشاء النسخة الاحتياطية بنجاح';
        if (result && typeof result === 'object') {
          erpnextBackupId = String((result as Record<string, unknown>).name ?? '');
        }
      }
    } catch (erpError) {
      erpnextMessage = erpError instanceof Error ? erpError.message : 'تعذر الاتصال بالخادم';
    }

    // Create a local placeholder file for the backup
    const placeholderContent = JSON.stringify({
      id: newRecord.id,
      type: backupType,
      date: new Date().toISOString(),
      erpnextBackupId,
      erpnextSuccess,
    }, null, 2);

    await ensureDataDir();
    await writeFile(join(DATA_DIR, newRecord.id), placeholderContent, 'utf-8');

    // Update the record
    const fileStat = await stat(join(DATA_DIR, newRecord.id));
    const updatedRecord: BackupRecord = {
      ...newRecord,
      status: erpnextSuccess ? 'completed' : 'failed',
      size: fileStat.size,
      erpnextBackupId,
    };

    // Update in index
    const idx = index.backups.findIndex((b) => b.id === newRecord.id);
    if (idx >= 0) {
      index.backups[idx] = updatedRecord;
    } else {
      index.backups.unshift(updatedRecord);
    }
    await writeIndex(index);

    if (erpnextSuccess) {
      return NextResponse.json({
        success: true,
        data: {
          success: true,
          message: erpnextMessage,
          backup: updatedRecord,
        },
      });
    } else {
      return NextResponse.json({
        success: true,
        data: {
          success: false,
          message: `لم يتم إنشاء النسخة على الخادم: ${erpnextMessage}. تم تسجيل الطلب محلياً.`,
          backup: updatedRecord,
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    return NextResponse.json(
      { success: false, error: `فشل إنشاء النسخة الاحتياطية: ${message}` },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE — Delete a backup
// ============================================================

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف النسخة الاحتياطية مطلوب' },
        { status: 400 }
      );
    }

    const index = await readIndex();
    const backupIndex = index.backups.findIndex((b) => b.id === id);
    if (backupIndex < 0) {
      return NextResponse.json(
        { success: false, error: 'النسخة الاحتياطية غير موجودة' },
        { status: 404 }
      );
    }

    // Delete local file
    try {
      // SEC-13: منع تجاوز المسار — اسم ملف أساسي فقط داخل مجلد البيانات حصراً
      const safeName = basename(id);
      const filePath = join(DATA_DIR, safeName);
      const resolved = resolve(filePath);
      if (!resolved.startsWith(resolve(DATA_DIR) + sep)) {
        return NextResponse.json(
          { success: false, error: 'مسار غير صالح' },
          { status: 400 }
        );
      }
      await unlink(resolved);
    } catch {
      // file may not exist
    }

    // Remove from index
    index.backups.splice(backupIndex, 1);
    await writeIndex(index);

    return NextResponse.json({ success: true, data: { deleted: id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    return NextResponse.json(
      { success: false, error: `فشل حذف النسخة الاحتياطية: ${message}` },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT — Update auto-backup settings
// ============================================================

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      autoBackupEnabled?: boolean;
      autoBackupFrequency?: 'daily' | 'weekly' | 'monthly';
      retentionCount?: number;
    };

    const index = await readIndex();

    if (typeof body.autoBackupEnabled === 'boolean') {
      index.autoBackupEnabled = body.autoBackupEnabled;
    }
    if (body.autoBackupFrequency && ['daily', 'weekly', 'monthly'].includes(body.autoBackupFrequency)) {
      index.autoBackupFrequency = body.autoBackupFrequency;
    }
    if (typeof body.retentionCount === 'number' && body.retentionCount > 0) {
      index.retentionCount = body.retentionCount;
    }

    await writeIndex(index);

    return NextResponse.json({
      success: true,
      data: {
        autoBackupEnabled: index.autoBackupEnabled,
        autoBackupFrequency: index.autoBackupFrequency,
        retentionCount: index.retentionCount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    return NextResponse.json(
      { success: false, error: `فشل تحديث الإعدادات: ${message}` },
      { status: 500 }
    );
  }
}
