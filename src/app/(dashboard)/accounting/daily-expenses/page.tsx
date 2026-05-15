'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { ErpListDateStatusFilters, type ErpStatusTab } from '@/components/erp/erp-list-date-status-filters';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc, useDeleteDoc } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildExpenseClaimCreate } from '@/lib/erp/erpnext-payloads';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { translateAccountName } from '@/lib/core/arabic-labels';
import { toast } from 'sonner';
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
import { Plus, Receipt, Send, CheckCircle2, XCircle, Info, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';
import { useHrmsCheck } from '@/hooks/use-hrms-check';
import { HrmsRequiredBanner } from '@/components/erp/hrms-required-banner';

type ExpenseRow = {
  name: string;
  posting_date: string;
  employee?: string;
  employee_name?: string;
  total_claimed_amount: number;
  total_sanctioned_amount: number;
  status: string;
  remark?: string;
  docstatus: number;
  expense_type?: string;
};

const EXPENSE_STATUS_MAP: Record<string, string> = {
  'Draft': 'مسودة',
  'Pending': 'قيد الانتظار',
  'Approved': 'موافق عليه',
  'Rejected': 'مرفوض',
  'Paid': 'مدفوع',
  'Unpaid': 'غير مدفوع',
  'Submitted': 'مقدم',
  'Cancelled': 'ملغي',
};

const statusTabs: ErpStatusTab[] = [
  { value: 'all', label: 'الكل' },
  { value: '0', label: 'مسودة' },
  { value: '1', label: 'مرحّل' },
  { value: '2', label: 'ملغي' },
];

export default function DailyExpensesPage() {
  const { company: defaultCompany } = useDefaultCompanyName();
  const createExpense = useCreateDoc('Expense Claim');
  const submitExpense = useSubmitDoc('Expense Claim');
  const cancelExpense = useCancelDoc('Expense Claim');
  const deleteMutation = useDeleteDoc('Expense Claim');

  // فحص HRMS — نوع مستند Expense Claim يتطلب تطبيق HRMS
  const { hrmsInstalled, loaded: hrmsLoaded } = useHrmsCheck();

  // تحقق من توفر نوع المستند
  const [doctypeAvailable, setDoctypeAvailable] = useState<boolean | null>(null);
  const [doctypeCheckMessage, setDoctypeCheckMessage] = useState<string>('');

  useEffect(() => {
    if (hrmsLoaded && hrmsInstalled) {
      setDoctypeAvailable(true);
      return;
    }
    if (hrmsLoaded && !hrmsInstalled) {
      setDoctypeAvailable(false);
      setDoctypeCheckMessage('نوع المستند يتطلب تطبيق HRMS الذي لم يتم تثبيته بعد.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings/naming-series?doctype=' + encodeURIComponent('Expense Claim'));
        const j = await res.json();
        if (!cancelled) {
          if (j?.success && (j?.data?.docTypeExists === true || j?.data?.hasNamingSeries)) {
            setDoctypeAvailable(true);
          } else if (j?.success) {
            setDoctypeAvailable(false);
            setDoctypeCheckMessage('نوع المستند «مطالبة مصروفات» غير متوفر على الخادم. تأكد من تثبيت وحدة الموارد البشرية (HRMS).');
          } else {
            setDoctypeAvailable(false);
            setDoctypeCheckMessage(j?.error || 'نوع المستند غير متوفر على الخادم');
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
  }, [hrmsLoaded, hrmsInstalled]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Form state
  const [employee, setEmployee] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(today);
  const [costCenter, setCostCenter] = useState('');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const [submittingName, setSubmittingName] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ExpenseRow | null>(null);

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [docstatusFilter, setDocstatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState('');

  // Fetch expenses
  const { data: expenses = [], isLoading, isError, error, refetch } = useDocList<ExpenseRow>('Expense Claim', {
    fields: ['name', 'posting_date', 'employee', 'employee_name', 'total_claimed_amount', 'total_sanctioned_amount', 'status', 'remark', 'docstatus'],
    order_by: 'posting_date desc',
    limit: 200,
  });

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    let list = expenses;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((row: any) =>
        ['name', 'description', 'employee_name', 'remark'].some(key => String(row[key] ?? '').toLowerCase().includes(q))
      );
    }
    if (dateFrom || dateTo) {
      list = list.filter(e => rowInDateRangeISO(e.posting_date, dateFrom, dateTo));
    }
    if (docstatusFilter !== 'all') {
      list = list.filter(e => String(e.docstatus) === docstatusFilter);
    }
    if (employeeFilter.trim()) {
      list = list.filter(e => e.employee === employeeFilter);
    }
    if (expenseTypeFilter.trim()) {
      list = list.filter(e => e.expense_type === expenseTypeFilter);
    }
    return list;
  }, [expenses, dateFrom, dateTo, docstatusFilter, search, employeeFilter, expenseTypeFilter]);

  // KPIs
  const totalExpensesAmount = useMemo(
    () => filteredExpenses.reduce((s, e) => s + (Number(e.total_claimed_amount) || 0), 0),
    [filteredExpenses]
  );
  const draftCount = useMemo(
    () => filteredExpenses.filter(e => e.docstatus === 0).length,
    [filteredExpenses]
  );
  const approvedCount = useMemo(
    () => filteredExpenses.filter(e => e.docstatus === 1).length,
    [filteredExpenses]
  );

  // Create expense
  const handleCreateExpense = useCallback(async () => {
    if (!employee || !expenseType || !amount) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('المبلغ غير صالح');
      return;
    }
    if (!defaultCompany) {
      toast.error('يجب ضبط الشركة الافتراضية أولاً');
      return;
    }
    setBusy(true);
    try {
      const doc = buildExpenseClaimCreate({
        employee,
        company: defaultCompany,
        posting_date: expenseDate || today,
        remark: remark?.trim() || undefined,
        cost_center: costCenter?.trim() || undefined,
        expenses: [{
          expense_date: expenseDate || today,
          expense_type: expenseType,
          amount: amt,
          description: remark?.trim() || undefined,
          cost_center: costCenter?.trim() || undefined,
        }],
      });
      await createExpense.mutateAsync(doc);
      toast.success('تم إنشاء المصروف بنجاح');
      setEmployee('');
      setExpenseType('');
      setAmount('');
      setCostCenter('');
      setRemark('');
      setExpenseDate(today);
      void refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const isAccountError = /default account|Set the default account|الحساب الافتراضي/i.test(msg);
      const description = isAccountError
        ? 'يجب تعيين حساب افتراضي لنوع المصروف. اذهب إلى إعدادات المحاسبة ← أنواع المصروفات ← تعيين الحسابات الافتراضية'
        : msg;
      toast.error('فشل إنشاء المصروف', { description, duration: 8000 });
    } finally {
      setBusy(false);
    }
  }, [employee, expenseType, amount, expenseDate, costCenter, remark, defaultCompany, createExpense, refetch, today]);

  // Submit expense
  const handleSubmit = useCallback(async (name: string) => {
    setSubmittingName(name);
    try {
      await submitExpense.mutateAsync(name);
      toast.success('تم اعتماد المصروف');
      void refetch();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : undefined;
      toast.error('فشل الاعتماد', { description: error?.message || '', duration: 6000 });
    } finally {
      setSubmittingName(null);
    }
  }, [submitExpense, refetch]);

  // Cancel expense
  const handleCancel = useCallback(async (name: string) => {
    setSubmittingName(name);
    try {
      await cancelExpense.mutateAsync(name);
      toast.success('تم إلغاء المصروف');
      void refetch();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : undefined;
      toast.error('فشل الإلغاء', { description: error?.message || '', duration: 6000 });
    } finally {
      setSubmittingName(null);
    }
  }, [cancelExpense, refetch]);

  // Delete expense (draft only)
  const handleDelete = useCallback(async (row: ExpenseRow) => {
    try {
      await deleteMutation.mutateAsync(row.name);
      toast.success('تم حذف المصروف');
      setDeleteDialogOpen(false);
      setSelectedEntry(null);
      void refetch();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : undefined;
      toast.error('فشل الحذف', { description: error?.message || '', duration: 6000 });
    }
  }, [deleteMutation, refetch]);

  // Table columns
  const columns: Column<ExpenseRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'رقم المصروف',
        sortable: true,
        filterable: true,
        render: (v) => {
          const href = docDetailPath('Expense Claim', String(v));
          return href ? <Link href={href} className="font-medium text-primary hover:underline">{String(v)}</Link> : <span>{String(v)}</span>;
        },
      },
      { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => v ? formatDate(String(v)) : '\u2014' },
      { key: 'employee_name', header: 'الموظف', filterable: true, render: (v) => String(v || '\u2014') },
      { key: 'expense_type', header: 'نوع المصروف', filterable: true, render: (v) => String(v || '\u2014') },
      {
        key: 'total_claimed_amount',
        header: 'المبلغ المطلوب',
        sortable: true,
        render: (v) => <span className="font-semibold text-destructive tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span>,
      },
      {
        key: 'total_sanctioned_amount',
        header: 'المبلغ المعتمد',
        sortable: true,
        render: (v) => <span className="font-semibold text-emerald-600 tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span>,
      },
      {
        key: 'status',
        header: 'الحالة',
        filterable: true,
        render: (v) => {
          const label = EXPENSE_STATUS_MAP[String(v)] || String(v);
          return <Badge variant="outline" className="text-xs">{label}</Badge>;
        },
      },
      { key: 'docstatus', header: 'حالة المستند', render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} /> },
      {
        key: 'actions',
        header: 'إجراءات',
        render: (_v, row) => (
          <div className="flex items-center gap-1">
            {row.docstatus === 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                  onClick={() => handleSubmit(row.name)}
                  disabled={submittingName === row.name}
                >
                  {submittingName === row.name ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  {submittingName === row.name ? 'جاري الاعتماد...' : 'اعتماد'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-destructive hover:text-destructive/80"
                  onClick={() => { setSelectedEntry(row); setDeleteDialogOpen(true); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
            {row.docstatus === 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-destructive hover:text-destructive/80"
                onClick={() => handleCancel(row.name)}
                disabled={submittingName === row.name}
              >
                {submittingName === row.name ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {submittingName === row.name ? 'جاري الإلغاء...' : 'إلغاء'}
              </Button>
            )}
            {(() => {
              const href = docDetailPath('Expense Claim', row.name);
              return href ? <Link href={href} className="text-xs text-primary hover:underline">عرض</Link> : <span className="text-xs text-muted-foreground">عرض</span>;
            })()}
          </div>
        ),
      },
    ],
    [handleSubmit, handleCancel, deleteMutation, submittingName]
  );

  const hasActiveFilters = dateFrom || dateTo || docstatusFilter !== 'all' || search || employeeFilter || expenseTypeFilter;

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setDocstatusFilter('all');
    setSearch('');
    setEmployeeFilter('');
    setExpenseTypeFilter('');
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      {/* تنبيه بعدم توفر نوع المستند — مع زر تثبيت HRMS */}
      {doctypeAvailable === false && (
        <HrmsRequiredBanner />
      )}

      <PageHeader
        title="المصاريف اليومية"
        description="متابعة وإدارة المصاريف اليومية — إضافة مصروف جديد أو الاطلاع على سجل المصاريف"
        iconify="solar:wallet-money-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'المصاريف اليومية' }]}
      />

      {/* ── فلاتر التاريخ والحالة ── */}
      <ErpListDateStatusFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        statusValue={docstatusFilter}
        onStatusChange={setDocstatusFilter}
        statusTabs={statusTabs}
        extraFilters={
          <div className="flex flex-wrap items-end gap-3">
            {/* فلتر الموظف */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">الموظف</Label>
              <ErpLinkCombobox
                doctype="Employee"
                value={employeeFilter}
                onChange={setEmployeeFilter}
                placeholder="كل الموظفين"
                displayKey="employee_name"
                className="h-9 w-44"
              />
            </div>
            {/* فلتر نوع المصروف */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">نوع المصروف</Label>
              <ErpLinkCombobox
                doctype="Expense Claim Type"
                value={expenseTypeFilter}
                onChange={setExpenseTypeFilter}
                placeholder="كل الأنواع"
                className="h-9 w-40"
              />
            </div>
            {/* بحث سريع */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">بحث</Label>
              <Input
                placeholder="رقم أو بيان..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9 text-xs w-44"
              />
            </div>
            {/* مسح */}
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

      {/* New Expense Form */}
      <Card className="border-warning/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-warning" />
            إضافة مصروف جديد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الموظف <span className="text-destructive">*</span></Label>
              <ErpLinkCombobox
                doctype="Employee"
                value={employee}
                onChange={setEmployee}
                placeholder="اختر الموظف"
                displayKey="employee_name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">نوع المصروف <span className="text-destructive">*</span></Label>
              <ErpLinkCombobox
                doctype="Expense Claim Type"
                value={expenseType}
                onChange={setExpenseType}
                placeholder="اختر نوع المصروف"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">المبلغ (ر.ي) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                dir="ltr"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">التاريخ</Label>
              <DatePicker
                value={expenseDate}
                onChange={setExpenseDate}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">مركز التكلفة</Label>
              <ErpLinkCombobox
                doctype="Cost Center"
                value={costCenter}
                onChange={setCostCenter}
                placeholder="اختر مركز التكلفة"
                displayKey="cost_center_name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">ملاحظات</Label>
              <Textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="ملاحظات إضافية..."
                rows={1}
                className="min-h-[36px]"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleCreateExpense} disabled={busy} className="gap-1.5 min-w-[160px]">
              <Send className="h-3.5 w-3.5" />
              {busy ? 'جارٍ الإضافة...' : 'إضافة مصروف'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            سجل المصاريف
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DataTable
            data={filteredExpenses}
            columns={columns}
            searchable
            loading={isLoading}
            pageSize={15}
            tableId="accounting-daily-expenses"
            columnFilters
            exportFileName="daily-expenses.csv"
            printTitle="المصاريف اليومية"
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-xs mt-1">
              هل أنت متأكد من حذف المصروف {selectedEntry?.name}؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedEntry && handleDelete(selectedEntry)}
              variant="destructive"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
