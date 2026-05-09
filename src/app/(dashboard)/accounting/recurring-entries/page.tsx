'use client';

import { useState, useMemo, useEffect } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { KpiCard } from '@/components/erp/kpi-card';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useDocList, useCreateDoc, useDeleteDoc, useUpdateDoc } from '@/lib/client/hooks';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { apiUpdateDoc } from '@/lib/client/api';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { RefreshCw, Play, Pause, Trash2, Plus, CalendarClock, Activity, Ban, Clock } from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface AutoRepeatRow {
  name: string;
  reference_doctype: string;
  reference_name: string;
  start_date: string;
  end_date?: string;
  next_schedule_date?: string;
  frequency: string;
  status: string;
  notify_by_email?: number;
}

// ============================================================
// Constants
// ============================================================

const FREQUENCY_LABELS: Record<string, string> = {
  Daily: 'يومي',
  Weekly: 'أسبوعي',
  Monthly: 'شهري',
  Quarterly: 'ربع سنوي',
  Yearly: 'سنوي',
};

const DOCTYPE_LABELS: Record<string, string> = {
  'Journal Entry': 'قيد يومية',
  'Payment Entry': 'سند دفع/قبض',
  'Expense Claim': 'مطالبة مصروفات',
};

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-success/12 text-success ring-1 ring-inset ring-success/25',
  Disabled: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border/40',
  Completed: 'bg-info/12 text-info ring-1 ring-inset ring-info/25',
};

// ============================================================
// Zod Schema
// ============================================================

const autoRepeatSchema = z.object({
  reference_doctype: z.string().min(1, 'نوع المستند مطلوب'),
  reference_name: z.string().min(1, 'رقم المستند مطلوب'),
  frequency: z.string().min(1, 'التكرار مطلوب'),
  start_date: z.string().min(1, 'تاريخ البداية مطلوب'),
  end_date: z.string(),
  notify_by_email: z.boolean(),
  repeat_count: z.coerce.number().min(0).optional(),
});

type AutoRepeatFormInput = z.input<typeof autoRepeatSchema>;
type AutoRepeatFormOutput = z.output<typeof autoRepeatSchema>;

// ============================================================
// Main Component
// ============================================================

