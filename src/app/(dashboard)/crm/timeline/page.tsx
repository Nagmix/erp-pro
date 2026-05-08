'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { Label } from '@/components/ui/label';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDocList } from '@/lib/client/hooks';

type Comm = { name: string; subject?: string; communication_medium?: string; communication_date?: string; reference_doctype?: string; reference_name?: string };
type Event = { name: string; subject?: string; starts_on?: string; reference_doctype?: string; reference_docname?: string };
type Todo = { name: string; description?: string; date?: string; status?: string; reference_type?: string; reference_name?: string };
type TimelineRow = { ts: string; source: string; title: string; channel: string; status: string };

const SOURCE_AR: Record<string, string> = { Communication: 'اتصال', Event: 'حدث', ToDo: 'مهمة' };
const CHANNEL_AR: Record<string, string> = { Meeting: 'اجتماع', 'Follow-up': 'متابعة', Phone: 'هاتف', Email: 'بريد', SMS: 'رسالة', Other: 'أخرى', Visit: 'زيارة' };
const STATUS_AR: Record<string, string> = { Logged: 'مسجل', Scheduled: 'مجدول', Open: 'مفتوح', Closed: 'مغلق' };

const cols: Column<TimelineRow>[] = [
  { key: 'ts', header: 'الوقت' },
  { key: 'source', header: 'المصدر', render: (v) => SOURCE_AR[String(v)] || String(v) },
  { key: 'title', header: 'الوصف' },
  { key: 'channel', header: 'القناة', render: (v) => CHANNEL_AR[String(v)] || String(v) },
  { key: 'status', header: 'الحالة', render: (v) => STATUS_AR[String(v)] || String(v) },
];

export default function CrmTimelinePage() {
  const [customer, setCustomer] = useState('');
  const comm = useDocList<Comm>('Communication', {
    fields: ['name', 'subject', 'communication_medium', 'communication_date', 'reference_doctype', 'reference_name'],
    filters: customer ? [['reference_name', '=', customer]] : [],
    limit: 300,
    order_by: 'communication_date desc',
  });
  const events = useDocList<Event>('Event', {
    fields: ['name', 'subject', 'starts_on', 'reference_doctype', 'reference_docname'],
    filters: customer ? [['reference_docname', '=', customer]] : [],
    limit: 300,
    order_by: 'starts_on desc',
  });
  const todos = useDocList<Todo>('ToDo', {
    fields: ['name', 'description', 'date', 'status', 'reference_type', 'reference_name'],
    filters: customer ? [['reference_name', '=', customer]] : [],
    limit: 300,
    order_by: 'date desc',
  });

  const rows = useMemo<TimelineRow[]>(() => {
    const a = (comm.data || []).map((x) => ({ ts: x.communication_date || '', source: 'اتصال', title: x.subject || x.name, channel: x.communication_medium || '—', status: 'مسجل' }));
    const b = (events.data || []).map((x) => ({ ts: x.starts_on || '', source: 'حدث', title: x.subject || x.name, channel: 'اجتماع', status: 'مجدول' }));
    const c = (todos.data || []).map((x) => ({ ts: x.date || '', source: 'مهمة', title: String(x.description || '').replace(/<[^>]+>/g, ' ').trim() || x.name, channel: 'متابعة', status: x.status === 'Open' ? 'مفتوح' : x.status === 'Closed' ? 'مغلق' : String(x.status || 'مفتوح') }));
    return [...a, ...b, ...c].sort((x, y) => (x.ts < y.ts ? 1 : -1));
  }, [comm.data, events.data, todos.data]);

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="سجل التفاعلات"
        description="سجل موحد لجميع تفاعلات العميل من اتصالات وأحداث ومتابعات"
        iconify="solar:chat-line-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'CRM', href: '/crm' }, { label: 'سجل التفاعلات' }]}
      />

      <div className="max-w-md"><Label className="text-xs">العميل</Label><ErpLinkCombobox doctype="Customer" value={customer} onChange={setCustomer} displayKey="customer_name" /></div>
      <ListQueryAlert error={comm.isError ? comm.error : events.isError ? events.error : todos.isError ? todos.error : null} onRetry={() => { comm.refetch(); events.refetch(); todos.refetch(); }} />
      <DataTable data={rows} columns={cols} searchable loading={comm.isLoading || events.isLoading || todos.isLoading} />
    </div>
  );
}
