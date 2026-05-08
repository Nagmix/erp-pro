'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent } from '@/components/ui/card';
import { useDocList } from '@/lib/client/hooks';
import { Building2, Layers, Home, Calendar, FileText, ArrowLeft } from 'lucide-react';

type ContractRow = {
  name: string;
  status?: string;
  party_name?: string;
  start_date?: string;
  end_date?: string;
};

type ItemRow = {
  name: string;
  item_code: string;
  item_name?: string;
  item_group?: string;
  disabled?: number;
};

const quickLinks = [
  {
    title: 'أنواع الوحدات',
    description: 'إدارة تصنيفات وحدات الإيجار',
    href: '/operations/rentals/unit-types',
    icon: Layers,
    accent: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    title: 'وحدات الإيجار',
    description: 'إدارة وحدات الإيجار المتاحة',
    href: '/operations/rentals/units',
    icon: Home,
    accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    title: 'أوامر الحجز',
    description: 'إدارة حجوزات وحدات الإيجار',
    href: '/operations/rentals/bookings',
    icon: Calendar,
    accent: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    title: 'عقود الإيجار',
    description: 'إدارة عقود الإيجار التفصيلية',
    href: '/operations/rentals/contracts',
    icon: FileText,
    accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
] as const;

export default function RentalsDashboardPage() {
  const contractsList = useDocList<ContractRow>('Contract', {
    fields: ['name', 'status', 'party_name', 'start_date', 'end_date'],
    order_by: 'modified desc',
    limit: 500,
  });

  const itemsList = useDocList<ItemRow>('Item', {
    fields: ['name', 'item_code', 'item_name', 'item_group', 'disabled'],
    filters: [['disabled', '=', '0']],
    limit: 500,
  });

  const stats = useMemo(() => {
    const contracts = contractsList.data ?? [];
    const items = itemsList.data ?? [];
    const activeContracts = contracts.filter((c) =>
      ['Signed', 'Active'].includes(String(c.status ?? ''))
    ).length;
    const bookedItems = items.filter(
      (i) => String(i.item_group ?? '').includes('إيجار') || String(i.item_group ?? '').toLowerCase().includes('rental')
    ).length;
    const availableItems = items.length - bookedItems;
    return {
      totalUnits: items.length,
      available: Math.max(0, availableItems),
      booked: bookedItems,
      activeContracts,
    };
  }, [contractsList.data, itemsList.data]);

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="إدارة الإيجارات"
        description="لوحة تحكم شاملة لإدارة وحدات الإيجار والحجوزات والعقود"
        iconify="solar:buildings-3-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'التشغيل' }, { label: 'إدارة الإيجارات' }]}
      />

      {(contractsList.isError || itemsList.isError) && (
        <ListQueryAlert
          error={(contractsList.error ?? itemsList.error) as Error}
          onRetry={() => {
            void contractsList.refetch();
            void itemsList.refetch();
          }}
        />
      )}

      {/* KPI Cards */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي الوحدات"
          value={stats.totalUnits}
          icon={Building2}
          accent="info"
          description="جميع الأصناف المسجلة في النظام"
        />
        <KpiCard
          title="الوحدات المتاحة"
          value={stats.available}
          icon={Home}
          accent="success"
          description="وحدات غير محجوزة متاحة للإيجار"
        />
        <KpiCard
          title="محجوزة"
          value={stats.booked}
          icon={Calendar}
          accent="warning"
          description="وحدات مشغولة حالياً"
        />
        <KpiCard
          title="عقود نشطة"
          value={stats.activeContracts}
          icon={FileText}
          accent="primary"
          description="عقود موقّعة أو سارية"
        />
      </KpiStrip>

      {/* Quick Links Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">الوصول السريع</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => {
            const IconComp = link.icon;
            return (
              <Link key={link.href} href={link.href} className="group">
                <Card className="h-full border-border/40 bg-card/80 backdrop-blur-sm hover:border-border hover:shadow-md transition-all duration-200">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${link.accent}`}>
                        <IconComp className="h-5 w-5" />
                      </div>
                      <ArrowLeft className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {link.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                        {link.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
