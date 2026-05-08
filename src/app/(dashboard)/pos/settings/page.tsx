'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Info,
  Loader2,
  RefreshCw,
  Building2,
  CalendarClock,
  Banknote,
  Printer,
  Store,
  Monitor,
  Scale,
} from 'lucide-react';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { apiPosCheckReadiness, apiPosSetup } from '@/lib/client/api';
import type { POSReadinessResponse } from '@/lib/core/types';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/erp/page-header';

export default function PosSettingsPage() {
  const { toast } = useToast();
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [readiness, setReadiness] = useState<POSReadinessResponse | null>(null);
  const [setupActions, setSetupActions] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [settingUp, setSettingUp] = useState(false);

  const runCheck = useCallback(async () => {
    if (!company) return;
    setChecking(true);
    setSetupActions([]);
    try {
      const r = await apiPosCheckReadiness(company);
      setReadiness(r);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'فشل الفحص',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setChecking(false);
    }
  }, [company, toast]);

  const runSafeSetup = useCallback(async () => {
    if (!company) return;
    setSettingUp(true);
    try {
      const data = await apiPosSetup({
        company,
        apply_minimal_pos_settings: true,
        ensure_cash_mode_account: true,
        create_default_pos_profile_if_missing: true,
      });
      setReadiness(data.readiness);
      setSetupActions(data.setup_actions);
      toast({
        title: 'تم تنفيذ التهيئة الآمنة',
        description:
          data.setup_actions.length > 0 ? data.setup_actions.join(' · ') : 'لم يُجرَ تغيير إضافي',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'فشل التهيئة',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSettingUp(false);
    }
  }, [company, toast]);

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="إعدادات نقاط البيع"
        description="ملفات نقطة البيع (POS Profile) وطرق الدفع تُدار من إعدادات النظام المحاسبي؛ يمكن هنا فحص الجاهزية وتطبيق خطوات تهيئة آمنة لا تُنشئ شركة ولا مخطط حسابات كاملاً."
        iconify="solar:settings-bold-duotone"
        accent="amber"
        breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'الإعدادات' }]}
      />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1 rounded-xl">
          <TabsTrigger value="general" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            عام
          </TabsTrigger>
          <TabsTrigger value="readiness" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Info className="h-3.5 w-3.5 shrink-0" />
            جاهزية أولية
          </TabsTrigger>
          <TabsTrigger value="shifts" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            ورديات
          </TabsTrigger>
          <TabsTrigger value="devices" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Monitor className="h-3.5 w-3.5 shrink-0" />
            أجهزة
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Banknote className="h-3.5 w-3.5 shrink-0" />
            دفع
          </TabsTrigger>
          <TabsTrigger value="printing" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Printer className="h-3.5 w-3.5 shrink-0" />
            طباعة
          </TabsTrigger>
          <TabsTrigger value="writeoff" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Scale className="h-3.5 w-3.5 shrink-0" />
            تنازل
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-0">
          <Alert className="border-border/60 bg-muted/20">
            <Info className="h-4 w-4" />
            <AlertTitle>متطلبات التهيئة التلقائية</AlertTitle>
            <AlertDescription className="text-sm leading-relaxed">
              التهيئة التلقائية تعتمد على وجود مستودع، قائمة أسعار بيع، وحساب نقدي افتراضي للشركة؛ إن نقص أحدها
              يُكمَل الإعداد يدوياً من الروابط في التبويبات المجاورة.
            </AlertDescription>
          </Alert>
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">الشركة والعمل من التطبيق</CardTitle>
              <CardDescription>
                الشركة المختارة في الواجهة:{' '}
                {coLoading ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> جارٍ التحميل
                  </span>
                ) : company ? (
                  <strong>{company}</strong>
                ) : (
                  <span className="text-destructive">لم تُضبط شركة — من الإعدادات العامة</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/settings">الإعدادات العامة والشركة الافتراضية</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/settings/module-settings/selling">إعدادات المبيعات</Link>
              </Button>
              <Button variant="secondary" className="gap-2" asChild>
                <Link href="/pos/settings/profiles">
                  <Store className="h-4 w-4 shrink-0" />
                  إدارة ملفات نقطة البيع (POS Profile)
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readiness" className="space-y-4 mt-0">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">فحص الجاهزية وتهيئة POS Settings</CardTitle>
              <CardDescription>
                الشركة:{' '}
                {company ? (
                  <strong>{company}</strong>
                ) : (
                  <span className="text-destructive">اضبط الشركة من تبويب «عام»</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="default"
                  className="gap-2"
                  disabled={!company || checking}
                  onClick={() => void runCheck()}
                >
                  فحص الجاهزية
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  disabled={!company || settingUp}
                  onClick={() => void runSafeSetup()}
                >
                  تهيئة آمنة (POS Settings + ربط نقد + ملف POS إن أمكن)
                  {settingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                </Button>
              </div>

              {readiness && (
                <div className="space-y-3 rounded-[var(--radius-md-ui)] border border-border/60 bg-muted/15 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">الحالة:</span>
                    {readiness.ready ? (
                      <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
                        جاهز للعمل
                      </Badge>
                    ) : (
                      <Badge variant="destructive">غير جاهز — راجع القائمة</Badge>
                    )}
                  </div>

                  {readiness.issues.length > 0 && (
                    <div>
                      <p className="font-medium text-destructive mb-1">يعيق التشغيل</p>
                      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                        {readiness.issues.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {readiness.warnings && readiness.warnings.length > 0 && (
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">تنبيهات</p>
                      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                        {readiness.warnings.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {setupActions.length > 0 && (
                    <div>
                      <p className="font-medium mb-1">آخر إجراءات تنفيذية</p>
                      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                        {setupActions.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts" className="space-y-4 mt-0">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">الورديات والجلسات</CardTitle>
              <CardDescription>فتح وإغلاق الوردية من شاشة البيع أو من صفحات الجلسات</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/sales/pos">شاشة البيع</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/pos/sessions">إدارة الجلسات</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/pos/settings/shifts-devices">ورديات وأجهزة (§11.1)</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4 mt-0">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">أجهزة نقاط البيع §11.1</CardTitle>
              <CardDescription>
                كل جهاز كاشير يُمثَّل عادةً بملف POS Profile (اسم الجهاز، المستودع، قائمة الأسعار). أنشئ أو عدّل الملفات
                من القائمة ثم اربط الوردية الافتراضية من صفحة الملف إن وُجد الحقل المناسب.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="secondary" className="gap-2" asChild>
                <Link href="/pos/settings/profiles">
                  <Store className="h-4 w-4 shrink-0" />
                  قائمة ملفات نقطة البيع
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/pos/settings/shifts-devices">ورديات وأجهزة (تفصيل)</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/sales/pos">شاشة البيع</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4 mt-0">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">طرق الدفع والأسعار</CardTitle>
              <CardDescription>ربط حسابات الشركة بكل وسيلة دفع مستخدمة في ملف نقطة البيع</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/settings/payment-methods">طرق الدفع</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/settings/module-settings/selling">إعدادات المبيعات وقوائم الأسعار</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printing" className="space-y-4 mt-0">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">طباعة الإيصال</CardTitle>
              <CardDescription>
                الإيصال ومعاينة الطباعة تُدار من شاشة البيع بعد تسجيل الفاتورة؛ إعدادات الطباعة العامة من مركز
                التطبيق.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/sales/pos">الانتقال لشاشة البيع</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/settings">إعدادات الطباعة في النظام</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="writeoff" className="space-y-4 mt-0">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">التنازل عن المبالغ §11</CardTitle>
              <CardDescription>
                حد أقصى للتنازل وحساب التنازل ومركز تكلفته يُضبط عادةً على مستوى كل ملف نقطة بيع؛ توجيه الحسابات
                العامة للشركة من إعدادات المحاسبة.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="secondary" asChild>
                <Link href="/pos/settings/profiles">ملفات نقطة البيع (حدود التنازل لكل جهاز)</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/settings/account-routing">توجيه الحسابات الافتراضية</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
