'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreditCard, CheckCircle, PanelTop } from 'lucide-react';
import { formatCurrency } from '@/lib/core/helpers';
import { PosPaymentSection } from '@/components/pos/pos-payment-section';
import { PosPaymentDialog } from '@/components/pos/pos-payment-dialog';

type Props = {
  subtotal: number;
  discount: number;
  onDiscountChange: (value: number) => void;
  lineNet: number;
  posProfile: string;
  profilePaymentModes: string[];
  paymentAmounts: Record<string, string>;
  onPaymentAmountChange: (mode: string, value: string) => void;
  paymentSum: number;
  paymentSumOk: boolean;
  /** مدفوعات &gt; 0 وأقل من صافي البنود — مسودة عند السماح من الملف */
  partialDraftOk?: boolean;
  /** الملف يسمح بالدفع الجزئي (عرض تلميح) */
  allowPartialPayment?: boolean;
  hasChangeAccount: boolean;
  onConfirm: () => void;
  confirmDisabled: boolean;
  confirmBusy: boolean;
  orderSuccess: boolean;
  /** يُستمد من ملف نقطة البيع (`allow_discount_change`) */
  discountDisabled?: boolean;
};

export function PosCartSummary({
  subtotal,
  discount,
  onDiscountChange,
  lineNet,
  posProfile,
  profilePaymentModes,
  paymentAmounts,
  onPaymentAmountChange,
  paymentSum,
  paymentSumOk,
  partialDraftOk = false,
  allowPartialPayment = false,
  hasChangeAccount,
  onConfirm,
  confirmDisabled,
  confirmBusy,
  orderSuccess,
  discountDisabled = false,
}: Props) {
  const [paymentDlgOpen, setPaymentDlgOpen] = useState(false);
  const saveAsDraft = Boolean(partialDraftOk && !paymentSumOk);

  const paymentSectionCommon = {
    posProfile,
    profilePaymentModes,
    paymentAmounts,
    onPaymentAmountChange,
    lineNet,
    paymentSum,
    paymentSumOk,
    partialDraftOk,
    allowPartialPayment,
    hasChangeAccount,
  };

  return (
    <div className="border-t bg-background">
      <div className="p-3 space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>المجموع الفرعي</span>
          <span className="tabular-nums">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>الضريبة والإجمالي النهائي</span>
          <span className="text-[10px] max-w-[55%] text-start">يتم احتسابهما تلقائياً عند تسجيل الفاتورة</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">الخصم</span>
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="0"
                className="h-7 w-24 text-xs text-center"
                dir="rtl"
                disabled={discountDisabled}
                value={discount || ''}
                onChange={(e) => onDiscountChange(Math.max(0, Number(e.target.value)))}
              />
              <span className="text-muted-foreground text-[10px]">ر.س</span>
            </div>
            {discountDisabled ? (
              <span className="text-[10px] text-muted-foreground text-start max-w-[14rem] leading-tight">
                الخصم على مستوى الفاتورة معطّل في ملف نقطة البيع.
              </span>
            ) : null}
          </div>
        </div>
        <Separator />
        <div className="flex justify-between items-center pt-1">
          <span className="text-base font-bold">صافي البنود − خصم</span>
          <span className="text-2xl font-bold text-primary tabular-nums">{formatCurrency(lineNet)}</span>
        </div>
      </div>

      <div className="px-3 pb-2 space-y-2">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1"
            onClick={() => setPaymentDlgOpen(true)}
            disabled={!posProfile || profilePaymentModes.length === 0}
          >
            <PanelTop className="h-3 w-3" />
            نافذة الدفع
          </Button>
        </div>
        <PosPaymentSection {...paymentSectionCommon} />
      </div>

      <PosPaymentDialog
        open={paymentDlgOpen}
        onOpenChange={setPaymentDlgOpen}
        {...paymentSectionCommon}
        onConfirm={onConfirm}
        confirmDisabled={confirmDisabled}
        confirmBusy={confirmBusy}
        orderSuccess={orderSuccess}
      />

      <div className="p-3 pt-1 flex gap-2">
        <Button
          className={`flex-1 h-12 text-sm font-medium gap-2 ${
            orderSuccess ? 'bg-success text-success-foreground' : 'bg-success hover:bg-success/92 text-success-foreground'
          }`}
          onClick={() => void onConfirm()}
          disabled={confirmDisabled}
        >
          {orderSuccess ? (
            <>
              <CheckCircle className="h-4 w-4" />
              تم
            </>
          ) : confirmBusy ? (
            '...'
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              {saveAsDraft ? 'حفظ مسودة (دفع جزئي)' : 'تسجيل وترحيل الفاتورة'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
