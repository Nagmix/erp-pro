'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * إعادة توجيه من /accounting/budgets/new إلى /accounting/budgets
 * مع تمرير параметتر لفتح حوار الإنشاء تلقائياً
 */
export default function NewBudgetRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/accounting/budgets?create=1');
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center" dir="rtl">
      <div className="text-center">
        <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">جاري التحويل إلى إنشاء ميزانية جديدة...</p>
      </div>
    </div>
  );
}
