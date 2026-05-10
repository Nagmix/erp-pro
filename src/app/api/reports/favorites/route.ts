import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'report-favorites.json');

type Fav = { id: string; reportId: string; title: string; createdAt: string };

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readAll(): Record<string, Fav[]> {
  try {
    if (!existsSync(FILE_PATH)) return {};
    return JSON.parse(readFileSync(FILE_PATH, 'utf-8')) as Record<string, Fav[]>;
  } catch { return {}; }
}

function writeAll(data: Record<string, Fav[]>) {
  ensureDataDir();
  writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET(request: NextRequest) {
  const user = request.cookies.get('erp_user')?.value || 'default';
  const all = readAll();
  return NextResponse.json({ success: true, data: all[user] || [] });
}

export async function POST(request: NextRequest) {
  const user = request.cookies.get('erp_user')?.value || 'default';
  const body = (await request.json()) as { reportId: string; title: string };
  const all = readAll();
  const list = all[user] || [];
  const next: Fav = { id: `${Date.now()}`, reportId: body.reportId, title: body.title, createdAt: new Date().toISOString() };
  list.unshift(next);
  all[user] = list.slice(0, 50);
  writeAll(all);
  return NextResponse.json({ success: true, data: next });
}

export async function DELETE(request: NextRequest) {
  const user = request.cookies.get('erp_user')?.value || 'default';
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
  const all = readAll();
  const list = (all[user] || []).filter((x) => x.id !== id);
  all[user] = list;
  writeAll(all);
  return NextResponse.json({ success: true, data: true });
}
