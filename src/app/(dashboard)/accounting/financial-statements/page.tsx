'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { ErpTabbedForm, type ErpTabDef } from '@/components/erp/erp-tabbed-form';
import { DataTable } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { EmptyState } from '@/components/erp/empty-state';
import { ExportButton } from '@/components/erp/export-button';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDocList, useRunReport } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { normalizeFrappeReportPayload } from '@/lib/reports/normalize-frappe-report';
import { normalizedColumnsToDataTable } from '@/lib/reports/frappe-report-columns';
import {
  buildFinancialStatementFilters,
  buildTrialBalanceFilters,
  pickFiscalYearForDate,
  type FiscalYearRow,
  type Periodicity,
} from '@/lib/reports/financial-filters';
import {
  Landmark,
  TrendingUp,
  Wallet,
  Scale,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/core/helpers';

type ReportTab = 'balance-sheet' | 'income-statement' | 'cash-flow' | 'trial-balance';

/** `catalogId` = مُعرّف سجل في `REPORTS_CATALOG` (يُمرَّر لـ `/api/reports/{id}`) وليس اسم ERPNext مباشرة. */
const TAB_META: { id: ReportTab; label: string; short: string; icon: React.ComponentType<{ className?: string }>; catalogId: string }[] = [
  { id: 'balance-sheet', label: 'الميزانية العمومية', short: 'ميزانية', icon: Landmark, catalogId: 'balance-sheet' },
  { id: 'income-statement', label: 'قائمة الدخل', short: 'دخل', icon: TrendingUp, catalogId: 'income-statement' },
  { id: 'cash-flow', label: 'التدفقات النقدية', short: 'تدفقات', icon: Wallet, catalogId: 'cash-flow' },
  { id: 'trial-balance', label: 'ميزان المراجعة', short: 'مراجعة', icon: Scale, catalogId: 'trial-balance' },
];

function defaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(now) };
}

