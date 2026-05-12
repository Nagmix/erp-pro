'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, ArrowUpLeft, ArrowDownLeft, ArrowLeftRight, Trash2, CreditCard, Send, Undo2, Eye, CalendarDays, Users, Wallet, ArrowRightLeft, Hash, MessageSquare, Landmark, Receipt, FileText } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/erp/page-header';
import { ErpListDateStatusFilters, type ErpStatusTab } from '@/components/erp/erp-list-date-status-filters';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useDeleteDoc, useSubmitDoc, useCancelDoc } from '@/lib/client/hooks';
import { buildPaymentEntry, type PaymentReferenceInput } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';
import { toast } from 'sonner';
import { ErpTabbedForm, type ErpTabDef } from '@/components/erp/erp-tabbed-form';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

/* ─── Section fieldset header component ─── */

function SectionFieldset({
  legend,
  icon: Icon,
  title,
  accent = 'primary',
  children,
}: {
  legend: string;
  icon: React.ElementType;
  title: string;
  accent?: 'primary' | 'info' | 'success' | 'warning' | 'destructive';
  children: ReactNode;
}) {
  const accentMap: Record<string, string> = {
    primary: 'from-primary/[0.04] via-transparent to-transparent',
    info: 'from-info/[0.04] via-transparent to-transparent',
    success: 'from-success/[0.04] via-transparent to-transparent',
    warning: 'from-warning/[0.04] via-transparent to-transparent',
    destructive: 'from-destructive/[0.04] via-transparent to-transparent',
  };
  const iconBgMap: Record<string, string> = {
    primary: 'bg-primary/10',
    info: 'bg-info/10',
    success: 'bg-success/10',
    warning: 'bg-warning/10',
    destructive: 'bg-destructive/10',
  };
  const iconTextMap: Record<string, string> = {
    primary: 'text-primary',
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  };

  return (
    <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
      <legend className="sr-only">{legend}</legend>
      <div className={`bg-gradient-to-l ${accentMap[accent]} px-4 py-2.5 border-b border-border/30`}>
        <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
          <span className={`h-5 w-5 rounded-md ${iconBgMap[accent]} flex items-center justify-center`}>
            <Icon className={`h-3 w-3 ${iconTextMap[accent]}`} />
          </span>
          {title}
        </h4>
      </div>
      <div className="p-4 space-y-4 bg-card/50">
        {children}
      </div>
    </fieldset>
  );
}

/* ─── Form field with icon label ─── */

