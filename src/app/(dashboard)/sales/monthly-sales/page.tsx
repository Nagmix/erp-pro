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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Line,
  LineChart,
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
  ReferenceLine,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { PageHeader } from '@/components/erp/page-header';
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
  ArrowLeftRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Percent,
  Wallet,
  Banknote,
  Clock,
  UserCheck,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { CHART_PALETTE } from '@/lib/core/helpers';

/* ──────────────────── types ──────────────────── */
interface MonthlySalesData {
  month: string;
  fromDate: string;
  toDate: string;
  summary: {
    totalSales: number;
    totalReturns: number;
    netSales: number;
    totalCollected: number;
    outstanding: number;
    growthPercent: number;
    invoiceCount: number;
    returnCount: number;
  };
  dailyTrend: { date: string; amount: number }[];
  weeklyComparison: { week: number; total: number }[];
  categorySales: { category: string; amount: number }[];
  topCustomers: { code: string; name: string; total: number }[];
  topProducts: { code: string; name: string; revenue: number; qty: number }[];
  salesByRep: { name: string; count: number; total: number; commissionPreview: number }[];
  previousMonth: {
    month: string;
    netSales: number;
    dailyTrend: { date: string; amount: number }[];
  };
}

/* ──────────────────── helpers ──────────────────── */
function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDay(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}`;
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

// PIE_COLORS removed — using CHART_PALETTE.pie from helpers

const dailyChartConfig: ChartConfig = {
  amount: { label: 'مبيعات الشهر الحالي', color: 'hsl(var(--chart-1))' },
  prevAmount: { label: 'مبيعات الشهر السابق', color: 'hsl(var(--chart-5))' },
};

const weeklyChartConfig: ChartConfig = {
  total: { label: 'إجمالي الأسبوع', color: 'hsl(var(--chart-2))' },
};

const categoryChartConfig: ChartConfig = {
  amount: { label: 'المبيعات', color: 'hsl(var(--chart-1))' },
};

/* ─── Year options ─── */
function getYearOptions(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current - 3; y <= current + 1; y++) {
    years.push(y);
  }
  return years;
}

/* ──────────────────── component ──────────────────── */
export default function MonthlySalesReportPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<MonthlySalesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productSort, setProductSort] = useState<'revenue' | 'qty'>('revenue');
  const [productSortDir, setProductSortDir] = useState<'asc' | 'desc'>('desc');
  const { company } = useDefaultCompanyName();

  const monthKey = useMemo(
    () => `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
    [selectedYear, selectedMonth]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ month: monthKey });
      if (company) params.set('company', company);
      const res = await fetch(`/api/erpnext/monthly-sales?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'فشل تحميل البيانات');
      setData(json.data);
    } catch (err) {
      setError((err as Error).message);
      toast.error('فشل تحميل تقرير المبيعات الشهرية');
    } finally {
      setLoading(false);
    }
  }, [monthKey, company]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── navigation ─── */
  const goToPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const goToCurrentMonth = () => {
    const n = new Date();
    setSelectedYear(n.getFullYear());
    setSelectedMonth(n.getMonth() + 1);
  };

  /* ─── combined daily chart data with previous month overlay ─── */
  const combinedDailyData = useMemo(() => {
    if (!data) return [];
    const current = data.dailyTrend;
    const prev = data.previousMonth.dailyTrend;
    const maxLen = Math.max(current.length, prev.length);
    const result: { day: string; amount: number; prevAmount: number }[] = [];
    for (let i = 0; i < maxLen; i++) {
      result.push({
        day: String(i + 1),
        amount: current[i]?.amount || 0,
        prevAmount: prev[i]?.amount || 0,
      });
    }
    return result;
  }, [data]);

  /* ─── sorting products ─── */
  const sortedProducts = useMemo(() => {
    if (!data?.topProducts) return [];
    return [...data.topProducts].sort((a, b) => {
      const av = productSort === 'revenue' ? a.revenue : a.qty;
      const bv = productSort === 'revenue' ? b.revenue : b.qty;
      return productSortDir === 'desc' ? bv - av : av - bv;
    });
  }, [data?.topProducts, productSort, productSortDir]);

  const toggleProductSort = (field: 'revenue' | 'qty') => {
    if (productSort === field) {
      setProductSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setProductSort(field);
      setProductSortDir('desc');
    }
  };

  /* ─── export data ─── */
  const exportRows = useMemo(() => {
    if (!data) return [];
    return data.dailyTrend.map((d) => ({
      'التاريخ': d.date,
      'المبيعات': d.amount,
    }));
  }, [data]);

  const exportCols = [
    { key: 'التاريخ', header: 'التاريخ' },
    { key: 'المبيعات', header: 'المبيعات' },
  ];

  const handlePrint = () => window.print();

  const summary = data?.summary;
  const monthLabel = `${ARABIC_MONTHS[selectedMonth - 1]} ${selectedYear}`;

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="تقرير المبيعات الشهرية"
        description={`تحليل تفصيلي لمبيعات شهر ${monthLabel}`}
        iconify="solar:chart-bold-duotone"
        accent="primary"
        breadcrumbs={[
          { label: 'المبيعات', href: '/sales' },
          { label: 'التقارير', href: '/sales/reports' },
          { label: 'المبيعات الشهرية' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={fetchData} disabled={loading}>
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
                filename={`تقرير-المبيعات-الشهرية-${monthKey}`}
                columns={exportCols}
              />
            )}
          </div>
        }
      />

      {/* ─── Month/Year selector ─── */}
      <Card className="border-border/40">
        <CardContent className="flex flex-wrap items-end gap-4 py-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">السنة</label>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="h-9 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getYearOptions().map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">الشهر</label>
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARABIC_MONTHS.map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPrevMonth} className="gap-1">
              <ChevronRight className="h-3.5 w-3.5" />
              الشهر السابق
            </Button>
            <Button variant="outline" size="sm" onClick={goToCurrentMonth}>
              الشهر الحالي
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextMonth} className="gap-1">
              الشهر التالي
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Error ─── */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          جاري تحميل بيانات المبيعات الشهرية...
        </div>
      )}

      {data && !loading && (
        <>
          {/* ─── Summary KPI cards ─── */}
          {/* ─── Daily trend chart with previous month ─── */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-primary" />
                الاتجاه اليومي للمبيعات — مقارنة مع الشهر السابق
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={dailyChartConfig} className="h-[320px] w-full">
                <LineChart data={combinedDailyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} />
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
                          <p className="text-xs font-medium text-muted-foreground">اليوم {label}</p>
                          {payload.map((p, i) => (
                            <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
                              {p.name === 'amount' ? 'الحالي' : 'السابق'}: {fmt(p.value as number)} ر.ي
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend
                    content={({ payload }) => (
                      <div className="flex items-center justify-center gap-4 pt-2">
                        {payload?.map((entry, index) => (
                          <div key={index} className="flex items-center gap-1.5 text-xs">
                            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                            <span className="text-muted-foreground">{entry.value === 'amount' ? 'الشهر الحالي' : 'الشهر السابق'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke={CHART_PALETTE.primary}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="prevAmount"
                    stroke={CHART_PALETTE.quinary}
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* ─── Week over week + Category breakdown ─── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Weekly comparison */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-chart-5" />
                  مقارنة أسبوعية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={weeklyChartConfig} className="h-[280px] w-full">
                  <BarChart data={data.weeklyComparison} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="week"
                      tickFormatter={(v: number) => `الأسبوع ${v}`}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      formatter={(value: number) => `${fmt(value)} ر.ي`}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={50}>
                      {data.weeklyComparison.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_PALETTE.pie[index % CHART_PALETTE.pie.length]} opacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Category breakdown */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChartIcon className="h-4 w-4 text-chart-2" />
                  المبيعات حسب الفئة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={categoryChartConfig} className="h-[220px] w-full">
                  <PieChart>
                    <Pie
                      data={data.categorySales}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {data.categorySales.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_PALETTE.pie[index % CHART_PALETTE.pie.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number) => `${fmt(value)} ر.ي`}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                  {data.categorySales.map((cat, idx) => {
                    const total = data.categorySales.reduce((s, c) => s + c.amount, 0) || 1;
                    const pct = ((cat.amount / total) * 100).toFixed(1);
                    return (
                      <div key={cat.category} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-sm"
                            style={{ backgroundColor: CHART_PALETTE.pie[idx % CHART_PALETTE.pie.length] }}
                          />
                          <span className="text-muted-foreground">{cat.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">({pct}%)</span>
                          <span className="font-medium tabular-nums">{fmt(cat.amount)} ر.ي</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Top 10 Customers ─── */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-chart-1" />
                أكثر 10 عملاء من حيث المبيعات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>الكود</TableHead>
                      <TableHead>إجمالي المبيعات</TableHead>
                      <TableHead>النسبة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topCustomers.map((cust, idx) => {
                      const total = data.topCustomers.reduce((s, c) => s + c.total, 0) || 1;
                      const pct = ((cust.total / total) * 100).toFixed(1);
                      return (
                        <TableRow key={cust.code}>
                          <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{cust.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{cust.code}</TableCell>
                          <TableCell className="tabular-nums font-medium">{fmt(cust.total)} ر.ي</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 rounded-full bg-muted">
                                <div
                                  className="h-2 rounded-full bg-chart-1"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{pct}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* ─── Top 10 Products ─── */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-chart-2" />
                أكثر 10 منتجات من حيث الإيرادات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>المنتج</TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleProductSort('qty')}
                      >
                        <div className="flex items-center gap-1">
                          الكمية
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleProductSort('revenue')}
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
                        <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.code}</p>
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">{product.qty.toFixed(2)}</TableCell>
                        <TableCell className="tabular-nums font-medium">{fmt(product.revenue)} ر.ي</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* ─── Sales by rep with commission ─── */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-4 w-4 text-chart-1" />
                المبيعات حسب المندوب — معاينة العمولة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>المندوب</TableHead>
                      <TableHead>عدد الفواتير</TableHead>
                      <TableHead>إجمالي المبيعات</TableHead>
                      <TableHead>معاينة العمولة (5%)</TableHead>
                      <TableHead>الحصة السوقية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.salesByRep.map((rep, idx) => {
                      const totalRepSales = data.salesByRep.reduce((s, r) => s + r.total, 0) || 1;
                      const share = ((rep.total / totalRepSales) * 100).toFixed(1);
                      return (
                        <TableRow key={rep.name}>
                          <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{rep.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{rep.count}</Badge>
                          </TableCell>
                          <TableCell className="tabular-nums font-medium">{fmt(rep.total)} ر.ي</TableCell>
                          <TableCell className="tabular-nums text-chart-1 dark:text-indigo-400">
                            {fmt(rep.commissionPreview)} ر.ي
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 rounded-full bg-muted">
                                <div
                                  className="h-2 rounded-full bg-chart-1"
                                  style={{ width: `${share}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{share}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {data.salesByRep.length > 0 && (
                      <TableRow className="bg-muted/30 font-semibold">
                        <TableCell colSpan={2} className="text-center">الإجمالي</TableCell>
                        <TableCell>
                          {data.salesByRep.reduce((s, r) => s + r.count, 0)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {fmt(data.salesByRep.reduce((s, r) => s + r.total, 0))} ر.ي
                        </TableCell>
                        <TableCell className="tabular-nums text-chart-1 dark:text-indigo-400">
                          {fmt(data.salesByRep.reduce((s, r) => s + r.commissionPreview, 0))} ر.ي
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* ─── Comparison with previous month ─── */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                مقارنة مع الشهر السابق ({data.previousMonth.month})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-primary">صافي مبيعات الشهر الحالي</p>
                  <p className="mt-1 text-xl font-bold text-primary tabular-nums">
                    {fmt(summary?.netSales || 0)} ر.ي
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700/40 dark:bg-slate-900/20">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-400">صافي مبيعات الشهر السابق</p>
                  <p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-300 tabular-nums">
                    {fmt(data.previousMonth.netSales)} ر.ي
                  </p>
                </div>
                <div className={`rounded-lg border p-4 ${
                  (summary?.growthPercent || 0) >= 0
                    ? 'border-primary/20 bg-primary/5'
                    : 'border-destructive/20 bg-destructive/5'
                }`}>
                  <p className={`text-xs font-medium ${
                    (summary?.growthPercent || 0) >= 0
                      ? 'text-primary'
                      : 'text-destructive'
                  }`}>
                    الفرق
                  </p>
                  <p className={`mt-1 text-xl font-bold tabular-nums ${
                    (summary?.growthPercent || 0) >= 0
                      ? 'text-primary'
                      : 'text-destructive'
                  }`}>
                    {(summary?.growthPercent || 0) >= 0 ? '+' : ''}{(summary?.growthPercent || 0).toFixed(1)}%
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {fmt(Math.abs((summary?.netSales || 0) - data.previousMonth.netSales))} ر.ي
                    {(summary?.growthPercent || 0) >= 0 ? ' زيادة' : ' نقصان'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!data && !loading && !error && (
        <div className="rounded-lg border border-dashed border-border/60 p-10 text-center">
          <BarChart3 className="mx-auto h-9 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">اختر شهراً لعرض تقرير المبيعات الشهرية</p>
        </div>
      )}
    </div>
  );
}
