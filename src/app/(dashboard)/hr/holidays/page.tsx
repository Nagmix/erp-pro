'use client';

import { useMemo, useState, useCallback } from 'react';
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
  DialogFooter,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Calendar, Clock, Filter, Check, Loader2 } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc, useDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { buildHolidayListCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';
import { PageHeader, KpiStrip, KpiCard } from '@/components/erp/page-header';

/* ──────────────── Types ──────────────── */

type HolidayChild = { holiday_date?: string; description?: string; weekly_off?: number };
type HolidayListRow = {
  name: string;
  holiday_list_name?: string;
  from_date?: string;
  to_date?: string;
  total_holidays?: number;
  weekly_off?: string;
  holidays?: HolidayChild[];
};

type Entry = { description: string; holiday_date: string; weekly_off: boolean };

/* ──────────────── Helpers ──────────────── */

const emptyEntry = (): Entry => ({ description: '', holiday_date: '', weekly_off: false });

const WEEKLY_OFF_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: 'Sunday', label: 'الأحد' },
  { value: 'Monday', label: 'الاثنين' },
  { value: 'Tuesday', label: 'الثلاثاء' },
  { value: 'Wednesday', label: 'الأربعاء' },
  { value: 'Thursday', label: 'الخميس' },
  { value: 'Friday', label: 'الجمعة' },
  { value: 'Saturday', label: 'السبت' },
] as const;

const YEAR_OPTIONS = (() => {
  const currentYear = new Date().getFullYear();
  const years = [{ value: '', label: 'كل السنوات' }];
  for (let y = currentYear + 1; y >= currentYear - 5; y--) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
})();

/* ──────────────── Component ──────────────── */

