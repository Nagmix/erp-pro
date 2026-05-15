'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Download, Loader2, CheckCircle2, XCircle, RefreshCw, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * بانر تحذيري يظهر في صفحات HR/المصروفات عندما لا يكون HRMS مثبتاً بالكامل
 * يتضمن:
 * - إذا HRMS غير مثبت: زر تثبيت مباشر
 * - إذا HRMS مثبت لكن DocTypes لم تُنشأ: تعليمات لإعادة النشر مع FORCE_SITE_MIGRATE=true
 */
export function HrmsRequiredBanner() {
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState<{
    success: boolean;
    message: string;
    docTypesCreated?: boolean;
  } | null>(null);
  const [diagnosticStatus, setDiagnosticStatus] = useState<{
    checked: boolean;
    appInstalled: boolean;
    docTypesCreated: boolean;
  }>({ checked: false, appInstalled: false, docTypesCreated: false });

  // فحص حالة HRMS التشخيصية عند التحميل
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/setup/install-hrms');
        const data = await res.json();
        if (!cancelled && data.success) {
          setDiagnosticStatus({
            checked: true,
            appInstalled: data.hrmsInstalled || false,
            docTypesCreated: data.docTypesCreated || false,
          });
        }
      } catch {
        if (!cancelled) {
          setDiagnosticStatus({ checked: false, appInstalled: false, docTypesCreated: false });
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    setInstallResult(null);
    try {
      const res = await fetch('/api/setup/install-hrms', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setInstallResult({ success: true, message: data.message || 'تم تثبيت HRMS بنجاح', docTypesCreated: data.docTypesCreated });
        toast.success(data.message || 'تم تثبيت HRMS بنجاح');
        if (data.docTypesCreated) {
          setTimeout(() => window.location.reload(), 2000);
        }
      } else {
        setInstallResult({ success: false, message: data.message || 'فشل التثبيت', docTypesCreated: data.docTypesCreated });
        toast.error(data.message || 'فشل تثبيت HRMS', { duration: 8000 });
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

  // تحديد حالة العرض
  const isPartialInstall = diagnosticStatus.checked && diagnosticStatus.appInstalled && !diagnosticStatus.docTypesCreated;
  const isNotInstalled = diagnosticStatus.checked && !diagnosticStatus.appInstalled;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="space-y-2">
          {isPartialInstall ? (
            <>
              <h2 className="text-xl font-bold">أنواع مستندات HRMS غير مكتملة</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                تطبيق HRMS مثبت على الموقع لكن أنواع المستندات (مثل مطالبة المصروفات) لم تُنشأ بعد.
                هذا يحدث عادةً عند عدم تشغيل <code className="bg-muted px-1 rounded text-xs" dir="ltr">bench migrate</code> بعد تثبيت التطبيق.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">تطبيق HRMS غير مثبت</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                وحدة الموارد البشرية تتطلب تطبيق HRMS المنفصل. هذا التطبيق غير مثبت حالياً على الموقع.
              </p>
            </>
          )}
        </div>

        {/* زر التثبيت المباشر — يظهر فقط إذا لم يكن HRMS مثبتاً */}
        {!isPartialInstall && (
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
        )}

        {/* تعليمات إعادة النشر — تظهر إذا كان HRMS مثبتاً جزئياً */}
        {isPartialInstall && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-start space-y-3">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Server className="h-5 w-5" />
              <h3 className="font-bold text-sm">الحل: إعادة نشر الخادم الخلفي</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              لإكمال تثبيت HRMS وإنشاء أنواع المستندات، يجب تشغيل migrate على الخادم الخلفي:
            </p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>
                اذهب إلى <strong>Railway</strong> ← الخادم الخلفي ← Variables
              </li>
              <li>
                أضف أو عدّل المتغير: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" dir="ltr">FORCE_SITE_MIGRATE=true</code>
              </li>
              <li>
                أعد نشر الخادم (Redeploy) — سيتم تشغيل migrate تلقائياً
              </li>
              <li>
                بعد اكتمال النشر (حوالي 3-5 دقائق)، أعد تحميل هذه الصفحة
              </li>
            </ol>
            <div className="bg-muted/50 rounded-lg p-3 mt-2">
              <p className="text-xs text-muted-foreground mb-1">أو نفّذ الأوامر التالية يدوياً على الخادم:</p>
              <code className="block text-[11px] font-mono" dir="ltr">
                bench --site erppro migrate{'\n'}bench build
              </code>
            </div>
          </div>
        )}

        {/* تعليمات يدوية — للإكمال */}
        {!isPartialInstall && (
          <details className="bg-muted/50 rounded-lg p-4 text-start space-y-3">
            <summary className="font-semibold text-sm cursor-pointer">
              تثبيت يدوي (إذا فشل التثبيت التلقائي)
            </summary>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside mt-3">
              <li>اذهب إلى Railway ← الخادم الخلفي ← Variables</li>
              <li>أضف: <code className="bg-muted px-1 rounded text-xs" dir="ltr">FORCE_SITE_MIGRATE=true</code></li>
              <li>أعد نشر الخادم (Redeploy)</li>
            </ol>
          </details>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Download className="h-3.5 w-3.5" />
          <span>يستخدم النظام تطبيق HRMS منفصل للموارد البشرية</span>
        </div>
      </div>
    </div>
  );
}
