'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  Hash,
  Plus,
  Sparkles,
  Trash2,
  Receipt,
  TrendingUp,
  Percent,
  Coins,
  GripVertical,
  Upload,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTableBody } from '@/components/erp/sortable-tbody';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { formatCurrency } from '@/lib/core/helpers';
import { useCreateDoc } from '@/lib/client/hooks';
import { toast } from 'sonner';
import { buildSalesInvoice } from '@/lib/erp/erpnext-payloads';
import { syncItemDeferredRevenueFromInvoiceLine } from '@/lib/erp/deferred-revenue-sync';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { DEFAULT_SALES_INVOICE_NAMING_SERIES } from '@/lib/erp/doc-defaults';
import { NamingSeriesSelect } from '@/components/erp/naming-series-select';
import { cn } from '@/lib/utils';
import { parseSalesInvoiceImportXlsx } from '@/lib/erp/parse-sales-invoice-import-xlsx';

interface InvoiceItem {
  /** معرف مستقر لسحب وإفلات الصفوف — لا يُرسل لـ ERPNext */
  _rid: string;
  item_code: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  warehouse: string;
  /** إقران إيراد مؤجل — يتطلب فترة خدمة وحساب التزام في ERPNext */
  enable_deferred_revenue: boolean;
  service_start_date: string;
  service_end_date: string;
  deferred_revenue_account: string;
}

function newInvoiceRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `inv-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

const emptyItem = (): InvoiceItem => ({
  _rid: newInvoiceRowId(),
  item_code: '',
  description: '',
  qty: 1,
  rate: 0,
  amount: 0,
  warehouse: 'المستودع الرئيسي',
  enable_deferred_revenue: false,
  service_start_date: '',
  service_end_date: '',
  deferred_revenue_account: '',
});

const invoiceSchema = z
  .object({
    customer: z.string().min(1, 'اختر العميل'),
    posting_date: z.string().min(1, 'مطلوب'),
    due_date: z.string().min(1, 'مطلوب'),
    taxes_and_charges: z.string(),
    discount_amount: z.number().min(0),
    terms_and_conditions: z.string(),
    cost_center: z.string(),
    update_stock: z.boolean(),
    is_pos: z.boolean(),
    pos_profile: z.string(),
    currency: z.string().min(1, 'العملة مطلوبة'),
    exchange_rate: z.number().positive('سعر الصرف يجب أن يكون أكبر من صفر'),
  })
  .refine((d) => !d.posting_date || !d.due_date || d.due_date >= d.posting_date, {
    message: 'الاستحقاق لا يسبق تاريخ الفاتورة',
    path: ['due_date'],
  })
  .refine((d) => !d.is_pos || d.pos_profile.trim().length > 0, {
    message: 'اختر ملف نقطة البيع عند تفعيل فاتورة نقاط البيع',
    path: ['pos_profile'],
  });

type InvoiceFormData = z.infer<typeof invoiceSchema>;

const FORM_ID = 'sales-invoice-new-form';

export function SalesInvoiceNewEditor() {
  const router = useRouter();
  const importLinesRef = useRef<HTMLInputElement>(null);
  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [namingSeries, setNamingSeries] = useState(DEFAULT_SALES_INVOICE_NAMING_SERIES);
  const today = new Date().toISOString().split('T')[0]!;
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customer: '',
      posting_date: today,
      due_date: today,
      taxes_and_charges: '',
      discount_amount: 0,
      terms_and_conditions: '',
      cost_center: '',
      update_stock: false,
      is_pos: false,
      pos_profile: '',
      currency: 'YER',
      exchange_rate: 1,
    },
  });
  const createMutation = useCreateDoc('Sales Invoice');

  const importLinesFromXlsxBuffer = async (buffer: ArrayBuffer) => {
    try {
      const rows = await parseSalesInvoiceImportXlsx(buffer);
      if (!rows.length) {
        toast.error('لم يُستخرج أي بند من Excel — الصف الأول عناوين: صنف، وصف، كمية، سعر، مستودع');
        return;
      }
      setItems(
        rows.map((r) => {
          const base = emptyItem();
          return {
            ...base,
            item_code: r.item_code,
            description: r.description,
            qty: r.qty,
            rate: r.rate,
            amount: r.qty * r.rate,
            warehouse: r.warehouse || base.warehouse,
          };
        })
      );
      toast.success(`تم استيراد ${rows.length} بنداً من Excel`);
    } catch {
      toast.error('تعذّر قراءة ملف Excel');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {})
  );

  const handleLinesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((x) => x._rid === active.id);
      const newIndex = prev.findIndex((x) => x._rid === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  useEffect(() => {
    const p = form.getValues('posting_date') || today;
    const due = form.getValues('due_date');
    if (!due || due < p) form.setValue('due_date', p);
  }, [form, today]);

  const taxesAndCharges = form.watch('taxes_and_charges');
  const discountAmount = form.watch('discount_amount') || 0;
  const netTotal = useMemo(() => items.reduce((s, i) => s + i.amount, 0), [items]);
  const estimatedVat = useMemo(() => (taxesAndCharges?.trim() ? 0 : netTotal * 0.15), [netTotal, taxesAndCharges]);
  /** عند قالب ضريبة: لا نخمّن الضريبة محلياً — الإجمالي المعروض = صافي − خصم (الضريبة في ERPNext) */
  const grandTotalPreview = useMemo(() => {
    const base = netTotal - discountAmount;
    if (taxesAndCharges?.trim()) return base;
    return netTotal + estimatedVat - discountAmount;
  }, [netTotal, estimatedVat, discountAmount, taxesAndCharges]);

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number | boolean) => {
    setItems((prev) => {
      const u = [...prev];
      (u[index] as unknown as Record<string, string | number | boolean>)[field] = value;
      if (field === 'qty' || field === 'rate') u[index].amount = u[index].qty * u[index].rate;
      return u;
    });
  };

  const onSubmit = async (fd: InvoiceFormData) => {
    if (items.every((i) => !i.item_code)) {
      toast.error('أضف بنداً واحداً على الأقل');
      return;
    }
    for (const i of items) {
      if (!i.item_code || !i.enable_deferred_revenue) continue;
      if (!i.service_start_date?.trim() || !i.service_end_date?.trim() || !i.deferred_revenue_account?.trim()) {
        toast.error('بند إيراد مؤجل ناقص', { description: 'أكمل تاريخي بداية ونهاية الخدمة وحساب الإيراد المؤجل لكل بند مفعّل.' });
        return;
      }
      if (i.service_end_date < i.service_start_date) {
        toast.error('تاريخ نهاية الخدمة لا يسبق البداية');
        return;
      }
    }
    if (!defaultCompany) {
      toast.error('تعذر تحديد الشركة');
      return;
    }
    for (const i of items) {
      if (!i.item_code || !i.enable_deferred_revenue) continue;
      try {
        await syncItemDeferredRevenueFromInvoiceLine({
          itemCode: i.item_code,
          serviceStart: i.service_start_date,
          serviceEnd: i.service_end_date,
        });
      } catch (e) {
        toast.error('تعذر تهيئة الصنف للإيراد المؤجل على الخادم', { description: e instanceof Error ? e.message : String(e) });
        return;
      }
    }
    createMutation.mutate(
      buildSalesInvoice({
        company: defaultCompany,
        customer: fd.customer,
        posting_date: fd.posting_date,
        due_date: fd.due_date,
        cost_center: fd.cost_center,
        terms: fd.terms_and_conditions,
        naming_series: namingSeries,
        taxes_and_charges: fd.taxes_and_charges?.trim() || undefined,
        items: items.map((i) => ({
          item_code: i.item_code,
          description: i.description,
          qty: i.qty,
          rate: i.rate,
          amount: i.amount,
          warehouse: i.warehouse,
          enable_deferred_revenue: i.enable_deferred_revenue || undefined,
          service_start_date: i.enable_deferred_revenue ? i.service_start_date : undefined,
          service_end_date: i.enable_deferred_revenue ? i.service_end_date : undefined,
          deferred_revenue_account: i.enable_deferred_revenue ? i.deferred_revenue_account : undefined,
        })),
        additional_discount_amount: fd.discount_amount > 0 ? fd.discount_amount : undefined,
        is_pos: fd.is_pos,
        pos_profile: fd.is_pos ? fd.pos_profile.trim() : undefined,
        update_stock: fd.update_stock && !fd.is_pos ? true : undefined,
        currency: fd.currency,
        price_list_currency: fd.currency,
        conversion_rate: fd.exchange_rate,
        plc_conversion_rate: fd.exchange_rate,
      }),
      {
        onSuccess: () => {
          toast.success('تم إنشاء الفاتورة');
          router.push('/sales/sales-invoices');
          router.refresh();
        },
        onError: () => toast.error('تعذر الحفظ'),
      }
    );
  };

  const contextColumn = (
    <div className="flex flex-col gap-4 p-6 sm:p-7" dir="rtl">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
          <TabsTrigger value="basic" className="text-xs">
            بيانات أساسية
          </TabsTrigger>
          <TabsTrigger value="extra" className="text-xs">
            إضافات وشروط
          </TabsTrigger>
          <TabsTrigger value="summary" className="text-xs">
            ملخص مالي
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4 space-y-6 outline-none">
      {/* قسم البيانات الأساسية */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-colors hover:border-border"
      >
        <div className="absolute -end-12 -top-12 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="rounded-lg bg-primary/10 p-2 ring-1 ring-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-bold tracking-tight">بيانات أساسية</h3>
          </div>
          <div className="space-y-5">
            <div className="space-y-2.5" dir="rtl">
              <Label className="text-xs font-semibold text-foreground/90">العميل</Label>
              <ErpLinkCombobox
                doctype="Customer"
                value={form.watch('customer')}
                onChange={(v) => form.setValue('customer', v)}
                displayKey="customer_name"
                placeholder="اختر العميل..."
                className="h-9"
              />
              {form.formState.errors.customer && (
                <p className="text-xs font-medium text-destructive">{form.formState.errors.customer.message}</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="rtl">
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold text-foreground/90">تاريخ الفاتورة</Label>
                <Input
                  type="date"
                  dir="ltr"
                  className="h-9 border-border/60 bg-background/50 transition-colors focus:bg-background"
                  {...form.register('posting_date')}
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold text-foreground/90">الاستحقاق</Label>
                <Input
                  type="date"
                  dir="ltr"
                  className="h-9 border-border/60 bg-background/50 transition-colors focus:bg-background"
                  {...form.register('due_date')}
                />
              </div>
              {form.formState.errors.due_date && (
                <p className="col-span-2 text-xs font-medium text-destructive">
                  {form.formState.errors.due_date.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="rtl">
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold text-foreground/90">العملة</Label>
                <ErpLinkCombobox
                  doctype="Currency"
                  value={form.watch('currency')}
                  onChange={(v) => form.setValue('currency', v || 'YER')}
                  placeholder="YER"
                  className="h-9"
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold text-foreground/90">سعر الصرف</Label>
                <Input
                  type="number"
                  dir="ltr"
                  min={0.000001}
                  step="any"
                  className="h-9 border-border/60 bg-background/50 transition-colors focus:bg-background"
                  {...form.register('exchange_rate', { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="space-y-2.5" dir="rtl">
              <Label className="text-xs font-semibold text-foreground/90">قالب الضريبة</Label>
              <ErpLinkCombobox
                doctype="Sales Taxes and Charges Template"
                value={form.watch('taxes_and_charges')}
                onChange={(v) => form.setValue('taxes_and_charges', v)}
                placeholder="اختياري - يُحسب تلقائياً"
                showCreateShortcut={false}
                className="h-9"
              />
            </div>
          </div>
        </div>
      </motion.div>
        </TabsContent>

        <TabsContent value="extra" className="mt-4 space-y-6 outline-none">
      {/* قسم الإضافات */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-colors hover:border-border"
      >
        <div className="absolute -start-12 -top-12 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="relative">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-500/10 p-2 ring-1 ring-blue-500/20">
              <Receipt className="h-4 w-4 text-chart-1" />
            </div>
            <h3 className="text-sm font-bold tracking-tight">إضافات</h3>
          </div>
          <div className="space-y-5" dir="rtl">
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold text-foreground/90">خصم المستند</Label>
              <Input
                type="number"
                dir="ltr"
                className="h-9 border-border/60 bg-background/50 tabular-nums transition-colors focus:bg-background"
                placeholder="0.00"
                {...form.register('discount_amount', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold text-foreground/90">مركز التكلفة</Label>
              <ErpLinkCombobox
                doctype="Cost Center"
                value={form.watch('cost_center')}
                onChange={(v) => form.setValue('cost_center', v)}
                placeholder="اختياري"
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-border/40 bg-background/30 p-3">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <Checkbox
                  checked={form.watch('update_stock')}
                  disabled={form.watch('is_pos')}
                  onCheckedChange={(c) => form.setValue('update_stock', c === true)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">تحديث المخزون عند الترحيل</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    يخصم الكميات من المستودع عند ترحيل الفاتورة (فاتورة عادية).
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <Checkbox
                  checked={form.watch('is_pos')}
                  onCheckedChange={(c) => {
                    const on = c === true;
                    form.setValue('is_pos', on);
                    if (on) form.setValue('update_stock', true);
                  }}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">فاتورة نقطة بيع (POS)</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    يتطلب إعداد نقطة البيع من صفحة إعدادات نقاط البيع؛ ويُفعّل تحديث المخزون تلقائياً.
                  </span>
                </span>
              </label>
              {form.watch('is_pos') ? (
                <div className="space-y-2 ps-1">
                  <Label className="text-xs font-semibold text-foreground/90">ملف نقطة البيع</Label>
                  <ErpLinkCombobox
                    doctype="POS Profile"
                    value={form.watch('pos_profile')}
                    onChange={(v) => form.setValue('pos_profile', v)}
                    placeholder="اختر ملف نقطة البيع..."
                    className="h-9"
                  />
                  {form.formState.errors.pos_profile && (
                    <p className="text-xs font-medium text-destructive">{form.formState.errors.pos_profile.message}</p>
                  )}
                </div>
              ) : null}
            </div>
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold text-foreground/90">الشروط والأحكام</Label>
              <Textarea
                className="min-h-[100px] resize-y border-border/60 bg-background/50 text-sm leading-relaxed transition-colors focus:bg-background"
                placeholder="أضف شروط الدفع أو الملاحظات..."
                {...form.register('terms_and_conditions')}
              />
            </div>
          </div>
        </div>
      </motion.div>
        </TabsContent>

        <TabsContent value="summary" className="mt-4 space-y-6 outline-none">
      {/* قسم الملخص المالي - تصميم فخم ومميز */}
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
      >
        <div className="absolute -end-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-16 -start-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        
        <div className="relative p-6" dir="rtl">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-primary/15 p-2 ring-2 ring-primary/30">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold tracking-tight">ملخص الفاتورة</h3>
            </div>
            <Badge variant="secondary" className="gap-1.5 border-primary/20 bg-primary/10 text-primary">
              <Coins className="h-3 w-3" />
              تقديري
            </Badge>
          </div>

          <div className="space-y-4">
            {/* الصافي الفرعي */}
            <div className="flex items-center justify-between rounded-lg bg-background/40 px-4 py-3 backdrop-blur-sm">
              <span className="text-sm font-medium text-muted-foreground">الصافي الفرعي</span>
              <span className="text-base font-bold tabular-nums">{formatCurrency(netTotal)}</span>
            </div>

            {/* الضريبة */}
            {taxesAndCharges?.trim() ? (
              <div className="flex items-center justify-between rounded-lg bg-background/40 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">الضريبة</span>
                </div>
                <span className="text-sm font-semibold text-chart-1">حسب القالب</span>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg bg-background/40 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">ض.ق.م (15%)</span>
                </div>
                <span className="text-base font-bold tabular-nums text-primary">
                  {formatCurrency(estimatedVat)}
                </span>
              </div>
            )}

            {/* الخصم */}
            {discountAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center justify-between rounded-lg bg-destructive/10 px-4 py-3 backdrop-blur-sm"
              >
                <span className="text-sm font-medium text-destructive">خصم إضافي</span>
                <span className="text-base font-bold tabular-nums text-destructive">
                  −{formatCurrency(discountAmount)}
                </span>
              </motion.div>
            )}

            <Separator className="bg-border/50" />

            {/* الإجمالي النهائي */}
            <div className="rounded-xl bg-muted/20 px-5 py-4 ring-1 ring-border/50">
              <div className="flex items-end justify-between gap-3">
                <span className="text-sm font-semibold">الإجمالي النهائي</span>
                <motion.span
                  key={grandTotalPreview}
                  initial={{ scale: 0.9, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="text-3xl font-bold tabular-nums tracking-tight text-primary"
                >
                  {formatCurrency(grandTotalPreview)}
                </motion.span>
              </div>
              <p className="mt-3 text-xs font-medium leading-relaxed text-muted-foreground/80">
                {taxesAndCharges?.trim()
                  ? 'الإجمالي المعروض قبل الضريبة؛ الضريبة والإجمالي النهائي يُحسبان من القالب عند الحفظ في النظام.'
                  : 'القيم المعروضة تقديرية قبل الحفظ النهائي (بدون قالب ضريبة يُعرض تقدير 15% للعرض فقط).'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                العملة: <span className="font-semibold">{form.watch('currency') || 'YER'}</span> | سعر الصرف: {form.watch('exchange_rate') || 1}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );

  const linesTable = (
    <>
      <input
        ref={importLinesRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          void f.arrayBuffer().then((buf) => void importLinesFromXlsxBuffer(buf));
          e.target.value = '';
        }}
      />
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-card px-5 py-4 sm:px-6" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 ring-1 ring-primary/20">
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">بنود الفاتورة</span>
            <Badge variant="secondary" className="h-6 px-2 tabular-nums text-xs font-bold">
              {items.length}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-2 px-3 text-xs font-semibold"
            onClick={() => importLinesRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            استيراد Excel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 gap-2 px-4 text-xs font-semibold shadow-sm"
            onClick={() => setItems((p) => [...p, emptyItem()])}
          >
            <Plus className="h-4 w-4" />
            إضافة بند
          </Button>
        </div>
      </div>
      <ScrollArea className={cn('min-h-0 flex-1', 'h-[min(52vh,520px)] xl:h-full')}>
        <div className="p-4 sm:p-5">
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLinesDragEnd}>
              <SortableContext items={items.map((i) => i._rid)} strategy={verticalListSortingStrategy}>
                <table className="w-full border-collapse text-sm" dir="rtl">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/70 text-xs font-semibold tracking-wide text-muted-foreground [&>th]:px-4 [&>th]:py-3.5 [&>th]:text-start">
                      <th className="w-10 text-center" aria-label="ترتيب البنود" title="اسحب للترتيب">
                        <GripVertical className="mx-auto h-3.5 w-3.5 opacity-50" />
                      </th>
                      <th className="w-[24%]">الصنف</th>
                      <th className="w-[18%]">الوصف</th>
                      <th className="w-24">الكمية</th>
                      <th className="w-28">السعر</th>
                      <th className="w-32">المبلغ</th>
                      <th className="min-w-[130px]">المستودع</th>
                      <th className="w-20 text-center">مؤجل</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  {items.map((item, idx) => (
                    <SortableTableBody key={item._rid} id={item._rid}>
                      {(dragProps) => (
                        <>
                          <motion.tr
                            layout
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                              'border-b border-border/40 transition-colors hover:bg-muted/30',
                              idx % 2 === 1 && 'bg-muted/20'
                            )}
                          >
                            <td className="w-10 p-1 align-middle text-center">
                              <button
                                type="button"
                                className="touch-none inline-flex h-9 w-9 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
                                aria-label="سحب لإعادة ترتيب البنود"
                                {...dragProps}
                              >
                                <GripVertical className="h-4 w-4" />
                              </button>
                            </td>
                      <td className="p-2.5 align-middle">
                        <ErpLinkCombobox
                          doctype="Item"
                          value={item.item_code}
                          onChange={(v) => updateItem(idx, 'item_code', v)}
                          displayKey="item_name"
                          placeholder="اختر صنف..."
                          className="h-9"
                        />
                      </td>
                      <td className="p-2.5 align-middle">
                        <Input
                          className="h-9 border-border/40 bg-background/50 transition-colors focus:bg-background"
                          value={item.description}
                          onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          placeholder="وصف..."
                        />
                      </td>
                      <td className="p-2.5 align-middle">
                        <Input
                          className="h-9 border-border/40 bg-background/50 tabular-nums transition-colors focus:bg-background"
                          type="number"
                          dir="ltr"
                          min={0}
                          step="any"
                          value={item.qty}
                          onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                        />
                      </td>
                      <td className="p-2.5 align-middle">
                        <Input
                          className="h-9 border-border/40 bg-background/50 tabular-nums transition-colors focus:bg-background"
                          type="number"
                          dir="ltr"
                          min={0}
                          step="any"
                          value={item.rate}
                          onChange={(e) => updateItem(idx, 'rate', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-4 py-2.5 align-middle font-bold tabular-nums text-primary">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="p-2.5 align-middle">
                        <ErpLinkCombobox
                          doctype="Warehouse"
                          value={item.warehouse}
                          onChange={(v) => updateItem(idx, 'warehouse', v)}
                          placeholder="مستودع..."
                          className="h-9 text-xs"
                        />
                      </td>
                      <td className="p-2 align-middle">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={item.enable_deferred_revenue}
                            onCheckedChange={(c) => updateItem(idx, 'enable_deferred_revenue', c === true)}
                            aria-label="إيراد مؤجل"
                          />
                        </div>
                      </td>
                      <td className="p-2 align-middle text-center">
                        {items.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setItems((p) => p.filter((x) => x._rid !== item._rid))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="inline-block w-9" />
                        )}
                      </td>
                    </motion.tr>
                    {item.enable_deferred_revenue ? (
                      <motion.tr
                        layout
                        className="border-b border-border/40 bg-primary/[0.06]"
                      >
                        <td colSpan={9} className="px-4 py-3">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">بداية الخدمة</Label>
                              <Input
                                type="date"
                                dir="ltr"
                                className="h-9"
                                value={item.service_start_date}
                                onChange={(e) => updateItem(idx, 'service_start_date', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">نهاية الخدمة</Label>
                              <Input
                                type="date"
                                dir="ltr"
                                className="h-9"
                                value={item.service_end_date}
                                onChange={(e) => updateItem(idx, 'service_end_date', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1 sm:col-span-1">
                              <Label className="text-xs text-muted-foreground">حساب الإيراد المؤجل (التزام)</Label>
                              <ErpLinkCombobox
                                doctype="Account"
                                value={item.deferred_revenue_account}
                                onChange={(v) => updateItem(idx, 'deferred_revenue_account', v)}
                                placeholder="حساب التزام — مطابق لإعدادات الصنف/الشركة"
                                className="h-9 text-xs"
                              />
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                            عند الحفظ يُحدَّث تعريف الصنف على الخادم (تمكين الإيراد المؤجل وعدد الأشهر) تلقائياً دون فتح
                            أي شاشة خارج التطبيق. لإقران الفترة المحاسبية استخدم{' '}
                            <Link href="/accounting/deferred-revenue" className="font-medium text-primary underline-offset-2 hover:underline">
                              الإيرادات المؤجلة
                            </Link>{' '}
                            أو فعّل المعالجة التلقائية من تهيئة المحاسبة المؤجلة هناك.
                          </p>
                        </td>
                      </motion.tr>
                    ) : null}
                        </>
                      )}
                    </SortableTableBody>
                  ))}
                </table>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </ScrollArea>
    </>
  );

  const linesColumn = (
    <div className="flex min-h-[280px] flex-1 flex-col bg-muted/10 xl:min-h-0">
      {linesTable}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col" dir="rtl">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="mb-5 flex flex-col gap-5 rounded-xl border border-border/60 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        dir="rtl"
      >
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="outline" size="sm" className="h-9 gap-2 shadow-sm" asChild>
            <Link href="/sales/sales-invoices">
              <ArrowRight className="h-4 w-4" />
              عودة للقائمة
            </Link>
          </Button>
          <Separator orientation="vertical" className="hidden h-9 sm:block" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">فاتورة مبيعات جديدة</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="hidden xl:inline">محرّر بصفحة كاملة · اسحب الفاصل لتخصيص العرض</span>
              <span className="xl:hidden">تخطيط تفاعلي · عرض مكدس على الجوال</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {defaultCompany ? (
            <span className="inline-flex max-w-full items-center gap-2 truncate rounded-lg border border-border/60 bg-muted/50 px-3.5 py-2 text-xs font-semibold shadow-sm">
              <Building2 className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{defaultCompany}</span>
            </span>
          ) : null}
          <NamingSeriesSelect
            doctype="Sales Invoice"
            value={namingSeries}
            onChange={setNamingSeries}
            defaultSeries={DEFAULT_SALES_INVOICE_NAMING_SERIES}
          />
          <Separator orientation="vertical" className="h-8" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-4"
            onClick={() => router.push('/sales/sales-invoices')}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            size="sm"
            disabled={coLoading || createMutation.isPending}
            className="h-9 min-w-[130px] font-semibold shadow-sm"
          >
            {createMutation.isPending ? 'جاري الحفظ…' : 'حفظ مسودة'}
          </Button>
        </div>
      </motion.header>

      <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
        <div className="hidden min-h-0 flex-1 xl:block">
          <ResizablePanelGroup
            direction="horizontal"
            className="min-h-[calc(100dvh-12rem)] w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
          >
            <ResizablePanel defaultSize={68} minSize={46} className="min-w-0">
              {linesColumn}
            </ResizablePanel>
            <ResizableHandle withHandle className="w-2 bg-muted/70" />
            <ResizablePanel defaultSize={32} minSize={22} maxSize={44} className="min-w-[280px] max-w-[440px] bg-background">
              <ScrollArea className="h-[calc(100dvh-12rem)]">{contextColumn}</ScrollArea>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-7 pb-10 xl:hidden">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">{linesColumn}</div>
          {contextColumn}
        </div>
      </form>
    </div>
  );
}
