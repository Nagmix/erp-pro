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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Send, Undo2, Loader2, Eye } from 'lucide-react';
import { formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc, useDeleteDoc, useUpdateDoc, useDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { buildStockReconciliation } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { consumeCreateQueryParam } from '@/lib/client/open-create-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  valuation_rate: string;
}

const emptyLine = (): Line => ({ item_code: '', warehouse: '', qty: '', valuation_rate: '' });

export default function StockCountPage() {
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [purpose, setPurpose] = useState('Stock Reconciliation');
  const [expenseAccount, setExpenseAccount] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  // ── Edit dialog state ──
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDocName, setEditDocName] = useState('');
  const [editPostingDate, setEditPostingDate] = useState('');
  const [editPurpose, setEditPurpose] = useState('Stock Reconciliation');
  const [editExpenseAccount, setEditExpenseAccount] = useState('');
  const [editCostCenter, setEditCostCenter] = useState('');
  const [editLines, setEditLines] = useState<Line[]>([emptyLine()]);
  const [viewRow, setViewRow] = useState<SRRow | null>(null);

  // Auto-open create dialog when ?create=1
  useEffect(() => {
    consumeCreateQueryParam(() => setDialogOpen(true));
  }, []);

  const { data, isLoading, isError, error, refetch } = useDocList<SRRow>('Stock Reconciliation', {
    fields: ['name', 'posting_date', 'purpose', 'docstatus'],
    filters: company ? [['company', '=', company]] : undefined,
    order_by: 'posting_date desc',
    limit: 300,
  });
  const createMutation = useCreateDoc<SRRow>('Stock Reconciliation');
  const submitMutation = useSubmitDoc<SRRow>('Stock Reconciliation');
  const cancelMutation = useCancelDoc<SRRow>('Stock Reconciliation');
  const deleteMutation = useDeleteDoc('Stock Reconciliation');
  const updateMutation = useUpdateDoc<SRRow>('Stock Reconciliation');

  // Fetch full document for editing
  const { data: editDoc, isLoading: editDocLoading } = useDoc<Record<string, unknown>>('Stock Reconciliation', editDocName, {
    enabled: Boolean(editDocName) && editDialogOpen,
  });

  // Populate edit form when document loads
  useEffect(() => {
    if (!editDoc || !editDialogOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- form initialization from fetched doc
    setEditPostingDate(String(editDoc.posting_date || ''));
    setEditPurpose(String(editDoc.purpose || 'Stock Reconciliation'));
    setEditExpenseAccount(String(editDoc.expense_account || ''));
    setEditCostCenter(String(editDoc.cost_center || ''));
    const items = (editDoc.items as Record<string, unknown>[]) || [];
    if (items.length > 0) {
      setEditLines(
        items.map((it) => ({
          item_code: String(it.item_code || ''),
          warehouse: String(it.warehouse || ''),
          qty: String(it.qty ?? ''),
          valuation_rate: String(it.valuation_rate ?? ''),
        }))
      );
    } else {
      setEditLines([emptyLine()]);
    }
  }, [editDoc, editDialogOpen]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | '0' | '1' | '2'>('all');

  const rows = data || [];

  const filteredRows = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => String(r.docstatus) === statusFilter);
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          (r.purpose || '').toLowerCase().includes(s)
      );
    }
    return result;
  }, [rows, statusFilter, search]);

  const columns: Column<SRRow>[] = useMemo(
    () => [
      { key: 'name', header: 'الرقم', sortable: true, render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
      { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => formatDate(String(v)) },
      { key: 'purpose', header: 'الغرض', render: (v) => {
          const labels: Record<string, string> = {
            'Stock Reconciliation': 'تسوية مخزون',
            'Opening Stock': 'رصيد افتتاحي',
          };
          return <span className="text-xs">{labels[String(v)] || String(v ?? '—')}</span>;
        },
      },
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
          valuation_rate: l.valuation_rate ? Number(l.valuation_rate) : undefined,
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

  const handleUpdate = () => {
    if (!editDocName || !company) return;
    if (!editPostingDate) {
      toast.error('التاريخ مطلوب');
      return;
    }
    if (editLines.every((l) => !l.item_code || !l.warehouse || !l.qty)) {
      toast.error('أكمل الصنف والمستودع والكمية الفعلية');
      return;
    }
    if (editLines.some((l) => l.item_code && l.warehouse && l.qty && Number(l.qty) < 0)) {
      toast.error('الكمية لا يمكن أن تكون سالبة');
      return;
    }
    const doc = buildStockReconciliation({
      company,
      posting_date: editPostingDate,
      purpose: editPurpose,
      expense_account: editExpenseAccount || undefined,
      cost_center: editCostCenter || undefined,
      items: editLines
        .filter((l) => l.item_code && l.warehouse && l.qty !== '')
        .map((l) => ({
          item_code: l.item_code,
          warehouse: l.warehouse,
          qty: Number(l.qty),
          valuation_rate: l.valuation_rate ? Number(l.valuation_rate) : undefined,
        })),
    });
    delete (doc as Record<string, unknown>).doctype;
    updateMutation.mutate(
      { name: editDocName, doc },
      {
        onSuccess: () => {
          toast.success('تم تحديث جرد المخزون');
          setEditDialogOpen(false);
          setEditDocName('');
          void refetch();
        },
        onError: () => toast.error('تعذر التحديث'),
      },
    );
  };

  const openEdit = (row: SRRow) => {
    const ds = Number(row.docstatus);
    if (ds === 0) {
      setEditDocName(row.name);
      setEditDialogOpen(true);
    } else {
      setViewRow(row);
      setViewDialogOpen(true);
    }
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
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px]">
          <Input placeholder="بحث بالرقم أو الغرض..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | '0' | '1' | '2')}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="0">مسودة</SelectItem>
              <SelectItem value="1">مرحّل</SelectItem>
              <SelectItem value="2">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <PageShell padded={false}>
        <DataTable data={filteredRows} columns={columns} searchable loading={isLoading}
          onEdit={(r) => openEdit(r)}
          onDelete={(r) => {
          if (Number(r.docstatus) !== 0) {
            toast.error('لا يمكن حذف مستند مرحّل أو ملغي');
            return;
          }
          setDeleteName(r.name);
        }} />
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

      {/* ══════ Create Dialog ══════ */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setPostingDate(new Date().toISOString().split('T')[0]!);
          setPurpose('Stock Reconciliation');
          setExpenseAccount('');
          setCostCenter('');
          setLines([emptyLine()]);
        }
      }}>
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
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger className="w-full h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Stock Reconciliation">تسوية مخزون</SelectItem>
                    <SelectItem value="Opening Stock">رصيد افتتاحي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">حساب فرق (اختياري)</Label>
                <ErpLinkCombobox doctype="Account" value={expenseAccount} onChange={setExpenseAccount}
                  filters={[['account_type', '=', 'Stock Adjustment'], ['company', '=', company]]} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">مركز تكلفة (اختياري)</Label>
                <ErpLinkCombobox doctype="Cost Center" value={costCenter} onChange={setCostCenter}
                  filters={[['company', '=', company]]} />
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
                    <TableHead className="text-xs w-28">سعر التقييم</TableHead>
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
                        <Input type="number" className="h-8 text-xs" dir="ltr" value={line.valuation_rate} onChange={(e) => setLines((p) => { const n = [...p]; n[idx] = { ...n[idx]!, valuation_rate: e.target.value }; return n; })} placeholder="0" />
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" className="h-7" onClick={()=> lines.length > 1 && setLines((p) => p.filter((_, j) => j !== idx))} disabled={lines.length === 1}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />جاري الحفظ...</>
              ) : 'حفظ مسودة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════ Edit Dialog (Drafts only) ══════ */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setEditDocName('');
          setEditLines([emptyLine()]);
        }
      }}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              تعديل جرد المخزون
              <span className="text-xs font-normal text-muted-foreground">({editDocName})</span>
            </DialogTitle>
          </DialogHeader>
          {editDocLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">تاريخ الترحيل</Label>
                  <Input type="date" dir="ltr" value={editPostingDate} onChange={(e) => setEditPostingDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">الغرض</Label>
                  <Select value={editPurpose} onValueChange={setEditPurpose}>
                    <SelectTrigger className="w-full h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stock Reconciliation">تسوية مخزون</SelectItem>
                      <SelectItem value="Opening Stock">رصيد افتتاحي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">حساب فرق (اختياري)</Label>
                  <ErpLinkCombobox doctype="Account" value={editExpenseAccount} onChange={setEditExpenseAccount}
                    filters={[['account_type', '=', 'Stock Adjustment'], ['company', '=', company]]} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">مركز تكلفة (اختياري)</Label>
                  <ErpLinkCombobox doctype="Cost Center" value={editCostCenter} onChange={setEditCostCenter}
                    filters={[['company', '=', company]]} />
                </div>
              </div>
              <div className="border rounded-lg">
                <div className="bg-muted/50 px-3 py-2 flex justify-between">
                  <span className="text-xs font-semibold">البنود — الكمية = الرصيد الفعلي بعد الجرد</span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditLines((p) => [...p, emptyLine()])}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">الصنف</TableHead>
                      <TableHead className="text-xs">المستودع</TableHead>
                      <TableHead className="text-xs w-24">الكمية</TableHead>
                      <TableHead className="text-xs w-28">سعر التقييم</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editLines.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <ErpLinkCombobox doctype="Item" value={line.item_code} onChange={(v) => setEditLines((p) => { const n = [...p]; n[idx] = { ...n[idx]!, item_code: v }; return n; })} />
                        </TableCell>
                        <TableCell>
                          <ErpLinkCombobox doctype="Warehouse" value={line.warehouse} onChange={(v) => setEditLines((p) => { const n = [...p]; n[idx] = { ...n[idx]!, warehouse: v }; return n; })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" className="h-8 text-xs" dir="ltr" value={line.qty} onChange={(e) => setEditLines((p) => { const n = [...p]; n[idx] = { ...n[idx]!, qty: e.target.value }; return n; })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" className="h-8 text-xs" dir="ltr" value={line.valuation_rate} onChange={(e) => setEditLines((p) => { const n = [...p]; n[idx] = { ...n[idx]!, valuation_rate: e.target.value }; return n; })} placeholder="0" />
                        </TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" className="h-7" onClick={()=> editLines.length > 1 && setEditLines((p) => p.filter((_, j) => j !== idx))} disabled={editLines.length === 1}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button className="w-full" onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري التحديث...</>
                ) : 'حفظ التعديل'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════ View Dialog (Read-only for submitted/cancelled) ══════ */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-muted-foreground" />
              عرض جرد المخزون
            </DialogTitle>
          </DialogHeader>
          {viewRow && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">الرقم</span>
                  <span className="font-medium text-primary">{viewRow.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">التاريخ</span>
                  <span>{formatDate(viewRow.posting_date)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">الغرض</span>
                  <span>{viewRow.purpose === 'Stock Reconciliation' ? 'تسوية مخزون' : viewRow.purpose === 'Opening Stock' ? 'رصيد افتتاحي' : viewRow.purpose || '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">حالة المستند</span>
                  <DocStatusBadge docstatus={Number(viewRow.docstatus) as 0 | 1 | 2} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">هذا مستند مرحّل أو ملغي ولا يمكن تعديله</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
