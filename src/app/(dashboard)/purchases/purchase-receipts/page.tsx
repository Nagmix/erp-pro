'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { Plus, Trash2, Send, Undo2, Receipt, FileText, Truck, Package, Filter, ChevronDown, Upload, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { buildPurchaseReceipt } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PRRow {
  name: string;
  supplier_name: string;
  posting_date: string;
  base_grand_total?: number;
  docstatus: number;
  status?: string;
}

interface Line {
  item_code: string;
  qty: number;
  warehouse: string;
  purchase_order: string;
}

const emptyLine = (): Line => ({ item_code: '', qty: 1, warehouse: '', purchase_order: '' });

export default function PurchaseReceiptsPage() {
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [supplier, setSupplier] = useState('');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setStatusFilter('all'); };

  const { data, isLoading, isError, error, refetch } = useDocList<PRRow>('Purchase Receipt', {
    fields: ['name', 'supplier_name', 'posting_date', 'base_grand_total', 'docstatus', 'status'],
    order_by: 'posting_date desc',
    limit: 500,
  });
  const createMutation = useCreateDoc<PRRow>('Purchase Receipt');
  const submitMutation = useSubmitDoc<PRRow>('Purchase Receipt');
  const cancelMutation = useCancelDoc<PRRow>('Purchase Receipt');
  const deleteMutation = useDeleteDoc('Purchase Receipt');

  const rows = data || [];
  const filteredRows = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((row: any) =>
        String(row.name || '').toLowerCase().includes(q) ||
        String(row.supplier_name || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom || dateTo) {
      list = list.filter((row: any) => rowInDateRangeISO(row.posting_date, dateFrom, dateTo));
    }
    if (statusFilter !== 'all') {
      list = list.filter((row: any) => {
        const ds = Number(row.docstatus);
        if (statusFilter === '0') return ds === 0;
        if (statusFilter === '1') return ds === 1;
        if (statusFilter === '2') return ds === 2;
        return true;
      });
    }
    return list;
  }, [rows, search, dateFrom, dateTo, statusFilter]);

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => {
      const n = [...prev];
      n[i] = { ...n[i]!, ...patch };
      return n;
    });
  };

  const handleCreate = () => {
    if (!company || !supplier) {
      toast.error('الشركة والمورد مطلوبان');
      return;
    }
    if (lines.every((l) => !l.item_code)) {
      toast.error('أضف بنوداً');
      return;
    }
    if (lines.some((l) => l.item_code && !l.warehouse)) {
      toast.error('مستودع لكل بند');
      return;
    }
    const doc = buildPurchaseReceipt({
      company,
      supplier,
      posting_date: postingDate,
      items: lines
        .filter((l) => l.item_code)
        .map((l) => ({
          item_code: l.item_code,
          qty: l.qty,
          warehouse: l.warehouse,
          purchase_order: l.purchase_order || undefined}))});
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء إيصال الاستلام');
        setDialogOpen(false);
        setSupplier('');
        setLines([emptyLine()]);
        void refetch();
      },
      onError: () => toast.error('تعذر الحفظ')});
  };

  const columns: Column<PRRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرقم',
        sortable: true,
        render: (v) => {
          const nm = String(v);
          const href = docDetailPath('Purchase Receipt', nm);
          return href ? (
            <Link href={href} className="font-medium text-primary hover:underline">{nm}</Link>
          ) : (
            <span className="font-medium text-primary">{nm}</span>
          );
        }},
      { key: 'supplier_name', header: 'المورد', sortable: true },
      { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => formatDate(String(v)) },
      { key: 'base_grand_total', header: 'الإجمالي', sortable: true, render: (v) => <span className="font-semibold tabular-nums">{formatCurrency(Number(v || 0))}</span> },
      { key: 'docstatus', header: 'مستند', render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} /> },
      {
        key: '_a',
        header: 'ترحيل',
        width: 'w-28',
        render: (_v, row) => {
          const ds = Number(row.docstatus);
          if (ds === 0) {
            return (
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
    ],
    [submitMutation, cancelMutation, deleteMutation, toast, refetch]
  );

  return (
    <div className="erp-page-enter space-y-6" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />
      <PageHeader
        title="استلام المشتريات"
        description="إدارة إيصالات الاستلام مع الترحيل وربطها بأوامر الشراء عند الحاجة"
        iconify="solar:delivery-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المشتريات', href: '/purchases' }, { label: 'استلام المشتريات' }]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            إيصال جديد
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
            {(dateFrom || dateTo || statusFilter !== 'all' || search) && (
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="0">مسودة</SelectItem>
                <SelectItem value="1">مرحّل</SelectItem>
                <SelectItem value="2">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <PageShell padded={false}>
        <DataTable data={filteredRows} columns={columns} searchable loading={isLoading} onDelete={(r) => setDeleteName(r.name)} />
      </PageShell>
      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الإيصال؟</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteName) return;
                deleteMutation.mutate(deleteName, {
                  onSuccess: () => { toast.success('تم الحذف'); setDeleteName(null); void refetch(); },
                  onError: () => toast.error('تعذر الحذف')});
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <span>إيصال استلام جديد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات إيصال الاستلام</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-warning/10 flex items-center justify-center">
                    <Truck className="h-3 w-3 text-warning" />
                  </span>
                  بيانات الاستلام
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">المورد <span className="text-destructive text-xs">*</span></Label>
                    <ErpLinkCombobox doctype="Supplier" value={supplier} onChange={setSupplier} displayKey="supplier_name" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">تاريخ الاستلام</Label>
                    <Input type="date" dir="ltr" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} className="h-9" />
                  </div>
                </div>
              </div>
            </fieldset>
            <div className="border rounded-lg">
              <div className="bg-muted/50 px-3 py-2 flex justify-between">
                <span className="text-xs font-semibold">البنود</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setLines((p) => [...p, emptyLine()])}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">الصنف</TableHead>
                    <TableHead className="text-xs w-20">الكمية</TableHead>
                    <TableHead className="text-xs">مستودع</TableHead>
                    <TableHead className="text-xs">أمر شراء (اختياري)</TableHead>
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
                        <Input type="number" className="h-8 text-xs" value={line.qty} onChange={(e) => updateLine(idx, { qty: Math.max(0, Number(e.target.value)) })} />
                      </TableCell>
                      <TableCell>
                        <ErpLinkCombobox doctype="Warehouse" value={line.warehouse} onChange={(v) => updateLine(idx, { warehouse: v })} />
                      </TableCell>
                      <TableCell>
                        <ErpLinkCombobox doctype="Purchase Order" value={line.purchase_order} onChange={(v) => updateLine(idx, { purchase_order: v })} />
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" className="h-7" onClick={() => lines.length > 1 && setLines((p) => p.filter((_, j) => j !== idx))} disabled={lines.length === 1}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">
                إلغاء
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">
                {createMutation.isPending ? '...' : 'حفظ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
