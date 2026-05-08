/**
 * منطق الدفع متعدد الوسائل وباقي النقد وفق §6.3–§6.4 من مواصفات POS.
 */

/** وسيلة تُعتبر نقدية لغرض احتساب الباقي (يُفترض تطابق أسماء Mode of Payment في ERPNext). */
export function isLikelyCashMode(mode: string): boolean {
  const m = String(mode).trim().toLowerCase();
  if (!m) return false;
  if (m.includes('cash')) return true;
  if (m.includes('نقد') || m.includes('كاش')) return true;
  return false;
}

export type PosPaymentTotals = {
  paymentSum: number;
  /** ما يتبقى ليغطي صافي البنود (قبل الضريبة) */
  remainingDue: number;
  /** باقٍ نقدي للعميل — فقط من مبالغ الوسائل المعرّفة كنقد */
  changeCash: number;
  /** مجموع المدفوع − صافي البنود عند إجمالٍ زائد */
  rawOverpay: number;
  /** زيادة عبر وسائل ليست نقداً (لا تُحسب باقياً نقدياً) */
  nonCashOverpay: number;
};

export function computePosPaymentTotals(
  lineNet: number,
  modes: string[],
  amounts: Record<string, string>
): PosPaymentTotals {
  let paymentSum = 0;
  let nonCashPaid = 0;
  for (const mode of modes) {
    const amt = Number(amounts[mode]) || 0;
    paymentSum += amt;
    if (!isLikelyCashMode(mode)) nonCashPaid += amt;
  }
  const remainingDue = lineNet > 0.005 ? Math.max(0, lineNet - paymentSum) : 0;
  const rawOverpay =
    lineNet > 0.005 && paymentSum > lineNet + 0.009 ? paymentSum - lineNet : 0;
  const dueFromCash = Math.max(0, lineNet - nonCashPaid);
  let cashPaid = 0;
  for (const mode of modes) {
    if (isLikelyCashMode(mode)) cashPaid += Number(amounts[mode]) || 0;
  }
  const changeCash = Math.max(0, cashPaid - dueFromCash);
  const nonCashOverpay = Math.max(0, rawOverpay - changeCash);
  return { paymentSum, remainingDue, changeCash, rawOverpay, nonCashOverpay };
}
