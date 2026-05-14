'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/erp/page-header';
import { EmptyState } from '@/components/erp/empty-state';
import { ExportButton } from '@/components/erp/export-button';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useRunReport, useDocList } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildFinancialStatementFilters, type FiscalYearRow, type Periodicity } from '@/lib/reports/financial-filters';
import { normalizeFrappeReportPayload } from '@/lib/reports/normalize-frappe-report';
import { formatCurrency } from '@/lib/core/helpers';
import {
  TrendingUp,
  TrendingDown,
  Printer,
  RotateCcw,
  BarChart3,
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function defaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(now) };
}

/** Parse P&L data from ERPNext into monthly structure */
interface PnLAccount {
  accountName: string;
  accountNumber: string;
  rootType: 'Income' | 'Expense';
  monthlyValues: (number | null)[];
  total: number;
}

function parsePnLRows(rawRows: unknown[]): PnLAccount[] {
  const accounts: PnLAccount[] = [];
  for (const row of rawRows) {
    const r = row as Record<string, unknown>;
    const accountName = String(r.account_name ?? r.account ?? '');
    const accountNumber = String(r.account_num ?? '');
    if (!accountName || accountName.includes('Total') || accountName.includes('إجمالي')) continue;

    // Try to determine root type from the data
    const rootType = (String(r.root_type ?? r.account_type ?? '') === 'Expense' ? 'Expense' : 'Income') as 'Income' | 'Expense';

    // Extract monthly values from potential column names
    const monthlyValues: (number | null)[] = MONTH_NAMES_AR.map(() => null);

    // Try common ERPNext column patterns for monthly data
    for (let m = 0; m < 12; m++) {
      const monthPatterns = [
        `m${m + 1}`,
        `month${m + 1}`,
        MONTH_NAMES_AR[m],
        `${m + 1}`,
      ];
      for (const pattern of monthPatterns) {
        const val = Number(r[pattern]);
        if (Number.isFinite(val)) {
          monthlyValues[m] = val;
          break;
        }
      }
    }

    // If no monthly data found, use the total
    const total = Number(r.total ?? r.amount ?? r.balance ?? 0) || 0;

    accounts.push({
      accountName,
      accountNumber,
      rootType,
      monthlyValues,
      total,
    });
  }
  return accounts;
}

