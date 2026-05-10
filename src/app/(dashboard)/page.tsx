'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { KpiCard } from '@/components/erp/kpi-card';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/erp/status-badge';
import { DashboardWidgetBoard } from '@/components/erp/dashboard-widget-board';
import { useContextRail } from '@/components/erp/context-rail';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/erp/page-header';
import {
  DollarSign,
  TrendingUp,
  Users,
  Package,
  ShoppingCart,
  FileText,
  ArrowUpLeft,
  ArrowDownLeft,
  AlertTriangle,
  Briefcase,
  Sparkles,
  Clock,
  Plus,
  Receipt,
  Wallet,
  BookOpen,
  HandCoins,
  CreditCard,
  TrendingDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formatCurrency, CHART_PALETTE } from '@/lib/core/helpers';
import { useDashboardKPIs, useDocList } from '@/lib/client/hooks';
import { DEFAULT_DASHBOARD_KPIS } from '@/lib/client/dashboard-kpis.shared';

function chartMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  try {
    return new Date(y, m - 1, 1).toLocaleDateString('ar-SA', { month: 'short', year: '2-digit' });
  } catch {
    return ym;
  }
}

const DASH_WIDGET_ORDER = ['kpi_main', 'kpi_secondary', 'quick_actions', 'charts', 'lists', 'monthly'] as const;

const DASH_WIDGET_LABELS: Record<string, string> = {
  kpi_main: 'المؤشرات المالية الرئيسية',
  kpi_secondary: 'مؤشرات تشغيلية إضافية',
  quick_actions: 'إجراءات سريعة',
  charts: 'الرسوم البيانية',
  lists: 'أحدث الفواتير والقوائم',
  monthly: 'أوامر البيع والشراء الشهرية',
};

const QUICK_ACTIONS = [
  { label: 'فاتورة مبيعات جديدة', href: '/sales/sales-invoices?new=1', icon: FileText, color: 'bg-primary/10 text-primary' },
  { label: 'فاتورة مشتريات جديدة', href: '/purchases/purchase-invoices?new=1', icon: Receipt, color: 'bg-chart-2/10 text-chart-2' },
  { label: 'قيد يومي جديد', href: '/accounting/journal-entry?new=1', icon: BookOpen, color: 'bg-chart-1/10 text-chart-1' },
  { label: 'سند قبض', href: '/accounting/payment-entry?new=1&type=Receive', icon: HandCoins, color: 'bg-chart-3/10 text-chart-3' },
  { label: 'سند صرف', href: '/accounting/payment-entry?new=1&type=Pay', icon: CreditCard, color: 'bg-destructive/10 text-destructive' },
];

