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

export default function HrSettingsPage() {
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="إعدادات الموارد البشرية"
        description="إدارة إعدادات الرواتب والإجازات والعقود والتنظيم"
        iconify="solar:settings-bold-duotone"
        accent="purple"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr/dashboard' }, { label: 'الإعدادات' }]}
      />

      <Tabs defaultValue="payroll" dir="rtl">
        <TabsList>
          <TabsTrigger value="payroll">محرك الرواتب</TabsTrigger>
          <TabsTrigger value="general">الإعدادات العامة</TabsTrigger>
        </TabsList>

        <TabsContent value="payroll">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:money-bag-bold-duotone"
              title="مكوّنات الراتب"
              description="إعداد مكونات الراتب والبدلات والخصومات"
              href="/hr/salary-components"
            />
            <SettingsCard
              icon="solar:buildings-bold-duotone"
              title="هياكل الرواتب"
              description="بناء هياكل الرواتب للموظفين"
              href="/hr/salary-structures"
            />
            <SettingsCard
              icon="solar:bank-bold-duotone"
              title="صرف البنكي"
              description="إعداد صرف الرواتب عبر البنوك"
              href="/hr/bank-disbursement"
            />
          </div>
        </TabsContent>

        <TabsContent value="general">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:calendar-bold-duotone"
              title="أنواع الإجازات"
              description="إعداد أنواع الإجازات المختلفة"
              href="/hr/leave-types"
            />
            <SettingsCard
              icon="solar:clipboard-list-bold-duotone"
              title="سياسات الإجازات"
              description="إدارة سياسات وحقوق الإجازات"
              href="/hr/leave-policies"
            />
            <SettingsCard
              icon="solar:clock-circle-bold-duotone"
              title="الورديات"
              description="إعداد جداول الورديات وأوقات العمل"
              href="/hr/shifts"
            />
            <SettingsCard
              icon="solar:document-text-bold-duotone"
              title="العقود"
              description="إدارة عقود الموظفين وبنودها"
              href="/hr/contracts"
            />
            <SettingsCard
              icon="solar:sun-bold-duotone"
              title="العطلات"
              description="تحديد العطلات الرسمية والإجازات"
              href="/hr/holidays"
            />
            <SettingsCard
              icon="solar:wallet-money-bold-duotone"
              title="سلف الموظفين"
              description="إدارة السلف والعهد للموظفين"
              href="/hr/advances"
            />
            <SettingsCard
              icon="solar:hand-money-bold-duotone"
              title="قروض الموظفين"
              description="إدارة قروض الموظفين وأقساطها"
              href="/hr/loans"
            />
            <SettingsCard
              icon="solar:file-check-bold-duotone"
              title="مستندات الموظفين"
              description="إدارة مستندات ووثائق الموظفين"
              href="/hr/employee-documents"
            />
            <SettingsCard
              icon="solar:chat-round-dots-bold-duotone"
              title="طلبات الموظفين"
              description="إدارة طلبات واستفسارات الموظفين"
              href="/hr/employee-requests"
            />
            <SettingsCard
              icon="solar:organisation-bold-duotone"
              title="الهيكل التنظيمي"
              description="إعداد وإدارة الهيكل التنظيمي"
              href="/hr/org-chart"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
