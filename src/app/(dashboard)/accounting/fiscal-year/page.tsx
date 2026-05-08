'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateDoc, useDocList, useUpdateDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, type Column } from '@/components/erp/data-table';
import { formatDate } from '@/lib/core/helpers';
import { buildFiscalYear } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';

const schema = z.object({
  year: z.string().min(1, 'اسم السنة مطلوب'),
  year_start_date: z.string().min(1),
  year_end_date: z.string().min(1),
  company: z.string().optional(),
});

type Form = z.infer<typeof schema>;

type Row = {
  name: string;
  year: string;
  year_start_date: string;
  year_end_date: string;
  disabled?: number;
};

export default function FiscalYearPage() {
  const { toast } = useToast();
  const { company, isLoading: coLoad } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading, isError, error, refetch } = useDocList<Row>('Fiscal Year', {
    fields: ['name', 'year', 'year_start_date', 'year_end_date', 'disabled'],
    limit: 100,
  });
  const createMutation = useCreateDoc('Fiscal Year');
  const updateMutation = useUpdateDoc<Row>('Fiscal Year');
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { year: '', company: '', year_start_date: '', year_end_date: '' },
  });

  useEffect(() => {
    if (company) form.setValue('company', company);
  }, [company, form]);

  const columns: Column<Row>[] = [
    { key: 'year', header: 'السنة', sortable: true },
    {
      key: 'year_start_date',
      header: 'بداية',
      sortable: true,
      render: (v) => formatDate(String(v)),
    },
    {
      key: 'year_end_date',
      header: 'نهاية',
      sortable: true,
      render: (v) => formatDate(String(v)),
    },
    { key: 'name', header: 'المعرف' },
    {
      key: '_actions',
      header: 'الحالة / إقفال',
      render: (_v, row) => {
        const closed = Number(row.disabled) === 1;
        return (
          <div className="flex flex-wrap gap-1">
            {closed ? (
              <span className="text-[10px] text-muted-foreground">مقفل</span>
            ) : (
              <span className="text-[10px] text-green-600">نشط</span>
            )}
            {closed ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-[10px] px-2"
                disabled={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate(
                    { name: row.name, doc: { disabled: 0 } },
                    {
                      onSuccess: () => {
                        toast({ title: 'أُعيد فتح السنة' });
                        void refetch();
                      },
                      onError: () => toast({ title: 'تعذر إعادة الفتح', variant: 'destructive' }),
                    }
                  )
                }
              >
                إعادة فتح
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[10px] px-2"
                disabled={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate(
                    { name: row.name, doc: { disabled: 1 } },
                    {
                      onSuccess: () => {
                        toast({ title: 'تم إقفال السنة المالية بنجاح' });
                        void refetch();
                      },
                      onError: () => toast({ title: 'تعذر الإقفال — راجع الصلاحيات', variant: 'destructive' }),
                    }
                  )
                }
              >
                إقفال
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const onSubmit = (d: Form) => {
    createMutation.mutate(buildFiscalYear(d), {
      onSuccess: () => {
        toast({ title: 'تم حفظ السنة المالية' });
        void refetch();
        form.reset({ year: '', company: company || '', year_start_date: d.year_start_date, year_end_date: d.year_end_date });
        setDialogOpen(false);
      },
      onError: () => toast({ title: 'تعذر حفظ السنة المالية، يرجى المحاولة مرة أخرى', variant: 'destructive' }),
    });
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="السنوات المالية"
        description="إدارة السنوات المالية والفترات المحاسبية وحالات الإقفال"
        iconify="solar:calendar-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'السنوات المالية' }]}
        actions={
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="معلومات">
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 text-sm leading-6">
                اختر الشركة الافتراضية من الإعدادات ثم أنشئ السنة مع تاريخي البداية والنهاية. يمكن فتح السنة أو إقفالها من الجدول.
              </PopoverContent>
            </Popover>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  سنة مالية جديدة
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="max-w-2xl gap-3">
                <DialogHeader>
                  <DialogTitle>إضافة سنة مالية</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">اسم السنة *</Label>
                      <Input placeholder="مثال: 2025" dir="rtl" {...form.register('year')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">الشركة (افتراضية)</Label>
                      <p className="text-sm font-semibold">{form.watch('company') || company || '—'}</p>
                      {!company && <p className="text-[10px] text-destructive">اضبط الشركة الافتراضية من الإعدادات</p>}
                      <input type="hidden" {...form.register('company')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">بداية السنة *</Label>
                      <Input type="date" dir="rtl" {...form.register('year_start_date')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">نهاية السنة *</Label>
                      <Input type="date" dir="rtl" {...form.register('year_end_date')} />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">
                      إلغاء
                    </Button>
                    <Button type="submit" size="sm" className="gap-1.5" disabled={coLoad || createMutation.isPending}>
                      {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
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
          <CardTitle className="text-sm">السنوات المالية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DataTable
            data={data || []}
            columns={columns}
            title="قائمة السنوات المالية"
            searchable
            loading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
