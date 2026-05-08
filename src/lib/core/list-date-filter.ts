/** مقارنة تواريخ ISO `YYYY-MM-DD` ضمن نطاق شامل من/إلى (كلاهما اختياري). */
export function rowInDateRangeISO(postingDate: string | null | undefined, dateFrom: string, dateTo: string): boolean {
  const d = (postingDate || '').slice(0, 10);
  if (!d) return true;
  if (dateFrom && d < dateFrom) return false;
  if (dateTo && d > dateTo) return false;
  return true;
}
