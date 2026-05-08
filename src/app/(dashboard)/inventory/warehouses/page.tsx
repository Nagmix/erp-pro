'use client';

import { useMemo, useState, useEffect } from 'react';
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
import { Plus, Warehouse, Filter, ChevronDown, Upload } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useToast } from '@/hooks/use-toast';
import { buildWarehouseCreate } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { consumeCreateQueryParam } from '@/lib/client/open-create-query';
import { PageShell } from '@/components/erp/page-header';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface WhRow {
  name: string;
  warehouse_name: string;
  company: string;
  parent_warehouse?: string;
  is_group?: 0 | 1 | boolean;
}

export default function WarehousesPage() {
  const { toast } = useToast();
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [whName, setWhName] = useState('');
  const [parent, setParent] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    consumeCreateQueryParam(() => setDialogOpen(true));
  }, []);

  const { data, isLoading, isError, error, refetch } = useDocList<WhRow>('Warehouse', {
    fields: ['name', 'warehouse_name', 'company', 'parent_warehouse', 'is_group'],
    order_by: 'warehouse_name asc',
    limit: 500,
  });
  const createMutation = useCreateDoc('Warehouse');
  const deleteMutation = useDeleteDoc('Warehouse');

  const rows = data || [];

  const columns: Column<WhRow>[] = useMemo(
    () => [
      { key: 'warehouse_name', header: 'المستودع', sortable: true, render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
      { key: 'company', header: 'الشركة' },
      { key: 'parent_warehouse', header: 'أب', render: (v) => <span className="text-muted-foreground text-xs">{String(v || '—')}</span> },
      {
        key: 'is_group',
        header: 'مجموعة',
        render: (v) =>
          Number(v) === 1 || v === true ? (
            <Badge variant="secondary" className="text-[9px]">مجموعة</Badge>
          ) : (
            <Badge variant="outline" className="text-[9px]">تفصيلي</Badge>
          )},
    ],
    []
  );

  const handleCreate = () => {
    if (!company || !whName.trim()) {
      toast({ title: 'الشركة واسم المستودع مطلوبان', variant: 'destructive' });
      return;
    }
    const doc = buildWarehouseCreate({
      warehouse_name: whName.trim(),
      company,
      parent_warehouse: parent || undefined,
      is_group: isGroup});
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast({ title: 'تم إنشاء المستودع' });
        setDialogOpen(false);
        setWhName('');
        setParent('');
        setIsGroup(false);
        void refetch();
      },
      onError: () => toast({ title: 'تعذر الحفظ', variant: 'destructive' })});
  };
  const clearFilters = () => { setSearch(''); };


  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="المستودعات"
        description="إدارة المستودعات بهيكل هرمي وربطها بالشركة، مع إعدادات تخزين وإعادة الطلب"
        iconify="solar:server-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المخزون', href: '/inventory' }, { label: 'المستودعات' }]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            مستودع جديد
          </Button>
        }
      />

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث بالمستودع..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
      </div>
      <PageShell className="text-xs text-muted-foreground">
        مستويات إعادة الطلب والكميات الفعلية تظهر في <strong>مستويات المخزون</strong> و<strong>الجرد</strong>.
      </PageShell>
      <PageShell padded={false}>
        <DataTable data={rows} columns={columns} searchable loading={isLoading} onDelete={(r) => setDeleteName(r.name)} />
      </PageShell>
      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستودع؟</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteName) return;
                deleteMutation.mutate(deleteName, {
                  onSuccess: () => { toast({ title: 'تم الحذف' }); setDeleteName(null); void refetch(); },
                  onError: () => toast({ title: 'تعذر الحذف', variant: 'destructive' })});
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
            <DialogTitle>مستودع جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">اسم المستودع *</Label>
              <Input value={whName} onChange={(e) => setWhName(e.target.value)} placeholder="مثال: مستودع رئيسي - الرياض" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">مستودع أب (اختياري)</Label>
              <ErpLinkCombobox doctype="Warehouse" value={parent} onChange={setParent} />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={isGroup} onChange={(e) => setIsGroup(e.target.checked)} />
              مجموعة (ليس مخزناً تفصيلياً)
            </label>
            <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? '...' : 'حفظ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
