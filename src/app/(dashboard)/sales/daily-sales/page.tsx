'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { DatePicker } from '@/components/ui/date-picker';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { ExportButton } from '@/components/erp/export-button';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Receipt,
  Users,
  Package,
  RefreshCw,
  ArrowUpDown,
  Printer,
  BarChart3,
  PieChart as PieChartIcon,
  Clock,
  Wallet,
  Banknote,
  ArrowLeftRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { CHART_PALETTE } from '@/lib/core/helpers';

/* ──────────────────── types ──────────────────── */
interface DailySalesData {
  date: string;
  summary: {
    totalSales: number;
    totalReturns: number;
    netSales: number;
    totalCashReceived: number;
    totalCredit: number;
    avgInvoiceValue: number;
    invoiceCount: number;
    returnCount: number;
  };
  hourlyData: { hour: number; amount: number }[];
  paymentMethods: { method: string; amount: number }[];
  topProducts: { code: string; name: string; qty: number; revenue: number; group: string }[];
  salesByRep: { name: string; count: number; total: number }[];
  invoices: {
    name: string;
    customer: string;
    total: number;
    isReturn: boolean;
    outstanding: number;
    time: string;
    owner: string;
  }[];
}

/* ──────────────────── helpers ──────────────────── */
function fmt(n: number): string {
  return n.toLocaleString('ar-YE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

// PIE_COLORS removed — using CHART_PALETTE.pie from helpers

const hourlyChartConfig: ChartConfig = {
  amount: { label: 'المبيعات', color: 'hsl(var(--chart-1))' },
};

const paymentChartConfig: ChartConfig = {
  amount: { label: 'المبلغ', color: 'hsl(var(--chart-1))' },
  نقدي: { label: 'نقدي', color: 'hsl(var(--chart-1))' },
  بطاقة: { label: 'بطاقة', color: 'hsl(var(--chart-2))' },
  تحويل: { label: 'تحويل', color: 'hsl(var(--chart-3))' },
  شيك: { label: 'شيك', color: 'hsl(var(--chart-4))' },
  أخرى: { label: 'أخرى', color: 'hsl(var(--chart-5))' },
};

/* ──────────────────── component ──────────────────── */
export default function DailySalesReportPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [data, setData] = useState<DailySalesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'revenue' | 'qty'>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const { company } = useDefaultCompanyName();

  const fetchData = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date });
      if (company) params.set('company', company);
      const res = await fetch(`/api/erpnext/daily-sales?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'فشل تحميل البيانات');
      setData(json.data);
    } catch (err) {
      setError((err as Error).message);
      toast.error('فشل تحميل تقرير المبيعات اليومية');
    } finally {
      setLoading(false);
    }
  }, [date, company]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ──── sorting products ──── */
  const sortedProducts = useMemo(() => {
    if (!data?.topProducts) return [];
    return [...data.topProducts].sort((a, b) => {
      const av = sortField === 'revenue' ? a.revenue : a.qty;
      const bv = sortField === 'revenue' ? b.revenue : b.qty;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [data?.topProducts, sortField, sortDir]);

  const toggleSort = (field: 'revenue' | 'qty') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  /* ──── export data ──── */
  const exportRows = useMemo(() => {
    if (!data) return [];
    return data.invoices.map((inv) => ({
      'رقم الفاتورة': inv.name,
      'العميل': inv.customer,
      'المبلغ': inv.total,
      'نوع': inv.isReturn ? 'مرتجع' : 'بيع',
      'المستحق': inv.outstanding,
      'الوقت': inv.time,
      'المستخدم': inv.owner,
    }));
  }, [data]);

  const exportCols = [
    { key: 'رقم الفاتورة', header: 'رقم الفاتورة' },
    { key: 'العميل', header: 'العميل' },
    { key: 'المبلغ', header: 'المبلغ' },
    { key: 'نوع', header: 'نوع' },
    { key: 'المستحق', header: 'المستحق' },
    { key: 'الوقت', header: 'الوقت' },
    { key: 'المستخدم', header: 'المستخدم' },
  ];

  /* ──── print handler ──── */
  const handlePrint = () => {
    window.print();
  };

  const summary = data?.summary;

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="تقرير المبيعات اليومية"
        description={`تحليل تفصيلي للمبيعات ليوم ${date}`}
        iconify="solar:chart-bold-duotone"
        accent="success"
        breadcrumbs={[
          { label: 'المبيعات', href: '/sales' },
          { label: 'التقارير', href: '/sales/reports' },
          { label: 'المبيعات اليومية' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" />
              طباعة
            </Button>
            {data && (
              <ExportButton
                data={exportRows}
                filename={`تقرير-المبيعات-اليومية-${date}`}
                columns={exportCols}
              />
            )}
          </div>
        }
      />

      {/* ─── Date picker card ─── */}
      <Card className="border-border/40">
        <CardContent className="flex flex-wrap items-end gap-4 py-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">تاريخ التقرير</label>
            <div className="w-52">
              <DatePicker
                value={date}
                onChange={(v) => setDate(v)}
                placeholder="اختر التاريخ"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                const d = new Date(date);
                d.setDate(d.getDate() - 1);
                setDate(d.toISOString().slice(0, 10));
              }}
            >
              ← اليوم السابق
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setDate(today)}
            >
              اليوم
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                const d = new Date(date);
                d.setDate(d.getDate() + 1);
                setDate(d.toISOString().slice(0, 10));
              }}
            >
              اليوم التالي →
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Error state ─── */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ─── Loading ─── */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          جاري تحميل بيانات المبيعات...
        </div>
      )}

      {data && !loading && (
        <>
          {/* ─── Summary KPI cards ─── */}
          <KpiStrip cols={6}>
            <KpiCard
              title="إجمالي المبيعات"
              value={`${fmt(summary?.totalSales || 0)} ر.ي`}
              icon={TrendingUp}
              accent="success"
              description={`${summary?.invoiceCount || 0} فاتورة`}
            />
            <KpiCard
              title="إجمالي المرتجعات"
              value={`${fmt(summary?.totalReturns || 0)} ر.ي`}
              icon={TrendingDown}
              accent="destructive"
              description={`${summary?.returnCount || 0} فاتورة مرتجع`}
            />
            <KpiCard
              title="صافي المبيعات"
              value={`${fmt(summary?.netSales || 0)} ر.ي`}
              icon={DollarSign}
              accent="primary"
            />
            <KpiCard
              title="إجمالي النقدي المحصّل"
              value={`${fmt(summary?.totalCashReceived || 0)} ر.ي`}
              icon={Banknote}
              accent="success"
            />
            <KpiCard
              title="إجمالي الآجل"
              value={`${fmt(summary?.totalCredit || 0)} ر.ي`}
              icon={CreditCard}
              accent="warning"
            />
            <KpiCard
              title="متوسط قيمة الفاتورة"
              value={`${fmt(summary?.avgInvoiceValue || 0)} ر.ي`}
              icon={Receipt}
              accent="info"
            />
          </KpiStrip>

          {/* ─── Charts row ─── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Hourly sales chart */}
            <Card className="border-border/40 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-primary" />
                  المبيعات حسب الساعة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={hourlyChartConfig} className="h-[300px] w-full">
                  <BarChart data={data.hourlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={fmtHour}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
                            <p className="text-xs font-medium text-muted-foreground">
                              الساعة {fmtHour(label as number)}
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                              {fmt(payload[0]?.value as number)} ر.ي
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {data.hourlyData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.amount > 0 ? CHART_PALETTE.primary : 'hsl(var(--muted))'}
                          opacity={entry.amount > 0 ? 0.85 : 0.4}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Payment method breakdown */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="h-4 w-4 text-chart-5" />
                  طرق الدفع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={paymentChartConfig} className="h-[220px] w-full">
                  <PieChart>
                    <Pie
                      data={data.paymentMethods}
                      dataKey="amount"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {data.paymentMethods.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_PALETTE.pie[index % CHART_PALETTE.pie.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number) => `${fmt(value)} ر.ي`}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="mt-3 space-y-2">
                  {data.paymentMethods.map((pm, idx) => (
                    <div key={pm.method} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-sm"
                          style={{ backgroundColor: CHART_PALETTE.pie[idx % CHART_PALETTE.pie.length] }}
                        />
                        <span className="text-muted-foreground">{pm.method}</span>
                      </div>
                      <span className="font-medium tabular-nums">{fmt(pm.amount)} ر.ي</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Top selling products ─── */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-chart-2" />
                أكثر المنتجات مبيعاً
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>المنتج</TableHead>
                      <TableHead>المجموعة</TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleSort('qty')}
                      >
                        <div className="flex items-center gap-1">
                          الكمية
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleSort('revenue')}
                      >
                        <div className="flex items-center gap-1">
                          الإيرادات
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProducts.map((product, idx) => (
                      <TableRow key={product.code}>
                        <TableCell className="text-center text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.code}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {product.group}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">{product.qty.toFixed(2)}</TableCell>
                        <TableCell className="tabular-nums font-medium">
                          {fmt(product.revenue)} ر.ي
                        </TableCell>
                      </TableRow>
                    ))}
                    {sortedProducts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          لا توجد منتجات للبيع في هذا اليوم
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* ─── Sales by rep ─── */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-chart-1" />
                المبيعات حسب مندوب المبيعات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.salesByRep.length > 0 ? (
                <div className="space-y-3">
                  {data.salesByRep.map((rep, idx) => {
                    const maxTotal = data.salesByRep[0]?.total || 1;
                    const pct = (rep.total / maxTotal) * 100;
                    return (
                      <div key={rep.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{idx + 1}.</span>
                            <span className="font-medium">{rep.name}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {rep.count} فاتورة
                            </Badge>
                          </div>
                          <span className="font-medium tabular-nums">{fmt(rep.total)} ر.ي</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-chart-3 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-6">
                  لا توجد بيانات مندوبين
                </p>
              )}
            </CardContent>
          </Card>

          {/* ─── Invoice list ─── */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4 text-primary" />
                قائمة الفواتير — {date}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>المستحق</TableHead>
                      <TableHead>الوقت</TableHead>
                      <TableHead>المستخدم</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.invoices.map((inv) => (
                      <TableRow key={inv.name} className={inv.isReturn ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium">{inv.name}</TableCell>
                        <TableCell>{inv.customer}</TableCell>
                        <TableCell>
                          <Badge
                            variant={inv.isReturn ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            {inv.isReturn ? 'مرتجع' : 'بيع'}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums font-medium">
                          {fmt(inv.total)} ر.ي
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {inv.outstanding > 0 ? (
                            <span className="text-chart-2">{fmt(inv.outstanding)} ر.ي</span>
                          ) : (
                            <span className="text-primary">مسددة</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{inv.time?.slice(0, 5)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{inv.owner}</TableCell>
                      </TableRow>
                    ))}
                    {data.invoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          لا توجد فواتير في هذا اليوم
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* ─── Cash vs Credit summary ─── */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowLeftRight className="h-4 w-4 text-chart-1" />
                ملخص النقدي والآجل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-primary">النقدي المحصّل</p>
                  <p className="mt-1 text-xl font-bold text-primary tabular-nums">
                    {fmt(summary?.totalCashReceived || 0)} ر.ي
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {summary?.netSales ? ((summary.totalCashReceived / summary.netSales) * 100).toFixed(1) : 0}% من صافي المبيعات
                  </p>
                </div>
                <div className="rounded-lg border border-chart-2/20 bg-chart-2/5 p-4">
                  <p className="text-xs font-medium text-chart-2">الآجل</p>
                  <p className="mt-1 text-xl font-bold text-chart-2 tabular-nums">
                    {fmt(summary?.totalCredit || 0)} ر.ي
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {summary?.netSales ? ((summary.totalCredit / summary.netSales) * 100).toFixed(1) : 0}% من صافي المبيعات
                  </p>
                </div>
                <div className="rounded-lg border border-chart-1/20 bg-chart-1/5 p-4">
                  <p className="text-xs font-medium text-chart-1">صافي المبيعات</p>
                  <p className="mt-1 text-xl font-bold text-chart-1 tabular-nums">
                    {fmt(summary?.netSales || 0)} ر.ي
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    إجمالي الفواتير مطروحاً منه المرتجعات
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ─── Empty state ─── */}
      {!data && !loading && !error && (
        <div className="rounded-lg border border-dashed border-border/60 p-10 text-center">
          <BarChart3 className="mx-auto h-9 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">اختر تاريخاً لعرض تقرير المبيعات اليومية</p>
        </div>
      )}
    </div>
  );
}
