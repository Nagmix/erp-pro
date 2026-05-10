'use client';

import { useMemo, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/core/helpers';
import { computePosPaymentTotals } from '@/lib/client/pos-payment-utils';

export type PosPaymentSectionProps = {
  posProfile: string;
  profilePaymentModes: string[];
  paymentAmounts: Record<string, string>;
  onPaymentAmountChange: (mode: string, value: string) => void;
  lineNet: number;
  paymentSum: number;
  paymentSumOk: boolean;
  partialDraftOk?: boolean;
  allowPartialPayment?: boolean;
  hasChangeAccount: boolean;
  /** سطور الملخص فوق الحقول (مثلاً في نافذة الدفع) */
  leadSlot?: ReactNode;
  /** إخفاء تلميح «لا يقل عن صافي البنود» داخل النافذة المضغوطة */
  compact?: boolean;
};

export function PosPaymentSection({
  posProfile,
  profilePaymentModes,
  paymentAmounts,
  onPaymentAmountChange,
  lineNet,
  paymentSum,
  paymentSumOk,
  partialDraftOk = false,
  allowPartialPayment = false,
  hasChangeAccount,
  leadSlot,
  compact = false,
}: PosPaymentSectionProps) {
  const allocationOk = paymentSumOk || partialDraftOk;
  const saveAsDraft = partialDraftOk && !paymentSumOk;

  const { changeCash, rawOverpay, nonCashOverpay, remainingDue } = useMemo(
    () => computePosPaymentTotals(lineNet, profilePaymentModes, paymentAmounts),
    [lineNet, profilePaymentModes, paymentAmounts]
  );

  return (
    <div className="space-y-2">
      {leadSlot}
      <Label className="text-[10px] text-muted-foreground">توزيع الدفع *</Label>
      {!posProfile ? (
        <p className="text-xs text-muted-foreground">اختر ملف نقطة البيع أولاً</p>
      ) : profilePaymentModes.length === 0 ? (
        <p className="text-xs text-destructive">لا توجد وسائل دفع في الملف — أضف وسائل الدفع في ملف نقطة البيع</p>
      ) : (
        <>
          {!compact ? (
            <p className="text-[10px] text-muted-foreground leading-snug">
              يجب ألا يقل مجموع المبالغ عن صافي البنود قبل احتساب الضريبة في النظام
              {allowPartialPayment ? (
                <>
                  {' '}
                  — أو أقل منه عند تفعيل الدفع الجزئي في الملف ليُحفظ كمسودة.
                </>
              ) : null}
              .
            </p>
          ) : null}
          <div className="space-y-1.5">
            {profilePaymentModes.map((m) => (
              <div key={m} className="flex items-center gap-2">
                <span className="text-[10px] w-[30%] min-w-0 truncate font-medium">{m}</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-9 flex-1 text-xs"
                  dir="rtl"
                  value={paymentAmounts[m] ?? ''}
                  onChange={(e) => onPaymentAmountChange(m, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5 text-[10px] pt-0.5">
            <span className="text-muted-foreground">مجموع الدفع</span>
            <span
              className={
                allocationOk
                  ? saveAsDraft
                    ? 'text-amber-800 dark:text-amber-400 font-medium tabular-nums'
                    : 'text-primary font-medium tabular-nums'
                  : 'text-destructive font-medium tabular-nums'
              }
            >
              {formatCurrency(paymentSum)} / {formatCurrency(lineNet)}
            </span>
          </div>
          {remainingDue > 0.005 && !partialDraftOk ? (
            <p className="text-[10px] text-muted-foreground">
              المتبقي لتغطية الصافي:{' '}
              <span className="font-mono tabular-nums text-foreground">{formatCurrency(remainingDue)}</span>
            </p>
          ) : null}
          {partialDraftOk ? (
            <p className="text-[10px] text-amber-800/95 dark:text-amber-400/95 leading-snug">
              سجّل المدفوع الفعلي أقل من صافي البنود — يُحفظ المستند كمسودة دون ترحيل حتى يكتمل الدفع.
            </p>
          ) : null}
          {changeCash > 0.005 ? (
            <p className="text-[10px] text-muted-foreground leading-snug pt-1 border-t border-border/40 mt-1">
              <span className="font-medium text-foreground">باقٍ نقدي للعميل (مُتوقع):</span>{' '}
              <span className="font-mono tabular-nums text-foreground">{formatCurrency(changeCash)}</span>
              {hasChangeAccount
                ? ' — يُوجَّه لحساب الباقي من ملف نقطة البيع عند الترحيل في النظام.'
                : ' — اضبط «حساب مبلغ الباقي» في ملف نقطة البيع لاحتسابه في القيود.'}
            </p>
          ) : null}
          {nonCashOverpay > 0.005 ? (
            <p className="text-[10px] text-amber-900/90 dark:text-amber-300/90 leading-snug">
              زيادة {formatCurrency(nonCashOverpay)} عبر وسيلة ليست نقدية — لا تُسجَّل كباقٍ نقدٍ للعميل (القاعدة: الباقي من النقد فقط).
            </p>
          ) : null}
          {rawOverpay > 0.005 && changeCash <= 0.005 && nonCashOverpay <= 0.005 ? (
            <p className="text-[10px] text-muted-foreground leading-snug pt-1 border-t border-border/40 mt-1">
              زيادة عن صافي البنود:{' '}
              <span className="font-mono tabular-nums text-foreground">{formatCurrency(rawOverpay)}</span>
              {' — '}
              الإجمالي النهائي والباقي يُحسبان عند الترحيل.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
