'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { useDoc } from '@/lib/client/hooks';
import { useSubmitDraftPosInvoice } from '@/lib/client/pos-hooks';
import { formatCurrency } from '@/lib/core/helpers';
import { toast } from 'sonner';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildPosReceiptHtml, posInvoiceDocToReceiptSnapshot } from '@/lib/client/pos-receipt';
import { ArrowRight, Eye, Loader2, Printer } from 'lucide-react';

export default function PosInvoiceDetailPage() {
  const params = useParams();
  const name = typeof params?.name === 'string' ? decodeURIComponent(params.name) : '';
  const { company: defaultCompany } = useDefaultCompanyName();
  const submitDraftMut = useSubmitDraftPosInvoice();

  const { data, isLoading, isError, error, refetch } = useDoc<Record<string, unknown>>(
    'POS Invoice',
    name
  );

  const posProfileName =
    data && typeof data.pos_profile === 'string' ? String(data.pos_profile).trim() : '';

  const { data: profileDoc } = useDoc<Record<string, unknown>>(
    'POS Profile',
    posProfileName,
    { enabled: Boolean(posProfileName) && Number(data?.docstatus) === 0 }
  );

  const items = Array.isArray(data?.items) ? (data.items as Record<string, unknown>[]) : [];
  const payments = Array.isArray(data?.payments) ? (data.payments as Record<string, unknown>[]) : [];

  const profileModes = useMemo(() => {
    const rows = profileDoc?.payments;
    if (!Array.isArray(rows)) return [] as string[];
    const modes = rows
      .map((r) => String((r as Record<string, unknown>).mode_of_payment ?? '').trim())
      .filter(Boolean);
    return [...new Set(modes)];
  }, [profileDoc]);

  const paymentModesForFinalize = useMemo(() => {
    const fromInv = payments
      .map((p) => String(p.mode_of_payment ?? '').trim())
      .filter(Boolean);
    const set = new Set<string>([...profileModes, ...fromInv]);
    return [...set];
  }, [profileModes, payments]);

  const [finalizeAmounts, setFinalizeAmounts] = useState<Record<string, string>>({});

  const syncFinalizeFromDoc = useCallback(() => {
    if (!data || paymentModesForFinalize.length === 0) return;
    const next: Record<string, string> = {};
    for (const m of paymentModesForFinalize) next[m] = '';
    for (const p of payments) {
      const mode = String(p.mode_of_payment ?? '').trim();
      if (!mode) continue;
      const amt = Number(p.amount ?? 0);
      next[mode] = amt > 0 ? String(amt) : next[mode] ?? '';
    }
    queueMicrotask(() => setFinalizeAmounts(next));
  }, [data, paymentModesForFinalize, payments]);

  useEffect(() => {
    syncFinalizeFromDoc();
  }, [syncFinalizeFromDoc]);

  const grandTotal = Number(data?.rounded_total ?? data?.grand_total ?? 0);
  const finalizeSum = useMemo(() => {
    let s = 0;
    for (const m of paymentModesForFinalize) {
      s += Number(finalizeAmounts[m]) || 0;
    }
    return s;
  }, [finalizeAmounts, paymentModesForFinalize]);

  const finalizeOk = grandTotal <= 0 ? false : finalizeSum + 0.02 >= grandTotal;
  const isDraft = data != null && Number(data.docstatus) === 0;

  const companyDisplay =
    data && typeof data.company === 'string' && String(data.company).trim()
      ? String(data.company)
      : defaultCompany ?? '';

  const openReceiptPreview = (includePrintScript: boolean) => {
    if (!data) return;
    try {
      const snap = posInvoiceDocToReceiptSnapshot(data, companyDisplay);
      const w = window.open('', '_blank', 'width=420,height=640');
      if (!w) {
        toast.error('السماح بالنوافذ المنبثقة للطباعة أو المعاينة');
        return;
      }
      w.document.write(buildPosReceiptHtml(snap, { includePrintScript }));
      w.document.close();
    } catch (e) {
      toast.error('تعذر إعداد الإيصال', { description: e instanceof Error ? e.message : undefined });
    }
  };

  const handleFinalize = async () => {
    if (!name.trim()) return;
    if (!finalizeOk) {
      toast.error('مدفوعات غير كافية', { description: `يجب أن يغطي مجموع المدفوعات الإجمالي (${formatCurrency(grandTotal)}) قبل الترحيل` });
      return;
    }
    const paymentPayload = paymentModesForFinalize
      .map((mode) => ({
        mode_of_payment: mode,
        amount: Number(finalizeAmounts[mode]) || 0,
      }))
      .filter((p) => p.amount > 0.005);
    if (paymentPayload.length === 0) {
      toast.error('أدخل مبالغ الدفع');
      return;
    }
    try {
      const res = await submitDraftMut.mutateAsync({
        name: name.trim(),
        payments: paymentPayload,
      });
      toast.success('تم ترحيل الفاتورة', { description: `الإجمالي ${formatCurrency(res.rounded_total)}` });
      void refetch();
    } catch (e) {
      toast.error('تعذر الترحيل', { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="تفاصيل الفاتورة"
        description={<span className="font-mono text-sm tabular-nums">{name || '—'}</span>}
        iconify="solar:receipt-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'الفواتير', href: '/pos/invoices' }, { label: 'تفاصيل' }]}
        actions={
          data ? (
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => openReceiptPreview(false)}
              >
                <Eye className="h-3.5 w-3.5" />
                معاينة إيصال
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => openReceiptPreview(true)}
              >
                <Printer className="h-3.5 w-3.5" />
                طباعة إيصال
              </Button>
            </div>
          ) : null
        }
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">جاري التحميل…</p>
      ) : !data ? (
        <p className="text-sm text-destructive py-10 text-center">تعذر تحميل الفاتورة.</p>
      ) : (
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">البيانات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">العميل</span>
                <p className="font-medium">{String(data.customer_name ?? data.customer ?? '—')}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">التاريخ</span>
                <p className="font-medium tabular-nums">{String(data.posting_date ?? '—')}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">ملف نقطة البيع</span>
                <p className="font-medium">{String(data.pos_profile ?? '—')}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">حالة المستند</span>
                <p className="font-medium">
                  {Number(data.docstatus) === 1 ? 'مرحّل' : Number(data.docstatus) === 0 ? 'مسودة' : '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          {isDraft && (
            <Card className="border-amber-500/35 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">إكمال الدفع وترحيل المسودة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  عند الدفع الجزئي من شاشة البيع تُحفظ الفاتورة كمسودة. عدّل المبالغ أدناه حتى يغطي المجموع
                  الإجمالي النهائي ({formatCurrency(grandTotal)}) ثم رحّل.
                </p>
                {paymentModesForFinalize.length === 0 ? (
                  <p className="text-xs text-destructive">لا وسائل دفع في ملف نقطة البيع — راجع الملف في النظام.</p>
                ) : (
                  <div className="space-y-2">
                    {paymentModesForFinalize.map((m) => (
                      <div key={m} className="flex items-center gap-2">
                        <span className="text-xs w-[28%] min-w-0 truncate font-medium">{m}</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-9 flex-1 text-xs"
                          dir="rtl"
                          value={finalizeAmounts[m] ?? ''}
                          onChange={(e) =>
                            setFinalizeAmounts((prev) => ({ ...prev, [m]: e.target.value }))
                          }
                        />
                      </div>
                    ))}
                    <div className="flex justify-between text-xs pt-1">
                      <span className="text-muted-foreground">مجموع المدفوعات</span>
                      <span
                        className={
                          finalizeOk
                            ? 'text-green-700 dark:text-green-400 font-medium tabular-nums'
                            : 'text-destructive font-medium tabular-nums'
                        }
                      >
                        {formatCurrency(finalizeSum)} / {formatCurrency(grandTotal)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      className="w-full sm:w-auto gap-2"
                      disabled={submitDraftMut.isPending || !finalizeOk}
                      onClick={() => void handleFinalize()}
                    >
                      {submitDraftMut.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      ترحيل الفاتورة
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">البنود</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 overflow-x-auto">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">لا بنود.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">الصنف</TableHead>
                      <TableHead className="text-start">الكمية</TableHead>
                      <TableHead className="text-start">السعر</TableHead>
                      <TableHead className="text-start">المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{String(row.item_name ?? row.item_code ?? '—')}</TableCell>
                        <TableCell className="tabular-nums text-sm">{String(row.qty ?? '')}</TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {formatCurrency(Number(row.rate ?? 0))}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm font-medium">
                          {formatCurrency(Number(row.amount ?? Number(row.qty ?? 0) * Number(row.rate ?? 0)))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {payments.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">المدفوعات المحفوظة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm gap-4">
                    <span>{String(p.mode_of_payment ?? '—')}</span>
                    <span className="font-mono tabular-nums">{formatCurrency(Number(p.amount ?? 0))}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Separator />

          <div className="flex flex-wrap justify-between gap-4 text-sm">
            <span className="text-muted-foreground">الإجمالي</span>
            <span className="text-lg font-semibold tabular-nums">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
