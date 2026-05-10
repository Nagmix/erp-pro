'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { StatusBadge } from '@/components/erp/status-badge';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useCreateDoc, useDocList, useUpdateDoc } from '@/lib/client/hooks';
import { formatDate, formatNumber } from '@/lib/core/helpers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import {
  Plus,
  RefreshCw,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
  Repeat,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

type AutoRepeatRow = {
  name: string;
  reference_doctype?: string;
  reference_document?: string;
  reference_name?: string;
  frequency?: string;
  next_schedule_date?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  disabled?: number;
  notify_by_email?: number;
  docstatus?: number;
};

const REF_DOCTYPES = ['Journal Entry', 'Purchase Invoice', 'Sales Invoice', 'Payment Entry', 'Expense Claim'] as const;

const DOCTYPE_AR: Record<string, string> = {
  'Journal Entry': 'قيد يومية',
  'Purchase Invoice': 'فاتورة مشتريات',
  'Sales Invoice': 'فاتورة مبيعات',
  'Payment Entry': 'سند دفع',
  'Expense Claim': 'مطالبة مصروفات',
  'Auto Repeat': 'تكرار تلقائي',
};

const FREQUENCY_AR: Record<string, string> = {
  Daily: 'يومي',
  Weekly: 'أسبوعي',
  Monthly: 'شهري',
  Quarterly: 'ربع سنوي',
  'Half-Yearly': 'نصف سنوي',
  Yearly: 'سنوي',
};

const STATUS_AR: Record<string, string> = {
  Active: 'نشط',
  Disabled: 'معطّل',
  Completed: 'مكتمل',
  Draft: 'مسودة',
  Submitted: 'مُقدّم',
  Cancelled: 'ملغي',
};

