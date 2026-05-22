'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge, DocStatusBadge } from '@/components/erp/status-badge';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { buildEmployeeAdvanceCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
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
  Wallet,
  CheckCircle2,
  CircleDollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KpiCard } from '@/components/erp/kpi-card';
import { toast } from 'sonner';
import { useHrmsCheck } from '@/hooks/use-hrms-check';
import { HrmsRequiredBanner } from '@/components/erp/hrms-required-banner';

/* ───────────── Types ───────────── */
type AdvanceRow = {
  name: string;
  employee?: string;
  employee_name?: string;
  purpose?: string;
  advance_amount?: number;
  paid_amount?: number;
  claimed_amount?: number;
  posting_date?: string;
  status?: string;
  docstatus: number;
  company?: string;
  currency?: string;
  repay_unclaimed?: number | boolean;
  advance_account?: string;
};

interface AdvanceFormState {
  employee: string;
  purpose: string;
  advance_amount: string;
  posting_date: string;
  company: string;
  currency: string;
  repay_unclaimed: boolean;
  advance_account: string;
}

const initialForm: AdvanceFormState = {
  employee: '',
  purpose: '',
  advance_amount: '0',
  posting_date: new Date().toISOString().split('T')[0] || '',
  company: '',
  currency: 'YER',
  repay_unclaimed: false,
  advance_account: '',
};

/* ───────────── Status Helpers ───────────── */
const advanceStatusMap: Record<string, string> = {
  Draft: 'مسودة',
  Sanctioned: 'معتمد',
  Claimed: 'مطالب',
  Paid: 'مدفوع',
  Unpaid: 'غير مدفوع',
  'Partly Claimed': 'مطالبة جزئية',
  Returned: 'مرتجع',
};

function advanceStatusLabel(status: string): string {
  return advanceStatusMap[status] || status;
}

