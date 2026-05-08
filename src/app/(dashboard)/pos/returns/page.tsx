'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { useDoc, useDocList } from '@/lib/client/hooks';
import { useCreatePosInvoice } from '@/lib/client/pos-hooks';
import { buildPosInvoiceReturn, type BuildPosInvoiceReturnOpts } from '@/lib/erp/erpnext-payloads';
import { formatCurrency } from '@/lib/core/helpers';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Search, Undo2 } from 'lucide-react';
import { PosReturnDialog } from '@/components/pos/pos-return-dialog';

type InvRow = {
  name: string;
  customer_name?: string;
  grand_total?: number;
  posting_date?: string;
  is_return?: number;
};

export default function PosReturnsPage() {
  const [q, setQ] = useState('');
  const [confirmName, setConfirmName] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0]!;
  const { toast } = useToast();

  const { data = [], isLoading, isError, error, refetch } = useDocList<InvRow>('POS Invoice', {
    fields: ['name', 'customer_name', 'grand_total', 'posting_date', 'is_return'],
    filters: { docstatus: 1, is_return: 0 },
    order_by: 'modified desc',
    limit: 100,
  });

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return data;
    return data.filter(
      (r) =>
        (r.name && r.name.toLowerCase().includes(t)) ||
        (r.customer_name && String(r.customer_name).toLowerCase().includes(t))
    );
  }, [data, q]);

  const returnSource = useDoc<Record<string, unknown>>('POS Invoice', confirmName ?? '', {
    enabled: Boolean(confirmName),
  });
  const createReturn = useCreatePosInvoice();

  const handleConfirmReturn = async (opts: BuildPosInvoiceReturnOpts) => {
    const src = returnSource.data;
    if (!confirmName || !src) {
      toast({ title: 'اختر فاتورة', variant: 'destructive' });
      return;
    }
    if (Number(src.is_return) === 1) {
      toast({ title: 'هذه فاتورة مرتجع بالفعل', variant: 'destructive' });
      return;
    }
    const payRows = (src.payments as Record<string, unknown>[]) || [];
    if (!payRows.some((p) => p?.mode_of_payment)) {
      toast({ title: 'الفاتورة الأصلية بدون جدول مدفوعات', variant: 'destructive' });
      return;
    }
    const doc = buildPosInvoiceReturn(src, today, opts);
    const pr = doc.payments as { mode_of_payment?: string; amount: number }[];
    if (!pr?.length) {
      toast({ title: 'تعذر بناء صفوف المرتجع المالي', variant: 'destructive' });
      return;
    }
    try {
      await createReturn.mutateAsync({ doc: doc as Record<string, unknown> });
      toast({ title: 'تم إنشاء وترحيل فاتورة المرتجع' });
      setConfirmName(null);
      void refetch();
    } catch (e) {
      toast({
        title: 'تعذر المرتجع',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    }
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="مرتجعات نقطة البيع"
        description="بحث في الفواتير المرحّلة الأصلية ثم تحديد كميات الإرجاع ووسيلة استرداد المبلغ وفق §9."
        iconify="solar:undo-left-round-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'مرتجعات' }]}
        actions={
          <Button variant="outline" size="sm" asChild className="shrink-0 gap-1">
            <Link href="/pos/sell">
              شاشة البيع
              <ArrowRight className="h-4 w-4 rotate-180" />
            </Link>
          </Button>
        }
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث برقم الفاتورة أو اسم العميل…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pe-9 h-10 text-sm"
        />
      </div>

      <div className="rounded-[var(--radius-md-ui)] border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-start">الفاتورة</TableHead>
              <TableHead className="text-start">العميل</TableHead>
              <TableHead className="text-start">التاريخ</TableHead>
              <TableHead className="text-start">الإجمالي</TableHead>
              <TableHead className="w-[120px] text-center">إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">
                  جاري التحميل…
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              rows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-mono text-xs font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm">{r.customer_name ?? '—'}</TableCell>
                  <TableCell className="text-xs tabular-nums">{r.posting_date ?? '—'}</TableCell>
                  <TableCell className="text-xs tabular-nums font-medium">
                    {formatCurrency(Number(r.grand_total ?? 0))}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 text-[10px] gap-1"
                      onClick={() => setConfirmName(r.name)}
                    >
                      <Undo2 className="h-3 w-3" />
                      مرتجع
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10 text-sm">
                  لا فواتير مطابقة.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PosReturnDialog
        open={Boolean(confirmName)}
        onOpenChange={(o) => !o && setConfirmName(null)}
        invoiceName={confirmName}
        source={returnSource.data}
        sourceLoading={returnSource.isLoading}
        postingDate={today}
        onConfirm={handleConfirmReturn}
        busy={createReturn.isPending}
      />
    </div>
  );
}
