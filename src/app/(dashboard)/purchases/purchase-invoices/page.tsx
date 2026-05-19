'use client';

import Link from 'next/link';
import { useMemo, useState, useRef } from 'react';
import { ErpListDateStatusFilters } from '@/components/erp/erp-list-date-status-filters';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Send, Undo2, FileText, FileInput, Truck, Package, Calculator, Upload, Filter, ChevronDown, X, Coins } from 'lucide-react';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { buildPurchaseInvoice } from '@/lib/erp/erpnext-payloads';
import { parseSalesInvoiceImportXlsx } from '@/lib/erp/parse-sales-invoice-import-xlsx';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { isBranchesEnabled } from '@/lib/core/setup-config';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';
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
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';

interface InvRow {
  name: string;
  company?: string;
  supplier_name: string;
  posting_date: string;
  due_date: string;
  base_grand_total: number;
  outstanding_amount: number;
  status: string;
  docstatus: number;
}

interface Line {
  item_code: string;
  description: string;
  qty: number;
  rate: number;
  warehouse: string;
}

const emptyLine = (): Line => ({ item_code: '', description: '', qty: 1, rate: 0, warehouse: '' });

function resetCreateForm(
  setSupplier: (v: string) => void,
  setPostingDate: (v: string) => void,
  setDueDate: (v: string) => void,
  setCostCenter: (v: string) => void,
  setTerms: (v: string) => void,
  setTaxesAndCharges: (v: string) => void,
  setBillNo: (v: string) => void,
  setDiscountAmount: (v: number) => void,
  setCurrency: (v: string) => void,
  setExchangeRate: (v: number) => void,
  setLines: (v: Line[]) => void
) {
  const t = new Date().toISOString().split('T')[0]!;
  setSupplier('');
  setPostingDate(t);
  setDueDate(t);
  setCostCenter('');
  setTerms('');
  setTaxesAndCharges('');
  setBillNo('');
  setDiscountAmount(0);
  setCurrency('YER');
  setExchangeRate(1);
  setLines([emptyLine()]);
}

