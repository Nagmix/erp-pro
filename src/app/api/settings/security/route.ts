import { NextRequest, NextResponse } from 'next/server';
import { loadSecurityUiSettings, saveSecurityUiSettings } from '@/lib/server/security-settings-store';

export async function GET() {
  return NextResponse.json({ success: true, data: loadSecurityUiSettings() });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<{
    minPasswordLength: number;
    sessionHours: number;
    ipRestriction: boolean;
    allowedIps: string;
  }>;
  const data = saveSecurityUiSettings({
    minPasswordLength: Math.max(6, Number(body.minPasswordLength) || 10),
    sessionHours: Math.max(1, Number(body.sessionHours) || 8),
    ipRestriction: Boolean(body.ipRestriction),
    allowedIps: typeof body.allowedIps === 'string' ? body.allowedIps : '',
  });
  return NextResponse.json({ success: true, data });
}
