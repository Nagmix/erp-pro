'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { StatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  Plus,
  CreditCard,
  Layers,
  TrendingUp,
  Calendar,
  Filter,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useCreateDoc, useDocList, useUpdateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import {
  buildSubscriptionCreate,
  buildSubscriptionPlanCreate,
  prepareFrappeDocForCreate,
} from '@/lib/erp/erpnext-payloads';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { toast } from 'sonner';

/* ── Types ── */
type Plan = {
  name: string;
  plan_name?: string;
  cost?: number;
  currency?: string;
  billing_interval?: string;
  billing_interval_count?: number;
};

type Sub = {
  name: string;
  party?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  current_invoice_start?: string;
  current_invoice_end?: string;
  plan?: string;
  currency?: string;
};

/* ── Status helpers ── */
const SUB_STATUS_AR: Record<string, string> = {
  Active: 'نشط',
  Completed: 'مكتمل',
  Cancelled: 'ملغي',
  Trial: 'تجريبي',
  Unpaid: 'غير مدفوع',
  'Past Due Date': 'متأخر',
  Paused: 'متوقف مؤقتاً',
};

function SubStatusBadge({ status }: { status: string }) {
  const mapped = SUB_STATUS_AR[status];
  if (mapped) return <StatusBadge status={status} />;
  return (
    <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 border-0 bg-muted">
      {status || '—'}
    </Badge>
  );
}

/* ── Subscription period badge ── */
function PeriodBadge({ start, end }: { start?: string; end?: string }) {
  if (!start && !end) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="text-xs text-muted-foreground" dir="ltr">
      {formatDate(start || '')} — {formatDate(end || '')}
    </span>
  );
}

/* ── Column Definitions ── */
const planCols: Column<Plan>[] = [
  {
    key: 'plan_name',
    header: 'الباقة',
    render: (v) => <span className="text-xs font-semibold">{String(v || '—')}</span>,
  },
  {
    key: 'cost',
    header: 'السعر',
    render: (v, row) => (
      <span className="tabular-nums text-xs font-medium">
        {formatCurrency(Number(v) || 0, (row as Plan).currency || 'YER')}
      </span>
    ),
  },
  {
    key: 'currency',
    header: 'العملة',
    render: (v) => <Badge variant="outline" className="text-[10px] border-0 bg-muted">{String(v || '—')}</Badge>,
  },
  {
    key: 'billing_interval',
    header: 'دورة الفوترة',
    render: (v, row) => {
      const interval = String(v || 'Month');
      const count = Number((row as Plan).billing_interval_count) || 1;
      const intervalAr: Record<string, string> = { Day: 'يوم', Week: 'أسبوع', Month: 'شهر', Year: 'سنة' };
      return (
        <span className="text-xs">
          كل {count > 1 ? count : ''} {intervalAr[interval] || interval}
        </span>
      );
    },
  },
];

const subCols: Column<Sub>[] = [
  {
    key: 'name',
    header: 'رقم الاشتراك',
    render: (v) => <span className="text-xs font-medium text-primary">{String(v)}</span>,
  },
  {
    key: 'party',
    header: 'العميل',
    render: (v) => <span className="text-xs font-medium">{String(v || '—')}</span>,
  },
  {
    key: 'plan',
    header: 'الباقة',
    render: (v) => <span className="text-xs">{String(v || '—')}</span>,
  },
  {
    key: 'start_date',
    header: 'تاريخ البداية',
    render: (v) => <span className="text-xs">{formatDate(String(v))}</span>,
  },
  {
    key: 'end_date',
    header: 'تاريخ النهاية',
    render: (v) => <span className="text-xs">{formatDate(String(v))}</span>,
  },
  {
    key: 'current_invoice_start',
    header: 'بداية الفاتورة الحالية',
    render: (v) => <span className="text-xs">{v ? formatDate(String(v)) : '—'}</span>,
  },
  {
    key: 'current_invoice_end',
    header: 'نهاية الفاتورة الحالية',
    render: (v) => <span className="text-xs">{v ? formatDate(String(v)) : '—'}</span>,
  },
  {
    key: 'status',
    header: 'الحالة',
    render: (v) => <SubStatusBadge status={String(v || '')} />,
  },
];

