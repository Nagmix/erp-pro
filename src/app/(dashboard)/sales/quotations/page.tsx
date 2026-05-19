'use client';

import { useMemo, useState } from 'react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, FileText, Send, Undo2, ShoppingCart, Filter, ChevronDown, Upload, X } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { buildQuotation, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { apiCallMethod, apiCreateDoc } from '@/lib/client/api';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface QuotationRow {
  name: string;
  party_name?: string;
  transaction_date: string;
  valid_till: string;
  base_grand_total: number;
  status: string;
  docstatus: number;
}

interface Line {
  item_code: string;
  qty: number;
  rate: number;
  amount: number;
}

const emptyLine = (): Line => ({ item_code: '', qty: 1, rate: 0, amount: 0 });

const STATUS_LABELS: Record<string, string> = {
  Open: 'مفتوح',
  Ordered: 'تم التحويل',
  Lost: 'مفقود',
  Cancelled: 'ملغى',
  Expired: 'منتهي'};

export default function QuotationsPage() {
  const [filter, setFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customer, setCustomer] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [validTill, setValidTill] = useState(() => new Date().toISOString().split('T')[0]!);
  const [terms, setTerms] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [currency, setCurrency] = useState('YER');
  const [conversionRate, setConversionRate] = useState(1);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quotationStatusFilter, setQuotationStatusFilter] = useState('all');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [converting, setConverting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationRow | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); };
  const queryClient = useQueryClient();
  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();

  const { data, isLoading, isError, error, refetch } = useDocList<QuotationRow>('Quotation', {
    fields: [
      'name',
      'party_name',
      'transaction_date',
      'valid_till',
      'base_grand_total',
      'status',
      'docstatus',
    ],
    order_by: 'transaction_date desc',
    limit: 500,
  });
  const createMutation = useCreateDoc<QuotationRow>('Quotation');
  const submitMutation = useSubmitDoc<QuotationRow>('Quotation');
  const cancelMutation = useCancelDoc<QuotationRow>('Quotation');
  const deleteMutation = useDeleteDoc('Quotation');

  const rows = data || [];
  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((row: any) =>
        String(row.name || '').toLowerCase().includes(q) ||
        String(row.party_name || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom || dateTo) {
      list = list.filter((row: any) => rowInDateRangeISO(row.transaction_date, dateFrom, dateTo));
    }
    const effectiveStatus = quotationStatusFilter !== 'all' ? quotationStatusFilter : (filter !== 'all' ? filter : 'all');
    if (effectiveStatus !== 'all') {
      list = list.filter((row: any) => row.status === effectiveStatus);
    }
    return list;
  }, [rows, search, dateFrom, dateTo, quotationStatusFilter, filter]);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.qty * l.rate, 0),
    [lines]
  );
  const tax = subtotal * 0.15;
  const grandTotal = subtotal + tax;

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i]!, ...patch };
      if (patch.qty != null || patch.rate != null) {
        next[i]!.amount = next[i]!.qty * next[i]!.rate;
      }
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
      toast.error('اختر العميل');
      return;
    }
    if (!defaultCompany) {
      toast.error('تعذر تحديد الشركة');
      return;
    }
    if (lines.every((l) => !l.item_code)) {
      toast.error('أضف صنفاً واحداً على الأقل');
      return;
    }
    const doc = buildQuotation({
      company: defaultCompany,
      customer,
      transaction_date: transactionDate,
      valid_till: validTill,
      cost_center: costCenter || undefined,
      terms: terms || undefined,
      currency: currency.trim() || 'YER',
      conversion_rate: conversionRate,
      items: lines.map((l) => ({
        item_code: l.item_code,
        qty: l.qty,
        rate: l.rate,
        amount: l.qty * l.rate}))});
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء عرض السعر');
        setDialogOpen(false);
        setCustomer('');
        setLines([emptyLine()]);
        setTerms('');
        setCurrency('YER');
        setConversionRate(1);
        void refetch();
      },
      onError: () => toast.error('تعذر الحفظ')});
  };

  const handleMakeSalesOrder = async (qName: string) => {
    setConverting(qName);
    try {
      const mapped = await apiCallMethod<Record<string, unknown>>(
        'erpnext.selling.doctype.quotation.quotation.make_sales_order',
        { source_name: qName }
      );
      if (!mapped) {
        throw new Error('لا استجابة من التحويل');
      }
      const body = prepareFrappeDocForCreate(mapped);
      await apiCreateDoc('Sales Order', body);
      toast.success('تم إنشاء أمر البيع من عرض السعر');
      void queryClient.invalidateQueries({ queryKey: ['docList', 'Sales Order'] });
    } catch (e) {
      toast.error((e as Error).message || 'تعذر التحويل');
    } finally {
      setConverting(null);
    }
  };

  const columns: Column<QuotationRow>[] = useMemo(
    () => [
      { key: 'name', header: 'الرقم', width: 'w-24', sortable: true, render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
      { key: 'party_name', header: 'العميل', sortable: true, render: (v) => String(v ?? '—') },
      { key: 'transaction_date', header: 'التاريخ', sortable: true, render: (v) => formatDate(String(v)) },
      { key: 'valid_till', header: 'صالح حتى', render: (v) => formatDate(String(v)) },
      { key: 'base_grand_total', header: 'الإجمالي', sortable: true, render: (v) => <span className="font-semibold tabular-nums">{formatCurrency(Number(v))}</span> },
      { key: 'status', header: 'الحالة', render: (v) => <StatusBadge status={String(v)} /> },
      {
        key: '_actions',
        header: 'ترحيل / تحويل',
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
                  className="h-7 text-xs px-2"
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
              )}
              {ds === 1 && (
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs px-2"
                  disabled={converting === row.name}
                  onClick={() => void handleMakeSalesOrder(row.name)}
                >
                  <ShoppingCart className="h-3 w-3" />
                  {converting === row.name ? '...' : 'أمر بيع'}
                </Button>
              )}
              {ds === 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2"
                  disabled={cancelMutation.isPending}
                  onClick={() =>
                    cancelMutation.mutate(row.name, {
                      onSuccess: () => { toast.success('أُلغي الترحيل'); void refetch(); },
                      onError: () => toast.error('تعذر الإلغاء')})
                  }
                >
                  <Undo2 className="h-3 w-3" />
                </Button>
              )}
              {ds === 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive"
                  onClick={() => { setSelectedQuotation(row); setDeleteDialogOpen(true); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        }},
    ],
    [converting, submitMutation, cancelMutation, deleteMutation, toast, refetch, queryClient]
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="عروض الأسعار"
        description="إدارة عروض الأسعار مع الترحيل والتحويل المباشر إلى أوامر بيع، وتتبع حالاتها"
        iconify="solar:document-text-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المبيعات', href: '/sales' }, { label: 'عروض الأسعار' }]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            عرض سعر جديد
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
            {(dateFrom || dateTo || quotationStatusFilter !== 'all' || search) && (
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
            <Select value={quotationStatusFilter} onValueChange={setQuotationStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="Draft">مسودة</SelectItem>
                <SelectItem value="Open">مفتوح</SelectItem>
                <SelectItem value="Ordered">مطلوب</SelectItem>
                <SelectItem value="Lost">فقد</SelectItem>
                <SelectItem value="Cancelled">ملغى</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card p-2">
        {['all', 'Open', 'Ordered', 'Lost'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === status ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {status === 'all' ? 'الكل' : STATUS_LABELS[status] ?? status}
          </button>
        ))}
      </div>

      <DataTable data={filtered} columns={columns} searchable loading={isLoading} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <span>عرض سعر جديد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات العرض والأصناف لحساب الإجمالي</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="header" className="w-full">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
              <TabsTrigger value="header" className="text-xs">رأس المستند</TabsTrigger>
              <TabsTrigger value="lines" className="text-xs">البنود</TabsTrigger>
              <TabsTrigger value="summary" className="text-xs">ملخص</TabsTrigger>
            </TabsList>

            <TabsContent value="header" className="space-y-4 mt-4 outline-none">
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70">البيانات الأساسية</h4>
                </div>
                <div className="p-4 space-y-4 bg-card/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">العميل <span className="text-destructive text-xs">*</span></Label>
                      <ErpLinkCombobox doctype="Customer" value={customer} onChange={setCustomer} displayKey="customer_name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">مركز تكلفة</Label>
                      <ErpLinkCombobox doctype="Cost Center" value={costCenter} onChange={setCostCenter} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">تاريخ العرض</Label>
                      <Input type="date" dir="ltr" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">صالح حتى</Label>
                      <Input type="date" dir="ltr" value={validTill} onChange={(e) => setValidTill(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">العملة</Label>
                      <ErpLinkCombobox doctype="Currency" value={currency} onChange={setCurrency} placeholder="YER" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">سعر التحويل</Label>
                      <Input type="number" dir="ltr" step="any" min={0} value={conversionRate || ''} onChange={(e) => setConversionRate(Math.max(0.000001, Number(e.target.value) || 1))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الشروط</Label>
                    <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} className="min-h-[60px] text-sm" />
                  </div>
                </div>
              </fieldset>
            </TabsContent>

            <TabsContent value="lines" className="mt-4 outline-none">
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-semibold">البنود</span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={addLine}><Plus className="h-3 w-3" /> إضافة صف</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs h-8 min-w-[200px]">الصنف</TableHead>
                      <TableHead className="text-xs h-8 w-20">الكمية</TableHead>
                      <TableHead className="text-xs h-8 w-24">السعر</TableHead>
                      <TableHead className="text-xs h-8 w-24">الإجمالي</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="py-1.5">
                          <ErpLinkCombobox doctype="Item" value={line.item_code} onChange={(v) => updateLine(idx, { item_code: v })} className="w-full" />
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Input type="number" className="h-8 text-xs" min={0} value={line.qty} onChange={(e) => updateLine(idx, { qty: Math.max(0, Number(e.target.value)) })} />
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Input type="number" className="h-8 text-xs" min={0} value={line.rate} onChange={(e) => updateLine(idx, { rate: Math.max(0, Number(e.target.value)) })} />
                        </TableCell>
                        <TableCell className="text-xs font-medium tabular-nums">{formatCurrency(line.qty * line.rate)}</TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
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
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span className="tabular-nums font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ضريبة تقديرية 15%</span>
                  <span className="tabular-nums">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-border/40">
                  <span>الإجمالي التقديري</span>
                  <span className="text-primary tabular-nums">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button disabled={createMutation.isPending} onClick={handleCreate} className="gap-1.5 min-w-[130px]">
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ عرض السعر'}
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
                <AlertDialogTitle className="text-base">تأكيد حذف عرض السعر</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">هل أنت متأكد من حذف عرض السعر &quot;{selectedQuotation?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedQuotation) {
                  deleteMutation.mutate(selectedQuotation.name, {
                    onSuccess: () => { toast.success('تم حذف عرض السعر'); void refetch(); },
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
