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
import {
  buildEmployeeAnalyticsFilters,
  buildEmployeeInformationFilters,
  buildEmployeeLeaveBalanceFilters,
  buildMonthlyAttendanceSheetFilters,
  buildSalaryRegisterFilters,
  buildShiftAttendanceFilters,
  type EmployeeAnalyticsParameter,
} from '@/lib/reports/sales-purchase-hr-filters';
import { CalendarDays, ClipboardList, Clock, LayoutGrid, UserCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type HrReportTab =
  | 'hr-attendance'
  | 'hr-attendance-summary'
  | 'hr-salary-register'
  | 'hr-leave-balance'
  | 'hr-employee-info'
  | 'hr-employee-analytics';

const TAB_META: {
  id: HrReportTab;
  label: string;
  short: string;
  catalogId: string;
  icon: typeof Clock;
}[] = [
  {
    id: 'hr-attendance',
    label: 'كشف الحضور الشهري',
    short: 'حضور',
    catalogId: 'hr-attendance',
    icon: CalendarDays,
  },
  {
    id: 'hr-attendance-summary',
    label: 'حضور الورديات',
    short: 'ورديات',
    catalogId: 'hr-attendance-summary',
    icon: Clock,
  },
  {
    id: 'hr-salary-register',
    label: 'سجل الرواتب',
    short: 'رواتب',
    catalogId: 'hr-salary-register',
    icon: ClipboardList,
  },
  {
    id: 'hr-leave-balance',
    label: 'أرصدة الإجازات',
    short: 'إجازات',
    catalogId: 'hr-leave-balance',
    icon: CalendarDays,
  },
  {
    id: 'hr-employee-info',
    label: 'بيانات الموظفين',
    short: 'موظفين',
    catalogId: 'hr-employee-info',
    icon: UserCircle,
  },
  {
    id: 'hr-employee-analytics',
    label: 'تحليل الموظفين',
    short: 'تحليل',
    catalogId: 'hr-employee-analytics',
    icon: LayoutGrid,
  },
];

function defaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(now) };
}

function calendarDaysInclusive(from: string, to: string): number {
  const a = new Date(from + 'T12:00:00').getTime();
  const b = new Date(to + 'T12:00:00').getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.floor(Math.abs(b - a) / 86400000) + 1;
}

