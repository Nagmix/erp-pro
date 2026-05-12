'use client';

import { PageHeader } from '@/components/erp/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ModernIcon } from '@/components/ui/modern-icon';
import Link from 'next/link';

function SettingsCard({ icon, title, description, href }: { icon: string; title: string; description: string; href: string }) {
  return (
    <Link href={href}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer group h-full">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <ModernIcon iconify={icon} className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm leading-tight">{title}</div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate">{description}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AccountingSettingsPage() {
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="إعدادات المحاسبة"
        description="إدارة إعدادات وعمومات المحاسبة والمالية"
        iconify="solar:settings-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting/dashboard' }, { label: 'الإعدادات' }]}
      />

      <Tabs defaultValue="operations" dir="rtl">
        <TabsList>
          <TabsTrigger value="operations">عمليات المحاسبة</TabsTrigger>
          <TabsTrigger value="general">الإعدادات العامة</TabsTrigger>
          <TabsTrigger value="tax">الضرائب والفواتير</TabsTrigger>
        </TabsList>

        <TabsContent value="operations">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:transfer-horizontal-bold-duotone"
              title="التحويل بين الخزائن"
              description="تحويل الأموال بين الخزائن المختلفة"
              href="/accounting/treasury-transfer"
            />
            <SettingsCard
              icon="solar:wallet-money-bold-duotone"
              title="المصاريف اليومية"
              description="تسجيل ومتابعة المصاريف اليومية"
              href="/accounting/daily-expenses"
            />
            <SettingsCard
              icon="solar:lock-keyhole-bold-duotone"
              title="الإغلاق اليومي للخزنة"
              description="إغلاق رصيد الخزنة في نهاية اليوم"
              href="/accounting/treasury-closing"
            />
            <SettingsCard
              icon="solar:calendar-bold-duotone"
              title="إقفال الفترة"
              description="إقفال الفترات المحاسبية ومنع التعديل"
              href="/accounting/period-closing"
            />
            <SettingsCard
              icon="solar:bank-bold-duotone"
              title="التسوية البنكية"
              description="مطابقة كشوف الحسابات البنكية"
              href="/accounting/bank-reconciliation"
            />
            <SettingsCard
              icon="solar:refresh-circle-bold-duotone"
              title="القيود المتكررة"
              description="إدارة القيود المحاسبية المتكررة"
              href="/accounting/recurring-entries"
            />
            <SettingsCard
              icon="solar:shield-keyhole-bold-duotone"
              title="صلاحيات الخزائن"
              description="إدارة صلاحيات الوصول للخزائن"
              href="/accounting/vault-permissions"
            />
            <SettingsCard
              icon="solar:scale-bold-duotone"
              title="الأرصدة الافتتاحية"
              description="إعداد الأرصدة الافتتاحية للحسابات"
              href="/accounting/opening-balances"
            />
            <SettingsCard
              icon="solar:document-text-bold-duotone"
              title="السجل المالي الموحد"
              description="عرض السجل المالي الموحد للشركة"
              href="/accounting/financial-register"
            />
          </div>
        </TabsContent>

        <TabsContent value="general">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:routing-bold-duotone"
              title="توجيه الحسابات"
              description="إعداد توجيه الحسابات الافتراضية"
              href="/settings/account-routing"
            />
            <SettingsCard
              icon="solar:calendar-mark-bold-duotone"
              title="السنوات المالية"
              description="إدارة السنوات المالية والفترات"
              href="/accounting/fiscal-year"
            />
            <SettingsCard
              icon="solar:clock-circle-bold-duotone"
              title="الإيرادات المؤجلة"
              description="إدارة الإيرادات المؤجلة والمعترف بها"
              href="/accounting/deferred-revenue"
            />
            <SettingsCard
              icon="solar:dollar-minimalistic-bold-duotone"
              title="متعدد العملات"
              description="إعدادات العملات وأسعار الصرف"
              href="/accounting/multi-currency"
            />
            <SettingsCard
              icon="solar:card-recive-bold-duotone"
              title="الشيكات والدفاتر"
              description="إدارة الشيكات ودفاتر الشيكات"
              href="/accounting/cheque-books"
            />
            <SettingsCard
              icon="solar:lock-bold-duotone"
              title="إقفال الفترات المتقدم"
              description="إقفال متقدم للفترات المحاسبية"
              href="/accounting/period-closing-v2"
            />
            <SettingsCard
              icon="solar:chart-bold-duotone"
              title="الميزانيات"
              description="إعداد ومتابعة الميزانيات"
              href="/accounting/budgets"
            />
          </div>
        </TabsContent>

        <TabsContent value="tax">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:percent-bold-duotone"
              title="معدلات الضريبة"
              description="إعداد معدلات الضرائب المختلفة"
              href="/settings/tax-rates"
            />
            <SettingsCard
              icon="solar:clipboard-list-bold-duotone"
              title="قواعد الضرائب"
              description="إعداد قواعد تطبيق الضرائب"
              href="/settings/tax-rules"
            />
            <SettingsCard
              icon="solar:document-bold-duotone"
              title="الإقرار الضريبي"
              description="إعداد وتقديم الإقرارات الضريبية"
              href="/accounting/tax-declaration"
            />
            <SettingsCard
              icon="solar:flag-bold-duotone"
              title="تكوين الضرائب اليمنية"
              description="إعدادات الضرائب الخاصة باليمن"
              href="/settings/yemen-tax-config"
            />
            <SettingsCard
              icon="solar:bell-bold-duotone"
              title="قواعد الإرسال الآلي"
              description="إعداد قواعد التنبيهات والإرسال الآلي"
              href="/settings/notification-rules"
            />
            <SettingsCard
              icon="solar:letter-bold-duotone"
              title="إعدادات البريد SMTP"
              description="تكوين خادم البريد الإلكتروني"
              href="/settings/email-smtp"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
