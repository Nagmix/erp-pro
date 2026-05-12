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

export default function SalesSettingsPage() {
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="إعدادات المبيعات"
        description="إدارة إعدادات المبيعات والعروض والترويج"
        iconify="solar:settings-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'المبيعات', href: '/sales/dashboard' }, { label: 'الإعدادات' }]}
      />

      <Tabs defaultValue="promotions" dir="rtl">
        <TabsList>
          <TabsTrigger value="promotions">الترويج والعروض</TabsTrigger>
          <TabsTrigger value="general">الإعدادات العامة</TabsTrigger>
        </TabsList>

        <TabsContent value="promotions">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:tag-price-bold-duotone"
              title="قواعد التسعير"
              description="إعداد قواعد التسعير والخصومات التلقائية"
              href="/sales/pricing-rules"
            />
            <SettingsCard
              icon="solar:ticket-sale-bold-duotone"
              title="أكواد الخصم"
              description="إنشاء وإدارة أكواد الخصم والكوبونات"
              href="/sales/coupon-codes"
            />
          </div>
        </TabsContent>

        <TabsContent value="general">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:users-group-rounded-bold-duotone"
              title="مجموعات العملاء"
              description="تصنيف العملاء في مجموعات مختلفة"
              href="/sales/customer-groups"
            />
            <SettingsCard
              icon="solar:card-bold-duotone"
              title="طرق الدفع"
              description="إعداد طرق الدفع المتاحة"
              href="/settings/payment-methods"
            />
            <SettingsCard
              icon="solar:shield-check-bold-duotone"
              title="بوابات الدفع الإلكترونية"
              description="ربط بوابات الدفع الإلكترونية"
              href="/settings/payment-gateways"
            />
            <SettingsCard
              icon="solar:shop-bold-duotone"
              title="ربط المتاجر الإلكترونية"
              description="ربط المتاجر والمتاجر الإلكترونية"
              href="/settings/ecommerce-integration"
            />
            <SettingsCard
              icon="solar:document-text-bold-duotone"
              title="الشروط والأحكام"
              description="إعداد الشروط والأحكام للفواتير"
              href="/settings/terms-and-conditions"
            />
            <SettingsCard
              icon="solar:printer-bold-duotone"
              title="قوالب الطباعة"
              description="تخصيص قوالب طباعة المستندات"
              href="/settings/print-templates"
            />
            <SettingsCard
              icon="solar:link-round-bold-duotone"
              title="تكاملات المبيعات"
              description="ربط المبيعات مع الخدمات الخارجية"
              href="/sales/integrations"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
