'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Plus, ArrowUpLeft, ArrowDownLeft, ArrowLeftRight, Trash2, CreditCard, Send, Undo2, Eye, FileText, Filter, ChevronDown, Upload, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/erp/page-header';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useDeleteDoc, useSubmitDoc, useCancelDoc } from '@/lib/client/hooks';
import { buildPaymentEntry, type PaymentReferenceInput } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';
import { useToast } from '@/hooks/use-toast';
import { translateAccountName } from '@/lib/core/arabic-labels';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';

interface PaymentRow {
  name: string;
  payment_type: string;
  posting_date: string;
  party_type: string;
  party: string;
  mode_of_payment: string;
  paid_amount: number;
  received_amount: number;
  paid_from: string;
  paid_to: string;
  reference_no: string;
  reference_date: string;
  docstatus: number;
  remarks?: string;
}

// ============================================================
// Zod Schema
// ============================================================

const paymentSchema = z.object({
  payment_type: z.string().min(1, 'نوع العملية مطلوب'),
  party_type: z.string(),
  party: z.string(),
  mode_of_payment: z.string().min(1, 'طريقة الدفع مطلوبة'),
  paid_from: z.string(),
  paid_to: z.string(),
  paid_amount: z.coerce.number().min(0.01, 'المبلغ مطلوب'),
  received_amount: z.coerce.number().min(0),
  posting_date: z.string().min(1, 'التاريخ مطلوب'),
  reference_no: z.string(),
  reference_date: z.string(),
  source_exchange_rate: z.coerce.number().min(0.000001, 'سعر صرف المصدر يجب أن يكون موجباً'),
  target_exchange_rate: z.coerce.number().min(0.000001, 'سعر صرف الهدف يجب أن يكون موجباً'),
  remarks: z.string()});

type PaymentFormInput = z.input<typeof paymentSchema>;
type PaymentFormOutput = z.output<typeof paymentSchema>;

// ============================================================
// Main Component
// ============================================================

export default function PaymentEntryPage() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PaymentRow | null>(null);
  const [peRefs, setPeRefs] = useState<PaymentReferenceInput[]>([]);
  const [peFxUnified, setPeFxUnified] = useState(true);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const chequeFlowHandled = useRef(false);
  const interBranchFundsHandled = useRef(false);
  const paymentVoucherHandled = useRef(false);

  const { toast } = useToast();
  const { company: defaultCo } = useDefaultCompanyName();
  const { data, isLoading, isError, error, refetch } = useDocList<PaymentRow>('Payment Entry', {
    fields: [
      'name',
      'payment_type',
      'posting_date',
      'party_type',
      'party',
      'mode_of_payment',
      'paid_amount',
      'received_amount',
      'paid_from',
      'paid_to',
      'reference_no',
      'reference_date',
      'docstatus',
      'remarks',
    ],
    order_by: 'posting_date desc',
    limit: 500,
  });
  const createMutation = useCreateDoc('Payment Entry');
  const deleteMutation = useDeleteDoc('Payment Entry');
  const submitMutation = useSubmitDoc<PaymentRow>('Payment Entry');
  const cancelMutation = useCancelDoc<PaymentRow>('Payment Entry');

  const form = useForm<PaymentFormInput, any, PaymentFormOutput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_type: 'Receive',
      party_type: 'Customer',
      party: '',
      mode_of_payment: '',
      paid_from: '',
      paid_to: '',
      paid_amount: 0,
      received_amount: 0,
      posting_date: new Date().toISOString().split('T')[0],
      reference_no: '',
      reference_date: '',
      source_exchange_rate: 1,
      target_exchange_rate: 1,
      remarks: ''}});

  const entries = data || [];

  // Filtered data
  const filteredData = useMemo(() => {
    let list = entries;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((row: any) =>
        ['name', 'party'].some(key => String(row.docstatus ?? '').toLowerCase().includes(q))
      );
    }
    if (typeFilter !== 'all') list = list.filter(p => p.payment_type === typeFilter);
    if (statusFilter !== 'all') list = list.filter(p => String(p.docstatus) === statusFilter);
    if (dateFrom) list = list.filter(p => p.posting_date >= dateFrom);
    if (dateTo) list = list.filter(p => p.posting_date <= dateTo);
    
    if (paymentTypeFilter !== 'all') {
      list = list.filter((row: any) => String(row.payment_type) === paymentTypeFilter);
    }return list;
  }, [entries, typeFilter, statusFilter, dateFrom, dateTo]);
