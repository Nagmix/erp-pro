'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useRunReport } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildReceivablePayableFilters } from '@/lib/reports/accounting-advanced-filters';
import { normalizeFrappeReportPayload } from '@/lib/reports/normalize-frappe-report';
import { formatCurrency } from '@/lib/core/helpers';
import {
  Users,
  Printer,
  RotateCcw,
  AlertTriangle,
  Clock,
  CalendarClock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AgingTab = 'receivable' | 'payable';

const TAB_META: { id: AgingTab; label: string; short: string; catalogId: string }[] = [
  { id: 'receivable', label: 'أعمار ذمم العملاء', short: 'عملاء', catalogId: 'accounts-receivable' },
  { id: 'payable', label: 'أعمار ذمم الموردين', short: 'موردين', catalogId: 'accounts-payable' },
];

function defaultReportDate() {
  return new Date().toISOString().slice(0, 10);
}

/** Aging bucket colors */
function agingCellColor(range1to30: number, range31to60: number, range61to90: number, rangeAbove90: number) {
  const max = Math.max(range1to30, range31to60, range61to90, rangeAbove90, 1);
  if (rangeAbove90 / max > 0.5) return 'bg-destructive/10/80 dark:bg-destructive/10 text-red-800 dark:text-red-200';
  if (range61to90 / max > 0.5) return 'bg-chart-4/10 text-chart-4';
  if (range31to60 / max > 0.5) return 'bg-chart-2/10/80 dark:bg-chart-2/10 text-amber-800 dark:text-amber-200';
  return 'bg-primary/10/80 dark:bg-primary/10 text-emerald-800 dark:text-emerald-200';
}

/** Parse aging data from ERPNext report rows */
interface AgingRow {
  party: string;
  partyName: string;
  total: number;
  range0: number;   // Current
  range1: number;   // 1-30 days
  range2: number;   // 31-60 days
  range3: number;   // 61-90 days
  range4: number;   // 90+ days
  invoices: Record<string, unknown>[];
}

function parseAgingRows(rawRows: unknown[], tab: AgingTab): AgingRow[] {
  const partyKey = tab === 'receivable' ? 'customer' : 'supplier';
  const partyNameKey = tab === 'receivable' ? 'customer_name' : 'supplier_name';

  return rawRows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      party: String(r[partyKey] ?? r.party ?? ''),
      partyName: String(r[partyNameKey] ?? r.party_name ?? ''),
      total: Number(r.outstanding_amount ?? r.grand_total ?? r.total ?? 0) || 0,
      range0: Number(r['0-30'] ?? r.range1 ?? r.current ?? 0) || 0,
      range1: Number(r['31-60'] ?? r.range2 ?? 0) || 0,
      range2: Number(r['61-90'] ?? r.range3 ?? 0) || 0,
      range3: Number(r['91-120'] ?? r.range4 ?? 0) || 0,
      range4: Number(r['120-above'] ?? r.range5 ?? r.above_90 ?? 0) || 0,
      invoices: Array.isArray(r.invoices) ? r.invoices : [],
    };
  });
}

