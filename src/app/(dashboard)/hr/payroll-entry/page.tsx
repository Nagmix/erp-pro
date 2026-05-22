'use client';

import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge, StatusBadge } from '@/components/erp/status-badge';
import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Calculator,
  Send,
  Undo2,
  Plus,
  Filter,
  ChevronDown,
  X,
  Loader2,
  Building2,
  Users,
  FileCheck,
  Ban,
  CircleDollarSign,
} from 'lucide-react';
import { KpiCard } from '@/components/erp/kpi-card';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useUpdateDoc, useSubmitDoc, useCancelDoc } from '@/lib/client/hooks';
import { buildPayrollEntryCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useHrmsCheck } from '@/hooks/use-hrms-check';
import { HrmsRequiredBanner } from '@/components/erp/hrms-required-banner';

// ── Types ────────────────────────────────────────────────────
type PayrollRow = {
  name: string;
  company?: string;
  posting_date?: string;
  start_date?: string;
  end_date?: string;
  branch?: string;
  department?: string;
  designation?: string;
  number_of_employees?: number;
  total_gross_pay?: number;
  payroll_frequency?: string;
  payroll_payable_account?: string;
  currency?: string;
  docstatus?: number;
  status?: string;
};

type FormData = {
  company: string;
  posting_date: string;
  start_date: string;
  end_date: string;
  branch: string;
  department: string;
  designation: string;
  payroll_frequency: 'Monthly' | 'Fortnightly' | 'Weekly' | 'Daily';
  payroll_payable_account: string;
  currency: string;
};

const initialFormData: FormData = {
  company: '',
  posting_date: new Date().toISOString().slice(0, 10),
  start_date: '',
  end_date: '',
  branch: '',
  department: '',
  designation: '',
  payroll_frequency: 'Monthly',
  payroll_payable_account: '',
  currency: 'YER',
};

