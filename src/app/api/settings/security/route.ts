import { NextRequest, NextResponse } from 'next/server';
import { loadSecurityUiSettings, saveSecurityUiSettings, type SecurityUiSettings } from '@/lib/server/security-settings-store';

export async function GET() {
  return NextResponse.json({ success: true, data: loadSecurityUiSettings() });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<SecurityUiSettings>;
  const data = saveSecurityUiSettings({
    minPasswordLength: Math.max(6, Number(body.minPasswordLength) || 10),
    requireUppercase: Boolean(body.requireUppercase),
    requireLowercase: Boolean(body.requireLowercase),
    requireNumbers: Boolean(body.requireNumbers),
    requireSymbols: Boolean(body.requireSymbols),
    sessionHours: Math.max(1, Number(body.sessionHours) || 8),
    simultaneousSessions: Math.max(1, Number(body.simultaneousSessions) || 3),
    forcePasswordReset: Boolean(body.forcePasswordReset),
    forcePasswordResetDays: Math.max(7, Number(body.forcePasswordResetDays) || 90),
    twoFactorEnabled: Boolean(body.twoFactorEnabled),
    twoFactorMethod: typeof body.twoFactorMethod === 'string' ? body.twoFactorMethod : 'OTP App',
    maxLoginAttempts: Math.max(1, Number(body.maxLoginAttempts) || 5),
    lockoutDuration: Math.max(1, Number(body.lockoutDuration) || 15),
    ipRestriction: Boolean(body.ipRestriction),
    allowedIps: typeof body.allowedIps === 'string' ? body.allowedIps : '',
  });
  return NextResponse.json({ success: true, data });
}
