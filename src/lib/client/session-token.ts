/** Client-side session JWT / legacy token checks (must align with server `jwt-session`). */

export function decodeJwtPayloadBrowser(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const p = parts[1];
    const b64 = p.replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (b64.length % 4)) % 4;
    const json = atob(b64 + '='.repeat(pad));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Returns true if token exists and is not expired (supports exp in seconds or legacy ms). */
export function isSessionTokenAlive(token: string): boolean {
  const trimmed = token.trim();
  if (trimmed.split('.').length === 3) {
    const decoded = decodeJwtPayloadBrowser(trimmed);
    if (!decoded?.userId) return false;
    const exp = decoded.exp;
    if (typeof exp !== 'number') return false;
    const expMs = exp > 1_000_000_000_000 ? exp : exp * 1000;
    return Date.now() < expMs;
  }
  try {
    const decoded = JSON.parse(atob(trimmed)) as { userId?: string; exp?: number };
    if (!decoded.userId) return false;
    const exp = decoded.exp;
    if (typeof exp !== 'number') return false;
    const expMs = exp > 1_000_000_000_000 ? exp : exp * 1000;
    return Date.now() < expMs;
  } catch {
    return false;
  }
}

// ============================================================
// SEC-08: نموذج الجلسة الجديد — «الكوكي أولاً»
// لا يُخزَّن أي توكن JWT في localStorage بعد الآن. الكوكي httpOnly
// `erp_session` (يفضّه الخادم عند الدخول/التحديث) هو الاعتماد الوحيد،
// ويبقى في المتصفح: ملف تعريف المستخدم (erp_user) وطابع انتهاء
// غير حساس (erp_exp) لحالة الواجهة فقط — الحماية الفعلية على الخادم.
// ============================================================

export const CLIENT_EXP_KEY = 'erp_exp';

/** يحفظ طابع الانتهاء (ثوانٍ) من توكن JWT في erp_exp — بدون تخزين التوكن نفسه. */
export function storeClientExpFromToken(token: string): void {
  if (typeof window === 'undefined') return;
  const decoded = decodeJwtPayloadBrowser(token);
  const exp = typeof decoded?.exp === 'number' ? decoded.exp : 0;
  if (exp > 0) localStorage.setItem(CLIENT_EXP_KEY, String(exp));
}

export function clearClientExp(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CLIENT_EXP_KEY);
}

/** هل جلسة الواجهة ما تزال ضمن مدة الصلاحية المعروفة؟ */
export function isClientSessionAlive(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(CLIENT_EXP_KEY);
  if (!raw) return false;
  const exp = parseInt(raw, 10);
  if (!Number.isFinite(exp) || exp <= 0) return false;
  return Date.now() / 1000 < exp;
}
