'use client';

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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
  Calendar, CalendarDays, CalendarCheck, Clock, ChevronLeft, ChevronRight,
  Plus, Eye, X,
} from 'lucide-react';
import { useDocList, useCreateDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { buildEventCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ──────────────── Types ──────────────── */

type Ev = {
  name: string;
  subject?: string;
  starts_on?: string;
  ends_on?: string;
  status?: string;
  event_category?: string;
  event_type?: string;
  description?: string;
  reference_doctype?: string;
  reference_docname?: string;
  repeat_this_event?: number | boolean;
};

/* ──────────────── Constants ──────────────── */

const ARABIC_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const STATUS_AR: Record<string, string> = {
  Open: 'مفتوح',
  Closed: 'مغلق',
  Cancelled: 'ملغي',
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-chart-1 text-white',
  Closed: 'bg-muted text-muted-foreground',
  Cancelled: 'bg-destructive text-white',
};

const STATUS_BORDER: Record<string, string> = {
  Open: 'border-chart-1',
  Closed: 'border-muted',
  Cancelled: 'border-destructive',
};

type ViewMode = 'month' | 'week' | 'day';

/* ──────────────── Calendar Helpers ──────────────── */

function getCalendarDays(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  // Saturday = 6, but we want Saturday as index 0
  let startDow = firstDay.getDay(); // 0=Sun, 6=Sat
  // Convert to Sat=0, Sun=1, ..., Fri=6
  const satBasedDow = (startDow + 1) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = [];

  // Fill leading days from prev month
  for (let i = 0; i < satBasedDow; i++) {
    const d = prevMonthDays - satBasedDow + i + 1;
    week.push(null); // null means not in current month
  }

  for (let day = 1; day <= daysInMonth; day++) {
    week.push(new Date(year, month, day));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  // Fill trailing days
  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null);
    }
    weeks.push(week);
  }

  return weeks;
}

function getWeekDays(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  // Find Saturday of this week
  const dow = d.getDay(); // 0=Sun, 6=Sat
  const satBasedDow = (dow + 1) % 7; // Sat=0
  d.setDate(d.getDate() - satBasedDow);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseEventDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  return String(dateStr).replace('T', ' ').slice(0, 10);
}

function parseEventTime(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const parts = String(dateStr).replace('T', ' ').split(' ');
  return (parts[1] || '').slice(0, 5);
}

function toDateTime(date: string, time: string): string {
  if (!date) return '';
  const t = time && time.length >= 5 ? `${time}:00` : '09:00:00';
  return `${date} ${t}`;
}

/* ──────────────── Main Component ──────────────── */

