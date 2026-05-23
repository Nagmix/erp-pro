'use client';

import { useMemo, useState, useCallback } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { StatusBadge } from '@/components/erp/status-badge';
import { useDocList, useCreateDoc } from '@/lib/client/hooks';
import {
  buildCommunicationCreate,
  buildEventCreate,
  buildToDoCreate,
  prepareFrappeDocForCreate,
} from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';
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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  MessageSquare,
  CalendarDays,
  CheckSquare,
  Plus,
  Phone,
  Mail,
  Users,
  MapPin,
  MessageCircle,
  Sparkles,
  Clock,
  Filter,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ───────── Types ───────── */
type Comm = {
  name: string;
  subject?: string;
  communication_medium?: string;
  communication_date?: string;
  reference_doctype?: string;
  reference_name?: string;
  content?: string;
  status?: string;
  sent_or_received?: string;
};
type Event = {
  name: string;
  subject?: string;
  starts_on?: string;
  ends_on?: string;
  event_type?: string;
  event_category?: string;
  status?: string;
  description?: string;
  reference_doctype?: string;
  reference_docname?: string;
};
type Todo = {
  name: string;
  description?: string;
  date?: string;
  status?: string;
  priority?: string;
  reference_type?: string;
  reference_name?: string;
  allocated_to?: string;
};

type TimelineItem = {
  id: string;
  source: 'Communication' | 'Event' | 'ToDo';
  title: string;
  subtitle: string;
  timestamp: string;
  status: string;
  channel: string;
  priority?: string;
  referenceDoctype?: string;
  referenceName?: string;
  raw: Comm | Event | Todo;
};

/* ───────── Arabic Dictionaries ───────── */
const SOURCE_AR: Record<string, string> = {
  Communication: 'اتصال',
  Event: 'حدث',
  ToDo: 'مهمة',
};
const CHANNEL_AR: Record<string, string> = {
  Meeting: 'اجتماع',
  'Follow-up': 'متابعة',
  Phone: 'هاتف',
  Email: 'بريد',
  SMS: 'رسالة',
  Other: 'أخرى',
  Visit: 'زيارة',
  Chat: 'محادثة',
  Event: 'فعالية',
};
const MEDIUM_OPTIONS = [
  { value: 'Phone', label: 'هاتف' },
  { value: 'Email', label: 'بريد إلكتروني' },
  { value: 'Meeting', label: 'اجتماع' },
  { value: 'Visit', label: 'زيارة' },
  { value: 'SMS', label: 'رسالة نصية' },
  { value: 'Chat', label: 'محادثة' },
  { value: 'Other', label: 'أخرى' },
] as const;
const PRIORITY_AR: Record<string, string> = {
  High: 'عالية',
  Medium: 'متوسطة',
  Low: 'منخفضة',
};
const EVENT_CATEGORY_AR: Record<string, string> = {
  Meeting: 'اجتماع',
  Call: 'مكالمة',
  VideoConference: 'مؤتمر فيديو',
  Sent: 'مرسل',
  Received: 'مستلم',
  Other: 'أخرى',
};
const TODO_STATUS_AR: Record<string, string> = {
  Open: 'مفتوح',
  Closed: 'مغلق',
};
const COMM_STATUS_AR: Record<string, string> = {
  Open: 'مفتوح',
  Replied: 'تم الرد',
  Closed: 'مغلق',
  Linked: 'مرتبط',
};

/* ───────── Helper: Strip HTML from description ───────── */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/* ───────── Helper: Format date for display ───────── */
function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso.slice(0, 16);
  }
}

/* ───────── Helper: Source icon & color ───────── */
function getSourceIcon(source: TimelineItem['source']) {
  switch (source) {
    case 'Communication':
      return MessageSquare;
    case 'Event':
      return CalendarDays;
    case 'ToDo':
      return CheckSquare;
  }
}
function getSourceAccent(source: TimelineItem['source']) {
  switch (source) {
    case 'Communication':
      return 'info';
    case 'Event':
      return 'warning';
    case 'ToDo':
      return 'success';
  }
}
function getSourceIconBg(source: TimelineItem['source']) {
  switch (source) {
    case 'Communication':
      return 'bg-chart-1/10 text-chart-1';
    case 'Event':
      return 'bg-chart-2/10 text-chart-2';
    case 'ToDo':
      return 'bg-primary/10 text-primary';
  }
}

