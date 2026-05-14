'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
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
  buildGeneralLedgerFilters,
  buildGrossProfitReportFilters,
  buildItemWiseSalesRegisterFilters,
  buildReceivablePayableFilters,
  buildSalesRegisterFilters,
} from '@/lib/reports/accounting-advanced-filters';
import { BookOpen, CalendarClock, FileSpreadsheet, ScrollText, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { translateAccountName, translateAccountType } from '@/lib/core/arabic-labels';

type AdvancedTab =
  | 'general-ledger'
  | 'accounts-receivable'
  | 'accounts-payable'
  | 'sales-profit'
  | 'sales-register'
  | 'item-wise-sales-register';

const TAB_META: {
  id: AdvancedTab;
  label: string;
  short: string;
  catalogId: string;
  icon: typeof BookOpen;
}[] = [
  {
    id: 'general-ledger',
    label: 'دفتر الأستاذ العام',
    short: 'أستاذ',
    catalogId: 'general-ledger',
    icon: ScrollText,
  },
  {
    id: 'accounts-receivable',
    label: 'ذمم العملاء',
    short: 'عملاء',
    catalogId: 'accounts-receivable',
    icon: BookOpen,
  },
  {
    id: 'accounts-payable',
    label: 'ذمم الموردين',
    short: 'موردين',
    catalogId: 'accounts-payable',
    icon: BookOpen,
  },
  {
    id: 'sales-profit',
    label: 'إجمالي الربح (أصناف)',
    short: 'ربح',
    catalogId: 'sales-profit',
    icon: TrendingUp,
  },
  {
    id: 'sales-register',
    label: 'سجل المبيعات (ضريبي)',
    short: 'سجل بيع',
    catalogId: 'sales-register',
    icon: FileSpreadsheet,
  },
  {
    id: 'item-wise-sales-register',
    label: 'سجل مبيعات تحليلي (أصناف)',
    short: 'تحليلي',
    catalogId: 'item-wise-sales-register',
    icon: FileSpreadsheet,
  },
];

function defaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(now) };
}

export default function AdvancedAccountingReportsPage() {
  const { from: d0, to: d1 } = defaultDateRange();
  const [from, setFrom] = useState(d0);
  const [to, setTo] = useState(d1);
  const [tab, setTab] = useState<AdvancedTab>('general-ledger');
  const { company: effectiveCompany } = useDefaultCompanyName();

  const reportId = useMemo(
    () => TAB_META.find((t) => t.id === tab)?.catalogId ?? 'general-ledger',
    [tab]
  );

  const filters = useMemo(() => {
    if (!effectiveCompany || !to) return null;
    if (tab === 'accounts-receivable' || tab === 'accounts-payable') {
      return buildReceivablePayableFilters({
        company: effectiveCompany,
        reportDate: to,
      });
    }
    if (!from) return null;
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
    return buildGeneralLedgerFilters({
      company: effectiveCompany,
      fromDate: from,
      toDate: to,
    });
  }, [effectiveCompany, from, to, tab]);

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

  const isReceivablePayable = tab === 'accounts-receivable' || tab === 'accounts-payable';
  const isRegisterTab = tab === 'sales-register' || tab === 'item-wise-sales-register';

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="تقارير محاسبية متقدمة"
        description="دفتر الأستاذ، الذمم، إجمالي الربح، وسجلات المبيعات الضريبية."
        iconify="solar:clipboard-list-bold-duotone"
        accent="info"
      />

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">معايير التقرير</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          {!isReceivablePayable && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">من تاريخ</Label>
              <DatePicker value={from} onChange={setFrom} className="h-9 w-40" />
            </div>
          )}
          {isRegisterTab && (
            <p className="text-[11px] text-muted-foreground max-w-md">
              «سجل المبيعات» و«التحليلي» يستخدمان from_date / to_date حسب تعريف النظام.
            </p>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              {isReceivablePayable ? (
                <>
                  <CalendarClock className="h-3.5 w-3.5" />
                  كما في تاريخ
                </>
              ) : (
                'إلى تاريخ'
              )}
            </Label>
            <DatePicker value={to} onChange={setTo} className="h-9 w-40" />
          </div>

          <div className="ms-auto">
            <ExportButton
              data={normalized.rows}
              filename={TAB_META.find((t) => t.id === tab)?.label ?? 'advanced-report'}
              columns={exportCols}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as AdvancedTab)} className="space-y-4">
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
          {normalized.notice && (
            <div className="rounded-[var(--radius-md-ui)] border border-chart-2/20/80 bg-chart-2/5/80 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-chart-2/10 dark:text-amber-100">
              {normalized.notice}
            </div>
          )}

          {reportQuery.isError && (
            <p className="text-sm text-destructive">
              {(reportQuery.error as Error)?.message ||
                'تعذر تشغيل التقرير. تحقق من الصلاحيات وتسمية التقرير.'}
            </p>
          )}

          {summaryStrip.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {summaryStrip.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-[var(--radius-md-ui)] border border-border/50 bg-card px-3 py-2.5',
                    s.indicator === 'Red' && 'border-destructive/20/80 bg-destructive/5/50 dark:border-red-900/40',
                    s.indicator === 'Green' && 'border-primary/20/80 bg-primary/5/50 dark:border-emerald-900/40'
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
              description="جرّب توسيع الفترة أو تحقق من وجود حركات ضمن الشركة والتواريخ المحددة."
            />
          )}

          {normalized.rows.length > 0 && (
            <DataTable
              data={normalized.rows}
              columns={tableColumns}
              searchable
              pageSize={25}
              stickyFirstColumn
              exportFileName={TAB_META.find((x) => x.id === tab)?.label ?? 'advanced-report'}
            />
          )}
        </div>
      </Tabs>
    </div>
  );
}
