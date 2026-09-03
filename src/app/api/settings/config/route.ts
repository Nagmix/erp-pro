import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { z } from 'zod';
import { getUserRolesFromRequest, isSystemManager } from '@/lib/server/request-session';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';

/**
 * MED-11: مخزن مفاتيح/قيم التطبيق.
 *
 * قبل الإصلاح كان:
 *  - يكتب في app-config.json (ملف حالة الإعداد!) — أي كتابة كانت ستمحو
 *    علامة setupComplete وتكسر حارس الإعداد في proxy.ts.
 *  - بلا مخطط تحقق: أي مفتاح/قيمة بأي شكل.
 *  - بلا بوابة أدوار: أي مستخدم مسجل يقرأ ويكتب.
 *
 * الآن:
 *  - ملف مستقل data/app-settings.json (لا يمس app-config.json إطلاقاً).
 *  - مخطط zod صارم للمفتاح والقيمة (حجم وشكل JSON آمن).
 *  - قراءة وكتابة لمدراء النظام فقط.
 */

const DATA_DIR = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
const SETTINGS_PATH = path.join(DATA_DIR, 'app-settings.json');
const LEGACY_APP_CONFIG_PATH = path.join(DATA_DIR, 'app-config.json');

type ConfigRow = { key: string; value: unknown; updatedAt: string };

// مخطط المفتاح: معرف آمن (لا مسارات، لا مسافات، طول معقول)
const keySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_.-]+$/, 'المفتاح يحتمل حروفاً إنجليزية وأرقاماً و _ . - فقط');

// مخطط القيمة: JSON آمن بحجم محدود (نص/رقم/منطقي/null/كائن/مصفوفة بعمق معقول)
const valueSchema = z
  .union([
    z.string().max(4096),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.union([z.string().max(1024), z.number(), z.boolean(), z.null()])).max(200),
    z.record(z.string(), z.union([z.string().max(1024), z.number(), z.boolean(), z.null()])).refine(
      (obj) => Object.keys(obj).length <= 100,
      'الكائن يحتوي مفاتيح أكثر من الحد المسموح'
    ),
  ]);

const postSchema = z.object({ key: keySchema, value: valueSchema });
const putSchema = z.object({
  values: z
    .array(z.object({ key: keySchema, value: valueSchema }))
    .min(1)
    .max(100),
});

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** ترحيل لمرة واحدة: صفوف KV قديمة كانت تُكتب خطأً داخل app-config.json */
function migrateLegacyRows(): Map<string, ConfigRow> {
  const map = new Map<string, ConfigRow>();
  try {
    if (!existsSync(LEGACY_APP_CONFIG_PATH)) return map;
    const raw = readFileSync(LEGACY_APP_CONFIG_PATH, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    // app-config.json الصحيح كائن حالة إعداد ({ setupComplete }) — ليس مصفوفة
    if (!Array.isArray(parsed)) return map;
    for (const row of parsed as ConfigRow[]) {
      if (row && typeof row.key === 'string' && keySchema.safeParse(row.key).success) {
        map.set(row.key, { key: row.key, value: row.value, updatedAt: row.updatedAt || new Date().toISOString() });
      }
    }
    if (map.size > 0) {
      writeStore(map); // انقلها للملف المستقل فوراً
    }
  } catch {
    /* تجاهل — الملف إما سليم (كائن) أو تالف */
  }
  return map;
}

function readStore(): Map<string, ConfigRow> {
  const map = new Map<string, ConfigRow>();
  try {
    if (!existsSync(SETTINGS_PATH)) return migrateLegacyRows();
    const raw = readFileSync(SETTINGS_PATH, 'utf-8');
    const data = JSON.parse(raw) as ConfigRow[];
    if (!Array.isArray(data)) return migrateLegacyRows();
    for (const row of data) {
      if (row && typeof row.key === 'string') {
        map.set(row.key, row);
      }
    }
  } catch {
    // الملف غير موجود أو تالف — ابدأ من جديد
  }
  return map;
}

function writeStore(map: Map<string, ConfigRow>) {
  ensureDataDir();
  // حد أقصى إجمالي لعدد الصفوف لمنع تضخم الملف
  const rows = Array.from(map.values()).slice(-500);
  writeFileSync(SETTINGS_PATH, JSON.stringify(rows, null, 2), 'utf-8');
}

function forbidden() {
  return NextResponse.json(
    { success: false, error: 'إعدادات التطبيق تتطلب صلاحية مدير النظام' },
    { status: 403 }
  );
}

export async function GET(request: NextRequest) {
  if (!isSystemManager(getUserRolesFromRequest(request))) return forbidden();
  try {
    const store = readStore();
    return NextResponse.json({ success: true, data: Array.from(store.values()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل قراءة الإعدادات';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSystemManager(getUserRolesFromRequest(request))) return forbidden();
  try {
    const parsed = postSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'مفتاح أو قيمة غير صالحة', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { key, value } = parsed.data;
    const store = readStore();
    const row: ConfigRow = { key, value, updatedAt: new Date().toISOString() };
    store.set(key, row);
    writeStore(store);
    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل حفظ الإعداد';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isSystemManager(getUserRolesFromRequest(request))) return forbidden();
  try {
    const parsed = putSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'بيانات غير صالحة', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const store = readStore();
    for (const item of parsed.data.values) {
      store.set(item.key, { key: item.key, value: item.value, updatedAt: new Date().toISOString() });
    }
    writeStore(store);
    return NextResponse.json({ success: true, data: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل حفظ الإعدادات';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