/* ───────── Channel icon ───────── */
function getChannelIcon(channel: string) {
  const c = channel.toLowerCase();
  if (c === 'phone') return Phone;
  if (c === 'email' || c === 'mail') return Mail;
  if (c === 'meeting' || c === 'اجتماع') return Users;
  if (c === 'visit' || c === 'زيارة') return MapPin;
  if (c === 'chat' || c === 'محادثة') return MessageCircle;
  return Sparkles;
}

/* ───────── Reference label ───────── */
const DOCTYPE_AR: Record<string, string> = {
  Lead: 'عميل محتمل',
  Customer: 'عميل',
  Opportunity: 'فرصة',
  Quotation: 'عرض سعر',
  'Sales Order': 'أمر بيع',
  'Sales Invoice': 'فاتورة مبيعات',
  Contact: 'جهة اتصال',
  Issue: 'بلاغ',
};

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function CrmTimelinePage() {
  /* ── Filter state ── */
  const [customer, setCustomer] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'Communication' | 'Event' | 'ToDo'>('all');
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  /* ── Dialog state ── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'Communication' | 'Event' | 'ToDo'>('Communication');

  // Communication form
  const [commSubject, setCommSubject] = useState('');
  const [commMedium, setCommMedium] = useState<string>('Phone');
  const [commContent, setCommContent] = useState('');

  // Event form
  const [eventSubject, setEventSubject] = useState('');
  const [eventStartsOn, setEventStartsOn] = useState('');
  const [eventEndsOn, setEventEndsOn] = useState('');
  const [eventCategory, setEventCategory] = useState<string>('Meeting');
  const [eventDescription, setEventDescription] = useState('');

  // ToDo form
  const [todoDescription, setTodoDescription] = useState('');
  const [todoDate, setTodoDate] = useState('');
  const [todoPriority, setTodoPriority] = useState<string>('Medium');

  // Shared: reference fields
  const [refType, setRefType] = useState('');
  const [refName, setRefName] = useState('');

  /* ── Data fetching ── */
  const commFilters = useMemo(() => {
    const f: string[][] = [['communication_type', '=', 'Communication']];
    if (customer) f.push(['reference_name', '=', customer]);
    if (dateRange.from) f.push(['communication_date', '>=', dateRange.from]);
    if (dateRange.to) f.push(['communication_date', '<=', dateRange.to + ' 23:59:59']);
    return f;
  }, [customer, dateRange]);

  const eventFilters = useMemo(() => {
    const f: string[][] = [];
    if (customer) f.push(['reference_docname', '=', customer]);
    if (dateRange.from) f.push(['starts_on', '>=', dateRange.from]);
    if (dateRange.to) f.push(['starts_on', '<=', dateRange.to + ' 23:59:59']);
    return f;
  }, [customer, dateRange]);

  const todoFilters = useMemo(() => {
    const f: string[][] = [];
    if (customer) f.push(['reference_name', '=', customer]);
    if (dateRange.from) f.push(['date', '>=', dateRange.from]);
    if (dateRange.to) f.push(['date', '<=', dateRange.to]);
    return f;
  }, [customer, dateRange]);

  const comm = useDocList<Comm>('Communication', {
    fields: ['name', 'subject', 'communication_medium', 'communication_date', 'reference_doctype', 'reference_name', 'content', 'status', 'sent_or_received'],
    filters: commFilters,
    limit: 300,
    order_by: 'communication_date desc',
  });
  const events = useDocList<Event>('Event', {
    fields: ['name', 'subject', 'starts_on', 'ends_on', 'event_type', 'event_category', 'status', 'description', 'reference_doctype', 'reference_docname'],
    filters: eventFilters,
    limit: 300,
    order_by: 'starts_on desc',
  });
  const todos = useDocList<Todo>('ToDo', {
    fields: ['name', 'description', 'date', 'status', 'priority', 'reference_type', 'reference_name', 'allocated_to'],
    filters: todoFilters,
    limit: 300,
    order_by: 'date desc',
  });

  const createComm = useCreateDoc('Communication');
  const createEvent = useCreateDoc('Event');
  const createTodo = useCreateDoc('ToDo');

  /* ── Timeline data ── */
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const commItems: TimelineItem[] = (comm.data || []).map((x) => ({
      id: `comm-${x.name}`,
      source: 'Communication' as const,
      title: x.subject || x.name,
      subtitle: x.communication_medium ? (CHANNEL_AR[x.communication_medium] || x.communication_medium) : '',
      timestamp: x.communication_date || '',
      status: x.status || 'Open',
      channel: x.communication_medium || 'Other',
      referenceDoctype: x.reference_doctype,
      referenceName: x.reference_name,
      raw: x,
    }));
    const eventItems: TimelineItem[] = (events.data || []).map((x) => ({
      id: `event-${x.name}`,
      source: 'Event' as const,
      title: x.subject || x.name,
      subtitle: x.event_category ? (EVENT_CATEGORY_AR[x.event_category] || x.event_category) : (CHANNEL_AR['Meeting'] || 'اجتماع'),
      timestamp: x.starts_on || '',
      status: x.status || 'Open',
      channel: 'Meeting',
      referenceDoctype: x.reference_doctype,
      referenceName: x.reference_docname,
      raw: x,
    }));
    const todoItems: TimelineItem[] = (todos.data || []).map((x) => ({
      id: `todo-${x.name}`,
      source: 'ToDo' as const,
      title: stripHtml(String(x.description || '')) || x.name,
      subtitle: x.priority ? `أولوية: ${PRIORITY_AR[x.priority] || x.priority}` : '',
      timestamp: x.date || '',
      status: x.status || 'Open',
      channel: 'Follow-up',
      priority: x.priority,
      referenceDoctype: x.reference_type,
      referenceName: x.reference_name,
      raw: x,
    }));
    return [...commItems, ...eventItems, ...todoItems]
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [comm.data, events.data, todos.data]);

  /* ── Filtered timeline ── */
  const filteredItems = useMemo(() => {
    let items = timelineItems;
    if (sourceFilter !== 'all') {
      items = items.filter((i) => i.source === sourceFilter);
    }
    return items;
  }, [timelineItems, sourceFilter]);

  /* ── KPI counts ── */
  const commCount = (comm.data || []).length;
  const eventCount = (events.data || []).length;
  const todoCount = (todos.data || []).length;
  const totalCount = commCount + eventCount + todoCount;

  const isLoading = comm.isLoading || events.isLoading || todos.isLoading;
  const error = comm.error || events.error || todos.error;
  const refetchAll = useCallback(() => {
    comm.refetch();
    events.refetch();
    todos.refetch();
  }, [comm, events, todos]);

  /* ── Dialog helpers ── */
  const openCreateDialog = (type: 'Communication' | 'Event' | 'ToDo') => {
    setDialogType(type);
    setDialogOpen(true);
    resetForm();
  };

  const resetForm = () => {
    setCommSubject(''); setCommMedium('Phone'); setCommContent('');
    setEventSubject(''); setEventStartsOn(''); setEventEndsOn(''); setEventCategory('Meeting'); setEventDescription('');
    setTodoDescription(''); setTodoDate(''); setTodoPriority('Medium');
    setRefType(''); setRefName('');
  };

  const handleCreate = () => {
    const refDoctype = refType || undefined;
    const refNameVal = refName || undefined;

    if (dialogType === 'Communication') {
      if (!commSubject.trim()) { toast.error('الموضوع مطلوب'); return; }
      const doc = buildCommunicationCreate({
        subject: commSubject,
        communication_medium: commMedium as 'Phone' | 'Email' | 'Meeting' | 'Visit' | 'SMS' | 'Other' | 'Chat' | 'Event',
        content: commContent || undefined,
        reference_doctype: refDoctype,
        reference_name: refNameVal,
      });
      createComm.mutate(prepareFrappeDocForCreate(doc), {
        onSuccess: () => { toast.success('تم تسجيل الاتصال'); setDialogOpen(false); resetForm(); },
        onError: () => toast.error('فشل حفظ الاتصال'),
      });
    } else if (dialogType === 'Event') {
      if (!eventSubject.trim()) { toast.error('الموضوع مطلوب'); return; }
      if (!eventStartsOn) { toast.error('تاريخ البدء مطلوب'); return; }
      const doc = buildEventCreate({
        subject: eventSubject,
        starts_on: eventStartsOn,
        ends_on: eventEndsOn || undefined,
        event_category: eventCategory,
        description: eventDescription || undefined,
        reference_doctype: refDoctype,
        reference_docname: refNameVal,
      });
      createEvent.mutate(prepareFrappeDocForCreate(doc), {
        onSuccess: () => { toast.success('تم إنشاء الحدث'); setDialogOpen(false); resetForm(); },
        onError: () => toast.error('فشل حفظ الحدث'),
      });
    } else {
      if (!todoDescription.trim()) { toast.error('الوصف مطلوب'); return; }
      const doc = buildToDoCreate({
        description: todoDescription,
        date: todoDate || undefined,
        priority: todoPriority as 'High' | 'Medium' | 'Low',
        reference_type: refDoctype,
        reference_name: refNameVal,
      });
      createTodo.mutate(prepareFrappeDocForCreate(doc), {
        onSuccess: () => { toast.success('تم إنشاء المهمة'); setDialogOpen(false); resetForm(); },
        onError: () => toast.error('فشل حفظ المهمة'),
      });
    }
  };

  const isCreating = createComm.isPending || createEvent.isPending || createTodo.isPending;

  /* ── Render status badge for timeline item ── */
  const renderStatus = (item: TimelineItem) => {
    if (item.source === 'Communication') {
      const label = COMM_STATUS_AR[item.status] || item.status;
      return <StatusBadge status={item.status === 'Open' ? 'Open' : item.status === 'Closed' ? 'Closed' : item.status} />;
    }
    if (item.source === 'Event') {
      const s = item.status === 'Closed' ? 'Closed' : 'Open';
      return <StatusBadge status={s} />;
    }
    // ToDo
    const s = item.status === 'Closed' ? 'Closed' : 'Open';
    return <StatusBadge status={s} />;
  };

  /* ── Active filters indicator ── */
  const hasActiveFilters = customer || sourceFilter !== 'all' || dateRange.from || dateRange.to;

  const clearFilters = () => {
    setCustomer('');
    setSourceFilter('all');
    setDateRange({});
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      {/* ── Page Header ── */}
      <PageHeader
        title="سجل التفاعلات"
        description="سجل موحد لجميع تفاعلات العميل من اتصالات وأحداث ومتابعات — عرض زمني مرئي"
        iconify="solar:chat-line-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'إدارة العملاء', href: '/crm' }, { label: 'سجل التفاعلات' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openCreateDialog('Communication')}>
              <MessageSquare className="h-3.5 w-3.5" />
              اتصال
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openCreateDialog('Event')}>
              <CalendarDays className="h-3.5 w-3.5" />
              حدث
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => openCreateDialog('ToDo')}>
              <Plus className="h-3.5 w-3.5" />
              مهمة
            </Button>
          </div>
        }
      />

      {/* ── KPI Summary ── */}
      {/* ── Filters Bar ── */}
      <Card className="border-border/40 shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {/* Customer filter */}
            <div className="w-full sm:w-56 space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">العميل</Label>
              <ErpLinkCombobox doctype="Customer" value={customer} onChange={setCustomer} displayKey="customer_name" />
            </div>

            {/* Source type filter */}
            <div className="w-full sm:w-44 space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">نوع المصدر</Label>
              <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="Communication">اتصال</SelectItem>
                  <SelectItem value="Event">حدث</SelectItem>
                  <SelectItem value="ToDo">مهمة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date range filter */}
            <div className="w-full sm:w-64 space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">الفترة الزمنية</Label>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" />
                مسح الفلاتر
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Error Alert ── */}
      <ListQueryAlert error={error} onRetry={refetchAll} />

      {/* ── Tabbed View ── */}
      <Tabs value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
        <TabsList>
          <TabsTrigger value="all">
            الكل
            <Badge variant="secondary" className="ms-1.5 h-5 min-w-[20px] px-1 text-[10px]">{totalCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="Communication">
            اتصالات
            <Badge variant="secondary" className="ms-1.5 h-5 min-w-[20px] px-1 text-[10px]">{commCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="Event">
            أحداث
            <Badge variant="secondary" className="ms-1.5 h-5 min-w-[20px] px-1 text-[10px]">{eventCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="ToDo">
            مهام
            <Badge variant="secondary" className="ms-1.5 h-5 min-w-[20px] px-1 text-[10px]">{todoCount}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Shared timeline content for all tabs */}
        {(['all', 'Communication', 'Event', 'ToDo'] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            {isLoading ? (
              <div className="space-y-3 py-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="h-9 w-10 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 rounded bg-muted animate-pulse" />
                      <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 rounded-full border border-border/40 bg-muted/50 p-4">
                  <Filter className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">لا توجد تفاعلات</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {hasActiveFilters ? 'جرّب تعديل الفلاتر أو مسحها' : 'أضف اتصالًا أو حدثًا أو مهمة جديدة'}
                </p>
                {!hasActiveFilters && (
                  <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => openCreateDialog('Communication')}>
                    <Plus className="h-3.5 w-3.5" />
                    إضافة تفاعل
                  </Button>
                )}
              </div>
            ) : (
              <div className="relative space-y-0">
                {/* Timeline connector line */}
                <div className="absolute start-5 top-0 bottom-0 w-px bg-border/50" aria-hidden />

                {filteredItems.map((item, idx) => {
                  const Icon = getSourceIcon(item.source);
                  const ChannelIcon = getChannelIcon(item.channel);
                  const isLast = idx === filteredItems.length - 1;

                  return (
                    <div key={item.id} className={cn('relative flex gap-4 pb-6', isLast && 'pb-0')}>
                      {/* Timeline dot */}
                      <div className={cn(
                        'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-background',
                        getSourceIconBg(item.source),
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content card */}
                      <Card className={cn(
                        'flex-1 border-border/40 shadow-none transition-colors hover:border-border/70',
                        'border-s-[3px]',
                        item.source === 'Communication' && 'border-s-sky-500/40',
                        item.source === 'Event' && 'border-s-amber-500/40',
                        item.source === 'ToDo' && 'border-s-emerald-500/40',
                      )}>
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            {/* Title & meta */}
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-semibold text-foreground truncate">{item.title}</h3>
                                <Badge variant="outline" className="shrink-0 text-[10px] font-medium px-1.5 py-0 border-0 bg-muted/60">
                                  {SOURCE_AR[item.source]}
                                </Badge>
                                {item.priority && (
                                  <Badge variant="outline" className={cn(
                                    'shrink-0 text-[10px] font-semibold px-1.5 py-0 border-0',
                                    item.priority === 'High' && 'bg-destructive/10 text-destructive',
                                    item.priority === 'Medium' && 'bg-chart-2/10 text-chart-2',
                                    item.priority === 'Low' && 'bg-chart-1/10 text-chart-1',
                                  )}>
                                    {PRIORITY_AR[item.priority] || item.priority}
                                  </Badge>
                                )}
                              </div>

                              {/* Channel & subtitle */}
                              {item.subtitle && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <ChannelIcon className="h-3 w-3 shrink-0" />
                                  <span>{item.subtitle}</span>
                                </div>
                              )}

                              {/* Reference link */}
                              {item.referenceDoctype && item.referenceName && (
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <span className="font-medium">{DOCTYPE_AR[item.referenceDoctype] || item.referenceDoctype}:</span>
                                  <span className="font-mono" dir="ltr">{item.referenceName}</span>
                                </div>
                              )}
                            </div>

                            {/* Status & date */}
                            <div className="flex items-center gap-2 shrink-0 sm:flex-col sm:items-end sm:gap-1.5">
                              {renderStatus(item)}
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground" dir="ltr">
                                <Clock className="h-3 w-3" />
                                <span>{formatDate(item.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════
          CREATE DIALOG
          ═══════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'Communication' && 'تسجيل اتصال جديد'}
              {dialogType === 'Event' && 'إنشاء حدث جديد'}
              {dialogType === 'ToDo' && 'إنشاء مهمة جديدة'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* ── Communication fields ── */}
            {dialogType === 'Communication' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الموضوع *</Label>
                  <Input placeholder="موضوع الاتصال" value={commSubject} onChange={(e) => setCommSubject(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">وسيلة التواصل</Label>
                  <Select value={commMedium} onValueChange={setCommMedium}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEDIUM_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">المحتوى / الملاحظات</Label>
                  <Textarea placeholder="تفاصيل الاتصال..." value={commContent} onChange={(e) => setCommContent(e.target.value)} rows={3} />
                </div>
              </>
            )}

            {/* ── Event fields ── */}
            {dialogType === 'Event' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الموضوع *</Label>
                  <Input placeholder="موضوع الحدث" value={eventSubject} onChange={(e) => setEventSubject(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">يبدأ في *</Label>
                    <Input type="datetime-local" value={eventStartsOn} onChange={(e) => setEventStartsOn(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">ينتهي في</Label>
                    <Input type="datetime-local" value={eventEndsOn} onChange={(e) => setEventEndsOn(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الفئة</Label>
                  <Select value={eventCategory} onValueChange={setEventCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Meeting">اجتماع</SelectItem>
                      <SelectItem value="Call">مكالمة</SelectItem>
                      <SelectItem value="VideoConference">مؤتمر فيديو</SelectItem>
                      <SelectItem value="Other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الوصف</Label>
                  <Textarea placeholder="تفاصيل الحدث..." value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} rows={3} />
                </div>
              </>
            )}

            {/* ── ToDo fields ── */}
            {dialogType === 'ToDo' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الوصف *</Label>
                  <Textarea placeholder="وصف المهمة..." value={todoDescription} onChange={(e) => setTodoDescription(e.target.value)} rows={3} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">تاريخ الاستحقاق</Label>
                    <Input type="date" value={todoDate} onChange={(e) => setTodoDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الأولوية</Label>
                    <Select value={todoPriority} onValueChange={setTodoPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">عالية</SelectItem>
                        <SelectItem value="Medium">متوسطة</SelectItem>
                        <SelectItem value="Low">منخفضة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* ── Shared: Reference ── */}
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">مرجع (اختياري)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select value={refType || 'none'} onValueChange={(v) => { setRefType(v === 'none' ? '' : v); setRefName(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="بدون مرجع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مرجع</SelectItem>
                    <SelectItem value="Lead">عميل محتمل</SelectItem>
                    <SelectItem value="Customer">عميل حالي</SelectItem>
                    <SelectItem value="Opportunity">فرصة</SelectItem>
                  </SelectContent>
                </Select>
                {refType === 'Lead' && <ErpLinkCombobox doctype="Lead" value={refName} onChange={setRefName} />}
                {refType === 'Customer' && <ErpLinkCombobox doctype="Customer" value={refName} onChange={setRefName} displayKey="customer_name" />}
                {refType === 'Opportunity' && <ErpLinkCombobox doctype="Opportunity" value={refName} onChange={setRefName} />}
                {!refType && <div className="h-9" />}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isCreating}>
              إلغاء
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 animate-spin ms-1" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
