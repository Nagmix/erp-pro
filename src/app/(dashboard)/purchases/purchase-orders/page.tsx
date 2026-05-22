'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Package, Send, Undo2, FileInput, Receipt, Truck, FileText, Coins, Filter, ChevronDown, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { buildPurchaseOrder, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { apiCallMethod, apiCreateDoc } from '@/lib/client/api';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';
import { useBranchScope } from '@/lib/client/use-branch-scope';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PORow {
  name: string;
  supplier_name: string;
  transaction_date: string;
  base_grand_total: number;
  status: string;
  docstatus: number;
  per_billed?: number;
  per_received?: number;
}

interface Line {
  item_code: string;
  qty: number;
  rate: number;
  warehouse: string;
}

const emptyLine = (): Line => ({ item_code: '', qty: 1, rate: 0, warehouse: '' });

export default function PurchasesPurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [terms, setTerms] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [currency, setCurrency] = useState('YER');
  const [conversionRate, setConversionRate] = useState(1);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [mapping, setMapping] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setFilter('all'); };
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const { branch, setBranch, branchFilters, branchesEnabled } = useBranchScope();

  const { data, isLoading, isError, error, refetch } = useDocList<PORow>('Purchase Order', {
    fields: [
      'name',
      'supplier_name',
      'transaction_date',
      'base_grand_total',
      'per_billed',
      'per_received',
      'status',
      'docstatus',
    ],
    filters: company ? [['company', '=', company]] : undefined,
    order_by: 'transaction_date desc',
    limit: 500,
  });
  const createMutation = useCreateDoc<PORow>('Purchase Order');
  const submitMutation = useSubmitDoc<PORow>('Purchase Order');
  const cancelMutation = useCancelDoc<PORow>('Purchase Order');
  const deleteMutation = useDeleteDoc('Purchase Order');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PORow | null>(null);

  const rows = data || [];
  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((row: any) =>
        String(row.name || '').toLowerCase().includes(q) ||
        String(row.supplier_name || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom || dateTo) {
      list = list.filter((row: any) => rowInDateRangeISO(row.transaction_date, dateFrom, dateTo));
    }
    if (filter !== 'all') {
      list = list.filter((row: any) => row.status === filter);
    }
    if (branch && branchesEnabled) {
      list = list.filter((row: any) => String(row.branch || '') === branch);
    }
    return list;
  }, [rows, search, dateFrom, dateTo, filter, branch, branchesEnabled]);

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => {
      const n = [...prev];
      n[i] = { ...n[i]!, ...patch };
      return n;
    });
  };
  const addLine = () => setLines((p) => [...p, emptyLine()]);
  const removeLine = (i: number) => {
    if (lines.length === 1) return;
    setLines((p) => p.filter((_, j) => j !== i));
  };

  const handleCreate = () => {
    if (!supplier) {
      toast.error('اختر المورد');
      return;
    }
    if (!company) {
      toast.error('تعذر تحديد الشركة');
      return;
    }
    if (lines.some((l) => l.item_code && !l.warehouse)) {
      toast.error('مستودع لكل بند');
      return;
    }
    if (lines.every((l) => !l.item_code)) {
      toast.error('أضف صنفاً');
      return;
    }
    const doc = buildPurchaseOrder({
      company,
      supplier,
      transaction_date: transactionDate,
      cost_center: costCenter || undefined,
      terms: terms || undefined,
      currency: currency.trim() || 'YER',
      conversion_rate: conversionRate,
      items: lines
        .filter((l) => l.item_code)
        .map((l) => ({
          item_code: l.item_code,
          qty: l.qty,
          rate: l.rate,
          amount: l.qty * l.rate,
          warehouse: l.warehouse}))});
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء أمر الشراء');
        setDialogOpen(false);
        setLines([emptyLine()]);
        setSupplier('');
        setTerms('');
        setCurrency('YER');
        setConversionRate(1);
        void refetch();
      },
      onError: () => toast.error('تعذر الحفظ')});
  };

  const mapFromPo = async (
    method: 'erpnext.buying.doctype.purchase_order.purchase_order.make_purchase_receipt' | 'erpnext.buying.doctype.purchase_order.purchase_order.make_purchase_invoice',
    targetDoctype: 'Purchase Receipt' | 'Purchase Invoice',
    poName: string
  ) => {
    setMapping(`${targetDoctype}:${poName}`);
    try {
      const mapped = await apiCallMethod<Record<string, unknown>>(method, { source_name: poName });
      if (!mapped) throw new Error('لا استجابة من التحويل');
      const body = prepareFrappeDocForCreate(mapped);
      await apiCreateDoc(targetDoctype, body);
      toast.success(targetDoctype === 'Purchase Receipt' ? 'تم إنشاء إيصال استلام' : 'تم إنشاء فاتورة شراء');
      void queryClient.invalidateQueries({ queryKey: ['docList', targetDoctype] });
      void refetch();
    } catch (e) {
      toast.error((e as Error).message || 'تعذر التحويل');
    } finally {
      setMapping(null);
    }
  };

  const columns: Column<PORow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرقم',
        sortable: true,
        width: 'w-24',
        render: (v) => {
          const nm = String(v);
          const href = docDetailPath('Purchase Order', nm);
          return href ? (
            <Link href={href} className="font-medium text-primary hover:underline">
              {nm}
            </Link>
          ) : (
            <span className="font-medium text-primary">{nm}</span>
          );
        }},
      { key: 'supplier_name', header: 'المورد', sortable: true },
      { key: 'transaction_date', header: 'التاريخ', sortable: true, render: (v) => formatDate(String(v)) },
      { key: 'base_grand_total', header: 'الإجمالي', sortable: true, render: (v) => <span className="font-semibold tabular-nums">{formatCurrency(Number(v))}</span> },
      { key: 'per_received', header: 'استلام', width: 'w-16', render: (v) => `${Number(v ?? 0)}%` },
      { key: 'per_billed', header: 'فوترة', width: 'w-16', render: (v) => `${Number(v ?? 0)}%` },
      { key: 'status', header: 'الحالة', render: (v) => <StatusBadge status={String(v)} /> },
      {
        key: '_s',
        header: 'ترحيل',
        width: 'w-36',
        render: (_v, row) => {
          const ds = Number(row.docstatus);
          if (ds === 0) {
            return (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs gap-1"
                  disabled={submitMutation.isPending}
                  onClick={() =>
                    submitMutation.mutate(row.name, {
                      onSuccess: () => { toast.success('تم الترحيل'); void refetch(); },
                      onError: () => toast.error('تعذر الترحيل')})
                  }
                >
                  <Send className="h-3 w-3" />
                  ترحيل
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive"
                  onClick={() => { setSelectedOrder(row); setDeleteDialogOpen(true); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          }
          if (ds === 1) {
            return (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                disabled={cancelMutation.isPending}
                onClick={() =>
                  cancelMutation.mutate(row.name, {
                    onSuccess: () => { toast.success('أُلغي'); void refetch(); },
                    onError: () => toast.error('تعذر')})
                }
              >
                <Undo2 className="h-3 w-3" />
                إلغاء
              </Button>
            );
          }
          return '—';
        }},
      {
        key: '_m',
        header: 'من أمر شراء',
        width: 'w-36',
        render: (_v, row) => {
          const ds = Number(row.docstatus);
          if (ds !== 1) return <span className="text-muted-foreground text-xs">—</span>;
          const busy = mapping?.endsWith(row.name);
          return (
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[9px] gap-1 px-1"
                disabled={!!busy}
                onClick={() =>
                  void mapFromPo(
                    'erpnext.buying.doctype.purchase_order.purchase_order.make_purchase_receipt',
                    'Purchase Receipt',
                    row.name
                  )
                }
              >
                <Receipt className="h-3 w-3" />
                استلام
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[9px] gap-1 px-1"
                disabled={!!busy}
                onClick={() =>
                  void mapFromPo(
                    'erpnext.buying.doctype.purchase_order.purchase_order.make_purchase_invoice',
                    'Purchase Invoice',
                    row.name
                  )
                }
              >
                <FileInput className="h-3 w-3" />
                فاتورة
              </Button>
            </div>
          );
        }},
    ],
    [submitMutation, cancelMutation, deleteMutation, toast, refetch, mapping, queryClient]
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="أوامر الشراء"
        description="إدارة أوامر الشراء من الإنشاء حتى الترحيل والاستلام والفوترة"
        iconify="solar:bag-4-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المشتريات', href: '/purchases' }, { label: 'أوامر الشراء' }]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            أمر جديد
          </Button>
        }
      />

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث بالرقم أو المورد..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>

        {/* فلاتر متقدمة (قابلة للطي) */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" /> فلاتر متقدمة
                <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            {(dateFrom || dateTo || filter !== 'all' || search) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
            <Label className="text-xs">من تاريخ</Label>
            <Input type="date" dir="ltr" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">إلى تاريخ</Label>
            <Input type="date" dir="ltr" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">الحالة</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="Draft">مسودة</SelectItem>
                <SelectItem value="On Hold">معلق</SelectItem>
                <SelectItem value="To Receive and Bill">لاستلام والفوترة</SelectItem>
                <SelectItem value="To Receive">لاستلام</SelectItem>
                <SelectItem value="To Bill">للفوترة</SelectItem>
                <SelectItem value="Completed">مكتمل</SelectItem>
                <SelectItem value="Cancelled">ملغى</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {branchesEnabled && (
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md-ui)] border border-border/40 bg-[color:var(--surface)] p-3">
        <Label className="text-xs shrink-0 text-muted-foreground">تصفية القائمة حسب الفرع:</Label>
        <div className="w-full min-w-[200px] sm:w-64">
          <ErpLinkCombobox doctype="Branch" value={branch} onChange={setBranch} placeholder="كل الفروع" className="h-9 text-sm" />
        </div>
        {branch ? (
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setBranch('')}>
            إلغاء التصفية
          </Button>
        ) : null}
      </div>
      )}

      <PageShell className="space-y-4" padded={false}>
        <div className="px-4 pt-4">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-muted/35 flex flex-wrap h-auto">
              <TabsTrigger value="all" className="text-xs">الكل</TabsTrigger>
              <TabsTrigger value="Draft" className="text-xs">مسودة</TabsTrigger>
              <TabsTrigger value="To Receive" className="text-xs">للاستلام</TabsTrigger>
              <TabsTrigger value="To Bill" className="text-xs">للفوترة</TabsTrigger>
              <TabsTrigger value="Completed" className="text-xs">مكتمل</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <DataTable data={filtered} columns={columns} searchable loading={isLoading} tableId="purchase-orders-list" />
      </PageShell>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <span>أمر شراء جديد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات أمر الشراء في الحقول أدناه</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="header" className="w-full">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
              <TabsTrigger value="header" className="text-xs">
                رأس المستند
              </TabsTrigger>
              <TabsTrigger value="lines" className="text-xs">
                البنود
              </TabsTrigger>
              <TabsTrigger value="summary" className="text-xs">
                ملخص
              </TabsTrigger>
            </TabsList>
            <TabsContent value="header" className="space-y-4 mt-4 outline-none">
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-warning/10 flex items-center justify-center">
                      <Truck className="h-3 w-3 text-warning" />
                    </span>
                    بيانات الأمر
                  </h4>
                </div>
                <div className="p-4 space-y-4 bg-card/50">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">المورد <span className="text-destructive text-xs">*</span></Label>
                      <ErpLinkCombobox doctype="Supplier" value={supplier} onChange={setSupplier} displayKey="supplier_name" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">التاريخ</Label>
                      <Input type="date" dir="ltr" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="h-9" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">مركز تكلفة</Label>
                      <ErpLinkCombobox doctype="Cost Center" value={costCenter} onChange={setCostCenter} className="h-9" />
                    </div>
                  </div>
                </div>
              </fieldset>
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-success/10 flex items-center justify-center">
                      <Coins className="h-3 w-3 text-success" />
                    </span>
                    العملة والتحويل
                  </h4>
                </div>
                <div className="p-4 space-y-4 bg-card/50">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">العملة</Label>
                      <ErpLinkCombobox doctype="Currency" value={currency} onChange={setCurrency} placeholder="YER" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">سعر التحويل</Label>
                      <Input
                        type="number"
                        dir="ltr"
                        step="any"
                        min={0}
                        value={conversionRate || ''}
                        onChange={(e) => setConversionRate(Math.max(0.000001, Number(e.target.value) || 1))}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              </fieldset>
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center">
                      <FileText className="h-3 w-3 text-info" />
                    </span>
                    الشروط والملاحظات
                  </h4>
                </div>
                <div className="p-4 bg-card/50">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الشروط</Label>
                    <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} className="min-h-[80px] text-sm" />
                  </div>
                </div>
              </fieldset>
            </TabsContent>
            <TabsContent value="lines" className="mt-4 outline-none">
            <div className="border rounded-lg">
              <div className="bg-muted/50 px-3 py-2 flex justify-between">
                <span className="text-xs font-semibold">البنود</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={addLine}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">الصنف</TableHead>
                    <TableHead className="text-xs w-20">الكمية</TableHead>
                    <TableHead className="text-xs w-20">السعر</TableHead>
                    <TableHead className="text-xs">مستودع</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <ErpLinkCombobox doctype="Item" value={line.item_code} onChange={(v) => updateLine(idx, { item_code: v })} />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={line.qty}
                          onChange={(e) => updateLine(idx, { qty: Math.max(0, Number(e.target.value)) })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={line.rate}
                          onChange={(e) => updateLine(idx, { rate: Math.max(0, Number(e.target.value)) })}
                        />
                      </TableCell>
                      <TableCell>
                        <ErpLinkCombobox
                          doctype="Warehouse"
                          value={line.warehouse}
                          onChange={(v) => updateLine(idx, { warehouse: v })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" className="h-7" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </TabsContent>
            <TabsContent value="summary" className="mt-4 outline-none">
              <div className="rounded-lg border border-border/40 bg-muted/20 p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">بنود بصنف</span>
                  <span className="font-semibold">{lines.filter((l) => l.item_code).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">إجمالي تقديري</span>
                  <span className="font-bold tabular-nums">
                    {formatCurrency(lines.reduce((s, l) => s + l.qty * l.rate, 0))}
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
            <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">
                إلغاء
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">
                {createMutation.isPending ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ أمر الشراء'
                )}
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد حذف أمر الشراء</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">هل أنت متأكد من حذف أمر الشراء &quot;{selectedOrder?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedOrder) {
                  deleteMutation.mutate(selectedOrder.name, {
                    onSuccess: () => { toast.success('تم حذف أمر الشراء'); void refetch(); },
                    onError: () => toast.error('حدث خطأ أثناء الحذف')});
                  setDeleteDialogOpen(false);
                }
              }}
              variant="destructive" className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
