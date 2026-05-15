'use client';

import { useState } from 'react';
import { AlertTriangle, Download, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * بانر تحذيري يظهر في صفحات HR عندما لا يكون تطبيق HRMS مثبتاً
 * يشرح للمستخدم أن وحدة الموارد البشرية تتطلب تطبيق HRMS
 * يتضمن زر تثبيت مباشر عبر API
 */
export function HrmsRequiredBanner() {
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleInstall = async () => {
    setInstalling(true);
    setInstallResult(null);
    try {
      const res = await fetch('/api/setup/install-hrms', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setInstallResult({ success: true, message: data.message || 'تم تثبيت HRMS بنجاح' });
        toast.success(data.message || 'تم تثبيت HRMS بنجاح — أعد تحميل الصفحة');
        // انتظر قليلاً ثم أعد تحميل الصفحة لتحديث البيانات
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setInstallResult({ success: false, message: data.message || 'فشل التثبيت' });
        toast.error(data.message || 'فشل تثبيت HRMS');
      }
    } catch (error) {
      const msg = 'تعذر الاتصال بالخادم لتثبيت HRMS';
      setInstallResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setInstalling(false);
    }
  };

  const handleCheckAgain = () => {
    setInstallResult(null);
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">تطبيق HRMS غير مثبت</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            وحدة الموارد البشرية تتطلب تطبيق HRMS المنفصل. هذا التطبيق غير مثبت حالياً على الموقع.
          </p>
        </div>

        {/* زر التثبيت المباشر */}
        <div className="space-y-3">
          {installResult?.success ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">{installResult.message}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleCheckAgain} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                إعادة تحميل الصفحة
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleInstall}
              disabled={installing}
              className="gap-1.5 min-w-[180px]"
              size="lg"
            >
              {installing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري تثبيت HRMS...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  تثبيت HRMS الآن
                </>
              )}
            </Button>
          )}

          {installResult && !installResult.success && (
            <div className="flex items-start gap-2 text-destructive bg-destructive/5 rounded-lg p-3 text-start">
              <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">فشل التثبيت</p>
                <p className="text-xs mt-1 opacity-80">{installResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* تعليمات يدوية */}
        <details className="bg-muted/50 rounded-lg p-4 text-start space-y-3">
          <summary className="font-semibold text-sm cursor-pointer">
            تثبيت يدوي (إذا فشل التثبيت التلقائي)
          </summary>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside mt-3">
            <li>اذهب إلى الإعدادات ← إعداد الخادم</li>
            <li>أعد نشر الخادم مع تفعيل HRMS</li>
            <li>أو نفّذ الأوامر التالية على الخادم:</li>
          </ol>
          <code className="block bg-muted/50 px-3 py-2 rounded-lg text-[11px] font-mono mt-2" dir="ltr">
            bench --site erppro install-app hrms{'\n'}bench --site erppro migrate
          </code>
        </details>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Download className="h-3.5 w-3.5" />
          <span>يستخدم النظام تطبيق HRMS منفصل للموارد البشرية</span>
        </div>
      </div>
    </div>
  );
}
