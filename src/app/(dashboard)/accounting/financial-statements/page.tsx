'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { BarChart3, BookOpen, Scale, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/core/helpers';
import { translateAccountName, translateAccountType, translateRootType } from '@/lib/core/arabic-labels';

type ReportTab = 'balance-sheet' | 'income-statement' | 'cash-flow' | 'trial-balance';

/** `catalogId` = مُعرّف سجل في `REPORTS_CATALOG` (يُمرَّر لـ `/api/reports/{id}`) وليس اسم ERPNext مباشرة. */
const TAB_META: { id: ReportTab; label: string; short: string; icon: typeof BarChart3; catalogId: string }[] = [
  { id: 'balance-sheet', label: 'الميزانية العمومية', short: 'ميزانية', icon: Scale, catalogId: 'balance-sheet' },
  { id: 'income-statement', label: 'قائمة الدخل', short: 'دخل', icon: BarChart3, catalogId: 'income-statement' },
  { id: 'cash-flow', label: 'التدفقات النقدية', short: 'تدفقات', icon: Wallet, catalogId: 'cash-flow' },
  { id: 'trial-balance', label: 'ميزان المراجعة', short: 'مراجعة', icon: BookOpen, catalogId: 'trial-balance' },
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
  const { company: effectiveCompany } = useDefaultCompanyName();

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
    if (!effectiveCompany || !from || !to) return null;
    if (tab === 'trial-balance') {
      if (!fiscalYearName) return null;
      return buildTrialBalanceFilters({
        company: effectiveCompany,
        fiscalYear: fiscalYearName,
        fromDate: from,
        toDate: to,
      });
    }
    return buildFinancialStatementFilters({
      company: effectiveCompany,
      periodStart: from,
      periodEnd: to,
      periodicity,
    });
  }, [effectiveCompany, from, to, tab, periodicity, fiscalYearName]);

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

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="القوائم المالية الرسمية"
        description="قائمة الدخل والميزانية العمومية والتدفقات النقدية وميزان المراجعة — بيانات فعلية للمراجعة والتصدير."
        iconify="solar:document-text-bold-duotone"
        accent="info"
      />

      <Alert className="border-border/55 bg-muted/25">
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
            {' '}، <Link href="/accounting/bank-and-cash">البنوك والصناديق</Link>
            {' '}، <Link href="/reports">مركز التقارير</Link>. الاعتراف بقيمة عادلة وتغطية مخاطر الائتمان أوسع من التقارير الجاهزة.
          </p>
          <p className="text-[11px] opacity-90">
            الامتثال الكامل لهذه المعايير يظل مسؤولية السياسات المحاسبية والقيود والتقارير المخصصة على الخادم.
          </p>
        </AlertDescription>
      </Alert>

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
          {tab !== 'trial-balance' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">التواتر</Label>
              <Select value={periodicity} onValueChange={(v) => setPeriodicity(v as Periodicity)}>
                <SelectTrigger className="h-9 w-40">
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
          )}
          <div className="ms-auto">
            <ExportButton
              data={normalized.rows}
              filename={TAB_META.find((t) => t.id === tab)?.label ?? 'financial-report'}
              columns={exportCols}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ReportTab)} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-muted/40 p-1">
          {TAB_META.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="gap-1.5 data-[state=active]:bg-background"
              >
                <Icon className="h-4 w-4 opacity-80" />
                {t.short}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="space-y-4">
          {tab === 'trial-balance' && !fyLoading && effectiveCompany && !fiscalYearName && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              لا توجد سنة مالية تغطي «إلى تاريخ» المحدد. عدّل التاريخ أو أنشئ السنة المالية في النظام.
            </p>
          )}

          {normalized.notice && (
            <div className="rounded-[var(--radius-md-ui)] border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              {normalized.notice}
            </div>
          )}

          {reportQuery.isError && (
            <p className="text-sm text-destructive">
              {(reportQuery.error as Error)?.message || 'تعذر تشغيل التقرير. تحقق من الصلاحيات وتسمية التقرير.'}
            </p>
          )}

          {summaryStrip.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
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
                      s.indicator === 'Red' && 'border-red-200/80 bg-red-50/50 dark:border-red-900/40',
                      s.indicator === 'Green' && 'border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/40'
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

          {normalized.rows.length > 0 && (
            <DataTable
              data={normalized.rows}
              columns={tableColumns}
              searchable
              pageSize={25}
              stickyFirstColumn
              exportFileName={TAB_META.find((x) => x.id === tab)?.label ?? 'financial-report'}
            />
          )}
        </div>
      </Tabs>
    </div>
  );
}
