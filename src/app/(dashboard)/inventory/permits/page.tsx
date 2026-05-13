'use client';

import { useMemo, useState, useCallback } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ClipboardList,
  Plus,
  Trash2,
  Send,
  Undo2,
  CheckCircle2,
  XCircle,
  Filter,
  ChevronDown,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  Printer,
  Eye,
  Link2,
  Warehouse,
  AlertTriangle,
  Ban,
  BookOpen,
  Receipt,
  Settings2,
} from 'lucide-react';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PermitRow {
  name: string;
  permit_type?: string;
  stock_entry_type?: string;
  reference_invoice?: string;
  reference_doctype?: string;
  warehouse?: string;
  from_warehouse?: string;
  to_warehouse?: string;
  status?: string;
  docstatus: number;
  posting_date: string;
  total_outgoing_value?: number;
  total_incoming_value?: number;
  items?: PermitItemRow[];
  remarks?: string;
  auto_create_on_invoice?: number | boolean;
  creation?: string;
}

interface PermitItemRow {
  item_code: string;
  qty: number;
  basic_rate: string;
  s_warehouse?: string;
  t_warehouse?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DOCTYPE = 'Stock Entry';

const PERMIT_TYPE_MAP: Record<string, string> = {
  outbound: 'إذن صرف',
  inbound: 'إذن إضافة',
};

const PERMIT_TYPE_REVERSE: Record<string, string> = {
  'إذن صرف': 'outbound',
  'إذن إضافة': 'inbound',
};

const STOCK_ENTRY_TYPE_MAP: Record<string, string> = {
  outbound: 'Material Issue',
  inbound: 'Material Receipt',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  draft: 'مسودة',
  pending: 'بانتظار الاعتماد',
  approved: 'معتمد',
  confirmed: 'مؤكد',
  cancelled: 'ملغي',
};

interface LineItem {
  item_code: string;
  qty: number;
  basic_rate: string;
  total: number;
}

const emptyLine = (): LineItem => ({
  item_code: '',
  qty: 1,
  basic_rate: '',
  total: 0,
});

// ─── Main Component ─────────────────────────────────────────────────────────

export default function InventoryPermitsPage() {
  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();

  // ── State ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<PermitRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PermitRow | null>(null);
  const [permitType, setPermitType] = useState<'outbound' | 'inbound'>('outbound');
  const [referenceDoctype, setReferenceDoctype] = useState<string>('');
  const [referenceInvoice, setReferenceInvoice] = useState<string>('');
  const [warehouse, setWarehouse] = useState<string>('');
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [autoCreateOnInvoice, setAutoCreateOnInvoice] = useState(false);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  // ── Filters ──
  const [typeFilter, setTypeFilter] = useState<'all' | 'outbound' | 'inbound'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | '0' | '1' | '2'>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Data ──
  const { data, isLoading, isError, error, refetch } = useDocList<PermitRow>(DOCTYPE, {
    fields: [
      'name',
      'stock_entry_type',
      'posting_date',
      'total_outgoing_value',
      'total_incoming_value',
      'docstatus',
      'from_warehouse',
      'to_warehouse',
      'remarks',
    ],
    order_by: 'posting_date desc',
    limit: 500,
  });

  const createMutation = useCreateDoc<PermitRow>(DOCTYPE);
  const submitMutation = useSubmitDoc<PermitRow>(DOCTYPE);
  const cancelMutation = useCancelDoc<PermitRow>(DOCTYPE);
  const deleteMutation = useDeleteDoc(DOCTYPE);

  const rows = data || [];

  // ── Derive permit type from stock_entry_type ──
  const getPermitType = useCallback((row: PermitRow): string => {
    const seType = row.stock_entry_type || '';
    if (seType === 'Material Issue') return 'outbound';
    if (seType === 'Material Receipt') return 'inbound';
    if (seType === 'Material Transfer') return 'transfer';
    return 'other';
  }, []);

  // ── Filtered Data ──
  const filtered = useMemo(() => {
    let result = rows;
    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((r) => getPermitType(r) === typeFilter);
    }
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((r) => String(r.docstatus) === statusFilter);
    }
    // Warehouse filter
    if (warehouseFilter !== 'all') {
      result = result.filter(
        (r) => r.from_warehouse === warehouseFilter || r.to_warehouse === warehouseFilter
      );
    }
    // Date range filter
    if (dateFrom) {
      result = result.filter((r) => r.posting_date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((r) => r.posting_date <= dateTo);
    }
    return result;
  }, [rows, typeFilter, statusFilter, warehouseFilter, dateFrom, dateTo, getPermitType]);

