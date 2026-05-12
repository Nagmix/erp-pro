'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { EmptyState } from '@/components/erp/empty-state';
import { ExportButton } from '@/components/erp/export-button';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDocList, useRunReport } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildTrialBalanceFilters, pickFiscalYearForDate, type FiscalYearRow } from '@/lib/reports/financial-filters';
import { normalizeFrappeReportPayload } from '@/lib/reports/normalize-frappe-report';
import { normalizedColumnsToDataTable } from '@/lib/reports/frappe-report-columns';
import { formatCurrency } from '@/lib/core/helpers';
import { Printer, RotateCcw } from 'lucide-react';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { cn } from '@/lib/utils';

type RootTypeFilter = 'all' | 'Asset' | 'Liability' | 'Income' | 'Expense' | 'Equity';

const ROOT_TYPE_OPTIONS: { value: RootTypeFilter; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'Asset', label: 'أصول' },
  { value: 'Liability', label: 'التزامات' },
  { value: 'Income', label: 'إيرادات' },
  { value: 'Expense', label: 'مصروفات' },
  { value: 'Equity', label: 'حقوق ملكية' },
];

function defaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(now) };
}

export default function TrialBalanceDetailPage() {
  const { from: d0, to: d1 } = defaultDateRange();
  const [from, setFrom] = useState(d0);
  const [to, setTo] = useState(d1);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [rootTypeFilter, setRootTypeFilter] = useState<RootTypeFilter>('all');
  const { company: effectiveCompany } = useDefaultCompanyName();

  const company = selectedCompany || effectiveCompany;

  const { data: fiscalYears = [], isLoading: fyLoading } = useDocList<FiscalYearRow>('Fiscal Year', {
    fields: ['name', 'year_start_date', 'year_end_date'],
    limit: 40,
  });

  const fiscalYearName = useMemo(
    () => pickFiscalYearForDate(fiscalYears, to),
    [fiscalYears, to]
  );

  const filters = useMemo(() => {
    if (!company || !from || !to || !fiscalYearName) return null;
    return buildTrialBalanceFilters({
      company,
      fiscalYear: fiscalYearName,
      fromDate: from,
      toDate: to,
    });
  }, [company, from, to, fiscalYearName]);

  const filtersReady = Boolean(filters);
  const reportQuery = useRunReport('trial-balance', filters ?? {}, filtersReady);

  const normalized = useMemo(
    () => normalizeFrappeReportPayload(reportQuery.data ?? null),
    [reportQuery.data]
  );

  const tableColumns = useMemo(
    () => normalizedColumnsToDataTable(normalized.columns),
    [normalized.columns]
  );

  const exportCols = tableColumns.map((c) => ({ key: c.key, header: c.header }));

  // Compute KPIs from rows
  const kpis = useMemo(() => {
    const rows = normalized.rows;
    let totalDebit = 0;
    let totalCredit = 0;
    let openingDebit = 0;
    let openingCredit = 0;
    let closingDebit = 0;
    let closingCredit = 0;
    let accountCount = 0;

    for (const row of rows) {
      const rec = row as Record<string, unknown>;
      // Skip total/summary rows
      const accountName = String(rec.account ?? rec.account_name ?? '');
      if (!accountName || accountName === 'Total' || accountName === 'إجمالي') continue;

      totalDebit += Number(rec.debit ?? rec.debit_in_account_currency ?? 0) || 0;
      totalCredit += Number(rec.credit ?? rec.credit_in_account_currency ?? 0) || 0;
      openingDebit += Number(rec.opening_debit ?? 0) || 0;
      openingCredit += Number(rec.opening_credit ?? 0) || 0;
      closingDebit += Number(rec.closing_debit ?? rec.debit ?? 0) || 0;
      closingCredit += Number(rec.closing_credit ?? rec.credit ?? 0) || 0;
      accountCount++;
    }

    const difference = (closingDebit + openingDebit) - (closingCredit + openingCredit);

    return { totalDebit, totalCredit, openingDebit, openingCredit, closingDebit, closingCredit, accountCount, difference };
  }, [normalized.rows]);

  // Filter by root_type
  const filteredRows = useMemo(() => {
    if (rootTypeFilter === 'all') return normalized.rows;
    return normalized.rows.filter((row) => {
      const rec = row as Record<string, unknown>;
      const rootType = String(rec.root_type ?? rec.account_type ?? '');
      return rootType === rootTypeFilter;
    });
  }, [normalized.rows, rootTypeFilter]);

  // Custom columns with formatting
  const customColumns = useMemo(() => {
    if (filteredRows.length === 0) return tableColumns as Column<unknown>[];
    return (tableColumns as Column<unknown>[]).map((col) => {
      const key = col.key.toLowerCase();
      if (
        key.includes('debit') ||
        key.includes('credit') ||
        key.includes('opening') ||
        key.includes('closing') ||
        key.includes('amount') ||
        key.includes('balance')
      ) {
        return {
          ...col,
          render: (value: unknown) => {
            const num = Number(value);
            if (!Number.isFinite(num) || num === 0) return <span className="text-muted-foreground">—</span>;
            return (
              <span className={cn('tabular-nums', num < 0 && 'text-destructive')}>
                {formatCurrency(Math.abs(num), 'YER')}
              </span>
            );
          },
        };
      }
      return col;
    });
  }, [filteredRows.length, tableColumns]);

  const resetFilters = () => {
    const { from: defFrom, to: defTo } = defaultDateRange();
    setFrom(defFrom);
    setTo(defTo);
    setSelectedCompany('');
    setRootTypeFilter('all');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={reportQuery.isError ? (reportQuery.error as Error | null) : null} onRetry={() => reportQuery.refetch()} />

      <PageHeader
        title="ميزان المراجعة التفصيلي"
        description="تقرير مفصّل بأرصدة الحسابات الافتتاحية والحركة والإغلاق مع تصفية حسب نوع الحساب الجذري."
        iconify="solar:document-text-bold-duotone"
        accent="info"
        breadcrumbs={[
          { label: 'المحاسبة', href: '/accounting' },
          { label: 'ميزان المراجعة' },
        ]}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handlePrint}
              disabled={filteredRows.length === 0}
            >
              <Printer className="h-3.5 w-3.5" />
              طباعة
            </Button>
          </div>
        }
      />

      {/* KPI Strip */}
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
                data={filteredRows as Record<string, unknown>[]}
                filename="ميزان المراجعة التفصيلي"
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
              <Input type="date" dir="ltr" className="h-9 w-full" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            {/* To date */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
              <Input type="date" dir="ltr" className="h-9 w-full" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            {/* Root Type Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">نوع الحساب الجذري</Label>
              <Select value={rootTypeFilter} onValueChange={(v) => setRootTypeFilter(v as RootTypeFilter)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Active filter indicators */}
          {(selectedCompany || from !== d0 || to !== d1 || rootTypeFilter !== 'all') && (
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
              {rootTypeFilter !== 'all' && (
                <span className="inline-flex items-center rounded-md bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning-foreground ring-1 ring-inset ring-warning/20">
                  نوع: {ROOT_TYPE_OPTIONS.find((o) => o.value === rootTypeFilter)?.label}
                </span>
              )}
              <span className="inline-flex items-center rounded-md bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                سنة مالية: {fiscalYearName || '—'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      <div className="space-y-4">
        {fyLoading && (
          <p className="text-xs text-muted-foreground">جاري تحميل السنوات المالية…</p>
        )}

        {!fyLoading && company && !fiscalYearName && (
          <p className="text-sm text-chart-2">
            لا توجد سنة مالية تغطي «إلى تاريخ» المحدد. عدّل التاريخ أو أنشئ السنة المالية في النظام.
          </p>
        )}

        {normalized.notice && (
          <div className="rounded-[var(--radius-md-ui)] border border-chart-2/20/80 bg-chart-2/5/80 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-chart-2/10 dark:text-amber-100">
            {normalized.notice}
          </div>
        )}

        {reportQuery.isError && (
          <p className="text-sm text-destructive">
            {(reportQuery.error as Error)?.message || 'تعذر تشغيل التقرير. تحقق من الصلاحيات وتسمية التقرير.'}
          </p>
        )}

        {reportQuery.isLoading && (
          <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm">جاري تحميل ميزان المراجعة…</span>
          </div>
        )}

        {!reportQuery.isLoading && !reportQuery.isError && filtersReady && filteredRows.length === 0 && (
          <EmptyState
            title="لا توجد بيانات ضمن المعايير"
            description="جرّب توسيع الفترة أو تغيير فلتر نوع الحساب أو التحقق من وجود حركات في النظام."
          />
        )}

        {!filtersReady && !reportQuery.isLoading && (
          <EmptyState
            title="اختر معايير التقرير"
            description="حدد الشركة والتواريخ لعرض ميزان المراجعة."
          />
        )}

        {/* Period Comparison Section */}
        {normalized.reportSummary.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
            {normalized.reportSummary
              .filter((s) => s && typeof s.value !== 'undefined')
              .map((s, i) => {
                const datatype = String(s.datatype ?? '');
                const val = s.value;
                const num = Number(val);
                const shown =
                  datatype === 'Currency' && Number.isFinite(num)
                    ? formatCurrency(num, 'YER')
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

        {filteredRows.length > 0 && (
          <>
            {/* Summary comparison bars */}
            <Card className="border-border/40">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">مقارنة المدين والدائن</h3>
                <div className="space-y-3">
                  {/* Opening Balance Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>رصيد افتتاحي</span>
                      <span>مدين: {formatCurrency(kpis.openingDebit, 'YER')} | دائن: {formatCurrency(kpis.openingCredit, 'YER')}</span>
                    </div>
                    <div className="flex h-4 rounded-full overflow-hidden bg-muted/50">
                      {(() => {
                        const total = kpis.openingDebit + kpis.openingCredit;
                        if (total === 0) return null;
                        const debitPct = (kpis.openingDebit / total) * 100;
                        return (
                          <>
                            <div className="bg-chart-1/70 transition-all" style={{ width: `${debitPct}%` }} />
                            <div className="bg-chart-3/70 transition-all" style={{ width: `${100 - debitPct}%` }} />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  {/* Closing Balance Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>رصيد إغلاق</span>
                      <span>مدين: {formatCurrency(kpis.closingDebit, 'YER')} | دائن: {formatCurrency(kpis.closingCredit, 'YER')}</span>
                    </div>
                    <div className="flex h-4 rounded-full overflow-hidden bg-muted/50">
                      {(() => {
                        const total = kpis.closingDebit + kpis.closingCredit;
                        if (total === 0) return null;
                        const debitPct = (kpis.closingDebit / total) * 100;
                        return (
                          <>
                            <div className="bg-chart-1/70 transition-all" style={{ width: `${debitPct}%` }} />
                            <div className="bg-chart-3/70 transition-all" style={{ width: `${100 - debitPct}%` }} />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-chart-1/70" />
                      مدين
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-chart-3/70" />
                      دائن
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DataTable
              data={filteredRows}
              columns={customColumns}
              searchable
              pageSize={25}
              stickyFirstColumn
              exportFileName="ميزان المراجعة التفصيلي"
            />
          </>
        )}
      </div>
    </div>
  );
}
