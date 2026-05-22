'use client';

import { useMemo, useState, useCallback } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Send, Undo2, Filter, FileText, Briefcase, Check, Loader2 } from 'lucide-react';
import { useCreateDoc, useUpdateDoc, useDocList, useSubmitDoc, useCancelDoc, useDeleteDoc } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildLeaveAllocationCreate, buildLeavePolicyCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { PageHeader } from '@/components/erp/page-header';
import { formatDate } from '@/lib/core/helpers';
import { toast } from 'sonner';
import { useHrmsCheck } from '@/hooks/use-hrms-check';
import { HrmsRequiredBanner } from '@/components/erp/hrms-required-banner';

/* ──────────────── Types ──────────────── */

type Policy = {
  name: string;
  title?: string;
  company?: string;
  is_active?: number;
  docstatus?: number;
};

type Allocation = {
  name: string;
  employee?: string;
  employee_name?: string;
  leave_type?: string;
  from_date?: string;
  to_date?: string;
  new_leaves_allocated?: number;
  docstatus?: number;
  company?: string;
};

/* ──────────────── Constants ──────────────── */

const DOC_STATUS_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: '0', label: 'مسودة' },
  { value: '1', label: 'مُرحّل' },
  { value: '2', label: 'ملغي' },
] as const;

/* ──────────────── Component ──────────────── */

