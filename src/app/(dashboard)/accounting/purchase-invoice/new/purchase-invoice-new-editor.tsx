'use client';

import { useMemo, useState, useEffect } from 'react';
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
  TrendingDown,
  Percent,
  Coins,
} from 'lucide-react';
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
import { buildPurchaseInvoice } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { DEFAULT_PURCHASE_INVOICE_NAMING_SERIES } from '@/lib/erp/doc-defaults';
import { NamingSeriesSelect } from '@/components/erp/naming-series-select';
import { cn } from '@/lib/utils';

interface InvoiceItem {
  item_code: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  warehouse: string;
}

const emptyItem = (): InvoiceItem => ({
  item_code: '',
  description: '',
  qty: 1,
  rate: 0,
  amount: 0,
  warehouse: 'المستودع الرئيسي',
});

const invoiceSchema = z
  .object({
    supplier: z.string().min(1, 'اختر المورد'),
    posting_date: z.string().min(1, 'مطلوب'),
    due_date: z.string().min(1, 'مطلوب'),
    taxes_and_charges: z.string(),
    discount_amount: z.number().min(0),
    supplier_reference: z.string(),
    terms_and_conditions: z.string(),
    cost_center: z.string(),
    update_stock: z.boolean(),
    currency: z.string().min(1, 'العملة مطلوبة'),
    exchange_rate: z.number().positive('سعر الصرف يجب أن يكون أكبر من صفر'),
  })
  .refine((d) => !d.posting_date || !d.due_date || d.due_date >= d.posting_date, {
    message: 'الاستحقاق لا يسبق تاريخ الفاتورة',
    path: ['due_date'],
  });

type InvoiceFormData = z.infer<typeof invoiceSchema>;

const FORM_ID = 'purchase-invoice-new-form';

