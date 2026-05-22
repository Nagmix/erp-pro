'use client';

import { useMemo } from 'react';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import Link from 'next/link';
import { useDocList } from '@/lib/client/hooks';
import { PageHeader } from '@/components/erp/page-header';
import { StatusBadge } from '@/components/erp/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/core/helpers';
import {
  Package,
  Warehouse,
  ArrowRightLeft,
  AlertTriangle,
  BarChart3,
  FileText,
  ChevronLeft,
  Box,
  TrendingDown,
  CircleAlert,
  ClipboardCheck,
  Layers,
  ShoppingBag,
  ArrowUpDown,
  DollarSign,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Quick Actions                                                      */
/* ------------------------------------------------------------------ */
const QUICK_ACTIONS = [
  { label: 'حركة مخزون جديدة', href: '/inventory/stock-entry?new=1', icon: ArrowRightLeft, color: 'bg-chart-4/10 text-chart-4' },
  { label: 'جرد المخزون', href: '/inventory/stock-levels', icon: ClipboardCheck, color: 'bg-primary/10 text-primary' },
  { label: 'الأصناف', href: '/inventory/items', icon: Package, color: 'bg-chart-1/10 text-chart-1' },
  { label: 'المستودعات', href: '/inventory/warehouses', icon: Warehouse, color: 'bg-chart-2/10 text-chart-2' },
];

/* ------------------------------------------------------------------ */
/*  Stock Entry type labels                                            */
/* ------------------------------------------------------------------ */
const SE_TYPE_LABELS: Record<string, string> = {
  'Material Receipt': 'استلام مواد',
  'Material Issue': 'صرف مواد',
  'Material Transfer': 'تحويل مواد',
  'Material Transfer for Manufacture': 'تحويل للتصنيع',
  'Manufacture': 'تصنيع',
  'Repack': 'إعادة تعبئة',
  'Subcontract': 'مقاولة',
};

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function InventoryDashboardPage() {
  const { company } = useDefaultCompanyName();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  /* ---------- Fetch data ---------- */
  const { data: items = [], isLoading: itemsLoading } = useDocList<Record<string, unknown>>(
    'Item',
    {
      fields: ['name', 'item_name', 'item_group', 'stock_uom', 'is_stock_item', 'valuation_rate'],
      limit: 200,
      filters: [['is_stock_item', '=', '1']],
    }
  );

  const { data: stockEntries = [], isLoading: seLoading } = useDocList<Record<string, unknown>>(
    'Stock Entry',
    {
      fields: ['name', 'stock_entry_type', 'posting_date', 'total_amount', 'docstatus', 'from_warehouse', 'to_warehouse'],
      limit: 50,
      order_by: 'posting_date desc',
      filters: company ? [['company', '=', company]] : [],
    }
  );

  const { data: warehouses = [], isLoading: whLoading } = useDocList<Record<string, unknown>>(
    'Warehouse',
    {
      fields: ['name', 'warehouse_name', 'warehouse_type', 'is_group'],
      limit: 100,
      filters: company ? [['company', '=', company]] : [],
    }
  );

  const warehouseNames = useMemo(() => (warehouses || []).map((w: any) => w.name), [warehouses]);

  const { data: bins = [], isLoading: binsLoading } = useDocList<Record<string, unknown>>(
    'Bin',
    {
      fields: ['name', 'item_code', 'warehouse', 'actual_qty', 'valuation_rate', 'stock_value', 'projected_qty'],
      limit: 500,
      filters: warehouseNames.length > 0 ? [['warehouse', 'in', warehouseNames as string[]]] as string[][] : [],
    }
  );

  const isLoading = itemsLoading || seLoading || whLoading || binsLoading;

  /* ---------- KPI calculations ---------- */
  const totalItems = items.length;

  const totalStockValue = useMemo(
    () => bins.reduce((sum, bin) => sum + Number(bin.stock_value || 0), 0),
    [bins]
  );

  const warehousesCount = useMemo(
    () => warehouses.filter((w) => String(w.is_group) !== '1').length,
    [warehouses]
  );

  const stockEntriesThisMonth = useMemo(
    () => stockEntries.filter((se) => String(se.posting_date ?? '').startsWith(thisMonth)).length,
    [stockEntries, thisMonth]
  );

  const LOW_STOCK_THRESHOLD = 5;

  const lowStockItems = useMemo(
    () => bins.filter((bin) => {
      const actual = Number(bin.actual_qty || 0);
      return actual > 0 && actual <= LOW_STOCK_THRESHOLD;
    }),
    [bins]
  );

  const outOfStockItems = useMemo(
    () => {
      const itemBins = new Map<string, number>();
      for (const bin of bins) {
        const key = String(bin.item_code);
        itemBins.set(key, (itemBins.get(key) || 0) + Number(bin.actual_qty || 0));
      }
      return Array.from(itemBins.entries()).filter(([, qty]) => qty <= 0).length;
    },
    [bins]
  );

  const pendingTransfers = useMemo(
    () => stockEntries.filter((se) => Number(se.docstatus) === 0 && String(se.stock_entry_type) === 'Material Transfer').length,
    [stockEntries]
  );

  const reorderRequired = useMemo(
    () => bins.filter((bin) => {
      const projected = Number(bin.projected_qty || 0);
      return projected <= LOW_STOCK_THRESHOLD && projected > 0;
    }).length,
    [bins]
  );

  /* ---------- Low stock alert list ---------- */
  const lowStockAlerts = useMemo(() => {
    return bins
      .filter((bin) => {
        const actual = Number(bin.actual_qty || 0);
        return actual > 0 && actual <= LOW_STOCK_THRESHOLD;
      })
      .map((bin) => ({
        itemCode: String(bin.item_code),
        warehouse: String(bin.warehouse),
        actualQty: Number(bin.actual_qty || 0),
        reorderLevel: LOW_STOCK_THRESHOLD,
      }))
      .slice(0, 10);
  }, [bins]);

  /* ---------- Stock value by warehouse ---------- */
  const stockByWarehouse = useMemo(() => {
    const map = new Map<string, { name: string; value: number }>();
    for (const bin of bins) {
      const key = String(bin.warehouse);
      const existing = map.get(key) || { name: key, value: 0 };
      existing.value += Number(bin.stock_value || 0);
      map.set(key, existing);
    }
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [bins]);

  const maxWarehouseValue = useMemo(() => Math.max(...stockByWarehouse.map((w) => w.value), 1), [stockByWarehouse]);

  /* ---------- Top 5 items by stock value ---------- */
  const topItemsByValue = useMemo(() => {
    const map = new Map<string, { name: string; value: number; qty: number }>();
    for (const bin of bins) {
      const key = String(bin.item_code);
      const existing = map.get(key) || { name: key, value: 0, qty: 0 };
      existing.value += Number(bin.stock_value || 0);
      existing.qty += Number(bin.actual_qty || 0);
      map.set(key, existing);
    }
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [bins]);

  const maxItemValue = useMemo(() => Math.max(...topItemsByValue.map((it) => it.value), 1), [topItemsByValue]);

  /* ---------- Recent stock movements ---------- */
  const recentMovements = useMemo(
    () => stockEntries
      .filter((se) => Number(se.docstatus) === 1)
      .slice(0, 10)
      .map((se) => ({
        name: String(se.name ?? ''),
        type: String(se.stock_entry_type ?? ''),
        typeAr: SE_TYPE_LABELS[String(se.stock_entry_type ?? '')] || String(se.stock_entry_type ?? '—'),
        date: String(se.posting_date ?? ''),
        amount: Number(se.total_amount ?? 0),
        from: String(se.from_warehouse ?? ''),
        to: String(se.to_warehouse ?? ''),
      })),
    [stockEntries]
  );

  /* ---------- Stock entry type summary ---------- */
  const seTypeSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const se of stockEntries) {
      if (Number(se.docstatus) !== 1) continue;
      const type = String(se.stock_entry_type ?? 'Other');
      map.set(type, (map.get(type) || 0) + 1);
    }
    const colorMap: Record<string, string> = {
      'Material Receipt': 'bg-chart-3',
      'Material Issue': 'bg-destructive',
      'Material Transfer': 'bg-chart-1',
      'Manufacture': 'bg-chart-2',
    };
    return Array.from(map.entries()).map(([type, count]) => ({
      type,
      label: SE_TYPE_LABELS[type] || type,
      count,
      color: colorMap[type] || 'bg-muted',
    }));
  }, [stockEntries]);

  const totalSE = useMemo(() => Math.max(seTypeSummary.reduce((s, p) => s + p.count, 0), 1), [seTypeSummary]);

  return (
    <div dir="rtl" className="erp-page-enter mx-auto w-full max-w-[1600px] space-y-5 md:space-y-6">
      <PageHeader
        title="لوحة تحكم المخزون"
        description="مراقبة مستويات المخزون والحركات والتنبيهات وإدارة المستودعات"
        iconify="solar:box-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المخزون' }, { label: 'لوحة التحكم' }]}
      />

      {/* ── KPI Row 1 ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-border/40">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-[11px] text-muted-foreground">الأصناف</span>
            </div>
            <p className="text-lg font-bold tabular-nums">{totalItems}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-chart-3" />
              <span className="text-[11px] text-muted-foreground">قيمة المخزون</span>
            </div>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(totalStockValue)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Warehouse className="h-4 w-4 text-chart-2" />
              <span className="text-[11px] text-muted-foreground">المستودعات</span>
            </div>
            <p className="text-lg font-bold tabular-nums">{warehousesCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRightLeft className="h-4 w-4 text-chart-4" />
              <span className="text-[11px] text-muted-foreground">حركات الشهر</span>
            </div>
            <p className="text-lg font-bold tabular-nums">{stockEntriesThisMonth}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <CircleAlert className="h-4 w-4 text-destructive" />
              <span className="text-[11px] text-muted-foreground">نفذ المخزون</span>
            </div>
            <p className="text-lg font-bold tabular-nums">{outOfStockItems}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpDown className="h-4 w-4 text-chart-1" />
              <span className="text-[11px] text-muted-foreground">تحويلات معلقة</span>
            </div>
            <p className="text-lg font-bold tabular-nums">{pendingTransfers}</p>
          </CardContent>
        </Card>
      </div>
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

      {/* ── Low Stock Alerts & Stock by Warehouse ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low stock alert list */}
        <Card className={`border-border/40 ${lowStockAlerts.length > 0 ? 'border-chart-2/30' : ''}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {lowStockAlerts.length > 0 && <AlertTriangle className="h-4 w-4 text-amber-500" />}
              <CardTitle className="text-sm font-semibold">تنبيهات المخزون المنخفض</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {lowStockAlerts.length === 0 && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Package className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-xs text-muted-foreground">جميع الأصناف فوق مستوى إعادة الطلب</p>
              </div>
            )}
            {lowStockAlerts.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lowStockAlerts.map((alert, i) => {
                  const ratio = alert.reorderLevel > 0 ? (alert.actualQty / alert.reorderLevel) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 flex items-center justify-center rounded-md bg-chart-2/10 shrink-0">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium truncate">{alert.itemCode}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{alert.warehouse}</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">الكمية:</span>
                          <span className="text-xs font-semibold">{alert.actualQty}</span>
                          <span className="text-[10px] text-muted-foreground">/ {alert.reorderLevel}</span>
                        </div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${ratio < 30 ? 'bg-destructive' : ratio < 70 ? 'bg-chart-2' : 'bg-chart-3'}`}
                            style={{ width: `${Math.min(ratio, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock value by warehouse */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">قيمة المخزون حسب المستودع</CardTitle>
              <Link href="/inventory/warehouses" className="text-xs text-primary hover:underline">عرض الكل</Link>
            </div>
          </CardHeader>
          <CardContent>
            {stockByWarehouse.length === 0 && (
              <p className="text-xs text-muted-foreground py-8 text-center">لا توجد بيانات مستودعات بعد.</p>
            )}
            {stockByWarehouse.length > 0 && (
              <div className="space-y-3">
                {stockByWarehouse.map((wh, i) => (
                  <div key={wh.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-4/10 text-[10px] font-bold text-chart-4">
                          {i + 1}
                        </span>
                        <span className="text-xs font-medium truncate max-w-[160px]">{wh.name}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums">{formatCurrency(wh.value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-chart-4 transition-all duration-500"
                        style={{ width: `${(wh.value / maxWarehouseValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Movements & Top Items & SE Type Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Stock Movements */}
        <Card className="lg:col-span-2 border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">آخر حركات المخزون</CardTitle>
              <Link href="/inventory/stock-entry" className="text-xs text-primary hover:underline">عرض الكل</Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-xs text-muted-foreground py-6 text-center">جاري التحميل…</p>}
            {!isLoading && recentMovements.length === 0 && (
              <p className="text-xs text-muted-foreground py-8 text-center">لا توجد حركات مخزون حالياً.</p>
            )}
            {!isLoading && recentMovements.length > 0 && (
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {recentMovements.map((mv, i) => (
                  <div
                    key={`${mv.name}-${i}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-4/10">
                        <ArrowRightLeft className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{mv.name}</p>
                        <p className="text-[10px] text-muted-foreground">{mv.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-0 bg-orange/10 text-chart-4">
                        {mv.typeAr}
                      </Badge>
                      {mv.amount > 0 && (
                        <span className="text-xs font-semibold tabular-nums">{formatCurrency(mv.amount)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: Top Items + SE Type */}
        <div className="space-y-4">
          {/* Top 5 items by stock value */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">أعلى 5 أصناف حسب القيمة</CardTitle>
            </CardHeader>
            <CardContent>
              {topItemsByValue.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">لا توجد بيانات أصناف.</p>
              )}
              {topItemsByValue.length > 0 && (
                <div className="space-y-2">
                  {topItemsByValue.map((item, i) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium truncate max-w-[120px]">{item.id}</span>
                        <span className="text-[11px] font-semibold tabular-nums">{formatCurrency(item.value)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/70 transition-all duration-500"
                          style={{ width: `${(item.value / maxItemValue) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Entry Type Summary */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">ملخص أنواع حركات المخزون</CardTitle>
            </CardHeader>
            <CardContent>
              {seTypeSummary.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">لا توجد حركات.</p>
              )}
              {seTypeSummary.length > 0 && (
                <div className="space-y-3">
                  <div className="flex rounded-full overflow-hidden h-3">
                    {seTypeSummary.map((item, i) => (
                      <div
                        key={i}
                        className={`${item.color} transition-all duration-500`}
                        style={{ width: `${(item.count / totalSE) * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {seTypeSummary.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                          <span className="text-[10px] text-muted-foreground">{item.label}</span>
                        </div>
                        <span className="text-xs font-semibold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