export default function DashboardPage() {
  const rail = useContextRail();
  const {
    data: kpis,
    isLoading: kpisLoading,
    isError: kpisError,
    error: kpisErr,
    refetch: refetchKpis,
  } = useDashboardKPIs();

  const {
    data: recentSi = [],
    isLoading: siLoading,
    isError: siError,
    error: siErr,
    refetch: refetchSi,
  } = useDocList<Record<string, unknown>>('Sales Invoice', {
    limit: 5,
    order_by: 'modified desc',
  });

  const {
    data: recentPi = [],
    isLoading: piLoading,
  } = useDocList<Record<string, unknown>>('Purchase Invoice', {
    limit: 5,
    order_by: 'modified desc',
  });

  const {
    data: pendingSi = [],
    isLoading: pendingSiLoading,
  } = useDocList<Record<string, unknown>>('Sales Invoice', {
    fields: ['name', 'customer', 'customer_name', 'grand_total', 'posting_date', 'status'],
    filters: [['docstatus', '=', '0']],
    limit: 10,
    order_by: 'modified desc',
  });

  const {
    data: pendingPi = [],
    isLoading: pendingPiLoading,
  } = useDocList<Record<string, unknown>>('Purchase Invoice', {
    fields: ['name', 'supplier', 'supplier_name', 'grand_total', 'posting_date', 'status'],
    filters: [['docstatus', '=', '0']],
    limit: 10,
    order_by: 'modified desc',
  });

  const {
    data: pendingJe = [],
    isLoading: pendingJeLoading,
  } = useDocList<Record<string, unknown>>('Journal Entry', {
    fields: ['name', 'posting_date', 'total_debit', 'docstatus'],
    filters: [['docstatus', '=', '0']],
    limit: 10,
    order_by: 'modified desc',
  });

  const {
    data: pendingEc = [],
    isLoading: pendingEcLoading,
  } = useDocList<Record<string, unknown>>('Expense Claim', {
    fields: ['name', 'employee_name', 'total_claimed_amount', 'posting_date', 'status'],
    filters: [['docstatus', '=', '0']],
    limit: 10,
    order_by: 'modified desc',
  });

  const pendingApprovals = useMemo(() => {
    const items: { doctype: string; name: string; description: string; amount: number; date: string; status?: string }[] = [];
    for (const inv of pendingSi) {
      items.push({
        doctype: 'فاتورة مبيعات',
        name: String(inv.name ?? ''),
        description: String(inv.customer_name ?? inv.customer ?? '—'),
        amount: Number(inv.grand_total ?? 0),
        date: String(inv.posting_date ?? ''),
        status: String(inv.status ?? 'مسودة'),
      });
    }
    for (const inv of pendingPi) {
      items.push({
        doctype: 'فاتورة مشتريات',
        name: String(inv.name ?? ''),
        description: String(inv.supplier_name ?? inv.supplier ?? '—'),
        amount: Number(inv.grand_total ?? 0),
        date: String(inv.posting_date ?? ''),
        status: String(inv.status ?? 'مسودة'),
      });
    }
    for (const je of pendingJe) {
      items.push({
        doctype: 'قيد يومية',
        name: String(je.name ?? ''),
        description: `إجمالي مدين: ${formatCurrency(Number(je.total_debit ?? 0))}`,
        amount: Number(je.total_debit ?? 0),
        date: String(je.posting_date ?? ''),
        status: 'مسودة',
      });
    }
    for (const ec of pendingEc) {
      items.push({
        doctype: 'مطالبة مصروفات',
        name: String(ec.name ?? ''),
        description: String(ec.employee_name ?? '—'),
        amount: Number(ec.total_claimed_amount ?? 0),
        date: String(ec.posting_date ?? ''),
        status: String(ec.status ?? ''),
      });
    }
    return items;
  }, [pendingSi, pendingPi, pendingJe, pendingEc]);

  const pendingLoading = pendingSiLoading || pendingPiLoading || pendingJeLoading || pendingEcLoading;

  const kpiData = kpis ?? DEFAULT_DASHBOARD_KPIS;

  const revenueData = (kpiData.monthlyRevenueExpenses ?? []).map((row) => ({
    month: chartMonthLabel(row.month),
    revenue: row.revenue,
    expenses: row.expenses,
  }));
  const salesByModule = kpiData.salesByModule ?? [];
  const monthlyOrders = (kpiData.monthlyOrderCounts ?? []).map((row) => ({
    month: chartMonthLabel(row.month),
    sales: row.sales,
    purchases: row.purchases,
  }));

  // Last 5 transactions (payment entries)
  const {
    data: recentPe = [],
    isLoading: peLoading,
  } = useDocList<Record<string, unknown>>('Payment Entry', {
    fields: ['name', 'payment_type', 'posting_date', 'paid_amount', 'party_name', 'mode_of_payment'],
    limit: 5,
    order_by: 'modified desc',
  });

  const widgets = useMemo(
    () => ({
      kpi_main: (
        <div className="p-4 md:p-5">
          <ListQueryAlert error={kpisError ? kpisErr : null} onRetry={() => refetchKpis()} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="إجمالي الإيرادات"
              value={kpisLoading ? '…' : formatCurrency(kpiData.totalRevenue)}
              icon={DollarSign}
              description="فواتير مبيعات مرحّلة"
              accent="success"
              sparkline={kpisLoading ? undefined : kpiData.revenueSparkline}
            />
            <KpiCard
              title="إجمالي المصروفات"
              value={kpisLoading ? '…' : formatCurrency(kpiData.totalExpenses)}
              icon={TrendingUp}
              description="فواتير مشتريات مرحّلة"
              accent="warning"
              sparkline={kpisLoading ? undefined : kpiData.expensesSparkline}
            />
            <KpiCard
              title="صافي الربح"
              value={kpisLoading ? '…' : formatCurrency(kpiData.netProfit)}
              icon={kpisLoading ? Sparkles : (kpiData.netProfit >= 0 ? TrendingUp : TrendingDown)}
              description="الإيرادات ناقص المصروفات"
              accent={kpiData.netProfit >= 0 ? 'success' : 'destructive'}
              sparkline={kpisLoading ? undefined : kpiData.revenueSparkline}
            />
            <KpiCard
              title="المدينون"
              value={kpisLoading ? '…' : formatCurrency(kpiData.outstandingReceivables)}
              icon={ArrowUpLeft}
              description="مجموع غير المحصّل"
              accent="info"
              sparkline={kpisLoading ? undefined : kpiData.receivablesSparkline}
            />
          </div>
        </div>
      ),
      kpi_secondary: (
        <div className="p-4 md:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard title="الدائنون" value={kpisLoading ? '…' : formatCurrency(kpiData.outstandingPayables)} icon={ArrowDownLeft} compact accent="destructive" description="مجموع غير المدفوع للموردين" />
            <KpiCard title="مخزون منخفض" value={String(kpiData.lowStockItems)} icon={AlertTriangle} compact accent="warning" />
            <KpiCard title="العملاء" value={String(kpiData.totalCustomers)} icon={Users} compact accent="primary" />
            <KpiCard title="الموردين" value={String(kpiData.totalSuppliers)} icon={Briefcase} compact accent="info" />
            <KpiCard title="أوامر بيع مفتوحة" value={String(kpiData.openSalesOrders)} icon={ShoppingCart} compact accent="success" />
          </div>
        </div>
      ),
      quick_actions: (
        <div className="p-4 md:p-5">
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
        </div>
      ),
      charts: (
        <div className="p-4 md:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">الإيرادات والمصروفات الشهرية</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-16 text-center">
                    لا توجد سلاسل زمنية متاحة حالياً. ستظهر الرسوم البيانية تلقائياً عند توفر البيانات.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={revenueData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 90%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(220, 10%, 90%)' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill={CHART_PALETTE.primary} radius={[4, 4, 0, 0]} name="الإيرادات" />
                      <Bar dataKey="expenses" fill={CHART_PALETTE.secondary} radius={[4, 4, 0, 0]} name="المصروفات" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">توزيع طرق الدفع</CardTitle>
              </CardHeader>
              <CardContent>
                {salesByModule.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-12 text-center">لا بيانات توزيع بعد</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={salesByModule} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                          {salesByModule.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(220, 10%, 90%)' }} formatter={(value: number) => `${value}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {salesByModule.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-[10px] text-muted-foreground">
                            {item.name} ({item.value}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ),
      lists: (
        <div className="p-4 md:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 border-border/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">أحدث الفواتير</CardTitle>
                  <a href="/sales/sales-invoices" className="text-xs text-primary hover:underline">
                    عرض الكل
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                <ListQueryAlert error={siError ? siErr : null} onRetry={() => refetchSi()} />
                <div className="space-y-2">
                  {siLoading && <p className="text-xs text-muted-foreground">جاري التحميل…</p>}
                  {!siLoading && recentSi.length === 0 && (
                    <p className="text-xs text-muted-foreground py-6 text-center">لا توجد فواتير من الخادم.</p>
                  )}
                  {recentSi.map((inv) => (
                    <div
                      key={String(inv.name ?? inv.idx)}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">{String(inv.customer_name ?? inv.customer ?? '—')}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {String(inv.name ?? '')} — {String(inv.posting_date ?? '')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold">
                          {formatCurrency(Number(inv.grand_total ?? inv.rounded_total ?? 0))}
                        </span>
                        <StatusBadge status={String(inv.status ?? '')} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">بانتظار الموافقة</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingLoading && (
                  <p className="text-xs text-muted-foreground py-8 text-center">جاري التحميل…</p>
                )}
                {!pendingLoading && pendingApprovals.length === 0 && (
                  <p className="text-xs text-muted-foreground py-8 text-center">
                    لا توجد عناصر بانتظار الموافقة حالياً.
                  </p>
                )}
                {!pendingLoading && pendingApprovals.length > 0 && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {pendingApprovals.map((item) => (
                      <div
                        key={`${item.doctype}-${item.name}`}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
                            <Clock className="h-4 w-4 text-chart-2" />
                          </div>
                          <div>
                            <p className="text-xs font-medium">{item.description}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.doctype} — {item.name} {item.date ? `— ${item.date}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.amount > 0 && (
                            <span className="text-xs font-semibold">
                              {formatCurrency(item.amount)}
                            </span>
                          )}
                          {item.status && (
                            <StatusBadge status={item.status} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">آخر الحركات المالية</CardTitle>
                  <a href="/accounting/payment-entry" className="text-xs text-primary hover:underline">عرض الكل</a>
                </div>
              </CardHeader>
              <CardContent>
                {peLoading && <p className="text-xs text-muted-foreground">جاري التحميل…</p>}
                {!peLoading && recentPe.length === 0 && (
                  <p className="text-xs text-muted-foreground py-6 text-center">لا توجد حركات مالية.</p>
                )}
                {!peLoading && recentPe.length > 0 && (
                  <div className="space-y-2">
                    {recentPe.map((pe) => {
                      const isReceive = String(pe.payment_type) === 'Receive';
                      return (
                        <div key={String(pe.name)} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className={`h-7 w-7 flex items-center justify-center rounded-md ${isReceive ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                              {isReceive ? <ArrowUpLeft className="h-3.5 w-3.5 text-primary" /> : <ArrowDownLeft className="h-3.5 w-3.5 text-destructive" />}
                            </div>
                            <div>
                              <p className="text-[11px] font-medium">{String(pe.party_name ?? pe.name)}</p>
                              <p className="text-[10px] text-muted-foreground">{isReceive ? 'قبض' : 'صرف'} — {String(pe.mode_of_payment ?? '')}</p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold tabular-nums">{formatCurrency(Number(pe.paid_amount ?? 0))}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">آخر فواتير المشتريات</CardTitle>
                  <a href="/purchases/purchase-invoices" className="text-xs text-primary hover:underline">عرض الكل</a>
                </div>
              </CardHeader>
              <CardContent>
                {piLoading && <p className="text-xs text-muted-foreground">جاري التحميل…</p>}
                {!piLoading && recentPi.length === 0 && (
                  <p className="text-xs text-muted-foreground py-6 text-center">لا توجد فواتير مشتريات.</p>
                )}
                {!piLoading && recentPi.length > 0 && (
                  <div className="space-y-2">
                    {recentPi.map((inv) => (
                      <div key={String(inv.name)} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 flex items-center justify-center rounded-md bg-chart-2/10">
                            <Receipt className="h-3.5 w-3.5 text-chart-2" />
                          </div>
                          <div>
                            <p className="text-[11px] font-medium">{String(inv.supplier_name ?? inv.supplier ?? '—')}</p>
                            <p className="text-[10px] text-muted-foreground">{String(inv.name ?? '')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{formatCurrency(Number(inv.grand_total ?? 0))}</span>
                          <StatusBadge status={String(inv.status ?? '')} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ),
      monthly: (
        <div className="p-4 md:p-5">
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">أوامر البيع والشراء الشهرية</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">لا توجد بيانات شهرية بعد.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyOrders} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 90%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(220, 10%, 90%)' }} />
                    <Bar dataKey="sales" fill={CHART_PALETTE.primary} radius={[4, 4, 0, 0]} name="أوامر البيع" />
                    <Bar dataKey="purchases" fill={CHART_PALETTE.tertiary} radius={[4, 4, 0, 0]} name="أوامر الشراء" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      ),
    }),
    [kpisLoading, kpisError, kpisErr, refetchKpis, kpiData, revenueData, salesByModule, siLoading, siError, siErr, refetchSi, recentSi, monthlyOrders, pendingApprovals, pendingLoading, recentPe, peLoading, recentPi, piLoading]
  );

  return (
    <div className="erp-page-enter mx-auto w-full max-w-[1600px] space-y-5 md:space-y-6" dir="rtl">
      <PageHeader
        title="لوحة التحكم"
        description="نظرة عامة لحظية على الأداء المالي والعمليات وحالة المخزون عبر المؤسسة"
        iconify="solar:widget-2-bold-duotone"
        accent="primary"
        breadcrumbs={[]}
        className="mb-0 border-border/35 bg-card/80 shadow-sm shadow-black/[0.02]"
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              rail.openPanel(
                'دليل سريع',
                <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                  <p>
                    استخدم <strong className="text-foreground">Ctrl+K</strong> للانتقال لأي شاشة. يمكنك إعادة ترتيب البطاقات بالسحب
                    لتناسب دورك (محاسب، مبيعات، مخزون).
                  </p>
                  <p>المؤشرات الحية تُحدّث تلقائياً مع تدفق البيانات، ويمكن تخصيص عرض اللوحة حسب احتياج كل فريق.</p>
                  <ul className="list-disc pe-4 space-y-1 text-foreground/90">
                    <li>أخضر / success: تأكيد وترحيل</li>
                    <li>أزرق / primary: تنقل وروابط</li>
                    <li>برتقالي / warning: تنبيهات واختيار</li>
                    <li>أحمر / destructive: حذف وأخطاء</li>
                  </ul>
                </div>
              )
            }
          >
            <Sparkles className="h-3.5 w-3.5" />
            مساعد اللوحة
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 px-0.5">
        <span className="text-[11px] text-muted-foreground shrink-0">اختصارات:</span>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
          <Link href="/accounting/financial-statements">القوائم المالية</Link>
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
          <Link href="/accounting/advanced-reports">تقارير محاسبة</Link>
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
          <Link href="/reports">مركز التقارير</Link>
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
          <Link href="/accounting/bank-and-cash">البنوك والصناديق</Link>
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
          <Link href="/settings">الإعدادات</Link>
        </Button>
      </div>

      <DashboardWidgetBoard widgets={widgets} defaultOrder={[...DASH_WIDGET_ORDER]} widgetLabels={DASH_WIDGET_LABELS} />
    </div>
  );
}
