'use client';

/**
 * حقول مطابقة لمستند ERPNext develop: erpnext/selling/doctype/selling_settings/selling_settings.json
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
import { useToast } from '@/hooks/use-toast';
import { useDoc, useUpdateDoc } from '@/lib/client/hooks';

const SINGLETON = 'Selling Settings';

function docFlag(v: unknown): boolean {
  return v === 1 || v === true || v === '1';
}

export default function SellingSettingsPage() {
  const { toast } = useToast();
  const doc = useDoc<Record<string, unknown>>('Selling Settings', SINGLETON);
  const updateMut = useUpdateDoc('Selling Settings');
  const d = doc.data;

  const blanketAllow = d?.blanket_order_allowance != null ? String(d.blanket_order_allowance) : '';
  const [blanketDraft, setBlanketDraft] = useState(blanketAllow);
  useEffect(() => {
    queueMicrotask(() => setBlanketDraft(blanketAllow));
  }, [blanketAllow]);

  const patchAndSave = (patch: Record<string, unknown>) => {
    updateMut.mutate(
      { name: SINGLETON, doc: patch },
      {
        onSuccess: () => {
          toast({ title: 'تم الحفظ' });
          void doc.refetch();
        },
        onError: (e) =>
          toast({ title: 'تعذر الحفظ', description: (e as Error).message, variant: 'destructive' }),
      }
    );
  };

  const toggle = (field: string, checked: boolean) => patchAndSave({ [field]: checked ? 1 : 0 });

  const maintainRate = d ? docFlag(d.maintain_same_sales_rate) : false;
  const maintainAction = typeof d?.maintain_same_rate_action === 'string' ? d.maintain_same_rate_action : 'Stop';

  if (!d && !doc.isLoading && !doc.isError) {
    return null;
  }

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="إعدادات المبيعات"
        description="إعدادات المبيعات"
        iconify="solar:cart-large-2-bold-duotone"
        accent="info"
        breadcrumbs={[
          { label: 'الإعدادات', href: '/settings' },
          { label: 'إعدادات الوحدات', href: '/settings/module-settings' },
          { label: 'المبيعات' },
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
        <p className="text-sm text-destructive">تعذر تحميل إعدادات المبيعات.</p>
      ) : (
        <Card className="border-border/40 max-w-4xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">إعدادات المبيعات</CardTitle>
            <CardDescription className="text-xs">
              إعدادات المبيعات في النظام.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="defaults" className="w-full">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/35 p-1">
                <TabsTrigger value="defaults" className="text-xs">
                  العميل والافتراضيات
                </TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs">
                  التسعير
                </TabsTrigger>
                <TabsTrigger value="transaction" className="text-xs">
                  المعاملات
                </TabsTrigger>
                <TabsTrigger value="subcon" className="text-xs">
                  مقاولات من الباطن
                </TabsTrigger>
                <TabsTrigger value="advanced" className="text-xs">
                  متقدم
                </TabsTrigger>
              </TabsList>

              <TabsContent value="defaults" className="space-y-4 mt-4 outline-none">
                <div className="space-y-2">
                  <Label className="text-xs">تسمية العميل حسب</Label>
                  <Select
                    value={String(d.cust_master_name ?? 'Customer Name')}
                    onValueChange={(v) => patchAndSave({ cust_master_name: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Customer Name">اسم العميل</SelectItem>
                      <SelectItem value="Naming Series">سلسلة التسمية</SelectItem>
                      <SelectItem value="Auto Name">اسم تلقائي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">مجموعة العملاء الافتراضية</Label>
                  <ErpLinkCombobox
                    doctype="Customer Group"
                    value={String(d.customer_group ?? '')}
                    onChange={(v) => patchAndSave({ customer_group: v || undefined })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">المنطقة الافتراضية</Label>
                  <ErpLinkCombobox
                    doctype="Territory"
                    value={String(d.territory ?? '')}
                    onChange={(v) => patchAndSave({ territory: v || undefined })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">قائمة أسعار البيع الافتراضية</Label>
                  <ErpLinkCombobox
                    doctype="Price List"
                    value={String(d.selling_price_list ?? '')}
                    onChange={(v) => patchAndSave({ selling_price_list: v || undefined })}
                    className="h-9 text-sm"
                  />
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-3 mt-4 outline-none">
                {(
                  [
                    ['fallback_to_default_price_list', 'استخدام قائمة الأسعار الافتراضية كاحتياطي'],
                    ['editable_price_list_rate', 'السماح بتعديل سعر قائمة الأسعار في المعاملات'],
                    ['maintain_same_sales_rate', 'الاحتفاظ بنفس السعر طوال دورة البيع'],
                    ['validate_selling_price', 'التحقق من سعر البيع مقابل سعر التقييم'],
                    ['editable_bundle_item_rates', 'حساب سعر الحزمة من أسعار الأصناف الفرعية'],
                    ['allow_negative_rates_for_items', 'السماح بأسعار سالبة للأصناف'],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
                    <Label className="text-xs leading-snug">{label}</Label>
                    <Switch checked={docFlag(d[field])} onCheckedChange={(c) => toggle(field, c)} disabled={updateMut.isPending} />
                  </div>
                ))}
                {maintainRate ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs">إجراء إذا لم يتم الاحتفاظ بالسعر</Label>
                      <Select
                        value={maintainAction}
                        onValueChange={(v) => patchAndSave({ maintain_same_rate_action: v })}
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
                    {maintainAction === 'Stop' ? (
                      <div className="space-y-2">
                        <Label className="text-xs">الدور المسموح بتجاوز الإيقاف</Label>
                        <ErpLinkCombobox
                          doctype="Role"
                          value={String(d.role_to_override_stop_action ?? '')}
                          onChange={(v) => patchAndSave({ role_to_override_stop_action: v || undefined })}
                          className="h-9 text-sm"
                        />
                      </div>
                    ) : null}
                  </>
                ) : null}
              </TabsContent>

              <TabsContent value="transaction" className="space-y-4 mt-4 outline-none">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">أمر البيع مطلوب للفاتورة؟</Label>
                    <Select
                      value={String(d.so_required ?? 'No')}
                      onValueChange={(v) => patchAndSave({ so_required: v })}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No">لا</SelectItem>
                        <SelectItem value="Yes">نعم</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">إشعار التسليم مطلوب للفاتورة؟</Label>
                    <Select
                      value={String(d.dn_required ?? 'No')}
                      onValueChange={(v) => patchAndSave({ dn_required: v })}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No">لا</SelectItem>
                        <SelectItem value="Yes">نعم</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">تكرار تحديث المبيعات</Label>
                  <Select
                    value={String(d.sales_update_frequency ?? 'Daily')}
                    onValueChange={(v) => patchAndSave({ sales_update_frequency: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">شهري</SelectItem>
                      <SelectItem value="Each Transaction">كل معاملة</SelectItem>
                      <SelectItem value="Daily">يومي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(
                  [
                    ['allow_multiple_items', 'السماح بنفس الصنف عدة مرات في المعاملة'],
                    ['allow_against_multiple_purchase_orders', 'السماح بأوامر بيع متعددة ضد أمر شراء العميل'],
                    ['hide_tax_id', 'إخفاء الرقم الضريبي من معاملات البيع'],
                    ['allow_sales_order_creation_for_expired_quotation', 'السماح بأمر بيع لعرض سعر منتهي الصلاحية'],
                    ['dont_reserve_sales_order_qty_on_sales_return', 'عدم حجز الكمية في حالة إرجاع البيع'],
                    ['enable_cutoff_date_on_bulk_delivery_note_creation', 'تاريخ القطع عند إنشاء إشعارات التسليم'],
                    ['set_zero_rate_for_expired_batch', 'صفر للمجموعة المنتهية في الإشعارات الائتمانية المنفصلة'],
                    ['allow_zero_qty_in_quotation', 'السماح بعرض سعر بكمية صفر'],
                    ['allow_zero_qty_in_sales_order', 'السماح بأمر بيع بكمية صفر'],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
                    <Label className="text-xs leading-snug">{label}</Label>
                    <Switch checked={docFlag(d[field])} onCheckedChange={(c) => toggle(field, c)} disabled={updateMut.isPending} />
                  </div>
                ))}
                <div className="space-y-2">
                  <Label className="text-xs">نسبة التسامح لأوامر البيع المفتوحة (%)</Label>
                  <Input
                    dir="ltr"
                    type="number"
                    step="any"
                    className="h-9 font-mono text-sm"
                    value={blanketDraft}
                    onChange={(e) => setBlanketDraft(e.target.value)}
                    onBlur={() => {
                      const v = blanketDraft.trim();
                      patchAndSave({ blanket_order_allowance: v === '' ? 0 : Number(v) });
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="subcon" className="space-y-3 mt-4 outline-none">
                {(
                  [
                    ['allow_delivery_of_overproduced_qty', 'السماح بتسليم الكمية الزائدة (التصنيع الداخلي)'],
                    ['deliver_secondary_items', 'تسليم الأصناف الثانوية مع المنتج النهائي'],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
                    <Label className="text-xs leading-snug">{label}</Label>
                    <Switch checked={docFlag(d[field])} onCheckedChange={(c) => toggle(field, c)} disabled={updateMut.isPending} />
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="advanced" className="space-y-3 mt-4 outline-none">
                {(
                  [
                    ['enable_tracking_sales_commissions', 'تفعيل تتبع عمولات البيع'],
                    ['enable_discount_accounting', 'تفعيل محاسبة الخصومات للبيع'],
                    ['enable_utm', 'تفعيل UTM'],
                    ['use_legacy_js_reactivity', 'استخدام التفاعل من جانب العميل (قديم)'],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
                    <Label className="text-xs leading-snug">{label}</Label>
                    <Switch checked={docFlag(d[field])} onCheckedChange={(c) => toggle(field, c)} disabled={updateMut.isPending} />
                  </div>
                ))}
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
