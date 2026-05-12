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

export default function InventorySettingsPage() {
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="إعدادات المخزون"
        description="إدارة إعدادات المخزون والأصناف والامتدادات"
        iconify="solar:settings-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المخزون', href: '/inventory/dashboard' }, { label: 'الإعدادات' }]}
      />

      <Tabs defaultValue="general" dir="rtl">
        <TabsList>
          <TabsTrigger value="general">الإعدادات العامة</TabsTrigger>
          <TabsTrigger value="extensions">امتدادات</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:folder-with-files-bold-duotone"
              title="مجموعات الأصناف"
              description="تصنيف الأصناف والمنتجات في مجموعات"
              href="/inventory/item-groups"
            />
            <SettingsCard
              icon="solar:transfer-horizontal-bold-duotone"
              title="التحويل بين الفروع"
              description="تحويل المخزون بين الفروع والمستودعات"
              href="/inventory/inter-branch-transfer"
            />
            <SettingsCard
              icon="solar:clipboard-check-bold-duotone"
              title="الأذون المخزنية"
              description="إدارة الأذون المخزنية والتصاريح"
              href="/inventory/permits"
            />
            <SettingsCard
              icon="solar:widget-5-bold-duotone"
              title="متغيرات المنتج"
              description="إدارة متغيرات وأبعاد المنتجات"
              href="/inventory/item-variants"
            />
          </div>
        </TabsContent>

        <TabsContent value="extensions">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:puzzle-piece-bold-duotone"
              title="امتدادات المنتج"
              description="إدارة امتدادات وحقول المنتجات الإضافية"
              href="/settings/product-extensions"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
