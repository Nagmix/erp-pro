'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/core/helpers';
import type { BuildPosInvoiceReturnOpts } from '@/lib/erp/erpnext-payloads';

export type PosReturnLine = {
  idx: number;
  item_name: string;
  item_code: string;
  origQty: number;
  rate: number;
  lineAmount: number;
};

type RefundMode = 'scaled' | 'single';

function buildLinesFromDoc(source: Record<string, unknown> | null | undefined): PosReturnLine[] {
  if (!source) return [];
  const raw = (source.items as Record<string, unknown>[]) || [];
  return raw
    .map((r, idx) => {
      if (!r || !r.item_code) return null;
      const origQty = Math.abs(Number(r.qty) || 0);
      const amt = Number(r.amount);
      const lineAmount =
        Number.isFinite(amt) && amt !== 0 ? Math.abs(amt) : origQty * Math.abs(Number(r.rate) || 0);
      return {
        idx,
        item_name: String(r.item_name ?? r.item_code ?? ''),
        item_code: String(r.item_code ?? ''),
        origQty,
        rate: Number(r.rate) || 0,
        lineAmount,
      };
    })
    .filter((x): x is PosReturnLine => x != null);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceName: string | null;
  source: Record<string, unknown> | null | undefined;
  sourceLoading: boolean;
  postingDate: string;
  onConfirm: (opts: BuildPosInvoiceReturnOpts) => Promise<void>;
  busy?: boolean;
  /** مثلاً اختيار الفاتورة من شاشة البيع قبل عرض البنود */
  pickerSlot?: ReactNode;
};

