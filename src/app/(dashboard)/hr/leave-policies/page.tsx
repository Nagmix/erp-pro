'use client';

import { useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useCreateDoc, useUpdateDoc, useDocList } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildLeaveAllocationCreate, buildLeavePolicyCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { PageHeader } from '@/components/erp/page-header';
import { toast } from 'sonner';

type Policy = { name: string; title?: string; company?: string; is_active?: number };
type Allocation = { name: string; employee?: string; employee_name?: string; leave_type?: string; from_date?: string; to_date?: string; new_leaves_allocated?: number; docstatus?: number };
const policyCols: Column<Policy>[] = [
  { key: 'name', header: 'الرمز' },
  { key: 'title', header: 'العنوان' },
  { key: 'is_active', header: 'نشط', render: (v) => (Number(v) === 1 ? 'نعم' : 'لا') },
];
const allocCols: Column<Allocation>[] = [
  { key: 'name', header: 'الرمز' },
  { key: 'employee_name', header: 'الموظف', render: (_, r) => r.employee_name || r.employee || '—' },
  { key: 'leave_type', header: 'النوع' },
  { key: 'new_leaves_allocated', header: 'الرصيد' },
  { key: 'from_date', header: 'من' },
  { key: 'to_date', header: 'إلى' },
  { key: 'docstatus', header: 'الحالة', render: (v) => (Number(v) === 1 ? 'مُرحّل' : 'مسودة') },
];

