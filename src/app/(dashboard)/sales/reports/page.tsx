'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  buildGrossProfitReportFilters,
  buildItemWiseSalesRegisterFilters,
  buildReceivablePayableFilters,
  buildSalesRegisterFilters,
} from '@/lib/reports/accounting-advanced-filters';
import {
  buildPaymentLedgerFilters,
  buildPOSRegisterFilters,
  buildSalesAnalyticsFilters,
  buildSalesPersonWiseSummaryFilters,
  type SalesAnalyticsTree,
} from '@/lib/reports/sales-purchase-hr-filters';
import {
  AlertTriangle,
  BarChart3,
  CreditCard,
  FileSpreadsheet,
  LayoutGrid,
  Receipt,
  TrendingUp,
  Users,
  RefreshCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type SalesReportTab =
  | 'sales-by-customer'
  | 'sales-by-product'
  | 'sales-by-rep'
  | 'sales-register'
  | 'item-wise-sales-register'
  | 'sales-profit'
  | 'sales-invoice-status'
  | 'overdue-invoices'
  | 'payment-splits'
  | 'pos-transactions';

const TAB_META: {
  id: SalesReportTab;
  label: string;
  short: string;
  catalogId: string;
  icon: LucideIcon;
}[] = [
  {
    id: 'sales-by-customer',
    label: 'تحليل المبيعات — عملاء',
    short: 'عملاء',
    catalogId: 'sales-by-customer',
    icon: Users,
  },
  {
    id: 'sales-by-product',
    label: 'تحليل المبيعات — أصناف',
    short: 'أصناف',
    catalogId: 'sales-by-product',
    icon: LayoutGrid,
  },
  {
    id: 'sales-by-rep',
    label: 'ملخص حسب المندوب',
    short: 'مندوب',
    catalogId: 'sales-by-rep',
    icon: Users,
  },
  {
    id: 'sales-register',
    label: 'سجل المبيعات',
    short: 'سجل بيع',
    catalogId: 'sales-register',
    icon: FileSpreadsheet,
  },
  {
    id: 'item-wise-sales-register',
    label: 'سجل مبيعات (تحليلي)',
    short: 'تحليلي',
    catalogId: 'item-wise-sales-register',
    icon: FileSpreadsheet,
  },
  {
    id: 'sales-profit',
    label: 'إجمالي الربح',
    short: 'ربح',
    catalogId: 'sales-profit',
    icon: TrendingUp,
  },
  {
    id: 'sales-invoice-status',
    label: 'ذمم عملاء (كما في تاريخ)',
    short: 'ذمم',
    catalogId: 'sales-invoice-status',
    icon: Receipt,
  },
  {
    id: 'overdue-invoices',
    label: 'ذمم عملاء — مطابقة التقرير',
    short: 'متأخر',
    catalogId: 'overdue-invoices',
    icon: AlertTriangle,
  },
  {
    id: 'payment-splits',
    label: 'دفتر المدفوعات',
    short: 'مدفوعات',
    catalogId: 'payment-splits',
    icon: CreditCard,
  },
  {
    id: 'pos-transactions',
    label: 'سجل نقاط البيع',
    short: 'POS',
    catalogId: 'pos-transactions',
    icon: BarChart3,
  },
];

function defaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(now) };
}

