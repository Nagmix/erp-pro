'use client';

import { useCallback, useMemo, useState } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatDate } from '@/lib/app-format';
import { useDocList, useDoc, useUpdateDoc } from '@/lib/client/hooks';
import {
 RefreshCw,
 Plug,
 CheckCircle2,
 XCircle,
 Store,
 Clock,
 TestTube,
 Loader2,
 Package,
 ShoppingCart,
 Settings,
 Save,
} from 'lucide-react';

/* ─── Types ─── */
type ECommerceSettingsDoc = {
 name: string;
 enabled?: number | boolean;
 default_customer_group?: string;
 company?: string;
 price_list?: string;
 show_price?: number | boolean;
 show_quantity?: number | boolean;
 show_add_to_cart_button?: number | boolean;
 allow_items_not_in_stock?: number | boolean;
 hide_variants?: number | boolean;
 enable_wishlist?: number | boolean;
 enable_reviews?: number | boolean;
 enable_variants?: number | boolean;
 show_contact_us_button?: number | boolean;
 enable_enquiry?: number | boolean;
 products_per_page?: number;
 home_page?: string;
 modified?: string;
 owner?: string;
};

type ECommerceItemRow = {
 name: string;
 item?: string;
 item_name?: string;
 website_image?: string;
 published?: number | boolean;
 website_status?: string;
 modified?: string;
 owner?: string;
};

/** Helper to get boolean value from ERPNext (0/1 or true/false) */
function asBool(v: number | boolean | undefined): boolean {
 return Number(v) === 1;
}

