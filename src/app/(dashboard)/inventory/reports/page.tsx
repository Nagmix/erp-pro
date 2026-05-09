'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { EmptyState } from '@/components/erp/empty-state';
import { ExportButton } from '@/components/erp/export-button';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useRunReport } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { normalizeFrappeReportPayload } from '@/lib/reports/normalize-frappe-report';
import { normalizedColumnsToDataTable } from '@/lib/reports/frappe-report-columns';
import {
  buildItemShortageFilters,
  buildStockAccountValueComparisonFilters,
  buildStockBalanceFilters,
  buildStockLedgerFilters,
  buildWorkOrderSummaryFilters,
} from '@/lib/reports/inventory-filters';
import { AlertTriangle, ArrowRightLeft, Boxes, ClipboardList, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

type InvReportTab =
  | 'stock-balance'
  | 'stock-ledger'
  | 'low-stock'
  | 'stock-reconciliation'
  | 'work-order-summary';

const TAB_META: {
  id: InvReportTab;
  label: string;
  short: string;
  catalogId: string;
  icon: typeof Boxes;
}[] = [
  { id: 'stock-balance', label: 'رصيد المخزون', short: 'رصيد', catalogId: 'stock-balance', icon: Scale },
  { id: 'stock-ledger', label: 'دفتر المخزون', short: 'دفتر', catalogId: 'stock-ledger', icon: ArrowRightLeft },
  { id: 'low-stock', label: 'نقص المخزون', short: 'نقص', catalogId: 'low-stock', icon: AlertTriangle },
  {
    id: 'stock-reconciliation',
    label: 'المخزون مقابل الحسابات',
    short: 'مطابقة',
    catalogId: 'stock-reconciliation',
    icon: ClipboardList,
  },
  {
    id: 'work-order-summary',
    label: 'ملخص أوامر التشغيل',
    short: 'تصنيع',
    catalogId: 'work-order-summary',
    icon: Boxes,
  },
];

function defaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(now) };
}

