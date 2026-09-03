/**
 * MED-01: حماية من SSRF عند نداء روابط خارجية يوفرها المستخدم
 * (اختبار اتصال منصات التجارة، Webhooks...).
 *
 * - يسمح بـ http/https فقط (وبروتوكولات محددة عند الطلب).
 * - يمنع المنافذ غير القياسية (حصر: 80/443).
 * - يحل اسم النطاق عبر DNS ويمنع كل العناوين الداخلية/المحجوزة —
 *   حتى لا يُخدع بنطاق عام يحل إلى 127.0.0.1 أو 169.254.169.254
 *   (metadata endpoints) أو أي شبكة داخلية.
 */
import dns from 'dns';
import net from 'net';

/** نطاقات IPv4 المحجوزة/الداخلية (CIDR) */
const BLOCKED_V4: Array<[string, number]> = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local (يشمل 169.254.169.254 — metadata)
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved
];

function ip4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

export function isBlockedAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const value = ip4ToInt(ip);
    if (value === null) return true;
    for (const [base, bits] of BLOCKED_V4) {
      const baseInt = ip4ToInt(base);
      if (baseInt === null) continue;
      const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      if ((value & mask) === (baseInt & mask)) return true;
    }
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // IPv4-mapped (::ffff:a.b.c.d)
    const mapped = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (mapped) return isBlockedAddress(mapped[1] as string);
    if (lower === '::' || lower === '::1') return true; // unspecified / loopback
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
      return true; // link-local fe80::/10
    }
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA fc00::/7
    if (lower.startsWith('ff')) return true; // multicast
    return false;
  }
  // ليس عنواناً أصلاً
  return false;
}

export type SafeUrlOptions = {
  /** افتراضي: ['https:', 'http:'] */
  allowedProtocols?: string[];
};

/**
 * يتحقق من الرابط ويعيده بعد اجتياز الفحص، أو يرمي خطأ برسالة عربية
 * صالحة للعرض على المستخدم.
 */
export async function assertSafeExternalUrl(
  raw: string,
  opts?: SafeUrlOptions
): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('الرابط غير صالح');
  }

  const allowed = opts?.allowedProtocols ?? ['https:', 'http:'];
  if (!allowed.includes(u.protocol)) {
    throw new Error('بروتوكول الرابط غير مسموح — استخدم رابطاً يبدأ بـ https://');
  }

  const port = u.port ? Number(u.port) : u.protocol === 'https:' ? 443 : 80;
  if (port !== 80 && port !== 443) {
    throw new Error('منفذ الرابط غير مسموح — استخدم المنفذ القياسي (80/443)');
  }

  const hostname = u.hostname;
  if (net.isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw new Error('الرابط يشير إلى عنوان داخلي — غير مسموح');
    }
    return u;
  }

  // اسم نطاق: يجب حله والتحقق من كل العناوين الناتجة (DNS rebinding حسب الطلب)
  let addrs: Array<{ address: string; family: number }>;
  try {
    addrs = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error('تعذر حل اسم نطاق الرابط — تحقق من صحته');
  }
  if (!addrs.length) {
    throw new Error('النطاق لا يحل إلى أي عنوان — تحقق من صحته');
  }
  if (addrs.some((a) => isBlockedAddress(a.address))) {
    throw new Error('النطاق يحل إلى عنوان داخلي محظور — غير مسموح');
  }
  return u;
}