// ── Main Component ───────────────────────────────────────────
export default function PayrollEntryPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({ ...initialFormData });
  const [editingDoc, setEditingDoc] = useState<PayrollRow | null>(null);
  const [submitDialog, setSubmitDialog] = useState<PayrollRow | null>(null);
  const [cancelDialog, setCancelDialog] = useState<PayrollRow | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();

  const { data, isLoading, isError, error, refetch } = useDocList<PayrollRow>('Payroll Entry', {
    fields: [
      'name',
      'company',
      'posting_date',
      'start_date',
      'end_date',
      'branch',
      'department',
      'designation',
      'number_of_employees',
      'total_gross_pay',
      'payroll_frequency',
      'payroll_payable_account',
      'currency',
      'docstatus',
      'status',
    ],
    limit: 300,
    order_by: 'modified desc',
  });

  const createMut = useCreateDoc('Payroll Entry');
  const updateMut = useUpdateDoc('Payroll Entry');
  const submitMut = useSubmitDoc('Payroll Entry');
  const cancelMut = useCancelDoc('Payroll Entry');

  const { hrmsInstalled, loaded: hrmsLoaded } = useHrmsCheck();

  const entries = data || [];

  // ── Companies list for filter ──
  const companies = useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => { if (e.company) s.add(e.company); });
    return Array.from(s).sort();
  }, [entries]);

  // ── Filtered Data ──
  const filteredData = useMemo(() => {
    let list = entries;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((e) =>
        [e.name, e.company, e.department, e.designation, e.branch].some((v) =>
          String(v ?? '').toLowerCase().includes(q)
        )
      );
    }
    if (statusFilter !== 'all') {
      const ds = Number(statusFilter);
      list = list.filter((e) => Number(e.docstatus) === ds);
    }
    if (companyFilter && companyFilter !== '__all__') {
      list = list.filter((e) => e.company === companyFilter);
    }
    if (dateFrom) {
      list = list.filter((e) => e.start_date && e.start_date >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((e) => e.end_date && e.end_date <= dateTo);
    }
    return list;
  }, [entries, searchQuery, statusFilter, companyFilter, dateFrom, dateTo]);

  // ── Table Columns ──
  const columns: Column<PayrollRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرقم',
        sortable: true,
        width: 'w-28',
        render: (value) => (
          <span className="font-medium text-primary">{String(value)}</span>
        ),
      },
      {
        key: 'company',
        header: 'الشركة',
        sortable: true,
        render: (value) => (
          <span className="flex items-center gap-1.5 text-xs">
            <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
            {String(value || '—')}
          </span>
        ),
      },
      {
        key: 'posting_date',
        header: 'تاريخ القيد',
        sortable: true,
        render: (value) => (
          <span className="text-xs">{value ? formatDate(String(value)) : '—'}</span>
        ),
      },
      {
        key: 'start_date',
        header: 'الفترة',
        sortable: true,
        render: (_, row) => (
          <span className="text-xs">
            {row.start_date ? formatDate(String(row.start_date)) : '—'} —{' '}
            {row.end_date ? formatDate(String(row.end_date)) : '—'}
          </span>
        ),
      },
      {
        key: 'branch',
        header: 'الفرع',
        render: (value) => String(value || '—'),
      },
      {
        key: 'department',
        header: 'القسم',
        render: (value) => String(value || '—'),
      },
      {
        key: 'designation',
        header: 'المسمى',
        render: (value) => String(value || '—'),
      },
      {
        key: 'number_of_employees',
        header: 'الموظفين',
        sortable: true,
        render: (value) => (
          <span className="flex items-center gap-1 tabular-nums">
            <Users className="h-3 w-3 text-muted-foreground" />
            {String(value ?? '0')}
          </span>
        ),
      },
      {
        key: 'total_gross_pay',
        header: 'إجمالي الرواتب',
        sortable: true,
        render: (value, row) => (
          <span className="font-semibold tabular-nums">
            {formatCurrency(Number(value ?? 0), row.currency || 'YER')}
          </span>
        ),
      },
      {
        key: 'docstatus',
        header: 'الحالة',
        width: 'w-20',
        render: (value) => (
          <DocStatusBadge docstatus={Number(value ?? 0) as 0 | 1 | 2} />
        ),
      },
      {
        key: '_actions',
        header: 'إجراءات',
        width: 'w-36',
        render: (_v, row) => {
          const ds = Number(row.docstatus);
          return (
            <div className="flex items-center gap-1">
              {ds === 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs gap-1"
                  onClick={() => setSubmitDialog(row)}
                >
                  <Send className="h-3 w-3" />
                  ترحيل
                </Button>
              )}
              {ds === 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  onClick={() => setCancelDialog(row)}
                >
                  <Undo2 className="h-3 w-3" />
                  إلغاء
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  if (hrmsLoaded && !hrmsInstalled) {
    return (
      <div dir="rtl" className="erp-page-enter space-y-5">
        <PageHeader
          title="مسير الرواتب"
          description="إنشاء جماعي واعتماد مسيرات الدفع وصرف الرواتب"
          iconify="solar:calculator-bold-duotone"
          accent="info"
          breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'مسير الرواتب' }]}
        />
        <HrmsRequiredBanner />
      </div>
    );
  }

  // ── KPI Data ──
  const totalEntries = entries.length;
  const draftCount = entries.filter((e) => Number(e.docstatus) === 0).length;
  const submittedCount = entries.filter((e) => Number(e.docstatus) === 1).length;
  const totalGrossPay = entries
    .filter((e) => Number(e.docstatus) === 1)
    .reduce((sum, e) => sum + Number(e.total_gross_pay ?? 0), 0);
  const cancelledCount = entries.filter((e) => Number(e.docstatus) === 2).length;
  const totalEmployees = entries
    .filter((e) => Number(e.docstatus) === 1)
    .reduce((sum, e) => sum + Number(e.number_of_employees ?? 0), 0);

  // ── Create/Edit Dialog ──
  const openCreateDialog = () => {
    setEditingDoc(null);
    setFormData({
      ...initialFormData,
      company: defaultCompany || '',
      posting_date: new Date().toISOString().slice(0, 10),
    });
    setCreateOpen(true);
  };

  const openEditDialog = (row: PayrollRow) => {
    if (Number(row.docstatus) !== 0) {
      toast.error('لا يمكن تعديل مستند مُرحّل');
      return;
    }
    setEditingDoc(row);
    setFormData({
      company: row.company || defaultCompany || '',
      posting_date: row.posting_date || '',
      start_date: row.start_date || '',
      end_date: row.end_date || '',
      branch: row.branch || '',
      department: row.department || '',
      designation: row.designation || '',
      payroll_frequency: (row.payroll_frequency as FormData['payroll_frequency']) || 'Monthly',
      payroll_payable_account: row.payroll_payable_account || '',
      currency: row.currency || 'YER',
    });
    setCreateOpen(true);
  };

  const handleSave = () => {
    if (!formData.company || !formData.start_date || !formData.end_date) {
      toast.error('الشركة وفترة الرواتب مطلوبة');
      return;
    }

    if (editingDoc) {
      updateMut.mutate(
        {
          name: editingDoc.name,
          doc: {
            start_date: formData.start_date,
            end_date: formData.end_date,
            payroll_frequency: formData.payroll_frequency,
            branch: formData.branch || undefined,
            department: formData.department || undefined,
            designation: formData.designation || undefined,
            payroll_payable_account: formData.payroll_payable_account || undefined,
            currency: formData.currency || undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success('تم تعديل مسير الرواتب');
            setCreateOpen(false);
            setEditingDoc(null);
          },
          onError: () => toast.error('فشل التعديل'),
        }
      );
    } else {
      const payload = buildPayrollEntryCreate({
        company: formData.company,
        start_date: formData.start_date,
        end_date: formData.end_date,
        posting_date: formData.posting_date || undefined,
        payroll_frequency: formData.payroll_frequency,
        branch: formData.branch || undefined,
        cost_center: undefined,
      });

      // Add extra fields not covered by buildPayrollEntryCreate
      const doc = prepareFrappeDocForCreate(payload);
      if (formData.department) doc.department = formData.department;
      if (formData.designation) doc.designation = formData.designation;
      if (formData.payroll_payable_account) doc.payroll_payable_account = formData.payroll_payable_account;
      if (formData.currency && formData.currency !== 'YER') doc.currency = formData.currency;

      createMut.mutate(doc, {
        onSuccess: () => {
          toast.success('تم إنشاء مسير الرواتب');
          setCreateOpen(false);
          setFormData({ ...initialFormData });
        },
        onError: () => toast.error('فشل الإنشاء'),
      });
    }
  };

  const handleDialogClose = (openVal: boolean) => {
    setCreateOpen(openVal);
    if (!openVal) {
      setEditingDoc(null);
      setFormData({ ...initialFormData });
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setCompanyFilter('');
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setFiltersOpen(false);
  };

  const hasActiveFilters = statusFilter !== 'all' || companyFilter || searchQuery || dateFrom || dateTo;

  // ── Render ──
  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="مسير الرواتب"
        description="إنشاء جماعي واعتماد مسيرات الدفع وصرف الرواتب"
        iconify="solar:calculator-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'مسير الرواتب' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={openCreateDialog} disabled={coLoading}>
            <Plus className="h-3.5 w-3.5" />
            مسير جديد
          </Button>
        }
      />

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <KpiCard title="إجمالي المسيرات" value={totalEntries} icon={Calculator} accent="primary" compact />
        <KpiCard title="مسودات" value={draftCount} icon={FileCheck} accent="warning" compact />
        <KpiCard title="مُرحّلة" value={submittedCount} icon={Send} accent="success" compact />
        <KpiCard title="ملغاة" value={cancelledCount} icon={Ban} accent="destructive" compact />
        <KpiCard title="إجمالي الرواتب" value={formatCurrency(totalGrossPay)} icon={CircleDollarSign} accent="info" compact />
        <KpiCard title="الموظفين" value={totalEmployees} icon={Users} accent="primary" compact />
      </div>

      {/* ── Status Filter Pills ── */}
      <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-[var(--shadow-xs-ui)] p-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 overflow-x-auto">
          {(
            [
              { key: 'all', label: 'الكل', count: entries.length },
              { key: '0', label: 'مسودات', count: draftCount },
              { key: '1', label: 'مُقدّمة', count: submittedCount },
              { key: '2', label: 'ملغاة', count: cancelledCount },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === f.key
                  ? 'bg-background text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-border/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {f.label}
              <span
                className={`tabular-nums text-xs rounded-md px-1.5 py-0.5 font-semibold ${
                  statusFilter === f.key
                    ? 'bg-chart-1/10 text-chart-1'
                    : 'bg-muted text-muted-foreground/70'
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Search & Advanced Filters ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[220px] relative">
            <Calculator className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث بالشركة أو القسم أو المسمى..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pe-8 text-xs"
            />
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs gap-1">
              <X className="h-3 w-3" />
              مسح الفلاتر
            </Button>
          )}
        </div>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" />
                فلاتر متقدمة
                <ChevronDown
                  className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
                <Label className="text-xs">الشركة</Label>
                <Select value={companyFilter || '__all__'} onValueChange={(v) => setCompanyFilter(v === '__all__' ? '' : v)}>
                  <SelectTrigger className="h-9 text-xs w-44">
                    <SelectValue placeholder="كل الشركات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">كل الشركات</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">من تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 text-xs w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إلى تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 text-xs w-36"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      {/* ── Data Table ── */}
      <DataTable
        data={filteredData}
        columns={columns}
        searchable
        loading={isLoading}
        tableId="payroll-entry"
        exportFileName="payroll-entries"
        printTitle="مسير الرواتب — ERP Pro"
        onEdit={(row) => openEditDialog(row as PayrollRow)}
      />

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={createOpen} onOpenChange={handleDialogClose}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              {editingDoc ? `تعديل مسير الرواتب — ${editingDoc.name}` : 'إنشاء مسير رواتب'}
            </DialogTitle>
            {editingDoc && (
              <DialogDescription className="text-xs">
                تعديل مسير الرواتب في حالة المسودة فقط
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Company & Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  الشركة <span className="text-destructive">*</span>
                </Label>
                <ErpLinkCombobox
                  doctype="Company"
                  value={formData.company}
                  onChange={(v) => setFormData((prev) => ({ ...prev, company: v }))}
                  placeholder="اختر الشركة"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">العملة</Label>
                <ErpLinkCombobox
                  doctype="Currency"
                  value={formData.currency}
                  onChange={(v) => setFormData((prev) => ({ ...prev, currency: v }))}
                  placeholder="اختر العملة"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  تاريخ القيد <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={formData.posting_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, posting_date: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  من <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={formData.start_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  إلى <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={formData.end_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Payroll Frequency */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الدورية</Label>
              <select
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                value={formData.payroll_frequency}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    payroll_frequency: e.target.value as FormData['payroll_frequency'],
                  }))
                }
              >
                <option value="Monthly">شهري</option>
                <option value="Fortnightly">نصف شهري</option>
                <option value="Weekly">أسبوعي</option>
                <option value="Daily">يومي</option>
              </select>
            </div>

            {/* Branch, Department, Designation */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">الفرع</Label>
                <ErpLinkCombobox
                  doctype="Branch"
                  value={formData.branch}
                  onChange={(v) => setFormData((prev) => ({ ...prev, branch: v }))}
                  placeholder="اختياري"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">القسم</Label>
                <ErpLinkCombobox
                  doctype="Department"
                  value={formData.department}
                  onChange={(v) => setFormData((prev) => ({ ...prev, department: v }))}
                  placeholder="اختياري"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">المسمى الوظيفي</Label>
                <ErpLinkCombobox
                  doctype="Designation"
                  value={formData.designation}
                  onChange={(v) => setFormData((prev) => ({ ...prev, designation: v }))}
                  placeholder="اختياري"
                />
              </div>
            </div>

            {/* Payroll Payable Account */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">حساب الرواتب المستحقة</Label>
              <ErpLinkCombobox
                doctype="Account"
                value={formData.payroll_payable_account}
                onChange={(v) => setFormData((prev) => ({ ...prev, payroll_payable_account: v }))}
                placeholder="حساب دائن الرواتب"
                filters={[['account_type', '=', 'Payable'], ['is_group', '=', '0']]}
              />
            </div>

            {/* Save Button */}
            <Button
              className="w-full gap-1.5"
              onClick={handleSave}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {(createMut.isPending || updateMut.isPending) ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  جاري الحفظ...
                </>
              ) : editingDoc ? (
                <>
                  <FileCheck className="h-3.5 w-3.5" />
                  حفظ التعديل
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  إنشاء المسير
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Submit Confirmation Dialog ── */}
      <AlertDialog open={!!submitDialog} onOpenChange={() => setSubmitDialog(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد الترحيل</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  هل تريد ترحيل مسير الرواتب &quot;{submitDialog?.name}&quot;؟
                  سيتم إنشاء قسائم رواتب للموظفين ولا يمكن تعديل المسير بعد الترحيل.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                submitDialog &&
                submitMut.mutate(submitDialog.name, {
                  onSuccess: () => {
                    toast.success('تم الترحيل بنجاح');
                    setSubmitDialog(null);
                  },
                  onError: () => toast.error('فشل الترحيل'),
                })
              }
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              ترحيل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Cancel Confirmation Dialog ── */}
      <AlertDialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
                <Undo2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد الإلغاء</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  هل تريد إلغاء مسير الرواتب &quot;{cancelDialog?.name}&quot;؟
                  سيتم إلغاء قسائم الرواتب المرتبطة أيضاً.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                cancelDialog &&
                cancelMut.mutate(cancelDialog.name, {
                  onSuccess: () => {
                    toast.success('تم إلغاء المسير');
                    setCancelDialog(null);
                  },
                  onError: () => toast.error('فشل الإلغاء'),
                })
              }
              className="gap-1.5"
            >
              <Undo2 className="h-3.5 w-3.5" />
              إلغاء المسير
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
