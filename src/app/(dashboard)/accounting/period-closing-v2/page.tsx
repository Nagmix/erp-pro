'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  useDocList,
  useCreateDoc,
  useSubmitDoc,
  useCancelDoc,
  useDeleteDoc,
} from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { formatDate, formatNumber } from '@/lib/core/helpers';
import { buildPeriodClosingVoucher } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Info,
  AlertTriangle,
  FileCheck,
  FileX2,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  CalendarDays,
  CalendarRange,
  Calendar,
  Lock,
  Unlock,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Save,
  SendHorizonal,
  Trash2,
  Settings,
  Eye,
  RotateCcw,
  CircleDot,
  CircleCheck,
  CircleX,
  Circle,
  Flag,
  BookOpen,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  CalendarClock,
  CalendarCheck,
  Archive,
  Building,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
type PcvRow = {
  name: string;
  company: string;
  fiscal_year: string;
  transaction_date: string;
  period_start_date: string;
  period_end_date: string;
  closing_account_head: string;
  remarks?: string;
  docstatus: number;
  gle_processing_status?: string;
};

type FiscalYearRow = {
  name: string;
  year_start_date: string;
  year_end_date: string;
  disabled?: number;
  company?: string;
};

type ClosingType = 'monthly' | 'quarterly' | 'yearly';

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
  isClosed: boolean;
  isToday: boolean;
};

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
function getMonthDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const days: CalendarDay[] = [];

  // Previous month fill
  const prevLast = new Date(year, month, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevLast - i);
    days.push({ date: d, isCurrentMonth: false, isClosed: false, isToday: false });
  }

  // Current month
  const today = new Date();
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    days.push({
      date,
      isCurrentMonth: true,
      isClosed: false,
      isToday: date.toDateString() === today.toDateString(),
    });
  }

  // Next month fill
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    days.push({ date, isCurrentMonth: false, isClosed: false, isToday: false });
  }

  return days;
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const ARABIC_DAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────
export default function PeriodClosingV2Page() {
  const { company, isLoading: coLoad } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<PcvRow | null>(null);
  const [activeTab, setActiveTab] = useState<'closing' | 'calendar' | 'fiscal'>('closing');

  // ── Close period form ──
  const [form, setForm] = useState({
    fiscal_year: '',
    transaction_date: '',
    period_start_date: '',
    period_end_date: '',
    closing_account_head: '',
    closing_type: 'monthly' as ClosingType,
    remarks: '',
  });

  // ── Fiscal year form ──
  const [fyForm, setFyForm] = useState({
    year: new Date().getFullYear().toString(),
    year_start_date: '',
    year_end_date: '',
  });

  // ── Calendar state ──
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  // ── Data queries ──
  const {
    data: pcvData,
    isLoading: pcvLoading,
    isError: pcvIsError,
    error: pcvError,
    refetch: refetchPcv,
  } = useDocList<PcvRow>('Period Closing Voucher', {
    fields: [
      'name',
      'company',
      'fiscal_year',
      'transaction_date',
      'period_start_date',
      'period_end_date',
      'closing_account_head',
      'remarks',
      'docstatus',
      'gle_processing_status',
    ],
    order_by: 'transaction_date desc',
    limit: 200,
  });

  const {
    data: fyData,
    isLoading: fyLoading,
    isError: fyIsError,
    error: fyError,
    refetch: refetchFy,
  } = useDocList<FiscalYearRow>('Fiscal Year', {
    fields: ['name', 'year_start_date', 'year_end_date', 'disabled'],
    limit: 50,
  });

  // ── Mutations ──
  const createPcv = useCreateDoc('Period Closing Voucher');
  const submitPcv = useSubmitDoc<PcvRow>('Period Closing Voucher');
  const cancelPcv = useCancelDoc<PcvRow>('Period Closing Voucher');
  const createFy = useCreateDoc('Fiscal Year');

  // ── Computed values ──
  const pcvRows = pcvData || [];
  const fyRows = fyData || [];

  const draftCount = useMemo(() => pcvRows.filter((r) => r.docstatus === 0).length, [pcvRows]);
  const submittedCount = useMemo(() => pcvRows.filter((r) => r.docstatus === 1).length, [pcvRows]);
  const cancelledCount = useMemo(() => pcvRows.filter((r) => r.docstatus === 2).length, [pcvRows]);

  // Closed periods for calendar
  const closedPeriods = useMemo(() => {
    return pcvRows
      .filter((r) => r.docstatus === 1)
      .map((r) => ({
        start: new Date(r.period_start_date),
        end: new Date(r.period_end_date),
        name: r.name,
      }));
  }, [pcvRows]);

  // Check if a date falls within any closed period
  const isDateClosed = useCallback(
    (date: Date) => {
      return closedPeriods.some(
        (cp) => date >= cp.start && date <= cp.end
      );
    },
    [closedPeriods]
  );

  // Current period status
  const currentPeriodStatus = useMemo(() => {
    const today = new Date();
    const isClosed = isDateClosed(today);
    return isClosed ? 'closed' : 'open';
  }, [isDateClosed]);

  // Next closing date
  const nextClosingDate = useMemo(() => {
    const today = new Date();
    const openPcvs = pcvRows.filter((r) => r.docstatus === 0);
    if (openPcvs.length > 0) {
      const earliest = openPcvs.sort(
        (a, b) => new Date(a.period_end_date).getTime() - new Date(b.period_end_date).getTime()
      )[0];
      return earliest?.period_end_date || '—';
    }
    // Suggest end of current month
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return endOfMonth.toISOString().split('T')[0];
  }, [pcvRows]);

  // Calendar days with closed status
  const calendarDays = useMemo(() => {
    const days = getMonthDays(calYear, calMonth);
    return days.map((d) => ({
      ...d,
      isClosed: isDateClosed(d.date),
    }));
  }, [calYear, calMonth, isDateClosed]);

  // ── Set default dates based on closing type ──
  useEffect(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();

    let start: string;
    let end: string;

    if (form.closing_type === 'monthly') {
      start = new Date(y, m, 1).toISOString().split('T')[0];
      end = new Date(y, m + 1, 0).toISOString().split('T')[0];
    } else if (form.closing_type === 'quarterly') {
      const qStart = Math.floor(m / 3) * 3;
      start = new Date(y, qStart, 1).toISOString().split('T')[0];
      end = new Date(y, qStart + 3, 0).toISOString().split('T')[0];
    } else {
      start = new Date(y, 0, 1).toISOString().split('T')[0];
      end = new Date(y, 11, 31).toISOString().split('T')[0];
    }

    setForm((p) => ({
      ...p,
      period_start_date: start,
      period_end_date: end,
      transaction_date: end,
    }));
  }, [form.closing_type]);

  // ── Handlers ──
  const handleCreatePcv = () => {
    if (!company) {
      toast.error('لم يتم تحديد الشركة الافتراضية');
      return;
    }
    if (!form.fiscal_year || !form.closing_account_head) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    createPcv.mutate(
      buildPeriodClosingVoucher({
        company,
        fiscal_year: form.fiscal_year,
        transaction_date: form.transaction_date,
        period_start_date: form.period_start_date,
        period_end_date: form.period_end_date,
        closing_account_head: form.closing_account_head,
        remarks: form.remarks || `إقفال فترة (${form.closing_type === 'monthly' ? 'شهري' : form.closing_type === 'quarterly' ? 'ربعي' : 'سنوي'}) — من ERP Pro`,
      }),
      {
        onSuccess: () => {
          toast.success('أُنشئت قسيمة إقفال (مسودة) — راجعها ثم رحّل');
          void refetchPcv();
          setDialogOpen(false);
          setForm((p) => ({
            ...p,
            fiscal_year: '',
            closing_account_head: '',
            remarks: '',
          }));
        },
        onError: () => {
          toast.error('تعذر إنشاء قسيمة الإقفال');
        },
      }
    );
  };

  const handleSubmitClick = (row: PcvRow) => {
    setSelectedRow(row);
    setSubmitConfirmOpen(true);
  };

  const confirmSubmit = () => {
    if (!selectedRow) return;
    submitPcv.mutate(selectedRow.name, {
      onSuccess: () => {
        toast.success('تم ترحيل قسيمة الإقفال');
        void refetchPcv();
        setSubmitConfirmOpen(false);
        setSelectedRow(null);
      },
      onError: () => {
        toast.error('فشل ترحيل قسيمة الإقفال');
        setSubmitConfirmOpen(false);
      },
    });
  };

  const handleCancelClick = (row: PcvRow) => {
    setSelectedRow(row);
    setCancelConfirmOpen(true);
  };

  const confirmCancel = () => {
    if (!selectedRow) return;
    cancelPcv.mutate(selectedRow.name, {
      onSuccess: () => {
        toast.success('أُلغي ترحيل قسيمة الإقفال — أُعيدت الفترة مفتوحة');
        void refetchPcv();
        setCancelConfirmOpen(false);
        setSelectedRow(null);
      },
      onError: () => {
        toast.error('تعذر إلغاء ترحيل قسيمة الإقفال');
        setCancelConfirmOpen(false);
      },
    });
  };

  const handleCreateFiscalYear = () => {
    if (!fyForm.year || !fyForm.year_start_date || !fyForm.year_end_date) {
      toast.error('يرجى ملء جميع حقول السنة المالية');
      return;
    }

    createFy.mutate(
      {
        doctype: 'Fiscal Year',
        year: fyForm.year,
        year_start_date: fyForm.year_start_date,
        year_end_date: fyForm.year_end_date,
        disabled: 0,
      } as unknown as Record<string, unknown>,
      {
        onSuccess: () => {
          toast.success('تم إنشاء السنة المالية بنجاح');
          void refetchFy();
          setFyForm({
            year: '',
            year_start_date: '',
            year_end_date: '',
          });
        },
        onError: () => {
          toast.error('تعذر إنشاء السنة المالية');
        },
      }
    );
  };

  // ── Period closing columns ──
  const pcvColumns: Column<PcvRow>[] = [
    {
      key: 'name',
      header: 'رقم القسيمة',
      sortable: true,
      render: (v) => <span className="font-mono text-primary text-xs">{String(v)}</span>,
    },
    {
      key: 'fiscal_year',
      header: 'السنة المالية',
      sortable: true,
    },
    {
      key: 'period_start_date',
      header: 'بداية الفترة',
      sortable: true,
      render: (v) => formatDate(String(v || '')),
    },
    {
      key: 'period_end_date',
      header: 'نهاية الفترة',
      sortable: true,
      render: (v) => formatDate(String(v || '')),
    },
    {
      key: 'closing_account_head',
      header: 'حساب الإقفال',
      render: (v) => <span className="text-xs font-mono">{String(v || '—')}</span>,
    },
    {
      key: 'docstatus',
      header: 'الحالة',
      render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} />,
    },
    {
      key: 'remarks',
      header: 'ملاحظات',
      render: (v) => {
        const str = String(v || '');
        return str.length > 40 ? str.slice(0, 40) + '...' : str || '—';
      },
    },
    {
      key: '_a',
      header: 'إجراءات',
      render: (_, row) => (
        <div className="flex gap-1">
          {row.docstatus === 0 && (
            <Button
              type="button"
              size="sm"
              className="h-7 text-[10px] px-2 gap-1"
              disabled={submitPcv.isPending}
              onClick={() => handleSubmitClick(row)}
            >
              <CheckCircle2 className="h-3 w-3" />
              ترحيل
            </Button>
          )}
          {row.docstatus === 1 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[10px] px-2 gap-1 text-destructive hover:text-destructive"
              disabled={cancelPcv.isPending}
              onClick={() => handleCancelClick(row)}
            >
              <RotateCcw className="h-3 w-3" />
              إعادة فتح
            </Button>
          )}
          <Badge
            variant={row.docstatus === 1 ? 'default' : row.docstatus === 0 ? 'secondary' : 'outline'}
            className="text-[9px] h-5 gap-1"
          >
            {row.docstatus === 1 ? <Lock className="h-2.5 w-2.5" /> : <Unlock className="h-2.5 w-2.5" />}
            {row.docstatus === 1 ? 'مقفلة' : row.docstatus === 0 ? 'مسودة' : 'ملغاة'}
          </Badge>
        </div>
      ),
    },
  ];

  // ── Fiscal year columns ──
  const fyColumns: Column<FiscalYearRow>[] = [
    {
      key: 'name',
      header: 'السنة المالية',
      sortable: true,
      render: (v) => <span className="font-mono text-primary text-xs">{String(v)}</span>,
    },
    {
      key: 'year_start_date',
      header: 'تاريخ البداية',
      sortable: true,
      render: (v) => formatDate(String(v || '')),
    },
    {
      key: 'year_end_date',
      header: 'تاريخ النهاية',
      sortable: true,
      render: (v) => formatDate(String(v || '')),
    },
    {
      key: 'disabled',
      header: 'الحالة',
      render: (v) => {
        const isDisabled = Number(v) === 1;
        return (
          <Badge variant={isDisabled ? 'destructive' : 'default'} className="text-[10px] h-5 gap-1">
            {isDisabled ? <CircleX className="h-3 w-3" /> : <CircleCheck className="h-3 w-3" />}
            {isDisabled ? 'معطّلة' : 'نشطة'}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={pcvIsError ? pcvError : null} onRetry={() => void refetchPcv()} />

      {/* ── Page Header ── */}
      <PageHeader
        title="إقفال الفترات"
        description="إدارة إقفال الفترات المحاسبية والسنوات المالية وتتبع حالة الفترات عبر التقويم"
        iconify="solar:calendar-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'إقفال الفترات' }]}
        actions={
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  إقفال الفترة يحوّل أرصدة حسابات الإيرادات والمصروفات إلى حساب الأرباح المحتجزة. لا يمكن تسجيل حركات جديدة في فترة مقفلة.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  قسيمة إقفال جديدة
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="max-w-3xl gap-3">
                <DialogHeader>
                  <DialogTitle>إنشاء قسيمة إقفال فترة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Closing type selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">نوع الإقفال</Label>
                    <div className="flex gap-2">
                      {([
                        { value: 'monthly', label: 'شهري', icon: CalendarDays },
                        { value: 'quarterly', label: 'ربعي', icon: CalendarRange },
                        { value: 'yearly', label: 'سنوي', icon: Calendar },
                      ] as const).map((ct) => (
                        <Button
                          key={ct.value}
                          type="button"
                          variant={form.closing_type === ct.value ? 'default' : 'outline'}
                          size="sm"
                          className="gap-1.5 text-xs flex-1"
                          onClick={() => setForm((p) => ({ ...p, closing_type: ct.value }))}
                        >
                          <ct.icon className="h-3.5 w-3.5" />
                          {ct.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">الشركة (افتراضية)</Label>
                      <p className="text-sm font-semibold">{company || '—'}</p>
                      {!company && (
                        <p className="text-[10px] text-destructive">اضبط الشركة الافتراضية من الإعدادات</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">السنة المالية *</Label>
                      <ErpLinkCombobox
                        doctype="Fiscal Year"
                        value={form.fiscal_year}
                        onChange={(v) => setForm((p) => ({ ...p, fiscal_year: v }))}
                        placeholder="مثال: سنة مالية 2025"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">تاريخ العملية *</Label>
                      <Input
                        type="date"
                        dir="rtl"
                        value={form.transaction_date}
                        onChange={(e) => setForm((p) => ({ ...p, transaction_date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">بداية الفترة *</Label>
                      <Input
                        type="date"
                        dir="rtl"
                        value={form.period_start_date}
                        onChange={(e) => setForm((p) => ({ ...p, period_start_date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">نهاية الفترة *</Label>
                      <Input
                        type="date"
                        dir="rtl"
                        value={form.period_end_date}
                        onChange={(e) => setForm((p) => ({ ...p, period_end_date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">حساب رأس إقفال (الأرباح المحتجزة) *</Label>
                      <ErpLinkCombobox
                        doctype="Account"
                        value={form.closing_account_head}
                        onChange={(v) => setForm((p) => ({ ...p, closing_account_head: v }))}
                        placeholder="حساب يرحّل إليه صافي الأرباح/الخسائر"
                        filters={[['account_type', '=', 'Retained Earning']] as string[][]}
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs font-medium">ملاحظات</Label>
                      <Textarea
                        rows={3}
                        value={form.remarks}
                        onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                        placeholder={`إقفال فترة (${form.closing_type === 'monthly' ? 'شهري' : form.closing_type === 'quarterly' ? 'ربعي' : 'سنوي'})`}
                      />
                    </div>
                  </div>

                  {/* Period preview */}
                  {form.period_start_date && form.period_end_date && (
                    <div className="rounded-lg border border-warning/30 bg-warning/[0.04] p-3">
                      <div className="flex items-center gap-2 text-xs">
                        <CalendarClock className="h-4 w-4 text-warning" />
                        <span className="font-medium">
                          سيتم إقفال الفترة من {formatDate(form.period_start_date)} إلى {formatDate(form.period_end_date)}
                        </span>
                        <Badge variant="outline" className="text-[9px] h-5 me-2">
                          {form.closing_type === 'monthly' ? 'شهري' : form.closing_type === 'quarterly' ? 'ربعي' : 'سنوي'}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setDialogOpen(false)}
                      className="text-muted-foreground"
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5"
                      disabled={coLoad || createPcv.isPending}
                      onClick={handleCreatePcv}
                    >
                      <Save className="h-3.5 w-3.5" />
                      {createPcv.isPending ? 'جاري الحفظ...' : 'حفظ كمسودة'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* ── Stats KPIs ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="فترات مقفلة"
          value={submittedCount}
          icon={Lock}
          accent="success"
          compact
          description="إجمالي الفترات المقفلة"
        />
        <KpiCard
          title="حالة الفترة الحالية"
          value={currentPeriodStatus === 'open' ? 'مفتوحة' : 'مقفلة'}
          icon={currentPeriodStatus === 'open' ? Unlock : Lock}
          accent={currentPeriodStatus === 'open' ? 'success' : 'destructive'}
          compact
          description={currentPeriodStatus === 'open' ? 'يمكن تسجيل حركات' : 'لا يمكن تسجيل حركات'}
        />
        <KpiCard
          title="مسودات قيد الإقفال"
          value={draftCount}
          icon={Clock}
          accent={draftCount > 0 ? 'warning' : 'info'}
          compact
          description="بانتظار الترحيل"
        />
        <KpiCard
          title="تاريخ الإقفال القادم"
          value={formatDate(nextClosingDate)}
          icon={CalendarCheck}
          accent="info"
          compact
        />
      </KpiStrip>

      {/* ── Closed Period Warning ── */}
      {currentPeriodStatus === 'closed' && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/[0.04] px-4 py-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-xs">
              <p className="font-semibold text-destructive">الفترة الحالية مقفلة</p>
              <p className="text-muted-foreground">
                لا يمكن تسجيل أي قيود محاسبية أو فواتير في الفترة الحالية. لإعادة فتح الفترة، استخدم زر &quot;إعادة فتح&quot; في قسيمة الإقفال المعنية.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Draft Warning ── */}
      {draftCount > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/[0.04] px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-xs">
              <p className="font-semibold text-warning-foreground">
                يوجد {draftCount} قسيمة إقفال في حالة مسودة
              </p>
              <p className="text-muted-foreground">
                قبل ترحيل قسيمة الإقفال، تأكد من اكتمال جميع القيود المحاسبية للفترة المحددة. ترحيل قسيمة الإقفال يُغلق الفترة ولا يمكن تسجيل حركات جديدة ضمنها.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'closing' | 'calendar' | 'fiscal')} dir="rtl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="closing" className="gap-1.5 text-xs">
            <Archive className="h-3.5 w-3.5" />
            قسائم الإقفال
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 text-xs">
            <CalendarDays className="h-3.5 w-3.5" />
            التقويم
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-1.5 text-xs">
            <Building className="h-3.5 w-3.5" />
            السنوات المالية
          </TabsTrigger>
        </TabsList>

        {/* ── Closing Vouchers Tab ── */}
        <TabsContent value="closing" className="mt-4">
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">قسائم إقفال الفترات</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Lock className="h-2.5 w-2.5" />
                    مقفلة: {submittedCount}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    مسودة: {draftCount}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <XCircle className="h-2.5 w-2.5" />
                    ملغاة: {cancelledCount}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={pcvRows}
                columns={pcvColumns}
                title="قسائم الإقفال"
                searchable
                loading={pcvLoading}
                tableId="period-closing-vouchers"
                exportFileName="period-closing-vouchers"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Calendar Tab ── */}
        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">تقويم الفترات المقفلة</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <CircleCheck className="h-2.5 w-2.5 text-emerald-500" />
                    مفتوحة
                  </Badge>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Lock className="h-2.5 w-2.5 text-rose-500" />
                    مقفلة
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    if (calMonth === 0) {
                      setCalMonth(11);
                      setCalYear((y) => y - 1);
                    } else {
                      setCalMonth((m) => m - 1);
                    }
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {ARABIC_MONTHS[calMonth]} {calYear}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] gap-1"
                    onClick={() => {
                      setCalYear(new Date().getFullYear());
                      setCalMonth(new Date().getMonth());
                    }}
                  >
                    اليوم
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    if (calMonth === 11) {
                      setCalMonth(0);
                      setCalYear((y) => y + 1);
                    } else {
                      setCalMonth((m) => m + 1);
                    }
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-px rounded-lg border border-border/40 overflow-hidden bg-border/20">
                {/* Day headers */}
                {ARABIC_DAYS.map((day) => (
                  <div
                    key={day}
                    className="bg-muted/80 px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map((day, idx) => {
                  const dateStr = day.date.toDateString();
                  const isWeekend = day.date.getDay() === 5 || day.date.getDay() === 6;
                  return (
                    <div
                      key={idx}
                      className={`
                        relative min-h-[48px] sm:min-h-[64px] p-1 transition-colors
                        ${day.isCurrentMonth ? 'bg-card' : 'bg-muted/30'}
                        ${day.isClosed && day.isCurrentMonth ? 'bg-rose-50 dark:bg-rose-950/20' : ''}
                        ${day.isToday ? 'ring-2 ring-primary ring-inset' : ''}
                        ${isWeekend && day.isCurrentMonth ? 'bg-muted/20' : ''}
                        hover:bg-muted/40
                      `}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={`
                            text-xs leading-none
                            ${!day.isCurrentMonth ? 'text-muted-foreground/40' : ''}
                            ${day.isToday ? 'font-bold text-primary' : ''}
                            ${day.isClosed && day.isCurrentMonth ? 'text-rose-600 font-semibold' : ''}
                          `}
                        >
                          {day.date.getDate()}
                        </span>
                        {day.isClosed && day.isCurrentMonth && (
                          <Lock className="h-3 w-3 text-rose-500 shrink-0" />
                        )}
                        {day.isToday && !day.isClosed && (
                          <CircleDot className="h-3 w-3 text-primary shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Calendar Legend */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-sm bg-card border border-border" />
                  <span>مفتوحة</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-sm bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800" />
                  <span>مقفلة</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-sm ring-2 ring-primary ring-inset" />
                  <span>اليوم</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-sm bg-muted/20" />
                  <span>عطلة نهاية الأسبوع</span>
                </div>
              </div>

              {/* Closed periods summary under calendar */}
              {closedPeriods.length > 0 && (
                <div className="mt-4">
                  <Separator className="mb-3" />
                  <p className="text-xs font-medium mb-2">الفترات المقفلة:</p>
                  <div className="space-y-1.5">
                    {closedPeriods.map((cp, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Lock className="h-3 w-3 text-rose-500 shrink-0" />
                        <span>
                          {formatDate(cp.start.toISOString().split('T')[0])} — {formatDate(cp.end.toISOString().split('T')[0])}
                        </span>
                        <span className="text-muted-foreground font-mono text-[10px]">({cp.name})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Fiscal Years Tab ── */}
        <TabsContent value="fiscal" className="mt-4 space-y-4">
          {/* Create Fiscal Year */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" />
                إنشاء سنة مالية جديدة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">اسم السنة المالية *</Label>
                  <Input
                    placeholder="مثال: 2025 أو سنة مالية 2025"
                    value={fyForm.year}
                    onChange={(e) => setFyForm((p) => ({ ...p, year: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">تاريخ البداية *</Label>
                  <Input
                    type="date"
                    dir="rtl"
                    value={fyForm.year_start_date}
                    onChange={(e) => setFyForm((p) => ({ ...p, year_start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">تاريخ النهاية *</Label>
                  <Input
                    type="date"
                    dir="rtl"
                    value={fyForm.year_end_date}
                    onChange={(e) => setFyForm((p) => ({ ...p, year_end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-4">
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  disabled={createFy.isPending}
                  onClick={handleCreateFiscalYear}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {createFy.isPending ? 'جاري الإنشاء...' : 'إنشاء سنة مالية'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Fiscal Year List */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">السنوات المالية</CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {fyRows.length} سنة مالية
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={fyRows}
                columns={fyColumns}
                title="السنوات المالية"
                searchable
                loading={fyLoading}
                tableId="fiscal-years-list"
                exportFileName="fiscal-years"
              />
            </CardContent>
          </Card>

          {/* Fiscal Year Quick Actions */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => {
                    const year = new Date().getFullYear().toString();
                    setFyForm({
                      year,
                      year_start_date: `${year}-01-01`,
                      year_end_date: `${year}-12-31`,
                    });
                    toast.success('تم ملء بيانات السنة المالية الحالية');
                  }}
                >
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium">إنشاء سنة مالية للسنة الحالية</span>
                  <span className="text-[10px] text-muted-foreground">{new Date().getFullYear()}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => {
                    if (fyRows.length === 0) {
                      toast.error('لا توجد سنوات مالية');
                      return;
                    }
                    setActiveTab('closing');
                    setDialogOpen(true);
                  }}
                >
                  <Lock className="h-5 w-5 text-warning" />
                  <span className="text-xs font-medium">إقفال سنة مالية</span>
                  <span className="text-[10px] text-muted-foreground">تحويل الأرباح والخسائر</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => {
                    toast.success('استخدم زر إعادة فتح في قسيمة الإقفال المعنية');
                    setActiveTab('closing');
                  }}
                >
                  <Unlock className="h-5 w-5 text-emerald-500" />
                  <span className="text-xs font-medium">إعادة فتح سنة مالية</span>
                  <span className="text-[10px] text-muted-foreground">إلغاء ترحيل قسيمة الإقفال</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Auto Closing Entries Info ── */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            آلية إقفال الفترات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div className="space-y-2">
              <p className="font-semibold text-foreground">ماذا يحدث عند إقفال فترة؟</p>
              <ul className="list-disc list-inside space-y-1">
                <li>يتم تحويل جميع أرصدة حسابات الإيرادات إلى حساب الإقفال (دائن)</li>
                <li>يتم تحويل جميع أرصدة حسابات المصروفات إلى حساب الإقفال (مدين)</li>
                <li>الفرق يرحّل إلى حساب الأرباح المحتجزة</li>
                <li>لا يمكن تسجيل أي حركات محاسبية في الفترة المقفلة</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-foreground">أنواع الإقفال</p>
              <ul className="list-disc list-inside space-y-1">
                <li><span className="font-medium text-foreground">شهري:</span> إقفال نهاية كل شهر — يُنصح به للشركات النشطة</li>
                <li><span className="font-medium text-foreground">ربعي:</span> إقفال نهاية كل ربع سنة — مناسب للتقارير الدورية</li>
                <li><span className="font-medium text-foreground">سنوي:</span> إقفال نهاية السنة المالية — إجراء شامل يتضمن تسوية جميع الحسابات</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Submit Confirmation Dialog ── */}
      <AlertDialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد ترحيل قسيمة الإقفال
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm leading-relaxed">
              <p>
                هل أنت متأكد من ترحيل قسيمة الإقفال{' '}
                <span className="font-semibold text-foreground">{selectedRow?.name}</span>؟
              </p>
              {selectedRow && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/[0.04] p-3 text-xs space-y-1.5">
                  <p className="font-semibold text-destructive">⚠️ تحذير: ما يعنيه ترحيل قسيمة الإقفال</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>سيتم تحويل جميع أرصدة حسابات الإيرادات والمصروفات إلى حساب الإقفال</li>
                    <li>
                      ستُغلق الفترة من{' '}
                      <span className="font-medium">{formatDate(selectedRow.period_start_date)}</span> إلى{' '}
                      <span className="font-medium">{formatDate(selectedRow.period_end_date)}</span>
                    </li>
                    <li>لن يمكن تسجيل أي قيود محاسبية ضمن هذه الفترة بعد الترحيل</li>
                    <li>يمكن إلغاء الترحيل لاحقاً لكن يُنصح بالتأكد قبل المتابعة</li>
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                السنة المالية: <span className="font-medium">{selectedRow?.fiscal_year || '—'}</span>
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs"
              onClick={confirmSubmit}
              disabled={submitPcv.isPending}
            >
              {submitPcv.isPending ? 'جاري الترحيل...' : 'نعم، ترحيل القسيمة'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Cancel (Reopen) Confirmation Dialog ── */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              تأكيد إعادة فتح الفترة
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm leading-relaxed">
              <p>
                هل أنت متأكد من إلغاء ترحيل قسيمة الإقفال{' '}
                <span className="font-semibold text-foreground">{selectedRow?.name}</span>؟
              </p>
              {selectedRow && (
                <div className="rounded-lg border border-warning/30 bg-warning/[0.04] p-3 text-xs space-y-1.5">
                  <p className="font-semibold text-warning-foreground">تنبيه: ما يعنيه إعادة فتح الفترة</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>سيتم عكس قيود الإقفال وإعادة فتح الفترة</li>
                    <li>ستعود أرصدة الإيرادات والمصروفات إلى ما كانت عليه قبل الإقفال</li>
                    <li>قد تحتاج لمراجعة المدقق الخارجي قبل هذا الإجراء</li>
                    <li>
                      الفترة:{' '}
                      <span className="font-medium">{formatDate(selectedRow.period_start_date)}</span> —{' '}
                      <span className="font-medium">{formatDate(selectedRow.period_end_date)}</span>
                    </li>
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs bg-destructive hover:bg-destructive/90"
              onClick={confirmCancel}
              disabled={cancelPcv.isPending}
            >
              {cancelPcv.isPending ? 'جاري إلغاء الترحيل...' : 'نعم، إعادة فتح الفترة'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
