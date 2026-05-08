'use client';

import { useState, useCallback, useMemo, useSyncExternalStore } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { StatusBadge } from '@/components/erp/status-badge';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/app-format';
import { cn } from '@/lib/utils';
import {
  Bell,
  BellOff,
  Mail,
  MessageSquare,
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
  Inbox,
  RotateCcw,
  X,
} from 'lucide-react';

/* ──────────────────────────────────────────────
   أنواع البيانات
   ────────────────────────────────────────────── */

type NotificationCategory =
  | 'invoices'
  | 'payments'
  | 'inventory'
  | 'hr'
  | 'sales'
  | 'purchases'
  | 'system';

type NotificationPriority = 'عاجل' | 'مهم' | 'عادي';

type Notification = {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  isRead: boolean;
  link?: string;
  doctype?: string;
  docname?: string;
  createdAt: string;
};

type CategoryPreference = {
  enabled: boolean;
  email: boolean;
  sms: boolean;
  inApp: boolean;
};

type GroupByOption = 'date' | 'category' | 'none';

/* ──────────────────────────────────────────────
   إعدادات الفئات
   ────────────────────────────────────────────── */

const CATEGORY_CONFIG: Record<
  NotificationCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; ring: string }
> = {
  invoices: {
    label: 'فواتير',
    icon: FileText,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10',
    ring: 'ring-red-500/20',
  },
  payments: {
    label: 'مدفوعات',
    icon: DollarSign,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/20',
  },
  inventory: {
    label: 'مخزون',
    icon: Package,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10',
    ring: 'ring-sky-500/20',
  },
  hr: {
    label: 'موارد بشرية',
    icon: Users,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10',
    ring: 'ring-purple-500/20',
  },
  sales: {
    label: 'مبيعات',
    icon: ShoppingCart,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/20',
  },
  purchases: {
    label: 'مشتريات',
    icon: Truck,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10',
    ring: 'ring-orange-500/20',
  },
  system: {
    label: 'نظام',
    icon: Settings,
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-500/10',
    ring: 'ring-gray-500/20',
  },
};

