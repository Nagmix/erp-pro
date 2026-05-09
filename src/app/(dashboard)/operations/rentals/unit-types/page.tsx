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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Trash2, Layers } from 'lucide-react';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

interface ItemGroupRow {
  name: string;
  parent_item_group?: string;
  is_group?: number;
  modified?: string;
}

// ============================================================
// Schema
// ============================================================

const unitTypeSchema = z.object({
  item_group_name: z.string().min(1, 'اسم النوع مطلوب'),
  parent_item_group: z.string().min(1, 'النوع الأب مطلوب'),
  is_group: z.boolean().default(false),
});

type UnitTypeFormInput = z.input<typeof unitTypeSchema>;
type UnitTypeFormOutput = z.output<typeof unitTypeSchema>;

// ============================================================
// Main Component
// ============================================================

export default function UnitTypesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<ItemGroupRow | null>(null);
  // Data
  const list = useDocList<ItemGroupRow>('Item Group', {
    fields: ['name', 'parent_item_group', 'is_group', 'modified'],
    order_by: 'modified desc',
    limit: 500,
  });

  const createMutation = useCreateDoc('Item Group');
  const updateMutation = useUpdateDoc('Item Group');
  const deleteMutation = useDeleteDoc('Item Group');

  const rows = list.data ?? [];

  // Stats
  const stats = useMemo(() => {
    const data = list.data ?? [];
    return {
      total: data.length,
      groups: data.filter((r) => r.is_group === 1).length,
      leaf: data.filter((r) => r.is_group === 0 || !r.is_group).length,
    };
  }, [list.data]);

  // Filtered data
  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return rows;
    if (statusFilter === 'group') return rows.filter((r) => r.is_group === 1);
    if (statusFilter === 'leaf') return rows.filter((r) => r.is_group === 0 || !r.is_group);
    return rows;
  }, [rows, statusFilter]);

  // Columns
  const columns: Column<ItemGroupRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'اسم النوع',
        sortable: true,
        render: (v) => <span className="font-medium text-primary">{String(v)}</span>,
      },
      {
        key: 'parent_item_group',
        header: 'النوع الأب',
        sortable: true,
        render: (v) => <span className="text-sm">{v ? String(v) : '—'}</span>,
      },
      {
        key: 'is_group',
        header: 'مجموعة',
        width: 'w-24',
        render: (v) => {
          const isGroup = Number(v) === 1;
          return (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] border-0',
                isGroup
                  ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {isGroup ? 'مجموعة' : 'فرعي'}
            </Badge>
          );
        },
      },
    ],
    []
  );

  // Forms
  const createForm = useForm<UnitTypeFormInput, any, UnitTypeFormOutput>({
    resolver: zodResolver(unitTypeSchema),
    defaultValues: {
      item_group_name: '',
      parent_item_group: 'All Item Groups',
      is_group: false,
    },
  });

  const editForm = useForm<UnitTypeFormInput, any, UnitTypeFormOutput>({
    resolver: zodResolver(unitTypeSchema),
    defaultValues: {
      item_group_name: '',
      parent_item_group: '',
      is_group: false,
    },
  });

  // Handlers
  const handleCreate = async (formData: UnitTypeFormOutput) => {
    try {
      await createMutation.mutateAsync({
        doctype: 'Item Group',
        item_group_name: formData.item_group_name,
        parent_item_group: formData.parent_item_group,
        is_group: formData.is_group ? 1 : 0,
      } as unknown as Record<string, unknown>);
      toast.success('تم إنشاء نوع الوحدة بنجاح');
      setCreateDialogOpen(false);
      createForm.reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('حدث خطأ أثناء الإنشاء', { description: msg });
    }
  };

  const handleEdit = async (formData: UnitTypeFormOutput) => {
    if (!selected) return;
    try {
      await updateMutation.mutateAsync({
        name: selected.name,
        doc: {
          item_group_name: formData.item_group_name,
          parent_item_group: formData.parent_item_group,
          is_group: formData.is_group ? 1 : 0,
        },
      });
      toast.success('تم تعديل نوع الوحدة بنجاح');
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
        toast.success('تم حذف نوع الوحدة بنجاح');
        setDeleteDialogOpen(false);
        setSelected(null);
      },
      onError: () => toast.error('حدث خطأ أثناء الحذف'),
    });
  };

  const openEdit = (row: ItemGroupRow) => {
    setSelected(row);
    editForm.reset({
      item_group_name: row.name,
      parent_item_group: row.parent_item_group || '',
      is_group: row.is_group === 1,
    });
    setEditDialogOpen(true);
  };

  // Filter pills data
  const filterPills = useMemo(
    () => [
      { key: 'all', label: 'الكل', count: rows.length },
      { key: 'group', label: 'مجموعات', count: stats.groups },
      { key: 'leaf', label: 'فرعية', count: stats.leaf },
    ],
    [rows, stats]
  );

  // Form fields renderer
  const renderFormFields = (
    form: ReturnType<typeof useForm<UnitTypeFormInput, any, UnitTypeFormOutput>>
  ) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium">اسم النوع *</Label>
        <Input placeholder="أدخل اسم نوع الوحدة..." {...form.register('item_group_name')} />
        {form.formState.errors.item_group_name && (
          <p className="text-[10px] text-destructive">
            {form.formState.errors.item_group_name.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">النوع الأب *</Label>
        <ErpLinkCombobox
          doctype="Item Group"
          value={form.watch('parent_item_group')}
          onChange={(v) => form.setValue('parent_item_group', v)}
          placeholder="اختر النوع الأب..."
        />
        {form.formState.errors.parent_item_group && (
          <p className="text-[10px] text-destructive">
            {form.formState.errors.parent_item_group.message}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Checkbox
          id={`is-group-${form === createForm ? 'create' : 'edit'}`}
          checked={form.watch('is_group')}
          onCheckedChange={(v) => form.setValue('is_group', v === true)}
        />
        <Label
          htmlFor={`is-group-${form === createForm ? 'create' : 'edit'}`}
          className="text-xs font-medium cursor-pointer"
        >
          هل هو مجموعة (يحتوي على أنواع فرعية)
        </Label>
      </div>
    </div>
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="أنواع الوحدات"
        description="إدارة أنواع وحدات الإيجار"
        iconify="solar:layers-bold-duotone"
        accent="info"
        breadcrumbs={[
          { label: 'التشغيل' },
          { label: 'إدارة الإيجارات', href: '/operations/rentals' },
          { label: 'أنواع الوحدات' },
        ]}
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              createForm.reset({
                item_group_name: '',
                parent_item_group: 'All Item Groups',
                is_group: false,
              });
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            نوع جديد
          </Button>
        }
      />

      <ListQueryAlert error={list.isError ? (list.error as Error) : null} onRetry={() => void list.refetch()} />

      {/* KPI Strip */}
      <KpiStrip cols={3}>
        <KpiCard
          title="إجمالي الأنواع"
          value={stats.total}
          icon={Layers}
          accent="info"
          compact
        />
        <KpiCard
          title="مجموعات"
          value={stats.groups}
          icon={Layers}
          accent="warning"
          compact
          description="أنواع تحتوي على أنواع فرعية"
        />
        <KpiCard
          title="فرعية"
          value={stats.leaf}
          icon={Layers}
          accent="success"
          compact
          description="أنواع نهائية بدون أنواع فرعية"
        />
      </KpiStrip>

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
            <DialogTitle>إضافة نوع وحدة جديد</DialogTitle>
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
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ النوع'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل نوع الوحدة</DialogTitle>
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
                {updateMutation.isPending ? 'جاري التحديث...' : 'تحديث النوع'}
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
                  هل أنت متأكد من حذف نوع الوحدة &quot;{selected?.name}&quot;؟ لا يمكن التراجع عن هذا
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
