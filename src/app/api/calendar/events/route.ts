// GET /api/calendar/events
// Returns combined calendar events from ERPNext (Event, Task, Holiday List)

import { NextRequest, NextResponse } from 'next/server';
import { getList, getDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  color?: string;
  type: 'event' | 'task' | 'holiday';
  status?: string;
  doctype: string;
  name: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const company = searchParams.get('company') || undefined;
    const userSession = getFrappeSidFromRequest(request);

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'يجب تحديد تاريخ البداية والنهاية' },
        { status: 400 }
      );
    }

    const events: CalendarEvent[] = [];

    // 1. Fetch Event doctype
    try {
      const eventRows = await getList('Event', {
        fields: ['name', 'subject', 'starts_on', 'ends_on', 'event_type', 'color', 'all_day', 'status'],
        filters: [
          ['starts_on', '>=', startDate],
          ['starts_on', '<=', endDate + ' 23:59:59'],
        ],
        limit: 500,
        order_by: 'starts_on asc',
      }, userSession);

      for (const row of eventRows as Record<string, unknown>[]) {
        events.push({
          id: `event-${row.name}`,
          title: String(row.subject || ''),
          start: String(row.starts_on || ''),
          end: row.ends_on ? String(row.ends_on) : undefined,
          allDay: row.all_day === 1 || row.all_day === true,
          color: row.color ? String(row.color) : undefined,
          type: 'event',
          status: row.status ? String(row.status) : undefined,
          doctype: 'Event',
          name: String(row.name),
        });
      }
    } catch {
      // Event doctype might not exist — skip silently
    }

    // 2. Fetch Task doctype
    try {
      const taskFilters: string[][] = [
        ['exp_start_date', '>=', startDate],
        ['exp_start_date', '<=', endDate],
      ];
      if (company) {
        taskFilters.push(['company', '=', company]);
      }

      const taskRows = await getList('Task', {
        fields: ['name', 'subject', 'exp_start_date', 'exp_end_date', 'status', 'priority', 'project'],
        filters: taskFilters,
        limit: 500,
        order_by: 'exp_start_date asc',
      }, userSession);

      const priorityColors: Record<string, string> = {
        High: '#ef4444',
        Medium: '#f59e0b',
        Low: '#22c55e',
      };

      for (const row of taskRows as Record<string, unknown>[]) {
        events.push({
          id: `task-${row.name}`,
          title: String(row.subject || ''),
          start: String(row.exp_start_date || ''),
          end: row.exp_end_date ? String(row.exp_end_date) : undefined,
          allDay: true,
          color: row.priority ? (priorityColors[String(row.priority)] || '#3b82f6') : '#3b82f6',
          type: 'task',
          status: row.status ? String(row.status) : undefined,
          doctype: 'Task',
          name: String(row.name),
        });
      }
    } catch {
      // Task doctype might not exist — skip silently
    }

    // 3. Fetch Holiday List events
    try {
      const holidayListFilters: string[][] = [];
      if (company) {
        holidayListFilters.push(['company', '=', company]);
      }

      const holidayLists = await getList('Holiday List', {
        fields: ['name', 'holiday_list_name'],
        filters: holidayListFilters.length > 0 ? holidayListFilters : undefined,
        limit: 50,
      }, userSession);

      for (const hl of holidayLists as Record<string, unknown>[]) {
        try {
          const hlDoc = await getDoc('Holiday List', String(hl.name), userSession) as Record<string, unknown>;
          const holidays = Array.isArray(hlDoc?.holidays) ? hlDoc.holidays : [];

          for (const holiday of holidays as Record<string, unknown>[]) {
            const holidayDate = String(holiday.holiday_date || '');
            if (!holidayDate) continue;

            // Filter by date range
            if (holidayDate >= startDate && holidayDate <= endDate) {
              events.push({
                id: `holiday-${hl.name}-${holidayDate}`,
                title: String(holiday.description || 'عطلة'),
                start: holidayDate,
                end: holidayDate,
                allDay: true,
                color: '#10b981',
                type: 'holiday',
                status: undefined,
                doctype: 'Holiday List',
                name: String(hl.name),
              });
            }
          }
        } catch {
          // Skip individual holiday list if fetch fails
        }
      }
    } catch {
      // Holiday List doctype might not exist — skip silently
    }

    return NextResponse.json({ success: true, data: events });
  } catch {
    return NextResponse.json(
      { success: false, error: 'فشل تحميل أحداث التقويم' },
      { status: 500 }
    );
  }
}
