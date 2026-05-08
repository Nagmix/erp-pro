'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CreditCard,
  LayoutGrid,
  Package,
  Receipt,
  ShoppingCart,
  Users,
  TrendingUp,
  CalendarDays,
  Hash,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader, KpiStrip, PageShell } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { useDocList } from '@/lib/client/hooks';
import { formatCurrency } from '@/lib/core/helpers';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';

type PosInvoiceRow = {
  name: string;
  customer?: string;
  customer_name?: string;
  grand_total?: number;
  posting_date?: string;
  is_return?: number;
  mode_of_payment?: string;
  pos_profile?: string;
};

/** تقارير من `REPORTS_CATALOG` — مجموعة «بيع» تسمح لها أدوار البيع في الكتالوج. */
const LINKS_SALES = [
  {
    href: '/reports?openReport=pos-transactions',
    title: 'سجل نقاط البيع',
    description: 'حركة فواتير نقطة البيع ضمن الفترة والشركة.',
    icon: ShoppingCart,
  },
  {
    href: '/reports?openReport=sales-by-product',
    title: 'مبيعات حسب المنتج',
    description: 'تفصيل المبيعات مع الأصناف (المبيعات اليومية §10.1).',
    icon: LayoutGrid,
  },
  {
    href: '/reports?openReport=sales-by-customer',
    title: 'مبيعات حسب العميل',
    description: 'تحليل المبيعات حسب العملاء في الفترة.',
    icon: Building2,
  },
  {
    href: '/reports?openReport=sales-by-rep',
    title: 'مبيعات حسب المندوب',
    description: 'أداء البيع حسب المندوب/المستخدم في الفترة.',
    icon: Users,
  },
  {
    href: '/reports?openReport=sales-profit',
    title: 'إجمالي الربح',
    description: 'هامش وربحية المبيعات في الفترة.',
    icon: BarChart3,
  },
] as const;

/** تقارير إضافية تتطلب صلاحيات محاسبة أو مخزون في الكتالوج — نفس مركز التقارير. */
const LINKS_EXTENDED = [
  {
    href: '/reports?openReport=payment-splits',
    title: 'دفتر المدفوعات',
    description: 'تفصيل المحصل حسب طريقة الدفع (محاسبة).',
    icon: CreditCard,
  },
  {
    href: '/reports?openReport=sales-register',
    title: 'سجل المبيعات (ضريبي)',
    description: 'سجل ضريبي للمراجعة (صلاحية محاسبة).',
    icon: Receipt,
  },
  {
    href: '/reports?openReport=stock-ledger',
    title: 'حركة المخزون',
    description: 'حركة الأصناف في الفترة (صلاحية مخزون).',
    icon: Package,
  },
] as const;

