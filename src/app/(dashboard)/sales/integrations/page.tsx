'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDocList, useCreateDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { formatDate, formatCurrency } from '@/lib/core/helpers';
import { toast } from 'sonner';
import { Truck, Percent, Gift, CalendarClock, Sparkles, Users, RefreshCw, Plus, CreditCard, Package, Tag } from 'lucide-react';
import { PageHeader, PageShell, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';

type GenericRow = Record<string, string | number | boolean | null | undefined>;

const termsCols: Column<GenericRow>[] = [
  { key: 'name', header: 'قالب / اسم', sortable: true, filterable: true, render: (v) => String(v) },
  { key: 'modified', header: 'آخر تعديل', render: (v) => (v != null && v !== '' ? formatDate(String(v)) : '—') },
];

const subscriptionCols: Column<GenericRow>[] = [
  { key: 'name', header: 'رقم/اسم', sortable: true, filterable: true, render: (v) => String(v) },
  { key: 'status', header: 'الحالة', filterable: true, render: (v) => {
    const s = String(v ?? '—');
    const colorMap: Record<string, string> = {
      Active: 'text-primary bg-primary/10',
      Completed: 'text-chart-1 bg-chart-1/10',
      Cancelled: 'text-destructive bg-destructive/10',
      Trialing: 'text-chart-2 bg-chart-2/10',
    };
    return <span className={`text-xs px-2 py-0.5 rounded-md ${colorMap[s] || 'bg-muted text-muted-foreground'}`}>{s}</span>;
  }},
  { key: 'start_date', header: 'تاريخ البدء', render: (v) => (v ? formatDate(String(v)) : '—') },
  { key: 'end_date', header: 'تاريخ الانتهاء', render: (v) => (v ? formatDate(String(v)) : '—') },
];

const planCols: Column<GenericRow>[] = [
  { key: 'name', header: 'المعرّف', sortable: true, width: 'w-28', render: (v) => <span className="font-mono text-[10px]">{String(v)}</span> },
  { key: 'plan_name', header: 'اسم الباقة', sortable: true, filterable: true, render: (v) => String(v ?? '—') },
  {
    key: 'cost',
    header: 'التكلفة',
    sortable: true,
    render: (v, row) => {
      const cur = row.currency != null && row.currency !== '' ? String(row.currency) : 'YER';
      return <span className="tabular-nums">{formatCurrency(Number(v ?? 0), cur)}</span>;
    },
  },
  { key: 'billing_interval', header: 'فترة الفوترة', render: (v) => String(v ?? '—') },
];

const shipCols: Column<GenericRow>[] = [
  { key: 'name', header: 'سعر/قاعدة', sortable: true, filterable: true, render: (v) => String(v) },
  { key: 'shipping_rule_type', header: 'النوع', render: (v) => String(v ?? '—') },
  { key: 'disabled', header: 'معطّل', width: 'w-20', render: (v) => (v === 1 || v === '1' ? 'نعم' : 'لا') },
  { key: 'modified', header: 'آخر تعديل', render: (v) => (v != null && v !== '' ? formatDate(String(v)) : '—') },
];

const spCols: Column<GenericRow>[] = [
  { key: 'name', header: 'مندوب مبيعات', sortable: true, filterable: true, render: (v) => String(v) },
  { key: 'enabled', header: 'فعّال', width: 'w-20', render: (v) => (v === 1 || v === '1' || v === true ? 'نعم' : 'لا') },
  { key: 'commission_rate', header: 'نسبة العمولة', render: (v) => {
    const num = Number(v);
    return Number.isFinite(num) && num > 0 ? `${num}%` : '—';
  }},
];

const teamCols: Column<GenericRow>[] = [
  { key: 'name', header: 'فريق المبيعات', sortable: true, filterable: true, render: (v) => String(v) },
  { key: 'modified', header: 'آخر تعديل', render: (v) => (v != null && v !== '' ? formatDate(String(v)) : '—') },
];

const loyaltyCols: Column<GenericRow>[] = [
  { key: 'name', header: 'برنامج', sortable: true, filterable: true, render: (v) => String(v) },
  { key: 'loyalty_program_type', header: 'النوع', render: (v) => String(v ?? '—') },
  { key: 'auto_opt_in', header: 'تسجيل تلقائي', width: 'w-24', render: (v) => (v === 1 || v === '1' || v === true ? 'نعم' : 'لا') },
];

export default function SalesIntegrationsPage() {
  // ── Create Dialog States ──
  const [createDialogType, setCreateDialogType] = useState<'terms' | 'shipping' | null>(null);
  const [creating, setCreating] = useState(false);

  // Payment Terms Template form
  const [ptName, setPtName] = useState('');
  const [ptDueDate, setPtDueDate] = useState('');

  // Shipping Rule form
  const [srName, setSrName] = useState('');
  const [srType, setSrType] = useState('Selling');

  const pTerms = useDocList<GenericRow>('Payment Terms Template', { fields: ['name', 'modified'], limit: 200, order_by: 'modified desc' });
  const sub = useDocList<GenericRow>('Subscription', { fields: ['name', 'status', 'start_date', 'end_date'], limit: 200, order_by: 'modified desc' });
  const plans = useDocList<GenericRow>('Subscription Plan', {
    fields: ['name', 'plan_name', 'cost', 'currency', 'billing_interval'],
    limit: 200,
    order_by: 'modified desc',
  });
  const ship = useDocList<GenericRow>('Shipping Rule', { fields: ['name', 'shipping_rule_type', 'disabled', 'modified'], limit: 200, order_by: 'name' });
  const sp = useDocList<GenericRow>('Sales Person', { fields: ['name', 'enabled', 'commission_rate'], limit: 200 });
  const teams = useDocList<GenericRow>('Sales Team', { fields: ['name', 'modified'], limit: 200, order_by: 'name' });
  const loy = useDocList<GenericRow>('Loyalty Program', { fields: ['name', 'loyalty_program_type', 'auto_opt_in'], limit: 200 });

  const createPTMutation = useCreateDoc('Payment Terms Template');
  const createSRMutation = useCreateDoc('Shipping Rule');

  const firstError =
    [pTerms.error, sub.error, plans.error, ship.error, sp.error, teams.error, loy.error].find(Boolean) ?? null;

  const onRetry = () => {
    void pTerms.refetch();
    void sub.refetch();
    void plans.refetch();
    void ship.refetch();
    void sp.refetch();
    void teams.refetch();
    void loy.refetch();
  };

  const loading = useMemo(
    () =>
      pTerms.isLoading ||
      sub.isLoading ||
      plans.isLoading ||
      ship.isLoading ||
      sp.isLoading ||
      teams.isLoading ||
      loy.isLoading,
    [pTerms.isLoading, sub.isLoading, plans.isLoading, ship.isLoading, sp.isLoading, teams.isLoading, loy.isLoading]
  );

  // ── KPI counts ──
  const totalTerms = (pTerms.data || []).length;
  const totalSubs = (sub.data || []).length;
  const activeSubs = (sub.data || []).filter((r) => r.status === 'Active').length;
  const totalPlans = (plans.data || []).length;
  const totalShipRules = (ship.data || []).length;
  const totalSP = (sp.data || []).length;
  const totalTeams = (teams.data || []).length;
  const totalLoyalty = (loy.data || []).length;

  // ── Create Handlers ──
  const handleCreatePT = async () => {
    if (!ptName.trim()) {
      toast.error('يرجى إدخال اسم القالب');
      return;
    }
    setCreating(true);
    try {
      await createPTMutation.mutateAsync({
        template_name: ptName.trim(),
        terms: ptDueDate ? [{ payment_type: 'Basic', due_date_based_on: 'Day(s) after invoice date', credit_days: Number(ptDueDate) || 0 }] : [],
      });
      toast.success('تم إنشاء قالب شروط الدفع بنجاح');
      setCreateDialogType(null);
      setPtName('');
      setPtDueDate('');
      void pTerms.refetch();
    } catch (e) {
      toast.error('تعذر إنشاء قالب شروط الدفع', { description: String((e as Error).message || e) });
    } finally {
      setCreating(false);
    }
  };

  const handleCreateSR = async () => {
    if (!srName.trim()) {
      toast.error('يرجى إدخال اسم قاعدة الشحن');
      return;
    }
    setCreating(true);
    try {
      await createSRMutation.mutateAsync({
        shipping_rule_name: srName.trim(),
        shipping_rule_type: srType,
      });
      toast.success('تم إنشاء قاعدة الشحن بنجاح');
      setCreateDialogType(null);
      setSrName('');
      setSrType('Selling');
      void ship.refetch();
    } catch (e) {
      toast.error('تعذر إنشاء قاعدة الشحن', { description: String((e as Error).message || e) });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="erp-page-enter space-y-6 max-w-6xl" dir="rtl">
      <ListQueryAlert error={firstError} onRetry={onRetry} />

      <PageHeader
        title="تكاملات وإعدادات المبيعات"
        description="عرض وإدارة كيانات التقسيط والعمولات والولاء والشحن من واجهة موحدة"
        iconify="solar:settings-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المبيعات', href: '/sales' }, { label: 'التكاملات' }]}
        actions={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onRetry} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        }
      />

      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard
          title="قوالب شروط الدفع"
          value={totalTerms}
          icon={CreditCard}
          accent="primary"
          description="قوالب الدفع والأقساط"
        />
        <KpiCard
          title="اشتراكات نشطة"
          value={activeSubs}
          icon={CalendarClock}
          accent="success"
          description={`من أصل ${totalSubs} اشتراك`}
        />
        <KpiCard
          title="مندوبو المبيعات"
          value={totalSP}
          icon={Users}
          accent="info"
          description={`${totalTeams} فريق مبيعات`}
        />
        <KpiCard
          title="قواعد الشحن"
          value={totalShipRules}
          icon={Truck}
          accent="warning"
          description={`${totalLoyalty} برنامج ولاء`}
        />
      </KpiStrip>

      <PageShell className="space-y-4" padded={false}>
        <div className="px-4 pt-4">
          <Tabs defaultValue="install" className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/35">
              <TabsTrigger value="install" className="text-xs">
                <CalendarClock className="h-3.5 w-3.5 opacity-70" />
                تقسيط واشتراكات
              </TabsTrigger>
              <TabsTrigger value="comm" className="text-xs">
                <Percent className="h-3.5 w-3.5 opacity-70" />
                عمولات
              </TabsTrigger>
              <TabsTrigger value="loy" className="text-xs">
                <Gift className="h-3.5 w-3.5 opacity-70" />
                ولاء
              </TabsTrigger>
              <TabsTrigger value="ship" className="text-xs">
                <Truck className="h-3.5 w-3.5 opacity-70" />
                شحن
              </TabsTrigger>
            </TabsList>

            <TabsContent value="install" className="pt-4 space-y-4">
              <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" />
                      التقسيط وشروط الدفع والاشتراكات
                    </CardTitle>
                    <CardDescription>
                      إدارة قوالب <strong>شروط الدفع</strong> للأقساط وآجال السداد، مع متابعة <strong>الاشتراكات</strong> و<strong>باقات الاشتراك</strong>.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs shrink-0 gap-1" onClick={() => { setPtName(''); setPtDueDate(''); setCreateDialogType('terms'); }}>
                      <Plus className="h-3 w-3" /> قالب دفع جديد
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" asChild>
                      <Link href="/crm/subscriptions">إدارة الباقات في CRM</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold mb-2">قوالب شروط الدفع ({totalTerms})</h3>
                    <DataTable
                      data={pTerms.data || []}
                      columns={termsCols}
                      loading={pTerms.isLoading}
                      tableId="sales-int-payment-terms"
                      columnFilters
                      searchable
                      exportFileName="payment-terms-templates.csv"
                    />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold mb-2">باقات الاشتراك ({totalPlans})</h3>
                    <DataTable
                      data={plans.data || []}
                      columns={planCols}
                      loading={plans.isLoading}
                      tableId="sales-int-sub-plans"
                      columnFilters
                      searchable
                      exportFileName="subscription-plans.csv"
                    />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold mb-2">اشتراكات ({totalSubs})</h3>
                    <DataTable
                      data={sub.data || []}
                      columns={subscriptionCols}
                      loading={sub.isLoading}
                      tableId="sales-int-subscriptions"
                      columnFilters
                      searchable
                      exportFileName="subscriptions.csv"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comm" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    عمولات المبيعات
                  </CardTitle>
                  <CardDescription>
                    إدارة مندوبي وفرق المبيعات ومتابعة قواعد العمولة والاحتساب على الفواتير.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      فرق المبيعات ({totalTeams})
                    </h3>
                    <DataTable
                      data={teams.data || []}
                      columns={teamCols}
                      loading={teams.isLoading}
                      tableId="sales-int-sales-teams"
                      columnFilters
                      searchable
                      exportFileName="sales-teams.csv"
                    />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold mb-2">مندوبو المبيعات ({totalSP})</h3>
                    <DataTable
                      data={sp.data || []}
                      columns={spCols}
                      loading={sp.isLoading}
                      tableId="sales-int-sales-persons"
                      columnFilters
                      searchable
                      exportFileName="sales-persons.csv"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="loy" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    نقاط الولاء
                  </CardTitle>
                  <CardDescription>
                    برامج الولاء المعرفة في النظام مع متابعة آلية الكسب والاستبدال حسب إعدادات كل برنامج.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={loy.data || []}
                    columns={loyaltyCols}
                    loading={loy.isLoading}
                    tableId="sales-int-loyalty"
                    columnFilters
                    searchable
                    exportFileName="loyalty-programs.csv"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ship" className="pt-4">
              <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      الشحن وCOD
                    </CardTitle>
                    <CardDescription>
                      قواعد الشحن (Shipping Rule). الدفع عند الاستلام (COD) يُضبط عادةً كوسيلة دفع وشرط تسليم في أمر البيع/المخزون.
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs shrink-0 gap-1" onClick={() => { setSrName(''); setSrType('Selling'); setCreateDialogType('shipping'); }}>
                    <Plus className="h-3 w-3" /> قاعدة شحن جديدة
                  </Button>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={ship.data || []}
                    columns={shipCols}
                    loading={ship.isLoading}
                    tableId="sales-int-shipping"
                    columnFilters
                    searchable
                    exportFileName="shipping-rules.csv"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageShell>

      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Sparkles className="h-3 w-3" />
        تحميل مجمع: {loading ? 'جارٍ…' : 'مكتمل'}
      </p>

      {/* Create Payment Terms Template Dialog */}
      <Dialog open={createDialogType === 'terms'} onOpenChange={(open) => { if (!open) setCreateDialogType(null); }}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <span>قالب شروط دفع جديد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات قالب شروط الدفع</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">اسم القالب <span className="text-destructive text-xs">*</span></Label>
              <Input value={ptName} onChange={(e) => setPtName(e.target.value)} placeholder="مثال: دفع خلال 30 يوم" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">عدد أيام السداد</Label>
              <Input type="number" dir="ltr" min={0} value={ptDueDate} onChange={(e) => setPtDueDate(e.target.value)} placeholder="مثال: 30" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button variant="ghost" onClick={() => setCreateDialogType(null)} className="text-muted-foreground">إلغاء</Button>
            <Button disabled={creating} onClick={() => void handleCreatePT()} className="gap-1.5 min-w-[130px]">
              {creating ? 'جاري الحفظ...' : 'إنشاء القالب'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Shipping Rule Dialog */}
      <Dialog open={createDialogType === 'shipping'} onOpenChange={(open) => { if (!open) setCreateDialogType(null); }}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <span>قاعدة شحن جديدة</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات قاعدة الشحن</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">اسم القاعدة <span className="text-destructive text-xs">*</span></Label>
              <Input value={srName} onChange={(e) => setSrName(e.target.value)} placeholder="مثال: شحن مجاني فوق 500" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">النوع</Label>
              <Select value={srType} onValueChange={setSrType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Selling">بيع</SelectItem>
                  <SelectItem value="Buying">شراء</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button variant="ghost" onClick={() => setCreateDialogType(null)} className="text-muted-foreground">إلغاء</Button>
            <Button disabled={creating} onClick={() => void handleCreateSR()} className="gap-1.5 min-w-[130px]">
              {creating ? 'جاري الحفظ...' : 'إنشاء القاعدة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
