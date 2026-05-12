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

export default function PosSettingsPage() {
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="إعدادات نقاط البيع"
        description="إدارة إعدادات وتهيئة نقاط البيع"
        iconify="solar:settings-bold-duotone"
        accent="amber"
        breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'الإعدادات' }]}
      />

      <Tabs defaultValue="setup" dir="rtl">
        <TabsList>
          <TabsTrigger value="setup">الإعداد</TabsTrigger>
          <TabsTrigger value="general">الإعدادات العامة</TabsTrigger>
        </TabsList>

        <TabsContent value="setup">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:magic-stick-3-bold-duotone"
              title="معالج الإعداد"
              description="معالج الإعداد التدريجي لنقاط البيع"
              href="/pos/setup-wizard"
            />
          </div>
        </TabsContent>

        <TabsContent value="general">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:cart-large-bold-duotone"
              title="إعدادات المبيعات"
              description="إعدادات المبيعات وقوائم الأسعار"
              href="/settings/module-settings/selling"
            />
            <SettingsCard
              icon="solar:card-bold-duotone"
              title="طرق الدفع"
              description="إعداد طرق الدفع المتاحة في نقاط البيع"
              href="/settings/payment-methods"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
