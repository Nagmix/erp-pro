'use client';

import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
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
  DialogFooter,
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
import { Plus, Receipt, Trash2, Upload, FileSpreadsheet, Loader2, CalendarDays, Users, Landmark, Wallet, ArrowRightLeft, Hash, MessageSquare, Building2 } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { ErpListDateStatusFilters, type ErpStatusTab } from '@/components/erp/erp-list-date-status-filters';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { buildExpenseClaimCreate } from '@/lib/erp/erpnext-payloads';
import { apiCreateDoc } from '@/lib/client/api';
import type { ParsedExpenseLine } from '@/lib/erp/parse-expense-import-xlsx';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Info } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
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

interface ExpenseRow {
  name: string;
  company?: string;
  employee?: string;
  employee_name?: string;
  posting_date?: string;
  total_claimed_amount?: number;
  total_sanctioned_amount?: number;
  status?: string;
  docstatus?: number;
  remark?: string;
  cost_center?: string;
}

interface ExpenseItem {
  expense_date: string;
  expense_type: string;
  amount: number;
  description: string;
  cost_center?: string;
}

const emptyItem = (defaultDate: string): ExpenseItem => ({
  expense_date: defaultDate,
  expense_type: '',
  amount: 0,
  description: '',
  cost_center: ''});

const expenseSchema = z.object({
  employee: z.string().min(1, 'يرجى اختيار الموظف'),
  posting_date: z.string().min(1, 'تاريخ الترحيل مطلوب'),
  cost_center: z.string(),
  remark: z.string(),
  currency: z.string().min(1, 'العملة مطلوبة'),
  exchange_rate: z.coerce.number().min(0.000001, 'سعر الصرف يجب أن يكون موجباً')});

type ExpenseFormInput = z.input<typeof expenseSchema>;
type ExpenseFormOutput = z.output<typeof expenseSchema>;

