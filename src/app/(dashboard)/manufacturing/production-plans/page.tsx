'use client';

import { useMemo, useState, useCallback } from 'react';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Send, Undo2, BarChart3, Check, FileText, Filter, Calendar, Package, Building2 } from 'lucide-react';
import { PageHeader, KpiStrip, KpiCard } from '@/components/erp/page-header';
import { formatDate, formatNumber } from '@/lib/core/helpers';
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

/* ──────────────── Types ──────────────── */

interface PPRow {
  name: string;
  posting_date: string;
  from_date?: string;
  to_date?: string;
  status?: string;
  company?: string;
  docstatus: number;
  total_planned_qty?: number;
}

interface PoLine {
  item_code: string;
  bom_no: string;
  planned_qty: string;
  warehouse: string;
  stock_uom: string;
}

/* ──────────────── Helpers ──────────────── */

const emptyPo = (): PoLine => ({
  item_code: '',
  bom_no: '',
  planned_qty: '1',
  warehouse: '',
  stock_uom: 'Nos',
});

const STATUS_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: 'Draft', label: 'مسودة' },
  { value: 'Submitted', label: 'مُقدّم' },
  { value: 'In Process', label: 'قيد التنفيذ' },
  { value: 'Completed', label: 'مكتمل' },
  { value: 'Cancelled', label: 'ملغي' },
] as const;

const DOC_STATUS_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: '0', label: 'مسودة' },
  { value: '1', label: 'مُرحّل' },
  { value: '2', label: 'ملغي' },
] as const;

/* ──────────────── Component ──────────────── */

