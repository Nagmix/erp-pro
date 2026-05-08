'use client';

import { useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { buildEventCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';

type Ev = { name: string; subject?: string; starts_on?: string; ends_on?: string; status?: string; event_category?: string };

const columns: Column<Ev>[] = [
  { key: 'subject', header: 'الموضوع', render: (_, r) => r.subject || r.name },
  { key: 'starts_on', header: 'البداية', render: (v) => <span dir="ltr" className="text-xs">{String(v || '—').replace('T', ' ').slice(0, 16)}</span> },
  { key: 'ends_on', header: 'النهاية', render: (v) => <span dir="ltr" className="text-xs">{String(v || '—').replace('T', ' ').slice(0, 16)}</span> },
  { key: 'status', header: 'الحالة' },
];

function toDateTime(date: string, time: string): string {
  if (!date) return '';
  const t = time && time.length >= 5 ? `${time}:00` : '09:00:00';
  return `${date} ${t}`;
}

export default function AppointmentsPage() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('10:00');
  const [desc, setDesc] = useState('');
  const [assignee, setAssignee] = useState('');
  const [repeat, setRepeat] = useState<'None' | 'Daily' | 'Weekly' | 'Monthly'>('None');
  const [refType, setRefType] = useState('');
  const [refName, setRefName] = useState('');

  const { data, isLoading, isError, error, refetch } = useDocList<Ev>('Event', {
    fields: ['name', 'subject', 'starts_on', 'ends_on', 'status', 'event_category'],
    filters: [['event_category', '=', 'Meeting']],
    limit: 300,
    order_by: 'starts_on desc',
  });
  const createMutation = useCreateDoc('Event');
  const deleteMutation = useDeleteDoc('Event');

  const handleCreate = () => {
    if (!subject.trim() || !date) { toast.error('الموضوع والتاريخ مطلوبان'); return; }
    const starts_on = toDateTime(date, timeStart);
    const ends_on = toDateTime(date, timeEnd) || undefined;
    const mapped = buildEventCreate({
      subject,
      starts_on,
      ends_on,
      event_category: 'Meeting',
      description: desc || undefined,
      reference_doctype: refType || undefined,
      reference_docname: refName || undefined,
    });
    if (repeat !== 'None') {
      mapped.repeat_this_event = 1;
      mapped.repeat_on = repeat;
    }
    if (assignee) {
      mapped.event_participants = [{ reference_doctype: 'User', reference_docname: assignee }];
    }
    createMutation.mutate(prepareFrappeDocForCreate(mapped), {
      onSuccess: () => { toast.success('تم'); setOpen(false); setSubject(''); setDate(''); setDesc(''); setRefType(''); setRefName(''); setAssignee(''); setRepeat('None'); },
      onError: () => toast.error('فشل إنشاء الموعد'),
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

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="المواعيد"
        description="إدارة مواعيد العملاء والاجتماعات مع تتبع الحالة والتكرار."
        iconify="solar:calendar-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'إدارة العملاء', href: '/crm' }, { label: 'المواعيد' }]}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5" />موعد</Button></DialogTrigger>
            <DialogContent dir="rtl" className="max-w-md">
              <DialogHeader><DialogTitle>موعد اجتماع</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <Input placeholder="الموضوع" value={subject} onChange={(e) => setSubject(e.target.value)} />
                <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">من</Label><Input type="time" dir="ltr" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} /></div>
                  <div><Label className="text-xs">إلى</Label><Input type="time" dir="ltr" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} /></div>
                </div>
                <Textarea placeholder="وصف" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">التكرار</Label>
                    <select className="w-full h-9 border rounded-md text-sm px-2" value={repeat} onChange={(e) => setRepeat(e.target.value as typeof repeat)}>
                      <option value="None">بدون</option><option value="Daily">يومي</option><option value="Weekly">أسبوعي</option><option value="Monthly">شهري</option>
                    </select>
                  </div>
                  <div><Label className="text-xs">تعيين لموظف (User)</Label><ErpLinkCombobox doctype="User" value={assignee} onChange={setAssignee} displayKey="full_name" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">مرجع (اختياري)</Label>
                    <select className="w-full h-9 border rounded-md text-sm px-2" value={refType} onChange={(e) => { setRefType(e.target.value); setRefName(''); }}>
                      <option value="">—</option>
                      <option value="Lead">عميل محتمل</option>
                      <option value="Customer">عميل حالي</option>
                      <option value="Opportunity">فرصة</option>
                    </select>
                  </div>
                  <div><Label className="text-xs">اسم المرجع</Label>
                    {refType === 'Lead' && <ErpLinkCombobox doctype="Lead" value={refName} onChange={setRefName} />}
                    {refType === 'Customer' && <ErpLinkCombobox doctype="Customer" value={refName} onChange={setRefName} displayKey="customer_name" />}
                    {refType === 'Opportunity' && <ErpLinkCombobox doctype="Opportunity" value={refName} onChange={setRefName} />}
                    {!refType && <Input disabled placeholder="اختر النوع أولاً" />}
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>حفظ</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />
      <DataTable data={data || []} columns={columns} searchable loading={isLoading} onDelete={(r) => deleteMutation.mutate(r.name, { onSuccess: () => toast.success('تم الحذف') })} />
      <div className="border rounded-lg p-3 space-y-2">
        <p className="text-xs font-semibold">تصدير التقويم (ICS)</p>
        {(data || []).slice(0, 8).map((r) => (
          <div key={r.name} className="flex items-center justify-between text-sm border rounded-md p-2">
            <span>{r.subject || r.name}</span>
            <Button size="sm" variant="outline" onClick={() => downloadIcs(r)}>تحميل ICS</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
