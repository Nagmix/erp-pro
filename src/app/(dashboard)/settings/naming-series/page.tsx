'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader, PageShell, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
 DialogDescription,
} from '@/components/ui/dialog';
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
 DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/erp/empty-state';
import {
 Hash,
 Plus,
 Search,
 Edit,
 Trash2,
 MoreHorizontal,
 RefreshCw,
 Loader2,
 FileText,
 Receipt,
 BookOpen,
 CreditCard,
 ArrowRightLeft,
 RotateCcw,
 Settings2,
 CheckCircle2,
 Zap,
 ListOrdered,
 Tag,
} from 'lucide-react';
import { toast } from 'sonner';

/* ──────────────────────────────────────────── */
/* Types & Constants       */
/* ──────────────────────────────────────────── */

type NamingSeriesInfo = {
 doctype: string;
 label: string;
 defaultPrefix: string;
 seriesOptions: string[];
 counterInfo: Record<string, number>;
};

const DOCTYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
 'Sales Invoice': Receipt,
 'POS Invoice': Receipt,
 'Purchase Invoice': FileText,
 'Journal Entry': BookOpen,
 'Payment Entry': CreditCard,
 'Quotation': FileText,
 'Sales Order': FileText,
 'Delivery Note': ArrowRightLeft,
 'Purchase Order': FileText,
 'Purchase Receipt': FileText,
 'Stock Entry': ArrowRightLeft,
 'Material Request': FileText,
 'Request for Quotation': FileText,
 'Supplier Quotation': FileText,
 'Expense Claim': CreditCard,
 'Production Plan': Settings2,
 'Lead': FileText,
 'Opportunity': FileText,
};

/* ──────────────────────────────────────────── */
/* Main Component        */
/* ──────────────────────────────────────────── */

