import { NextRequest, NextResponse } from 'next/server';
import { appendAppAuditLog } from '@/lib/server/app-audit-log';
import { loadSmtpConfig, saveSmtpConfig, type SmtpConfigPersisted } from '@/lib/server/smtp-config-store';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


export async function GET() {
  const cfg = await loadSmtpConfig();
  if (!cfg) {
    return NextResponse.json({
      success: true,
      data: null,
      hasPass: false,
    });
  }
  return NextResponse.json({
    success: true,
    data: {
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      user: cfg.user,
      fromEmail: cfg.fromEmail,
      fromName: cfg.fromName ?? '',
      updatedAt: cfg.updatedAt,
    },
    hasPass: Boolean(cfg.pass?.length),
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<SmtpConfigPersisted>;
  const prev = await loadSmtpConfig();
  const merged: Omit<SmtpConfigPersisted, 'updatedAt'> = {
    host: typeof body.host === 'string' ? body.host.trim() : prev?.host ?? '',
    port: Number(body.port) || prev?.port || 587,
    secure: Boolean(body.secure),
    user: typeof body.user === 'string' ? body.user.trim() : prev?.user ?? '',
    pass:
      typeof body.pass === 'string' && body.pass.length > 0 ? body.pass : (prev?.pass ?? ''),
    fromEmail: typeof body.fromEmail === 'string' ? body.fromEmail.trim() : prev?.fromEmail ?? '',
    fromName: typeof body.fromName === 'string' ? body.fromName.trim() : prev?.fromName ?? '',
  };
  if (!merged.host || !merged.fromEmail) {
    return NextResponse.json({ success: false, error: 'host و fromEmail مطلوبان' }, { status: 400 });
  }
  const saved = saveSmtpConfig(merged);
  await appendAppAuditLog('smtp_settings_saved', 'settings', {
    host: saved.host,
    port: saved.port,
    fromEmail: saved.fromEmail,
  });
  return NextResponse.json({
    success: true,
    data: {
      host: saved.host,
      port: saved.port,
      secure: saved.secure,
      user: saved.user,
      fromEmail: saved.fromEmail,
      fromName: saved.fromName ?? '',
      updatedAt: saved.updatedAt,
    },
    hasPass: Boolean(saved.pass?.length),
  });
}
