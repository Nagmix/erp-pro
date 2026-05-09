'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { translateAccountName } from '@/lib/core/arabic-labels';
import { toast } from 'sonner';
import { Plus, Receipt, Send, CheckCircle2, XCircle, Filter, ChevronDown, Upload, X, DollarSign, FileText } from 'lucide-react';
import Link from 'next/link';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';
import { KpiCard } from '@/components/erp/kpi-card';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  'Cancelled': 'ملغي'};

export default function DailyExpensesPage() {
  const { company: defaultCompany } = useDefaultCompanyName();
  const createExpense = useCreateDoc('Expense Claim');
  const submitExpense = useSubmitDoc('Expense Claim');
  const cancelExpense = useCancelDoc('Expense Claim');

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Form state
  const [employee, setEmployee] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(today);
  const [costCenter, setCostCenter] = useState('');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);

  // Filter state
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    if (statusFilter !== 'all') {
      list = list.filter(e => String(e.docstatus) === statusFilter);
    }
    return list;
  }, [expenses, dateFrom, dateTo, statusFilter]);

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
      await createExpense.mutateAsync({
        doctype: 'Expense Claim',
        employee,
        expense_claim_date: expenseDate,
        expenses: [{ expense_type: expenseType, amount: amt, cost_center: costCenter || undefined }],
        remark,
        company: defaultCompany});
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
      toast.error('فشل إنشاء المصروف', { description: msg });
    } finally {
      setBusy(false);
    }
  }, [employee, expenseType, amount, expenseDate, costCenter, remark, defaultCompany, createExpense, refetch, toast, today]);

  // Submit expense — useSubmitDoc mutationFn takes just a string
  const handleSubmit = useCallback(async (name: string) => {
    try {
      await submitExpense.mutateAsync(name);
      toast.success('تم اعتماد المصروف');
      void refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('فشل الاعتماد', { description: msg });
    }
  }, [submitExpense, refetch, toast]);

  // Cancel expense — useCancelDoc mutationFn takes just a string
  const handleCancel = useCallback(async (name: string) => {
    try {
      await cancelExpense.mutateAsync(name);
      toast.success('تم إلغاء المصروف');
      void refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('فشل الإلغاء', { description: msg });
    }
  }, [cancelExpense, refetch, toast]);

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
        }},
      { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => v ? formatDate(String(v)) : '\u2014' },
      { key: 'employee_name', header: 'الموظف', filterable: true, render: (v) => String(v || '\u2014') },
      { key: 'expense_type', header: 'نوع المصروف', filterable: true, render: (v) => String(v || '\u2014') },
      {
        key: 'total_claimed_amount',
        header: 'المبلغ المطلوب',
        sortable: true,
        render: (v) => <span className="font-semibold text-destructive tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span>},
      {
        key: 'total_sanctioned_amount',
        header: 'المبلغ المعتمد',
        sortable: true,
        render: (v) => <span className="font-semibold text-emerald-600 tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span>},
      {
        key: 'status',
        header: 'الحالة',
        filterable: true,
        render: (v) => {
          const label = EXPENSE_STATUS_MAP[String(v)] || String(v);
          return <Badge variant="outline" className="text-[10px]">{label}</Badge>;
        }},
      { key: 'docstatus', header: 'حالة المستند', render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} /> },
      {
        key: 'actions',
        header: 'إجراءات',
        render: (_v, row) => (
          <div className="flex items-center gap-1">
            {row.docstatus === 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                onClick={() => handleSubmit(row.name)}
              >
                <CheckCircle2 className="h-3 w-3" />
                اعتماد
              </Button>
            )}
            {row.docstatus === 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-destructive hover:text-destructive/80"
                onClick={() => handleCancel(row.name)}
              >
                <XCircle className="h-3 w-3" />
                إلغاء
              </Button>
            )}
            {(() => { const href = docDetailPath('Expense Claim', row.name); return href ? <Link href={href} className="text-xs text-primary hover:underline">عرض</Link> : <span className="text-xs text-muted-foreground">عرض</span>; })()}
          </div>
        )},
    ],
    [handleSubmit, handleCancel]
  );
  const clearFilters = () => { setDateFrom(''); setDateTo(''); setStatusFilter('all'); setSearch(''); };


  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="المصاريف اليومية"
        description="متابعة وإدارة المصاريف اليومية — إضافة مصروف جديد أو الاطلاع على سجل المصاريف"
        iconify="solar:wallet-money-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'المصاريف اليومية' }]}
      />

      <KpiStrip>
        <KpiCard title="إجمالي المصروفات" value={formatCurrency(totalExpensesAmount)} icon={DollarSign} accent="warning" />
        <KpiCard title="مسودات" value={draftCount} icon={FileText} accent="primary" />
        <KpiCard title="معتمدة" value={approvedCount} icon={CheckCircle2} accent="success" />
      </KpiStrip>

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث بالرقم أو البيان..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
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
            <Label className="text-[10px]">من تاريخ</Label>
            <Input type="date" dir="ltr" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">إلى تاريخ</Label>
            <Input type="date" dir="ltr" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
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
              <Label className="text-xs font-medium">الموظف <span className="text-destructive">*</span></Label>
              <ErpLinkCombobox
                doctype="Employee"
                value={employee}
                onChange={setEmployee}
                placeholder="اختر الموظف"
                displayKey="employee_name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">نوع المصروف <span className="text-destructive">*</span></Label>
              <ErpLinkCombobox
                doctype="Expense Claim Type"
                value={expenseType}
                onChange={setExpenseType}
                placeholder="اختر نوع المصروف"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">المبلغ (ر.ي) <span className="text-destructive">*</span></Label>
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
              <Label className="text-xs font-medium">التاريخ</Label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                dir="ltr"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">مركز التكلفة</Label>
              <ErpLinkCombobox
                doctype="Cost Center"
                value={costCenter}
                onChange={setCostCenter}
                placeholder="اختر مركز التكلفة"
                displayKey="cost_center_name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">ملاحظات</Label>
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
    </div>
  );
}
