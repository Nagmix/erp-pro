'use client';

import { useMemo, useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Send, Undo2, BarChart3 } from 'lucide-react';
import { PageHeader, KpiStrip, KpiCard } from '@/components/erp/page-header';
import { formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useToast } from '@/hooks/use-toast';
import { buildProductionPlan } from '@/lib/erp/erpnext-payloads';
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

interface PPRow {
  name: string;
  posting_date: string;
  from_date?: string;
  to_date?: string;
  status?: string;
  docstatus: number;
}

interface PoLine {
  item_code: string;
  bom_no: string;
  planned_qty: string;
  warehouse: string;
  stock_uom: string;
}

const emptyPo = (): PoLine => ({ item_code: '', bom_no: '', planned_qty: '1', warehouse: '', stock_uom: 'Nos' });

export default function ProductionPlansPage() {
  const { toast } = useToast();
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [poItems, setPoItems] = useState<PoLine[]>([emptyPo()]);

  const { data, isLoading, isError, error, refetch } = useDocList<PPRow>('Production Plan', {
    fields: ['name', 'posting_date', 'from_date', 'to_date', 'status', 'docstatus'],
    order_by: 'posting_date desc',
    limit: 200,
  });
  const createMutation = useCreateDoc<PPRow>('Production Plan');
  const submitMutation = useSubmitDoc<PPRow>('Production Plan');
  const cancelMutation = useCancelDoc<PPRow>('Production Plan');
  const deleteMutation = useDeleteDoc('Production Plan');

  const rows = data || [];

  const columns: Column<PPRow>[] = useMemo(
    () => [
      { key: 'name', header: 'الرقم', sortable: true, render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
      { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => formatDate(String(v)) },
      { key: 'status', header: 'الحالة', render: (v) => <span className="text-xs">{String(v ?? '—')}</span> },
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
                    onSuccess: () => { toast({ title: 'تم الترحيل' }); void refetch(); },
                    onError: () => toast({ title: 'تعذر الترحيل', variant: 'destructive' }),
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
                    onSuccess: () => { toast({ title: 'أُلغي' }); void refetch(); },
                    onError: () => toast({ title: 'تعذر', variant: 'destructive' }),
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
    if (!company) {
      toast({ title: 'تعذر تحديد الشركة', variant: 'destructive' });
      return;
    }
    if (poItems.every((p) => !p.item_code || !p.bom_no || !p.warehouse || !p.stock_uom)) {
      toast({ title: 'أكمل كل بند: صنف، قائمة مواد، مستودع، وحدة قياس', variant: 'destructive' });
      return;
    }
    const doc = buildProductionPlan({
      company,
      posting_date: postingDate,
      from_date: fromDate,
      to_date: toDate,
      po_items: poItems
        .filter((p) => p.item_code && p.bom_no && p.warehouse && p.stock_uom)
        .map((p) => ({
          item_code: p.item_code,
          bom_no: p.bom_no,
          planned_qty: Number(p.planned_qty) || 1,
          warehouse: p.warehouse,
          stock_uom: p.stock_uom,
        })),
    });
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast({ title: 'تم إنشاء خطة الإنتاج' });
        setDialogOpen(false);
        setPoItems([emptyPo()]);
        void refetch();
      },
      onError: () => toast({ title: 'تعذر الحفظ', variant: 'destructive' }),
    });
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />
      <PageHeader
        title="خطط الإنتاج"
        description="إدارة خطط الإنتاج مع بنود التصنيع والترحيل"
        iconify="solar:chart-2-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'التصنيع', href: '/manufacturing' }, { label: 'خطط الإنتاج' }]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            خطة جديدة
          </Button>
        }
      />
      <KpiStrip cols={3}>
        <KpiCard title="خطط الإنتاج" value={rows.length} icon={BarChart3} accent="warning" description="إجمالي الخطط" />
        <KpiCard title="مسودات" value={rows.filter((r) => Number(r.docstatus) === 0).length} icon={Plus} accent="info" description="بانتظار الترحيل" />
        <KpiCard title="مُرحّلة" value={rows.filter((r) => Number(r.docstatus) === 1).length} icon={Send} accent="success" description="معتمدة" />
      </KpiStrip>
      <DataTable data={rows} columns={columns} searchable loading={isLoading} onDelete={(r) => setDeleteName(r.name)} />
      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الخطة؟</AlertDialogTitle>
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
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>خطة إنتاج</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">تاريخ الترحيل</Label>
                <Input type="date" dir="ltr" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">من</Label>
                <Input type="date" dir="ltr" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">إلى</Label>
                <Input type="date" dir="ltr" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <div className="border rounded-lg">
              <div className="bg-muted/35 px-3 py-2 flex justify-between">
                <span className="text-xs font-semibold">بنود التصنيع</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setPoItems((p) => [...p, emptyPo()])}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">الصنف</TableHead>
                    <TableHead className="text-xs">قائمة المواد</TableHead>
                    <TableHead className="text-xs w-20">كمية</TableHead>
                    <TableHead className="text-xs">مستودع تام</TableHead>
                    <TableHead className="text-xs w-24">وحدة القياس</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poItems.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <ErpLinkCombobox doctype="Item" value={p.item_code} onChange={(v) => setPoItems((rows) => { const n = [...rows]; n[idx] = { ...n[idx]!, item_code: v }; return n; })} />
                      </TableCell>
                      <TableCell>
                        <ErpLinkCombobox doctype="BOM" value={p.bom_no} onChange={(v) => setPoItems((rows) => { const n = [...rows]; n[idx] = { ...n[idx]!, bom_no: v }; return n; })} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs" dir="ltr" value={p.planned_qty} onChange={(e) => setPoItems((rows) => { const n = [...rows]; n[idx] = { ...n[idx]!, planned_qty: e.target.value }; return n; })} />
                      </TableCell>
                      <TableCell>
                        <ErpLinkCombobox doctype="Warehouse" value={p.warehouse} onChange={(v) => setPoItems((rows) => { const n = [...rows]; n[idx] = { ...n[idx]!, warehouse: v }; return n; })} />
                      </TableCell>
                      <TableCell>
                        <ErpLinkCombobox doctype="UOM" value={p.stock_uom} onChange={(v) => setPoItems((rows) => { const n = [...rows]; n[idx] = { ...n[idx]!, stock_uom: v }; return n; })} />
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" className="h-7" onClick={() => poItems.length > 1 && setPoItems((rows) => rows.filter((_, j) => j !== idx))} disabled={poItems.length === 1}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? '...' : 'حفظ مسودة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
