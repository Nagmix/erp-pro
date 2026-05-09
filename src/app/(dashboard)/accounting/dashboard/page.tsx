'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useDocList } from '@/lib/client/hooks';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { StatusBadge } from '@/components/erp/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatNumber } from '@/lib/core/helpers';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpLeft,
  ArrowDownLeft,
  Wallet,
  FileText,
  BookOpen,
  CreditCard,
  HandCoins,
  Building2,
  AlertTriangle,
  Clock,
  ChevronLeft,
  Landmark,
  Receipt,
  PiggyBank,
  CalendarClock,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Quick Actions                                                      */
/* ------------------------------------------------------------------ */
const QUICK_ACTIONS = [
  { label: 'قيد يومي جديد', href: '/accounting/journal-entry?new=1', icon: BookOpen, color: 'bg-primary/10 text-primary' },
  { label: 'سند دفع جديد', href: '/accounting/payment-entry?new=1', icon: HandCoins, color: 'bg-primary/10 text-primary' },
  { label: 'القوائم المالية', href: '/accounting/financial-statements', icon: Landmark, color: 'bg-chart-1/10 text-chart-1' },
  { label: 'التسوية البنكية', href: '/accounting/bank-reconciliation', icon: Building2, color: 'bg-chart-2/10 text-chart-2' },
  { label: 'إقفال الفترة', href: '/accounting/period-closing', icon: CalendarClock, color: 'bg-destructive/10 text-destructive' },
];

/* ------------------------------------------------------------------ */
/*  Sub-page links                                                     */
/* ------------------------------------------------------------------ */
const SUB_PAGES = [
  { label: 'دليل الحسابات', href: '/accounting/chart-of-accounts' },
  { label: 'القيود اليومية', href: '/accounting/journal-entry' },
  { label: 'سندات القبض والصرف', href: '/accounting/payment-entry' },
  { label: 'الخزائن', href: '/accounting/treasuries' },
  { label: 'الحسابات البنكية', href: '/accounting/bank-accounts' },
  { label: 'الشيكات', href: '/accounting/cheques' },
  { label: 'المصروفات', href: '/accounting/expenses' },
  { label: 'الأصول الثابتة', href: '/accounting/assets' },
  { label: 'القوائم المالية', href: '/accounting/financial-statements' },
  { label: 'التدفقات النقدية', href: '/accounting/cash-flow' },
  { label: 'الميزانيات', href: '/accounting/budgets' },
  { label: 'التقارير المحاسبية', href: '/accounting/advanced-reports' },
];