const PRIORITY_CONFIG: Record<NotificationPriority, { color: string; bg: string }> = {
  'عاجل': { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-500/15 ring-1 ring-inset ring-red-500/25' },
  'مهم': { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/15 ring-1 ring-inset ring-amber-500/25' },
  'عادي': { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/15 ring-1 ring-inset ring-gray-500/25' },
};

const DEFAULT_PREFERENCES: Record<NotificationCategory, CategoryPreference> = {
  invoices: { enabled: true, email: true, sms: false, inApp: true },
  payments: { enabled: true, email: true, sms: true, inApp: true },
  inventory: { enabled: true, email: false, sms: false, inApp: true },
  hr: { enabled: true, email: true, sms: false, inApp: true },
  sales: { enabled: true, email: true, sms: false, inApp: true },
  purchases: { enabled: true, email: false, sms: false, inApp: true },
  system: { enabled: true, email: false, sms: false, inApp: true },
};

/* ──────────────────────────────────────────────
   بيانات تجريبية
   ────────────────────────────────────────────── */

function generateSeedData(): Notification[] {
  const now = new Date();
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

  return [
    {
      id: 'n1',
      title: 'فاتورة مبيعات جديدة',
      message: 'تم إنشاء فاتورة مبيعات SINV-2026-00145 بقيمة 45,000 ريال للعميل مؤسسة النور التجارية',
      category: 'invoices',
      priority: 'عاجل',
      isRead: false,
      link: '/sales/sales-invoices',
      doctype: 'Sales Invoice',
      docname: 'SINV-2026-00145',
      createdAt: minutesAgo(5),
    },
    {
      id: 'n2',
      title: 'دفعة مستلمة',
      message: 'تم استلام دفعة بمبلغ 12,500 ريال من شركة الأمل للتجارة مقابل الفاتورة SINV-2026-00132',
      category: 'payments',
      priority: 'مهم',
      isRead: false,
      link: '/accounting/payment-entry',
      doctype: 'Payment Entry',
      docname: 'PE-2026-00089',
      createdAt: minutesAgo(18),
    },
    {
      id: 'n3',
      title: 'مخزون منخفض - قلم حبر أزرق',
      message: 'الصنف "قلم حبر أزرق" وصل إلى مستوى مخزون حرج (5 وحدات) في مستودع المستودع الرئيسي',
      category: 'inventory',
      priority: 'عاجل',
      isRead: false,
      link: '/inventory/stock-levels',
      doctype: 'Item',
      docname: 'قلم حبر أزرق',
      createdAt: minutesAgo(30),
    },
    {
      id: 'n4',
      title: 'طلب إجازة جديد',
      message: 'قدم الموظف أحمد محمد طلب إجازة سنوية من 15/05/2026 إلى 20/05/2026 (5 أيام)',
      category: 'hr',
      priority: 'مهم',
      isRead: false,
      link: '/hr/leave-applications',
      doctype: 'Leave Application',
      docname: 'HR-LAP-2026-00034',
      createdAt: minutesAgo(45),
    },
    {
      id: 'n5',
      title: 'أمر بيع جديد',
      message: 'تم إنشاء أمر بيع SO-2026-00078 بقيمة 78,000 ريال من عميل مجموعة الفخامة',
      category: 'sales',
      priority: 'مهم',
      isRead: false,
      link: '/sales/sales-orders',
      doctype: 'Sales Order',
      docname: 'SO-2026-00078',
      createdAt: hoursAgo(1),
    },
    {
      id: 'n6',
      title: 'فاتورة مشتريات معلقة',
      message: 'فاتورة المشتريات PINV-2026-00056 من المورد شركة الاتحاد بانتظار الاعتماد - المبلغ 23,400 ريال',
      category: 'purchases',
      priority: 'عادي',
      isRead: true,
      link: '/purchases/purchase-invoices',
      doctype: 'Purchase Invoice',
      docname: 'PINV-2026-00056',
      createdAt: hoursAgo(2),
    },
    {
      id: 'n7',
      title: 'صيانة النظام المجدولة',
      message: 'سيتم إجراء صيانة دورية للنظام يوم الجمعة 10/05/2026 من الساعة 2:00 إلى 4:00 فجراً',
      category: 'system',
      priority: 'عادي',
      isRead: true,
      createdAt: hoursAgo(3),
    },
    {
      id: 'n8',
      title: 'فاتورة مبيعات متأخرة',
      message: 'الفاتورة SINV-2026-00102 تجاوزت تاريخ الاستحقاق بمقدار 7 أيام - العميل شركة البناء الحديث',
      category: 'invoices',
      priority: 'عاجل',
      isRead: false,
      link: '/sales/sales-invoices',
      doctype: 'Sales Invoice',
      docname: 'SINV-2026-00102',
      createdAt: hoursAgo(4),
    },
    {
      id: 'n9',
      title: 'شيك مستحق اليوم',
      message: 'شيك رقم CHK-2026-00234 بمبلغ 35,000 ريال مستحق الدفع اليوم من المورد مؤسسة الخليج',
      category: 'payments',
      priority: 'عاجل',
      isRead: false,
      link: '/accounting/cheques',
      doctype: 'Payment Entry',
      docname: 'PE-2026-00076',
      createdAt: hoursAgo(5),
    },
    {
      id: 'n10',
      title: 'دفعة مخزون جديدة',
      message: 'تم استلام دفعة من الصنف "ورق طباعة A4" - 500 وحدة في مستودع المستودع الرئيسي',
      category: 'inventory',
      priority: 'عادي',
      isRead: true,
      link: '/inventory/stock-entry',
      doctype: 'Stock Entry',
      docname: 'STE-2026-00045',
      createdAt: hoursAgo(6),
    },
    {
      id: 'n11',
      title: 'موافقة على طلب توظيف',
      message: 'تمت الموافقة على طلب توظيف مهندس برمجيات - القسم: تقنية المعلومات',
      category: 'hr',
      priority: 'مهم',
      isRead: true,
      link: '/hr/employee-requests',
      doctype: 'Employee Request',
      docname: 'HR-ER-2026-00012',
      createdAt: hoursAgo(8),
    },
    {
      id: 'n12',
      title: 'عرض سعر جديد',
      message: 'تم إنشاء عرض سعر QTN-2026-00089 للعميل شركة الابتكار بقيمة 156,000 ريال',
      category: 'sales',
      priority: 'عادي',
      isRead: true,
      link: '/sales/quotations',
      doctype: 'Quotation',
      docname: 'QTN-2026-00089',
      createdAt: daysAgo(1),
    },
    {
      id: 'n13',
      title: 'أمر شراء مرحّل',
      message: 'تم ترحيل أمر الشراء PO-2026-00045 بقيمة 89,000 ريال إلى المورد شركة التوريدات العالمية',
      category: 'purchases',
      priority: 'مهم',
      isRead: true,
      link: '/purchases/purchase-orders',
      doctype: 'Purchase Order',
      docname: 'PO-2026-00045',
      createdAt: daysAgo(1),
    },
    {
      id: 'n14',
      title: 'نسخة احتياطية مكتملة',
      message: 'تمت عملية النسخ الاحتياطي اليومية بنجاح - حجم النسخة: 2.3 جيجابايت',
      category: 'system',
      priority: 'عادي',
      isRead: true,
      createdAt: daysAgo(2),
    },
    {
      id: 'n15',
      title: 'إشعار دائن جديد',
      message: 'تم إنشاء إشعار دائن CN-2026-00003 بقيمة 5,200 ريال للعميل مؤسسة السلام - مرتبط بالفاتورة SINV-2026-00098',
      category: 'invoices',
      priority: 'مهم',
      isRead: false,
      link: '/sales/sales-invoices',
      doctype: 'Sales Invoice',
      docname: 'CN-2026-00003',
      createdAt: daysAgo(2),
    },
    {
      id: 'n16',
      title: 'تحديث أسعار الموردين',
      message: 'قام المورد شركة الخليج للتوريد بتحديث قائمة الأسعار - 23 صنفاً بأسعار جديدة',
      category: 'purchases',
      priority: 'عادي',
      isRead: true,
      link: '/inventory/price-lists',
      createdAt: daysAgo(3),
    },
    {
      id: 'n17',
      title: 'مستودع وصل للحد الأقصى',
      message: 'المستودع "مستودع المواد الخام" وصل إلى 95% من طاقته الاستيعابية - يرجى اتخاذ إجراء',
      category: 'inventory',
      priority: 'عاجل',
      isRead: false,
      link: '/inventory/warehouses',
      createdAt: daysAgo(3),
    },
    {
      id: 'n18',
      title: 'تسوية بنكية مكتملة',
      message: 'تم إكمال التسوية البنكية لحساب البنك الأهلي - شهر أبريل 2026 - الفرق: 0 ريال',
      category: 'payments',
      priority: 'عادي',
      isRead: true,
      link: '/accounting/bank-reconciliation',
      createdAt: daysAgo(4),
    },
  ];
}

/* ──────────────────────────────────────────────
   إدارة التخزين المحلي (localStorage)
   ────────────────────────────────────────────── */

const STORAGE_KEY = 'erp_notifications';
const PREFS_KEY = 'erp_notification_preferences';

/* مشترك مخصص لأحداث التخزين + أحداث الإرسال المخصصة */
let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(callback: () => void) {
  listeners = [...listeners, callback];
  const onStorage = () => emitChange();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
    window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || '[]';
  } catch {
    return '[]';
  }
}

function getServerSnapshot(): string {
  return '[]';
}

function persistNotifications(notifications: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    window.dispatchEvent(new Event('storage'));
    emitChange();
  } catch {
    /* تجاهل أخطاء التخزين */
  }
}

function ensureSeedData(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* تجاهل */
  }
  const seed = generateSeedData();
  persistNotifications(seed);
  return seed;
}