export default function CalendarPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [weekBase, setWeekBase] = useState<Date>(today);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Ev | null>(null);
  const [createDate, setCreateDate] = useState('');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [refTypeFilter, setRefTypeFilter] = useState('');

  const [form, setForm] = useState({
    subject: '',
    timeStart: '09:00',
    timeEnd: '10:00',
    desc: '',
    assignee: '',
    repeat: 'None' as 'None' | 'Daily' | 'Weekly' | 'Monthly',
    refType: '',
    refName: '',
    eventType: 'Private' as 'Private' | 'Public',
    sendReminder: true,
  });

  // ── Fetch Events ──
  const { data, isLoading, isError, error, refetch } = useDocList<Ev>('Event', {
    fields: ['name', 'subject', 'starts_on', 'ends_on', 'status', 'event_category', 'event_type', 'description', 'reference_doctype', 'reference_docname', 'repeat_this_event'],
    filters: [['event_category', '=', 'Meeting']],
    limit: 500,
    order_by: 'starts_on desc',
  });

  const createMutation = useCreateDoc('Event');

  const events = useMemo(() => {
    let rows = data || [];
    if (statusFilter !== 'all') rows = rows.filter(r => r.status === statusFilter);
    if (assigneeFilter) rows = rows.filter(r => r.name === assigneeFilter); // simplified
    if (refTypeFilter) rows = rows.filter(r => r.reference_doctype === refTypeFilter);
    return rows;
  }, [data, statusFilter, assigneeFilter, refTypeFilter]);

  // ── Build event map by date ──
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Ev[]>();
    for (const ev of events) {
      const d = parseEventDate(ev.starts_on);
      if (!d) continue;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(ev);
    }
    return map;
  }, [events]);

  // ── KPIs ──
  const totalThisMonth = useMemo(() => {
    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return events.filter(e => parseEventDate(e.starts_on).startsWith(monthKey)).length;
  }, [events, currentYear, currentMonth]);

  const todayKey = dateKey(today);
  const todayEvents = eventsByDate.get(todayKey) || [];

  const upcomingThisWeek = useMemo(() => {
    const weekStart = new Date(today);
    const dow = today.getDay();
    const satBasedDow = (dow + 1) % 7;
    weekStart.setDate(weekStart.getDate() - satBasedDow);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    return events.filter(e => {
      const d = new Date(parseEventDate(e.starts_on));
      return d >= weekStart && d <= weekEnd && d >= today;
    }).length;
  }, [events, today]);

  // ── Navigation ──
  const goToPrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };
  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setWeekBase(new Date(today));
  };

  // ── Week navigation ──
  const goToPrevWeek = () => {
    setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  };
  const goToNextWeek = () => {
    setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  };

  // ── Calendar grid ──
  const weeks = useMemo(() => getCalendarDays(currentYear, currentMonth), [currentYear, currentMonth]);
  const weekDays = useMemo(() => getWeekDays(weekBase), [weekBase]);

  // ── Day events for selected day ──
  const dayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return eventsByDate.get(dateKey(selectedDay)) || [];
  }, [selectedDay, eventsByDate]);

  // ── Create handler ──
  const handleCreate = useCallback(() => {
    if (!form.subject.trim() || !createDate) {
      toast.error('الموضوع والتاريخ مطلوبان');
      return;
    }
    const starts_on = toDateTime(createDate, form.timeStart);
    const ends_on = toDateTime(createDate, form.timeEnd) || undefined;
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
    }
    createMutation.mutate(prepareFrappeDocForCreate(mapped), {
      onSuccess: () => {
        toast.success('تم إنشاء الموعد');
        setDialogOpen(false);
        setForm({
          subject: '', timeStart: '09:00', timeEnd: '10:00', desc: '',
          assignee: '', repeat: 'None', refType: '', refName: '', eventType: 'Private', sendReminder: true,
        });
        setCreateDate('');
        void refetch();
      },
      onError: () => toast.error('فشل إنشاء الموعد'),
    });
  }, [form, createDate, createMutation, refetch]);

  const openCreateForDay = useCallback((d: Date) => {
    setCreateDate(dateKey(d));
    setForm(prev => ({ ...prev, subject: '', desc: '' }));
    setDialogOpen(true);
  }, []);

  const openEventDetail = useCallback((ev: Ev) => {
    setSelectedEvent(ev);
    setDetailDialogOpen(true);
  }, []);

  const isToday = (d: Date) => dateKey(d) === todayKey;
  const isSameDay = (d1: Date, d2: Date) => dateKey(d1) === dateKey(d2);

  // ── Day view events ──
  const dayViewEvents = useMemo(() => {
    if (viewMode !== 'day' || !selectedDay) return [];
    return eventsByDate.get(dateKey(selectedDay)) || [];
  }, [viewMode, selectedDay, eventsByDate]);

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="التقويم"
        description="عرض مواعيد العملاء والاجتماعات في تقويم تفاعلي مع إمكانية الإنشاء والتصفية."
        iconify="solar:calendar-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'إدارة العملاء', href: '/crm' }, { label: 'التقويم' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1.5" onClick={() => { setCreateDate(todayKey); setDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5" />موعد جديد
            </Button>
          </div>
        }
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      {/* Mini Statistics */}
      {/* View Mode Toggle + Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/35 rounded-lg p-0.5">
            {(['month', 'week', 'day'] as ViewMode[]).map(mode => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={viewMode === mode ? 'default' : 'ghost'}
                className="h-8 text-xs gap-1 px-3"
                onClick={() => setViewMode(mode)}
              >
                {mode === 'month' ? 'شهري' : mode === 'week' ? 'أسبوعي' : 'يومي'}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={goToToday}>اليوم</Button>
          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={viewMode === 'week' ? goToPrevWeek : goToPrevMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[140px] text-center">
            {viewMode !== 'day'
              ? `${ARABIC_MONTHS[currentMonth]} ${currentYear}`
              : selectedDay
                ? `${ARABIC_MONTHS[selectedDay.getMonth()]} ${selectedDay.getDate()}, ${selectedDay.getFullYear()}`
                : `${ARABIC_MONTHS[currentMonth]} ${currentYear}`}
          </span>
          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={viewMode === 'week' ? goToNextWeek : goToNextMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select dir="rtl" value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent dir="rtl" align="start">
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="Open">مفتوح</SelectItem>
              <SelectItem value="Closed">مغلق</SelectItem>
              <SelectItem value="Cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
          <Select dir="rtl" value={refTypeFilter} onValueChange={setRefTypeFilter}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="نوع المرجع" /></SelectTrigger>
            <SelectContent dir="rtl" align="start">
              <SelectItem value="">الكل</SelectItem>
              <SelectItem value="Lead">محتمل</SelectItem>
              <SelectItem value="Customer">عميل</SelectItem>
              <SelectItem value="Opportunity">فرصة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ═══════ Calendar Grid ═══════ */}
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : viewMode === 'month' ? (
          /* ── Month View ── */
          <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border/30 bg-muted/30">
              {ARABIC_DAYS.map(day => (
                <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            {/* Week rows */}
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-border/20 last:border-0">
                {week.map((day, di) => {
                  if (!day) {
                    return <div key={`empty-${wi}-${di}`} className="min-h-[100px] bg-muted/10 p-1" />;
                  }
                  const dk = dateKey(day);
                  const dayEventsList = eventsByDate.get(dk) || [];
                  const isTodayCell = isToday(day);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);

                  return (
                    <div
                      key={dk}
                      className={cn(
                        'min-h-[100px] p-1 cursor-pointer transition-colors border-s border-border/10',
                        isTodayCell ? 'bg-primary/5' : 'hover:bg-muted/20',
                        isSelected && 'ring-2 ring-primary/30 ring-inset',
                      )}
                      onClick={() => setSelectedDay(day)}
                      onDoubleClick={() => openCreateForDay(day)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                          'text-xs inline-flex items-center justify-center h-6 w-6 rounded-full',
                          isTodayCell && 'bg-primary text-primary-foreground font-bold',
                        )}>
                          {day.getDate()}
                        </span>
                        {dayEventsList.length > 0 && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 border-0 bg-primary/10 text-primary">
                            {dayEventsList.length}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {dayEventsList.slice(0, 3).map(ev => (
                          <div
                            key={ev.name}
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer border-s-2',
                              STATUS_BORDER[ev.status || 'Open'] || 'border-chart-1',
                              STATUS_COLORS[ev.status || 'Open'] || 'bg-chart-1 text-white',
                            )}
                            onClick={(e) => { e.stopPropagation(); openEventDetail(ev); }}
                          >
                            {ev.subject || ev.name}
                          </div>
                        ))}
                        {dayEventsList.length > 3 && (
                          <p className="text-[9px] text-muted-foreground text-center">
                            +{dayEventsList.length - 3} أخرى
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : viewMode === 'week' ? (
          /* ── Week View ── */
          <div>
            <div className="grid grid-cols-7 border-b border-border/30 bg-muted/30">
              {weekDays.map((d, i) => (
                <div key={i} className="py-2 text-center">
                  <p className="text-[10px] text-muted-foreground">{ARABIC_DAYS[i]}</p>
                  <p className={cn(
                    'text-sm font-semibold inline-flex items-center justify-center h-7 w-7 rounded-full',
                    isToday(d) && 'bg-primary text-primary-foreground',
                  )}>
                    {d.getDate()}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-[400px]">
              {weekDays.map((d, i) => {
                const dk = dateKey(d);
                const dayEventsList = eventsByDate.get(dk) || [];
                return (
                  <div key={i} className="border-s border-border/20 p-1.5 space-y-1">
                    {dayEventsList.length === 0 ? (
                      <div
                        className="flex items-center justify-center h-full text-[10px] text-muted-foreground cursor-pointer hover:bg-muted/20 rounded min-h-[60px]"
                        onClick={() => openCreateForDay(d)}
                      >
                        + موعد
                      </div>
                    ) : (
                      dayEventsList.map(ev => (
                        <div
                          key={ev.name}
                          className={cn(
                            'text-[10px] px-2 py-1.5 rounded cursor-pointer border-s-2',
                            STATUS_BORDER[ev.status || 'Open'] || 'border-chart-1',
                            ev.status === 'Open' ? 'bg-chart-1/10 text-chart-1' :
                            ev.status === 'Cancelled' ? 'bg-destructive/10 text-destructive' :
                            'bg-muted/30 text-muted-foreground',
                          )}
                          onClick={() => openEventDetail(ev)}
                        >
                          <p className="font-semibold truncate">{ev.subject || ev.name}</p>
                          <p className="text-[9px] opacity-70" dir="ltr">{parseEventTime(ev.starts_on)}</p>
                          <Badge variant="outline" className={cn('text-[8px] px-1 py-0 border-0 mt-0.5', STATUS_COLORS[ev.status || 'Open'])}>
                            {STATUS_AR[ev.status || ''] || ev.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Day View ── */
          <div className="p-4">
            {selectedDay ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {ARABIC_DAYS[(selectedDay.getDay() + 1) % 7]} — {selectedDay.getDate()} {ARABIC_MONTHS[selectedDay.getMonth()]} {selectedDay.getFullYear()}
                  </h3>
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => openCreateForDay(selectedDay)}>
                    <Plus className="h-3.5 w-3.5" />موعد جديد
                  </Button>
                </div>
                {dayViewEvents.length === 0 ? (
                  <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10">
                    <p className="text-sm text-muted-foreground">لا توجد مواعيد في هذا اليوم</p>
                  </div>
                ) : (
                  dayViewEvents.map(ev => (
                    <Card key={ev.name} className={cn('rounded-xl border shadow-none', STATUS_BORDER[ev.status || 'Open'] || 'border-chart-1', 'border-s-2')}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary shrink-0" />
                              <span className="font-semibold text-sm">{ev.subject || ev.name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span dir="ltr">{parseEventTime(ev.starts_on)} — {parseEventTime(ev.ends_on)}</span>
                              <Badge variant="outline" className={cn('text-[10px] border-0 px-2 py-0', STATUS_COLORS[ev.status || 'Open'])}>
                                {STATUS_AR[ev.status || ''] || ev.status}
                              </Badge>
                              {ev.event_type === 'Public' && (
                                <Badge variant="outline" className="text-[10px] border-0 bg-info/10 text-info">عام</Badge>
                              )}
                            </div>
                            {ev.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{ev.description}</p>
                            )}
                          </div>
                          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs shrink-0" onClick={() => openEventDetail(ev)}>
                            <Eye className="h-3.5 w-3.5" />التفاصيل
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            ) : (
              <div className="flex min-h-[200px] items-center justify-center">
                <p className="text-sm text-muted-foreground">اختر يوماً لعرض المواعيد</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════ Selected Day Events Summary ═══════ */}
      {viewMode === 'month' && selectedDay && dayEvents.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            مواعيد {selectedDay.getDate()} {ARABIC_MONTHS[selectedDay.getMonth()]}
            <Badge variant="outline" className="text-[10px] border-0 bg-muted/50">{dayEvents.length}</Badge>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {dayEvents.map(ev => (
              <div
                key={ev.name}
                className={cn(
                  'rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/20 border-s-2',
                  STATUS_BORDER[ev.status || 'Open'] || 'border-chart-1',
                )}
                onClick={() => openEventDetail(ev)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{ev.subject || ev.name}</p>
                  <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 border-0 shrink-0', STATUS_COLORS[ev.status || 'Open'])}>
                    {STATUS_AR[ev.status || ''] || ev.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1" dir="ltr">
                  {parseEventTime(ev.starts_on)}{ev.ends_on ? ` — ${parseEventTime(ev.ends_on)}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ Event Detail Dialog ═══════ */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <span>تفاصيل الموعد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">{selectedEvent?.subject || selectedEvent?.name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الحالة</span>
                  <Badge variant="outline" className={cn('text-[10px] border-0 px-2 py-0.5', STATUS_COLORS[selectedEvent.status || 'Open'])}>
                    {STATUS_AR[selectedEvent.status || ''] || selectedEvent.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">النوع</span>
                  <span className="text-xs">{selectedEvent.event_type === 'Public' ? 'عام' : 'خاص'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">البداية</span>
                  <span className="text-xs" dir="ltr">{String(selectedEvent.starts_on || '—').replace('T', ' ').slice(0, 16)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">النهاية</span>
                  <span className="text-xs" dir="ltr">{String(selectedEvent.ends_on || '—').replace('T', ' ').slice(0, 16)}</span>
                </div>
                {Number(selectedEvent.repeat_this_event) === 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">التكرار</span>
                    <Badge variant="outline" className="text-[10px] border-0 bg-warning/10 text-warning">مكرّر</Badge>
                  </div>
                )}
                {selectedEvent.reference_doctype && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">المرجع</span>
                    <span className="text-xs text-primary">{selectedEvent.reference_doctype}: {selectedEvent.reference_docname}</span>
                  </div>
                )}
              </div>
              {selectedEvent.description && (
                <div className="rounded-xl border border-border/40 p-3">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setDetailDialogOpen(false)} className="text-muted-foreground">إغلاق</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════ Create Appointment Dialog ═══════ */}
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
                  <Input type="date" dir="ltr" value={createDate} onChange={(e) => setCreateDate(e.target.value)} />
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
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><Calendar className="h-3 w-3 text-info" /></span>
                  المرجع والتعيين
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">تعيين لموظف</Label>
                  <ErpLinkCombobox doctype="User" value={form.assignee} onChange={(v) => setForm(prev => ({ ...prev, assignee: v }))} displayKey="full_name" className="h-9" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">نوع المرجع</Label>
                    <Select dir="rtl" value={form.refType} onValueChange={(val) => setForm(prev => ({ ...prev, refType: val, refName: '' }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر..." /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="">—</SelectItem>
                        <SelectItem value="Lead">عميل محتمل</SelectItem>
                        <SelectItem value="Customer">عميل حالي</SelectItem>
                        <SelectItem value="Opportunity">فرصة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.refType && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">اسم المرجع</Label>
                      <ErpLinkCombobox
                        doctype={form.refType}
                        value={form.refName}
                        onChange={(v) => setForm(prev => ({ ...prev, refName: v }))}
                        displayKey={form.refType === 'Customer' ? 'customer_name' : undefined}
                        className="h-9"
                      />
                    </div>
                  )}
                </div>
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
    </div>
  );
}