export default function PosReportsHubPage() {
  const today = new Date().toISOString().split('T')[0]!;
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0]!;
  });
  const [dateTo, setDateTo] = useState(today);

  // ── Fetch POS Invoices for summary stats ──
  const { data: invoicesData = [], isLoading: invoicesLoading } = useDocList<PosInvoiceRow>('POS Invoice', {
    fields: ['name', 'customer', 'customer_name', 'grand_total', 'posting_date', 'is_return', 'mode_of_payment', 'pos_profile'],
    filters: { docstatus: 1 },
    order_by: 'posting_date desc',
    limit: 500,
  });

  // ── Filter invoices by date range ──
  const filteredInvoices = useMemo(() => {
    let result = invoicesData;
    if (dateFrom) result = result.filter(r => r.posting_date && r.posting_date >= dateFrom);
    if (dateTo) result = result.filter(r => r.posting_date && r.posting_date <= dateTo);
    return result;
  }, [invoicesData, dateFrom, dateTo]);

  // ── Separate original and return invoices ──
  const originalInvoices = useMemo(() => filteredInvoices.filter(i => Number(i.is_return) === 0), [filteredInvoices]);
  const returnInvoices = useMemo(() => filteredInvoices.filter(i => Number(i.is_return) === 1), [filteredInvoices]);

  // ── KPIs ──
  const todayInvoices = originalInvoices.filter(i => i.posting_date === today);
  const todaySales = todayInvoices.reduce((s, i) => s + Number(i.grand_total ?? 0), 0);

  // This week (starting Saturday for Arabic week)
  const weekStart = new Date();
  const dayOfWeek = weekStart.getDay();
  const diff = dayOfWeek === 6 ? 0 : dayOfWeek + 1; // Saturday = 0 offset
  weekStart.setDate(weekStart.getDate() - diff);
  const weekStartStr = weekStart.toISOString().split('T')[0]!;
  const weekInvoices = originalInvoices.filter(i => i.posting_date && i.posting_date >= weekStartStr);
  const weekSales = weekInvoices.reduce((s, i) => s + Number(i.grand_total ?? 0), 0);

  // This month
  const monthStart = today.substring(0, 7) + '-01';
  const monthInvoices = originalInvoices.filter(i => i.posting_date && i.posting_date >= monthStart);
  const monthSales = monthInvoices.reduce((s, i) => s + Number(i.grand_total ?? 0), 0);

  // Average transaction value
  const avgTransaction = originalInvoices.length > 0
    ? originalInvoices.reduce((s, i) => s + Number(i.grand_total ?? 0), 0) / originalInvoices.length
    : 0;

  // ── Payment method breakdown ──
  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const inv of originalInvoices) {
      const mode = inv.mode_of_payment || 'غير محدد';
      const existing = map.get(mode) || { count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += Number(inv.grand_total ?? 0);
      map.set(mode, existing);
    }
    return Array.from(map.entries())
      .map(([mode, data]) => ({ mode, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [originalInvoices]);

  // ── Recent transactions (last 10) ──
  const recentTransactions = useMemo(() => {
    return originalInvoices.slice(0, 10);
  }, [originalInvoices]);

  // ── Top selling items summary (from invoice items) ──
  const totalReturnsAmount = returnInvoices.reduce((s, i) => s + Math.abs(Number(i.grand_total ?? 0)), 0);
  const netSales = monthSales - totalReturnsAmount;

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="تقارير نقاط البيع"
        description="اختصارات إلى نفس مركز التقارير العام مع تقارير مبيعات ومخزون ومدفوعات مناسبة لمراجعة الجلسات والأداء — يمكن ضبط الشركة والفترة بعد الانتقال."
        iconify="solar:chart-2-bold-duotone"
        accent="purple"
        breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'تقارير' }]}
      />

      {/* ── منتقي الفترة ── */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">من تاريخ</Label>
          <Input type="date" dir="ltr" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">إلى تاريخ</Label>
          <Input type="date" dir="ltr" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {invoicesLoading ? 'جاري التحميل...' : `${filteredInvoices.length} فترة فاتورة`}
        </div>
      </div>

      {/* ── شريط مؤشرات الأداء ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="مبيعات اليوم"
          value={formatCurrency(todaySales)}
          icon={TrendingUp}
          accent="success"
          description={`${todayInvoices.length} فاتورة اليوم`}
        />
        <KpiCard
          title="مبيعات الأسبوع"
          value={formatCurrency(weekSales)}
          icon={BarChart3}
          accent="primary"
          description={`${weekInvoices.length} فاتورة هذا الأسبوع`}
        />
        <KpiCard
          title="مبيعات الشهر"
          value={formatCurrency(monthSales)}
          icon={ShoppingCart}
          accent="info"
          description={`${monthInvoices.length} فاتورة هذا الشهر`}
        />
        <KpiCard
          title="متوسط قيمة الفاتورة"
          value={formatCurrency(avgTransaction)}
          icon={Receipt}
          accent="warning"
          description="متوسط مبلغ الفاتورة في الفترة"
        />
      </KpiStrip>

      {/* ── ملخص سريع ببطاقات ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* صافي المبيعات */}
        <PageShell className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold">صافي المبيعات</h3>
            </div>
            <Link href="/reports?openReport=pos-transactions" className="text-[10px] text-primary hover:underline">التقرير ←</Link>
          </div>
          <p className="text-xl font-bold tabular-nums text-success">{formatCurrency(netSales)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">مبيعات الشهر مطروح منها المرتجعات ({formatCurrency(totalReturnsAmount)})</p>
        </PageShell>

        {/* توزيع المدفوعات */}
        <PageShell className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <CreditCard className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold">طرق الدفع</h3>
            </div>
            <Link href="/reports?openReport=payment-splits" className="text-[10px] text-primary hover:underline">التقرير ←</Link>
          </div>
          {paymentBreakdown.length > 0 ? (
            <div className="space-y-2 mt-2">
              {paymentBreakdown.slice(0, 4).map(pb => (
                <div key={pb.mode} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{pb.mode}</span>
                  <span className="font-medium tabular-nums">{formatCurrency(pb.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">لا توجد بيانات في الفترة المحددة</p>
          )}
        </PageShell>

        {/* إحصائيات المرتجعات */}
        <PageShell className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <Receipt className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold">المرتجعات</h3>
            </div>
            <Link href="/pos/returns" className="text-[10px] text-primary hover:underline">التفاصيل ←</Link>
          </div>
          <p className="text-xl font-bold tabular-nums text-destructive">{formatCurrency(totalReturnsAmount)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{returnInvoices.length} فاتورة مرتجع في الفترة</p>
        </PageShell>
      </div>

      {/* ── آخر المعاملات ── */}
      <PageShell className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">آخر المعاملات</h3>
          </div>
          <Link href="/reports?openReport=pos-transactions" className="text-[10px] text-primary hover:underline flex items-center gap-1">
            عرض الكل
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {recentTransactions.length > 0 ? (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {recentTransactions.map(inv => (
              <div key={inv.name} className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/10 px-3 py-2 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Receipt className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium font-mono truncate">{inv.name}</p>
                    <p className="text-[10px] text-muted-foreground">{inv.customer_name || '—'} • {inv.posting_date || '—'}</p>
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-xs font-semibold tabular-nums">{formatCurrency(Number(inv.grand_total ?? 0))}</p>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-0 bg-info/10 text-info">
                    {inv.mode_of_payment || '—'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">
            {invoicesLoading ? 'جاري تحميل البيانات...' : 'لا توجد معاملات في الفترة المحددة'}
          </p>
        )}
      </PageShell>

      {/* ── ربط مركز التقارير ── */}
      <Card className="border-primary/15 bg-primary/[0.03]">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md-ui)] bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold">مركز التقارير الكامل</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                جميع التقارير المتاحة حسب صلاحياتك في النظام.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" className="shrink-0">
            <Link href="/reports">فتح مركز التقارير</Link>
          </Button>
        </CardContent>
      </Card>

      {/* ── تقارير المبيعات ونقطة البيع ── */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">مبيعات ونقطة البيع</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {LINKS_SALES.map(({ href, title, description, icon: Icon }) => (
            <ReportTile key={href} href={href} title={title} description={description} Icon={Icon} />
          ))}
        </div>
      </div>

      {/* ── تقارير المحاسبة والمخزون ── */}
      <div className="space-y-2 pt-2">
        <h2 className="text-sm font-semibold text-muted-foreground">محاسبة ومخزون (حسب الصلاحية)</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS_EXTENDED.map(({ href, title, description, icon: Icon }) => (
            <ReportTile key={href} href={href} title={title} description={description} Icon={Icon} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportTile({
  href,
  title,
  description,
  Icon,
}: {
  href: string;
  title: string;
  description: string;
  Icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-[var(--radius-md-ui)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full border-border/60 bg-card transition-colors hover:border-border hover:bg-muted/30">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md-ui)] bg-primary/8 text-primary ring-1 ring-border/50">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base font-semibold leading-snug group-hover:text-primary transition-colors">
              {title}
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <span className="text-xs font-medium text-primary/90 group-hover:underline">تشغيل التقرير ←</span>
        </CardContent>
      </Card>
    </Link>
  );
}
