'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, FolderTree, FileText, Trash2, Edit, ChevronDown, Search, X } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { useDocList, useCreateDoc, useDeleteDoc, useUpdateDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { buildCostCenterCreate } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { useRouter } from 'next/navigation';
import { consumeCreateQueryParam } from '@/lib/client/open-create-query';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CostCenterRow {
  name: string;
  cost_center_name?: string;
  parent_cost_center: string;
  is_group: boolean | number;
  company: string;
  cost_center_number?: string;
}

// ============================================================
// Zod Schema — ALL required fields
// ============================================================

const costCenterSchema = z.object({
  cost_center_name: z.string().min(1, 'اسم مركز التكلفة مطلوب'),
  parent_cost_center: z.string(),
  is_group: z.boolean(),
  company: z.string().min(1, 'اسم الشركة مطلوب'),
  cost_center_number: z.string()});

type CostCenterFormData = z.infer<typeof costCenterSchema>;

// ============================================================
// Tree Item Component
// ============================================================

function CostCenterTreeItem({
  item,
  allItems,
  level,
  onEdit,
  onDelete}: {
  item: CostCenterRow;
  allItems: CostCenterRow[];
  level: number;
  onEdit: (item: CostCenterRow) => void;
  onDelete: (item: CostCenterRow) => void;
}) {
  const [isOpen, setIsOpen] = useState(level < 2);
  const children = allItems.filter(c => c.parent_cost_center === item.name);
  const hasChildren = children.length > 0;
  const isGroup = !!item.is_group;
  return (
    <div>
      <div
        className="flex items-center gap-2 h-9 px-4 group transition-colors hover:bg-accent/50 border-b border-border/20 last:border-b-0 text-xs"
        style={{ paddingRight: `${level * 1.25 + 1}rem` }}
      >
        {hasChildren ? (
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <CollapsibleTrigger asChild>
                <button className="h-5 w-5 rounded flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${isOpen ? '' : '-rotate-90'}`} />
                </button>
              </CollapsibleTrigger>
              <FolderTree className="h-4 w-4 shrink-0 text-primary" />
              <span className="font-medium truncate">{item.name}</span>
              {children.length > 0 && (
                <span className="text-[10px] text-muted-foreground/70 tabular-nums shrink-0">({children.length})</span>
              )}
            </div>
          </Collapsible>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="w-5 shrink-0" />
            <FileText className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <span className="truncate">{item.name}</span>
          </div>
        )}
        <div className="flex items-center gap-3 shrink-0">
          {item.cost_center_number && (
            <span className="text-muted-foreground font-mono text-[11px] tabular-nums w-24 text-center" dir="ltr">
              {item.cost_center_number}
            </span>
          )}
          <Badge variant="outline" className={`text-[9px] border-0 ${isGroup ? 'bg-chart-1/10 text-blue-700 dark:bg-chart-1/10 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
            {isGroup ? 'مجموعة' : 'فرعي'}
          </Badge>
          <div className="flex gap-0.5 w-16 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(item)} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <Edit className="h-3 w-3" />
            </button>
            <button onClick={() => onDelete(item)} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {hasChildren && isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {children.map(child => (
              <CostCenterTreeItem
                key={child.name}
                item={child}
                allItems={allItems}
                level={level + 1}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function CostCentersPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<CostCenterRow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { company: defaultCompany } = useDefaultCompanyName();
  const { data, isLoading, isError, error, refetch } = useDocList<CostCenterRow>('Cost Center', {
    fields: ['name', 'cost_center_name', 'parent_cost_center', 'is_group', 'company', 'cost_center_number'],
    limit: 2000,
  });
  const createMutation = useCreateDoc('Cost Center');
  const updateMutation = useUpdateDoc('Cost Center');
  const deleteMutation = useDeleteDoc('Cost Center');

  const costCenters = data || [];

  const createForm = useForm<CostCenterFormData>({
    resolver: zodResolver(costCenterSchema),
    defaultValues: { cost_center_name: '', parent_cost_center: '', is_group: false, company: '', cost_center_number: '' }});

  const editForm = useForm<CostCenterFormData>({
    resolver: zodResolver(costCenterSchema),
    defaultValues: { cost_center_name: '', parent_cost_center: '', is_group: false, company: '', cost_center_number: '' }});

  useEffect(() => {
    if (defaultCompany) {
      createForm.setValue('company', defaultCompany);
      editForm.setValue('company', defaultCompany);
    }
  }, [defaultCompany, createForm, editForm]);

  useEffect(() => {
    consumeCreateQueryParam(() => setCreateDialogOpen(true));
  }, []);

  // Filtered cost centers
  const filteredCenters = useMemo(() => {
    if (!searchQuery) return costCenters;
    const q = searchQuery.toLowerCase();
    return costCenters.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.cost_center_name || '').toLowerCase().includes(q) ||
      (c.cost_center_number || '').includes(q)
    );
  }, [costCenters, searchQuery]);

  // Root cost centers (no parent)
  const rootCostCenters = useMemo(() => {
    return filteredCenters.filter(c => !c.parent_cost_center);
  }, [filteredCenters]);

  const handleCreate = (formData: CostCenterFormData) => {
    const doc = buildCostCenterCreate({
      cost_center_name: formData.cost_center_name,
      parent_cost_center: formData.parent_cost_center,
      is_group: formData.is_group,
      company: formData.company});
    // Add cost_center_number
    if (formData.cost_center_number) {
      (doc as Record<string, unknown>).cost_center_number = formData.cost_center_number;
    }
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء مركز التكلفة بنجاح');
        setCreateDialogOpen(false);
        createForm.reset();
        if (defaultCompany) createForm.setValue('company', defaultCompany);
      },
      onError: () => toast.error('حدث خطأ أثناء إنشاء مركز التكلفة')});
  };

  const handleEdit = (formData: CostCenterFormData) => {
    if (!selected) return;
    const doc: Record<string, unknown> = {
      cost_center_name: formData.cost_center_name,
      parent_cost_center: formData.parent_cost_center || undefined,
      is_group: formData.is_group ? 1 : 0,
      company: formData.company};
    if (formData.cost_center_number) doc.cost_center_number = formData.cost_center_number;

    updateMutation.mutate({ name: selected.name, doc }, {
      onSuccess: () => {
        toast.success('تم تعديل مركز التكلفة بنجاح');
        setEditDialogOpen(false);
        setSelected(null);
        editForm.reset();
      },
      onError: () => toast.error('حدث خطأ أثناء تعديل مركز التكلفة')});
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteMutation.mutate(selected.name, {
      onSuccess: () => { toast.success('تم حذف مركز التكلفة بنجاح'); setDeleteDialogOpen(false); setSelected(null); },
      onError: () => toast.error('حدث خطأ أثناء حذف مركز التكلفة')});
  };

  const openEdit = (row: CostCenterRow) => {
    setSelected(row);
    editForm.reset({
      cost_center_name: row.cost_center_name || row.name,
      parent_cost_center: row.parent_cost_center,
      is_group: !!row.is_group,
      company: row.company,
      cost_center_number: row.cost_center_number || ''});
    setEditDialogOpen(true);
  };

  const openDelete = (row: CostCenterRow) => {
    setSelected(row);
    setDeleteDialogOpen(true);
  };

  const renderCostCenterFormFields = (form: UseFormReturn<CostCenterFormData>) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">اسم مركز التكلفة *</Label>
        <Input placeholder="اسم مركز التكلفة" {...form.register('cost_center_name')} />
        {form.formState.errors.cost_center_name && <p className="text-[10px] text-destructive">{form.formState.errors.cost_center_name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">رقم مركز التكلفة</Label>
        <Input placeholder="رقم مركز التكلفة (اختياري)" dir="ltr" className="font-mono tabular-nums text-start" {...form.register('cost_center_number')} />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">مركز الأب</Label>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="ghost" size="sm" className="h-8 self-start text-xs text-muted-foreground" onClick={() => form.setValue('parent_cost_center', '')}>
            بدون أب (جذري)
          </Button>
          <ErpLinkCombobox
            doctype="Cost Center"
            value={form.watch('parent_cost_center')}
            onChange={(v) => form.setValue('parent_cost_center', v)}
            placeholder="اختياري — يُفضّل اختيار مركز مجموعة"
            showCreateShortcut={false}
            className="h-9 text-sm"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">الشركة (افتراضية)</Label>
        <p className="text-sm font-semibold">{form.watch('company') || defaultCompany || '—'}</p>
        {!defaultCompany && <p className="text-[10px] text-destructive">اضبط الشركة الافتراضية من الإعدادات</p>}
        <input type="hidden" {...form.register('company')} />
      </div>
      <label className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors">
        <Checkbox
          id={`cc_is_group_${form === createForm ? 'create' : 'edit'}`}
          checked={form.watch('is_group')}
          onCheckedChange={checked => form.setValue('is_group', !!checked)}
        />
        <Label htmlFor={`cc_is_group_${form === createForm ? 'create' : 'edit'}`} className="text-xs cursor-pointer">
          هل مجموعة (is_group) — يمكن أن يحتوي على مراكز فرعية
        </Label>
      </label>
    </div>
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="مراكز التكلفة"
        description="إدارة مراكز التكلفة والهيكل التنظيمي المالي"
        iconify="solar:pie-chart-3-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'مراكز التكلفة' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => router.push('/reports')}>
              تقارير
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                createForm.reset();
                if (defaultCompany) createForm.setValue('company', defaultCompany);
                setCreateDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              مركز تكلفة جديد
            </Button>
          </div>
        }
      />

      {/* Search Toolbar */}
      <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-[var(--shadow-xs-ui)] p-3" dir="rtl">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md group">
            <div className="absolute start-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center pointer-events-none transition-colors group-focus-within:bg-primary/20">
              <Search className="h-4 w-4 text-primary/70 group-focus-within:text-primary" />
            </div>
            <Input
              placeholder="بحث في مراكز التكلفة ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pe-9 ps-9 h-11 text-sm rounded-xl border-border/40 bg-background/60 focus:bg-background transition-all placeholder:text-muted-foreground/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute end-2.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-muted/80 hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-all">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Badge variant="outline" className="text-[11px] h-8 px-3 rounded-lg border-border/40 bg-muted/30 text-muted-foreground font-medium">
            <FolderTree className="h-3 w-3 ms-1.5 text-primary/60" />
            {filteredCenters.length} من {costCenters.length}
          </Badge>
        </div>
      </div>

      {/* Tree View */}
      <Card className="overflow-hidden border-border/40">
        {/* Table Header */}
        <div className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm px-4 py-2 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40 select-none">
          <span className="flex-1">مركز التكلفة</span>
          <span className="w-24 text-center">الرقم</span>
          <span className="w-20 text-center">النوع</span>
          <span className="w-16" />
        </div>

        {isLoading ? (
          <div className="divide-y divide-border/20">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 h-9 px-4 animate-pulse" style={{ paddingRight: `${(i % 3) * 1.25 + 1}rem` }}>
                <div className="h-3.5 w-3.5 rounded bg-muted" />
                <div className="h-3.5 rounded bg-muted flex-1 max-w-[180px]" />
                <div className="h-3 rounded bg-muted w-14" />
                <div className="h-3 rounded bg-muted w-16" />
              </div>
            ))}
          </div>
        ) : filteredCenters.length === 0 ? (
          <div className="py-14 flex flex-col items-center justify-center text-center">
            <FolderTree className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground/70">لا توجد مراكز تكلفة</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
              {searchQuery ? `لم يتم العثور على نتائج لـ "${searchQuery}"` : 'ابدأ بإضافة مركز تكلفة جديد'}
            </p>
            {!searchQuery && (
              <Button size="sm" className="mt-3 gap-1.5" onClick={() => {
                createForm.reset();
                if (defaultCompany) createForm.setValue('company', defaultCompany);
                setCreateDialogOpen(true);
              }}>
                <Plus className="h-3.5 w-3.5" />
                إضافة مركز تكلفة جديد
              </Button>
            )}
          </div>
        ) : (
          <div>
            {rootCostCenters.map(item => (
              <CostCenterTreeItem
                key={item.name}
                item={item}
                allItems={filteredCenters}
                level={0}
                onEdit={openEdit}
                onDelete={openDelete}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>إضافة مركز تكلفة جديد</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)}>
            {renderCostCenterFormFields(createForm)}
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setCreateDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
              <Button type="submit" disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">{createMutation.isPending ? 'جاري الحفظ...' : 'حفظ مركز التكلفة'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader><DialogTitle>تعديل مركز التكلفة</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)}>
            {renderCostCenterFormFields(editForm)}
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
              <Button type="submit" disabled={updateMutation.isPending} className="gap-1.5 min-w-[130px]">{updateMutation.isPending ? 'جاري التحديث...' : 'تحديث مركز التكلفة'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد الحذف</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">هل أنت متأكد من حذف مركز التكلفة &quot;{selected?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive" className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
