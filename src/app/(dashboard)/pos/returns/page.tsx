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
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowRight,
  Search,
  Undo2,
  Printer,
  Eye,
  FileText,
  Receipt,
  TrendingDown,
  CalendarDays,
  CreditCard,
  BarChart3,
  Inbox,
  Loader2,
  Hash,
  User,
  LinkIcon,
} from 'lucide-react';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { useDoc, useDocList } from '@/lib/client/hooks';
import { useCreatePosInvoice } from '@/lib/client/pos-hooks';
import { buildPosInvoiceReturn, type BuildPosInvoiceReturnOpts } from '@/lib/erp/erpnext-payloads';
import { formatCurrency } from '@/lib/core/helpers';
import { toast } from 'sonner';
import { PosReturnDialog } from '@/components/pos/pos-return-dialog';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/erp/empty-state';

type InvRow = {
  name: string;
  customer?: string;
  customer_name?: string;
  grand_total?: number;
  posting_date?: string;
  is_return?: number;
  return_against?: string;
  mode_of_payment?: string;
};

type ReturnDetailDoc = {
  name: string;
  customer?: string;
  customer_name?: string;
  grand_total?: number;
  posting_date?: string;
  is_return?: number;
  return_against?: string;
  mode_of_payment?: string;
  payments?: Record<string, unknown>[];
  items?: Record<string, unknown>[];
  creation?: string;
  owner?: string;
};

