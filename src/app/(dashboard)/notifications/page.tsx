'use client';

import { useState, useCallback, useMemo } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useDocList, useUpdateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { cn } from '@/lib/utils';
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  Filter,
  Search,
  FileText,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  Truck,
  Settings,
  AlertCircle,
  Clock,
  ExternalLink,
  RotateCcw,
  X,
  Loader2,
} from 'lucide-react';

/* ──────────────────────────────────────────────
   ERPNext Notification Log Type
   ────────────────────────────────────────────── */

interface NotificationLog {
  name: string;
  subject: string;
  document_type: string;
  document_name: string;
  for_user: string;
  from_user: string;
  read: number | string;
  creation: string;
  modified: string;
  email: number | string;
  type: string;
}

/* ──────────────────────────────────────────────
   أنواع البيانات المحلية
   ────────────────────────────────────────────── */

type NotificationCategory = string;

type CategoryPreference = {
  enabled: boolean;
  email: boolean;
  inApp: boolean;
};

type GroupByOption = 'date' | 'doctype' | 'none';

/* ──────────────────────────────────────────────
   إعدادات الفئات - خريطة أنواع المستندات
   ────────────────────────────────────────────── */

const DOCTYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; ring: string }> = {
  'Sales Invoice': { label: 'فواتير مبيعات', icon: FileText, color: 'text-destructive dark:text-red-400', bg: 'bg-destructive/10', ring: 'ring-red-500/20' },
  'Purchase Invoice': { label: 'فواتير مشتريات', icon: FileText, color: 'text-chart-4', bg: 'bg-chart-4/10', ring: 'ring-orange-500/20' },
  'Payment Entry': { label: 'مدفوعات', icon: DollarSign, color: 'text-primary', bg: 'bg-chart-3/10', ring: 'ring-emerald-500/20' },
  'Item': { label: 'مخزون', icon: Package, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-chart-1/10', ring: 'ring-sky-500/20' },
  'Stock Entry': { label: 'حركة مخزون', icon: Package, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-chart-1/10', ring: 'ring-sky-500/20' },
  'Leave Application': { label: 'موارد بشرية', icon: Users, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-chart-5/10', ring: 'ring-purple-500/20' },
  'Employee': { label: 'موارد بشرية', icon: Users, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-chart-5/10', ring: 'ring-purple-500/20' },
  'Sales Order': { label: 'مبيعات', icon: ShoppingCart, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-chart-2/10', ring: 'ring-amber-500/20' },
  'Quotation': { label: 'مبيعات', icon: ShoppingCart, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-chart-2/10', ring: 'ring-amber-500/20' },
  'Purchase Order': { label: 'مشتريات', icon: Truck, color: 'text-chart-4', bg: 'bg-chart-4/10', ring: 'ring-orange-500/20' },
};

const DEFAULT_DOCTYPE_CONFIG = { label: 'نظام', icon: Settings, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10', ring: 'ring-gray-500/20' };

function getDoctypeConfig(doctype: string) {
  return DOCTYPE_CONFIG[doctype] || DEFAULT_DOCTYPE_CONFIG;
}

/* ──────────────────────────────────────────────
   دالة الوقت المنقضي
   ────────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  const weeks = Math.floor(days / 7);

  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} ${minutes === 1 ? 'دقيقة' : minutes < 11 ? 'دقائق' : 'دقيقة'}`;
  if (hours < 24) return `منذ ${hours} ${hours === 1 ? 'ساعة' : hours < 11 ? 'ساعات' : 'ساعة'}`;
  if (days < 7) return `منذ ${days} ${days === 1 ? 'يوم' : days < 11 ? 'أيام' : 'يوم'}`;
  return `منذ ${weeks} ${weeks === 1 ? 'أسبوع' : 'أسابيع'}`;
}

/* ──────────────────────────────────────────────
   تجميع حسب التاريخ
   ────────────────────────────────────────────── */

type DateGroup = 'اليوم' | 'أمس' | 'هذا الأسبوع' | 'أقدم';

function getDateGroup(dateStr: string): DateGroup {
  const now = new Date();
  const date = new Date(dateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const weekStart = new Date(today.getTime() - today.getDay() * 86_400_000);

  if (date >= today) return 'اليوم';
  if (date >= yesterday) return 'أمس';
  if (date >= weekStart) return 'هذا الأسبوع';
  return 'أقدم';
}

/* ──────────────────────────────────────────────
   مكون بطاقة الإشعار
   ────────────────────────────────────────────── */

function NotificationCard({
  notification,
  onMarkAsRead,
  onDelete,
}: {
  notification: NotificationLog;
  onMarkAsRead: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  const isRead = Number(notification.read) === 1;
  const catConfig = getDoctypeConfig(notification.document_type);
  const CatIcon = catConfig.icon;

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 rounded-lg border p-3 sm:p-4 transition-all duration-150 cursor-pointer',
        isRead
          ? 'border-border/30 bg-card hover:bg-muted/30'
          : 'border-border/50 bg-info/[0.03] hover:bg-info/[0.06] dark:bg-info/[0.04] dark:hover:bg-info/[0.07]'
      )}
      onClick={() => {
        if (!isRead) onMarkAsRead(notification.name);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (!isRead) onMarkAsRead(notification.name);
        }
      }}
      aria-label={notification.subject}
    >
      {/* مؤشر غير مقروء */}
      {!isRead && (
        <div className="absolute top-3 end-3 sm:top-4 sm:end-4 h-2.5 w-2.5 rounded-full bg-info ring-2 ring-info/25" />
      )}

      {/* أيقونة الفئة */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1',
          catConfig.bg,
          catConfig.ring
        )}
      >
        <CatIcon className={cn('h-5 w-5', catConfig.color)} />
      </div>

      {/* المحتوى */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cn(
              'text-sm leading-snug line-clamp-1',
              isRead ? 'font-medium text-foreground' : 'font-semibold text-foreground'
            )}
          >
            {notification.subject || 'إشعار'}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            {/* شارة النوع */}
            {notification.type && (
              <span className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                'bg-gray-500/15 ring-1 ring-inset ring-gray-500/25 text-gray-600 dark:text-gray-400'
              )}>
                {notification.type}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          {/* وقت الإشعار */}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {notification.creation ? timeAgo(notification.creation) : ''}
          </span>

          {/* الفئة */}
          <span className={cn('text-xs font-medium', catConfig.color)}>
            {catConfig.label}
          </span>

          {/* رابط المستند */}
          {notification.document_type && notification.document_name && (
            <a
              href={`/doc/${notification.document_type}/${notification.document_name}`}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-2.5 w-2.5" />
              {notification.document_name}
            </a>
          )}
        </div>

        {/* المستخدم */}
        {notification.from_user && (
          <span className="text-xs text-muted-foreground">
            من: {notification.from_user}
          </span>
        )}
      </div>

      {/* أزرار الإجراءات */}
      <div className="flex flex-col items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isRead && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.name);
            }}
            aria-label="تحديد كمقروء"
          >
            <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.name);
          }}
          aria-label="حذف الإشعار"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   مكون الحالة الفارغة
   ────────────────────────────────────────────── */

function EmptyState({
  hasActiveFilters,
  onClearFilters,
}: {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-12 text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-muted mb-6">
          <BellOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">لا توجد إشعارات</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-md mx-auto">
          {hasActiveFilters
            ? 'لم يتم العثور على إشعارات تطابق معايير التصفية. جرب تعديل الفلاتر أو مسحها.'
            : 'لا توجد إشعارات حالياً. ستظهر الإشعارات هنا عند حدوث أحداث في النظام.'}
        </p>
        {hasActiveFilters && (
          <Button variant="outline" onClick={onClearFilters} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            مسح التصفية
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────
   مكون شاشة التحميل
   ────────────────────────────────────────────── */

function LoadingSkeleton() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="h-24 rounded-xl bg-muted animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="h-16 rounded-xl bg-muted animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   المكون الرئيسي
   ────────────────────────────────────────────── */

export default function NotificationsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [doctypeFilter, setDoctypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [groupBy, setGroupBy] = useState<GroupByOption>('date');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, CategoryPreference>>({});

  // ── جلب الإشعارات من ERPNext ──
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useDocList<NotificationLog>('Notification Log', {
    fields: ['name', 'subject', 'document_type', 'document_name', 'for_user', 'from_user', 'read', 'creation', 'modified', 'email', 'type'],
    order_by: 'creation desc',
    limit: 200,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  // ── تحديث وحذف الإشعارات ──
  const updateMutation = useUpdateDoc<NotificationLog>('Notification Log');
  const deleteMutation = useDeleteDoc('Notification Log');

  // ── إجراءات الإشعارات ──

  const markAsRead = useCallback(
    (name: string) => {
      updateMutation.mutate(
        { name, doc: { read: 1 } },
        {
          onSuccess: () => {
            toast.success('تم تحديد الإشعار كمقروء');
          },
          onError: () => {
            toast.error('فشل تحديث الإشعار');
          },
        }
      );
    },
    [updateMutation, toast]
  );

  const markAllAsRead = useCallback(() => {
    const unread = notifications.filter((n) => Number(n.read) !== 1);
    for (const n of unread) {
      updateMutation.mutate({ name: n.name, doc: { read: 1 } });
    }
    if (unread.length > 0) {
      toast.success(`تم تحديد ${unread.length} إشعار كمقروء`);
    }
  }, [notifications, updateMutation, toast]);

  const deleteNotification = useCallback(
    (name: string) => {
      deleteMutation.mutate(name, {
        onSuccess: () => {
          toast.success('تم حذف الإشعار');
        },
        onError: () => {
          toast.error('فشل حذف الإشعار');
        },
      });
    },
    [deleteMutation, toast]
  );

  const deleteRead = useCallback(() => {
    const readNotifs = notifications.filter((n) => Number(n.read) === 1);
    for (const n of readNotifs) {
      deleteMutation.mutate(n.name);
    }
    if (readNotifs.length > 0) {
      toast.success(`تم حذف ${readNotifs.length} إشعار مقروء`);
    }
  }, [notifications, deleteMutation, toast]);

  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setDoctypeFilter('all');
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
  }, []);

  // ── إحصائيات KPI ──

  const kpis = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    return {
      total: notifications.length,
      unread: notifications.filter((n) => Number(n.read) !== 1).length,
      read: notifications.filter((n) => Number(n.read) === 1).length,
      today: notifications.filter((n) => n.creation && n.creation.startsWith(todayStr)).length,
    };
  }, [notifications]);

  // ── أنواع المستندات الموجودة ──
  const uniqueDoctypes = useMemo(() => {
    const types = new Set<string>();
    for (const n of notifications) {
      if (n.document_type) types.add(n.document_type);
    }
    return Array.from(types).sort();
  }, [notifications]);

  // ── التصفية ──

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const isRead = Number(n.read) === 1;
      if (statusFilter === 'unread' && isRead) return false;
      if (statusFilter === 'read' && !isRead) return false;
      if (doctypeFilter !== 'all' && n.document_type !== doctypeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const subject = (n.subject || '').toLowerCase();
        const docName = (n.document_name || '').toLowerCase();
        const fromUser = (n.from_user || '').toLowerCase();
        if (!subject.includes(q) && !docName.includes(q) && !fromUser.includes(q)) return false;
      }
      if (dateFrom && n.creation) {
        const entryDate = n.creation.split('T')[0];
        if (entryDate < dateFrom) return false;
      }
      if (dateTo && n.creation) {
        const entryDate = n.creation.split('T')[0];
        if (entryDate > dateTo) return false;
      }
      return true;
    });
  }, [notifications, statusFilter, doctypeFilter, searchQuery, dateFrom, dateTo]);

  // ── التجميع ──

  const groupedByDate = useMemo(() => {
    if (groupBy !== 'date') return null;
    const groups: Record<DateGroup, NotificationLog[]> = {
      'اليوم': [],
      'أمس': [],
      'هذا الأسبوع': [],
      'أقدم': [],
    };
    for (const n of filteredNotifications) {
      if (n.creation) {
        groups[getDateGroup(n.creation)].push(n);
      } else {
        groups['أقدم'].push(n);
      }
    }
    return Object.entries(groups).filter(([, items]) => items.length > 0) as [DateGroup, NotificationLog[]][];
  }, [filteredNotifications, groupBy]);

  const groupedByDoctype = useMemo(() => {
    if (groupBy !== 'doctype') return null;
    const groups: Record<string, NotificationLog[]> = {};
    for (const n of filteredNotifications) {
      const dt = n.document_type || 'أخرى';
      if (!groups[dt]) groups[dt] = [];
      groups[dt].push(n);
    }
    return Object.entries(groups) as [string, NotificationLog[]][];
  }, [filteredNotifications, groupBy]);

  const hasActiveFilters: boolean =
    statusFilter !== 'all' || doctypeFilter !== 'all' || !!searchQuery || !!dateFrom || !!dateTo;

  // ── تفضيلات الإشعارات ──

  const togglePreference = useCallback(
    (doctype: string, field: keyof CategoryPreference) => {
      setPreferences((prev) => ({
        ...prev,
        [doctype]: {
          ...prev[doctype],
          [field]: !prev[doctype]?.[field],
        },
      }));
    },
    []
  );

  const savePreferences = useCallback(() => {
    toast.success('تم حفظ تفضيلات الإشعارات');
    setPreferencesOpen(false);
  }, [toast]);

  // ── عرض تحميل ──

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  /* ──────────────────────────────────────────────
     العرض الرئيسي
     ────────────────────────────────────────────── */

  return (
    <div className="space-y-6" dir="rtl">
      {/* رأس الصفحة */}
      <PageHeader
        title="مركز الإشعارات"
        description="إدارة وتتبع جميع إشعارات النظام في مكان واحد"
        iconify="solar:bell-bold-duotone"
        accent="info"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setPreferencesOpen(true)}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">تفضيلات</span>
            </Button>
          </div>
        }
      />

      {/* تنبيه خطأ */}
      <ListQueryAlert error={error} onRetry={() => refetch()} />

      {/* شريط KPI */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي الإشعارات"
          value={kpis.total}
          icon={Bell}
          accent="info"
          description="جميع الإشعارات في النظام"
        />
        <KpiCard
          title="غير مقروء"
          value={kpis.unread}
          icon={AlertCircle}
          accent="destructive"
          description="إشعارات لم يتم قراءتها"
        />
        <KpiCard
          title="مقروء"
          value={kpis.read}
          icon={CheckCheck}
          accent="success"
          description="إشعارات تم قراءتها"
        />
        <KpiCard
          title="إشعارات اليوم"
          value={kpis.today}
          icon={Clock}
          accent="warning"
          description="إشعارات وردت اليوم"
        />
      </KpiStrip>

      {/* شريط التصفية */}
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl border border-border/40 bg-card">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          تصفية
        </div>

        {/* فلتر الحالة */}
        <div className="space-y-1">
          <Label className="text-xs">الحالة</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'unread' | 'read')}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="unread">غير مقروء</SelectItem>
              <SelectItem value="read">مقروء</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* فلتر نوع المستند */}
        <div className="space-y-1">
          <Label className="text-xs">نوع المستند</Label>
          <Select value={doctypeFilter} onValueChange={setDoctypeFilter}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              {uniqueDoctypes.map((dt) => (
                <SelectItem key={dt} value={dt}>
                  {getDoctypeConfig(dt).label} ({dt})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* تاريخ من */}
        <div className="space-y-1">
          <Label className="text-xs">من تاريخ</Label>
          <Input
            type="date"
            dir="ltr"
            className="h-8 w-32 text-xs"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        {/* تاريخ إلى */}
        <div className="space-y-1">
          <Label className="text-xs">إلى تاريخ</Label>
          <Input
            type="date"
            dir="ltr"
            className="h-8 w-32 text-xs"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        {/* بحث */}
        <div className="space-y-1 relative">
          <Label className="text-xs">بحث</Label>
          <div className="relative">
            <Search className="absolute start-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 w-44 pe-3 ps-8 text-xs"
              placeholder="بحث في الإشعارات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex items-center gap-2 ms-auto">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
              <RotateCcw className="h-3 w-3" />
              مسح
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={markAllAsRead}
            disabled={kpis.unread === 0 || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            تحديد الكل كمقروء
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={deleteRead}
            disabled={kpis.read === 0 || deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            حذف المقروء
          </Button>
        </div>
      </div>

      {/* التبويبات والتجميع */}
      <div className="space-y-4">
        {/* شريط التبويب والتجميع */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* تبويبات الحالة السريعة */}
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as 'all' | 'unread' | 'read')}
          >
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs gap-1.5">
                <Bell className="h-3.5 w-3.5" />
                الكل
                <span className="text-xs text-muted-foreground">({kpis.total})</span>
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                غير مقروء
                <span className="text-xs text-muted-foreground">({kpis.unread})</span>
              </TabsTrigger>
              <TabsTrigger value="read" className="text-xs gap-1.5">
                <CheckCheck className="h-3.5 w-3.5" />
                مقروء
                <span className="text-xs text-muted-foreground">({kpis.read})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* خيارات التجميع */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">تجميع حسب:</Label>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">التاريخ</SelectItem>
                <SelectItem value="doctype">نوع المستند</SelectItem>
                <SelectItem value="none">بدون تجميع</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* عداد النتائج */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {filteredNotifications.length} إشعار
            {hasActiveFilters && ` من ${kpis.total}`}
          </span>
          {filteredNotifications.length > 0 && kpis.unread > 0 && (
            <span className="text-xs text-info font-medium">
              {kpis.unread} غير مقروء
            </span>
          )}
        </div>

        {/* قائمة الإشعارات */}
        {filteredNotifications.length === 0 ? (
          <EmptyState hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters} />
        ) : groupBy === 'none' ? (
          <div className="space-y-2">
            {filteredNotifications.map((n) => (
              <NotificationCard
                key={n.name}
                notification={n}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        ) : groupBy === 'date' && groupedByDate ? (
          <div className="space-y-6">
            {groupedByDate.map(([group, items]) => (
              <div key={group}>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {group}
                  <span className="text-xs text-muted-foreground font-normal">({items.length})</span>
                </h3>
                <div className="space-y-2">
                  {items.map((n) => (
                    <NotificationCard
                      key={n.name}
                      notification={n}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : groupedByDoctype ? (
          <div className="space-y-6">
            {groupedByDoctype.map(([dt, items]) => {
              const config = getDoctypeConfig(dt);
              const Icon = config.icon;
              return (
                <div key={dt}>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', config.color)} />
                    {config.label}
                    <span className="text-xs text-muted-foreground font-normal">({items.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {items.map((n) => (
                      <NotificationCard
                        key={n.name}
                        notification={n}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* ── حوار التفضيلات ── */}
      <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>تفضيلات الإشعارات</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-96 overflow-y-auto">
            {uniqueDoctypes.map((dt) => {
              const config = getDoctypeConfig(dt);
              const Icon = config.icon;
              const pref = preferences[dt] || { enabled: true, email: true, inApp: true };
              return (
                <div
                  key={dt}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/40"
                >
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1', config.bg, config.ring)}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  <span className="text-sm font-medium flex-1">{config.label}</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs">بريد</Label>
                      <Switch
                        checked={pref.email}
                        onCheckedChange={() => togglePreference(dt, 'email')}
                        className="scale-75"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs">داخلي</Label>
                      <Switch
                        checked={pref.inApp}
                        onCheckedChange={() => togglePreference(dt, 'inApp')}
                        className="scale-75"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {uniqueDoctypes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                لا توجد أنواع مستندات بعد. ستظهر عند وجود إشعارات.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreferencesOpen(false)} className="text-xs">
              إلغاء
            </Button>
            <Button onClick={savePreferences} className="text-xs">
              حفظ التفضيلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