export default function LeavePoliciesPage() {
  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();

  const { hrmsInstalled, loaded: hrmsLoaded } = useHrmsCheck();

  /* ── Tab state ── */
  const [tab, setTab] = useState('policies');

  /* ── Dialog state ── */
  const [openPolicy, setOpenPolicy] = useState(false);
  const [openAlloc, setOpenAlloc] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'policy' | 'allocation'; name: string } | null>(null);

  /* ── Policy form state ── */
  const [policyTitle, setPolicyTitle] = useState('');
  const [policyLeaveType, setPolicyLeaveType] = useState('');
  const [policyAnnual, setPolicyAnnual] = useState<number>(0);
  const [policyCompany, setPolicyCompany] = useState('');
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);

  /* ── Allocation form state ── */
  const [allocEmployee, setAllocEmployee] = useState('');
  const [allocLeaveType, setAllocLeaveType] = useState('');
  const [allocFromDate, setAllocFromDate] = useState('');
  const [allocToDate, setAllocToDate] = useState('');
  const [allocAmount, setAllocAmount] = useState<number>(0);
  const [editingAlloc, setEditingAlloc] = useState<Allocation | null>(null);

  /* ── Filter state ── */
  const [filterCompany, setFilterCompany] = useState('');
  const [filterDocStatus, setFilterDocStatus] = useState('');

  /* ── Data fetching ── */
  const policies = useDocList<Policy>('Leave Policy', {
    fields: ['name', 'title', 'company', 'is_active', 'docstatus'],
    filters: defaultCompany ? [['company', '=', defaultCompany]] : undefined,
    limit: 300,
  });

  const allocations = useDocList<Allocation>('Leave Allocation', {
    fields: ['name', 'employee', 'employee_name', 'leave_type', 'from_date', 'to_date', 'new_leaves_allocated', 'docstatus', 'company'],
    filters: defaultCompany ? [['company', '=', defaultCompany]] : undefined,
    limit: 300,
    order_by: 'modified desc',
  });

  const createPolicy = useCreateDoc('Leave Policy');
  const updatePolicy = useUpdateDoc('Leave Policy');
  const deletePolicy = useDeleteDoc('Leave Policy');
  const submitPolicy = useSubmitDoc('Leave Policy');
  const cancelPolicy = useCancelDoc('Leave Policy');

  const createAlloc = useCreateDoc('Leave Allocation');
  const updateAlloc = useUpdateDoc('Leave Allocation');
  const deleteAlloc = useDeleteDoc('Leave Allocation');
  const submitAlloc = useSubmitDoc('Leave Allocation');
  const cancelAlloc = useCancelDoc('Leave Allocation');

  const allPolicies = policies.data || [];
  const allAllocations = allocations.data || [];

  /* ── KPI computations ── */
  const kpiTotalPolicies = allPolicies.length;
  const kpiActivePolicies = allPolicies.filter((p) => Number(p.is_active) === 1).length;
  const kpiWithAllocations = allAllocations.length;
  const kpiTotalAllocated = allAllocations.reduce((s, a) => s + (Number(a.new_leaves_allocated) || 0), 0);

  /* ── Filtered rows ── */
  const filteredPolicies = useMemo(() => {
    return allPolicies.filter((r) => {
      if (filterCompany && r.company !== filterCompany) return false;
      if (filterDocStatus && String(r.docstatus ?? 0) !== filterDocStatus) return false;
      return true;
    });
  }, [allPolicies, filterCompany, filterDocStatus]);

  const filteredAllocations = useMemo(() => {
    return allAllocations.filter((r) => {
      if (filterCompany && r.company !== filterCompany) return false;
      if (filterDocStatus && String(r.docstatus ?? 0) !== filterDocStatus) return false;
      return true;
    });
  }, [allAllocations, filterCompany, filterDocStatus]);

  /* ── Table columns ── */
  const policyColumns: Column<Policy>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرمز',
        sortable: true,
        render: (v) => <span className="font-medium text-primary">{String(v)}</span>,
      },
      {
        key: 'title',
        header: 'العنوان',
        render: (_, r) => <span className="font-medium">{r.title || r.name}</span>,
      },
      {
        key: 'company',
        header: 'الشركة',
        render: (v) => <span className="text-xs">{String(v ?? '—')}</span>,
      },
      {
        key: 'is_active',
        header: 'نشط',
        render: (v) => (
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${Number(v) === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            {Number(v) === 1 ? <Check className="h-3 w-3" /> : null}
            {Number(v) === 1 ? 'نعم' : 'لا'}
          </span>
        ),
      },
      {
        key: 'docstatus',
        header: 'حالة المستند',
        render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} />,
      },
      {
        key: '_actions',
        header: 'إجراءات',
        width: 'w-36',
        render: (_v, row) => {
          const ds = Number(row.docstatus ?? 0);
          if (ds === 0) {
            return (
              <div className="flex items-center gap-1">
                <Button
                  dir="rtl"
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 text-[10px] gap-1"
                  onClick={() =>
                    submitPolicy.mutate(row.name, {
                      onSuccess: () => { toast.success('تم ترحيل السياسة'); void policies.refetch(); },
                      onError: () => toast.error('تعذر الترحيل'),
                    })
                  }
                >
                  <Send className="h-3 w-3" />
                  ترحيل
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget({ type: 'policy', name: row.name })}
                >
                  <Loader2 className="h-3 w-3" />
                </Button>
              </div>
            );
          }
          if (ds === 1) {
            return (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-[10px] gap-1"
                onClick={() =>
                  cancelPolicy.mutate(row.name, {
                    onSuccess: () => { toast.success('تم إلغاء السياسة'); void policies.refetch(); },
                    onError: () => toast.error('تعذر الإلغاء'),
                  })
                }
              >
                <Undo2 className="h-3 w-3" />
                إلغاء
              </Button>
            );
          }
          return <span className="text-muted-foreground text-xs">—</span>;
        },
      },
    ],
    [submitPolicy, cancelPolicy, toast, policies],
  );

  const allocColumns: Column<Allocation>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرمز',
        sortable: true,
        render: (v) => <span className="font-medium text-primary">{String(v)}</span>,
      },
      {
        key: 'employee_name',
        header: 'الموظف',
        render: (_, r) => <span className="font-medium">{r.employee_name || r.employee || '—'}</span>,
      },
      {
        key: 'leave_type',
        header: 'نوع الإجازة',
        render: (v) => <span>{String(v ?? '—')}</span>,
      },
      {
        key: 'new_leaves_allocated',
        header: 'الرصيد',
        sortable: true,
        render: (v) => <span className="tabular-nums font-medium">{Number(v ?? 0)}</span>,
      },
      {
        key: 'from_date',
        header: 'من',
        sortable: true,
        render: (v) => <span>{v ? formatDate(String(v)) : '—'}</span>,
      },
      {
        key: 'to_date',
        header: 'إلى',
        render: (v) => <span>{v ? formatDate(String(v)) : '—'}</span>,
      },
      {
        key: 'docstatus',
        header: 'حالة المستند',
        render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} />,
      },
      {
        key: '_actions',
        header: 'إجراءات',
        width: 'w-36',
        render: (_v, row) => {
          const ds = Number(row.docstatus ?? 0);
          if (ds === 0) {
            return (
              <div className="flex items-center gap-1">
                <Button
                  dir="rtl"
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 text-[10px] gap-1"
                  onClick={() =>
                    submitAlloc.mutate(row.name, {
                      onSuccess: () => { toast.success('تم ترحيل التخصيص'); void allocations.refetch(); },
                      onError: () => toast.error('تعذر الترحيل'),
                    })
                  }
                >
                  <Send className="h-3 w-3" />
                  ترحيل
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget({ type: 'allocation', name: row.name })}
                >
                  <Loader2 className="h-3 w-3" />
                </Button>
              </div>
            );
          }
          if (ds === 1) {
            return (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-[10px] gap-1"
                onClick={() =>
                  cancelAlloc.mutate(row.name, {
                    onSuccess: () => { toast.success('تم إلغاء التخصيص'); void allocations.refetch(); },
                    onError: () => toast.error('تعذر الإلغاء'),
                  })
                }
              >
                <Undo2 className="h-3 w-3" />
                إلغاء
              </Button>
            );
          }
          return <span className="text-muted-foreground text-xs">—</span>;
        },
      },
    ],
    [submitAlloc, cancelAlloc, toast, allocations],
  );

  /* ── Dialog handlers ── */
  const openPolicyDialog = (policy?: Policy) => {
    if (policy) {
      setEditingPolicy(policy);
      setPolicyTitle(policy.title || policy.name);
      setPolicyLeaveType('');
      setPolicyAnnual(0);
      setPolicyCompany(policy.company || '');
    } else {
      setEditingPolicy(null);
      setPolicyTitle('');
      setPolicyLeaveType('');
      setPolicyAnnual(0);
      setPolicyCompany('');
    }
    setOpenPolicy(true);
  };

  const openAllocDialog = (alloc?: Allocation) => {
    if (alloc) {
      setEditingAlloc(alloc);
      setAllocEmployee(alloc.employee || '');
      setAllocLeaveType(alloc.leave_type || '');
      setAllocFromDate(alloc.from_date || '');
      setAllocToDate(alloc.to_date || '');
      setAllocAmount(alloc.new_leaves_allocated || 0);
    } else {
      setEditingAlloc(null);
      setAllocEmployee('');
      setAllocLeaveType('');
      setAllocFromDate('');
      setAllocToDate('');
      setAllocAmount(0);
    }
    setOpenAlloc(true);
  };

  const savePolicy = () => {
    const useCompany = policyCompany || defaultCompany;
    if (!useCompany || !policyTitle) return toast.error('الشركة والعنوان مطلوبان');
    if (editingPolicy) {
      updatePolicy.mutate(
        { name: editingPolicy.name, doc: { title: policyTitle, company: useCompany } },
        {
          onSuccess: () => { toast.success('تم تعديل السياسة'); setOpenPolicy(false); setEditingPolicy(null); },
          onError: () => toast.error('فشل التعديل'),
        },
      );
    } else {
      createPolicy.mutate(
        prepareFrappeDocForCreate(buildLeavePolicyCreate({ title: policyTitle, company: useCompany, leave_type: policyLeaveType || undefined, annual_allocation: policyAnnual || undefined })),
        {
          onSuccess: () => { toast.success('تم إنشاء السياسة'); setOpenPolicy(false); setPolicyTitle(''); setPolicyAnnual(0); },
          onError: () => toast.error('فشل الإنشاء'),
        },
      );
    }
  };

  const saveAlloc = () => {
    const useCompany = defaultCompany;
    if (!useCompany || !allocEmployee || !allocLeaveType || !allocFromDate || !allocToDate || allocAmount <= 0)
      return toast.error('أكمل بيانات التخصيص');
    if (editingAlloc) {
      updateAlloc.mutate(
        { name: editingAlloc.name, doc: { employee: allocEmployee, leave_type: allocLeaveType, from_date: allocFromDate, to_date: allocToDate, new_leaves_allocated: allocAmount } },
        {
          onSuccess: () => { toast.success('تم تعديل التخصيص'); setOpenAlloc(false); setEditingAlloc(null); },
          onError: () => toast.error('فشل التعديل'),
        },
      );
    } else {
      createAlloc.mutate(
        prepareFrappeDocForCreate(buildLeaveAllocationCreate({
          company: useCompany, employee: allocEmployee, leave_type: allocLeaveType, from_date: allocFromDate, to_date: allocToDate, new_leaves_allocated: allocAmount,
        })),
        {
          onSuccess: () => { toast.success('تم التخصيص'); setOpenAlloc(false); },
          onError: () => toast.error('فشل التخصيص'),
        },
      );
    }
  };

  const handlePolicyClose = (open: boolean) => {
    setOpenPolicy(open);
    if (!open) { setEditingPolicy(null); setPolicyTitle(''); setPolicyAnnual(0); setPolicyLeaveType(''); setPolicyCompany(''); }
  };

  const handleAllocClose = (open: boolean) => {
    setOpenAlloc(open);
    if (!open) { setEditingAlloc(null); setAllocEmployee(''); setAllocLeaveType(''); setAllocFromDate(''); setAllocToDate(''); setAllocAmount(0); }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const mutation = deleteTarget.type === 'policy' ? deletePolicy : deleteAlloc;
    const refetch = deleteTarget.type === 'policy' ? policies : allocations;
    mutation.mutate(deleteTarget.name, {
      onSuccess: () => { toast.success('تم الحذف'); setDeleteTarget(null); void refetch.refetch(); },
      onError: () => toast.error('فشل الحذف'),
    });
  };

  /* ── Render ── */
  if (hrmsLoaded && !hrmsInstalled) {
    return (
      <div dir="rtl" className="erp-page-enter space-y-5">
        <PageHeader
          title="سياسات ورصيد الإجازات"
          description="إدارة سياسات الإجازات وتخصيص الأرصدة للموظفين"
          iconify="solar:calendar-bold-duotone"
          accent="info"
          breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'سياسات الإجازات' }]}
        />
        <HrmsRequiredBanner />
      </div>
    );
  }

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={tab === 'policies' ? (policies.isError ? policies.error : null) : (allocations.isError ? allocations.error : null)} onRetry={() => { void policies.refetch(); void allocations.refetch(); }} />

      {/* ── Page Header ── */}
      <PageHeader
        title="سياسات ورصيد الإجازات"
        description="إدارة سياسات الإجازات وتخصيص الأرصدة للموظفين"
        iconify="solar:calendar-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'سياسات الإجازات' }]}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openPolicyDialog()} disabled={coLoading}><Plus className="h-3.5 w-3.5" />سياسة</Button>
            <Button size="sm" className="gap-1.5" onClick={() => openAllocDialog()} disabled={coLoading}><Plus className="h-3.5 w-3.5" />تخصيص رصيد</Button>
          </div>
        }
      />

      {/* ── KPI Cards ── */}
      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/40 bg-card px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span className="font-semibold">تصفية:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            dir="rtl"
            value={filterCompany || '__all__'}
            onValueChange={(v) => setFilterCompany(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="الشركة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">كل الشركات</SelectItem>
              {Array.from(new Set([...allPolicies.map((p) => p.company), ...allAllocations.map((a) => a.company)].filter(Boolean))).map((c) => (
                <SelectItem key={c} value={c!}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            dir="rtl"
            value={filterDocStatus || '__all__'}
            onValueChange={(v) => setFilterDocStatus(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="حالة المستند" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">الكل</SelectItem>
              {DOC_STATUS_OPTIONS.filter((o) => o.value).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterCompany || filterDocStatus) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive"
              onClick={() => { setFilterCompany(''); setFilterDocStatus(''); }}
            >
              مسح الفلاتر
            </Button>
          )}
          <span className="text-[11px] text-muted-foreground">
            {tab === 'policies'
              ? `عرض ${filteredPolicies.length} من ${allPolicies.length}`
              : `عرض ${filteredAllocations.length} من ${allAllocations.length}`}
          </span>
        </div>
      </div>

      {/* ── Policy Create Dialog ── */}
      <Dialog open={openPolicy} onOpenChange={handlePolicyClose}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-info" />
              {editingPolicy ? `تعديل السياسة — ${editingPolicy.name}` : 'سياسة إجازات جديدة'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">العنوان <span className="text-destructive">*</span></Label>
              <Input value={policyTitle} onChange={(e) => setPolicyTitle(e.target.value)} placeholder="اسم السياسة" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">نوع الإجازة</Label>
              <ErpLinkCombobox doctype="Leave Type" value={policyLeaveType} onChange={setPolicyLeaveType} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">التخصيص السنوي</Label>
              <Input type="number" min="0" value={policyAnnual || ''} onChange={(e) => setPolicyAnnual(Number(e.target.value || 0))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">الشركة</Label>
              <ErpLinkCombobox doctype="Company" value={policyCompany || defaultCompany || ''} onChange={setPolicyCompany} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpenPolicy(false)} disabled={createPolicy.isPending || updatePolicy.isPending}>إلغاء</Button>
            <Button onClick={savePolicy} disabled={createPolicy.isPending || updatePolicy.isPending} className="gap-1.5">
              {(createPolicy.isPending || updatePolicy.isPending) ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />جاري الحفظ...</>
              ) : (
                <><Check className="h-3.5 w-3.5" />حفظ</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Allocation Create Dialog ── */}
      <Dialog open={openAlloc} onOpenChange={handleAllocClose}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-warning" />
              {editingAlloc ? `تعديل التخصيص — ${editingAlloc.name}` : 'تخصيص إجازة جديد'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">الموظف <span className="text-destructive">*</span></Label>
              <ErpLinkCombobox doctype="Employee" value={allocEmployee} onChange={setAllocEmployee} displayKey="employee_name" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">نوع الإجازة <span className="text-destructive">*</span></Label>
              <ErpLinkCombobox doctype="Leave Type" value={allocLeaveType} onChange={setAllocLeaveType} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">من <span className="text-destructive">*</span></Label>
                <Input type="date" dir="ltr" value={allocFromDate} onChange={(e) => setAllocFromDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">إلى <span className="text-destructive">*</span></Label>
                <Input type="date" dir="ltr" value={allocToDate} onChange={(e) => setAllocToDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">الرصيد <span className="text-destructive">*</span></Label>
              <Input type="number" min="0.5" step="0.5" value={allocAmount || ''} onChange={(e) => setAllocAmount(Number(e.target.value || 0))} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpenAlloc(false)} disabled={createAlloc.isPending || updateAlloc.isPending}>إلغاء</Button>
            <Button onClick={saveAlloc} disabled={createAlloc.isPending || updateAlloc.isPending} className="gap-1.5">
              {(createAlloc.isPending || updateAlloc.isPending) ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />جاري الحفظ...</>
              ) : (
                <><Check className="h-3.5 w-3.5" />حفظ</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف &quot;{deleteTarget?.name}&quot; نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="policies">السياسات</TabsTrigger>
          <TabsTrigger value="allocations">التخصيصات</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── Data Tables ── */}
      {tab === 'policies' && (
        <DataTable
          data={filteredPolicies}
          columns={policyColumns}
          searchable
          loading={policies.isLoading}
          tableId="leave-policies"
          exportFileName="leave-policies"
          onEdit={(row) => {
            if (Number(row.docstatus) !== 0) { toast.error('لا يمكن تعديل مستند معتمد'); return; }
            openPolicyDialog(row);
          }}
          onDelete={(row) => { if (Number(row.docstatus) === 0) setDeleteTarget({ type: 'policy', name: row.name }); }}
        />
      )}
      {tab === 'allocations' && (
        <DataTable
          data={filteredAllocations}
          columns={allocColumns}
          searchable
          loading={allocations.isLoading}
          tableId="leave-allocations"
          exportFileName="leave-allocations"
          onEdit={(row) => {
            if (Number(row.docstatus) !== 0) { toast.error('لا يمكن تعديل مستند معتمد'); return; }
            openAllocDialog(row);
          }}
          onDelete={(row) => { if (Number(row.docstatus) === 0) setDeleteTarget({ type: 'allocation', name: row.name }); }}
        />
      )}
    </div>
  );
}
