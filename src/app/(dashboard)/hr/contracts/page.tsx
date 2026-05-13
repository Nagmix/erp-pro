'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { formatDate } from '@/lib/core/helpers';
import { toast } from 'sonner';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
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
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHrmsCheck } from '@/hooks/use-hrms-check';
import { HrmsRequiredBanner } from '@/components/erp/hrms-required-banner';

type ContractRow = {
  name: string;
  party_name?: string;
  start_date?: string;
  end_date?: string;
  contract_type?: string;
  status?: string;
  docstatus: number;
  company?: string;
};

const contractTypeLabels: Record<string, string> = {
  'Fixed Term': 'محدد المدة',
  Contract: 'عقد مؤقت',
  Internship: 'تدريب',
  Freelance: 'عمل حر',
  'Part Time': 'دوام جزئي',
};

function contractStatusLabel(row: ContractRow): string {
  const end = row.end_date;
  if (!end) return 'ساري';
  const endD = new Date(end);
  if (endD < new Date(new Date().toDateString())) return 'منتهي';
  return 'ساري';
}

function contractStatusVariant(s: string): 'default' | 'destructive' | 'secondary' | 'outline' {
  if (s === 'منتهي') return 'destructive';
  if (s === 'ساري') return 'default';
  return 'secondary';
}

interface ContractFormState {
  party_name: string;
  contract_type: string;
  start_date: string;
  end_date: string;
}

const initialForm: ContractFormState = {
  party_name: '',
  contract_type: 'Fixed Term',
  start_date: new Date().toISOString().split('T')[0] || '',
  end_date: '',
};

