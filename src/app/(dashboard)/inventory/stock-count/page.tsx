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
import { Plus, Trash2, Send, Undo2 } from 'lucide-react';
import { formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { buildStockReconciliation } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { PageHeader, KpiStrip, PageShell } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SRRow {
  name: string;
  posting_date: string;
  purpose?: string;
  docstatus: number;
}

interface Line {
  item_code: string;
  warehouse: string;
  qty: string;
}

const emptyLine = (): Line => ({ item_code: '', warehouse: '', qty: '' });

export default function StockCountPage() {
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [purpose, setPurpose] = useState('Stock Reconciliation');
  const [expenseAccount, setExpenseAccount] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const { data, isLoading, isError, error, refetch } = useDocList<SRRow>('Stock Reconciliation', {
    fields: ['name', 'posting_date', 'purpose', 'docstatus'],
    order_by: 'posting_date desc',
    limit: 300,
  });
  const createMutation = useCreateDoc<SRRow>('Stock Reconciliation');
  const submitMutation = useSubmitDoc<SRRow>('Stock Reconciliation');
  const cancelMutation = useCancelDoc<SRRow>('Stock Reconciliation');
  const deleteMutation = useDeleteDoc('Stock Reconciliation');

  const rows = data || [];

  const columns: Column<SRRow>[] = useMemo(
    () => [
      { key: 'name', header: 'الرقم', sortable: true, render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
      { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => formatDate(String(v)) },
      { key: 'purpose', header: 'الغرض', render: (v) => <span className="text-xs">{String(v ?? '—')}</span> },
      { key: 'docstatus', header: 'مستند', render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} /> },
      {
        key: '_a',
        header: 'ترحيل',
        width: 'w-28',
        render: (_v, row) => {
          const ds = Number(row.docstatus);
          if (ds === 0) {
            return (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-[10px] gap-1"
                onClick={() =>
                  submitMutation.mutate(row.name, {
                    onSuccess: () => { toast.success('تم الترحيل — تعديل المخزون'); void refetch(); },
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
    if (!company) {
      toast.error('تعذر تحديد الشركة');
      return;
    }
    if (lines.every((l) => !l.item_code || !l.warehouse || !l.qty)) {
      toast.error('أكمل الصنف والمستودع والكمية الفعلية');
      return;
    }
    const doc = buildStockReconciliation({
      company,
      posting_date: postingDate,
      purpose,
      expense_account: expenseAccount || undefined,
      cost_center: costCenter || undefined,
      items: lines
        .filter((l) => l.item_code && l.warehouse && l.qty !== '')
        .map((l) => ({
          item_code: l.item_code,
          warehouse: l.warehouse,
          qty: Number(l.qty),
        })),
    });
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء جرد المخزون');
        setDialogOpen(false);
        setLines([emptyLine()]);
        void refetch();
      },
      onError: () => toast.error('تعذر الحفظ'),
    });
  };

  return (
    <div className="erp-page-enter space-y-6" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />
      <PageHeader
        title="جرد المخزون"
        description="إدخال الكميات الفعلية بعد الجرد عبر تسوية المخزون مع دورة اعتماد واضحة"
        iconify="solar:box-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المخزون', href: '/inventory' }, { label: 'جرد المخزون' }]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            جرد جديد
          </Button>
        }
      />
      <KpiStrip cols={3}>
        <KpiCard title="إجمالي الجرد" value={rows.length} icon={Plus} accent="warning" description="كل سجلات الجرد" />
        <KpiCard title="مسودات" value={rows.filter((r) => Number(r.docstatus) === 0).length} icon={Undo2} accent="info" description="بانتظار الترحيل" />
        <KpiCard title="مرحّل" value={rows.filter((r) => Number(r.docstatus) === 1).length} icon={Send} accent="success" description="مطبّق على الأرصدة" />
      </KpiStrip>
      <PageShell padded={false}>
        <DataTable data={rows} columns={columns} searchable loading={isLoading} onDelete={(r) => setDeleteName(r.name)} />
      </PageShell>
      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الجرد؟</AlertDialogTitle>
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
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تسوية مخزون (جرد)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">تاريخ الترحيل</Label>
                <Input type="date" dir="ltr" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">الغرض</Label>
                <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                  <option value="Stock Reconciliation">تسوية مخزون</option>
                  <option value="Opening Stock">رصيد افتتاحي</option>
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">حساب فرق (اختياري)</Label>
                <ErpLinkCombobox doctype="Account" value={expenseAccount} onChange={setExpenseAccount} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">مركز تكلفة (اختياري)</Label>
                <ErpLinkCombobox doctype="Cost Center" value={costCenter} onChange={setCostCenter} />
              </div>
            </div>
            <div className="border rounded-lg">
              <div className="bg-muted/50 px-3 py-2 flex justify-between">
                <span className="text-xs font-semibold">البنود — الكمية = الرصيد الفعلي بعد الجرد</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setLines((p) => [...p, emptyLine()])}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">الصنف</TableHead>
                    <TableHead className="text-xs">المستودع</TableHead>
                    <TableHead className="text-xs w-24">الكمية</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <ErpLinkCombobox doctype="Item" value={line.item_code} onChange={(v) => setLines((p) => { const n = [...p]; n[idx] = { ...n[idx]!, item_code: v }; return n; })} />
                      </TableCell>
                      <TableCell>
                        <ErpLinkCombobox doctype="Warehouse" value={line.warehouse} onChange={(v) => setLines((p) => { const n = [...p]; n[idx] = { ...n[idx]!, warehouse: v }; return n; })} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="h-8 text-xs" dir="ltr" value={line.qty} onChange={(e) => setLines((p) => { const n = [...p]; n[idx] = { ...n[idx]!, qty: e.target.value }; return n; })} />
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" className="h-7" onClick={() => lines.length > 1 && setLines((p) => p.filter((_, j) => j !== idx))} disabled={lines.length === 1}>
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
