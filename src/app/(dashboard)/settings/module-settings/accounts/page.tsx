'use client';

/**
 * مطابقة ERPNext develop: erpnext/accounts/doctype/accounts_settings/accounts_settings.json
 * محرر مباشر لإعدادات الحسابات في ERPNext
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, CheckCircle2, Save } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useDoc, useUpdateDoc } from '@/lib/client/hooks';

const SINGLETON = 'Accounts Settings';

function docFlag(v: unknown): boolean {
 return v === 1 || v === true || v === '1';
}

/* ─── مكون صف إعداد Switch ─── */
function SwitchRow({ field, label, value, onToggle, disabled }: {
 field: string;
 label: string;
 value: boolean;
 onToggle: (field: string, checked: boolean) => void;
 disabled?: boolean;
}) {
 return (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3 hover:bg-muted/20 transition-colors">
   <Label className="text-xs leading-snug">{label}</Label>
   <Switch checked={value} onCheckedChange={(c) => onToggle(field, c)} disabled={disabled} />
  </div>
 );
}

/* ─── مكون تحميل ─── */
function SettingsSkeleton() {
 return (
  <Card className="border-border/40 max-w-4xl">
   <CardHeader className="pb-2">
    <Skeleton className="h-5 w-40 rounded" />
    <Skeleton className="h-3 w-60 rounded" />
   </CardHeader>
   <CardContent className="space-y-4">
    <Skeleton className="h-9 w-full rounded-lg" />
    <div className="space-y-3 mt-4">
     {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
       <Skeleton className="h-3.5 w-40 rounded" />
       <Skeleton className="h-5 w-9 rounded" />
      </div>
     ))}
    </div>
   </CardContent>
  </Card>
 );
}

