'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CreditCard,
  LayoutGrid,
  Package,
  Receipt,
  ShoppingCart,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';

/** تقارير من `REPORTS_CATALOG` — مجموعة «بيع» تسمح لها أدوار البيع في الكتالوج. */
const LINKS_SALES = [
  {
    href: '/reports?openReport=pos-transactions',
    title: 'سجل نقاط البيع',
    description: 'حركة فواتير نقطة البيع ضمن الفترة والشركة.',
    icon: ShoppingCart,
  },
  {
    href: '/reports?openReport=sales-by-product',
    title: 'مبيعات حسب المنتج',
    description: 'تفصيل المبيعات مع الأصناف (المبيعات اليومية §10.1).',
    icon: LayoutGrid,
  },
  {
    href: '/reports?openReport=sales-by-customer',
    title: 'مبيعات حسب العميل',
    description: 'تحليل المبيعات حسب العملاء في الفترة.',
    icon: Building2,
  },
  {
    href: '/reports?openReport=sales-by-rep',
    title: 'مبيعات حسب المندوب',
    description: 'أداء البيع حسب المندوب/المستخدم في الفترة.',
    icon: Users,
  },
  {
    href: '/reports?openReport=sales-profit',
    title: 'إجمالي الربح',
    description: 'هامش وربحية المبيعات في الفترة.',
    icon: BarChart3,
  },
] as const;

/** تقارير إضافية تتطلب صلاحيات محاسبة أو مخزون في الكتالوج — نفس مركز التقارير. */
const LINKS_EXTENDED = [
  {
    href: '/reports?openReport=payment-splits',
    title: 'دفتر المدفوعات',
    description: 'تفصيل المحصل حسب طريقة الدفع (محاسبة).',
    icon: CreditCard,
  },
  {
    href: '/reports?openReport=sales-register',
    title: 'سجل المبيعات (ضريبي)',
    description: 'سجل ضريبي للمراجعة (صلاحية محاسبة).',
    icon: Receipt,
  },
  {
    href: '/reports?openReport=stock-ledger',
    title: 'حركة المخزون',
    description: 'حركة الأصناف في الفترة (صلاحية مخزون).',
    icon: Package,
  },
] as const;

export default function PosReportsHubPage() {
  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="تقارير نقاط البيع"
        description="اختصارات إلى نفس مركز التقارير العام مع تقارير مبيعات ومخزون ومدفوعات مناسبة لمراجعة الجلسات والأداء — يمكن ضبط الشركة والفترة بعد الانتقال."
        iconify="solar:chart-2-bold-duotone"
        accent="purple"
        breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'تقارير' }]}
      />

      <Card className="border-primary/15 bg-primary/[0.03]">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md-ui)] bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold">مركز التقارير الكامل</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                جميع التقارير المتاحة حسب صلاحياتك في النظام.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" className="shrink-0">
            <Link href="/reports">فتح مركز التقارير</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">مبيعات ونقطة البيع</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {LINKS_SALES.map(({ href, title, description, icon: Icon }) => (
            <ReportTile key={href} href={href} title={title} description={description} Icon={Icon} />
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <h2 className="text-sm font-semibold text-muted-foreground">محاسبة ومخزون (حسب الصلاحية)</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS_EXTENDED.map(({ href, title, description, icon: Icon }) => (
            <ReportTile key={href} href={href} title={title} description={description} Icon={Icon} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportTile({
  href,
  title,
  description,
  Icon,
}: {
  href: string;
  title: string;
  description: string;
  Icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-[var(--radius-md-ui)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full border-border/60 bg-card transition-colors hover:border-border hover:bg-muted/30">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md-ui)] bg-primary/8 text-primary ring-1 ring-border/50">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base font-semibold leading-snug group-hover:text-primary transition-colors">
              {title}
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <span className="text-xs font-medium text-primary/90 group-hover:underline">تشغيل التقرير ←</span>
        </CardContent>
      </Card>
    </Link>
  );
}
