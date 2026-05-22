'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge, DocStatusBadge } from '@/components/erp/status-badge';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader, PageShell } from '@/components/erp/page-header';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useDocList,
  useCreateDoc,
  useUpdateDoc,
  useDeleteDoc,
  useSubmitDoc,
  useCancelDoc,
} from '@/lib/client/hooks';
import { formatDate, formatCurrency } from '@/lib/core/helpers';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildLoanCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import {
  Plus,
  Filter,
  ChevronDown,
  X,
  Trash2,
  Send,
  Undo2,
  Edit,
  HandCoins,
  CheckCircle2,
  CircleDollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KpiCard } from '@/components/erp/kpi-card';
import { toast } from 'sonner';
import { useHrmsCheck } from '@/hooks/use-hrms-check';
import { HrmsRequiredBanner } from '@/components/erp/hrms-required-banner';

/* ───────────── Types ───────────── */
type LoanRow = {
  name: string;
  applicant?: string;
  employee_name?: string;
  loan_type?: string;
  loan_amount?: number;
  monthly_repayment_amount?: number;
  repaid_amount?: number;
  status?: string;
  posting_date?: string;
  docstatus: number;
  company?: string;
  rate_of_interest?: number;
  repayment_method?: string;
  repayment_periods?: number;
};

interface LoanFormState {
  employee: string;
  loan_type: string;
  loan_amount: string;
  rate_of_interest: string;
  repayment_method: string;
  monthly_repayment: string;
  company: string;
  posting_date: string;
}

const initialForm: LoanFormState = {
  employee: '',
  loan_type: '',
  loan_amount: '0',
  rate_of_interest: '0',
  repayment_method: 'Repay Over Number of Periods',
  monthly_repayment: '0',
  company: '',
  posting_date: new Date().toISOString().split('T')[0] || '',
};

/* ───────────── Status Helpers ───────────── */
const loanStatusMap: Record<string, string> = {
  Draft: 'مسودة',
  Sanctioned: 'معتمد',
  Disbursed: 'مصروف',
  'Partly Disbursed': 'مصروف جزئياً',
  Closed: 'مغلق',
  'Written Off': 'مشطب',
};

function loanStatusLabel(status: string): string {
  return loanStatusMap[status] || status;
}

