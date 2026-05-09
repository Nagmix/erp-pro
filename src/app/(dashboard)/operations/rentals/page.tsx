'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Building2,
  Layers,
  Home,
  Calendar,
  FileText,
  ArrowLeft,
  Clock,
  TrendingUp,
  DollarSign,
  BarChart3,
  CalendarDays,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useDocList } from '@/lib/client/hooks';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { cn } from '@/lib/utils';

/* ─── Types ─── */
type ContractRow = {
  name: string;
  status?: string;
  party_name?: string;
  start_date?: string;
  end_date?: string;
  contract_term?: string;
  modified?: string;
};

type ItemRow = {
  name: string;
  item_code: string;
  item_name?: string;
  item_group?: string;
  disabled?: number;
};

type BookingRow = {
  name: string;
  status?: string;
  party_name?: string;
  transaction_date?: string;
  modified?: string;
};

type SalesInvoiceRow = {
  name: string;
  grand_total?: number;
  posting_date?: string;
  docstatus?: number;
  currency?: string;
};

/* ─── Quick Links Configuration ─── */
const quickLinks = [
  {
    title: 'أنواع الوحدات',
    description: 'إدارة تصنيفات وحدات الإيجار',
    href: '/operations/rentals/unit-types',
    icon: Layers,
    accent: 'bg-chart-1/10 text-chart-1 dark:text-sky-400',
    gradient: 'from-sky-500/5 to-transparent',
    statLabel: 'الأنواع',
    statDoctype: 'Item Group',
  },
  {
    title: 'وحدات الإيجار',
    description: 'إدارة وحدات الإيجار المتاحة',
    href: '/operations/rentals/units',
    icon: Home,
    accent: 'bg-primary/10 text-primary dark:text-emerald-400',
    gradient: 'from-emerald-500/5 to-transparent',
    statLabel: 'الوحدات',
    statDoctype: 'Item',
  },
  {
    title: 'أوامر الحجز',
    description: 'إدارة حجوزات وحدات الإيجار',
    href: '/operations/rentals/bookings',
    icon: Calendar,
    accent: 'bg-chart-5/10 text-chart-5 dark:text-violet-400',
    gradient: 'from-violet-500/5 to-transparent',
    statLabel: 'الحجوزات',
    statDoctype: 'Quotation',
  },
  {
    title: 'عقود الإيجار',
    description: 'إدارة عقود الإيجار التفصيلية',
    href: '/operations/rentals/contracts',
    icon: FileText,
    accent: 'bg-chart-2/10 text-chart-2 dark:text-amber-400',
    gradient: 'from-amber-500/5 to-transparent',
    statLabel: 'العقود',
    statDoctype: 'Contract',
  },
] as const;

