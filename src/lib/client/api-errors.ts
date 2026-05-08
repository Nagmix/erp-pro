/**
 * رسائل أخطاء موحّدة للمستخدم (المرحلة 12 — وضوح الأخطاء + اقتراحات).
 */
export function formatApiErrorMessage(err: unknown, fallback = 'حدث خطأ غير متوقع'): string {
  if (err instanceof Error && err.message.trim()) {
    const m = err.message;
    if (/401|Unauthorized/i.test(m)) {
      return 'انتهت الجلسة أو غير مصرّح — سجّل الدخول من جديد.';
    }
    if (/403|Forbidden/i.test(m)) {
      return 'لا تملك صلاحية لهذا الإجراء — راجع مدير النظام أو أدوار الصلاحيات.';
    }
    if (/404|Not Found/i.test(m)) {
      return 'المورد غير موجود — تحقق من الاسم أو المعرف.';
    }
    if (/network|fetch failed|Failed to fetch/i.test(m)) {
      return 'تعذر الاتصال بالخادم — تحقق من الشبكة أو إعدادات الاتصال.';
    }
    if (/CSRF|csrf/i.test(m)) {
      return 'انتهت صلاحية الحماية — حدّث الصفحة ثم أعد المحاولة.';
    }
    return m;
  }
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
}
