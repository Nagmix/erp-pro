'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/erp/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Truck, Route, Building2, Package, BookMarked, Code2, Users, Puzzle, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  {
    href: '/settings/module-settings/selling',
    title: 'إعدادات المبيعات',
    desc: 'إعدادات البيع: الافتراضيات، التسعير، نقاط البيع، والسلوك',
    icon: ShoppingCart,
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  },
  {
    href: '/settings/module-settings/buying',
    title: 'إعدادات المشتريات',
    desc: 'إعدادات الشراء: الموردون، قوائم الأسعار، وسلوك الشراء',
    icon: Truck,
    color: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
  },
  {
    href: '/settings/module-settings/stock',
    title: 'إعدادات المخزون',
    desc: 'إعدادات المخزون: التقييم، المستودع الافتراضي، والكميات',
    icon: Package,
    color: 'bg-cyan-500/10 text-cyan-800 dark:text-cyan-200',
  },
  {
    href: '/settings/module-settings/accounts',
    title: 'إعدادات المحاسبة',
    desc: 'إعدادات المحاسبة: المخزون الدائم، التقريب، والإلغاء',
    icon: BookMarked,
    color: 'bg-green-500/10 text-green-800 dark:text-green-200',
  },
  {
    href: '/settings/module-settings/hr',
    title: 'إعدادات الموارد البشرية',
    desc: 'إعدادات الموارد البشرية: الإجازات، الرواتب، والحضور',
    icon: Users,
    color: 'bg-fuchsia-500/10 text-fuchsia-800 dark:text-fuchsia-200',
  },
  {
    href: '/settings/product-extensions',
    title: 'امتدادات المنتج',
    desc: 'رسائل نصية، متاجر إلكترونية، وجدولة تقارير محلية',
    icon: Puzzle,
    color: 'bg-indigo-500/10 text-indigo-800 dark:text-indigo-200',
  },
  {
    href: '/settings/rich-templates',
    title: 'محرر القوالب المرئية',
    desc: 'محرر نصوص غني مع معاينة مباشرة وحفظ محلي',
    icon: PenLine,
    color: 'bg-sky-500/10 text-sky-800 dark:text-sky-200',
  },
  {
    href: '/settings/account-routing',
    title: 'توجيه الحسابات',
    desc: 'حسابات GL الافتراضية للشركة',
    icon: Route,
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  {
    href: '/settings/branches',
    title: 'الفروع',
    desc: 'إدارة الفروع والتصفية حسب الفرع في القوائم',
    icon: Building2,
    color: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  {
    href: '/operations/developer-api',
    title: 'واجهة المطورين',
    desc: 'مفاتيح وتجارب وخطافات ويب مع حفظ محلي',
    icon: Code2,
    color: 'bg-slate-500/10 text-slate-800 dark:text-slate-200',
  },
];

export default function ModuleSettingsHubPage() {
  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="إعدادات الوحدات"
        description="إعدادات الوحدات الأساسية: المبيعات، المشتريات، المخزون، المحاسبة، الفروع، وربط المطور"
        iconify="solar:widget-5-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'إعدادات الوحدات' }]}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="border-border/40 h-full transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="p-4 flex gap-3 items-start">
                  <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', item.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">{item.title}</h2>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
