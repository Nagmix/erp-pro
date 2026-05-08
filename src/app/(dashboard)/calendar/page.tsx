'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGetCalendarEvents, type CalendarEvent } from '@/lib/client/api';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
} from 'lucide-react';

// ─── Arabic Constants ────────────────────────────────────────

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

// Saturday-first week (Arabic countries)
const ARABIC_DAYS_SHORT = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const ARABIC_DAYS_MINI = ['س', 'أ', 'ن', 'ث', 'ر', 'خ', 'ج'];

// ─── Helpers ─────────────────────────────────────────────────

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

/** Get the Saturday on or before the 1st of the month */
function getCalendarGridStart(year: number, month: number): Date {
  const first = new Date(year, month, 1);
  const dow = first.getDay(); // 0=Sun … 6=Sat
  // We want Saturday=0. Saturday is day 6 in JS.
  const offset = dow === 6 ? 0 : dow + 1;
  return new Date(year, month, 1 - offset);
}

function getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const dateStr = toISODate(date);
  return events.filter((ev) => {
    const evStart = ev.start.slice(0, 10);
    if (evStart === dateStr) return true;
    // Multi-day events
    if (ev.end) {
      const evEnd = ev.end.slice(0, 10);
      return dateStr >= evStart && dateStr <= evEnd;
    }
    return false;
  });
}

function formatEventTime(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.length <= 10) return ''; // date only
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

const TYPE_LABELS: Record<CalendarEvent['type'], string> = {
  event: 'حدث',
  task: 'مهمة',
  holiday: 'عطلة',
};

const TYPE_BADGE_VARIANTS: Record<CalendarEvent['type'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  event: 'default',
  task: 'secondary',
  holiday: 'outline',
};

const DEFAULT_EVENT_COLORS: Record<CalendarEvent['type'], string> = {
  event: '#3b82f6',
  task: '#f59e0b',
  holiday: '#10b981',
};

// ─── Sub-components ──────────────────────────────────────────

function EventDot({ event }: { event: CalendarEvent }) {
  const color = event.color || DEFAULT_EVENT_COLORS[event.type];
  return (
    <div
      className="h-1.5 w-1.5 rounded-full shrink-0"
      style={{ backgroundColor: color }}
      title={event.title}
    />
  );
}

function EventChip({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const color = event.color || DEFAULT_EVENT_COLORS[event.type];
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-start px-1.5 py-0.5 rounded text-[10px] lg:text-[11px] leading-tight truncate text-white hover:opacity-80 transition-opacity"
      style={{ backgroundColor: color }}
      title={event.title}
    >
      {event.title}
    </button>
  );
}