export default function ExpensesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [docstatusFilter, setDocstatusFilter] = useState<string>('all');
  const expenseImportRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<ExpenseRow | null>(null);
  const [items, setItems] = useState<ExpenseItem[]>(() => [emptyItem(new Date().toISOString().split('T')[0]!)]);

  // استيراد مباشر من Excel
  const headerImportRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importEmployee, setImportEmployee] = useState('');
  const [importDate, setImportDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [importCostCenter, setImportCostCenter] = useState('');
  const [importRemark, setImportRemark] = useState('');
  const [importLines, setImportLines] = useState<ParsedExpenseLine[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importFileLoading, setImportFileLoading] = useState(false);
  const { company: defaultCompany, isLoading: companyLoading } = useDefaultCompanyName();
  const { data, isLoading, isError, error, refetch } = useDocList<ExpenseRow>('Expense Claim', {
    fields: [
      'name',
      'company',
      'employee',
      'employee_name',
      'posting_date',
      'total_claimed_amount',
      'total_sanctioned_amount',
      'status',
      'docstatus',
      'remark',
      'cost_center',
    ],
    order_by: 'posting_date desc',
    limit: 500,
  });
  const createMutation = useCreateDoc('Expense Claim');
  const deleteMutation = useDeleteDoc('Expense Claim');

  // تحقق من توفر نوع المستند على الخادم
  const [doctypeAvailable, setDoctypeAvailable] = useState<boolean | null>(null);
  const [doctypeCheckMessage, setDoctypeCheckMessage] = useState<string>('');

  // فحص توفر Expense Claim عند تحميل الصفحة
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/data/Expense%20Claim?fields=["name"]&limit=1');
        const j = await res.json();
        if (!cancelled) {
          if (j.success) {
            setDoctypeAvailable(true);
          } else {
            setDoctypeAvailable(false);
            setDoctypeCheckMessage(j.error || 'نوع المستند غير متوفر على الخادم');
          }
        }
      } catch {
        if (!cancelled) {
          setDoctypeAvailable(false);
          setDoctypeCheckMessage('تعذر الاتصال بالخادم');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const form = useForm<ExpenseFormInput, any, ExpenseFormOutput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      employee: '',
      posting_date: new Date().toISOString().split('T')[0],
      cost_center: '',
      remark: '',
      currency: 'YER',
      exchange_rate: 1}});

  const expenses = data || [];
  const docstatusTabs: ErpStatusTab[] = [
    { value: 'all', label: 'الكل' },
    { value: '0', label: 'مسودة' },
    { value: '1', label: 'مرحّل' },
    { value: '2', label: 'ملغي' },
  ];

  const filteredData = useMemo(() => {
    let list = expenses;
    if (dateFrom || dateTo) {
      list = list.filter((e) => rowInDateRangeISO(e.posting_date, dateFrom, dateTo));
    }
    if (docstatusFilter !== 'all') {
      list = list.filter((row) => String(row.docstatus) === docstatusFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter((row) => String(row.status) === statusFilter);
    }
    return list;
  }, [expenses, dateFrom, dateTo, statusFilter, docstatusFilter]);

  const expenseStatusTabs = useMemo(
    () => [
      { value: 'all', label: 'الكل' },
      { value: 'Draft', label: 'مسودة' },
      { value: 'Submitted', label: 'مُرحّل' },
      { value: 'Approved', label: 'موافق' },
      { value: 'Paid', label: 'مدفوع' },
      { value: 'Rejected', label: 'مرفوض' },
    ],
    []
  );  const totalAmount = useMemo(() => items.reduce((s, i) => s + i.amount, 0), [items]);

  const columns: Column<ExpenseRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'رقم المطالبة',
        sortable: true,
        width: 'w-28',
        render: (value) => <span className="font-medium text-primary">{String(value)}</span>},
      {
        key: 'company',
        header: 'الشركة',
        render: (_v, row) => <span className="text-muted-foreground text-xs">{String(row.company || '—')}</span>},
      {
        key: 'employee_name',
        header: 'الموظف',
        sortable: true,
        render: (_v, row) => String(row.employee_name || row.employee || '—')},
      {
        key: 'posting_date',
        header: 'التاريخ',
        sortable: true,
        render: (value) => formatDate(String(value || ''))},
      {
        key: 'total_claimed_amount',
        header: 'المبلغ',
        sortable: true,
        render: (_v, row) => (
          <span className="font-semibold tabular-nums" dir="ltr">
            {formatCurrency(Number(row.total_sanctioned_amount ?? row.total_claimed_amount ?? 0))}
          </span>
        )},
      { key: 'cost_center', header: 'مركز التكلفة', render: (v) => String(v || '—') },
      { key: 'docstatus', header: 'حالة الترحيل', render: (value) => <DocStatusBadge docstatus={Number(value) as 0 | 1 | 2} /> },
      { key: 'status', header: 'الحالة', render: (value) => <StatusBadge status={String(value || '')} /> },
      { key: 'remark', header: 'ملاحظات', render: (v) => <span className="max-w-[200px] truncate block">{String(v || '')}</span> },
    ],
    []
  );

  const updateItem = (index: number, field: keyof ExpenseItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      (updated[index] as unknown as Record<string, string | number>)[field] = value;
      return updated;
    });
  };

  const addItem = () =>
    setItems((prev) => [...prev, emptyItem(form.getValues('posting_date') || new Date().toISOString().split('T')[0]!)]);
  const removeItem = (index: number) => {
    if (items.length > 1) setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = (formData: ExpenseFormOutput) => {
    if (items.every((i) => !i.expense_type)) {
      toast.error('يرجى إضافة بند مصروف واحد على الأقل');
      return;
    }
    // التحقق من صحة المبالغ
    const invalidItems = items.filter((i) => i.expense_type && (!i.amount || i.amount <= 0));
    if (invalidItems.length > 0) {
      toast.error('يجب أن يكون مبلغ كل بند أكبر من صفر');
      return;
    }
    if (!defaultCompany) {
      toast.error('تعذر تحديد الشركة');
      return;
    }
    const doc = buildExpenseClaimCreate({
      employee: formData.employee,
      company: defaultCompany,
      posting_date: formData.posting_date,
      remark: formData.remark,
      cost_center: formData.cost_center?.trim() || undefined,
      currency: formData.currency?.trim() || 'YER',
      exchange_rate: formData.exchange_rate,
      expenses: items.map((i) => ({
        expense_date: i.expense_date || formData.posting_date,
        expense_type: i.expense_type,
        amount: i.amount,
        description: i.description,
        cost_center: i.cost_center?.trim() || formData.cost_center?.trim() || undefined}))});
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء مطالبة المصروفات بنجاح');
        setDialogOpen(false);
        const t = new Date().toISOString().split('T')[0]!;
        form.reset({ employee: '', posting_date: t, cost_center: '', remark: '', currency: 'YER', exchange_rate: 1 });
        setItems([emptyItem(t)]);
      },
      onError: () => toast.error('حدث خطأ أثناء إنشاء مطالبة المصروفات — تأكد من تثبيت وحدة الموارد البشرية (HRMS) على الخادم')});
  };

  const applyExpenseLinesFromExcel = async (buffer: ArrayBuffer) => {
    const { parseExpenseImportXlsx } = await import('@/lib/erp/parse-expense-import-xlsx');
    const rows = await parseExpenseImportXlsx(buffer);
    if (!rows.length) {
      toast.error('لم تُستخرج بنود من الملف');
      return;
    }
    const baseDate = form.getValues('posting_date') || new Date().toISOString().split('T')[0]!;
    setItems(
      rows.map((r) => ({
        expense_date: (r.expense_date || baseDate).slice(0, 10),
        expense_type: r.expense_type,
        amount: r.amount,
        description: r.description,
        cost_center: r.cost_center}))
    );
    toast.success(`تم استيراد ${rows.length} بنداً من Excel`);
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteMutation.mutate(selected.name, {
      onSuccess: () => {
        toast.success('تم حذف المطالبة بنجاح');
        setDeleteDialogOpen(false);
        setSelected(null);
      },
      onError: () => toast.error('حدث خطأ أثناء الحذف')});
  };
  const clearFilters = () => { setDateFrom(''); setDateTo(''); setStatusFilter('all'); setDocstatusFilter('all'); };
  const hasActiveFilters = dateFrom || dateTo || statusFilter !== 'all' || docstatusFilter !== 'all';

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      {/* تنبيه بعدم توفر نوع المستند */}
      {doctypeAvailable === false && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3" dir="rtl">
          <div className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5">
            <Info className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-bold text-destructive">نوع المستند «مطالبة مصروفات» غير متوفر</p>
            <p className="text-xs text-muted-foreground">
              {doctypeCheckMessage || 'لا يمكن الوصول إلى نوع المستند على الخادم الخلفي. هذا يتطلب تثبيت وحدة الموارد البشرية (HRMS) على ERPNext.'}
            </p>
            <p className="text-xs text-muted-foreground">
              الحل: انتقل إلى صفحة إعداد الخادم وتأكد من تثبيت HRMS، أو نفّذ الأوامر التالية على الخادم:
            </p>
            <code className="block bg-muted/50 px-3 py-2 rounded-lg text-[11px] font-mono mt-2" dir="ltr">
              bench get-app hrms{'\n'}bench install-app hrms{'\n'}bench migrate
            </code>
          </div>
        </div>
      )}

      <PageHeader
        title="المصروفات"
        description="إدارة مطالبات المصروفات والتسويات المالية والاعتماد متعدد المستويات"
        iconify="solar:bill-list-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'المصروفات' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={companyLoading}
              onClick={() => {
                setImportEmployee('');
                setImportDate(new Date().toISOString().split('T')[0]!);
                setImportCostCenter('');
                setImportRemark('');
                setImportLines([]);
                setImportDialogOpen(true);
              }}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              استيراد Excel
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={companyLoading}
              onClick={() => {
                const t = new Date().toISOString().split('T')[0]!;
                form.reset({ employee: '', posting_date: t, cost_center: '', remark: '', currency: 'YER', exchange_rate: 1 });
                setItems([emptyItem(t)]);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              مطالبة جديدة
            </Button>
          </div>
        }
      />

      <ErpListDateStatusFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        statusValue={docstatusFilter}
        onStatusChange={setDocstatusFilter}
        statusTabs={docstatusTabs}
        extraFilters={
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">حالة المطالبة</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="Draft">مسودة</SelectItem>
                  <SelectItem value="Approved">موافق</SelectItem>
                  <SelectItem value="Rejected">مرفوض</SelectItem>
                  <SelectItem value="Paid">مدفوع</SelectItem>
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
        tableId="accounting-expenses"
        exportFileName="expenses.csv"
        printTitle="المصروفات"
        onEdit={(row) => {
          // حماية: لا يمكن تعديل مستند مرحّل أو ملغي
          if (Number(row.docstatus) !== 0) {
            toast.error('لا يمكن تعديل مستند مرحّل أو ملغي — استخدم إلغاء الترحيل أولاً');
            return;
          }
          const href = docDetailPath('Expense Claim', row.name);
          if (href) router.push(href);
          else toast.error('تعذر فتح التفصيل');
        }}
        onDelete={(row) => {
          // حماية: لا يمكن حذف مستند مرحّل أو ملغي
          if (Number(row.docstatus) !== 0) {
            toast.error('لا يمكن حذف مستند مرحّل أو ملغي — فقط المسودات يمكن حذفها');
            return;
          }
          setSelected(row);
          setDeleteDialogOpen(true);
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <span>إنشاء مطالبة مصروفات جديدة</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات المطالبة وتأكد من صحة البنود قبل الحفظ</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <input
            ref={expenseImportRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void f.arrayBuffer().then((buf) => void applyExpenseLinesFromExcel(buf));
              e.target.value = '';
            }}
          />
          <form onSubmit={form.handleSubmit(handleCreate)}>
            <div className="space-y-5 py-4">
              {/* ── Section 1: Claim Info ── */}
              <SectionFieldset legend="معلومات المطالبة" icon={Receipt} title="معلومات المطالبة" accent="primary">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label="الموظف" icon={Users} error={form.formState.errors.employee?.message} required hint="الموظف صاحب المطالبة">
                    <ErpLinkCombobox
                      doctype="Employee"
                      value={form.watch('employee')}
                      onChange={(v) => form.setValue('employee', v)}
                      displayKey="employee_name"
                      placeholder="اختر الموظف..."
                    />
                  </FormField>
                  <FormField label="تاريخ الترحيل" icon={CalendarDays} error={form.formState.errors.posting_date?.message} required hint="تاريخ تسجيل المطالبة">
                    <DatePicker
                      value={form.watch('posting_date')}
                      onChange={(v) => form.setValue('posting_date', v)}
                    />
                  </FormField>
                  <FormField label="مركز التكلفة" icon={Building2} hint="مركز التكلفة الافتراضي للبنود">
                    <ErpLinkCombobox
                      doctype="Cost Center"
                      value={form.watch('cost_center')}
                      onChange={(v) => form.setValue('cost_center', v)}
                      placeholder="اختياري"
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="العملة" icon={Wallet} error={form.formState.errors.currency?.message} required hint="عملة المطالبة">
                    <ErpLinkCombobox
                      doctype="Currency"
                      value={form.watch('currency')}
                      onChange={(v) => form.setValue('currency', v)}
                      placeholder="ر.س"
                    />
                  </FormField>
                  <FormField label="سعر الصرف" icon={ArrowRightLeft} error={form.formState.errors.exchange_rate?.message} hint="اترك 1 للعملة المحلية">
                    <Input
                      type="number"
                      dir="ltr"
                      step="any"
                      min={0}
                      placeholder="1"
                      {...form.register('exchange_rate', { valueAsNumber: true })}
                    />
                  </FormField>
                </div>
              </SectionFieldset>

              {/* ── Section 2: Expense Items ── */}
              <SectionFieldset legend="بنود المصروفات" icon={Hash} title="بنود المصروفات" accent="info">
                <div className="px-1 pb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => expenseImportRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    استيراد بنود من Excel
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">أعمدة مقترحة: تاريخ، نوع المصروف، المبلغ، وصف، مركز تكلفة (اختياري)</p>
                </div>
                <div className="rounded-xl border border-border/40 overflow-hidden">
                  {/* Table header with gradient background */}
                  <div className="bg-gradient-to-l from-info/[0.06] via-muted/60 to-muted/40 border-b-2 border-border/50 px-3 py-2.5 grid grid-cols-12 gap-2 text-[11px] font-bold text-foreground/60 uppercase tracking-wider">
                    <div className="col-span-2">تاريخ البند</div>
                    <div className="col-span-3">نوع المصروف</div>
                    <div className="col-span-2">المبلغ</div>
                    <div className="col-span-4">الوصف</div>
                    <div className="col-span-1" />
                  </div>
                  {items.map((item, idx) => (
                    <div key={idx} className={`px-3 py-2 grid grid-cols-1 md:grid-cols-12 gap-2 items-center border-b border-border/30 last:border-b-0 transition-colors hover:bg-muted/20 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/[0.03]'}`}>
                      <div className="md:col-span-2">
                        <DatePicker
                          className="h-8 text-xs"
                          value={item.expense_date}
                          onChange={(v) => updateItem(idx, 'expense_date', v)}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <ErpLinkCombobox
                          doctype="Expense Claim Type"
                          value={item.expense_type}
                          onChange={(v) => updateItem(idx, 'expense_type', v)}
                          placeholder="نوع المصروف"
                          className="h-8 text-xs"
                        />
                      </div>
                      <Input
                        className="md:col-span-2 h-8 text-xs font-mono tabular-nums"
                        type="number"
                        dir="ltr"
                        min={0.01}
                        step="any"
                        placeholder="0.00"
                        value={item.amount || ''}
                        onChange={(e) => updateItem(idx, 'amount', Number(e.target.value) || 0)}
                      />
                      <Input
                        className="md:col-span-4 h-8 text-xs"
                        placeholder="وصف المصروف"
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      />
                      <div className="md:col-span-1 flex justify-center">
                        {items.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10" type="button" onClick={() => removeItem(idx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="px-3 py-3 flex justify-center border-t border-dashed border-border/40 bg-muted/20">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 text-info hover:text-info hover:bg-info/10 hover:border-info/30 font-semibold shadow-sm min-w-[160px] justify-center"
                      onClick={addItem}
                    >
                      <Plus className="h-4 w-4" />
                      إضافة بند
                    </Button>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-gradient-to-l from-info/[0.04] via-muted/30 to-muted/15 rounded-xl border border-border/40 p-3 flex justify-between text-sm font-bold">
                  <span className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-info" />
                    المبلغ الإجمالي
                  </span>
                  <span className="tabular-nums text-info" dir="ltr">{formatCurrency(totalAmount)}</span>
                </div>
              </SectionFieldset>

              {/* ── Section 3: Notes ── */}
              <SectionFieldset legend="ملاحظات" icon={MessageSquare} title="ملاحظات" accent="success">
                <FormField label="ملاحظات إضافية" icon={MessageSquare} hint="ملاحظات أو تفاصيل إضافية عن المطالبة">
                  <Textarea
                    placeholder="ملاحظات إضافية..."
                    {...form.register('remark')}
                    rows={3}
                    className="min-h-[80px] text-sm resize-none"
                  />
                </FormField>
              </SectionFieldset>
            </div>
            <DialogFooter className="gap-2 pt-4 mt-3 border-t border-border/40">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">
                إلغاء
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ المطالبة'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* حوار استيراد Excel المباشر */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>استيراد مطالبات مصروفات من Excel</DialogTitle>
          </DialogHeader>
          <input
            ref={headerImportRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setImportFileLoading(true);
              try {
                const buf = await f.arrayBuffer();
                const { parseExpenseImportXlsx } = await import('@/lib/erp/parse-expense-import-xlsx');
                const rows = await parseExpenseImportXlsx(buf);
                if (!rows.length) {
                  toast.error('لم تُستخرج بنود من الملف');
                } else {
                  setImportLines(rows);
                  toast.success(`تم استخراج ${rows.length} بنداً من الملف`);
                }
              } catch {
                toast.error('فشل قراءة الملف');
              } finally {
                setImportFileLoading(false);
                e.target.value = '';
              }
            }}
          />
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">الموظف *</Label>
                <ErpLinkCombobox
                  doctype="Employee"
                  value={importEmployee}
                  onChange={setImportEmployee}
                  displayKey="employee_name"
                  placeholder="اختر الموظف..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">تاريخ الترحيل *</Label>
                <DatePicker
                  value={importDate}
                  onChange={setImportDate}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">مركز التكلفة</Label>
                <ErpLinkCombobox
                  doctype="Cost Center"
                  value={importCostCenter}
                  onChange={setImportCostCenter}
                  placeholder="اختياري"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">ملاحظات</Label>
                <Input
                  placeholder="ملاحظات إضافية..."
                  value={importRemark}
                  onChange={(e) => setImportRemark(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                disabled={importFileLoading}
                onClick={() => headerImportRef.current?.click()}
              >
                {importFileLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                اختيار ملف Excel
              </Button>
              <span className="text-xs text-muted-foreground">
                أعمدة: تاريخ، نوع المصروف، المبلغ، وصف، مركز تكلفة
              </span>
            </div>

            {importLines.length > 0 && (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 grid grid-cols-12 gap-2 text-xs font-semibold">
                    <div className="col-span-2">التاريخ</div>
                    <div className="col-span-3">النوع</div>
                    <div className="col-span-2">المبلغ</div>
                    <div className="col-span-3">الوصف</div>
                    <div className="col-span-2">مركز التكلفة</div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {importLines.map((line, idx) => (
                      <div key={idx} className="px-3 py-1.5 grid grid-cols-12 gap-2 text-xs border-b last:border-b-0">
                        <div className="col-span-2 text-muted-foreground">{line.expense_date}</div>
                        <div className="col-span-3">{line.expense_type}</div>
                        <div className="col-span-2 font-semibold tabular-nums">{formatCurrency(line.amount)}</div>
                        <div className="col-span-3 truncate">{line.description || '—'}</div>
                        <div className="col-span-2 truncate text-muted-foreground">{line.cost_center || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 flex justify-between text-sm font-bold">
                  <span>إجمالي البنود ({importLines.length})</span>
                  <span className="tabular-nums">{formatCurrency(importLines.reduce((s, l) => s + l.amount, 0))}</span>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setImportDialogOpen(false)} className="text-muted-foreground">
              إلغاء
            </Button>
            <Button
              type="button"
              disabled={importLoading || !importEmployee || !importDate || importLines.length === 0}
              onClick={async () => {
                if (!defaultCompany || !importEmployee || !importDate || importLines.length === 0) return;
                setImportLoading(true);
                try {
                  const doc = buildExpenseClaimCreate({
                    employee: importEmployee,
                    company: defaultCompany,
                    posting_date: importDate,
                    remark: importRemark?.trim() || undefined,
                    cost_center: importCostCenter?.trim() || undefined,
                    expenses: importLines.map((l) => ({
                      expense_date: l.expense_date || importDate,
                      expense_type: l.expense_type,
                      amount: l.amount,
                      description: l.description,
                      cost_center: l.cost_center?.trim() || importCostCenter?.trim() || undefined,
                    })),
                  });
                  await apiCreateDoc('Expense Claim', doc);
                  toast.success(`تم إنشاء مطالبة مصروفات بنجاح (${importLines.length} بنداً)`);
                  setImportDialogOpen(false);
                  setImportLines([]);
                  void refetch();
                } catch (err: any) {
                  toast.error('فشل إنشاء المطالبة', { description: err?.message || 'خطأ غير معروف' });
                } finally {
                  setImportLoading(false);
                }
              }}
              className="gap-1.5 min-w-[130px]"
            >
              {importLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {importLoading ? 'جاري الإنشاء...' : 'إنشاء المطالبة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!deleteMutation.isPending) setDeleteDialogOpen(open); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد الحذف</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  هل أنت متأكد من حذف المطالبة &quot;{selected?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive" className="gap-1.5" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
