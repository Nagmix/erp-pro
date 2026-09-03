'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  RefreshCw,
  Plus,
  Trash2,
  Pause,
  Play,
  Eye,
  Edit,
  CalendarClock,
  FileText,
  PlusCircle,
  MinusCircle,
  XCircle,
  ChevronDown,
  Filter,
  Zap,
  CalendarDays,
  Mail,
  CreditCard,
  Bell,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatCurrency } from '@/lib/core/helpers';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RecurringInvoiceRow {
  name: string;
  customer?: string;
  customer_name?: string;
  grand_total?: number;
  frequency?: string;
  next_schedule_date?: string;
  status?: string;
  last_generated?: string;
  disable?: number | boolean;
  repeat_on_day?: number;
  start_date?: string;
  end_date?: string;
  repeat_count?: number;
  notify_by_email?: number | boolean;
  auto_repeat?: string;
  reference_doctype?: string;
  reference_name?: string;
}

interface InvoiceItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
}

interface GeneratedInvoice {
  name: string;
  customer?: string;
  posting_date?: string;
  grand_total?: number;
  status?: string;
  docstatus?: number;
}

// ─── Frequency map ───────────────────────────────────────────────────────────

const FREQUENCY_MAP: Record<string, string> = {
  Daily: 'يومي',
  Weekly: 'أسبوعي',
  Monthly: 'شهري',
  Quarterly: 'ربع سنوي',
  'Bi-Annual': 'نصف سنوي',
  Yearly: 'سنوي',
};

const FREQUENCY_OPTIONS = [
  { value: 'Daily', label: 'يومي' },
  { value: 'Weekly', label: 'أسبوعي' },
  { value: 'Monthly', label: 'شهري' },
  { value: 'Quarterly', label: 'ربع سنوي' },
  { value: 'Bi-Annual', label: 'نصف سنوي' },
  { value: 'Yearly', label: 'سنوي' },
];

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchRecurringInvoices(): Promise<{ rows: RecurringInvoiceRow[]; capped: boolean }> {
  try {
    const res = await fetch('/api/erpnext/recurring-invoices?fields=' + encodeURIComponent(JSON.stringify(['*'])) + '&limit=500');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'فشل تحميل البيانات');
    const rows: RecurringInvoiceRow[] = json.data || [];
    // QUA-12: كشف الوصول للحد الأعلى بدل الصمت
    return { rows, capped: rows.length >= 500 };
  } catch {
    return { rows: [], capped: false };
  }
}

async function fetchGeneratedInvoices(autoRepeatName: string): Promise<GeneratedInvoice[]> {
  try {
    const filters = JSON.stringify([['auto_repeat', '=', autoRepeatName]]);
    const res = await fetch('/api/data/Sales Invoice?fields=' + encodeURIComponent(JSON.stringify(['name', 'customer', 'posting_date', 'grand_total', 'status', 'docstatus'])) + '&filters=' + encodeURIComponent(filters) + '&limit=50');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'فشل تحميل الفواتير');
    return json.data || [];
  } catch {
    return [];
  }
}

async function createRecurringInvoice(payload: Record<string, unknown>): Promise<unknown> {
  const res = await fetch('/api/erpnext/recurring-invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل الإنشاء');
  return json.data;
}