export default function InventoryReportsPage() {
  const { from: d0, to: d1 } = defaultDateRange();
  const [from, setFrom] = useState(d0);
  const [to, setTo] = useState(d1);
  const [tab, setTab] = useState<InvReportTab>('stock-balance');
  const { company: effectiveCompany } = useDefaultCompanyName();
  const [stockAccount, setStockAccount] = useState('');

  const reportId = useMemo(
    () => TAB_META.find((t) => t.id === tab)?.catalogId ?? 'stock-balance',
    [tab]
  );

  const filters = useMemo(() => {
    if (!effectiveCompany) return null;
    if (tab === 'low-stock') {
      return buildItemShortageFilters({ company: effectiveCompany });
    }
    if (tab === 'stock-reconciliation') {
      return buildStockAccountValueComparisonFilters({
        company: effectiveCompany,
        asOnDate: to,
        ...(stockAccount ? { account: stockAccount } : {}),
      });
    }
    if (!from || !to) return null;
    if (tab === 'stock-balance') {
      return buildStockBalanceFilters({
        company: effectiveCompany,
        fromDate: from,
        toDate: to,
      });
    }
    if (tab === 'stock-ledger') {
      return buildStockLedgerFilters({
        company: effectiveCompany,
        fromDate: from,
        toDate: to,
      });
    }
    if (tab === 'work-order-summary') {
      return buildWorkOrderSummaryFilters({
        company: effectiveCompany,
        fromDate: from,
        toDate: to,
      });
    }
    return null;
  }, [effectiveCompany, from, to, tab, stockAccount]);

  const filtersReady = Boolean(filters);
  const reportQuery = useRunReport(reportId, filters ?? {}, filtersReady);

  const normalized = useMemo(
    () => normalizeFrappeReportPayload(reportQuery.data ?? null),
    [reportQuery.data]
  );

  const tableColumns = useMemo(
    () => normalizedColumnsToDataTable(normalized.columns),
    [normalized.columns]
  );

  const exportCols = tableColumns.map((c) => ({ key: c.key, header: c.header }));
  const summaryStrip = normalized.reportSummary.filter((s) => s && typeof s.value !== 'undefined');

  const tabUsesFromTo =
    tab === 'stock-balance' || tab === 'stock-ledger' || tab === 'work-order-summary';
  const tabCompanyOnly = tab === 'low-stock';
  const tabReco = tab === 'stock-reconciliation';

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="تقارير المخزون والتصنيع"
        description="أرصدة، حركة، نقص، مطابقة مخزون/حساب، وأوامر تشغيل — من النظام."
        iconify="solar:box-bold-duotone"
        accent="warning"
      />

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">معايير التقرير</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          {tabUsesFromTo && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">من تاريخ</Label>
                <Input type="date" dir="ltr" className="h-9 w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
                <Input type="date" dir="ltr" className="h-9 w-40" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}

          {tabReco && (
            <>
              <div className="space-y-1.5 min-w-[220px]">
                <Label className="text-xs text-muted-foreground">حساب مخزون (اختياري)</Label>
                <ErpLinkCombobox
                  doctype="Account"
                  value={stockAccount}
                  onChange={setStockAccount}
                  placeholder="فلترة حسب حساب Stock"
                  className="h-9 w-full min-w-[200px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">كما في تاريخ</Label>
                <Input type="date" dir="ltr" className="h-9 w-40" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}

          <div className="ms-auto">
            <ExportButton
              data={normalized.rows}
              filename={TAB_META.find((t) => t.id === tab)?.label ?? 'inventory-report'}
              columns={exportCols}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as InvReportTab)} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-muted/40 p-1">
          {TAB_META.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.id} value={t.id} className="gap-1.5 data-[state=active]:bg-background">
                <Icon className="h-4 w-4 opacity-80" />
                {t.short}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="space-y-4">
          {tabCompanyOnly && (
            <p className="text-xs text-muted-foreground">يعتمد على أوامر وحدات قياس الأدنى في الأصناف والمستودعات.</p>
          )}

          {normalized.notice && (
            <div className="rounded-[var(--radius-md-ui)] border border-chart-2/20/80 bg-chart-2/5/80 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-chart-2/10 dark:text-amber-100">
              {normalized.notice}
            </div>
          )}

          {reportQuery.isError && (
            <p className="text-sm text-destructive">
              {(reportQuery.error as Error)?.message ||
                'تعذر تشغيل التقرير. تأكد من وحدة المخزون/التصنيع والصلاحيات في النظام.'}
            </p>
          )}

          {summaryStrip.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {summaryStrip.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-[var(--radius-md-ui)] border border-border/50 bg-card px-3 py-2.5',
                    s.indicator === 'Red' && 'border-destructive/20/80 bg-destructive/5/50',
                    s.indicator === 'Green' && 'border-primary/20/80 bg-primary/5/50'
                  )}
                >
                  <p className="text-[10px] font-medium text-muted-foreground">{String(s.label ?? '')}</p>
                  <p className="text-lg font-semibold tabular-nums tracking-tight">{String(s.value ?? '—')}</p>
                </div>
              ))}
            </div>
          )}

          {reportQuery.isLoading && (
            <p className="text-xs text-muted-foreground">جاري تحميل التقرير من النظام…</p>
          )}

          {!reportQuery.isLoading && !reportQuery.isError && filtersReady && normalized.rows.length === 0 && (
            <EmptyState
              title="لا توجد صفوف للعرض"
              description="جرّب توسيع الفترة أو التحقق من بيانات المخزون ضمن الشركة."
            />
          )}

          {normalized.rows.length > 0 && (
            <DataTable
              data={normalized.rows}
              columns={tableColumns}
              searchable
              pageSize={25}
              stickyFirstColumn
              exportFileName={TAB_META.find((x) => x.id === tab)?.label ?? 'inventory-report'}
            />
          )}
        </div>
      </Tabs>
    </div>
  );
}