export default function SalesReportsPage() {
  const { from: d0, to: d1 } = defaultDateRange();
  const [from, setFrom] = useState(d0);
  const [to, setTo] = useState(d1);
  const [tab, setTab] = useState<SalesReportTab>('sales-by-customer');
  const { company: effectiveCompany } = useDefaultCompanyName();
  const [analyticsRange, setAnalyticsRange] = useState<'Monthly' | 'Quarterly'>('Monthly');

  const reportId = useMemo(
    () => TAB_META.find((t) => t.id === tab)?.catalogId ?? 'sales-by-customer',
    [tab]
  );

  const filters = useMemo(() => {
    if (!effectiveCompany) return null;
    if (tab === 'sales-invoice-status' || tab === 'overdue-invoices') {
      if (!to) return null;
      return buildReceivablePayableFilters({ company: effectiveCompany, reportDate: to });
    }
    if (!from || !to) return null;
    if (tab === 'payment-splits') {
      return buildPaymentLedgerFilters({
        company: effectiveCompany,
        periodStart: from,
        periodEnd: to,
      });
    }
    if (tab === 'pos-transactions') {
      return buildPOSRegisterFilters({ company: effectiveCompany, fromDate: from, toDate: to });
    }
    if (tab === 'sales-by-rep') {
      return buildSalesPersonWiseSummaryFilters({
        company: effectiveCompany,
        fromDate: from,
        toDate: to,
        docType: 'Sales Invoice',
      });
    }
    if (tab === 'sales-profit') {
      return buildGrossProfitReportFilters({
        company: effectiveCompany,
        fromDate: from,
        toDate: to,
      });
    }
    if (tab === 'sales-register') {
      return buildSalesRegisterFilters({
        company: effectiveCompany,
        fromDate: from,
        toDate: to,
      });
    }
    if (tab === 'item-wise-sales-register') {
      return buildItemWiseSalesRegisterFilters({
        company: effectiveCompany,
        fromDate: from,
        toDate: to,
      });
    }
    const treeType: SalesAnalyticsTree =
      tab === 'sales-by-product' ? 'Item' : 'Customer';
    return buildSalesAnalyticsFilters({
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
    tab === 'sales-by-customer' || tab === 'sales-by-product';

  const isArTab = tab === 'sales-invoice-status' || tab === 'overdue-invoices';

  // Determine current tab label for display
  const currentTabLabel = TAB_META.find((t) => t.id === tab)?.label ?? 'تقرير المبيعات';

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="تقارير المبيعات"
        description="تحليل المبيعات، السجلات الضريبية، إجمالي الربح، ذمم العملاء، دفتر المدفوعات، ونقطة البيع."
        iconify="solar:chart-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'المبيعات', href: '/sales' }, { label: 'التقارير' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => reportQuery.refetch()}
              disabled={reportQuery.isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${reportQuery.isLoading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </div>
        }
      />

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-success" />
            معايير التقرير — {currentTabLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          {!isArTab && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">من تاريخ</Label>
              <Input type="date" dir="ltr" className="h-9 w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {isArTab ? 'كما في تاريخ (تقرير الذمم)' : 'إلى تاريخ'}
            </Label>
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
              filename={TAB_META.find((t) => t.id === tab)?.label ?? 'sales-report'}
              columns={exportCols}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as SalesReportTab)} className="space-y-4">
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
          {tab === 'payment-splits' && (
            <p className="text-xs text-muted-foreground">
              يستخدم تقرير «دفتر المدفوعات» فترة بداية/نهاية مطابقة للتواريخ أعلاه.
            </p>
          )}
          {isArTab && (
            <p className="text-xs text-muted-foreground">
              نفس تقرير «الأستاذ المساعد — عملاء» مع report_date أعلاه (الفلترة التفصيلية من أعمدة التقرير).
            </p>
          )}

          {normalized.notice && (
            <div className="rounded-[var(--radius-md-ui)] border border-chart-2/20/80 bg-chart-2/5/80 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-chart-2/10 dark:text-amber-100">
              {normalized.notice}
            </div>
          )}

          {reportQuery.isError && (
            <div className="rounded-[var(--radius-md-ui)] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {(reportQuery.error as Error)?.message ||
                'تعذر تشغيل التقرير. تحقق من الصلاحيات وتثبيت وحدة البيع.'}
            </div>
          )}

          {summaryStrip.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              جاري تحميل التقرير…
            </div>
          )}

          {!reportQuery.isLoading && !reportQuery.isError && filtersReady && normalized.rows.length === 0 && (
            <EmptyState
              title="لا توجد صفوف للعرض"
              description="جرّب توسيع الفترة أو التحقق من وجود فواتير/حركات ضمن الشركة المحددة."
            />
          )}

          {!filtersReady && !reportQuery.isLoading && (
            <EmptyState
              title="حدد معايير التقرير"
              description="يرجى اختيار الشركة والتاريخ لتشغيل التقرير."
            />
          )}

          {normalized.rows.length > 0 && (
            <DataTable
              data={normalized.rows}
              columns={tableColumns}
              searchable
              pageSize={25}
              stickyFirstColumn
              exportFileName={TAB_META.find((x) => x.id === tab)?.label ?? 'sales-report'}
            />
          )}
        </div>
      </Tabs>
    </div>
  );
}
