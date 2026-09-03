/**
 * SEC-09: تنقية HTML من جهة العميل قبل أي عرض عبر dangerouslySetInnerHTML.
 * DOMPurify يزيل السكربتات ومعالجات الأحداث والروابط الخطرة (javascript: ...)
 * مع الحفاظ على التنسيق الآمن.
 */
import DOMPurify from 'dompurify';

/** ينقّي HTML غير موثوق للعرض الآمن */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  if (typeof window === 'undefined') return '';
  return DOMPurify.sanitize(dirty, {
    FORBID_TAGS: ['style', 'form', 'input', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['style', 'onerror', 'onload'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|ftp):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}
