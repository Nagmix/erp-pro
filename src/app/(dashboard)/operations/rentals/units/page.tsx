'use client';

import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
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
import { Plus, Trash2, Filter, ChevronDown, X, Home } from 'lucide-react';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { toast } from 'sonner';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

interface ItemRow {
  name: string;
  item_code: string;
  item_name?: string;
  item_group?: string;
  standard_rate?: number;
  stock_qty?: number;
  disabled?: number;
  description?: string;
}

// ============================================================
// Status Mapping
// ============================================================

const UNIT_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  متاح: { label: 'متاح', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  محجوز: { label: 'محجوز', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  صيانة: { label: 'صيانة', cls: 'bg-red-500/10 text-red-700 dark:text-red-300' },
};

// ============================================================
// Schema
// ============================================================

const unitSchema = z.object({
  item_code: z.string().min(1, 'كود الوحدة مطلوب'),
  item_name: z.string().min(1, 'اسم الوحدة مطلوب'),
  item_group: z.string().min(1, 'مجموعة الأصناف مطلوبة'),
  standard_rate: z.coerce.number().min(0).default(0),
  description: z.string().default(''),
  warehouse: z.string().default(''),
  unit_status: z.string().default('متاح'),
});

type UnitFormInput = z.input<typeof unitSchema>;
type UnitFormOutput = z.output<typeof unitSchema>;

// ============================================================
// Main Component
// ============================================================

export default function RentalUnitsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<ItemRow | null>(null);
  const [itemGroupFilter, setItemGroupFilter] = useState('all');
  const { company: defaultCo } = useDefaultCompanyName();

  // Data
  const list = useDocList<ItemRow>('Item', {
    fields: [
      'name',
      'item_code',
      'item_name',
      'item_group',
      'standard_rate',
      'stock_qty',
      'disabled',
      'description',
    ],
    order_by: 'modified desc',
    limit: 500,
  });

  const createMutation = useCreateDoc('Item');
  const updateMutation = useUpdateDoc('Item');
  const deleteMutation = useDeleteDoc('Item');

  const allRows = list.data ?? [];

  // Stats
  const stats = useMemo(() => {
    const total = allRows.length;
    const available = allRows.filter((r) => r.disabled === 0 || !r.disabled).length;
    const booked = allRows.filter((r) => r.disabled === 1).length;
    return { total, available, booked, maintenance: 0 };
  }, [allRows]);

  // Filtered data
  const filteredData = useMemo(() => {
    let data = allRows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter(
        (r) =>
          [r.item_code, r.item_name, r.item_group].some((v) =>
            String(v ?? '').toLowerCase().includes(q)
          )
      );
    }
    if (statusFilter === 'متاح') data = data.filter((r) => r.disabled === 0 || !r.disabled);
    if (statusFilter === 'محجوز') data = data.filter((r) => r.disabled === 1);
    if (itemGroupFilter !== 'all') data = data.filter((r) => r.item_group === itemGroupFilter);
    return data;
  }, [allRows, search, statusFilter, itemGroupFilter]);

  // Unique item groups for filter
  const itemGroups = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach((r) => {
      if (r.item_group) set.add(r.item_group);
    });
    return Array.from(set).sort();
  }, [allRows]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setItemGroupFilter('all');
  };

  // Columns
  const columns: Column<ItemRow>[] = useMemo(
    () => [
      {
        key: 'item_code',
        header: 'كود الوحدة',
        sortable: true,
        width: 'w-32',
        render: (v) => <span className="font-mono text-xs text-primary">{String(v)}</span>,
      },
      {
        key: 'item_name',
        header: 'اسم الوحدة',
        sortable: true,
        render: (v) => <span className="text-sm font-medium">{String(v ?? '—')}</span>,
      },
      {
        key: 'item_group',
        header: 'مجموعة الأصناف',
        sortable: true,
        render: (v) => (
          <Badge variant="outline" className="text-[10px] border-0 bg-muted text-muted-foreground">
            {String(v ?? '—')}
          </Badge>
        ),
      },
      {
        key: 'standard_rate',
        header: 'السعر',
        sortable: true,
        render: (v) => (
          <span className="tabular-nums font-semibold" dir="ltr">
            {formatCurrency(Number(v ?? 0))}
          </span>
        ),
      },
      {
        key: 'stock_qty',
        header: 'الكمية',
        sortable: true,
        width: 'w-20',
        render: (v) => (
          <span className="tabular-nums text-xs" dir="ltr">
            {Number(v ?? 0)}
          </span>
        ),
      },
      {
        key: 'disabled',
        header: 'الحالة',
        width: 'w-24',
        render: (v) => {
          const isDisabled = Number(v) === 1;
          const statusInfo = isDisabled
            ? UNIT_STATUS_MAP['محجوز']
            : UNIT_STATUS_MAP['متاح'];
          return (
            <Badge variant="outline" className={cn('text-[10px] border-0', statusInfo.cls)}>
              {statusInfo.label}
            </Badge>
          );
        },
      },
    ],
    []
  );

  // Forms
  const createForm = useForm<UnitFormInput, any, UnitFormOutput>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      item_code: '',
      item_name: '',
      item_group: '',
      standard_rate: 0,
      description: '',
      warehouse: '',
      unit_status: 'متاح',
    },
  });

  const editForm = useForm<UnitFormInput, any, UnitFormOutput>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      item_code: '',
      item_name: '',
      item_group: '',
      standard_rate: 0,
      description: '',
      warehouse: '',
      unit_status: 'متاح',
    },
  });

  // Handlers
  const handleCreate = async (formData: UnitFormOutput) => {
    try {
      await createMutation.mutateAsync({
        doctype: 'Item',
        item_code: formData.item_code,
        item_name: formData.item_name,
        item_group: formData.item_group,
        standard_rate: formData.standard_rate,
        description: formData.description || undefined,
        is_stock_item: 0,
        disabled: formData.unit_status === 'محجوز' ? 1 : 0,
      } as unknown as Record<string, unknown>);
      toast.success('تم إنشاء وحدة الإيجار بنجاح');
      setCreateDialogOpen(false);
      createForm.reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('حدث خطأ أثناء الإنشاء', { description: msg });
    }
  };

  const handleEdit = async (formData: UnitFormOutput) => {
    if (!selected) return;
    try {
      await updateMutation.mutateAsync({
        name: selected.name,
        doc: {
          item_code: formData.item_code,
          item_name: formData.item_name,
          item_group: formData.item_group,
          standard_rate: formData.standard_rate,
          description: formData.description || undefined,
          disabled: formData.unit_status === 'محجوز' ? 1 : 0,
        },
      });
      toast.success('تم تعديل وحدة الإيجار بنجاح');
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
        toast.success('تم حذف وحدة الإيجار بنجاح');
        setDeleteDialogOpen(false);
        setSelected(null);
      },
      onError: () => toast.error('حدث خطأ أثناء الحذف'),
    });
  };

  const openEdit = (row: ItemRow) => {
    setSelected(row);
    editForm.reset({
      item_code: row.item_code,
      item_name: row.item_name || '',
      item_group: row.item_group || '',
      standard_rate: Number(row.standard_rate ?? 0),
      description: row.description || '',
      warehouse: '',
      unit_status: row.disabled === 1 ? 'محجوز' : 'متاح',
    });
    setEditDialogOpen(true);
  };

  // Filter pills
  const filterPills = useMemo(
    () => [
      { key: 'all', label: 'الكل', count: allRows.length },
      { key: 'متاح', label: 'متاحة', count: stats.available },
      { key: 'محجوز', label: 'محجوزة', count: stats.booked },
    ],
    [allRows, stats]
  );

  // Form fields renderer
  const renderFormFields = (
    form: UseFormReturn<UnitFormInput, any, UnitFormOutput>
  ) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">اسم الوحدة *</Label>
          <Input placeholder="اسم وحدة الإيجار" {...form.register('item_name')} />
          {form.formState.errors.item_name && (
            <p className="text-[10px] text-destructive">{form.formState.errors.item_name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">كود الوحدة *</Label>
          <Input placeholder="كود الوحدة" dir="ltr" {...form.register('item_code')} />
          {form.formState.errors.item_code && (
            <p className="text-[10px] text-destructive">{form.formState.errors.item_code.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">مجموعة الأصناف *</Label>
          <ErpLinkCombobox
            doctype="Item Group"
            value={form.watch('item_group')}
            onChange={(v) => form.setValue('item_group', v)}
            placeholder="اختر مجموعة الأصناف..."
          />
          {form.formState.errors.item_group && (
            <p className="text-[10px] text-destructive">{form.formState.errors.item_group.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">الحالة</Label>
          <Select value={form.watch('unit_status')} onValueChange={(v) => form.setValue('unit_status', v)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl" align="start">
              <SelectItem value="متاح">متاح</SelectItem>
              <SelectItem value="محجوز">محجوز</SelectItem>
              <SelectItem value="صيانة">صيانة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">السعر اليومي</Label>
          <Input
            type="number"
            dir="ltr"
            placeholder="0.00"
            {...form.register('standard_rate', { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">المستودع</Label>
          <ErpLinkCombobox
            doctype="Warehouse"
            value={form.watch('warehouse') ?? ''}
            onChange={(v) => form.setValue('warehouse', v)}
            placeholder="اختر المستودع..."
            showCreateShortcut={false}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">الوصف</Label>
        <Textarea
          placeholder="وصف وحدة الإيجار..."
          rows={3}
          {...form.register('description')}
        />
      </div>
    </div>
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="وحدات الإيجار"
        description="إدارة وحدات الإيجار المتاحة"
        iconify="solar:home-2-bold-duotone"
        accent="success"
        breadcrumbs={[
          { label: 'التشغيل' },
          { label: 'إدارة الإيجارات', href: '/operations/rentals' },
          { label: 'وحدات الإيجار' },
        ]}
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              createForm.reset({
                item_code: '',
                item_name: '',
                item_group: '',
                standard_rate: 0,
                description: '',
                warehouse: '',
                unit_status: 'متاح',
              });
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            وحدة جديدة
          </Button>
        }
      />

      <ListQueryAlert error={list.isError ? (list.error as Error) : null} onRetry={() => void list.refetch()} />

      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard title="إجمالي الوحدات" value={stats.total} icon={Home} accent="info" compact />
        <KpiCard title="متاحة" value={stats.available} icon={Home} accent="success" compact description="وحدات جاهزة للإيجار" />
        <KpiCard title="محجوزة" value={stats.booked} icon={Home} accent="warning" compact description="وحدات مشغولة حالياً" />
        <KpiCard title="صيانة" value={stats.maintenance} icon={Home} accent="destructive" compact description="وحدات تحت الصيانة" />
      </KpiStrip>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="بحث باسم أو كود الوحدة..."
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
            {(search || itemGroupFilter !== 'all' || statusFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
                <Label className="text-[10px]">مجموعة الأصناف</Label>
                <Select value={itemGroupFilter} onValueChange={setItemGroupFilter}>
                  <SelectTrigger className="h-8 text-xs w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">الكل</SelectItem>
                    {itemGroups.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  'tabular-nums text-[10px] rounded-md px-1.5 py-0.5 font-semibold',
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

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة وحدة إيجار جديدة</DialogTitle>
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
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الوحدة'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل وحدة الإيجار</DialogTitle>
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
                {updateMutation.isPending ? 'جاري التحديث...' : 'تحديث الوحدة'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                  هل أنت متأكد من حذف وحدة الإيجار &quot;{selected?.item_name}&quot;؟ لا يمكن التراجع عن هذا
                  الإجراء.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
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
