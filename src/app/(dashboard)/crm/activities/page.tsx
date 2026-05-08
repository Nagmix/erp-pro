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
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { buildCommunicationCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';
import { PageHeader } from '@/components/erp/page-header';

type Row = {
  name: string;
  subject?: string;
  communication_medium?: string;
  communication_date?: string;
  reference_doctype?: string;
  reference_name?: string;
};

const CRM_DOCTYPE_AR: Record<string, string> = {
  'Lead': 'عميل محتمل',
  'Customer': 'عميل',
  'Opportunity': 'فرصة',
  'Quotation': 'عرض سعر',
  'Sales Order': 'أمر بيع',
  'Sales Invoice': 'فاتورة مبيعات',
  'Contact': 'جهة اتصال',
  'Address': 'عنوان',
  'Communication': 'تواصل',
  'Issue': 'بلاغ',
};

const columns: Column<Row>[] = [
  { key: 'subject', header: 'الموضوع' },
  { key: 'communication_medium', header: 'النوع' },
  { key: 'communication_date', header: 'التاريخ', render: (v) => <span dir="ltr" className="text-xs">{String(v || '—').slice(0, 16)}</span> },
  { key: 'reference_doctype', header: 'مرجع', render: (_, r) => <span className="text-xs">{r.reference_doctype ? `${CRM_DOCTYPE_AR[r.reference_doctype] || r.reference_doctype}: ${r.reference_name}` : '—'}</span> },
];

export default function ActivitiesPage() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [medium, setMedium] = useState<'Phone' | 'Email' | 'Meeting' | 'Visit' | 'SMS' | 'Other'>('Phone');
  const [content, setContent] = useState('');
  const [refType, setRefType] = useState('');
  const [refName, setRefName] = useState('');
  const [phone, setPhone] = useState('');

  const { data, isLoading, isError, error, refetch } = useDocList<Row>('Communication', {
    fields: ['name', 'subject', 'communication_medium', 'communication_date', 'reference_doctype', 'reference_name'],
    filters: [['communication_type', '=', 'Communication']],
    limit: 300,
    order_by: 'communication_date desc',
  });
  const createMutation = useCreateDoc('Communication');
  const deleteMutation = useDeleteDoc('Communication');

  const handleCreate = () => {
    if (!subject.trim()) { toast.error('الموضوع مطلوب'); return; }
    const mapped = buildCommunicationCreate({
      subject,
      communication_medium: medium,
      content: content || undefined,
      reference_doctype: refType || undefined,
      reference_name: refName || undefined,
      phone_no: medium === 'Phone' || medium === 'SMS' ? phone || undefined : undefined,
    });
    createMutation.mutate(prepareFrappeDocForCreate(mapped), {
      onSuccess: () => { toast.success('تم التسجيل'); setOpen(false); setSubject(''); setContent(''); setRefType(''); setRefName(''); setPhone(''); },
      onError: () => toast.error('فشل الحفظ'),
    });
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="الأنشطة"
        description="مكالمات، اجتماعات، زيارات، رسائل وكل أنواع التواصل المسجّل ضمن CRM"
        iconify="solar:phone-calling-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'علاقات العملاء', href: '/crm' }, { label: 'الأنشطة' }]}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />نشاط جديد
              </Button>
            </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader><DialogTitle>تسجيل نشاط</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <Input placeholder="الموضوع" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <div className="space-y-1"><Label className="text-xs">النوع</Label>
                <select className="w-full h-9 border rounded-md px-2 text-sm" value={medium} onChange={(e) => setMedium(e.target.value as typeof medium)}>
                  {(['Phone', 'Email', 'Meeting', 'Visit', 'SMS', 'Other'] as const).map((m) => {
                  const MEDIUM_AR: Record<string, string> = { Phone: 'هاتف', Email: 'بريد', Meeting: 'اجتماع', Visit: 'زيارة', SMS: 'رسالة', Other: 'أخرى' };
                  return <option key={m} value={m}>{MEDIUM_AR[m]}</option>;
                })}
                </select>
              </div>
              {(medium === 'Phone' || medium === 'SMS') && <Input dir="ltr" placeholder="رقم" value={phone} onChange={(e) => setPhone(e.target.value)} />}
              <Input placeholder="ملاحظات / محتوى" value={content} onChange={(e) => setContent(e.target.value)} />
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
        }
      />
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />
      <DataTable data={data || []} columns={columns} searchable loading={isLoading} onDelete={(r) => deleteMutation.mutate(r.name, { onSuccess: () => toast.success('تم') })} />
    </div>
  );
}