export default function FinancialStatementsPage() {
  const { from: d0, to: d1 } = defaultDateRange();
  const [from, setFrom] = useState(d0);
  const [to, setTo] = useState(d1);
  const [tab, setTab] = useState<ReportTab>('income-statement');
  const [periodicity, setPeriodicity] = useState<Periodicity>('Yearly');
  const [selectedCompany, setSelectedCompany] = useState('');
  const { company: effectiveCompany } = useDefaultCompanyName();

  const company = selectedCompany || effectiveCompany;

  const { data: fiscalYears = [], isLoading: fyLoading } = useDocList<FiscalYearRow>('Fiscal Year', {
    fields: ['name', 'year_start_date', 'year_end_date'],
    limit: 40,
  });

  const reportId = useMemo(
    () => TAB_META.find((t) => t.id === tab)?.catalogId ?? 'income-statement',
    [tab]
  );

  const fiscalYearName = useMemo(
    () => pickFiscalYearForDate(fiscalYears, to),
    [fiscalYears, to]
  );

  const filters = useMemo(() => {
    if (!company || !from || !to) return null;
    if (tab === 'trial-balance') {
      if (!fiscalYearName) return null;
      return buildTrialBalanceFilters({
        company,
        fiscalYear: fiscalYearName,
        fromDate: from,
        toDate: to,
      });
    }
    return buildFinancialStatementFilters({
      company,
      periodStart: from,
      periodEnd: to,
      periodicity,
    });
  }, [company, from, to, tab, periodicity, fiscalYearName]);

  const filtersReady = Boolean(filters);
  const reportQuery = useRunReport(
    reportId,
    filters ?? {},
    filtersReady
  );

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

  const resetFilters = () => {
    const { from: defFrom, to: defTo } = defaultDateRange();
    setFrom(defFrom);
    setTo(defTo);
    setPeriodicity('Yearly');
    setSelectedCompany('');
  };

  const handlePrint = () => {
    window.print();
  };

  const activeTabLabel = TAB_META.find((t) => t.id === tab)?.label ?? 'تقرير مالي';

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={reportQuery.isError ? (reportQuery.error as Error | null) : null} onRetry={() => reportQuery.refetch()} />

      <PageHeader
        title="القوائم المالية الرسمية"
        description="قائمة الدخل والميزانية العمومية والتدفقات النقدية وميزان المراجعة — بيانات فعلية للمراجعة والتصدير."
        iconify="solar:document-text-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'القوائم المالية' }]}
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
          </div>
        }
      />

      <Alert className="border-border/55 bg-muted/25 print:hidden">
        <AlertTitle className="text-sm">إطار المعايير (عرض إرشادي مع القوائم)</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground leading-relaxed space-y-2 [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 [&_a]:hover:underline">
          <p>
            <span className="font-medium text-foreground/90">IAS 1:</span> أقسام الميزانية وقائمة الدخل تعكس بنية الحسابات؛ تصنيف متداول/غير متداول يتبع إعداد الحسابات على الخادم.
          </p>
          <p>
            <span className="font-medium text-foreground/90">IAS 7:</span> تبويب التدفقات النقدية يستخدم تقرير Cash Flow الجاهز؛ طريقة العرض تعتمد على إعداد الموقع.
          </p>
          <p>
            <span className="font-medium text-foreground/90">IFRS 15:</span> الإيراد المؤجل والفترات المتعددة من{' '}
            <Link href="/accounting/deferred-revenue">صفحة الإيراد المؤجل</Link>.
          </p>
          <p>
            <span className="font-medium text-foreground/90">IFRS 16 / عقود:</span> اشتراكات وإيجارات من{' '}
            <Link href="/crm/subscriptions">الاشتراكات</Link> و<Link href="/operations/rentals">الإيجارات</Link>
            {' '}مع تقارير الأقساط من <Link href="/reports">مركز التقارير</Link>.
          </p>
          <p className="pt-1 border-t border-border/40">
            <span className="font-medium text-foreground/90">IAS 12:</span> الضرائب المؤجلة لا تُحسب آلياً هنا؛ تبدأ المراجعة من دفتر الأستاذ وحسابات الضريبة. مسارات مفيدة:{' '}
            <Link href="/accounting/advanced-reports">التقارير المحاسبية المتقدمة</Link>
            {' '}، <Link href="/settings/account-routing">توجيه الحسابات</Link>
            {' '}، <Link href="/reports">مركز التقارير</Link>.
          </p>
          <p>
            <span className="font-medium text-foreground/90">IAS 36:</span> ضعف الأصول يحتاج سياسات وتقديرات؛ يمكن متابعة القيم الدفترية والإهلاك من{' '}
            <Link href="/accounting/assets">الأصول</Link>
            {' '}مع القوائم أعلاه وميزان المراجعة.
          </p>
          <p>
            <span className="font-medium text-foreground/90">IFRS 9:</span> أدوات مالية مذمومة/مدينة تُراجع عبر ذمم العملاء والموردين والبنوك —{' '}
            <Link href="/accounting/advanced-reports">التقارير المتقدمة</Link>
            {' '}، <Link href="/accounting/bank-accounts">البنوك والصناديق</Link>
            {' '}، <Link href="/reports">مركز التقارير</Link>. الاعتراف بقيمة عادلة وتغطية مخاطر الائتمان أوسع من التقارير الجاهزة.
          </p>
          <p className="text-[11px] opacity-90">
            الامتثال الكامل لهذه المعايير يظل مسؤولية السياسات المحاسبية والقيود والتقارير المخصصة على الخادم.
          </p>
        </AlertDescription>
      </Alert>

      {/* Enhanced Filter Card */}
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
                data={normalized.rows}
                filename={activeTabLabel}
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
            {tab !== 'trial-balance' ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">التواتر</Label>
                <Select value={periodicity} onValueChange={(v) => setPeriodicity(v as Periodicity)}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yearly">سنوي</SelectItem>
                    <SelectItem value="Half-Yearly">نصف سنوي</SelectItem>
                    <SelectItem value="Quarterly">ربع سنوي</SelectItem>
                    <SelectItem value="Monthly">شهري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">السنة المالية</Label>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-xs text-muted-foreground">
                  {fiscalYearName || '—'}
                </div>
              </div>
            )}
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
                  تواتر: {periodicity === 'Monthly' ? 'شهري' : periodicity === 'Quarterly' ? 'ربع سنوي' : 'نصف سنوي'}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ErpTabbedForm
        value={tab}
        onValueChange={(v) => setTab(v as ReportTab)}
        tabs={TAB_META.map((t) => {
          const Icon = t.icon;
          return {
            value: t.id,
            label: t.short,
            icon: <Icon className="h-4 w-4" />,
            content: (
              <div className="space-y-4">
          {tab === 'trial-balance' && !fyLoading && company && !fiscalYearName && (
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

          {summaryStrip.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {summaryStrip.map((s, i) => {
                const label = String(s.label ?? '');
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
                    <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
                    <p className="text-lg font-semibold tabular-nums tracking-tight">{shown}</p>
                  </div>
                );
              })}
            </div>
          )}

          {reportQuery.isLoading && (
            <p className="text-xs text-muted-foreground">جاري تحميل التقرير…</p>
          )}

          {!reportQuery.isLoading && !reportQuery.isError && filtersReady && normalized.rows.length === 0 && (
            <EmptyState
              title="لا توجد صفوف للعرض"
              description="جرّب توسيع الفترة أو تحقق من وجود قيود محاسبية ضمن الشركة والتواريخ المحددة."
            />
          )}

          {!filtersReady && !reportQuery.isLoading && (
            <EmptyState
              title="اختر معايير التقرير"
              description="حدد الشركة والتواريخ لعرض القوائم المالية."
            />
          )}

          {normalized.rows.length > 0 && (
            <DataTable
              data={normalized.rows}
              columns={tableColumns}
              searchable
              pageSize={25}
              stickyFirstColumn
              exportFileName={activeTabLabel}
            />
          )}
              </div>
            ),
          };
        })}
      />
    </div>
  );
}