export function PosReturnDialog({
  open,
  onOpenChange,
  invoiceName,
  source,
  sourceLoading,
  postingDate,
  onConfirm,
  busy,
  pickerSlot,
}: Props) {
  const lines = useMemo(() => buildLinesFromDoc(source ?? null), [source]);

  const paymentModes = useMemo(() => {
    const payRaw = (source?.payments as Record<string, unknown>[]) || [];
    const modes = payRaw
      .map((p) => String(p.mode_of_payment ?? '').trim())
      .filter(Boolean);
    return [...new Set(modes)];
  }, [source]);

  const [qtyByIndex, setQtyByIndex] = useState<Record<number, string>>({});
  const [refundMode, setRefundMode] = useState<RefundMode>('scaled');
  const [singleMode, setSingleMode] = useState<string>('');

  useEffect(() => {
    if (!open || lines.length === 0) return;
    queueMicrotask(() => {
      const init: Record<number, string> = {};
      for (const l of lines) init[l.idx] = String(Math.floor(l.origQty));
      setQtyByIndex(init);
    });
  }, [open, lines]);

  useEffect(() => {
    if (paymentModes.length && !singleMode) {
      // Using requestAnimationFrame to avoid synchronous setState within effect
      requestAnimationFrame(() => setSingleMode(paymentModes[0]!));
    }
  }, [paymentModes, singleMode]);

  const parsedQty = useMemo(() => {
    const out: Record<number, number> = {};
    for (const l of lines) {
      const raw = qtyByIndex[l.idx];
      const n = raw === undefined || raw === '' ? l.origQty : Math.max(0, Number(raw) || 0);
      out[l.idx] = Math.min(l.origQty, Math.floor(n * 1000) / 1000);
    }
    return out;
  }, [lines, qtyByIndex]);

  const estimatedRefund = useMemo(() => {
    let orig = 0;
    let ret = 0;
    for (const l of lines) {
      orig += l.lineAmount;
      const rq = parsedQty[l.idx] ?? 0;
      const portion = l.origQty > 0 ? rq / l.origQty : 0;
      ret += l.lineAmount * portion;
    }
    return { orig, ret };
  }, [lines, parsedQty]);

  const anyReturn = useMemo(() => lines.some((l) => (parsedQty[l.idx] ?? 0) > 0.0001), [lines, parsedQty]);

  const handleSubmit = async () => {
    if (!source || !invoiceName) return;
    if (!anyReturn) return;

    const opts: BuildPosInvoiceReturnOpts = {
      returnQtyByIndex: { ...parsedQty },
      explicitPartial: true,
      refundSplit: refundMode === 'single' ? 'single_mode' : 'scaled_original',
      ...(refundMode === 'single' && singleMode.trim()
        ? { singleRefundMode: singleMode.trim() }
        : {}),
    };
    await onConfirm(opts);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto gap-3">
        <DialogHeader>
          <DialogTitle>
            مرتجع فاتورة نقطة البيع
            {invoiceName ? (
              <span className="block font-mono text-sm font-normal text-muted-foreground mt-1">{invoiceName}</span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        {pickerSlot ? <div className="space-y-2">{pickerSlot}</div> : null}

        {sourceLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">جاري تحميل بنود الفاتورة…</p>
        ) : lines.length === 0 ? (
          <p className="text-sm text-destructive py-4">لا توجد بنود صالحة للمرتجع.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              حدّد كمية الإرجاع لكل بند (لا تتجاوز الكمية الأصلية). يُوزَّع الاسترداد على وسائل الدفع حسب نسبة قيمة
              البنود أو على وسيلة واحدة.
            </p>

            <div className="rounded-[var(--radius-md-ui)] border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-start text-xs">الصنف</TableHead>
                    <TableHead className="text-start text-xs w-24">الكمية الأصلية</TableHead>
                    <TableHead className="text-start text-xs w-28">مرتجع</TableHead>
                    <TableHead className="text-start text-xs w-28">قيمة تقريبية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l.idx}>
                      <TableCell className="text-sm max-w-[200px]">
                        <span className="font-medium block truncate">{l.item_name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{l.item_code}</span>
                      </TableCell>
                      <TableCell className="tabular-nums text-xs">{l.origQty}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          className="h-8 text-xs"
                          dir="rtl"
                          value={qtyByIndex[l.idx] ?? ''}
                          onChange={(e) =>
                            setQtyByIndex((prev) => ({ ...prev, [l.idx]: e.target.value }))
                          }
                        />
                      </TableCell>
                      <TableCell className="tabular-nums text-xs">
                        {formatCurrency(
                          l.origQty > 0
                            ? ((parsedQty[l.idx] ?? 0) / l.origQty) * l.lineAmount
                            : 0
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2 flex flex-wrap justify-between gap-2 text-sm">
              <span className="text-muted-foreground">إجمالي قيمة المرتجع (تقريب، قبل الضريبة النهائية في النظام)</span>
              <span className="font-bold tabular-nums text-primary">{formatCurrency(estimatedRefund.ret)}</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">طريقة توزيع الاسترداد على وسائل الدفع</Label>
              <RadioGroup
                value={refundMode}
                onValueChange={(v) => setRefundMode(v as RefundMode)}
                className="flex flex-col gap-2"
              >
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="scaled" id="rf-scaled" />
                  <span>نسبة من مدفوعات الفاتورة الأصلية (موصى به عند دفع متعدد)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="single" id="rf-single" />
                  <span>كامل المبلغ المسترد على وسيلة واحدة</span>
                </label>
              </RadioGroup>
              {refundMode === 'single' ? (
                <div className="pt-1">
                  <Label className="text-xs text-muted-foreground">وسيلة الاسترداد</Label>
                  <Select value={singleMode} onValueChange={setSingleMode}>
                    <SelectTrigger className="h-9 mt-1">
                      <SelectValue placeholder="اختر وسيلة الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentModes.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            <p className="text-[10px] text-muted-foreground">
              تاريخ الترحيل للمرتجع: <span className="font-mono">{postingDate}</span>
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={
              busy ||
              sourceLoading ||
              !source ||
              !anyReturn ||
              (refundMode === 'single' && !singleMode.trim())
            }
          >
            {busy ? 'جاري التنفيذ…' : 'تأكيد المرتجع'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