export default function LeavePoliciesPage() {
  const [tab, setTab] = useState('policies');
  const [openPolicy, setOpenPolicy] = useState(false);
  const [openAlloc, setOpenAlloc] = useState(false);
  const [title, setTitle] = useState('');
  const [annual, setAnnual] = useState<number>(0);
  const [employee, setEmployee] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [allocated, setAllocated] = useState<number>(0);
  const { company } = useDefaultCompanyName();

  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [editingAlloc, setEditingAlloc] = useState<Allocation | null>(null);

  const policies = useDocList<Policy>('Leave Policy', { fields: ['name', 'title', 'company', 'is_active'], limit: 300 });
  const allocations = useDocList<Allocation>('Leave Allocation', { fields: ['name', 'employee', 'employee_name', 'leave_type', 'from_date', 'to_date', 'new_leaves_allocated', 'docstatus'], limit: 300, order_by: 'modified desc' });
  const createPolicy = useCreateDoc('Leave Policy');
  const updatePolicy = useUpdateDoc('Leave Policy');
  const createAlloc = useCreateDoc('Leave Allocation');
  const updateAlloc = useUpdateDoc('Leave Allocation');

  const openPolicyDialog = (policy?: Policy) => {
    if (policy) {
      setEditingPolicy(policy);
      setTitle(policy.title || policy.name);
      setAnnual(0);
    } else {
      setEditingPolicy(null);
      setTitle('');
      setAnnual(0);
    }
    setOpenPolicy(true);
  };

  const openAllocDialog = (alloc?: Allocation) => {
    if (alloc) {
      setEditingAlloc(alloc);
      setEmployee(alloc.employee || '');
      setLeaveType(alloc.leave_type || '');
      setFromDate(alloc.from_date || '');
      setToDate(alloc.to_date || '');
      setAllocated(alloc.new_leaves_allocated || 0);
    } else {
      setEditingAlloc(null);
      setEmployee('');
      setLeaveType('');
      setFromDate('');
      setToDate('');
      setAllocated(0);
    }
    setOpenAlloc(true);
  };

  const savePolicy = () => {
    if (!company || !title) return toast.error('الشركة والعنوان مطلوبان');
    if (editingPolicy) {
      updatePolicy.mutate({ name: editingPolicy.name, doc: { title, annual_allocation: annual } }, {
        onSuccess: () => { toast.success('تم تعديل السياسة'); setOpenPolicy(false); setEditingPolicy(null); },
        onError: () => toast.error('فشل التعديل'),
      });
    } else {
      createPolicy.mutate(prepareFrappeDocForCreate(buildLeavePolicyCreate({ title, company, annual_allocation: annual })), {
        onSuccess: () => { toast.success('تم إنشاء السياسة'); setOpenPolicy(false); setTitle(''); setAnnual(0); },
        onError: () => toast.error('فشل الإنشاء'),
      });
    }
  };

  const saveAlloc = () => {
    if (!company || !employee || !leaveType || !fromDate || !toDate || allocated <= 0) return toast.error('اكمل بيانات التخصيص');
    if (editingAlloc) {
      updateAlloc.mutate({ name: editingAlloc.name, doc: { employee, leave_type: leaveType, from_date: fromDate, to_date: toDate, new_leaves_allocated: allocated } }, {
        onSuccess: () => { toast.success('تم تعديل التخصيص'); setOpenAlloc(false); setEditingAlloc(null); },
        onError: () => toast.error('فشل التعديل'),
      });
    } else {
      createAlloc.mutate(prepareFrappeDocForCreate(buildLeaveAllocationCreate({
        company, employee, leave_type: leaveType, from_date: fromDate, to_date: toDate, new_leaves_allocated: allocated,
      })), {
        onSuccess: () => { toast.success('تم التخصيص'); setOpenAlloc(false); },
        onError: () => toast.error('فشل التخصيص'),
      });
    }
  };

  const handlePolicyClose = (open: boolean) => {
    setOpenPolicy(open);
    if (!open) { setEditingPolicy(null); setTitle(''); setAnnual(0); }
  };

  const handleAllocClose = (open: boolean) => {
    setOpenAlloc(open);
    if (!open) { setEditingAlloc(null); setEmployee(''); setLeaveType(''); setFromDate(''); setToDate(''); setAllocated(0); }
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="سياسات ورصيد الإجازات"
        description="إدارة سياسات الإجازات وتخصيص الأرصدة للموظفين"
        iconify="solar:calendar-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'سياسات الإجازات' }]}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openPolicyDialog()}><Plus className="h-3.5 w-3.5" />سياسة</Button>
            <Button size="sm" className="gap-1.5" onClick={() => openAllocDialog()}><Plus className="h-3.5 w-3.5" />تخصيص رصيد</Button>
          </div>
        }
      />

      <Dialog open={openPolicy} onOpenChange={handlePolicyClose}>
        <DialogContent dir="rtl"><DialogHeader><DialogTitle>{editingPolicy ? `تعديل السياسة — ${editingPolicy.name}` : 'سياسة إجازات'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">العنوان</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label className="text-xs">تخصيص سنوي</Label><Input type="number" value={annual || ''} onChange={(e) => setAnnual(Number(e.target.value || 0))} /></div>
            <Button className="w-full" onClick={savePolicy} disabled={createPolicy.isPending || updatePolicy.isPending}>{(createPolicy.isPending || updatePolicy.isPending) ? 'جاري الحفظ...' : 'حفظ'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openAlloc} onOpenChange={handleAllocClose}>
        <DialogContent dir="rtl"><DialogHeader><DialogTitle>{editingAlloc ? `تعديل التخصيص — ${editingAlloc.name}` : 'تخصيص إجازة'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">الموظف</Label><ErpLinkCombobox doctype="Employee" value={employee} onChange={setEmployee} displayKey="employee_name" /></div>
            <div><Label className="text-xs">نوع الإجازة</Label><ErpLinkCombobox doctype="Leave Type" value={leaveType} onChange={setLeaveType} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">من</Label><Input type="date" dir="ltr" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
              <div><Label className="text-xs">إلى</Label><Input type="date" dir="ltr" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
            </div>
            <div><Label className="text-xs">الرصيد</Label><Input type="number" value={allocated || ''} onChange={(e) => setAllocated(Number(e.target.value || 0))} /></div>
            <Button className="w-full" onClick={saveAlloc} disabled={createAlloc.isPending || updateAlloc.isPending}>{(createAlloc.isPending || updateAlloc.isPending) ? 'جاري الحفظ...' : 'حفظ'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="policies">السياسات</TabsTrigger><TabsTrigger value="allocations">التخصيصات</TabsTrigger></TabsList>
      </Tabs>
      {tab === 'policies' && (
        <>
          <ListQueryAlert error={policies.isError ? policies.error : null} onRetry={() => policies.refetch()} />
          <DataTable data={policies.data || []} columns={policyCols} searchable loading={policies.isLoading} onEdit={(row) => openPolicyDialog(row)} />
        </>
      )}
      {tab === 'allocations' && (
        <>
          <ListQueryAlert error={allocations.isError ? allocations.error : null} onRetry={() => allocations.refetch()} />
          <DataTable data={allocations.data || []} columns={allocCols} searchable loading={allocations.isLoading} onEdit={(row) => {
            if (Number(row.docstatus) !== 0) { toast.error('لا يمكن تعديل مستند معتمد'); return; }
            openAllocDialog(row);
          }} />
        </>
      )}
    </div>
  );
}