export default function NamingSeriesPage() {
 const [seriesData, setSeriesData] = useState<NamingSeriesInfo[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [filterCategory, setFilterCategory] = useState<string>('all');

 // Add prefix dialog
 const [addPrefixOpen, setAddPrefixOpen] = useState(false);
 const [addPrefixDoctype, setAddPrefixDoctype] = useState('');
 const [addPrefixValue, setAddPrefixValue] = useState('');
 const [addPrefixSaving, setAddPrefixSaving] = useState(false);

 // Reset counter dialog
 const [resetCounterOpen, setResetCounterOpen] = useState(false);
 const [resetCounterPrefix, setResetCounterPrefix] = useState('');
 const [resetCounterValue, setResetCounterValue] = useState(0);
 const [resetCounterSaving, setResetCounterSaving] = useState(false);

 // Quick setup dialog
 const [quickSetupOpen, setQuickSetupOpen] = useState(false);
 const [quickSetupSaving, setQuickSetupSaving] = useState(false);

 // Delete series dialog
 const [deleteSeriesOpen, setDeleteSeriesOpen] = useState(false);
 const [deleteSeriesInfo, setDeleteSeriesInfo] = useState<{ doctype: string; prefix: string } | null>(null);

 /* ── Load data ── */
 const loadData = useCallback(async () => {
 setLoading(true);
 try {
  const res = await fetch('/api/settings/naming-series');
  const j = await res.json();
  if (j?.success && Array.isArray(j.data)) {
  setSeriesData(j.data);
  }
 } catch {
  toast.error('فشل تحميل بيانات الترقيم');
 } finally {
  setLoading(false);
 }
 }, []);

 useEffect(() => {
 let cancelled = false;
 (async () => {
  if (cancelled) return;
  setLoading(true);
  try {
  const res = await fetch('/api/settings/naming-series');
  const j = await res.json();
  if (!cancelled && j?.success && Array.isArray(j.data)) {
   setSeriesData(j.data);
  }
  } catch {
  if (!cancelled) toast.error('فشل تحميل بيانات الترقيم');
  } finally {
  if (!cancelled) setLoading(false);
  }
 })();
 return () => { cancelled = true; };
 }, []);

 /* ── Categories ── */
 const categories = useMemo(() => {
 const cats = new Set<string>();
 seriesData.forEach((s) => {
  if (s.doctype.includes('Sales') || s.doctype.includes('POS') || s.doctype.includes('Quotation') || s.doctype === 'Delivery Note') {
  cats.add('المبيعات');
  } else if (s.doctype.includes('Purchase') || s.doctype.includes('Supplier')) {
  cats.add('المشتريات');
  } else if (s.doctype.includes('Journal') || s.doctype.includes('Payment')) {
  cats.add('المحاسبة');
  } else if (s.doctype.includes('Stock') || s.doctype.includes('Material')) {
  cats.add('المخزون');
  } else if (s.doctype.includes('Expense') || s.doctype.includes('Production')) {
  cats.add('الموارد والتصنيع');
  } else if (s.doctype.includes('Lead') || s.doctype.includes('Opportunity')) {
  cats.add('CRM');
  }
 });
 return Array.from(cats).sort();
 }, [seriesData]);

 /* ── Filtered data ── */
 const filteredData = useMemo(() => {
 let result = seriesData;
 if (searchQuery.trim()) {
  const q = searchQuery.trim().toLowerCase();
  result = result.filter(
  (s) =>
   s.doctype.toLowerCase().includes(q) ||
   s.label.toLowerCase().includes(q) ||
   s.seriesOptions.some((opt) => opt.toLowerCase().includes(q))
  );
 }
 if (filterCategory !== 'all') {
  result = result.filter((s) => {
  if (filterCategory === 'المبيعات') {
   return s.doctype.includes('Sales') || s.doctype.includes('POS') || s.doctype.includes('Quotation') || s.doctype === 'Delivery Note';
  } else if (filterCategory === 'المشتريات') {
   return s.doctype.includes('Purchase') || s.doctype.includes('Supplier');
  } else if (filterCategory === 'المحاسبة') {
   return s.doctype.includes('Journal') || s.doctype.includes('Payment');
  } else if (filterCategory === 'المخزون') {
   return s.doctype.includes('Stock') || s.doctype.includes('Material');
  } else if (filterCategory === 'الموارد والتصنيع') {
   return s.doctype.includes('Expense') || s.doctype.includes('Production');
  } else if (filterCategory === 'CRM') {
   return s.doctype.includes('Lead') || s.doctype.includes('Opportunity');
  }
  return true;
  });
 }
 return result;
 }, [seriesData, searchQuery, filterCategory]);

 /* ── Stats ── */
 const stats = useMemo(() => {
 const totalDoctypes = seriesData.length;
 const totalSeries = seriesData.reduce((acc, s) => acc + s.seriesOptions.length, 0);
 const doctypesWithMultiple = seriesData.filter((s) => s.seriesOptions.length > 1).length;
 const totalActiveCounters = seriesData.reduce(
  (acc, s) => acc + Object.values(s.counterInfo).filter((v) => v > 0).length,
  0
 );
 return { totalDoctypes, totalSeries, doctypesWithMultiple, totalActiveCounters };
 }, [seriesData]);

 /* ── Add Prefix ── */
 const handleAddPrefix = useCallback(async () => {
 if (!addPrefixDoctype) {
  toast.error('يرجى اختيار نوع المستند');
  return;
 }
 if (!addPrefixValue.trim()) {
  toast.error('يرجى إدخال البادئة');
  return;
 }
 setAddPrefixSaving(true);
 try {
  const res = await fetch('/api/settings/naming-series', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
   _action: 'add_prefix',
   doctype: addPrefixDoctype,
   prefix: addPrefixValue.trim(),
  }),
  });
  const j = await res.json();
  if (j?.success) {
  toast.success('تم إضافة البادئة بنجاح');
  setAddPrefixOpen(false);
  setAddPrefixDoctype('');
  setAddPrefixValue('');
  loadData();
  } else {
  toast.error(j?.error || 'فشل إضافة البادئة');
  }
 } catch {
  toast.error('فشل الاتصال بالخادم');
 } finally {
  setAddPrefixSaving(false);
 }
 }, [addPrefixDoctype, addPrefixValue, loadData]);

 /* ── Reset Counter ── */
 const handleResetCounter = useCallback(async () => {
 if (!resetCounterPrefix) return;
 setResetCounterSaving(true);
 try {
  const res = await fetch('/api/settings/naming-series', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
   _action: 'reset_counter',
   prefix: resetCounterPrefix,
   value: resetCounterValue,
  }),
  });
  const j = await res.json();
  if (j?.success) {
  toast.success(`تم إعادة تعيين العداد إلى ${resetCounterValue}`);
  setResetCounterOpen(false);
  setResetCounterPrefix('');
  setResetCounterValue(0);
  loadData();
  } else {
  toast.error(j?.error || 'فشل إعادة التعيين');
  }
 } catch {
  toast.error('فشل الاتصال بالخادم');
 } finally {
  setResetCounterSaving(false);
 }
 }, [resetCounterPrefix, resetCounterValue, loadData]);

 /* ── Quick Setup ── */
 const handleQuickSetup = useCallback(async () => {
 setQuickSetupSaving(true);
 try {
  let added = 0;
  for (const s of seriesData) {
  if (s.seriesOptions.length === 0 || (s.seriesOptions.length === 1 && s.seriesOptions[0] === s.defaultPrefix)) {
   // Already has default — no action needed
   continue;
  }
  }
  // Apply standard naming conventions to all doctypes
  for (const s of seriesData) {
  if (!s.seriesOptions.includes(s.defaultPrefix)) {
   const res = await fetch('/api/settings/naming-series', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({
    _action: 'add_prefix',
    doctype: s.doctype,
    prefix: s.defaultPrefix,
   }),
   });
   const j = await res.json();
   if (j?.success) added++;
  }
  }
  if (added > 0) {
  toast.success(`تم إضافة ${added} تسلسل جديد`);
  } else {
  toast.info('جميع التسلسلات الافتراضية موجودة مسبقاً');
  }
  setQuickSetupOpen(false);
  loadData();
 } catch {
  toast.error('فشل الإعداد السريع');
 } finally {
  setQuickSetupSaving(false);
 }
 }, [seriesData, loadData]);

 /* ── Delete Series ── */
 const handleDeleteSeries = useCallback(async () => {
 if (!deleteSeriesInfo) return;
 try {
  // Remove the prefix from the series list
  const item = seriesData.find((s) => s.doctype === deleteSeriesInfo.doctype);
  if (!item) return;

  const updatedSeries = item.seriesOptions.filter((s) => s !== deleteSeriesInfo.prefix);
  if (updatedSeries.length === 0) {
  toast.error('لا يمكن حذف آخر تسلسل — يجب أن يبقى تسلسل واحد على الأقل');
  setDeleteSeriesOpen(false);
  setDeleteSeriesInfo(null);
  return;
  }

  const res = await fetch('/api/settings/naming-series', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
   _action: 'update_series',
   doctype: deleteSeriesInfo.doctype,
   series: updatedSeries,
  }),
  });
  const j = await res.json();
  if (j?.success) {
  toast.success('تم حذف التسلسل');
  loadData();
  } else {
  toast.error(j?.error || 'فشل الحذف');
  }
 } catch {
  toast.error('فشل الاتصال بالخادم');
 }
 setDeleteSeriesOpen(false);
 setDeleteSeriesInfo(null);
 }, [deleteSeriesInfo, seriesData, loadData]);

 /* ── Loading state ── */
 if (loading && seriesData.length === 0) {
 return (
  <div dir="rtl" className="erp-page-enter space-y-5">
  <PageHeader
   title="الترقيم المتسلسل"
   description="إدارة بادئات وأرقام المستندات — مثل نظام دفترة"
   iconify="solar:hashtag-bold-duotone"
   accent="primary"
   breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'الترقيم المتسلسل' }]}
  />
  <div className="flex items-center justify-center py-20">
   <Loader2 className="h-8 w-8 animate-spin text-primary" />
   <span className="ms-3 text-sm text-muted-foreground">جاري تحميل بيانات الترقيم…</span>
  </div>
  </div>
 );
 }

 return (
 <div dir="rtl" className="erp-page-enter space-y-5">
  {/* ── Header ── */}
  <PageHeader
  title="الترقيم المتسلسل"
  description="إدارة بادئات الترقيم والتسلسلات لجميع أنواع المستندات — تحكم في كيفية ترقيم الفواتير والقيود والأوامر تلقائياً"
  iconify="solar:hashtag-bold-duotone"
  accent="primary"
  breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'الترقيم المتسلسل' }]}
  actions={
   <div className="flex items-center gap-2">
   <Button variant="outline" size="sm" className="gap-1.5" onClick={loadData} disabled={loading}>
    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
    تحديث
   </Button>
   <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setQuickSetupOpen(true)}>
    <Zap className="h-3.5 w-3.5" />
    إعداد سريع
   </Button>
   <Button size="sm" className="gap-1.5" onClick={() => {
    setAddPrefixDoctype('');
    setAddPrefixValue('');
    setAddPrefixOpen(true);
   }}>
    <Plus className="h-3.5 w-3.5" />
    بادئة جديدة
   </Button>
   </div>
  }
  />

  {/* ── Stats ── */}
  <KpiStrip cols={4}>
  <KpiCard
   title="أنواع المستندات"
   value={stats.totalDoctypes}
   icon={FileText}
   accent="primary"
   description="مستندات تدعم الترقيم"
  />
  <KpiCard
   title="إجمالي التسلسلات"
   value={stats.totalSeries}
   icon={ListOrdered}
   accent="info"
   description="تسلسلات ترقيم مسجلة"
  />
  <KpiCard
   title="تسلسلات متعددة"
   value={stats.doctypesWithMultiple}
   icon={Tag}
   accent="success"
   description="مستندات بعدة خيارات"
  />
  <KpiCard
   title="عدادات نشطة"
   value={stats.totalActiveCounters}
   icon={Hash}
   accent="warning"
   description="تسلسلات مستخدمة"
  />
  </KpiStrip>

  {/* ── Search & Filters ── */}
  <Card className="border-border/40 shadow-sm">
  <CardContent className="p-4">
   <div className="flex flex-col sm:flex-row gap-3">
   <div className="relative flex-1">
    <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
    placeholder="بحث بنوع المستند أو البادئة..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="ps-9 h-9 text-sm"
    />
   </div>
   <Select value={filterCategory} onValueChange={setFilterCategory}>
    <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
    <SelectValue placeholder="التصنيف" />
    </SelectTrigger>
    <SelectContent>
    <SelectItem value="all">جميع التصنيفات</SelectItem>
    {categories.map((c) => (
     <SelectItem key={c} value={c}>
     {c}
     </SelectItem>
    ))}
    </SelectContent>
   </Select>
   </div>
  </CardContent>
  </Card>

  {/* ── Series Table ── */}
  <PageShell padded={false}>
  <div className="overflow-x-auto">
   <Table>
   <TableHeader>
    <TableRow className="bg-muted/40 hover:bg-muted/40">
    <TableHead className="text-xs font-semibold ps-4 w-[220px]">نوع المستند</TableHead>
    <TableHead className="text-xs font-semibold">التسلسلات المتاحة</TableHead>
    <TableHead className="text-center text-xs font-semibold w-[100px]">العداد الحالي</TableHead>
    <TableHead className="text-center text-xs font-semibold pe-4 w-[80px]">إجراءات</TableHead>
    </TableRow>
   </TableHeader>
   <TableBody>
    {filteredData.length === 0 ? (
    <TableRow>
     <TableCell colSpan={4} className="py-12">
     <EmptyState
      title="لا توجد بيانات ترقيم"
      description={
      searchQuery || filterCategory !== 'all'
       ? 'لا توجد نتائج مطابقة للفلاتر الحالية'
       : 'سيتم تحميل بيانات الترقيم عند الاتصال بالخادم'
      }
      icon={Hash}
      actionLabel="إعادة المحاولة"
      onAction={loadData}
      className="min-h-[180px]"
     />
     </TableCell>
    </TableRow>
    ) : (
    filteredData.map((item) => {
     const IconComp = DOCTYPE_ICONS[item.doctype] || FileText;
     return (
     <TableRow key={item.doctype} className="hover:bg-muted/20 transition-colors">
      <TableCell className="ps-4">
      <div className="flex items-center gap-2">
       <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary">
       <IconComp className="h-3.5 w-3.5" />
       </div>
       <div>
       <p className="text-sm font-medium">{item.label}</p>
       <p className="text-[10px] text-muted-foreground" dir="ltr">{item.doctype}</p>
       </div>
      </div>
      </TableCell>
      <TableCell>
      <div className="flex flex-wrap gap-1.5">
       {item.seriesOptions.length > 0 ? (
       item.seriesOptions.map((opt) => (
        <Badge
        key={opt}
        variant={opt === item.defaultPrefix ? 'default' : 'outline'}
        className={`text-[10px] font-mono ${
         opt === item.defaultPrefix
         ? 'bg-primary/10 text-primary hover:bg-primary/15 border-primary/20'
         : 'bg-muted/50 border-border/40'
        }`}
        dir="ltr"
        >
        {opt}
        {opt === item.defaultPrefix && (
         <span className="ms-1 text-[8px] opacity-60">افتراضي</span>
        )}
        </Badge>
       ))
       ) : (
       <span className="text-[10px] text-muted-foreground">لا توجد تسلسلات — سيُستخدم الافتراضي</span>
       )}
      </div>
      </TableCell>
      <TableCell className="text-center">
      {Object.entries(item.counterInfo).length > 0 ? (
       <div className="flex flex-col items-center gap-0.5">
       {Object.entries(item.counterInfo)
        .slice(0, 2)
        .map(([prefix, count]) => (
        <span key={prefix} className="text-[10px] font-mono text-muted-foreground" dir="ltr">
         {count > 0 ? `#${count + 1}` : '-'}
        </span>
        ))}
       </div>
      ) : (
       <span className="text-[10px] text-muted-foreground">-</span>
      )}
      </TableCell>
      <TableCell className="pe-4 text-center">
      <DropdownMenu>
       <DropdownMenuTrigger asChild>
       <Button variant="ghost" size="icon" className="h-8 w-8">
        <MoreHorizontal className="h-3.5 w-3.5" />
       </Button>
       </DropdownMenuTrigger>
       <DropdownMenuContent align="start">
       <DropdownMenuItem onClick={() => {
        setAddPrefixDoctype(item.doctype);
        setAddPrefixValue('');
        setAddPrefixOpen(true);
       }}>
        <Plus className="me-2 h-3.5 w-3.5" />
        إضافة بادئة
       </DropdownMenuItem>
       {item.seriesOptions.map((opt) => (
        <div key={opt}>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => {
         setResetCounterPrefix(opt);
         setResetCounterValue(item.counterInfo[opt] || 0);
         setResetCounterOpen(true);
        }}>
         <RotateCcw className="me-2 h-3.5 w-3.5" />
         إعادة تعيين: <span dir="ltr" className="font-mono text-[10px]">{opt}</span>
        </DropdownMenuItem>
        {item.seriesOptions.length > 1 && opt !== item.defaultPrefix && (
         <DropdownMenuItem
         onClick={() => {
          setDeleteSeriesInfo({ doctype: item.doctype, prefix: opt });
          setDeleteSeriesOpen(true);
         }}
         className="text-destructive focus:text-destructive"
         >
         <Trash2 className="me-2 h-3.5 w-3.5" />
         حذف: <span dir="ltr" className="font-mono text-[10px]">{opt}</span>
         </DropdownMenuItem>
        )}
        </div>
       ))}
       </DropdownMenuContent>
      </DropdownMenu>
      </TableCell>
     </TableRow>
     );
    })
    )}
   </TableBody>
   </Table>
  </div>
  {filteredData.length > 0 && (
   <div className="flex items-center justify-between px-4 py-3 border-t border-border/30 text-xs text-muted-foreground">
   <span>عرض {filteredData.length} من {seriesData.length} نوع مستند</span>
   {(searchQuery || filterCategory !== 'all') && (
    <Button
    variant="ghost"
    size="sm"
    className="h-7 text-xs gap-1"
    onClick={() => {
     setSearchQuery('');
     setFilterCategory('all');
    }}
    >
    مسح الفلاتر
    </Button>
   )}
   </div>
  )}
  </PageShell>

  {/* ── Info Card ── */}
  <Card className="border-border/40 shadow-sm">
  <CardHeader className="pb-3">
   <CardTitle className="text-sm flex items-center gap-2">
   <CheckCircle2 className="h-4 w-4 text-chart-3" />
   كيف يعمل الترقيم المتسلسل؟
   </CardTitle>
  </CardHeader>
  <CardContent className="text-xs text-muted-foreground space-y-2">
   <p>
   عند إنشاء أي مستند (فاتورة، قيد، أمر شراء...) يتم تعيين رقم تسلسلي تلقائياً وفقاً للبادئة المحددة.
   مثلاً البادئة <Badge variant="outline" className="font-mono text-[10px] mx-0.5" dir="ltr">ACC-SINV-.YYYY.-</Badge> ستُنتج أرقاماً مثل
   <code className="mx-1 bg-muted/50 px-1 rounded" dir="ltr">ACC-SINV-2026-00001</code>
   </p>
   <p>
   الرمز <code className="bg-muted/50 px-1 rounded">.YYYY.</code> يُدرج السنة تلقائياً ويُعيد العداد من 1 عند بداية كل سنة مالية جديدة.
   يمكنك إضافة بادئات مختلفة لنفس نوع المستند (مثلاً بادئة لكل فرع) ثم اختيار المناسب عند الإنشاء.
   </p>
  </CardContent>
  </Card>

  {/* ── Add Prefix Dialog ── */}
  <Dialog open={addPrefixOpen} onOpenChange={setAddPrefixOpen}>
  <DialogContent className="sm:max-w-[500px]" dir="rtl">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    <Tag className="h-5 w-5 text-primary" />
    إضافة بادئة ترقيم
   </DialogTitle>
   <DialogDescription>
    إضافة بادئة جديدة لنوع مستند — ستظهر كخيار عند إنشاء المستند
   </DialogDescription>
   </DialogHeader>
   <div className="space-y-4 py-2">
   <div className="space-y-2">
    <Label className="text-sm font-medium">نوع المستند <span className="text-destructive">*</span></Label>
    <Select value={addPrefixDoctype} onValueChange={setAddPrefixDoctype}>
    <SelectTrigger className="h-9 text-sm">
     <SelectValue placeholder="اختر نوع المستند" />
    </SelectTrigger>
    <SelectContent>
     {seriesData.map((s) => (
     <SelectItem key={s.doctype} value={s.doctype}>
      {s.label} <span className="text-muted-foreground text-[10px]" dir="ltr">({s.doctype})</span>
     </SelectItem>
     ))}
    </SelectContent>
    </Select>
   </div>
   <div className="space-y-2">
    <Label className="text-sm font-medium">البادئة <span className="text-destructive">*</span></Label>
    <Input
    placeholder="مثال: INV-.YYYY.-"
    value={addPrefixValue}
    onChange={(e) => setAddPrefixValue(e.target.value)}
    dir="ltr"
    className="font-mono text-sm"
    />
    <p className="text-[10px] text-muted-foreground">
    استخدم .YYYY. لإدراج السنة تلقائياً — مثال: <code>ACC-SINV-.YYYY.-</code>
    </p>
   </div>
   {addPrefixDoctype && (
    <div className="space-y-2">
    <Label className="text-sm font-medium">التسلسلات الحالية</Label>
    <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border/40 bg-muted/10">
     {seriesData.find((s) => s.doctype === addPrefixDoctype)?.seriesOptions.map((opt) => (
     <Badge key={opt} variant="outline" className="text-[10px] font-mono" dir="ltr">
      {opt}
     </Badge>
     )) || <span className="text-[10px] text-muted-foreground">لا توجد تسلسلات بعد</span>}
    </div>
    </div>
   )}
   </div>
   <DialogFooter>
   <Button variant="outline" onClick={() => setAddPrefixOpen(false)}>
    إلغاء
   </Button>
   <Button onClick={() => void handleAddPrefix()} disabled={addPrefixSaving || !addPrefixDoctype || !addPrefixValue.trim()}>
    {addPrefixSaving ? <Loader2 className="h-4 w-4 animate-spin ms-1" /> : <Plus className="h-4 w-4 ms-1" />}
    إضافة البادئة
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>

  {/* ── Reset Counter Dialog ── */}
  <Dialog open={resetCounterOpen} onOpenChange={setResetCounterOpen}>
  <DialogContent className="sm:max-w-[420px]" dir="rtl">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    <RotateCcw className="h-5 w-5 text-chart-2" />
    إعادة تعيين العداد
   </DialogTitle>
   <DialogDescription>
    إعادة تعيين العداد لتسلسل محدد — الرقم التالي سيبدأ من القيمة الجديدة + 1
   </DialogDescription>
   </DialogHeader>
   <div className="space-y-4 py-2">
   <div className="space-y-2">
    <Label className="text-sm font-medium">التسلسل</Label>
    <div className="p-2 rounded-lg border border-border/40 bg-muted/10">
    <code className="text-sm font-mono" dir="ltr">{resetCounterPrefix}</code>
    </div>
   </div>
   <div className="space-y-2">
    <Label className="text-sm font-medium">القيمة الجديدة</Label>
    <Input
    type="number"
    min={0}
    value={resetCounterValue}
    onChange={(e) => setResetCounterValue(parseInt(e.target.value) || 0)}
    dir="ltr"
    className="font-mono text-sm"
    />
    <p className="text-[10px] text-muted-foreground">
    المستند التالي سيحمل الرقم {resetCounterValue + 1}
    </p>
   </div>
   </div>
   <DialogFooter>
   <Button variant="outline" onClick={() => setResetCounterOpen(false)}>
    إلغاء
   </Button>
   <Button onClick={() => void handleResetCounter()} disabled={resetCounterSaving} variant="destructive">
    {resetCounterSaving ? <Loader2 className="h-4 w-4 animate-spin ms-1" /> : <RotateCcw className="h-4 w-4 ms-1" />}
    إعادة تعيين
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>

  {/* ── Quick Setup Dialog ── */}
  <Dialog open={quickSetupOpen} onOpenChange={setQuickSetupOpen}>
  <DialogContent className="sm:max-w-[500px]" dir="rtl">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    <Zap className="h-5 w-5 text-chart-2" />
    إعداد سريع
   </DialogTitle>
   <DialogDescription>
    تطبيق بادئات الترقيم الافتراضية على جميع أنواع المستندات
   </DialogDescription>
   </DialogHeader>
   <div className="space-y-4 py-2">
   <div className="space-y-2">
    <Label className="text-sm font-medium">سيتم التأكد من وجود التسلسلات التالية:</Label>
    <div className="space-y-1.5 p-3 rounded-lg border border-border/40 bg-muted/10 max-h-[300px] overflow-y-auto">
    {seriesData.map((s) => (
     <div key={s.doctype} className="flex items-center gap-2 text-xs">
     <Hash className="h-3 w-3 text-primary shrink-0" />
     <span className="font-medium">{s.label}</span>
     <span className="text-muted-foreground">→</span>
     <code className="font-mono text-muted-foreground" dir="ltr">{s.defaultPrefix}</code>
     {s.seriesOptions.includes(s.defaultPrefix) && (
      <CheckCircle2 className="h-3 w-3 text-chart-3" />
     )}
     </div>
    ))}
    </div>
    <p className="text-[10px] text-muted-foreground">
    التسلسلات الموجودة مسبقاً لن يتم تكرارها — العلامة ✓ تعني أنها موجودة
    </p>
   </div>
   </div>
   <DialogFooter>
   <Button variant="outline" onClick={() => setQuickSetupOpen(false)}>
    إلغاء
   </Button>
   <Button onClick={() => void handleQuickSetup()} disabled={quickSetupSaving}>
    {quickSetupSaving ? <Loader2 className="h-4 w-4 animate-spin ms-1" /> : <Zap className="h-4 w-4 ms-1" />}
    تطبيق الإعداد
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>

  {/* ── Delete Series Confirmation ── */}
  <AlertDialog open={deleteSeriesOpen} onOpenChange={setDeleteSeriesOpen}>
  <AlertDialogContent dir="rtl">
   <AlertDialogHeader>
   <AlertDialogTitle>حذف التسلسل</AlertDialogTitle>
   <AlertDialogDescription>
    هل أنت متأكد من حذف التسلسل &quot;<code dir="ltr">{deleteSeriesInfo?.prefix}</code>&quot; من &quot;{deleteSeriesInfo ? seriesData.find(s => s.doctype === deleteSeriesInfo.doctype)?.label : ''}&quot;؟
    المستندات التي تم إنشاؤها بهذا التسلسل لن تتأثر، لكن لن يمكن إنشاء مستندات جديدة بهذه البادئة.
   </AlertDialogDescription>
   </AlertDialogHeader>
   <AlertDialogFooter>
   <AlertDialogCancel>إلغاء</AlertDialogCancel>
   <AlertDialogAction
    onClick={() => void handleDeleteSeries()}
    variant="destructive"
   >
    حذف
   </AlertDialogAction>
   </AlertDialogFooter>
  </AlertDialogContent>
  </AlertDialog>
 </div>
 );
}
