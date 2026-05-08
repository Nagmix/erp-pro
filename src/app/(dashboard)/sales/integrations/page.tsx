'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useDocList } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { formatDate, formatCurrency } from '@/lib/core/helpers';
import { Truck, Percent, Gift, CalendarClock, Sparkles, Users } from 'lucide-react';
import { PageHeader, PageShell } from '@/components/erp/page-header';

type GenericRow = Record<string, string | number | null | undefined>;

const termsCols: Column<GenericRow>[] = [
  { key: 'name', header: 'قالب / اسم', sortable: true, filterable: true, render: (v) => String(v) },
  { key: 'modified', header: 'آخر تعديل', render: (v) => (v != null && v !== '' ? formatDate(String(v)) : '—') },
];

const subscriptionCols: Column<GenericRow>[] = [
  { key: 'name', header: 'رقم/اسم', sortable: true, filterable: true, render: (v) => String(v) },
  { key: 'status', header: 'الحالة', filterable: true, render: (v) => String(v ?? '—') },
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
];

const shipCols: Column<GenericRow>[] = [
  { key: 'name', header: 'سعر/قاعدة', sortable: true, filterable: true, render: (v) => String(v) },
  { key: 'disabled', header: 'معطّل', width: 'w-20', render: (v) => (v === 1 || v === '1' ? 'نعم' : 'لا') },
];

const spCols: Column<GenericRow>[] = [
  { key: 'name', header: 'مندوب مبيعات', sortable: true, filterable: true, render: (v) => String(v) },
  { key: 'enabled', header: 'فعّال', width: 'w-20', render: (v) => (v === 1 || v === '1' || v === true ? 'نعم' : 'لا') },
];

const teamCols: Column<GenericRow>[] = [
  { key: 'name', header: 'فريق المبيعات', sortable: true, filterable: true, render: (v) => String(v) },
];

const loyaltyCols: Column<GenericRow>[] = [
  { key: 'name', header: 'برنامج', sortable: true, filterable: true, render: (v) => String(v) },
];

export default function SalesIntegrationsPage() {
  const pTerms = useDocList<GenericRow>('Payment Terms Template', { fields: ['name', 'modified'], limit: 200 });
  const sub = useDocList<GenericRow>('Subscription', { fields: ['name', 'status'], limit: 200 });
  const plans = useDocList<GenericRow>('Subscription Plan', {
    fields: ['name', 'plan_name', 'cost', 'currency'],
    limit: 200,
    order_by: 'modified desc',
  });
  const ship = useDocList<GenericRow>('Shipping Rule', { fields: ['name', 'disabled'], limit: 200, order_by: 'name' });
  const sp = useDocList<GenericRow>('Sales Person', { fields: ['name', 'enabled'], limit: 200 });
  const teams = useDocList<GenericRow>('Sales Team', { fields: ['name'], limit: 200, order_by: 'name' });
  const loy = useDocList<GenericRow>('Loyalty Program', { fields: ['name'], limit: 200 });

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

  return (
    <div className="erp-page-enter space-y-6 max-w-6xl" dir="rtl">
      <ListQueryAlert error={firstError} onRetry={onRetry} />
      <PageHeader
        title="تكاملات وإعدادات المبيعات"
        description="عرض وإدارة كيانات التقسيط والعمولات والولاء والشحن من واجهة موحدة"
        iconify="solar:settings-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المبيعات', href: '/sales' }, { label: 'التكاملات' }]}
      />

      <PageShell className="space-y-4" padded={false}>
        <div className="px-4 pt-4">
          <Tabs defaultValue="install" className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/35">
              <TabsTrigger value="install" className="text-xs">
                4.4 تقسيط واشتراكات
              </TabsTrigger>
              <TabsTrigger value="comm" className="text-xs">
                4.5 عمولات
              </TabsTrigger>
              <TabsTrigger value="loy" className="text-xs">
                4.6 ولاء
              </TabsTrigger>
              <TabsTrigger value="ship" className="text-xs">
                4.7 شحن
              </TabsTrigger>
            </TabsList>

            <TabsContent value="install" className="pt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between space-y-0">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  4.4 التقسيط وشروط الدفع والاشتراكات
                </CardTitle>
                <CardDescription>
                  إدارة قوالب <strong>شروط الدفع</strong> للأقساط وآجال السداد، مع متابعة <strong>الاشتراكات</strong> و<strong>باقات الاشتراك</strong>.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" asChild>
                <Link href="/crm/subscriptions">إدارة الباقات في CRM</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-xs font-semibold mb-2">قوالب شروط الدفع</h3>
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
                <h3 className="text-xs font-semibold mb-2">باقات الاشتراك (Subscription Plan)</h3>
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
                <h3 className="text-xs font-semibold mb-2">اشتراكات نشطة (Subscription)</h3>
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
                4.5 عمولات المبيعات
              </CardTitle>
              <CardDescription>
                إدارة مندوبي وفرق المبيعات ومتابعة قواعد العمولة والاحتساب على الفواتير.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  فرق المبيعات (Sales Team)
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
                <h3 className="text-xs font-semibold mb-2">مندوبو المبيعات (Sales Person)</h3>
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
                4.6 نقاط الولاء
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
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                4.7 الشحن وCOD
              </CardTitle>
              <CardDescription>
                قواعد الشحن (Shipping Rule). الدفع عند الاستلام (COD) يُضبط عادةً كوسيلة دفع وشرط تسليم في أمر البيع/المخزون.
              </CardDescription>
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
    </div>
  );
}