/* ─── Main Component ─── */
export default function RentalsDashboardPage() {
  // ── Data Fetching ──
  const contractsList = useDocList<ContractRow>('Contract', {
    fields: ['name', 'status', 'party_name', 'start_date', 'end_date', 'modified'],
    order_by: 'modified desc',
    limit: 500,
  });

  const itemsList = useDocList<ItemRow>('Item', {
    fields: ['name', 'item_code', 'item_name', 'item_group', 'disabled'],
    filters: [['disabled', '=', '0']],
    limit: 500,
  });

  const bookingsList = useDocList<BookingRow>('Quotation', {
    fields: ['name', 'status', 'party_name', 'transaction_date', 'modified'],
    order_by: 'modified desc',
    limit: 500,
  });

  // Fetch sales invoices for revenue calculation this month
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const revenueList = useDocList<SalesInvoiceRow>('Sales Invoice', {
    fields: ['name', 'grand_total', 'posting_date', 'docstatus', 'currency'],
    filters: [
      ['docstatus', '=', '1'],
      ['posting_date', '>=', firstOfMonth],
    ],
    limit: 500,
  });

  // ── Stats Calculation ──
  const stats = useMemo(() => {
    const contracts = contractsList.data ?? [];
    const items = itemsList.data ?? [];
    const bookings = bookingsList.data ?? [];
    const invoices = revenueList.data ?? [];

    const activeContracts = contracts.filter((c) =>
      ['Signed', 'Active'].includes(String(c.status ?? ''))
    ).length;

    const expiredContracts = contracts.filter((c) =>
      String(c.status ?? '') === 'Expired'
    ).length;

    const draftContracts = contracts.filter((c) =>
      String(c.status ?? '') === 'Draft'
    ).length;

    const bookedItems = items.filter(
      (i) => String(i.item_group ?? '').includes('إيجار') || String(i.item_group ?? '').toLowerCase().includes('rental')
    ).length;

    const availableItems = Math.max(0, items.length - bookedItems);

    // Bookings this month
    const bookingsThisMonth = bookings.filter((b) => {
      if (!b.transaction_date) return false;
      return b.transaction_date >= firstOfMonth;
    }).length;

    // Active/draft bookings
    const activeBookings = bookings.filter((b) =>
      ['Open', 'Draft'].includes(String(b.status ?? ''))
    ).length;

    // Revenue this month
    const revenueThisMonth = invoices.reduce(
      (sum, inv) => sum + Number(inv.grand_total || 0),
      0
    );

    return {
      totalUnits: items.length,
      available: availableItems,
      booked: bookedItems,
      activeContracts,
      expiredContracts,
      draftContracts,
      totalBookings: bookings.length,
      bookingsThisMonth,
      activeBookings,
      revenueThisMonth,
    };
  }, [contractsList.data, itemsList.data, bookingsList.data, revenueList.data, firstOfMonth]);

  // ── Recent Activity ──
  const recentContracts = useMemo(() => {
    const contracts = contractsList.data ?? [];
    return contracts.slice(0, 5);
  }, [contractsList.data]);

  const recentBookings = useMemo(() => {
    const bookings = bookingsList.data ?? [];
    return bookings.slice(0, 5);
  }, [bookingsList.data]);

  const hasError = contractsList.isError || itemsList.isError;
  const isLoading = contractsList.isLoading || itemsList.isLoading;

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="إدارة الإيجارات"
        description="لوحة تحكم شاملة لإدارة وحدات الإيجار والحجوزات والعقود"
        iconify="solar:buildings-3-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'التشغيل' }, { label: 'إدارة الإيجارات' }]}
      />

      {hasError && (
        <ListQueryAlert
          error={(contractsList.error ?? itemsList.error) as Error}
          onRetry={() => {
            void contractsList.refetch();
            void itemsList.refetch();
          }}
        />
      )}

      {/* ════════════════════════════════════════════════════════
          KPI Cards
          ════════════════════════════════════════════════════════ */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي الوحدات"
          value={stats.totalUnits}
          icon={Building2}
          accent="info"
          description="جميع الأصناف المسجلة في النظام"
        />
        <KpiCard
          title="عقود نشطة"
          value={stats.activeContracts}
          icon={FileText}
          accent="success"
          description="عقود موقّعة أو سارية"
        />
        <KpiCard
          title="حجوزات هذا الشهر"
          value={stats.bookingsThisMonth}
          icon={Calendar}
          accent="warning"
          description={`منذ ${formatDate(firstOfMonth)}`}
        />
        <KpiCard
          title="إيرادات الشهر"
          value={formatCurrency(stats.revenueThisMonth)}
          icon={DollarSign}
          accent="primary"
          description="إجمالي فواتير المبيعات المرحّلة"
        />
      </KpiStrip>

      {/* ════════════════════════════════════════════════════════
          Secondary Stats Row
          ════════════════════════════════════════════════════════ */}
      <KpiStrip cols={4}>
        <KpiCard
          title="الوحدات المتاحة"
          value={stats.available}
          icon={Home}
          accent="success"
          description="وحدات غير محجوزة متاحة للإيجار"
          compact
        />
        <KpiCard
          title="الوحدات المحجوزة"
          value={stats.booked}
          icon={Layers}
          accent="warning"
          description="وحدات مشغولة حالياً"
          compact
        />
        <KpiCard
          title="عقود مسودة"
          value={stats.draftContracts}
          icon={Clock}
          accent="info"
          description="عقود بانتظار التوقيع"
          compact
        />
        <KpiCard
          title="عقود منتهية"
          value={stats.expiredContracts}
          icon={AlertTriangle}
          accent="destructive"
          description="عقود بحاجة للتجديد"
          compact
        />
      </KpiStrip>

      {/* ════════════════════════════════════════════════════════
          Quick Links Grid
          ════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">الوصول السريع</h2>
          <span className="text-[10px] text-muted-foreground">— إدارة وحدات وحجوزات وعقود الإيجار</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => {
            const IconComp = link.icon;
            return (
              <Link key={link.href} href={link.href} className="group">
                <Card className="h-full border-border/40 bg-card/80 backdrop-blur-sm hover:border-border hover:shadow-md transition-all duration-200 overflow-hidden">
                  <div className={cn('bg-gradient-to-l', link.gradient, 'via-transparent to-transparent')}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', link.accent)}>
                          <IconComp className="h-5 w-5" />
                        </div>
                        <ArrowLeft className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {link.title}
                        </h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                          {link.description}
                        </p>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          Recent Activity & Revenue Overview
          ════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Contracts */}
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">آخر العقود</h3>
              </div>
              <Link href="/operations/rentals/contracts">
                <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-muted/50 transition-colors gap-1">
                  عرض الكل
                  <ArrowLeft className="h-2.5 w-2.5" />
                </Badge>
              </Link>
            </div>
            {contractsList.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ms-2 text-xs text-muted-foreground">جاري التحميل...</span>
              </div>
            ) : recentContracts.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                لا توجد عقود مسجلة بعد
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentContracts.map((contract) => (
                  <div
                    key={contract.name}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                        String(contract.status) === 'Active' || String(contract.status) === 'Signed'
                          ? 'bg-success/10 text-success'
                          : String(contract.status) === 'Expired'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {String(contract.status) === 'Active' || String(contract.status) === 'Signed' ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : String(contract.status) === 'Expired' ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{contract.party_name || contract.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {contract.start_date ? formatDate(contract.start_date) : '—'}
                          {contract.end_date ? ` → ${formatDate(contract.end_date)}` : ''}
                        </p>
                      </div>
                    </div>
                    <ContractStatusBadge status={contract.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-semibold text-foreground">آخر الحجوزات</h3>
              </div>
              <Link href="/operations/rentals/bookings">
                <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-muted/50 transition-colors gap-1">
                  عرض الكل
                  <ArrowLeft className="h-2.5 w-2.5" />
                </Badge>
              </Link>
            </div>
            {bookingsList.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ms-2 text-xs text-muted-foreground">جاري التحميل...</span>
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                لا توجد حجوزات مسجلة بعد
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.name}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                        String(booking.status) === 'Open'
                          ? 'bg-chart-5/10 text-chart-5'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{booking.party_name || booking.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {booking.transaction_date ? formatDate(booking.transaction_date) : '—'}
                        </p>
                      </div>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ════════════════════════════════════════════════════════
          Revenue Overview & Calendar Link
          ════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Overview Card */}
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">نظرة عامة على الإيرادات</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">إيرادات الشهر الحالي</span>
                </div>
                <span className="text-sm font-bold text-primary tabular-nums" dir="ltr">
                  {formatCurrency(stats.revenueThisMonth)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-success" />
                  <span className="text-xs font-medium">العقود النشطة</span>
                </div>
                <span className="text-sm font-bold text-success tabular-nums">
                  {stats.activeContracts}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-warning" />
                  <span className="text-xs font-medium">حجوزات الشهر</span>
                </div>
                <span className="text-sm font-bold text-warning tabular-nums">
                  {stats.bookingsThisMonth}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-2">
                * الإيرادات محسوبة من فواتير المبيعات المرحّلة خلال الشهر الحالي.
                للتفاصيل الكاملة راجع تقارير المحاسبة.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">إجراءات سريعة</h3>
            </div>
            <div className="space-y-2">
              <Link
                href="/operations/rentals/bookings"
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-chart-5/10 text-chart-5 flex items-center justify-center">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">إنشاء حجز جديد</p>
                    <p className="text-[10px] text-muted-foreground">حجز وحدة إيجار متاحة</p>
                  </div>
                </div>
                <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="/operations/rentals/contracts"
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-chart-2/10 text-chart-2 flex items-center justify-center">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">إنشاء عقد إيجار</p>
                    <p className="text-[10px] text-muted-foreground">عقد جديد لوحدة إيجار</p>
                  </div>
                </div>
                <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="/operations/rentals/units"
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Home className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">إضافة وحدة إيجار</p>
                    <p className="text-[10px] text-muted-foreground">تسجيل وحدة جديدة في النظام</p>
                  </div>
                </div>
                <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="/operations/rentals/unit-types"
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-chart-1/10 text-chart-1 flex items-center justify-center">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">إدارة أنواع الوحدات</p>
                    <p className="text-[10px] text-muted-foreground">إضافة أو تعديل تصنيفات الوحدات</p>
                  </div>
                </div>
                <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── Contract Status Badge ─── */
function ContractStatusBadge({ status }: { status?: string }) {
  const s = String(status ?? '');
  let color = 'bg-muted text-muted-foreground';
  let label = s || 'غير محدد';

  if (['Active', 'Signed'].includes(s)) {
    color = 'bg-success/10 text-success';
    label = s === 'Active' ? 'نشط' : 'موقّع';
  } else if (s === 'Expired') {
    color = 'bg-destructive/10 text-destructive';
    label = 'منتهي';
  } else if (s === 'Draft') {
    color = 'bg-muted text-muted-foreground';
    label = 'مسودة';
  } else if (s === 'Cancelled') {
    color = 'bg-destructive/10 text-destructive';
    label = 'ملغي';
  }

  return (
    <Badge variant="outline" className={cn('text-[9px] font-medium px-1.5 py-0.5 border-0', color)}>
      {label}
    </Badge>
  );
}

/* ─── Booking Status Badge ─── */
function BookingStatusBadge({ status }: { status?: string }) {
  const s = String(status ?? '');
  let color = 'bg-muted text-muted-foreground';
  let label = s || 'غير محدد';

  if (s === 'Open') {
    color = 'bg-chart-5/10 text-chart-5';
    label = 'مفتوح';
  } else if (s === 'Draft') {
    color = 'bg-muted text-muted-foreground';
    label = 'مسودة';
  } else if (s === 'Ordered') {
    color = 'bg-success/10 text-success';
    label = 'تم الطلب';
  } else if (['Lost', 'Cancelled'].includes(s)) {
    color = 'bg-destructive/10 text-destructive';
    label = s === 'Lost' ? 'مفقود' : 'ملغي';
  }

  return (
    <Badge variant="outline" className={cn('text-[9px] font-medium px-1.5 py-0.5 border-0', color)}>
      {label}
    </Badge>
  );
}
