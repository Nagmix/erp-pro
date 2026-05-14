'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateDoc, useDocList, useSubmitDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { formatDate } from '@/lib/core/helpers';
import { buildProcessDeferredAccounting } from '@/lib/erp/erpnext-payloads';
import { applyRecommendedDeferredAccountsSettings } from '@/lib/erp/deferred-revenue-sync';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarClock, Info, Wand2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const schema = z
  .object({
    company: z.string().min(1, 'الشركة مطلوبة'),
    type: z.enum(['Income', 'Expense']),
    posting_date: z.string().min(1),
    start_date: z.string().min(1, 'بداية الفترة مطلوبة'),
    end_date: z.string().min(1, 'نهاية الفترة مطلوبة'),
    account: z.string(),
  })
  .refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, {
    message: 'نهاية الخدمة لا تسبق البداية',
    path: ['end_date'],
  });

type FormValues = z.infer<typeof schema>;

type PdaRow = {
  name: string;
  company: string;
  type: string;
  posting_date: string;
  start_date: string;
  end_date: string;
  account?: string;
  docstatus: number;
};

export default function DeferredRevenuePage() {
  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();
  const today = useMemo(() => new Date().toISOString().split('T')[0]!, []);
  const firstOfMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }, []);
  const lastOfMonth = useMemo(() => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return last.toISOString().split('T')[0]!;
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company: '',
      type: 'Income',
      posting_date: today,
      start_date: firstOfMonth,
      end_date: lastOfMonth,
      account: '',
    },
  });

  useEffect(() => {
    if (defaultCompany) form.setValue('company', defaultCompany);
  }, [defaultCompany, form]);

  const { data = [], isLoading, isError, error, refetch } = useDocList<PdaRow>('Process Deferred Accounting', {
    fields: ['name', 'company', 'type', 'posting_date', 'start_date', 'end_date', 'account', 'docstatus'],
    order_by: 'modified desc',
    limit: 150,
  });

  const createMutation = useCreateDoc('Process Deferred Accounting');
  const submitMutation = useSubmitDoc<PdaRow>('Process Deferred Accounting');
  const [submitting, setSubmitting] = useState(false);
  const [settingsApplying, setSettingsApplying] = useState(false);

  const columns: Column<PdaRow>[] = [
    {
      key: 'name',
      header: 'المرجع',
      render: (v) => <span className="font-mono text-[10px] text-primary">{String(v)}</span>,
    },
    { key: 'company', header: 'الشركة' },
    {
      key: 'type',
      header: 'النوع',
      render: (v) => (String(v) === 'Income' ? 'إيراد مؤجل' : String(v) === 'Expense' ? 'مصروف مؤجل' : String(v)),
    },
    {
      key: 'posting_date',
      header: 'تاريخ الترحيل',
      render: (v) => formatDate(String(v || '')),
    },
    {
      key: 'start_date',
      header: 'بداية الخدمة',
      render: (v) => formatDate(String(v || '')),
    },
    {
      key: 'end_date',
      header: 'نهاية الخدمة',
      render: (v) => formatDate(String(v || '')),
    },
    {
      key: 'account',
      header: 'حساب (تصفية)',
      render: (v) => (v ? <span className="font-mono text-[10px]" dir="ltr">{String(v)}</span> : '—'),
    },
    {
      key: 'docstatus',
      header: 'الحالة',
      render: (_v, row) => <DocStatusBadge docstatus={row.docstatus} />,
    },
  ];

  const onSubmit = async (d: FormValues) => {
    if (!defaultCompany && !d.company.trim()) {
      toast.error('حدّد الشركة من الإعدادات أو النموذج');
      return;
    }
    setSubmitting(true);
    try {
      const doc = buildProcessDeferredAccounting({
        company: d.company.trim(),
        type: d.type,
        posting_date: d.posting_date,
        start_date: d.start_date,
        end_date: d.end_date,
        account: d.account.trim() || undefined,
      });
      const created = await createMutation.mutateAsync(doc as Record<string, unknown>);
      const name =
        created &&
        typeof created === 'object' &&
        created !== null &&
        'name' in created &&
        typeof (created as { name: unknown }).name === 'string'
          ? (created as { name: string }).name
          : '';
      if (!name) {
        throw new Error('لم يُعد اسم المستند من الخادم');
      }
      await submitMutation.mutateAsync(name);
      toast.success('تمت معالجة الإقران', { description: d.type === 'Income'
            ? 'المستند مُقدَّم — تُحدَّث الدفاتر عبر المحرك المحاسبي (قيود يومية لإقران الفترة).'
            : 'المستند مُقدَّم — تُحدَّث قيود المصروف المؤجل تلقائياً.' });
      void refetch();
      form.reset({
        company: d.company,
        type: d.type,
        posting_date: today,
        start_date: firstOfMonth,
        end_date: lastOfMonth,
        account: '',
      });
    } catch (e) {
      toast.error('فشل الإنشاء أو التقديم', { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  const runRecommendedBackendSetup = async () => {
    setSettingsApplying(true);
    try {
      await applyRecommendedDeferredAccountsSettings();
      toast.success('تمت تهيئة المحاسبة المؤجلة', { description: 'تفعيل القيود للإدخالات المؤجلة، والمعالجة التلقائية للفترات، وحساب الإقران شهرياً — من واجهة التطبيق مباشرة.' });
    } catch (e) {
      toast.error('تعذر حفظ الإعدادات', { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSettingsApplying(false);
    }
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="الإيرادات المؤجلة وإقرانها (IFRS 15)"
        description="إقران الإيراد عبر واجهة ERP Pro — الربط مع المحرك المحاسبي بشكل تلقائي"
        iconify="solar:calendar-bold-duotone"
        accent="primary"
        breadcrumbs={[
          { label: 'المحاسبة', href: '/accounting' },
          { label: 'الإيرادات المؤجلة' },
        ]}
        actions={
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="شرح">
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="max-w-sm text-xs leading-relaxed">
              <p className="font-semibold mb-2">التدفق داخل ERP Pro</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>فاتورة مبيعات جديدة من المحاسبة — بند مؤجل + فترة خدمة (يُحدَّث الصنف تلقائياً عند الحفظ).</li>
                <li>اختياري: تهيئة المحاسبة المؤجلة من البطاقة أدناه أو من إعدادات المحاسبة داخل التطبيق.</li>
                <li>تشغيل المعالجة لهذا النطاق الزمني لإقران الفترة في الدفاتر.</li>
              </ol>
            </PopoverContent>
          </Popover>
        }
      />

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            تهيئة المحاسبة المؤجلة (مرة واحدة أو عند التغيير)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground leading-relaxed">
            يطبّق إعدادات موصى بها: تسجيل الإدخالات المؤجلة عبر قيد يومية، معالجة الفترات تلقائياً،
            وأساس الإقران شهري. يمكن التحكم بكل شيء من واجهة التطبيق — يمكنك لاحقاً تعديل التفاصيل من{' '}
            <Link href="/settings/module-settings/accounts" className="font-medium text-primary underline-offset-2 hover:underline">
              إعدادات المحاسبة
            </Link>
            .
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-2"
            disabled={settingsApplying}
            onClick={() => void runRecommendedBackendSetup()}
          >
            {settingsApplying ? 'جاري الحفظ…' : 'تطبيق التهيئة الموصى بها'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            تشغيل معالجة الإقران للفترة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-xs text-muted-foreground leading-relaxed">
            يُنشأ مستند معالجة ويُقدَّم عبر واجهة التطبيق؛ المحرك المحاسبي يُحدّث إقران الإيراد أو المصروف
            للفترة المحددة. يجب أن تحتوي فواتير المبيعات على بنود مؤجلة وفترة خدمة (يُضبط الصنف تلقائياً عند حفظ
            الفاتورة من محرّر فاتورة المبيعات).
          </p>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/settings/module-settings/accounts">إعدادات المحاسبة (مؤجل)</Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/accounting/sales-invoice/new">فاتورة مبيعات جديدة (بنود مؤجلة)</Link>
            </Button>
          </div>

          <form
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-border/40"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
              <Label>الشركة *</Label>
              <p className="text-sm font-semibold min-h-[2.25rem] flex items-center">{form.watch('company') || defaultCompany || '—'}</p>
              <input type="hidden" {...form.register('company')} />
            </div>
            <div className="space-y-1.5">
              <Label>نوع المعالجة *</Label>
              <Select value={form.watch('type')} onValueChange={(v) => form.setValue('type', v as 'Income' | 'Expense')}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Income">إيراد مؤجل → إقران إيراد (IFRS 15)</SelectItem>
                  <SelectItem value="Expense">مصروف مؤجل → إقران مصروف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>تاريخ الترحيل *</Label>
              <DatePicker value={form.watch('posting_date')} onChange={(v) => form.setValue('posting_date', v)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label>بداية فترة الخدمة *</Label>
              <DatePicker value={form.watch('start_date')} onChange={(v) => form.setValue('start_date', v)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label>نهاية فترة الخدمة *</Label>
              <DatePicker value={form.watch('end_date')} onChange={(v) => form.setValue('end_date', v)} className="h-9" />
              {form.formState.errors.end_date && (
                <p className="text-[10px] text-destructive">{form.formState.errors.end_date.message}</p>
              )}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>حساب للتصفية (اختياري)</Label>
              <ErpLinkCombobox
                doctype="Account"
                value={form.watch('account')}
                onChange={(v) => form.setValue('account', v)}
                placeholder="كل حسابات الإيراد المؤجل للشركة — أو اختر حساباً محدداً"
                className="h-9"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end pt-2">
              <Button type="submit" disabled={coLoading || submitting || createMutation.isPending || submitMutation.isPending}>
                {submitting ? 'جاري المعالجة…' : 'إنشاء وتقديم المعالجة'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <DataTable
        data={data}
        columns={columns}
        title="سجل معالجات الإقران المؤجل"
        searchable
        loading={isLoading}
      />
    </div>
  );
}