export function PurchaseInvoiceNewEditor() {
  const router = useRouter();
  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [namingSeries, setNamingSeries] = useState(DEFAULT_PURCHASE_INVOICE_NAMING_SERIES);
  const today = new Date().toISOString().split('T')[0]!;
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      supplier: '',
      posting_date: today,
      due_date: today,
      taxes_and_charges: '',
      discount_amount: 0,
      supplier_reference: '',
      terms_and_conditions: '',
      cost_center: '',
      update_stock: false,
      currency: 'YER',
      exchange_rate: 1,
    },
  });
  const createMutation = useCreateDoc('Purchase Invoice');

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

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => {
      const u = [...prev];
      (u[index] as unknown as Record<string, string | number>)[field] = value;
      if (field === 'qty' || field === 'rate') u[index].amount = u[index].qty * u[index].rate;
      return u;
    });
  };

  const onSubmit = (fd: InvoiceFormData) => {
    if (items.every((i) => !i.item_code)) {
      toast.error('أضف بنداً واحداً على الأقل');
      return;
    }
    if (!defaultCompany) {
      toast.error('تعذر تحديد الشركة');
      return;
    }
    createMutation.mutate(
      buildPurchaseInvoice({
        company: defaultCompany,
        supplier: fd.supplier,
        posting_date: fd.posting_date,
        due_date: fd.due_date,
        cost_center: fd.cost_center,
        terms: fd.terms_and_conditions,
        naming_series: namingSeries,
        taxes_and_charges: fd.taxes_and_charges?.trim() || undefined,
        bill_no: fd.supplier_reference?.trim() || undefined,
        items: items.map((i) => ({ ...i })),
        additional_discount_amount: fd.discount_amount > 0 ? fd.discount_amount : undefined,
        update_stock: fd.update_stock ? true : undefined,
        currency: fd.currency,
        exchange_rate: fd.exchange_rate,
      }),
      {
        onSuccess: () => {
          toast.success('تم إنشاء فاتورة المشتريات');
          router.push('/purchases/purchase-invoices');
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
        className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.03] p-5 shadow-sm transition-shadow hover:shadow-md"
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
              <Label className="text-xs font-semibold text-foreground/90">المورد</Label>
              <ErpLinkCombobox
                doctype="Supplier"
                value={form.watch('supplier')}
                onChange={(v) => form.setValue('supplier', v)}
                displayKey="supplier_name"
                placeholder="اختر المورد..."
                className="h-9"
              />
              {form.formState.errors.supplier && (
                <p className="text-xs font-medium text-destructive">{form.formState.errors.supplier.message}</p>
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
              <Label className="text-xs font-semibold text-foreground/90">قالب الضريبة (شراء)</Label>
              <ErpLinkCombobox
                doctype="Purchase Taxes and Charges Template"
                value={form.watch('taxes_and_charges')}
                onChange={(v) => form.setValue('taxes_and_charges', v)}
                placeholder="اختياري — يُحمّل الضريبة من القالب في النظام"
                showCreateShortcut={false}
                className="h-9"
              />
            </div>
            <div className="space-y-2.5" dir="rtl">
              <Label className="text-xs font-semibold text-foreground/90">رقم فاتورة المورد (مرجع)</Label>
              <Input
                dir="ltr"
                className="h-9 border-border/60 bg-background/50 transition-colors focus:bg-background"
                placeholder="يُحفظ في bill_no"
                {...form.register('supplier_reference')}
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
        className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-blue-500/[0.02] p-5 shadow-sm transition-shadow hover:shadow-md"
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
                  onCheckedChange={(c) => form.setValue('update_stock', c === true)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">تحديث المخزون عند الترحيل</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    يزيد رصيد المستودع عند ترحيل فاتورة الشراء (حسب إعدادات النظام).
                  </span>
                </span>
              </label>
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
        className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/[0.08] to-primary/10 shadow-lg shadow-primary/10 backdrop-blur-sm"
      >
        <div className="absolute -end-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-16 -start-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        
        <div className="relative p-6" dir="rtl">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-primary/15 p-2 ring-2 ring-primary/30">
                <TrendingDown className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-extrabold tracking-tight">ملخص الفاتورة</h3>
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
            <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 px-5 py-4 ring-1 ring-primary/30">
              <div className="flex items-end justify-between gap-3">
                <span className="text-sm font-extrabold">الإجمالي النهائي</span>
                <motion.span
                  key={grandTotalPreview}
                  initial={{ scale: 0.9, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="text-3xl font-black tabular-nums tracking-tight text-primary"
                >
                  {formatCurrency(grandTotalPreview)}
                </motion.span>
              </div>
              <p className="mt-3 text-[10px] font-medium leading-relaxed text-muted-foreground/80">
                {taxesAndCharges?.trim()
                  ? 'الإجمالي المعروض قبل الضريبة؛ الضريبة والإجمالي النهائي يُحسبان من القالب عند الحفظ في النظام.'
                  : 'القيم المعروضة تقديرية قبل الحفظ النهائي (بدون قالب ضريبة يُعرض تقدير 15% للعرض فقط).'}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/80">
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
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-gradient-to-l from-card via-card to-muted/20 px-5 py-4 sm:px-6" dir="rtl">
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
      <ScrollArea className={cn('min-h-0 flex-1', 'h-[min(52vh,520px)] xl:h-full')}>
        <div className="p-4 sm:p-5">
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-md">
            <table className="w-full border-collapse text-sm" dir="rtl">
              <thead>
                <tr className="border-b border-border/60 bg-gradient-to-l from-muted/80 via-muted/90 to-muted text-xs font-bold uppercase tracking-wide text-muted-foreground [&>th]:px-4 [&>th]:py-3.5 [&>th]:text-start">
                  <th className="w-[28%]">الصنف</th>
                  <th className="w-[20%]">الوصف</th>
                  <th className="w-24">الكمية</th>
                  <th className="w-28">السعر</th>
                  <th className="w-32">المبلغ</th>
                  <th className="min-w-[140px]">المستودع</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {items.map((item, idx) => (
                    <motion.tr
                      key={idx}
                      layout
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30',
                        idx % 2 === 1 && 'bg-muted/20'
                      )}
                    >
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
                      <td className="p-2 align-middle text-center">
                        {items.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="inline-block w-9" />
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </ScrollArea>
    </>
  );

  const linesColumn = (
    <div className="flex min-h-[280px] flex-1 flex-col bg-gradient-to-br from-muted/20 via-muted/10 to-background xl:min-h-0">
      {linesTable}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col" dir="rtl">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="mb-5 flex flex-col gap-5 rounded-xl border border-border/60 bg-gradient-to-l from-card via-card/95 to-muted/30 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        dir="rtl"
      >
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="outline" size="sm" className="h-9 gap-2 shadow-sm" asChild>
            <Link href="/purchases/purchase-invoices">
              <ArrowRight className="h-4 w-4" />
              عودة للقائمة
            </Link>
          </Button>
          <Separator orientation="vertical" className="hidden h-9 sm:block" />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">فاتورة مشتريات جديدة</h1>
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
            doctype="Purchase Invoice"
            value={namingSeries}
            onChange={setNamingSeries}
            defaultSeries={DEFAULT_PURCHASE_INVOICE_NAMING_SERIES}
          />
          <Separator orientation="vertical" className="h-8" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-4"
            onClick={() => router.push('/purchases/purchase-invoices')}
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
            className="min-h-[calc(100dvh-12rem)] w-full overflow-hidden rounded-2xl border-2 border-border/60 bg-card shadow-xl"
          >
            <ResizablePanel defaultSize={68} minSize={46} className="min-w-0">
              {linesColumn}
            </ResizablePanel>
            <ResizableHandle withHandle className="w-2 bg-gradient-to-b from-muted via-muted/90 to-muted" />
            <ResizablePanel defaultSize={32} minSize={22} maxSize={44} className="min-w-[280px] max-w-[440px] bg-background">
              <ScrollArea className="h-[calc(100dvh-12rem)]">{contextColumn}</ScrollArea>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-7 pb-10 xl:hidden">
          <div className="overflow-hidden rounded-2xl border-2 border-border/60 bg-card shadow-lg">{linesColumn}</div>
          {contextColumn}
        </div>
      </form>
    </div>
  );
}
