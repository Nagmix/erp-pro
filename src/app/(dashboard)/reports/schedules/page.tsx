'use client';

import { useState, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  Send,
  FileSpreadsheet,
  FileText,
  ToggleLeft,
  CalendarClock,
  Mail,
  ChevronLeft,
} from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { ConfirmationDialog } from '@/components/erp/confirmation-dialog';
import { EmptyState } from '@/components/erp/empty-state';
import { DataTable, type Column } from '@/components/erp/data-table';
import {
  useReportSchedules,
  useCreateReportSchedule,
  useToggleReportSchedule,
  useDeleteReportSchedule,
} from '@/lib/client/hooks';
import { REPORTS_CATALOG } from '@/lib/reports/catalog';
import { toast } from '@/hooks/use-toast';
import type { ReportSchedule } from '@/lib/client/api';
import { cn } from '@/lib/utils';

// ── ثوابت الترجمة ─────────────────────────────────────────────
const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'يومي',
  weekly: 'أسبوعي',
  monthly: 'شهري',
};

const FORMAT_LABELS: Record<string, string> = {
  pdf: 'PDF',
  excel: 'إكسل',
  csv: 'CSV',
};

const FORMAT_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  excel: FileSpreadsheet,
  csv: FileSpreadsheet,
};

// ── خريطة التكرار إلى cron ────────────────────────────────────
function frequencyToCron(freq: string): string {
  switch (freq) {
    case 'daily':
      return '0 8 * * *';
    case 'weekly':
      return '0 8 * * 1';
    case 'monthly':
      return '0 8 1 * *';
    default:
      return '0 8 * * *';
  }
}

function cronToFrequency(cron: string): string {
  if (cron.includes('1 * *')) return 'monthly';
  if (cron.includes('* * 1') || cron.includes('* * 0') || cron.includes('* * 2') || cron.includes('* * 3') || cron.includes('* * 4') || cron.includes('* * 5') || cron.includes('* * 6')) return 'weekly';
  return 'daily';
}

// ── قائمة التقارير المتاحة ─────────────────────────────────────
const AVAILABLE_REPORTS = REPORTS_CATALOG.map((r) => ({
  id: r.id,
  title: r.title,
  reportName: r.reportName,
}));

// ── نموذج الجدول ──────────────────────────────────────────────
type ScheduleFormState = {
  reportId: string;
  frequency: string;
  emailTo: string;
  format: 'csv' | 'excel' | 'pdf';
  enabled: boolean;
  filters: string;
};

const EMPTY_FORM: ScheduleFormState = {
  reportId: '',
  frequency: 'daily',
  emailTo: '',
  format: 'pdf',
  enabled: true,
  filters: '',
};

