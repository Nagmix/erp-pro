'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge, DocStatusBadge } from '@/components/erp/status-badge';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import {
  useCreateDoc,
  useDocList,
  useSubmitDoc,
  useCancelDoc,
} from '@/lib/client/hooks';
import { buildExpenseClaimCreate } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { formatCurrency, formatDate, formatNumber } from '@/lib/core/helpers';
import { toast } from 'sonner';
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

  // ── OCR محاكاة ──
  const runMockOcr = () => {
    if (!receiptUrl) return toast.error('أضف رابط الإيصال أولاً');
    setOcrText(`تم تحليل بيانات الإيصال من الرابط: ${receiptUrl.slice(0, 28)}...`);
    toast.success('تم استخراج النص من الإيصال');
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
        void expenses.refetch();
      },
      onError: () => toast.error('تعذر حفظ المصروف'),
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
          <Badge variant="outline" className="text-[11px]">
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
          <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
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
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي المطالبات"
          value={formatNumber(totalExpenses)}
          icon={FileText}
          accent="primary"
          description="جميع مطالبات المصروفات"
        />
        <KpiCard
          title="بانتظار الموافقة"
          value={formatNumber(pendingCount)}
          icon={Clock}
          accent="warning"
          description="مطالبات لم تُراجع بعد"
        />
        <KpiCard
          title="تمت الموافقة"
          value={formatNumber(approvedCount)}
          icon={CheckCircle2}
          accent="success"
          description="مطالبات معتمدة"
        />
        <KpiCard
          title="إجمالي المبالغ"
          value={formatCurrency(totalAmount)}
          icon={DollarSign}
          accent="info"
          description="مجموع المبالغ المطالب بها"
        />
      </KpiStrip>

      {/* ── فلاتر ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/40 bg-card p-4 hover:border-border/60 transition-colors">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          فلاتر:
        </div>
        <div className="w-52">
          <Label className="text-[11px] text-muted-foreground mb-1">الموظف</Label>
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
          <Label className="text-[11px] text-muted-foreground mb-1">الحالة</Label>
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
          <Label className="text-[11px] text-muted-foreground mb-1">من تاريخ</Label>
          <Input
            type="date"
            dir="ltr"
            className="h-8 text-xs"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Label className="text-[11px] text-muted-foreground mb-1">إلى تاريخ</Label>
          <Input
            type="date"
            dir="ltr"
            className="h-8 text-xs"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
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
                <Label className="text-xs font-medium">الموظف *</Label>
                <ErpLinkCombobox
                  doctype="Employee"
                  value={employee}
                  onChange={setEmployee}
                  displayKey="employee_name"
                />
              </div>
              {/* الشركة */}
              <div>
                <Label className="text-xs font-medium">الشركة</Label>
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
                <Label className="text-xs font-medium">تاريخ المطالبة</Label>
                <Input type="date" dir="ltr" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
              </div>
              {/* نوع المصروف */}
              <div>
                <Label className="text-xs font-medium">نوع المصروف *</Label>
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
                <Label className="text-xs font-medium">المبلغ *</Label>
                <Input type="number" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              {/* مركز التكلفة */}
              <div>
                <Label className="text-xs font-medium">مركز التكلفة</Label>
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
                <Label className="text-xs font-medium">العملة</Label>
                <ErpLinkCombobox doctype="Currency" value={currency} onChange={setCurrency} placeholder="YER" className="h-9 text-sm" />
              </div>
              {/* سعر الصرف */}
              <div>
                <Label className="text-xs font-medium">سعر الصرف</Label>
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

            {/* رابط الإيصال */}
            <div>
              <Label className="text-xs font-medium">رابط الإيصال</Label>
              <Input
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
                placeholder="https://example.com/receipt"
                dir="ltr"
              />
            </div>

            {/* ملاحظات */}
            <div>
              <Label className="text-xs font-medium">ملاحظات</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {/* نتيجة القراءة */}
            <div>
              <Label className="text-xs font-medium">نتيجة القراءة النصية</Label>
              <Textarea rows={2} value={ocrText} onChange={(e) => setOcrText(e.target.value)} />
            </div>

            {/* أزرر الإجراءات */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" type="button" onClick={() => toast.message('التقاط مباشر من الكاميرا يُفعّل في تطبيق الجوال')}>
                <Camera className="h-4 w-4" /> الكاميرا
              </Button>
              <Button size="sm" variant="outline" type="button" onClick={runMockOcr}>
                <ScanLine className="h-4 w-4" /> استخراج النص
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
                <Label htmlFor="save-as-draft" className="text-xs font-medium cursor-pointer">
                  حفظ كمسودة
                </Label>
                <p className="text-[11px] text-muted-foreground">
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
