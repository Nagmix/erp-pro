'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from '@/components/ui/tooltip';
import {
 ShoppingCart,
 Truck,
 Route,
 Building2,
 Package,
 BookMarked,
 Code2,
 Users,
 Puzzle,
 PenLine,
 Store,
 Factory,
 Heart,
 BarChart3,
 Server,
 Shield,
 UserCog,
 Building,
 CheckCircle2,
 AlertCircle,
 ArrowLeft,
 Settings2,
 Database,
 Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDocList } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';

/* ─── Types ─── */
type CountRow = { name: string };

/* ─── Module links configuration ─── */
const moduleLinks = [
 {
 href: '/settings/module-settings/selling',
 title: 'إعدادات المبيعات',
 desc: 'إعدادات البيع: الافتراضات، التسعير، نقاط البيع، والسلوك',
 icon: ShoppingCart,
 color: 'bg-chart-1/10 text-chart-1',
 gradient: 'from-chart-1/5 to-transparent',
 doctype: 'Selling Settings',
 tooltip: 'تخصيص سلوك المبيعات وقوائم الأسعار وعرض الأسعار',
 },
 {
 href: '/settings/module-settings/buying',
 title: 'إعدادات المشتريات',
 desc: 'إعدادات الشراء: الموردون، قوائم الأسعار، وسلوك الشراء',
 icon: Truck,
 color: 'bg-chart-2/10 text-chart-2',
 gradient: 'from-chart-2/5 to-transparent',
 doctype: 'Buying Settings',
 tooltip: 'تحديد سلوك المشتريات وتقييم الموردين',
 },
 {
 href: '/settings/module-settings/stock',
 title: 'إعدادات المخزون',
 desc: 'إعدادات المخزون: التقييم، المستودع الافتراضي، والكميات',
 icon: Package,
 color: 'bg-chart-1/10 text-chart-1',
 gradient: 'from-chart-1/5 to-transparent',
 doctype: 'Stock Settings',
 tooltip: 'تخصيص تقييم المخزون وطرق الجرد والمستودعات',
 },
 {
 href: '/settings/module-settings/accounts',
 title: 'إعدادات المحاسبة',
 desc: 'إعدادات المحاسبة: المخزون الدائم، التقريب، والإلغاء',
 icon: BookMarked,
 color: 'bg-chart-3/10 text-chart-3',
 gradient: 'from-chart-3/5 to-transparent',
 doctype: 'Accounts Settings',
 tooltip: 'تحديد سلوك القيود المحاسبية والإقفال والتقريب',
 },
 {
 href: '/settings/module-settings/hr',
 title: 'إعدادات الموارد البشرية',
 desc: 'إعدادات الموارد البشرية: الإجازات، الرواتب، والحضور',
 icon: Users,
 color: 'bg-chart-5/10 text-chart-5',
 gradient: 'from-chart-5/5 to-transparent',
 doctype: 'HR Settings',
 tooltip: 'إدارة الإجازات والحضور وهياكل الرواتب',
 },
 {
 href: '/settings/module-settings/pos',
 title: 'إعدادات نقاط البيع',
 desc: 'إعدادات نقاط البيع: الملفات، الورديات، وطرق الدفع',
 icon: Store,
      color: 'bg-chart-3/10 text-chart-3',
 gradient: 'from-chart-3/5 to-transparent',
 doctype: 'POS Profile',
 tooltip: 'تهيئة نقاط البيع والورديات وملفات التعريف',
 },
 {
 href: '/settings/module-settings/manufacturing',
 title: 'إعدادات التصنيع',
 desc: 'إعدادات التصنيع: قوائم المواد، محطات العمل، وأوامر الإنتاج',
 icon: Factory,
 color: 'bg-chart-3/10 text-chart-3',
 gradient: 'from-chart-3/5 to-transparent',
 doctype: 'Manufacturing Settings',
 tooltip: 'تخصيص أوامر الإنتاج ومحطات العمل وقوائم المواد',
 },
 {
 href: '/settings/module-settings/crm',
 title: 'إعدادات إدارة العملاء',
 desc: 'إعدادات CRM: العملاء المحتملون، الفرص، والمتابعة',
 icon: Heart,
 color: 'bg-chart-5/10 text-chart-5',
 gradient: 'from-chart-5/5 to-transparent',
 doctype: 'CRM Settings',
 tooltip: 'إدارة العملاء المحتملين والفرص وأنشطة المتابعة',
 },
 {
 href: '/settings/module-settings/reports',
 title: 'إعدادات التقارير',
 desc: 'إعدادات التقارير: التقارير المخصصة، الجدولة، والتصدير',
 icon: BarChart3,
 color: 'bg-chart-5/10 text-chart-5',
 gradient: 'from-chart-5/5 to-transparent',
 doctype: 'Report',
 tooltip: 'تخصيص التقارير وجدولتها وتصديرها',
 },
];