/* ------------------------------------------------------------------ */
/*  Simple bar chart component using divs                              */
/* ------------------------------------------------------------------ */
function SimpleBarChart({ data, maxVal, colorClass, labelFn }: {
  data: { label: string; value: number }[];
  maxVal: number;
  colorClass: string;
  labelFn?: (label: string) => string;
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
          <span className="text-[9px] text-muted-foreground leading-none">
            {labelFn ? labelFn(item.label) : item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Aging summary component                                            */
/* ------------------------------------------------------------------ */
function AgingSummary({ current, days30, days60, over60 }: {
  current: number; days30: number; days60: number; over60: number;
}) {
  const total = current + days30 + days60 + over60;
  const safeTotal = Math.max(total, 1);
  const segments = [
    { label: 'حالي', value: current, color: 'bg-chart-3' },
    { label: '١-٣٠ يوم', value: days30, color: 'bg-chart-1' },
    { label: '٣١-٦٠ يوم', value: days60, color: 'bg-chart-2' },
    { label: 'أكثر من ٦٠', value: over60, color: 'bg-destructive' },
  ];
  return (
    <div className="space-y-3">
      <div className="flex rounded-full overflow-hidden h-3">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`${seg.color} transition-all duration-500`}
            style={{ width: `${(seg.value / safeTotal) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${seg.color}`} />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">{seg.label}</p>
              <p className="text-xs font-semibold tabular-nums">{formatCurrency(seg.value)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function AccountingDashboardPage() {
  const { company } = useDefaultCompanyName();

  /* ---------- Fetch data ---------- */
  const { data: salesInvoices = [], isLoading: siLoading } = useDocList<Record<string, unknown>>(
    'Sales Invoice',
    {
      fields: ['name', 'customer', 'customer_name', 'grand_total', 'outstanding_amount', 'posting_date', 'status', 'docstatus', 'due_date'],
      limit: 50,
      order_by: 'posting_date desc',
    }
  );

  const { data: purchaseInvoices = [], isLoading: piLoading } = useDocList<Record<string, unknown>>(
    'Purchase Invoice',
    {
      fields: ['name', 'supplier', 'supplier_name', 'grand_total', 'outstanding_amount', 'posting_date', 'status', 'docstatus', 'due_date'],
      limit: 50,
      order_by: 'posting_date desc',
    }
  );

  const { data: paymentEntries = [], isLoading: peLoading } = useDocList<Record<string, unknown>>(
    'Payment Entry',
    {
      fields: ['name', 'payment_type', 'posting_date', 'paid_amount', 'party_name', 'mode_of_payment', 'docstatus'],
      limit: 50,
      order_by: 'posting_date desc',
    }
  );

  const { data: journalEntries = [], isLoading: jeLoading } = useDocList<Record<string, unknown>>(
    'Journal Entry',
    {
      fields: ['name', 'posting_date', 'total_debit', 'total_credit', 'docstatus', 'voucher_type'],
      limit: 50,
      order_by: 'posting_date desc',
    }
  );

  const { data: glEntries = [], isLoading: glLoading } = useDocList<Record<string, unknown>>(
    'GL Entry',
    {
      fields: ['name', 'account', 'debit', 'credit', 'posting_date', 'against'],
      limit: 100,
      order_by: 'posting_date desc',
    }
  );

  /* ---------- KPI calculations ---------- */
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const totalRevenue = useMemo(
    () => salesInvoices
      .filter((inv) => String(inv.posting_date ?? '').startsWith(thisMonth) && Number(inv.docstatus) === 1)
      .reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0),
    [salesInvoices, thisMonth]
  );

  const totalExpenses = useMemo(
    () => purchaseInvoices
      .filter((inv) => String(inv.posting_date ?? '').startsWith(thisMonth) && Number(inv.docstatus) === 1)
      .reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0),
    [purchaseInvoices, thisMonth]
  );

  const netProfit = totalRevenue - totalExpenses;

  const outstandingReceivables = useMemo(
    () => salesInvoices
      .filter((inv) => Number(inv.docstatus) === 1 && Number(inv.outstanding_amount || 0) > 0)
      .reduce((sum, inv) => sum + Number(inv.outstanding_amount || 0), 0),
    [salesInvoices]
  );

  const outstandingPayables = useMemo(
    () => purchaseInvoices
      .filter((inv) => Number(inv.docstatus) === 1 && Number(inv.outstanding_amount || 0) > 0)
      .reduce((sum, inv) => sum + Number(inv.outstanding_amount || 0), 0),
    [purchaseInvoices]
  );

  const cashBalance = useMemo(
    () => paymentEntries
      .filter((pe) => Number(pe.docstatus) === 1)
      .reduce((sum, pe) => {
        const amt = Number(pe.paid_amount || 0);
        return sum + (String(pe.payment_type) === 'Receive' ? amt : -amt);
      }, 0),
    [paymentEntries]
  );

  const overdueInvoices = useMemo(
    () => {
      const todayDate = new Date();
      return salesInvoices.filter((inv) => {
        if (Number(inv.docstatus) !== 1 || Number(inv.outstanding_amount || 0) <= 0) return false;
        const dueDate = inv.due_date ? new Date(String(inv.due_date)) : null;
        return dueDate && dueDate < todayDate;
      }).length;
    },
    [salesInvoices]
  );

  const unreconciledPayments = useMemo(
    () => paymentEntries.filter((pe) => Number(pe.docstatus) === 0).length,
    [paymentEntries]
  );

  /* ---------- Revenue vs Expenses last 6 months ---------- */
  const monthlyData = useMemo(() => {
    const todayForChart = new Date();
    const months: { label: string; revenue: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(todayForChart.getFullYear(), todayForChart.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('ar-YE', { month: 'short' });
      const rev = salesInvoices
        .filter((inv) => String(inv.posting_date ?? '').startsWith(ym) && Number(inv.docstatus) === 1)
        .reduce((s, inv) => s + Number(inv.grand_total || 0), 0);
      const exp = purchaseInvoices
        .filter((inv) => String(inv.posting_date ?? '').startsWith(ym) && Number(inv.docstatus) === 1)
        .reduce((s, inv) => s + Number(inv.grand_total || 0), 0);
      months.push({ label: monthLabel, revenue: rev, expenses: exp });
    }
    return months;
  }, [salesInvoices, purchaseInvoices]);

  const maxChartVal = useMemo(
    () => Math.max(...monthlyData.map((m) => Math.max(m.revenue, m.expenses)), 1),
    [monthlyData]
  );

  /* ---------- AR Aging ---------- */
  const arAging = useMemo(() => {
    const todayDate = new Date();
    let current = 0;
    let days30 = 0;
    let days60 = 0;
    let over60 = 0;
    const outstanding = salesInvoices.filter((inv) => Number(inv.docstatus) === 1 && Number(inv.outstanding_amount || 0) > 0);
    for (const inv of outstanding) {
      const dueDate = inv.due_date ? new Date(String(inv.due_date)) : null;
      if (!dueDate) { current += Number(inv.outstanding_amount || 0); continue; }
      const diffDays = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const amt = Number(inv.outstanding_amount || 0);
      if (diffDays <= 0) current += amt;
      else if (diffDays <= 30) days30 += amt;
      else if (diffDays <= 60) days60 += amt;
      else over60 += amt;
    }
    return { current, days30, days60, over60 };
  }, [salesInvoices]);

  /* ---------- Recent transactions (last 10) ---------- */
  const recentTransactions = useMemo(() => {
    const items: { type: string; typeAr: string; name: string; party: string; amount: number; date: string; status: string }[] = [];
    for (const inv of salesInvoices.slice(0, 5)) {
      items.push({ type: 'Sales Invoice', typeAr: 'فاتورة مبيعات', name: String(inv.name ?? ''), party: String(inv.customer_name ?? inv.customer ?? '—'), amount: Number(inv.grand_total ?? 0), date: String(inv.posting_date ?? ''), status: String(inv.status ?? '') });
    }
    for (const inv of purchaseInvoices.slice(0, 5)) {
      items.push({ type: 'Purchase Invoice', typeAr: 'فاتورة مشتريات', name: String(inv.name ?? ''), party: String(inv.supplier_name ?? inv.supplier ?? '—'), amount: Number(inv.grand_total ?? 0), date: String(inv.posting_date ?? ''), status: String(inv.status ?? '') });
    }
    for (const pe of paymentEntries.slice(0, 3)) {
      items.push({ type: 'Payment Entry', typeAr: String(pe.payment_type) === 'Receive' ? 'سند قبض' : 'سند صرف', name: String(pe.name ?? ''), party: String(pe.party_name ?? '—'), amount: Number(pe.paid_amount ?? 0), date: String(pe.posting_date ?? ''), status: Number(pe.docstatus) === 1 ? 'مُقدّم' : 'مسودة' });
    }
    for (const je of journalEntries.slice(0, 2)) {
      items.push({ type: 'Journal Entry', typeAr: 'قيد يومية', name: String(je.name ?? ''), party: String(je.voucher_type ?? '—'), amount: Number(je.total_debit ?? 0), date: String(je.posting_date ?? ''), status: Number(je.docstatus) === 1 ? 'مُقدّم' : 'مسودة' });
    }
    items.sort((a, b) => b.date.localeCompare(a.date));
    return items.slice(0, 10);
  }, [salesInvoices, purchaseInvoices, paymentEntries, journalEntries]);

  /* ---------- Upcoming payments ---------- */
  const upcomingPayments = useMemo(
    () => purchaseInvoices
      .filter((inv) => Number(inv.docstatus) === 1 && Number(inv.outstanding_amount || 0) > 0 && inv.due_date)
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
      .slice(0, 5),
    [purchaseInvoices]
  );

  const isLoading = siLoading || piLoading || peLoading || jeLoading;

  return (
    <div dir="rtl" className="erp-page-enter mx-auto w-full max-w-[1600px] space-y-5 md:space-y-6">
      <PageHeader
        title="لوحة تحكم المحاسبة"
        description="نظرة شاملة على الوضع المالي والإيرادات والمصروفات والحسابات المدينة والدائنة"
        iconify="solar:calculator-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'المحاسبة' }, { label: 'لوحة التحكم' }]}
      />

      {/* ── KPI Row 1 ── */}
      <KpiStrip>
        <KpiCard
          title="إجمالي الإيرادات"
          value={isLoading ? '…' : formatCurrency(totalRevenue)}
          icon={TrendingUp}
          accent="success"
          description="إيرادات الشهر الحالي"
        />
        <KpiCard
          title="إجمالي المصروفات"
          value={isLoading ? '…' : formatCurrency(totalExpenses)}
          icon={TrendingDown}
          accent="warning"
          description="مصروفات الشهر الحالي"
        />
        <KpiCard
          title="صافي الربح"
          value={isLoading ? '…' : formatCurrency(netProfit)}
          icon={netProfit >= 0 ? TrendingUp : TrendingDown}
          accent={netProfit >= 0 ? 'success' : 'destructive'}
          description="الإيرادات ناقص المصروفات"
        />
        <KpiCard
          title="الرصيد النقدي"
          value={isLoading ? '…' : formatCurrency(cashBalance)}
          icon={Wallet}
          accent="info"
          description="صافي التدفقات النقدية"
        />
      </KpiStrip>

      {/* ── KPI Row 2 ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="المدينون المستحقون"
          value={isLoading ? '…' : formatCurrency(outstandingReceivables)}
          icon={ArrowUpLeft}
          compact
          accent="info"
        />
        <KpiCard
          title="الدائنون المستحقون"
          value={isLoading ? '…' : formatCurrency(outstandingPayables)}
          icon={ArrowDownLeft}
          compact
          accent="destructive"
        />
        <KpiCard
          title="فواتير متأخرة"
          value={String(overdueInvoices)}
          icon={AlertTriangle}
          compact
          accent="warning"
        />
        <KpiCard
          title="مدفوعات غير مسوّاة"
          value={String(unreconciledPayments)}
          icon={Clock}
          compact
          accent="primary"
        />
      </KpiStrip>

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

      {/* ── Revenue vs Expenses & AR Aging ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue vs Expenses Chart */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">الإيرادات مقابل المصروفات (آخر ٦ أشهر)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">الإيرادات</p>
                <SimpleBarChart
                  data={monthlyData.map((m) => ({ label: m.label, value: m.revenue }))}
                  maxVal={maxChartVal}
                  colorClass="bg-chart-3/80"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">المصروفات</p>
                <SimpleBarChart
                  data={monthlyData.map((m) => ({ label: m.label, value: m.expenses }))}
                  maxVal={maxChartVal}
                  colorClass="bg-chart-2/80"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AR Aging */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">تقريب حسابات المدينين</CardTitle>
          </CardHeader>
          <CardContent>
            <AgingSummary {...arAging} />
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Transactions & Upcoming Payments ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2 border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">آخر المعاملات</CardTitle>
              <span className="text-[10px] text-muted-foreground">آخر ١٠ معاملات</span>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-xs text-muted-foreground py-6 text-center">جاري التحميل…</p>}
            {!isLoading && recentTransactions.length === 0 && (
              <p className="text-xs text-muted-foreground py-8 text-center">لا توجد معاملات حالياً.</p>
            )}
            {!isLoading && recentTransactions.length > 0 && (
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {recentTransactions.map((tx, i) => (
                  <div
                    key={`${tx.type}-${tx.name}-${i}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{tx.party}</p>
                        <p className="text-[10px] text-muted-foreground">{tx.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-xs font-semibold tabular-nums">{formatCurrency(tx.amount)}</p>
                        <p className="text-[10px] text-muted-foreground">{tx.date}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-0 bg-primary/10 text-primary">
                        {tx.typeAr}
                      </Badge>
                      <StatusBadge status={tx.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Payments */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">مدفوعات قادمة</CardTitle>
          </CardHeader>
          <CardContent>
            {!isLoading && upcomingPayments.length === 0 && (
              <p className="text-xs text-muted-foreground py-8 text-center">لا توجد مدفوعات قادمة.</p>
            )}
            {upcomingPayments.length > 0 && (
              <div className="space-y-2">
                {upcomingPayments.map((inv) => {
                  const dueDate = new Date(String(inv.due_date));
                  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isUrgent = diffDays <= 3;
                  return (
                    <div
                      key={String(inv.name)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-7 w-7 flex items-center justify-center rounded-md ${isUrgent ? 'bg-destructive/10' : 'bg-chart-2/10'}`}>
                          <CalendarClock className={`h-3.5 w-3.5 ${isUrgent ? 'text-destructive' : 'text-chart-2'}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium truncate">{String(inv.supplier_name ?? inv.supplier ?? '—')}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {String(inv.due_date)} — {diffDays > 0 ? `بعد ${diffDays} يوم` : 'متأخر'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold tabular-nums">{formatCurrency(Number(inv.outstanding_amount ?? 0))}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Sub-page Links ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">صفحات المحاسبة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {SUB_PAGES.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="flex items-center gap-1.5 rounded-lg border border-border/40 p-2.5 text-xs text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
              >
                <ChevronLeft className="h-3 w-3 shrink-0" />
                <span className="truncate">{page.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
