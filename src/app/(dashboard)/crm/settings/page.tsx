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

export default function CrmSettingsPage() {
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="إعدادات إدارة العملاء"
        description="إدارة إعدادات العملاء والبوابات والتواصل"
        iconify="solar:settings-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'إدارة العملاء', href: '/crm/leads' }, { label: 'الإعدادات' }]}
      />

      <Tabs defaultValue="portal" dir="rtl">
        <TabsList>
          <TabsTrigger value="portal">بوابة العملاء</TabsTrigger>
          <TabsTrigger value="general">الإعدادات العامة</TabsTrigger>
        </TabsList>

        <TabsContent value="portal">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:monitor-smartphone-bold-duotone"
              title="بوابة العميل الداخلية"
              description="إدارة بوابة العميل الداخلية والوصول"
              href="/crm/portal"
            />
            <SettingsCard
              icon="solar:global-bold-duotone"
              title="البوابة الإلكترونية"
              description="إدارة البوابة الإلكترونية للعملاء"
              href="/portal"
            />
          </div>
        </TabsContent>

        <TabsContent value="general">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:calendar-bold-duotone"
              title="المواعيد"
              description="إدارة مواعيد العملاء والاجتماعات"
              href="/crm/appointments"
            />
            <SettingsCard
              icon="solar:chat-round-dots-bold-duotone"
              title="المتابعة"
              description="إدارة متابعة العملاء والاتصالات"
              href="/crm/follow-ups"
            />
            <SettingsCard
              icon="solar:repeat-bold-duotone"
              title="الاشتراكات"
              description="إدارة اشتراكات العملاء والتجديد"
              href="/crm/subscriptions"
            />
            <SettingsCard
              icon="solar:heart-bold-duotone"
              title="ولاء العملاء"
              description="إدارة برنامج ولاء العملاء"
              href="/crm/loyalty"
            />
            <SettingsCard
              icon="solar:stars-bold-duotone"
              title="النقاط والأرصدة"
              description="إدارة نقاط وأرصدة العملاء"
              href="/crm/credits"
            />
            <SettingsCard
              icon="solar:list-1-bold-duotone"
              title="سجل التفاعلات"
              description="عرض سجل تفاعلات العملاء"
              href="/crm/timeline"
            />
            <SettingsCard
              icon="solar:pen-new-round-bold-duotone"
              title="محرر القوالب"
              description="محرر القوالب المتقدم للرسائل"
              href="/settings/rich-templates"
            />
            <SettingsCard
              icon="solar:tuning-2-bold-duotone"
              title="حقول مخصصة"
              description="إضافة وإدارة الحقول المخصصة"
              href="/settings/custom-fields"
            />
            <SettingsCard
              icon="solar:smartphone-bold-duotone"
              title="الرسائل النصية"
              description="إعداد بوابة الرسائل النصية"
              href="/settings/sms-gateway"
            />
            <SettingsCard
              icon="solar:letter-bold-duotone"
              title="قوالب البريد"
              description="إدارة قوالب البريد الإلكتروني"
              href="/settings/email-templates"
            />
            <SettingsCard
              icon="solar:import-bold-duotone"
              title="استيراد البيانات"
              description="استيراد البيانات من ملفات Excel"
              href="/settings/excel-import"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
