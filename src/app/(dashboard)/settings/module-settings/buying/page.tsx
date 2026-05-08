'use client';

/**
 * مطابقة ERPNext develop: erpnext/buying/doctype/buying_settings/buying_settings.json
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

const SINGLETON = 'Buying Settings';

function docFlag(v: unknown): boolean {
  return v === 1 || v === true || v === '1';
}

export default function BuyingSettingsPage() {
  const { toast } = useToast();
  const doc = useDoc<Record<string, unknown>>('Buying Settings', SINGLETON);
  const updateMut = useUpdateDoc('Buying Settings');
  const d = doc.data;

  const blanket = d?.blanket_order_allowance != null ? String(d.blanket_order_allowance) : '';
  const overTransfer = d?.over_transfer_allowance != null ? String(d.over_transfer_allowance) : '';
  const [blanketDraft, setBlanketDraft] = useState(blanket);
  const [overTransferDraft, setOverTransferDraft] = useState(overTransfer);
  useEffect(() => {
    queueMicrotask(() => {
      setBlanketDraft(blanket);
      setOverTransferDraft(overTransfer);
    });
  }, [blanket, overTransfer]);

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
  const maintainRate = d ? docFlag(d.maintain_same_rate) : false;
  const maintainAction = typeof d?.maintain_same_rate_action === 'string' ? d.maintain_same_rate_action : 'Stop';
  const backflush = typeof d?.backflush_raw_materials_of_subcontract_based_on === 'string' ? d.backflush_raw_materials_of_subcontract_based_on : 'BOM';

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="إعدادات المشتريات"
        description="إعدادات المشتريات"
        iconify="solar:bag-4-bold-duotone"
        accent="warning"
        breadcrumbs={[
          { label: 'الإعدادات', href: '/settings' },
          { label: 'إعدادات الوحدات', href: '/settings/module-settings' },
          { label: 'المشتريات' },
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
        <p className="text-sm text-destructive">تعذر تحميل إعدادات المشتريات.</p>
      ) : (
        <Card className="border-border/40 max-w-4xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">إعدادات المشتريات</CardTitle>
            <CardDescription className="text-xs">إعدادات المشتريات في النظام.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="defaults" className="w-full">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/35 p-1">
                <TabsTrigger value="defaults" className="text-xs">
                  التسمية والأسعار
                </TabsTrigger>
                <TabsTrigger value="transaction" className="text-xs">
                  المعاملات
                </TabsTrigger>
                <TabsTrigger value="subcon" className="text-xs">
                  المقاولات من الباطن
                </TabsTrigger>
                <TabsTrigger value="rfq" className="text-xs">
                  طلب عروض أسعار
                </TabsTrigger>
              </TabsList>

              <TabsContent value="defaults" className="space-y-4 mt-4 outline-none">
                <div className="space-y-2">
                  <Label className="text-xs">تسمية المورد حسب</Label>
                  <Select
                    value={String(d.supp_master_name ?? 'Supplier Name')}
                    onValueChange={(v) => patchAndSave({ supp_master_name: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Supplier Name">اسم المورد</SelectItem>
                      <SelectItem value="Naming Series">سلسلة التسمية</SelectItem>
                      <SelectItem value="Auto Name">اسم تلقائي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">مجموعة الموردين الافتراضية</Label>
                  <ErpLinkCombobox
                    doctype="Supplier Group"
                    value={String(d.supplier_group ?? '')}
                    onChange={(v) => patchAndSave({ supplier_group: v || undefined })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">قائمة أسعار الشراء الافتراضية</Label>
                  <ErpLinkCombobox
                    doctype="Price List"
                    value={String(d.buying_price_list ?? '')}
                    onChange={(v) => patchAndSave({ buying_price_list: v || undefined })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">أمر شراء مطلوب للفاتورة/الاستلام؟</Label>
                    <Select value={String(d.po_required ?? 'No')} onValueChange={(v) => patchAndSave({ po_required: v })}>
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
                    <Label className="text-xs">طلب شراء مطلوب للفاتورة؟</Label>
                    <Select value={String(d.pr_required ?? 'No')} onValueChange={(v) => patchAndSave({ pr_required: v })}>
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
                  <Label className="text-xs">تحديث المشروع (project_update_frequency)</Label>
                  <Select
                    value={String(d.project_update_frequency ?? 'Each Transaction')}
                    onValueChange={(v) => patchAndSave({ project_update_frequency: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Each Transaction">كل معاملة</SelectItem>
                      <SelectItem value="Manual">يدوي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">نسبة التسامح لأوامر الشراء المفتوحة (%)</Label>
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
                <div className="space-y-2">
                  <Label className="text-xs">الاحتفاظ بسعر ثابت طوال دورة الشراء</Label>
                  <Switch checked={maintainRate} onCheckedChange={(c) => patchAndSave({ maintain_same_rate: c ? 1 : 0 })} />
                </div>
                {maintainRate ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs">إجراء إذا لم يتم الاحتفاظ بالسعر</Label>
                      <Select value={maintainAction} onValueChange={(v) => patchAndSave({ maintain_same_rate_action: v })}>
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

              <TabsContent value="transaction" className="space-y-3 mt-4 outline-none">
                {(
                  [
                    ['allow_multiple_items', 'السماح بإضافة نفس الصنف عدة مرات'],
                    ['bill_for_rejected_quantity_in_purchase_invoice', 'فوترة الكمية المرفوضة في فاتورة الشراء'],
                    ['set_valuation_rate_for_rejected_materials', 'تعيين سعر التقييم للمواد المرفوضة'],
                    ['disable_last_purchase_rate', 'تعطيل آخر سعر شراء'],
                    ['show_pay_button', 'إظهار زر الدفع في بوابة أوامر الشراء'],
                    ['set_landed_cost_based_on_purchase_invoice_rate', 'تعيين التكلفة بناءً على سعر الفاتورة'],
                    ['use_transaction_date_exchange_rate', 'استخدام سعر الصرف بتاريخ المعاملة'],
                    ['auto_create_subcontracting_order', 'إنشاء تلقائي لأمر التصنيع الداخلي'],
                    ['auto_create_purchase_receipt', 'إنشاء تلقائي لاستلام المشتريات'],
                    ['allow_zero_qty_in_purchase_order', 'السماح بأمر شراء بكمية صفر'],
                    ['allow_zero_qty_in_request_for_quotation', 'السماح بطلب عرض سعر بكمية صفر'],
                    ['allow_zero_qty_in_supplier_quotation', 'السماح بعرض سعر المورد بكمية صفر'],
                    ['allow_negative_rates_for_items', 'السماح بأسعار سالبة'],
                    ['validate_consumed_qty', 'التحقق من الكمية المستهلكة (حسب قائمة المواد)'],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
                    <Label className="text-xs leading-snug">{label}</Label>
                    <Switch checked={docFlag(d[field])} onCheckedChange={(c) => toggle(field, c)} disabled={updateMut.isPending} />
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="subcon" className="space-y-4 mt-4 outline-none">
                <div className="space-y-2">
                  <Label className="text-xs">الصرف بناءً على</Label>
                  <Select value={backflush} onValueChange={(v) => patchAndSave({ backflush_raw_materials_of_subcontract_based_on: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BOM">قائمة المواد</SelectItem>
                      <SelectItem value="Material Transferred for Subcontract">المواد المنقولة للتصنيع</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {backflush === 'BOM' ? (
                  <div className="space-y-2">
                    <Label className="text-xs">نسبة التسامح للزيادة في الصرف (%)</Label>
                    <Input
                      dir="ltr"
                      type="number"
                      step="any"
                      className="h-9 font-mono text-sm"
                      value={overTransferDraft}
                      onChange={(e) => setOverTransferDraft(e.target.value)}
                      onBlur={() => {
                        const v = overTransferDraft.trim();
                        patchAndSave({ over_transfer_allowance: v === '' ? 0 : Number(v) });
                      }}
                    />
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="rfq" className="space-y-4 mt-4 outline-none">
                <div className="space-y-2">
                  <Label className="text-xs">حساب البريد الإلكتروني الثابت</Label>
                  <ErpLinkCombobox
                    doctype="Email Account"
                    value={String(d.fixed_email ?? '')}
                    onChange={(v) => patchAndSave({ fixed_email: v || undefined })}
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
