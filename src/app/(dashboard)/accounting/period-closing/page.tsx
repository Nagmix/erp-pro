'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useCreateDoc,
  useDocList,
  useSubmitDoc,
  useCancelDoc,
} from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { formatDate } from '@/lib/core/helpers';
import { buildPeriodClosingVoucher } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';

const schema = z.object({
  company: z.string().min(1),
  fiscal_year: z.string().min(1, 'السنة المالية مطلوبة'),
  transaction_date: z.string().min(1),
  period_start_date: z.string().min(1),
  period_end_date: z.string().min(1),
  closing_account_head: z.string().min(1, 'حساب الإقفال مطلوب'),
  remarks: z.string().min(1, 'الملاحظات مطلوبة'),
});

type Form = z.infer<typeof schema>;

type PcvRow = {
  name: string;
  company: string;
  fiscal_year: string;
  transaction_date: string;
  period_start_date: string;
  period_end_date: string;
  docstatus: number;
  gle_processing_status?: string;
};

export default function PeriodClosingPage() {
  const { toast } = useToast();
  const { company, isLoading: coLoad } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading, isError, error, refetch } = useDocList<PcvRow>('Period Closing Voucher', {
    fields: [
      'name',
      'company',
      'fiscal_year',
      'transaction_date',
      'period_start_date',
      'period_end_date',
      'docstatus',
      'gle_processing_status',
    ],
    order_by: 'transaction_date desc',
    limit: 200,
  });
  const createMutation = useCreateDoc('Period Closing Voucher');
  const submitMutation = useSubmitDoc<PcvRow>('Period Closing Voucher');
  const cancelMutation = useCancelDoc<PcvRow>('Period Closing Voucher');
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      company: '',
      fiscal_year: '',
      transaction_date: '',
      period_start_date: '',
      period_end_date: '',
      closing_account_head: '',
      remarks: 'إقفال فترة — من ERP Pro',
    },
  });

  useEffect(() => {
    if (company) {
      form.setValue('company', company);
    }
  }, [company, form]);

  const onSubmit = (d: Form) => {
    createMutation.mutate(
      buildPeriodClosingVoucher({
        company: d.company,
        fiscal_year: d.fiscal_year,
        transaction_date: d.transaction_date,
        period_start_date: d.period_start_date,
        period_end_date: d.period_end_date,
        closing_account_head: d.closing_account_head,
        remarks: d.remarks,
      }),
      {
        onSuccess: () => {
          toast({ title: 'أُنشئت قسيمة إقفال (مسودة) — راجعها ثم رحّل' });
          void refetch();
          setDialogOpen(false);
        },
        onError: () => toast({ title: 'تعذر الحفظ — راجع الحقول', variant: 'destructive' }),
      }
    );
  };

  const columns: Column<PcvRow>[] = [
    { key: 'name', header: 'رقم', render: (v) => <span className="font-mono text-primary text-xs">{String(v)}</span> },
    { key: 'fiscal_year', header: 'سنة مالية' },
    {
      key: 'period_start_date',
      header: 'من',
      render: (v) => formatDate(String(v || '')),
    },
    {
      key: 'period_end_date',
      header: 'إلى',
      render: (v) => formatDate(String(v || '')),
    },
    { key: 'docstatus', header: 'الحالة', render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} /> },
    {
      key: 'gle_processing_status',
      header: 'معالجة GL',
      render: (v) => (v ? String(v) : '—'),
    },
    {
      key: '_a',
      header: 'ترحيل',
      render: (_, row) => (
        <div className="flex gap-1">
          {row.docstatus === 0 && (
            <Button
              type="button"
              size="sm"
              className="h-7 text-[10px] px-2 gap-1"
              disabled={submitMutation.isPending}
              onClick={() =>
                submitMutation.mutate(row.name, {
                  onSuccess: () => {
                    toast({ title: 'تم الترحيل' });
                    void refetch();
                  },
                  onError: () => toast({ title: 'فشل الترحيل', variant: 'destructive' }),
                })
              }
            >
              ترحيل
            </Button>
          )}
          {row.docstatus === 1 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[10px] px-2 gap-1"
              disabled={cancelMutation.isPending}
              onClick={() =>
                cancelMutation.mutate(row.name, {
                  onSuccess: () => {
                    toast({ title: 'أُلغي الترحيل' });
                    void refetch();
                  },
                  onError: () => toast({ title: 'تعذر الإلغاء', variant: 'destructive' }),
                })
              }
            >
              إلغاء ترحيل
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="إقفال الفترة"
        description="تحويل أرصدة الإيرادات والمصروفات إلى حساب الإقفال"
        iconify="solar:file-check-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'إقفال الفترة' }]}
        actions={
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="معلومات">
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 text-sm leading-6">
                استخدم الشركة الافتراضية، اختر سنة مالية وحساب رأس إقفال، ثم أنشئ قسيمة مسودة لترحيلها لاحقاً أو إلغاء ترحيلها من الجدول.
              </PopoverContent>
            </Popover>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  قسيمة إقفال جديدة
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="max-w-3xl gap-3">
                <DialogHeader>
                  <DialogTitle>إنشاء قسيمة إقفال</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">الشركة (افتراضية)</Label>
                      <p className="text-sm font-semibold">{form.watch('company') || company || '—'}</p>
                      {!company && <p className="text-[10px] text-destructive">اضبط الشركة الافتراضية من الإعدادات</p>}
                      <input type="hidden" {...form.register('company')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">السنة المالية *</Label>
                      <ErpLinkCombobox
                        doctype="Fiscal Year"
                        value={form.watch('fiscal_year')}
                        onChange={(v) => form.setValue('fiscal_year', v)}
                        placeholder="مثال: سنة مالية 2025"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">تاريخ العملية *</Label>
                      <Input type="date" dir="rtl" {...form.register('transaction_date')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">بداية الفترة *</Label>
                      <Input type="date" dir="rtl" {...form.register('period_start_date')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">نهاية الفترة *</Label>
                      <Input type="date" dir="rtl" {...form.register('period_end_date')} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs font-medium">حساب رأس إقفال *</Label>
                      <ErpLinkCombobox
                        doctype="Account"
                        value={form.watch('closing_account_head')}
                        onChange={(v) => form.setValue('closing_account_head', v)}
                        placeholder="حساب يرحّل إليه صافي الأرباح/الخسائر"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs font-medium">ملاحظات *</Label>
                      <Textarea rows={3} {...form.register('remarks')} />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">
                      إلغاء
                    </Button>
                    <Button type="submit" size="sm" className="gap-1.5" disabled={coLoad || createMutation.isPending}>
                      {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ كمسودة'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">قسائم إقفال سابقة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DataTable
            data={data || []}
            columns={columns}
            title="القسائم"
            searchable
            loading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