/* ───────────── Page ───────────── */
export default function EmployeeAdvancesPage() {
  const { company } = useDefaultCompanyName();

  /* ── Data ── (all hooks must be called before any conditional return) */
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useDocList<AdvanceRow>('Employee Advance', {
    fields: [
      'name',
      'employee',
      'employee_name',
      'purpose',
      'advance_amount',
      'paid_amount',
      'claimed_amount',
      'posting_date',
      'status',
      'docstatus',
      'company',
      'currency',
    ],
    filters: company ? [['company', '=', company]] : undefined,
    order_by: 'modified desc',
    limit: 300,
  });

  const createMut = useCreateDoc('Employee Advance');
  const updateMut = useUpdateDoc('Employee Advance');
  const deleteMut = useDeleteDoc('Employee Advance');
  const submitMut = useSubmitDoc('Employee Advance');
  const cancelMut = useCancelDoc('Employee Advance');

  const { hrmsInstalled, loaded: hrmsLoaded } = useHrmsCheck();

  /* ── Filters ── */
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* ── Dialog ── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<AdvanceRow | null>(null);
  const [formData, setFormData] = useState<AdvanceFormState>({ ...initialForm });

  /* ── Delete Dialog ── */
  const [deleteDialog, setDeleteDialog] = useState<AdvanceRow | null>(null);

  /* ── KPIs ── */
  const advances = data || [];
  const totalCount = advances.length;
  const openCount = advances.filter(
    (a) => Number(a.docstatus) === 0 || a.status === 'Draft'
  ).length;
  const claimedCount = advances.filter(
    (a) => a.status === 'Claimed' || a.status === 'Partly Claimed'
  ).length;
  const totalAmount = advances.reduce((s, a) => s + (Number(a.advance_amount) || 0), 0);

  /* ── Filtered Data ── */
  const filtered = useMemo(() => {
    return advances.filter((row) => {
      if (search) {
        const s = search.toLowerCase();
        const hit =
          String(row.name).toLowerCase().includes(s) ||
          String(row.employee_name || '').toLowerCase().includes(s) ||
          String(row.purpose || '').toLowerCase().includes(s);
        if (!hit) return false;
      }
      if (employeeFilter && row.employee !== employeeFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'draft' && Number(row.docstatus) !== 0) return false;
        if (statusFilter === 'submitted' && Number(row.docstatus) !== 1) return false;
        if (statusFilter === 'cancelled' && Number(row.docstatus) !== 2) return false;
        if (statusFilter === 'claimed' && row.status !== 'Claimed' && row.status !== 'Partly Claimed') return false;
      }
      return true;
    });
  }, [advances, search, employeeFilter, statusFilter]);

  const hasActiveFilters = employeeFilter || statusFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setEmployeeFilter('');
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

  const openEditDialog = (row: AdvanceRow) => {
    if (Number(row.docstatus) !== 0) {
      toast.error('لا يمكن تعديل مستند معتمد');
      return;
    }
    setEditingDoc(row);
    setFormData({
      employee: row.employee || '',
      purpose: row.purpose || '',
      advance_amount: String(row.advance_amount || 0),
      posting_date: row.posting_date || '',
      company: row.company || '',
      currency: row.currency || 'YER',
      repay_unclaimed: Number(row.repay_unclaimed) === 1 || row.repay_unclaimed === true,
      advance_account: row.advance_account || '',
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
    if (!comp || !formData.employee || Number(formData.advance_amount) <= 0) {
      toast.error('أكمل البيانات المطلوبة');
      return;
    }

    if (editingDoc) {
      updateMut.mutate(
        {
          name: editingDoc.name,
          doc: {
            advance_amount: Number(formData.advance_amount),
            purpose: formData.purpose || undefined,
            repay_unclaimed: formData.repay_unclaimed ? 1 : 0,
            advance_account: formData.advance_account || undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success('تم تعديل السلفة');
            setDialogOpen(false);
            setEditingDoc(null);
          },
          onError: () => toast.error('فشل التعديل'),
        }
      );
    } else {
      createMut.mutate(
        prepareFrappeDocForCreate(
          buildEmployeeAdvanceCreate({
            employee: formData.employee,
            company: comp,
            advance_amount: Number(formData.advance_amount),
            purpose: formData.purpose || undefined,
            posting_date: formData.posting_date || undefined,
          })
        ),
        {
          onSuccess: () => {
            toast.success('تم إنشاء السلفة');
            setDialogOpen(false);
            setFormData({ ...initialForm });
          },
          onError: () => toast.error('فشل إنشاء السلفة'),
        }
      );
    }
  };

  const handleSubmit = (row: AdvanceRow) => {
    submitMut.mutate(row.name, {
      onSuccess: () => toast.success('تم ترحيل السلفة'),
      onError: () => toast.error('تعذر ترحيل السلفة'),
    });
  };

  const handleCancel = (row: AdvanceRow) => {
    cancelMut.mutate(row.name, {
      onSuccess: () => toast.success('تم إلغاء السلفة'),
      onError: () => toast.error('تعذر إلغاء السلفة'),
    });
  };

  const handleDelete = async (row: AdvanceRow) => {
    try {
      await deleteMut.mutateAsync(row.name);
      toast.success('تم حذف السلفة');
      setDeleteDialog(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'تعذر الحذف');
    }
  };

  /* ── Columns ── */
  const columns: Column<AdvanceRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرقم',
        sortable: true,
        width: 'w-28',
        render: (v) => <span className="font-medium text-primary">{String(v)}</span>,
      },
      {
        key: 'employee_name',
        header: 'الموظف',
        sortable: true,
        render: (_, r) => <span className="font-medium">{r.employee_name || r.employee || '—'}</span>,
      },
      {
        key: 'purpose',
        header: 'السبب',
        render: (v) => <span className="text-xs">{String(v || '—')}</span>,
      },
      {
        key: 'advance_amount',
        header: 'مبلغ السلفة',
        sortable: true,
        render: (v, r) => (
          <span className="tabular-nums font-semibold text-xs" dir="ltr">
            {formatCurrency(Number(v || 0), r.currency || 'YER')}
          </span>
        ),
      },
      {
        key: 'paid_amount',
        header: 'المدفوع',
        render: (v, r) => (
          <span className="tabular-nums text-xs text-success" dir="ltr">
            {formatCurrency(Number(v || 0), r.currency || 'YER')}
          </span>
        ),
      },
      {
        key: 'claimed_amount',
        header: 'المطالب',
        render: (v, r) => (
          <span className="tabular-nums text-xs text-info" dir="ltr">
            {formatCurrency(Number(v || 0), r.currency || 'YER')}
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
        header: 'حالة السلفة',
        render: (v) => <StatusBadge status={String(v || 'Draft')} />,
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
          title="سلف الموظفين"
          description="إدارة السلف والعهد للموظفين — الإنشاء والترحيل والمطالبات"
          iconify="solar:wallet-bold-duotone"
          accent="warning"
          breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'سلف الموظفين' }]}
        />
        <HrmsRequiredBanner />
      </div>
    );
  }

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="سلف الموظفين"
        description="إدارة السلف والعهد للموظفين — الإنشاء والترحيل والمطالبات"
        iconify="solar:wallet-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'سلف الموظفين' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={openCreateDialog}>
            <Plus className="h-3.5 w-3.5" />
            سلفة جديدة
          </Button>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard title="إجمالي السلف" value={totalCount} icon={Wallet} accent="primary" compact />
        <KpiCard title="مفتوحة" value={openCount} icon={Edit} accent="warning" compact />
        <KpiCard title="مطالَبة" value={claimedCount} icon={CheckCircle2} accent="success" compact />
        <KpiCard title="إجمالي المبالغ" value={formatCurrency(totalAmount)} icon={CircleDollarSign} accent="info" compact />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="بحث بالرقم أو الموظف أو السبب..."
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
                <Label className="text-xs">حالة المستند</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="submitted">مُرحّل</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                    <SelectItem value="claimed">مطالَبة</SelectItem>
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
          tableId="hr-advances"
          exportFileName="سلف_الموظفين"
        />
      </PageShell>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDoc ? `تعديل السلفة — ${editingDoc.name}` : 'سلفة موظف جديدة'}
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
              <Label className="text-sm font-medium">السبب</Label>
              <Input
                value={formData.purpose}
                onChange={(e) => setFormData((p) => ({ ...p, purpose: e.target.value }))}
                placeholder="سبب السلفة..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  مبلغ السلفة <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  dir="ltr"
                  value={formData.advance_amount || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, advance_amount: e.target.value }))}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">الشركة</Label>
                <Input
                  value={formData.company || company || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, company: e.target.value }))}
                  disabled={!!editingDoc}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">العملة</Label>
                <Input
                  value={formData.currency}
                  onChange={(e) => setFormData((p) => ({ ...p, currency: e.target.value }))}
                  dir="ltr"
                  disabled={!!editingDoc}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">حساب السلف</Label>
              <ErpLinkCombobox
                doctype="Account"
                value={formData.advance_account}
                onChange={(v) => setFormData((p) => ({ ...p, advance_account: v }))}
                placeholder="اختر الحساب..."
                filters={[['account_type', '=', 'Cash']]}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="repay_unclaimed"
                checked={formData.repay_unclaimed}
                onCheckedChange={(v) => setFormData((p) => ({ ...p, repay_unclaimed: !!v }))}
              />
              <Label htmlFor="repay_unclaimed" className="text-xs">
                استرداد غير المطالب به
              </Label>
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
              هل أنت متأكد من حذف السلفة {deleteDialog?.name}؟
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
