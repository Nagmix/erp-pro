'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/core/helpers';
import { PosPaymentSection, type PosPaymentSectionProps } from '@/components/pos/pos-payment-section';

type Props = Omit<
  PosPaymentSectionProps,
  'leadSlot' | 'compact'
> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  confirmDisabled: boolean;
  confirmBusy: boolean;
  orderSuccess: boolean;
};

export function PosPaymentDialog({
  open,
  onOpenChange,
  lineNet,
  onConfirm,
  confirmDisabled,
  confirmBusy,
  orderSuccess,
  ...sectionProps
}: Props) {
  const saveAsDraft = Boolean(sectionProps.partialDraftOk && !sectionProps.paymentSumOk);

  useEffect(() => {
    if (orderSuccess) onOpenChange(false);
  }, [orderSuccess, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md max-h-[90vh] overflow-y-auto gap-3">
        <DialogHeader>
          <DialogTitle>الدفع</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 flex justify-between gap-2 text-sm">
          <span className="text-muted-foreground shrink-0">صافي البنود − خصم (قبل الضريبة)</span>
          <span className="font-bold text-primary tabular-nums">{formatCurrency(lineNet)}</span>
        </div>
        <PosPaymentSection {...sectionProps} lineNet={lineNet} compact />
        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto gap-1.5"
            disabled={confirmDisabled}
            onClick={() => void onConfirm()}
          >
            {confirmBusy ? '...' : saveAsDraft ? 'حفظ مسودة (دفع جزئي)' : 'تأكيد الدفع وإصدار الفاتورة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