function MonthView({
  currentDate,
  events,
  onSelectDay,
  selectedDate,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectDay: (d: Date) => void;
  selectedDate: Date | null;
}) {
  const gridStart = useMemo(
    () => getCalendarGridStart(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const cells = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 42; i++) {
      arr.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
    }
    return arr;
  }, [gridStart]);

  const weeks = useMemo(() => {
    const w: Date[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      w.push(cells.slice(i, i + 7));
    }
    return w;
  }, [cells]);

  const currentMonth = currentDate.getMonth();

  return (
    <div className="select-none">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {ARABIC_DAYS_SHORT.map((day, i) => (
          <div
            key={day}
            className={cn(
              'py-2 text-center text-xs font-medium text-muted-foreground',
              i === 0 && 'text-emerald-600 dark:text-emerald-400', // Saturday
              i === 6 && 'text-red-500 dark:text-red-400' // Friday
            )}
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{ARABIC_DAYS_MINI[i]}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 border-t border-border/40">
        {weeks.map((week, wi) => (
          <div key={wi} className="contents">
            {week.map((day, di) => {
              const inMonth = day.getMonth() === currentMonth;
              const today = isToday(day);
              const selected = selectedDate ? isSameDay(day, selectedDate) : false;
              const dayEvents = getEventsForDay(events, day);
              const visibleEvents = dayEvents.slice(0, 3);
              const overflow = dayEvents.length - 3;

              return (
                <div
                  key={di}
                  onClick={() => onSelectDay(day)}
                  className={cn(
                    'relative min-h-[72px] sm:min-h-[90px] lg:min-h-[110px] p-1 border-b border-e border-border/30 cursor-pointer transition-colors',
                    !inMonth && 'bg-muted/30',
                    inMonth && 'hover:bg-accent/50',
                    today && 'bg-primary/5',
                    selected && 'bg-primary/10 ring-1 ring-inset ring-primary/30',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                        !inMonth && 'text-muted-foreground/50',
                        inMonth && !today && 'text-foreground',
                        today && 'bg-primary text-primary-foreground font-bold',
                      )}
                    >
                      {day.getDate()}
                    </span>
                    {/* Mobile: dots only */}
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 sm:hidden mt-1">
                        {dayEvents.slice(0, 4).map((ev) => (
                          <EventDot key={ev.id} event={ev} />
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Desktop: event chips */}
                  <div className="hidden sm:flex flex-col gap-0.5 mt-0.5 overflow-hidden">
                    {visibleEvents.map((ev) => (
                      <EventChip key={ev.id} event={ev} onClick={() => onSelectDay(day)} />
                    ))}
                    {overflow > 0 && (
                      <span className="text-[10px] text-muted-foreground ps-1">
                        +{overflow} آخر
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekView({
  currentDate,
  events,
  onSelectDay,
  selectedDate,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectDay: (d: Date) => void;
  selectedDate: Date | null;
}) {
  // Find the Saturday of the current week
  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    const dow = d.getDay(); // 0=Sun … 6=Sat
    const offset = dow === 6 ? 0 : -(dow + 1);
    d.setDate(d.getDate() + offset);
    return d;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 7; i++) {
      arr.push(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
    }
    return arr;
  }, [weekStart]);

  return (
    <div className="select-none">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((day, i) => {
          const today = isToday(day);
          return (
            <div
              key={i}
              className={cn(
                'py-2 text-center text-xs font-medium',
                today ? 'text-primary font-bold' : 'text-muted-foreground',
                i === 0 && !today && 'text-emerald-600 dark:text-emerald-400',
                i === 6 && !today && 'text-red-500 dark:text-red-400',
              )}
            >
              <div className="hidden sm:block">{ARABIC_DAYS_SHORT[i]}</div>
              <div className="sm:hidden">{ARABIC_DAYS_MINI[i]}</div>
              <div className={cn(
                'mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm',
                today && 'bg-primary text-primary-foreground',
              )}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day events row + time grid */}
      <div className="grid grid-cols-7 border-t border-border/40">
        {weekDays.map((day, di) => {
          const dayEvents = getEventsForDay(events, day);
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;

          return (
            <div
              key={di}
              onClick={() => onSelectDay(day)}
              className={cn(
                'min-h-[300px] sm:min-h-[400px] p-1 border-b border-e border-border/30 cursor-pointer transition-colors hover:bg-accent/30',
                isToday(day) && 'bg-primary/5',
                selected && 'bg-primary/10 ring-1 ring-inset ring-primary/30',
              )}
            >
              <div className="flex flex-col gap-1">
                {dayEvents.map((ev) => {
                  const color = ev.color || DEFAULT_EVENT_COLORS[ev.type];
                  const time = formatEventTime(ev.start);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSelectDay(day); }}
                      className="w-full text-start px-1.5 py-1 rounded text-[11px] leading-snug text-white hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: color }}
                    >
                      {time && <span className="font-medium opacity-90">{time}</span>}
                      <span className="block truncate">{ev.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({
  currentDate,
  events,
  onSelectEvent,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (ev: CalendarEvent) => void;
}) {
  const dayEvents = useMemo(() => getEventsForDay(events, currentDate), [events, currentDate]);
  const timedEvents = dayEvents.filter((ev) => ev.start.length > 10 && !ev.allDay);
  const allDayEvents = dayEvents.filter((ev) => ev.start.length <= 10 || ev.allDay);

  // Generate hour slots (6 AM – 11 PM)
  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = 6; h <= 23; h++) arr.push(h);
    return arr;
  }, []);

  return (
    <div className="select-none">
      {/* Header */}
      <div className="py-3 px-4 border-b border-border/40 text-center">
        <span className="text-sm font-bold text-foreground">
          {ARABIC_DAYS_SHORT[(currentDate.getDay() + 1) % 7]} {currentDate.getDate()} {ARABIC_MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="px-3 py-2 border-b border-border/30 bg-muted/20">
          <span className="text-[10px] text-muted-foreground font-medium mb-1 block">طوال اليوم</span>
          <div className="flex flex-wrap gap-1">
            {allDayEvents.map((ev) => {
              const color = ev.color || DEFAULT_EVENT_COLORS[ev.type];
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onSelectEvent(ev)}
                  className="px-2 py-0.5 rounded text-[11px] text-white hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: color }}
                >
                  {ev.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Time grid */}
      <ScrollArea className="h-[500px] lg:h-[600px]">
        <div className="relative">
          {hours.map((hour) => {
            const hourEvents = timedEvents.filter((ev) => {
              try {
                const d = new Date(ev.start);
                return d.getHours() === hour;
              } catch {
                return false;
              }
            });

            const hourLabel = new Date(2000, 0, 1, hour).toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });

            return (
              <div key={hour} className="flex border-b border-border/20 min-h-[48px]">
                <div className="w-16 sm:w-20 shrink-0 text-[10px] text-muted-foreground py-1 px-2 text-start">
                  {hourLabel}
                </div>
                <div className="flex-1 py-1 px-1 flex flex-col gap-0.5">
                  {hourEvents.map((ev) => {
                    const color = ev.color || DEFAULT_EVENT_COLORS[ev.type];
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onSelectEvent(ev)}
                        className="text-start px-2 py-1 rounded text-[11px] leading-snug text-white hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: color }}
                      >
                        <span className="font-medium">{ev.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function EventDetailPanel({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  const startDate = event.start.slice(0, 10);
  const startTime = formatEventTime(event.start);
  const endDate = event.end?.slice(0, 10);
  const endTime = event.end ? formatEventTime(event.end) : '';
  const color = event.color || DEFAULT_EVENT_COLORS[event.type];

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5 h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <h3 className="text-sm font-semibold text-foreground truncate">{event.title}</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={onClose}>
          ✕
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={TYPE_BADGE_VARIANTS[event.type]}>{TYPE_LABELS[event.type]}</Badge>
        {event.status && <Badge variant="outline">{event.status}</Badge>}
      </div>

      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          <span>البداية: {startDate}{startTime ? ` ${startTime}` : ''}</span>
        </div>
        {event.end && (
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>النهاية: {endDate}{endTime ? ` ${endTime}` : ''}</span>
          </div>
        )}
        {event.allDay && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>طوال اليوم</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-border/40">
        <a
          href={`/doc/${event.doctype}/${event.name}`}
          className="text-xs text-primary hover:underline font-medium"
        >
          فتح في النظام ←
        </a>
      </div>
    </Card>
  );
}

function MobileDayList({
  currentDate,
  events,
  onSelectEvent,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (ev: CalendarEvent) => void;
}) {
  const gridStart = useMemo(
    () => getCalendarGridStart(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );
  const cells = useMemo(() => {
    const arr: { date: Date; events: CalendarEvent[] }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const dayEvents = getEventsForDay(events, d);
      if (dayEvents.length > 0 && d.getMonth() === currentDate.getMonth()) {
        arr.push({ date: d, events: dayEvents });
      }
    }
    return arr;
  }, [gridStart, events, currentDate]);

  if (cells.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        لا توجد أحداث في هذا الشهر
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cells.map(({ date, events: dayEvents }) => (
        <div key={toISODate(date)}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
              isToday(date) ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
            )}>
              {date.getDate()}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {ARABIC_DAYS_SHORT[(date.getDay() + 1) % 7]} - {ARABIC_MONTHS[date.getMonth()]}
            </span>
          </div>
          <div className="space-y-1 ps-9">
            {dayEvents.map((ev) => {
              const color = ev.color || DEFAULT_EVENT_COLORS[ev.type];
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onSelectEvent(ev)}
                  className="w-full text-start flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors"
                >
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs font-medium truncate flex-1">{ev.title}</span>
                  <Badge variant={TYPE_BADGE_VARIANTS[ev.type]} className="text-[9px] px-1 py-0">
                    {TYPE_LABELS[ev.type]}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  // Compute date range for API call
  const { startDate, endDate } = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    // Expand range a bit to cover adjacent days visible in the grid
    const gridStart = getCalendarGridStart(y, m);
    const gridEnd = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + 41);
    return {
      startDate: toISODate(gridStart),
      endDate: toISODate(gridEnd),
    };
  }, [currentDate]);

  const { data: events = [], isLoading, error } = useQuery<CalendarEvent[]>({
    queryKey: ['calendarEvents', startDate, endDate],
    queryFn: () => apiGetCalendarEvents(startDate, endDate),
    staleTime: 30_000,
  });

  const navigatePrev = useCallback(() => {
    setCurrentDate((d) => {
      if (view === 'month') return new Date(d.getFullYear(), d.getMonth() - 1, 1);
      if (view === 'week') return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
    });
  }, [view]);

  const navigateNext = useCallback(() => {
    setCurrentDate((d) => {
      if (view === 'month') return new Date(d.getFullYear(), d.getMonth() + 1, 1);
      if (view === 'week') return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    });
  }, [view]);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleSelectDay = useCallback((day: Date) => {
    setSelectedDate(day);
    setSelectedEvent(null);
  }, []);

  const handleSelectEvent = useCallback((ev: CalendarEvent) => {
    setSelectedEvent(ev);
  }, []);

  // Selected day events for the side panel
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return getEventsForDay(events, selectedDate);
  }, [selectedDate, events]);

  // Month/year display
  const monthYearLabel = useMemo(() => {
    return `${ARABIC_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate]);

  // Summary stats
  const monthEvents = useMemo(() => {
    return events.filter((ev) => {
      const m = ev.start.slice(5, 7);
      const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
      return m === currentMonth;
    });
  }, [events, currentDate]);

  const stats = useMemo(() => ({
    total: monthEvents.length,
    events: monthEvents.filter((e) => e.type === 'event').length,
    tasks: monthEvents.filter((e) => e.type === 'task').length,
    holidays: monthEvents.filter((e) => e.type === 'holiday').length,
  }), [monthEvents]);

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="التقويم"
        description="عرض الأحداث والمهام والمواعيد النهائية في تقويم واحد"
        iconify="solar:calendar-bold-duotone"
        accent="primary"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={navigateToday}>
              <CalendarIcon className="h-4 w-4 me-1" />
              اليوم
            </Button>
            <Button size="sm" asChild>
              <a href="/doc/Event/New">
                <Plus className="h-4 w-4 me-1" />
                حدث جديد
              </a>
            </Button>
          </div>
        }
      />

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { label: 'الإجمالي', value: stats.total, color: 'text-foreground' },
          { label: 'أحداث', value: stats.events, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'مهام', value: stats.tasks, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'عطلات', value: stats.holidays, color: 'text-emerald-600 dark:text-emerald-400' },
        ].map((s) => (
          <Card key={s.label} className="px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <span className={cn('text-sm font-bold', s.color)}>{s.value}</span>
          </Card>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1">
        {/* Calendar main */}
        <Card className="flex-1 p-2 sm:p-3 overflow-hidden">
          {/* Navigation bar */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigatePrev}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateNext}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-sm font-bold text-foreground min-w-[120px] text-center">
                {monthYearLabel}
              </h2>
            </div>

            <Tabs value={view} onValueChange={(v) => setView(v as 'month' | 'week' | 'day')}>
              <TabsList className="h-8">
                <TabsTrigger value="month" className="text-xs px-2 sm:px-3 h-7">شهر</TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-2 sm:px-3 h-7">أسبوع</TabsTrigger>
                <TabsTrigger value="day" className="text-xs px-2 sm:px-3 h-7">يوم</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full me-2" />
              جاري التحميل...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 text-destructive text-sm">
              فشل تحميل الأحداث
            </div>
          ) : (
            <>
              {/* Desktop: month/week/day views */}
              <div className="hidden sm:block">
                {view === 'month' && (
                  <MonthView
                    currentDate={currentDate}
                    events={events}
                    onSelectDay={handleSelectDay}
                    selectedDate={selectedDate}
                  />
                )}
                {view === 'week' && (
                  <WeekView
                    currentDate={currentDate}
                    events={events}
                    onSelectDay={handleSelectDay}
                    selectedDate={selectedDate}
                  />
                )}
                {view === 'day' && (
                  <DayView
                    currentDate={currentDate}
                    events={events}
                    onSelectEvent={handleSelectEvent}
                  />
                )}
              </div>

              {/* Mobile: list view for month, normal views for week/day */}
              <div className="sm:hidden">
                {view === 'month' ? (
                  <MobileDayList
                    currentDate={currentDate}
                    events={events}
                    onSelectEvent={handleSelectEvent}
                  />
                ) : view === 'week' ? (
                  <WeekView
                    currentDate={currentDate}
                    events={events}
                    onSelectDay={handleSelectDay}
                    selectedDate={selectedDate}
                  />
                ) : (
                  <DayView
                    currentDate={currentDate}
                    events={events}
                    onSelectEvent={handleSelectEvent}
                  />
                )}
              </div>
            </>
          )}
        </Card>

        {/* Side panel - Desktop */}
        <div className="hidden lg:block w-80 shrink-0 space-y-3">
          {/* Selected event detail */}
          {selectedEvent ? (
            <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
          ) : selectedDate ? (
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground mb-3">
                أحداث {selectedDate.getDate()} {ARABIC_MONTHS[selectedDate.getMonth()]}
              </h3>
              {selectedDayEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">لا توجد أحداث</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map((ev) => {
                    const color = ev.color || DEFAULT_EVENT_COLORS[ev.type];
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => handleSelectEvent(ev)}
                        className="w-full text-start flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors"
                      >
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium block truncate">{ev.title}</span>
                          {ev.start.length > 10 && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatEventTime(ev.start)}
                            </span>
                          )}
                        </div>
                        <Badge variant={TYPE_BADGE_VARIANTS[ev.type]} className="text-[9px] px-1 py-0 shrink-0">
                          {TYPE_LABELS[ev.type]}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground mb-2">اليوم</h3>
              {(() => {
                const todayEvents = getEventsForDay(events, new Date());
                if (todayEvents.length === 0) {
                  return <p className="text-xs text-muted-foreground py-4 text-center">لا توجد أحداث اليوم</p>;
                }
                return (
                  <div className="space-y-2">
                    {todayEvents.map((ev) => {
                      const color = ev.color || DEFAULT_EVENT_COLORS[ev.type];
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => handleSelectEvent(ev)}
                          className="w-full text-start flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors"
                        >
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium block truncate">{ev.title}</span>
                            {ev.start.length > 10 && (
                              <span className="text-[10px] text-muted-foreground">{formatEventTime(ev.start)}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </Card>
          )}

          {/* Upcoming events */}
          <Card className="p-4">
            <h3 className="text-sm font-bold text-foreground mb-2">القادمة</h3>
            {(() => {
              const todayStr = toISODate(new Date());
              const upcoming = events
                .filter((ev) => ev.start.slice(0, 10) >= todayStr)
                .sort((a, b) => a.start.localeCompare(b.start))
                .slice(0, 8);
              if (upcoming.length === 0) {
                return <p className="text-xs text-muted-foreground py-4 text-center">لا توجد أحداث قادمة</p>;
              }
              return (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {upcoming.map((ev) => {
                      const color = ev.color || DEFAULT_EVENT_COLORS[ev.type];
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => handleSelectEvent(ev)}
                          className="w-full text-start flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors"
                        >
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-medium block truncate">{ev.title}</span>
                            <span className="text-[10px] text-muted-foreground">{ev.start.slice(0, 10)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              );
            })()}
          </Card>
        </div>
      </div>

      {/* Mobile: bottom sheet for selected event */}
      {selectedEvent && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 p-3 animate-in slide-in-from-bottom-4 duration-200">
          <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        </div>
      )}
    </div>
  );
}