const extensionLinks = [
 {
 href: '/settings/product-extensions',
 title: 'امتدادات المنتج',
 desc: 'رسائل نصية، متاجر إلكترونية، وجدولة تقارير محلية',
 icon: Puzzle,
 color: 'bg-chart-1/10 text-chart-1',
 gradient: 'from-chart-1/5 to-transparent',
 },
 {
 href: '/settings/rich-templates',
 title: 'محرر القوالب المرئية',
 desc: 'محرر نصوص غني مع معاينة مباشرة وحفظ محلي',
 icon: PenLine,
      color: 'bg-chart-1/10 text-chart-1',
 gradient: 'from-chart-1/5 to-transparent',
 },
 {
 href: '/settings/account-routing',
 title: 'توجيه الحسابات',
 desc: 'حسابات GL الافتراضية للشركة',
 icon: Route,
 color: 'bg-chart-3/10 text-chart-3',
 gradient: 'from-chart-3/5 to-transparent',
 },
 {
 href: '/settings/branches',
 title: 'الفروع',
 desc: 'إدارة الفروع والتصفية حسب الفرع في القوائم',
 icon: Building2,
 color: 'bg-chart-5/10 text-chart-5',
 gradient: 'from-chart-5/5 to-transparent',
 },
 {
 href: '/operations/developer-api',
 title: 'واجهة المطورين',
 desc: 'مفاتيح وتجارب وخطافات ويب مع حفظ محلي',
 icon: Code2,
 color: 'bg-muted text-muted-foreground',
 gradient: 'from-muted/5 to-transparent',
 },
];

const systemLinks = [
 {
 href: '/settings/erp-backend',
 title: 'خادم ERPNext',
 desc: 'إعدادات الاتصال بخادم ERPNext الخلفي',
 icon: Server,
 color: 'bg-destructive/10 text-destructive',
 },
 {
 href: '/settings/companies',
 title: 'الشركات',
 desc: 'إدارة الشركات المسجلة في النظام',
 icon: Building,
 color: 'bg-chart-4/10 text-chart-4',
 },
 {
 href: '/settings/users',
 title: 'المستخدمون',
 desc: 'إدارة حسابات المستخدمين وصلاحياتهم',
 icon: UserCog,
 color: 'bg-chart-1/10 text-chart-1',
 },
 {
 href: '/settings/role-permissions',
 title: 'صلاحيات الأدوار',
 desc: 'تحديد أدوار المستخدمين وصلاحيات الوصول',
 icon: Shield,
 color: 'bg-chart-5/10 text-chart-5',
 },
];