export default function AccountsSettingsPage() {
 const doc = useDoc<Record<string, unknown>>('Accounts Settings', SINGLETON);
 const updateMut = useUpdateDoc('Accounts Settings');
 const d = doc.data;

 const [overBillDraft, setOverBillDraft] = useState('');
 const [staleDaysDraft, setStaleDaysDraft] = useState('');
 const [saveSuccess, setSaveSuccess] = useState(false);

 useEffect(() => {
  if (!d) return;
  setOverBillDraft(d.over_billing_allowance != null ? String(d.over_billing_allowance) : '');
  setStaleDaysDraft(d.stale_days != null ? String(d.stale_days) : '');
 }, [d]);

 const patchAndSave = (patch: Record<string, unknown>) => {
  setSaveSuccess(false);
  updateMut.mutate(
   { name: SINGLETON, doc: patch },
   {
   onSuccess: () => {
    toast.success('تم الحفظ بنجاح');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    void doc.refetch();
   },
   onError: (e) =>
    toast.error('تعذر الحفظ', { description: (e as Error).message }),
   }
  );
 };

 const toggle = (field: string, checked: boolean) => patchAndSave({ [field]: checked ? 1 : 0 });
 const internalMaintain = d ? docFlag(d.maintain_same_internal_transaction_rate) : false;
 const internalAction = typeof d?.maintain_same_rate_action === 'string' ? d.maintain_same_rate_action : 'Stop';

 return (
 <div className="erp-page-enter space-y-5" dir="rtl">
  <PageHeader
  title="إعدادات الحسابات المتقدمة"
  description="إعدادات الحسابات التفصيلية في النظام (ERPNext Accounts Settings)"
  iconify="solar:wallet-money-bold-duotone"
  accent="success"
  breadcrumbs={[
   { label: 'الإعدادات', href: '/settings' },
   { label: 'إعدادات الوحدات', href: '/settings/module-settings' },
   { label: 'المحاسبة' },
  ]}
  actions={
   <div className="flex items-center gap-2">
    {saveSuccess && (
     <span className="flex items-center gap-1 text-xs text-chart-3 animate-in fade-in">
      <CheckCircle2 className="h-3.5 w-3.5" />
      تم الحفظ
     </span>
    )}
    {updateMut.isPending && (
     <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      جاري الحفظ...
     </span>
    )}
    <Button variant="outline" size="sm" asChild>
    <Link href="/settings/module-settings">
     <ArrowRight className="h-3.5 w-3.5" />
     المركز
    </Link>
    </Button>
   </div>
  }
  />

  <ListQueryAlert error={doc.isError ? (doc.error as Error) : null} onRetry={() => void doc.refetch()} />

  {doc.isLoading ? (
  <SettingsSkeleton />
  ) : !d ? (
  <Card className="border-destructive/30 max-w-4xl">
   <CardContent className="py-8 text-center">
    <p className="text-sm text-destructive">تعذر تحميل إعدادات الحسابات. تأكد من اتصال الخادم وحاول مرة أخرى.</p>
    <Button variant="outline" size="sm" className="mt-3" onClick={() => void doc.refetch()}>
     إعادة المحاولة
    </Button>
   </CardContent>
  </Card>
  ) : (
  <Card className="border-border/40 max-w-4xl">
   <CardHeader className="pb-2">
   <CardTitle className="text-base flex items-center gap-2">
    <Save className="h-4 w-4 text-primary" />
    إعدادات الحسابات
   </CardTitle>
   <CardDescription className="text-xs">
    التحكم في سلوك الفواتير والمدفوعات والأصول والإعدادات المتقدمة. يتم الحفظ تلقائياً عند التغيير.
   </CardDescription>
   </CardHeader>
   <CardContent>
   <Tabs defaultValue="invoice" className="w-full">
    <div className="overflow-x-auto -mx-1 px-1">
    <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/35 p-1">
    <TabsTrigger value="invoice" className="text-xs">
     فواتير وضريبة
    </TabsTrigger>
    <TabsTrigger value="invoicing" className="text-xs">
     إعدادات الفوترة
    </TabsTrigger>
    <TabsTrigger value="payments" className="text-xs">
     مدفوعات
    </TabsTrigger>
    <TabsTrigger value="assets" className="text-xs">
     أصول
    </TabsTrigger>
    <TabsTrigger value="other" className="text-xs">
     أخرى
    </TabsTrigger>
    </TabsList>
    </div>

    {/* ─── فواتير وضريبة ─── */}
    <TabsContent value="invoice" className="space-y-3 mt-4 outline-none">
    <div className="space-y-2">
     <Label className="text-xs font-medium">تحديد عنوان الضريبة من</Label>
     <Select
     value={String(d.determine_address_tax_category_from ?? 'Billing Address')}
     onValueChange={(v) => patchAndSave({ determine_address_tax_category_from: v })}
     >
     <SelectTrigger className="h-9 text-sm">
      <SelectValue />
     </SelectTrigger>
     <SelectContent>
      <SelectItem value="Billing Address">عنوان الفوترة</SelectItem>
      <SelectItem value="Shipping Address">عنوان الشحن</SelectItem>
     </SelectContent>
     </Select>
    </div>
    {(
     [
     ['unlink_payment_on_cancellation_of_invoice', 'إلغاء ربط الدفع عند إلغاء الفاتورة'],
     ['unlink_advance_payment_on_cancelation_of_order', 'إلغاء ربط الدفع المقدم عند إلغاء الأمر'],
     ['delete_linked_ledger_entries', 'حذف إدخالات دفتر الأستاذ المرتبطة'],
     ['check_supplier_invoice_uniqueness', 'التحقق من تفرد رقم فاتورة المورد'],
     ['automatically_fetch_payment_terms', 'جلب شروط الدفع تلقائياً'],
     ['enable_common_party_accounting', 'تفعيل المحاسبة المشتركة'],
     [
      'allow_multi_currency_invoices_against_single_party_account',
      'السماح بفواتير متعددة العملات لحساب واحد',
     ],
     ['confirm_before_resetting_posting_date', 'تأكيد قبل إعادة تعيين تاريخ الترحيل'],
     ['add_taxes_from_item_tax_template', 'إضافة الضرائب تلقائياً من قالب الضرائب'],
     ['add_taxes_from_taxes_and_charges_template', 'إضافة الضرائب من قالب الضرائب والرسوم'],
     ['book_tax_discount_loss', 'تسجيل خسارة خصم الضرائب'],
     ['round_row_wise_tax', 'تقريب الضرائب لكل صف'],
     ['show_inclusive_tax_in_print', 'إظهار الضريبة الشاملة في الطباعة'],
     ['show_taxes_as_table_in_print', 'إظهار الضرائب كجدول في الطباعة'],
     ['show_payment_schedule_in_print', 'إظهار جدول الدفع في الطباعة'],
     ] as const
    ).map(([field, label]) => (
     <SwitchRow key={field} field={field} label={label} value={docFlag(d[field])} onToggle={toggle} disabled={updateMut.isPending} />
    ))}
    </TabsContent>

    {/* ─── إعدادات الفوترة ─── */}
    <TabsContent value="invoicing" className="space-y-4 mt-4 outline-none">
    <div className="grid sm:grid-cols-2 gap-4">
     <div className="space-y-2">
     <Label className="text-xs font-medium">نسبة التسامح في تجاوز الفوترة (%)</Label>
     <Input
      dir="ltr"
      type="number"
      step="any"
      className="h-9 font-mono text-sm"
      value={overBillDraft}
      onChange={(e) => setOverBillDraft(e.target.value)}
      onBlur={() => {
      const v = overBillDraft.trim();
      patchAndSave({ over_billing_allowance: v === '' ? 0 : Number(v) });
      }}
     />
     </div>
     <div className="space-y-2">
     <Label className="text-xs font-medium">الدور المسموح بتجاوز حد الائتمان</Label>
     <ErpLinkCombobox
      doctype="Role"
      value={String(d.credit_controller ?? '')}
      onChange={(v) => patchAndSave({ credit_controller: v || undefined })}
      className="h-9 text-sm"
     />
     </div>
     <div className="space-y-2 sm:col-span-2">
     <Label className="text-xs font-medium">الدور المسموح بتجاوز الفوترة</Label>
     <ErpLinkCombobox
      doctype="Role"
      value={String(d.role_allowed_to_over_bill ?? '')}
      onChange={(v) => patchAndSave({ role_allowed_to_over_bill: v || undefined })}
      className="h-9 text-sm"
     />
     </div>
    </div>
    <Separator className="my-2" />
    <div className="space-y-2">
     <Label className="text-xs font-medium">الاحتفاظ بسعر ثابت للمعاملات الداخلية</Label>
     <Switch
     checked={internalMaintain}
     onCheckedChange={(c) => patchAndSave({ maintain_same_internal_transaction_rate: c ? 1 : 0 })}
     />
    </div>
    {internalMaintain ? (
     <>
     <div className="space-y-2">
      <Label className="text-xs font-medium">إجراء إذا لم يتم الاحتفاظ بالسعر</Label>
      <Select value={internalAction} onValueChange={(v) => patchAndSave({ maintain_same_rate_action: v })}>
      <SelectTrigger className="h-9 text-sm">
       <SelectValue />
      </SelectTrigger>
      <SelectContent>
       <SelectItem value="Stop">إيقاف</SelectItem>
       <SelectItem value="Warn">تحذير</SelectItem>
      </SelectContent>
      </Select>
     </div>
     {internalAction === 'Stop' ? (
      <div className="space-y-2">
      <Label className="text-xs font-medium">الدور المسموح بتجاوز الإيقاف</Label>
      <ErpLinkCombobox
       doctype="Role"
       value={String(d.role_to_override_stop_action ?? '')}
       onChange={(v) => patchAndSave({ role_to_override_stop_action: v || undefined })}
       className="h-9 text-sm"
      />
      </div>
     ) : null}
     <div className="space-y-2">
      <Label className="text-xs font-medium">جلب سعر التقييم للمعاملة الداخلية</Label>
      <Switch
      checked={docFlag(d.fetch_valuation_rate_for_internal_transaction)}
      onCheckedChange={(c) => toggle('fetch_valuation_rate_for_internal_transaction', c)}
      />
     </div>
     </>
    ) : null}
    </TabsContent>

    {/* ─── مدفوعات ─── */}
    <TabsContent value="payments" className="space-y-3 mt-4 outline-none">
    <div className="space-y-2">
     <Label className="text-xs font-medium">السماح بأسعار الصرف القديمة</Label>
     <Switch checked={docFlag(d.allow_stale)} onCheckedChange={(c) => toggle('allow_stale', c)} />
    </div>
    <div className="space-y-2">
     <Label className="text-xs font-medium">أيام قديمة (stale_days)</Label>
     <Input
     dir="ltr"
     type="number"
     className="h-9 font-mono text-sm"
     value={staleDaysDraft}
     onChange={(e) => setStaleDaysDraft(e.target.value)}
     onBlur={() => {
      const v = staleDaysDraft.trim();
      patchAndSave({ stale_days: v === '' ? 0 : Number.parseInt(v, 10) });
     }}
     />
    </div>
    {(
     [
     ['allow_pegged_currencies_exchange_rates', 'السماح بأسعار صرف العملات المرتبطة'],
     ['auto_reconcile_payments', 'موازنة المدفوعات تلقائياً'],
     ['enable_party_matching', 'تفعيل مطابقة الأطراف'],
     ['enable_fuzzy_matching', 'تفعيل المطابقة التقريبية'],
     ['enable_loyalty_point_program', 'تفعيل برنامج نقاط الولاء'],
     ['fetch_payment_schedule_in_payment_request', 'جلب جدول الدفع في طلب الدفع'],
     ['create_pr_in_draft_status', 'إنشاء طلب دفع بالحالة مسودة'],
     ] as const
    ).map(([field, label]) => (
     <SwitchRow key={field} field={field} label={label} value={docFlag(d[field])} onToggle={toggle} disabled={updateMut.isPending} />
    ))}
    </TabsContent>

    {/* ─── أصول ─── */}
    <TabsContent value="assets" className="space-y-3 mt-4 outline-none">
    {(
     [
     ['book_asset_depreciation_entry_automatically', 'تسجيل قسط الأصل تلقائياً'],
     ['calculate_depr_using_total_days', 'حساب الإهلاك باستخدام الأيام الكلية'],
     ] as const
    ).map(([field, label]) => (
     <SwitchRow key={field} field={field} label={label} value={docFlag(d[field])} onToggle={toggle} disabled={updateMut.isPending} />
    ))}
    <div className="space-y-2">
     <Label className="text-xs font-medium">الدور المراد إشعاره عند فشل الإهلاك</Label>
     <ErpLinkCombobox
     doctype="Role"
     value={String(d.role_to_notify_on_depreciation_failure ?? '')}
     onChange={(v) => patchAndSave({ role_to_notify_on_depreciation_failure: v || undefined })}
     className="h-9 text-sm"
     />
    </div>
    </TabsContent>

    {/* ─── أخرى ─── */}
    <TabsContent value="other" className="space-y-3 mt-4 outline-none">
    {(
     [
     ['enable_immutable_ledger', 'تفعيل دفتر الأستاذ غير القابل للتغيير'],
     ['merge_similar_account_heads', 'دمج رؤس الحسابات المتشابهة'],
     ['enable_accounting_dimensions', 'تفعيل الأبعاد المحاسبية'],
     ['enable_discounts_and_margin', 'تفعيل الخصومات والهامش'],
     ['enable_subscription', 'تفعيل الاشتراكات'],
     ['show_balance_in_coa', 'إظهار الرصيد في شجرة الحسابات'],
     ['ignore_account_closing_balance', 'تجاهل رصيد إغلاق الحساب'],
     ['ignore_is_opening_check_for_reporting', 'تجاهل فحص الفتح للتقارير'],
     ['use_legacy_budget_controller', 'استخدام متحكم الميزانية القديم'],
     ['use_legacy_controller_for_pcv', 'استخدام المتحكم القديم لإغلاق الفترة'],
     ] as const
    ).map(([field, label]) => (
     <SwitchRow key={field} field={field} label={label} value={docFlag(d[field])} onToggle={toggle} disabled={updateMut.isPending} />
    ))}
    <Separator className="my-2" />
    <div className="space-y-2">
     <Label className="text-xs font-medium">تسجيل الإدخالات المؤجلة بناءً على</Label>
     <Select
     value={String(d.book_deferred_entries_based_on ?? 'Days')}
     onValueChange={(v) => patchAndSave({ book_deferred_entries_based_on: v })}
     >
     <SelectTrigger className="h-9 text-sm">
      <SelectValue />
     </SelectTrigger>
     <SelectContent>
      <SelectItem value="Days">أيام</SelectItem>
      <SelectItem value="Months">أشهر</SelectItem>
     </SelectContent>
     </Select>
    </div>
    {(
     [
     ['automatically_process_deferred_accounting_entry', 'معالجة إدخال المحاسبة المؤجلة تلقائياً'],
     ['book_deferred_entries_via_journal_entry', 'تسجيل الإدخالات المؤجلة عبر قيد يومية'],
     ['submit_journal_entries', 'ترحيل قيود اليومية'],
     ] as const
    ).map(([field, label]) => (
     <SwitchRow key={field} field={field} label={label} value={docFlag(d[field])} onToggle={toggle} disabled={updateMut.isPending} />
    ))}
    </TabsContent>
   </Tabs>
   </CardContent>
  </Card>
  )}
 </div>
 );
}
