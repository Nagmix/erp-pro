'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import {
 Building2, Cpu, ShoppingCart, Truck, Package, Users, Printer, Shield, Save,
 Loader2, AlertTriangle, WifiOff, Cloud, CloudOff, Pencil, RefreshCw, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { SettingsHubTiles } from '@/components/erp/settings-hub-tiles';
import { PageHeader } from '@/components/erp/page-header';
import {
 Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

// ─── أنواع ────────────────────────────────────────────────────────

type AppSettings = {
 companyName: string;
 currency: string;
 country: string;
 timezone: string;
 defaultCompany: string;
 fiscalYear: string;
 autoAccountRouting: boolean;
 invoiceTemplate: string;
 posEnabled: boolean;
 posWarehouse: string;
 autoReceive: boolean;
 purchaseNumbering: string;
 defaultWarehouse: string;
 valuationMethod: string;
 reorderLevel: string;
 workingHours: string;
 overtimeRate: string;
 penaltyEnabled: boolean;
 printTemplate: string;
 paperSize: string;
};

type AppSettingsSection = 'general' | 'accounting' | 'sales' | 'purchases' | 'inventory' | 'hr' | 'printing';

// ─── أنواع الأدوار ──────────────────────────────────────────────────

type RoleData = {
 name: string;
 desk_access: boolean;
 two_factor_auth: boolean;
 disabled: boolean;
 users: number;
};

const defaultSettings: AppSettings = {
 companyName: '',
 currency: 'YER',
 country: 'SA',
 timezone: 'Asia/Riyadh',
 defaultCompany: '',
 fiscalYear: new Date().getFullYear().toString(),
 autoAccountRouting: true,
 invoiceTemplate: 'standard',
 posEnabled: true,
 posWarehouse: '',
 autoReceive: true,
 purchaseNumbering: 'auto',
 defaultWarehouse: '',
 valuationMethod: 'fifo',
 reorderLevel: '10',
 workingHours: '8',
 overtimeRate: '1.5',
 penaltyEnabled: true,
 printTemplate: 'standard',
 paperSize: 'A4',
};

// ─── ألوان أيقونات الإعدادات (دورانية حسب الفهرس) ──────────────────

const SETTINGS_ACCENTS = [
 { bg: 'bg-primary/10', text: 'text-primary' },
 { bg: 'bg-secondary/10', text: 'text-secondary' },
 { bg: 'bg-accent/10', text: 'text-accent' },
 { bg: 'bg-muted-foreground/10', text: 'text-muted-foreground' },
 { bg: 'bg-chart-1/10', text: 'text-chart-1' },
 { bg: 'bg-chart-2/10', text: 'text-chart-2' },
 { bg: 'bg-chart-3/10', text: 'text-chart-3' },
 { bg: 'bg-chart-4/10', text: 'text-chart-4' },
 { bg: 'bg-chart-5/10', text: 'text-chart-5' },
];

// ─── المكون الرئيسي ──────────────────────────────────────────────

export default function SettingsPage() {
 // حالة التحميل والخطأ
 const [isLoading, setIsLoading] = useState(true);
 const [loadError, setLoadError] = useState<string | null>(null);
 const [dataSource, setDataSource] = useState<'erpnext' | 'local' | 'defaults'>('defaults');
 const [savingSection, setSavingSection] = useState<string | null>(null);

 // حالة الإعدادات
 const [settings, setSettings] = useState<AppSettings>(defaultSettings);

 // ─── حالة الأدوار (الصلاحيات) ────────────────────────────────────
 const [roles, setRoles] = useState<RoleData[]>([]);
 const [rolesLoading, setRolesLoading] = useState(false);
 const [rolesError, setRolesError] = useState<string | null>(null);
 const [roleSearch, setRoleSearch] = useState('');
 const [editingRole, setEditingRole] = useState<RoleData | null>(null);
 const [roleDialogOpen, setRoleDialogOpen] = useState(false);
 const [savingRole, setSavingRole] = useState(false);
 const rolesFetchedRef = useRef(false);

 // ─── تحميل الأدوار من API ───────────────────────────────────────
 const fetchRoles = useCallback(async () => {
 setRolesLoading(true);
 setRolesError(null);
 try {
  const res = await fetch('/api/settings/roles');
  const data = await res.json();
  if (data.success && Array.isArray(data.data)) {
  setRoles(data.data);
  } else {
  setRolesError(data.error || 'فشل تحميل الأدوار');
  setRoles([]);
  }
 } catch {
  setRolesError('تعذر الاتصال بالخادم لتحميل الأدوار');
  setRoles([]);
 } finally {
  setRolesLoading(false);
 }
 }, []);

 // جلب الأدوار عند تحميل الصفحة
 useEffect(() => {
 if (!rolesFetchedRef.current) {
  rolesFetchedRef.current = true;
  fetchRoles();
 }
 }, [fetchRoles]);

 // حفظ تعديلات الدور
 const saveRole = async (updated: RoleData) => {
 setSavingRole(true);
 try {
  const res = await fetch('/api/settings/roles', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updated),
  });
  const data = await res.json();
  if (data.success) {
  toast.success('تم الحفظ', { description: `تم حفظ إعدادات الدور "${updated.name}" بنجاح` });
  setRoleDialogOpen(false);
  setEditingRole(null);
  fetchRoles(); // إعادة تحميل القائمة
  } else {
  toast.error('فشل الحفظ', { description: data.error || 'فشل حفظ إعدادات الدور' });
  }
 } catch {
  toast.error('فشل الحفظ', { description: 'تعذر الاتصال بالخادم' });
 } finally {
  setSavingRole(false);
 }
 };

 // ─── تحميل الإعدادات من API ──────────────────────────────────

 const fetchSettings = useCallback(async () => {
 setIsLoading(true);
 setLoadError(null);
 try {
  const res = await fetch('/api/settings/app-settings');
  const data = await res.json();
  if (data.success && data.data) {
  setSettings((prev) => ({ ...prev, ...data.data }));
  setDataSource(data.source || 'defaults');
  if (data.error) {
   setLoadError(data.error);
  }
  } else {
  setLoadError(data.error || 'فشل تحميل الإعدادات');
  // محاولة قراءة من localStorage كاحتياطي أخير
  loadFromLocalStorage();
  }
 } catch {
  setLoadError('تعذر الاتصال بالخادم');
  loadFromLocalStorage();
 } finally {
  setIsLoading(false);
 }
 }, []);

 // قراءة من localStorage كاحتياطي
 const loadFromLocalStorage = () => {
 try {
  const stored = localStorage.getItem('erp_app_settings');
  if (stored) {
  const parsed = JSON.parse(stored) as Partial<AppSettings>;
  setSettings((prev) => ({ ...prev, ...parsed }));
  setDataSource('local');
  }
 } catch {
  /* تجاهل */
 }
 };

 useEffect(() => {
 fetchSettings();
 }, [fetchSettings]);

 // ─── حفظ قسم من الإعدادات ───────────────────────────────────

 const saveSection = async (section: AppSettingsSection, sectionLabel: string, sectionSettings: Partial<AppSettings>) => {
 setSavingSection(section);
 try {
  const res = await fetch('/api/settings/app-settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ section, values: sectionSettings }),
  });
  const data = await res.json();

  if (data.success) {
  toast.success('تم الحفظ', { description: `تم حفظ إعدادات ${sectionLabel} بنجاح` });
  if (data.data) {
   setSettings((prev) => ({ ...prev, ...data.data }));
   setDataSource(data.source || 'erpnext');
  }
  } else if (data.savedLocally) {
  // حُفظ محلياً لكن ERPNext فشل
  toast.error('حُفظ محلياً', { description: `تم حفظ إعدادات ${sectionLabel} محلياً. ${data.error || 'لم يتم الاتصال بالنظام'}` });
  // حفظ في localStorage كاحتياطي
  localStorage.setItem('erp_app_settings', JSON.stringify({ ...settings, ...sectionSettings }));
  } else {
  toast.error('فشل الحفظ', { description: data.error || `فشل حفظ إعدادات ${sectionLabel}` });
  }
 } catch {
  // فشل الاتصال بالخادم — حفظ في localStorage
  localStorage.setItem('erp_app_settings', JSON.stringify({ ...settings, ...sectionSettings }));
  toast.error('حُفظ محلياً', { description: `تم حفظ إعدادات ${sectionLabel} محلياً (لا اتصال بالخادم)` });
 } finally {
  setSavingSection(null);
 }
 };

 // ─── مساعد حالة الحفظ ────────────────────────────────────────

 const isSaving = (section: string) => savingSection === section;

 // ─── فلترة الأدوار حسب البحث ─────────────────────────────────
 const filteredRoles = roles.filter((r) =>
 !roleSearch.trim() || r.name.toLowerCase().includes(roleSearch.toLowerCase())
 );

 // ─── شريط حالة الاتصال ───────────────────────────────────────

 const ConnectionBadge = () => {
 if (dataSource === 'erpnext') {
  return (
  <Badge variant="outline" className="gap-1.5 text-xs border-chart-3/30 bg-chart-3/5 text-chart-3">
   <Cloud className="h-3 w-3" />متصل بالنظام
  </Badge>
  );
 }
 if (dataSource === 'local') {
  return (
  <Badge variant="outline" className="gap-1.5 text-xs border-chart-2/30 bg-chart-2/5 text-chart-2">
   <CloudOff className="h-3 w-3" />محلي (غير متزامن)
  </Badge>
  );
 }
 return (
  <Badge variant="outline" className="gap-1.5 text-xs border-destructive/30 bg-destructive/5 text-destructive">
  <WifiOff className="h-3 w-3" />قيم افتراضية
  </Badge>
 );
 };

 // ─── حالة التحميل ─────────────────────────────────────────────

 if (isLoading) {
 return (
  <div dir="rtl" className="erp-page-enter space-y-5">
  <PageHeader
   title="الإعدادات"
   description="إدارة إعدادات النظام والتفضيلات والتكاملات والصلاحيات بأسلوب موحد"
   iconify="solar:settings-bold-duotone"
   accent="primary"
  />
  <Card>
   <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
   <Loader2 className="h-8 w-8 animate-spin text-primary" />
   <p className="text-sm text-muted-foreground">جارٍ تحميل الإعدادات…</p>
   </CardContent>
  </Card>
  </div>
 );
 }

 // ─── حالة خطأ الاتصال ────────────────────────────────────────

 const ErrorBanner = () => {
 if (!loadError) return null;
 return (
  <div className="flex items-center gap-3 rounded-lg border border-chart-2/20 bg-chart-2/5 p-3">
  <AlertTriangle className="h-5 w-5 text-chart-2 shrink-0" />
  <div className="flex-1 min-w-0">
   <p className="text-sm font-medium text-chart-2">تعذر الاتصال بالنظام</p>
   <p className="text-xs text-chart-2 mt-0.5">{loadError}</p>
  </div>
  <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={fetchSettings}>
   إعادة المحاولة
  </Button>
  </div>
 );
 };

 // ─── العرض الرئيسي ───────────────────────────────────────────

 return (
 <div dir="rtl" className="erp-page-enter space-y-5">
  <PageHeader
  title="الإعدادات"
  description="إدارة إعدادات النظام والتفضيلات والتكاملات والصلاحيات بأسلوب موحد"
  iconify="solar:settings-bold-duotone"
  accent="primary"
  />

  <div className="flex items-center justify-between">
  <SettingsHubTiles />
  </div>

  <div className="flex items-center gap-3">
  <ConnectionBadge />
  </div>

  <ErrorBanner />

  <Tabs defaultValue="general" dir="rtl" className="space-y-4">
  <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/35 p-1">
   <TabsTrigger value="general" className="text-xs gap-1.5 data-[state=active]:bg-background"><Building2 className="h-3.5 w-3.5" />عام</TabsTrigger>
   <TabsTrigger value="accounting" className="text-xs gap-1.5 data-[state=active]:bg-background"><Cpu className="h-3.5 w-3.5" />المحاسبة</TabsTrigger>
   <TabsTrigger value="sales" className="text-xs gap-1.5 data-[state=active]:bg-background"><ShoppingCart className="h-3.5 w-3.5" />المبيعات</TabsTrigger>
   <TabsTrigger value="purchases" className="text-xs gap-1.5 data-[state=active]:bg-background"><Truck className="h-3.5 w-3.5" />المشتريات</TabsTrigger>
   <TabsTrigger value="inventory" className="text-xs gap-1.5 data-[state=active]:bg-background"><Package className="h-3.5 w-3.5" />المخزون</TabsTrigger>
   <TabsTrigger value="hr" className="text-xs gap-1.5 data-[state=active]:bg-background"><Users className="h-3.5 w-3.5" />الموارد البشرية</TabsTrigger>
   <TabsTrigger value="printing" className="text-xs gap-1.5 data-[state=active]:bg-background"><Printer className="h-3.5 w-3.5" />الطباعة</TabsTrigger>
   <TabsTrigger value="permissions" className="text-xs gap-1.5 data-[state=active]:bg-background"><Shield className="h-3.5 w-3.5" />الصلاحيات</TabsTrigger>
  </TabsList>

  {/* General Tab */}
  <TabsContent value="general">
   <Card>
   <CardHeader className="pb-4">
    <div className="flex items-center gap-3">
    <div className={`h-10 w-10 rounded-lg ${SETTINGS_ACCENTS[0].bg} flex items-center justify-center shrink-0`}><Building2 className={`h-5 w-5 ${SETTINGS_ACCENTS[0].text}`} /></div>
    <div>
     <CardTitle className="text-base">الإعدادات العامة</CardTitle>
     <CardDescription className="text-xs">معلومات الشركة الأساسية والإعدادات الإقليمية</CardDescription>
    </div>
    </div>
   </CardHeader>
   <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
     <Label className="text-sm font-medium">اسم الشركة</Label>
     <Input className="h-9 text-sm" value={settings.companyName} onChange={e => setSettings(s => ({ ...s, companyName: e.target.value }))} />
    </div>
    <div className="space-y-2">
     <Label className="text-sm font-medium">العملة الافتراضية</Label>
     <Select value={settings.currency} onValueChange={v => setSettings(s => ({ ...s, currency: v }))}>
     <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
     <SelectContent>
      <SelectItem value="YER">ريال يمني (YER)</SelectItem>
      <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
      <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
      <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
      <SelectItem value="EUR">يورو (EUR)</SelectItem>
      <SelectItem value="KWD">دينار كويتي (KWD)</SelectItem>
      <SelectItem value="QAR">ريال قطري (QAR)</SelectItem>
     </SelectContent>
     </Select>
    </div>
    <div className="space-y-2">
     <Label className="text-sm font-medium">الدولة</Label>
     <Select value={settings.country} onValueChange={v => setSettings(s => ({ ...s, country: v }))}>
     <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
     <SelectContent>
      <SelectItem value="SA">المملكة العربية السعودية</SelectItem>
      <SelectItem value="AE">الإمارات العربية المتحدة</SelectItem>
      <SelectItem value="KW">الكويت</SelectItem>
      <SelectItem value="BH">البحرين</SelectItem>
      <SelectItem value="QA">قطر</SelectItem>
      <SelectItem value="OM">عمان</SelectItem>
     </SelectContent>
     </Select>
    </div>
    <div className="space-y-2">
     <Label className="text-sm font-medium">المنطقة الزمنية</Label>
     <Select value={settings.timezone} onValueChange={v => setSettings(s => ({ ...s, timezone: v }))}>
     <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
     <SelectContent>
      <SelectItem value="Asia/Riyadh">الرياض (GMT+3)</SelectItem>
      <SelectItem value="Asia/Dubai">دبي (GMT+4)</SelectItem>
      <SelectItem value="Asia/Kuwait">الكويت (GMT+3)</SelectItem>
      <SelectItem value="Asia/Qatar">قطر (GMT+3)</SelectItem>
     </SelectContent>
     </Select>
    </div>
    </div>
    <div className="flex justify-end mt-4">
    <Button size="sm" className="gap-1.5 text-xs" disabled={isSaving('general')} onClick={() => saveSection('general', 'عام', { companyName: settings.companyName, currency: settings.currency, country: settings.country, timezone: settings.timezone })}>
     {isSaving('general') ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}حفظ
    </Button>
    </div>
   </CardContent>
   </Card>
  </TabsContent>

  {/* Accounting Tab */}
  <TabsContent value="accounting">
   <Card>
   <CardHeader className="pb-4">
    <div className="flex items-center gap-3">
    <div className={`h-10 w-10 rounded-lg ${SETTINGS_ACCENTS[1].bg} flex items-center justify-center shrink-0`}><Cpu className={`h-5 w-5 ${SETTINGS_ACCENTS[1].text}`} /></div>
    <div>
     <CardTitle className="text-base">إعدادات المحاسبة</CardTitle>
     <CardDescription className="text-xs">الشركة الافتراضية والسنة المالية والتوجيه التلقائي</CardDescription>
    </div>
    </div>
   </CardHeader>
   <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
     <Label className="text-sm font-medium">الشركة الافتراضية</Label>
     <Input className="h-9 text-sm" value={settings.defaultCompany} onChange={e => setSettings(s => ({ ...s, defaultCompany: e.target.value }))} />
    </div>
    <div className="space-y-2">
     <Label className="text-sm font-medium">السنة المالية</Label>
     <Select value={settings.fiscalYear} onValueChange={v => setSettings(s => ({ ...s, fiscalYear: v }))}>
     <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
     <SelectContent>
      <SelectItem value="2024">2024</SelectItem>
      <SelectItem value="2025">2025</SelectItem>
      <SelectItem value="2026">2026</SelectItem>
     </SelectContent>
     </Select>
    </div>
    </div>
    <Separator className="my-4" />
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/35">
    <div>
     <p className="text-sm font-medium">التوجيه التلقائي للحسابات</p>
     <p className="text-xs text-muted-foreground mt-0.5">ترحيل القيود المحاسبية تلقائياً عند تقديم المستندات</p>
    </div>
    <Switch checked={settings.autoAccountRouting} onCheckedChange={v => setSettings(s => ({ ...s, autoAccountRouting: v }))} />
    </div>
    <div className="flex justify-end mt-4">
    <Button size="sm" className="gap-1.5 text-xs" disabled={isSaving('accounting')} onClick={() => saveSection('accounting', 'المحاسبة', { defaultCompany: settings.defaultCompany, fiscalYear: settings.fiscalYear, autoAccountRouting: settings.autoAccountRouting })}>
     {isSaving('accounting') ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}حفظ
    </Button>
    </div>
   </CardContent>
   </Card>
  </TabsContent>

  {/* Sales Tab */}
  <TabsContent value="sales">
   <Card>
   <CardHeader className="pb-4">
    <div className="flex items-center gap-3">
    <div className={`h-10 w-10 rounded-lg ${SETTINGS_ACCENTS[2].bg} flex items-center justify-center shrink-0`}><ShoppingCart className={`h-5 w-5 ${SETTINGS_ACCENTS[2].text}`} /></div>
    <div>
     <CardTitle className="text-base">إعدادات المبيعات</CardTitle>
     <CardDescription className="text-xs">العميل الافتراضي وترقيم الفواتير ونقاط البيع</CardDescription>
    </div>
    </div>
   </CardHeader>
   <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
     <Label className="text-sm font-medium">قالب الفاتورة الافتراضي</Label>
     <Select value={settings.invoiceTemplate} onValueChange={v => setSettings(s => ({ ...s, invoiceTemplate: v }))}>
     <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
     <SelectContent>
      <SelectItem value="standard">قياسي</SelectItem>
      <SelectItem value="compact">مضغوط</SelectItem>
      <SelectItem value="detailed">مفصل</SelectItem>
      <SelectItem value="custom">مخصص</SelectItem>
     </SelectContent>
     </Select>
    </div>
    <div className="space-y-2">
     <Label className="text-sm font-medium">مستودع نقاط البيع</Label>
     {/* TODO: جلب المستودعات من ERPNext API ديناميكياً */}
     <Select value={settings.posWarehouse} onValueChange={v => setSettings(s => ({ ...s, posWarehouse: v }))}>
     <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
     <SelectContent>
     </SelectContent>
     </Select>
    </div>
    </div>
    <Separator className="my-4" />
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/35">
    <div>
     <p className="text-sm font-medium">تفعيل نقاط البيع (POS)</p>
     <p className="text-xs text-muted-foreground mt-0.5">تمكين واجهة نقاط البيع للبيع المباشر</p>
    </div>
    <Switch checked={settings.posEnabled} onCheckedChange={v => setSettings(s => ({ ...s, posEnabled: v }))} />
    </div>
    <div className="flex justify-end mt-4">
    <Button size="sm" className="gap-1.5 text-xs" disabled={isSaving('sales')} onClick={() => saveSection('sales', 'المبيعات', { invoiceTemplate: settings.invoiceTemplate, posEnabled: settings.posEnabled, posWarehouse: settings.posWarehouse })}>
     {isSaving('sales') ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}حفظ
    </Button>
    </div>
   </CardContent>
   </Card>
  </TabsContent>

  {/* Purchases Tab */}
  <TabsContent value="purchases">
   <Card>
   <CardHeader className="pb-4">
    <div className="flex items-center gap-3">
    <div className={`h-10 w-10 rounded-lg ${SETTINGS_ACCENTS[3].bg} flex items-center justify-center shrink-0`}><Truck className={`h-5 w-5 ${SETTINGS_ACCENTS[3].text}`} /></div>
    <div>
     <CardTitle className="text-base">إعدادات المشتريات</CardTitle>
     <CardDescription className="text-xs">المورد الافتراضي وترقيم أوامر الشراء</CardDescription>
    </div>
    </div>
   </CardHeader>
   <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
     <Label className="text-sm font-medium">ترقيم المشتريات</Label>
     <Select value={settings.purchaseNumbering} onValueChange={v => setSettings(s => ({ ...s, purchaseNumbering: v }))}>
     <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
     <SelectContent>
      <SelectItem value="auto">تلقائي (PO-0001)</SelectItem>
      <SelectItem value="manual">يدوي</SelectItem>
      <SelectItem value="prefix">بادئة مخصصة</SelectItem>
     </SelectContent>
     </Select>
    </div>
    </div>
    <Separator className="my-4" />
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/35">
    <div>
     <p className="text-sm font-medium">الاستلام التلقائي للمشتريات</p>
     <p className="text-xs text-muted-foreground mt-0.5">إنشاء إيصال استلام تلقائياً عند تقديم فاتورة الشراء</p>
    </div>
    <Switch checked={settings.autoReceive} onCheckedChange={v => setSettings(s => ({ ...s, autoReceive: v }))} />
    </div>
    <div className="flex justify-end mt-4">
    <Button size="sm" className="gap-1.5 text-xs" disabled={isSaving('purchases')} onClick={() => saveSection('purchases', 'المشتريات', { autoReceive: settings.autoReceive, purchaseNumbering: settings.purchaseNumbering })}>
     {isSaving('purchases') ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}حفظ
    </Button>
    </div>
   </CardContent>
   </Card>
  </TabsContent>

  {/* Inventory Tab */}
  <TabsContent value="inventory">
   <Card>
   <CardHeader className="pb-4">
    <div className="flex items-center gap-3">
    <div className={`h-10 w-10 rounded-lg ${SETTINGS_ACCENTS[4].bg} flex items-center justify-center shrink-0`}><Package className={`h-5 w-5 ${SETTINGS_ACCENTS[4].text}`} /></div>
    <div>
     <CardTitle className="text-base">إعدادات المخزون</CardTitle>
     <CardDescription className="text-xs">المستودع الافتراضي وطريقة التقييم وحد إعادة الطلب</CardDescription>
    </div>
    </div>
   </CardHeader>
   <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="space-y-2">
     <Label className="text-sm font-medium">المستودع الافتراضي</Label>
     {/* TODO: جلب المستودعات من ERPNext API ديناميكياً */}
     <Select value={settings.defaultWarehouse} onValueChange={v => setSettings(s => ({ ...s, defaultWarehouse: v }))}>
     <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
     <SelectContent>
     </SelectContent>
     </Select>
    </div>
    <div className="space-y-2">
     <Label className="text-sm font-medium">طريقة التقييم</Label>
     <Select value={settings.valuationMethod} onValueChange={v => setSettings(s => ({ ...s, valuationMethod: v }))}>
     <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
     <SelectContent>
      <SelectItem value="FIFO">أول ما يدخل أول ما يخرج (FIFO)</SelectItem>
      <SelectItem value="LIFO">آخر ما يدخل أول ما يخرج (LIFO)</SelectItem>
      <SelectItem value="Moving Average">متوسط التكلفة</SelectItem>
     </SelectContent>
     </Select>
    </div>
    <div className="space-y-2">
     <Label className="text-sm font-medium">حد إعادة الطلب الافتراضي</Label>
     <Input type="number" className="h-9 text-sm" dir="ltr" value={settings.reorderLevel} onChange={e => setSettings(s => ({ ...s, reorderLevel: e.target.value }))} />
    </div>
    </div>
    <div className="flex justify-end mt-4">
    <Button size="sm" className="gap-1.5 text-xs" disabled={isSaving('inventory')} onClick={() => saveSection('inventory', 'المخزون', { defaultWarehouse: settings.defaultWarehouse, valuationMethod: settings.valuationMethod, reorderLevel: settings.reorderLevel })}>
     {isSaving('inventory') ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}حفظ
    </Button>
    </div>
   </CardContent>
   </Card>
  </TabsContent>

  {/* HR Tab */}
  <TabsContent value="hr">
   <Card>
   <CardHeader className="pb-4">
    <div className="flex items-center gap-3">
    <div className={`h-10 w-10 rounded-lg ${SETTINGS_ACCENTS[5].bg} flex items-center justify-center shrink-0`}><Users className={`h-5 w-5 ${SETTINGS_ACCENTS[5].text}`} /></div>
    <div>
     <CardTitle className="text-base">إعدادات الموارد البشرية</CardTitle>
     <CardDescription className="text-xs">ساعات العمل ومعدل العمل الإضافي وقواعد الجزاءات</CardDescription>
    </div>
    </div>
   </CardHeader>
   <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
     <Label className="text-sm font-medium">ساعات العمل اليومية</Label>
     <Input type="number" className="h-9 text-sm" dir="ltr" value={settings.workingHours} onChange={e => setSettings(s => ({ ...s, workingHours: e.target.value }))} />
    </div>
    <div className="space-y-2">
     <Label className="text-sm font-medium">معدل العمل الإضافي</Label>
     <Input type="number" step="0.1" className="h-9 text-sm" dir="ltr" value={settings.overtimeRate} onChange={e => setSettings(s => ({ ...s, overtimeRate: e.target.value }))} />
    </div>
    </div>
    <Separator className="my-4" />
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/35">
    <div>
     <p className="text-sm font-medium">تفعيل نظام الجزاءات</p>
     <p className="text-xs text-muted-foreground mt-0.5">تطبيق خصومات تلقائية على التأخير والغياب بدون عذر</p>
    </div>
    <Switch checked={settings.penaltyEnabled} onCheckedChange={v => setSettings(s => ({ ...s, penaltyEnabled: v }))} />
    </div>
    <div className="flex justify-end mt-4">
    <Button size="sm" className="gap-1.5 text-xs" disabled={isSaving('hr')} onClick={() => saveSection('hr', 'الموارد البشرية', { workingHours: settings.workingHours, overtimeRate: settings.overtimeRate, penaltyEnabled: settings.penaltyEnabled })}>
     {isSaving('hr') ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}حفظ
    </Button>
    </div>
   </CardContent>
   </Card>
  </TabsContent>

  {/* Printing Tab */}
  <TabsContent value="printing">
   <Card>
   <CardHeader className="pb-4">
    <div className="flex items-center gap-3">
    <div className={`h-10 w-10 rounded-lg ${SETTINGS_ACCENTS[6].bg} flex items-center justify-center shrink-0`}><Printer className={`h-5 w-5 ${SETTINGS_ACCENTS[6].text}`} /></div>
    <div>
     <CardTitle className="text-base">إعدادات الطباعة</CardTitle>
     <CardDescription className="text-xs">قوالب الطباعة وإعدادات الطابعة</CardDescription>
    </div>
    </div>
   </CardHeader>
   <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
     <Label className="text-sm font-medium">قالب الطباعة</Label>
     <Select value={settings.printTemplate} onValueChange={v => setSettings(s => ({ ...s, printTemplate: v }))}>
     <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
     <SelectContent>
      <SelectItem value="Standard">قياسي</SelectItem>
      <SelectItem value="Compact">مضغوط</SelectItem>
      <SelectItem value="Detailed">مفصل</SelectItem>
      <SelectItem value="Custom">مخصص</SelectItem>
     </SelectContent>
     </Select>
    </div>
    <div className="space-y-2">
     <Label className="text-sm font-medium">حجم الورق</Label>
     <Select value={settings.paperSize} onValueChange={v => setSettings(s => ({ ...s, paperSize: v }))}>
     <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
     <SelectContent>
      <SelectItem value="A4">A4</SelectItem>
      <SelectItem value="A3">A3</SelectItem>
      <SelectItem value="Letter">خطاب</SelectItem>
      <SelectItem value="Legal">قانوني</SelectItem>
     </SelectContent>
     </Select>
    </div>
    </div>
    <div className="flex justify-end mt-4">
    <Button size="sm" className="gap-1.5 text-xs" disabled={isSaving('printing')} onClick={() => saveSection('printing', 'الطباعة', { printTemplate: settings.printTemplate, paperSize: settings.paperSize })}>
     {isSaving('printing') ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}حفظ
    </Button>
    </div>
   </CardContent>
   </Card>
  </TabsContent>

  {/* Permissions Tab */}
  <TabsContent value="permissions">
   <Card>
   <CardHeader className="pb-4">
    <div className="flex items-center gap-3">
    <div className={`h-10 w-10 rounded-lg ${SETTINGS_ACCENTS[7].bg} flex items-center justify-center shrink-0`}><Shield className={`h-5 w-5 ${SETTINGS_ACCENTS[7].text}`} /></div>
    <div className="flex-1 min-w-0">
     <CardTitle className="text-base">الصلاحيات والأدوار</CardTitle>
     <CardDescription className="text-xs">إدارة الأدوار والصلاحيات</CardDescription>
    </div>
    <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0" onClick={fetchRoles} disabled={rolesLoading}>
     <RefreshCw className={`h-3.5 w-3.5 ${rolesLoading ? 'animate-spin' : ''}`} />
     تحديث
    </Button>
    </div>
   </CardHeader>
   <CardContent>
    {/* شريط البحث */}
    <div className="relative mb-4">
    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
     className="h-9 text-sm ps-9"
     placeholder="البحث في الأدوار..."
     value={roleSearch}
     onChange={(e) => setRoleSearch(e.target.value)}
    />
    </div>

    {/* حالة التحميل */}
    {rolesLoading && roles.length === 0 && (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
     <Loader2 className="h-8 w-8 animate-spin text-primary" />
     <p className="text-sm text-muted-foreground">جارٍ تحميل الأدوار…</p>
    </div>
    )}

    {/* حالة الخطأ */}
    {rolesError && !rolesLoading && (
    <div className="flex items-center gap-3 rounded-lg border border-chart-2/20 bg-chart-2/5 p-3">
     <AlertTriangle className="h-5 w-5 text-chart-2 shrink-0" />
     <div className="flex-1 min-w-0">
     <p className="text-sm font-medium text-chart-2">فشل تحميل الأدوار</p>
     <p className="text-xs text-chart-2 mt-0.5">{rolesError}</p>
     </div>
     <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={fetchRoles}>
     إعادة المحاولة
     </Button>
    </div>
    )}

    {/* حالة القائمة الفارغة */}
    {!rolesLoading && !rolesError && roles.length === 0 && (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
     <Shield className="h-9 w-10 text-muted-foreground/40" />
     <p className="text-sm text-muted-foreground">لا توجد أدوار في النظام</p>
     <Button variant="outline" size="sm" className="text-xs" onClick={fetchRoles}>
     إعادة التحميل
     </Button>
    </div>
    )}

    {/* قائمة الأدوار */}
    {!rolesLoading && filteredRoles.length > 0 && (
    <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
     {filteredRoles.map((r) => (
     <div key={r.name} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${r.disabled ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive'}`}>
       <Shield className="h-4 w-4" />
      </div>
      <div className="min-w-0">
       <div className="flex items-center gap-2">
       <p className="text-sm font-medium truncate">{r.name}</p>
       {r.disabled && (
        <Badge variant="outline" className="text-[9px] h-4 border-border text-muted-foreground">
        معطّل
        </Badge>
       )}
       </div>
       <div className="flex items-center gap-2 mt-0.5">
       {r.desk_access && (
        <span className="text-[10px] text-chart-3">دخول سطح المكتب</span>
       )}
       {r.two_factor_auth && (
        <span className="text-[10px] text-chart-2">مصادقة ثنائية</span>
       )}
       {!r.desk_access && !r.two_factor_auth && (
        <span className="text-[10px] text-muted-foreground">بدون صلاحيات إضافية</span>
       )}
       </div>
      </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
      <Badge variant="outline" className="text-[10px] border-0 bg-secondary">
       {r.users} مستخدم
      </Badge>
      <Button
       variant="ghost"
       size="sm"
       className="h-7 text-xs gap-1"
       onClick={() => {
       setEditingRole({ ...r });
       setRoleDialogOpen(true);
       }}
      >
       <Pencil className="h-3 w-3" />
       تعديل
      </Button>
      </div>
     </div>
     ))}
    </div>
    )}

    {/* عدد النتائج */}
    {!rolesLoading && roles.length > 0 && (
    <p className="text-[10px] text-muted-foreground mt-3 text-center">
     عرض {filteredRoles.length} من {roles.length} دور
    </p>
    )}
   </CardContent>
   </Card>
  </TabsContent>
  </Tabs>

  {/* ─── حوار تعديل الدور ──────────────────────────────────── */}
  <Dialog open={roleDialogOpen} onOpenChange={(open) => { setRoleDialogOpen(open); if (!open) setEditingRole(null); }}>
  <DialogContent size="md">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    <Shield className="h-5 w-5 text-destructive" />
    تعديل الدور: {editingRole?.name}
   </DialogTitle>
   <DialogDescription>
    تعديل إعدادات الدور وصلاحياته في النظام
   </DialogDescription>
   </DialogHeader>

   {editingRole && (
   <div className="space-y-4 py-2">
    {/* اسم الدور (للقراءة فقط) */}
    <div className="space-y-2">
    <Label className="text-sm font-medium">اسم الدور</Label>
    <Input className="h-9 text-sm bg-muted/50" value={editingRole.name} disabled />
    </div>

    {/* عدد المستخدمين (للقراءة فقط) */}
    <div className="space-y-2">
    <Label className="text-sm font-medium">عدد المستخدمين</Label>
    <Input className="h-9 text-sm bg-muted/50" value={editingRole.users} disabled dir="ltr" />
    </div>

    <Separator />

    {/* خيارات الدور */}
    <div className="space-y-3">
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/35">
     <div>
     <p className="text-sm font-medium">دخول سطح المكتب</p>
     <p className="text-xs text-muted-foreground mt-0.5">السماح بالوصول إلى واجهة الإدارة الكاملة لهذا الدور</p>
     </div>
     <Switch
     checked={editingRole.desk_access}
     onCheckedChange={(v) => setEditingRole((prev) => prev ? { ...prev, desk_access: v } : prev)}
     />
    </div>

    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/35">
     <div>
     <p className="text-sm font-medium">مصادقة ثنائية</p>
     <p className="text-xs text-muted-foreground mt-0.5">تفعيل المصادقة الثنائية للمستخدمين بهذا الدور</p>
     </div>
     <Switch
     checked={editingRole.two_factor_auth}
     onCheckedChange={(v) => setEditingRole((prev) => prev ? { ...prev, two_factor_auth: v } : prev)}
     />
    </div>

    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/35 border border-chart-2/20">
     <div>
     <p className="text-sm font-medium text-chart-2">تعطيل الدور</p>
     <p className="text-xs text-muted-foreground mt-0.5">تعطيل هذا الدور بالكامل (لن يتمكن المستخدمون من استخدامه)</p>
     </div>
     <Switch
     checked={editingRole.disabled}
     onCheckedChange={(v) => setEditingRole((prev) => prev ? { ...prev, disabled: v } : prev)}
     />
    </div>
    </div>
   </div>
   )}

   <DialogFooter className="gap-2">
   <Button
    variant="outline"
    size="sm"
    className="text-xs"
    onClick={() => { setRoleDialogOpen(false); setEditingRole(null); }}
    disabled={savingRole}
   >
    إلغاء
   </Button>
   <Button
    size="sm"
    className="gap-1.5 text-xs"
    disabled={savingRole || !editingRole}
    onClick={() => { if (editingRole) saveRole(editingRole); }}
   >
    {savingRole ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
    حفظ التعديلات
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>
 </div>
 );
}
