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
import { useCreateDoc, useUpdateDoc, useDocList } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildEmployeeAdvanceCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { toast } from 'sonner';

type Row = { name: string; employee?: string; employee_name?: string; posting_date?: string; advance_amount?: number; purpose?: string; docstatus?: number };
const columns: Column<Row>[] = [
  { key: 'name', header: 'الرقم' },
  { key: 'employee_name', header: 'الموظف', render: (_, r) => r.employee_name || r.employee || '—' },
  { key: 'posting_date', header: 'التاريخ' },
  { key: 'advance_amount', header: 'المبلغ' },
  { key: 'purpose', header: 'السبب', render: (v) => String(v || '—') },
  { key: 'docstatus', header: 'الحالة', render: (v) => (Number(v) === 1 ? 'مُرحّل' : 'مسودة') },
];

export default function EmployeeAdvancesPage() {
  const [open, setOpen] = useState(false);
  const [employee, setEmployee] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [purpose, setPurpose] = useState('');
  const { company } = useDefaultCompanyName();

  // Edit state
  const [editingDoc, setEditingDoc] = useState<Row | null>(null);

  const { data, isLoading, isError, error, refetch } = useDocList<Row>('Employee Advance', {
    fields: ['name', 'employee', 'employee_name', 'posting_date', 'advance_amount', 'purpose', 'docstatus'],
    order_by: 'modified desc',
    limit: 300,
  });
  const createMut = useCreateDoc('Employee Advance');
  const updateMut = useUpdateDoc('Employee Advance');

  const openCreateDialog = () => {
    setEditingDoc(null);
    setEmployee('');
    setAmount(0);
    setPurpose('');
    setOpen(true);
  };

  const openEditDialog = (row: Row) => {
    if (Number(row.docstatus) !== 0) { toast.error('لا يمكن تعديل مستند معتمد'); return; }
    setEditingDoc(row);
    setEmployee(row.employee || '');
    setAmount(row.advance_amount || 0);
    setPurpose(row.purpose || '');
    setOpen(true);
  };

  const handleSave = () => {
    if (!company || !employee || amount <= 0) return toast.error('اكمل البيانات');

    if (editingDoc) {
      updateMut.mutate({
        name: editingDoc.name,
        doc: { advance_amount: amount, purpose: purpose || undefined },
      }, {
        onSuccess: () => { toast.success('تم تعديل السلفة'); setOpen(false); setEditingDoc(null); },
        onError: () => toast.error('فشل التعديل'),
      });
    } else {
      createMut.mutate(prepareFrappeDocForCreate(buildEmployeeAdvanceCreate({ employee, company, advance_amount: amount, purpose: purpose || undefined })), {
        onSuccess: () => { toast.success('تم إنشاء السلفة'); setOpen(false); setEmployee(''); setAmount(0); setPurpose(''); },
        onError: () => toast.error('فشل إنشاء السلفة'),
      });
    }
  };

  const handleDialogClose = (openVal: boolean) => {
    setOpen(openVal);
    if (!openVal) { setEditingDoc(null); setEmployee(''); setAmount(0); setPurpose(''); }
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="سلف الموظفين"
        description="إدارة السلف والعهد للموظفين"
        iconify="solar:wallet-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'سلف الموظفين' }]}
        actions={<Button size="sm" onClick={openCreateDialog}><Plus className="h-3.5 w-3.5" />سلفة</Button>}
      />

      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editingDoc ? `تعديل السلفة — ${editingDoc.name}` : 'إنشاء سلفة'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">الموظف</Label><ErpLinkCombobox doctype="Employee" value={employee} onChange={setEmployee} displayKey="employee_name" disabled={!!editingDoc} /></div>
            <div><Label className="text-xs">المبلغ</Label><Input type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value || 0))} /></div>
            <div><Label className="text-xs">السبب</Label><Input value={purpose} onChange={(e) => setPurpose(e.target.value)} /></div>
            <Button className="w-full" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>{(createMut.isPending || updateMut.isPending) ? 'جاري الحفظ...' : editingDoc ? 'حفظ التعديل' : 'حفظ'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />
      <DataTable data={data || []} columns={columns} searchable loading={isLoading}
        onEdit={(row) => openEditDialog(row as Row)}
      />
    </div>
  );
}
