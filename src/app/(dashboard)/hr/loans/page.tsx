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
import { buildLoanCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { toast } from 'sonner';

type Row = { name: string; applicant?: string; loan_type?: string; loan_amount?: number; repayment_periods?: number; docstatus?: number };
const columns: Column<Row>[] = [
  { key: 'name', header: 'الرقم' },
  { key: 'applicant', header: 'الموظف' },
  { key: 'loan_type', header: 'نوع القرض' },
  { key: 'loan_amount', header: 'المبلغ' },
  { key: 'docstatus', header: 'الحالة', render: (v) => (Number(v) === 1 ? 'مُرحّل' : 'مسودة') },
];

export default function EmployeeLoansPage() {
  const [open, setOpen] = useState(false);
  const [employee, setEmployee] = useState('');
  const [loanType, setLoanType] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [periods, setPeriods] = useState<number>(12);
  const { company } = useDefaultCompanyName();

  // Edit state
  const [editingDoc, setEditingDoc] = useState<Row | null>(null);

  const { data, isLoading, isError, error, refetch } = useDocList<Row>('Loan', {
    fields: ['name', 'applicant', 'loan_type', 'loan_amount', 'repayment_periods', 'docstatus'],
    filters: [['applicant_type', '=', 'Employee']],
    order_by: 'modified desc',
    limit: 300,
  });
  const createMut = useCreateDoc('Loan');
  const updateMut = useUpdateDoc('Loan');

  const openCreateDialog = () => {
    setEditingDoc(null);
    setEmployee('');
    setLoanType('');
    setAmount(0);
    setPeriods(12);
    setOpen(true);
  };

  const openEditDialog = (row: Row) => {
    if (Number(row.docstatus) !== 0) { toast.error('لا يمكن تعديل مستند معتمد'); return; }
    setEditingDoc(row);
    setEmployee(row.applicant || '');
    setLoanType(row.loan_type || '');
    setAmount(row.loan_amount || 0);
    setPeriods(row.repayment_periods || 12);
    setOpen(true);
  };

  const handleSave = () => {
    if (!company || !employee || !loanType || amount <= 0) return toast.error('اكمل البيانات');

    if (editingDoc) {
      updateMut.mutate({
        name: editingDoc.name,
        doc: { loan_type: loanType, loan_amount: amount, repayment_periods: periods },
      }, {
        onSuccess: () => { toast.success('تم تعديل القرض'); setOpen(false); setEditingDoc(null); },
        onError: () => toast.error('فشل التعديل'),
      });
    } else {
      createMut.mutate(prepareFrappeDocForCreate(buildLoanCreate({
        applicant: employee,
        company,
        loan_type: loanType,
        loan_amount: amount,
        repayment_method: 'Repay Over Number of Periods',
        repayment_periods: periods,
      })), {
        onSuccess: () => { toast.success('تم إنشاء القرض'); setOpen(false); },
        onError: () => toast.error('فشل إنشاء القرض'),
      });
    }
  };

  const handleDialogClose = (openVal: boolean) => {
    setOpen(openVal);
    if (!openVal) { setEditingDoc(null); setEmployee(''); setLoanType(''); setAmount(0); setPeriods(12); }
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="قروض الموظفين"
        description="إدارة القروض وأقساط السداد"
        iconify="solar:hand-money-bold-duotone"
        accent="purple"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'قروض الموظفين' }]}
        actions={<Button size="sm" onClick={openCreateDialog}><Plus className="h-3.5 w-3.5" />قرض</Button>}
      />

      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editingDoc ? `تعديل القرض — ${editingDoc.name}` : 'إنشاء قرض موظف'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">الموظف</Label><ErpLinkCombobox doctype="Employee" value={employee} onChange={setEmployee} displayKey="employee_name" disabled={!!editingDoc} /></div>
            <div><Label className="text-xs">نوع القرض</Label><ErpLinkCombobox doctype="Loan Type" value={loanType} onChange={setLoanType} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">المبلغ</Label><Input type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value || 0))} /></div>
              <div><Label className="text-xs">عدد الأقساط</Label><Input type="number" value={periods || ''} onChange={(e) => setPeriods(Number(e.target.value || 1))} /></div>
            </div>
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
