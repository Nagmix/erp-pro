'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/erp/page-header';
import { EmptyState } from '@/components/erp/empty-state';
import { ExportButton } from '@/components/erp/export-button';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useRunReport, useDocList } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import {
  buildFinancialStatementFilters,
  pickFiscalYearForDate,
  type FiscalYearRow,
  type Periodicity,
} from '@/lib/reports/financial-filters';
import { normalizeFrappeReportPayload } from '@/lib/reports/normalize-frappe-report';
import { normalizedColumnsToDataTable } from '@/lib/reports/frappe-report-columns';
import { formatCurrency } from '@/lib/core/helpers';
import {
  Printer,
  RotateCcw,
  TrendingUp,
  Building2,
  Landmark,
  Wallet,
  RefreshCw,
  Info,
} from 'lucide-react';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { cn } from '@/lib/utils';

type PeriodicityOption = 'Yearly' | 'Half-Yearly' | 'Quarterly' | 'Monthly';

const PERIODICITY_OPTIONS: { value: PeriodicityOption; label: string }[] = [
  { value: 'Yearly', label: 'سنوي' },
  { value: 'Half-Yearly', label: 'نصف سنوي' },
  { value: 'Quarterly', label: 'ربع سنوي' },
  { value: 'Monthly', label: 'شهري' },
];

function defaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(now) };
}

