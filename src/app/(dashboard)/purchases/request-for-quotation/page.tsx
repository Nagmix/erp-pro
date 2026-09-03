'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Trash2, Send, Undo2, Filter, ChevronDown, Upload, X } from 'lucide-react';
import { formatDate } from '@/lib/core/helpers';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { buildRequestForQuotation } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
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

interface RFQRow {
  name: string;
  transaction_date: string;
  status?: string;
  docstatus: number;
}

interface SupLine {
  supplier: string;
}

interface ItemLine {
  item_code: string;
  qty: number;
  uom: string;
  warehouse: string;
}

const emptySup = (): SupLine => ({ supplier: '' });
const emptyItem = (): ItemLine => ({ item_code: '', qty: 1, uom: 'Nos', warehouse: '' });

export default function RequestForQuotationPage() {
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [subject, setSubject] = useState('طلب عروض أسعار');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<SupLine[]>([emptySup()]);
  const [items, setItems] = useState<ItemLine[]>([emptyItem()]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setStatusFilter('all'); };

  const { data, isLoading, isError, error, refetch } = useDocList<RFQRow>('Request for Quotation', {
    fields: ['name', 'transaction_date', 'status', 'docstatus'],
    filters: company ? [['company', '=', company]] : undefined,
    order_by: 'transaction_date desc',
    limit: 200,
  });
  const createMutation = useCreateDoc<RFQRow>('Request for Quotation');
  const submitMutation = useSubmitDoc<RFQRow>('Request for Quotation');
  const cancelMutation = useCancelDoc<RFQRow>('Request for Quotation');
  const deleteMutation = useDeleteDoc('Request for Quotation');

  const rows = data || [];

  const filteredRows = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((row: any) =>
        String(row.name || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom || dateTo) {
      list = list.filter((row: any) => rowInDateRangeISO(row.transaction_date, dateFrom, dateTo));
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

  const handleCreate = () => {
    if (!company) {
      toast.error('تعذر تحديد الشركة');
      return;
    }
    const supList = suppliers.map((s) => s.supplier).filter(Boolean);
    if (!supList.length) {
      toast.error('أضف مورداً واحداً على الأقل');
      return;
    }
    if (items.every((i) => !i.item_code)) {
      toast.error('أضف بنوداً');
      return;
    }
    const doc = buildRequestForQuotation({
      company,
      transaction_date: transactionDate,
      schedule_date: scheduleDate,
      subject,
      message_for_supplier: message || undefined,
      suppliers: supList,
      items: items
        .filter((i) => i.item_code && i.uom)
        .map((i) => ({
          item_code: i.item_code,
          qty: i.qty,
          uom: i.uom,
          schedule_date: scheduleDate,
          warehouse: i.warehouse || undefined}))});
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء طلب تسعير');
        setDialogOpen(false);
        setSuppliers([emptySup()]);
        setItems([emptyItem()]);
        void refetch();
      },
      onError: () => toast.error('تعذر الحفظ')});
  };

  const columns: Column<RFQRow>[] = useMemo(
    () => [
      { key: 'name', header: 'الرقم', sortable: true, render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
      { key: 'transaction_date', header: 'التاريخ', sortable: true, render: (v) => formatDate(String(v)) },
      { key: 'status', header: 'الحالة', render: (v) => <span className="text-xs">{String(v ?? '—')}</span> },
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
    [submitMutation, cancelMutation, toast, refetch]
  );

  return (
    <div className="erp-page-enter space-y-6" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />
      <PageHeader
        title="طلب عروض أسعار (طلب تسعير)"
        description="إرسال طلبات عروض الأسعار لعدة موردين مع تتبع حالة الاعتماد والمرحلة"
        iconify="solar:letter-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المشتريات', href: '/purchases' }, { label: 'طلب عروض أسعار' }]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            طلب تسعير جديد
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
        <DataTable data={filteredRows} columns={columns} searchable loading={isLoading} tableId="rfq-list" onDelete={(r) => setDeleteName(r.name)} />
      </PageShell>
      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف طلب التسعير؟</AlertDialogTitle>
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
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>طلب عروض أسعار</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">التاريخ</Label>
                <Input type="date" dir="ltr" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">تاريخ التوريد المطلوب</Label>
                <Input type="date" dir="ltr" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">الموضوع</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">رسالة للموردين</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[60px] text-sm" placeholder="اكتب رسالة العرض التي تظهر للمورد عند الإرسال" />
            </div>
            <div className="border rounded-lg">
              <div className="bg-muted/50 px-3 py-2 flex justify-between">
                <span className="text-xs font-semibold">الموردون</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSuppliers((p) => [...p, emptySup()])}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <Table>
                <TableBody>
                  {suppliers.map((s, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <ErpLinkCombobox doctype="Supplier" value={s.supplier} onChange={(v) => setSuppliers((p) => { const n = [...p]; n[idx] = { supplier: v }; return n; })} displayKey="supplier_name" />
                      </TableCell>
                      <TableCell className="w-10">
                        <Button type="button" variant="ghost" size="icon" className="h-7" onClick={()=> suppliers.length > 1 && setSuppliers((p) => p.filter((_, j) => j !== idx))} disabled={suppliers.length === 1}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="border rounded-lg">
              <div className="bg-muted/50 px-3 py-2 flex justify-between">
                <span className="text-xs font-semibold">البنود</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setItems((p) => [...p, emptyItem()])}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">الصنف</TableHead>
                    <TableHead className="text-xs w-20">الكمية</TableHead>
                    <TableHead className="text-xs w-24">وحدة القياس</TableHead>
                    <TableHead className="text-xs">مستودع</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <ErpLinkCombobox doctype="Item" value={it.item_code} onChange={(v) => setItems((p) => { const n = [...p]; n[idx] = { ...n[idx]!, item_code: v }; return n; })} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="h-8 text-xs" value={it.qty} onChange={(e) => setItems((p) => { const n = [...p]; n[idx] = { ...n[idx]!, qty: Math.max(0, Number(e.target.value)) }; return n; })} />
                      </TableCell>
                      <TableCell>
                        <ErpLinkCombobox doctype="UOM" value={it.uom} onChange={(v) => setItems((p) => { const n = [...p]; n[idx] = { ...n[idx]!, uom: v }; return n; })} />
                      </TableCell>
                      <TableCell>
                        <ErpLinkCombobox doctype="Warehouse" value={it.warehouse} onChange={(v) => setItems((p) => { const n = [...p]; n[idx] = { ...n[idx]!, warehouse: v }; return n; })} />
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" className="h-7" onClick={()=> items.length > 1 && setItems((p) => p.filter((_, j) => j !== idx))} disabled={items.length === 1}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ مسودة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