export default function AgingReportPage() {
  const [reportDate, setReportDate] = useState(defaultReportDate());
  const [tab, setTab] = useState<AgingTab>('receivable');
  const [expandedParty, setExpandedParty] = useState<string | null>(null);
  const { company: effectiveCompany } = useDefaultCompanyName();

  const reportId = useMemo(
    () => TAB_META.find((t) => t.id === tab)?.catalogId ?? 'accounts-receivable',
    [tab]
  );

  const filters = useMemo(() => {
    if (!effectiveCompany || !reportDate) return null;
    return buildReceivablePayableFilters({
      company: effectiveCompany,
      reportDate,
    });
  }, [effectiveCompany, reportDate, tab]);

  const filtersReady = Boolean(filters);
  const reportQuery = useRunReport(reportId, filters ?? {}, filtersReady);

  const normalized = useMemo(
    () => normalizeFrappeReportPayload(reportQuery.data ?? null),
    [reportQuery.data]
  );

  const agingRows = useMemo(
    () => parseAgingRows(normalized.rows, tab),
    [normalized.rows, tab]
  );

  // Compute KPIs
  const kpis = useMemo(() => {
    let totalOutstanding = 0;
    let totalRange0 = 0;
    let totalRange1 = 0;
    let totalRange2 = 0;
    let totalRange3 = 0;
    let totalRange4 = 0;

    for (const row of agingRows) {
      totalOutstanding += row.total;
      totalRange0 += row.range0;
      totalRange1 += row.range1;
      totalRange2 += row.range2;
      totalRange3 += row.range3;
      totalRange4 += row.range4;
    }

    return { totalOutstanding, totalRange0, totalRange1, totalRange2, totalRange3, totalRange4 };
  }, [agingRows]);

  const exportCols = [
    { key: 'party', header: 'الطرف' },
    { key: 'partyName', header: 'الاسم' },
    { key: 'total', header: 'الإجمالي' },
    { key: 'range0', header: 'حالي' },
    { key: 'range1', header: '1-30 يوم' },
    { key: 'range2', header: '31-60 يوم' },
    { key: 'range3', header: '61-90 يوم' },
    { key: 'range4', header: 'أكثر من 90 يوم' },
  ];

  const exportData = agingRows.map((r) => ({
    party: r.party,
    partyName: r.partyName,
    total: r.total,
    range0: r.range0,
    range1: r.range1,
    range2: r.range2,
    range3: r.range3,
    range4: r.range4,
  }));

  const resetFilters = () => {
    setReportDate(defaultReportDate());
    setExpandedParty(null);
  };

  const toggleExpand = (party: string) => {
    setExpandedParty((prev) => (prev === party ? null : party));
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="أعمار الذمم"
        description="تحليل أعمار المديونيات حسب فترات الاستحقاق مع تصنيف لوني وخريطة توزيع بصري."
        iconify="solar:clock-circle-bold-duotone"
        accent="warning"
        breadcrumbs={[
          { label: 'المحاسبة', href: '/accounting' },
          { label: 'أعمار الذمم' },
        ]}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => window.print()}
              disabled={agingRows.length === 0}
            >
              <Printer className="h-3.5 w-3.5" />
              طباعة
            </Button>
          </div>
        }
      />

      {/* KPI Strip */}
      <KpiStrip cols={6}>
        <KpiCard
          title="إجمالي المستحقات"
          value={formatCurrency(kpis.totalOutstanding, 'YER')}
          icon={Users}
          accent="primary"
          compact
        />
        <KpiCard
          title="حالي"
          value={formatCurrency(kpis.totalRange0, 'YER')}
          icon={Clock}
          accent="success"
          compact
        />
        <KpiCard
          title="1-30 يوم"
          value={formatCurrency(kpis.totalRange1, 'YER')}
          icon={Clock}
          accent="info"
          compact
        />
        <KpiCard
          title="31-60 يوم"
          value={formatCurrency(kpis.totalRange2, 'YER')}
          icon={AlertTriangle}
          accent="warning"
          compact
        />
        <KpiCard
          title="61-90 يوم"
          value={formatCurrency(kpis.totalRange3, 'YER')}
          icon={AlertTriangle}
          accent="warning"
          compact
        />
        <KpiCard
          title="أكثر من 90 يوم"
          value={formatCurrency(kpis.totalRange4, 'YER')}
          icon={AlertTriangle}
          accent="destructive"
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
                data={exportData}
                filename={`أعمار الذمم - ${tab === 'receivable' ? 'عملاء' : 'موردين'}`}
                columns={exportCols}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* As-of Date */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                كما في تاريخ
              </Label>
              <Input
                type="date"
                dir="ltr"
                className="h-9 w-full"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v as AgingTab); setExpandedParty(null); }} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-muted/40 p-1 print:hidden">
          {TAB_META.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="gap-1.5 data-[state=active]:bg-background">
              {t.short}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="space-y-4">
          {reportQuery.isError && (
            <p className="text-sm text-destructive">
              {(reportQuery.error as Error)?.message || 'تعذر تشغيل التقرير.'}
            </p>
          )}

          {reportQuery.isLoading && (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="text-sm">جاري تحميل تقرير أعمار الذمم…</span>
            </div>
          )}

          {!reportQuery.isLoading && !reportQuery.isError && filtersReady && agingRows.length === 0 && (
            <EmptyState
              title="لا توجد مستحقات"
              description="لا توجد ذمم مستحقة ضمن المعايير المحددة."
            />
          )}

          {!filtersReady && !reportQuery.isLoading && (
            <EmptyState
              title="اختر معايير التقرير"
              description="حدد تاريخ التقرير لعرض أعمار الذمم."
            />
          )}

          {/* Aging Distribution Bar Chart */}
          {agingRows.length > 0 && kpis.totalOutstanding > 0 && (
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">توزيع الأعمار</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex h-8 rounded-lg overflow-hidden bg-muted/30">
                  {(() => {
                    const t = kpis.totalOutstanding;
                    if (t === 0) return null;
                    const segments = [
                      { value: kpis.totalRange0, color: 'bg-chart-3/80', label: 'حالي' },
                      { value: kpis.totalRange1, color: 'bg-chart-1/80', label: '1-30 يوم' },
                      { value: kpis.totalRange2, color: 'bg-chart-2/80', label: '31-60 يوم' },
                      { value: kpis.totalRange3, color: 'bg-chart-4/80', label: '61-90 يوم' },
                      { value: kpis.totalRange4, color: 'bg-destructive/80', label: '+90 يوم' },
                    ];
                    return segments.map((seg) => {
                      const pct = (seg.value / t) * 100;
                      if (pct < 0.5) return null;
                      return (
                        <div
                          key={seg.label}
                          className={cn('flex items-center justify-center text-[9px] font-medium text-white transition-all', seg.color)}
                          style={{ width: `${pct}%` }}
                          title={`${seg.label}: ${formatCurrency(seg.value, 'YER')} (${pct.toFixed(1)}%)`}
                        >
                          {pct > 8 ? `${pct.toFixed(0)}%` : ''}
                        </div>
                      );
                    });
                  })()}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-chart-3/80" /> حالي</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-chart-1/80" /> 1-30 يوم</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-chart-2/80" /> 31-60 يوم</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-chart-4/80" /> 61-90 يوم</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-destructive/80" /> +90 يوم</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Aging Table */}
          {agingRows.length > 0 && (
            <div className="rounded-xl border border-border/40 bg-card overflow-x-auto hover:border-border/60 transition-colors">
              <Table>
                <TableHeader className="sticky top-0 z-20 bg-muted/90 backdrop-blur">
                  <TableRow className="hover:bg-muted/60 border-b border-border/40">
                    <TableHead className="text-xs font-semibold w-8" />
                    <TableHead className="text-xs font-semibold">الطرف</TableHead>
                    <TableHead className="text-xs font-semibold text-start" dir="ltr">الإجمالي</TableHead>
                    <TableHead className="text-xs font-semibold text-start" dir="ltr">حالي</TableHead>
                    <TableHead className="text-xs font-semibold text-start" dir="ltr">1-30 يوم</TableHead>
                    <TableHead className="text-xs font-semibold text-start" dir="ltr">31-60 يوم</TableHead>
                    <TableHead className="text-xs font-semibold text-start" dir="ltr">61-90 يوم</TableHead>
                    <TableHead className="text-xs font-semibold text-start" dir="ltr">+90 يوم</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agingRows.map((row) => {
                    const isExpanded = expandedParty === row.party;
                    return (
                      <>
                        <TableRow
                          key={row.party}
                          className={cn(
                            'group border-b border-border/30 transition-colors hover:bg-primary/5 cursor-pointer',
                          )}
                          onClick={() => toggleExpand(row.party)}
                        >
                          <TableCell className="py-2">
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2 font-medium">
                            <div>{row.partyName || row.party}</div>
                            {row.partyName && row.party !== row.partyName && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">{row.party}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2 tabular-nums font-semibold" dir="ltr">
                            {formatCurrency(row.total, 'YER')}
                          </TableCell>
                          <TableCell className="text-xs py-2 tabular-nums" dir="ltr">
                            <span className="rounded px-1.5 py-0.5 bg-primary/10/80 dark:bg-primary/10 text-emerald-800 dark:text-emerald-200">
                              {row.range0 > 0 ? formatCurrency(row.range0, 'YER') : '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs py-2 tabular-nums" dir="ltr">
                            <span className="rounded px-1.5 py-0.5 bg-chart-1/10/80 dark:bg-chart-1/10 text-sky-800 dark:text-sky-200">
                              {row.range1 > 0 ? formatCurrency(row.range1, 'YER') : '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs py-2 tabular-nums" dir="ltr">
                            <span className={cn('rounded px-1.5 py-0.5', row.range2 > 0 ? 'bg-chart-2/10/80 dark:bg-chart-2/10 text-amber-800 dark:text-amber-200' : '')}>
                              {row.range2 > 0 ? formatCurrency(row.range2, 'YER') : '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs py-2 tabular-nums" dir="ltr">
                            <span className={cn('rounded px-1.5 py-0.5', row.range3 > 0 ? 'bg-chart-4/10 text-chart-4' : '')}>
                              {row.range3 > 0 ? formatCurrency(row.range3, 'YER') : '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs py-2 tabular-nums" dir="ltr">
                            <span className={cn('rounded px-1.5 py-0.5', row.range4 > 0 ? 'bg-destructive/10/80 dark:bg-destructive/10 text-red-800 dark:text-red-200' : '')}>
                              {row.range4 > 0 ? formatCurrency(row.range4, 'YER') : '—'}
                            </span>
                          </TableCell>
                        </TableRow>
                        {/* Drill-down detail row */}
                        {isExpanded && (
                          <TableRow key={`${row.party}-detail`} className="bg-muted/20 border-b border-border/20">
                            <TableCell />
                            <TableCell colSpan={7} className="p-3">
                              <div className="space-y-1 text-[11px]">
                                <p className="font-semibold text-muted-foreground mb-2">تفاصيل الفواتير — {row.partyName || row.party}</p>
                                {row.invoices.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-[10px]">
                                      <thead>
                                        <tr className="border-b border-border/30">
                                          <th className="py-1 px-2 text-start">الفاتورة</th>
                                          <th className="py-1 px-2 text-start">تاريخ الفاتورة</th>
                                          <th className="py-1 px-2 text-start">تاريخ الاستحقاق</th>
                                          <th className="py-1 px-2 text-start">المبلغ</th>
                                          <th className="py-1 px-2 text-start">المستحق</th>
                                          <th className="py-1 px-2 text-start">متأخر (أيام)</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {row.invoices.map((inv, idx) => {
                                          const i = inv as Record<string, unknown>;
                                          return (
                                            <tr key={idx} className="border-b border-border/10">
                                              <td className="py-1 px-2">{String(i.voucher_no ?? i.invoice ?? '—')}</td>
                                              <td className="py-1 px-2" dir="ltr">{String(i.posting_date ?? i.invoice_date ?? '—')}</td>
                                              <td className="py-1 px-2" dir="ltr">{String(i.due_date ?? '—')}</td>
                                              <td className="py-1 px-2 tabular-nums" dir="ltr">{formatCurrency(Number(i.grand_total ?? i.invoice_amount ?? 0) || 0, 'YER')}</td>
                                              <td className="py-1 px-2 tabular-nums font-medium" dir="ltr">{formatCurrency(Number(i.outstanding_amount ?? 0) || 0, 'YER')}</td>
                                              <td className="py-1 px-2 tabular-nums">{String(i.age ?? i.overdue_by ?? '—')}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground">لا توجد فواتير تفصيلية متاحة. راجع التقرير الأصلي في النظام.</p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                  {/* Totals row */}
                  <TableRow className="bg-muted/30 font-semibold border-t-2 border-border/60">
                    <TableCell />
                    <TableCell className="text-xs py-2.5 font-bold">الإجمالي</TableCell>
                    <TableCell className="text-xs py-2.5 tabular-nums font-bold" dir="ltr">
                      {formatCurrency(kpis.totalOutstanding, 'YER')}
                    </TableCell>
                    <TableCell className="text-xs py-2.5 tabular-nums" dir="ltr">
                      {formatCurrency(kpis.totalRange0, 'YER')}
                    </TableCell>
                    <TableCell className="text-xs py-2.5 tabular-nums" dir="ltr">
                      {formatCurrency(kpis.totalRange1, 'YER')}
                    </TableCell>
                    <TableCell className="text-xs py-2.5 tabular-nums" dir="ltr">
                      {formatCurrency(kpis.totalRange2, 'YER')}
                    </TableCell>
                    <TableCell className="text-xs py-2.5 tabular-nums" dir="ltr">
                      {formatCurrency(kpis.totalRange3, 'YER')}
                    </TableCell>
                    <TableCell className="text-xs py-2.5 tabular-nums" dir="ltr">
                      {formatCurrency(kpis.totalRange4, 'YER')}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