export default function ContractsPage() {
  const { company, isLoading: coLoading } = useDefaultCompanyName();

  const { hrmsInstalled, loaded: hrmsLoaded } = useHrmsCheck();

  if (hrmsLoaded && !hrmsInstalled) {
    return (
      <div dir="rtl" className="erp-page-enter space-y-5">
        <PageHeader
          title="عقود الموظفين"
          description="إدارة عقود الموظفين (Contract) — الإنشاء والتعديل والترحيل والإلغاء"
          iconify="solar:document-text-bold-duotone"
          accent="primary"
          breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'العقود' }]}
        />
        <HrmsRequiredBanner />
      </div>
    );
  }

  const {
    data: contracts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useDocList<ContractRow>('Contract', {
    fields: [
      'name',
      'party_name',
      'start_date',
      'end_date',
      'contract_type',
      'status',
      'docstatus',
      'company',
    ],
    filters: [['party_type', '=', 'Employee']],
    order_by: 'modified desc',
    limit: 200,
  });

  const createMutation = useCreateDoc('Contract');
  const updateMutation = useUpdateDoc('Contract');
  const deleteMutation = useDeleteDoc('Contract');
  const submitMutation = useSubmitDoc('Contract');
  const cancelMutation = useCancelDoc('Contract');

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ContractRow | null>(null);
  const [formData, setFormData] = useState<ContractFormState>({ ...initialForm });

  const [deleteDialog, setDeleteDialog] = useState<ContractRow | null>(null);

  const clearFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
  };

  const filtered = useMemo(() => {
    return contracts.filter((row) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !(
            String(row.name).toLowerCase().includes(s) ||
            String(row.party_name || '').toLowerCase().includes(s)
          )
        )
          return false;
      }
      if (dateFrom && (row.start_date || '') < dateFrom) return false;
      if (dateTo && (row.start_date || '') > dateTo) return false;
      if (statusFilter !== 'all') {
        const s = contractStatusLabel(row);
        if (statusFilter === 'Active' && s !== 'ساري') return false;
        if (statusFilter === 'Expired' && s !== 'منتهي') return false;
      }
      return true;
    });
  }, [contracts, search, dateFrom, dateTo, statusFilter]);

  const openCreateDialog = () => {
    setEditingDoc(null);
    setFormData({ ...initialForm });
    setDialogOpen(true);
  };

  const openEditDialog = (row: ContractRow) => {
    if (Number(row.docstatus) !== 0) {
      toast.error('لا يمكن تعديل عقد معتمد');
      return;
    }
    setEditingDoc(row);
    setFormData({
      party_name: row.party_name || '',
      contract_type: row.contract_type || 'Fixed Term',
      start_date: row.start_date || '',
      end_date: row.end_date || '',
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

  const handleCreate = () => {
    if (!company) {
      toast.error('تعذر تحديد الشركة');
      return;
    }
    if (!formData.party_name) {
      toast.error('الموظف مطلوب');
      return;
    }
    if (!formData.start_date) {
      toast.error('تاريخ البدء مطلوب');
      return;
    }
    const doc = prepareFrappeDocForCreate({
      doctype: 'Contract',
      party_type: 'Employee',
      party_name: formData.party_name,
      contract_type: formData.contract_type,
      start_date: formData.start_date,
      end_date: formData.end_date || undefined,
      company,
    });
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء العقد');
        setDialogOpen(false);
        setFormData({ ...initialForm });
        void refetch();
      },
      onError: (e: Error) => {
        toast.error('تعذر إنشاء العقد', { description: e.message });
      },
    });
  };

  const handleSaveEdit = () => {
    if (!editingDoc) return;
    updateMutation.mutate(
      {
        name: editingDoc.name,
        doc: {
          contract_type: formData.contract_type,
          start_date: formData.start_date,
          end_date: formData.end_date || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('تم تعديل العقد');
          setDialogOpen(false);
          setEditingDoc(null);
          void refetch();
        },
        onError: () => {
          toast.error('تعذر تعديل العقد');
        },
      }
    );
  };

  const handleSubmit = (row: ContractRow) => {
    submitMutation.mutate(row.name, {
      onSuccess: () => {
        toast.success('تم ترحيل العقد');
        void refetch();
      },
      onError: () => {
        toast.error('تعذر ترحيل العقد');
      },
    });
  };

  const handleCancel = (row: ContractRow) => {
    cancelMutation.mutate(row.name, {
      onSuccess: () => {
        toast.success('تم إلغاء العقد');
        void refetch();
      },
      onError: () => {
        toast.error('تعذر إلغاء العقد');
      },
    });
  };

  const handleDelete = async (row: ContractRow) => {
    try {
      await deleteMutation.mutateAsync(row.name);
      toast.success('تم حذف العقد');
      setDeleteDialog(null);
      void refetch();
    } catch (e: any) {
      toast.error('تعذر الحذف', { description: e.message });
    }
  };

  const hasActiveFilters = dateFrom || dateTo || statusFilter !== 'all';

  const totalCount = contracts.length;
  const draftCount = contracts.filter((r) => Number(r.docstatus) === 0).length;
  const submittedCount = contracts.filter(
    (r) => Number(r.docstatus) === 1
  ).length;

  const columns: Column<ContractRow>[] = useMemo(
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
        key: 'party_name',
        header: 'الموظف',
        sortable: true,
        render: (_, row) => (
          <span className="font-medium">{row.party_name || '—'}</span>
        ),
      },
      {
        key: 'start_date',
        header: 'تاريخ البدء',
        sortable: true,
        render: (_, row) => formatDate(String(row.start_date || '')),
      },
      {
        key: 'end_date',
        header: 'تاريخ الانتهاء',
        render: (_, row) => formatDate(String(row.end_date || '')),
      },
      {
        key: 'contract_type',
        header: 'نوع العقد',
        render: (v) => contractTypeLabels[String(v)] || String(v || '—'),
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (_, row) => {
          const s = contractStatusLabel(row);
          return (
            <Badge variant={contractStatusVariant(s)} className="text-xs">
              {s}
            </Badge>
          );
        },
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
    [submitMutation, cancelMutation, toast, refetch]
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="عقود الموظفين"
        description="إدارة عقود الموظفين (Contract) — الإنشاء والتعديل والترحيل والإلغاء"
        iconify="solar:document-text-bold-duotone"
        accent="primary"
        breadcrumbs={[
          { label: 'الموارد البشرية', href: '/hr' },
          { label: 'العقود' },
        ]}
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            disabled={coLoading}
            onClick={openCreateDialog}
          >
            <Plus className="h-3.5 w-3.5" />
            عقد جديد
          </Button>
        }
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="بحث بالرقم أو اسم الموظف..."
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
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform',
                    filtersOpen && 'rotate-180'
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs gap-1"
              >
                <X className="h-3 w-3" /> مسح
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
                <Label className="text-xs">من تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إلى تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الحالة</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="Active">ساري</SelectItem>
                    <SelectItem value="Expired">منتهي</SelectItem>
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
        />
      </PageShell>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDoc ? `تعديل العقد — ${editingDoc.name}` : 'عقد موظف جديد'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">الموظف *</Label>
              <ErpLinkCombobox
                doctype="Employee"
                value={formData.party_name}
                onChange={(v) =>
                  setFormData((p) => ({ ...p, party_name: v }))
                }
                displayKey="employee_name"
                placeholder="اختر الموظف"
                disabled={!!editingDoc}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">نوع العقد *</Label>
              <Select
                value={formData.contract_type}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, contract_type: v }))
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fixed Term">محدد المدة</SelectItem>
                  <SelectItem value="Contract">عقد مؤقت</SelectItem>
                  <SelectItem value="Internship">تدريب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">تاريخ البدء *</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, start_date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">تاريخ الانتهاء</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, end_date: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => handleDialogClose(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={editingDoc ? handleSaveEdit : handleCreate}
              disabled={
                createMutation.isPending || updateMutation.isPending
              }
            >
              {createMutation.isPending || updateMutation.isPending
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
            <div>
              <AlertDialogTitle className="text-base">تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription className="text-xs mt-1">
                هل أنت متأكد من حذف العقد {deleteDialog?.name}؟
              </AlertDialogDescription>
            </div>
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
