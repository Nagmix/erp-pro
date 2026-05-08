'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { formatNumber } from '@/lib/core/helpers';
import { useDocList } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { AlertTriangle, Warehouse, Package, Filter, ChevronDown, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BinRow {
  name: string;
  item_code: string;
  warehouse: string;
  actual_qty: number;
  reserved_qty?: number;
  ordered_qty?: number;
  projected_qty?: number;
}

export default function StockLevelsPage() {
  const { company } = useDefaultCompanyName();
  const [whFilter, setWhFilter] = useState('');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters = useMemo(() => {
    const f: string[][] = [];
    if (whFilter.trim()) f.push(['warehouse', '=', whFilter.trim()]);
    return f.length ? f : undefined;
  }, [whFilter]);

  const { data, isLoading, isError, error, refetch } = useDocList<BinRow>('Bin', {
    fields: ['name', 'item_code', 'warehouse', 'actual_qty', 'reserved_qty', 'ordered_qty', 'projected_qty'],
    filters,
    order_by: 'warehouse asc, item_code asc',
    limit: 2000,
  });

  const rows = data || [];  const columns: Column<BinRow>[] = useMemo(
    () => [
      { key: 'item_code', header: 'الصنف', sortable: true, render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
      { key: 'warehouse', header: 'المستودع', sortable: true },
      {
        key: 'actual_qty',
        header: 'الكمية الفعلية',
        sortable: true,
        render: (v, row) => {
          const q = Number(v);
          const warn = q > 0 && q <= 10;
          return <span className={`tabular-nums font-semibold ${warn ? 'text-destructive' : ''}`}>{formatNumber(q)}</span>;
        }},
      { key: 'reserved_qty', header: 'محجوز', render: (v) => <span className="tabular-nums text-muted-foreground text-xs">{formatNumber(Number(v ?? 0))}</span> },
      { key: 'projected_qty', header: 'متوقع', render: (v) => <span className="tabular-nums text-xs">{formatNumber(Number(v ?? 0))}</span> },
    ],
    []
  );  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="مستويات المخزون"
        description="عرض كميات المخزون حسب المستودع مع إمكانيات الفلترة والتنبيه على المنخفض"
        iconify="solar:box-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المخزون', href: '/inventory' }, { label: 'مستويات المخزون' }]}
      />

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث بالصنف أو المستودع..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
      </div>


      <PageShell className="space-y-2 border-border/60">
          <Label className="text-xs">فلتر مستودع (اسم سجل Warehouse بالضبط)</Label>
          <Input dir="ltr" value={whFilter} onChange={(e) => setWhFilter(e.target.value)} placeholder="اتركه فارغاً لكل المستودعات" className="max-w-md" />
          {company && <p className="text-[10px] text-muted-foreground">الشركة الحالية: {company}</p>}
      </PageShell>

      <PageShell padded={false}>
        <DataTable data={rows} columns={columns} searchable loading={isLoading} />
      </PageShell>
    </div>
  );
}
