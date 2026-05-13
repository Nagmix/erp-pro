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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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
  TableFooter,
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
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { PageHeader } from '@/components/erp/page-header';
import { ExportButton } from '@/components/erp/export-button';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  RefreshCw,
  ArrowUpDown,
  Printer,
  BarChart3,
  PieChart as PieChartIcon,
  Percent,
  Filter,
  Layers,
  Calculator,
  ArrowRightLeft,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { CHART_PALETTE } from '@/lib/core/helpers';

/* ──────────────────── types ──────────────────── */
interface ProductProfitRow {
  code: string;
  name: string;
  category: string;
  qtySold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  avgSellingPrice: number;
}

interface ProductProfitsData {
  fromDate: string;
  toDate: string;
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    avgMargin: number;
    productCount: number;
  };
  products: ProductProfitRow[];
  categoryProfit: { category: string; revenue: number; cost: number; profit: number }[];
  marginDistribution: { range: string; count: number }[];
  categories: string[];
}

/* ──────────────────── helpers ──────────────────── */
function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// PIE_COLORS removed — using CHART_PALETTE.pie from helpers

const categoryChartConfig: ChartConfig = {
  profit: { label: 'الربح', color: 'hsl(var(--chart-1))' },
  revenue: { label: 'الإيرادات', color: 'hsl(var(--chart-3))' },
  cost: { label: 'التكلفة', color: 'hsl(var(--chart-4))' },
};

const marginChartConfig: ChartConfig = {
  count: { label: 'عدد المنتجات', color: 'hsl(var(--chart-2))' },
};

