'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { PageHeader } from '@/components/erp/page-header';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDocList } from '@/lib/client/hooks';
import { formatCurrency } from '@/lib/core/helpers';
import { toast } from 'sonner';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Wallet,
  Receipt,
  Calculator,
  Layers,
  Target,
  Activity,
  Filter,
  Clock,
  Package,
  Tag,
  Building2,
  CircleDot,
} from 'lucide-react';

/* ─── Types ─── */
interface ExpenseClaim {
  name: string;
  posting_date?: string;
  employee?: string;
  employee_name?: string;
  total_claimed_amount?: number;
  total_sanctioned_amount?: number;
  status?: string;
  remark?: string;
  docstatus?: number;
  expense_type?: string;
  cost_center?: string;
  company?: string;
  expenses?: ExpenseDetail[];
}

interface ExpenseDetail {
  expense_type?: string;
  amount?: number;
  cost_center?: string;
  description?: string;
}

interface CostCenter {
  name: string;
  cost_center_name?: string;
  parent_cost_center?: string;
}

interface ExpenseCategory {
  name: string;
  expense_claim_type_name?: string;
}

/* ─── Group By Helpers ─── */
type GroupBy = 'day' | 'week' | 'month' | 'quarter';

function getGroupKey(date: string, groupBy: GroupBy): string {
  const d = new Date(date);
  switch (groupBy) {
    case 'day':
      return date.slice(0, 10);
    case 'week': {
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    }
    case 'month':
      return date.slice(0, 7);
    case 'quarter': {
      const q = Math.ceil((d.getMonth() + 1) / 3);
      return `${d.getFullYear()}-Q${q}`;
    }
    default:
      return date.slice(0, 10);
  }
}

function getGroupLabel(key: string, groupBy: GroupBy): string {
  const MONTH_NAMES_AR = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  switch (groupBy) {
    case 'day': {
      const parts = key.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    case 'week':
      return `أسبوع ${key.split('-W')[1]} - ${key.split('-W')[0]}`;
    case 'month': {
      const [y, m] = key.split('-');
      return `${MONTH_NAMES_AR[Number(m) - 1]} ${y}`;
    }
    case 'quarter': {
      const [y, q] = key.split('-Q');
      const quarterNames: Record<string, string> = { '1': 'الربع الأول', '2': 'الربع الثاني', '3': 'الربع الثالث', '4': 'الربع الرابع' };
      return `${quarterNames[q] || q} ${y}`;
    }
    default:
      return key;
  }
}

/* ─── Color palette for categories ─── */
const CATEGORY_COLORS = [
  'bg-chart-1/10 text-chart-1 border-chart-1/20',
  'bg-chart-3/10 text-chart-3 border-chart-3/20',
  'bg-chart-2/10 text-chart-2 border-chart-2/20',
  'bg-chart-5/10 text-chart-5 border-chart-5/20',
  'bg-destructive/10 text-destructive border-destructive/20',
  'bg-chart-3/10 text-chart-3 border-chart-3/20',
  'bg-chart-4/10 text-chart-4 border-chart-4/20',
  'bg-chart-5/10 text-chart-5 border-chart-5/20',
  'bg-chart-1/10 text-chart-1 border-chart-1/20',
  'bg-chart-2/10 text-chart-2 border-chart-2/20',
];

const CHART_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#f43f5e', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];

/* ─── Custom Tooltip for Bar Chart ─── */
function BarChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      dir="rtl"
      className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-md"
      style={{ textAlign: 'right' }}
    >
      <p className="text-xs font-semibold text-popover-foreground mb-1">{label}</p>
      <p className="text-sm font-bold text-destructive tabular-nums" dir="ltr">
        {formatCurrency(payload[0].value)}
      </p>
      <p className="text-[10px] text-muted-foreground">إجمالي المصروفات</p>
    </div>
  );
}

/* ─── Custom Tooltip for Pie Chart ─── */
function PieChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      dir="rtl"
      className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-md"
      style={{ textAlign: 'right' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: payload[0].payload.fill }} />
        <p className="text-xs font-semibold text-popover-foreground">{payload[0].name}</p>
      </div>
      <p className="text-sm font-bold tabular-nums" dir="ltr">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