export default function ProductionPlansPage() {
  const { toast } = useToast();
  const { company, isLoading: coLoading } = useDefaultCompanyName();

  /* Dialog state */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);

  /* Create form state */
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [forWarehouse, setForWarehouse] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [poItems, setPoItems] = useState<PoLine[]>([emptyPo()]);

  /* Filter state */
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDocStatus, setFilterDocStatus] = useState('');

  /* ── Data fetching ── */
  const { data, isLoading, isError, error, refetch } = useDocList<PPRow>('Production Plan', {
    fields: ['name', 'posting_date', 'from_date', 'to_date', 'status', 'company', 'docstatus', 'total_planned_qty'],
    order_by: 'posting_date desc',
    limit: 200,
  });
  const createMutation = useCreateDoc<PPRow>('Production Plan');
  const submitMutation = useSubmitDoc<PPRow>('Production Plan');
  const cancelMutation = useCancelDoc<PPRow>('Production Plan');
  const deleteMutation = useDeleteDoc('Production Plan');

  const allRows = data || [];

  /* ── Filtered rows ── */
  const rows = useMemo(() => {
    return allRows.filter((r) => {
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterDocStatus && String(r.docstatus) !== filterDocStatus) return false;
      return true;
    });
  }, [allRows, filterStatus, filterDocStatus]);

  /* ── KPI computations ── */
  const kpiTotal = allRows.length;
  const kpiDraft = allRows.filter((r) => Number(r.docstatus) === 0).length;
  const kpiSubmitted = allRows.filter((r) => Number(r.docstatus) === 1).length;
  const kpiCompleted = allRows.filter((r) => r.status === 'Completed').length;
  const totalPlannedQty = allRows.reduce((s, r) => s + (Number(r.total_planned_qty) || 0), 0);

  /* ── Update poItems helper ── */
  const updatePoItem = useCallback(
    (idx: number, field: keyof PoLine, value: string) => {
      setPoItems((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx]!, [field]: value };
        return next;
      });
    },
    []
  );

  /* ── Table columns ── */
  const columns: Column<PPRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'رقم الخطة',
        sortable: true,
        render: (v) => (
          <span className="font-medium text-primary">{String(v)}</span>
        ),
      },
      {
        key: 'posting_date',
        header: 'تاريخ الترحيل',
        sortable: true,
        render: (v) => (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {formatDate(String(v))}
          </span>
        ),
      },
      {
        key: 'from_date',
        header: 'من',
        sortable: true,
        render: (v) => formatDate(String(v ?? '')),
      },
      {
        key: 'to_date',
        header: 'إلى',
        sortable: true,
        render: (v) => formatDate(String(v ?? '')),
      },
      {
        key: 'company',
        header: 'الشركة',
        render: (v) => (
          <span className="flex items-center gap-1 text-xs">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            {String(v ?? '—')}
          </span>
        ),
      },
      {
        key: 'total_planned_qty',
        header: 'إجمالي الكمية',
        render: (v) => (
          <span className="tabular-nums font-medium">
            {formatNumber(Number(v) || 0)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (v) => <StatusBadge status={String(v ?? 'Draft')} />,
      },
      {
        key: 'docstatus',
        header: 'مستند',
        render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} />,
      },
      {
        key: '_actions',
        header: 'إجراءات',
        width: 'w-32',
        render: (_v, row) => {
          const ds = Number(row.docstatus);
          if (ds === 0) {
            return (
              <div className="flex items-center gap-1">
                <Button
                  dir="rtl"
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 text-[10px] gap-1"
                  onClick={() =>
                    submitMutation.mutate(row.name, {
                      onSuccess: () => {
                        toast({ title: 'تم الترحيل بنجاح' });
                        void refetch();
                      },
                      onError: () =>
                        toast({ title: 'تعذر الترحيل', variant: 'destructive' }),
                    })
                  }
                >
                  <Send className="h-3 w-3" />
                  ترحيل
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive"
                  onClick={() => setDeleteName(row.name)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
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
                    onSuccess: () => {
                      toast({ title: 'تم إلغاء الخطة' });
                      void refetch();
                    },
                    onError: () =>
                      toast({ title: 'تعذر الإلغاء', variant: 'destructive' }),
                  })
                }
              >
                <Undo2 className="h-3 w-3" />
                إلغاء
              </Button>
            );
          }
          return <span className="text-muted-foreground text-xs">—</span>;
        },
      },
    ],
    [submitMutation, cancelMutation, toast, refetch]
  );

  /* ── Create handler ── */
  const handleCreate = () => {
    const useCompany = selectedCompany || company;
    if (!useCompany) {
      toast({ title: 'تعذر تحديد الشركة', variant: 'destructive' });
      return;
    }
    const validItems = poItems.filter(
      (p) => p.item_code && p.bom_no && p.warehouse && p.stock_uom
    );
    if (validItems.length === 0) {
      toast({
        title: 'أكمل كل بند: صنف، قائمة مواد، مستودع، وحدة قياس',
        variant: 'destructive',
      });
      return;
    }
    const doc = buildProductionPlan({
      company: useCompany,
      posting_date: postingDate,
      from_date: fromDate,
      to_date: toDate,
      po_items: validItems.map((p) => ({
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
        setForWarehouse('');
        setSelectedCompany('');
        void refetch();
      },
      onError: () =>
        toast({ title: 'تعذر الحفظ', variant: 'destructive' }),
    });
  };

  /* ── Reset form on dialog close ── */
  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setPoItems([emptyPo()]);
      setForWarehouse('');
      setSelectedCompany('');
      setPostingDate(new Date().toISOString().split('T')[0]!);
      setFromDate(new Date().toISOString().split('T')[0]!);
      setToDate(new Date().toISOString().split('T')[0]!);
    }
  };

  /* ── Render ── */
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      {/* ── Page Header ── */}
      <PageHeader
        title="خطط الإنتاج"
        description="إدارة خطط الإنتاج مع بنود التصنيع والترحيل وتتبع الحالة"
        iconify="solar:chart-2-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'التصنيع', href: '/manufacturing' }, { label: 'خطط الإنتاج' }]}
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            disabled={coLoading}
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            خطة جديدة
          </Button>
        }
      />

      {/* ── KPI Cards ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="خطط الإنتاج"
          value={kpiTotal}
          icon={BarChart3}
          accent="warning"
          description="إجمالي الخطط"
        />
        <KpiCard
          title="مسودات"
          value={kpiDraft}
          icon={FileText}
          accent="info"
          description="بانتظار الترحيل"
        />
        <KpiCard
          title="مُرحّلة"
          value={kpiSubmitted}
          icon={Send}
          accent="success"
          description="خطط معتمدة"
        />
        <KpiCard
          title="مكتملة"
          value={kpiCompleted}
          icon={Check}
          accent="primary"
          description={`كمية مخططة: ${formatNumber(totalPlannedQty)}`}
        />
      </KpiStrip>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/40 bg-card px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span className="font-semibold">تصفية:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            dir="rtl"
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">الكل</SelectItem>
              {STATUS_OPTIONS.filter((o) => o.value).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            dir="rtl"
            value={filterDocStatus}
            onValueChange={(v) => setFilterDocStatus(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="حالة المستند" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">الكل</SelectItem>
              {DOC_STATUS_OPTIONS.filter((o) => o.value).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterStatus || filterDocStatus) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive"
              onClick={() => {
                setFilterStatus('');
                setFilterDocStatus('');
              }}
            >
              مسح الفلاتر
            </Button>
          )}
          <span className="text-[11px] text-muted-foreground">
            عرض {rows.length} من {allRows.length}
          </span>
        </div>
      </div>

      {/* ── Data Table ── */}
      <DataTable
        data={rows}
        columns={columns}
        searchable
        loading={isLoading}
        tableId="production-plans"
        exportFileName="production-plans"
        onDelete={(r) => setDeleteName(r.name)}
      />

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف خطة الإنتاج؟</AlertDialogTitle>
            <p className="text-sm text-muted-foreground">
              سيتم حذف الخطة &quot;{deleteName}&quot; نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteName) return;
                deleteMutation.mutate(deleteName, {
                  onSuccess: () => {
                    toast({ title: 'تم حذف الخطة' });
                    setDeleteName(null);
                    void refetch();
                  },
                  onError: () =>
                    toast({ title: 'تعذر الحذف', variant: 'destructive' }),
                });
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-warning" />
              إنشاء خطة إنتاج جديدة
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* ── Header Fields ── */}
            <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground">معلومات أساسية</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">الشركة</Label>
                  <ErpLinkCombobox
                    doctype="Company"
                    value={selectedCompany || company || ''}
                    onChange={setSelectedCompany}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">مستودع الإنتاج</Label>
                  <ErpLinkCombobox
                    doctype="Warehouse"
                    value={forWarehouse}
                    onChange={setForWarehouse}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">تاريخ الترحيل</Label>
                  <Input
                    type="date"
                    dir="ltr"
                    value={postingDate}
                    onChange={(e) => setPostingDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">من تاريخ</Label>
                  <Input
                    type="date"
                    dir="ltr"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">إلى تاريخ</Label>
                  <Input
                    type="date"
                    dir="ltr"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ── Production Plan Items (po_items) ── */}
            <div className="rounded-lg border">
              <div className="bg-muted/35 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-warning" />
                  <span className="text-xs font-semibold">بنود التصنيع (أصناف للإنتاج)</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setPoItems((p) => [...p, emptyPo()])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة بند
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs min-w-[160px]">الصنف</TableHead>
                      <TableHead className="text-xs min-w-[160px]">قائمة المواد</TableHead>
                      <TableHead className="text-xs w-24">الكمية المخططة</TableHead>
                      <TableHead className="text-xs min-w-[140px]">مستودع تام</TableHead>
                      <TableHead className="text-xs w-28">وحدة القياس</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poItems.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <ErpLinkCombobox
                            doctype="Item"
                            value={p.item_code}
                            onChange={(v) => updatePoItem(idx, 'item_code', v)}
                          />
                        </TableCell>
                        <TableCell>
                          <ErpLinkCombobox
                            doctype="BOM"
                            value={p.bom_no}
                            onChange={(v) => updatePoItem(idx, 'bom_no', v)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-xs"
                            dir="ltr"
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={p.planned_qty}
                            onChange={(e) =>
                              updatePoItem(idx, 'planned_qty', e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <ErpLinkCombobox
                            doctype="Warehouse"
                            value={p.warehouse || forWarehouse}
                            onChange={(v) => updatePoItem(idx, 'warehouse', v)}
                          />
                        </TableCell>
                        <TableCell>
                          <ErpLinkCombobox
                            doctype="UOM"
                            value={p.stock_uom}
                            onChange={(v) => updatePoItem(idx, 'stock_uom', v)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7"
                            onClick={() =>
                              poItems.length > 1 &&
                              setPoItems((rows) => rows.filter((_, j) => j !== idx))
                            }
                            disabled={poItems.length === 1}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {poItems.length > 0 && (
                <div className="border-t bg-muted/15 px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    إجمالي الكمية المخططة: {' '}
                    <span className="font-semibold text-foreground">
                      {formatNumber(
                        poItems.reduce((s, p) => s + (Number(p.planned_qty) || 0), 0)
                      )}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    عدد البنود: {poItems.length}
                  </span>
                </div>
              )}
            </div>

            {/* ── Summary ── */}
            <div className="rounded-lg border bg-muted/10 p-3">
              <h4 className="text-xs font-semibold mb-2">ملخص الخطة</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">الشركة:</span>
                  <p className="font-medium truncate">{selectedCompany || company || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">المستودع:</span>
                  <p className="font-medium truncate">{forWarehouse || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">الفترة:</span>
                  <p className="font-medium">{formatDate(fromDate)} — {formatDate(toDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">عدد الأصناف:</span>
                  <p className="font-medium">
                    {poItems.filter((p) => p.item_code).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={createMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="gap-1.5"
            >
              {createMutation.isPending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5" />
                  حفظ مسودة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
