'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Filter, ChevronDown, X, Layers, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { consumeCreateQueryParam } from '@/lib/client/open-create-query';
import { PageHeader } from '@/components/erp/page-header';
import { formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useDeleteDoc, useSubmitDoc, useUpdateDoc } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type BatchRow = {
  name: string;
  item?: string;
  batch_id?: string;
  description?: string;
  expiry_date?: string;
  manufacturing_date?: string;
  docstatus?: number;
};

export default function BatchesPage() {
  const { company } = useDefaultCompanyName();
  const [deleteDialog, setDeleteDialog] = useState<BatchRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BatchRow | null>(null);
  const [viewTarget, setViewTarget] = useState<BatchRow | null>(null);
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Create dialog fields
  const [item, setItem] = useState('');
  const [batchId, setBatchId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState('');

  // Edit dialog fields
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editManufacturingDate, setEditManufacturingDate] = useState('');

  // Auto-open create dialog when ?create=1
  useEffect(() => {
    consumeCreateQueryParam(() => setDialogOpen(true));
  }, []);

  const { data, isLoading, isError, error, refetch } = useDocList<BatchRow>('Batch', {
    fields: ['name', 'item', 'batch_id', 'expiry_date', 'manufacturing_date', 'docstatus'],
    limit: 500,
    order_by: 'modified desc',
    filters: company ? [['company', '=', company]] : undefined,
  });

  const createMutation = useCreateDoc('Batch');
  const deleteMutation = useDeleteDoc('Batch');
  const submitMut = useSubmitDoc('Batch');
  const updateMutation = useUpdateDoc('Batch');

  const batches = data || [];

  const clearFilters = () => {
    setExpiryFilter('all');
    setSearch('');
    setFiltersOpen(false);
  };

  // Filter batches by expiry status
  const filtered = useMemo(() => {
    let result = batches;
    if (expiryFilter === 'valid') {
      result = result.filter((b) => !b.expiry_date || new Date(b.expiry_date) >= new Date());
    } else if (expiryFilter === 'expired') {
      result = result.filter((b) => b.expiry_date && new Date(b.expiry_date) < new Date());
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r =>
        (r.name || '').toLowerCase().includes(s) ||
        (r.item || '').toLowerCase().includes(s) ||
        (r.description || '').toLowerCase().includes(s)
      );
    }
    return result;
  }, [batches, expiryFilter, search]);

  // KPI calculations
  const totalCount = batches.length;
  const expiredCount = batches.filter((b) => b.expiry_date && new Date(b.expiry_date) < new Date()).length;
  const validCount = totalCount - expiredCount;

  const columns: Column<BatchRow>[] = useMemo(
    () => [
      { key: 'name', header: 'الرقم', sortable: true, render: (value) => <span className="font-medium text-primary">{String(value)}</span> },
      { key: 'item', header: 'الصنف', sortable: true, render: (value) => <span className="text-xs">{String(value || '—')}</span> },
      { key: 'batch_id', header: 'معرف الدفعة', render: (value) => <span className="text-xs">{String(value || '—')}</span> },
      {
        key: 'expiry_date',
        header: 'تاريخ الانتهاء',
        sortable: true,
        render: (value) => {
          if (!value) return <span className="text-xs">—</span>;
          const isExpired = new Date(String(value)) < new Date();
          return <span className={cn('text-xs', isExpired && 'text-destructive font-medium')}>{formatDate(String(value))}</span>;
        },
      },
      {
        key: 'manufacturing_date',
        header: 'تاريخ التصنيع',
        render: (value) => <span className="text-xs">{value ? formatDate(String(value)) : '—'}</span>,
      },
      { key: 'docstatus', header: 'الحالة', render: (value) => <DocStatusBadge docstatus={Number(value ?? 0) as 0 | 1 | 2} /> },
      {
        key: '_submit',
        header: 'ترحيل',
        width: 'w-28',
        render: (_v, row) => {
          const ds = Number(row.docstatus ?? 0);
          if (ds === 0) {
            return (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-xs gap-1"
                disabled={submitMut.isPending}
                onClick={() =>
                  submitMut.mutate(row.name, {
                    onSuccess: () => { toast.success('تم الترحيل'); void refetch(); },
                    onError: () => toast.error('فشل الترحيل'),
                  })
                }
              >
                <Send className="h-3 w-3" />
                ترحيل
              </Button>
            );
          }
          return '—';
        },
      },
    ],
    [submitMut, refetch, toast]
  );

  const resetCreateForm = () => {
    setItem('');
    setBatchId('');
    setExpiryDate('');
    setManufacturingDate('');
  };

  const handleCreate = () => {
    if (!item.trim() || !batchId.trim()) {
      toast.error('الصنف ومعرف الدفعة مطلوبان');
      return;
    }
    createMutation.mutate(
      {
        item: item.trim(),
        batch_id: batchId.trim(),
        expiry_date: expiryDate || undefined,
        manufacturing_date: manufacturingDate || undefined,
      },
      {
        onSuccess: (created) => {
          const docName = (created as { name?: string })?.name;
          if (docName) {
            submitMut.mutate(docName, {
              onSuccess: () => {
                toast.success('تم إنشاء الدفعة وترحيلها');
                setDialogOpen(false);
                resetCreateForm();
              },
              onError: () => {
                toast.success('تم إنشاء الدفعة (مسودة)');
                setDialogOpen(false);
                resetCreateForm();
              },
            });
          } else {
            toast.success('تم إنشاء الدفعة');
            setDialogOpen(false);
            resetCreateForm();
          }
        },
        onError: () => toast.error('تعذر إنشاء الدفعة'),
      }
    );
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="الدفعات"
        description="إدارة وتتبع دفعات الأصناف مع تواريخ الانتهاء والتصنيع"
        iconify="solar:layers-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المخزون', href: '/inventory' }, { label: 'الدفعات' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            دفعة جديدة
          </Button>
        }
      />

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث بالدفعة أو الصنف..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
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
            {(expiryFilter !== 'all' || search) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
                <Label className="text-xs">حالة الصلاحية</Label>
                <Select value={expiryFilter} onValueChange={setExpiryFilter}>
                  <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="valid">صالحة</SelectItem>
                    <SelectItem value="expired">منتهية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <DataTable
        data={filtered}
        columns={columns}
        searchable
        loading={isLoading}
        onDelete={(row) => Number(row.docstatus) === 0 && setDeleteDialog(row)}
        onEdit={(row) => {
          const ds = Number(row.docstatus);
          if (ds === 0) {
            // فتح حوار التعديل للمسودات
            setEditTarget(row);
            setEditExpiryDate(row.expiry_date || '');
            setEditManufacturingDate(row.manufacturing_date || '');
            setEditDialogOpen(true);
          } else {
            // عرض للقراءة فقط للمستندات المرحّلة
            setViewTarget(row);
            setViewDialogOpen(true);
          }
        }}
      />
      <p className="text-xs text-muted-foreground">للمسودات: «تعديل» لفتح نافذة التعديل، أو زر «ترحيل» لتأكيد الدفعة.</p>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الدفعة؟</AlertDialogTitle>
            <AlertDialogDescription>{deleteDialog?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDialog && deleteMutation.mutate(deleteDialog.name, {
              onSuccess: () => { toast.success('تم الحذف'); setDeleteDialog(null); },
              onError: () => toast.error('تعذر الحذف'),
            })}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>دفعة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">الصنف *</Label>
              <ErpLinkCombobox doctype="Item" value={item} onChange={setItem} placeholder="اختر الصنف..." />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">معرف الدفعة *</Label>
              <Input value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="أدخل معرف الدفعة" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">تاريخ الانتهاء</Label>
                <Input type="date" dir="ltr" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">تاريخ التصنيع</Label>
                <Input type="date" dir="ltr" value={manufacturingDate} onChange={(e) => setManufacturingDate(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending || submitMut.isPending}>
              {(createMutation.isPending || submitMut.isPending) ? '...' : 'حفظ وترحيل'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار تعديل الدفعة (للمسودات فقط) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل الدفعة</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">رقم الدفعة</Label>
                <Input value={editTarget.name} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">الصنف</Label>
                <Input value={editTarget.item || ''} disabled className="bg-muted" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">تاريخ الانتهاء</Label>
                  <Input type="date" dir="ltr" value={editExpiryDate} onChange={(e) => setEditExpiryDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">تاريخ التصنيع</Label>
                  <Input type="date" dir="ltr" value={editManufacturingDate} onChange={(e) => setEditManufacturingDate(e.target.value)} />
                </div>
              </div>
              <Button className="w-full" onClick={() => {
                updateMutation.mutate(
                  {
                    name: editTarget.name,
                    doc: {
                      expiry_date: editExpiryDate || undefined,
                      manufacturing_date: editManufacturingDate || undefined,
                    },
                  },
                  {
                    onSuccess: () => {
                      toast.success('تم تعديل الدفعة');
                      setEditDialogOpen(false);
                      setEditTarget(null);
                      void refetch();
                    },
                    onError: () => toast.error('تعذر تعديل الدفعة'),
                  },
                );
              }} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? '...' : 'حفظ التعديل'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* حوار عرض الدفعة (للقراءة فقط - المستندات المرحّلة) */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>عرض الدفعة</DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">رقم الدفعة</span>
                  <span className="font-medium text-primary">{viewTarget.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">الصنف</span>
                  <span>{viewTarget.item || '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">معرف الدفعة</span>
                  <span>{viewTarget.batch_id || '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">تاريخ الانتهاء</span>
                  <span>{viewTarget.expiry_date ? formatDate(viewTarget.expiry_date) : '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">تاريخ التصنيع</span>
                  <span>{viewTarget.manufacturing_date ? formatDate(viewTarget.manufacturing_date) : '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">حالة المستند</span>
                  <DocStatusBadge docstatus={Number(viewTarget.docstatus ?? 0) as 0 | 1 | 2} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">هذا مستند مرحّل ولا يمكن تعديله</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
