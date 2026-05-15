'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge, DocStatusBadge } from '@/components/erp/status-badge';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import {
  useCreateDoc,
  useDocList,
  useSubmitDoc,
  useCancelDoc,
} from '@/lib/client/hooks';
import { apiUploadFile } from '@/lib/client/api';
import { buildExpenseClaimCreate } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { formatCurrency, formatDate, formatNumber } from '@/lib/core/helpers';
import { toast } from 'sonner';
import { useHrmsCheck } from '@/hooks/use-hrms-check';
import { HrmsRequiredBanner } from '@/components/erp/hrms-required-banner';
import {
  Camera,
  Receipt,
  ScanLine,
  Wallet,
  Clock,
  CheckCircle2,
  DollarSign,
  Filter,
  Plus,
  RefreshCw,
  Send,
  XCircle,
  FileText,
  Loader2,
  Upload,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';

type ExpenseRow = {
  name: string;
  employee?: string;
  employee_name?: string;
  total_claimed_amount?: number;
  total_sanctioned_amount?: number;
  posting_date?: string;
  status?: string;
  docstatus?: number;
  company?: string;
  remark?: string;
  expense_type?: string;
};

// ── OCR Extracted Data Types ──
type OcrFieldResult = {
  value: string;
  confidence: 'high' | 'medium' | 'low';
};

type OcrExtractionResult = {
  amount: OcrFieldResult;
  currency: OcrFieldResult;
  vendor_name: OcrFieldResult;
  date: OcrFieldResult;
  description: OcrFieldResult;
  tax_amount: OcrFieldResult;
  raw_text: string;
};

const CONFIDITY_STYLES: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  high: { color: 'text-primary', icon: CheckCircle, label: 'مرتفعة' },
  medium: { color: 'text-amber-600 dark:text-amber-400', icon: AlertTriangle, label: 'متوسطة' },
  low: { color: 'text-red-500 dark:text-red-400', icon: AlertCircle, label: 'منخفضة' },
};

const EXPENSE_STATUS_AR: Record<string, string> = {
  Draft: 'مسودة',
  Pending: 'قيد المراجعة',
  Approved: 'مُوافق',
  Rejected: 'مرفوض',
  Submitted: 'مُقدّم',
  Cancelled: 'ملغي',
  Paid: 'مدفوع',
  Unpaid: 'غير مدفوع',
};

