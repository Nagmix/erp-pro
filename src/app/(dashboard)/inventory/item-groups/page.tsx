'use client';

import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Trash2, Package, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useToast } from '@/hooks/use-toast';

interface ItemGroupRow {
  name: string;
  is_group: number | boolean;
  parent_item_group?: string;
}

export default function ItemGroupsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [parentGroup, setParentGroup] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ItemGroupRow | null>(null);

  const { data: groups = [], isLoading, isError, error, refetch } = useDocList<ItemGroupRow>('Item Group', {
    fields: ['name', 'is_group', 'parent_item_group'],
    order_by: 'name asc',
    limit: 500,
  });

  const createMutation = useCreateDoc('Item Group');
  const deleteMutation = useDeleteDoc('Item Group');

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast({ title: 'اسم المجموعة مطلوب', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await createMutation.mutateAsync({
        item_group_name: groupName.trim(),
        parent_item_group: parentGroup || 'All Item Groups',
        is_group: isGroup ? 1 : 0,
      });
      setDialogOpen(false);
      setGroupName('');
      setParentGroup('');
      setIsGroup(false);
      toast({ title: 'تم إنشاء مجموعة الأصناف' });
      void refetch();
    } catch (e) {
      toast({ title: 'تعذر إنشاء المجموعة', description: String((e as Error).message || e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    try {
      await deleteMutation.mutateAsync(selectedGroup.name);
      toast({ title: 'تم حذف المجموعة' });
      setDeleteDialogOpen(false);
      setSelectedGroup(null);
      void refetch();
    } catch (e) {
      toast({ title: 'تعذر حذف المجموعة', description: String((e as Error).message || e), variant: 'destructive' });
    }
  };

  const columns: Column<ItemGroupRow>[] = [
    { key: 'name', header: 'اسم المجموعة', sortable: true, filterable: true, render: (v) => <span className="font-medium">{String(v)}</span> },
    { key: 'parent_item_group', header: 'المجموعة الأب', render: (v) => <span className="text-muted-foreground text-xs">{String(v || '—')}</span> },
    { key: 'is_group', header: 'نوع', render: (v) => <span className="text-xs">{v ? 'مجموعة رئيسية' : 'فرعية'}</span> },
    {
      key: 'actions',
      header: 'إجراءات',
      width: 'w-20',
      render: (_v, row) => (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setSelectedGroup(row); setDeleteDialogOpen(true); }}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />
      <PageHeader
        title="مجموعات الأصناف"
        description="إدارة مجموعات الأصناف وتصنيف المنتجات"
        iconify="solar:box-bold-duotone"
        accent="amber"
        breadcrumbs={[{ label: 'المخزون', href: '/inventory' }, { label: 'مجموعات الأصناف' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  مجموعة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent size="md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-600" />
                    إنشاء مجموعة أصناف
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">اسم المجموعة *</Label>
                    <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="مثال: منتجات غذائية، أدوات مكتبية" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">المجموعة الأب</Label>
                    <Input value={parentGroup} onChange={(e) => setParentGroup(e.target.value)} placeholder="All Item Groups" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={isGroup} onChange={(e) => setIsGroup(e.target.checked)} className="rounded" />
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
            <Package className="h-4 w-4 text-orange-600" />
            مجموعات الأصناف
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={groups}
            columns={columns}
            pageSize={15}
            searchable
            loading={isLoading}
            tableId="inventory-item-groups"
            exportFileName="item-groups.csv"
            printTitle="مجموعات الأصناف"
          />
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف المجموعة &quot;{selectedGroup?.name}&quot;؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