  // ── KPIs ──
  const totalPermits = rows.length;
  const pendingApproval = rows.filter((r) => Number(r.docstatus) === 0).length;
  const confirmedPermits = rows.filter((r) => Number(r.docstatus) === 1).length;
  const totalValue = rows.reduce((sum, r) => {
    const val = Number(r.total_incoming_value ?? r.total_outgoing_value ?? 0);
    return sum + val;
  }, 0);

  // ── Line Items ──
  const updateLine = useCallback((i: number, patch: Partial<LineItem>) => {
    setLines((prev) => {
      const n = [...prev];
      const current = n[i]!;
      const updated = { ...current, ...patch };
      // Recalculate total
      const qty = Number(updated.qty) || 0;
      const rate = Number(updated.basic_rate) || 0;
      updated.total = qty * rate;
      n[i] = updated;
      return n;
    });
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine()]);
  }, []);

  const removeLine = useCallback((i: number) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, j) => j !== i);
    });
  }, []);

  const linesTotal = useMemo(() => {
    return lines.reduce((sum, l) => sum + l.total, 0);
  }, [lines]);

  // ── Reset Form ──
  const resetForm = useCallback(() => {
    setPermitType('outbound');
    setReferenceDoctype('');
    setReferenceInvoice('');
    setWarehouse('');
    setPostingDate(new Date().toISOString().split('T')[0]!);
    setAutoCreateOnInvoice(false);
    setNotes('');
    setLines([emptyLine()]);
  }, []);

  // ── Create Handler ──
  const handleCreate = useCallback(async () => {
    if (!defaultCompany) {
      toast.error('تعذر تحديد الشركة');
      return;
    }
    if (!warehouse) {
      toast.error('يرجى اختيار المستودع');
      return;
    }
    if (lines.every((l) => !l.item_code)) {
      toast.error('يرجى إضافة بنود للإذن');
      return;
    }

    const stockEntryType = STOCK_ENTRY_TYPE_MAP[permitType];
    if (!stockEntryType) {
      toast.error('نوع الإذن غير صالح');
      return;
    }

    const doc: Record<string, unknown> = {
      doctype: DOCTYPE,
      company: defaultCompany,
      stock_entry_type: stockEntryType,
      posting_date: postingDate,
      remarks: notes.trim() || undefined,
      items: lines
        .filter((l) => l.item_code)
        .map((l) => ({
          item_code: l.item_code,
          qty: l.qty,
          s_warehouse: permitType === 'outbound' ? warehouse : undefined,
          t_warehouse: permitType === 'inbound' ? warehouse : undefined,
          basic_rate: l.basic_rate ? Number(l.basic_rate) : undefined,
        })),
    };

    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء الإذن المخزني بنجاح');
        setDialogOpen(false);
        resetForm();
        void refetch();
      },
      onError: (e) => {
        toast.error('تعذر إنشاء الإذن المخزني', { description: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' });
      },
    });
  }, [defaultCompany, warehouse, lines, permitType, postingDate, notes, createMutation, refetch, resetForm, toast]);

  // ── Submit (Confirm) Handler ──
  const handleConfirm = useCallback(
    (row: PermitRow) => {
      submitMutation.mutate(row.name, {
        onSuccess: () => {
          toast.success('تم تأكيد الإذن المخزني وترحيله بنجاح');
          void refetch();
        },
        onError: () => toast.error('تعذر تأكيد الإذن المخزني'),
      });
    },
    [submitMutation, refetch, toast]
  );

  // ── Cancel Handler ──
  const handleCancel = useCallback(
    (row: PermitRow) => {
      cancelMutation.mutate(row.name, {
        onSuccess: () => {
          toast.success('تم إلغاء الإذن المخزني');
          void refetch();
        },
        onError: () => toast.error('تعذر إلغاء الإذن المخزني'),
      });
    },
    [cancelMutation, refetch, toast]
  );

  // ── View Handler ──
  const handleView = useCallback((row: PermitRow) => {
    setViewTarget(row);
    setViewDialogOpen(true);
  }, []);

  // ── Print Handler ──
  const handlePrint = useCallback((row: PermitRow) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const permitTypeLabel = PERMIT_TYPE_MAP[getPermitType(row)] || row.stock_entry_type || 'إذن';
    const itemsHtml = ''; // Items would need a separate fetch
    w.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <title>${permitTypeLabel} - ${row.name}</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 12px; padding: 20px; direction: rtl; }
    h1 { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; font-size: 11px; }
    th { background: #f5f5f5; font-weight: 600; }
    .header-info { display: flex; justify-content: space-between; margin: 12px 0; }
    .info-box { background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; padding: 8px 12px; }
    .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 10px; color: #666; }
  </style>
</head>
<body>
  <h1>${permitTypeLabel}</h1>
  <div class="header-info">
    <div class="info-box">
      <strong>رقم الإذن:</strong> ${row.name}<br>
      <strong>التاريخ:</strong> ${formatDate(row.posting_date)}<br>
      <strong>النوع:</strong> ${permitTypeLabel}
    </div>
    <div class="info-box">
      <strong>المستودع:</strong> ${row.from_warehouse || row.to_warehouse || '—'}<br>
      <strong>الحالة:</strong> ${Number(row.docstatus) === 0 ? 'مسودة' : Number(row.docstatus) === 1 ? 'مؤكد' : 'ملغي'}<br>
      <strong>إجمالي القيمة:</strong> ${formatCurrency(Number(row.total_incoming_value ?? row.total_outgoing_value ?? 0))}
    </div>
  </div>
  ${row.remarks ? `<p><strong>ملاحظات:</strong> ${row.remarks}</p>` : ''}
  ${itemsHtml}
  <div class="footer">
    <p>تم الطباعة بتاريخ ${new Date().toLocaleDateString('en-US')} — نظام ERP Pro</p>
  </div>
</body>
</html>`);
    w.document.close();
    w.focus();
    w.print();
  }, [getPermitType]);

  // ── Delete Handler ──
  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.name, {
      onSuccess: () => {
        toast.success('تم حذف الإذن المخزني بنجاح');
        setDeleteTarget(null);
        void refetch();
      },
      onError: () => toast.error('تعذر حذف الإذن المخزني'),
    });
  }, [deleteTarget, deleteMutation, refetch, toast]);

  // ── Clear Filters ──
  const clearFilters = useCallback(() => {
    setTypeFilter('all');
    setStatusFilter('all');
    setWarehouseFilter('all');
    setDateFrom('');
    setDateTo('');
  }, []);

  const hasActiveFilters =
    typeFilter !== 'all' || statusFilter !== 'all' || warehouseFilter !== 'all' || dateFrom !== '' || dateTo !== '';

  // ── Columns ──
  const columns: Column<PermitRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'رقم الإذن',
        sortable: true,
        width: 'w-32',
        render: (v) => <span className="font-medium text-primary">{String(v)}</span>,
      },
      {
        key: 'stock_entry_type',
        header: 'النوع',
        render: (v, row) => {
          const pType = getPermitType(row);
          const label = PERMIT_TYPE_MAP[pType] || String(v || '—');
          const isInbound = pType === 'inbound';
          return (
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-medium gap-1',
                isInbound
                  ? 'border-primary/30 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400'
                  : 'border-chart-2/30 text-amber-700 dark:border-amber-700 dark:text-amber-400'
              )}
            >
              {isInbound ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
              {label}
            </Badge>
          );
        },
      },
      {
        key: 'reference_invoice',
        header: 'الفاتورة المرجعية',
        render: (_v, row) => {
          // This would be a custom field in a real implementation
          return <span className="text-xs text-muted-foreground">—</span>;
        },
      },
      {
        key: 'warehouse',
        header: 'المستودع',
        render: (_v, row) => {
          const wh = row.from_warehouse || row.to_warehouse;
          return wh ? (
            <span className="flex items-center gap-1 text-xs">
              <Warehouse className="h-3 w-3 text-muted-foreground" />
              {String(wh)}
            </span>
          ) : (
            '—'
          );
        },
      },
      {
        key: 'docstatus',
        header: 'الحالة',
        render: (v, row) => {
          const ds = Number(row.docstatus) as 0 | 1 | 2;
          return <DocStatusBadge docstatus={ds} />;
        },
      },
      {
        key: 'posting_date',
        header: 'التاريخ',
        sortable: true,
        render: (v) => formatDate(String(v)),
      },
      {
        key: 'total_value',
        header: 'إجمالي القيمة',
        render: (_v, row) => {
          const val = Number(row.total_incoming_value ?? row.total_outgoing_value ?? 0);
          return (
            <span className="font-semibold tabular-nums">{formatCurrency(val)}</span>
          );
        },
      },
      {
        key: '_actions',
        header: 'إجراءات',
        width: 'w-52',
        render: (_v, row) => {
          const ds = Number(row.docstatus);
          return (
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2"
                onClick={() => handleView(row)}
              >
                <Eye className="h-3 w-3" />
                عرض
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2"
                onClick={() => handlePrint(row)}
              >
                <Printer className="h-3 w-3" />
                طباعة
              </Button>
              {ds === 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs px-2"
                  disabled={submitMutation.isPending}
                  onClick={() => handleConfirm(row)}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  تأكيد
                </Button>
              )}
              {ds === 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2 text-amber-600"
                  disabled={cancelMutation.isPending}
                  onClick={() => handleCancel(row)}
                >
                  <Undo2 className="h-3 w-3" />
                  إلغاء
                </Button>
              )}
              {ds === 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => setDeleteTarget(row)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [getPermitType, handleView, handlePrint, handleConfirm, handleCancel, submitMutation.isPending, cancelMutation.isPending]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      {/* ── Page Header ── */}
      <PageHeader
        title="الأذون المخزنية"
        description="إدارة أذونات الصرف والإضافة المخزنية — تتبع حركة البضائع وربطها بالفواتير"
        iconify="solar:clipboard-list-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المخزون', href: '/inventory' }, { label: 'الأذون المخزنية' }]}
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            disabled={coLoading}
            onClick={() => { resetForm(); setDialogOpen(true); }}
          >
            <Plus className="h-3.5 w-3.5" />
            إذن مخزني جديد
          </Button>
        }
      />

      {/* ── KPI Strip ── */}
      {/* ── Filters ── */}
      <div className="space-y-3">
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" /> فلاتر متقدمة
                <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <XCircle className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
                <Label className="text-xs">نوع الإذن</Label>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="outbound">إذن صرف</SelectItem>
                    <SelectItem value="inbound">إذن إضافة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الحالة</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="h-8 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="0">مسودة</SelectItem>
                    <SelectItem value="1">مرحّل</SelectItem>
                    <SelectItem value="2">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">المستودع</Label>
                <ErpLinkCombobox
                  doctype="Warehouse"
                  value={warehouseFilter === 'all' ? '' : warehouseFilter}
                  onChange={(v) => setWarehouseFilter(v || 'all')}
                  placeholder="جميع المستودعات"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">من تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إلى تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ── Data Table ── */}
      <DataTable
        data={filtered}
        columns={columns}
        searchable
        loading={isLoading}
        tableId="inventory-permits"
        exportFileName="inventory-permits.csv"
        printTitle="الأذون المخزنية"
      />

      {/* ── Create Permit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <span>إذن مخزني جديد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  إنشاء إذن صرف أو إضافة مخزني
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* ── البيانات الأساسية ── */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" />
                  بيانات الإذن
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">نوع الإذن <span className="text-destructive text-xs">*</span></Label>
                    <Select value={permitType} onValueChange={(v) => setPermitType(v as 'outbound' | 'inbound')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outbound">
                          <span className="flex items-center gap-1.5">
                            <ArrowUpFromLine className="h-3.5 w-3.5 text-amber-600" />
                            إذن صرف
                          </span>
                        </SelectItem>
                        <SelectItem value="inbound">
                          <span className="flex items-center gap-1.5">
                            <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" />
                            إذن إضافة
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {permitType === 'outbound'
                        ? 'إذن الصرف: يُستخدم لإخراج بضائع من المستودع'
                        : 'إذن الإضافة: يُستخدم لإدخال بضائع إلى المستودع'}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">التاريخ</Label>
                    <Input
                      type="date"
                      dir="ltr"
                      value={postingDate}
                      onChange={(e) => setPostingDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Warehouse className="h-3.5 w-3.5" />
                      المستودع <span className="text-destructive text-xs">*</span>
                    </Label>
                    <ErpLinkCombobox
                      doctype="Warehouse"
                      value={warehouse}
                      onChange={setWarehouse}
                      placeholder="اختر المستودع"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5" />
                      الفاتورة المرجعية
                    </Label>
                    <Select value={referenceDoctype} onValueChange={(v) => { setReferenceDoctype(v); setReferenceInvoice(''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الفاتورة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sales Invoice">فاتورة مبيعات</SelectItem>
                        <SelectItem value="Purchase Invoice">فاتورة مشتريات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {referenceDoctype && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">رقم الفاتورة</Label>
                    <ErpLinkCombobox
                      doctype={referenceDoctype}
                      value={referenceInvoice}
                      onChange={setReferenceInvoice}
                      placeholder="اختر الفاتورة"
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-muted/30">
                  <Switch
                    checked={autoCreateOnInvoice}
                    onCheckedChange={setAutoCreateOnInvoice}
                  />
                  <div>
                    <Label className="text-sm font-medium">إنشاء تلقائي عند الفاتورة</Label>
                    <p className="text-xs text-muted-foreground">
                      يتم إنشاء الإذن تلقائياً عند تأكيد الفاتورة المرتبطة
                    </p>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* ── بنود الإذن ── */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" />
                    بنود الإذن
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1"
                    onClick={addLine}
                  >
                    <Plus className="h-3 w-3" />
                    إضافة بند
                  </Button>
                </div>
              </div>
              <div className="bg-card/50">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-semibold">الصنف</TableHead>
                        <TableHead className="text-xs font-semibold w-24">الكمية</TableHead>
                        <TableHead className="text-xs font-semibold w-32">تكلفة الوحدة</TableHead>
                        <TableHead className="text-xs font-semibold w-32">الإجمالي</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <ErpLinkCombobox
                              doctype="Item"
                              value={line.item_code}
                              onChange={(v) => updateLine(idx, { item_code: v })}
                              placeholder="اختر الصنف"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              className="h-8 text-xs"
                              value={line.qty}
                              onChange={(e) => updateLine(idx, { qty: Math.max(0, Number(e.target.value)) })}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              dir="ltr"
                              min={0}
                              step="0.01"
                              className="h-8 text-xs text-right"
                              value={line.basic_rate}
                              onChange={(e) => updateLine(idx, { basic_rate: e.target.value })}
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold tabular-nums text-sm">
                              {formatCurrency(line.total)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => removeLine(idx)}
                              disabled={lines.length === 1}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* ── Total Row ── */}
                <div className="flex items-center justify-between border-t border-border/40 px-4 py-3 bg-muted/30">
                  <span className="text-sm font-semibold">إجمالي الإذن</span>
                  <span className="text-lg font-bold tabular-nums">{formatCurrency(linesTotal)}</span>
                </div>
              </div>
            </fieldset>

            {/* ── ملاحظات ── */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-muted/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  ملاحظات
                </h4>
              </div>
              <div className="p-4 bg-card/50">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات إضافية حول الإذن المخزني..."
                  rows={3}
                  className="text-sm"
                />
              </div>
            </fieldset>

            {/* ── Info Note ── */}
            <div className="rounded-lg border border-info/30 bg-info/5 p-3">
              <div className="flex items-start gap-2">
                <BookOpen className="h-4 w-4 text-info mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">ملاحظة:</span> عند تأكيد الإذن المخزني،
                  يتم تحديث المخزون تلقائياً ويُنشأ قيد يومية محاسبي يسجّل الحركة المالية.
                  لا يمكن تعديل الإذن بعد التأكيد — يمكنك فقط إلغاؤه.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setDialogOpen(false); resetForm(); }}
              className="text-muted-foreground"
            >
              إلغاء
            </Button>
            <Button
              disabled={createMutation.isPending}
              onClick={handleCreate}
              className="gap-1.5 min-w-[130px]"
            >
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإذن'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Permit Dialog ── */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <span>تفاصيل الإذن المخزني</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  عرض بيانات الإذن رقم {viewTarget?.name}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {viewTarget && (
            <div className="space-y-4 mt-2">
              {/* ── Permit Info Grid ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">رقم الإذن</p>
                  <p className="text-sm font-semibold text-primary">{viewTarget.name}</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">النوع</p>
                  <div className="flex items-center gap-1.5">
                    {getPermitType(viewTarget) === 'inbound' ? (
                      <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpFromLine className="h-3.5 w-3.5 text-amber-600" />
                    )}
                    <p className="text-sm font-semibold">
                      {PERMIT_TYPE_MAP[getPermitType(viewTarget)] || viewTarget.stock_entry_type || '—'}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">الحالة</p>
                  <DocStatusBadge docstatus={Number(viewTarget.docstatus) as 0 | 1 | 2} />
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">التاريخ</p>
                  <p className="text-sm font-semibold">{formatDate(viewTarget.posting_date)}</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">المستودع</p>
                  <p className="text-sm font-semibold">
                    {viewTarget.from_warehouse || viewTarget.to_warehouse || '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">إجمالي القيمة</p>
                  <p className="text-sm font-bold tabular-nums">
                    {formatCurrency(Number(viewTarget.total_incoming_value ?? viewTarget.total_outgoing_value ?? 0))}
                  </p>
                </div>
              </div>

              {/* ── Remarks ── */}
              {viewTarget.remarks && (
                <div className="rounded-lg border border-border/40 p-3">
                  <p className="text-xs text-muted-foreground mb-1">ملاحظات</p>
                  <p className="text-sm">{viewTarget.remarks}</p>
                </div>
              )}

              {/* ── Accounting Info ── */}
              <div className="rounded-lg border border-info/30 bg-info/5 p-3">
                <div className="flex items-start gap-2">
                  <Receipt className="h-4 w-4 text-info mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">القيد المحاسبي:</span>{' '}
                    {Number(viewTarget.docstatus) === 1
                      ? 'تم إنشاء قيد يومية تلقائياً عند تأكيد هذا الإذن. يمكنك الاطلاع عليه من سجل القيود.'
                      : 'سيتم إنشاء قيد يومية تلقائياً عند تأكيد هذا الإذن.'}
                  </div>
                </div>
              </div>

              {/* ── Actions ── */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handlePrint(viewTarget)}
                >
                  <Printer className="h-3.5 w-3.5" />
                  طباعة الإذن
                </Button>
                {Number(viewTarget.docstatus) === 0 && (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={submitMutation.isPending}
                    onClick={() => {
                      handleConfirm(viewTarget);
                      setViewDialogOpen(false);
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    تأكيد الإذن
                  </Button>
                )}
                {Number(viewTarget.docstatus) === 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-chart-2 border-chart-2/30 hover:bg-chart-2/5"
                    disabled={cancelMutation.isPending}
                    onClick={() => {
                      handleCancel(viewTarget);
                      setViewDialogOpen(false);
                    }}
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    إلغاء الترحيل
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الإذن المخزني &quot;{deleteTarget?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
              يمكنك فقط حذف الأذون في حالة المسودة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              variant="destructive"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
