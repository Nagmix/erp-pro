'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import {
  formatNumber,
  formatCurrency,
} from '@/lib/core/helpers';
import { useDocList } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PageHeader, PageShell, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { ExportButton } from '@/components/erp/export-button';
import {
  Package,
  Warehouse as WarehouseIcon,
  AlertTriangle,
  XCircle,
  Filter,
  ChevronDown,
  X,
  TrendingDown,
  BarChart3,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────
   أنواع البيانات
   ──────────────────────────────────────────────── */

interface BinRow {
  name: string;
  item_code: string;
  item_name?: string;
  warehouse: string;
  actual_qty: number;
  reserved_qty?: number;
  ordered_qty?: number;
  projected_qty?: number;
  valuation_rate?: number;
  stock_value?: number;
}

/* ────────────────────────────────────────────────
   ثوابت ومساعدات
   ──────────────────────────────────────────────── */

/** عتبة المخزون المنخفض (يمكن تعديلها) */
const LOW_STOCK_THRESHOLD = 10;

/** تصنيف حالة المخزون */
type StockStatus = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

function getStockStatus(qty: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (qty <= 0) return 'out_of_stock';
  if (qty <= LOW_STOCK_THRESHOLD) return 'low_stock';
  return 'in_stock';
}

/** لون الكمية حسب الحالة */
function qtyColorClass(qty: number): string {
  const status = getStockStatus(qty);
  switch (status) {
    case 'out_of_stock':
      return 'text-destructive font-bold';
    case 'low_stock':
      return 'text-amber-600 dark:text-amber-400 font-semibold';
    case 'in_stock':
      return 'text-emerald-600 dark:text-emerald-400 font-medium';
  }
}

/** شارة حالة المخزون */
function StockStatusBadge({ qty }: { qty: number }) {
  const status = getStockStatus(qty);
  switch (status) {
    case 'out_of_stock':
      return (
        <Badge variant="outline" className="border-0 text-[10px] font-semibold px-1.5 py-0 bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25">
          نفذ
        </Badge>
      );
    case 'low_stock':
      return (
        <Badge variant="outline" className="border-0 text-[10px] font-semibold px-1.5 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/25">
          منخفض
        </Badge>
      );
    case 'in_stock':
      return (
        <Badge variant="outline" className="border-0 text-[10px] font-semibold px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/25">
          متوفر
        </Badge>
      );
  }
}

/* ────────────────────────────────────────────────
   الصفحة الرئيسية
   ──────────────────────────────────────────────── */

export default function StockLevelsPage() {
  const { company } = useDefaultCompanyName();

  /* ── حالة الفلاتر ── */
  const [whFilter, setWhFilter] = useState('');
  const [itemGroupFilter, setItemGroupFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<StockStatus>('all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* ── جلب بيانات Bin ── */
  const filters = useMemo(() => {
    const f: string[][] = [];
    if (whFilter.trim() && whFilter !== 'all') f.push(['warehouse', '=', whFilter.trim()]);
    return f.length ? f : undefined;
  }, [whFilter]);

  const { data, isLoading, isError, error, refetch } = useDocList<BinRow>('Bin', {
    fields: [
      'name', 'item_code', 'warehouse', 'actual_qty',
      'reserved_qty', 'ordered_qty', 'projected_qty',
      'valuation_rate', 'stock_value',
    ],
    filters,
    order_by: 'warehouse asc, item_code asc',
    limit: 5000,
  });

  /* ── جلب المستودعات للفلتر ── */
  const { data: warehouses = [] } = useDocList<Record<string, unknown>>('Warehouse', {
    fields: ['name'],
    limit: 500,
  });

  /* ── جلب مجموعات الأصناف للفلتر ── */
  const { data: itemGroups = [] } = useDocList<Record<string, unknown>>('Item Group', {
    fields: ['name'],
    limit: 200,
  });

  /* ── جلب أسماء الأصناف ── */
  const { data: itemNames = [] } = useDocList<Record<string, unknown>>('Item', {
    fields: ['name', 'item_name', 'item_group'],
    limit: 5000,
  });

  const itemNameMap = useMemo(() => {
    const map = new Map<string, { itemName: string; itemGroup: string }>();
    for (const item of itemNames) {
      if (item.name && typeof item.name === 'string') {
        map.set(item.name, {
          itemName: (typeof item.item_name === 'string' ? item.item_name : '') || item.name,
          itemGroup: (typeof item.item_group === 'string' ? item.item_group : '') || '',
        });
      }
    }
    return map;
  }, [itemNames]);

  /* ── إثراء الصفوف بأسماء الأصناف ── */
  const enrichedRows: (BinRow & { item_name: string; item_group: string })[] = useMemo(() => {
    const rows = data || [];
    return rows.map((r) => {
      const info = itemNameMap.get(r.item_code);
      return {
        ...r,
        item_name: info?.itemName || r.item_name || r.item_code,
        item_group: info?.itemGroup || '',
      };
    });
  }, [data, itemNameMap]);

  /* ── حسابات KPI ── */
  const kpis = useMemo(() => {
    const uniqueItems = new Set(enrichedRows.map((r) => r.item_code));
    const totalItems = uniqueItems.size;
    const totalStockValue = enrichedRows.reduce((sum, r) => sum + (Number(r.stock_value ?? 0)), 0);
    const lowStockItems = new Set(
      enrichedRows
        .filter((r) => {
          const qty = Number(r.actual_qty ?? 0);
          return qty > 0 && qty <= LOW_STOCK_THRESHOLD;
        })
        .map((r) => r.item_code)
    ).size;
    const outOfStockItems = new Set(
      enrichedRows
        .filter((r) => Number(r.actual_qty ?? 0) <= 0)
        .map((r) => r.item_code)
    ).size;
    return { totalItems, totalStockValue, lowStockItems, outOfStockItems };
  }, [enrichedRows]);

  /* ── فلترة البيانات ── */
  const filteredRows = useMemo(() => {
    let result = enrichedRows;

    // فلتر البحث النصي
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.item_code.toLowerCase().includes(s) ||
          r.item_name.toLowerCase().includes(s) ||
          r.warehouse.toLowerCase().includes(s)
      );
    }

    // فلتر حالة المخزون
    if (stockStatusFilter !== 'all') {
      result = result.filter((r) => {
        const status = getStockStatus(Number(r.actual_qty ?? 0));
        if (stockStatusFilter === 'in_stock') return status === 'in_stock';
        if (stockStatusFilter === 'low_stock') return status === 'low_stock';
        if (stockStatusFilter === 'out_of_stock') return status === 'out_of_stock';
        return true;
      });
    }

    // فلتر مجموعة الصنف
    if (itemGroupFilter.trim() && itemGroupFilter !== 'all') {
      result = result.filter((r) => r.item_group === itemGroupFilter);
    }

    return result;
  }, [enrichedRows, search, stockStatusFilter, itemGroupFilter]);

  /* ── تعريف أعمدة الجدول ── */
  const columns: Column<BinRow & { item_name: string; item_group: string }>[] = useMemo(
    () => [
      {
        key: 'item_code',
        header: 'كود الصنف',
        sortable: true,
        filterable: true,
        width: 'w-[130px]',
        render: (v) => <span className="font-medium text-primary">{String(v)}</span>,
      },
      {
        key: 'item_name',
        header: 'اسم الصنف',
        sortable: true,
        filterable: true,
        width: 'w-[180px]',
        render: (v, row) => (
          <div className="flex items-center gap-1.5">
            <Package className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[160px]" title={String(v)}>{String(v || row.item_code)}</span>
          </div>
        ),
      },
      {
        key: 'warehouse',
        header: 'المستودع',
        sortable: true,
        filterable: true,
        width: 'w-[140px]',
        render: (v) => (
          <div className="flex items-center gap-1.5">
            <WarehouseIcon className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[120px]" title={String(v)}>{String(v)}</span>
          </div>
        ),
      },
      {
        key: 'actual_qty',
        header: 'الكمية الفعلية',
        sortable: true,
        width: 'w-[110px]',
        render: (v) => {
          const q = Number(v ?? 0);
          return (
            <span className={cn('tabular-nums', qtyColorClass(q))}>
              {formatNumber(q)}
            </span>
          );
        },
      },
      {
        key: 'reserved_qty',
        header: 'محجوز',
        sortable: true,
        width: 'w-[80px]',
        render: (v) => {
          const q = Number(v ?? 0);
          return (
            <span className={cn('tabular-nums text-xs', q > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
              {formatNumber(q)}
            </span>
          );
        },
      },
      {
        key: 'ordered_qty',
        header: 'مطلوب',
        sortable: true,
        width: 'w-[80px]',
        render: (v) => {
          const q = Number(v ?? 0);
          return (
            <span className={cn('tabular-nums text-xs', q > 0 ? 'text-sky-600 dark:text-sky-400' : 'text-muted-foreground')}>
              {formatNumber(q)}
            </span>
          );
        },
      },
      {
        key: 'projected_qty',
        header: 'المتوقع',
        sortable: true,
        width: 'w-[90px]',
        render: (v) => {
          const q = Number(v ?? 0);
          return (
            <span className={cn('tabular-nums text-xs font-medium', qtyColorClass(q))}>
              {formatNumber(q)}
            </span>
          );
        },
      },
      {
        key: 'valuation_rate',
        header: 'سعر التقييم',
        sortable: true,
        width: 'w-[110px]',
        render: (v) => (
          <span className="tabular-nums text-xs">
            {v != null && Number(v) > 0 ? formatCurrency(Number(v)) : '—'}
          </span>
        ),
      },
      {
        key: 'stock_value',
        header: 'قيمة المخزون',
        sortable: true,
        width: 'w-[120px]',
        render: (v) => (
          <span className="tabular-nums text-xs font-semibold">
            {v != null && Number(v) > 0 ? formatCurrency(Number(v)) : '—'}
          </span>
        ),
      },
    ],
    [],
  );

  /* ── مسح الفلاتر ── */
  const clearFilters = () => {
    setSearch('');
    setWhFilter('all');
    setItemGroupFilter('all');
    setStockStatusFilter('all');
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    (whFilter.trim() !== '' && whFilter !== 'all') ||
    (itemGroupFilter.trim() !== '' && itemGroupFilter !== 'all') ||
    stockStatusFilter !== 'all';

  /* ── أعمدة التصدير ── */
  const exportColumns = useMemo(
    () => [
      { key: 'item_code', header: 'كود الصنف' },
      { key: 'item_name', header: 'اسم الصنف' },
      { key: 'warehouse', header: 'المستودع' },
      { key: 'actual_qty', header: 'الكمية الفعلية' },
      { key: 'reserved_qty', header: 'محجوز' },
      { key: 'ordered_qty', header: 'مطلوب' },
      { key: 'projected_qty', header: 'المتوقع' },
      { key: 'valuation_rate', header: 'سعر التقييم' },
      { key: 'stock_value', header: 'قيمة المخزون' },
    ],
    [],
  );

  const warehouseOptions = useMemo(
    () => warehouses.map((w) => String(w.name)).filter(Boolean).sort(),
    [warehouses],
  );

  const itemGroupOptions = useMemo(
    () => itemGroups.map((g) => String(g.name)).filter(Boolean).sort(),
    [itemGroups],
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="مستويات المخزون"
        description="عرض كميات المخزون حسب المستودع مع تنبيهات المخزون المنخفق والمنفذ مع إمكانيات الفلترة والتصدير"
        iconify="solar:box-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المخزون', href: '/inventory' }, { label: 'مستويات المخزون' }]}
      />

      {/* ── بطاقات KPI ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي الأصناف"
          value={formatNumber(kpis.totalItems)}
          icon={Package}
          accent="info"
          description="عدد الأصناف الفريدة في المستودعات"
        />
        <KpiCard
          title="إجمالي قيمة المخزون"
          value={formatCurrency(kpis.totalStockValue)}
          icon={DollarSign}
          accent="primary"
          description="مجموع قيم المخزون لجميع الأصناف"
        />
        <KpiCard
          title="أصناف منخفضة"
          value={formatNumber(kpis.lowStockItems)}
          icon={TrendingDown}
          accent="warning"
          description={`أصناف بكمية أقل من ${LOW_STOCK_THRESHOLD} وحدة`}
        />
        <KpiCard
          title="أصناف نفذت"
          value={formatNumber(kpis.outOfStockItems)}
          icon={XCircle}
          accent="destructive"
          description="أصناف بكمية صفر أو سالبة"
        />
      </KpiStrip>

      {/* ── شريط البحث والفلاتر ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="بحث بالصنف أو المستودع..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* أزرار سريعة لحالة المخزون */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant={stockStatusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => setStockStatusFilter('all')}
            >
              الكل
            </Button>
            <Button
              type="button"
              variant={stockStatusFilter === 'in_stock' ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-8 text-xs gap-1',
                stockStatusFilter === 'in_stock' && 'bg-emerald-600 hover:bg-emerald-700',
              )}
              onClick={() => setStockStatusFilter('in_stock')}
            >
              <Package className="h-3 w-3" />
              متوفر
            </Button>
            <Button
              type="button"
              variant={stockStatusFilter === 'low_stock' ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-8 text-xs gap-1',
                stockStatusFilter === 'low_stock' && 'bg-amber-600 hover:bg-amber-700',
              )}
              onClick={() => setStockStatusFilter('low_stock')}
            >
              <AlertTriangle className="h-3 w-3" />
              منخفض
            </Button>
            <Button
              type="button"
              variant={stockStatusFilter === 'out_of_stock' ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-8 text-xs gap-1',
                stockStatusFilter === 'out_of_stock' && 'bg-destructive hover:bg-destructive/90',
              )}
              onClick={() => setStockStatusFilter('out_of_stock')}
            >
              <XCircle className="h-3 w-3" />
              نفذ
            </Button>
          </div>
        </div>

        {/* فلاتر متقدمة (قابلة للطي) */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" />
                فلاتر متقدمة
                <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" />
                مسح الفلاتر
              </Button>
            )}
            <span className="ms-auto text-[10px]">
              عرض {formatNumber(filteredRows.length)} من {formatNumber(enrichedRows.length)} سجل
            </span>
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-3 border-t mt-1">
              {/* فلتر المستودع */}
              <div className="space-y-1">
                <Label className="text-[10px]">المستودع</Label>
                <Select dir="rtl" value={whFilter || 'all'} onValueChange={setWhFilter}>
                  <SelectTrigger className="h-8 text-xs w-48">
                    <SelectValue placeholder="كل المستودعات" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">كل المستودعات</SelectItem>
                    {warehouseOptions.map((w) => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* فلتر مجموعة الصنف */}
              <div className="space-y-1">
                <Label className="text-[10px]">مجموعة الصنف</Label>
                <Select dir="rtl" value={itemGroupFilter || 'all'} onValueChange={setItemGroupFilter}>
                  <SelectTrigger className="h-8 text-xs w-44">
                    <SelectValue placeholder="كل المجموعات" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">كل المجموعات</SelectItem>
                    {itemGroupOptions.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* فلتر حالة المخزون */}
              <div className="space-y-1">
                <Label className="text-[10px]">حالة المخزون</Label>
                <Select dir="rtl" value={stockStatusFilter} onValueChange={(v) => setStockStatusFilter(v as StockStatus)}>
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="in_stock">متوفر</SelectItem>
                    <SelectItem value="low_stock">منخفض</SelectItem>
                    <SelectItem value="out_of_stock">نفذ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* عرض معلومات الشركة */}
              {company && (
                <div className="flex items-end">
                  <p className="text-[10px] text-muted-foreground pb-1">الشركة: {company}</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ── جدول المخزون ── */}
      <PageShell padded={false}>
        <DataTable
          data={filteredRows}
          columns={columns}
          searchable
          loading={isLoading}
          tableId="stock-levels-list"
          columnFilters
          stickyFirstColumn
          exportFileName="stock-levels"
          printTitle="مستويات المخزون"
          getRowId={(row) => (row as BinRow).name}
          onView={(row) => {
            // فتح صفحة الصنف في تبويب جديد
            window.open(`/inventory/items?search=${encodeURIComponent((row as BinRow).item_code)}`, '_blank');
          }}
        />
      </PageShell>

      {/* ── ملخص سريع أسفل الجدول ── */}
      {filteredRows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
            <p className="text-[10px] text-muted-foreground mb-1">إجمالي الكمية الفعلية</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatNumber(filteredRows.reduce((sum, r) => sum + Number(r.actual_qty ?? 0), 0))}
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
            <p className="text-[10px] text-muted-foreground mb-1">إجمالي الكمية المحجوزة</p>
            <p className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {formatNumber(filteredRows.reduce((sum, r) => sum + Number(r.reserved_qty ?? 0), 0))}
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
            <p className="text-[10px] text-muted-foreground mb-1">إجمالي قيمة المخزون المعروض</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatCurrency(filteredRows.reduce((sum, r) => sum + Number(r.stock_value ?? 0), 0))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
