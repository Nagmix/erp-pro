'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/erp/data-table';
import { ExportButton } from '@/components/erp/export-button';
import {
  BarChart3,
  TrendingUp,
  Wallet,
  BookOpen,
  ShoppingCart,
  Package,
  Users,
  Building2,
  ArrowRightLeft,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  PieChart,
  Filter,
  Receipt,
  ScrollText,
  CreditCard,
  LayoutGrid,
  Hash,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRunReport } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { REPORTS_CATALOG, type ReportDef as CatalogReportDef } from '@/lib/reports/catalog';
import { PageHeader } from '@/components/erp/page-header';
import { EmptyState } from '@/components/erp/empty-state';
import { normalizeFrappeReportPayload } from '@/lib/reports/normalize-frappe-report';
import { normalizedColumnsToDataTable } from '@/lib/reports/frappe-report-columns';
import { buildHubReportFilters, PAYMENT_LEDGER_CATALOG_IDS } from '@/lib/reports/report-hub-filters';
import { cn } from '@/lib/utils';

/** القوائم المالية الرسمية — العرض الكامل من `/accounting/financial-statements` */
const FINANCIAL_DEEP_LINK_IDS = new Set([
  'balance-sheet',
  'income-statement',
  'cash-flow',
  'trial-balance',
]);

const CATEGORY_ORDER = ['financial', 'sales', 'purchase', 'inventory', 'hr', 'crm'] as const;

const CATEGORY_META: Record<
  (typeof CATEGORY_ORDER)[number],
  { name: string; icon: LucideIcon; color: string }
> = {
  financial: { name: 'التقارير المالية', icon: BarChart3, color: 'bg-chart-1/10 text-chart-1' },
  sales: { name: 'تقارير المبيعات', icon: ShoppingCart, color: 'bg-primary/10 text-primary' },
  purchase: { name: 'تقارير المشتريات', icon: Package, color: 'bg-chart-2/10 text-chart-2' },
  inventory: { name: 'تقارير المخزون والتصنيع', icon: Package, color: 'bg-chart-4/10 text-chart-4' },
  hr: { name: 'تقارير الموارد البشرية', icon: Users, color: 'bg-chart-5/10 text-chart-5' },
  crm: { name: 'تقارير العملاء وCRM', icon: Building2, color: 'bg-chart-5/10 text-chart-5' },
};

function iconForCatalogId(id: string): LucideIcon {
  const map: Record<string, LucideIcon> = {
    'balance-sheet': BarChart3,
    'income-statement': TrendingUp,
    'cash-flow': Wallet,
    'trial-balance': BookOpen,
    'general-ledger': ScrollText,
    'accounts-receivable': Receipt,
    'accounts-payable': Receipt,
    'sales-register': FileText,
    'item-wise-sales-register': LayoutGrid,
    'sales-by-customer': Building2,
    'sales-by-product': Package,
    'sales-by-rep': Users,
    'sales-profit': TrendingUp,
    'sales-invoice-status': FileText,
    'payment-splits': CreditCard,
    'overdue-invoices': AlertTriangle,
    'pos-transactions': ShoppingCart,
    'purchases-by-supplier': Building2,
    'purchases-by-product': LayoutGrid,
    'purchase-payments-period': CreditCard,
    'purchase-followup': Clock,
    'purchase-register': FileText,
    'stock-balance': Package,
    'stock-ledger': ArrowRightLeft,
    'low-stock': AlertTriangle,
    'stock-reconciliation': Hash,
    'work-order-summary': Package,
    'hr-attendance': Clock,
    'hr-attendance-summary': Clock,
    'hr-salary-register': DollarSign,
    'hr-leave-balance': FileText,
    'hr-employee-info': Users,
    'hr-employee-analytics': LayoutGrid,
    'crm-customer-statement': FileText,
    'crm-overdue-customers': AlertTriangle,
    'crm-loyalty': PieChart,
    'crm-credits': CreditCard,
    'crm-subscriptions-installments': Receipt,
    'crm-rental-installments': Receipt,
  };
  return map[id] ?? FileText;
}

function defaultYearDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(now) };
}

