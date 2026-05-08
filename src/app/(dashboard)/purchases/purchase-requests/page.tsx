'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { Plus, Trash2, Send, Undo2, ShoppingCart, Filter, ChevronDown, Upload, X } from 'lucide-react';
import { formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useToast } from '@/hooks/use-toast';
import { buildMaterialRequest, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { apiCallMethod, apiCreateDoc } from '@/lib/client/api';
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

interface MRRow {
  name: string;
  transaction_date: string;
  material_request_type?: string;
  status?: string;
  docstatus: number;
}

interface Line {
  item_code: string;
  qty: number;
  warehouse: string;
}

const emptyLine = (): Line => ({ item_code: '', qty: 1, warehouse: '' });

export default function PurchaseRequestsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [setWarehouse, setSetWarehouse] = useState('');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [converting, setConverting] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setStatusFilter('all'); };

  const { data, isLoading, isError, error, refetch } = useDocList<MRRow>('Material Request', {
    fields: ['name', 'transaction_date', 'material_request_type', 'status', 'docstatus'],
    order_by: 'transaction_date desc',
    limit: 500,
  });
  const createMutation = useCreateDoc<MRRow>('Material Request');
  const submitMutation = useSubmitDoc<MRRow>('Material Request');
  const cancelMutation = useCancelDoc<MRRow>('Material Request');
  const deleteMutation = useDeleteDoc('Material Request');

  const rows = data || [];

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => {
      const n = [...prev];
      n[i] = { ...n[i]!, ...patch };
      return n;
    });
  };

  const handleCreate = () => {
    if (!company) {
      toast({ title: 'تعذر تحديد الشركة', variant: 'destructive' });
      return;
    }
    if (lines.every((l) => !l.item_code)) {
      toast({ title: 'أضف صنافاً', variant: 'destructive' });
      return;
    }
    if (lines.some((l) => l.item_code && !l.warehouse && !setWarehouse)) {
      toast({ title: 'حدد مستودعاً افتراضياً أو لكل بند', variant: 'destructive' });
      return;
    }
    const doc = buildMaterialRequest({
      company,
      transaction_date: transactionDate,
      schedule_date: scheduleDate,
      material_request_type: 'Purchase',
      set_warehouse: setWarehouse || undefined,
      items: lines
        .filter((l) => l.item_code)
        .map((l) => ({
          item_code: l.item_code,
          qty: l.qty,
          warehouse: l.warehouse || setWarehouse || undefined}))});
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast({ title: 'تم إنشاء طلب المواد' });
        setDialogOpen(false);
        setLines([emptyLine()]);
        void refetch();
      },
      onError: () => toast({ title: 'تعذر الحفظ', variant: 'destructive' })});
  };

  const handleMakePo = async (mrName: string) => {
    setConverting(mrName);
    try {
      const mapped = await apiCallMethod<Record<string, unknown>>(
        'erpnext.stock.doctype.material_request.material_request.make_purchase_order',
        { source_name: mrName }
      );
      if (!mapped) throw new Error('لا استجابة');
      const body = prepareFrappeDocForCreate(mapped);
      await apiCreateDoc('Purchase Order', body);
      toast({ title: 'تم إنشاء أمر شراء من الطلب' });
      void queryClient.invalidateQueries({ queryKey: ['docList', 'Purchase Order'] });
      void refetch();
    } catch (e) {
      toast({ title: (e as Error).message || 'تعذر التحويل', variant: 'destructive' });
    } finally {
      setConverting(null);
    }
  };

  const columns: Column<MRRow>[] = useMemo(
    () => [
      { key: 'name', header: 'الرقم', sortable: true, render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
      { key: 'transaction_date', header: 'التاريخ', sortable: true, render: (v) => formatDate(String(v)) },
      { key: 'material_request_type', header: 'النوع', render: (v) => <span className="text-xs">{String(v ?? '—')}</span> },
      { key: 'status', header: 'الحالة', render: (v) => <span className="text-xs">{String(v ?? '—')}</span> },
      { key: 'docstatus', header: 'مستند', render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} /> },
      {
        key: '_a',
        header: 'إجراءات',
        width: 'w-44',
        render: (_v, row) => {
          const ds = Number(row.docstatus);
          return (
            <div className="flex flex-wrap gap-1">
              {ds === 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 text-[10px] px-2"
                  onClick={() =>
                    submitMutation.mutate(row.name, {
                      onSuccess: () => { toast({ title: 'تم الترحيل' }); void refetch(); },
                      onError: () => toast({ title: 'تعذر الترحيل', variant: 'destructive' })})
                  }
                >
                  <Send className="h-3 w-3" />
                  ترحيل
                </Button>
              )}
              {ds === 1 && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] px-2"
                    disabled={converting === row.name}
                    onClick={() => void handleMakePo(row.name)}
                  >
                    <ShoppingCart className="h-3 w-3" />
                    أمر شراء
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px] px-2"
                    onClick={() =>
                      cancelMutation.mutate(row.name, {
                        onSuccess: () => { toast({ title: 'أُلغي' }); void refetch(); },
                        onError: () => toast({ title: 'تعذر', variant: 'destructive' })})
                    }
                  >
                    <Undo2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          );
        }},
    ],
    [submitMutation, cancelMutation, toast, refetch, converting, queryClient]
  );

  return (
    <div className="erp-page-enter space-y-6" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />
      <PageHeader
        title="طلبات الشراء (طلب مواد)"
        description="إنشاء طلبات المواد ثم تحويلها إلى أوامر شراء بعد الاعتماد والترحيل"
        iconify="solar:cart-check-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المشتريات', href: '/purchases' }, { label: 'طلبات الشراء' }]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            طلب جديد
          </Button>
        }
      />

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث بالرقم..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
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
            <Label className="text-[10px]">من تاريخ</Label>
            <Input type="date" dir="ltr" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">إلى تاريخ</Label>
            <Input type="date" dir="ltr" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">الحالة</Label>
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

      <PageShell className="text-xs text-muted-foreground">
        بعد ترحيل الطلب يمكنك إنشاء <strong>أمر شراء</strong> مباشرة حسب الكميات المتبقية والصلاحيات المتاحة.
      </PageShell>

      <PageShell padded={false}>
        <DataTable
          data={rows}
          columns={columns}
          searchable
          loading={isLoading}
          onDelete={(row) => setDeleteName(row.name)}
        />
      </PageShell>
      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الطلب؟</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteName) return;
                deleteMutation.mutate(deleteName, {
                  onSuccess: () => { toast({ title: 'تم الحذف' }); setDeleteName(null); void refetch(); },
                  onError: () => toast({ title: 'تعذر الحذف', variant: 'destructive' })});
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>طلب شراء (طلب مواد)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">تاريخ الطلب</Label>
                <Input type="date" dir="ltr" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">تاريخ الجدولة</Label>
                <Input type="date" dir="ltr" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">مستودع افتراضي للبنود (اختياري)</Label>
              <ErpLinkCombobox doctype="Warehouse" value={setWarehouse} onChange={setSetWarehouse} />
            </div>
            <div className="border rounded-lg">
              <div className="bg-muted/50 px-3 py-2 flex justify-between items-center">
                <span className="text-xs font-semibold">البنود</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setLines((p) => [...p, emptyLine()])}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">الصنف</TableHead>
                    <TableHead className="text-xs w-24">الكمية</TableHead>
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
                        <ErpLinkCombobox doctype="Warehouse" value={line.warehouse} onChange={(v) => updateLine(idx, { warehouse: v })} />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7"
                          onClick={() => {
                            if (lines.length <= 1) return;
                            setLines((p) => p.filter((_, j) => j !== idx));
                          }}
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? '...' : 'حفظ مسودة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
