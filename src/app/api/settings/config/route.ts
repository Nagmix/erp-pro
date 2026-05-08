import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'app-config.json');

type ConfigRow = { key: string; value: unknown; updatedAt: string };

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore(): Map<string, ConfigRow> {
  const map = new Map<string, ConfigRow>();
  try {
    if (!existsSync(CONFIG_PATH)) return map;
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const data = JSON.parse(raw) as ConfigRow[];
    for (const row of data) {
      map.set(row.key, row);
    }
  } catch {
    // File doesn't exist or is corrupted — start fresh
  }
  return map;
}

function writeStore(map: Map<string, ConfigRow>) {
  ensureDataDir();
  const data = Array.from(map.values());
  writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const store = readStore();
    return NextResponse.json({ success: true, data: Array.from(store.values()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل قراءة الإعدادات';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { key: string; value: unknown };
    if (!body.key) return NextResponse.json({ success: false, error: 'key required' }, { status: 400 });
    const store = readStore();
    const row: ConfigRow = { key: body.key, value: body.value, updatedAt: new Date().toISOString() };
    store.set(body.key, row);
    writeStore(store);
    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل حفظ الإعداد';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { values: Array<{ key: string; value: unknown }> };
    const store = readStore();
    for (const item of body.values || []) {
      store.set(item.key, { key: item.key, value: item.value, updatedAt: new Date().toISOString() });
    }
    writeStore(store);
    return NextResponse.json({ success: true, data: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل حفظ الإعدادات';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
