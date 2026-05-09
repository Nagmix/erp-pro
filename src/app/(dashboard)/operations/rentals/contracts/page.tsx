'use client';

import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { StatusBadge } from '@/components/erp/status-badge';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Trash2, Filter, ChevronDown, X, FileText, Send, Ban } from 'lucide-react';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc, useSubmitDoc, useCancelDoc } from '@/lib/client/hooks';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

interface ContractRow {
  name: string;
  party_name?: string;
  start_date?: string;
  end_date?: string;
  contract_type?: string;
  status?: string;
  docstatus?: number;
  contract_value?: number;
  terms?: string;
}

// ============================================================
// Status Mapping
// ============================================================

const CONTRACT_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  Unsigned: { label: 'غير موقّع', cls: 'bg-chart-2/10 text-chart-2' },
  Signed: { label: 'موقّع', cls: 'bg-primary/10 text-primary' },
  Active: { label: 'ساري', cls: 'bg-primary/10 text-primary' },
  Cancelled: { label: 'ملغي', cls: 'bg-destructive/10 text-red-700 dark:text-red-300' },
  Expired: { label: 'منتهي', cls: 'bg-muted text-muted-foreground' },
  Draft: { label: 'مسودة', cls: 'bg-secondary text-secondary-foreground' },
};

// ============================================================
// Schema
// ============================================================

const contractSchema = z.object({
  contract_type: z.string().min(1, 'نوع العقد مطلوب'),
  party_name: z.string().min(1, 'الطرف مطلوب'),
  start_date: z.string().min(1, 'تاريخ البداية مطلوب'),
  end_date: z.string().min(1, 'تاريخ النهاية مطلوب'),
  contract_value: z.coerce.number().min(0).default(0),
  terms: z.string().default(''),
});

type ContractFormInput = z.input<typeof contractSchema>;
type ContractFormOutput = z.output<typeof contractSchema>;

// ============================================================
// Main Component
// ============================================================

