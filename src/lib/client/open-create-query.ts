/**
 * إن وُجد ‎`?create=1`‎ في الرابط: يفتح الحوار (callback) ويزيل الوسيط من شريط العنوان.
 */
export function consumeCreateQueryParam(onOpen: () => void): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('create') !== '1') return;
  onOpen();
  const path = window.location.pathname;
  window.history.replaceState(null, '', path);
}