export default function CashFlowPage() {
  const { from: d0, to: d1 } = defaultDateRange();
  const [from, setFrom] = useState(d0);
  const [to, setTo] = useState(d1);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [periodicity, setPeriodicity] = useState<PeriodicityOption>('Yearly');
  const { company: effectiveCompany } = useDefaultCompanyName();

  const company = selectedCompany || effectiveCompany;

  const filters = useMemo(() => {
    if (!company || !from || !to) return null;
    return buildFinancialStatementFilters({
      company,
      periodStart: from,
      periodEnd: to,
      periodicity,
    });
  }, [company, from, to, periodicity]);

  const filtersReady = Boolean(filters);
  const reportQuery = useRunReport('cash-flow', filters ?? {}, filtersReady);

  const normalized = useMemo(
    () => normalizeFrappeReportPayload(reportQuery.data ?? null),
    [reportQuery.data]
  );

  const tableColumns = useMemo(
    () => normalizedColumnsToDataTable(normalized.columns),
    [normalized.columns]
  );

  const exportCols = tableColumns.map((c) => ({ key: c.key, header: c.header }));

  // Extract KPIs from report summary
  const summaryKpis = useMemo(() => {
    const summary = normalized.reportSummary;
    let operatingNet = 0;
    let investingNet = 0;
    let financingNet = 0;
    let netChange = 0;
    let openingBalance = 0;
    let closingBalance = 0;

    for (const s of summary) {
      const label = String(s.label ?? '').toLowerCase();
      const val = Number(s.value ?? 0) || 0;
      if (label.includes('operating') || label.includes('تشغيلي') || label.includes('تشغيل')) {
        operatingNet = val;
      }
      if (label.includes('investing') || label.includes('استثماري') || label.includes('استثمار')) {
        investingNet = val;
      }
      if (label.includes('financing') || label.includes('تمويلي') || label.includes('تمويل')) {
        financingNet = val;
      }
      if (label.includes('net change') || label.includes('صافي التغير') || label.includes('صافي تغير')) {
        netChange = val;
      }
      if (label.includes('opening') || label.includes('افتتاح')) {
        openingBalance = val;
      }
      if (label.includes('closing') || label.includes('إقفال') || label.includes('إغلاق')) {
        closingBalance = val;
      }
    }

    // If summary doesn't have clear labels, compute net change
    if (netChange === 0 && (operatingNet !== 0 || investingNet !== 0 || financingNet !== 0)) {
      netChange = operatingNet + investingNet + financingNet;
    }

    return { operatingNet, investingNet, financingNet, netChange, openingBalance, closingBalance };
  }, [normalized.reportSummary]);

  const resetFilters = () => {
    const { from: defFrom, to: defTo } = defaultDateRange();
    setFrom(defFrom);
    setTo(defTo);
    setSelectedCompany('');
    setPeriodicity('Yearly');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    reportQuery.refetch();
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={reportQuery.isError ? (reportQuery.error as Error | null) : null} onRetry={handleRefresh} />

      <PageHeader
        title="تقرير التدفقات النقدية"
        description="تحليل حركة النقد وفقاً للأنشطة التشغيلية والاستثمارية والتمويلية — بيانات فعلية من تقرير ERPNext."
        iconify="solar:wallet-money-bold-duotone"
        accent="primary"
        breadcrumbs={[
          { label: 'المحاسبة', href: '/accounting' },
          { label: 'التدفقات النقدية' },
        ]}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handlePrint}
              disabled={normalized.rows.length === 0}
            >
              <Printer className="h-3.5 w-3.5" />
              طباعة
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleRefresh}
              disabled={reportQuery.isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${reportQuery.isLoading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </div>
        }
      />

      {/* Filter Card */}
      <Card className="border-border/40 print:hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">معايير التقرير</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] gap-1"
                onClick={resetFilters}
              >
                <RotateCcw className="h-3 w-3" />
                إعادة تعيين
              </Button>
              <ExportButton
                data={normalized.rows as Record<string, unknown>[]}
                filename="تقرير التدفقات النقدية"
                columns={exportCols}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Company selector */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">الشركة</Label>
              <ErpLinkCombobox
                doctype="Company"
                value={selectedCompany}
                onChange={setSelectedCompany}
                placeholder={effectiveCompany || 'اختر الشركة...'}
                className="h-9 text-xs"
              />
            </div>
            {/* From date */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">من تاريخ</Label>
              <DatePicker value={from} onChange={setFrom} className="h-9 w-full" />
            </div>
            {/* To date */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
              <DatePicker value={to} onChange={setTo} className="h-9 w-full" />
            </div>
            {/* Periodicity */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">التواتر</Label>
              <Select value={periodicity} onValueChange={(v) => setPeriodicity(v as PeriodicityOption)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODICITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Active filter indicators */}
          {(selectedCompany || from !== d0 || to !== d1 || periodicity !== 'Yearly') && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/40 pt-3">
              {selectedCompany && (
                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary ring-1 ring-inset ring-primary/20">
                  شركة: {selectedCompany}
                </span>
              )}
              {from !== d0 && (
                <span className="inline-flex items-center rounded-md bg-info/10 px-2 py-0.5 text-[10px] font-medium text-info ring-1 ring-inset ring-info/20">
                  من: {from}
                </span>
              )}
              {to !== d1 && (
                <span className="inline-flex items-center rounded-md bg-info/10 px-2 py-0.5 text-[10px] font-medium text-info ring-1 ring-inset ring-info/20">
                  إلى: {to}
                </span>
              )}
              {periodicity !== 'Yearly' && (
                <span className="inline-flex items-center rounded-md bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning-foreground ring-1 ring-inset ring-warning/20">
                  تواتر: {PERIODICITY_OPTIONS.find((o) => o.value === periodicity)?.label}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      <div className="space-y-4">
        {reportQuery.isError && (
          <p className="text-sm text-destructive">
            {(reportQuery.error as Error)?.message || 'تعذر تشغيل تقرير التدفقات النقدية. تحقق من الصلاحيات وتسمية التقرير.'}
          </p>
        )}

        {reportQuery.isLoading && (
          <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm">جاري تحميل تقرير التدفقات النقدية…</span>
          </div>
        )}

        {!reportQuery.isLoading && !reportQuery.isError && filtersReady && normalized.rows.length === 0 && (
          <EmptyState
            title="لا توجد بيانات ضمن المعايير"
            description="جرّب توسيع الفترة أو التحقق من وجود حركات في النظام."
          />
        )}

        {!filtersReady && !reportQuery.isLoading && (
          <EmptyState
            title="اختر معايير التقرير"
            description="حدد الشركة والتواريخ لعرض تقرير التدفقات النقدية."
          />
        )}

        {normalized.notice && (
          <div className="rounded-[var(--radius-md-ui)] border border-chart-2/20/80 bg-chart-2/5/80 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-chart-2/10 dark:text-amber-100">
            {normalized.notice}
          </div>
        )}

        {/* Summary KPI cards from report_summary */}
        {normalized.reportSummary.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
            {normalized.reportSummary
              .filter((s) => s && typeof s.value !== 'undefined')
              .map((s, i) => {
                const datatype = String(s.datatype ?? '');
                const val = s.value;
                const curr = typeof s.currency === 'string' ? s.currency : undefined;
                const num = Number(val);
                const shown =
                  datatype === 'Currency' && Number.isFinite(num)
                    ? formatCurrency(num, curr || 'YER')
                    : String(val ?? '—');
                return (
                  <div
                    key={i}
                    className={cn(
                      'rounded-[var(--radius-md-ui)] border border-border/50 bg-card px-3 py-2.5',
                      s.indicator === 'Red' && 'border-destructive/20/80 bg-destructive/5/50 dark:border-red-900/40',
                      s.indicator === 'Green' && 'border-primary/20/80 bg-primary/5/50 dark:border-emerald-900/40'
                    )}
                  >
                    <p className="text-[10px] font-medium text-muted-foreground">{String(s.label ?? '')}</p>
                    <p className="text-lg font-semibold tabular-nums tracking-tight">{shown}</p>
                  </div>
                );
              })}
          </div>
        )}

        {/* Three-section summary cards */}
        {(summaryKpis.operatingNet !== 0 || summaryKpis.investingNet !== 0 || summaryKpis.financingNet !== 0) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Operating */}
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
                  <TrendingUp className="h-4 w-4" />
                  التدفقات التشغيلية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn(
                  'text-lg font-semibold tabular-nums',
                  summaryKpis.operatingNet >= 0 ? 'text-emerald-600' : 'text-rose-600'
                )}>
                  {formatCurrency(summaryKpis.operatingNet, 'YER')}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">صافي التدفقات من الأنشطة التشغيلية</p>
              </CardContent>
            </Card>

            {/* Investing */}
            <Card className="border-chart-1/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-chart-1">
                  <Building2 className="h-4 w-4" />
                  التدفقات الاستثمارية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn(
                  'text-lg font-semibold tabular-nums',
                  summaryKpis.investingNet >= 0 ? 'text-emerald-600' : 'text-rose-600'
                )}>
                  {formatCurrency(summaryKpis.investingNet, 'YER')}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">صافي التدفقات من الأنشطة الاستثمارية</p>
              </CardContent>
            </Card>

            {/* Financing */}
            <Card className="border-chart-5/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-chart-5">
                  <Landmark className="h-4 w-4" />
                  التدفقات التمويلية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn(
                  'text-lg font-semibold tabular-nums',
                  summaryKpis.financingNet >= 0 ? 'text-emerald-600' : 'text-rose-600'
                )}>
                  {formatCurrency(summaryKpis.financingNet, 'YER')}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">صافي التدفقات من الأنشطة التمويلية</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Net Change Summary */}
        {(summaryKpis.netChange !== 0 || summaryKpis.openingBalance !== 0 || summaryKpis.closingBalance !== 0) && (
          <Card className="border-border/40">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground">رصيد الافتتاح</p>
                  <p className="text-lg font-bold tabular-nums">{formatCurrency(summaryKpis.openingBalance, 'YER')}</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground">صافي التغير النقدي</p>
                  <p className={cn(
                    'text-lg font-bold tabular-nums',
                    summaryKpis.netChange >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  )}>
                    {formatCurrency(summaryKpis.netChange, 'YER')}
                  </p>
                </div>
                <div className="rounded-lg border border-primary/20/60 bg-primary/5/50 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground">رصيد الإقفال</p>
                  <p className="text-lg font-bold tabular-nums">{formatCurrency(summaryKpis.closingBalance, 'YER')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
        {normalized.rows.length > 0 && (
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                تفاصيل التدفقات النقدية
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      {normalized.columns.filter((c) => !c.hidden).map((col, idx) => (
                        <th
                          key={idx}
                          className={cn(
                            'py-2 px-3 text-end font-medium text-muted-foreground text-[11px]',
                            idx === 0 && 'sticky end-0 z-10 bg-muted/95 backdrop-blur'
                          )}
                        >
                          {String(col.header ?? col.key ?? `عمود ${idx + 1}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {normalized.rows.map((row, rIdx) => {
                      const r = row as Record<string, unknown>;
                      const isCurrency = (key: string, idx: number) => {
                        const col = normalized.columns.filter((c) => !c.hidden)[idx];
                        return col?.fieldtype === 'Currency' || col?.fieldtype === 'Float';
                      };
                      const indent = Number(r.indent ?? 0);
                      const isTotalRow = String(r.account_name ?? r.account ?? '').includes('Total') ||
                        String(r.account_name ?? r.account ?? '').includes('إجمالي');
                      return (
                        <tr
                          key={rIdx}
                          className={cn(
                            'border-b border-border/20 transition-colors',
                            isTotalRow ? 'bg-muted/20 font-semibold' : 'hover:bg-accent/30',
                          )}
                        >
                          {normalized.columns.filter((c) => !c.hidden).map((col, cIdx) => {
                            const val = r[col.key ?? ''];
                            const num = Number(val);
                            const isFirstCol = cIdx === 0;
                            const isCur = isCurrency(col.key, cIdx);
                            return (
                              <td
                                key={cIdx}
                                className={cn(
                                  'py-2 px-3 text-xs',
                                  isFirstCol && 'sticky end-0 z-[1] bg-card',
                                  isCur && 'tabular-nums',
                                  isCur && Number.isFinite(num) && num > 0 && 'text-emerald-600',
                                  isCur && Number.isFinite(num) && num < 0 && 'text-rose-600',
                                )}
                                dir={isCur ? 'ltr' : undefined}
                                style={isFirstCol ? { paddingRight: `${indent * 16}px` } : undefined}
                              >
                                {isCur && Number.isFinite(num) && num !== 0
                                  ? formatCurrency(num, 'YER')
                                  : isCur && (num === 0 || !Number.isFinite(num))
                                    ? <span className="text-muted-foreground">—</span>
                                    : String(val ?? '—')}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info note */}
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground print:hidden">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <span>
            هذا التقرير يُستخرج مباشرة من تقرير «Cash Flow» في ERPNext باستخدام فلاتر الشركة والفترة والتواتر.
            التصنيف بين الأنشطة التشغيلية والاستثمارية والتمويلية يعتمد على إعداد حسابات التقرير على الخادم.
          </span>
        </div>
      </div>
    </div>
  );
}
