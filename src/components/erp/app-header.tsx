'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Moon, Sun, Question, Plus } from '@phosphor-icons/react';
import { ERP_OPEN_SHORTCUTS_EVENT } from '@/components/erp/keyboard-shortcuts-dialog';
import { CompanySwitcher } from '@/components/erp/company-switcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { GlobalSearch } from '@/components/erp/global-search';
import { ModernIcon } from '@/components/ui/modern-icon';
import {
  useHeaderNotifications,
  useMarkNotificationRead,
  notificationToneClass,
  type HeaderNotificationItem,
} from '@/components/erp/header-notifications';
import { useRealtimeContext } from '@/components/erp/realtime-provider';
import { getDashboardPathForDocType } from '@/lib/core/helpers';

const QUICK_CREATE_LINKS = [
  { href: '/sales/sales-invoices/new', label: 'فاتورة مبيعات' },
  { href: '/purchases/purchase-invoices/new', label: 'فاتورة مشتريات' },
  { href: '/accounting/journal-entry/new', label: 'قيد يومية' },
  { href: '/sales/customers', label: 'عميل جديد' },
  { href: '/purchases/suppliers', label: 'مورد جديد' },
];

export function AppHeader() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { status: realtimeStatus } = useRealtimeContext();
  const {
    items: notificationItems,
    unreadCount,
    refetch: refetchNotifications,
    isError: notificationsError,
    isLoading: notificationsLoading,
    forUserReady,
  } = useHeaderNotifications();
  const markNotificationRead = useMarkNotificationRead();
  const onNotificationClick = async (n: HeaderNotificationItem) => {
    if (n.unread) {
      try {
        await markNotificationRead.mutateAsync(n.id);
      } catch {
        toast.error('تعذر تعليم الإشعار كمقروء');
      }
    }
    const path = getDashboardPathForDocType(n.document_type);
    if (path) {
      router.push(path);
      return;
    }
    toast.message('لا مسار لوحة لهذا النوع', { description: n.document_type || '—' });
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-[3.25rem] shrink-0 items-center gap-3 px-3 md:px-4 no-print border-b border-border/40 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        {/* Search — صف واحد بدون نص مسار فوق الحقل */}
        <div className="flex min-w-0 flex-1 items-center">
          <div className="relative w-full max-w-xl cursor-pointer group" onClick={() => setSearchOpen(true)}>
            <ModernIcon
              iconify="solar:magnifer-bold-duotone"
              className="pointer-events-none absolute start-3 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-hover:text-primary"
            />
            <Input
              placeholder="بحث في الشاشات والبيانات…"
              className="h-9 cursor-pointer rounded-xl border border-border/60 bg-muted/30 pe-11 ps-3 sm:ps-[4.25rem] text-sm shadow-inner shadow-black/[0.03] transition-[border,box-shadow] placeholder:text-muted-foreground/80 hover:border-border hover:bg-muted/40 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/15"
              readOnly
              value=""
              aria-label="فتح البحث العام"
            />
            <kbd className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded-md border border-border/50 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
              <span>Ctrl</span>
              <span className="opacity-80">K</span>
            </kbd>
          </div>
        </div>

        <Separator orientation="vertical" className="!h-6 bg-border/40 hidden lg:block" />

        {/* Company Switcher */}
        <CompanySwitcher />

        <Separator orientation="vertical" className="!h-6 bg-border/40 hidden lg:block" />

        {/* Quick stats chips — Real-time connection status */}
        <div className="hidden xl:flex items-center gap-1.5">
          <div
            className="flex items-center gap-2 rounded-full border border-border/40 bg-[color:var(--surface-muted)] px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:border-border/60 hover:text-foreground transition-colors"
            title={
              realtimeStatus === 'connected'
                ? 'متصل — التحديثات التلقائية نشطة'
                : realtimeStatus === 'reconnecting'
                  ? 'إعادة الاتصال — جارٍ المحاولة...'
                  : 'غير متصل — التحديثات متوقفة'
            }
          >
            <span
              className={
                realtimeStatus === 'connected'
                  ? 'h-1.5 w-1.5 rounded-full bg-success animate-pulse'
                  : realtimeStatus === 'reconnecting'
                    ? 'h-1.5 w-1.5 rounded-full bg-warning animate-pulse'
                    : 'h-1.5 w-1.5 rounded-full bg-destructive'
              }
            />
            <span>
              {realtimeStatus === 'connected'
                ? 'متصل'
                : realtimeStatus === 'reconnecting'
                  ? 'إعادة اتصال'
                  : 'غير متصل'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl border border-transparent text-muted-foreground hover:text-foreground hover:border-border/60 hover:bg-[color:var(--surface-muted)] transition-all"
                
                title="إنشاء سريع"
                aria-label="إنشاء سريع"
              >
                <Plus className="h-4 w-4" weight="bold" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1">
              <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">إنشاء سريع</p>
              <div className="space-y-0.5">
                {QUICK_CREATE_LINKS.map((link) => (
                  <button
                    key={link.href}
                    type="button"
                    className="w-full rounded-[var(--radius-sm-ui)] px-2 py-1.5 text-start text-xs hover:bg-muted transition-colors"
                    onClick={() => router.push(link.href)}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl border border-transparent text-muted-foreground hover:text-foreground hover:border-border/60 hover:bg-[color:var(--surface-muted)] transition-all"
            title="اختصارات لوحة المفاتيح (?)"
            onClick={() => window.dispatchEvent(new Event(ERP_OPEN_SHORTCUTS_EVENT))}
            aria-label="عرض اختصارات لوحة المفاتيح"
          >
            <Question className="h-4 w-4" weight="duotone" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl border border-transparent text-muted-foreground hover:text-foreground hover:border-border/60 hover:bg-[color:var(--surface-muted)] transition-all"
            onClick={toggleTheme}
            title={theme === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}
            aria-label={theme === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح'}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 relative rounded-xl border border-transparent text-muted-foreground hover:text-foreground hover:border-border/60 hover:bg-[color:var(--surface-muted)] transition-all"
                aria-label="فتح الإشعارات"
              >
                <ModernIcon iconify="solar:bell-bing-bold-duotone" className="h-4 w-4" />
                {(unreadCount > 0 || notificationItems.length > 0) && (
                  <span className="absolute -top-0.5 -end-0.5 h-4 min-w-4 rounded-full bg-destructive text-white text-[9px] font-semibold flex items-center justify-center px-1 ring-2 ring-card">
                    {unreadCount > 0 ? unreadCount : notificationItems.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[calc(100vw-2rem)] sm:w-[320px] p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/40 px-3 py-2.5 bg-muted/30">
                <div className="flex items-center gap-2">
                  <ModernIcon iconify="solar:bell-bing-bold-duotone" className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-bold">الإشعارات</h4>
                </div>
                <button
                  type="button"
                  className="text-[10px] font-medium text-primary hover:underline"
                  onClick={() => void refetchNotifications()}
                >
                  تحديث
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notificationsLoading && notificationItems.length === 0 ? (
                  <div className="space-y-2 px-3 py-4">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : notificationsError ? (
                  <p className="px-3 py-6 text-center text-xs text-destructive">
                    تعذر تحميل الإشعارات. تحقق من الاتصال أو الصلاحيات.
                  </p>
                ) : !forUserReady ? (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">سجّل الدخول لعرض إشعاراتك من سجل الإشعارات.</p>
                ) : notificationItems.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                    لا إشعارات موجهة لك حالياً في سجل الإشعارات.
                  </p>
                ) : (
                  notificationItems.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-[color:var(--surface-muted)] transition-colors text-start border-b border-border/40 last:border-0"
                      onClick={() => void onNotificationClick(n)}
                    >
                      <div className={notificationToneClass(n.type)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{n.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="border-t border-border/40 p-2 bg-[color:var(--surface-muted)]">
                <Link
                  href="/crm/messages"
                  className="block w-full text-center text-xs font-medium text-primary hover:underline py-1"
                >
                  عرض كل الإشعارات
                </Link>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