/* ───────────── Page ───────────── */
export default function EmployeeLoansPage() {
  const { company } = useDefaultCompanyName();

  const { hrmsInstalled, loaded: hrmsLoaded } = useHrmsCheck();

  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useDocList<LoanRow>('Loan', {
    fields: [
      'name',
      'applicant',
      'loan_type',
      'loan_amount',
      'monthly_repayment_amount',
      'repaid_amount',
      'status',
      'posting_date',
      'docstatus',
      'company',
      'rate_of_interest',
      'repayment_method',
      'repayment_periods',
    ],
    filters: [
      ['applicant_type', '=', 'Employee'],
      ...(company ? [['company', '=', company] as string[]] : []),
    ],
    order_by: 'modified desc',
    limit: 300,
  });

  const createMut = useCreateDoc('Loan');
  const updateMut = useUpdateDoc('Loan');
  const deleteMut = useDeleteDoc('Loan');
  const submitMut = useSubmitDoc('Loan');
  const cancelMut = useCancelDoc('Loan');

  /* ── Filters ── */
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [loanTypeFilter, setLoanTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* ── Dialog ── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LoanRow | null>(null);
  const [formData, setFormData] = useState<LoanFormState>({ ...initialForm });

  /* ── Delete Dialog ── */
  const [deleteDialog, setDeleteDialog] = useState<LoanRow | null>(null);

  /* ── KPIs ── */
  const loans = data || [];
  const totalCount = loans.length;
  const openCount = loans.filter(
    (l) => Number(l.docstatus) === 0 || l.status === 'Draft' || l.status === 'Sanctioned'
  ).length;
  const fullyPaidCount = loans.filter(
    (l) => Number(l.repaid_amount) >= Number(l.loan_amount) && Number(l.loan_amount) > 0
  ).length;
  const totalAmount = loans.reduce((s, l) => s + (Number(l.loan_amount) || 0), 0);

  /* ── Filtered Data ── */
  const filtered = useMemo(() => {
    return loans.filter((row) => {
      if (search) {
        const s = search.toLowerCase();
        const hit =
          String(row.name).toLowerCase().includes(s) ||
          String(row.applicant || '').toLowerCase().includes(s) ||
          String(row.loan_type || '').toLowerCase().includes(s);
        if (!hit) return false;
      }
      if (employeeFilter && row.applicant !== employeeFilter) return false;
      if (loanTypeFilter && row.loan_type !== loanTypeFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'draft' && Number(row.docstatus) !== 0) return false;
        if (statusFilter === 'submitted' && Number(row.docstatus) !== 1) return false;
        if (statusFilter === 'cancelled' && Number(row.docstatus) !== 2) return false;
        if (statusFilter === 'disbursed' && row.status !== 'Disbursed') return false;
      }
      return true;
    });
  }, [loans, search, employeeFilter, loanTypeFilter, statusFilter]);

  const hasActiveFilters = employeeFilter || loanTypeFilter || statusFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setEmployeeFilter('');
    setLoanTypeFilter('');
    setStatusFilter('all');
  };

  /* ── Dialog Handlers ── */
  const openCreateDialog = () => {
    setEditingDoc(null);
    setFormData({
      ...initialForm,
      company: company || '',
      posting_date: new Date().toISOString().split('T')[0] || '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (row: LoanRow) => {
    if (Number(row.docstatus) !== 0) {
      toast.error('لا يمكن تعديل مستند معتمد');
      return;
    }
    setEditingDoc(row);
    setFormData({
      employee: row.applicant || '',
      loan_type: row.loan_type || '',
      loan_amount: String(row.loan_amount || 0),
      rate_of_interest: String(row.rate_of_interest || 0),
      repayment_method: row.repayment_method || 'Repay Over Number of Periods',
      monthly_repayment: String(row.monthly_repayment_amount || 0),
      company: row.company || '',
      posting_date: row.posting_date || '',
    });
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingDoc(null);
      setFormData({ ...initialForm });
    }
  };

  const handleSave = () => {
    const comp = formData.company || company;
    if (!comp || !formData.employee || !formData.loan_type || Number(formData.loan_amount) <= 0) {
      toast.error('أكمل البيانات المطلوبة');
      return;
    }

    if (editingDoc) {
      updateMut.mutate(
        {
          name: editingDoc.name,
          doc: {
            loan_type: formData.loan_type,
            loan_amount: Number(formData.loan_amount),
            rate_of_interest: Number(formData.rate_of_interest) || 0,
            repayment_method: formData.repayment_method,
            monthly_repayment_amount: Number(formData.monthly_repayment) || 0,
          },
        },
        {
          onSuccess: () => {
            toast.success('تم تعديل القرض');
            setDialogOpen(false);
            setEditingDoc(null);
          },
          onError: () => toast.error('فشل التعديل'),
        }
      );
    } else {
      createMut.mutate(
        prepareFrappeDocForCreate(
          buildLoanCreate({
            applicant: formData.employee,
            company: comp,
            loan_type: formData.loan_type,
            loan_amount: Number(formData.loan_amount),
            repayment_method: formData.repayment_method as
              | 'Repay Over Number of Periods'
              | 'Repay Fixed Amount per Period',
            monthly_repayment_amount: Number(formData.monthly_repayment) || undefined,
            posting_date: formData.posting_date || undefined,
          })
        ),
        {
          onSuccess: () => {
            toast.success('تم إنشاء القرض');
            setDialogOpen(false);
            setFormData({ ...initialForm });
          },
          onError: () => toast.error('فشل إنشاء القرض'),
        }
      );
    }
  };

  const handleSubmit = (row: LoanRow) => {
    submitMut.mutate(row.name, {
      onSuccess: () => toast.success('تم ترحيل القرض'),
      onError: () => toast.error('تعذر ترحيل القرض'),
    });
  };

  const handleCancel = (row: LoanRow) => {
    cancelMut.mutate(row.name, {
      onSuccess: () => toast.success('تم إلغاء القرض'),
      onError: () => toast.error('تعذر إلغاء القرض'),
    });
  };

  const handleDelete = async (row: LoanRow) => {
    try {
      await deleteMut.mutateAsync(row.name);
      toast.success('تم حذف القرض');
      setDeleteDialog(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'تعذر الحذف');
    }
  };

  /* ── Columns ── */
  const columns: Column<LoanRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرقم',
        sortable: true,
        width: 'w-28',
        render: (v) => <span className="font-medium text-primary">{String(v)}</span>,
      },
      {
        key: 'applicant',
        header: 'الموظف',
        sortable: true,
        render: (_, r) => (
          <span className="font-medium">{r.employee_name || r.applicant || '—'}</span>
        ),
      },
      {
        key: 'loan_type',
        header: 'نوع القرض',
        sortable: true,
        render: (v) => <span className="text-xs">{String(v || '—')}</span>,
      },
      {
        key: 'loan_amount',
        header: 'مبلغ القرض',
        sortable: true,
        render: (v) => (
          <span className="tabular-nums font-semibold text-xs" dir="ltr">
            {formatCurrency(Number(v || 0))}
          </span>
        ),
      },
      {
        key: 'monthly_repayment_amount',
        header: 'القسط الشهري',
        render: (v) => (
          <span className="tabular-nums text-xs text-info" dir="ltr">
            {formatCurrency(Number(v || 0))}
          </span>
        ),
      },
      {
        key: 'repaid_amount',
        header: 'المسدّد',
        render: (v) => (
          <span className="tabular-nums text-xs text-success" dir="ltr">
            {formatCurrency(Number(v || 0))}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'حالة القرض',
        render: (v) => <StatusBadge status={String(v || 'Draft')} />,
      },
      {
        key: 'posting_date',
        header: 'التاريخ',
        sortable: true,
        render: (v) => (v ? formatDate(String(v)) : '—'),
      },
      {
        key: 'docstatus',
        header: 'المستند',
        render: (v) => <DocStatusBadge docstatus={Number(v ?? 0) as 0 | 1 | 2} />,
      },
      {
        key: '_actions',
        header: 'إجراءات',
        width: 'w-44',
        render: (_, row) => {
          const ds = Number(row.docstatus);
          return (
            <div className="flex flex-wrap gap-1">
              {ds === 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs gap-1"
                  onClick={() => openEditDialog(row)}
                >
                  <Edit className="h-3 w-3" />
                  تعديل
                </Button>
              )}
              {ds === 0 && (
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleSubmit(row)}
                >
                  <Send className="h-3 w-3" />
                  ترحيل
                </Button>
              )}
              {ds === 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleCancel(row)}
                >
                  <Undo2 className="h-3 w-3" />
                  إلغاء
                </Button>
              )}
              {ds < 2 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive"
                  onClick={() => setDeleteDialog(row)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [submitMut, cancelMut]
  );

  /* ── Render ── */
  if (hrmsLoaded && !hrmsInstalled) {
    return (
      <div dir="rtl" className="erp-page-enter space-y-5">
        <PageHeader
          title="قروض الموظفين"
          description="إدارة القروض وأقساط السداد — الإنشاء والترحيل والمتابعة"
          iconify="solar:hand-money-bold-duotone"
          accent="purple"
          breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'قروض الموظفين' }]}
        />
        <HrmsRequiredBanner />
      </div>
    );
  }

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="قروض الموظفين"
        description="إدارة القروض وأقساط السداد — الإنشاء والترحيل والمتابعة"
        iconify="solar:hand-money-bold-duotone"
        accent="purple"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'قروض الموظفين' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={openCreateDialog}>
            <Plus className="h-3.5 w-3.5" />
            قرض جديد
          </Button>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard title="إجمالي القروض" value={totalCount} icon={HandCoins} accent="primary" compact />
        <KpiCard title="مفتوحة" value={openCount} icon={Edit} accent="warning" compact />
        <KpiCard title="مسدّدة بالكامل" value={fullyPaidCount} icon={CheckCircle2} accent="success" compact />
        <KpiCard title="إجمالي المبالغ" value={formatCurrency(totalAmount)} icon={CircleDollarSign} accent="info" compact />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="بحث بالرقم أو الموظف أو نوع القرض..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" /> فلاتر متقدمة
                <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> مسح
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
                <Label className="text-xs">الموظف</Label>
                <div className="w-56">
                  <ErpLinkCombobox
                    doctype="Employee"
                    value={employeeFilter}
                    onChange={setEmployeeFilter}
                    displayKey="employee_name"
                    placeholder="كل الموظفين"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">نوع القرض</Label>
                <div className="w-48">
                  <ErpLinkCombobox
                    doctype="Loan Type"
                    value={loanTypeFilter}
                    onChange={setLoanTypeFilter}
                    placeholder="كل الأنواع"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الحالة</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="submitted">مُرحّل</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                    <SelectItem value="disbursed">مصروف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageShell padded={false}>
        <DataTable
          data={filtered}
          columns={columns}
          searchable
          loading={isLoading}
          pageSize={15}
          tableId="hr-loans"
          exportFileName="قروض_الموظفين"
        />
      </PageShell>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDoc ? `تعديل القرض — ${editingDoc.name}` : 'قرض موظف جديد'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                الموظف <span className="text-destructive">*</span>
              </Label>
              <ErpLinkCombobox
                doctype="Employee"
                value={formData.employee}
                onChange={(v) => setFormData((p) => ({ ...p, employee: v }))}
                displayKey="employee_name"
                placeholder="اختر الموظف..."
                disabled={!!editingDoc}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                نوع القرض <span className="text-destructive">*</span>
              </Label>
              <ErpLinkCombobox
                doctype="Loan Type"
                value={formData.loan_type}
                onChange={(v) => setFormData((p) => ({ ...p, loan_type: v }))}
                placeholder="اختر نوع القرض..."
                disabled={!!editingDoc}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  مبلغ القرض <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  dir="ltr"
                  value={formData.loan_amount || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, loan_amount: e.target.value }))}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">نسبة الفائدة %</Label>
                <Input
                  type="number"
                  dir="ltr"
                  value={formData.rate_of_interest || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, rate_of_interest: e.target.value }))}
                  min={0}
                  step="0.01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">طريقة السداد</Label>
              <Select
                value={formData.repayment_method}
                onValueChange={(v) => setFormData((p) => ({ ...p, repayment_method: v }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Repay Over Number of Periods">سداد على عدد أقساط</SelectItem>
                  <SelectItem value="Repay Fixed Amount per Period">قسط ثابت كل فترة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">القسط الشهري</Label>
                <Input
                  type="number"
                  dir="ltr"
                  value={formData.monthly_repayment || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, monthly_repayment: e.target.value }))}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">التاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={formData.posting_date}
                  onChange={(e) => setFormData((p) => ({ ...p, posting_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">الشركة</Label>
              <Input
                value={formData.company || company || ''}
                onChange={(e) => setFormData((p) => ({ ...p, company: e.target.value }))}
                disabled={!!editingDoc}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => handleDialogClose(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {createMut.isPending || updateMut.isPending
                ? 'جاري الحفظ...'
                : editingDoc
                ? 'حفظ التعديل'
                : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-xs mt-1">
              هل أنت متأكد من حذف القرض {deleteDialog?.name}؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
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