/* ── Filter bar ── */
function FilterBar({
  statusFilter,
  setStatusFilter,
  customerFilter,
  setCustomerFilter,
}: {
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  customerFilter: string;
  setCustomerFilter: (v: string) => void;
}) {
  const statusOptions = [
    { value: '', label: 'الكل' },
    { value: 'Active', label: 'نشط' },
    { value: 'Completed', label: 'مكتمل' },
    { value: 'Cancelled', label: 'ملغي' },
    { value: 'Trial', label: 'تجريبي' },
    { value: 'Past Due Date', label: 'متأخر' },
    { value: 'Paused', label: 'متوقف' },
  ];

  return (
    <Card className="border-border/50">
      <CardContent className="p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">تصفية</span>
          </div>
          <div className="w-40">
            <Label className="text-xs mb-1 block">الحالة</Label>
            <Select value={statusFilter || '_all'} onValueChange={(v) => setStatusFilter(v === '_all' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((o) => (
                  <SelectItem key={o.value || '_all'} value={o.value || '_all'}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-56">
            <Label className="text-xs mb-1 block">العميل</Label>
            <ErpLinkCombobox
              doctype="Customer"
              value={customerFilter}
              onChange={setCustomerFilter}
              displayKey="customer_name"
              placeholder="كل العملاء"
            />
          </div>
          {(statusFilter || customerFilter) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => { setStatusFilter(''); setCustomerFilter(''); }}
            >
              مسح الفلاتر
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Main Page ── */
export default function CrmSubscriptionsPage() {
  const { company } = useDefaultCompanyName();
  const [tab, setTab] = useState('subscriptions');
  const [openPlan, setOpenPlan] = useState(false);
  const [openSub, setOpenSub] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');

  /* Plan edit/delete state */
  const [editPlanDialogOpen, setEditPlanDialogOpen] = useState(false);
  const [planEditing, setPlanEditing] = useState<Plan | null>(null);
  const [deletePlanDialogOpen, setDeletePlanDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [editPlanName, setEditPlanName] = useState('');
  const [editPlanCost, setEditPlanCost] = useState<string>('');
  const [editPlanCurrency, setEditPlanCurrency] = useState('YER');
  const [editPlanInterval, setEditPlanInterval] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Month');
  const [editPlanIntervalCount, setEditPlanIntervalCount] = useState<number>(1);

  /* Subscription edit/delete state */
  const [editSubDialogOpen, setEditSubDialogOpen] = useState(false);
  const [subEditing, setSubEditing] = useState<Sub | null>(null);
  const [deleteSubDialogOpen, setDeleteSubDialogOpen] = useState(false);
  const [subToDelete, setSubToDelete] = useState<Sub | null>(null);
  const [editSubStatus, setEditSubStatus] = useState('');
  const [editSubEndDate, setEditSubEndDate] = useState('');

  /* Plan form state */
  const [planName, setPlanName] = useState('');
  const [cost, setCost] = useState<string>('');
  const [currency, setCurrency] = useState('YER');
  const [billingInterval, setBillingInterval] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Month');
  const [billingIntervalCount, setBillingIntervalCount] = useState<number>(1);

  /* Subscription form state */
  const [subCustomer, setSubCustomer] = useState('');
  const [subPlan, setSubPlan] = useState('');
  const [subStartDate, setSubStartDate] = useState('');

  /* Data queries */
  const plans = useDocList<Plan>('Subscription Plan', {
    fields: ['name', 'plan_name', 'cost', 'currency', 'billing_interval', 'billing_interval_count'],
    limit: 200,
  });

  const subs = useDocList<Sub>('Subscription', {
    fields: ['name', 'party', 'status', 'start_date', 'end_date', 'current_invoice_start', 'current_invoice_end', 'plan', 'currency'],
    limit: 500,
    order_by: 'modified desc',
    filters: company ? [['company', '=', company]] : undefined,
  });

  const createPlan = useCreateDoc('Subscription Plan');
  const createSub = useCreateDoc('Subscription');
  const updatePlan = useUpdateDoc('Subscription Plan');
  const deletePlan = useDeleteDoc('Subscription Plan');
  const updateSub = useUpdateDoc('Subscription');
  const deleteSub = useDeleteDoc('Subscription');

  /* Filtered subscriptions */
  const filteredSubs = useMemo(() => {
    const data = subs.data || [];
    return data.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (customerFilter && s.party !== customerFilter) return false;
      return true;
    });
  }, [subs.data, statusFilter, customerFilter]);

  /* KPI calculations */
  const activeSubs = useMemo(
    () => (subs.data || []).filter((s) => s.status === 'Active').length,
    [subs.data],
  );

  const totalPlans = (plans.data || []).length;

  const totalRevenue = useMemo(
    () =>
      (plans.data || []).reduce((sum, p) => {
        if (p.currency === 'YER' || !p.currency) return sum + (Number(p.cost) || 0);
        return sum;
      }, 0),
    [plans.data],
  );

  /* Handlers */
  const openPlanEditDialog = (plan: Plan) => {
    setPlanEditing(plan);
    setEditPlanName(plan.plan_name || '');
    setEditPlanCost(String(plan.cost ?? ''));
    setEditPlanCurrency(plan.currency || 'YER');
    setEditPlanInterval((plan.billing_interval as 'Day' | 'Week' | 'Month' | 'Year') || 'Month');
    setEditPlanIntervalCount(plan.billing_interval_count || 1);
    setEditPlanDialogOpen(true);
  };

  const handleUpdatePlan = () => {
    if (!planEditing) return;
    updatePlan.mutate(
      { name: planEditing.name, doc: { plan_name: editPlanName, cost: Number(editPlanCost) || 0, currency: editPlanCurrency, billing_interval: editPlanInterval, billing_interval_count: editPlanIntervalCount } },
      {
        onSuccess: () => { toast.success('تم تحديث الباقة'); setEditPlanDialogOpen(false); setPlanEditing(null); },
        onError: () => toast.error('فشل تحديث الباقة'),
      },
    );
  };

  const handleDeletePlan = () => {
    if (!planToDelete) return;
    deletePlan.mutate(planToDelete.name, {
      onSuccess: () => { toast.success('تم حذف الباقة'); setDeletePlanDialogOpen(false); setPlanToDelete(null); },
      onError: () => toast.error('فشل حذف الباقة'),
    });
  };

  const openSubEditDialog = (sub: Sub) => {
    setSubEditing(sub);
    setEditSubStatus(sub.status || '');
    setEditSubEndDate(sub.end_date || '');
    setEditSubDialogOpen(true);
  };

  const handleUpdateSub = () => {
    if (!subEditing) return;
    updateSub.mutate(
      { name: subEditing.name, doc: { status: editSubStatus, end_date: editSubEndDate || undefined } },
      {
        onSuccess: () => { toast.success('تم تحديث الاشتراك'); setEditSubDialogOpen(false); setSubEditing(null); },
        onError: () => toast.error('فشل تحديث الاشتراك'),
      },
    );
  };

  const handleDeleteSub = () => {
    if (!subToDelete) return;
    deleteSub.mutate(subToDelete.name, {
      onSuccess: () => { toast.success('تم حذف الاشتراك'); setDeleteSubDialogOpen(false); setSubToDelete(null); },
      onError: () => toast.error('فشل حذف الاشتراك'),
    });
  };

  const handleCreatePlan = () => {
    if (!planName.trim()) { toast.error('أدخل اسم الباقة'); return; }
    if (!cost || Number(cost) <= 0) { toast.error('أدخل سعراً صحيحاً'); return; }
    createPlan.mutate(
      prepareFrappeDocForCreate(
        buildSubscriptionPlanCreate({
          plan_name: planName,
          cost: Number(cost),
          currency,
          billing_interval: billingInterval,
          billing_interval_count: billingIntervalCount,
        }),
      ),
      {
        onSuccess: () => {
          toast.success('تم إنشاء الباقة بنجاح');
          setOpenPlan(false);
          setPlanName('');
          setCost('');
          setCurrency('YER');
          setBillingInterval('Month');
          setBillingIntervalCount(1);
        },
        onError: () => toast.error('فشل إنشاء الباقة'),
      },
    );
  };

  const handleCreateSub = () => {
    if (!subCustomer) { toast.error('اختر العميل'); return; }
    if (!subPlan) { toast.error('اختر الباقة'); return; }
    createSub.mutate(
      prepareFrappeDocForCreate(
        buildSubscriptionCreate({
          party_type: 'Customer',
          party: subCustomer,
          plan: subPlan,
          start_date: subStartDate || undefined,
        }),
      ),
      {
        onSuccess: () => {
          toast.success('تم إنشاء الاشتراك بنجاح');
          setOpenSub(false);
          setSubCustomer('');
          setSubPlan('');
          setSubStartDate('');
        },
        onError: () => toast.error('فشل إنشاء الاشتراك'),
      },
    );
  };

  const resetPlanForm = () => {
    setPlanName('');
    setCost('');
    setCurrency('YER');
    setBillingInterval('Month');
    setBillingIntervalCount(1);
  };

  const resetSubForm = () => {
    setSubCustomer('');
    setSubPlan('');
    setSubStartDate('');
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="الاشتراكات والعضويات"
        description="إدارة الباقات والاشتراكات وربط دورة الفوترة الدورية — متابعة الاشتراكات النشطة والمنتهية وتاريخ الفوترة"
        iconify="solar:card-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'إدارة العملاء', href: '/crm' }, { label: 'الاشتراكات' }]}
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

            {/* Plan dialog */}
            <Dialog open={openPlan} onOpenChange={(v) => { setOpenPlan(v); if (!v) resetPlanForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  باقة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
                <DialogHeader className="pb-4">
                  <DialogTitle className="flex items-center gap-3 text-lg font-bold">
                    <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <span>إضافة باقة اشتراك</span>
                      <p className="text-xs font-normal text-muted-foreground mt-0.5">حدد اسم الباقة والسعر ودورة الفوترة</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">اسم الباقة <span className="text-destructive text-xs">*</span></Label>
                    <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="مثال: باقة شهرية برو" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">السعر <span className="text-destructive text-xs">*</span></Label>
                      <Input type="number" dir="ltr" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">العملة</Label>
                      <ErpLinkCombobox doctype="Currency" value={currency} onChange={setCurrency} placeholder="اختر العملة" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">دورة الفوترة</Label>
                      <Select value={billingInterval} onValueChange={(v) => setBillingInterval(v as typeof billingInterval)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Day">يومي</SelectItem>
                          <SelectItem value="Week">أسبوعي</SelectItem>
                          <SelectItem value="Month">شهري</SelectItem>
                          <SelectItem value="Year">سنوي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">كل (عدد)</Label>
                      <Input
                        type="number"
                        dir="ltr"
                        min={1}
                        value={billingIntervalCount}
                        onChange={(e) => setBillingIntervalCount(Math.max(1, Number(e.target.value || 1)))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
                    <Button type="button" variant="ghost" onClick={() => setOpenPlan(false)} className="text-muted-foreground">إلغاء</Button>
                    <Button onClick={handleCreatePlan} disabled={createPlan.isPending} className="gap-1.5 min-w-[120px]">
                      {createPlan.isPending ? 'جاري الحفظ...' : 'حفظ الباقة'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Subscription dialog */}
            <Dialog open={openSub} onOpenChange={(v) => { setOpenSub(v); if (!v) resetSubForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  اشتراك جديد
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
                <DialogHeader className="pb-4">
                  <DialogTitle className="flex items-center gap-3 text-lg font-bold">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <span>إنشاء اشتراك عميل</span>
                      <p className="text-xs font-normal text-muted-foreground mt-0.5">اختر العميل والباقة وتاريخ البداية</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">العميل <span className="text-destructive text-xs">*</span></Label>
                    <ErpLinkCombobox doctype="Customer" value={subCustomer} onChange={setSubCustomer} displayKey="customer_name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الباقة <span className="text-destructive text-xs">*</span></Label>
                    <ErpLinkCombobox doctype="Subscription Plan" value={subPlan} onChange={setSubPlan} displayKey="plan_name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">تاريخ البداية</Label>
                    <Input
                      type="date"
                      dir="ltr"
                      value={subStartDate}
                      onChange={(e) => setSubStartDate(e.target.value)}
                    />
                    {!subStartDate && (
                      <p className="text-xs text-muted-foreground">سيتم استخدام تاريخ اليوم إذا لم تحدد تاريخاً</p>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
                    <Button type="button" variant="ghost" onClick={() => setOpenSub(false)} className="text-muted-foreground">إلغاء</Button>
                    <Button onClick={handleCreateSub} disabled={createSub.isPending} className="gap-1.5 min-w-[120px]">
                      {createSub.isPending ? 'جاري الحفظ...' : 'إنشاء الاشتراك'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* KPI Cards */}
      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="subscriptions" className="gap-1.5 text-xs">
            <CreditCard className="h-3.5 w-3.5" />
            الاشتراكات ({filteredSubs.length})
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" />
            الباقات ({(plans.data || []).length})
          </TabsTrigger>
        </TabsList>

        {/* Subscriptions tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <FilterBar
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            customerFilter={customerFilter}
            setCustomerFilter={setCustomerFilter}
          />
          <ListQueryAlert error={subs.isError ? subs.error : null} onRetry={() => subs.refetch()} />
          <DataTable
            data={filteredSubs}
            columns={subCols}
            searchable
            loading={subs.isLoading}
            onEdit={(row) => openSubEditDialog(row)}
            onDelete={(row) => { setSubToDelete(row); setDeleteSubDialogOpen(true); }}
            tableId="crm-subscriptions-list"
            exportFileName="الاشتراكات"
          />

          {/* Summary card when filters active */}
          {(statusFilter || customerFilter) && (
            <Card className="border-border/40 bg-muted/20">
              <CardContent className="p-3 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  عرض <b className="text-foreground">{filteredSubs.length}</b> من أصل <b className="text-foreground">{(subs.data || []).length}</b> اشتراك
                </span>
                {statusFilter && (
                  <Badge variant="outline" className="text-[10px] border-0 bg-info/10 text-info ms-2">
                    {SUB_STATUS_AR[statusFilter] || statusFilter}
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Plans tab */}
        <TabsContent value="plans" className="space-y-4">
          <ListQueryAlert error={plans.isError ? plans.error : null} onRetry={() => plans.refetch()} />
          <DataTable
            data={plans.data || []}
            columns={planCols}
            searchable
            loading={plans.isLoading}
            onEdit={(row) => openPlanEditDialog(row)}
            onDelete={(row) => { setPlanToDelete(row); setDeletePlanDialogOpen(true); }}
            tableId="crm-subscription-plans"
            exportFileName="باقات_الاشتراك"
          />
        </TabsContent>
      </Tabs>

      {/* ─── Edit Plan Dialog ─── */}
      <Dialog open={editPlanDialogOpen} onOpenChange={setEditPlanDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <span>تعديل الباقة</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">{planEditing?.plan_name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">اسم الباقة</Label>
              <Input value={editPlanName} onChange={(e) => setEditPlanName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">السعر</Label>
                <Input type="number" dir="ltr" value={editPlanCost} onChange={(e) => setEditPlanCost(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">العملة</Label>
                <ErpLinkCombobox doctype="Currency" value={editPlanCurrency} onChange={setEditPlanCurrency} placeholder="اختر العملة" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">دورة الفوترة</Label>
                <Select value={editPlanInterval} onValueChange={(v) => setEditPlanInterval(v as typeof editPlanInterval)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Day">يومي</SelectItem>
                    <SelectItem value="Week">أسبوعي</SelectItem>
                    <SelectItem value="Month">شهري</SelectItem>
                    <SelectItem value="Year">سنوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">كل (عدد)</Label>
                <Input type="number" dir="ltr" min={1} value={editPlanIntervalCount} onChange={(e) => setEditPlanIntervalCount(Math.max(1, Number(e.target.value || 1)))} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setEditPlanDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleUpdatePlan} disabled={updatePlan.isPending} className="gap-1.5 min-w-[120px]">
              {updatePlan.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Plan Confirmation ─── */}
      <Dialog open={deletePlanDialogOpen} onOpenChange={setDeletePlanDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle>تأكيد حذف الباقة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف الباقة &quot;{planToDelete?.plan_name}&quot;؟</p>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setDeletePlanDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleDeletePlan} disabled={deletePlan.isPending} variant="destructive" className="gap-1.5 min-w-[100px]">
              {deletePlan.isPending ? 'جاري الحذف...' : 'حذف'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Subscription Dialog ─── */}
      <Dialog open={editSubDialogOpen} onOpenChange={setEditSubDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <span>تعديل الاشتراك</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">{subEditing?.name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الحالة</Label>
              <Select value={editSubStatus} onValueChange={setEditSubStatus}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">نشط</SelectItem>
                  <SelectItem value="Completed">مكتمل</SelectItem>
                  <SelectItem value="Cancelled">ملغي</SelectItem>
                  <SelectItem value="Trial">تجريبي</SelectItem>
                  <SelectItem value="Unpaid">غير مدفوع</SelectItem>
                  <SelectItem value="Past Due Date">متأخر</SelectItem>
                  <SelectItem value="Paused">متوقف مؤقتاً</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">تاريخ النهاية</Label>
              <Input type="date" dir="ltr" value={editSubEndDate} onChange={(e) => setEditSubEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setEditSubDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleUpdateSub} disabled={updateSub.isPending} className="gap-1.5 min-w-[120px]">
              {updateSub.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Subscription Confirmation ─── */}
      <Dialog open={deleteSubDialogOpen} onOpenChange={setDeleteSubDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle>تأكيد حذف الاشتراك</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف الاشتراك &quot;{subToDelete?.name}&quot;؟</p>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setDeleteSubDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleDeleteSub} disabled={deleteSub.isPending} variant="destructive" className="gap-1.5 min-w-[100px]">
              {deleteSub.isPending ? 'جاري الحذف...' : 'حذف'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
