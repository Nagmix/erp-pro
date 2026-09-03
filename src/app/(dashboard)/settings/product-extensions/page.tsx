'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
 type ProductExtensionsSettings,
 newReportScheduleRow,
} from '@/lib/product-extensions-settings.shared';

export default function ProductExtensionsSettingsPage() {
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [data, setData] = useState<ProductExtensionsSettings | null>(null);

 const load = useCallback(() => {
 queueMicrotask(() => setLoading(true));
 fetch('/api/settings/product-extensions')
  .then((r) => r.json())
  .then((j) => {
  queueMicrotask(() => {
   if (j?.success && j.data) setData(j.data as ProductExtensionsSettings);
   else toast.error('تعذر تحميل الإعدادات');
  });
  })
  .catch(() => toast.error('تعذر تحميل الإعدادات'))
  .finally(() => queueMicrotask(() => setLoading(false)));
 }, []);

 useEffect(() => {
 load();
 }, [load]);

 const patch = useCallback((partial: Partial<ProductExtensionsSettings>) => {
 setData((prev) => (prev ? { ...prev, ...partial } : prev));
 }, []);

 const save = useCallback(async () => {
 if (!data) return;
 setSaving(true);
 try {
  const res = await fetch('/api/settings/product-extensions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  });
  const j = await res.json();
  if (!j?.success) throw new Error('فشل الحفظ');
  setData(j.data as ProductExtensionsSettings);
  toast.success('تم حفظ امتدادات المنتج');
 } catch {
  toast.error('فشل الحفظ');
 } finally {
  setSaving(false);
 }
 }, [data]);

 if (loading || !data) {
 return (
  <div className="erp-page-enter p-6 text-sm text-muted-foreground" dir="rtl">
  جاري التحميل…
  </div>
 );
 }

 return (
 <div className="erp-page-enter space-y-5" dir="rtl">
  <PageHeader
  title="امتدادات المنتج"
  description="الرسائل النصية والمتاجر الإلكترونية وجداول التقارير — تخزين محلي للواجهة مع إمكانية الربط لاحقاً"
  iconify="solar:widget-add-bold-duotone"
  accent="info"
  breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'امتدادات المنتج' }]}
  actions={
   <Button size="sm" className="gap-1.5" disabled={saving} onClick={() => void save()}>
   {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
   حفظ
   </Button>
  }
  />

  <Tabs defaultValue="sms" className="space-y-4">
  <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/35 p-1">
   <TabsTrigger value="sms" className="text-xs">
   رسائل نصية
   </TabsTrigger>
   <TabsTrigger value="shops" className="text-xs">
   المتاجر
   </TabsTrigger>
   <TabsTrigger value="reports" className="text-xs">
   جدولة التقارير
   </TabsTrigger>
   <TabsTrigger value="workflow" className="text-xs">
   سير العمل
   </TabsTrigger>
  </TabsList>

  <TabsContent value="sms">
   <PageShell>
   <div className="flex items-center justify-between mb-4">
    <Label className="text-sm font-semibold">تفعيل طبقة الرسائل النصية</Label>
    <Switch checked={data.sms.enabled} onCheckedChange={(v) => patch({ sms: { ...data.sms, enabled: v } })} />
   </div>
   <div className="grid md:grid-cols-2 gap-4">
    <div className="space-y-2">
    <Label className="text-xs">المزوّد</Label>
    <Input
     dir="ltr"
     className="h-9"
     value={data.sms.provider}
     onChange={(e) => patch({ sms: { ...data.sms, provider: e.target.value } })}
    />
    </div>
    <div className="space-y-2">
    <Label className="text-xs">معرّف المرسل</Label>
    <Input
     dir="ltr"
     className="h-9"
     value={data.sms.senderId}
     onChange={(e) => patch({ sms: { ...data.sms, senderId: e.target.value } })}
    />
    </div>
    <div className="space-y-2 md:col-span-2">
    <Label className="text-xs">مفتاح الواجهة البرمجية</Label>
    <Input
     dir="ltr"
     type="password"
     className="h-9"
     value={data.sms.apiKey}
     onChange={(e) => patch({ sms: { ...data.sms, apiKey: e.target.value } })}
     autoComplete="off"
    />
    </div>
   </div>
   </PageShell>
  </TabsContent>

  <TabsContent value="shops">
   <PageShell className="space-y-6">
   <div className="space-y-3 rounded-lg border border-border/40 p-4">
    <div className="flex items-center justify-between">
    <span className="text-sm font-semibold">سلة (Salla)</span>
    <Switch
     checked={data.ecommerce.salla.enabled}
     onCheckedChange={(v) =>
     patch({ ecommerce: { ...data.ecommerce, salla: { ...data.ecommerce.salla, enabled: v } } })
     }
    />
    </div>
    <div className="space-y-2">
    <Label className="text-xs">سر خطاف الويب</Label>
    <Input
     dir="ltr"
     type="password"
     className="h-9"
     value={data.ecommerce.salla.webhookSecret}
     onChange={(e) =>
     patch({ ecommerce: { ...data.ecommerce, salla: { ...data.ecommerce.salla, webhookSecret: e.target.value } } })
     }
    />
    </div>
   </div>
   <div className="space-y-3 rounded-lg border border-border/40 p-4">
    <div className="flex items-center justify-between">
    <span className="text-sm font-semibold">زيد (Zid)</span>
    <Switch
     checked={data.ecommerce.zid.enabled}
     onCheckedChange={(v) =>
     patch({ ecommerce: { ...data.ecommerce, zid: { ...data.ecommerce.zid, enabled: v } } })
     }
    />
    </div>
    <div className="space-y-2">
    <Label className="text-xs">رمز الواجهة البرمجية</Label>
    <Input
     dir="ltr"
     type="password"
     className="h-9"
     value={data.ecommerce.zid.apiToken}
     onChange={(e) =>
     patch({ ecommerce: { ...data.ecommerce, zid: { ...data.ecommerce.zid, apiToken: e.target.value } } })
     }
    />
    </div>
   </div>
   <div className="space-y-3 rounded-lg border border-border/40 p-4">
    <div className="flex items-center justify-between">
    <span className="text-sm font-semibold">شوبفاي (Shopify)</span>
    <Switch
     checked={data.ecommerce.shopify.enabled}
     onCheckedChange={(v) =>
     patch({
      ecommerce: { ...data.ecommerce, shopify: { ...data.ecommerce.shopify, enabled: v } },
     })
     }
    />
    </div>
    <div className="grid md:grid-cols-2 gap-4">
    <div className="space-y-2">
     <Label className="text-xs">نطاق المتجر</Label>
     <Input
     dir="ltr"
     className="h-9"
     placeholder="my-store.myshopify.com"
     value={data.ecommerce.shopify.shopDomain}
     onChange={(e) =>
      patch({
      ecommerce: {
       ...data.ecommerce,
       shopify: { ...data.ecommerce.shopify, shopDomain: e.target.value },
      },
      })
     }
     />
    </div>
    <div className="space-y-2">
     <Label className="text-xs">رمز الوصول (Access Token)</Label>
     <Input
     dir="ltr"
     type="password"
     className="h-9"
     value={data.ecommerce.shopify.accessToken}
     onChange={(e) =>
      patch({
      ecommerce: {
       ...data.ecommerce,
       shopify: { ...data.ecommerce.shopify, accessToken: e.target.value },
      },
      })
     }
     />
    </div>
    </div>
   </div>
   </PageShell>
  </TabsContent>

  <TabsContent value="reports">
   <PageShell className="space-y-3">
   {data.reportSchedules.length === 0 && (
    <p className="text-xs text-muted-foreground">لا صفوف جدولة بعد. أضف صفاً أو احفظ بقائمة فارغة.</p>
   )}
   {data.reportSchedules.map((row, i) => (
    <div key={row.id} className="flex flex-wrap gap-2 items-end rounded-lg border border-border/40 p-3">
    <div className="space-y-1 min-w-[140px] flex-1">
     <Label className="text-xs">مفتاح التقرير</Label>
     <Input
     dir="ltr"
     className="h-9 text-sm"
     value={row.reportKey}
     onChange={(e) => {
      const next = [...data.reportSchedules];
      next[i] = { ...row, reportKey: e.target.value };
      patch({ reportSchedules: next });
     }}
     />
    </div>
    <div className="space-y-1 w-[120px]">
     <Label className="text-xs">التكرار</Label>
     <select
     className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
     value={row.frequency}
     onChange={(e) => {
      const next = [...data.reportSchedules];
      next[i] = { ...row, frequency: e.target.value as (typeof row)['frequency'] };
      patch({ reportSchedules: next });
     }}
     >
     <option value="daily">يومي</option>
     <option value="weekly">أسبوعي</option>
     <option value="monthly">شهري</option>
     </select>
    </div>
    <div className="space-y-1 w-[88px]">
     <Label className="text-xs">ساعة UTC</Label>
     <Input
     type="number"
     min={0}
     max={23}
     className="h-9"
     dir="ltr"
     value={row.hourUtc}
     onChange={(e) => {
      const next = [...data.reportSchedules];
      next[i] = { ...row, hourUtc: Number(e.target.value) || 0 };
      patch({ reportSchedules: next });
     }}
     />
    </div>
    <Button
     type="button"
     variant="ghost"
     size="icon"
     className="w-9 text-destructive"
     onClick={()=> {
     patch({ reportSchedules: data.reportSchedules.filter((_, j) => j !== i) });
     }}
    >
     <Trash2 className="h-4 w-4" />
    </Button>
    </div>
   ))}
   <Button
    type="button"
    variant="outline"
    size="sm"
    className="gap-1"
    onClick={() => patch({ reportSchedules: [...data.reportSchedules, newReportScheduleRow()] })}
   >
    <Plus className="h-3.5 w-3.5" />
    صف جدولة
   </Button>
   </PageShell>
  </TabsContent>

  <TabsContent value="workflow">
   <PageShell>
   <div className="space-y-2 max-w-lg">
    <Label className="text-xs">مسار صفحة استوديو سير العمل (داخل التطبيق)</Label>
    <Input
    dir="ltr"
    className="h-9"
    value={data.workflowStudioUrl}
    onChange={(e) => patch({ workflowStudioUrl: e.target.value })}
    />
    <p className="text-[11px] text-muted-foreground">
    الافتراضي يوجّه إلى `/operations/workflow-studio` لمستندات Workflow في النظام.
    </p>
   </div>
   </PageShell>
  </TabsContent>
  </Tabs>
 </div>
 );
}
