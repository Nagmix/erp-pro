'use client';

import { useMemo, useState } from 'react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Truck, Send, Undo2, FileText, Filter, ChevronDown, Upload, X } from 'lucide-react';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useToast } from '@/hooks/use-toast';
import { buildDeliveryNote } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DNRow {
  name: string;
  customer_name: string;
  posting_date: string;
  base_grand_total: number;
  per_billed?: number;
  status: string;
  docstatus: number;
}

interface Line {
  item_code: string;
  qty: number;
  rate: number;
  warehouse: string;
}

const emptyLine = (): Line => ({ item_code: '', qty: 1, rate: 0, warehouse: '' });

export default function DeliveryNotesPage() {
  const [filter, setFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customer, setCustomer] = useState('');
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [terms, setTerms] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dnStatusFilter, setDnStatusFilter] = useState('all');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); };
  const { toast } = useToast();
  const { company, isLoading: coLoading } = useDefaultCompanyName();

  const { data, isLoading, isError, error, refetch } = useDocList<DNRow>('Delivery Note', {
    fields: [
      'name',
      'customer_name',
      'posting_date',
      'base_grand_total',
      'per_billed',
      'status',
      'docstatus',
    ],
    order_by: 'posting_date desc',
    limit: 500,
  });
  const createMutation = useCreateDoc<DNRow>('Delivery Note');
  const submitMutation = useSubmitDoc<DNRow>('Delivery Note');
  const cancelMutation = useCancelDoc<DNRow>('Delivery Note');

  const rows = data || [];
  const filtered = filter === 'all' ? rows : rows.filter((d) => d.status === filter);

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i]!, ...patch };
      return next;
    });
  };

  const addLine = () => setLines((p) => [...p, emptyLine()]);
  const removeLine = (i: number) => {
    if (lines.length === 1) return;
    setLines((p) => p.filter((_, j) => j !== i));
  };

  const handleCreate = () => {
    if (!customer) {
      toast({ title: 'اختر العميل', variant: 'destructive' });
      return;
    }
    if (!company) {
      toast({ title: 'تعذر تحديد الشركة', variant: 'destructive' });
      return;
    }
    if (lines.some((l) => l.item_code && !l.warehouse)) {
      toast({ title: 'مستودع لكل بند', variant: 'destructive' });
      return;
    }
    if (lines.every((l) => !l.item_code)) {
      toast({ title: 'أضف صنفاً', variant: 'destructive' });
      return;
    }
    const doc = buildDeliveryNote({
      company,
      customer,
      posting_date: postingDate,
      cost_center: costCenter || undefined,
      terms: terms || undefined,
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
        toast({ title: 'تم إنشاء إشعار التسليم' });
        setDialogOpen(false);
        setLines([emptyLine()]);
        setCustomer('');
        setTerms('');
        void refetch();
      },
      onError: () => toast({ title: 'تعذر الحفظ', variant: 'destructive' })});
  };

  const columns: Column<DNRow>[] = useMemo(
    () => [
      { key: 'name', header: 'الرقم', sortable: true, width: 'w-24', render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
      { key: 'customer_name', header: 'العميل', sortable: true },
      { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => formatDate(String(v)) },
      { key: 'base_grand_total', header: 'الإجمالي', sortable: true, render: (v) => <span className="font-semibold tabular-nums">{formatCurrency(Number(v))}</span> },
      { key: 'per_billed', header: 'فوترة', width: 'w-20', render: (v) => `${Number(v ?? 0)}%` },
      { key: 'status', header: 'الحالة', render: (v) => <StatusBadge status={String(v)} /> },
      {
        key: '_s',
        header: 'ترحيل',
        width: 'w-24',
        render: (_v, row) => {
          const ds = Number(row.docstatus);
          if (ds === 0) {
            return (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-[10px] gap-1"
                disabled={submitMutation.isPending}
                onClick={() =>
                  submitMutation.mutate(row.name, {
                    onSuccess: () => { toast({ title: 'تم الترحيل' }); void refetch(); },
                    onError: () => toast({ title: 'تعذر الترحيل', variant: 'destructive' })})
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
                className="h-7 text-[10px]"
                onClick={() =>
                  cancelMutation.mutate(row.name, {
                    onSuccess: () => { toast({ title: 'أُلغي' }); void refetch(); },
                    onError: () => toast({ title: 'تعذر', variant: 'destructive' })})
                }
              >
                <Undo2 className="h-3 w-3" />
              </Button>
            );
          }
          return '—';
        }},
    ],
    [submitMutation, cancelMutation, toast, refetch]
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="إشعارات التسليم"
        description="تتبع إشعارات التسليم مع الترحيل وربطها بفواتير المبيعات"
        iconify="solar:delivery-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المبيعات', href: '/sales' }, { label: 'إشعارات التسليم' }]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            إشعار جديد
          </Button>
        }
      />

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث بالرقم أو العميل..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
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
            {(dateFrom || dateTo || dnStatusFilter !== 'all' || search) && (
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
            <Select value={dnStatusFilter} onValueChange={setDnStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="Draft">مسودة</SelectItem>
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

      <PageShell className="space-y-4" padded={false}>
        <div className="px-4 pt-4">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-muted/35">
              <TabsTrigger value="all" className="text-xs">الكل</TabsTrigger>
              <TabsTrigger value="Draft" className="text-xs">مسودة</TabsTrigger>
              <TabsTrigger value="To Bill" className="text-xs">للفوترة</TabsTrigger>
              <TabsTrigger value="Completed" className="text-xs">مكتمل</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <DataTable data={filtered} columns={columns} searchable loading={isLoading} />
      </PageShell>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <span>إشعار تسليم جديد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات التسليم والأصناف المطلوبة</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70">بيانات التسليم</h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">العميل <span className="text-destructive text-xs">*</span></Label>
                    <ErpLinkCombobox doctype="Customer" value={customer} onChange={setCustomer} displayKey="customer_name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">التاريخ</Label>
                    <Input type="date" dir="ltr" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">مركز تكلفة</Label>
                    <ErpLinkCombobox doctype="Cost Center" value={costCenter} onChange={setCostCenter} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">ملاحظات / شروط</Label>
                  <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} className="min-h-[50px] text-sm" />
                </div>
              </div>
            </fieldset>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 flex justify-between items-center">
                <span className="text-xs font-semibold">البنود</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={addLine}><Plus className="h-3 w-3" /> إضافة</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">الصنف</TableHead>
                    <TableHead className="text-xs w-20">الكمية</TableHead>
                    <TableHead className="text-xs w-20">السعر</TableHead>
                    <TableHead className="text-xs">المستودع</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell><ErpLinkCombobox doctype="Item" value={line.item_code} onChange={(v) => updateLine(idx, { item_code: v })} /></TableCell>
                      <TableCell><Input type="number" className="h-8 text-xs" value={line.qty} onChange={(e) => updateLine(idx, { qty: Math.max(0, Number(e.target.value)) })} /></TableCell>
                      <TableCell><Input type="number" className="h-8 text-xs" value={line.rate} onChange={(e) => updateLine(idx, { rate: Math.max(0, Number(e.target.value)) })} /></TableCell>
                      <TableCell><ErpLinkCombobox doctype="Warehouse" value={line.warehouse} onChange={(v) => updateLine(idx, { warehouse: v })} /></TableCell>
                      <TableCell><Button type="button" variant="ghost" size="icon" className="h-7" onClick={() => removeLine(idx)} disabled={lines.length === 1}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ إشعار التسليم'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