export default function PosReturnsPage() {
  const [q, setQ] = useState('');
  const [confirmName, setConfirmName] = useState<string | null>(null);
  const [tab, setTab] = useState<'original' | 'returns'>('original');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [viewReturnOpen, setViewReturnOpen] = useState(false);
  const [viewReturnName, setViewReturnName] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0]!;
  // ── Fetch original invoices (is_return=0) ──
  const { data: origData = [], isLoading: origLoading, isError: origIsError, error: origError, refetch: origRefetch } = useDocList<InvRow>('POS Invoice', {
    fields: ['name', 'customer', 'customer_name', 'grand_total', 'posting_date', 'is_return'],
    filters: { docstatus: 1, is_return: 0 },
    order_by: 'posting_date desc',
    limit: 200,
  });

  // ── Fetch return invoices (is_return=1) ──
  const { data: retData = [], isLoading: retLoading, isError: retIsError, error: retError, refetch: retRefetch } = useDocList<InvRow>('POS Invoice', {
    fields: ['name', 'customer', 'customer_name', 'grand_total', 'posting_date', 'is_return', 'return_against', 'mode_of_payment'],
    filters: { docstatus: 1, is_return: 1 },
    order_by: 'posting_date desc',
    limit: 200,
  });

  const isError = tab === 'original' ? origIsError : retIsError;
  const error = tab === 'original' ? origError : retError;

  // ── Apply filters ──
  const filteredOriginals = useMemo(() => {
    let result = origData;
    if (dateFrom) result = result.filter(r => r.posting_date && r.posting_date >= dateFrom);
    if (dateTo) result = result.filter(r => r.posting_date && r.posting_date <= dateTo);
    if (customerFilter.trim()) {
      const c = customerFilter.trim().toLowerCase();
      result = result.filter(r =>
        (r.customer_name && r.customer_name.toLowerCase().includes(c)) ||
        (r.customer && r.customer.toLowerCase().includes(c))
      );
    }
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      result = result.filter(r =>
        (r.name && r.name.toLowerCase().includes(t)) ||
        (r.customer_name && String(r.customer_name).toLowerCase().includes(t))
      );
    }
    return result;
  }, [origData, q, dateFrom, dateTo, customerFilter]);

  const filteredReturns = useMemo(() => {
    let result = retData;
    if (dateFrom) result = result.filter(r => r.posting_date && r.posting_date >= dateFrom);
    if (dateTo) result = result.filter(r => r.posting_date && r.posting_date <= dateTo);
    if (customerFilter.trim()) {
      const c = customerFilter.trim().toLowerCase();
      result = result.filter(r =>
        (r.customer_name && r.customer_name.toLowerCase().includes(c)) ||
        (r.customer && r.customer.toLowerCase().includes(c))
      );
    }
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      result = result.filter(r =>
        (r.name && r.name.toLowerCase().includes(t)) ||
        (r.customer_name && String(r.customer_name).toLowerCase().includes(t)) ||
        (r.return_against && r.return_against.toLowerCase().includes(t))
      );
    }
    return result;
  }, [retData, q, dateFrom, dateTo, customerFilter]);

  // ── KPIs ──
  const totalReturnsCount = retData.length;
  const totalReturnsAmount = retData.reduce((s, r) => s + Math.abs(Number(r.grand_total ?? 0)), 0);
  const todayStr = new Date().toISOString().split('T')[0]!;
  const returnsToday = retData.filter(r => r.posting_date === todayStr);
  const returnsTodayCount = returnsToday.length;
  const returnsTodayAmount = returnsToday.reduce((s, r) => s + Math.abs(Number(r.grand_total ?? 0)), 0);
  const avgReturnValue = totalReturnsCount > 0 ? totalReturnsAmount / totalReturnsCount : 0;

  // ── Payment method breakdown from returns ──
  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const r of retData) {
      const mode = r.mode_of_payment || 'غير محدد';
      const existing = map.get(mode) || { count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += Math.abs(Number(r.grand_total ?? 0));
      map.set(mode, existing);
    }
    return Array.from(map.entries()).map(([mode, data]) => ({ mode, ...data }));
  }, [retData]);

  // ── Return dialog logic ──
  const returnSource = useDoc<Record<string, unknown>>('POS Invoice', confirmName ?? '', {
    enabled: Boolean(confirmName),
  });
  const createReturn = useCreatePosInvoice();

  const handleConfirmReturn = async (opts: BuildPosInvoiceReturnOpts) => {
    const src = returnSource.data;
    if (!confirmName || !src) {
      toast.error('اختر فاتورة');
      return;
    }
    if (Number(src.is_return) === 1) {
      toast.error('هذه فاتورة مرتجع بالفعل');
      return;
    }
    const payRows = (src.payments as Record<string, unknown>[]) || [];
    if (!payRows.some((p) => p?.mode_of_payment)) {
      toast.error('الفاتورة الأصلية بدون جدول مدفوعات');
      return;
    }
    const doc = buildPosInvoiceReturn(src, today, opts);
    const pr = doc.payments as { mode_of_payment?: string; amount: number }[];
    if (!pr?.length) {
      toast.error('تعذر بناء صفوف المرتجع المالي');
      return;
    }
    try {
      await createReturn.mutateAsync({ doc: doc as Record<string, unknown> });
      toast.success('تم إنشاء وترحيل فاتورة المرتجع');
      setConfirmName(null);
      void origRefetch();
      void retRefetch();
    } catch (e) {
      toast.error('تعذر المرتجع', { description: e instanceof Error ? e.message : undefined });
    }
  };

  // ── View return detail ──
  const { data: returnDoc, isLoading: returnDocLoading } = useDoc<ReturnDetailDoc>('POS Invoice', viewReturnName ?? '', {
    enabled: viewReturnOpen && Boolean(viewReturnName),
  });

  const handlePrintReceipt = (invoiceName: string) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><title>إيصال مرتجع - ${invoiceName}</title>
      <style>body{font-family:system-ui,sans-serif;font-size:12px;padding:16px;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:4px;text-align:right;}</style>
      </head><body><h3>إيصال مرتجع نقطة البيع</h3><p>رقم الفاتورة: ${invoiceName}</p><p>تاريخ الطباعة: ${new Date().toLocaleDateString('en-US')}</p><script>window.print();</script></body></html>`);
    w.document.close();
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setCustomerFilter('');
    setQ('');
  };

  // ── Columns for return invoices DataTable ──
  const retColumns: Column<InvRow>[] = useMemo(() => [
    { key: 'name', header: 'رقم المرتجع', sortable: true, render: (v) => (
      <span className="font-mono text-xs font-medium text-warning">{String(v)}</span>
    )},
    { key: 'return_against', header: 'الفاتورة الأصلية', sortable: true, render: (v) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-mono text-xs text-primary underline cursor-help">{String(v || '—')}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">فاتورة البيع الأصلية</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )},
    { key: 'customer_name', header: 'العميل', sortable: true, render: (v) => (
      <span className="text-sm">{String(v || '—')}</span>
    )},
    { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => (
      <span className="text-xs tabular-nums">{String(v || '—')}</span>
    )},
    { key: 'grand_total', header: 'المبلغ المسترد', sortable: true, render: (v) => (
      <span className="text-xs tabular-nums font-medium text-destructive">{formatCurrency(Math.abs(Number(v ?? 0)))}</span>
    )},
    { key: 'mode_of_payment', header: 'وسيلة الدفع', render: (v) => (
      <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 border-0 bg-info/10 text-info">
        {String(v || '—')}
      </Badge>
    )},
    { key: 'is_return', header: 'النوع', width: 'w-24', render: () => (
      <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 border-0 bg-warning/10 text-warning">
        مرتجع
      </Badge>
    )},
  ], []);

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="مرتجعات نقطة البيع"
        description="بحث في الفواتير المرحّلة الأصلية ثم تحديد كميات الإرجاع ووسيلة استرداد المبلغ. عرض سجل المرتجعات السابقة وإحصائياتها."
        iconify="solar:undo-left-round-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'مرتجعات' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="shrink-0 gap-1">
              <Link href="/pos/invoices">
                <FileText className="h-3.5 w-3.5" />
                الفواتير
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="shrink-0 gap-1">
              <Link href="/pos/sell">
                شاشة البيع
                <ArrowRight className="h-4 w-4 rotate-180" />
              </Link>
            </Button>
          </div>
        }
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => { void origRefetch(); void retRefetch(); }} />
      {/* ── فلاتر التاريخ والعميل ── */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">من تاريخ</Label>
          <Input type="date" dir="ltr" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
          <Input type="date" dir="ltr" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
        </div>
        <div className="space-y-1 min-w-[180px]">
          <Label className="text-xs text-muted-foreground">فلتر العميل</Label>
          <ErpLinkCombobox
            doctype="Customer"
            value={customerFilter}
            onChange={setCustomerFilter}
            placeholder="كل العملاء..."
            className="h-8 text-xs"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم الفاتورة أو اسم العميل…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pe-9 h-8 text-xs"
            />
          </div>
        </div>
        {(dateFrom || dateTo || customerFilter || q) && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
            مسح الفلاتر
          </Button>
        )}
      </div>

      {/* ── تبويبات: الفواتير الأصلية / المرتجعات ── */}
      <PageShell className="space-y-4" padded={false}>
        <div className="px-4 pt-4">
          <Tabs value={tab} onValueChange={v => setTab(v as 'original' | 'returns')}>
            <TabsList className="bg-muted/35">
              <TabsTrigger value="original" className="text-xs">
                فواتير أصلية ({filteredOriginals.length})
              </TabsTrigger>
              <TabsTrigger value="returns" className="text-xs">
                سجل المرتجعات ({filteredReturns.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {tab === 'original' ? (
          /* ── جدول الفواتير الأصلية مع زر مرتجع ── */
          <div className="overflow-x-auto rounded-[var(--radius-md-ui)] border mx-4 mb-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-start">الفاتورة</TableHead>
                  <TableHead className="text-start">العميل</TableHead>
                  <TableHead className="text-start">التاريخ</TableHead>
                  <TableHead className="text-start">الإجمالي</TableHead>
                  <TableHead className="text-start">الحالة</TableHead>
                  <TableHead className="w-[140px] text-center">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {origLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري التحميل…
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!origLoading &&
                  filteredOriginals.map((r) => (
                    <TableRow key={r.name} className="hover:bg-primary/5 transition-colors">
                      <TableCell className="font-mono text-xs font-medium text-primary">{r.name}</TableCell>
                      <TableCell className="text-sm">{r.customer_name ?? '—'}</TableCell>
                      <TableCell className="text-xs tabular-nums">{r.posting_date ?? '—'}</TableCell>
                      <TableCell className="text-xs tabular-nums font-medium">
                        {formatCurrency(Number(r.grand_total ?? 0))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 border-0 bg-success/10 text-success">
                          أصلية
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-[10px] gap-1"
                            onClick={() => handlePrintReceipt(r.name)}
                          >
                            <Printer className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                {!origLoading && filteredOriginals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-4">
                      <EmptyState
                        title="لا توجد فواتير أصلية"
                        description="لم يتم العثور على فواتير نقطة بيع أصلية مطابقة للفلاتر الحالية."
                        icon={Inbox}
                        className="min-h-[180px]"
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* ── جدول المرتجعات السابقة ── */
          <div className="px-4 pb-4">
            <DataTable
              data={filteredReturns}
              columns={retColumns}
              searchable={false}
              loading={retLoading}
              onView={(row) => { setViewReturnName(row.name); setViewReturnOpen(true); }}
              tableId="pos-returns-history"
              exportFileName="pos_return_invoices.csv"
              printTitle="سجل مرتجعات نقطة البيع"
            />
          </div>
        )}
      </PageShell>

      {/* ── ملخص المرتجعات حسب وسيلة الدفع ── */}
      {paymentBreakdown.length > 0 && (
        <PageShell className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-info" />
            <h3 className="text-sm font-semibold">توزيع المرتجعات حسب وسيلة الدفع</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paymentBreakdown.map(pb => (
              <div key={pb.mode} className="rounded-lg border border-border/40 bg-muted/20 p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{pb.mode}</p>
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(pb.amount)}</p>
                </div>
                <Badge variant="outline" className="text-[10px] border-0 bg-info/10 text-info">
                  {pb.count} مرتجع
                </Badge>
              </div>
            ))}
          </div>
        </PageShell>
      )}

      {/* ── PosReturnDialog ── */}
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

      {/* ════════════════════════════════════════════════════════
          View Return Detail Dialog
          ════════════════════════════════════════════════════════ */}
      <Dialog open={viewReturnOpen} onOpenChange={setViewReturnOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <span>تفاصيل المرتجع</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5 font-mono">{viewReturnName}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {returnDocLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ms-3 text-sm text-muted-foreground">جاري تحميل البيانات...</span>
            </div>
          ) : returnDoc ? (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto">
              {/* البيانات الأساسية */}
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-warning/10 flex items-center justify-center"><Receipt className="h-3 w-3 text-warning" /></span>
                    بيانات المرتجع
                  </h4>
                </div>
                <div className="p-4 space-y-3 bg-card/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ReturnDetailField icon={<Hash className="h-3.5 w-3.5" />} label="رقم المرتجع" value={returnDoc.name} dir="ltr" />
                    <ReturnDetailField icon={<User className="h-3.5 w-3.5" />} label="العميل" value={returnDoc.customer_name} />
                    <ReturnDetailField icon={<CalendarDays className="h-3.5 w-3.5" />} label="تاريخ الترحيل" value={returnDoc.posting_date} />
                    <ReturnDetailField icon={<TrendingDown className="h-3.5 w-3.5" />} label="المبلغ المسترد" value={formatCurrency(Math.abs(Number(returnDoc.grand_total ?? 0)))} highlight />
                  </div>
                </div>
              </fieldset>

              {/* ربط بالفاتورة الأصلية */}
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center"><LinkIcon className="h-3 w-3 text-primary" /></span>
                    الفاتورة الأصلية
                  </h4>
                </div>
                <div className="p-4 bg-card/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium font-mono">{returnDoc.return_against || '—'}</span>
                    </div>
                    {returnDoc.return_against && (
                      <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" asChild>
                        <Link href={`/pos/invoices?highlight=${returnDoc.return_against}`}>
                          عرض الفاتورة
                          <ArrowRight className="h-3 w-3 rotate-180" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* وسيلة الدفع */}
              {returnDoc.payments && (returnDoc.payments as Record<string, unknown>[]).length > 0 && (
                <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                  <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                    <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                      <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><CreditCard className="h-3 w-3 text-info" /></span>
                      وسيلة الاسترداد
                    </h4>
                  </div>
                  <div className="p-4 bg-card/50 space-y-2">
                    {(returnDoc.payments as { mode_of_payment?: string; amount?: number }[]).map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{p.mode_of_payment || '—'}</span>
                        <span className="font-medium tabular-nums text-destructive">{formatCurrency(Math.abs(Number(p.amount ?? 0)))}</span>
                      </div>
                    ))}
                  </div>
                </fieldset>
              )}

              {/* بنود المرتجع */}
              {returnDoc.items && (returnDoc.items as Record<string, unknown>[]).length > 0 && (
                <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                  <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                    <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                      <span className="h-5 w-5 rounded-md bg-success/10 flex items-center justify-center"><Inbox className="h-3 w-3 text-success" /></span>
                      بنود المرتجع
                    </h4>
                  </div>
                  <div className="p-4 bg-card/50 space-y-2">
                    {(returnDoc.items as { item_code?: string; item_name?: string; qty?: number; rate?: number; amount?: number }[]).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs border-b border-border/20 pb-2 last:border-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.item_name || item.item_code || '—'}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{item.item_code}</p>
                        </div>
                        <div className="text-end shrink-0">
                          <p className="tabular-nums">الكمية: {Math.abs(Number(item.qty ?? 0))}</p>
                          <p className="tabular-nums text-muted-foreground">{formatCurrency(Math.abs(Number(item.amount ?? 0)))}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              تعذر تحميل بيانات المرتجع
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button variant="ghost" onClick={() => setViewReturnOpen(false)} className="text-muted-foreground">إغلاق</Button>
            {viewReturnName && (
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => handlePrintReceipt(viewReturnName)}
              >
                <Printer className="h-3.5 w-3.5" />
                طباعة الإيصال
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Reusable Detail Field for Return View Dialog ─── */
function ReturnDetailField({
  icon,
  label,
  value,
  dir,
  highlight,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  dir?: string;
  highlight?: boolean;
}) {
  const displayValue = value || '—';
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className={cn(
        'text-sm font-medium',
        highlight && 'text-destructive font-semibold',
        !value && 'text-muted-foreground',
      )} dir={dir}>
        {displayValue}
      </p>
    </div>
  );
}