export default function RentalContractsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<ContractRow | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { company: defaultCo } = useDefaultCompanyName();

  // Data
  const list = useDocList<ContractRow>('Contract', {
    fields: [
      'name',
      'party_name',
      'start_date',
      'end_date',
      'contract_type',
      'status',
      'docstatus',
      'contract_value',
      'terms',
    ],
    order_by: 'modified desc',
    limit: 500,
  });

  const createMutation = useCreateDoc('Contract');
  const updateMutation = useUpdateDoc('Contract');
  const deleteMutation = useDeleteDoc('Contract');
  const submitMutation = useSubmitDoc('Contract');
  const cancelMutation = useCancelDoc('Contract');

  const allRows = list.data ?? [];

  // Stats
  const stats = useMemo(() => {
    const total = allRows.length;
    const active = allRows.filter((r) =>
      ['Signed', 'Active'].includes(String(r.status ?? ''))
    ).length;
    const expired = allRows.filter((r) => r.status === 'Expired').length;
    const cancelled = allRows.filter((r) => r.status === 'Cancelled' || r.docstatus === 2).length;
    return { total, active, expired, cancelled };
  }, [allRows]);

  // Filtered data
  const filteredData = useMemo(() => {
    let data = allRows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter(
        (r) =>
          [r.name, r.party_name, r.contract_type, r.status].some((v) =>
            String(v ?? '').toLowerCase().includes(q)
          )
      );
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'Unsigned') data = data.filter((r) => r.status === 'Unsigned');
      else if (statusFilter === 'Active') data = data.filter((r) => ['Signed', 'Active'].includes(String(r.status ?? '')));
      else if (statusFilter === 'Expired') data = data.filter((r) => r.status === 'Expired');
      else if (statusFilter === 'Cancelled') data = data.filter((r) => r.status === 'Cancelled' || r.docstatus === 2);
      else if (statusFilter === 'Draft') data = data.filter((r) => r.docstatus === 0);
      else data = data.filter((r) => r.status === statusFilter);
    }
    if (dateFrom) data = data.filter((r) => r.start_date && r.start_date >= dateFrom);
    if (dateTo) data = data.filter((r) => r.end_date && r.end_date <= dateTo);
    return data;
  }, [allRows, search, statusFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  // Columns
  const columns: Column<ContractRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'رقم العقد',
        sortable: true,
        width: 'w-32',
        render: (v) => <span className="font-mono text-xs text-primary">{String(v)}</span>,
      },
      {
        key: 'party_name',
        header: 'الطرف',
        sortable: true,
        render: (v) => <span className="text-sm font-medium">{String(v ?? '—')}</span>,
      },
      {
        key: 'start_date',
        header: 'تاريخ البداية',
        sortable: true,
        render: (v) => (
          <span className="text-xs tabular-nums" dir="ltr">
            {v ? formatDate(String(v)) : '—'}
          </span>
        ),
      },
      {
        key: 'end_date',
        header: 'تاريخ النهاية',
        sortable: true,
        render: (v) => (
          <span className="text-xs tabular-nums" dir="ltr">
            {v ? formatDate(String(v)) : '—'}
          </span>
        ),
      },
      {
        key: 'contract_type',
        header: 'نوع العقد',
        sortable: true,
        width: 'w-28',
        render: (v) => {
          const typeLabels: Record<string, string> = {
            Rental: 'إيجار',
            Service: 'خدمة',
            Support: 'دعم',
          };
          return (
            <Badge variant="outline" className="text-xs border-0 bg-chart-1/10 text-chart-1">
              {typeLabels[String(v ?? '')] || String(v ?? '—')}
            </Badge>
          );
        },
      },
      {
        key: 'status',
        header: 'الحالة',
        sortable: true,
        width: 'w-28',
        render: (v) => {
          const statusInfo = CONTRACT_STATUS_MAP[String(v ?? '')];
          if (statusInfo) {
            return (
              <Badge variant="outline" className={cn('text-xs border-0', statusInfo.cls)}>
                {statusInfo.label}
              </Badge>
            );
          }
          return <StatusBadge status={String(v ?? '—')} />;
        },
      },
    ],
    []
  );

  // Forms
  const createForm = useForm<ContractFormInput, any, ContractFormOutput>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contract_type: 'Rental',
      party_name: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      contract_value: 0,
      terms: '',
    },
  });

  const editForm = useForm<ContractFormInput, any, ContractFormOutput>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contract_type: '',
      party_name: '',
      start_date: '',
      end_date: '',
      contract_value: 0,
      terms: '',
    },
  });

  // Handlers
  const handleCreate = async (formData: ContractFormOutput) => {
    try {
      await createMutation.mutateAsync({
        doctype: 'Contract',
        contract_type: formData.contract_type,
        party_name: formData.party_name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        contract_value: formData.contract_value || undefined,
        terms: formData.terms || undefined,
        company: defaultCo || undefined,
      } as unknown as Record<string, unknown>);
      toast.success('تم إنشاء عقد الإيجار بنجاح');
      setCreateDialogOpen(false);
      createForm.reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('حدث خطأ أثناء الإنشاء', { description: msg });
    }
  };

  const handleEdit = async (formData: ContractFormOutput) => {
    if (!selected) return;
    try {
      await updateMutation.mutateAsync({
        name: selected.name,
        doc: {
          contract_type: formData.contract_type,
          party_name: formData.party_name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          contract_value: formData.contract_value || undefined,
          terms: formData.terms || undefined,
        },
      });
      toast.success('تم تعديل عقد الإيجار بنجاح');
      setEditDialogOpen(false);
      setSelected(null);
      editForm.reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('حدث خطأ أثناء التعديل', { description: msg });
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteMutation.mutate(selected.name, {
      onSuccess: () => {
        toast.success('تم حذف عقد الإيجار بنجاح');
        setDeleteDialogOpen(false);
        setSelected(null);
      },
      onError: () => toast.error('حدث خطأ أثناء الحذف'),
    });
  };

  const handleSubmit = () => {
    if (!selected) return;
    submitMutation.mutate(selected.name, {
      onSuccess: () => {
        toast.success('تم تأكيد العقد بنجاح');
        setSubmitDialogOpen(false);
        setSelected(null);
      },
      onError: (e) => {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error('حدث خطأ أثناء التأكيد', { description: msg });
        setSubmitDialogOpen(false);
      },
    });
  };

  const handleCancel = () => {
    if (!selected) return;
    cancelMutation.mutate(selected.name, {
      onSuccess: () => {
        toast.success('تم إلغاء العقد بنجاح');
        setCancelDialogOpen(false);
        setSelected(null);
      },
      onError: (e) => {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error('حدث خطأ أثناء الإلغاء', { description: msg });
        setCancelDialogOpen(false);
      },
    });
  };

  const openEdit = (row: ContractRow) => {
    setSelected(row);
    editForm.reset({
      contract_type: row.contract_type || 'Rental',
      party_name: row.party_name || '',
      start_date: row.start_date || '',
      end_date: row.end_date || '',
      contract_value: Number(row.contract_value ?? 0),
      terms: row.terms || '',
    });
    setEditDialogOpen(true);
  };

  // Filter pills
  const filterPills = useMemo(
    () => [
      { key: 'all', label: 'الكل', count: allRows.length },
      { key: 'Unsigned', label: 'غير موقّعة', count: allRows.filter((r) => r.status === 'Unsigned').length },
      { key: 'Active', label: 'سارية', count: stats.active },
      { key: 'Expired', label: 'منتهية', count: stats.expired },
      { key: 'Cancelled', label: 'ملغاة', count: stats.cancelled },
    ],
    [allRows, stats]
  );

  // Form fields renderer
  const renderFormFields = (
    form: ReturnType<typeof useForm<ContractFormInput, any, ContractFormOutput>>
  ) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">نوع العقد *</Label>
          <Select
            value={form.watch('contract_type')}
            onValueChange={(v) => form.setValue('contract_type', v)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl" align="start">
              <SelectItem value="Rental">إيجار</SelectItem>
              <SelectItem value="Service">خدمة</SelectItem>
              <SelectItem value="Support">دعم</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.contract_type && (
            <p className="text-xs text-destructive">{form.formState.errors.contract_type.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">الطرف *</Label>
          <ErpLinkCombobox
            doctype="Customer"
            value={form.watch('party_name')}
            onChange={(v) => form.setValue('party_name', v)}
            placeholder="اختر الطرف..."
            displayKey="customer_name"
          />
          {form.formState.errors.party_name && (
            <p className="text-xs text-destructive">{form.formState.errors.party_name.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">تاريخ البداية *</Label>
          <Input type="date" dir="ltr" {...form.register('start_date')} />
          {form.formState.errors.start_date && (
            <p className="text-xs text-destructive">{form.formState.errors.start_date.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">تاريخ النهاية *</Label>
          <Input type="date" dir="ltr" {...form.register('end_date')} />
          {form.formState.errors.end_date && (
            <p className="text-xs text-destructive">{form.formState.errors.end_date.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">القيمة</Label>
        <Input
          type="number"
          dir="ltr"
          placeholder="0.00"
          {...form.register('contract_value', { valueAsNumber: true })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">الشروط والأحكام</Label>
        <Textarea
          placeholder="أدخل شروط وأحكام العقد..."
          rows={4}
          {...form.register('terms')}
        />
      </div>
    </div>
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="عقود الإيجار"
        description="إدارة عقود الإيجار التفصيلية"
        iconify="solar:document-text-bold-duotone"
        accent="warning"
        breadcrumbs={[
          { label: 'التشغيل' },
          { label: 'إدارة الإيجارات', href: '/operations/rentals' },
          { label: 'عقود الإيجار' },
        ]}
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              createForm.reset({
                contract_type: 'Rental',
                party_name: '',
                start_date: new Date().toISOString().split('T')[0],
                end_date: '',
                contract_value: 0,
                terms: '',
              });
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            عقد جديد
          </Button>
        }
      />

      <ListQueryAlert error={list.isError ? (list.error as Error) : null} onRetry={() => void list.refetch()} />

      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard title="إجمالي العقود" value={stats.total} icon={FileText} accent="info" compact />
        <KpiCard title="سارية" value={stats.active} icon={FileText} accent="success" compact description="عقود موقّعة ونشطة" />
        <KpiCard title="منتهية" value={stats.expired} icon={FileText} accent="warning" compact description="عقود انتهت مدتها" />
        <KpiCard title="ملغاة" value={stats.cancelled} icon={FileText} accent="destructive" compact />
      </KpiStrip>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="بحث برقم العقد أو الطرف..."
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
            {(search || dateFrom || dateTo || statusFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
                <Label className="text-xs">من تاريخ البداية</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إلى تاريخ النهاية</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Filter Pills */}
      <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-[var(--shadow-xs-ui)] p-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 overflow-x-auto">
          {filterPills.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-bold transition-all whitespace-nowrap',
                statusFilter === f.key
                  ? 'bg-background text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-border/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              )}
            >
              {f.label}
              <span
                className={cn(
                  'tabular-nums text-xs rounded-md px-1.5 py-0.5 font-semibold',
                  statusFilter === f.key
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground/70'
                )}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={filteredData}
        columns={columns}
        searchable
        loading={list.isLoading}
        onEdit={openEdit}
        onDelete={(row) => {
          setSelected(row);
          setDeleteDialogOpen(true);
        }}
      />

      {/* Action buttons for selected contract */}
      {selected && (
        <div className="flex flex-wrap gap-2">
          {selected.docstatus === 0 && (
            <Button
              size="sm"
              variant="default"
              className="gap-1.5"
              onClick={() => setSubmitDialogOpen(true)}
            >
              <Send className="h-3.5 w-3.5" />
              تأكيد العقد
            </Button>
          )}
          {selected.docstatus === 1 && (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() => setCancelDialogOpen(true)}
            >
              <Ban className="h-3.5 w-3.5" />
              إلغاء العقد
            </Button>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة عقد إيجار جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)}>
            {renderFormFields(createForm)}
            <DialogFooter className="gap-2 mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateDialogOpen(false)}
                className="text-muted-foreground"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="gap-1.5 min-w-[130px]"
              >
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ العقد'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل عقد الإيجار</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)}>
            {renderFormFields(editForm)}
            <DialogFooter className="gap-2 mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditDialogOpen(false)}
                className="text-muted-foreground"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="gap-1.5 min-w-[130px]"
              >
                {updateMutation.isPending ? 'جاري التحديث...' : 'تحديث العقد'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation */}
      <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد العقد</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  هل أنت متأكد من تأكيد العقد &quot;{selected?.name}&quot;؟ بعد التأكيد لا يمكن
                  تعديله.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">إلغاء العقد</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  هل أنت متأكد من إلغاء العقد &quot;{selected?.name}&quot;؟ لا يمكن التراجع عن هذا
                  الإجراء.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              variant="destructive" className="gap-1.5"
            >
              <Ban className="h-3.5 w-3.5" />
              إلغاء العقد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد الحذف</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  هل أنت متأكد من حذف العقد &quot;{selected?.name}&quot;؟ لا يمكن التراجع عن هذا
                  الإجراء.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              variant="destructive" className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
