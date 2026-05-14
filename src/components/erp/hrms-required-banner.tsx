'use client';

import { AlertTriangle, Download } from 'lucide-react';

/**
 * بانر تحذيري يظهر في صفحات HR عندما لا يكون تطبيق HRMS مثبتاً
 * يشرح للمستخدم أن وحدة الموارد البشرية تتطلب تطبيق HRMS
 */
export function HrmsRequiredBanner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">تطبيق HRMS غير مثبت</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            وحدة الموارد البشرية تتطلب تطبيق HRMS المنفصل. هذا التطبيق غير مثبت حالياً على الخادم.
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-start space-y-3">
          <h3 className="font-semibold text-sm">لتثبيت HRMS:</h3>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>اذهب إلى الإعدادات ← إعداد الخادم</li>
            <li>أعد نشر الخادم مع تفعيل HRMS</li>
            <li>أو أعد تشغيل الحاوية (Container) لتثبيت HRMS تلقائياً</li>
          </ol>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Download className="h-3.5 w-3.5" />
          <span>يستخدم النظام تطبيق HRMS منفصل للموارد البشرية</span>
        </div>
      </div>
    </div>
  );
}
