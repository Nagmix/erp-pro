'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useCreateDoc, useDocList } from '@/lib/client/hooks';
import { toast } from 'sonner';

type Row = { name: string; terms?: string; disabled?: number };
const columns: Column<Row>[] = [
  { key: 'name', header: 'الاسم' },
  { key: 'terms', header: 'الشروط', render: (v) => <span className="text-xs">{String(v || '').slice(0, 80)}</span> },
  { key: 'disabled', header: 'الحالة', render: (v) => (Number(v) === 1 ? 'معطل' : 'نشط') },
];

export default function TermsSettingsPage() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [terms, setTerms] = useState('');
  const list = useDocList<Row>('Terms and Conditions', { fields: ['name', 'terms', 'disabled'], limit: 200, order_by: 'modified desc' });
  const createMut = useCreateDoc('Terms and Conditions');
  const create = () => {
    if (!name || !terms) return toast.error('الاسم والشروط مطلوبان');
    createMut.mutate({ doctype: 'Terms and Conditions', title: name, terms }, {
      onSuccess: () => { toast.success('تم حفظ الشروط'); setOpen(false); },
      onError: () => toast.error('فشل الحفظ'),
    });
  };
  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="الشروط والأحكام"
        description="إدارة شروط وأحكام المستندات والعقود"
        iconify="solar:document-text-bold-duotone"
        accent="amber"
        breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'الشروط والأحكام' }]}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5" />شروط</Button></DialogTrigger>
            <DialogContent dir="rtl"><DialogHeader><DialogTitle>إنشاء شروط</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div><Label className="text-xs">العنوان</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label className="text-xs">النص</Label><Textarea rows={5} value={terms} onChange={(e) => setTerms(e.target.value)} /></div>
                <Button className="w-full" onClick={create} disabled={createMut.isPending}>حفظ</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <ListQueryAlert error={list.isError ? list.error : null} onRetry={() => list.refetch()} />
      <DataTable data={list.data || []} columns={columns} searchable loading={list.isLoading} />
    </div>
  );
}