const totalReceived = entries.filter(p => p.payment_type === 'Receive' && p.docstatus === 1).reduce((s, p) => s + p.paid_amount, 0);
  const totalPaid = entries.filter(p => p.payment_type === 'Pay' && p.docstatus === 1).reduce((s, p) => s + p.paid_amount, 0);
  const totalTransfers = entries.filter(p => p.payment_type === 'Internal Transfer' && p.docstatus === 1).reduce((s, p) => s + p.paid_amount, 0);
  const totalVouchers = entries.length;

  const watchPaymentType = form.watch('payment_type');
  const watchPartyType = form.watch('party_type');

  const refDoctype = useMemo(() => {
    if (watchPaymentType === 'Pay' && watchPartyType === 'Supplier') return 'Purchase Invoice';
    if (watchPaymentType === 'Receive' && watchPartyType === 'Customer') return 'Sales Invoice';
    return '';
  }, [watchPaymentType, watchPartyType]);

  const sumAllocated = useMemo(
    () => peRefs.reduce((s, r) => s + (r.allocated_amount > 0 ? r.allocated_amount : 0), 0),
    [peRefs]
  );

  useEffect(() => {
    if (dialogOpen && (watchPaymentType === 'Internal Transfer' || !refDoctype)) {
      setPeRefs([]);
    }
  }, [watchPaymentType, refDoctype, dialogOpen]);

  const watchSourceFx = form.watch('source_exchange_rate');
  useEffect(() => {
    if (peFxUnified) form.setValue('target_exchange_rate', watchSourceFx);
  }, [peFxUnified, watchSourceFx, form]);

  useEffect(() => {
    if (chequeFlowHandled.current || typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('chequeFlow') !== '1') return;
    chequeFlowHandled.current = true;
    window.history.replaceState({}, '', window.location.pathname);
    setPeFxUnified(true);
    setDialogOpen(true);
    toast({ title: 'تسجيل شيك', description: 'اختر طريقة دفع من نوع شيك، وأدخل رقم الشيك في المرجع.' });
  }, [toast]);

  useEffect(() => {
    if (interBranchFundsHandled.current || typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('interBranchFunds') !== '1') return;
    interBranchFundsHandled.current = true;
    window.history.replaceState({}, '', window.location.pathname);
    form.setValue('payment_type', 'Internal Transfer');
    form.setValue('party_type', '');
    form.setValue('party', '');
    setPeFxUnified(true);
    setDialogOpen(true);
    toast({ title: 'تحويل أموال بين الفروع', description: 'حدد حساباً بنكياً أو صندوقاً في «من» و«إلى» ضمن نفس الشركة أو الفروع المرتبطة.' });
  }, [toast, form]);

  useEffect(() => {
    if (paymentVoucherHandled.current || typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('paymentVoucher') !== '1') return;
    paymentVoucherHandled.current = true;
    window.history.replaceState({}, '', window.location.pathname);
    form.setValue('payment_type', 'Pay');
    form.setValue('party_type', 'Supplier');
    setPeFxUnified(true);
    setDialogOpen(true);
    toast({ title: 'سند صرف', description: 'اختر المورد أو نوع الطرف والحساب المدفوع منه.' });
  }, [toast, form]);

  const handleCreate = (formData: PaymentFormOutput) => {
    if (formData.payment_type !== 'Internal Transfer' && !formData.party) {
      toast({ title: 'يرجى اختيار الطرف', variant: 'destructive' });
      return;
    }
    if (!defaultCo) {
      toast({ title: 'تعذر تحديد الشركة', variant: 'destructive' });
      return;
    }
    const refs: PaymentReferenceInput[] =
      formData.payment_type === 'Internal Transfer' || !refDoctype
        ? []
        : peRefs
            .filter((r) => r.reference_name && r.allocated_amount > 0)
            .map((r) => ({
              reference_doctype: refDoctype,
              reference_name: r.reference_name,
              allocated_amount: r.allocated_amount}));
    if (refs.length) {
      const s = refs.reduce((a, b) => a + b.allocated_amount, 0);
      if (s > formData.paid_amount + 0.01) {
        toast({ title: 'مجموع المبالغ المخصصة يتجاوز المدفوع', variant: 'destructive' });
        return;
      }
    }
    const srcFx = Number(formData.source_exchange_rate) || 1;
    const tgtFx = peFxUnified ? srcFx : Number(formData.target_exchange_rate) || 1;
    const d = buildPaymentEntry({
      company: defaultCo,
      payment_type: formData.payment_type as 'Receive' | 'Pay' | 'Internal Transfer',
      party_type: formData.party_type,
      party: formData.party,
      posting_date: formData.posting_date,
      mode_of_payment: formData.mode_of_payment,
      paid_from: formData.paid_from,
      paid_to: formData.paid_to,
      paid_amount: formData.paid_amount,
      received_amount: formData.received_amount,
      reference_no: formData.reference_no,
      reference_date: formData.reference_date,
      references: refs.length ? refs : undefined,
      ...(srcFx !== 1 ? { source_exchange_rate: srcFx } : {}),
      ...(tgtFx !== 1 ? { target_exchange_rate: tgtFx } : {})});
    // Add remarks
    (d as Record<string, unknown>).remarks = formData.remarks || undefined;

    createMutation.mutate(d, {
      onSuccess: () => {
        toast({ title: 'تم إنشاء عملية الدفع بنجاح' });
        setDialogOpen(false);
        form.reset();
        setPeRefs([]);
      },
      onError: () => toast({ title: 'حدث خطأ أثناء إنشاء عملية الدفع', variant: 'destructive' })});
  };

  // Columns with actions
  const columns: Column<PaymentRow>[] = useMemo(() => [
    {
      key: 'name',
      header: 'رقم السند',
      sortable: true,
      width: 'w-28',
      render: (value) => {
        const nm = String(value);
        const href = docDetailPath('Payment Entry', nm);
        return href ? (
          <Link href={href} className="font-medium text-primary hover:underline">{nm}</Link>
        ) : (
          <span className="font-medium text-primary">{nm}</span>
        );
      }},
    {
      key: 'posting_date',
      header: 'التاريخ',
      sortable: true,
      render: (value) => formatDate(String(value))},
    {
      key: 'payment_type',
      header: 'النوع',
      render: (value) => {
        const typeMap: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
          Receive: { icon: <ArrowUpLeft className="h-3.5 w-3.5" />, label: 'قبض', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
          Pay: { icon: <ArrowDownLeft className="h-3.5 w-3.5" />, label: 'صرف', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
          'Internal Transfer': { icon: <ArrowLeftRight className="h-3.5 w-3.5" />, label: 'تحويل داخلي', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' }};
        const info = typeMap[String(value)] || { icon: null, label: String(value), color: '' };
        return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${info.color}`}>{info.icon}{info.label}</span>;
      }},
    {
      key: 'paid_amount',
      header: 'المبلغ',
      sortable: true,
      render: (value) => <span className="font-semibold tabular-nums">{formatCurrency(Number(value))}</span>},
    {
      key: 'party',
      header: 'الطرف',
      sortable: true,
      render: (value) => String(value) || '-'},
    {
      key: 'mode_of_payment',
      header: 'طريقة الدفع',
      render: (value) => String(value) || '-'},
    {
      key: 'docstatus',
      header: 'الحالة',
      render: (value) => <DocStatusBadge docstatus={Number(value) as 0 | 1 | 2} />},
    {
      key: 'actions',
      header: 'إجراءات',
      width: 'w-44',
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {(() => {
            const href = docDetailPath('Payment Entry', row.name);
            return href ? (
              <Button asChild size="sm" variant="outline" className="h-7 px-2 text-[10px]">
                <Link href={href}><Eye className="h-3 w-3 ms-1" />عرض</Link>
              </Button>
            ) : null;
          })()}
          {Number(row.docstatus) === 0 && (
            <Button
              type="button"
              size="sm"
              className="h-7 text-[10px] px-2"
              onClick={() => submitMutation.mutate(row.name, {
                onSuccess: () => { toast({ title: 'تم ترحيل السند' }); void refetch(); },
                onError: () => toast({ title: 'فشل الترحيل — تحقق من البيانات', variant: 'destructive' })})}
            >
              <Send className="h-3 w-3 ms-1" />ترحيل
            </Button>
          )}
          {Number(row.docstatus) === 1 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[10px] px-2"
              onClick={() => cancelMutation.mutate(row.name, {
                onSuccess: () => { toast({ title: 'تم إلغاء السند' }); void refetch(); },
                onError: () => toast({ title: 'فشل الإلغاء', variant: 'destructive' })})}
            >
              <Undo2 className="h-3 w-3 ms-1" />إلغاء
            </Button>
          )}
          {Number(row.docstatus) < 2 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-[10px] text-destructive"
              onClick={() => { setSelectedEntry(row); setDeleteDialogOpen(true); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )},
  ], [submitMutation, cancelMutation, refetch, toast]);
  const clearFilters = () => { setDateFrom(''); setDateTo(''); setStatusFilter('all'); setSearch(''); setPaymentTypeFilter('all'); };


  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="شاشة سندات القبض والصرف الموحدة"
        description="إدارة سندات القبض والصرف والتحويلات الداخلية وربطها بالمستندات"
        iconify="solar:wallet-money-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'سندات القبض والصرف' }]}
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setPeFxUnified(true);
              form.reset();
              setPeRefs([]);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            سند جديد
          </Button>
        }
      />

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث بالرقم أو الطرف..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
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
            {(dateFrom || dateTo || statusFilter !== 'all' || paymentTypeFilter !== 'all' || search) && (
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
            <Label className="text-[10px]">النوع</Label>
            <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="Receive">قبض</SelectItem>
                <SelectItem value="Pay">صرف</SelectItem>
                <SelectItem value="Internal Transfer">تحويل داخلي</SelectItem>
              </SelectContent>
            </Select>
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

      <DataTable
        data={filteredData}
        columns={columns}
        searchable
        loading={isLoading}
      />

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <span>إنشاء سند جديد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">اربط السطور أدناه بفواتير (تحصيل: فواتير مبيعات / صرف لمورد: فواتير شراء)</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)}>
            <Tabs defaultValue="main" className="w-full">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1 mb-1">
                <TabsTrigger value="main" className="text-xs">معلومات الدفع</TabsTrigger>
                <TabsTrigger value="refs" className="text-xs">مراجع الفواتير</TabsTrigger>
                <TabsTrigger value="summary" className="text-xs">ملخص</TabsTrigger>
              </TabsList>

              <TabsContent value="main" className="space-y-4 py-4 outline-none">
              <div className="space-y-2">
                <Label className="text-xs font-medium">النوع *</Label>
                <Select value={watchPaymentType} onValueChange={v => {
                  form.setValue('payment_type', v);
                  if (v === 'Internal Transfer') { form.setValue('party_type', ''); form.setValue('party', ''); }
                  else { form.setValue('party_type', 'Customer'); form.setValue('party', ''); }
                }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receive">تحصيل (سند قبض)</SelectItem>
                    <SelectItem value="Pay">صرف (سند صرف)</SelectItem>
                    <SelectItem value="Internal Transfer">تحويل داخلي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {watchPaymentType !== 'Internal Transfer' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">نوع الطرف *</Label>
                    <Select value={watchPartyType} onValueChange={v => { form.setValue('party_type', v); form.setValue('party', ''); }}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Customer">عميل</SelectItem>
                        <SelectItem value="Supplier">مورد</SelectItem>
                        <SelectItem value="Employee">موظف</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">الطرف *</Label>
                    <ErpLinkCombobox
                      doctype={watchPartyType === 'Customer' ? 'Customer' : watchPartyType === 'Supplier' ? 'Supplier' : 'Employee'}
                      value={form.watch('party')}
                      onChange={(v) => form.setValue('party', v)}
                      displayKey={watchPartyType === 'Customer' ? 'customer_name' : watchPartyType === 'Supplier' ? 'supplier_name' : 'employee_name'}
                      placeholder="الطرف"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-medium">طريقة الدفع *</Label>
                <ErpLinkCombobox
                  doctype="Mode of Payment"
                  value={form.watch('mode_of_payment')}
                  onChange={(v) => form.setValue('mode_of_payment', v)}
                  placeholder="اختر طريقة الدفع"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">الحساب الدافع (من)</Label>
                  <ErpLinkCombobox
                    doctype="Account"
                    value={form.watch('paid_from')}
                    onChange={(v) => form.setValue('paid_from', v)}
                    placeholder="الحساب المدفوع منه"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">الحساب المستلم (إلى)</Label>
                  <ErpLinkCombobox
                    doctype="Account"
                    value={form.watch('paid_to')}
                    onChange={(v) => form.setValue('paid_to', v)}
                    placeholder="الحساب المستلم فيه"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">المبلغ المدفوع *</Label>
                  <Input type="number" placeholder="0.00" dir="ltr" {...form.register('paid_amount', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">المبلغ المستلم</Label>
                  <Input type="number" placeholder="0.00" dir="ltr" {...form.register('received_amount', { valueAsNumber: true })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">التاريخ *</Label>
                  <Input type="date" dir="ltr" {...form.register('posting_date')} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">رقم المرجع (شيك/تأكيد)</Label>
                  <Input placeholder="رقم المرجع" dir="ltr" {...form.register('reference_no')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">ملاحظات</Label>
                <Input placeholder="ملاحظات إضافية" {...form.register('remarks')} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">تاريخ المرجع</Label>
                <Input type="date" dir="ltr" {...form.register('reference_date')} />
              </div>

              <div className="space-y-3 rounded-lg border border-border/40 bg-muted/15 p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="pe-fx-unified"
                    checked={peFxUnified}
                    onCheckedChange={(c) => {
                      const on = c === true;
                      setPeFxUnified(on);
                      if (on) {
                        form.setValue('target_exchange_rate', form.getValues('source_exchange_rate'));
                      }
                    }}
                  />
                  <Label htmlFor="pe-fx-unified" className="text-xs font-medium cursor-pointer">
                    سعر صرف موحّد (حساب الدفع منه = حساب الدفع إليه بالنسبة لعملة الشركة)
                  </Label>
                </div>
                <div className={`grid gap-3 ${peFxUnified ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">
                      {peFxUnified ? 'سعر الصرف (مصدر/هدف)' : 'سعر صرف المصدر (paid_from)'}
                    </Label>
                    <Input type="number" dir="ltr" step="any" min={0} placeholder="1" {...form.register('source_exchange_rate', { valueAsNumber: true })} />
                  </div>
                  {!peFxUnified && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">سعر صرف الهدف (paid_to)</Label>
                      <Input type="number" dir="ltr" step="any" min={0} placeholder="1" {...form.register('target_exchange_rate', { valueAsNumber: true })} />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  اترك 1 للعملة المحلية فقط.
                </p>
              </div>
              </TabsContent>

              <TabsContent value="refs" className="space-y-4 py-4 outline-none">
              {refDoctype && watchPaymentType !== 'Internal Transfer' ? (
                <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">ربط بفواتير (مخصص)</Label>
                    <span className="text-[10px] text-muted-foreground">
                      مجموع: {formatCurrency(sumAllocated)} / {formatCurrency(Number(form.watch('paid_amount')) || 0)}
                    </span>
                  </div>
                  {peRefs.map((r, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-8">
                        <ErpLinkCombobox
                          doctype={refDoctype}
                          value={r.reference_name}
                          onChange={(v) => {
                            setPeRefs((prev) => {
                              const n = [...prev];
                              n[i] = { ...n[i]!, reference_name: v, reference_doctype: refDoctype };
                              return n;
                            });
                          }}
                          placeholder={refDoctype === 'Sales Invoice' ? 'فاتورة مبيعات' : 'فاتورة شراء'}
                        />
                      </div>
                      <div className="col-span-3">
                        <Input type="number" dir="ltr" className="h-9 text-xs" placeholder="مبلغ"
                          value={r.allocated_amount || ''}
                          onChange={(e) => {
                            const a = parseFloat(e.target.value) || 0;
                            setPeRefs((prev) => {
                              const n = [...prev];
                              n[i] = { ...n[i]!, allocated_amount: a };
                              return n;
                            });
                          }}
                        />
                      </div>
                      <div className="col-span-1">
                        <Button type="button" variant="ghost" size="icon" className="h-9 text-destructive"
                          onClick={() => setPeRefs((prev) => prev.filter((_, j) => j !== i))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="w-full text-xs"
                    onClick={() => setPeRefs((prev) => [...prev, { reference_doctype: refDoctype, reference_name: '', allocated_amount: 0 }])}>
                    <Plus className="h-3.5 w-3.5" />
                    إضافة فاتورة
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground rounded-lg border border-dashed p-4 text-center">
                  مراجع الفواتير تظهر عند اختيار تحصيل من عميل (فواتير مبيعات) أو صرف لمورد (فواتير شراء).
                </p>
              )}
              </TabsContent>

              <TabsContent value="summary" className="space-y-4 py-4 outline-none">
                <div className="rounded-lg border border-border/40 bg-muted/20 p-4 text-xs space-y-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">نوع العملية</span>
                    <span className="font-medium">{watchPaymentType === 'Receive' ? 'سند قبض' : watchPaymentType === 'Pay' ? 'سند صرف' : 'تحويل داخلي'}</span>
                  </div>
                  {watchPaymentType !== 'Internal Transfer' && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">الطرف</span>
                      <span className="font-mono text-[11px] truncate max-w-[60%]" dir="ltr">{form.watch('party') || '—'}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">المبلغ</span>
                    <span className="font-bold tabular-nums">{formatCurrency(Number(form.watch('paid_amount') || 0))}</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
              <Button type="submit" disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">{createMutation.isPending ? 'جاري الحفظ...' : 'حفظ كمسودة'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد الحذف</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">هل أنت متأكد من حذف السند &quot;{selectedEntry?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (selectedEntry) {
                deleteMutation.mutate(selectedEntry.name, {
                  onSuccess: () => toast({ title: 'تم حذف السند' }),
                  onError: () => toast({ title: 'حدث خطأ أثناء الحذف', variant: 'destructive' })});
                setDeleteDialogOpen(false);
              }
            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
