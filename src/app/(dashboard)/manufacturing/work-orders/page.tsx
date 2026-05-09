'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge, DocStatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Send, Undo2, Cog, PackageCheck } from 'lucide-react';
import { PageHeader, KpiStrip, KpiCard } from '@/components/erp/page-header';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { buildWorkOrder } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
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

interface WORow {
  name: string;
  production_item: string;
  item_name?: string;
  bom_no: string;
  qty: number;
  status: string;
  docstatus: number;
}

export default function WorkOrdersPage() {
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [productionItem, setProductionItem] = useState('');
  const [bomNo, setBomNo] = useState('');
  const [qty, setQty] = useState('1');
  const [fgWh, setFgWh] = useState('');
  const [wipWh, setWipWh] = useState('');

  const { data, isLoading, isError, error, refetch } = useDocList<WORow>('Work Order', {
    fields: ['name', 'production_item', 'item_name', 'bom_no', 'qty', 'status', 'docstatus'],
    order_by: 'creation desc',
    limit: 500,
  });
  const createMutation = useCreateDoc<WORow>('Work Order');
  const submitMutation = useSubmitDoc<WORow>('Work Order');
  const cancelMutation = useCancelDoc<WORow>('Work Order');
  const deleteMutation = useDeleteDoc('Work Order');

  const rows = data || [];

  const columns: Column<WORow>[] = useMemo(
    () => [
      { key: 'name', header: 'الرقم', sortable: true, render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
      { key: 'item_name', header: 'المنتج', render: (_v, row) => <span>{String(row.item_name || row.production_item)}</span> },
      { key: 'bom_no', header: 'قائمة المواد', render: (v) => <span className="text-xs">{String(v)}</span> },
      { key: 'qty', header: 'الكمية', render: (v) => <span className="tabular-nums">{Number(v)}</span> },
      { key: 'status', header: 'الحالة', render: (v) => <StatusBadge status={String(v)} /> },
      { key: 'docstatus', header: 'مستند', render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} /> },
      {
        key: '_a',
        header: 'ترحيل',
        width: 'w-28',
        render: (_v, row) => {
          const ds = Number(row.docstatus);
          if (ds === 0) {
            return (
              <Button dir="rtl"
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-[10px] gap-1"
                onClick={() =>
                  submitMutation.mutate(row.name, {
                    onSuccess: () => { toast.success('تم الترحيل'); void refetch(); },
                    onError: () => toast.error('تعذر الترحيل'),
                  })
                }
              >
                <Send className="h-3 w-3" />
                ترحيل
              </Button>
            );
          }
          if (ds === 1) {
            return (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-[10px] gap-1"
                onClick={() =>
                  cancelMutation.mutate(row.name, {
                    onSuccess: () => { toast.success('أُلغي'); void refetch(); },
                    onError: () => toast.error('تعذر'),
                  })
                }
              >
                <Undo2 className="h-3 w-3" />
                إلغاء
              </Button>
            );
          }
          return '—';
        },
      },
    ],
    [submitMutation, cancelMutation, toast, refetch]
  );

  const handleCreate = () => {
    if (!company || !productionItem || !bomNo || !fgWh) {
      toast.error('أكمل: شركة، صنف، قائمة مواد، مستودع تام');
      return;
    }
    const doc = buildWorkOrder({
      company,
      production_item: productionItem,
      bom_no: bomNo,
      qty: Math.max(0.001, Number(qty) || 1),
      fg_warehouse: fgWh,
      wip_warehouse: wipWh || undefined,
    });
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء أمر العمل');
        setDialogOpen(false);
        setProductionItem('');
        setBomNo('');
        setQty('1');
        setFgWh('');
        setWipWh('');
        void refetch();
      },
      onError: () => toast.error('تعذر الحفظ'),
    });
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="أوامر العمل"
        description="إدارة دورة الإنتاج: من قائمة المواد إلى مستودعات تام / تشغيل وتتبع حالة كل أمر"
        iconify="solar:tuning-2-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'التصنيع', href: '/manufacturing' }, { label: 'أوامر العمل' }]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            أمر جديد
          </Button>
        }
      />
      <KpiStrip cols={4}>
        <KpiCard title="أوامر العمل" value={rows.length} icon={Cog} accent="warning" description="إجمالي الأوامر" />
        <KpiCard title="مسودات" value={rows.filter((r) => Number(r.docstatus) === 0).length} icon={Plus} accent="info" description="بانتظار الترحيل" />
        <KpiCard title="مُرحّلة" value={rows.filter((r) => Number(r.docstatus) === 1).length} icon={Send} accent="success" description="قيد التنفيذ" />
        <KpiCard title="ملغاة" value={rows.filter((r) => Number(r.docstatus) === 2).length} icon={Undo2} accent="destructive" description="ملغاة" />
      </KpiStrip>
      <DataTable data={rows} columns={columns} searchable loading={isLoading} onDelete={(r) => setDeleteName(r.name)} />
      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف أمر العمل؟</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteName) return;
                deleteMutation.mutate(deleteName, {
                  onSuccess: () => { toast.success('تم الحذف'); setDeleteName(null); void refetch(); },
                  onError: () => toast.error('تعذر الحذف'),
                });
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>أمر عمل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">الصنف المُنتَج *</Label>
              <ErpLinkCombobox doctype="Item" value={productionItem} onChange={setProductionItem} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">قائمة مواد مرحّلة *</Label>
              <ErpLinkCombobox doctype="BOM" value={bomNo} onChange={setBomNo} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">الكمية</Label>
              <Input type="number" dir="ltr" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">مستودع تام *</Label>
              <ErpLinkCombobox doctype="Warehouse" value={fgWh} onChange={setFgWh} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">مستودع تشغيل (تحت التنفيذ)</Label>
              <ErpLinkCombobox doctype="Warehouse" value={wipWh} onChange={setWipWh} />
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