const quickSetupLinks = [
 {
 href: '/settings/module-settings/accounts',
 title: 'إعداد المحاسبة',
 icon: BookMarked,
 color: 'text-chart-3 bg-chart-3/10',
 },
 {
 href: '/settings/account-routing',
 title: 'توجيه الحسابات',
 icon: Route,
 color: 'text-chart-3 bg-chart-3/10',
 },
 {
 href: '/settings/module-settings/selling',
 title: 'إعداد المبيعات',
 icon: ShoppingCart,
 color: 'text-chart-1 bg-chart-1/10',
 },
 {
 href: '/settings/module-settings/stock',
 title: 'إعداد المخزون',
 icon: Package,
 color: 'text-chart-1 bg-chart-1/10',
 },
 {
 href: '/settings/companies',
 title: 'الشركات',
 icon: Building,
 color: 'text-chart-4 bg-chart-4/10',
 },
 {
 href: '/settings/users',
 title: 'المستخدمون',
 icon: UserCog,
 color: 'text-chart-1 bg-chart-1/10',
 },
];

/* ─── Main Component ─── */
export default function ModuleSettingsHubPage() {
 const { company, isLoading: companyLoading } = useDefaultCompanyName();

 // Fetch counts for system health indicators
 const customersList = useDocList<CountRow>('Customer', {
 fields: ['name'],
 limit: 1,
 });

 const suppliersList = useDocList<CountRow>('Supplier', {
 fields: ['name'],
 limit: 1,
 });

 const itemsList = useDocList<CountRow>('Item', {
 fields: ['name'],
 filters: [['disabled', '=', '0']],
 limit: 1,
 });

 const accountsList = useDocList<CountRow>('Account', {
 fields: ['name'],
 limit: 1,
 });

 const warehousesList = useDocList<CountRow>('Warehouse', {
 fields: ['name'],
 limit: 1,
 });

 const employeesList = useDocList<CountRow>('Employee', {
 fields: ['name'],
 limit: 1,
 });

 const hasError = customersList.isError || suppliersList.isError || itemsList.isError;

 // System health counts
 const healthCounts = useMemo(() => ({
 customers: customersList.data?.length ?? 0,
 suppliers: suppliersList.data?.length ?? 0,
 items: itemsList.data?.length ?? 0,
 accounts: accountsList.data?.length ?? 0,
 warehouses: warehousesList.data?.length ?? 0,
 employees: employeesList.data?.length ?? 0,
 }), [customersList.data, suppliersList.data, itemsList.data, accountsList.data, warehousesList.data, employeesList.data]);

 // Total count for KPI
 const totalConfigured = useMemo(() => {
 return Object.values(healthCounts).filter(v => v > 0).length;
 }, [healthCounts]);

 return (
 <div dir="rtl" className="erp-page-enter space-y-5">
  <PageHeader
  title="إعدادات الوحدات"
  description="إعدادات الوحدات الأساسية: المبيعات، المشتريات، المخزون، المحاسبة، الفروع، وربط المطور"
  iconify="solar:widget-5-bold-duotone"
  accent="info"
  breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'إعدادات الوحدات' }]}
  />

  {hasError && (
  <ListQueryAlert
   error={(customersList.error ?? suppliersList.error ?? itemsList.error) as Error}
   onRetry={() => {
   void customersList.refetch();
   void suppliersList.refetch();
   void itemsList.refetch();
   }}
  />
  )}

  {/* ════════════════════════════════════════════════════════
   Company Info Card
   ════════════════════════════════════════════════════════ */}
  <Card className="border-border/40 overflow-hidden">
  <div className="bg-gradient-to-l from-info/5 via-primary/3 to-transparent">
   <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
   <div className="h-12 w-12 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0">
    <Building2 className="h-6 w-6" />
   </div>
   <div className="flex-1 min-w-0">
    <h3 className="text-sm font-semibold text-foreground">الشركة النشطة</h3>
    <p className="text-lg font-bold text-primary mt-0.5 truncate">
    {companyLoading ? 'جاري التحميل...' : company || 'لم يتم تحديد شركة'}
    </p>
    <p className="text-[11px] text-muted-foreground mt-1">
    العملة: ريال يمني (YER) — يمكنك تغيير الشركة من إعدادات الشركات
    </p>
   </div>
   <Link href="/settings/companies">
    <Badge variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-muted/50 transition-colors">
    <Settings2 className="h-3 w-3" />
    تغيير الشركة
    </Badge>
   </Link>
   </CardContent>
  </div>
  </Card>

  {/* ════════════════════════════════════════════════════════
   System Health KPIs
   ════════════════════════════════════════════════════════ */}
  {/* ════════════════════════════════════════════════════════
   Quick Setup Section
   ════════════════════════════════════════════════════════ */}
  <div className="space-y-3">
  <div className="flex items-center gap-2">
   <Settings2 className="h-4 w-4 text-muted-foreground" />
   <h2 className="text-sm font-semibold text-foreground">الإعداد السريع</h2>
   <span className="text-[10px] text-muted-foreground">— الإعدادات الأكثر استخداماً</span>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
   {quickSetupLinks.map((item) => {
   const Icon = item.icon;
   return (
    <Link key={item.href} href={item.href}>
    <Card className="border-border/30 hover:border-primary/40 hover:shadow-sm transition-all duration-200 h-full">
     <CardContent className="p-3 flex flex-col items-center gap-2 text-center">
     <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', item.color)}>
      <Icon className="h-4 w-4" />
     </div>
     <span className="text-[11px] font-medium text-foreground leading-tight">{item.title}</span>
     </CardContent>
    </Card>
    </Link>
   );
   })}
  </div>
  </div>

  {/* ════════════════════════════════════════════════════════
   Module Settings Cards
   ════════════════════════════════════════════════════════ */}
  <div className="space-y-3">
  <div className="flex items-center gap-2">
   <Database className="h-4 w-4 text-muted-foreground" />
   <h2 className="text-sm font-semibold text-foreground">إعدادات الوحدات</h2>
   <span className="text-[10px] text-muted-foreground">— تهيئة كل وحدة في النظام</span>
  </div>
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
   {moduleLinks.map((item) => {
   const Icon = item.icon;
   return (
    <TooltipProvider key={item.href}>
    <Tooltip>
     <TooltipTrigger asChild>
     <Link href={item.href}>
      <Card className="border-border/40 h-full transition-all hover:border-primary/40 hover:shadow-md overflow-hidden group">
      <div className={cn('bg-gradient-to-l', item.gradient, 'via-transparent to-transparent')}>
       <CardContent className="p-4 flex gap-3 items-start">
       <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', item.color)}>
        <Icon className="h-5 w-5" />
       </div>
       <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{item.title}</h2>
        <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0" />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
        <div className="mt-2">
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-0 bg-success/10 text-success">
         <CheckCircle2 className="h-2.5 w-2.5 ms-0.5" />
         متاح
        </Badge>
        </div>
       </div>
       </CardContent>
      </div>
      </Card>
     </Link>
     </TooltipTrigger>
     <TooltipContent side="bottom" className="max-w-xs">
     <p className="text-xs">{item.tooltip}</p>
     </TooltipContent>
    </Tooltip>
    </TooltipProvider>
   );
   })}
  </div>
  </div>

  {/* ════════════════════════════════════════════════════════
   Extensions & Customization Cards
   ════════════════════════════════════════════════════════ */}
  <div className="space-y-3">
  <div className="flex items-center gap-2">
   <Puzzle className="h-4 w-4 text-muted-foreground" />
   <h2 className="text-sm font-semibold text-foreground">الامتدادات والتخصيص</h2>
   <span className="text-[10px] text-muted-foreground">— أدوات التخصيص والتوسع</span>
  </div>
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
   {extensionLinks.map((item) => {
   const Icon = item.icon;
   return (
    <Link key={item.href} href={item.href}>
    <Card className="border-border/40 h-full transition-all hover:border-primary/40 hover:shadow-md overflow-hidden group">
     <div className={cn('bg-gradient-to-l', item.gradient, 'via-transparent to-transparent')}>
     <CardContent className="p-4 flex gap-3 items-start">
      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', item.color)}>
      <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
       <h2 className="text-sm font-semibold">{item.title}</h2>
       <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0" />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
      </div>
     </CardContent>
     </div>
    </Card>
    </Link>
   );
   })}
  </div>
  </div>

  {/* ════════════════════════════════════════════════════════
   System Administration Links
   ════════════════════════════════════════════════════════ */}
  <div className="space-y-3">
  <div className="flex items-center gap-2">
   <Shield className="h-4 w-4 text-muted-foreground" />
   <h2 className="text-sm font-semibold text-foreground">إدارة النظام</h2>
   <span className="text-[10px] text-muted-foreground">— إعدادات البنية التحتية والأمان</span>
  </div>
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
   {systemLinks.map((item) => {
   const Icon = item.icon;
   return (
    <Link key={item.href} href={item.href}>
    <Card className="border-border/40 h-full transition-all hover:border-primary/40 hover:shadow-md overflow-hidden group">
     <CardContent className="p-4 flex gap-3 items-start">
     <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', item.color)}>
      <Icon className="h-5 w-5" />
     </div>
     <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold">{item.title}</h2>
      <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0" />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
     </div>
     </CardContent>
    </Card>
    </Link>
   );
   })}
  </div>
  </div>

  {/* ════════════════════════════════════════════════════════
   System Health Details
   ════════════════════════════════════════════════════════ */}
  <div className="space-y-3">
  <div className="flex items-center gap-2">
   <Activity className="h-4 w-4 text-muted-foreground" />
   <h2 className="text-sm font-semibold text-foreground">صحة النظام</h2>
   <span className="text-[10px] text-muted-foreground">— ملخص الكيانات المهيأة</span>
  </div>
  <Card className="border-border/40">
   <CardContent className="p-4">
   <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
    <HealthIndicator
    label="العملاء"
    count={healthCounts.customers}
    icon={<Users className="h-4 w-4" />}
    />
    <HealthIndicator
    label="الموردون"
    count={healthCounts.suppliers}
    icon={<Truck className="h-4 w-4" />}
    />
    <HealthIndicator
    label="الأصناف"
    count={healthCounts.items}
    icon={<Package className="h-4 w-4" />}
    />
    <HealthIndicator
    label="الحسابات"
    count={healthCounts.accounts}
    icon={<BookMarked className="h-4 w-4" />}
    />
    <HealthIndicator
    label="المستودعات"
    count={healthCounts.warehouses}
    icon={<Building2 className="h-4 w-4" />}
    />
    <HealthIndicator
    label="الموظفون"
    count={healthCounts.employees}
    icon={<Users className="h-4 w-4" />}
    />
   </div>
   </CardContent>
  </Card>
  </div>
 </div>
 );
}

