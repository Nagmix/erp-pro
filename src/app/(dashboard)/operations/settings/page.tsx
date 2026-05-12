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

export default function OperationsSettingsPage() {
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="إعدادات العمليات"
        description="إدارة إعدادات العمليات والتطوير والإيجارات"
        iconify="solar:settings-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'العمليات', href: '/operations/approvals' }, { label: 'الإعدادات' }]}
      />

      <Tabs defaultValue="developer" dir="rtl">
        <TabsList>
          <TabsTrigger value="developer">أدوات المطور</TabsTrigger>
          <TabsTrigger value="rentals">إدارة الإيجارات</TabsTrigger>
        </TabsList>

        <TabsContent value="developer">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:code-bold-duotone"
              title="واجهة برمجة التطبيقات"
              description="إدارة واجهة برمجة التطبيقات والوصول"
              href="/operations/developer-api"
            />
          </div>
        </TabsContent>

        <TabsContent value="rentals">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:buildings-2-bold-duotone"
              title="وحدات الإيجار"
              description="إدارة وحدات الإيجار المتاحة"
              href="/operations/rentals/units"
            />
            <SettingsCard
              icon="solar:clipboard-check-bold-duotone"
              title="أوامر الحجز"
              description="إدارة أوامر حجز وحدات الإيجار"
              href="/operations/rentals/bookings"
            />
            <SettingsCard
              icon="solar:document-text-bold-duotone"
              title="عقود الإيجار"
              description="إدارة عقود الإيجار والاتفاقيات"
              href="/operations/rentals/contracts"
            />
            <SettingsCard
              icon="solar:widget-5-bold-duotone"
              title="أنواع الوحدات"
              description="إعداد أنواع وتصنيفات وحدات الإيجار"
              href="/operations/rentals/unit-types"
            />
            <SettingsCard
              icon="solar:tag-price-bold-duotone"
              title="قواعد التسعير"
              description="إعداد قواعد تسعير وحدات الإيجار"
              href="/operations/rentals/pricing-rules"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
