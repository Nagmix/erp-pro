'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useToast } from '@/hooks/use-toast';
import { buildWorkstation } from '@/lib/erp/erpnext-payloads';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface WSRow {
  name: string;
  workstation_name?: string;
  warehouse?: string;
  hour_rate?: number;
  production_capacity?: number;
}

export default function WorkstationsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [wsName, setWsName] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [hourRate, setHourRate] = useState('');
  const [capacity, setCapacity] = useState('');

  const { data, isLoading, isError, error, refetch } = useDocList<WSRow>('Workstation', {
    fields: ['name', 'workstation_name', 'warehouse', 'hour_rate', 'production_capacity'],
    order_by: 'name asc',
    limit: 300,
  });
  const createMutation = useCreateDoc('Workstation');
  const deleteMutation = useDeleteDoc('Workstation');

  const rows = data || [];

  const columns: Column<WSRow>[] = useMemo(
    () => [
      { key: 'name', header: 'المعرّف', sortable: true, render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
      { key: 'warehouse', header: 'المستودع', render: (v) => <span className="text-xs text-muted-foreground">{String(v || '—')}</span> },
      { key: 'hour_rate', header: 'سعر الساعة', render: (v) => <span className="tabular-nums">{Number(v ?? 0)}</span> },
      { key: 'production_capacity', header: 'السعة', render: (v) => <span className="tabular-nums">{Number(v ?? 0)}</span> },
    ],
    []
  );

  const handleCreate = () => {
    if (!wsName.trim()) {
      toast({ title: 'اسم المحطة مطلوب', variant: 'destructive' });
      return;
    }
    const doc = buildWorkstation({
      workstation_name: wsName.trim(),
      warehouse: warehouse || undefined,
      hour_rate: Number(hourRate) || 0,
      production_capacity: Number(capacity) || 0,
    });
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast({ title: 'تم إنشاء محطة العمل' });
        setDialogOpen(false);
        setWsName('');
        setWarehouse('');
        setHourRate('');
        setCapacity('');
        void refetch();
      },
      onError: () => toast({ title: 'تعذر الحفظ', variant: 'destructive' }),
    });
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />
      <PageHeader
        title="محطات العمل"
        description="إدارة محطات العمل وسعتها الإنتاجية وأسعار الساعات"
        iconify="solar:server-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'التصنيع', href: '/manufacturing' }, { label: 'محطات العمل' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            محطة جديدة
          </Button>
        }
      />
      <DataTable data={rows} columns={columns} searchable loading={isLoading} onDelete={(r) => setDeleteName(r.name)} />
      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المحطة؟</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteName) return;
                deleteMutation.mutate(deleteName, {
                  onSuccess: () => { toast({ title: 'تم الحذف' }); setDeleteName(null); void refetch(); },
                  onError: () => toast({ title: 'تعذر الحذف', variant: 'destructive' }),
                });
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>محطة عمل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">اسم المحطة *</Label>
              <Input value={wsName} onChange={(e) => setWsName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">مستودع افتراضي</Label>
              <ErpLinkCombobox doctype="Warehouse" value={warehouse} onChange={setWarehouse} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">سعر الساعة</Label>
                <Input type="number" dir="ltr" value={hourRate} onChange={(e) => setHourRate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">السعة الإنتاجية</Label>
                <Input type="number" dir="ltr" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? '...' : 'حفظ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
