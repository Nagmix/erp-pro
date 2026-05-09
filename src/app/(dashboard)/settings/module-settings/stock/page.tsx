'use client';

/**
 * مطابقة ERPNext develop: erpnext/stock/doctype/stock_settings/stock_settings.json
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useDoc, useUpdateDoc } from '@/lib/client/hooks';

const SINGLETON = 'Stock Settings';

function docFlag(v: unknown): boolean {
 return v === 1 || v === true || v === '1';
}

export default function StockSettingsPage() {
 const doc = useDoc<Record<string, unknown>>('Stock Settings', SINGLETON);
 const updateMut = useUpdateDoc('Stock Settings');
 const d = doc.data;

 const [draft, setDraft] = useState({
 over_delivery: '',
 mr_qty: '',
 over_pick: '',
 frozen_days: '',
 });
 const [namingPrefixDraft, setNamingPrefixDraft] = useState('');
 useEffect(() => {
 if (!d) return;
 queueMicrotask(() => {
  setDraft({
  over_delivery: d.over_delivery_receipt_allowance != null ? String(d.over_delivery_receipt_allowance) : '',
  mr_qty: d.mr_qty_allowance != null ? String(d.mr_qty_allowance) : '',
  over_pick: d.over_picking_allowance != null ? String(d.over_picking_allowance) : '',
  frozen_days: d.stock_frozen_upto_days != null ? String(d.stock_frozen_upto_days) : '',
  });
  setNamingPrefixDraft(String(d.naming_series_prefix ?? ''));
 });
 }, [d]);

 const patchAndSave = (patch: Record<string, unknown>) => {
 updateMut.mutate(
  { name: SINGLETON, doc: patch },
  {
  onSuccess: () => {
   toast.success('تم الحفظ');
   void doc.refetch();
  },
  onError: (e) =>
   toast.error('تعذر الحفظ', { description: (e as Error).message }),
  }
 );
 };

 const toggle = (field: string, checked: boolean) => patchAndSave({ [field]: checked ? 1 : 0 });
 const serialBatch = d ? docFlag(d.enable_serial_and_batch_no_for_item) : false;
 const stockRes = d ? docFlag(d.enable_stock_reservation) : false;
 const autoPrice = d ? docFlag(d.auto_insert_price_list_rate_if_missing) : false;

 return (
 <div className="erp-page-enter space-y-5" dir="rtl">
  <PageHeader
  title="إعدادات المخزون"
  description="إعدادات المخزون"
  iconify="solar:box-bold-duotone"
  accent="info"
  breadcrumbs={[
   { label: 'الإعدادات', href: '/settings' },
   { label: 'إعدادات الوحدات', href: '/settings/module-settings' },
   { label: 'المخزون' },
  ]}
  actions={
   <Button variant="outline" size="sm" asChild>
   <Link href="/settings/module-settings">
    <ArrowRight className="h-3.5 w-3.5" />
    المركز
   </Link>
   </Button>
  }
  />

  <ListQueryAlert error={doc.isError ? (doc.error as Error) : null} onRetry={() => void doc.refetch()} />

  {doc.isLoading ? (
  <p className="text-sm text-muted-foreground">جاري التحميل…</p>
  ) : !d ? (
  <p className="text-sm text-destructive">تعذر تحميل إعدادات المخزون.</p>
  ) : (
  <Card className="border-border/40 max-w-4xl">
   <CardHeader className="pb-2">
   <CardTitle className="text-base">إعدادات المخزون</CardTitle>
   <CardDescription className="text-xs">إعدادات المخزون في النظام.</CardDescription>
   </CardHeader>
   <CardContent>
   <Tabs defaultValue="defaults" className="w-full">
    <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/35 p-1">
    <TabsTrigger value="defaults" className="text-xs">
     الافتراضيات
    </TabsTrigger>
    <TabsTrigger value="validations" className="text-xs">
     التحقق والمخزون
    </TabsTrigger>
    <TabsTrigger value="serial" className="text-xs">
     تسلسل ودفعة
    </TabsTrigger>
    <TabsTrigger value="reservation" className="text-xs">
     حجز المخزون
    </TabsTrigger>
    <TabsTrigger value="quality" className="text-xs">
     الجودة
    </TabsTrigger>
    <TabsTrigger value="planning" className="text-xs">
     التخطيط والإغلاق
    </TabsTrigger>
    </TabsList>

    <TabsContent value="defaults" className="space-y-4 mt-4 outline-none">
    <div className="space-y-2">
     <Label className="text-xs">تسمية الصنف حسب</Label>
     <Select
     value={String(d.item_naming_by ?? 'Item Code')}
     onValueChange={(v) => patchAndSave({ item_naming_by: v })}
     >
     <SelectTrigger className="h-9 text-sm">
      <SelectValue />
     </SelectTrigger>
     <SelectContent>
      <SelectItem value="Item Code">كود الصنف</SelectItem>
      <SelectItem value="Naming Series">سلسلة التسمية</SelectItem>
     </SelectContent>
     </Select>
    </div>
    <div className="space-y-2">
     <Label className="text-xs">طريقة التقييم الافتراضية</Label>
     <Select
     value={String(d.valuation_method ?? 'FIFO')}
     onValueChange={(v) => patchAndSave({ valuation_method: v })}
     >
     <SelectTrigger className="h-9 text-sm">
      <SelectValue />
     </SelectTrigger>
     <SelectContent>
      <SelectItem value="FIFO">FIFO</SelectItem>
      <SelectItem value="Moving Average">المتوسط المتحرك</SelectItem>
      <SelectItem value="LIFO">LIFO</SelectItem>
     </SelectContent>
     </Select>
    </div>
    <div className="space-y-2">
     <Label className="text-xs">مجموعة الأصناف الافتراضية</Label>
     <ErpLinkCombobox
     doctype="Item Group"
     value={String(d.item_group ?? '')}
     onChange={(v) => patchAndSave({ item_group: v || undefined })}
     className="h-9 text-sm"
     />
    </div>
    <div className="space-y-2">
     <Label className="text-xs">وحدة القياس الافتراضية</Label>
     <ErpLinkCombobox doctype="UOM" value={String(d.stock_uom ?? '')} onChange={(v) => patchAndSave({ stock_uom: v || undefined })} className="h-9 text-sm" />
    </div>
    <div className="space-y-2">
     <Label className="text-xs">المستودع الافتراضي</Label>
     <ErpLinkCombobox
     doctype="Warehouse"
     value={String(d.default_warehouse ?? '')}
     onChange={(v) => patchAndSave({ default_warehouse: v || undefined })}
     className="h-9 text-sm"
     />
    </div>
    <div className="space-y-2">
     <Label className="text-xs">مستودع الاحتفاظ بالعينات</Label>
     <ErpLinkCombobox
     doctype="Warehouse"
     value={String(d.sample_retention_warehouse ?? '')}
     onChange={(v) => patchAndSave({ sample_retention_warehouse: v || undefined })}
     className="h-9 text-sm"
     />
    </div>
    <div className="space-y-2">
     <Label className="text-xs">إدراج سعر الصنف تلقائياً إذا كان مفقوداً</Label>
     <Switch checked={autoPrice} onCheckedChange={(c) => patchAndSave({ auto_insert_price_list_rate_if_missing: c ? 1 : 0 })} />
    </div>
    {autoPrice ? (
     <>
     <div className="space-y-2">
      <Label className="text-xs">تحديث الأسعار الموجودة</Label>
      <Switch
      checked={docFlag(d.update_existing_price_list_rate)}
      onCheckedChange={(c) => toggle('update_existing_price_list_rate', c)}
      />
     </div>
     <div className="space-y-2">
      <Label className="text-xs">تحديث السعر بناءً على</Label>
      <Select
      value={String(d.update_price_list_based_on ?? 'Rate')}
      onValueChange={(v) => patchAndSave({ update_price_list_based_on: v })}
      >
      <SelectTrigger className="h-9 text-sm">
       <SelectValue />
      </SelectTrigger>
      <SelectContent>
       <SelectItem value="Rate">السعر</SelectItem>
       <SelectItem value="Price List Rate">سعر قائمة الأسعار</SelectItem>
      </SelectContent>
      </Select>
     </div>
     </>
    ) : null}
    <div className="space-y-2">
     <Label className="text-xs">السماح بتعديل الكمية لوحدة القياس في البيع</Label>
     <Switch
     checked={docFlag(d.allow_to_edit_stock_uom_qty_for_sales)}
     onCheckedChange={(c) => toggle('allow_to_edit_stock_uom_qty_for_sales', c)}
     />
    </div>
    <div className="space-y-2">
     <Label className="text-xs">السماح بتعديل الكمية لوحدة القياس في الشراء</Label>
     <Switch
     checked={docFlag(d.allow_to_edit_stock_uom_qty_for_purchase)}
     onCheckedChange={(c) => toggle('allow_to_edit_stock_uom_qty_for_purchase', c)}
     />
    </div>
    <div className="space-y-2">
     <Label className="text-xs">السماح بوحدة القياس مع تحديد معامل التحويل في الصنف</Label>
     <Switch
     checked={docFlag(d.allow_uom_with_conversion_rate_defined_in_item)}
     onCheckedChange={(c) => toggle('allow_uom_with_conversion_rate_defined_in_item', c)}
     />
    </div>
    </TabsContent>

    <TabsContent value="validations" className="space-y-4 mt-4 outline-none">
    <div className="grid sm:grid-cols-2 gap-3">
     <div className="space-y-2">
     <Label className="text-xs">نسبة التسامح في التسليم/الاستلام الزائد (%)</Label>
     <Input
      dir="ltr"
      type="number"
      step="any"
      className="h-9 font-mono text-sm"
      value={draft.over_delivery}
      onChange={(e) => setDraft((p) => ({ ...p, over_delivery: e.target.value }))}
      onBlur={() => {
      const v = draft.over_delivery.trim();
      patchAndSave({ over_delivery_receipt_allowance: v === '' ? 0 : Number(v) });
      }}
     />
     </div>
     <div className="space-y-2">
     <Label className="text-xs">نسبة التسامح في النقل (%)</Label>
     <Input
      dir="ltr"
      type="number"
      step="any"
      className="h-9 font-mono text-sm"
      value={draft.mr_qty}
      onChange={(e) => setDraft((p) => ({ ...p, mr_qty: e.target.value }))}
      onBlur={() => {
      const v = draft.mr_qty.trim();
      patchAndSave({ mr_qty_allowance: v === '' ? 0 : Number(v) });
      }}
     />
     </div>
     <div className="space-y-2 sm:col-span-2">
     <Label className="text-xs">نسبة التسامح في الانتقاء الزائد (%)</Label>
     <Input
      dir="ltr"
      type="number"
      step="any"
      className="h-9 font-mono text-sm"
      value={draft.over_pick}
      onChange={(e) => setDraft((p) => ({ ...p, over_pick: e.target.value }))}
      onBlur={() => {
      const v = draft.over_pick.trim();
      patchAndSave({ over_picking_allowance: v === '' ? 0 : Number(v) });
      }}
     />
     </div>
    </div>
    <div className="space-y-2">
     <Label className="text-xs">الدور المسموح بالتسليم/الاستلام الزائد</Label>
     <ErpLinkCombobox
     doctype="Role"
     value={String(d.role_allowed_to_over_deliver_receive ?? '')}
     onChange={(v) => patchAndSave({ role_allowed_to_over_deliver_receive: v || undefined })}
     className="h-9 text-sm"
     />
    </div>
    {(
     [
     ['allow_negative_stock', 'السماح بالمخزون السالب'],
     ['show_barcode_field', 'إظهار حقل الباركود في معاملات المخزون'],
     ['clean_description_html', 'تحويل وصف الصنف إلى HTML نظيف'],
     ['allow_internal_transfer_at_arms_length_price', 'السماح بالنقل الداخلي بسعر السوق'],
     ['validate_material_transfer_warehouses', 'التحقق من مستودعات النقل'],
     ['allow_negative_stock_for_batch', 'السماح بالمخزون السالب للدفعة'],
     ] as const
    ).map(([field, label]) => (
     <div key={field} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
     <Label className="text-xs leading-snug">{label}</Label>
     <Switch checked={docFlag(d[field])} onCheckedChange={(c) => toggle(field, c)} disabled={updateMut.isPending} />
     </div>
    ))}
    </TabsContent>

    <TabsContent value="serial" className="space-y-3 mt-4 outline-none">
    <div className="space-y-2">
     <Label className="text-xs">تفعيل الرقم التسلسلي/الرقم التعريفي للدفعة</Label>
     <Switch
     checked={serialBatch}
     onCheckedChange={(c) => patchAndSave({ enable_serial_and_batch_no_for_item: c ? 1 : 0 })}
     />
    </div>
    {serialBatch ? (
     <>
     {(
      [
      ['allow_existing_serial_no', 'السماح بإعادة تصنيع/استلام الرقم التسلسلي'],
      ['do_not_use_batchwise_valuation', 'عدم استخدام التقييم على مستوى الدفعة'],
      ['auto_create_serial_and_batch_bundle_for_outward', 'إنشاء حزمة تلقائياًللإخراج'],
      ['use_serial_batch_fields', 'استخدام حقول التسلسلي/الدفعة'],
      [
       'do_not_update_serial_batch_on_creation_of_auto_bundle',
       'عدم التحديث عند إنشاء الحزمة التلقائية',
      ],
      ['disable_serial_no_and_batch_selector', 'تعطيل محدد التسلسلي/الدفعة'],
      ['set_serial_and_batch_bundle_naming_based_on_naming_series', 'تسمية الحزمة بناءً على سلسلة التسمية'],
      ['use_naming_series', ' سلسلة التسمية الافتراضية للدفعة؟'],
      ] as const
     ).map(([field, label]) => (
      <div key={field} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
      <Label className="text-xs leading-snug">{label}</Label>
      <Switch checked={docFlag(d[field])} onCheckedChange={(c) => toggle(field, c)} disabled={updateMut.isPending} />
      </div>
     ))}
     {docFlag(d.auto_create_serial_and_batch_bundle_for_outward) ? (
      <div className="space-y-2">
      <Label className="text-xs">اختيار التسلسلي/الدفعة بناءً على</Label>
      <Select
       value={String(d.pick_serial_and_batch_based_on ?? 'FIFO')}
       onValueChange={(v) => patchAndSave({ pick_serial_and_batch_based_on: v })}
      >
       <SelectTrigger className="h-9 text-sm">
       <SelectValue />
       </SelectTrigger>
       <SelectContent>
       <SelectItem value="FIFO">FIFO</SelectItem>
       <SelectItem value="LIFO">LIFO</SelectItem>
       <SelectItem value="Expiry">الانتهاء</SelectItem>
       </SelectContent>
      </Select>
      </div>
     ) : null}
     {docFlag(d.use_naming_series) ? (
      <div className="space-y-2">
      <Label className="text-xs">بادئة سلسلة التسمية</Label>
      <Input
       dir="ltr"
       className="h-9 font-mono text-sm"
       value={namingPrefixDraft}
       onChange={(e) => setNamingPrefixDraft(e.target.value)}
       onBlur={() => patchAndSave({ naming_series_prefix: namingPrefixDraft })}
      />
      </div>
     ) : null}
     </>
    ) : null}
    </TabsContent>

    <TabsContent value="reservation" className="space-y-3 mt-4 outline-none">
    <div className="space-y-2">
     <Label className="text-xs">تفعيل حجز المخزون</Label>
     <Switch checked={stockRes} onCheckedChange={(c) => patchAndSave({ enable_stock_reservation: c ? 1 : 0 })} />
    </div>
    {stockRes ? (
     <>
     {(
      [
      ['allow_partial_reservation', 'السماح بالحجز الجزئي'],
      ['auto_reserve_stock', 'حجز المخزون تلقائياً'],
      ['auto_reserve_serial_and_batch', 'حجز الأرقام التسلسلية والدفع'],
      ['auto_reserve_stock_for_sales_order_on_purchase', 'حجز المخزون لأمر البيع تلقائياً'],
      ] as const
     ).map(([field, label]) => (
      <div key={field} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
      <Label className="text-xs leading-snug">{label}</Label>
      <Switch checked={docFlag(d[field])} onCheckedChange={(c) => toggle(field, c)} disabled={updateMut.isPending} />
      </div>
     ))}
     </>
    ) : null}
    </TabsContent>

    <TabsContent value="quality" className="space-y-4 mt-4 outline-none">
    <div className="grid sm:grid-cols-2 gap-4">
     <div className="space-y-2">
     <Label className="text-xs">إجراء إذا لم يتم تقديم فحص الجودة</Label>
     <Select
      value={String(d.action_if_quality_inspection_is_not_submitted ?? 'Stop')}
      onValueChange={(v) => patchAndSave({ action_if_quality_inspection_is_not_submitted: v })}
     >
      <SelectTrigger className="h-9 text-sm">
      <SelectValue />
      </SelectTrigger>
      <SelectContent>
      <SelectItem value="Stop">إيقاف</SelectItem>
      <SelectItem value="Warn">تحذير</SelectItem>
      </SelectContent>
     </Select>
     </div>
     <div className="space-y-2">
     <Label className="text-xs">إجراء إذا تم رفض فحص الجودة</Label>
     <Select
      value={String(d.action_if_quality_inspection_is_rejected ?? 'Stop')}
      onValueChange={(v) => patchAndSave({ action_if_quality_inspection_is_rejected: v })}
     >
      <SelectTrigger className="h-9 text-sm">
      <SelectValue />
      </SelectTrigger>
      <SelectContent>
      <SelectItem value="Stop">إيقاف</SelectItem>
      <SelectItem value="Warn">تحذير</SelectItem>
      </SelectContent>
     </Select>
     </div>
    </div>
    <div className="space-y-2">
     <Label className="text-xs">السماح بفحص الجودة بعد Purchase / التسليم</Label>
     <Switch
     checked={docFlag(d.allow_to_make_quality_inspection_after_purchase_or_delivery)}
     onCheckedChange={(c) => toggle('allow_to_make_quality_inspection_after_purchase_or_delivery', c)}
     />
    </div>
    </TabsContent>

    <TabsContent value="planning" className="space-y-3 mt-4 outline-none">
    {(
     [
     ['auto_indent', 'إنشاء طلب مواد عند الوصول مستوى إعادة الطلب'],
     ['reorder_email_notify', 'إشعار عبر البريد عند طلب المواد التلقائي'],
     ] as const
    ).map(([field, label]) => (
     <div key={field} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
     <Label className="text-xs leading-snug">{label}</Label>
     <Switch checked={docFlag(d[field])} onCheckedChange={(c) => toggle(field, c)} disabled={updateMut.isPending} />
     </div>
    ))}
    <div className="space-y-2">
     <Label className="text-xs">تجميد المخزون حتى (stock_frozen_upto) — YYYY-MM-DD</Label>
     <Input
     dir="ltr"
     type="date"
     className="h-9 font-mono text-sm"
     value={typeof d.stock_frozen_upto === 'string' ? d.stock_frozen_upto.slice(0, 10) : ''}
     onChange={(e) => patchAndSave({ stock_frozen_upto: e.target.value || null })}
     />
    </div>
    <div className="space-y-2">
     <Label className="text-xs">تجميد المخزون الأقدم من (أيام)</Label>
     <Input
     dir="ltr"
     type="number"
     className="h-9 font-mono text-sm"
     value={draft.frozen_days}
     onChange={(e) => setDraft((p) => ({ ...p, frozen_days: e.target.value }))}
     onBlur={() => {
      const v = draft.frozen_days.trim();
      patchAndSave({ stock_frozen_upto_days: v === '' ? 0 : Number.parseInt(v, 10) });
     }}
     />
    </div>
    <div className="space-y-2">
     <Label className="text-xs">الدور المسموح بإنشاء/تعديل معاملات مؤجلة</Label>
     <ErpLinkCombobox
     doctype="Role"
     value={String(d.role_allowed_to_create_edit_back_dated_transactions ?? '')}
     onChange={(v) => patchAndSave({ role_allowed_to_create_edit_back_dated_transactions: v || undefined })}
     className="h-9 text-sm"
     />
    </div>
    <div className="space-y-2">
     <Label className="text-xs">الدور المسموح بتعديل المخزون المجمد</Label>
     <ErpLinkCombobox
     doctype="Role"
     value={String(d.stock_auth_role ?? '')}
     onChange={(v) => patchAndSave({ stock_auth_role: v || undefined })}
     className="h-9 text-sm"
     />
    </div>
    </TabsContent>
   </Tabs>
   {updateMut.isPending ? (
    <p className="text-[10px] text-muted-foreground mt-3">جاري الحفظ…</p>
   ) : null}
   </CardContent>
  </Card>
  )}
 </div>
 );
}