export default function ProfitLossMonthlyPage() {
  const { from: d0, to: d1 } = defaultDateRange();
  const [from, setFrom] = useState(d0);
  const [to, setTo] = useState(d1);
  const [selectedCompany, setSelectedCompany] = useState('');
  const { company: effectiveCompany } = useDefaultCompanyName();

  const company = selectedCompany || effectiveCompany;

  const filters = useMemo(() => {
    if (!company || !from || !to) return null;
    return buildFinancialStatementFilters({
      company,
      periodStart: from,
      periodEnd: to,
      periodicity: 'Monthly',
    });
  }, [company, from, to]);

  const filtersReady = Boolean(filters);
  const reportQuery = useRunReport('income-statement', filters ?? {}, filtersReady);

  const normalized = useMemo(
    () => normalizeFrappeReportPayload(reportQuery.data ?? null),
    [reportQuery.data]
  );

  // Parse accounts into income and expense
  const { incomeAccounts, expenseAccounts } = useMemo(() => {
    const all = parsePnLRows(normalized.rows);
    return {
      incomeAccounts: all.filter((a) => a.rootType === 'Income'),
      expenseAccounts: all.filter((a) => a.rootType === 'Expense'),
    };
  }, [normalized.rows]);

  // Calculate summary KPIs from report summary
  const summaryKpis = useMemo(() => {
    const summary = normalized.reportSummary;
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const s of summary) {
      const label = String(s.label ?? '').toLowerCase();
      const val = Number(s.value ?? 0) || 0;
      if (label.includes('income') || label.includes('إيراد') || label.includes('revenue')) {
        totalRevenue = Math.abs(val);
      }
      if (label.includes('expense') || label.includes('مصروف') || label.includes('expenditure')) {
        totalExpenses = Math.abs(val);
      }
    }

    // If summary doesn't have clear labels, compute from rows
    if (totalRevenue === 0 && totalExpenses === 0) {
      for (const row of normalized.rows) {
        const r = row as Record<string, unknown>;
        const rootType = String(r.root_type ?? '');
        const val = Math.abs(Number(r.total ?? r.amount ?? 0) || 0);
        if (rootType === 'Income') totalRevenue += val;
        if (rootType === 'Expense') totalExpenses += val;
      }
    }

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return { totalRevenue, totalExpenses, netProfit, profitMargin };
  }, [normalized.rows, normalized.reportSummary]);

  // Calculate gross profit (revenue - COGS)
  const grossProfit = useMemo(() => {
    let cogs = 0;
    for (const row of normalized.rows) {
      const r = row as Record<string, unknown>;
      const accountName = String(r.account_name ?? r.account ?? '').toLowerCase();
      const rootType = String(r.root_type ?? '');
      if (rootType === 'Expense' && (accountName.includes('cost of goods') || accountName.includes('تكلفة البضاعة') || accountName.includes('مبيعات'))) {
        cogs += Math.abs(Number(r.total ?? r.amount ?? 0) || 0);
      }
    }
    return summaryKpis.totalRevenue - cogs;
  }, [normalized.rows, summaryKpis.totalRevenue]);

  const exportCols = [
    { key: 'accountName', header: 'الحساب' },
    { key: 'total', header: 'الإجمالي' },
    { key: 'rootType', header: 'النوع' },
  ];

  const exportData = [...incomeAccounts, ...expenseAccounts].map((a) => ({
    accountName: a.accountName,
    total: a.total,
    rootType: a.rootType === 'Income' ? 'إيرادات' : 'مصروفات',
  }));

  const resetFilters = () => {
    const { from: defFrom, to: defTo } = defaultDateRange();
    setFrom(defFrom);
    setTo(defTo);
    setSelectedCompany('');
  };

  // Progress bar values for revenue vs expenses
  const revExpMax = Math.max(summaryKpis.totalRevenue, summaryKpis.totalExpenses, 1);
  const revPct = (summaryKpis.totalRevenue / revExpMax) * 100;
  const expPct = (summaryKpis.totalExpenses / revExpMax) * 100;

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="قائمة الدخل الشهرية"
        description="مقارنة شهرية للإيرادات والمصروفات مع حساب الأرباح والهوامش."
        iconify="solar:chart-2-bold-duotone"
        accent="success"
        breadcrumbs={[
          { label: 'المحاسبة', href: '/accounting' },
          { label: 'قائمة الدخل الشهرية' },
        ]}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => window.print()}
              disabled={normalized.rows.length === 0}
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
                data={exportData}
                filename="قائمة الدخل الشهرية"
                columns={exportCols}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </div>
          {/* Active filter indicators */}
          {(selectedCompany || from !== d0 || to !== d1) && (
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      <div className="space-y-4">
        {reportQuery.isError && (
          <p className="text-sm text-destructive">
            {(reportQuery.error as Error)?.message || 'تعذر تشغيل التقرير.'}
          </p>
        )}

        {reportQuery.isLoading && (
          <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm">جاري تحميل قائمة الدخل…</span>
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
            description="حدد الشركة والتواريخ لعرض قائمة الدخل."
          />
        )}

        {/* Report summary from ERPNext */}
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

        {/* Revenue vs Expenses Progress Bars */}
        {(summaryKpis.totalRevenue > 0 || summaryKpis.totalExpenses > 0) && (
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">مقارنة الإيرادات والمصروفات</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-primary font-medium">الإيرادات</span>
                    <span className="tabular-nums">{formatCurrency(summaryKpis.totalRevenue, 'YER')}</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
                    <div className="h-full bg-chart-3/70 rounded-full transition-all" style={{ width: `${revPct}%` }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-destructive font-medium">المصروفات</span>
                    <span className="tabular-nums">{formatCurrency(summaryKpis.totalExpenses, 'YER')}</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
                    <div className="h-full bg-destructive/70 rounded-full transition-all" style={{ width: `${expPct}%` }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary cards: Gross Profit, Operating Profit, Net Profit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className={cn(
            'border-border/40',
            grossProfit >= 0 ? 'border-s-emerald-500/50' : 'border-s-rose-500/50'
          )} style={{ borderRightWidth: '3px' }}>
            <CardContent className="p-4">
              <p className="text-[10px] font-medium text-muted-foreground">إجمالي الربح</p>
              <p className={cn('text-lg font-semibold tabular-nums', grossProfit >= 0 ? 'text-primary' : 'text-destructive')}>
                {formatCurrency(grossProfit, 'YER')}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">الإيرادات - تكلفة البضاعة المباعة</p>
            </CardContent>
          </Card>
          <Card className="border-border/40 border-s-sky-500/50" style={{ borderRightWidth: '3px' }}>
            <CardContent className="p-4">
              <p className="text-[10px] font-medium text-muted-foreground">ربح التشغيل</p>
              <p className={cn('text-lg font-semibold tabular-nums', grossProfit - summaryKpis.totalExpenses >= 0 ? 'text-chart-1' : 'text-destructive')}>
                {formatCurrency(grossProfit - summaryKpis.totalExpenses, 'YER')}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">إجمالي الربح - المصروفات التشغيلية</p>
            </CardContent>
          </Card>
          <Card className={cn(
            'border-border/40',
            summaryKpis.netProfit >= 0 ? 'border-s-blue-500/50' : 'border-s-rose-500/50'
          )} style={{ borderRightWidth: '3px' }}>
            <CardContent className="p-4">
              <p className="text-[10px] font-medium text-muted-foreground">صافي الربح</p>
              <p className={cn('text-lg font-semibold tabular-nums', summaryKpis.netProfit >= 0 ? 'text-chart-1' : 'text-destructive')}>
                {formatCurrency(summaryKpis.netProfit, 'YER')}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">هامش: {summaryKpis.profitMargin.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Two-column layout: Income (right) vs Expense (left) */}
        {normalized.rows.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Income accounts */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-chart-3" />
                  حسابات الإيرادات
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
                      <TableRow>
                        <TableHead className="text-[11px] font-semibold">الحساب</TableHead>
                        <TableHead className="text-[11px] font-semibold text-start" dir="ltr">المبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {normalized.rows
                        .filter((row) => {
                          const r = row as Record<string, unknown>;
                          return String(r.root_type ?? '') === 'Income';
                        })
                        .map((row, idx) => {
                          const r = row as Record<string, unknown>;
                          const accountName = String(r.account_name ?? r.account ?? '');
                          const total = Math.abs(Number(r.total ?? r.amount ?? 0) || 0);
                          return (
                            <TableRow key={idx} className="border-b border-border/20 hover:bg-primary/5">
                              <TableCell className="text-xs py-1.5">{accountName}</TableCell>
                              <TableCell className="text-xs py-1.5 tabular-nums text-primary font-medium" dir="ltr">
                                {total > 0 ? formatCurrency(total, 'YER') : '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      {/* Income total */}
                      <TableRow className="bg-primary/5/50 dark:bg-primary/5 font-semibold border-t-2 border-primary/30/40">
                        <TableCell className="text-xs py-2">إجمالي الإيرادات</TableCell>
                        <TableCell className="text-xs py-2 tabular-nums text-primary font-bold" dir="ltr">
                          {formatCurrency(summaryKpis.totalRevenue, 'YER')}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Expense accounts */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                  حسابات المصروفات
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
                      <TableRow>
                        <TableHead className="text-[11px] font-semibold">الحساب</TableHead>
                        <TableHead className="text-[11px] font-semibold text-start" dir="ltr">المبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {normalized.rows
                        .filter((row) => {
                          const r = row as Record<string, unknown>;
                          return String(r.root_type ?? '') === 'Expense';
                        })
                        .map((row, idx) => {
                          const r = row as Record<string, unknown>;
                          const accountName = String(r.account_name ?? r.account ?? '');
                          const total = Math.abs(Number(r.total ?? r.amount ?? 0) || 0);
                          return (
                            <TableRow key={idx} className="border-b border-border/20 hover:bg-destructive/5">
                              <TableCell className="text-xs py-1.5">{accountName}</TableCell>
                              <TableCell className="text-xs py-1.5 tabular-nums text-destructive font-medium" dir="ltr">
                                {total > 0 ? formatCurrency(total, 'YER') : '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      {/* Expense total */}
                      <TableRow className="bg-destructive/5/50 dark:bg-destructive/5 font-semibold border-t-2 border-destructive/30/40">
                        <TableCell className="text-xs py-2">إجمالي المصروفات</TableCell>
                        <TableCell className="text-xs py-2 tabular-nums text-destructive font-bold" dir="ltr">
                          {formatCurrency(summaryKpis.totalExpenses, 'YER')}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Full data table with normalized columns */}
        {normalized.rows.length > 0 && (
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">تفاصيل قائمة الدخل الكاملة</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
                    <TableRow>
                      {normalized.columns.map((col, idx) => (
                        <TableHead
                          key={idx}
                          className={cn(
                            'text-[11px] font-semibold',
                            idx === 0 && 'sticky end-0 z-10 bg-muted/95 backdrop-blur border-s-2 border-border/30'
                          )}
                        >
                          {String(col.header ?? col.key ?? `عمود ${idx + 1}`)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {normalized.rows.map((row, rIdx) => {
                      const r = row as Record<string, unknown>;
                      const rootType = String(r.root_type ?? '');
                      return (
                        <TableRow
                          key={rIdx}
                          className={cn(
                            'border-b border-border/20 transition-colors',
                            rootType === 'Income' && 'hover:bg-primary/5/50 dark:hover:bg-primary/5',
                            rootType === 'Expense' && 'hover:bg-destructive/5/50 dark:hover:bg-destructive/5',
                          )}
                        >
                          {normalized.columns.map((col, cIdx) => {
                            const val = r[col.key ?? ''];
                            const isCurrency = String(col.fieldtype ?? '') === 'Currency';
                            const num = Number(val);
                            return (
                              <TableCell
                                key={cIdx}
                                className={cn(
                                  'text-xs py-1.5',
                                  isCurrency && 'tabular-nums',
                                  cIdx === 0 && 'sticky end-0 z-[1] border-s border-border/40 bg-card',
                                  rootType === 'Income' && isCurrency && Number.isFinite(num) && num !== 0 && 'text-primary',
                                  rootType === 'Expense' && isCurrency && Number.isFinite(num) && num !== 0 && 'text-destructive',
                                )}
                                dir={isCurrency ? 'ltr' : undefined}
                              >
                                {isCurrency && Number.isFinite(num) && num !== 0
                                  ? formatCurrency(Math.abs(num), 'YER')
                                  : String(val ?? '—')}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
