/**
 * مزامنة إعدادات الإيراد المؤجل مع ERPNext عبر واجهة API فقط (بدون Desk).
 */
import { apiGetDoc, apiUpdateDoc } from '@/lib/client/api';

/** اسم مستند الإعدادات الموحّد في ERPNext */
export const ACCOUNTS_SETTINGS_SINGLETON = 'Accounts Settings';

/** قيم موصى بها لتشغيل الإقران عبر القيود من التطبيق */
export const RECOMMENDED_DEFERRED_ACCOUNTS_PATCH: Record<string, unknown> = {
  book_deferred_entries_via_journal_entry: 1,
  book_deferred_entries_based_on: 'Months',
  automatically_process_deferred_accounting_entry: 1,
  /** يُنشئ القيود؛ الترحيل التلقائي يُفعَّل يدوياً من إعدادات المحاسبة إن لزم */
  submit_journal_entries: 0,
};

/** عدد الأشهر الشامل بين تاريخين (YYYY-MM-DD) — حد أدنى 1 */
export function diffInclusiveMonths(start: string, end: string): number {
  const a = new Date(`${start.trim()}T12:00:00`);
  const b = new Date(`${end.trim()}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 12;
  if (b < a) return 1;
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
  return Math.max(1, Math.min(600, months));
}

/**
 * يفعّل على مستند الصنف في الخلفية حقول الإيراد المؤجل وعدد الأشهر، بما يتوافق مع بنود فاتورة المبيعات.
 * لا يُستدعى إلا من الواجهة (استدعاءات API عبر خادم التطبيق).
 */
export async function syncItemDeferredRevenueFromInvoiceLine(input: {
  itemCode: string;
  serviceStart?: string;
  serviceEnd?: string;
  /** إذا لم تُحدَّد الفترة بعد */
  fallbackMonths?: number;
}): Promise<void> {
  const code = input.itemCode.trim();
  if (!code) return;

  let months =
    input.serviceStart?.trim() && input.serviceEnd?.trim()
      ? diffInclusiveMonths(input.serviceStart.trim(), input.serviceEnd.trim())
      : Math.max(1, Math.min(600, Number(input.fallbackMonths) || 12));

  const cur = await apiGetDoc<Record<string, unknown>>('Item', code);
  if (!cur) return;

  const alreadyOn = cur.enable_deferred_revenue === 1 || cur.enable_deferred_revenue === true;
  const existingMonths = Number(cur.no_of_months ?? 0);
  if (alreadyOn && existingMonths === months) return;

  await apiUpdateDoc('Item', code, {
    enable_deferred_revenue: 1,
    no_of_months: months,
  });
}

export async function applyRecommendedDeferredAccountsSettings(): Promise<void> {
  await apiUpdateDoc('Accounts Settings', ACCOUNTS_SETTINGS_SINGLETON, RECOMMENDED_DEFERRED_ACCOUNTS_PATCH);
}