function FormField({
  label,
  icon: Icon,
  error,
  children,
  required,
  hint,
}: {
  label: string;
  icon: React.ElementType;
  error?: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground flex items-center gap-2">
        <span className="h-6 w-6 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
        {label}
        {required && <span className="text-destructive text-xs me-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-muted-foreground/60 pe-8">{hint}</p>
      )}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[11px] text-destructive font-medium flex items-center gap-1 pe-8"
          >
            <Info className="h-3 w-3 shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PaymentRow | null>(null);
  const [peRefs, setPeRefs] = useState<PaymentReferenceInput[]>([]);
  const [peFxUnified, setPeFxUnified] = useState(true);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const chequeFlowHandled = useRef(false);
  const interBranchFundsHandled = useRef(false);
  const paymentVoucherHandled = useRef(false);
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

  const statusTabs: ErpStatusTab[] = [
    { value: 'all', label: 'الكل' },
    { value: '0', label: 'مسودة' },
    { value: '1', label: 'مرحّل' },
    { value: '2', label: 'ملغي' },
  ];

  // Filtered data
  const filteredData = useMemo(() => {
    let list = entries;
    if (statusFilter !== 'all') list = list.filter(p => String(p.docstatus) === statusFilter);
    if (dateFrom || dateTo) list = list.filter(p => rowInDateRangeISO(p.posting_date, dateFrom, dateTo));
    if (paymentTypeFilter !== 'all') list = list.filter(p => p.payment_type === paymentTypeFilter);
    return list;
  }, [entries, statusFilter, dateFrom, dateTo, paymentTypeFilter]);
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
    toast.success('تسجيل شيك', { description: 'اختر طريقة دفع من نوع شيك، وأدخل رقم الشيك في المرجع.' });
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
    toast.success('تحويل أموال بين الفروع', { description: 'حدد حساباً بنكياً أو صندوقاً في «من» و«إلى» ضمن نفس الشركة أو الفروع المرتبطة.' });
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
    toast.success('سند صرف', { description: 'اختر المورد أو نوع الطرف والحساب المدفوع منه.' });
  }, [toast, form]);

  const handleCreate = (formData: PaymentFormOutput) => {
    if (formData.payment_type !== 'Internal Transfer' && !formData.party) {
      toast.error('يرجى اختيار الطرف');
      return;
    }
    if (!defaultCo) {
      toast.error('تعذر تحديد الشركة');
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
        toast.error('مجموع المبالغ المخصصة يتجاوز المدفوع');
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
        toast.success('تم إنشاء عملية الدفع بنجاح');
        setDialogOpen(false);
        form.reset();
        setPeRefs([]);
      },
      onError: () => toast.error('حدث خطأ أثناء إنشاء عملية الدفع')});
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
          Receive: { icon: <ArrowUpLeft className="h-3.5 w-3.5" />, label: 'قبض', color: 'text-green-600 bg-primary/10' },
          Pay: { icon: <ArrowDownLeft className="h-3.5 w-3.5" />, label: 'صرف', color: 'text-destructive bg-destructive/10' },
          'Internal Transfer': { icon: <ArrowLeftRight className="h-3.5 w-3.5" />, label: 'تحويل داخلي', color: 'text-chart-1 bg-chart-1/10' }};
        const info = typeMap[String(value)] || { icon: null, label: String(value), color: '' };
        return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${info.color}`}>{info.icon}{info.label}</span>;
      }},
    {
      key: 'paid_amount',
      header: 'المبلغ',
      sortable: true,
      render: (value) => (
        <span className="font-semibold tabular-nums" dir="ltr">
          {formatCurrency(Number(value))}
        </span>
      )},
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
              <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                <Link href={href}><Eye className="h-3 w-3 ms-1" />عرض</Link>
              </Button>
            ) : null;
          })()}
          {Number(row.docstatus) === 0 && (
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => submitMutation.mutate(row.name, {
                onSuccess: () => { toast.success('تم ترحيل السند'); void refetch(); },
                onError: () => toast.error('فشل الترحيل — تحقق من البيانات')})}
            >
              <Send className="h-3 w-3 ms-1" />ترحيل
            </Button>
          )}
          {Number(row.docstatus) === 1 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2"
              onClick={() => cancelMutation.mutate(row.name, {
                onSuccess: () => { toast.success('تم إلغاء السند'); void refetch(); },
                onError: () => toast.error('فشل الإلغاء')})}
            >
              <Undo2 className="h-3 w-3 ms-1" />إلغاء
            </Button>
          )}
          {Number(row.docstatus) < 2 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive"
              onClick={() => { setSelectedEntry(row); setDeleteDialogOpen(true); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )},
  ], [submitMutation, cancelMutation, refetch, toast]);
  const clearFilters = () => { setDateFrom(''); setDateTo(''); setStatusFilter('all'); setPaymentTypeFilter('all'); };
  const hasActiveFilters = dateFrom || dateTo || statusFilter !== 'all' || paymentTypeFilter !== 'all';

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

      <ErpListDateStatusFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        statusTabs={statusTabs}
        extraFilters={
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">نوع السند</Label>
              <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                <SelectTrigger className="h-9 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="Receive">قبض</SelectItem>
                  <SelectItem value="Pay">صرف</SelectItem>
                  <SelectItem value="Internal Transfer">تحويل داخلي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-xs"
                onClick={clearFilters}
              >
                مسح الكل
              </Button>
            )}
          </div>
        }
      />

      <DataTable
        data={filteredData}
        columns={columns}
        searchable
        loading={isLoading}
        columnFilters
        stickyFirstColumn
        tableId="accounting-payment-entry"
        exportFileName="payment-entries.csv"
        printTitle="سندات القبض والصرف"
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
            <ErpTabbedForm
              tabs={[
                {
                  value: 'main',
                  label: 'معلومات الدفع',
                  icon: <CreditCard className="h-3.5 w-3.5" />,
                  content: (
                    <div className="space-y-5 py-4">
                      {/* ── Section 1: Basic Payment Info ── */}
                      <SectionFieldset legend="معلومات الدفع الأساسية" icon={CreditCard} title="معلومات الدفع الأساسية" accent="primary">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="النوع" icon={ArrowRightLeft} error={form.formState.errors.payment_type?.message} required hint="نوع عملية الدفع">
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
                          </FormField>

                          <FormField label="طريقة الدفع" icon={Wallet} error={form.formState.errors.mode_of_payment?.message} required hint="كيفية الدفع أو التحصيل">
                            <ErpLinkCombobox
                              doctype="Mode of Payment"
                              value={form.watch('mode_of_payment')}
                              onChange={(v) => form.setValue('mode_of_payment', v)}
                              placeholder="اختر طريقة الدفع"
                            />
                          </FormField>
                        </div>

                        {watchPaymentType !== 'Internal Transfer' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="نوع الطرف" icon={Users} hint="عميل أو مورد أو موظف">
                              <Select value={watchPartyType} onValueChange={v => { form.setValue('party_type', v); form.setValue('party', ''); }}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Customer">عميل</SelectItem>
                                  <SelectItem value="Supplier">مورد</SelectItem>
                                  <SelectItem value="Employee">موظف</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormField>
                            <FormField label="الطرف" icon={Users} required hint="اسم الجهة الدافعة أو المستلمة">
                              <ErpLinkCombobox
                                doctype={watchPartyType === 'Customer' ? 'Customer' : watchPartyType === 'Supplier' ? 'Supplier' : 'Employee'}
                                value={form.watch('party')}
                                onChange={(v) => form.setValue('party', v)}
                                displayKey={watchPartyType === 'Customer' ? 'customer_name' : watchPartyType === 'Supplier' ? 'supplier_name' : 'employee_name'}
                                placeholder="الطرف"
                              />
                            </FormField>
                          </div>
                        )}
                      </SectionFieldset>

                      {/* ── Section 2: Amounts & Accounts ── */}
                      <SectionFieldset legend="المبالغ والحسابات" icon={Landmark} title="المبالغ والحسابات" accent="info">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="الحساب الدافع (من)" icon={Landmark} hint="الحساب الذي يُخصم منه المبلغ">
                            <ErpLinkCombobox
                              doctype="Account"
                              value={form.watch('paid_from')}
                              onChange={(v) => form.setValue('paid_from', v)}
                              placeholder="الحساب المدفوع منه"
                            />
                          </FormField>
                          <FormField label="الحساب المستلم (إلى)" icon={Landmark} hint="الحساب الذي يُضاف إليه المبلغ">
                            <ErpLinkCombobox
                              doctype="Account"
                              value={form.watch('paid_to')}
                              onChange={(v) => form.setValue('paid_to', v)}
                              placeholder="الحساب المستلم فيه"
                            />
                          </FormField>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="المبلغ المدفوع" icon={Wallet} error={form.formState.errors.paid_amount?.message} required hint="المبلغ الفعلي المدفوع">
                            <Input type="number" placeholder="0.00" dir="ltr" {...form.register('paid_amount', { valueAsNumber: true })} />
                          </FormField>
                          <FormField label="المبلغ المستلم" icon={Wallet} hint="المبلغ المستلم بالعملة المحلية">
                            <Input type="number" placeholder="0.00" dir="ltr" {...form.register('received_amount', { valueAsNumber: true })} />
                          </FormField>
                        </div>
                      </SectionFieldset>

                      {/* ── Section 3: References & Details ── */}
                      <SectionFieldset legend="المراجع والتفاصيل" icon={Hash} title="المراجع والتفاصيل" accent="success">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="التاريخ" icon={CalendarDays} error={form.formState.errors.posting_date?.message} required hint="تاريخ ترحيل السند">
                            <Input type="date" dir="ltr" {...form.register('posting_date')} />
                          </FormField>
                          <FormField label="رقم المرجع (شيك/تأكيد)" icon={Hash} hint="رقم الشيك أو رقم التأكيد البنكي">
                            <Input placeholder="رقم المرجع" dir="ltr" {...form.register('reference_no')} />
                          </FormField>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="تاريخ المرجع" icon={CalendarDays} hint="تاريخ الشيك أو المستند المرجعي">
                            <Input type="date" dir="ltr" {...form.register('reference_date')} />
                          </FormField>
                          <FormField label="ملاحظات" icon={MessageSquare} hint="ملاحظات إضافية على السند">
                            <Input placeholder="ملاحظات إضافية" {...form.register('remarks')} />
                          </FormField>
                        </div>

                        {/* Exchange Rate Section */}
                        <div className="rounded-xl border border-border/40 overflow-hidden">
                          <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                            <div className="flex items-center gap-3">
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
                              <Label htmlFor="pe-fx-unified" className="text-[12px] font-bold text-foreground/70 flex items-center gap-2 cursor-pointer">
                                <span className="h-5 w-5 rounded-md bg-warning/10 flex items-center justify-center">
                                  <ArrowRightLeft className="h-3 w-3 text-warning" />
                                </span>
                                سعر صرف موحّد (حساب الدفع منه = حساب الدفع إليه بالنسبة لعملة الشركة)
                              </Label>
                            </div>
                          </div>
                          <div className="p-4 bg-card/50">
                            <div className={`grid gap-4 ${peFxUnified ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                              <FormField label={peFxUnified ? 'سعر الصرف (مصدر/هدف)' : 'سعر صرف المصدر (paid_from)'} icon={ArrowRightLeft} hint="اترك 1 للعملة المحلية">
                                <Input type="number" dir="ltr" step="any" min={0} placeholder="1" {...form.register('source_exchange_rate', { valueAsNumber: true })} />
                              </FormField>
                              {!peFxUnified && (
                                <FormField label="سعر صرف الهدف (paid_to)" icon={ArrowRightLeft} hint="اترك 1 للعملة المحلية">
                                  <Input type="number" dir="ltr" step="any" min={0} placeholder="1" {...form.register('target_exchange_rate', { valueAsNumber: true })} />
                                </FormField>
                              )}
                            </div>
                          </div>
                        </div>
                      </SectionFieldset>
                    </div>
                  ),
                },
                {
                  value: 'refs',
                  label: 'مراجع الفواتير',
                  icon: <Receipt className="h-3.5 w-3.5" />,
                  content: (
                    <div className="space-y-4 py-4">
              {refDoctype && watchPaymentType !== 'Internal Transfer' ? (
                <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">ربط بفواتير (مخصص)</Label>
                    <span className="text-xs text-muted-foreground">
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
                    </div>
                  ),
                },
                {
                  value: 'summary',
                  label: 'ملخص',
                  icon: <FileText className="h-3.5 w-3.5" />,
                  content: (
                    <div className="space-y-4 py-4">
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
                    </div>
                  ),
                },
              ]}
            />
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
              <div className="h-9 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
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
                  onSuccess: () => toast.success('تم حذف السند'),
                  onError: () => toast.error('حدث خطأ أثناء الحذف')});
                setDeleteDialogOpen(false);
              }
            }} variant="destructive" className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
