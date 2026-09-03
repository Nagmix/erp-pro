/**
 * MED-12: مقارنة ثابتة الزمن (constant-time) تعمل في بيئة Edge/Proxy
 * دون الاعتماد على node:crypto.
 *
 * تُستخدم لمقارنة توكن CSRF في البوابة (proxy) — المقارنة السابقة (===)
 * كانت تُخرق مبكراً عند أول اختلاف فتسمح نظرياً بقياس زمني (timing attack).
 *
 * ملاحظة: الحلقة تمسح الطول الأكبر دائماً وتعامل الخانات الناقصة كـ 0،
 * فلا يتسرب فرق الطول عبر زمن التنفيذ إلا من أول فحص (الذي لا يكشف المحتوى).
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const lenA = a.length;
  const lenB = b.length;
  const max = Math.max(lenA, lenB);
  let diff = lenA === lenB ? 0 : 1;
  for (let i = 0; i < max; i++) {
    const ca = i < lenA ? a.charCodeAt(i) : 0;
    const cb = i < lenB ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}
