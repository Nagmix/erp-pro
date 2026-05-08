'use client';

import Link from 'next/link';
import { ShieldOff, Home, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** صفحة 403 — الوصول محظور حسب الدور (DEVELOPMENT_PLAN 2.4). */
export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background" dir="rtl">
      <div className="max-w-md text-center space-y-6 rounded-[var(--radius-lg-ui)] border border-border/40 bg-card px-6 py-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <ShieldOff className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">غير مصرّح</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            لا تملك الصلاحية الكافية للوصول إلى هذا القسم. إذا كنت تعتقد أن هذا خطأ، راجع مدير النظام أو
            جرّب حساباً بأدوار مناسبة.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link href="/" className="gap-2">
              <Home className="h-4 w-4" />
              لوحة التحكم
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login" className="gap-2">
              <LogIn className="h-4 w-4" />
              تبديل المستخدم
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
