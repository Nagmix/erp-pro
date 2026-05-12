'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateDoc, useDocList, useUpdateDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, type Column } from '@/components/erp/data-table';
import { formatDate } from '@/lib/core/helpers';
import { buildFiscalYear } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ErpListDateStatusFilters, type ErpStatusTab } from '@/components/erp/erp-list-date-status-filters';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import {
  Info,
  CalendarCheck,
  CalendarX2,
  AlertTriangle,
  Plus,
} from 'lucide-react';

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
  const { company, isLoading: coLoad } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [reopenConfirmOpen, setReopenConfirmOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  // ── KPIs ──
  const rows = data || [];
  const activeCount = useMemo(() => rows.filter(r => Number(r.disabled) !== 1).length, [rows]);
  const closedCount = useMemo(() => rows.filter(r => Number(r.disabled) === 1).length, [rows]);

  // ── Status tabs ──
  const statusTabs: ErpStatusTab[] = [
    { value: 'all', label: 'الكل' },
    { value: 'active', label: 'نشطة' },
    { value: 'closed', label: 'مقفلة' },
  ];

  // ── Filtered data ──
  const filteredData = useMemo(() => {
    let list = rows;
    if (statusFilter === 'active') list = list.filter(r => Number(r.disabled) !== 1);
    else if (statusFilter === 'closed') list = list.filter(r => Number(r.disabled) === 1);
    if (dateFrom || dateTo) list = list.filter(r => rowInDateRangeISO(r.year_start_date, dateFrom, dateTo));
    return list;
  }, [rows, statusFilter, dateFrom, dateTo]);

  const clearFilters = () => { setDateFrom(''); setDateTo(''); setStatusFilter('all'); };
  const hasActiveFilters = dateFrom || dateTo || statusFilter !== 'all';

  // ── Close / Reopen handlers ──
  const handleClose = (row: Row) => {
    setSelectedRow(row);
    setCloseConfirmOpen(true);
  };

  const confirmClose = () => {
    if (!selectedRow) return;
    updateMutation.mutate(
      { name: selectedRow.name, doc: { disabled: 1 } },
      {
        onSuccess: () => {
          toast.success('تم إقفال السنة المالية بنجاح');
          void refetch();
          setCloseConfirmOpen(false);
          setSelectedRow(null);
        },
        onError: () => toast.error('تعذر الإقفال — راجع الصلاحيات'),
      }
    );
  };

  const handleReopen = (row: Row) => {
    setSelectedRow(row);
    setReopenConfirmOpen(true);
  };

  const confirmReopen = () => {
    if (!selectedRow) return;
    updateMutation.mutate(
      { name: selectedRow.name, doc: { disabled: 0 } },
      {
        onSuccess: () => {
          toast.success('أُعيد فتح السنة المالية');
          void refetch();
          setReopenConfirmOpen(false);
          setSelectedRow(null);
        },
        onError: () => toast.error('تعذر إعادة الفتح'),
      }
    );
  };

  const columns: Column<Row>[] = [
    { key: 'year', header: 'السنة', sortable: true, filterable: true },
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
      key: '_status',
      header: 'الحالة',
      render: (_v, row) => {
        const closed = Number(row.disabled) === 1;
        return closed ? (
          <Badge variant="outline" className="border-0 text-xs font-semibold px-2 py-0.5 bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25">
            مقفلة
          </Badge>
        ) : (
          <Badge variant="outline" className="border-0 text-xs font-semibold px-2 py-0.5 bg-success/12 text-success ring-1 ring-inset ring-success/25">
            نشطة
          </Badge>
        );
      },
    },
    {
      key: '_actions',
      header: 'إجراءات',
      render: (_v, row) => {
        const closed = Number(row.disabled) === 1;
        return (
          <div className="flex flex-wrap gap-1">
            {closed ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[10px] px-2 gap-1"
                disabled={updateMutation.isPending}
                onClick={() => handleReopen(row)}
              >
                <CalendarCheck className="h-3 w-3" />
                إعادة فتح
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[10px] px-2 gap-1 text-destructive hover:text-destructive"
                disabled={updateMutation.isPending}
                onClick={() => handleClose(row)}
              >
                <CalendarX2 className="h-3 w-3" />
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
        toast.success('تم حفظ السنة المالية');
        void refetch();
        form.reset({ year: '', company: company || '', year_start_date: d.year_start_date, year_end_date: d.year_end_date });
        setDialogOpen(false);
      },
      onError: () => toast.error('تعذر حفظ السنة المالية، يرجى المحاولة مرة أخرى'),
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
                  <Plus className="h-3.5 w-3.5" />
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
                      <Label className="text-sm font-medium">اسم السنة *</Label>
                      <Input placeholder="مثال: 2025" dir="rtl" {...form.register('year')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">الشركة (افتراضية)</Label>
                      <p className="text-sm font-semibold">{form.watch('company') || company || '—'}</p>
                      {!company && <p className="text-[10px] text-destructive">اضبط الشركة الافتراضية من الإعدادات</p>}
                      <input type="hidden" {...form.register('company')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">بداية السنة *</Label>
                      <Input type="date" dir="rtl" {...form.register('year_start_date')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">نهاية السنة *</Label>
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

      <ErpListDateStatusFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        statusTabs={statusTabs}
        extraFilters={
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex h-5 min-w-5 rounded-full bg-success/12 text-success text-[10px] font-bold items-center justify-center px-1.5">
                {activeCount}
              </span>
              <span>نشطة</span>
              <span className="inline-flex h-5 min-w-5 rounded-full bg-destructive/12 text-destructive text-[10px] font-bold items-center justify-center px-1.5 ms-2">
                {closedCount}
              </span>
              <span>مقفلة</span>
            </div>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-xs"
                onClick={clearFilters}
              >
                مسح الكل
              </Button>
            )}
          </div>
        }
      />

      <DataTable
        data={filteredData}
        columns={columns}
        title="قائمة السنوات المالية"
        searchable
        loading={isLoading}
        columnFilters
        stickyFirstColumn
        tableId="accounting-fiscal-year"
        exportFileName="fiscal-years.csv"
        printTitle="السنوات المالية"
      />

      {/* Close Confirmation Dialog */}
      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد إقفال السنة المالية
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm leading-relaxed">
              <p>
                هل أنت متأكد من إقفال السنة المالية{' '}
                <span className="font-semibold text-foreground">{selectedRow?.year || selectedRow?.name}</span>؟
              </p>
              <div className="rounded-lg border border-destructive/30 bg-destructive/[0.04] p-3 text-xs space-y-1.5">
                <p className="font-semibold text-destructive">⚠️ تحذير: ما يعنيه إقفال السنة المالية</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>لن يمكن إنشاء قيود يومية أو عمليات محاسبية ضمن هذه السنة</li>
                  <li>لن يمكن ترحيل أي مستندات بتاريخ يقع ضمن فترة هذه السنة</li>
                  <li>جميع الحسابات الختامية ستُجمّد لهذه الفترة</li>
                  <li>يمكن إعادة فتح السنة لاحقاً من نفس هذه الصفحة</li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">
                الفترة: {selectedRow ? formatDate(selectedRow.year_start_date) : '—'} — {selectedRow ? formatDate(selectedRow.year_end_date) : '—'}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs bg-destructive hover:bg-destructive/90"
              onClick={confirmClose}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'جاري الإقفال...' : 'نعم، إقفال السنة'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen Confirmation Dialog */}
      <AlertDialog open={reopenConfirmOpen} onOpenChange={setReopenConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-success" />
              تأكيد إعادة فتح السنة المالية
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm leading-relaxed">
              <p>
                هل أنت متأكد من إعادة فتح السنة المالية{' '}
                <span className="font-semibold text-foreground">{selectedRow?.year || selectedRow?.name}</span>؟
              </p>
              <div className="rounded-lg border border-warning/30 bg-warning/[0.04] p-3 text-xs space-y-1.5">
                <p className="font-semibold text-warning-foreground">تنبيه:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>ستتمكن من إنشاء وترحيل قيود محاسبية ضمن هذه السنة</li>
                  <li>تأكد من ضرورة إعادة الفتح قبل المتابعة</li>
                  <li>قد تحتاج لمراجعة المدقق الخارجي قبل إعادة الفتح</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs"
              onClick={confirmReopen}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'جاري إعادة الفتح...' : 'نعم، إعادة فتح السنة'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