export default function RecurringEntriesPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<AutoRepeatRow | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const { company: defaultCo } = useDefaultCompanyName();

  // ── Data fetching ──
  const { data = [], isLoading, isError, error, refetch } = useDocList<AutoRepeatRow>('Auto Repeat', {
    fields: ['name', 'reference_doctype', 'reference_name', 'start_date', 'end_date', 'next_schedule_date', 'frequency', 'status', 'notify_by_email'],
    order_by: 'modified desc',
    limit: 500,
  });

  const createMutation = useCreateDoc('Auto Repeat');
  const deleteMutation = useDeleteDoc('Auto Repeat');

  // ── Form ──
  const form = useForm<AutoRepeatFormInput, any, AutoRepeatFormOutput>({
    resolver: zodResolver(autoRepeatSchema),
    defaultValues: {
      reference_doctype: 'Journal Entry',
      reference_name: '',
      frequency: 'Monthly',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      notify_by_email: false,
      repeat_count: 0,
    },
  });

  const selectedDoctype = form.watch('reference_doctype');

  // ── KPIs ──
  const activeCount = useMemo(() => data.filter(r => r.status === 'Active').length, [data]);
  const disabledCount = useMemo(() => data.filter(r => r.status === 'Disabled').length, [data]);
  const completedCount = useMemo(() => data.filter(r => r.status === 'Completed').length, [data]);
  const dailyCount = useMemo(() => data.filter(r => r.frequency === 'Daily' && r.status === 'Active').length, [data]);

  // ── Handlers ──
  const handleCreate = async (formData: AutoRepeatFormOutput) => {
    try {
      const doc: Record<string, unknown> = {
        reference_doctype: formData.reference_doctype,
        reference_name: formData.reference_name,
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        notify_by_email: formData.notify_by_email ? 1 : 0,
        repeat_count: formData.repeat_count && formData.repeat_count > 0 ? formData.repeat_count : undefined,
      };
      await createMutation.mutateAsync(doc);
      toast.success('تم إنشاء القيد المتكرر بنجاح');
      setCreateDialogOpen(false);
      form.reset();
      void refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('حدث خطأ أثناء إنشاء القيد المتكرر', { description: msg });
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteMutation.mutate(selected.name, {
      onSuccess: () => {
        toast.success('تم حذف القيد المتكرر بنجاح');
        setDeleteDialogOpen(false);
        setSelected(null);
      },
      onError: () => toast.error('حدث خطأ أثناء الحذف'),
    });
  };

  const handleToggle = async (row: AutoRepeatRow) => {
    setTogglingKey(row.name);
    try {
      const newStatus = row.status === 'Active' ? 'Disabled' : 'Active';
      await apiUpdateDoc('Auto Repeat', row.name, { status: newStatus });
      toast.success(newStatus === 'Active' ? 'تم تفعيل القيد المتكرر' : 'تم تعطيل القيد المتكرر');
      void refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('حدث خطأ أثناء تبديل الحالة', { description: msg });
    } finally {
      setTogglingKey(null);
    }
  };

  // ── Columns ──
  const columns: Column<AutoRepeatRow>[] = [
    { key: 'name', header: 'الرقم', sortable: true, width: 'w-28', render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
    { key: 'reference_doctype', header: 'نوع المستند', render: (v) => DOCTYPE_LABELS[String(v)] || String(v) },
    { key: 'reference_name', header: 'رقم المستند', render: (v) => <span className="font-mono text-[10px]">{String(v)}</span> },
    { key: 'frequency', header: 'التكرار', render: (v) => (
      <Badge variant="secondary" className="text-[10px]">{FREQUENCY_LABELS[String(v)] || String(v)}</Badge>
    )},
    { key: 'start_date', header: 'تاريخ البداية', sortable: true, render: (v) => formatDate(String(v || '')) },
    { key: 'next_schedule_date', header: 'التنفيذ القادم', sortable: true, render: (v) => v ? formatDate(String(v)) : <span className="text-muted-foreground">—</span> },
    { key: 'status', header: 'الحالة', render: (v) => {
      const statusStr = String(v);
      const style = STATUS_STYLES[statusStr] || 'bg-muted text-muted-foreground ring-1 ring-inset ring-border/40';
      const label = statusStr === 'Active' ? 'نشط' : statusStr === 'Disabled' ? 'متوقف' : statusStr === 'Completed' ? 'مكتمل' : statusStr;
      return <Badge variant="outline" className={cn('border-0 text-xs font-semibold px-2 py-0.5', style)}>{label}</Badge>;
    }},
    { key: 'actions', header: 'إجراءات', width: 'w-36', render: (_, row) => (
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={togglingKey === row.name}
          onClick={() => void handleToggle(row)}
          title={row.status === 'Active' ? 'تعطيل' : 'تفعيل'}
        >
          {togglingKey === row.name ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : row.status === 'Active' ? (
            <Pause className="h-3.5 w-3.5 text-warning" />
          ) : (
            <Play className="h-3.5 w-3.5 text-success" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={() => { setSelected(row); setDeleteDialogOpen(true); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    )},
  ];

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="القيود المتكررة"
        description="إدارة القيود اليومية والمصروفات المتكررة تلقائياً"
        iconify="solar:refresh-circle-bold-duotone"
        accent="purple"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'القيود المتكررة' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { form.reset(); setCreateDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            قيد متكرر جديد
          </Button>
        }
      />

      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard title="إجمالي القيود" value={data.length} icon={CalendarClock} accent="primary" compact />
        <KpiCard title="نشطة" value={activeCount} icon={Activity} accent="success" compact />
        <KpiCard title="متوقفة" value={disabledCount} icon={Ban} accent="destructive" compact />
        <KpiCard title="تكرار يومي" value={dailyCount} icon={Clock} accent="info" compact />
      </KpiStrip>

      {/* DataTable */}
      <DataTable
        data={data}
        columns={columns}
        searchable
        loading={isLoading}
        tableId="auto-repeat-table"
        exportFileName="auto-repeat.csv"
      />

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-purple-600" />
              إنشاء قيد متكرر جديد
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">نوع المستند *</Label>
              <Select value={form.watch('reference_doctype')} onValueChange={v => form.setValue('reference_doctype', v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl" align="start">
                  <SelectItem value="Journal Entry">قيد يومية</SelectItem>
                  <SelectItem value="Payment Entry">سند دفع/قبض</SelectItem>
                  <SelectItem value="Expense Claim">مطالبة مصروفات</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.reference_doctype && (
                <p className="text-[10px] text-destructive">{form.formState.errors.reference_doctype.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">رقم المستند *</Label>
              <ErpLinkCombobox
                doctype={selectedDoctype}
                value={form.watch('reference_name')}
                onChange={(v) => form.setValue('reference_name', v)}
                placeholder="اختر المستند..."
              />
              {form.formState.errors.reference_name && (
                <p className="text-[10px] text-destructive">{form.formState.errors.reference_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">التكرار *</Label>
              <Select value={form.watch('frequency')} onValueChange={v => form.setValue('frequency', v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl" align="start">
                  <SelectItem value="Daily">يومي</SelectItem>
                  <SelectItem value="Weekly">أسبوعي</SelectItem>
                  <SelectItem value="Monthly">شهري</SelectItem>
                  <SelectItem value="Quarterly">ربع سنوي</SelectItem>
                  <SelectItem value="Yearly">سنوي</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.frequency && (
                <p className="text-[10px] text-destructive">{form.formState.errors.frequency.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">تاريخ البداية *</Label>
                <Input type="date" dir="ltr" {...form.register('start_date')} />
                {form.formState.errors.start_date && (
                  <p className="text-[10px] text-destructive">{form.formState.errors.start_date.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">تاريخ النهاية</Label>
                <Input type="date" dir="ltr" {...form.register('end_date')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">عدد التكرارات</Label>
                <Input type="number" dir="ltr" placeholder="0 = غير محدود" {...form.register('repeat_count', { valueAsNumber: true })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="notify-email"
                  checked={form.watch('notify_by_email')}
                  onCheckedChange={(checked) => form.setValue('notify_by_email', Boolean(checked))}
                />
                <Label htmlFor="notify-email" className="text-xs font-medium cursor-pointer">إشعار بالبريد</Label>
              </div>
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setCreateDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
              <Button type="submit" disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">
                {createMutation.isPending ? 'جاري الحفظ...' : 'إنشاء القيد المتكرر'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد الحذف</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  هل أنت متأكد من حذف القيد المتكرر &quot;{selected?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
