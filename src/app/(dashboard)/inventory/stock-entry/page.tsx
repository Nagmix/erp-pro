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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, Send, Undo2, Package, Filter, ChevronDown, X, Loader2, Eye } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc, useDeleteDoc, useUpdateDoc, useDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { buildStockEntry } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface SERow {
  name: string;
  stock_entry_type: string;
  posting_date: string;
  total_outgoing_value?: number;
  total_incoming_value?: number;
  docstatus: number;
}

interface Line {
  item_code: string;
  qty: number;
  basic_rate: string;
  s_warehouse: string;
  t_warehouse: string;
}

const emptyLine = (): Line => ({ item_code: '', qty: 1, basic_rate: '', s_warehouse: '', t_warehouse: '' });

export default function StockEntryPage() {
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [filter, setFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [entryType, setEntryType] = useState('Material Receipt');
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [fromWh, setFromWh] = useState('');
  const [toWh, setToWh] = useState('');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stockEntryTypeFilter, setStockEntryTypeFilter] = useState('all');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Edit dialog state ──
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDocName, setEditDocName] = useState('');
  const [editEntryType, setEditEntryType] = useState('Material Receipt');
  const [editPostingDate, setEditPostingDate] = useState('');
  const [editFromWh, setEditFromWh] = useState('');
  const [editToWh, setEditToWh] = useState('');
  const [editLines, setEditLines] = useState<Line[]>([emptyLine()]);
  const [viewRow, setViewRow] = useState<SERow | null>(null);

  // Auto-open create dialog when ?create=1
  useEffect(() => {
    consumeCreateQueryParam(() => setDialogOpen(true));
  }, []);

  const { data, isLoading, isError, error, refetch } = useDocList<SERow>('Stock Entry', {
    fields: ['name', 'stock_entry_type', 'posting_date', 'total_outgoing_value', 'total_incoming_value', 'docstatus'],
    filters: company ? [['company', '=', company]] : undefined,
    order_by: 'posting_date desc',
    limit: 500,
  });
  const createMutation = useCreateDoc<SERow>('Stock Entry');
  const submitMutation = useSubmitDoc<SERow>('Stock Entry');
  const cancelMutation = useCancelDoc<SERow>('Stock Entry');
  const deleteMutation = useDeleteDoc('Stock Entry');
  const updateMutation = useUpdateDoc<SERow>('Stock Entry');

  // Fetch full document for editing
  const { data: editDoc, isLoading: editDocLoading } = useDoc<Record<string, unknown>>('Stock Entry', editDocName, {
    enabled: Boolean(editDocName) && editDialogOpen,
  });

  // Populate edit form when document loads
  useEffect(() => {
    if (!editDoc || !editDialogOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- form initialization from fetched doc
    setEditEntryType(String(editDoc.stock_entry_type || editDoc.purpose || 'Material Receipt'));
    setEditPostingDate(String(editDoc.posting_date || ''));
    setEditFromWh(String(editDoc.from_warehouse || ''));
    setEditToWh(String(editDoc.to_warehouse || ''));
    const items = (editDoc.items as Record<string, unknown>[]) || [];
    if (items.length > 0) {
      setEditLines(
        items.map((it) => ({
          item_code: String(it.item_code || ''),
          qty: Number(it.qty) || 0,
          basic_rate: String(it.basic_rate ?? ''),
          s_warehouse: String(it.s_warehouse || ''),
          t_warehouse: String(it.t_warehouse || ''),
        }))
      );
    } else {
      setEditLines([emptyLine()]);
    }
  }, [editDoc, editDialogOpen]);

  const clearFilters = () => { setSearch(''); setStockEntryTypeFilter('all'); setDateFrom(''); setDateTo(''); setStatusFilter('all'); };

  const rows = data || [];
  let filtered = filter === 'all' ? rows : rows.filter((s) => s.stock_entry_type === filter);

  // Apply advanced filters
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.stock_entry_type.toLowerCase().includes(q)
    );
  }
  if (stockEntryTypeFilter !== 'all') {
    filtered = filtered.filter((s) => s.stock_entry_type === stockEntryTypeFilter);
  }
  if (dateFrom) {
    filtered = filtered.filter((s) => s.posting_date && s.posting_date >= dateFrom);
  }
  if (dateTo) {
    filtered = filtered.filter((s) => s.posting_date && s.posting_date <= dateTo);
  }
  if (statusFilter !== 'all') {
    const ds = Number(statusFilter);
    filtered = filtered.filter((s) => Number(s.docstatus) === ds);
  }

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => {
      const n = [...prev];
      n[i] = { ...n[i]!, ...patch };
      return n;
    });
  };

  const updateEditLine = (i: number, patch: Partial<Line>) => {
    setEditLines((prev) => {
      const n = [...prev];
      n[i] = { ...n[i]!, ...patch };
      return n;
    });
  };

  const handleCreate = () => {
    if (!company) {
      toast.error('تعذر تحديد الشركة');
      return;
    }
    if (entryType === 'Material Receipt' && !toWh) {
      toast.error('مستودع الاستلام مطلوب');
      return;
    }
    if (entryType === 'Material Issue' && !fromWh) {
      toast.error('مستودع الصرف مطلوب');
      return;
    }
    if ((entryType === 'Material Transfer' || entryType === 'Manufacture') && (!fromWh || !toWh)) {
      toast.error('من وإلى مستودع مطلوبان');
      return;
    }
    if (lines.every((l) => !l.item_code)) {
      toast.error('أضف بنوداً');
      return;
    }
    if (lines.some((l) => l.item_code && l.qty <= 0)) {
      toast.error('الكمية يجب أن تكون أكبر من صفر');
      return;
    }
    const doc = buildStockEntry({
      company,
      purpose: entryType,
      posting_date: postingDate,
      from_warehouse: fromWh || undefined,
      to_warehouse: toWh || undefined,
      items: lines
        .filter((l) => l.item_code)
        .map((l) => ({
          item_code: l.item_code,
          qty: l.qty,
          s_warehouse: l.s_warehouse || fromWh || undefined,
          t_warehouse: l.t_warehouse || toWh || undefined,
          basic_rate: l.basic_rate ? Number(l.basic_rate) : undefined}))});
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء حركة المخزون');
        setDialogOpen(false);
        setLines([emptyLine()]);
        void refetch();
      },
      onError: () => toast.error('تعذر الحفظ')});
  };

  const handleUpdate = () => {
    if (!editDocName || !company) return;
    if (!editPostingDate) {
      toast.error('التاريخ مطلوب');
      return;
    }
    const showSrc = editEntryType === 'Material Issue' || editEntryType === 'Material Transfer' || editEntryType === 'Manufacture';
    const showTgt = editEntryType === 'Material Receipt' || editEntryType === 'Material Transfer' || editEntryType === 'Manufacture';
    if (showSrc && !editFromWh) {
      toast.error('مستودع المصدر مطلوب');
      return;
    }
    if (showTgt && !editToWh) {
      toast.error('مستودع الوجهة مطلوب');
      return;
    }
    if (editLines.every((l) => !l.item_code)) {
      toast.error('أضف بنوداً');
      return;
    }
    if (editLines.some((l) => l.item_code && l.qty <= 0)) {
      toast.error('الكمية يجب أن تكون أكبر من صفر');
      return;
    }
    const doc = buildStockEntry({
      company,
      purpose: editEntryType,
      posting_date: editPostingDate,
      from_warehouse: editFromWh || undefined,
      to_warehouse: editToWh || undefined,
      items: editLines
        .filter((l) => l.item_code)
        .map((l) => ({
          item_code: l.item_code,
          qty: l.qty,
          s_warehouse: l.s_warehouse || editFromWh || undefined,
          t_warehouse: l.t_warehouse || editToWh || undefined,
          basic_rate: l.basic_rate ? Number(l.basic_rate) : undefined,
        })),
    });
    // Remove doctype from update payload
    delete (doc as Record<string, unknown>).doctype;
    updateMutation.mutate(
      { name: editDocName, doc },
      {
        onSuccess: () => {
          toast.success('تم تحديث حركة المخزون');
          setEditDialogOpen(false);
          setEditDocName('');
          void refetch();
        },
        onError: () => toast.error('تعذر التحديث'),
      },
    );
  };

  const openEdit = (row: SERow) => {
    const ds = Number(row.docstatus);
    if (ds === 0) {
      setEditDocName(row.name);
      setEditDialogOpen(true);
    } else {
      setViewRow(row);
      setViewDialogOpen(true);
    }
  };

  const columns: Column<SERow>[] = useMemo(
    () => [
      { key: 'name', header: 'الرقم', sortable: true, render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
      { key: 'stock_entry_type', header: 'النوع', render: (v) => {
          const SE_TYPE_LABELS: Record<string, string> = {
            'Material Receipt': 'استلام مواد',
            'Material Issue': 'صرف مواد',
            'Material Transfer': 'تحويل مواد',
            'Material Transfer for Manufacture': 'تحويل مواد للتصنيع',
            'Manufacture': 'تصنيع',
            'Repack': 'إعادة تعبئة',
            'Send to Subcontractor': 'إرسال لمقاول فرعي',
          };
          return <span className="text-xs">{SE_TYPE_LABELS[String(v)] || String(v)}</span>;
        },
      },
      { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => formatDate(String(v)) },
      {
        key: 'total_incoming_value',
        header: 'قيمة',
        render: (_v, row) => {
          const v = Number(row.total_incoming_value ?? row.total_outgoing_value ?? 0);
          return <span className="tabular-nums font-semibold">{formatCurrency(v)}</span>;
        }},
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
                className="h-7 text-xs gap-1"
                disabled={submitMutation.isPending}
                onClick={() =>
                  submitMutation.mutate(row.name, {
                    onSuccess: () => { toast.success('تم الترحيل'); void refetch(); },
                    onError: () => toast.error('تعذر الترحيل')})
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
                className="h-7 text-xs gap-1"
                disabled={cancelMutation.isPending}
                onClick={() =>
                  cancelMutation.mutate(row.name, {
                    onSuccess: () => { toast.success('أُلغي'); void refetch(); },
                    onError: () => toast.error('تعذر')})
                }
              >
                <Undo2 className="h-3 w-3" />
                إلغاء الترحيل
              </Button>
            );
          }
          return '—';
        }},
    ],
    [submitMutation, cancelMutation, toast, refetch]
  );

  const showSource = entryType === 'Material Issue' || entryType === 'Material Transfer' || entryType === 'Manufacture';
  const showTarget = entryType === 'Material Receipt' || entryType === 'Material Transfer' || entryType === 'Manufacture';
  const editShowSource = editEntryType === 'Material Issue' || editEntryType === 'Material Transfer' || editEntryType === 'Manufacture';
  const editShowTarget = editEntryType === 'Material Receipt' || editEntryType === 'Material Transfer' || editEntryType === 'Manufacture';

  return (
    <div className="erp-page-enter space-y-6" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />
      <PageHeader
        title="حركة المخزون"
        description="إدارة إدخالات وإخراجات وتحويلات المخزون مع تتبع حالة الترحيل"
        iconify="solar:transfer-vertical-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المخزون', href: '/inventory' }, { label: 'حركة المخزون' }]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            حركة جديدة
          </Button>
        }
      />

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث بالرقم..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>

        {/* فلاتر متقدمة (قابلة للطي) */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" /> فلاتر متقدمة
                <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            {(dateFrom || dateTo || statusFilter !== 'all' || stockEntryTypeFilter !== 'all' || search) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
            <Label className="text-xs">من تاريخ</Label>
            <Input type="date" dir="ltr" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">إلى تاريخ</Label>
            <Input type="date" dir="ltr" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">النوع</Label>
            <Select value={stockEntryTypeFilter} onValueChange={setStockEntryTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="Material Receipt">استلام</SelectItem>
                <SelectItem value="Material Issue">صرف</SelectItem>
                <SelectItem value="Material Transfer">تحويل</SelectItem>
                <SelectItem value="Material Transfer for Manufacture">تحويل للتصنيع</SelectItem>
                <SelectItem value="Manufacture">تصنيع</SelectItem>
                <SelectItem value="Repack">إعادة تعبئة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">الحالة</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="0">مسودة</SelectItem>
                <SelectItem value="1">مرحّل</SelectItem>
                <SelectItem value="2">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
      <PageShell className="space-y-4" padded={false}>
        <div className="px-4 pt-4">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-muted/35 flex flex-wrap h-auto">
              <TabsTrigger value="all" className="text-xs">الكل</TabsTrigger>
              <TabsTrigger value="Material Receipt" className="text-xs">إدخال</TabsTrigger>
              <TabsTrigger value="Material Issue" className="text-xs">إخراج</TabsTrigger>
              <TabsTrigger value="Material Transfer" className="text-xs">تحويل</TabsTrigger>
              <TabsTrigger value="Manufacture" className="text-xs">تصنيع</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <DataTable data={filtered} columns={columns} searchable loading={isLoading}
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
            <AlertDialogTitle>حذف الحركة؟</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteName) return;
                deleteMutation.mutate(deleteName, {
                  onSuccess: () => { toast.success('تم الحذف'); setDeleteName(null); void refetch(); },
                  onError: () => toast.error('تعذر الحذف')});
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ══════ Create Dialog ══════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
<DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <span>حركة مخزون جديدة</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات الحركة</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">نوع الحركة</Label>
                <Select
                  value={entryType}
                  onValueChange={(v) => {
                    setEntryType(v);
                    setFromWh('');
                    setToWh('');
                    setLines([emptyLine()]);
                  }}
                >
                  <SelectTrigger className="w-full h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Material Receipt">إدخال مواد</SelectItem>
                    <SelectItem value="Material Issue">إخراج مواد</SelectItem>
                    <SelectItem value="Material Transfer">تحويل</SelectItem>
                    <SelectItem value="Manufacture">تصنيع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">التاريخ</Label>
                <Input type="date" dir="ltr" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
              </div>
            </div>
            {showSource && (
              <div className="space-y-2">
                <Label className="text-xs">من مستودع</Label>
                <ErpLinkCombobox doctype="Warehouse" value={fromWh} onChange={setFromWh} />
              </div>
            )}
            {showTarget && (
              <div className="space-y-2">
                <Label className="text-xs">إلى مستودع</Label>
                <ErpLinkCombobox doctype="Warehouse" value={toWh} onChange={setToWh} />
              </div>
            )}
            <div className="border rounded-lg">
              <div className="bg-muted/50 px-3 py-2 flex justify-between">
                <span className="text-xs font-semibold">البنود</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setLines((p) => [...p, emptyLine()])}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">الصنف</TableHead>
                    <TableHead className="text-xs w-20">الكمية</TableHead>
                    {entryType === 'Material Receipt' && <TableHead className="text-xs w-24">تكلفة تقديرية</TableHead>}
                    {entryType === 'Material Issue' && <TableHead className="text-xs">مستودع مصدر (اختياري)</TableHead>}
                    {(entryType === 'Material Transfer' || entryType === 'Manufacture') && (
                      <>
                        <TableHead className="text-xs">من</TableHead>
                        <TableHead className="text-xs">إلى</TableHead>
                      </>
                    )}
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <ErpLinkCombobox doctype="Item" value={line.item_code} onChange={(v) => updateLine(idx, { item_code: v })} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="h-8 text-xs" value={line.qty} onChange={(e) => updateLine(idx, { qty: Math.max(0, Number(e.target.value)) })} />
                      </TableCell>
                      {entryType === 'Material Receipt' && (
                        <TableCell>
                          <Input type="number" className="h-8 text-xs" dir="ltr" value={line.basic_rate} onChange={(e) => updateLine(idx, { basic_rate: e.target.value })} placeholder="0" />
                        </TableCell>
                      )}
                      {entryType === 'Material Issue' && (
                        <TableCell>
                          <ErpLinkCombobox doctype="Warehouse" value={line.s_warehouse} onChange={(v) => updateLine(idx, { s_warehouse: v })} />
                        </TableCell>
                      )}
                      {(entryType === 'Material Transfer' || entryType === 'Manufacture') && (
                        <>
                          <TableCell>
                            <ErpLinkCombobox doctype="Warehouse" value={line.s_warehouse} onChange={(v) => updateLine(idx, { s_warehouse: v })} />
                          </TableCell>
                          <TableCell>
                            <ErpLinkCombobox doctype="Warehouse" value={line.t_warehouse} onChange={(v) => updateLine(idx, { t_warehouse: v })} />
                          </TableCell>
                        </>
                      )}
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
              {createMutation.isPending ? '...' : 'حفظ'}
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
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <span>تعديل حركة المخزون</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">{editDocName}</p>
              </div>
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
                  <Label className="text-xs">نوع الحركة</Label>
                  <Input value={editEntryType} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">التاريخ</Label>
                  <Input type="date" dir="ltr" value={editPostingDate} onChange={(e) => setEditPostingDate(e.target.value)} />
                </div>
              </div>
              {editShowSource && (
                <div className="space-y-2">
                  <Label className="text-xs">من مستودع</Label>
                  <ErpLinkCombobox doctype="Warehouse" value={editFromWh} onChange={setEditFromWh} />
                </div>
              )}
              {editShowTarget && (
                <div className="space-y-2">
                  <Label className="text-xs">إلى مستودع</Label>
                  <ErpLinkCombobox doctype="Warehouse" value={editToWh} onChange={setEditToWh} />
                </div>
              )}
              <div className="border rounded-lg">
                <div className="bg-muted/50 px-3 py-2 flex justify-between">
                  <span className="text-xs font-semibold">البنود</span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditLines((p) => [...p, emptyLine()])}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">الصنف</TableHead>
                      <TableHead className="text-xs w-20">الكمية</TableHead>
                      {editEntryType === 'Material Receipt' && <TableHead className="text-xs w-24">تكلفة تقديرية</TableHead>}
                      {editEntryType === 'Material Issue' && <TableHead className="text-xs">مستودع مصدر (اختياري)</TableHead>}
                      {(editEntryType === 'Material Transfer' || editEntryType === 'Manufacture') && (
                        <>
                          <TableHead className="text-xs">من</TableHead>
                          <TableHead className="text-xs">إلى</TableHead>
                        </>
                      )}
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editLines.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <ErpLinkCombobox doctype="Item" value={line.item_code} onChange={(v) => updateEditLine(idx, { item_code: v })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" className="h-8 text-xs" value={line.qty} onChange={(e) => updateEditLine(idx, { qty: Math.max(0, Number(e.target.value)) })} />
                        </TableCell>
                        {editEntryType === 'Material Receipt' && (
                          <TableCell>
                            <Input type="number" className="h-8 text-xs" dir="ltr" value={line.basic_rate} onChange={(e) => updateEditLine(idx, { basic_rate: e.target.value })} placeholder="0" />
                          </TableCell>
                        )}
                        {editEntryType === 'Material Issue' && (
                          <TableCell>
                            <ErpLinkCombobox doctype="Warehouse" value={line.s_warehouse} onChange={(v) => updateEditLine(idx, { s_warehouse: v })} />
                          </TableCell>
                        )}
                        {(editEntryType === 'Material Transfer' || editEntryType === 'Manufacture') && (
                          <>
                            <TableCell>
                              <ErpLinkCombobox doctype="Warehouse" value={line.s_warehouse} onChange={(v) => updateEditLine(idx, { s_warehouse: v })} />
                            </TableCell>
                            <TableCell>
                              <ErpLinkCombobox doctype="Warehouse" value={line.t_warehouse} onChange={(v) => updateEditLine(idx, { t_warehouse: v })} />
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" className="h-7" onClick={() => editLines.length > 1 && setEditLines((p) => p.filter((_, j) => j !== idx))} disabled={editLines.length === 1}>
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
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-muted-foreground" />
              عرض حركة المخزون
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
                  <span className="text-muted-foreground">النوع</span>
                  <span>{viewRow.stock_entry_type}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">التاريخ</span>
                  <span>{formatDate(viewRow.posting_date)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">قيمة الوارد</span>
                  <span className="tabular-nums">{formatCurrency(Number(viewRow.total_incoming_value ?? 0))}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">قيمة الصادر</span>
                  <span className="tabular-nums">{formatCurrency(Number(viewRow.total_outgoing_value ?? 0))}</span>
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
