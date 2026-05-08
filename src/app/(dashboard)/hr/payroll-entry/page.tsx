'use client';

import { useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useCreateDoc, useUpdateDoc, useDocList, useSubmitDoc } from '@/lib/client/hooks';
import { buildPayrollEntryCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { toast } from 'sonner';

type Row = { name: string; company?: string; start_date?: string; end_date?: string; payroll_frequency?: string; docstatus?: number };
const columns: Column<Row>[] = [
  { key: 'name', header: 'الرقم' },
  { key: 'company', header: 'الشركة' },
  { key: 'start_date', header: 'من' },
  { key: 'end_date', header: 'إلى' },
  { key: 'payroll_frequency', header: 'الدورية' },
  { key: 'docstatus', header: 'الحالة', render: (v) => (Number(v) === 1 ? 'مُرحّل' : 'مسودة') },
];

export default function PayrollEntryPage() {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [freq, setFreq] = useState<'Monthly' | 'Fortnightly' | 'Weekly' | 'Daily'>('Monthly');
  const { company } = useDefaultCompanyName();

  // Edit state
  const [editingDoc, setEditingDoc] = useState<Row | null>(null);

  const { data, isLoading, isError, error, refetch } = useDocList<Row>('Payroll Entry', {
    fields: ['name', 'company', 'start_date', 'end_date', 'payroll_frequency', 'docstatus'],
    limit: 300,
    order_by: 'modified desc',
  });
  const createMut = useCreateDoc('Payroll Entry');
  const updateMut = useUpdateDoc('Payroll Entry');
  const submitMut = useSubmitDoc('Payroll Entry');

  const openCreateDialog = () => {
    setEditingDoc(null);
    setStart('');
    setEnd('');
    setFreq('Monthly');
    setOpen(true);
  };

  const openEditDialog = (row: Row) => {
    if (Number(row.docstatus) !== 0) { toast.error('لا يمكن تعديل مستند معتمد'); return; }
    setEditingDoc(row);
    setStart(row.start_date || '');
    setEnd(row.end_date || '');
    setFreq((row.payroll_frequency as typeof freq) || 'Monthly');
    setOpen(true);
  };

  const handleSave = () => {
    if (!company || !start || !end) return toast.error('الشركة والفترة مطلوبة');

    if (editingDoc) {
      updateMut.mutate({
        name: editingDoc.name,
        doc: { start_date: start, end_date: end, payroll_frequency: freq },
      }, {
        onSuccess: () => { toast.success('تم تعديل مسير الرواتب'); setOpen(false); setEditingDoc(null); },
        onError: () => toast.error('فشل التعديل'),
      });
    } else {
      const payload = buildPayrollEntryCreate({ company, start_date: start, end_date: end, payroll_frequency: freq });
      createMut.mutate(prepareFrappeDocForCreate(payload), {
        onSuccess: () => {
          toast.success('تم إنشاء مسير الرواتب');
          setOpen(false);
          setStart('');
          setEnd('');
        },
        onError: () => toast.error('فشل الإنشاء'),
      });
    }
  };

  const handleDialogClose = (openVal: boolean) => {
    setOpen(openVal);
    if (!openVal) { setEditingDoc(null); setStart(''); setEnd(''); setFreq('Monthly'); }
  };

  const drafts = (data || []).filter((x) => Number(x.docstatus) === 0);

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="مسير الرواتب"
        description="إنشاء جماعي واعتماد مسيرات الدفع"
        iconify="solar:calculator-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'مسير الرواتب' }]}
        actions={<Button size="sm" onClick={openCreateDialog}><Plus className="h-3.5 w-3.5" />مسير جديد</Button>}
      />

      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editingDoc ? `تعديل مسير الرواتب — ${editingDoc.name}` : 'إنشاء مسير رواتب'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">من</Label><Input type="date" dir="ltr" value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div><Label className="text-xs">إلى</Label><Input type="date" dir="ltr" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            </div>
            <div>
              <Label className="text-xs">الدورية</Label>
              <select className="w-full h-9 border rounded-md text-sm px-2" value={freq} onChange={(e) => setFreq(e.target.value as typeof freq)}>
                <option value="Monthly">شهري</option><option value="Fortnightly">نصف شهري</option><option value="Weekly">أسبوعي</option><option value="Daily">يومي</option>
              </select>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>{(createMut.isPending || updateMut.isPending) ? 'جاري الحفظ...' : editingDoc ? 'حفظ التعديل' : 'حفظ'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />
      <DataTable data={data || []} columns={columns} searchable loading={isLoading}
        onEdit={(row) => openEditDialog(row as Row)}
      />
      {drafts.length > 0 && (
        <div className="border rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold">مسودات جاهزة للترحيل</p>
          {drafts.map((d) => (
            <div key={d.name} className="flex items-center justify-between text-sm border rounded-md p-2">
              <span>{d.name} — {d.start_date} → {d.end_date}</span>
              <Button size="sm" variant="outline" onClick={() => submitMut.mutate(d.name, { onSuccess: () => toast.success('تم الترحيل'), onError: () => toast.error('فشل الترحيل') })}>ترحيل</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