function loadPreferences(): Record<NotificationCategory, CategoryPreference> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* تجاهل */
  }
  return { ...DEFAULT_PREFERENCES };
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
   مكون بطاقة الإشعار (خارج المكون الرئيسي)
   ────────────────────────────────────────────── */

function NotificationCard({
  notification,
  onMarkAsRead,
  onDelete,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const catConfig = CATEGORY_CONFIG[notification.category];
  const priConfig = PRIORITY_CONFIG[notification.priority];
  const CatIcon = catConfig.icon;

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 rounded-lg border p-3 sm:p-4 transition-all duration-150 cursor-pointer',
        notification.isRead
          ? 'border-border/30 bg-card hover:bg-muted/30'
          : 'border-border/50 bg-info/[0.03] hover:bg-info/[0.06] dark:bg-info/[0.04] dark:hover:bg-info/[0.07]'
      )}
      onClick={() => {
        if (!notification.isRead) onMarkAsRead(notification.id);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (!notification.isRead) onMarkAsRead(notification.id);
        }
      }}
      aria-label={notification.title}
    >
      {/* مؤشر غير مقروء */}
      {!notification.isRead && (
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
              notification.isRead ? 'font-medium text-foreground' : 'font-semibold text-foreground'
            )}
          >
            {notification.title}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            {/* شارة الأولوية */}
            <span
              className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold',
                priConfig.bg,
                priConfig.color
              )}
            >
              {notification.priority}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {notification.message}
        </p>

        <div className="flex items-center gap-3 pt-1">
          {/* وقت الإشعار */}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {timeAgo(notification.createdAt)}
          </span>

          {/* الفئة */}
          <span className={cn('text-[10px] font-medium', catConfig.color)}>
            {catConfig.label}
          </span>

          {/* رابط المستند */}
          {notification.doctype && notification.docname && (
            <span className="flex items-center gap-1 text-[10px] text-primary hover:underline">
              <ExternalLink className="h-2.5 w-2.5" />
              {notification.docname}
            </span>
          )}
        </div>
      </div>

      {/* أزرار الإجراءات */}
      <div className="flex flex-col items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
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
            onDelete(notification.id);
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
   مكون الحالة الفارغة (خارج المكون الرئيسي)
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
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [groupBy, setGroupBy] = useState<GroupByOption>('date');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState<Record<NotificationCategory, CategoryPreference>>(
    () => loadPreferences()
  );

  // ── Hydration-safe localStorage read via useSyncExternalStore ──
  const rawSnapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // ── Parse notifications from localStorage snapshot ──
  const notifications: Notification[] = useMemo(() => {
    try {
      const parsed = JSON.parse(rawSnapshot);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      /* تجاهل */
    }
    // First load — seed data
    return ensureSeedData();
  }, [rawSnapshot]);

  // ── إجراءات الإشعارات ──

  const markAsRead = useCallback(
    (id: string) => {
      const current = (() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })();
      const updated = (current as Notification[]).map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      persistNotifications(updated);
      toast({ title: 'تم تحديد الإشعار كمقروء' });
    },
    [toast]
  );

  const markAllAsRead = useCallback(() => {
    const current = (() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })();
    const updated = (current as Notification[]).map((n) => ({ ...n, isRead: true }));
    persistNotifications(updated);
    toast({ title: 'تم تحديد جميع الإشعارات كمقروء' });
  }, [toast]);

  const deleteNotification = useCallback(
    (id: string) => {
      const current = (() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })();
      const updated = (current as Notification[]).filter((n) => n.id !== id);
      persistNotifications(updated);
      toast({ title: 'تم حذف الإشعار' });
    },
    [toast]
  );

  const deleteRead = useCallback(() => {
    const current = (() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })();
    const updated = (current as Notification[]).filter((n) => !n.isRead);
    persistNotifications(updated);
    toast({ title: 'تم حذف جميع الإشعارات المقروءة' });
  }, [toast]);

  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setCategoryFilter('all');
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
      unread: notifications.filter((n) => !n.isRead).length,
      read: notifications.filter((n) => n.isRead).length,
      today: notifications.filter((n) => n.createdAt.startsWith(todayStr)).length,
    };
  }, [notifications]);

  // ── التصفية ──

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (statusFilter === 'unread' && n.isRead) return false;
      if (statusFilter === 'read' && !n.isRead) return false;
      if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !n.message.toLowerCase().includes(q)) return false;
      }
      if (dateFrom) {
        const entryDate = n.createdAt.split('T')[0];
        if (entryDate < dateFrom) return false;
      }
      if (dateTo) {
        const entryDate = n.createdAt.split('T')[0];
        if (entryDate > dateTo) return false;
      }
      return true;
    });
  }, [notifications, statusFilter, categoryFilter, searchQuery, dateFrom, dateTo]);

  // ── التجميع ──

  const groupedByDate = useMemo(() => {
    if (groupBy !== 'date') return null;
    const groups: Record<DateGroup, Notification[]> = {
      'اليوم': [],
      'أمس': [],
      'هذا الأسبوع': [],
      'أقدم': [],
    };
    for (const n of filteredNotifications) {
      groups[getDateGroup(n.createdAt)].push(n);
    }
    return Object.entries(groups).filter(([, items]) => items.length > 0) as [DateGroup, Notification[]][];
  }, [filteredNotifications, groupBy]);

  const groupedByCategory = useMemo(() => {
    if (groupBy !== 'category') return null;
    const groups: Partial<Record<NotificationCategory, Notification[]>> = {};
    for (const n of filteredNotifications) {
      if (!groups[n.category]) groups[n.category] = [];
      groups[n.category]!.push(n);
    }
    return Object.entries(groups) as [NotificationCategory, Notification[]][];
  }, [filteredNotifications, groupBy]);

  const hasActiveFilters: boolean =
    statusFilter !== 'all' || categoryFilter !== 'all' || !!searchQuery || !!dateFrom || !!dateTo;

  // ── تفضيلات الإشعارات ──

  const togglePreference = useCallback(
    (category: NotificationCategory, field: keyof CategoryPreference) => {
      setPreferences((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          [field]: !prev[category][field],
        },
      }));
    },
    []
  );

  const savePreferences = useCallback(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    } catch {
      /* تجاهل */
    }
    toast({ title: 'تم حفظ تفضيلات الإشعارات' });
    setPreferencesOpen(false);
  }, [preferences, toast]);

  // ── عرض تحميل أولي (قبل توفر بيانات localStorage) ──

  if (rawSnapshot === '[]' && notifications.length === 0) {
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
          <Label className="text-[10px]">الحالة</Label>
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

        {/* فلتر الفئة */}
        <div className="space-y-1">
          <Label className="text-[10px]">الفئة</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الفئات</SelectItem>
              {(Object.entries(CATEGORY_CONFIG) as [NotificationCategory, typeof CATEGORY_CONFIG[NotificationCategory]][]).map(
                ([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        {/* تاريخ من */}
        <div className="space-y-1">
          <Label className="text-[10px]">من تاريخ</Label>
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
          <Label className="text-[10px]">إلى تاريخ</Label>
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
          <Label className="text-[10px]">بحث</Label>
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
            disabled={kpis.unread === 0}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            تحديد الكل كمقروء
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={deleteRead}
            disabled={kpis.read === 0}
          >
            <Trash2 className="h-3.5 w-3.5" />
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
                <span className="text-[10px] text-muted-foreground">({kpis.total})</span>
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                غير مقروء
                <span className="text-[10px] text-muted-foreground">({kpis.unread})</span>
              </TabsTrigger>
              <TabsTrigger value="read" className="text-xs gap-1.5">
                <CheckCheck className="h-3.5 w-3.5" />
                مقروء
                <span className="text-[10px] text-muted-foreground">({kpis.read})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* خيارات التجميع */}
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-muted-foreground">تجميع حسب:</Label>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">التاريخ</SelectItem>
                <SelectItem value="category">الفئة</SelectItem>
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
        ) : groupBy === 'date' && groupedByDate ? (
          <div className="space-y-6">
            {groupedByDate.map(([groupLabel, items]) => (
              <div key={groupLabel}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-foreground">{groupLabel}</h3>
                  <div className="h-px flex-1 bg-border/40" />
                  <span className="text-[10px] text-muted-foreground">{items.length} إشعار</span>
                </div>
                <div className="space-y-2">
                  {items.map((n) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : groupBy === 'category' && groupedByCategory ? (
          <div className="space-y-6">
            {groupedByCategory.map(([catKey, items]) => {
              const catConfig = CATEGORY_CONFIG[catKey];
              const CatIcon = catConfig.icon;
              return (
                <div key={catKey}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded',
                        catConfig.bg,
                        catConfig.color
                      )}
                    >
                      <CatIcon className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{catConfig.label}</h3>
                    <div className="h-px flex-1 bg-border/40" />
                    <span className="text-[10px] text-muted-foreground">{items.length} إشعار</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((n) => (
                      <NotificationCard
                        key={n.id}
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
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────
          حوار تفضيلات الإشعارات
          ────────────────────────────────────────────── */}
      <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              تفضيلات الإشعارات
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            {(Object.entries(CATEGORY_CONFIG) as [NotificationCategory, typeof CATEGORY_CONFIG[NotificationCategory]][]).map(
              ([catKey, catCfg]) => {
                const pref = preferences[catKey];
                const CatIcon = catCfg.icon;
                return (
                  <Card key={catKey} className={cn('border', !pref.enabled && 'opacity-50')}>
                    <CardContent className="p-4 space-y-3">
                      {/* رأس الفئة */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-lg',
                              catCfg.bg,
                              catCfg.color
                            )}
                          >
                            <CatIcon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-semibold">{catCfg.label}</span>
                        </div>
                        <Switch
                          checked={pref.enabled}
                          onCheckedChange={() => togglePreference(catKey, 'enabled')}
                          aria-label={`تفعيل إشعارات ${catCfg.label}`}
                        />
                      </div>

                      {/* خيارات الإشعار */}
                      {pref.enabled && (
                        <div className="flex items-center gap-6 ps-10">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`email-${catKey}`}
                              checked={pref.email}
                              onCheckedChange={() => togglePreference(catKey, 'email')}
                            />
                            <Label
                              htmlFor={`email-${catKey}`}
                              className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer"
                            >
                              <Mail className="h-3 w-3" />
                              بريد إلكتروني
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`sms-${catKey}`}
                              checked={pref.sms}
                              onCheckedChange={() => togglePreference(catKey, 'sms')}
                            />
                            <Label
                              htmlFor={`sms-${catKey}`}
                              className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer"
                            >
                              <MessageSquare className="h-3 w-3" />
                              SMS
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`inapp-${catKey}`}
                              checked={pref.inApp}
                              onCheckedChange={() => togglePreference(catKey, 'inApp')}
                            />
                            <Label
                              htmlFor={`inapp-${catKey}`}
                              className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer"
                            >
                              <Bell className="h-3 w-3" />
                              داخل النظام
                            </Label>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              }
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreferencesOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={savePreferences}>حفظ التفضيلات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