/* ─── Health Indicator Sub-Component ─── */
function HealthIndicator({
 label,
 count,
 icon,
}: {
 label: string;
 count: number;
 icon: React.ReactNode;
}) {
 const configured = count > 0;
 return (
 <TooltipProvider>
  <Tooltip>
  <TooltipTrigger asChild>
   <div className="flex flex-col items-center gap-1.5 py-2 cursor-default">
   <div className={cn(
    'h-10 w-10 rounded-full flex items-center justify-center transition-colors',
    configured
    ? 'bg-success/10 text-success'
    : 'bg-muted/50 text-muted-foreground'
   )}>
    {configured ? (
    <CheckCircle2 className="h-5 w-5" />
    ) : (
    <AlertCircle className="h-5 w-5" />
    )}
   </div>
   <span className="text-xs font-medium text-foreground">{label}</span>
   <span className={cn(
    'text-[10px] font-semibold',
    configured ? 'text-success' : 'text-muted-foreground'
   )}>
    {configured ? `${count} مسجّل` : 'غير مهيأ'}
   </span>
   </div>
  </TooltipTrigger>
  <TooltipContent side="bottom">
   <p className="text-xs">
   {configured
    ? `${label}: ${count} سجل مسجّل في النظام`
    : `${label}: لم يتم تسجيل أي سجل بعد`}
   </p>
  </TooltipContent>
  </Tooltip>
 </TooltipProvider>
 );
}