export default function MobileExpensesPage() {
  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();

  // فحص HRMS
  const { hrmsInstalled, loaded: hrmsLoaded } = useHrmsCheck();

  // ── حالة النموذج ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [employee, setEmployee] = useState('');
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [amount, setAmount] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [currency, setCurrency] = useState('YER');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [company, setCompany] = useState('');
  const [isDraft, setIsDraft] = useState(true);

  // ── OCR state ──
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrExtractionResult | null>(null);
  const [ocrConfirmed, setOcrConfirmed] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // ── فلاتر ──
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const expenses = useDocList<ExpenseRow>('Expense Claim', {
    fields: [
      'name',
      'employee',
      'employee_name',
      'total_claimed_amount',
      'total_sanctioned_amount',
      'posting_date',
      'status',
      'docstatus',
      'company',
      'remark',
      'expense_type',
    ],
    limit: 500,
    order_by: 'creation desc',
  });

  const createExpense = useCreateDoc('Expense Claim');
  const submitExpense = useSubmitDoc('Expense Claim');
  const cancelExpense = useCancelDoc('Expense Claim');

  const allRows = expenses.data || [];

  // ── KPIs ──
  const totalExpenses = allRows.length;
  const pendingCount = useMemo(
    () =>
      allRows.filter(
        (r) =>
          r.docstatus === 0 ||
          String(r.status || '').toLowerCase() === 'draft' ||
          String(r.status || '').toLowerCase() === 'pending'
      ).length,
    [allRows]
  );
  const approvedCount = useMemo(
    () =>
      allRows.filter(
        (r) =>
          r.docstatus === 1 ||
          String(r.status || '').toLowerCase().includes('approve')
      ).length,
    [allRows]
  );
  const totalAmount = useMemo(
    () => allRows.reduce((sum, row) => sum + Number(row.total_claimed_amount || 0), 0),
    [allRows]
  );

  // ── الفلاتر ──
  const rows = useMemo(() => {
    let list = allRows;
    if (filterEmployee !== 'all') {
      list = list.filter((r) => r.employee === filterEmployee);
    }
    if (filterStatus !== 'all') {
      if (filterStatus === 'Draft') {
        list = list.filter((r) => r.docstatus === 0);
      } else if (filterStatus === 'Submitted') {
        list = list.filter((r) => r.docstatus === 1);
      } else if (filterStatus === 'Cancelled') {
        list = list.filter((r) => r.docstatus === 2);
      } else {
        list = list.filter((r) => String(r.status || '').toLowerCase() === filterStatus.toLowerCase());
      }
    }
    if (filterDateFrom) {
      list = list.filter((r) => r.posting_date && String(r.posting_date) >= filterDateFrom);
    }
    if (filterDateTo) {
      list = list.filter((r) => r.posting_date && String(r.posting_date) <= filterDateTo);
    }
    return list;
  }, [allRows, filterEmployee, filterStatus, filterDateFrom, filterDateTo]);

  // ── موظفون فريدون ──
  const uniqueEmployees = useMemo(
    () =>
      [...new Set(allRows.map((r) => r.employee).filter(Boolean))].map((e) => {
        const row = allRows.find((r) => r.employee === e);
        return { id: e!, name: row?.employee_name || e };
      }),
    [allRows]
  );

  // ── OCR حقيقي ──
  const runOcr = async () => {
    // Need either a file to upload or an existing URL
    if (!receiptFile && !receiptUrl.trim()) {
      return toast.error('أضف صورة الإيصال أو رابطه أولاً');
    }

    setOcrLoading(true);
    setOcrResult(null);
    setOcrConfirmed(false);

    try {
      let fileUrl = receiptUrl.trim();

      // Step 1: Upload file if a local file was selected
      if (receiptFile) {
        try {
          const uploadResult = await apiUploadFile(receiptFile);
          if (uploadResult?.file_url) {
            fileUrl = uploadResult.file_url;
            setReceiptUrl(fileUrl);
          }
        } catch (uploadErr) {
          console.error('[OCR Upload Error]', uploadErr);
          // If upload fails and we don't have a URL, abort
          if (!fileUrl) {
            toast.error('فشل رفع صورة الإيصال — تحقق من الاتصال');
            setOcrLoading(false);
            return;
          }
        }
      }

      if (!fileUrl) {
        toast.error('لا يوجد رابط للإيصال');
        setOcrLoading(false);
        return;
      }

      // Step 2: Call the OCR extraction API
      const res = await fetch('/api/ocr/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: fileUrl }),
      });

      const data = await res.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || 'فشل تحليل الإيصال');
      }

      const ocrData = data.data as OcrExtractionResult;
      setOcrResult(ocrData);

      // Populate form fields from extracted data
      if (ocrData.amount?.value) setAmount(ocrData.amount.value);
      if (ocrData.currency?.value) setCurrency(ocrData.currency.value);
      if (ocrData.date?.value) setPostingDate(ocrData.date.value);
      if (ocrData.description?.value) {
        setNotes(ocrData.description.value);
      }
      if (ocrData.vendor_name?.value) {
        setOcrText(`البائع: ${ocrData.vendor_name.value}${ocrData.tax_amount?.value ? ` | الضريبة: ${ocrData.tax_amount.value}` : ''}`);
      }

      toast.success('تم استخراج بيانات الإيصال بنجاح');
    } catch (err) {
      console.error('[OCR Error]', err);
      toast.error(err instanceof Error ? err.message : 'فشل تحليل الإيصال');
    } finally {
      setOcrLoading(false);
    }
  };

  /** تأكيد البيانات المستخرجة وملء النموذج */
  const confirmOcrData = () => {
    setOcrConfirmed(true);
    toast.success('تم تأكيد البيانات المستخرجة');
  };

  // ── إنشاء مصروف ──
  const addExpense = () => {
    if (!employee || !amount || !expenseType) return toast.error('يرجى ملء الموظف والمبلغ ونوع المصروف');
    const usedCompany = company || defaultCompany;
    if (!usedCompany) return toast.error('تعذر تحديد الشركة');
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('مبلغ غير صالح');
    const remarkParts = [
      notes.trim(),
      ocrText.trim() && `نتيجة القراءة:\n${ocrText}`,
      receiptUrl.trim() && `رابط الإيصال: ${receiptUrl}`,
    ].filter(Boolean);
    const doc = buildExpenseClaimCreate({
      employee,
      company: usedCompany,
      posting_date: postingDate,
      remark: remarkParts.join('\n\n') || undefined,
      cost_center: costCenter.trim() || undefined,
      currency: currency.trim() || 'YER',
      exchange_rate: exchangeRate,
      expenses: [
        {
          expense_date: postingDate,
          expense_type: expenseType,
          amount: amt,
          description: notes.trim() || expenseType,
          sanctioned_amount: amt,
          cost_center: costCenter.trim() || undefined,
        },
      ],
    });
    createExpense.mutate(doc, {
      onSuccess: () => {
        toast.success('تم حفظ مطالبة المصروف');
        setDialogOpen(false);
        setAmount('');
        setNotes('');
        setReceiptUrl('');
        setOcrText('');
        setOcrResult(null);
        setOcrConfirmed(false);
        setReceiptFile(null);
        void expenses.refetch();
      },
      onError: (err: Error) => {
        const msg = err?.message || '';
        const isHrmsError = /not found|does not exist|naming.?series|غير مسموح|not permitted/i.test(msg);
        toast.error(msg || 'تعذر حفظ المصروف', {
          description: isHrmsError ? 'تأكد من تثبيت وحدة الموارد البشرية (HRMS) وإعداد سلسلة التسمية' : undefined,
          duration: 6000,
        });
      },
    });
  };

  // ── سير العمل ──
  const handleSubmit = (row: ExpenseRow) => {
    submitExpense.mutate(row.name, {
      onSuccess: () => {
        toast.success('تم ترحيل المطالبة');
        void expenses.refetch();
      },
      onError: () => toast.error('فشل ترحيل المطالبة'),
    });
  };

  const handleCancel = (row: ExpenseRow) => {
    cancelExpense.mutate(row.name, {
      onSuccess: () => {
        toast.success('تم إلغاء المطالبة');
        void expenses.refetch();
      },
      onError: () => toast.error('فشل إلغاء المطالبة'),
    });
  };

  // ── أعمدة الجدول ──
  const columns: Column<ExpenseRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرقم',
        sortable: true,
        filterable: true,
        render: (v) => (
          <span className="font-medium text-primary cursor-pointer hover:underline">{String(v)}</span>
        ),
      },
      {
        key: 'employee_name',
        header: 'الموظف',
        sortable: true,
        filterable: true,
        render: (v, row) => String(v || row.employee || '—'),
      },
      {
        key: 'expense_type',
        header: 'نوع المصروف',
        render: (v) => (
          <Badge variant="outline" className="text-xs">
            {String(v || '—')}
          </Badge>
        ),
      },
      {
        key: 'total_claimed_amount',
        header: 'المبلغ المطالب',
        sortable: true,
        render: (v) => (
          <span className="font-semibold tabular-nums">
            {formatCurrency(Number(v || 0))}
          </span>
        ),
      },
      {
        key: 'total_sanctioned_amount',
        header: 'المبلغ المعتمد',
        render: (v) => (
          <span className="tabular-nums text-primary">
            {formatCurrency(Number(v || 0))}
          </span>
        ),
      },
      {
        key: 'posting_date',
        header: 'التاريخ',
        sortable: true,
        render: (v) => (v ? formatDate(String(v)) : '—'),
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (v, row) => {
          if (row.docstatus === 0) return <DocStatusBadge docstatus={0} />;
          if (row.docstatus === 2) return <DocStatusBadge docstatus={2} />;
          if (String(v || '').toLowerCase().includes('approve'))
            return <StatusBadge status="Approved" />;
          return <StatusBadge status={String(v || 'Draft')} />;
        },
      },
      {
        key: 'company',
        header: 'الشركة',
        render: (v) => String(v || '—'),
      },
    ],
    []
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={expenses.isError ? expenses.error : null} onRetry={() => expenses.refetch()} />

      {/* تنبيه بعدم توفر HRMS — مع زر تثبيت */}
      {hrmsLoaded && !hrmsInstalled && (
        <HrmsRequiredBanner />
      )}

      <PageHeader
        title="مصروفات الجوال"
        description="تسجيل مصروفات الموظفين وإدارة سير الموافقات والمتابعة"
        iconify="solar:wallet-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'التشغيل', href: '/operations' }, { label: 'مصروفات الجوال' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => expenses.refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
              تحديث
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              مصروف جديد
            </Button>
          </div>
        }
      />

      {/* ── KPI Cards ── */}
      {/* ── فلاتر ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/40 bg-card p-4 hover:border-border/60 transition-colors">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          فلاتر:
        </div>
        <div className="w-52">
          <Label className="text-xs text-muted-foreground mb-1">الموظف</Label>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="الكل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {uniqueEmployees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label className="text-xs text-muted-foreground mb-1">الحالة</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="الكل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="Draft">مسودة</SelectItem>
              <SelectItem value="Submitted">مُقدّم</SelectItem>
              <SelectItem value="Approved">مُوافق</SelectItem>
              <SelectItem value="Cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label className="text-xs text-muted-foreground mb-1">من تاريخ</Label>
          <DatePicker
            value={filterDateFrom}
            onChange={setFilterDateFrom}
            placeholder="من تاريخ"
            className="h-8 text-xs"
          />
        </div>
        <div className="w-40">
          <Label className="text-xs text-muted-foreground mb-1">إلى تاريخ</Label>
          <DatePicker
            value={filterDateTo}
            onChange={setFilterDateTo}
            placeholder="إلى تاريخ"
            className="h-8 text-xs"
          />
        </div>
        {(filterEmployee !== 'all' || filterStatus !== 'all' || filterDateFrom || filterDateTo) && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-destructive"
            onClick={() => {
              setFilterEmployee('all');
              setFilterStatus('all');
              setFilterDateFrom('');
              setFilterDateTo('');
            }}
          >
            مسح الفلاتر
          </Button>
        )}
      </div>

      {/* ── جدول المطالبات ── */}
      <DataTable
        data={rows}
        columns={columns}
        searchable={true}
        loading={expenses.isLoading}
        tableId="operations-mobile-expenses"
        exportFileName="mobile-expenses.csv"
        printTitle="مصروفات الجوال"
        selectable={true}
        bulkActions={[
          {
            label: 'ترحيل المحدد',
            variant: 'default',
            onClick: (selected) => {
              for (const row of selected) {
                if ((row as ExpenseRow).docstatus === 0) handleSubmit(row as ExpenseRow);
              }
            },
          },
          {
            label: 'إلغاء المحدد',
            variant: 'destructive',
            onClick: (selected) => {
              for (const row of selected) {
                if ((row as ExpenseRow).docstatus === 1) handleCancel(row as ExpenseRow);
              }
            },
          },
        ]}
        onView={(row) => {
          window.open(`/app/expense-claim/${(row as ExpenseRow).name}`, '_blank');
        }}
      />

      {/* ── حوار الإنشاء ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-warning" />
              تسجيل مصروف جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid md:grid-cols-2 gap-3">
              {/* الموظف */}
              <div>
                <Label className="text-sm font-medium">الموظف *</Label>
                <ErpLinkCombobox
                  doctype="Employee"
                  value={employee}
                  onChange={setEmployee}
                  displayKey="employee_name"
                />
              </div>
              {/* الشركة */}
              <div>
                <Label className="text-sm font-medium">الشركة</Label>
                <ErpLinkCombobox
                  doctype="Company"
                  value={company || defaultCompany}
                  onChange={setCompany}
                  placeholder={defaultCompany || 'الشركة الافتراضية'}
                  className="h-9 text-sm"
                />
              </div>
              {/* تاريخ المطالبة */}
              <div>
                <Label className="text-sm font-medium">تاريخ المطالبة</Label>
                <DatePicker value={postingDate} onChange={setPostingDate} className="h-9" />
              </div>
              {/* نوع المصروف */}
              <div>
                <Label className="text-sm font-medium">نوع المصروف *</Label>
                <ErpLinkCombobox
                  doctype="Expense Claim Type"
                  value={expenseType}
                  onChange={setExpenseType}
                  placeholder="اختر النوع..."
                  className="h-9 text-sm"
                />
              </div>
              {/* المبلغ */}
              <div>
                <Label className="text-sm font-medium">المبلغ *</Label>
                <Input type="number" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              {/* مركز التكلفة */}
              <div>
                <Label className="text-sm font-medium">مركز التكلفة</Label>
                <ErpLinkCombobox
                  doctype="Cost Center"
                  value={costCenter}
                  onChange={setCostCenter}
                  placeholder="اختياري"
                  className="h-9 text-sm"
                />
              </div>
              {/* العملة */}
              <div>
                <Label className="text-sm font-medium">العملة</Label>
                <ErpLinkCombobox doctype="Currency" value={currency} onChange={setCurrency} placeholder="YER" className="h-9 text-sm" />
              </div>
              {/* سعر الصرف */}
              <div>
                <Label className="text-sm font-medium">سعر الصرف</Label>
                <Input
                  type="number"
                  dir="ltr"
                  step="any"
                  min={0}
                  value={exchangeRate || ''}
                  onChange={(e) => setExchangeRate(Math.max(0.000001, Number(e.target.value) || 1))}
                />
              </div>
            </div>

            {/* رابط الإيصال أو رفع صورة */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">صورة الإيصال</Label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors text-xs">
                  <Upload className="h-4 w-4" />
                  <span>{receiptFile ? receiptFile.name : 'اختر صورة'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setReceiptFile(f);
                        // Create a local preview URL
                        const preview = URL.createObjectURL(f);
                        setReceiptUrl(preview);
                      }
                    }}
                  />
                </label>
              </div>
              <div className="mt-1">
                <Label className="text-xs text-muted-foreground">أو أدخل رابط الإيصال يدوياً</Label>
                <Input
                  value={receiptUrl.startsWith('blob:') ? '' : receiptUrl}
                  onChange={(e) => {
                    setReceiptUrl(e.target.value);
                    setReceiptFile(null);
                  }}
                  placeholder="https://example.com/receipt.jpg"
                  dir="ltr"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* نتيجة استخراج البيانات من الإيصال */}
            {ocrResult && !ocrConfirmed && (
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ScanLine className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">البيانات المستخرجة من الإيصال</span>
                  </div>
                  <Badge variant="outline" className="text-xs">يرجى المراجعة</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([
                    { key: 'amount', label: 'المبلغ' },
                    { key: 'currency', label: 'العملة' },
                    { key: 'vendor_name', label: 'البائع' },
                    { key: 'date', label: 'التاريخ' },
                    { key: 'description', label: 'الوصف' },
                    { key: 'tax_amount', label: 'الضريبة' },
                  ] as const).map(({ key, label }) => {
                    const field = ocrResult[key];
                    if (!field) return null;
                    const conf = CONFIDITY_STYLES[field.confidence] ?? CONFIDITY_STYLES.low!;
                    const ConfIcon = conf.icon;
                    return (
                      <div key={key} className="rounded-lg border border-border/30 bg-background p-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{label}</span>
                          <div className="flex items-center gap-1">
                            <ConfIcon className={`h-3 w-3 ${conf.color}`} />
                            <span className={`text-[9px] ${conf.color}`}>{conf.label}</span>
                          </div>
                        </div>
                        <p className="text-xs font-medium truncate">{field.value || '—'}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" type="button" onClick={confirmOcrData} className="gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    تأكيد البيانات
                  </Button>
                  <Button size="sm" type="button" variant="ghost" onClick={() => setOcrResult(null)}>
                    إعادة الاستخراج
                  </Button>
                </div>
              </div>
            )}

            {ocrConfirmed && ocrResult && (
              <div className="rounded-lg border border-primary/20/40 bg-primary/5/50 dark:bg-primary/5 p-2.5 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-primary">
                  تم تأكيد البيانات المستخرجة — يمكنك تعديل الحقول أعلاه قبل الحفظ
                </span>
              </div>
            )}

            {/* ملاحظات */}
            <div>
              <Label className="text-sm font-medium">ملاحظات</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {/* نتيجة القراءة */}
            <div>
              <Label className="text-sm font-medium">ملاحظات إضافية من القراءة</Label>
              <Textarea rows={2} value={ocrText} onChange={(e) => setOcrText(e.target.value)} placeholder="سيتم ملؤها تلقائياً من الإيصال..." />
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" type="button" onClick={() => toast.message('التقاط مباشر من الكاميرا يُفعّل في تطبيق الجوال')}>
                <Camera className="h-4 w-4" /> الكاميرا
              </Button>
              <Button size="sm" variant="outline" type="button" onClick={runOcr} disabled={ocrLoading}>
                {ocrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                {ocrLoading ? 'جارٍ التحليل...' : 'استخراج البيانات'}
              </Button>
            </div>

            {/* حفظ كمسودة أو ترحيل */}
            <div className="flex items-center gap-3 rounded-lg border border-border/40 p-3">
              <Switch
                id="save-as-draft"
                checked={isDraft}
                onCheckedChange={setIsDraft}
              />
              <div>
                <Label htmlFor="save-as-draft" className="text-sm font-medium cursor-pointer">
                  حفظ كمسودة
                </Label>
                <p className="text-xs text-muted-foreground">
                  عند إيقاف هذا الخيار سيتم ترحيل المطالبة مباشرة
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={createExpense.isPending || coLoading}
              onClick={addExpense}
            >
              {createExpense.isPending ? (
                'جارٍ الحفظ…'
              ) : isDraft ? (
                <>
                  <Receipt className="h-3.5 w-3.5" /> حفظ مسودة
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> حفظ وترحيل
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
