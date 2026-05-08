import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'report-schedules.json');

type Schedule = {
  id: string;
  reportId: string;
  cron: string;
  emailTo: string;
  format: 'csv' | 'excel' | 'pdf';
  enabled: boolean;
};

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readSchedules(): Schedule[] {
  try {
    if (!existsSync(FILE_PATH)) return [];
    return JSON.parse(readFileSync(FILE_PATH, 'utf-8')) as Schedule[];
  } catch { return []; }
}

function writeSchedules(data: Schedule[]) {
  ensureDataDir();
  writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  const schedules = readSchedules();
  return NextResponse.json({ success: true, data: schedules });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Omit<Schedule, 'id'>;
  const schedules = readSchedules();
  const row: Schedule = { ...body, id: `${Date.now()}` };
  schedules.unshift(row);
  writeSchedules(schedules);
  return NextResponse.json({ success: true, data: row });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as { id: string; enabled: boolean };
  const schedules = readSchedules();
  const idx = schedules.findIndex((x) => x.id === body.id);
  if (idx < 0) return NextResponse.json({ success: false, error: 'not found' }, { status: 404 });
  schedules[idx] = { ...schedules[idx]!, enabled: body.enabled };
  writeSchedules(schedules);
  return NextResponse.json({ success: true, data: schedules[idx] });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
  const schedules = readSchedules();
  const idx = schedules.findIndex((x) => x.id === id);
  if (idx < 0) return NextResponse.json({ success: false, error: 'not found' }, { status: 404 });
  schedules.splice(idx, 1);
  writeSchedules(schedules);
  return NextResponse.json({ success: true });
}
