/**
 * MED-04: قائمة إبطال قصيرة لمعرّفات التوكن (jti) في Redis.
 *
 * - عند logout: يُسجَّل jti الحالي مبطلًا حتى انتهاء صلاحيته الطبيعية.
 * - عند refresh: يُرفض التوكن المبطل، ويُبطل jti القديم بعد إصدار الجديد
 *   (تدوير) حتى لا يمكن إعادة استخدام توكن قديم تم تجديده.
 *
 * بلا Redis (تطوير): تُتجاهل القائمة بأمان — الحماية الأساسية تبقى
 * التوقيع + إبطال جلسة Frappe (sid) عند logout.
 */
import { getRedis } from './redis-cache';

function key(jti: string): string {
  return `erp:revoked_jti:${jti}`;
}

export async function revokeJti(jti: string | undefined, ttlSec: number): Promise<void> {
  if (!jti || !Number.isFinite(ttlSec) || ttlSec <= 0) return;
  const r = await getRedis();
  if (!r) return;
  try {
    // سقف أقصى 7 أيام — لا داعي لإبقاء إبطال أطول من أي توكن حي
    await r.set(key(jti), '1', 'EX', Math.min(Math.floor(ttlSec), 7 * 24 * 3600));
  } catch {
    /* Redis غير متاح — تجاهل */
  }
}

export async function isJtiRevoked(jti: string | undefined): Promise<boolean> {
  if (!jti) return false;
  const r = await getRedis();
  if (!r) return false;
  try {
    return (await r.get(key(jti))) === '1';
  } catch {
    return false;
  }
}