/* ─── Custom Legend for Pie Chart ─── */
function PieChartLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null;
  return (
    <div dir="rtl" className="flex flex-col gap-1.5 pr-2">
      {payload.map((entry, idx) => (
        <div key={entry.value} className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-[11px] text-foreground truncate max-w-[120px]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ─── */
export default function ExpensesByPeriodPage() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  /* ─── State ─── */
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth);
  const [dateTo, setDateTo] = useState(lastDayOfMonth);
  const [groupBy, setGroupBy] = useState<GroupBy>('month');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [costCenterFilter, setCostCenterFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('table');
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

  /* ─── ERPNext Data Hooks ─── */
  const expensesList = useDocList<ExpenseClaim>('Expense Claim', {
    fields: ['name', 'posting_date', 'employee', 'employee_name', 'total_claimed_amount', 'total_sanctioned_amount', 'status', 'remark', 'docstatus', 'expense_type', 'cost_center', 'company'],
    limit: 5000,
    order_by: 'posting_date desc',
  });

  const costCentersList = useDocList<CostCenter>('Cost Center', {
    fields: ['name', 'cost_center_name', 'parent_cost_center'],
    limit: 200,
  });

  const categoriesList = useDocList<ExpenseCategory>('Expense Claim Type', {
    fields: ['name', 'expense_claim_type_name'],
    limit: 200,
  });

  const expenses = expensesList.data || [];
  const costCenters = costCentersList.data || [];
  const categories = categoriesList.data || [];

  /* ─── Filter expenses by date range and filters ─── */
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (!e.posting_date) return false;
      const inRange = e.posting_date >= dateFrom && e.posting_date <= dateTo;
      const matchesCategory = categoryFilter === 'all' || e.expense_type === categoryFilter;
      const matchesCostCenter = costCenterFilter === 'all' || e.cost_center === costCenterFilter;
      const isSubmitted = e.docstatus === 1;
      return inRange && matchesCategory && matchesCostCenter && isSubmitted;
    });
  }, [expenses, dateFrom, dateTo, categoryFilter, costCenterFilter]);

  /* ─── Group expenses by period ─── */
  const groupedData = useMemo(() => {
    const groups = new Map<string, {
      period: string;
      total_expenses: number;
      category_breakdown: Record<string, number>;
      transaction_count: number;
    }>();

    filteredExpenses.forEach(e => {
      const key = getGroupKey(e.posting_date!, groupBy);
      if (!groups.has(key)) {
        groups.set(key, {
          period: key,
          total_expenses: 0,
          category_breakdown: {},
          transaction_count: 0,
        });
      }
      const group = groups.get(key)!;
      const amount = Number(e.total_sanctioned_amount) || Number(e.total_claimed_amount) || 0;
      group.total_expenses += amount;
      group.transaction_count += 1;
      const cat = e.expense_type || 'أخرى';
      group.category_breakdown[cat] = (group.category_breakdown[cat] || 0) + amount;
    });

    // Sort by period descending
    const sorted = Array.from(groups.values()).sort((a, b) => b.period.localeCompare(a.period));

    // Calculate vs_previous_period
    return sorted.map((item, idx) => {
      const prevItem = sorted[idx + 1]; // next in sorted array is previous period
      const vsPrevious = prevItem
        ? prevItem.total_expenses > 0
          ? Math.round(((item.total_expenses - prevItem.total_expenses) / prevItem.total_expenses) * 100)
          : 100
        : null;
      return { ...item, vs_previous_period: vsPrevious };
    });
  }, [filteredExpenses, groupBy]);

  /* ─── Category totals for pie chart ─── */
  const categoryTotals = useMemo(() => {
    const catMap = new Map<string, number>();
    filteredExpenses.forEach(e => {
      const cat = e.expense_type || 'أخرى';
      const amount = Number(e.total_sanctioned_amount) || Number(e.total_claimed_amount) || 0;
      catMap.set(cat, (catMap.get(cat) || 0) + amount);
    });
    return Array.from(catMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  /* ─── KPI Stats ─── */
  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + (Number(e.total_sanctioned_amount) || Number(e.total_claimed_amount) || 0), 0), [filteredExpenses]);

  const daysDiff = useMemo(() => {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1);
  }, [dateFrom, dateTo]);

  const avgDaily = daysDiff > 0 ? totalExpenses / daysDiff : 0;

  const highestPeriod = useMemo(() => {
    if (groupedData.length === 0) return { period: '—', total: 0 };
    const max = groupedData.reduce((a, b) => a.total_expenses > b.total_expenses ? a : b);
    return { period: getGroupLabel(max.period, groupBy), total: max.total_expenses };
  }, [groupedData, groupBy]);

  const vsPreviousPeriod = useMemo(() => {
    if (groupedData.length < 2) return null;
    const current = groupedData[0];
    const previous = groupedData[1];
    if (!previous || previous.total_expenses === 0) return null;
    return Math.round(((current.total_expenses - previous.total_expenses) / previous.total_expenses) * 100);
  }, [groupedData]);

  /* ─── Trend data for chart ─── */
  const trendData = useMemo(() => {
    return [...groupedData].reverse().map(item => ({
      period: getGroupLabel(item.period, groupBy),
      total: item.total_expenses,
    }));
  }, [groupedData, groupBy]);

  /* ─── Pie chart data ─── */
  const pieData = useMemo(() => {
    return categoryTotals.map(({ category, total }, idx) => ({
      name: category,
      value: total,
      fill: CHART_COLORS[idx % CHART_COLORS.length],
    }));
  }, [categoryTotals]);

  /* ─── Table Columns ─── */
  const periodColumns: Column<typeof groupedData[number]>[] = useMemo(
    () => [
      {
        key: 'period',
        header: 'الفترة',
        sortable: true,
        render: (v) => (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold">{getGroupLabel(String(v), groupBy)}</span>
          </div>
        ),
      },
      {
        key: 'total_expenses',
        header: 'إجمالي المصروفات',
        sortable: true,
        render: (v) => (
          <span className="text-sm font-bold text-destructive tabular-nums" dir="ltr">
            {formatCurrency(Number(v))}
          </span>
        ),
      },
      {
        key: 'category_breakdown',
        header: 'تفصيل التصنيفات',
        render: (v, row) => {
          const entries = Object.entries(row.category_breakdown as Record<string, number>).sort((a, b) => b[1] - a[1]);
          if (entries.length === 0) return <span className="text-[10px] text-muted-foreground">—</span>;
          return (
            <div className="flex flex-wrap gap-1 max-w-[250px]">
              {entries.slice(0, 3).map(([cat, amount], idx) => (
                <Badge key={cat} variant="outline" className={`text-[8px] ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}`}>
                  {cat}: {formatCurrency(amount)}
                </Badge>
              ))}
              {entries.length > 3 && (
                <Badge variant="outline" className="text-[8px]">
                  +{entries.length - 3}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        key: 'transaction_count',
        header: 'عدد المعاملات',
        sortable: true,
        render: (v) => <span className="text-xs tabular-nums">{String(v)}</span>,
      },
      {
        key: 'vs_previous_period',
        header: 'مقارنة بالفترة السابقة',
        render: (v) => {
          const val = v as number | null;
          if (val === null) return <span className="text-[10px] text-muted-foreground">—</span>;
          return (
            <div className="flex items-center gap-1">
              {val > 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" />
              ) : val < 0 ? (
                <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Minus className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className={`text-xs font-semibold tabular-nums ${
                val > 0 ? 'text-rose-600' : val < 0 ? 'text-emerald-600' : 'text-muted-foreground'
              }`}>
                {val > 0 ? '+' : ''}{val}%
              </span>
            </div>
          );
        },
      },
    ],
    [groupBy]
  );

  /* ─── Export Handlers ─── */
  const handleExportCSV = useCallback(() => {
    const headers = ['الفترة', 'إجمالي المصروفات', 'عدد المعاملات', 'مقارنة بالفترة السابقة'];
    const rows = groupedData.map(item => [
      getGroupLabel(item.period, groupBy),
      item.total_expenses.toFixed(2),
      item.transaction_count,
      item.vs_previous_period !== null ? `${item.vs_previous_period > 0 ? '+' : ''}${item.vs_previous_period}%` : '—',
    ]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `المصروفات-بالمدة-الزمنية.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('تم تصدير التقرير بنجاح');
  }, [groupedData, groupBy]);

  const handlePrint = useCallback(() => {
    toast.info('جارٍ تجهيز التقرير للطباعة...');
    window.print();
  }, []);

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="المصروفات بالمدة الزمنية"
        description="تحليل المصروفات حسب الفترة الزمنية مع مقارنة الأداء وتفصيل التصنيفات"
        iconify="solar:wallet-money-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المحاسبة' }, { label: 'المصروفات بالمدة الزمنية' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportCSV}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              تصدير CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handlePrint}>
              <FileText className="h-3.5 w-3.5" />
              طباعة
            </Button>
          </div>
        }
      />

      {/* ─── KPI Cards ─── */}
      {/* ─── Filters ─── */}
      <Card className="border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">من تاريخ</Label>
              <Input
                type="date"
                dir="ltr"
                className="h-9 w-36 text-xs"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">إلى تاريخ</Label>
              <Input
                type="date"
                dir="ltr"
                className="h-9 w-36 text-xs"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">تجميع حسب</Label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">يومي</SelectItem>
                  <SelectItem value="week">أسبوعي</SelectItem>
                  <SelectItem value="month">شهري</SelectItem>
                  <SelectItem value="quarter">ربع سنوي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">تصنيف المصروف</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="جميع التصنيفات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع التصنيفات</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.expense_claim_type_name || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">مركز التكلفة</Label>
              <Select value={costCenterFilter} onValueChange={setCostCenterFilter}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="جميع المراكز" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المراكز</SelectItem>
                  {costCenters.map(c => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.cost_center_name || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Tabs ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="table" className="gap-1.5 text-xs">
            <Receipt className="h-3.5 w-3.5" />
            جدول البيانات
          </TabsTrigger>
          <TabsTrigger value="chart" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            الرسم البياني
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5 text-xs">
            <PieChartIcon className="h-3.5 w-3.5" />
            التصنيفات
          </TabsTrigger>
        </TabsList>

        {/* ─── Data Table Tab ─── */}
        <TabsContent value="table" className="space-y-4">
          <ListQueryAlert error={expensesList.isError ? expensesList.error : null} onRetry={() => expensesList.refetch()} />
          <DataTable
            data={groupedData}
            columns={periodColumns}
            tableId="expenses-by-period"
            searchable
            loading={expensesList.isLoading}
            exportFileName="المصروفات-بالمدة-الزمنية"
            pageSize={15}
          />

          {/* Expandable Period Details */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" />
                تفاصيل الفترات (قابل للتوسيع)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {groupedData.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  لا توجد بيانات مصروفات للفترة المحددة
                </div>
              ) : (
                <div className="space-y-2">
                  {groupedData.map(item => {
                    const isExpanded = expandedPeriod === item.period;
                    const categoryEntries = Object.entries(item.category_breakdown as Record<string, number>).sort((a, b) => b[1] - a[1]);
                    return (
                      <Collapsible key={item.period} open={isExpanded} onOpenChange={() => setExpandedPeriod(isExpanded ? null : item.period)}>
                        <CollapsibleTrigger asChild>
                          <button className="w-full flex items-center justify-between rounded-lg border border-border/30 p-3 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-3">
                              <CalendarDays className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-semibold">{getGroupLabel(item.period, groupBy)}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-bold text-destructive tabular-nums" dir="ltr">{formatCurrency(item.total_expenses)}</span>
                              <Badge variant="outline" className="text-[9px] tabular-nums">{item.transaction_count} معاملة</Badge>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </div>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border border-border/20 border-t-0 rounded-b-lg p-4 bg-muted/5 space-y-3">
                            {/* Category Breakdown */}
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                تفصيل التصنيفات
                              </p>
                              <div className="space-y-1.5">
                                {categoryEntries.map(([cat, amount], idx) => {
                                  const pct = item.total_expenses > 0 ? Math.round((amount / item.total_expenses) * 100) : 0;
                                  return (
                                    <div key={cat} className="flex items-center gap-3">
                                      <Badge variant="outline" className={`text-[9px] min-w-[100px] justify-center ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}`}>
                                        {cat}
                                      </Badge>
                                      <Progress value={pct} className="h-2 flex-1" />
                                      <span className="text-[10px] font-semibold tabular-nums w-12 text-end" dir="ltr">{formatCurrency(amount)}</span>
                                      <span className="text-[9px] text-muted-foreground tabular-nums w-8">{pct}%</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Comparison */}
                            {item.vs_previous_period !== null && (
                              <div className="flex items-center gap-2 text-xs pt-2 border-t border-border/20">
                                <span className="text-muted-foreground">مقارنة بالفترة السابقة:</span>
                                {item.vs_previous_period > 0 ? (
                                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                                    <ArrowUpRight className="h-3 w-3" />
                                    +{item.vs_previous_period}%
                                  </span>
                                ) : item.vs_previous_period < 0 ? (
                                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                    <ArrowDownRight className="h-3 w-3" />
                                    {item.vs_previous_period}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground font-semibold">بدون تغيير</span>
                                )}
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Chart Tab ─── */}
        <TabsContent value="chart" className="space-y-4">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                اتجاه المصروفات عبر الزمن
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  لا توجد بيانات كافية لرسم البيان
                </div>
              ) : (
                <div dir="ltr" className="w-full h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                        tickFormatter={(value: number) => formatCurrency(value)}
                        width={90}
                        orientation="right"
                      />
                      <Tooltip content={<BarChartTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} />
                      <Bar
                        dataKey="total"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={56}
                        name="إجمالي المصروفات"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mini stats under chart */}
          <div className="grid sm:grid-cols-3 gap-3">
            <Card className="border-border/40">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">أعلى فترة مصروفات</p>
                  <p className="text-sm font-bold">{highestPeriod.period}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/40">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <TrendingDown className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">أقل فترة مصروفات</p>
                  <p className="text-sm font-bold">
                    {groupedData.length > 0 ? getGroupLabel(groupedData.reduce((a, b) => a.total_expenses < b.total_expenses ? a : b).period, groupBy) : '—'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/40">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-chart-1/10 flex items-center justify-center shrink-0">
                  <Activity className="h-4 w-4 text-sky-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">إجمالي الفترات</p>
                  <p className="text-sm font-bold">{groupedData.length} فترة</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Categories Tab ─── */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Category Pie Chart Breakdown */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-violet-500" />
                  توزيع المصروفات حسب التصنيف
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryTotals.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    لا توجد بيانات مصروفات
                  </div>
                ) : (
                  <div dir="ltr" className="w-full h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="40%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                          stroke="none"
                        >
                          {pieData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieChartTooltip />} />
                        <Legend
                          layout="vertical"
                          align="right"
                          verticalAlign="middle"
                          iconType="circle"
                          iconSize={8}
                          content={<PieChartLegend />}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Expense Categories */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-500" />
                  أعلى تصنيفات المصروفات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryTotals.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    لا توجد بيانات
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categoryTotals.slice(0, 10).map(({ category, total }, idx) => {
                      const pct = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0;
                      return (
                        <div key={category} className="flex items-center justify-between rounded-lg border border-border/30 p-3 hover:bg-muted/20 transition-colors">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ backgroundColor: `${CHART_COLORS[idx % CHART_COLORS.length]}15`, color: CHART_COLORS[idx % CHART_COLORS.length] }}
                            >
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-xs font-semibold">{category}</p>
                              <p className="text-[10px] text-muted-foreground">{pct}% من الإجمالي</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-destructive tabular-nums" dir="ltr">{formatCurrency(total)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cost Center Summary */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-teal-500" />
                توزيع المصروفات حسب مركز التكلفة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const ccMap = new Map<string, number>();
                filteredExpenses.forEach(e => {
                  const cc = e.cost_center || 'بدون مركز تكلفة';
                  const amount = Number(e.total_sanctioned_amount) || Number(e.total_claimed_amount) || 0;
                  ccMap.set(cc, (ccMap.get(cc) || 0) + amount);
                });
                const ccData = Array.from(ccMap.entries())
                  .map(([center, total]) => ({ center, total }))
                  .sort((a, b) => b.total - a.total);

                if (ccData.length === 0) {
                  return <div className="text-center py-8 text-sm text-muted-foreground">لا توجد بيانات</div>;
                }

                return (
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {ccData.map(({ center, total }) => {
                      const pct = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0;
                      const ccName = costCenters.find(c => c.name === center)?.cost_center_name || center;
                      return (
                        <div key={center} className="rounded-lg border border-border/30 p-3 hover:bg-muted/20 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="h-4 w-4 text-teal-500" />
                            <span className="text-xs font-semibold truncate">{ccName}</span>
                          </div>
                          <p className="text-lg font-bold text-destructive tabular-nums" dir="ltr">{formatCurrency(total)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-[9px] text-muted-foreground tabular-nums">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
