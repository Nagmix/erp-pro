'use client';

import { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/erp/app-sidebar';
import { AppHeader } from '@/components/erp/app-header';
import { ContextRailProvider } from '@/components/erp/context-rail';
import { KeyboardShortcutsDialog } from '@/components/erp/keyboard-shortcuts-dialog';
import { ErrorBoundary } from '@/components/erp/error-boundary';
import { RealtimeProvider } from '@/components/erp/realtime-provider';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiCheckSetupStatus } from '@/lib/client/api';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { checkAuth, isAuthenticated } = useAuthStore();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const [ready, setReady] = useState(false);
  const [setupChecked, setSetupChecked] = useState(false);

  useEffect(() => {
    checkAuth();
    setReady(true);
  }, [checkAuth]);

  // التحقق من حالة الإعداد قبل المصادقة
  useEffect(() => {
    if (ready && isAuthenticated && !setupChecked) {
      apiCheckSetupStatus()
        .then((status) => {
          if (!status.configured) {
            window.location.href = '/setup';
          }
        })
        .catch(() => {
          // في حالة فشل الفحص، نتجاهل ونسمح بالدخول
        })
        .finally(() => {
          setSetupChecked(true);
        });
    }
  }, [ready, isAuthenticated, setupChecked]);

  useEffect(() => {
    if (ready && !isAuthenticated) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
  }, [ready, isAuthenticated]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جارٍ التحقق...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جارٍ التحويل...</p>
        </div>
      </div>
    );
  }

  if (!setupChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جارٍ فحص حالة النظام...</p>
        </div>
      </div>
    );
  }

  return (
    <RealtimeProvider>
      <div className="min-h-screen bg-background" dir="rtl">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:start-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-xs focus:text-primary-foreground"
        >
          تخطي إلى المحتوى
        </a>
        <AppSidebar />
        <div
          className={cn(
            'transition-[padding] duration-300 ease-in-out flex flex-col min-h-screen',
            collapsed ? 'lg:pe-[76px]' : 'lg:pe-[260px]'
          )}
        >
          <AppHeader />
          <main
            id="main-content"
            className="erp-main-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-5 lg:p-6 erp-page-enter"
            tabIndex={-1}
          >
            <ErrorBoundary>
              <ContextRailProvider>{children}</ContextRailProvider>
            </ErrorBoundary>
          </main>
          <KeyboardShortcutsDialog />
        </div>
      </div>
    </RealtimeProvider>
  );
}
