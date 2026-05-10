/**
 * سجل أحداث محلي (إعدادات SMTP، إلخ) — يفشل صامتاً إذا لم يُمهَّأ SQLite.
 *
 * Uses lazy import to avoid Prisma initialization errors during `next build`.
 */

let _prisma: typeof import('./prisma').prisma | null = null;

async function getPrisma() {
  if (!_prisma) {
    const mod = await import('./prisma');
    _prisma = mod.prisma;
  }
  return _prisma;
}

export async function appendAppAuditLog(action: string, subject?: string, payload?: unknown): Promise<void> {
  try {
    let payloadStr: string | null = null;
    if (payload !== undefined) {
      const s = JSON.stringify(payload);
      payloadStr = s.length > 12000 ? `${s.slice(0, 12000)}…` : s;
    }
    const p = await getPrisma();
    await p.appAuditLog.create({
      data: {
        action,
        subject: subject ?? null,
        payload: payloadStr,
      },
    });
  } catch {
    /* قاعدة غير جاهزة أو خطأ كتابة */
  }
}
