'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, CreditCard, Coins } from 'lucide-react';
import { useCreateDoc, useDocList } from '@/lib/client/hooks';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { formatCurrency } from '@/lib/core/helpers';
import { toast } from 'sonner';

type Row = { name: string; party_name?: string; paid_amount?: number; reference_no?: string; posting_date?: string };
const columns: Column<Row>[] = [
  { key: 'name', header: 'الرقم' },
  { key: 'party_name', header: 'العميل' },
  { key: 'paid_amount', header: 'القيمة', render: (v) => <span className="tabular-nums font-medium">{formatCurrency(Number(v) || 0)}</span> },
  { key: 'reference_no', header: 'الحزمة/المرجع' },
  { key: 'posting_date', header: 'التاريخ' },
];

export default function CreditsPage() {
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState('');
  const [amount, setAmount] = useState(0);
  const [pack, setPack] = useState('STD');
  const { company } = useDefaultCompanyName();
  const list = useDocList<Row>('Payment Entry', {
    fields: ['name', 'party_name', 'paid_amount', 'reference_no', 'posting_date'],
    filters: [['payment_type', '=', 'Receive'], ['party_type', '=', 'Customer']],
    limit: 400,
    order_by: 'posting_date desc',
  });
  const createMut = useCreateDoc('Payment Entry');

  const totalCredits = useMemo(() => (list.data || []).reduce((sum, x) => sum + Number(x.paid_amount || 0), 0), [list.data]);

  const create = () => {
    if (!company || !customer || amount <= 0) return toast.error('اكمل البيانات');
    const payload = {
      doctype: 'Payment Entry',
      payment_type: 'Receive',
      party_type: 'Customer',
      party: customer,
      party_name: customer,
      company,
      paid_amount: amount,
      received_amount: amount,
      reference_no: `CREDIT-${pack}`,
      reference_date: new Date().toISOString().slice(0, 10),
    };
    createMut.mutate(prepareFrappeDocForCreate(payload), {
      onSuccess: () => { toast.success('تم شحن الرصيد'); setOpen(false); },
      onError: () => toast.error('فشل شحن الرصيد'),
    });
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="النقاط والأرصدة"
        description="شحن واستهلاك أرصدة العملاء عبر قيود الاستلام"
        iconify="solar:wallet-money-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'CRM', href: '/crm' }, { label: 'الأرصدة' }]}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />شحن رصيد</Button></DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>شحن رصيد عميل</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div><Label className="text-xs">العميل</Label><ErpLinkCombobox doctype="Customer" value={customer} onChange={setCustomer} displayKey="customer_name" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">القيمة</Label><Input type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value || 0))} /></div>
                  <div><Label className="text-xs">الباقة</Label><Input value={pack} onChange={(e) => setPack(e.target.value)} /></div>
                </div>
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
