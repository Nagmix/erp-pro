'use client';

/**
 * QUA-05 (تدقيق 2026-09): مصدر موحّد لتخزين/قراءة الشركة الافتراضية.
 *
 * قبل الإصلاح كان هناك ثلاث صيغ متعارضة في localStorage تحت نفس المفتاح:
 *  - نص JSON لسلسلة (الصيغة الصحيحة)
 *  - كائن JSON كامل { name, abbr, ... } من مبدّل الشركات
 *  - نص خام — وكل كاتب يكسر القارئ الآخر بصمت.
 *
 * الصيغة الرسمية الآن: JSON.stringify(name) — والقراءة تتسامح مع الصيغ القديمة.
 */

export const DEFAULT_COMPANY_STORAGE_KEY = 'erp_default_company';

/** يقرأ اسم الشركة الافتراضية من localStorage (متسامح مع الصيغ القديمة). */
export function readStoredDefaultCompanyName(): string {
  if (typeof window === 'undefined') return '';
  let raw = '';
  try {
    raw = window.localStorage.getItem(DEFAULT_COMPANY_STORAGE_KEY) || '';
    if (!raw) return '';
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === 'string') return parsed.trim();
    // صيغة قديمة: كائن { name, ... } من مبدّل الشركات
    if (parsed && typeof parsed === 'object' && 'name' in parsed) {
      const n = (parsed as { name?: unknown }).name;
      if (typeof n === 'string') return n.trim();
    }
    return '';
  } catch {
    // نص خام غير JSON — اعتبره اسماً صالحاً
    return raw.trim();
  }
}

/** يكتب اسم الشركة الافتراضية بالصيغة الرسمية الموحدة. */
export function writeStoredDefaultCompanyName(name: string): void {
  if (typeof window === 'undefined') return;
  if (!name) {
    clearStoredDefaultCompany();
    return;
  }
  window.localStorage.setItem(DEFAULT_COMPANY_STORAGE_KEY, JSON.stringify(String(name)));
}

export function clearStoredDefaultCompany(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DEFAULT_COMPANY_STORAGE_KEY);
}
