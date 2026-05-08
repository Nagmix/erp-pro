'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyLabel?: string;
  posProfileName?: string;
  profilePaymentModes: string[];
  cashierUser: string;
  onCashierChange: (v: string) => void;
  openingByMode: Record<string, string>;
  onOpeningByModeChange: (mode: string, value: string) => void;
  companyLoading: boolean;
  onConfirm: () => void;
  busy: boolean;
  canSubmit: boolean;
};

export function PosOpeningDialog({
  open,
  onOpenChange,
  companyLabel,
  posProfileName,
  profilePaymentModes,
  cashierUser,
  onCashierChange,
  openingByMode,
  onOpeningByModeChange,
  companyLoading,
  onConfirm,
  busy,
  canSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
          <DialogTitle>فتح وردية جديدة</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            أدخل الأرصدة الافتتاحية لكل وسيلة دفع من ملف نقطة البيع؛ يمكن أن تكون صفراً عند بداية يوم بدون رصيد
            قبض سابق.
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 space-y-3 text-sm min-h-0 flex-1 overflow-hidden flex flex-col">
          <p className="text-xs text-muted-foreground leading-relaxed">
            اختر الشركة وملف نقطة البيع من تبويب الإعدادات في الشاشة الرئيسية، ثم أدخل الأرصدة الافتتاحية لكل
            وسيلة دفع المعتمدة في الملف. القيم يمكن أن تكون صفراً.
          </p>
          {(companyLabel || posProfileName) && (
            <div className="rounded-[var(--radius-md-ui)] border border-border/50 bg-muted/20 px-3 py-2 text-xs space-y-1">
              {companyLabel ? (
                <p>
                  <span className="text-muted-foreground">الشركة:</span> {companyLabel}
                </p>
              ) : null}
              {posProfileName ? (
                <p>
                  <span className="text-muted-foreground">ملف نقطة البيع:</span> {posProfileName}
                </p>
              ) : null}
            </div>
          )}
          <div className="space-y-1 shrink-0">
            <Label className="text-xs">الكاشير</Label>
            <ErpLinkCombobox
              doctype="User"
              value={cashierUser}
              onChange={onCashierChange}
              displayKey="full_name"
              limit={500}
            />
          </div>
          <div className="space-y-2 min-h-0 flex flex-col flex-1">
            <Label className="text-xs">الأرصدة الافتتاحية حسب وسيلة الدفع</Label>
            {profilePaymentModes.length === 0 ? (
              <p className="text-xs text-destructive py-2">
                لا توجد وسائل دفع في ملف نقطة البيع — راجع إعدادات الملف أو إعدادات طرق الدفع من لوحة الإعدادات.
              </p>
            ) : (
              <ScrollArea className="max-h-[220px] rounded-[var(--radius-md-ui)] border border-border/50">
                <div className="p-2 space-y-2">
                  {profilePaymentModes.map((m) => (
                    <div key={m} className="flex items-center gap-2 justify-between">
                      <span className="text-xs font-medium truncate flex-1 min-w-0" title={m}>
                        {m}
                      </span>
                      <Input
                        type="number"
                        dir="ltr"
                        min={0}
                        step="any"
                        className="h-9 w-28 text-sm tabular-nums"
                        value={openingByMode[m] ?? '0'}
                        onChange={(e) => onOpeningByModeChange(m, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
        <DialogFooter className="px-4 py-3 border-t border-border/50 shrink-0 gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            type="button"
            className="gap-2"
            disabled={busy || companyLoading || !canSubmit}
            onClick={() => void onConfirm()}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ الفتح
              </>
            ) : (
              'تأكيد فتح الوردية'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
