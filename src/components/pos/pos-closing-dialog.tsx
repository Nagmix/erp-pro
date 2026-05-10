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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import type { POSSessionSummaryResponse } from '@/lib/core/types';
import { formatCurrency } from '@/lib/core/helpers';

export type OpenPoeOption = {
  name: string;
  pos_profile: string;
  user?: string;
  period_start_date?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openPoeList: OpenPoeOption[];
  selectedPoe: string;
  onSelectPoe: (name: string) => void;
  onConfirm: () => void;
  busy: boolean;
  summary?: POSSessionSummaryResponse | null;
  summaryLoading?: boolean;
  closingByMode: Record<string, string>;
  onClosingByModeChange: (mode: string, value: string) => void;
};

export function PosClosingDialog({
  open,
  onOpenChange,
  openPoeList,
  selectedPoe,
  onSelectPoe,
  onConfirm,
  busy,
  summary,
  summaryLoading,
  closingByMode,
  onClosingByModeChange,
}: Props) {
  const paymentModes = summary ? Object.keys(summary.payments_by_mode) : [];
  const hasModes = paymentModes.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
          <DialogTitle>إغلاق وردية</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            يُجمَّع عمل البيع منذ فتح الوردية ثم يُؤكَّد الإغلاق والترحيل. يمكن ضبط المبلغ الفعلي لكل وسيلة
            دفع ليطابق العدّ اليدوي أو الخزينة (تسوية عند الإغلاق).
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 space-y-3 text-sm min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-1">
            <Label className="text-xs">فتحة وردية مفتوحة</Label>
            <Select dir="rtl" value={selectedPoe} onValueChange={onSelectPoe}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="اختر..." />
              </SelectTrigger>
              <SelectContent dir="rtl" align="start">
                {openPoeList.map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    {p.name} · {p.pos_profile}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPoe && summaryLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              جاري تحميل ملخص الوردية والفواتير…
            </div>
          )}

          {selectedPoe && !summaryLoading && summary && (
            <div className="space-y-3 rounded-[var(--radius-md-ui)] border border-border/50 bg-muted/15 p-3">
              <p className="text-xs font-medium">ملخص حتى اللحظة</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">من </span>
                  <span className="tabular-nums">{summary.period_start_date}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">إلى </span>
                  <span className="tabular-nums">{summary.period_end}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">الفواتير:</span>{' '}
                  <strong>{summary.invoice_count}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">الإجمالي:</span>{' '}
                  <strong>{formatCurrency(summary.grand_total_sum)}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">الضريبة:</span>{' '}
                  <span className="tabular-nums">{formatCurrency(summary.tax_sum)}</span>
                </div>
              </div>
            </div>
          )}

          {selectedPoe && !summaryLoading && summary && summary.invoices.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">فواتير ضمن الوردية (أحدث {Math.min(80, summary.invoices.length)})</Label>
              <ScrollArea className="h-[120px] rounded-[var(--radius-md-ui)] border border-border/50">
                <ul className="p-2 space-y-1.5 text-xs">
                  {summary.invoices.map((inv) => (
                    <li key={inv.name} className="flex justify-between gap-2 border-b border-border/30 pb-1 last:border-0">
                      <span className="truncate font-mono" title={inv.name}>
                        {inv.name}
                      </span>
                      <span className="shrink-0 tabular-nums">{formatCurrency(inv.grand_total)}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}

          {selectedPoe && !summaryLoading && summary && hasModes && (
            <div className="space-y-2">
              <Label className="text-xs">تسوية المبالغ عند الإغلاق (مقابل المتوقع من الفواتير)</Label>
              <ScrollArea className="max-h-[180px] rounded-[var(--radius-md-ui)] border border-border/50">
                <div className="p-2 space-y-2">
                  {paymentModes.map((mode) => {
                    const expected = summary.payments_by_mode[mode] ?? 0;
                    return (
                      <div key={mode} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate" title={mode}>
                            {mode}
                          </p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            متوقع من البيع: {formatCurrency(expected)}
                          </p>
                        </div>
                        <Input
                          type="number"
                          dir="ltr"
                          className="h-9 w-full sm:w-32 text-sm tabular-nums"
                          value={closingByMode[mode] ?? ''}
                          onChange={(e) => onClosingByModeChange(mode, e.target.value)}
                          placeholder={String(expected)}
                        />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {selectedPoe && !summaryLoading && summary && !hasModes && summary.invoice_count === 0 && (
            <p className="text-xs text-muted-foreground">لا فواتير بعد في هذه الوردية — يمكن الإغلاق مباشرة.</p>
          )}
        </div>
        <DialogFooter className="px-4 py-3 border-t border-border/50 shrink-0 gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            type="button"
            className="gap-2"
            disabled={busy || !selectedPoe || Boolean(summaryLoading && selectedPoe)}
            onClick={() => void onConfirm()}
          >
            {busy ? (
              <>
                جارٍ الإغلاق
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              </>
            ) : (
              'تأكيد إغلاق الوردية'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
