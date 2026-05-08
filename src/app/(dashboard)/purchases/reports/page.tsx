'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { EmptyState } from '@/components/erp/empty-state';
import { ExportButton } from '@/components/erp/export-button';
import { useRunReport } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { normalizeFrappeReportPayload } from '@/lib/reports/normalize-frappe-report';
import { normalizedColumnsToDataTable } from '@/lib/reports/frappe-report-columns';
import { buildPurchaseRegisterFilters } from '@/lib/reports/accounting-advanced-filters';
import {
  buildPaymentLedgerFilters,
  buildPurchaseAnalyticsFilters,
  buildPurchaseOrderAnalysisFilters,
  type PurchaseAnalyticsTree,
} from '@/lib/reports/sales-purchase-hr-filters';
import { ClipboardList, CreditCard, FileSpreadsheet, LayoutGrid, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type PurchaseReportTab =
  | 'purchases-by-supplier'
  | 'purchases-by-product'
  | 'purchase-payments-period'
  | 'purchase-followup'
  | 'purchase-register';

const TAB_META: {
  id: PurchaseReportTab;
  label: string;
  short: string;
  catalogId: string;
  icon: LucideIcon;
}[] = [
  {
    id: 'purchases-by-supplier',
    label: 'تحليل المشتريات — موردين',
    short: 'موردين',
    catalogId: 'purchases-by-supplier',
    icon: Truck,
  },
  {
    id: 'purchases-by-product',
    label: 'تحليل المشتريات — أصناف',
    short: 'أصناف',
    catalogId: 'purchases-by-product',
    icon: LayoutGrid,
  },
  {
    id: 'purchase-payments-period',
    label: 'دفتر المدفوعات',
    short: 'مدفوعات',
    catalogId: 'purchase-payments-period',
    icon: CreditCard,
  },
  {
    id: 'purchase-followup',
    label: 'تحليل أوامر الشراء',
    short: 'أوامر',
    catalogId: 'purchase-followup',
    icon: ClipboardList,
  },
  {
    id: 'purchase-register',
    label: 'سجل المشتريات',
    short: 'سجل',
    catalogId: 'purchase-register',
    icon: FileSpreadsheet,
  },
];

function defaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(now) };
}

export default function PurchaseReportsPage() {
  const { from: d0, to: d1 } = defaultDateRange();
  const [from, setFrom] = useState(d0);
  const [to, setTo] = useState(d1);
  const [tab, setTab] = useState<PurchaseReportTab>('purchases-by-supplier');
  const { company: effectiveCompany } = useDefaultCompanyName();
  const [analyticsRange, setAnalyticsRange] = useState<'Monthly' | 'Quarterly'>('Monthly');

  const reportId = useMemo(
    () => TAB_META.find((t) => t.id === tab)?.catalogId ?? 'purchases-by-supplier',
    [tab]
  );

  const filters = useMemo(() => {
    if (!effectiveCompany || !from || !to) return null;
    if (tab === 'purchase-payments-period') {
      return buildPaymentLedgerFilters({
        company: effectiveCompany,
        periodStart: from,
        periodEnd: to,
      });
    }
    if (tab === 'purchase-followup') {
      return buildPurchaseOrderAnalysisFilters({
        company: effectiveCompany,
        fromDate: from,
        toDate: to,
      });
    }
    if (tab === 'purchase-register') {
      return buildPurchaseRegisterFilters({
        company: effectiveCompany,
        fromDate: from,
        toDate: to,
      });
    }
    const treeType: PurchaseAnalyticsTree =
      tab === 'purchases-by-product' ? 'Item' : 'Supplier';
    return buildPurchaseAnalyticsFilters({
      company: effectiveCompany,
      fromDate: from,
      toDate: to,
      treeType,
      range: analyticsRange,
    });
  }, [effectiveCompany, from, to, tab, analyticsRange]);

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

  const showAnalyticsRange =
    tab === 'purchases-by-supplier' || tab === 'purchases-by-product';

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="تقارير المشتريات"
        description="تحليل المشتريات، سجل فواتير الشراء، دفتر المدفوعات، وتحليل أوامر الشراء."
        iconify="solar:cart-large-4-bold-duotone"
        accent="warning"
      />

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">معايير التقرير</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">من تاريخ</Label>
            <Input type="date" dir="ltr" className="h-9 w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
            <Input type="date" dir="ltr" className="h-9 w-40" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {showAnalyticsRange && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">تجميع الفترات</Label>
              <Select value={analyticsRange} onValueChange={(v) => setAnalyticsRange(v as 'Monthly' | 'Quarterly')}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">شهري</SelectItem>
                  <SelectItem value="Quarterly">ربع سنوي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="ms-auto">
            <ExportButton
              data={normalized.rows}
              filename={TAB_META.find((t) => t.id === tab)?.label ?? 'purchase-report'}
              columns={exportCols}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as PurchaseReportTab)} className="space-y-4">
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
          {tab === 'purchase-payments-period' && (
            <p className="text-xs text-muted-foreground">
              نفس تقرير «دفتر المدفوعات» مع فترة ترحيل مطابقة للتواريخ (شراء/محاسبة).
            </p>
          )}

          {normalized.notice && (
            <div className="rounded-[var(--radius-md-ui)] border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              {normalized.notice}
            </div>
          )}

          {reportQuery.isError && (
            <p className="text-sm text-destructive">
              {(reportQuery.error as Error)?.message ||
                'تعذر تشغيل التقرير. تحقق من الصلاحيات وتثبيت وحدة المشتريات.'}
            </p>
          )}

          {summaryStrip.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {summaryStrip.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-[var(--radius-md-ui)] border border-border/50 bg-card px-3 py-2.5',
                    s.indicator === 'Red' && 'border-red-200/80 bg-red-50/50',
                    s.indicator === 'Green' && 'border-emerald-200/80 bg-emerald-50/50'
                  )}
                >
                  <p className="text-[10px] font-medium text-muted-foreground">{String(s.label ?? '')}</p>
                  <p className="text-lg font-semibold tabular-nums tracking-tight">{String(s.value ?? '—')}</p>
                </div>
              ))}
            </div>
          )}

          {reportQuery.isLoading && (
            <p className="text-xs text-muted-foreground">جاري تحميل التقرير…</p>
          )}

          {!reportQuery.isLoading && !reportQuery.isError && filtersReady && normalized.rows.length === 0 && (
            <EmptyState
              title="لا توجد صفوف للعرض"
              description="جرّب توسيع الفترة أو التحقق من وجود فواتير/أوامر شراء ضمن الشركة."
            />
          )}

          {normalized.rows.length > 0 && (
            <DataTable
              data={normalized.rows}
              columns={tableColumns}
              searchable
              pageSize={25}
              stickyFirstColumn
              exportFileName={TAB_META.find((x) => x.id === tab)?.label ?? 'purchase-report'}
            />
          )}
        </div>
      </Tabs>
    </div>
  );
}