// ── المكون الرئيسي ────────────────────────────────────────────
export default function ReportSchedulesPage() {
  const { data: schedules = [], isLoading, error, refetch } = useReportSchedules();
  const createMutation = useCreateReportSchedule();
  const toggleMutation = useToggleReportSchedule();
  const deleteMutation = useDeleteReportSchedule();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ReportSchedule | null>(null);

  // ── فتح حوار الإضافة ───────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  // ── فتح حوار التعديل ───────────────────────────────────────
  const openEdit = (row: ReportSchedule) => {
    setEditingId(row.id);
    setForm({
      reportId: row.reportId,
      frequency: cronToFrequency(row.cron),
      emailTo: row.emailTo,
      format: row.format,
      enabled: row.enabled,
      filters: '',
    });
    setFormOpen(true);
  };

  // ── حفظ (إنشاء أو تعديل) ───────────────────────────────────
  const handleSave = async () => {
    if (!form.reportId) {
      toast({ title: 'خطأ', description: 'يرجى اختيار التقرير', variant: 'destructive' });
      return;
    }
    if (!form.emailTo.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال البريد الإلكتروني', variant: 'destructive' });
      return;
    }

    const payload = {
      reportId: form.reportId,
      cron: frequencyToCron(form.frequency),
      emailTo: form.emailTo.trim(),
      format: form.format,
      enabled: form.enabled,
    };

    try {
      await createMutation.mutateAsync(payload);
      toast({ title: 'تم بنجاح', description: editingId ? 'تم تحديث الجدول' : 'تم إنشاء الجدول بنجاح' });
      setFormOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (err) {
      toast({ title: 'خطأ', description: (err as Error).message, variant: 'destructive' });
    }
  };

  // ── تبديل التفعيل ──────────────────────────────────────────
  const handleToggle = async (row: ReportSchedule) => {
    try {
      await toggleMutation.mutateAsync({ id: row.id, enabled: !row.enabled });
      toast({
        title: row.enabled ? 'تم التعطيل' : 'تم التفعيل',
        description: row.enabled ? 'تم تعطيل الجدول' : 'تم تفعيل الجدول',
      });
    } catch (err) {
      toast({ title: 'خطأ', description: (err as Error).message, variant: 'destructive' });
    }
  };

  // ── حذف ─────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: 'تم الحذف', description: 'تم حذف الجدول بنجاح' });
      setDeleteTarget(null);
    } catch (err) {
      toast({ title: 'خطأ', description: (err as Error).message, variant: 'destructive' });
    }
  };

  // ── تقرير عنوان من الـ catalog ─────────────────────────────
  const getReportTitle = (reportId: string) => {
    const found = AVAILABLE_REPORTS.find((r) => r.id === reportId);
    return found?.title ?? reportId;
  };

  // ── أعمدة الجدول ───────────────────────────────────────────
  const columns: Column<ReportSchedule>[] = useMemo(
    () => [
      {
        key: 'reportId',
        header: 'التقرير',
        sortable: true,
        width: 'min-w-[180px]',
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              'bg-primary/10 text-primary'
            )}>
              <FileText className="h-4 w-4" />
            </div>
            <span className="font-medium truncate">{getReportTitle(row.reportId)}</span>
          </div>
        ),
      },
      {
        key: 'cron',
        header: 'التكرار',
        sortable: true,
        width: 'min-w-[100px]',
        render: (_, row) => {
          const freq = cronToFrequency(row.cron);
          return (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {FREQUENCY_LABELS[freq] ?? freq}
            </Badge>
          );
        },
      },
      {
        key: 'emailTo',
        header: 'البريد الإلكتروني',
        sortable: true,
        width: 'min-w-[180px]',
        render: (_, row) => (
          <div className="flex items-center gap-1.5 text-xs">
            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[220px]" dir="ltr">{row.emailTo}</span>
          </div>
        ),
      },
      {
        key: 'format',
        header: 'الصيغة',
        sortable: true,
        width: 'min-w-[90px]',
        render: (_, row) => {
          const FmtIcon = FORMAT_ICONS[row.format] ?? FileText;
          return (
            <Badge variant="outline" className="gap-1 text-xs">
              <FmtIcon className="h-3 w-3" />
              {FORMAT_LABELS[row.format] ?? row.format}
            </Badge>
          );
        },
      },
      {
        key: 'enabled',
        header: 'الحالة',
        sortable: true,
        width: 'min-w-[100px]',
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={row.enabled}
              onCheckedChange={() => handleToggle(row)}
              disabled={toggleMutation.isPending}
              aria-label={row.enabled ? 'تعطيل' : 'تفعيل'}
            />
            <span className={cn('text-xs font-medium', row.enabled ? 'text-emerald-600' : 'text-muted-foreground')}>
              {row.enabled ? 'مفعّل' : 'معطّل'}
            </span>
          </div>
        ),
      },
    ],
    [toggleMutation.isPending]
  );

  // ── إحصائيات سريعة ─────────────────────────────────────────
  const totalSchedules = schedules.length;
  const enabledCount = schedules.filter((s) => s.enabled).length;
  const disabledCount = totalSchedules - enabledCount;

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="جدولة التقارير"
        description="إدارة جداول إرسال التقارير تلقائياً عبر البريد الإلكتروني بالتكرار والصيغة المحددة"
        iconify="solar:calendar-bold-duotone"
        accent="purple"
        breadcrumbs={[
          { label: 'التقارير', href: '/reports' },
          { label: 'جدولة التقارير' },
        ]}
        actions={
          <Button onClick={openCreate} className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            إضافة جدول
          </Button>
        }
      />

      {/* ── بطاقات الإحصائيات ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border/40 hover:border-border/60 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">إجمالي الجداول</p>
              <p className="text-xl font-bold">{totalSchedules}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 hover:border-border/60 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ToggleLeft className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">مفعّل</p>
              <p className="text-xl font-bold text-emerald-600">{enabledCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 hover:border-border/60 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">معطّل</p>
              <p className="text-xl font-bold text-amber-600">{disabledCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── جدول البيانات ───────────────────────────────────── */}
      <DataTable
        data={schedules}
        columns={columns}
        loading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        searchable
        pageSize={10}
        tableId="report-schedules"
        exportFileName="جدولة_التقارير"
        onAdd={openCreate}
        addLabel="إضافة جدول"
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row as ReportSchedule)}
        getRowId={(row) => (row as ReportSchedule).id}
      />

      {/* ── حوار الإضافة / التعديل ──────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingId ? (
                <>
                  <Pencil className="h-4 w-4" />
                  تعديل الجدول
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  إضافة جدول جديد
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* التقرير */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">التقرير</Label>
              <Select
                value={form.reportId}
                onValueChange={(v) => setForm((f) => ({ ...f, reportId: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر التقرير" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_REPORTS.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* التكرار */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">التكرار</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setForm((f) => ({ ...f, frequency: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر التكرار" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">
                    <span className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      يومي
                    </span>
                  </SelectItem>
                  <SelectItem value="weekly">
                    <span className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      أسبوعي
                    </span>
                  </SelectItem>
                  <SelectItem value="monthly">
                    <span className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      شهري
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* البريد الإلكتروني */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  dir="ltr"
                  className="ps-9 text-xs"
                  placeholder="email@example.com, user@company.com"
                  value={form.emailTo}
                  onChange={(e) => setForm((f) => ({ ...f, emailTo: e.target.value }))}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">يمكنك إدخال أكثر من بريد مفصول بفاصلة</p>
            </div>

            {/* الصيغة */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">صيغة التصدير</Label>
              <Select
                value={form.format}
                onValueChange={(v) => setForm((f) => ({ ...f, format: v as 'csv' | 'excel' | 'pdf' }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر الصيغة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">
                    <span className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      PDF
                    </span>
                  </SelectItem>
                  <SelectItem value="excel">
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      إكسل
                    </span>
                  </SelectItem>
                  <SelectItem value="csv">
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      CSV
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* فلاتر إضافية (اختياري) */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                فلاتر إضافية
                <span className="text-muted-foreground font-normal ms-1">(اختياري)</span>
              </Label>
              <Textarea
                dir="ltr"
                className="text-xs font-mono min-h-[60px]"
                placeholder='{"company": "شركة", "from_date": "2024-01-01"}'
                value={form.filters}
                onChange={(e) => setForm((f) => ({ ...f, filters: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground">أدخل الفلاتر ككائن JSON</p>
            </div>

            {/* التفعيل */}
            <div className="flex items-center justify-between rounded-lg border border-border/40 p-3">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium">تفعيل الجدول</Label>
                <p className="text-[10px] text-muted-foreground">عند التفعيل سيتم إرسال التقرير تلقائياً</p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, enabled: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={createMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              loading={createMutation.isPending}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {editingId ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── حوار تأكيد الحذف ────────────────────────────────── */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="تأكيد الحذف"
        description={
          deleteTarget
            ? `هل أنت متأكد من حذف جدول التقرير "${getReportTitle(deleteTarget.reportId)}"؟ لا يمكن التراجع عن هذا الإجراء.`
            : ''
        }
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