export default function HolidaysPage() {
  /* ── Dialog state ── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<HolidayListRow | null>(null);
  const [expandedName, setExpandedName] = useState<string | null>(null);

  /* ── Form state ── */
  const [holidayListName, setHolidayListName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [weeklyOff, setWeeklyOff] = useState('');
  const [entries, setEntries] = useState<Entry[]>([emptyEntry()]);

  /* ── Edit state ── */
  const [editingDoc, setEditingDoc] = useState<HolidayListRow | null>(null);

  /* ── Filter state ── */
  const [filterYear, setFilterYear] = useState('');
  const [filterWeeklyOff, setFilterWeeklyOff] = useState('');

  /* ── Data fetching ── */
  const { data, isLoading, isError, error, refetch } = useDocList<HolidayListRow>('Holiday List', {
    fields: ['name', 'holiday_list_name', 'from_date', 'to_date', 'total_holidays', 'weekly_off'],
    limit: 200,
  });
  const { data: expandedDoc } = useDoc<HolidayListRow>('Holiday List', expandedName ?? '');
  const { data: editDoc } = useDoc<HolidayListRow>('Holiday List', editingDoc?.name ?? '', { enabled: !!editingDoc && dialogOpen });

  const createMutation = useCreateDoc('Holiday List');
  const updateMutation = useUpdateDoc('Holiday List');
  const deleteMutation = useDeleteDoc('Holiday List');

  const holidayLists = data || [];

  /* ── KPI computations ── */
  const currentYear = new Date().getFullYear();
  const kpiTotalLists = holidayLists.length;
  const kpiTotalHolidaysThisYear = useMemo(() => {
    return holidayLists
      .filter((hl) => {
        if (!hl.from_date) return false;
        const y = new Date(hl.from_date).getFullYear();
        return y === currentYear;
      })
      .reduce((s, r) => s + Number(r.total_holidays ?? 0), 0);
  }, [holidayLists, currentYear]);

  const kpiNextHoliday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let nextDate: Date | null = null;
    let nextDesc = '';
    for (const hl of holidayLists) {
      if (!Array.isArray(hl.holidays)) continue;
      for (const h of hl.holidays) {
        if (!h.holiday_date) continue;
        const d = new Date(h.holiday_date);
        if (d >= today && (!nextDate || d < nextDate)) {
          nextDate = d;
          nextDesc = h.description || '';
        }
      }
    }
    return nextDate ? { date: nextDate, description: nextDesc } : null;
  }, [holidayLists]);

  const kpiGrandTotal = holidayLists.reduce((s, r) => s + Number(r.total_holidays ?? 0), 0);

  /* ── Filtered rows ── */
  const filteredLists = useMemo(() => {
    return holidayLists.filter((r) => {
      if (filterYear && r.from_date) {
        const y = new Date(r.from_date).getFullYear();
        if (String(y) !== filterYear) return false;
      }
      if (filterWeeklyOff && r.weekly_off !== filterWeeklyOff) return false;
      return true;
    });
  }, [holidayLists, filterYear, filterWeeklyOff]);

  /* ── When editDoc loads, populate entries ── */
  const handleEditDocLoaded = useCallback(() => {
    if (editDoc && Array.isArray(editDoc.holidays) && editDoc.holidays.length > 0) {
      setEntries(editDoc.holidays.map((h: HolidayChild) => ({
        description: h.description || '',
        holiday_date: h.holiday_date || '',
        weekly_off: Number(h.weekly_off) === 1,
      })));
    }
  }, [editDoc]);

  // Trigger population when editDoc changes
  if (editingDoc && editDoc && entries.length === 1 && !entries[0].description && !entries[0].holiday_date) {
    setTimeout(handleEditDocLoaded, 0);
  }

  /* ── Dialog handlers ── */
  const openCreateDialog = () => {
    setEditingDoc(null);
    setHolidayListName('');
    setFromDate('');
    setToDate('');
    setWeeklyOff('');
    setEntries([emptyEntry()]);
    setDialogOpen(true);
  };

  const openEditDialog = (row: HolidayListRow) => {
    setEditingDoc(row);
    setHolidayListName(row.holiday_list_name || row.name);
    setFromDate(row.from_date || '');
    setToDate(row.to_date || '');
    setWeeklyOff(row.weekly_off || '');
    setEntries([emptyEntry()]);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!holidayListName.trim()) { toast.error('اسم قائمة العطلات مطلوب'); return; }
    if (!fromDate || !toDate) { toast.error('من تاريخ وإلى تاريخ مطلوبان'); return; }
    const rows = entries.filter((e) => e.holiday_date && e.description.trim());
    if (rows.length === 0) { toast.error('أضف صفاً واحداً على الأقل (تاريخ + وصف)'); return; }

    if (editingDoc) {
      const holidayRows = rows.map((r) => ({
        holiday_date: r.holiday_date,
        description: r.description.trim(),
        weekly_off: r.weekly_off ? 1 : 0,
      }));
      updateMutation.mutate({
        name: editingDoc.name,
        doc: {
          holiday_list_name: holidayListName,
          from_date: fromDate,
          to_date: toDate,
          weekly_off: weeklyOff || undefined,
          holidays: holidayRows,
        },
      }, {
        onSuccess: () => { toast.success('تم تعديل قائمة العطلات'); setDialogOpen(false); setEditingDoc(null); },
        onError: () => toast.error('تعذر التعديل'),
      });
    } else {
      const mapped = buildHolidayListCreate({
        holiday_list_name: holidayListName,
        from_date: fromDate,
        to_date: toDate,
        holidays: rows.map((r) => ({ holiday_date: r.holiday_date, description: r.description.trim() })),
      });
      createMutation.mutate(prepareFrappeDocForCreate(mapped), {
        onSuccess: () => {
          toast.success('تم إنشاء قائمة العطلات');
          setDialogOpen(false);
          setHolidayListName('');
          setFromDate('');
          setToDate('');
          setWeeklyOff('');
          setEntries([emptyEntry()]);
        },
        onError: () => toast.error('تعذر الحفظ — تحقق من عدم تكرار الاسم والتواريخ'),
      });
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) { setEditingDoc(null); setHolidayListName(''); setFromDate(''); setToDate(''); setWeeklyOff(''); setEntries([emptyEntry()]); }
  };

  const handleDelete = (row: HolidayListRow) => {
    deleteMutation.mutate(row.name, {
      onSuccess: () => { toast.success('تم الحذف'); setDeleteDialog(null); if (expandedName === row.name) setExpandedName(null); },
      onError: () => toast.error('فشل الحذف'),
    });
  };

  /* ── Table columns ── */
  const columns: Column<HolidayListRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'المعرّف',
        sortable: true,
        render: (value) => <span className="font-medium text-primary">{String(value)}</span>,
      },
      {
        key: 'holiday_list_name',
        header: 'الاسم',
        render: (_, row) => <span className="font-medium">{row.holiday_list_name || row.name}</span>,
      },
      {
        key: 'from_date',
        header: 'من',
        sortable: true,
        render: (value) => (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {value ? formatDate(String(value)) : '—'}
          </span>
        ),
      },
      {
        key: 'to_date',
        header: 'إلى',
        render: (value) => (value ? formatDate(String(value)) : '—'),
      },
      {
        key: 'total_holidays',
        header: 'أيام العطلات',
        sortable: true,
        render: (value) => <span className="tabular-nums font-medium">{formatNumber(Number(value ?? 0))}</span>,
      },
      {
        key: 'weekly_off',
        header: 'عطلة أسبوعية',
        render: (v) => {
          const val = String(v ?? '');
          const opt = WEEKLY_OFF_OPTIONS.find((o) => o.value === val);
          return <span className="text-xs">{opt ? opt.label : (val || '—')}</span>;
        },
      },
    ],
    [],
  );

  /* ── Render ── */
  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      {/* ── Page Header ── */}
      <PageHeader
        title="العطلات"
        description="إدارة قوائم العطلات الرسمية وعطلات نهاية الأسبوع"
        iconify="solar:calendar-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'العطلات' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={openCreateDialog}><Plus className="h-3.5 w-3.5" />قائمة جديدة</Button>
        }
      />

      {/* ── KPI Cards ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="قوائم العطلات"
          value={kpiTotalLists}
          icon={Calendar}
          accent="warning"
          description="إجمالي القوائم المسجلة"
        />
        <KpiCard
          title="عطلات السنة الحالية"
          value={kpiTotalHolidaysThisYear}
          icon={Clock}
          accent="info"
          description={`عطلات عام ${currentYear}`}
        />
        <KpiCard
          title="إجمالي أيام العطلات"
          value={kpiGrandTotal}
          icon={Calendar}
          accent="success"
          description="مجموع كل القوائم"
        />
        <KpiCard
          title="العطلة القادمة"
          value={kpiNextHoliday ? formatDate(kpiNextHoliday.date.toISOString()) : '—'}
          icon={Clock}
          accent="warning"
          description={kpiNextHoliday?.description || 'لا توجد عطلات قادمة'}
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
            value={filterYear || '__all__'}
            onValueChange={(v) => setFilterYear(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="السنة" />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || '__all__'} value={opt.value || '__all__'}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            dir="rtl"
            value={filterWeeklyOff || '__all__'}
            onValueChange={(v) => setFilterWeeklyOff(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="عطلة أسبوعية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">الكل</SelectItem>
              {WEEKLY_OFF_OPTIONS.filter((o) => o.value).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterYear || filterWeeklyOff) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive"
              onClick={() => { setFilterYear(''); setFilterWeeklyOff(''); }}
            >
              مسح الفلاتر
            </Button>
          )}
          <span className="text-[11px] text-muted-foreground">
            عرض {filteredLists.length} من {holidayLists.length}
          </span>
        </div>
      </div>

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-warning" />
              {editingDoc ? `تعديل قائمة العطلات — ${editingDoc.name}` : 'قائمة عطلات جديدة'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {/* ── Header Fields ── */}
            <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground">معلومات أساسية</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">اسم القائمة <span className="text-destructive">*</span></Label>
                  <Input value={holidayListName} onChange={(e) => setHolidayListName(e.target.value)} placeholder="رسمية 2026" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">عطلة أسبوعية</Label>
                  <Select dir="rtl" value={weeklyOff || '__none__'} onValueChange={(v) => setWeeklyOff(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="اختر اليوم" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون</SelectItem>
                      {WEEKLY_OFF_OPTIONS.filter((o) => o.value).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">من تاريخ</Label>
                  <Input type="date" dir="ltr" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">إلى تاريخ</Label>
                  <Input type="date" dir="ltr" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* ── Holiday Entries Sub-table ── */}
            <div className="rounded-lg border">
              <div className="bg-muted/35 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-warning" />
                  <span className="text-xs font-semibold">بنود العطلات الفردية</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setEntries([...entries, emptyEntry()])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة صف
                </Button>
              </div>
              <div className="overflow-x-auto">
                <div className="bg-muted/25 px-3 py-2 text-xs font-semibold grid grid-cols-12 gap-2">
                  <span className="col-span-4">الوصف</span>
                  <span className="col-span-3">التاريخ</span>
                  <span className="col-span-3">عطلة أسبوعية</span>
                  <span className="col-span-2" />
                </div>
                {entries.map((item, idx) => (
                  <div key={idx} className="px-3 py-2 grid grid-cols-12 gap-2 border-b last:border-b-0 items-center">
                    <Input
                      className="col-span-4 h-8 text-xs"
                      placeholder="وصف العطلة"
                      value={item.description}
                      onChange={(e) => {
                        const n = [...entries]; n[idx] = { ...n[idx], description: e.target.value }; setEntries(n);
                      }}
                    />
                    <Input
                      className="col-span-3 h-8 text-xs"
                      type="date"
                      dir="ltr"
                      value={item.holiday_date}
                      onChange={(e) => {
                        const n = [...entries]; n[idx] = { ...n[idx], holiday_date: e.target.value }; setEntries(n);
                      }}
                    />
                    <div className="col-span-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.weekly_off}
                        onChange={(e) => {
                          const n = [...entries]; n[idx] = { ...n[idx], weekly_off: e.target.checked }; setEntries(n);
                        }}
                        className="h-4 w-4 rounded border-border"
                      />
                      <span className="text-xs text-muted-foreground">نعم</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-2 h-8"
                      onClick={() => entries.length > 1 && setEntries(entries.filter((_, i) => i !== idx))}
                      disabled={entries.length === 1}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              {entries.length > 0 && (
                <div className="border-t bg-muted/15 px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    عدد العطلات: <span className="font-semibold text-foreground">{entries.filter((e) => e.holiday_date && e.description.trim()).length}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    إجمالي الصفوف: {entries.length}
                  </span>
                </div>
              )}
            </div>

            {/* ── Summary ── */}
            <div className="rounded-lg border bg-muted/10 p-3">
              <h4 className="text-xs font-semibold mb-2">ملخص القائمة</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">الاسم:</span>
                  <p className="font-medium truncate">{holidayListName || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">الفترة:</span>
                  <p className="font-medium">{fromDate ? formatDate(fromDate) : '—'} — {toDate ? formatDate(toDate) : '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">عطلة أسبوعية:</span>
                  <p className="font-medium">{WEEKLY_OFF_OPTIONS.find((o) => o.value === weeklyOff)?.label || 'بدون'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">عدد العطلات:</span>
                  <p className="font-medium">{entries.filter((e) => e.holiday_date && e.description.trim()).length}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={createMutation.isPending || updateMutation.isPending}>إلغاء</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="gap-1.5">
              {(createMutation.isPending || updateMutation.isPending) ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />جاري الحفظ...</>
              ) : (
                <><Check className="h-3.5 w-3.5" />حفظ</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Data Table ── */}
      <DataTable
        data={filteredLists}
        columns={columns}
        searchable
        loading={isLoading}
        tableId="holiday-lists"
        exportFileName="holiday-lists"
        onEdit={(row) => openEditDialog(row)}
        onDelete={(row) => setDeleteDialog(row)}
        onView={(row) => setExpandedName(expandedName === row.name ? null : row.name)}
      />

      {/* ── Expanded Holidays Detail ── */}
      {expandedName && expandedDoc && Array.isArray(expandedDoc.holidays) && expandedDoc.holidays.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-warning" />
              تفاصيل {expandedDoc.holiday_list_name || expandedDoc.name}
            </h3>
            <span className="text-[11px] text-muted-foreground">{expandedDoc.holidays.length} عطلة</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            <div className="bg-muted/25 px-3 py-2 text-xs font-semibold grid grid-cols-12 gap-2 sticky top-0">
              <span className="col-span-5">الوصف</span>
              <span className="col-span-4">التاريخ</span>
              <span className="col-span-3">عطلة أسبوعية</span>
            </div>
            {expandedDoc.holidays.map((h, i) => (
              <div key={i} className="px-3 py-2 grid grid-cols-12 gap-2 border-b last:border-b-0 text-xs items-center hover:bg-muted/10 transition-colors">
                <span className="col-span-5 font-medium">{h.description || '—'}</span>
                <span dir="ltr" className="col-span-4 tabular-nums">{h.holiday_date ? formatDate(String(h.holiday_date)) : '—'}</span>
                <span className="col-span-3">
                  {Number(h.weekly_off) === 1 ? (
                    <span className="inline-flex items-center gap-1 text-chart-2 font-medium">
                      <Check className="h-3 w-3" />نعم
                    </span>
                  ) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف قائمة العطلات &quot;{deleteDialog?.holiday_list_name || deleteDialog?.name}&quot; نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
