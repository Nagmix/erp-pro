import { prisma } from '@/lib/server/prisma';

/** سجل أحداث محلي (إعدادات SMTP، إلخ) — يفشل صامتاً إذا لم يُمهَّأ SQLite. */
export async function appendAppAuditLog(action: string, subject?: string, payload?: unknown): Promise<void> {
  try {
    let payloadStr: string | null = null;
    if (payload !== undefined) {
      const s = JSON.stringify(payload);
      payloadStr = s.length > 12000 ? `${s.slice(0, 12000)}…` : s;
    }
    await prisma.appAuditLog.create({
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