export default function PurchasesPurchaseInvoicesPage() {
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const branchesEnabled = isBranchesEnabled();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvRow | null>(null);
  const purchaseLinesImportRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [costCenter, setCostCenter] = useState('');
  const [terms, setTerms] = useState('');
  const [taxesAndCharges, setTaxesAndCharges] = useState('');
  const [billNo, setBillNo] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [currency, setCurrency] = useState('YER');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setStatusFilter('all'); };

  const { data, isLoading, isError, error, refetch } = useDocList<InvRow>('Purchase Invoice', {
    fields: [
      'name',
      'company',
      'supplier_name',
      'posting_date',
      'due_date',
      'base_grand_total',
      'outstanding_amount',
      'status',
      'docstatus',
    ],
    filters: undefined,
    order_by: 'posting_date desc',
    limit: 500,
  });
  const createMutation = useCreateDoc<InvRow>('Purchase Invoice');
  const submitMutation = useSubmitDoc<InvRow>('Purchase Invoice');
  const cancelMutation = useCancelDoc<InvRow>('Purchase Invoice');
  const deleteMutation = useDeleteDoc('Purchase Invoice');

  const invoices = data || [];
  const filtered = useMemo(() => {
    let list = invoices;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((row: any) =>
        ['name', 'supplier_name'].some(key => String(row[key] ?? '').toLowerCase().includes(q))
      );
    }
    if (dateFrom || dateTo) {
      list = list.filter((i) => rowInDateRangeISO(i.posting_date, dateFrom, dateTo));
    }
    if (statusFilter !== 'all') {
      list = list.filter((i) => i.status === statusFilter);
    }
    return list;
  }, [invoices, dateFrom, dateTo, statusFilter, search]);

  const netTotal = useMemo(
    () => lines.reduce((s, l) => s + (l.item_code ? l.qty * l.rate : 0), 0),
    [lines]
  );
  const taxTotal = useMemo(
    () => (taxesAndCharges.trim() ? 0 : netTotal * 0.15),
    [netTotal, taxesAndCharges]
  );
  const grandTotal = useMemo(() => {
    const disc = discountAmount > 0 ? discountAmount : 0;
    if (taxesAndCharges.trim()) return netTotal - disc;
    return netTotal + taxTotal - disc;
  }, [netTotal, taxTotal, discountAmount, taxesAndCharges]);

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => {
      const n = [...prev];
      n[i] = { ...n[i]!, ...patch };
      return n;
    });
  };

  const importPurchaseLinesFromBuffer = async (buffer: ArrayBuffer) => {
    try {
      const rows = await parseSalesInvoiceImportXlsx(buffer);
      if (!rows.length) {
        toast.error('لم يُستخرج أي بند من Excel — عناوين: صنف، وصف، كمية، سعر، مستودع');
        return;
      }
      setLines(
        rows.map((r) => ({
          item_code: r.item_code,
          description: r.description,
          qty: r.qty,
          rate: r.rate,
          warehouse: r.warehouse || ''}))
      );
      toast.success(`تم استيراد ${rows.length} بنداً من Excel`);
    } catch {
      toast.error('تعذّر قراءة ملف Excel');
    }
  };

  const handleCreate = () => {
    if (!company || !supplier) {
      toast.error('الشركة والمورد مطلوبان');
      return;
    }
    if (!costCenter) {
      toast.error('مركز التكلفة مطلوب');
      return;
    }
    if (dueDate < postingDate) {
      toast.error('الاستحقاق لا يسبق تاريخ الفاتورة');
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
    const doc = buildPurchaseInvoice({
      company,
      supplier,
      posting_date: postingDate,
      due_date: dueDate,
      cost_center: costCenter,
      terms: terms || undefined,
      taxes_and_charges: taxesAndCharges.trim() || undefined,
      bill_no: billNo.trim() || undefined,
      additional_discount_amount: discountAmount > 0 ? discountAmount : undefined,
      currency: currency.trim() || 'YER',
      exchange_rate: exchangeRate,
      items: lines
        .filter((l) => l.item_code)
        .map((l) => ({
          item_code: l.item_code,
          description: l.description,
          qty: l.qty,
          rate: l.rate,
          amount: l.qty * l.rate,
          warehouse: l.warehouse}))});
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء فاتورة الشراء');
        setDialogOpen(false);
        resetCreateForm(
          setSupplier,
          setPostingDate,
          setDueDate,
          setCostCenter,
          setTerms,
          setTaxesAndCharges,
          setBillNo,
          setDiscountAmount,
          setCurrency,
          setExchangeRate,
          setLines
        );
        void refetch();
      },
      onError: () => toast.error('تعذر الحفظ')});
  };

  const columns: Column<InvRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرقم',
        sortable: true,
        render: (v) => {
          const nm = String(v);
          const href = docDetailPath('Purchase Invoice', nm);
          return href ? (
            <Link href={href} className="font-medium text-primary hover:underline">{nm}</Link>
          ) : (
            <span className="font-medium text-primary">{nm}</span>
          );
        }},
      {
        key: 'company',
        header: 'الشركة',
        render: (_v, row) => <span className="text-muted-foreground text-xs">{String(row.company || '—')}</span>},
      { key: 'supplier_name', header: 'المورد', sortable: true },
      { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => formatDate(String(v)) },
      { key: 'due_date', header: 'الاستحقاق', render: (v) => formatDate(String(v)) },
      { key: 'base_grand_total', header: 'الإجمالي', sortable: true, render: (v) => <span className="tabular-nums font-semibold">{formatCurrency(Number(v))}</span> },
      { key: 'outstanding_amount', header: 'مستحق', render: (v) => <span className={`tabular-nums ${Number(v) > 0 ? 'text-orange-600' : 'text-green-600'}`}>{formatCurrency(Number(v))}</span> },
      { key: 'status', header: 'الحالة', render: (v) => <StatusBadge status={String(v)} /> },
      {
        key: '_p',
        header: 'ترحيل',
        width: 'w-28',
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
                      onSuccess: () => {
                        toast.success('تم الترحيل');
                        void refetch();
                      },
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
                  onClick={() => { setSelectedInvoice(row); setDeleteDialogOpen(true); }}
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
                    onSuccess: () => {
                      toast.success('أُلغي');
                      void refetch();
                    },
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
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="فواتير الشراء"
        description={
          <span>
            إنشاء وترحيل فواتير الشراء مع قالب ضريبة الشراء (`taxes_and_charges`) كما في النظام؛ المرتجعات والقوالب من{' '}
            <Link href="/purchases/purchase-invoices/new" className="text-primary hover:underline font-medium">
              محرر فواتير الشراء
            </Link>
          </span>
        }
        iconify="solar:bag-check-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المشتريات', href: '/purchases' }, { label: 'فواتير الشراء' }]}
        actions={
          <Button
            size="sm"
            className="gap-1.5 shrink-0"
            disabled={coLoading}
            onClick={() => {
              resetCreateForm(
                setSupplier,
                setPostingDate,
                setDueDate,
                setCostCenter,
                setTerms,
                setTaxesAndCharges,
                setBillNo,
                setDiscountAmount,
                setCurrency,
                setExchangeRate,
                setLines
              );
              setDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            فاتورة جديدة
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
            {(dateFrom || dateTo || search) && (
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
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="Draft">مسودة</SelectItem>
                <SelectItem value="Unpaid">غير مدفوعة</SelectItem>
                <SelectItem value="Paid">مدفوعة</SelectItem>
                <SelectItem value="Overdue">متأخرة</SelectItem>
                <SelectItem value="Partly Paid">مدفوعة جزئياً</SelectItem>
                <SelectItem value="Return">مرتجع</SelectItem>
                <SelectItem value="Cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
      <PageShell className="space-y-4" padded={false}>
        <div className="px-4 pt-4">
          <ErpListDateStatusFilters
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            statusValue={statusFilter}
            onStatusChange={setStatusFilter}
            statusTabs={[
              { value: 'all', label: 'الكل' },
              { value: 'Draft', label: 'مسودة' },
              { value: 'Unpaid', label: 'غير مدفوعة' },
              { value: 'Paid', label: 'مدفوعة' },
              { value: 'Overdue', label: 'متأخرة' },
            ]}
            extraFilters={
              branchesEnabled ? (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1 min-w-[200px]">
                    <Label className="text-xs text-muted-foreground">الفرع</Label>
                    <ErpLinkCombobox doctype="Branch" value={branchFilter} onChange={setBranchFilter} placeholder="كل الفروع" />
                  </div>
                  {branchFilter ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 text-xs"
                      onClick={() => setBranchFilter('')}
                    >
                      مسح الفرع
                    </Button>
                  ) : null}
                </div>
              ) : undefined
            }
          />
        </div>
        <DataTable data={filtered} columns={columns} searchable loading={isLoading} />
      </PageShell>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد حذف فاتورة الشراء</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">هل أنت متأكد من حذف الفاتورة &quot;{selectedInvoice?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedInvoice) {
                  deleteMutation.mutate(selectedInvoice.name, {
                    onSuccess: () => { toast.success('تم حذف الفاتورة'); void refetch(); },
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) {
            resetCreateForm(
              setSupplier,
              setPostingDate,
              setDueDate,
              setCostCenter,
              setTerms,
              setTaxesAndCharges,
              setBillNo,
              setDiscountAmount,
              setCurrency,
              setExchangeRate,
              setLines
            );
          }
        }}
      >
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto p-5 gap-0">
          <input
            ref={purchaseLinesImportRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              void f.arrayBuffer().then((buf) => void importPurchaseLinesFromBuffer(buf));
              e.target.value = '';
            }}
          />
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <FileInput className="h-5 w-5" />
              </div>
              <div>
                <span>فاتورة شراء جديدة</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات الفاتورة</p>
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
                    بيانات الفاتورة
                  </h4>
                </div>
                <div className="p-4 space-y-4 bg-card/50">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">المورد <span className="text-destructive text-xs">*</span></Label>
                      <ErpLinkCombobox doctype="Supplier" value={supplier} onChange={setSupplier} displayKey="supplier_name" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">تاريخ الفاتورة</Label>
                      <Input type="date" dir="ltr" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} className="h-9" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">تاريخ الاستحقاق</Label>
                      <Input type="date" dir="ltr" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">رقم الفاتورة</Label>
                      <Input value={billNo} onChange={(e) => setBillNo(e.target.value)} className="h-9" placeholder="رقم فاتورة المورد" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">مركز تكلفة <span className="text-destructive text-xs">*</span></Label>
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
                        value={exchangeRate || ''}
                        onChange={(e) => setExchangeRate(Math.max(0.000001, Number(e.target.value) || 1))}
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
                      <Calculator className="h-3 w-3 text-info" />
                    </span>
                    الضرائب والخصومات
                  </h4>
                </div>
                <div className="p-4 space-y-4 bg-card/50">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">قالب الضرائب</Label>
                      <ErpLinkCombobox doctype="Purchase Taxes and Charges Template" value={taxesAndCharges} onChange={setTaxesAndCharges} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">خصم إضافي</Label>
                      <Input
                        type="number"
                        dir="ltr"
                        step="any"
                        min={0}
                        value={discountAmount || ''}
                        onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                        className="h-9"
                        placeholder="0"
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
                <div className="bg-muted/50 px-3 py-2 flex justify-between items-center">
                  <span className="text-xs font-semibold">البنود</span>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => purchaseLinesImportRef.current?.click()}>
                      <Upload className="h-3 w-3" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setLines((p) => [...p, emptyLine()])}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
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
                          <Button type="button" variant="ghost" size="icon" className="h-7" onClick={() => { if (lines.length > 1) setLines((p) => p.filter((_, j) => j !== idx)); }} disabled={lines.length === 1}>
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
                  <span className="text-muted-foreground">إجمالي صافي</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(netTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ضريبة (15%)</span>
                  <span className="font-semibold tabular-nums">{taxesAndCharges.trim() ? '— (قالب)' : formatCurrency(taxTotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">خصم</span>
                    <span className="font-semibold tabular-nums text-destructive">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border/40 pt-2">
                  <span className="font-bold">الإجمالي الكلي</span>
                  <span className="font-bold tabular-nums">{formatCurrency(grandTotal)}</span>
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
                'حفظ فاتورة الشراء'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
