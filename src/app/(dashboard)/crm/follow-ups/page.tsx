'use client';

import { useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useDocList, useCreateDoc, useDeleteDoc, useUpdateDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { buildToDoCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';

type Row = {
  name: string;
  description?: string;
  date?: string;
  priority?: string;
  status?: string;
  reference_type?: string;
  reference_name?: string;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

const columns: Column<Row>[] = [
  { key: 'description', header: 'المهمة', render: (v) => <span className="text-sm">{stripHtml(String(v || '')) || '—'}</span> },
  { key: 'date', header: 'الاستحقاق', render: (v) => String(v || '—') },
  { key: 'priority', header: 'الأولوية' },
  { key: 'status', header: 'الحالة' },
  { key: 'reference_type', header: 'مرجع', render: (_, r) => (r.reference_type ? `${r.reference_type}: ${r.reference_name}` : '—') },
];

export default function FollowUpsPage() {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [refType, setRefType] = useState('');
  const [refName, setRefName] = useState('');
  const [allocated, setAllocated] = useState('');

  const { data, isLoading, isError, error, refetch } = useDocList<Row>('ToDo', {
    fields: ['name', 'description', 'date', 'priority', 'status', 'reference_type', 'reference_name'],
    filters: [['status', '!=', 'Cancelled']],
    limit: 400,
    order_by: 'date asc',
  });
  const createMutation = useCreateDoc('ToDo');
  const deleteMutation = useDeleteDoc('ToDo');
  const updateMutation = useUpdateDoc('ToDo');

  const handleCreate = () => {
    if (!desc.trim()) { toast.error('وصف المهمة مطلوب'); return; }
    const mapped = buildToDoCreate({
      description: desc,
      date: date || undefined,
      priority,
      reference_type: refType || undefined,
      reference_name: refName || undefined,
      allocated_to: allocated || undefined,
    });
    createMutation.mutate(prepareFrappeDocForCreate(mapped), {
      onSuccess: () => { toast.success('تم'); setOpen(false); setDesc(''); setDate(''); setRefType(''); setRefName(''); setAllocated(''); },
      onError: () => toast.error('فشل'),
    });
  };

  const closeTask = (row: Row) => {
    updateMutation.mutate({ name: row.name, doc: { status: 'Closed' } }, { onSuccess: () => toast.success('أُغلقت'), onError: () => toast.error('فشل') });
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-xl font-bold">المتابعة</h1>
          <p className="text-sm text-muted-foreground mt-1">مهام متابعة مرتبطة بعملاء محتملين أو حاليين أو فرص</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5" />متابعة</Button></DialogTrigger>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader><DialogTitle>مهمة متابعة</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <Input placeholder="ماذا تريد أن تتابعه؟" value={desc} onChange={(e) => setDesc(e.target.value)} />
              <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">أولوية</Label>
                  <select className="w-full h-9 border rounded-md text-sm px-2" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
                    <option value="High">عالية</option>
                    <option value="Medium">متوسطة</option>
                    <option value="Low">منخفضة</option>
                  </select>
                </div>
                <div><Label className="text-xs">تعيين إلى (المستخدم)</Label><ErpLinkCombobox doctype="User" value={allocated} onChange={setAllocated} displayKey="full_name" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select className="h-9 border rounded-md text-sm px-2" value={refType} onChange={(e) => { setRefType(e.target.value); setRefName(''); }}>
                  <option value="">بدون مرجع</option>
                  <option value="Lead">عميل محتمل</option>
                  <option value="Customer">عميل حالي</option>
                  <option value="Opportunity">فرصة</option>
                </select>
                {refType === 'Lead' && <ErpLinkCombobox doctype="Lead" value={refName} onChange={setRefName} />}
                {refType === 'Customer' && <ErpLinkCombobox doctype="Customer" value={refName} onChange={setRefName} displayKey="customer_name" />}
                {refType === 'Opportunity' && <ErpLinkCombobox doctype="Opportunity" value={refName} onChange={setRefName} />}
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />
      <DataTable
        data={data || []}
        columns={columns}
        searchable
        loading={isLoading}
        onEdit={(row) => {
          if (row.status === 'Open') closeTask(row);
        }}
        onDelete={(row) => deleteMutation.mutate(row.name, { onSuccess: () => toast.success('تم') })}
      />
      <p className="text-[10px] text-muted-foreground">استخدم «تعديل» من القائمة لإغلاق المهمة (Open → Closed).</p>
    </div>
  );
}