export default function ReportsPage() {
  const router = useRouter();
  const { company: effectiveCompany } = useDefaultCompanyName();
  const [selectedReport, setSelectedReport] = useState<CatalogReportDef | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const open = new URLSearchParams(window.location.search).get('openReport');
    if (!open) return;
    const def = REPORTS_CATALOG.find((r) => r.id === open);
    if (def) queueMicrotask(() => setSelectedReport(def));
    window.history.replaceState({}, '', '/reports');
  }, []);

  const hubCategories = useMemo(() => {
    const grouped: Record<string, CatalogReportDef[]> = {};
    for (const r of REPORTS_CATALOG) {
      if (!grouped[r.category]) grouped[r.category] = [];
      grouped[r.category]!.push(r);
    }
    return CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((c) => ({
      id: c,
      ...CATEGORY_META[c],
      reports: grouped[c]!,
    }));
  }, []);

  useEffect(() => {
    if (!selectedReport) return;
    if (!dateFrom && !dateTo) {
      const { from, to } = defaultYearDateRange();
      queueMicrotask(() => {
        setDateFrom(from);
        setDateTo(to);
      });
    }
  }, [selectedReport?.id, dateFrom, dateTo]);

  const isFinancialDeepLink =
    selectedReport?.id && FINANCIAL_DEEP_LINK_IDS.has(selectedReport.id);

  /* eslint-disable react-hooks/preserve-manual-memoization -- مرشّحات التقرير مربوطة بنافذة التاريخ والشركة */
  const hubFilters = useMemo(() => {
    if (!selectedReport?.id || isFinancialDeepLink) return null;
    return buildHubReportFilters(selectedReport.id, {
      company: effectiveCompany,
      dateFrom,
      dateTo,
    });
  }, [selectedReport?.id, effectiveCompany, dateFrom, dateTo, isFinancialDeepLink]);
  /* eslint-enable react-hooks/preserve-manual-memoization */

  const filtersReady = hubFilters !== null;
  const reportQuery = useRunReport(
    selectedReport?.id ?? '',
    hubFilters ?? {},
    Boolean(selectedReport?.id) && !isFinancialDeepLink && filtersReady
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

  const reportRows = normalized.rows;
  const singleDateMode =
    selectedReport &&
    !PAYMENT_LEDGER_CATALOG_IDS.has(selectedReport.id) &&
    [
      'accounts-receivable',
      'accounts-payable',
      'sales-invoice-status',
      'overdue-invoices',
      'crm-customer-statement',
      'crm-overdue-customers',
    ].includes(selectedReport.id);

  const hideDateFilters =
    selectedReport &&
    (selectedReport.id === 'hr-employee-info' ||
      selectedReport.id === 'hr-employee-analytics' ||
      selectedReport.id === 'low-stock' ||
      selectedReport.id === 'crm-loyalty');

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="التقارير"
        description="مركز التقارير: كل تقرير يُستخرج من النظام مع فلاتر مطابقة للكتالوج"
        iconify="solar:chart-2-bold-duotone"
        accent="info"
        actions={
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
            <Link href="/reports/schedules">
              <Clock className="h-3.5 w-3.5" />
              جدولة التقارير
            </Link>
          </Button>
        }
      />

      {hubCategories.map((category) => {
        const CatIcon = category.icon;
        return (
          <div key={category.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-lg ${category.color} flex items-center justify-center shrink-0`}>
                <CatIcon className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold">{category.name}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {category.reports.map((report) => {
                const RepIcon = iconForCatalogId(report.id);
                return (
                  <Card
                    key={report.id}
                    className="group border-border/40 hover:border-border/60 transition-all duration-200 cursor-pointer"
                    onClick={() => setSelectedReport(report)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg ${category.color} flex items-center justify-center shrink-0`}>
                          <RepIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug">{report.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{report.reportName}</p>
                        </div>
                        <Badge variant="outline" className="text-xs border-0 bg-secondary shrink-0">
                          <PieChart className="h-3 w-3 ms-1" />
                          عرض
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent dir="rtl" className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const RIcon = iconForCatalogId(selectedReport.id);
                    return <RIcon className="h-5 w-5" />;
                  })()}
                  {selectedReport.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex flex-wrap items-end gap-3 p-4 rounded-[var(--radius-md-ui)] border border-border/40 bg-card hover:border-border/60">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    تصفية
                  </div>
                  {!hideDateFilters && !singleDateMode && (
                    <div className="space-y-1">
                      <Label className="text-xs">من تاريخ</Label>
                      <Input
                        type="date"
                        dir="ltr"
                        className="h-8 w-36 text-xs"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>
                  )}
                  {!hideDateFilters && (
                    <div className="space-y-1">
                      <Label className="text-xs">
                        {singleDateMode
                          ? 'كما في تاريخ'
                          : PAYMENT_LEDGER_CATALOG_IDS.has(selectedReport.id)
                            ? 'إلى الفترة'
                            : 'إلى تاريخ'}
                      </Label>
                      <Input
                        type="date"
                        dir="ltr"
                        className="h-8 w-36 text-xs"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                  )}
                  {selectedReport.id === 'stock-reconciliation' && (
                    <p className="text-xs text-muted-foreground max-w-xs">
                      مطابقة المخزون: يُفضَّل ضبط من/إلى؛ يُستخدم تاريخ النهاية كـ as_on_date عند الحاجة.
                    </p>
                  )}
                  <div className="ms-auto flex gap-2">
                    <ExportButton data={reportRows} filename={selectedReport.title} columns={exportCols} />
                  </div>
                </div>

                {!effectiveCompany && (
                  <p className="text-xs text-chart-2">اختر الشركة لتشغيل التقرير.</p>
                )}

                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">عدد السجلات</p>
                    <p className="text-lg font-bold">{isFinancialDeepLink ? '—' : reportRows.length}</p>
                  </div>
                  <div className="text-start">
                    <p className="text-xs text-muted-foreground">تاريخ التقرير</p>
                    <p className="text-sm font-medium">
                      {new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                {isFinancialDeepLink && (
                  <EmptyState
                    title="هذا التقرير يُعرَض بالكامل في القوائم المالية"
                    description="الميزانية العمومية، قائمة الدخل، التدفقات النقدية، وميزان المراجعة تتطلب فلاتر السنة المالية والدورية من الصفحة المخصصة."
                    actionLabel="فتح القوائم المالية"
                    onAction={() => {
                      setSelectedReport(null);
                      router.push('/accounting/financial-statements');
                    }}
                  />
                )}

                {!isFinancialDeepLink && normalized.notice && (
                  <div className="rounded-[var(--radius-md-ui)] border border-chart-2/30 bg-chart-2/5 px-3 py-2 text-sm text-chart-2">
                    {normalized.notice}
                  </div>
                )}

                {!isFinancialDeepLink && reportQuery.isError && (
                  <p className="text-sm text-destructive">
                    {(reportQuery.error as Error)?.message || 'تعذر تشغيل التقرير. تحقق من الصلاحيات واسم التقرير في النظام.'}
                  </p>
                )}

                {!isFinancialDeepLink && summaryStrip.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
                    {summaryStrip.map((s, i) => (
                      <div
                        key={i}
                        className={cn(
                          'rounded-[var(--radius-md-ui)] border border-border/50 bg-card px-3 py-2.5',
                          s.indicator === 'Red' && 'border-destructive/30 bg-destructive/5',
                          s.indicator === 'Green' && 'border-primary/30 bg-primary/5'
                        )}
                      >
                        <p className="text-xs font-medium text-muted-foreground">{String(s.label ?? '')}</p>
                        <p className="text-lg font-semibold tabular-nums tracking-tight">{String(s.value ?? '—')}</p>
                      </div>
                    ))}
                  </div>
                )}

                {!isFinancialDeepLink && reportQuery.isLoading && (
                  <p className="text-xs text-muted-foreground">جاري تحميل التقرير من النظام…</p>
                )}

                {!isFinancialDeepLink && !reportQuery.isLoading && !filtersReady && effectiveCompany && (
                  <EmptyState
                    title="أكمل معايير التقرير"
                    description={
                      selectedReport.id === 'hr-employee-info' ||
                      selectedReport.id === 'hr-employee-analytics' ||
                      selectedReport.id === 'low-stock'
                        ? 'تأكد من اختيار الشركة.'
                        : 'حدّد التواريخ المطلوبة لهذا التقرير.'
                    }
                  />
                )}

                {!isFinancialDeepLink &&
                  !reportQuery.isLoading &&
                  filtersReady &&
                  !reportQuery.isError &&
                  reportRows.length === 0 && (
                    <EmptyState
                      title="لا توجد بيانات ضمن المعايير"
                      description="جرّب توسيع الفترة أو التحقق من وجود حركات في النظام للشركة المحددة."
                    />
                  )}

                {!isFinancialDeepLink && reportRows.length > 0 && (
                  <DataTable
                    data={reportRows}
                    columns={tableColumns}
                    searchable
                    pageSize={15}
                    stickyFirstColumn
                    exportFileName={selectedReport.title}
                  />
                )}

                {!isFinancialDeepLink && ['general-ledger', 'accounts-receivable', 'accounts-payable', 'sales-profit'].includes(selectedReport.id) && (
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={() => router.push('/accounting/advanced-reports')}>
                      فتح تقارير محاسبية متقدمة
                    </Button>
                  </div>
                )}
                {!isFinancialDeepLink && selectedReport.category === 'sales' && (
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={() => router.push('/sales/reports')}>
                      فتح تقارير المبيعات
                    </Button>
                  </div>
                )}
                {!isFinancialDeepLink && selectedReport.category === 'purchase' && (
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={() => router.push('/purchases/reports')}>
                      فتح تقارير المشتريات
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
