'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BarChart3, History, ShoppingCart, CalendarClock, Receipt, Settings2, Undo2, Info } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';

const tiles = [
  {
    href: '/pos/sell',
    title: 'بدء البيع',
    description: 'شاشة الكاشير، السلة، الوردية، والمرتجعات من الشاشة',
    icon: ShoppingCart,
  },
  {
    href: '/pos/returns',
    title: 'مرتجعات',
    description: 'اختيار فاتورة أصلية وإنشاء مرتجع مرتبط',
    icon: Undo2,
  },
  {
    href: '/pos/sessions',
    title: 'إدارة الجلسات',
    description: 'عرض فتح وإغلاق الورديات وسجل الجلسات',
    icon: CalendarClock,
  },
  {
    href: '/pos/past-orders',
    title: 'طلبات سابقة',
    description: 'آخر فواتير نقطة البيع مع تصفية اختيارية',
    icon: History,
  },
  {
    href: '/pos/reports',
    title: 'تقارير نقاط البيع',
    description: 'اختصارات إلى مركز التقارير: سجل POS، مبيعات، مخزون، مدفوعات',
    icon: BarChart3,
  },
  {
    href: '/pos/invoices',
    title: 'فواتير نقطة البيع',
    description: 'قائمة فواتير POS المرحّلة',
    icon: Receipt,
  },
  {
    href: '/pos/settings',
    title: 'إعدادات نقاط البيع',
    description: 'ربط مع ملفات نقطة البيع والسياسات في النظام',
    icon: Settings2,
  },
] as const;

export default function PosHubPage() {
  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="نقاط البيع"
        description="بوابة الوحدة: البيع السريع، الجلسات، والفواتير — كلها ضمن نفس النظام دون خطوات خارجية."
        iconify="solar:cart-large-2-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'نقاط البيع' }]}
      />

      <Alert className="border-border/60 bg-muted/20 max-w-3xl">
        <Info className="h-4 w-4" />
        <AlertTitle>مبدأ العمل</AlertTitle>
        <AlertDescription className="text-sm leading-relaxed">
          البيع يتم عبر فاتورة نقطة البيع ضمن وردية مفتوحة؛ تُجمّع القيود المحاسبية الرئيسية عند{' '}
          <strong>إغلاق الوردية</strong> (إدخال إغلاق نقطة البيع) بحسب إعدادات النظام، وليس مع كل فاتورة
          على حدة.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group block rounded-[var(--radius-md-ui)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
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
                <span className="text-xs font-medium text-primary/90 group-hover:underline">فتح ←</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