export default function EcommerceIntegrationPage() {
 /* ─── State ─── */
 const [testing, setTesting] = useState(false);
 const [activeTab, setActiveTab] = useState('settings');

 /* ─── ERPNext Data Hooks ─── */
 const settingsQuery = useDoc<ECommerceSettingsDoc>(
 'E Commerce Settings',
 'E Commerce Settings'
 );

 const itemsQuery = useDocList<ECommerceItemRow>('E Commerce Item', {
 fields: ['name', 'item', 'item_name', 'published', 'website_status', 'modified', 'owner'],
 limit: 500,
 order_by: 'modified desc',
 });

 const updateSettingsMut = useUpdateDoc('E Commerce Settings');

 /* ─── Local overrides pattern ───
 * We store only user-modified values in overrides.
 * For display, we merge: override value → API value → default.
 * Overrides are cleared on successful save.
 */
 const [overrides, setOverrides] = useState<Partial<ECommerceSettingsDoc>>({});
 const settings = settingsQuery.data;

 /** Get a setting value: override → API → fallback */
 const get = <K extends keyof ECommerceSettingsDoc>(key: K, fallback: ECommerceSettingsDoc[K]): ECommerceSettingsDoc[K] => {
 if (key in overrides) return overrides[key] as ECommerceSettingsDoc[K];
 if (settings && key in settings) return settings[key] as ECommerceSettingsDoc[K];
 return fallback;
 };

 const getBool = (key: keyof ECommerceSettingsDoc): boolean => {
 const val = get(key, 0);
 return asBool(val as number | boolean | undefined);
 };

 const setOverride = useCallback((patch: Partial<ECommerceSettingsDoc>) => {
 setOverrides((prev) => ({ ...prev, ...patch }));
 }, []);

 /* ─── Save settings ─── */
 const saveSettings = () => {
 // Merge current overrides with current API data for a complete doc
 const doc: Record<string, unknown> = {
  enabled: getBool('enabled') ? 1 : 0,
  show_price: getBool('show_price') ? 1 : 0,
  show_quantity: getBool('show_quantity') ? 1 : 0,
  show_add_to_cart_button: getBool('show_add_to_cart_button') ? 1 : 0,
  allow_items_not_in_stock: getBool('allow_items_not_in_stock') ? 1 : 0,
  hide_variants: getBool('hide_variants') ? 1 : 0,
  enable_wishlist: getBool('enable_wishlist') ? 1 : 0,
  enable_reviews: getBool('enable_reviews') ? 1 : 0,
  enable_variants: getBool('enable_variants') ? 1 : 0,
  show_contact_us_button: getBool('show_contact_us_button') ? 1 : 0,
  enable_enquiry: getBool('enable_enquiry') ? 1 : 0,
  default_customer_group: get('default_customer_group', '') || undefined,
  company: get('company', '') || undefined,
  price_list: get('price_list', '') || undefined,
  products_per_page: get('products_per_page', 20) || 20,
  home_page: get('home_page', '') || undefined,
 };
 updateSettingsMut.mutate(
  { name: 'E Commerce Settings', doc },
  {
  onSuccess: () => {
   setOverrides({});
   toast.success('تم حفظ إعدادات التجارة الإلكترونية');
  },
  onError: () => toast.error('فشل حفظ الإعدادات'),
  }
 );
 };

 /* ─── Test connection ─── */
 const testConnection = async () => {
 setTesting(true);
 await new Promise((r) => setTimeout(r, 1500));
 try {
  await settingsQuery.refetch();
  toast.success('تم الاتصال بنجاح بخدمة التجارة الإلكترونية');
 } catch {
  toast.error('فشل الاتصال');
 }
 setTesting(false);
 };

 /* ─── Stats ─── */
 const items = itemsQuery.data || [];
 const publishedCount = items.filter((i) => Number(i.published) === 1).length;
 const unpublishedCount = items.filter((i) => Number(i.published) !== 1).length;
 const isEcomEnabled = asBool(settings?.enabled);

 /* ─── E Commerce Items columns ─── */
 const itemColumns: Column<ECommerceItemRow>[] = useMemo(
 () => [
  {
  key: 'item',
  header: 'رمز الصنف',
  sortable: true,
  render: (v) => <span className="font-medium text-xs">{String(v || '—')}</span>,
  },
  {
  key: 'item_name',
  header: 'اسم الصنف',
  render: (v) => (
   <span className="text-xs line-clamp-1 max-w-[200px]">{String(v || '—')}</span>
  ),
  },
  {
  key: 'published',
  header: 'منشور',
  render: (v) =>
   Number(v) === 1 ? (
   <Badge variant="outline" className="text-[10px] border-0 bg-chart-3/10 text-chart-3">منشور</Badge>
   ) : (
   <Badge variant="outline" className="text-[10px] border-0 bg-muted text-muted-foreground">غير منشور</Badge>
   ),
  },
  {
  key: 'website_status',
  header: 'حالة الموقع',
  render: (v) => <span className="text-xs text-muted-foreground">{String(v || '—')}</span>,
  },
  {
  key: 'owner',
  header: 'المُنشئ',
  render: (v) => <span className="text-xs text-muted-foreground">{String(v || '—')}</span>,
  },
  {
  key: 'modified',
  header: 'آخر تعديل',
  sortable: true,
  render: (v) => {
   if (!v) return <span className="text-xs text-muted-foreground">—</span>;
   return <span className="text-xs text-muted-foreground">{formatDate(String(v))}</span>;
  },
  },
 ],
 []
 );

 /* ─── Render ─── */
 return (
 <div dir="rtl" className="erp-page-enter space-y-5">
  <PageHeader
  title="إعدادات التجارة الإلكترونية"
  description="إدارة إعدادات المتجر الإلكتروني والعناصر المنشورة على الموقع"
  iconify="solar:shop-bold-duotone"
  accent="warning"
  breadcrumbs={[{ label: 'الإعدادات' }, { label: 'التجارة الإلكترونية' }]}
  />

  {/* Status Cards */}
  <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3">
  <Card>
   <CardContent className="p-3 flex items-center gap-3">
   <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
    <Store className="h-4 w-4 text-warning" />
   </div>
   <div>
    <p className="text-[10px] text-muted-foreground">حالة المتجر</p>
    <p className="text-sm font-bold mt-0.5">
    {settingsQuery.isLoading ? '...' : isEcomEnabled ? 'مفعّل' : 'معطّل'}
    </p>
   </div>
   </CardContent>
  </Card>
  <Card>
   <CardContent className="p-3 flex items-center gap-3">
   <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
    <Package className="h-4 w-4 text-primary" />
   </div>
   <div>
    <p className="text-[10px] text-muted-foreground">إجمالي الأصناف</p>
    <p className="text-sm font-bold mt-0.5">
    {itemsQuery.isLoading ? '...' : items.length}
    </p>
   </div>
   </CardContent>
  </Card>
  <Card>
   <CardContent className="p-3 flex items-center gap-3">
   <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
    <CheckCircle2 className="h-4 w-4 text-success" />
   </div>
   <div>
    <p className="text-[10px] text-muted-foreground">منشور</p>
    <p className="text-sm font-bold mt-0.5">{publishedCount}</p>
   </div>
   </CardContent>
  </Card>
  <Card>
   <CardContent className="p-3 flex items-center gap-3">
   <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
    <XCircle className="h-4 w-4 text-destructive" />
   </div>
   <div>
    <p className="text-[10px] text-muted-foreground">غير منشور</p>
    <p className="text-sm font-bold mt-0.5">{unpublishedCount}</p>
   </div>
   </CardContent>
  </Card>
  </div>

  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
  <TabsList>
   <TabsTrigger value="settings" className="gap-1.5 text-xs">
   <Settings className="h-3.5 w-3.5" />
   إعدادات المتجر
   </TabsTrigger>
   <TabsTrigger value="items" className="gap-1.5 text-xs">
   <ShoppingCart className="h-3.5 w-3.5" />
   الأصناف المنشورة
   </TabsTrigger>
  </TabsList>

  {/* ─── Settings Tab ─── */}
  <TabsContent value="settings" className="space-y-5">
   <ListQueryAlert error={settingsQuery.isError ? settingsQuery.error : null} onRetry={() => settingsQuery.refetch()} />

   {settingsQuery.isLoading ? (
   <Card className="border-border/40 bg-card">
    <CardContent className="p-5 space-y-4">
    {Array.from({ length: 6 }).map((_, i) => (
     <div key={i} className="flex items-center gap-4">
     <Skeleton className="h-9 w-48" />
     <Skeleton className="h-9 flex-1" />
     </div>
    ))}
    </CardContent>
   </Card>
   ) : (
   <Card className="border-border/40 bg-card">
    <CardContent className="p-5 space-y-5">
    <div className="flex items-center gap-2 mb-1">
     <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
     <Plug className="h-4 w-4 text-warning" />
     </div>
     <div>
     <h2 className="text-sm font-semibold">إعدادات التجارة الإلكترونية</h2>
     <p className="text-xs text-muted-foreground">تكوين إعدادات المتجر الإلكتروني من النظام</p>
     </div>
    </div>

    {/* Basic Settings */}
    <div className="rounded-lg border border-border/30 p-3 space-y-3">
     <p className="text-xs font-semibold">الإعدادات الأساسية</p>
     <div className="grid sm:grid-cols-2 gap-4">
     <div className="space-y-1.5">
      <Label className="text-xs font-semibold">الشركة الافتراضية</Label>
      <Input
      className="h-9 text-xs"
      value={String(get('company', '') || '')}
      onChange={(e) => setOverride({ company: e.target.value })}
      placeholder="اسم الشركة"
      />
     </div>
     <div className="space-y-1.5">
      <Label className="text-xs font-semibold">قائمة الأسعار</Label>
      <Input
      className="h-9 text-xs"
      value={String(get('price_list', '') || '')}
      onChange={(e) => setOverride({ price_list: e.target.value })}
      placeholder="قائمة الأسعار الافتراضية"
      />
     </div>
     <div className="space-y-1.5">
      <Label className="text-xs font-semibold">مجموعة العملاء الافتراضية</Label>
      <Input
      className="h-9 text-xs"
      value={String(get('default_customer_group', '') || '')}
      onChange={(e) => setOverride({ default_customer_group: e.target.value })}
      placeholder="مجموعة العملاء"
      />
     </div>
     <div className="space-y-1.5">
      <Label className="text-xs font-semibold">عدد المنتجات في الصفحة</Label>
      <Input
      type="number"
      className="h-9 text-xs"
      value={Number(get('products_per_page', 20) || 20)}
      onChange={(e) => setOverride({ products_per_page: Number(e.target.value) || 20 })}
      placeholder="20"
      />
     </div>
     </div>
    </div>

    {/* Feature Toggles */}
    <div className="grid sm:grid-cols-2 gap-4">
     <div className="space-y-3 rounded-lg border border-border/30 p-3">
     <p className="text-xs font-semibold">العرض والمظهر</p>
     <div className="flex items-center gap-2">
      <Checkbox
      id="ecom-enabled"
      checked={getBool('enabled')}
      onCheckedChange={(v) => setOverride({ enabled: v === true })}
      />
      <Label htmlFor="ecom-enabled" className="text-xs cursor-pointer">تفعيل التجارة الإلكترونية</Label>
     </div>
     <div className="flex items-center gap-2">
      <Checkbox
      id="show-price"
      checked={getBool('show_price')}
      onCheckedChange={(v) => setOverride({ show_price: v === true })}
      />
      <Label htmlFor="show-price" className="text-xs cursor-pointer">عرض الأسعار</Label>
     </div>
     <div className="flex items-center gap-2">
      <Checkbox
      id="show-quantity"
      checked={getBool('show_quantity')}
      onCheckedChange={(v) => setOverride({ show_quantity: v === true })}
      />
      <Label htmlFor="show-quantity" className="text-xs cursor-pointer">عرض الكمية</Label>
     </div>
     <div className="flex items-center gap-2">
      <Checkbox
      id="show-cart"
      checked={getBool('show_add_to_cart_button')}
      onCheckedChange={(v) => setOverride({ show_add_to_cart_button: v === true })}
      />
      <Label htmlFor="show-cart" className="text-xs cursor-pointer">عرض زر أضف للسلة</Label>
     </div>
     <div className="flex items-center gap-2">
      <Checkbox
      id="show-contact"
      checked={getBool('show_contact_us_button')}
      onCheckedChange={(v) => setOverride({ show_contact_us_button: v === true })}
      />
      <Label htmlFor="show-contact" className="text-xs cursor-pointer">عرض زر تواصل معنا</Label>
     </div>
     </div>
     <div className="space-y-3 rounded-lg border border-border/30 p-3">
     <p className="text-xs font-semibold">الميزات المتقدمة</p>
     <div className="flex items-center gap-2">
      <Checkbox
      id="allow-no-stock"
      checked={getBool('allow_items_not_in_stock')}
      onCheckedChange={(v) => setOverride({ allow_items_not_in_stock: v === true })}
      />
      <Label htmlFor="allow-no-stock" className="text-xs cursor-pointer">السماح بطلب أصناف غير متوفرة</Label>
     </div>
     <div className="flex items-center gap-2">
      <Checkbox
      id="hide-variants"
      checked={getBool('hide_variants')}
      onCheckedChange={(v) => setOverride({ hide_variants: v === true })}
      />
      <Label htmlFor="hide-variants" className="text-xs cursor-pointer">إخفاء المتغيرات</Label>
     </div>
     <div className="flex items-center gap-2">
      <Checkbox
      id="enable-wishlist"
      checked={getBool('enable_wishlist')}
      onCheckedChange={(v) => setOverride({ enable_wishlist: v === true })}
      />
      <Label htmlFor="enable-wishlist" className="text-xs cursor-pointer">تفعيل قائمة الرغبات</Label>
     </div>
     <div className="flex items-center gap-2">
      <Checkbox
      id="enable-reviews"
      checked={getBool('enable_reviews')}
      onCheckedChange={(v) => setOverride({ enable_reviews: v === true })}
      />
      <Label htmlFor="enable-reviews" className="text-xs cursor-pointer">تفعيل التقييمات</Label>
     </div>
     <div className="flex items-center gap-2">
      <Checkbox
      id="enable-variants"
      checked={getBool('enable_variants')}
      onCheckedChange={(v) => setOverride({ enable_variants: v === true })}
      />
      <Label htmlFor="enable-variants" className="text-xs cursor-pointer">تفعيل المتغيرات</Label>
     </div>
     <div className="flex items-center gap-2">
      <Checkbox
      id="enable-enquiry"
      checked={getBool('enable_enquiry')}
      onCheckedChange={(v) => setOverride({ enable_enquiry: v === true })}
      />
      <Label htmlFor="enable-enquiry" className="text-xs cursor-pointer">تفعيل الاستفسارات</Label>
     </div>
     </div>
    </div>

    {/* Unsaved changes indicator */}
    {Object.keys(overrides).length > 0 && (
     <div className="rounded-lg border border-chart-2/20 bg-chart-2/5 p-2.5 space-y-1">
     <p className="text-[10px] font-semibold text-chart-2">
      لديك تغييرات غير محفوظة — اضغط &quot;حفظ الإعدادات&quot; لتطبيقها
     </p>
     </div>
    )}

    {/* Last Modified Info */}
    {settings?.modified && (
     <div className="flex items-center gap-3 rounded-lg border border-border/30 px-3 py-2 text-xs">
     <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
     <span className="text-muted-foreground">آخر تعديل:</span>
     <span className="font-medium">{formatDate(settings.modified)}</span>
     {settings.owner && (
      <>
      <span className="text-muted-foreground">بواسطة:</span>
      <span className="font-medium">{settings.owner}</span>
      </>
     )}
     </div>
    )}

    {/* Actions */}
    <div className="flex flex-wrap gap-2 pt-1">
     <Button size="sm" onClick={saveSettings} disabled={updateSettingsMut.isPending}>
     {updateSettingsMut.isPending ? (
      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري الحفظ…</>
     ) : (
      <><Save className="h-3.5 w-3.5" /> حفظ الإعدادات</>
     )}
     </Button>
     <Button
     size="sm"
     variant="secondary"
     className="gap-1.5"
     disabled={testing}
     onClick={testConnection}
     >
     <TestTube className="h-3.5 w-3.5" />
     {testing ? 'جاري الاتصال…' : 'اختبار الاتصال'}
     </Button>
     <Button
     size="sm"
     variant="outline"
     className="gap-1.5"
     onClick={() => { settingsQuery.refetch(); itemsQuery.refetch(); }}
     >
     <RefreshCw className="h-3.5 w-3.5" />
     تحديث
     </Button>
     {Object.keys(overrides).length > 0 && (
     <Button
      size="sm"
      variant="ghost"
      className="text-muted-foreground"
      onClick={() => setOverrides({})}
     >
      تراجع عن التغييرات
     </Button>
     )}
    </div>
    </CardContent>
   </Card>
   )}
  </TabsContent>

  {/* ─── Items Tab ─── */}
  <TabsContent value="items" className="space-y-5">
   <ListQueryAlert error={itemsQuery.isError ? itemsQuery.error : null} onRetry={() => itemsQuery.refetch()} />

   <DataTable
   data={items}
   columns={itemColumns}
   tableId="ecommerce-items"
   searchable
   loading={itemsQuery.isLoading}
   exportFileName="أصناف-التجارة-الإلكترونية"
   />
  </TabsContent>
  </Tabs>
 </div>
 );
}
