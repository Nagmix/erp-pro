'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useDocList } from '@/lib/client/hooks';
import { PageHeader } from '@/components/erp/page-header';
import { StatusBadge } from '@/components/erp/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatNumber } from '@/lib/core/helpers';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import {
  ShoppingCart,
  FileText,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowUpLeft,
  RotateCcw,
  BarChart3,
  Package,
  ClipboardList,
  Receipt,
  UserCircle,
  ChevronLeft,
  Clock,
  Target,
  CircleDollarSign,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Quick Actions                                                      */
/* ------------------------------------------------------------------ */
const QUICK_ACTIONS = [
  { label: 'عرض سعر جديد', href: '/sales/quotations?new=1', icon: FileText, color: 'bg-chart-1/10 text-chart-1' },
  { label: 'أمر بيع جديد', href: '/sales/sales-orders?new=1', icon: ClipboardList, color: 'bg-primary/10 text-primary' },
  { label: 'فاتورة مبيعات', href: '/sales/sales-invoices?new=1', icon: Receipt, color: 'bg-primary/10 text-primary' },
  { label: 'العملاء', href: '/sales/customers', icon: UserCircle, color: 'bg-chart-2/10 text-chart-2' },
];

/* ------------------------------------------------------------------ */
/*  Simple bar chart                                                   */
/* ------------------------------------------------------------------ */
function SimpleBarChart({ data, maxVal, colorClass }: {
  data: { label: string; value: number }[];
  maxVal: number;
  colorClass: string;
}) {
  const safeMax = Math.max(maxVal, 1);
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((item, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[9px] text-muted-foreground tabular-nums leading-none">
            {item.value > 0 ? formatCurrency(item.value).replace('ر.ي', '').trim() : '—'}
          </span>
          <div
            className={`w-full rounded-t-sm transition-all duration-300 ${colorClass}`}
            style={{ height: `${Math.max((item.value / safeMax) * 80, 2)}px` }}
          />
          <span className="text-[9px] text-muted-foreground leading-none">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pipeline Step                                                      */
/* ------------------------------------------------------------------ */
function PipelineStep({ label, count, color, isActive }: {
  label: string; count: number; color: string; isActive: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${color} ${isActive ? 'ring-2 ring-offset-2 ring-offset-background' : ''}`}>
        {count}
      </div>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function SalesDashboardPage() {
  const { company } = useDefaultCompanyName();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  /* ---------- Fetch data ---------- */
  const { data: salesInvoices = [], isLoading: siLoading } = useDocList<Record<string, unknown>>(
    'Sales Invoice',
    {
      fields: ['name', 'customer', 'customer_name', 'grand_total', 'outstanding_amount', 'posting_date', 'status', 'docstatus', 'due_date'],
      limit: 100,
      order_by: 'posting_date desc',
    }
  );

  const { data: salesOrders = [], isLoading: soLoading } = useDocList<Record<string, unknown>>(
    'Sales Order',
    {
      fields: ['name', 'customer', 'customer_name', 'grand_total', 'status', 'docstatus', 'transaction_date'],
      limit: 50,
      order_by: 'transaction_date desc',
    }
  );

  const { data: quotations = [], isLoading: qoLoading } = useDocList<Record<string, unknown>>(
    'Quotation',
    {
      fields: ['name', 'party_name', 'grand_total', 'status', 'docstatus', 'transaction_date'],
      limit: 50,
      order_by: 'transaction_date desc',
    }
  );

  const { data: deliveryNotes = [], isLoading: dnLoading } = useDocList<Record<string, unknown>>(
    'Delivery Note',
    {
      fields: ['name', 'customer', 'customer_name', 'grand_total', 'status', 'docstatus', 'posting_date'],
      limit: 50,
      order_by: 'posting_date desc',
    }
  );

  const { data: customers = [], isLoading: custLoading } = useDocList<Record<string, unknown>>(
    'Customer',
    {
      fields: ['name', 'customer_name', 'customer_group'],
      limit: 200,
    }
  );

  const isLoading = siLoading || soLoading || qoLoading || dnLoading || custLoading;

  /* ---------- KPI calculations ---------- */
  const totalSales = useMemo(
    () => salesInvoices
      .filter((inv) => String(inv.posting_date ?? '').startsWith(thisMonth) && Number(inv.docstatus) === 1)
      .reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0),
    [salesInvoices, thisMonth]
  );

  const avgOrderValue = useMemo(() => {
    const submitted = salesInvoices.filter((inv) => String(inv.posting_date ?? '').startsWith(thisMonth) && Number(inv.docstatus) === 1);
    return submitted.length > 0 ? totalSales / submitted.length : 0;
  }, [salesInvoices, thisMonth, totalSales]);

  const activeCustomers = useMemo(
    () => customers.filter((c) => c.customer_name).length,
    [customers]
  );

  const openOrders = useMemo(
    () => salesOrders.filter((so) => Number(so.docstatus) === 1 && ['To Deliver and Bill', 'To Deliver', 'To Bill'].includes(String(so.status))).length,
    [salesOrders]
  );

  const pendingQuotations = useMemo(
    () => quotations.filter((q) => Number(q.docstatus) === 0).length,
    [quotations]
  );

  const overdueInvoices = useMemo(
    () => {
      const todayDate = new Date();
      return salesInvoices.filter((inv) => {
        if (Number(inv.docstatus) !== 1 || Number(inv.outstanding_amount || 0) <= 0) return false;
        const dueDate = inv.due_date ? new Date(String(inv.due_date)) : null;
        return dueDate && dueDate < todayDate;
      });
    },
    [salesInvoices]
  );

  const overdueCount = overdueInvoices.length;
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.outstanding_amount || 0), 0);

  const returnsThisMonth = useMemo(
    () => salesInvoices.filter((inv) => String(inv.posting_date ?? '').startsWith(thisMonth) && String(inv.status) === 'Return').length,
    [salesInvoices, thisMonth]
  );

  const collectionRate = useMemo(() => {
    const submitted = salesInvoices.filter((inv) => String(inv.posting_date ?? '').startsWith(thisMonth) && Number(inv.docstatus) === 1);
    const totalGrand = submitted.reduce((s, inv) => s + Number(inv.grand_total || 0), 0);
    const totalOutstanding = submitted.reduce((s, inv) => s + Number(inv.outstanding_amount || 0), 0);
    if (totalGrand === 0) return 0;
    return Math.round(((totalGrand - totalOutstanding) / totalGrand) * 100);
  }, [salesInvoices, thisMonth]);

  /* ---------- Top 5 customers by revenue ---------- */
  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>();
    for (const inv of salesInvoices) {
      if (Number(inv.docstatus) !== 1) continue;
      const key = String(inv.customer ?? '');
      const existing = map.get(key) || { name: String(inv.customer_name ?? key), total: 0 };
      existing.total += Number(inv.grand_total || 0);
      map.set(key, existing);
    }
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [salesInvoices]);

  const maxCustomerVal = useMemo(() => Math.max(...topCustomers.map((c) => c.total), 1), [topCustomers]);

  /* ---------- Pipeline data ---------- */
  const pipeline = useMemo(() => {
    const leads = 0; // Would need Lead doctype
    const opportunities = 0; // Would need Opportunity doctype
    const qts = quotations.filter((q) => Number(q.docstatus) === 1 || Number(q.docstatus) === 0).length;
    const orders = salesOrders.filter((so) => Number(so.docstatus) === 1).length;
    const invoices = salesInvoices.filter((si) => Number(si.docstatus) === 1).length;
    return [
      { label: 'عملاء محتملون', count: leads, color: 'bg-chart-5/10 text-chart-5' },
      { label: 'فرص', count: opportunities, color: 'bg-chart-1/10 text-chart-1' },
      { label: 'عروض أسعار', count: qts, color: 'bg-chart-2/10 text-chart-2' },
      { label: 'أوامر بيع', count: orders, color: 'bg-primary/10 text-primary' },
      { label: 'فواتير', count: invoices, color: 'bg-primary/10 text-primary' },
    ];
  }, [quotations, salesOrders, salesInvoices]);

  /* ---------- Monthly sales trend ---------- */
  const monthlySales = useMemo(() => {
    const todayForChart = new Date();
    const months: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(todayForChart.getFullYear(), todayForChart.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
      const total = salesInvoices
        .filter((inv) => String(inv.posting_date ?? '').startsWith(ym) && Number(inv.docstatus) === 1)
        .reduce((s, inv) => s + Number(inv.grand_total || 0), 0);
      months.push({ label: monthLabel, value: total });
    }
    return months;
  }, [salesInvoices]);

  const maxSalesVal = useMemo(() => Math.max(...monthlySales.map((m) => m.value), 1), [monthlySales]);

  /* ---------- Recent transactions ---------- */
  const recentTransactions = useMemo(() => {
    const items: { typeAr: string; name: string; party: string; amount: number; date: string; status: string }[] = [];
    for (const inv of salesInvoices.slice(0, 4)) {
      items.push({ typeAr: 'فاتورة مبيعات', name: String(inv.name ?? ''), party: String(inv.customer_name ?? inv.customer ?? '—'), amount: Number(inv.grand_total ?? 0), date: String(inv.posting_date ?? ''), status: String(inv.status ?? '') });
    }
    for (const so of salesOrders.slice(0, 3)) {
      items.push({ typeAr: 'أمر بيع', name: String(so.name ?? ''), party: String(so.customer_name ?? so.customer ?? '—'), amount: Number(so.grand_total ?? 0), date: String(so.transaction_date ?? ''), status: String(so.status ?? '') });
    }
    for (const q of quotations.slice(0, 3)) {
      items.push({ typeAr: 'عرض سعر', name: String(q.name ?? ''), party: String(q.party_name ?? '—'), amount: Number(q.grand_total ?? 0), date: String(q.transaction_date ?? ''), status: String(q.status ?? '') });
    }
    items.sort((a, b) => b.date.localeCompare(a.date));
    return items.slice(0, 10);
  }, [salesInvoices, salesOrders, quotations]);

  return (
    <div dir="rtl" className="erp-page-enter mx-auto w-full max-w-[1600px] space-y-5 md:space-y-6">
      <PageHeader
        title="لوحة تحكم المبيعات"
        description="متابعة أداء المبيعات والعملاء والفواتير وأوامر البيع"
        iconify="solar:cart-large-2-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'المبيعات' }, { label: 'لوحة التحكم' }]}
      />

      {/* ── KPI Row 1 ── */}
      {/* ── KPI Row 2 ── */}
      {/* ── Quick Actions ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Button key={action.label} variant="outline" size="sm" className="h-9 gap-2 text-xs" asChild>
                  <Link href={action.href}>
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${action.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Top Customers & Pipeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 5 customers */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">أفضل ٥ عملاء حسب الإيرادات</CardTitle>
              <Link href="/sales/customers" className="text-xs text-primary hover:underline">عرض الكل</Link>
            </div>
          </CardHeader>
          <CardContent>
            {topCustomers.length === 0 && (
              <p className="text-xs text-muted-foreground py-8 text-center">لا توجد بيانات عملاء بعد.</p>
            )}
            {topCustomers.length > 0 && (
              <div className="space-y-3">
                {topCustomers.map((cust, i) => (
                  <div key={cust.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {i + 1}
                        </span>
                        <span className="text-xs font-medium truncate max-w-[160px]">{cust.name}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums">{formatCurrency(cust.total)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-chart-3 transition-all duration-500"
                        style={{ width: `${(cust.total / maxCustomerVal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Pipeline */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">خط أنابيب المبيعات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2 overflow-x-auto py-4">
              {pipeline.map((step, i) => (
                <div key={step.label} className="flex items-center gap-2">
                  <PipelineStep label={step.label} count={step.count} color={step.color} isActive={step.count > 0} />
                  {i < pipeline.length - 1 && (
                    <ChevronLeft className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Monthly Trend & Overdue Alert ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Sales Trend */}
        <Card className="lg:col-span-2 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">اتجاه المبيعات الشهرية (آخر ٦ أشهر)</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={monthlySales} maxVal={maxSalesVal} colorClass="bg-chart-3/80" />
          </CardContent>
        </Card>

        {/* Overdue Invoices Alert */}
        <Card className={`border-border/40 ${overdueCount > 0 ? 'border-destructive/30' : ''}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {overdueCount > 0 && <AlertTriangle className="h-4 w-4 text-destructive" />}
              <CardTitle className="text-sm font-semibold">تنبيه الفواتير المتأخرة</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {overdueCount === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <CircleDollarSign className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">لا توجد فواتير متأخرة</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                  <span className="text-xs font-medium">عدد الفواتير المتأخرة</span>
                  <span className="text-sm font-bold text-destructive">{overdueCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                  <span className="text-xs font-medium">إجمالي المبلغ المتأخر</span>
                  <span className="text-sm font-bold text-destructive">{formatCurrency(overdueAmount)}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs mt-2" asChild>
                  <Link href="/sales/sales-invoices">عرض الفواتير</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Transactions ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">آخر معاملات المبيعات</CardTitle>
            <span className="text-[10px] text-muted-foreground">آخر ١٠ معاملات</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-xs text-muted-foreground py-6 text-center">جاري التحميل…</p>}
          {!isLoading && recentTransactions.length === 0 && (
            <p className="text-xs text-muted-foreground py-8 text-center">لا توجد معاملات مبيعات حالياً.</p>
          )}
          {!isLoading && recentTransactions.length > 0 && (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {recentTransactions.map((tx, i) => (
                <div
                  key={`${tx.typeAr}-${tx.name}-${i}`}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{tx.party}</p>
                      <p className="text-[10px] text-muted-foreground">{tx.name} — {tx.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold tabular-nums">{formatCurrency(tx.amount)}</span>
                    <StatusBadge status={tx.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
