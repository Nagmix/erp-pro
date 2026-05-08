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
import { Plus, Trash2, Send, Undo2, PackageCheck } from 'lucide-react';
import { PageHeader, KpiStrip, KpiCard } from '@/components/erp/page-header';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useToast } from '@/hooks/use-toast';
import { buildBom } from '@/lib/erp/erpnext-payloads';
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

interface BOMRow {
  name: string;
  item_name?: string;
  item?: string;
  quantity: number;
  docstatus: number;
}

interface MatLine {
  item_code: string;
  qty: string;
  uom: string;
}

interface OpLine {
  operation: string;
  workstation: string;
  time_in_mins: string;
  hourly_rate: string;
}

const emptyMat = (): MatLine => ({ item_code: '', qty: '1', uom: 'Nos' });
const emptyOp = (): OpLine => ({ operation: '', workstation: '', time_in_mins: '0', hourly_rate: '0' });

export default function BOMPage() {
  const { toast } = useToast();
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [finishedItem, setFinishedItem] = useState('');
  const [qty, setQty] = useState('1');
  const [uom, setUom] = useState('Nos');
  const [materials, setMaterials] = useState<MatLine[]>([emptyMat()]);
  const [operations, setOperations] = useState<OpLine[]>([]);

  const { data, isLoading, isError, error, refetch } = useDocList<BOMRow>('BOM', {
    fields: ['name', 'item', 'item_name', 'quantity', 'docstatus'],
    order_by: 'modified desc',
    limit: 500,
  });
  const createMutation = useCreateDoc<BOMRow>('BOM');
  const submitMutation = useSubmitDoc<BOMRow>('BOM');
  const cancelMutation = useCancelDoc<BOMRow>('BOM');
  const deleteMutation = useDeleteDoc('BOM');

  const rows = data || [];

  const columns: Column<BOMRow>[] = useMemo(
    () => [
      { key: 'name', header: 'الرقم', sortable: true, render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
      { key: 'item_name', header: 'المنتج', sortable: true, render: (_v, row) => <span>{String(row.item_name || row.item || '—')}</span> },
      { key: 'quantity', header: 'الكمية', render: (v) => <span className="tabular-nums">{Number(v)}</span> },
      { key: 'docstatus', header: 'مستند', render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} /> },
      {
        key: '_s',
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
    if (!company || !finishedItem) {
      toast({ title: 'الشركة والمنتج النهائي مطلوبان', variant: 'destructive' });
      return;
    }
    if (materials.every((m) => !m.item_code)) {
      toast({ title: 'أضف مادة خام واحدة على الأقل', variant: 'destructive' });
      return;
    }
    const doc = buildBom({
      company,
      item: finishedItem,
      quantity: Math.max(0.001, Number(qty) || 1),
      uom,
      items: materials
        .filter((m) => m.item_code)
        .map((m) => ({
          item_code: m.item_code,
          qty: Number(m.qty) || 1,
          uom: m.uom || uom,
        })),
      operations: operations
        .filter((o) => o.operation.trim())
        .map((o) => ({
          operation: o.operation.trim(),
          workstation: o.workstation.trim() || undefined,
          time_in_mins: Number(o.time_in_mins) || 0,
          hourly_rate: Number(o.hourly_rate) || 0,
        })),
    });
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast({ title: 'تم إنشاء قائمة المواد' });
        setDialogOpen(false);
        setFinishedItem('');
        setMaterials([emptyMat()]);
        setOperations([]);
        void refetch();
      },
      onError: () => toast({ title: 'تعذر الحفظ — تحقق من صلاحية العمليات إن أضفتها', variant: 'destructive' }),
    });
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="قوائم المواد (قائمة المواد)"
        description="إدارة مكونات المنتج النهائي والكميات والعمليات وعلاقات الإنتاج"
        iconify="solar:tree-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'التصنيع', href: '/manufacturing' }, { label: 'قوائم المواد' }]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            قائمة مواد جديدة
          </Button>
        }
      />
      <KpiStrip cols={3}>
        <KpiCard title="قوائم المواد" value={rows.length} icon={PackageCheck} accent="warning" description="إجمالي القوائم" />
        <KpiCard title="مسودات" value={rows.filter((r) => Number(r.docstatus) === 0).length} icon={Plus} accent="info" description="بانتظار الترحيل" />
        <KpiCard title="مُرحّلة" value={rows.filter((r) => Number(r.docstatus) === 1).length} icon={Send} accent="success" description="معتمدة" />
      </KpiStrip>
      <DataTable data={rows} columns={columns} searchable loading={isLoading} onDelete={(r) => setDeleteName(r.name)} />
      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف BOM؟</AlertDialogTitle>
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
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>قائمة مواد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">الصنف النهائي *</Label>
              <ErpLinkCombobox doctype="Item" value={finishedItem} onChange={setFinishedItem} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">كمية التصنيع</Label>
                <Input type="number" dir="ltr" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">الوحدة</Label>
                <ErpLinkCombobox doctype="UOM" value={uom} onChange={setUom} />
              </div>
            </div>
            <div className="border rounded-lg">
              <div className="bg-muted/35 px-3 py-2 flex justify-between">
                <span className="text-xs font-semibold">مواد خام</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setMaterials((p) => [...p, emptyMat()])}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">الصنف</TableHead>
                    <TableHead className="text-xs w-20">الكمية</TableHead>
                    <TableHead className="text-xs w-24">وحدة القياس</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((m, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <ErpLinkCombobox doctype="Item" value={m.item_code} onChange={(v) => setMaterials((p) => { const n = [...p]; n[idx] = { ...n[idx]!, item_code: v }; return n; })} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs" dir="ltr" value={m.qty} onChange={(e) => setMaterials((p) => { const n = [...p]; n[idx] = { ...n[idx]!, qty: e.target.value }; return n; })} />
                      </TableCell>
                      <TableCell>
                        <ErpLinkCombobox doctype="UOM" value={m.uom} onChange={(v) => setMaterials((p) => { const n = [...p]; n[idx] = { ...n[idx]!, uom: v }; return n; })} />
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" className="h-7" onClick={() => materials.length > 1 && setMaterials((p) => p.filter((_, j) => j !== idx))} disabled={materials.length === 1}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="border rounded-lg">
              <div className="bg-muted/35 px-3 py-2 flex justify-between items-center">
                <span className="text-xs font-semibold">عمليات التصنيع (اختياري)</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setOperations((p) => [...p, emptyOp()])}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {operations.length === 0 ? (
                <p className="text-[11px] text-muted-foreground px-3 py-2">لا عمليات — أضف عملية إن كان مسار الإنتاج يتضمن ورشاً وزمن تشغيل.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">العملية</TableHead>
                      <TableHead className="text-xs">محطة العمل</TableHead>
                      <TableHead className="text-xs w-24">الوقت (د)</TableHead>
                      <TableHead className="text-xs w-24">سعر الساعة</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operations.map((op, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <ErpLinkCombobox doctype="Operation" value={op.operation} onChange={(v) => setOperations((p) => { const n = [...p]; n[idx] = { ...n[idx]!, operation: v }; return n; })} />
                        </TableCell>
                        <TableCell>
                          <ErpLinkCombobox doctype="Workstation" value={op.workstation} onChange={(v) => setOperations((p) => { const n = [...p]; n[idx] = { ...n[idx]!, workstation: v }; return n; })} />
                        </TableCell>
                        <TableCell>
                          <Input className="h-8 text-xs" dir="ltr" value={op.time_in_mins} onChange={(e) => setOperations((p) => { const n = [...p]; n[idx] = { ...n[idx]!, time_in_mins: e.target.value }; return n; })} />
                        </TableCell>
                        <TableCell>
                          <Input className="h-8 text-xs" dir="ltr" value={op.hourly_rate} onChange={(e) => setOperations((p) => { const n = [...p]; n[idx] = { ...n[idx]!, hourly_rate: e.target.value }; return n; })} />
                        </TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" className="h-7" onClick={() => setOperations((p) => p.filter((_, j) => j !== idx))}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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