export default function HrReportsPage() {
  const { from: d0, to: d1 } = defaultDateRange();
  const [from, setFrom] = useState(d0);
  const [to, setTo] = useState(d1);
  const [tab, setTab] = useState<HrReportTab>('hr-attendance');
  const { company: effectiveCompany } = useDefaultCompanyName();
  const [attendanceSummarized, setAttendanceSummarized] = useState(false);
  const [analyticsParameter, setAnalyticsParameter] = useState<EmployeeAnalyticsParameter>('Department');

  const reportId = useMemo(
    () => TAB_META.find((t) => t.id === tab)?.catalogId ?? 'hr-attendance',
    [tab]
  );

  const attendanceRangeDays = useMemo(() => calendarDaysInclusive(from, to), [from, to]);
  const attendanceRangeInvalid = tab === 'hr-attendance' && attendanceRangeDays > 90;

  const filters = useMemo(() => {
    if (!effectiveCompany) return null;
    if (tab === 'hr-employee-info') {
      return buildEmployeeInformationFilters({ company: effectiveCompany });
    }
    if (tab === 'hr-employee-analytics') {
      return buildEmployeeAnalyticsFilters({
        company: effectiveCompany,
        parameter: analyticsParameter,
      });
    }
    if (!from || !to) return null;
    if (tab === 'hr-attendance') {
      if (attendanceRangeDays > 90) return null;
      return buildMonthlyAttendanceSheetFilters({
        company: effectiveCompany,
        startDate: from,
        endDate: to,
        summarizedView: attendanceSummarized,
      });
    }
    if (tab === 'hr-attendance-summary') {
      return buildShiftAttendanceFilters({
        company: effectiveCompany,
        fromDate: from,
        toDate: to,
      });
    }
    if (tab === 'hr-salary-register') {
      return buildSalaryRegisterFilters({
        company: effectiveCompany,
        fromDate: from,
        toDate: to,
      });
    }
    if (tab === 'hr-leave-balance') {
      return buildEmployeeLeaveBalanceFilters({
        company: effectiveCompany,
        fromDate: from,
        toDate: to,
      });
    }
    return null;
  }, [effectiveCompany, from, to, tab, attendanceRangeDays, attendanceSummarized, analyticsParameter]);

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

  const hideDateFilters = tab === 'hr-employee-info' || tab === 'hr-employee-analytics';

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="تقارير الموارد البشرية"
        description="حضور (تفصيلي أو ملخص HRMS)، ورديات، رواتب، إجازات، تحليل توزيع الموظفين، وبيانات الموظفين من HRMS عند تفعيل الوحدة."
        iconify="solar:users-group-rounded-bold-duotone"
        accent="info"
      />

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">معايير التقرير</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          {tab === 'hr-attendance' && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md-ui)] border border-border/50 bg-muted/30 px-3 py-2">
              <Checkbox
                id="att-sum"
                checked={attendanceSummarized}
                onCheckedChange={(v) => setAttendanceSummarized(v === true)}
              />
              <Label htmlFor="att-sum" className="text-xs font-normal cursor-pointer leading-snug">
                عرض ملخص الحضور (Summarized View) — إجمالي حاضر/غائب/إجازة حسب HRMS
              </Label>
            </div>
          )}
          {tab === 'hr-employee-analytics' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">معيار التوزيع</Label>
              <Select
                value={analyticsParameter}
                onValueChange={(v) => setAnalyticsParameter(v as EmployeeAnalyticsParameter)}
              >
                <SelectTrigger className="h-9 w-[200px] text-start">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Department">القسم</SelectItem>
                  <SelectItem value="Branch">الفرع</SelectItem>
                  <SelectItem value="Designation">المسمى الوظيفي</SelectItem>
                  <SelectItem value="Grade">الدرجة</SelectItem>
                  <SelectItem value="Employment Type">نوع التوظيف</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {!hideDateFilters && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {tab === 'hr-attendance' ? 'من تاريخ (النطاق)' : 'من تاريخ'}
                </Label>
                <Input type="date" dir="ltr" className="h-9 w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {tab === 'hr-attendance' ? 'إلى تاريخ (≤ 90 يوماً)' : 'إلى تاريخ'}
                </Label>
                <Input type="date" dir="ltr" className="h-9 w-40" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}
          <div className="ms-auto">
            <ExportButton
              data={normalized.rows}
              filename={TAB_META.find((t) => t.id === tab)?.label ?? 'hr-report'}
              columns={exportCols}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as HrReportTab)} className="space-y-4">
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
          {tab === 'hr-attendance' && attendanceRangeInvalid && (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              تقرير «كشف الحضور الشهري» في النظام يفرض نطاقاً أقصاه 90 يوماً. اضبط التواريخ ({attendanceRangeDays}{' '}
              يوماً حالياً).
            </p>
          )}

          {tab === 'hr-employee-info' && (
            <p className="text-xs text-muted-foreground">
              تقرير Report Builder — يعرض أعمدة الموظفين حسب تعريف التقرير في الخادم.
            </p>
          )}

          {normalized.notice && (
            <div className="rounded-[var(--radius-md-ui)] border border-chart-2/20/80 bg-chart-2/5/80 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-chart-2/10 dark:text-amber-100">
              {normalized.notice}
            </div>
          )}

          {reportQuery.isError && (
            <p className="text-sm text-destructive">
              {(reportQuery.error as Error)?.message ||
                'تعذر تشغيل التقرير. تأكد من تثبيت تطبيق HRMS والصلاحيات على التقرير في النظام.'}
            </p>
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
            <p className="text-xs text-muted-foreground">جاري تحميل التقرير من النظام…</p>
          )}

          {!reportQuery.isLoading && !reportQuery.isError && filtersReady && normalized.rows.length === 0 && (
            <EmptyState
              title="لا توجد صفوف للعرض"
              description="جرّب تعديل الفترة أو التحقق من وجود بيانات حضور/رواتب للشركة المحددة."
            />
          )}

          {normalized.rows.length > 0 && (
            <DataTable
              data={normalized.rows}
              columns={tableColumns}
              searchable
              pageSize={25}
              stickyFirstColumn
              exportFileName={TAB_META.find((x) => x.id === tab)?.label ?? 'hr-report'}
            />
          )}
        </div>
      </Tabs>
    </div>
  );
}