async function updateRecurringInvoice(name: string, payload: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`/api/erpnext/recurring-invoices/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل التحديث');
  return json.data;
}

async function deleteRecurringInvoice(name: string): Promise<void> {
  const res = await fetch(`/api/erpnext/recurring-invoices/${encodeURIComponent(name)}`, { method: 'DELETE' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل الحذف');
}

async function generateNow(name: string): Promise<unknown> {
  const res = await fetch('/api/erpnext/recurring-invoices/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل التوليد');
  return json.data;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RecurringInvoicesPage() {
  // ── State ──
  const [rows, setRows] = useState<RecurringInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ── Dialog states ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RecurringInvoiceRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringInvoiceRow | null>(null);
  const [viewGeneratedOpen, setViewGeneratedOpen] = useState(false);
  const [generatedInvoices, setGeneratedInvoices] = useState<GeneratedInvoice[]>([]);
  const [generatedLoading, setGeneratedLoading] = useState(false);
  const [generatingName, setGeneratingName] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [creating, setCreating] = useState(false);

  // ── Next generation preview ──
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<RecurringInvoiceRow | null>(null);

  // ── Form state ──
  const [formCustomer, setFormCustomer] = useState('');
  const [formFrequency, setFormFrequency] = useState('Monthly');
  const [formStartDate, setFormStartDate] = useState('');
  const [formRepeatCount, setFormRepeatCount] = useState('');
  const [formInfiniteRepeat, setFormInfiniteRepeat] = useState(true);
  const [formIssueEarlyDays, setFormIssueEarlyDays] = useState('0');
  const [formAutoSendEmail, setFormAutoSendEmail] = useState(false);
  const [formAutoPayCredit, setFormAutoPayCredit] = useState(false);
  const [formShowPeriodDates, setFormShowPeriodDates] = useState(false);
  const [formNotifyBefore, setFormNotifyBefore] = useState(false);
  const [formItems, setFormItems] = useState<InvoiceItem[]>([
    { item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 },
  ]);

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rows: data, capped } = await fetchRecurringInvoices();
      setRows(data);
      // QUA-12: إظهار تحذير عند بلوغ حد الجلب بدل الصمت
      if (capped) {
        toast.info('تم جلب أول 500 سجل فقط', {
          description: 'استخدم الفلاتر لتضييق النطاق — الترقيم الخادمي كامل مُخطط في إصدار قادم',
        });
      }
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ── Helpers ──
  const chk = (v: unknown) => Number(v) === 1 || v === true;

  // ── Filtered data ──
  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter === 'active') result = result.filter((r) => !chk(r.disable));
    if (statusFilter === 'paused') result = result.filter((r) => chk(r.disable));
    if (frequencyFilter !== 'all') result = result.filter((r) => r.frequency === frequencyFilter);
    return result;
  }, [rows, statusFilter, frequencyFilter]);

  // ── KPIs ──
  const totalRecurring = rows.length;
  const activeRecurring = rows.filter((r) => !chk(r.disable)).length;
  const totalMonthlyValue = useMemo(() => {
    return rows
      .filter((r) => !chk(r.disable))
      .reduce((sum, r) => {
        const amt = Number(r.grand_total) || 0;
        const freq = r.frequency || 'Monthly';
        let monthly = amt;
        if (freq === 'Daily') monthly = amt * 30;
        else if (freq === 'Weekly') monthly = amt * 4;
        else if (freq === 'Quarterly') monthly = amt / 3;
        else if (freq === 'Bi-Annual') monthly = amt / 6;
        else if (freq === 'Yearly') monthly = amt / 12;
        return sum + monthly;
      }, 0);
  }, [rows]);
  const nextGenerationCount = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return rows.filter((r) => {
      if (chk(r.disable)) return false;
      if (!r.next_schedule_date) return false;
      const next = new Date(r.next_schedule_date);
      return next >= today && next <= nextWeek;
    }).length;
  }, [rows]);

  // ── Form helpers ──
  const resetForm = () => {
    setFormCustomer('');
    setFormFrequency('Monthly');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormRepeatCount('');
    setFormInfiniteRepeat(true);
    setFormIssueEarlyDays('0');
    setFormAutoSendEmail(false);
    setFormAutoPayCredit(false);
    setFormShowPeriodDates(false);
    setFormNotifyBefore(false);
    setFormItems([{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }]);
    setEditTarget(null);
  };

  const addItemRow = () => {
    setFormItems((prev) => [...prev, { item_code: '', item_name: '', qty: 1, rate: 0, amount: 0 }]);
  };

  const removeItemRow = (idx: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    setFormItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx], [field]: value };
      if (field === 'qty' || field === 'rate') {
        item.amount = (Number(item.qty) || 0) * (Number(item.rate) || 0);
      }
      next[idx] = item;
      return next;
    });
  };

  const totalAmount = useMemo(() => formItems.reduce((s, i) => s + i.amount, 0), [formItems]);

  // ── Open edit dialog ──
  const openEditDialog = (row: RecurringInvoiceRow) => {
    setEditTarget(row);
    setFormCustomer(row.customer || '');
    setFormFrequency(row.frequency || 'Monthly');
    setFormStartDate(row.start_date || '');
    setFormRepeatCount(row.repeat_count ? String(row.repeat_count) : '');
    setFormInfiniteRepeat(!row.repeat_count || Number(row.repeat_count) === 0);
    setFormIssueEarlyDays('0');
    setFormAutoSendEmail(chk(row.notify_by_email));
    setFormAutoPayCredit(false);
    setFormShowPeriodDates(false);
    setFormNotifyBefore(false);
    setFormItems([{ item_code: '', item_name: '', qty: 1, rate: Number(row.grand_total) || 0, amount: Number(row.grand_total) || 0 }]);
    setDialogOpen(true);
  };

  // ── Create/Update handler ──
  const handleSave = async () => {
    if (!formCustomer.trim()) {
      toast.error('يرجى اختيار العميل');
      return;
    }
    if (!formStartDate) {
      toast.error('يرجى تحديد تاريخ أول فاتورة');
      return;
    }
    if (formItems.length === 0 || formItems.every((i) => !i.item_code)) {
      toast.error('يرجى إضافة صنف واحد على الأقل');
      return;
    }

    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        reference_doctype: 'Sales Invoice',
        reference_name: '',
        customer: formCustomer,
        frequency: formFrequency,
        start_date: formStartDate,
        repeat_on_day: 1,
        ...(formInfiniteRepeat ? {} : { repeat_count: Number(formRepeatCount) || 0 }),
        ...(Number(formIssueEarlyDays) > 0 ? { issue_early_days: Number(formIssueEarlyDays) } : {}),
        notify_by_email: formAutoSendEmail ? 1 : 0,
        disable: 0,
      };

      if (editTarget) {
        await updateRecurringInvoice(editTarget.name, payload);
        toast.success('تم تحديث الفاتورة الدورية بنجاح');
      } else {
        await createRecurringInvoice(payload);
        toast.success('تم إنشاء الفاتورة الدورية بنجاح');
      }

      setDialogOpen(false);
      resetForm();
      void loadData();
    } catch (e) {
      toast.error((e as Error).message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setCreating(false);
    }
  };

  // ── Delete handler ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRecurringInvoice(deleteTarget.name);
      toast.success('تم حذف الفاتورة الدورية بنجاح');
      setDeleteTarget(null);
      void loadData();
    } catch (e) {
      toast.error((e as Error).message || 'فشل الحذف');
    }
  };

  // ── Toggle pause/resume ──
  const handleTogglePause = async (row: RecurringInvoiceRow) => {
    const isPaused = chk(row.disable);
    try {
      await updateRecurringInvoice(row.name, { disable: isPaused ? 0 : 1 });
      toast.success(isPaused ? 'تم استئناف الفاتورة الدورية' : 'تم إيقاف الفاتورة الدورية مؤقتاً');
      void loadData();
    } catch (e) {
      toast.error((e as Error).message || 'فشل التحديث');
    }
  };

  // ── Generate now ──
  const handleGenerateNow = async (name: string) => {
    setGeneratingName(name);
    try {
      await generateNow(name);
      toast.success('تم توليد الفاتورة بنجاح');
      void loadData();
    } catch (e) {
      toast.error((e as Error).message || 'فشل توليد الفاتورة');
    } finally {
      setGeneratingName(null);
    }
  };

  // ── View generated invoices ──
  const handleViewGenerated = async (row: RecurringInvoiceRow) => {
    setViewGeneratedOpen(true);
    setGeneratedLoading(true);
    setPreviewData(row);
    try {
      const invoices = await fetchGeneratedInvoices(row.name);
      setGeneratedInvoices(invoices);
    } catch {
      setGeneratedInvoices([]);
    } finally {
      setGeneratedLoading(false);
    }
  };

  // ── Next generation preview ──
  const handlePreview = (row: RecurringInvoiceRow) => {
    setPreviewData(row);
    setPreviewOpen(true);
  };

  // ── Columns ──
  const columns: Column<RecurringInvoiceRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرقم',
        sortable: true,
        width: 'w-36',
        render: (v) => (
          <span className="font-semibold text-primary cursor-pointer hover:underline" onClick={() => handlePreview(v as unknown as RecurringInvoiceRow)}>
            {String(v)}
          </span>
        ),
      },
      {
        key: 'customer',
        header: 'العميل',
        sortable: true,
        render: (v, row) => (
          <span className="font-medium">{String(row.customer_name || v || '—')}</span>
        ),
      },
      {
        key: 'grand_total',
        header: 'المبلغ',
        sortable: true,
        render: (v) => {
          const num = Number(v);
          return Number.isFinite(num) && num > 0 ? (
            <span className="font-semibold tabular-nums text-foreground">{formatCurrency(num)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        key: 'frequency',
        header: 'التكرار',
        render: (v) => {
          const val = String(v || '');
          return (
            <Badge variant="outline" className="text-xs font-medium border-border/40">
              {FREQUENCY_MAP[val] || val || '—'}
            </Badge>
          );
        },
      },
      {
        key: 'next_schedule_date',
        header: 'تاريخ التوليد القادم',
        sortable: true,
        render: (v) => v ? (
          <span className="tabular-nums">{formatDate(String(v))}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      },
      {
        key: 'last_generated',
        header: 'آخر توليد',
        render: (v) => v ? formatDate(String(v)) : '—',
      },
      {
        key: 'disable',
        header: 'الحالة',
        render: (v) =>
          chk(v) ? (
            <Badge variant="outline" className="text-xs font-medium bg-warning/12 text-warning ring-1 ring-inset ring-warning/25 border-0">
              متوقف
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs font-medium bg-success/12 text-success ring-1 ring-inset ring-success/25 border-0">
              نشط
            </Badge>
          ),
      },
      {
        key: '_actions',
        header: 'إجراءات',
        width: 'w-48',
        render: (_v, row) => {
          const isPaused = chk(row.disable);
          const isGenerating = generatingName === row.name;
          return (
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2"
                onClick={() => handleTogglePause(row)}
                title={isPaused ? 'استئناف' : 'إيقاف مؤقت'}
              >
                {isPaused ? <Play className="h-3 w-3 text-success" /> : <Pause className="h-3 w-3 text-warning" />}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-xs px-2 gap-1"
                disabled={isGenerating || isPaused}
                onClick={() => handleGenerateNow(row.name)}
              >
                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                توليد
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2"
                onClick={() => handleViewGenerated(row)}
                title="عرض الفواتير المولّدة"
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2"
                onClick={() => openEditDialog(row)}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={()=> setDeleteTarget(row)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [generatingName],
  );

  const clearFilters = () => {
    setStatusFilter('all');
    setFrequencyFilter('all');
  };
  const hasActiveFilters = statusFilter !== 'all' || frequencyFilter !== 'all';

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      {/* Page Header */}
      <PageHeader
        title="الفواتير الدورية"
        description="إدارة الفواتير المتكررة والتوليد التلقائي — تحديد التكرار والعملاء والأصناف"
        iconify="solar:refresh-circle-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المبيعات', href: '/sales' }, { label: 'الفواتير الدورية' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void loadData()}>
              <RefreshCw className="h-3.5 w-3.5" />
              تحديث
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5" />
              فاتورة دورية جديدة
            </Button>
          </div>
        }
      />

      {/* KPI Strip */}
      {/* Filters */}
      <div className="space-y-3">
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" /> فلاتر
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
                <Label className="text-xs">الحالة</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'paused')}>
                  <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="paused">متوقفة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">التكرار</Label>
                <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                  <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {FREQUENCY_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Data Table */}
      <DataTable
        data={filtered}
        columns={columns}
        searchable
        loading={loading}
        error={error}
        onRetry={() => void loadData()}
        tableId="sales-recurring-invoices"
        exportFileName="recurring-invoices.csv"
        printTitle="الفواتير الدورية"
      />

      {/* ─── Create/Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <span>{editTarget ? 'تعديل فاتورة دورية' : 'فاتورة دورية جديدة'}</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  {editTarget ? 'تعديل إعدادات الفاتورة الدورية' : 'إعداد فاتورة تتكرر تلقائياً للعميل'}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* البيانات الأساسية */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70">البيانات الأساسية</h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">العميل <span className="text-destructive text-xs">*</span></Label>
                    <ErpLinkCombobox
                      doctype="Customer"
                      value={formCustomer}
                      onChange={setFormCustomer}
                      placeholder="اختر العميل"
                      displayKey="customer_name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">التكرار <span className="text-destructive text-xs">*</span></Label>
                    <Select value={formFrequency} onValueChange={setFormFrequency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">تاريخ أول فاتورة <span className="text-destructive text-xs">*</span></Label>
                    <Input type="date" dir="ltr" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">عدد مرات التكرار</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        dir="ltr"
                        min={0}
                        value={formRepeatCount}
                        onChange={(e) => setFormRepeatCount(e.target.value)}
                        disabled={formInfiniteRepeat}
                        placeholder="عدد المرات"
                        className="flex-1"
                      />
                      <label className="flex items-center gap-2 cursor-pointer text-xs whitespace-nowrap">
                        <Switch checked={formInfiniteRepeat} onCheckedChange={setFormInfiniteRepeat} />
                        بلا حدود
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">إصدار مبكر (أيام قبل الاستحقاق)</Label>
                    <Input
                      type="number"
                      dir="ltr"
                      min={0}
                      value={formIssueEarlyDays}
                      onChange={(e) => setFormIssueEarlyDays(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">إشعار قبل التوليد</Label>
                    <div className="flex items-center gap-2 h-9">
                      <Switch checked={formNotifyBefore} onCheckedChange={setFormNotifyBefore} />
                      <span className="text-xs text-muted-foreground">{formNotifyBefore ? 'مفعّل' : 'معطّل'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* الأصناف */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <h4 className="text-[12px] font-bold text-foreground/70">الأصناف</h4>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addItemRow}>
                    <PlusCircle className="h-3.5 w-3.5" />
                    إضافة صنف
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-card/50">
                <div className="rounded-xl border border-border/30 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-[11px] font-semibold w-48">الصنف</TableHead>
                        <TableHead className="text-[11px] font-semibold w-24">الكمية</TableHead>
                        <TableHead className="text-[11px] font-semibold w-28">السعر</TableHead>
                        <TableHead className="text-[11px] font-semibold w-28">الإجمالي</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formItems.map((item, idx) => (
                        <TableRow key={idx} className="border-b border-border/20">
                          <TableCell className="p-2">
                            <ErpLinkCombobox
                              doctype="Item"
                              value={item.item_code}
                              onChange={(val) => {
                                updateItem(idx, 'item_code', val);
                                updateItem(idx, 'item_name', val);
                              }}
                              placeholder="اختر الصنف"
                              displayKey="item_name"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              type="number"
                              dir="ltr"
                              min={1}
                              value={item.qty}
                              onChange={(e) => updateItem(idx, 'qty', Number(e.target.value) || 0)}
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              type="number"
                              dir="ltr"
                              min={0}
                              step="0.01"
                              value={item.rate}
                              onChange={(e) => updateItem(idx, 'rate', Number(e.target.value) || 0)}
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <span className="text-xs font-semibold tabular-nums">{formatCurrency(item.amount)}</span>
                          </TableCell>
                          <TableCell className="p-2">
                            {formItems.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => removeItemRow(idx)}
                              >
                                <MinusCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between mt-3 px-1">
                  <span className="text-xs text-muted-foreground">{formItems.length} صنف</span>
                  <span className="text-sm font-bold tabular-nums">الإجمالي: {formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </fieldset>

            {/* الخيارات المتقدمة */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70">خيارات متقدمة</h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/30 bg-background/50">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-info" />
                      <div>
                        <Label className="text-sm font-medium">إرسال بريد تلقائي</Label>
                        <p className="text-xs text-muted-foreground">إرسال الفاتورة بالبريد عند التوليد</p>
                      </div>
                    </div>
                    <Switch checked={formAutoSendEmail} onCheckedChange={setFormAutoSendEmail} />
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/30 bg-background/50">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-warning" />
                      <div>
                        <Label className="text-sm font-medium">دفع تلقائي من الرصيد</Label>
                        <p className="text-xs text-muted-foreground">خصم من رصيد العميل الدائن</p>
                      </div>
                    </div>
                    <Switch checked={formAutoPayCredit} onCheckedChange={setFormAutoPayCredit} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/30 bg-background/50">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-success" />
                      <div>
                        <Label className="text-sm font-medium">عرض فترة الفاتورة</Label>
                        <p className="text-xs text-muted-foreground">إظهار تواريخ البداية والنهاية</p>
                      </div>
                    </div>
                    <Switch checked={formShowPeriodDates} onCheckedChange={setFormShowPeriodDates} />
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/30 bg-background/50">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-destructive" />
                      <div>
                        <Label className="text-sm font-medium">إشعار قبل التوليد</Label>
                        <p className="text-xs text-muted-foreground">تنبيه قبل إنشاء الفاتورة</p>
                      </div>
                    </div>
                    <Switch checked={formNotifyBefore} onCheckedChange={setFormNotifyBefore} />
                  </div>
                </div>
              </div>
            </fieldset>
          </div>

          {/* Dialog footer */}
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); resetForm(); }} className="text-muted-foreground">
              إلغاء
            </Button>
            <Button disabled={creating} onClick={handleSave} className="gap-1.5 min-w-[130px]">
              {creating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  جاري الحفظ...
                </>
              ) : editTarget ? 'حفظ التعديلات' : 'إنشاء الفاتورة الدورية'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الفاتورة الدورية &quot;{deleteTarget?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء وسيتم إيقاف التوليد التلقائي.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── View Generated Invoices Dialog ──────────────────────────────── */}
      <Dialog open={viewGeneratedOpen} onOpenChange={setViewGeneratedOpen}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <span>الفواتير المولّدة</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  الفواتير الناتجة من الفاتورة الدورية: {previewData?.name}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {generatedLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : generatedInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-9 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">لا توجد فواتير مولّدة بعد</p>
              <p className="text-xs text-muted-foreground mt-1">سيتم عرض الفواتير هنا عند توليدها تلقائياً أو يدوياً</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/40 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-[11px] font-semibold">رقم الفاتورة</TableHead>
                    <TableHead className="text-[11px] font-semibold">العميل</TableHead>
                    <TableHead className="text-[11px] font-semibold">التاريخ</TableHead>
                    <TableHead className="text-[11px] font-semibold">المبلغ</TableHead>
                    <TableHead className="text-[11px] font-semibold">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedInvoices.map((inv) => (
                    <TableRow key={inv.name} className="border-b border-border/20">
                      <TableCell className="text-xs font-medium text-primary">{inv.name}</TableCell>
                      <TableCell className="text-xs">{inv.customer || '—'}</TableCell>
                      <TableCell className="text-xs tabular-nums">{inv.posting_date ? formatDate(inv.posting_date) : '—'}</TableCell>
                      <TableCell className="text-xs font-semibold tabular-nums">{Number(inv.grand_total) ? formatCurrency(Number(inv.grand_total)) : '—'}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-xs">
                          {inv.docstatus === 1 ? 'مُقدّم' : inv.docstatus === 2 ? 'ملغي' : 'مسودة'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button variant="ghost" onClick={() => setViewGeneratedOpen(false)}>إغلاق</Button>
            {previewData && !chk(previewData.disable) && (
              <Button
                className="gap-1.5"
                onClick={() => { handleGenerateNow(previewData.name); setViewGeneratedOpen(false); }}
                disabled={generatingName === previewData?.name}
              >
                {generatingName === previewData?.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                توليد فاتورة الآن
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Next Generation Preview Dialog ──────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <CalendarClock className="h-5 w-5" />
              </div>
              <span>معاينة التوليد القادم</span>
            </DialogTitle>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4 mt-2">
              <div className="rounded-xl border border-border/40 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">الرقم</span>
                  <span className="font-semibold text-primary">{previewData.name}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">العميل</span>
                  <span className="font-medium">{previewData.customer_name || previewData.customer || '—'}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">المبلغ</span>
                  <span className="font-bold tabular-nums">{Number(previewData.grand_total) ? formatCurrency(Number(previewData.grand_total)) : '—'}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">التكرار</span>
                  <Badge variant="outline" className="text-xs">{FREQUENCY_MAP[previewData.frequency || ''] || previewData.frequency || '—'}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">تاريخ التوليد القادم</span>
                  <span className="font-semibold tabular-nums text-info">
                    {previewData.next_schedule_date ? formatDate(previewData.next_schedule_date) : '—'}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">آخر توليد</span>
                  <span className="tabular-nums">{previewData.last_generated ? formatDate(previewData.last_generated) : 'لم يولّد بعد'}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">الحالة</span>
                  {chk(previewData.disable) ? (
                    <Badge variant="outline" className="text-xs bg-warning/12 text-warning border-0">متوقف</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-success/12 text-success border-0">نشط</Badge>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-info/30 bg-info/5 p-3">
                <div className="flex items-start gap-2">
                  <Bell className="h-4 w-4 text-info shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-info">توليد تلقائي</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {chk(previewData.disable)
                        ? 'الفاتورة متوقفة حالياً ولن يتم توليدها تلقائياً حتى يتم استئنافها.'
                        : previewData.next_schedule_date
                          ? `سيتم توليد الفاتورة القادمة في ${formatDate(previewData.next_schedule_date)}`
                          : 'لا يوجد جدول توليد محدد بعد.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>إغلاق</Button>
            {previewData && !chk(previewData.disable) && (
              <Button
                className="gap-1.5"
                onClick={() => { handleGenerateNow(previewData.name); setPreviewOpen(false); }}
                disabled={generatingName === previewData?.name}
              >
                {generatingName === previewData?.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                توليد الآن
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
