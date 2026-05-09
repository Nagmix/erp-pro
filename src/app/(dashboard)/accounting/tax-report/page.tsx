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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { EmptyState } from '@/components/erp/empty-state';
import { ExportButton } from '@/components/erp/export-button';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useRunReport } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildSalesRegisterFilters, buildPurchaseRegisterFilters } from '@/lib/reports/accounting-advanced-filters';
import { normalizeFrappeReportPayload } from '@/lib/reports/normalize-frappe-report';
import { normalizedColumnsToDataTable } from '@/lib/reports/frappe-report-columns';
import { formatCurrency } from '@/lib/core/helpers';
import {
  Receipt,
  Printer,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type PeriodMode = 'monthly' | 'quarterly' | 'yearly';

const PERIOD_OPTIONS: { value: PeriodMode; label: string }[] = [
  { value: 'monthly', label: 'شهري' },
  { value: 'quarterly', label: 'ربع سنوي' },
  { value: 'yearly', label: 'سنوي' },
];

function defaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(now) };
}

export default function TaxReportPage() {
  const { from: d0, to: d1 } = defaultDateRange();
  const [from, setFrom] = useState(d0);
  const [to, setTo] = useState(d1);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const { company: effectiveCompany } = useDefaultCompanyName();

  const company = selectedCompany || effectiveCompany;

  // Sales Register
  const salesFilters = useMemo(() => {
    if (!company || !from || !to) return null;
    return buildSalesRegisterFilters({ company, fromDate: from, toDate: to });
  }, [company, from, to]);

  // Purchase Register
  const purchaseFilters = useMemo(() => {
    if (!company || !from || !to) return null;
    return buildPurchaseRegisterFilters({ company, fromDate: from, toDate: to });
  }, [company, from, to]);

  const salesReady = Boolean(salesFilters);
  const purchaseReady = Boolean(purchaseFilters);

  const salesQuery = useRunReport('sales-register', salesFilters ?? {}, salesReady);
  const purchaseQuery = useRunReport('purchase-register', purchaseFilters ?? {}, purchaseReady);

  const salesNormalized = useMemo(
    () => normalizeFrappeReportPayload(salesQuery.data ?? null),
    [salesQuery.data]
  );

  const purchaseNormalized = useMemo(
    () => normalizeFrappeReportPayload(purchaseQuery.data ?? null),
    [purchaseQuery.data]
  );

  // Compute tax KPIs
  const taxKpis = useMemo(() => {
    let totalSalesExclTax = 0;
    let totalSalesTax = 0;
    let totalPurchaseExclTax = 0;
    let totalPurchaseTax = 0;

    // Parse sales data
    for (const row of salesNormalized.rows) {
      const r = row as Record<string, unknown>;
      const netTotal = Number(r.net_total ?? r.grand_total_net ?? 0) || 0;
      const taxAmount = Number(r.total_taxes_and_charges ?? r.tax_amount ?? 0) || 0;
      totalSalesExclTax += netTotal;
      totalSalesTax += taxAmount;
    }

    // Parse purchase data
    for (const row of purchaseNormalized.rows) {
      const r = row as Record<string, unknown>;
      const netTotal = Number(r.net_total ?? r.grand_total_net ?? 0) || 0;
      const taxAmount = Number(r.total_taxes_and_charges ?? r.tax_amount ?? 0) || 0;
      totalPurchaseExclTax += netTotal;
      totalPurchaseTax += taxAmount;
    }

    const netTaxPayable = totalSalesTax - totalPurchaseTax;

    return { totalSalesExclTax, totalSalesTax, totalPurchaseExclTax, totalPurchaseTax, netTaxPayable };
  }, [salesNormalized.rows, purchaseNormalized.rows]);

  // Group sales tax by rate/category
  const salesTaxBreakdown = useMemo(() => {
    const groups: Record<string, { rate: string; taxableAmount: number; taxAmount: number }> = {};

    for (const row of salesNormalized.rows) {
      const r = row as Record<string, unknown>;
      const taxCategory = String(r.tax_category ?? r.tax_id ?? 'افتراضي');
      const netTotal = Number(r.net_total ?? r.grand_total_net ?? 0) || 0;
      const taxAmount = Number(r.total_taxes_and_charges ?? r.tax_amount ?? 0) || 0;

      if (!groups[taxCategory]) {
        groups[taxCategory] = { rate: taxCategory, taxableAmount: 0, taxAmount: 0 };
      }
      groups[taxCategory].taxableAmount += netTotal;
      groups[taxCategory].taxAmount += taxAmount;
    }

    return Object.values(groups);
  }, [salesNormalized.rows]);

  // Group purchase tax by rate/category
  const purchaseTaxBreakdown = useMemo(() => {
    const groups: Record<string, { rate: string; taxableAmount: number; taxAmount: number }> = {};

    for (const row of purchaseNormalized.rows) {
      const r = row as Record<string, unknown>;
      const taxCategory = String(r.tax_category ?? r.tax_id ?? 'افتراضي');
      const netTotal = Number(r.net_total ?? r.grand_total_net ?? 0) || 0;
      const taxAmount = Number(r.total_taxes_and_charges ?? r.tax_amount ?? 0) || 0;

      if (!groups[taxCategory]) {
        groups[taxCategory] = { rate: taxCategory, taxableAmount: 0, taxAmount: 0 };
      }
      groups[taxCategory].taxableAmount += netTotal;
      groups[taxCategory].taxAmount += taxAmount;
    }

    return Object.values(groups);
  }, [purchaseNormalized.rows]);

  // Monthly trend summary
  const monthlyTrend = useMemo(() => {
    const months: Record<string, { sales: number; salesTax: number; purchase: number; purchaseTax: number }> = {};

    // Process sales
    for (const row of salesNormalized.rows) {
      const r = row as Record<string, unknown>;
      const date = String(r.posting_date ?? r.date ?? '');
      const monthKey = date.slice(0, 7); // YYYY-MM
      if (!monthKey || monthKey.length < 7) continue;
      if (!months[monthKey]) months[monthKey] = { sales: 0, salesTax: 0, purchase: 0, purchaseTax: 0 };
      months[monthKey].sales += Number(r.net_total ?? r.grand_total_net ?? 0) || 0;
      months[monthKey].salesTax += Number(r.total_taxes_and_charges ?? r.tax_amount ?? 0) || 0;
    }

    // Process purchases
    for (const row of purchaseNormalized.rows) {
      const r = row as Record<string, unknown>;
      const date = String(r.posting_date ?? r.date ?? '');
      const monthKey = date.slice(0, 7);
      if (!monthKey || monthKey.length < 7) continue;
      if (!months[monthKey]) months[monthKey] = { sales: 0, salesTax: 0, purchase: 0, purchaseTax: 0 };
      months[monthKey].purchase += Number(r.net_total ?? r.grand_total_net ?? 0) || 0;
      months[monthKey].purchaseTax += Number(r.total_taxes_and_charges ?? r.tax_amount ?? 0) || 0;
    }

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        ...data,
        netTax: data.salesTax - data.purchaseTax,
      }));
  }, [salesNormalized.rows, purchaseNormalized.rows]);

  const filtersReady = salesReady && purchaseReady;

  // Export data
  const taxExportCols = [
    { key: 'month', header: 'الشهر' },
    { key: 'sales', header: 'المبيعات (بدون ضريبة)' },
    { key: 'salesTax', header: 'ضريبة المبيعات' },
    { key: 'purchase', header: 'المشتريات (بدون ضريبة)' },
    { key: 'purchaseTax', header: 'ضريبة المشتريات' },
    { key: 'netTax', header: 'صافي الضريبة المستحقة' },
  ];

  const taxExportData = monthlyTrend.map((t) => ({
    month: t.month,
    sales: t.sales,
    salesTax: t.salesTax,
    purchase: t.purchase,
    purchaseTax: t.purchaseTax,
    netTax: t.netTax,
  }));

  const resetFilters = () => {
    const { from: defFrom, to: defTo } = defaultDateRange();
    setFrom(defFrom);
    setTo(defTo);
    setSelectedCompany('');
    setPeriodMode('monthly');
  };

  const isLoading = salesQuery.isLoading || purchaseQuery.isLoading;
  const hasError = salesQuery.isError || purchaseQuery.isError;
  const hasData = salesNormalized.rows.length > 0 || purchaseNormalized.rows.length > 0;

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="التقرير الضريبي"
        description="تحليل الضرائب على المبيعات والمشتريات وحساب صافي الضريبة المستحقة للإقرار الضريبي."
        iconify="solar:document-text-bold-duotone"
        accent="warning"
        breadcrumbs={[
          { label: 'المحاسبة', href: '/accounting' },
          { label: 'التقرير الضريبي' },
        ]}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => window.print()}
              disabled={!hasData}
            >
              <Printer className="h-3.5 w-3.5" />
              طباعة
            </Button>
          </div>
        }
      />

      {/* KPI Strip */}
      <KpiStrip cols={5}>
        <KpiCard
          title="المبيعات (بدون ضريبة)"
          value={formatCurrency(taxKpis.totalSalesExclTax, 'YER')}
          icon={TrendingUp}
          accent="success"
          compact
        />
        <KpiCard
          title="المشتريات (بدون ضريبة)"
          value={formatCurrency(taxKpis.totalPurchaseExclTax, 'YER')}
          icon={TrendingDown}
          accent="info"
          compact
        />
        <KpiCard
          title="ضريبة المبيعات"
          value={formatCurrency(taxKpis.totalSalesTax, 'YER')}
          icon={Receipt}
          accent="warning"
          compact
        />
        <KpiCard
          title="ضريبة المشتريات"
          value={formatCurrency(taxKpis.totalPurchaseTax, 'YER')}
          icon={Receipt}
          accent="info"
          compact
        />
        <KpiCard
          title="صافي الضريبة المستحقة"
          value={formatCurrency(taxKpis.netTaxPayable, 'YER')}
          icon={Calculator}
          accent={taxKpis.netTaxPayable >= 0 ? 'destructive' : 'success'}
          description={taxKpis.netTaxPayable >= 0 ? 'مبلغ واجب الدفع' : 'مبلغ مسترد'}
          compact
        />
      </KpiStrip>

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
                data={taxExportData}
                filename="التقرير الضريبي"
                columns={taxExportCols}
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
            {/* Period mode */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">الفترة</Label>
              <Select value={periodMode} onValueChange={(v) => setPeriodMode(v as PeriodMode)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Active filter indicators */}
          {(selectedCompany || from !== d0 || to !== d1 || periodMode !== 'monthly') && (
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
              {periodMode !== 'monthly' && (
                <span className="inline-flex items-center rounded-md bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning-foreground ring-1 ring-inset ring-warning/20">
                  فترة: {PERIOD_OPTIONS.find((o) => o.value === periodMode)?.label}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      <div className="space-y-4">
        {hasError && (
          <p className="text-sm text-destructive">
            {(salesQuery.error as Error)?.message || (purchaseQuery.error as Error)?.message || 'تعذر تشغيل التقرير.'}
          </p>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm">جاري تحميل بيانات الضرائب…</span>
          </div>
        )}

        {!isLoading && !hasError && filtersReady && !hasData && (
          <EmptyState
            title="لا توجد بيانات ضريبية"
            description="لا توجد فواتير مبيعات أو مشتريات ضمن الفترة المحددة."
          />
        )}

        {!filtersReady && !isLoading && (
          <EmptyState
            title="اختر معايير التقرير"
            description="حدد الشركة والتواريخ لعرض التقرير الضريبي."
          />
        )}

        {/* Net Tax Summary Card */}
        {hasData && (
          <Card className={cn(
            'border-border/40',
            taxKpis.netTaxPayable >= 0 ? 'border-s-rose-500/60' : 'border-s-emerald-500/60'
          )} style={{ borderRightWidth: '3px' }}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">صافي الضريبة المستحقة</p>
                  <p className={cn(
                    'text-2xl font-bold tabular-nums mt-1',
                    taxKpis.netTaxPayable >= 0 ? 'text-rose-600' : 'text-emerald-600'
                  )} dir="ltr">
                    {formatCurrency(taxKpis.netTaxPayable, 'YER')}
                  </p>
                </div>
                <div className="text-start space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span className="text-muted-foreground">ضريبة مبيعات محصّلة</span>
                    <span className="font-medium tabular-nums" dir="ltr">{formatCurrency(taxKpis.totalSalesTax, 'YER')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    <span className="text-muted-foreground">ضريبة مشتريات مدفوعة</span>
                    <span className="font-medium tabular-nums" dir="ltr">{formatCurrency(taxKpis.totalPurchaseTax, 'YER')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs border-t border-border/30 pt-1 mt-1">
                    <span className={cn('h-2 w-2 rounded-full', taxKpis.netTaxPayable >= 0 ? 'bg-rose-500' : 'bg-emerald-500')} />
                    <span className="text-muted-foreground">{taxKpis.netTaxPayable >= 0 ? 'واجب الدفع' : 'مسترد'}</span>
                    <span className={cn('font-bold tabular-nums', taxKpis.netTaxPayable >= 0 ? 'text-rose-600' : 'text-emerald-600')} dir="ltr">
                      {formatCurrency(Math.abs(taxKpis.netTaxPayable), 'YER')}
                    </span>
                  </div>
                </div>
              </div>
              {/* Visual bar */}
              {(() => {
                const total = taxKpis.totalSalesTax + taxKpis.totalPurchaseTax;
                if (total === 0) return null;
                const salesPct = (taxKpis.totalSalesTax / total) * 100;
                return (
                  <div className="mt-3 space-y-1">
                    <div className="flex h-3 rounded-full overflow-hidden bg-muted/50">
                      <div className="bg-rose-500/70 transition-all" style={{ width: `${salesPct}%` }} />
                      <div className="bg-sky-500/70 transition-all" style={{ width: `${100 - salesPct}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>ضريبة مبيعات {salesPct.toFixed(0)}%</span>
                      <span>ضريبة مشتريات {(100 - salesPct).toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Sales Tax Breakdown + Purchase Tax Breakdown */}
        {hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sales Tax Section */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  تفصيل ضريبة المبيعات
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {salesTaxBreakdown.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[11px] font-semibold">الفئة</TableHead>
                          <TableHead className="text-[11px] font-semibold text-start" dir="ltr">المبلغ الخاضع</TableHead>
                          <TableHead className="text-[11px] font-semibold text-start" dir="ltr">مبلغ الضريبة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesTaxBreakdown.map((item, idx) => (
                          <TableRow key={idx} className="border-b border-border/20">
                            <TableCell className="text-xs py-1.5">{item.rate}</TableCell>
                            <TableCell className="text-xs py-1.5 tabular-nums" dir="ltr">
                              {formatCurrency(item.taxableAmount, 'YER')}
                            </TableCell>
                            <TableCell className="text-xs py-1.5 tabular-nums font-medium text-rose-700 dark:text-rose-400" dir="ltr">
                              {formatCurrency(item.taxAmount, 'YER')}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-rose-50/50 dark:bg-rose-950/20 font-semibold border-t-2 border-rose-300/40">
                          <TableCell className="text-xs py-2">الإجمالي</TableCell>
                          <TableCell className="text-xs py-2 tabular-nums" dir="ltr">
                            {formatCurrency(taxKpis.totalSalesExclTax, 'YER')}
                          </TableCell>
                          <TableCell className="text-xs py-2 tabular-nums text-rose-700 dark:text-rose-400 font-bold" dir="ltr">
                            {formatCurrency(taxKpis.totalSalesTax, 'YER')}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    لا توجد بيانات ضريبية على المبيعات
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Purchase Tax Section */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  تفصيل ضريبة المشتريات
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {purchaseTaxBreakdown.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[11px] font-semibold">الفئة</TableHead>
                          <TableHead className="text-[11px] font-semibold text-start" dir="ltr">المبلغ الخاضع</TableHead>
                          <TableHead className="text-[11px] font-semibold text-start" dir="ltr">مبلغ الضريبة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseTaxBreakdown.map((item, idx) => (
                          <TableRow key={idx} className="border-b border-border/20">
                            <TableCell className="text-xs py-1.5">{item.rate}</TableCell>
                            <TableCell className="text-xs py-1.5 tabular-nums" dir="ltr">
                              {formatCurrency(item.taxableAmount, 'YER')}
                            </TableCell>
                            <TableCell className="text-xs py-1.5 tabular-nums font-medium text-sky-700 dark:text-sky-400" dir="ltr">
                              {formatCurrency(item.taxAmount, 'YER')}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-sky-50/50 dark:bg-sky-950/20 font-semibold border-t-2 border-sky-300/40">
                          <TableCell className="text-xs py-2">الإجمالي</TableCell>
                          <TableCell className="text-xs py-2 tabular-nums" dir="ltr">
                            {formatCurrency(taxKpis.totalPurchaseExclTax, 'YER')}
                          </TableCell>
                          <TableCell className="text-xs py-2 tabular-nums text-sky-700 dark:text-sky-400 font-bold" dir="ltr">
                            {formatCurrency(taxKpis.totalPurchaseTax, 'YER')}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    لا توجد بيانات ضريبية على المشتريات
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Monthly Trend Summary */}
        {monthlyTrend.length > 0 && (
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                ملخص الاتجاه الشهري للضرائب
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
                    <TableRow>
                      <TableHead className="text-[11px] font-semibold">الشهر</TableHead>
                      <TableHead className="text-[11px] font-semibold text-start" dir="ltr">المبيعات</TableHead>
                      <TableHead className="text-[11px] font-semibold text-start" dir="ltr">ض. المبيعات</TableHead>
                      <TableHead className="text-[11px] font-semibold text-start" dir="ltr">المشتريات</TableHead>
                      <TableHead className="text-[11px] font-semibold text-start" dir="ltr">ض. المشتريات</TableHead>
                      <TableHead className="text-[11px] font-semibold text-start" dir="ltr">صافي الضريبة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyTrend.map((t, idx) => (
                      <TableRow key={idx} className="border-b border-border/20 hover:bg-muted/30">
                        <TableCell className="text-xs py-1.5 font-medium">{t.month}</TableCell>
                        <TableCell className="text-xs py-1.5 tabular-nums" dir="ltr">
                          {formatCurrency(t.sales, 'YER')}
                        </TableCell>
                        <TableCell className="text-xs py-1.5 tabular-nums text-rose-700 dark:text-rose-400" dir="ltr">
                          {formatCurrency(t.salesTax, 'YER')}
                        </TableCell>
                        <TableCell className="text-xs py-1.5 tabular-nums" dir="ltr">
                          {formatCurrency(t.purchase, 'YER')}
                        </TableCell>
                        <TableCell className="text-xs py-1.5 tabular-nums text-sky-700 dark:text-sky-400" dir="ltr">
                          {formatCurrency(t.purchaseTax, 'YER')}
                        </TableCell>
                        <TableCell className={cn(
                          'text-xs py-1.5 tabular-nums font-semibold',
                          t.netTax >= 0 ? 'text-rose-600' : 'text-emerald-600'
                        )} dir="ltr">
                          {formatCurrency(t.netTax, 'YER')}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals */}
                    <TableRow className="bg-muted/30 font-semibold border-t-2 border-border/50">
                      <TableCell className="text-xs py-2 font-bold">الإجمالي</TableCell>
                      <TableCell className="text-xs py-2 tabular-nums font-bold" dir="ltr">
                        {formatCurrency(taxKpis.totalSalesExclTax, 'YER')}
                      </TableCell>
                      <TableCell className="text-xs py-2 tabular-nums font-bold text-rose-700 dark:text-rose-400" dir="ltr">
                        {formatCurrency(taxKpis.totalSalesTax, 'YER')}
                      </TableCell>
                      <TableCell className="text-xs py-2 tabular-nums font-bold" dir="ltr">
                        {formatCurrency(taxKpis.totalPurchaseExclTax, 'YER')}
                      </TableCell>
                      <TableCell className="text-xs py-2 tabular-nums font-bold text-sky-700 dark:text-sky-400" dir="ltr">
                        {formatCurrency(taxKpis.totalPurchaseTax, 'YER')}
                      </TableCell>
                      <TableCell className={cn(
                        'text-xs py-2 tabular-nums font-bold',
                        taxKpis.netTaxPayable >= 0 ? 'text-rose-600' : 'text-emerald-600'
                      )} dir="ltr">
                        {formatCurrency(taxKpis.netTaxPayable, 'YER')}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sales Register Raw Data */}
        {salesNormalized.rows.length > 0 && (
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  سجل المبيعات التفصيلي
                </CardTitle>
                <ExportButton
                  data={salesNormalized.rows as Record<string, unknown>[]}
                  filename="سجل المبيعات الضريبي"
                  columns={(() => {
                    const cols = normalizedColumnsToDataTable(salesNormalized.columns);
                    return cols.map((c) => ({ key: c.key, header: c.header }));
                  })()}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
                    <TableRow>
                      {salesNormalized.columns.map((col, idx) => (
                        <TableHead key={idx} className="text-[11px] font-semibold whitespace-nowrap">
                          {String(col.header ?? col.key ?? `عمود ${idx + 1}`)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesNormalized.rows.map((row, rIdx) => {
                      const r = row as Record<string, unknown>;
                      return (
                        <TableRow key={rIdx} className="border-b border-border/20 hover:bg-rose-50/30 dark:hover:bg-rose-950/10">
                          {salesNormalized.columns.map((col, cIdx) => {
                            const val = r[col.key ?? ''];
                            const isCurrency = String(col.fieldtype ?? '') === 'Currency';
                            const num = Number(val);
                            return (
                              <TableCell key={cIdx} className={cn('text-xs py-1.5 whitespace-nowrap', isCurrency && 'tabular-nums')} dir={isCurrency ? 'ltr' : undefined}>
                                {isCurrency && Number.isFinite(num) && num !== 0
                                  ? formatCurrency(num, 'YER')
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

        {/* Purchase Register Raw Data */}
        {purchaseNormalized.rows.length > 0 && (
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  سجل المشتريات التفصيلي
                </CardTitle>
                <ExportButton
                  data={purchaseNormalized.rows as Record<string, unknown>[]}
                  filename="سجل المشتريات الضريبي"
                  columns={(() => {
                    const cols = normalizedColumnsToDataTable(purchaseNormalized.columns);
                    return cols.map((c) => ({ key: c.key, header: c.header }));
                  })()}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
                    <TableRow>
                      {purchaseNormalized.columns.map((col, idx) => (
                        <TableHead key={idx} className="text-[11px] font-semibold whitespace-nowrap">
                          {String(col.header ?? col.key ?? `عمود ${idx + 1}`)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseNormalized.rows.map((row, rIdx) => {
                      const r = row as Record<string, unknown>;
                      return (
                        <TableRow key={rIdx} className="border-b border-border/20 hover:bg-sky-50/30 dark:hover:bg-sky-950/10">
                          {purchaseNormalized.columns.map((col, cIdx) => {
                            const val = r[col.key ?? ''];
                            const isCurrency = String(col.fieldtype ?? '') === 'Currency';
                            const num = Number(val);
                            return (
                              <TableCell key={cIdx} className={cn('text-xs py-1.5 whitespace-nowrap', isCurrency && 'tabular-nums')} dir={isCurrency ? 'ltr' : undefined}>
                                {isCurrency && Number.isFinite(num) && num !== 0
                                  ? formatCurrency(num, 'YER')
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