/* ──────────────────── component ──────────────────── */
export default function ProductProfitsReportPage() {
  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().slice(0, 10);

  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({
    from: startOfMonth,
    to: today,
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('__all__');
  const [marginRange, setMarginRange] = useState<[number, number]>([-100, 100]);
  const [data, setData] = useState<ProductProfitsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'profit' | 'margin' | 'revenue' | 'qtySold'>('profit');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const { company } = useDefaultCompanyName();

  const fetchData = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) {
      toast.error('يرجى اختيار فترة التاريخ');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        from_date: dateRange.from,
        to_date: dateRange.to,
      });
      if (company) params.set('company', company);
      if (selectedCategory && selectedCategory !== '__all__') {
        params.set('category', selectedCategory);
      }
      const res = await fetch(`/api/erpnext/product-profits?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'فشل تحميل البيانات');
      setData(json.data);
    } catch (err) {
      setError((err as Error).message);
      toast.error('فشل تحميل تقرير أرباح المنتجات');
    } finally {
      setLoading(false);
    }
  }, [dateRange, company, selectedCategory]);

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchData();
    }
  }, [fetchData]);

  /* ─── filtered & sorted products ─── */
  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];
    return data.products
      .filter((p) => {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          if (
            !p.name.toLowerCase().includes(term) &&
            !p.code.toLowerCase().includes(term) &&
            !p.category.toLowerCase().includes(term)
          ) {
            return false;
          }
        }
        if (p.margin < marginRange[0] || p.margin > marginRange[1]) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const av = a[sortField];
        const bv = b[sortField];
        return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number);
      });
  }, [data?.products, searchTerm, marginRange, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  /* ─── summary row ─── */
  const totalsRow = useMemo(() => {
    const rows = filteredProducts;
    return {
      qtySold: rows.reduce((s, p) => s + p.qtySold, 0),
      revenue: rows.reduce((s, p) => s + p.revenue, 0),
      cost: rows.reduce((s, p) => s + p.cost, 0),
      profit: rows.reduce((s, p) => s + p.profit, 0),
      margin: rows.length > 0
        ? rows.reduce((s, p) => s + p.margin, 0) / rows.length
        : 0,
    };
  }, [filteredProducts]);

  /* ─── export data ─── */
  const exportRows = useMemo(() => {
    return filteredProducts.map((p) => ({
      'المنتج': p.name,
      'الكود': p.code,
      'الفئة': p.category,
      'الكمية المباعة': p.qtySold.toFixed(2),
      'الإيرادات': p.revenue.toFixed(2),
      'التكلفة': p.cost.toFixed(2),
      'الربح': p.profit.toFixed(2),
      'هامش الربح %': p.margin.toFixed(2),
      'متوسط سعر البيع': p.avgSellingPrice.toFixed(2),
    }));
  }, [filteredProducts]);

  const exportCols = [
    { key: 'المنتج', header: 'المنتج' },
    { key: 'الكود', header: 'الكود' },
    { key: 'الفئة', header: 'الفئة' },
    { key: 'الكمية المباعة', header: 'الكمية المباعة' },
    { key: 'الإيرادات', header: 'الإيرادات' },
    { key: 'التكلفة', header: 'التكلفة' },
    { key: 'الربح', header: 'الربح' },
    { key: 'هامش الربح %', header: 'هامش الربح %' },
    { key: 'متوسط سعر البيع', header: 'متوسط سعر البيع' },
  ];

  const handlePrint = () => window.print();
  const summary = data?.summary;

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="تقرير أرباح المنتجات"
        description="تحليل الربحية حسب المنتج والفئة مع تفاصيل الهوامش والتكاليف"
        iconify="solar:chart-bold-duotone"
        accent="warning"
        breadcrumbs={[
          { label: 'المبيعات', href: '/sales' },
          { label: 'التقارير', href: '/sales/reports' },
          { label: 'أرباح المنتجات' },
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
            <ExportButton
              data={exportRows}
              filename={`تقرير-أرباح-المنتجات-${dateRange.from}-${dateRange.to}`}
              columns={exportCols}
            />
          </div>
        }
      />

      {/* ─── Filters card ─── */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-chart-2" />
            معايير التقرير
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">فترة التاريخ</Label>
            <div className="w-72">
              <DateRangePicker
                value={dateRange}
                onChange={(v) => setDateRange(v)}
                placeholder="اختر الفترة"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">الفئة</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">جميع الفئات</SelectItem>
                {data?.categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              نطاق الهامش: {marginRange[0]}% — {marginRange[1]}%
            </Label>
            <div className="w-56 pt-2">
              <Slider
                value={marginRange}
                onValueChange={(v) => setMarginRange(v as [number, number])}
                min={-100}
                max={100}
                step={5}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">بحث</Label>
            <div className="relative">
              <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الكود..."
                className="h-9 w-52 pe-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
          جاري تحميل بيانات أرباح المنتجات...
        </div>
      )}

      {data && !loading && (
        <>
          {/* ─── Stats KPI cards ─── */}
          {/* ─── Charts row ─── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Profit by category */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4 text-primary" />
                  الربح حسب الفئة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={categoryChartConfig} className="h-[320px] w-full">
                  <BarChart
                    data={data.categoryProfit}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      width={80}
                    />
                    <RechartsTooltip
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          profit: 'الربح',
                          revenue: 'الإيرادات',
                          cost: 'التكلفة',
                        };
                        return [`${fmt(value)} ر.ي`, labels[name] || name];
                      }}
                    />
                    <Legend
                      content={({ payload }) => (
                        <div className="flex items-center justify-center gap-4 pt-2">
                          {payload?.map((entry, index) => (
                            <div key={index} className="flex items-center gap-1.5 text-xs">
                              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                              <span className="text-muted-foreground">
                                {entry.value === 'profit' ? 'الربح' : entry.value === 'revenue' ? 'الإيرادات' : 'التكلفة'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                    <Bar dataKey="revenue" fill={CHART_PALETTE.tertiary} opacity={0.6} maxBarSize={20} />
                    <Bar dataKey="cost" fill={CHART_PALETTE.quaternary} opacity={0.6} maxBarSize={20} />
                    <Bar dataKey="profit" fill={CHART_PALETTE.primary} opacity={0.9} maxBarSize={20} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Margin distribution */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChartIcon className="h-4 w-4 text-chart-5" />
                  توزيع هوامش الربح
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={marginChartConfig} className="h-[250px] w-full">
                  <BarChart data={data.marginDistribution} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="range" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                    <RechartsTooltip
                      formatter={(value: number) => `${value} منتج`}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
                      {data.marginDistribution.map((entry, index) => {
                        let color = CHART_PALETTE.primary;
                        if (entry.range.includes('أقل')) color = CHART_PALETTE.quaternary;
                        else if (entry.range.includes('0% - 10%')) color = CHART_PALETTE.secondary;
                        else if (entry.range.includes('10% - 20%')) color = CHART_PALETTE.tertiary;
                        else if (entry.range.includes('20% - 30%')) color = CHART_PALETTE.primary;
                        else if (entry.range.includes('30% - 50%')) color = CHART_PALETTE.quinary;
                        else color = CHART_PALETTE.series[index % CHART_PALETTE.series.length];
                        return <Cell key={`cell-${index}`} fill={color} opacity={0.85} />;
                      })}
                    </Bar>
                  </BarChart>
                </ChartContainer>
                <div className="mt-3 space-y-2">
                  {data.marginDistribution.map((bucket, idx) => {
                    let color = CHART_PALETTE.primary;
                    if (bucket.range.includes('أقل')) color = CHART_PALETTE.quaternary;
                    else if (bucket.range.includes('0% - 10%')) color = CHART_PALETTE.secondary;
                    else if (bucket.range.includes('10% - 20%')) color = CHART_PALETTE.tertiary;
                    else if (bucket.range.includes('20% - 30%')) color = CHART_PALETTE.primary;
                    else if (bucket.range.includes('30% - 50%')) color = CHART_PALETTE.quinary;
                    else color = CHART_PALETTE.series[idx % CHART_PALETTE.series.length];
                    return (
                      <div key={bucket.range} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
                          <span className="text-muted-foreground">{bucket.range}</span>
                        </div>
                        <span className="font-medium tabular-nums">{bucket.count} منتج</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Category profit summary table ─── */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowRightLeft className="h-4 w-4 text-chart-1" />
                ملخص الأرباح حسب الفئة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الفئة</TableHead>
                      <TableHead>الإيرادات</TableHead>
                      <TableHead>التكلفة</TableHead>
                      <TableHead>الربح</TableHead>
                      <TableHead>هامش الربح</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.categoryProfit.map((cat) => {
                      const marginPct = cat.revenue > 0 ? (cat.profit / cat.revenue) * 100 : 0;
                      return (
                        <TableRow key={cat.category}>
                          <TableCell className="font-medium">{cat.category}</TableCell>
                          <TableCell className="tabular-nums">{fmt(cat.revenue)} ر.ي</TableCell>
                          <TableCell className="tabular-nums">{fmt(cat.cost)} ر.ي</TableCell>
                          <TableCell className={`tabular-nums font-medium ${cat.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            {fmt(cat.profit)} ر.ي
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={marginPct >= 20 ? 'default' : marginPct >= 10 ? 'outline' : 'destructive'}
                              className="text-xs"
                            >
                              {marginPct.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {data.categoryProfit.length > 0 && (
                      <TableRow className="bg-muted/30 font-semibold">
                        <TableCell>الإجمالي</TableCell>
                        <TableCell className="tabular-nums">
                          {fmt(data.categoryProfit.reduce((s, c) => s + c.revenue, 0))} ر.ي
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {fmt(data.categoryProfit.reduce((s, c) => s + c.cost, 0))} ر.ي
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {fmt(data.categoryProfit.reduce((s, c) => s + c.profit, 0))} ر.ي
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const totalRev = data.categoryProfit.reduce((s, c) => s + c.revenue, 0);
                            const totalProf = data.categoryProfit.reduce((s, c) => s + c.profit, 0);
                            const pct = totalRev > 0 ? (totalProf / totalRev) * 100 : 0;
                            return <Badge variant="default" className="text-xs">{pct.toFixed(1)}%</Badge>;
                          })()}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* ─── Products table ─── */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-chart-2" />
                تفاصيل أرباح المنتجات
                <Badge variant="outline" className="text-xs ms-2">
                  {filteredProducts.length} منتج
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>المنتج</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleSort('qtySold')}
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
                      <TableHead>التكلفة</TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleSort('profit')}
                      >
                        <div className="flex items-center gap-1">
                          الربح
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleSort('margin')}
                      >
                        <div className="flex items-center gap-1">
                          الهامش %
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>متوسط سعر البيع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product, idx) => (
                      <TableRow key={product.code} className={product.margin < 0 ? 'bg-destructive/5' : ''}>
                        <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.code}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{product.category}</Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">{product.qtySold.toFixed(2)}</TableCell>
                        <TableCell className="tabular-nums">{fmt(product.revenue)} ر.ي</TableCell>
                        <TableCell className="tabular-nums">{fmt(product.cost)} ر.ي</TableCell>
                        <TableCell className={`tabular-nums font-medium ${product.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {fmt(product.profit)} ر.ي
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={product.margin >= 30 ? 'default' : product.margin >= 15 ? 'outline' : 'destructive'}
                            className="text-xs"
                          >
                            {product.margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">{fmt(product.avgSellingPrice)} ر.ي</TableCell>
                      </TableRow>
                    ))}
                    {filteredProducts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          لا توجد منتجات مطابقة للفلاتر المحددة
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  {/* Summary row */}
                  {filteredProducts.length > 0 && (
                    <TableFooter>
                      <TableRow className="bg-muted/30 font-semibold">
                        <TableCell colSpan={3} className="text-center">الإجمالي</TableCell>
                        <TableCell className="tabular-nums">{totalsRow.qtySold.toFixed(2)}</TableCell>
                        <TableCell className="tabular-nums">{fmt(totalsRow.revenue)} ر.ي</TableCell>
                        <TableCell className="tabular-nums">{fmt(totalsRow.cost)} ر.ي</TableCell>
                        <TableCell className={`tabular-nums ${totalsRow.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {fmt(totalsRow.profit)} ر.ي
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="text-xs">
                            {totalsRow.margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {fmt(totalsRow.revenue / (totalsRow.qtySold || 1))} ر.ي
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* ─── Top & Bottom products ─── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Highest margin products */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  أعلى المنتجات هامشاً
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...data.products]
                    .sort((a, b) => b.margin - a.margin)
                    .slice(0, 5)
                    .map((p, idx) => (
                      <div key={p.code} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground">{idx + 1}.</span>
                          <span className="text-sm font-medium truncate">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-chart-3"
                              style={{ width: `${Math.min(p.margin, 100)}%` }}
                            />
                          </div>
                          <Badge variant="default" className="text-xs min-w-[48px] justify-center">
                            {p.margin.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  {data.products.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">لا توجد بيانات</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Lowest margin products */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  أقل المنتجات هامشاً
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...data.products]
                    .sort((a, b) => a.margin - b.margin)
                    .slice(0, 5)
                    .map((p, idx) => (
                      <div key={p.code} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground">{idx + 1}.</span>
                          <span className="text-sm font-medium truncate">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-muted">
                            <div
                              className={`h-2 rounded-full ${p.margin < 0 ? 'bg-destructive' : 'bg-chart-2'}`}
                              style={{ width: `${Math.min(Math.abs(p.margin), 100)}%` }}
                            />
                          </div>
                          <Badge variant={p.margin < 0 ? 'destructive' : 'outline'} className="text-xs min-w-[48px] justify-center">
                            {p.margin.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  {data.products.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">لا توجد بيانات</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Revenue vs Cost vs Profit overview ─── */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                نظرة عامة — الإيرادات مقابل التكلفة والربح
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-chart-1/20 bg-chart-1/5 p-4">
                  <p className="text-xs font-medium text-chart-1">إجمالي الإيرادات</p>
                  <p className="mt-1 text-xl font-bold text-chart-1 tabular-nums">
                    {fmt(summary?.totalRevenue || 0)} ر.ي
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    من {(summary?.productCount || 0)} منتج
                  </p>
                </div>
                <div className="rounded-lg border border-chart-2/20 bg-chart-2/5 p-4">
                  <p className="text-xs font-medium text-chart-2">إجمالي التكلفة</p>
                  <p className="mt-1 text-xl font-bold text-chart-2 tabular-nums">
                    {fmt(summary?.totalCost || 0)} ر.ي
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {summary?.totalRevenue ? ((summary.totalCost / summary.totalRevenue) * 100).toFixed(1) : 0}% من الإيرادات
                  </p>
                </div>
                <div className={`rounded-lg border p-4 ${
                  (summary?.totalProfit || 0) >= 0
                    ? 'border-primary/20 bg-primary/5'
                    : 'border-destructive/20 bg-destructive/5'
                }`}>
                  <p className={`text-xs font-medium ${
                    (summary?.totalProfit || 0) >= 0
                      ? 'text-primary'
                      : 'text-destructive'
                  }`}>
                    صافي الربح
                  </p>
                  <p className={`mt-1 text-xl font-bold tabular-nums ${
                    (summary?.totalProfit || 0) >= 0
                      ? 'text-primary'
                      : 'text-destructive'
                  }`}>
                    {fmt(summary?.totalProfit || 0)} ر.ي
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    هامش {(summary?.avgMargin || 0).toFixed(1)}%
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
          <p className="mt-3 text-sm font-medium text-muted-foreground">اختر فترة تاريخ لعرض تقرير أرباح المنتجات</p>
        </div>
      )}
    </div>
  );
}
