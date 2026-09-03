/**
 * MED-03: محدد معدل موحّد — عدّاد مشترك عبر Redis عند توفر REDIS_URL
 * (يبقى بعد restart ويُشارك بين كل النسخ)، مع سقوط آمن إلى عدّاد
 * في الذاكرة عند غياب Redis (تطوير/نسخة واحدة).
 *
 * يشمل أيضاً استخراج IP العميل بمنطق rightmost-trusted بدل الثقة
 * بأول قيمة X-Forwarded-For القابلة للتزييف.
 */
import { getRedis } from './redis-cache';

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** epoch ms — متى تنتهي النافذة الحالية */
  resetAt: number;
};

type MemoryEntry = { count: number; windowStart: number };

const memory = new Map<string, MemoryEntry>();
let lastSweep = 0;

function memoryLimit(
  key: string,
  windowMs: number,
  max: number,
  now: number
): RateLimitResult {
  // تنظيف دوري رخيص للمدخلات المنتهية
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, e] of memory) {
      if (now - e.windowStart > windowMs * 2) memory.delete(k);
    }
  }
  const e = memory.get(key);
  if (!e || now - e.windowStart > windowMs) {
    memory.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }
  e.count += 1;
  return {
    allowed: e.count <= max,
    remaining: Math.max(0, max - e.count),
    resetAt: e.windowStart + windowMs,
  };
}

async function redisLimit(
  key: string,
  windowMs: number,
  max: number,
  now: number
): Promise<RateLimitResult | null> {
  const r = await getRedis();
  if (!r) return null;
  try {
    // نافذة ثابتة (fixed window) بمفتاح مشتق من رقم النافذة — لا حاجة لقفل
    const bucket = `erp:rl:${key}:${Math.floor(now / windowMs)}`;
    const count = await r.incr(bucket);
    if (count === 1) {
      await r.pexpire(bucket, windowMs * 2);
    }
    const resetAt = (Math.floor(now / windowMs) + 1) * windowMs;
    return {
      allowed: count <= max,
      remaining: Math.max(0, max - count),
      resetAt,
    };
  } catch {
    return null; // Redis غير متاح — سقوط إلى الذاكرة
  }
}

/** فحص الحد: عدّاد Redis مشترك إن توفّر، وإلا الذاكرة المحلية. */
export async function checkRateLimit(
  key: string,
  opts: { windowMs: number; max: number }
): Promise<RateLimitResult> {
  const now = Date.now();
  const viaRedis = await redisLimit(key, opts.windowMs, opts.max, now);
  if (viaRedis) return viaRedis;
  return memoryLimit(key, opts.windowMs, opts.max, now);
}

/**
 * استخراج IP العميل بمنطق rightmost-trusted:
 *
 * X-Forwarded-For = "client, proxy1, proxy2" — كل بروكسي يضيف عنوان
 * الطرف الذي اتصل به مباشرة إلى نهاية السلسلة، فالعناوين اليسرى
 * يمكن للمهاجم تزييفها بإرسال رأس معدّل. العناوين الموثوقة هي التي
 * ألحقتها البروكسيات أمامنا (عددها TRUSTED_PROXY_HOPS).
 *
 * client_ip = parts[parts.length - hops]
 *
 * افتراضي 2 (نشر BunnyShell: ingress + Caddy أمام التطبيق) —
 * قابل للضبط عبر متغير البيئة TRUSTED_PROXY_HOPS.
 */
export function clientIpFromRequest(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  const hops = Math.max(0, parseInt(process.env.TRUSTED_PROXY_HOPS || '2', 10) || 0);
  if (xff && hops > 0) {
    const parts = xff
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const idx = parts.length - hops;
    if (idx >= 0 && parts[idx]) return parts[idx] as string;
  }
  if (xff && hops === 0) {
    // بلا بروكسيات موثوقة: آخر عنصر هو ما رآه أقرب وسيط — إن وُجد
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1] as string;
  }
  return request.headers.get('x-real-ip') || 'unknown';
}
