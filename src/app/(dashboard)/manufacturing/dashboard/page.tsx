'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useDocList } from '@/lib/client/hooks';
import { PageHeader } from '@/components/erp/page-header';
import { StatusBadge } from '@/components/erp/status-badge';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatNumber, formatDate, CHART_PALETTE } from '@/lib/core/helpers';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Factory,
  Wrench,
  Package,
  ClipboardList,
  BarChart3,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Cog,
  FileText,
  StopCircle,
  XCircle,
  Activity,
  Hammer,
  Box,
  Calendar,
  ArrowLeft,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Status Labels & Colors                                             */
/* ------------------------------------------------------------------ */
const STATUS_LABELS: Record<string, string> = {
  'Draft': 'مسودة',
  'Not Started': 'لم يبدأ',
  'In Process': 'قيد التنفيذ',
  'Completed': 'مكتمل',
  'Stopped': 'متوقف',
  'Cancelled': 'ملغى',
};

const STATUS_COLORS: Record<string, string> = {
  'Draft': CHART_PALETTE.quinary,
  'Not Started': CHART_PALETTE.secondary,
  'In Process': CHART_PALETTE.primary,
  'Completed': CHART_PALETTE.tertiary,
  'Stopped': CHART_PALETTE.quaternary,
  'Cancelled': CHART_PALETTE.quinary,
};

const STATUS_BG: Record<string, string> = {
  'Draft': 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300',
  'Not Started': 'bg-chart-2/10 text-chart-2',
  'In Process': 'bg-chart-1/10 text-chart-1',
  'Completed': 'bg-primary/10 text-primary',
  'Stopped': 'bg-destructive/10 text-destructive',
  'Cancelled': 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400',
};

// PIE_COLORS removed — using CHART_PALETTE.pie from helpers

/* ------------------------------------------------------------------ */
/*  Quick Actions                                                      */
/* ------------------------------------------------------------------ */
const QUICK_ACTIONS = [
  { label: 'قائمة مواد جديدة', href: '/manufacturing/bom?new=1', icon: Package, color: 'bg-primary/10 text-primary' },
  { label: 'أمر عمل جديد', href: '/manufacturing/work-orders?new=1', icon: ClipboardList, color: 'bg-chart-2/10 text-chart-2' },
  { label: 'خطة إنتاج جديدة', href: '/manufacturing/production-plans?new=1', icon: FileText, color: 'bg-chart-1/10 text-chart-1' },
  { label: 'محطات العمل', href: '/manufacturing/workstations', icon: Wrench, color: 'bg-chart-5/10 text-chart-5' },
];

