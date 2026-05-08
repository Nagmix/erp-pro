'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart3, Plus } from 'lucide-react';
import { useCreateDoc, useDocList } from '@/lib/client/hooks';
import { buildSubscriptionCreate, buildSubscriptionPlanCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { toast } from 'sonner';

type Plan = { name: string; plan_name?: string; cost?: number; currency?: string };
type Sub = { name: string; party?: string; status?: string; start_date?: string };
const planCols: Column<Plan>[] = [{ key: 'plan_name', header: 'الباقة' }, { key: 'cost', header: 'السعر' }, { key: 'currency', header: 'العملة' }];
const subCols: Column<Sub>[] = [{ key: 'name', header: 'الرقم' }, { key: 'party', header: 'العميل' }, { key: 'status', header: 'الحالة' }, { key: 'start_date', header: 'البداية' }];

export default function CrmSubscriptionsPage() {
  const [tab, setTab] = useState('plans');
  const [openPlan, setOpenPlan] = useState(false);
  const [openSub, setOpenSub] = useState(false);
  const [planName, setPlanName] = useState('');
  const [cost, setCost] = useState<number>(0);
  const [currency, setCurrency] = useState('YER');
  const [customer, setCustomer] = useState('');
  const [plan, setPlan] = useState('');

  const plans = useDocList<Plan>('Subscription Plan', { fields: ['name', 'plan_name', 'cost', 'currency'], limit: 200 });
  const subs = useDocList<Sub>('Subscription', { fields: ['name', 'party', 'status', 'start_date'], limit: 300, order_by: 'modified desc' });
  const createPlan = useCreateDoc('Subscription Plan');
  const createSub = useCreateDoc('Subscription');

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="الاشتراكات والعضويات"
        description="إدارة الباقات والاشتراكات وربط دورة الفوترة الدورية"
        iconify="solar:card-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'CRM', href: '/crm' }, { label: 'الاشتراكات' }]}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href="/reports?openReport=crm-subscriptions-installments">
                <BarChart3 className="h-3.5 w-3.5" />
                تقرير مدفوعات / أقساط
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href="/reports?openReport=crm-rental-installments">
                <BarChart3 className="h-3.5 w-3.5" />
                أقساط عقود إيجار
              </Link>
            </Button>
            <Dialog open={openPlan} onOpenChange={setOpenPlan}>
              <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-3.5 w-3.5" />باقة</Button></DialogTrigger>
              <DialogContent dir="rtl"><DialogHeader><DialogTitle>إضافة باقة</DialogTitle></DialogHeader>
                <div className="space-y-3 py-2">
                  <div><Label className="text-xs">اسم الباقة</Label><Input value={planName} onChange={(e) => setPlanName(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-2"><div><Label className="text-xs">السعر</Label><Input type="number" value={cost || ''} onChange={(e) => setCost(Number(e.target.value || 0))} /></div><div><Label className="text-xs">العملة</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value)} /></div></div>
                  <Button className="w-full" onClick={() => createPlan.mutate(prepareFrappeDocForCreate(buildSubscriptionPlanCreate({ plan_name: planName, cost, currency })), { onSuccess: () => { toast.success('تم إنشاء الباقة'); setOpenPlan(false); }, onError: () => toast.error('فشل') })}>حفظ</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={openSub} onOpenChange={setOpenSub}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />اشتراك</Button></DialogTrigger>
              <DialogContent dir="rtl"><DialogHeader><DialogTitle>إنشاء اشتراك عميل</DialogTitle></DialogHeader>
                <div className="space-y-3 py-2">
                  <div><Label className="text-xs">العميل</Label><ErpLinkCombobox doctype="Customer" value={customer} onChange={setCustomer} displayKey="customer_name" /></div>
                  <div><Label className="text-xs">الباقة</Label><ErpLinkCombobox doctype="Subscription Plan" value={plan} onChange={setPlan} displayKey="plan_name" /></div>
                  <Button className="w-full" onClick={() => createSub.mutate(prepareFrappeDocForCreate(buildSubscriptionCreate({ party_type: 'Customer', party: customer, plan })), { onSuccess: () => { toast.success('تم إنشاء الاشتراك'); setOpenSub(false); }, onError: () => toast.error('فشل') })}>حفظ</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />
      <Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="plans">الباقات</TabsTrigger><TabsTrigger value="subs">الاشتراكات</TabsTrigger></TabsList></Tabs>
      {tab === 'plans' && <>
        <ListQueryAlert error={plans.isError ? plans.error : null} onRetry={() => plans.refetch()} />
        <DataTable data={plans.data || []} columns={planCols} searchable loading={plans.isLoading} />
      </>}
      {tab === 'subs' && <>
        <ListQueryAlert error={subs.isError ? subs.error : null} onRetry={() => subs.refetch()} />
        <DataTable data={subs.data || []} columns={subCols} searchable loading={subs.isLoading} />
      </>}
    </div>
  );
}