/** جدولة التكرار التلقائي — Auto Repeat في ERPNext (M-24). */
export default function AutoRepeatPage() {
  const [q, setQ] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refDoctype, setRefDoctype] = useState<string>('Sales Invoice');
  const [referenceName, setReferenceName] = useState('');
  const [frequency, setFrequency] = useState('Monthly');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [endDate, setEndDate] = useState('');
  const [notifyByEmail, setNotifyByEmail] = useState(false);

  // فلاتر
  const [filterDoctype, setFilterDoctype] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFrequency, setFilterFrequency] = useState<string>('all');

  const { data, isLoading, isError, error, refetch } = useDocList<AutoRepeatRow>('Auto Repeat', {
    fields: [
      'name',
      'reference_doctype',
      'reference_document',
      'reference_name',
      'frequency',
      'next_schedule_date',
      'start_date',
      'end_date',
      'status',
      'disabled',
      'notify_by_email',
      'docstatus',
    ],
    order_by: 'modified desc',
    limit: 500,
  });

  const createMutation = useCreateDoc('Auto Repeat');
  const updateMutation = useUpdateDoc('Auto Repeat');

  // ── KPIs ──
  const allRows = data || [];
  const totalRepeats = allRows.length;
  const activeRepeats = useMemo(
    () => allRows.filter((r) => !r.disabled && r.status !== 'Disabled' && r.status !== 'Completed').length,
    [allRows]
  );
  const disabledRepeats = useMemo(
    () => allRows.filter((r) => r.disabled || r.status === 'Disabled').length,
    [allRows]
  );
  const nextScheduleDate = useMemo(() => {
    const upcoming = allRows
      .filter((r) => !r.disabled && r.next_schedule_date)
      .sort((a, b) => String(a.next_schedule_date!).localeCompare(String(b.next_schedule_date!)));
    return upcoming[0]?.next_schedule_date ? formatDate(String(upcoming[0].next_schedule_date)) : '—';
  }, [allRows]);

  // ── فلاتر القائمة ──
  const rows = useMemo(() => {
    let list = allRows;
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (r) =>
          String(r.name).toLowerCase().includes(s) ||
          String(r.reference_doctype || '').toLowerCase().includes(s) ||
          String(r.reference_document || '').toLowerCase().includes(s) ||
          String(r.reference_name || '').toLowerCase().includes(s)
      );
    }
    if (filterDoctype !== 'all') {
      list = list.filter((r) => r.reference_doctype === filterDoctype);
    }
    if (filterStatus !== 'all') {
      if (filterStatus === 'Active') {
        list = list.filter((r) => !r.disabled && r.status !== 'Disabled' && r.status !== 'Completed');
      } else if (filterStatus === 'Disabled') {
        list = list.filter((r) => r.disabled || r.status === 'Disabled');
      } else if (filterStatus === 'Completed') {
        list = list.filter((r) => r.status === 'Completed');
      }
    }
    if (filterFrequency !== 'all') {
      list = list.filter((r) => r.frequency === filterFrequency);
    }
    return list;
  }, [allRows, q, filterDoctype, filterStatus, filterFrequency]);

  // ── Toggle enable/disable ──
  const handleToggle = (row: AutoRepeatRow) => {
    const newDisabled = row.disabled ? 0 : 1;
    updateMutation.mutate(
      { name: row.name, doc: { disabled: newDisabled } },
      {
        onSuccess: () => {
          toast.success(newDisabled ? 'تم تعطيل الجدول' : 'تم تفعيل الجدول');
          void refetch();
        },
        onError: () => toast.error('فشل تحديث الحالة'),
      }
    );
  };

  const columns: Column<AutoRepeatRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الاسم',
        sortable: true,
        filterable: true,
        render: (v) => (
          <span className="font-medium text-primary cursor-pointer hover:underline">{String(v)}</span>
        ),
      },
      {
        key: 'reference_doctype',
        header: 'نوع المستند',
        sortable: true,
        filterable: true,
        render: (v) => (
          <Badge variant="outline" className="text-xs font-medium">
            {DOCTYPE_AR[String(v)] || String(v || '—')}
          </Badge>
        ),
      },
      {
        key: 'reference_name',
        header: 'مرجع المستند',
        sortable: true,
        filterable: true,
        render: (v, row) => String(v || row.reference_document || '—'),
      },
      {
        key: 'frequency',
        header: 'التكرار',
        sortable: true,
        render: (v) => (
          <Badge variant="secondary" className="text-xs">
            {FREQUENCY_AR[String(v)] || String(v || '—')}
          </Badge>
        ),
      },
      {
        key: 'next_schedule_date',
        header: 'الجولة القادمة',
        sortable: true,
        render: (v) =>
          v ? (
            <span className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {formatDate(String(v))}
            </span>
          ) : (
            '—'
          ),
      },
      {
        key: 'start_date',
        header: 'تاريخ البدء',
        sortable: true,
        render: (v) => (v ? formatDate(String(v)) : '—'),
      },
      {
        key: 'end_date',
        header: 'تاريخ الانتهاء',
        render: (v) => (v ? formatDate(String(v)) : '—'),
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (v, row) => {
          if (row.disabled) return <StatusBadge status="Disabled" />;
          if (String(v) === 'Completed') return <StatusBadge status="Completed" />;
          return <DocStatusBadge docstatus={Number(row.docstatus ?? 0) as 0 | 1 | 2} />;
        },
      },
      {
        key: 'disabled',
        header: 'تفعيل',
        render: (v, row) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={!row.disabled}
              onCheckedChange={() => handleToggle(row)}
              disabled={updateMutation.isPending}
              aria-label={row.disabled ? 'تفعيل الجدول' : 'تعطيل الجدول'}
            />
            <span className="text-xs text-muted-foreground">
              {row.disabled ? 'معطّل' : 'مفعّل'}
            </span>
          </div>
        ),
      },
    ],
    [updateMutation.isPending, handleToggle]
  );

  const handleCreate = () => {
    if (!referenceName.trim()) {
      toast.error('يرجى إدخال اسم المستند المرجعي');
      return;
    }
    const doc: Record<string, unknown> = {
      doctype: 'Auto Repeat',
      reference_doctype: refDoctype,
      reference_name: referenceName.trim(),
      frequency,
      start_date: startDate,
      next_schedule_date: startDate,
    };
    if (endDate.trim()) doc.end_date = endDate;
    if (notifyByEmail) doc.notify_by_email = 1;
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء جدول تكرار');
        setDialogOpen(false);
        setReferenceName('');
        setEndDate('');
        setNotifyByEmail(false);
        void refetch();
      },
      onError: () =>
        toast.error('فشل الإنشاء — قد يتطلب النظام حقولاً إضافية أو مرجع مستند'),
    });
  };

  // ── فلاتر متاحة فريدة ──
  const uniqueDoctypes = useMemo(
    () => [...new Set(allRows.map((r) => r.reference_doctype).filter(Boolean))],
    [allRows]
  );
  const uniqueFrequencies = useMemo(
    () => [...new Set(allRows.map((r) => r.frequency).filter(Boolean))],
    [allRows]
  );

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="التكرار التلقائي"
        description="عرض وإنشاء جداول التكرار التلقائي؛ القيود المتكررة تظهر أيضاً ضمن المحاسبة."
        iconify="solar:refresh-circle-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'التشغيل', href: '/operations' }, { label: 'التكرار التلقائي' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
              تحديث
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              جدول جديد
            </Button>
          </div>
        }
      />

      {/* ── KPI Cards ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي الجداول"
          value={formatNumber(totalRepeats)}
          icon={Repeat}
          accent="primary"
          description="جميع جداول التكرار التلقائي"
        />
        <KpiCard
          title="نشطة"
          value={formatNumber(activeRepeats)}
          icon={CheckCircle2}
          accent="success"
          description="جداول تعمل حالياً"
        />
        <KpiCard
          title="معطّلة"
          value={formatNumber(disabledRepeats)}
          icon={XCircle}
          accent="destructive"
          description="جداول متوقفة مؤقتاً"
        />
        <KpiCard
          title="الجولة القادمة"
          value={nextScheduleDate}
          icon={CalendarClock}
          accent="warning"
          description="أقرب تاريخ تنفيذ"
        />
      </KpiStrip>

      {/* ── فلاتر ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/40 bg-card p-4 hover:border-border/60 transition-colors">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          فلاتر:
        </div>
        <div className="w-44">
          <Label className="text-xs text-muted-foreground mb-1">نوع المستند</Label>
          <Select value={filterDoctype} onValueChange={setFilterDoctype}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="الكل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {uniqueDoctypes.map((d) => (
                <SelectItem key={String(d)} value={String(d)}>
                  {DOCTYPE_AR[String(d)] || String(d)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Label className="text-xs text-muted-foreground mb-1">الحالة</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="الكل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="Active">نشط</SelectItem>
              <SelectItem value="Disabled">معطّل</SelectItem>
              <SelectItem value="Completed">مكتمل</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Label className="text-xs text-muted-foreground mb-1">التكرار</Label>
          <Select value={filterFrequency} onValueChange={setFilterFrequency}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="الكل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {uniqueFrequencies.map((f) => (
                <SelectItem key={String(f)} value={String(f)}>
                  {FREQUENCY_AR[String(f)] || String(f)}
                </SelectItem>
              ))}
              <SelectItem value="Daily">يومي</SelectItem>
              <SelectItem value="Weekly">أسبوعي</SelectItem>
              <SelectItem value="Monthly">شهري</SelectItem>
              <SelectItem value="Quarterly">ربع سنوي</SelectItem>
              <SelectItem value="Half-Yearly">نصف سنوي</SelectItem>
              <SelectItem value="Yearly">سنوي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Label className="text-xs text-muted-foreground mb-1">بحث</Label>
          <input
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-xs"
            placeholder="بحث بالاسم أو النوع…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {(filterDoctype !== 'all' || filterStatus !== 'all' || filterFrequency !== 'all' || q) && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-destructive"
            onClick={() => {
              setFilterDoctype('all');
              setFilterStatus('all');
              setFilterFrequency('all');
              setQ('');
            }}
          >
            مسح الفلاتر
          </Button>
        )}
      </div>

      {/* ── الجدول ── */}
      <DataTable
        data={rows}
        columns={columns}
        searchable={false}
        loading={isLoading}
        tableId="operations-auto-repeat"
        exportFileName="auto-repeat.csv"
        printTitle="التكرار التلقائي"
      />

      {/* ─ـ حوار الإنشاء ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-primary" />
              جدول تكرار جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* نوع المستند المرجعي */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">نوع المستند المرجعي *</Label>
              <Select value={refDoctype} onValueChange={setRefDoctype}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REF_DOCTYPES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {DOCTYPE_AR[d]} ({d})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* أو اختر نوع مستند آخر */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">أو اختر نوع مستند آخر</Label>
              <ErpLinkCombobox doctype="DocType" value={refDoctype} onChange={setRefDoctype} className="h-9" />
            </div>

            {/* اسم المستند المرجعي */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">اسم المستند المرجعي *</Label>
              <ErpLinkCombobox
                doctype={refDoctype}
                value={referenceName}
                onChange={setReferenceName}
                className="h-9"
                placeholder="اختر المستند المرجعي..."
              />
            </div>

            {/* التكرار */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">التكرار *</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">يومي</SelectItem>
                  <SelectItem value="Weekly">أسبوعي</SelectItem>
                  <SelectItem value="Monthly">شهري</SelectItem>
                  <SelectItem value="Quarterly">ربع سنوي</SelectItem>
                  <SelectItem value="Half-Yearly">نصف سنوي</SelectItem>
                  <SelectItem value="Yearly">سنوي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* تواريخ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">تاريخ البدء *</Label>
                <Input type="date" dir="ltr" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">تاريخ الانتهاء</Label>
                <Input type="date" dir="ltr" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="اختياري" />
              </div>
            </div>

            {/* إشعار بالبريد */}
            <div className="flex items-center gap-3 rounded-lg border border-border/40 p-3">
              <Switch
                id="notify-email"
                checked={notifyByEmail}
                onCheckedChange={setNotifyByEmail}
              />
              <div>
                <Label htmlFor="notify-email" className="text-sm font-medium cursor-pointer">
                  إرسال إشعار بالبريد الإلكتروني
                </Label>
                <p className="text-xs text-muted-foreground">
                  سيتم إرسال تنبيه عند كل تنفيذ للجدول
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'جارٍ الحفظ…' : 'حفظ الجدول'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