/* ------------------------------------------------------------------ */
/*  Custom Tooltip for Charts                                          */
/* ------------------------------------------------------------------ */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div dir="rtl" className="rounded-lg border border-border/60 bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold tabular-nums">{formatNumber(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function ManufacturingDashboardPage() {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  /* ---------- Fetch data ---------- */
  const {
    data: workOrders = [],
    isLoading: woLoading,
    isError: woError,
    error: woErr,
    refetch: woRefetch,
  } = useDocList<Record<string, unknown>>('Work Order', {
    fields: ['name', 'status', 'production_item', 'qty', 'produced_qty', 'wip_warehouse', 'planned_start_date', 'expected_delivery_date'],
    limit: 500,
    order_by: 'creation desc',
  });

  const {
    data: boms = [],
    isLoading: bomLoading,
    isError: bomError,
    error: bomErr,
    refetch: bomRefetch,
  } = useDocList<Record<string, unknown>>('BOM', {
    fields: ['name', 'item', 'docstatus'],
    limit: 500,
  });

  const {
    data: workstations = [],
    isLoading: wsLoading,
    isError: wsError,
    error: wsErr,
    refetch: wsRefetch,
  } = useDocList<Record<string, unknown>>('Workstation', {
    fields: ['name', 'production_capacity'],
    limit: 500,
  });

  const {
    data: productionPlans = [],
    isLoading: ppLoading,
    isError: ppError,
    error: ppErr,
    refetch: ppRefetch,
  } = useDocList<Record<string, unknown>>('Production Plan', {
    fields: ['name', 'status', 'docstatus'],
    limit: 500,
  });

  const isLoading = woLoading || bomLoading || wsLoading || ppLoading;
  const hasError = woError || bomError || wsError || ppError;

  const handleRetry = () => {
    woRefetch();
    bomRefetch();
    wsRefetch();
    ppRefetch();
  };

  /* ---------- KPI calculations ---------- */
  const activeWorkOrders = useMemo(
    () => workOrders.filter((wo) => ['Not Started', 'In Process'].includes(String(wo.status))).length,
    [workOrders]
  );

  const completedWorkOrders = useMemo(
    () => workOrders.filter((wo) => String(wo.status) === 'Completed').length,
    [workOrders]
  );

  const totalBoms = useMemo(
    () => boms.filter((b) => Number(b.docstatus) === 1).length,
    [boms]
  );

  const totalWorkstations = useMemo(
    () => workstations.length,
    [workstations]
  );

  const totalProductionPlans = useMemo(
    () => productionPlans.length,
    [productionPlans]
  );

  /* ---------- Additional KPIs ---------- */
  const stoppedWorkOrders = useMemo(
    () => workOrders.filter((wo) => String(wo.status) === 'Stopped').length,
    [workOrders]
  );

  const draftWorkOrders = useMemo(
    () => workOrders.filter((wo) => String(wo.status) === 'Draft').length,
    [workOrders]
  );

  const completedThisMonth = useMemo(
    () => workOrders.filter((wo) => String(wo.status) === 'Completed').length,
    [workOrders]
  );

  const avgCompletionRate = useMemo(() => {
    const withProduction = workOrders.filter((wo) => Number(wo.qty) > 0 && ['In Process', 'Completed'].includes(String(wo.status)));
    if (withProduction.length === 0) return 0;
    const totalRate = withProduction.reduce((sum, wo) => {
      const rate = (Number(wo.produced_qty || 0) / Number(wo.qty)) * 100;
      return sum + Math.min(rate, 100);
    }, 0);
    return Math.round(totalRate / withProduction.length);
  }, [workOrders]);

  const totalProductionCapacity = useMemo(
    () => workstations.reduce((sum, ws) => sum + Number(ws.production_capacity || 0), 0),
    [workstations]
  );

  const activeProductionPlans = useMemo(
    () => productionPlans.filter((pp) => Number(pp.docstatus) === 1 && String(pp.status) !== 'Completed').length,
    [productionPlans]
  );

  /* ---------- Work Orders by Status (Bar Chart) ---------- */
  const workOrdersByStatus = useMemo(() => {
    const statusMap = new Map<string, number>();
    const statusOrder = ['Not Started', 'In Process', 'Completed', 'Stopped', 'Draft', 'Cancelled'];
    for (const wo of workOrders) {
      const st = String(wo.status || 'Draft');
      statusMap.set(st, (statusMap.get(st) || 0) + 1);
    }
    return statusOrder
      .filter((st) => (statusMap.get(st) || 0) > 0)
      .map((st) => ({
        status: STATUS_LABELS[st] || st,
        count: statusMap.get(st) || 0,
        fill: STATUS_COLORS[st] || CHART_PALETTE.quinary,
      }));
  }, [workOrders]);

  /* ---------- Monthly Production (Line Chart) ---------- */
  const monthlyProduction = useMemo(() => {
    const months: { month: string; completed: number; total: number; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
      const monthOrders = workOrders.filter((wo) => {
        const dateStr = String(wo.planned_start_date || wo.expected_delivery_date || '');
        return dateStr.startsWith(ym);
      });
      const completed = monthOrders.filter((wo) => String(wo.status) === 'Completed').length;
      const total = monthOrders.length;
      months.push({ month: ym, completed, total, label: monthLabel });
    }
    return months;
  }, [workOrders, now]);

  /* ---------- Status Pie Chart Data ---------- */
  const statusPieData = useMemo(() => {
    const statusMap = new Map<string, number>();
    for (const wo of workOrders) {
      const st = String(wo.status || 'Draft');
      statusMap.set(st, (statusMap.get(st) || 0) + 1);
    }
    const statusOrder = ['Not Started', 'In Process', 'Completed', 'Stopped', 'Draft', 'Cancelled'];
    return statusOrder
      .filter((st) => (statusMap.get(st) || 0) > 0)
      .map((st, i) => ({
        name: STATUS_LABELS[st] || st,
        value: statusMap.get(st) || 0,
        color: CHART_PALETTE.pie[i % CHART_PALETTE.pie.length],
      }));
  }, [workOrders]);

  /* ---------- Top 5 Produced Items ---------- */
  const topProducedItems = useMemo(() => {
    const map = new Map<string, { item: string; totalQty: number; totalProduced: number }>();
    for (const wo of workOrders) {
      if (Number(wo.docstatus) !== 1) continue;
      const key = String(wo.production_item || '—');
      const existing = map.get(key) || { item: key, totalQty: 0, totalProduced: 0 };
      existing.totalQty += Number(wo.qty || 0);
      existing.totalProduced += Number(wo.produced_qty || 0);
      map.set(key, existing);
    }
    return Array.from(map.values())
      .sort((a, b) => b.totalProduced - a.totalProduced)
      .slice(0, 5);
  }, [workOrders]);

  const maxProducedItem = useMemo(() => Math.max(...topProducedItems.map((it) => it.totalProduced), 1), [topProducedItems]);

  /* ---------- Workstation Capacity Overview ---------- */
  const workstationOverview = useMemo(() => {
    return workstations.slice(0, 6).map((ws) => ({
      name: String(ws.name),
      capacity: Number(ws.production_capacity || 0),
    }));
  }, [workstations]);

  /* ---------- Recent Work Orders Table Data ---------- */
  const recentWorkOrders = useMemo(
    () =>
      workOrders.slice(0, 10).map((wo) => ({
        name: String(wo.name ?? ''),
        status: String(wo.status ?? ''),
        productionItem: String(wo.production_item ?? '—'),
        qty: Number(wo.qty ?? 0),
        producedQty: Number(wo.produced_qty ?? 0),
        wipWarehouse: String(wo.wip_warehouse ?? ''),
        plannedStartDate: String(wo.planned_start_date ?? ''),
        expectedDelivery: String(wo.expected_delivery_date ?? ''),
        progress: Number(wo.qty ?? 0) > 0 ? Math.min(Math.round((Number(wo.produced_qty ?? 0) / Number(wo.qty)) * 100), 100) : 0,
      })),
    [workOrders]
  );

  /* ---------- Production Plan Status Summary ---------- */
  const productionPlanSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const pp of productionPlans) {
      const st = String(pp.status || 'Draft');
      map.set(st, (map.get(st) || 0) + 1);
    }
    const statusOrder = ['Draft', 'In Process', 'Completed', 'Cancelled'];
    return statusOrder
      .filter((st) => (map.get(st) || 0) > 0)
      .map((st) => ({
        status: STATUS_LABELS[st] || st,
        count: map.get(st) || 0,
      }));
  }, [productionPlans]);

  /* ---------- In-Progress Work Orders (for attention section) ---------- */
  const inProgressOrders = useMemo(
    () =>
      workOrders
        .filter((wo) => String(wo.status) === 'In Process')
        .slice(0, 5)
        .map((wo) => ({
          name: String(wo.name ?? ''),
          productionItem: String(wo.production_item ?? '—'),
          qty: Number(wo.qty ?? 0),
          producedQty: Number(wo.produced_qty ?? 0),
          progress: Number(wo.qty ?? 0) > 0 ? Math.min(Math.round((Number(wo.produced_qty ?? 0) / Number(wo.qty)) * 100), 100) : 0,
        })),
    [workOrders]
  );

  return (
    <div dir="rtl" className="erp-page-enter mx-auto w-full max-w-[1600px] space-y-5 md:space-y-6">
      {/* ── Error Alert ── */}
      {hasError && (
        <ListQueryAlert
          error={woError ? woErr : bomError ? bomErr : wsError ? wsErr : ppErr}
          onRetry={handleRetry}
        />
      )}

      <PageHeader
        title="لوحة تحكم التصنيع"
        description="متابعة أوامر العمل وقوائم المواد وخطط الإنتاج ومحطات العمل والإنتاجية"
        iconify="solar:factory-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'التصنيع' }, { label: 'لوحة التحكم' }]}
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

      {/* ── Charts: Bar Chart (WO by Status) & Line Chart (Monthly Production) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart: Work Orders by Status */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-chart-2" />
                <CardTitle className="text-sm font-semibold">أوامر العمل حسب الحالة</CardTitle>
              </div>
              <Link href="/manufacturing/work-orders" className="text-xs text-primary hover:underline">
                عرض الكل
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center h-64">
                <p className="text-xs text-muted-foreground">جاري التحميل…</p>
              </div>
            )}
            {!isLoading && workOrdersByStatus.length === 0 && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-chart-2/10">
                  <BarChart3 className="h-6 w-6 text-chart-2" />
                </div>
                <p className="text-xs text-muted-foreground">لا توجد أوامر عمل بعد.</p>
              </div>
            )}
            {!isLoading && workOrdersByStatus.length > 0 && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workOrdersByStatus} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={{ stroke: 'var(--border)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={{ stroke: 'var(--border)' }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="عدد أوامر العمل" radius={[4, 4, 0, 0]}>
                      {workOrdersByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Chart: Monthly Production */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">الإنتاج الشهري (آخر 6 أشهر)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center h-64">
                <p className="text-xs text-muted-foreground">جاري التحميل…</p>
              </div>
            )}
            {!isLoading && monthlyProduction.every((m) => m.total === 0) && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">لا توجد بيانات إنتاج شهرية.</p>
              </div>
            )}
            {!isLoading && monthlyProduction.some((m) => m.total > 0) && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyProduction} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={{ stroke: 'var(--border)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={{ stroke: 'var(--border)' }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="إجمالي الأوامر"
                      stroke={CHART_PALETTE.secondary}
                      strokeWidth={2}
                      dot={{ r: 4, fill: CHART_PALETTE.secondary }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      name="المكتملة"
                      stroke={CHART_PALETTE.primary}
                      strokeWidth={2}
                      dot={{ r: 4, fill: CHART_PALETTE.primary }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Pie Chart & Top Produced Items ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart: Status Distribution */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-chart-1" />
              <CardTitle className="text-sm font-semibold">توزيع حالات أوامر العمل</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center h-56">
                <p className="text-xs text-muted-foreground">جاري التحميل…</p>
              </div>
            )}
            {!isLoading && statusPieData.length === 0 && (
              <p className="text-xs text-muted-foreground py-8 text-center">لا توجد بيانات أوامر عمل.</p>
            )}
            {!isLoading && statusPieData.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="h-52 w-52 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`pie-cell-${index}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5 flex-1 min-w-0">
                  {statusPieData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-[11px] text-muted-foreground truncate">{item.name}</span>
                      </div>
                      <span className="text-[11px] font-semibold shrink-0 tabular-nums">{item.value}</span>
                    </div>
                  ))}
                  <div className="h-px bg-border my-1" />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium">الإجمالي</span>
                    <span className="text-[11px] font-bold tabular-nums">{workOrders.length}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Produced Items */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">أعلى 5 أصناف مُنتَجة</CardTitle>
              </div>
              <Link href="/manufacturing/work-orders" className="text-xs text-primary hover:underline">
                عرض الكل
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <p className="text-xs text-muted-foreground py-6 text-center">جاري التحميل…</p>
            )}
            {!isLoading && topProducedItems.length === 0 && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Box className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">لا توجد بيانات إنتاج بعد.</p>
              </div>
            )}
            {!isLoading && topProducedItems.length > 0 && (
              <div className="space-y-3">
                {topProducedItems.map((item, i) => {
                  const ratio = maxProducedItem > 0 ? (item.totalProduced / maxProducedItem) * 100 : 0;
                  const completionRate = item.totalQty > 0 ? Math.round((item.totalProduced / item.totalQty) * 100) : 0;
                  return (
                    <div key={item.item} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {i + 1}
                          </span>
                          <span className="text-xs font-medium truncate max-w-[140px]">{item.item}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-muted-foreground">
                            {formatNumber(item.totalProduced)}/{formatNumber(item.totalQty)}
                          </span>
                          <span className={`text-[10px] font-semibold ${completionRate >= 80 ? 'text-primary' : completionRate >= 50 ? 'text-chart-2' : 'text-destructive'}`}>
                            {completionRate}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${completionRate >= 80 ? 'bg-chart-3' : completionRate >= 50 ? 'bg-chart-2' : 'bg-destructive'}`}
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── In-Progress Orders & Production Plan Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* In-Progress Work Orders */}
        <Card className="lg:col-span-2 border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cog className="h-4 w-4 text-chart-2" />
                <CardTitle className="text-sm font-semibold">أوامر العمل قيد التنفيذ</CardTitle>
              </div>
              <Link href="/manufacturing/work-orders" className="text-xs text-primary hover:underline">
                عرض الكل
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-xs text-muted-foreground py-6 text-center">جاري التحميل…</p>}
            {!isLoading && inProgressOrders.length === 0 && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">لا توجد أوامر عمل قيد التنفيذ حالياً</p>
              </div>
            )}
            {!isLoading && inProgressOrders.length > 0 && (
              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {inProgressOrders.map((wo) => (
                  <div
                    key={wo.name}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors border border-border/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-2/10 shrink-0">
                        <Factory className="h-4 w-4 text-chart-2" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{wo.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{wo.productionItem}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="min-w-[80px]">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-muted-foreground">الإنجاز</span>
                          <span className="text-[10px] font-semibold tabular-nums">{wo.progress}%</span>
                        </div>
                        <Progress value={wo.progress} className="h-1.5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">الكمية</p>
                        <p className="text-xs font-semibold tabular-nums">
                          {formatNumber(wo.producedQty)}/{formatNumber(wo.qty)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Production Plans Summary */}
        <div className="space-y-4">
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-chart-1" />
                  <CardTitle className="text-sm font-semibold">خطط الإنتاج</CardTitle>
                </div>
                <Link href="/manufacturing/production-plans" className="text-xs text-primary hover:underline">
                  عرض الكل
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && <p className="text-xs text-muted-foreground py-4 text-center">جاري التحميل…</p>}
              {!isLoading && productionPlanSummary.length === 0 && (
                <p className="text-xs text-muted-foreground py-6 text-center">لا توجد خطط إنتاج بعد.</p>
              )}
              {!isLoading && productionPlanSummary.length > 0 && (
                <div className="space-y-2.5">
                  {productionPlanSummary.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-accent/30">
                      <span className="text-xs text-muted-foreground">{item.status}</span>
                      <span className="text-sm font-semibold tabular-nums">{item.count}</span>
                    </div>
                  ))}
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">الإجمالي</span>
                    <span className="text-sm font-bold tabular-nums">{totalProductionPlans}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workstation Summary */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-chart-5" />
                <CardTitle className="text-sm font-semibold">محطات العمل</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && <p className="text-xs text-muted-foreground py-4 text-center">جاري التحميل…</p>}
              {!isLoading && workstationOverview.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">لا توجد محطات عمل.</p>
              )}
              {!isLoading && workstationOverview.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {workstationOverview.map((ws, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-chart-5/10 shrink-0">
                          <Hammer className="h-3 w-3 text-chart-5" />
                        </div>
                        <span className="text-[11px] font-medium truncate max-w-[100px]">{ws.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">سعة:</span>
                        <span className="text-[11px] font-semibold tabular-nums">{ws.capacity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full text-xs mt-3" asChild>
                <Link href="/manufacturing/workstations">إدارة محطات العمل</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Recent Work Orders Table ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">آخر أوامر العمل</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">آخر 10 أوامر</span>
              <Link href="/manufacturing/work-orders" className="text-xs text-primary hover:underline">
                عرض الكل
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />
              ))}
            </div>
          )}
          {!isLoading && recentWorkOrders.length === 0 && (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                <ClipboardList className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">لا توجد أوامر عمل حالياً</p>
              <p className="text-xs text-muted-foreground mt-1">ابدأ بإنشاء أمر عمل جديد من الإجراءات السريعة</p>
            </div>
          )}
          {!isLoading && recentWorkOrders.length > 0 && (
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">رقم أمر العمل</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">الصنف</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">الحالة</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">الكمية</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">المنتج</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">التقدم</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">تاريخ البدء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentWorkOrders.map((wo) => (
                      <tr key={wo.name} className="border-b border-border/20 hover:bg-accent/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <Link href={`/doc/Work Order/${wo.name}`} className="font-medium text-primary hover:underline">
                            {wo.name}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 truncate max-w-[150px]">{wo.productionItem}</td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold px-2 py-0.5 border-0 ${STATUS_BG[wo.status] || 'bg-muted text-muted-foreground'}`}
                          >
                            {STATUS_LABELS[wo.status] || wo.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 tabular-nums">{formatNumber(wo.qty)}</td>
                        <td className="py-2.5 px-3 tabular-nums">{formatNumber(wo.producedQty)}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Progress value={wo.progress} className="h-1.5 flex-1" />
                            <span className="text-[10px] font-semibold tabular-nums w-8">{wo.progress}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {wo.plannedStartDate ? formatDate(wo.plannedStartDate) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2">
                {recentWorkOrders.map((wo) => (
                  <div key={wo.name} className="rounded-lg border border-border/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Link href={`/doc/Work Order/${wo.name}`} className="text-xs font-semibold text-primary hover:underline">
                        {wo.name}
                      </Link>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold px-2 py-0.5 border-0 ${STATUS_BG[wo.status] || 'bg-muted text-muted-foreground'}`}
                      >
                        {STATUS_LABELS[wo.status] || wo.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">الصنف:</span>
                      <span className="font-medium truncate max-w-[150px]">{wo.productionItem}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">الكمية:</span>
                      <span className="font-semibold tabular-nums">{formatNumber(wo.producedQty)}/{formatNumber(wo.qty)}</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">التقدم</span>
                        <span className="text-[10px] font-semibold">{wo.progress}%</span>
                      </div>
                      <Progress value={wo.progress} className="h-1.5" />
                    </div>
                    {wo.plannedStartDate && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(wo.plannedStartDate)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Manufacturing Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* BOM Summary */}
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">قوائم المواد الفعّالة</p>
                <p className="text-lg font-bold tabular-nums">{isLoading ? '…' : String(totalBoms)}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full text-xs mt-3 h-8" asChild>
              <Link href="/manufacturing/bom">
                إدارة قوائم المواد
                <ArrowLeft className="h-3 w-3 ms-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Work Orders Summary */}
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                <Factory className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">إجمالي أوامر العمل</p>
                <p className="text-lg font-bold tabular-nums">{isLoading ? '…' : String(workOrders.length)}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full text-xs mt-3 h-8" asChild>
              <Link href="/manufacturing/work-orders">
                إدارة أوامر العمل
                <ArrowLeft className="h-3 w-3 ms-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Production Plans Summary */}
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-10 items-center justify-center rounded-lg bg-chart-1/10">
                <ClipboardList className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">خطط الإنتاج</p>
                <p className="text-lg font-bold tabular-nums">{isLoading ? '…' : String(totalProductionPlans)}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full text-xs mt-3 h-8" asChild>
              <Link href="/manufacturing/production-plans">
                إدارة خطط الإنتاج
                <ArrowLeft className="h-3 w-3 ms-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Workstations Summary */}
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-10 items-center justify-center rounded-lg bg-chart-5/10">
                <Wrench className="h-5 w-5 text-chart-5" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">محطات العمل</p>
                <p className="text-lg font-bold tabular-nums">{isLoading ? '…' : String(totalWorkstations)}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full text-xs mt-3 h-8" asChild>
              <Link href="/manufacturing/workstations">
                إدارة محطات العمل
                <ArrowLeft className="h-3 w-3 ms-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Stopped Orders Alert ── */}
      {stoppedWorkOrders > 0 && (
        <Card className="border-destructive/30 border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <CardTitle className="text-sm font-semibold text-destructive">تنبيه: أوامر عمل متوقفة</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <StopCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs font-medium">يوجد {stoppedWorkOrders} أمر عمل متوقف</p>
                  <p className="text-[10px] text-muted-foreground">تحقق من الأوامر المتوقفة وأعد تشغيلها أو ألغها</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5" asChild>
                <Link href="/manufacturing/work-orders">
                  عرض الأوامر
                  <ArrowLeft className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Production Efficiency Overview ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-chart-2" />
            <CardTitle className="text-sm font-semibold">نظرة عامة على كفاءة الإنتاج</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-xs text-muted-foreground py-6 text-center">جاري التحميل…</p>}
          {!isLoading && workOrders.length === 0 && (
            <p className="text-xs text-muted-foreground py-8 text-center">لا توجد بيانات إنتاج كافية.</p>
          )}
          {!isLoading && workOrders.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-chart-2/5">
                <span className="text-[10px] text-muted-foreground">لم يبدأ</span>
                <span className="text-lg font-bold tabular-nums text-chart-2">
                  {workOrders.filter((wo) => String(wo.status) === 'Not Started').length}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-chart-1/5">
                <span className="text-[10px] text-muted-foreground">قيد التنفيذ</span>
                <span className="text-lg font-bold tabular-nums text-chart-1">
                  {workOrders.filter((wo) => String(wo.status) === 'In Process').length}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-primary/5">
                <span className="text-[10px] text-muted-foreground">مكتمل</span>
                <span className="text-lg font-bold tabular-nums text-primary">
                  {completedWorkOrders}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-destructive/5">
                <span className="text-[10px] text-muted-foreground">متوقف</span>
                <span className="text-lg font-bold tabular-nums text-destructive">
                  {stoppedWorkOrders}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                <span className="text-[10px] text-muted-foreground">مسودة</span>
                <span className="text-lg font-bold tabular-nums text-slate-700 dark:text-slate-300">
                  {draftWorkOrders}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                <span className="text-[10px] text-muted-foreground">ملغى</span>
                <span className="text-lg font-bold tabular-nums text-gray-600 dark:text-gray-400">
                  {workOrders.filter((wo) => String(wo.status) === 'Cancelled').length}
                </span>
              </div>
            </div>
          )}
          {/* Progress bar for overall completion */}
          {!isLoading && workOrders.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">معدل الإنجاز الإجمالي</span>
                <span className={`text-xs font-semibold ${avgCompletionRate >= 80 ? 'text-primary' : avgCompletionRate >= 50 ? 'text-chart-2' : 'text-destructive'}`}>
                  {avgCompletionRate}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${avgCompletionRate >= 80 ? 'bg-chart-3' : avgCompletionRate >= 50 ? 'bg-chart-2' : 'bg-destructive'}`}
                  style={{ width: `${avgCompletionRate}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                بناءً على {workOrders.filter((wo) => ['In Process', 'Completed'].includes(String(wo.status))).length} أمر عمل (قيد التنفيذ + مكتمل)
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
