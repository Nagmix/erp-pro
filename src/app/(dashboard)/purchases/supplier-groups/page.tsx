'use client';

import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Trash2, Truck, RefreshCw, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { toast } from 'sonner';

interface SupplierGroupRow {
  name: string;
  is_group: number | boolean;
  parent_supplier_group?: string;
}

export default function SupplierGroupsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [parentGroup, setParentGroup] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SupplierGroupRow | null>(null);

  // Edit form state
  const [editGroupName, setEditGroupName] = useState('');
  const [editParentGroup, setEditParentGroup] = useState('');
  const [editIsGroup, setEditIsGroup] = useState(false);

  const { data: groups = [], isLoading, isError, error, refetch } = useDocList<SupplierGroupRow>('Supplier Group', {
    fields: ['name', 'is_group', 'parent_supplier_group'],
    order_by: 'name asc',
    limit: 500,
  });

  const createMutation = useCreateDoc('Supplier Group');
  const updateMutation = useUpdateDoc('Supplier Group');
  const deleteMutation = useDeleteDoc('Supplier Group');

  const resetCreateForm = () => {
    setGroupName('');
    setParentGroup('');
    setIsGroup(false);
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error('اسم المجموعة مطلوب');
      return;
    }
    setBusy(true);
    try {
      await createMutation.mutateAsync({
        supplier_group_name: groupName.trim(),
        parent_supplier_group: parentGroup || 'All Supplier Groups',
        is_group: isGroup ? 1 : 0,
      });
      setDialogOpen(false);
      resetCreateForm();
      toast.success('تم إنشاء مجموعة الموردين');
      void refetch();
    } catch (e) {
      toast.error('تعذر إنشاء المجموعة', { description: String((e as Error).message || e) });
    } finally {
      setBusy(false);
    }
  };

  const openEditDialog = (row: SupplierGroupRow) => {
    setSelectedGroup(row);
    setEditGroupName(row.name);
    setEditParentGroup(row.parent_supplier_group || '');
    setEditIsGroup(Boolean(row.is_group) || Number(row.is_group) === 1);
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedGroup) return;
    if (!editGroupName.trim()) {
      toast.error('اسم المجموعة مطلوب');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        name: selectedGroup.name,
        doc: {
          supplier_group_name: editGroupName.trim(),
          parent_supplier_group: editParentGroup || 'All Supplier Groups',
          is_group: editIsGroup ? 1 : 0,
        },
      });
      toast.success('تم تحديث مجموعة الموردين');
      setEditDialogOpen(false);
      setSelectedGroup(null);
      void refetch();
    } catch (e) {
      toast.error('تعذر تحديث المجموعة', { description: String((e as Error).message || e) });
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    try {
      await deleteMutation.mutateAsync(selectedGroup.name);
      toast.success('تم حذف المجموعة');
      setDeleteDialogOpen(false);
      setSelectedGroup(null);
      void refetch();
    } catch (e) {
      toast.error('تعذر حذف المجموعة', { description: String((e as Error).message || e) });
    }
  };

  const columns: Column<SupplierGroupRow>[] = [
    { key: 'name', header: 'اسم المجموعة', sortable: true, filterable: true, render: (v) => <span className="font-medium">{String(v)}</span> },
    { key: 'parent_supplier_group', header: 'المجموعة الأب', render: (v) => <span className="text-muted-foreground text-xs">{String(v || '—')}</span> },
    { key: 'is_group', header: 'نوع', render: (v) => <span className="text-xs">{v ? 'مجموعة رئيسية' : 'فرعية'}</span> },
    {
      key: 'actions',
      header: 'إجراءات',
      width: 'w-24',
      render: (_v, row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(row)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setSelectedGroup(row); setDeleteDialogOpen(true); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />
      <PageHeader
        title="مجموعات الموردين"
        description="إدارة مجموعات الموردين وتصنيفهم"
        iconify="solar:delivery-bold-duotone"
        accent="amber"
        breadcrumbs={[{ label: 'المشتريات', href: '/purchases' }, { label: 'مجموعات الموردين' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetCreateForm();
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  مجموعة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent size="md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-amber-600" />
                    إنشاء مجموعة موردين
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">اسم المجموعة *</Label>
                    <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="مثال: موردين محليين، موردين خارجيين" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">المجموعة الأب</Label>
                    <ErpLinkCombobox doctype="Supplier Group" value={parentGroup} onChange={setParentGroup} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={isGroup} onCheckedChange={(v) => setIsGroup(v === true)} />
                    <Label className="text-sm">مجموعة رئيسية</Label>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button onClick={() => void handleCreate()} disabled={busy}>
                      {busy ? 'جاري الإنشاء...' : 'إنشاء'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="h-4 w-4 text-amber-600" />
            مجموعات الموردين
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={groups}
            columns={columns}
            pageSize={15}
            searchable
            loading={isLoading}
            tableId="purchases-supplier-groups"
            exportFileName="supplier-groups.csv"
            printTitle="مجموعات الموردين"
            onEdit={(row) => openEditDialog(row)}
          />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-amber-600" />
              تعديل مجموعة الموردين
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">اسم المجموعة *</Label>
              <Input value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} placeholder="مثال: موردين محليين، موردين خارجيين" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">المجموعة الأب</Label>
              <ErpLinkCombobox doctype="Supplier Group" value={editParentGroup} onChange={setEditParentGroup} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={editIsGroup} onCheckedChange={(v) => setEditIsGroup(v === true)} />
              <Label className="text-sm">مجموعة رئيسية</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>إلغاء</Button>
              <Button onClick={() => void handleUpdate()} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف المجموعة &quot;{selectedGroup?.name}&quot;؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} variant="destructive">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
