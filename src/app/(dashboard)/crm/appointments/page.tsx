'use client';

import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Plus, Calendar, CalendarDays, CalendarCheck, Clock, Pencil, Eye,
  Link2, Bell, RefreshCw, Download,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useDocList, useCreateDoc, useDeleteDoc, useUpdateDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { buildEventCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Ev = {
  name: string;
  subject?: string;
  starts_on?: string;
  ends_on?: string;
  status?: string;
  event_category?: string;
  event_type?: string;
  sync_with_google_calendar?: number | boolean;
  repeat_this_event?: number | boolean;
  repeat_on?: string;
  send_reminder?: number | boolean;
  reminder_datetime?: string;
  reference_doctype?: string;
  reference_docname?: string;
  description?: string;
};

const STATUS_AR: Record<string, string> = {
  Open: 'مفتوح',
  Closed: 'مغلق',
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-chart-1/10 text-chart-1',
  Closed: 'bg-muted text-muted-foreground',
};

const emptyForm = {
  subject: '',
  date: '',
  timeStart: '09:00',
  timeEnd: '10:00',
  desc: '',
  assignee: '',
  repeat: 'None' as 'None' | 'Daily' | 'Weekly' | 'Monthly',
  refType: '',
  refName: '',
  eventType: 'Private' as 'Private' | 'Public',
  sendReminder: true,
  reminderDatetime: '',
};

function toDateTime(date: string, time: string): string {
  if (!date) return '';
  const t = time && time.length >= 5 ? `${time}:00` : '09:00:00';
  return `${date} ${t}`;
}

export default function AppointmentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Ev | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({
    subject: '',
    date: '',
    timeStart: '09:00',
    timeEnd: '10:00',
    desc: '',
    status: 'Open' as 'Open' | 'Closed',
    repeat: 'None' as 'None' | 'Daily' | 'Weekly' | 'Monthly',
    eventType: 'Private' as 'Private' | 'Public',
    sendReminder: true,
    reminderDatetime: '',
    syncWithGoogle: false,
  });

  const { data, isLoading, isError, error, refetch } = useDocList<Ev>('Event', {
    fields: ['name', 'subject', 'starts_on', 'ends_on', 'status', 'event_category', 'event_type', 'sync_with_google_calendar', 'repeat_this_event', 'send_reminder', 'reference_doctype', 'reference_docname'],
    filters: [['event_category', '=', 'Meeting']],
    limit: 300,
    order_by: 'starts_on desc',
  });
  const createMutation = useCreateDoc('Event');
  const deleteMutation = useDeleteDoc('Event');
  const updateMutation = useUpdateDoc('Event');

  const rows = data || [];

  // ── Filtered data ──
  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter(r => r.status === statusFilter);
  }, [rows, statusFilter]);

  // ── KPIs ──
  const totalAppointments = rows.length;
  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = rows.filter(r => String(r.starts_on || '').startsWith(today)).length;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const thisWeekAppointments = rows.filter(r => {
    const d = new Date(String(r.starts_on || ''));
    return d >= weekStart && d <= weekEnd;
  }).length;
  const completedAppointments = rows.filter(r => r.status === 'Closed').length;

  // ── Today's schedule ──
  const todayList = useMemo(() => rows.filter(r => String(r.starts_on || '').startsWith(today)), [rows, today]);

  // ── Create handler ──
  const handleCreate = () => {
    if (!form.subject.trim() || !form.date) { toast.error('الموضوع والتاريخ مطلوبان'); return; }
    const starts_on = toDateTime(form.date, form.timeStart);
    const ends_on = toDateTime(form.date, form.timeEnd) || undefined;
    const mapped = buildEventCreate({
      subject: form.subject,
      starts_on,
      ends_on,
      event_type: form.eventType,
      event_category: 'Meeting',
      description: form.desc || undefined,
      reference_doctype: form.refType || undefined,
      reference_docname: form.refName || undefined,
    });
    if (form.repeat !== 'None') {
      mapped.repeat_this_event = 1;
      mapped.repeat_on = form.repeat;
    }
    if (form.assignee) {
      mapped.event_participants = [{ reference_doctype: 'User', reference_docname: form.assignee }];
    }
    if (form.sendReminder) {
      mapped.send_reminder = 1;
      if (form.reminderDatetime) {
        mapped.reminder_datetime = form.reminderDatetime;
      }
    }
    createMutation.mutate(prepareFrappeDocForCreate(mapped), {
      onSuccess: () => {
        toast.success('تم إنشاء الموعد');
        setDialogOpen(false);
        setForm(emptyForm);
        void refetch();
      },
      onError: () => toast.error('فشل إنشاء الموعد'),
    });
  };

  // ── Edit handlers ──
  const openEditDialog = (row: Ev) => {
    setSelected(row);
    // Parse date and time from starts_on
    const startsParts = String(row.starts_on || '').replace('T', ' ').split(' ');
    const datePart = startsParts[0] || '';
    const timeStartPart = (startsParts[1] || '09:00:00').slice(0, 5);
    const endsParts = String(row.ends_on || '').replace('T', ' ').split(' ');
    const timeEndPart = (endsParts[1] || '10:00:00').slice(0, 5);

    setEditForm({
      subject: row.subject || '',
      date: datePart,
      timeStart: timeStartPart,
      timeEnd: timeEndPart,
      desc: row.description || '',
      status: (row.status as 'Open' | 'Closed') || 'Open',
      repeat: row.repeat_this_event && Number(row.repeat_this_event) === 1 ? 'Weekly' : 'None',
      eventType: (row.event_type as 'Private' | 'Public') || 'Private',
      sendReminder: Number(row.send_reminder) === 1,
      reminderDatetime: row.reminder_datetime || '',
      syncWithGoogle: Number(row.sync_with_google_calendar) === 1,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selected) return;
    const starts_on = toDateTime(editForm.date, editForm.timeStart);
    const ends_on = toDateTime(editForm.date, editForm.timeEnd) || undefined;
    const doc: Record<string, unknown> = {
      subject: editForm.subject.trim(),
      starts_on,
      status: editForm.status,
      event_type: editForm.eventType,
      send_reminder: editForm.sendReminder ? 1 : 0,
      sync_with_google_calendar: editForm.syncWithGoogle ? 1 : 0,
    };
    if (ends_on) doc.ends_on = ends_on;
    if (editForm.desc) doc.description = editForm.desc;
    if (editForm.repeat !== 'None') {
      doc.repeat_this_event = 1;
      doc.repeat_on = editForm.repeat;
    } else {
      doc.repeat_this_event = 0;
    }
    if (editForm.reminderDatetime) {
      doc.reminder_datetime = editForm.reminderDatetime;
    }
    updateMutation.mutate(
      { name: selected.name, doc },
      {
        onSuccess: () => {
          toast.success('تم تحديث الموعد بنجاح');
          setEditDialogOpen(false);
          setSelected(null);
          void refetch();
        },
        onError: () => toast.error('فشل التحديث — تحقق من الصلاحيات'),
      }
    );
  };

  // ── Delete handler ──
  const handleDelete = () => {
    if (!selected) return;
    deleteMutation.mutate(selected.name, {
      onSuccess: () => {
        toast.success('تم حذف الموعد');
        setDeleteDialogOpen(false);
        setSelected(null);
        void refetch();
      },
      onError: () => toast.error('فشل الحذف'),
    });
  };

  const downloadIcs = (row: Ev) => {
    const start = String(row.starts_on || '').replace(/[-:]/g, '').replace(' ', 'T').slice(0, 15);
    const end = String(row.ends_on || '').replace(/[-:]/g, '').replace(' ', 'T').slice(0, 15);
    const content = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `UID:${row.name}@erp-pro`,
      `DTSTART:${start}`,
      end ? `DTEND:${end}` : '',
      `SUMMARY:${(row.subject || row.name).replace(/\n/g, ' ')}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\n');
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${row.name}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Columns ──
  const columns: Column<Ev>[] = useMemo(() => [
    {
      key: 'subject',
      header: 'الموضوع',
      sortable: true,
      render: (_, r) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-medium">{r.subject || r.name}</span>
        </div>
      ),
    },
    {
      key: 'starts_on',
      header: 'البداية',
      sortable: true,
      render: (v) => <span dir="ltr" className="text-xs">{String(v || '—').replace('T', ' ').slice(0, 16)}</span>,
    },
    {
      key: 'ends_on',
      header: 'النهاية',
      render: (v) => <span dir="ltr" className="text-xs">{String(v || '—').replace('T', ' ').slice(0, 16)}</span>,
    },
    {
      key: 'status',
      header: 'الحالة',
      width: 'w-24',
      render: (v) => {
        const status = String(v);
        return (
          <Badge variant="outline" className={cn('text-[10px] font-medium px-2 py-0.5 border-0', STATUS_COLORS[status] || 'bg-muted text-muted-foreground')}>
            {STATUS_AR[status] || status}
          </Badge>
        );
      },
    },
    {
      key: 'event_type',
      header: 'النوع',
      width: 'w-24',
      render: (v) => (
        <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 border-0 bg-muted/50">
          {String(v) === 'Public' ? 'عام' : 'خاص'}
        </Badge>
      ),
    },
    {
      key: 'repeat_this_event',
      header: 'التكرار',
      width: 'w-24',
      render: (v) => (
        <Badge variant="outline" className={cn(
          'text-[10px] font-medium px-2 py-0.5 border-0',
          Number(v) === 1 ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'
        )}>
          {Number(v) === 1 ? 'مكرّر' : 'بدون'}
        </Badge>
      ),
    },
    {
      key: 'reference_docname',
      header: 'المرجع',
      render: (_, r) => {
        if (!r.reference_doctype || !r.reference_docname) return <span className="text-muted-foreground text-xs">—</span>;
        const typeLabel = r.reference_doctype === 'Lead' ? 'محتمل' : r.reference_doctype === 'Customer' ? 'عميل' : r.reference_doctype === 'Opportunity' ? 'فرصة' : r.reference_doctype;
        return (
          <div className="flex items-center gap-1">
            <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-primary cursor-pointer">{r.reference_docname}</span>
            <span className="text-[10px] text-muted-foreground">({typeLabel})</span>
          </div>
        );
      },
    },
  ], []);

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="المواعيد"
        description="إدارة مواعيد العملاء والاجتماعات مع تتبع الحالة والتكرار والتنبيهات."
        iconify="solar:calendar-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'إدارة العملاء', href: '/crm' }, { label: 'المواعيد' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(emptyForm); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />موعد جديد
          </Button>
        }
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />
      {/* ملخص مواعيد اليوم */}
      {todayList.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-warning" />
            مواعيد اليوم ({todayList.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {todayList.map((r) => (
              <div
                key={r.name}
                className={cn(
                  'rounded-lg border p-3 flex items-center justify-between',
                  r.status === 'Open' ? 'border-chart-1/30 bg-chart-1/5' : 'border-border/40 bg-muted/30'
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.subject || r.name}</p>
                  <p className="text-[11px] text-muted-foreground" dir="ltr">
                    {String(r.starts_on || '').replace('T', ' ').slice(11, 16)}
                    {r.ends_on ? ` — ${String(r.ends_on).replace('T', ' ').slice(11, 16)}` : ''}
                  </p>
                </div>
                <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 border-0 shrink-0', STATUS_COLORS[r.status || ''] || 'bg-muted text-muted-foreground')}>
                  {STATUS_AR[r.status || ''] || r.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <PageShell className="space-y-4" padded={false}>
        <div className="px-4 pt-4">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="bg-muted/35">
              <TabsTrigger value="all" className="text-xs">الكل</TabsTrigger>
              <TabsTrigger value="Open" className="text-xs">مفتوح</TabsTrigger>
              <TabsTrigger value="Closed" className="text-xs">مغلق</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <DataTable
          data={filteredData}
          columns={columns}
          searchable
          loading={isLoading}
          onEdit={(row) => openEditDialog(row)}
          onDelete={(row) => { setSelected(row); setDeleteDialogOpen(true); }}
          tableId="crm-appointments"
          exportFileName="appointments.csv"
          printTitle="المواعيد"
        />
      </PageShell>

      {/* تصدير التقويم */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            تصدير التقويم (ICS)
          </h3>
          <div className="space-y-2">
            {rows.slice(0, 8).map((r) => (
              <div key={r.name} className="flex items-center justify-between text-sm border rounded-lg p-2 hover:bg-muted/30 transition-colors">
                <span className="truncate">{r.subject || r.name}</span>
                <Button size="sm" variant="outline" onClick={() => downloadIcs(r)} className="shrink-0 gap-1.5 text-xs">
                  <Download className="h-3 w-3" />
                  تحميل ICS
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          Create Dialog
          ════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <span>موعد جديد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات الموعد</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center"><Calendar className="h-3 w-3 text-primary" /></span>
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الموضوع <span className="text-destructive text-xs">*</span></Label>
                  <Input placeholder="موضوع الموعد" value={form.subject} onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">التاريخ <span className="text-destructive text-xs">*</span></Label>
                  <Input type="date" dir="ltr" value={form.date} onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">من</Label>
                    <Input type="time" dir="ltr" value={form.timeStart} onChange={(e) => setForm(prev => ({ ...prev, timeStart: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">إلى</Label>
                    <Input type="time" dir="ltr" value={form.timeEnd} onChange={(e) => setForm(prev => ({ ...prev, timeEnd: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">نوع الحدث</Label>
                    <Select dir="rtl" value={form.eventType} onValueChange={(val) => setForm(prev => ({ ...prev, eventType: val as 'Private' | 'Public' }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="Private">خاص</SelectItem>
                        <SelectItem value="Public">عام</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">التكرار</Label>
                    <Select dir="rtl" value={form.repeat} onValueChange={(val) => setForm(prev => ({ ...prev, repeat: val as typeof form.repeat }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="None">بدون</SelectItem>
                        <SelectItem value="Daily">يومي</SelectItem>
                        <SelectItem value="Weekly">أسبوعي</SelectItem>
                        <SelectItem value="Monthly">شهري</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الوصف</Label>
                  <Textarea placeholder="وصف الموعد..." value={form.desc} onChange={(e) => setForm(prev => ({ ...prev, desc: e.target.value }))} rows={2} />
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><Bell className="h-3 w-3 text-info" /></span>
                  التنبيهات والمرجع
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={form.sendReminder}
                    onCheckedChange={(v) => setForm(prev => ({ ...prev, sendReminder: v === true }))}
                  />
                  <Label className="text-sm font-medium">إرسال تنبيه</Label>
                </div>
                {form.sendReminder && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">وقت التنبيه</Label>
                    <Input type="datetime-local" dir="ltr" value={form.reminderDatetime} onChange={(e) => setForm(prev => ({ ...prev, reminderDatetime: e.target.value }))} />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">تعيين لموظف</Label>
                    <ErpLinkCombobox doctype="User" value={form.assignee} onChange={(v) => setForm(prev => ({ ...prev, assignee: v }))} displayKey="full_name" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">مرجع (اختياري)</Label>
                    <Select dir="rtl" value={form.refType} onValueChange={(val) => { setForm(prev => ({ ...prev, refType: val, refName: '' })); }}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر..." /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="">—</SelectItem>
                        <SelectItem value="Lead">عميل محتمل</SelectItem>
                        <SelectItem value="Customer">عميل حالي</SelectItem>
                        <SelectItem value="Opportunity">فرصة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {form.refType && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">اسم المرجع</Label>
                    {form.refType === 'Lead' && <ErpLinkCombobox doctype="Lead" value={form.refName} onChange={(v) => setForm(prev => ({ ...prev, refName: v }))} />}
                    {form.refType === 'Customer' && <ErpLinkCombobox doctype="Customer" value={form.refName} onChange={(v) => setForm(prev => ({ ...prev, refName: v }))} displayKey="customer_name" />}
                    {form.refType === 'Opportunity' && <ErpLinkCombobox doctype="Opportunity" value={form.refName} onChange={(v) => setForm(prev => ({ ...prev, refName: v }))} />}
                  </div>
                )}
              </div>
            </fieldset>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">
              {createMutation.isPending ? (
                <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />جاري الحفظ...</>
              ) : 'حفظ الموعد'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════
          Edit Dialog
          ════════════════════════════════════════════════════════ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <span>تعديل الموعد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">تعديل: {selected?.subject || selected?.name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><Calendar className="h-3 w-3 text-info" /></span>
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">كود الموعد</Label>
                  <Input value={selected?.name || ''} disabled className="bg-muted text-muted-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الموضوع <span className="text-destructive text-xs">*</span></Label>
                  <Input value={editForm.subject} onChange={(e) => setEditForm(prev => ({ ...prev, subject: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">التاريخ</Label>
                  <Input type="date" dir="ltr" value={editForm.date} onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">من</Label>
                    <Input type="time" dir="ltr" value={editForm.timeStart} onChange={(e) => setEditForm(prev => ({ ...prev, timeStart: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">إلى</Label>
                    <Input type="time" dir="ltr" value={editForm.timeEnd} onChange={(e) => setEditForm(prev => ({ ...prev, timeEnd: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الحالة</Label>
                    <Select dir="rtl" value={editForm.status} onValueChange={(val) => setEditForm(prev => ({ ...prev, status: val as 'Open' | 'Closed' }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="Open">مفتوح</SelectItem>
                        <SelectItem value="Closed">مغلق</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">نوع الحدث</Label>
                    <Select dir="rtl" value={editForm.eventType} onValueChange={(val) => setEditForm(prev => ({ ...prev, eventType: val as 'Private' | 'Public' }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="Private">خاص</SelectItem>
                        <SelectItem value="Public">عام</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">التكرار</Label>
                    <Select dir="rtl" value={editForm.repeat} onValueChange={(val) => setEditForm(prev => ({ ...prev, repeat: val as typeof editForm.repeat }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="None">بدون</SelectItem>
                        <SelectItem value="Daily">يومي</SelectItem>
                        <SelectItem value="Weekly">أسبوعي</SelectItem>
                        <SelectItem value="Monthly">شهري</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الوصف</Label>
                    <Textarea value={editForm.desc} onChange={(e) => setEditForm(prev => ({ ...prev, desc: e.target.value }))} rows={2} />
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-warning/10 flex items-center justify-center"><Bell className="h-3 w-3 text-warning" /></span>
                  التنبيهات والمزامنة
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={editForm.sendReminder}
                    onCheckedChange={(v) => setEditForm(prev => ({ ...prev, sendReminder: v === true }))}
                  />
                  <Label className="text-sm font-medium">إرسال تنبيه</Label>
                </div>
                {editForm.sendReminder && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">وقت التنبيه</Label>
                    <Input type="datetime-local" dir="ltr" value={editForm.reminderDatetime} onChange={(e) => setEditForm(prev => ({ ...prev, reminderDatetime: e.target.value }))} />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={editForm.syncWithGoogle}
                    onCheckedChange={(v) => setEditForm(prev => ({ ...prev, syncWithGoogle: v === true }))}
                  />
                  <Label className="text-sm font-medium">مزامنة مع تقويم Google</Label>
                </div>
              </div>
            </fieldset>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="gap-1.5 min-w-[130px]">
              {updateMutation.isPending ? (
                <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />جاري الحفظ...</>
              ) : 'حفظ التعديلات'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════
          Delete Confirmation
          ════════════════════════════════════════════════════════ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الموعد &quot;{selected?.subject || selected?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
