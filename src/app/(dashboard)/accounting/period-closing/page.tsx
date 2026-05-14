'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
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
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { ErpListDateStatusFilters, type ErpStatusTab } from '@/components/erp/erp-list-date-status-filters';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { formatDate } from '@/lib/core/helpers';
import { buildPeriodClosingVoucher } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Info,
  AlertTriangle,
  FileCheck,
  FileX2,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

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
  const { company, isLoading: coLoad } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<PcvRow | null>(null);

  // ── Filter state ──
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [docstatusFilter, setDocstatusFilter] = useState('all');
  const [fiscalYearFilter, setFiscalYearFilter] = useState('');

  const statusTabs: ErpStatusTab[] = useMemo(
    () => [
      { value: 'all', label: 'الكل' },
      { value: '0', label: 'مسودة' },
      { value: '1', label: 'مقفلة' },
      { value: '2', label: 'ملغاة' },
    ],
    []
  );

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
      remarks: 'إقفال فترة',
    },
  });

  useEffect(() => {
    if (company) {
      form.setValue('company', company);
    }
  }, [company, form]);

  // ── KPIs ──
  const rows = data || [];
  const draftCount = useMemo(() => rows.filter(r => r.docstatus === 0).length, [rows]);
  const submittedCount = useMemo(() => rows.filter(r => r.docstatus === 1).length, [rows]);
  const cancelledCount = useMemo(() => rows.filter(r => r.docstatus === 2).length, [rows]);

  // ── Filtered data ──
  const filteredData = useMemo(() => {
    return rows.filter((r) => {
      if (docstatusFilter !== 'all' && String(r.docstatus) !== docstatusFilter) return false;
      if (dateFrom && r.transaction_date < dateFrom) return false;
      if (dateTo && r.transaction_date > dateTo) return false;
      if (fiscalYearFilter && r.fiscal_year !== fiscalYearFilter) return false;
      return true;
    });
  }, [rows, docstatusFilter, dateFrom, dateTo, fiscalYearFilter]);

  const clearFilters = useCallback(() => {
    setDateFrom('');
    setDateTo('');
    setDocstatusFilter('all');
    setFiscalYearFilter('');
  }, []);

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
          toast.success('أُنشئت قسيمة إقفال (مسودة) — راجعها ثم رحّل');
          void refetch();
          setDialogOpen(false);
        },
        onError: () => toast.error('تعذر الحفظ — راجع الحقول'),
      }
    );
  };

  // ── Submit (post) with confirmation ──
  const handleSubmitClick = (row: PcvRow) => {
    setSelectedRow(row);
    setSubmitConfirmOpen(true);
  };

  const confirmSubmit = () => {
    if (!selectedRow) return;
    submitMutation.mutate(selectedRow.name, {
      onSuccess: () => {
        toast.success('تم ترحيل قسيمة الإقفال');
        void refetch();
        setSubmitConfirmOpen(false);
        setSelectedRow(null);
      },
      onError: () => {
        toast.error('فشل الترحيل');
        setSubmitConfirmOpen(false);
      },
    });
  };

  // ── Cancel with confirmation ──
  const handleCancelClick = (row: PcvRow) => {
    setSelectedRow(row);
    setCancelConfirmOpen(true);
  };

  const confirmCancel = () => {
    if (!selectedRow) return;
    cancelMutation.mutate(selectedRow.name, {
      onSuccess: () => {
        toast.success('أُلغي ترحيل قسيمة الإقفال');
        void refetch();
        setCancelConfirmOpen(false);
        setSelectedRow(null);
      },
      onError: () => {
        toast.error('تعذر إلغاء الترحيل');
        setCancelConfirmOpen(false);
      },
    });
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
              onClick={() => handleSubmitClick(row)}
            >
              <CheckCircle2 className="h-3 w-3" />
              ترحيل
            </Button>
          )}
          {row.docstatus === 1 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[10px] px-2 gap-1 text-destructive hover:text-destructive"
              disabled={cancelMutation.isPending}
              onClick={() => handleCancelClick(row)}
            >
              <XCircle className="h-3 w-3" />
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
                      <Label className="text-sm font-medium">الشركة (افتراضية)</Label>
                      <p className="text-sm font-semibold">{form.watch('company') || company || '—'}</p>
                      {!company && <p className="text-[10px] text-destructive">اضبط الشركة الافتراضية من الإعدادات</p>}
                      <input type="hidden" {...form.register('company')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">السنة المالية *</Label>
                      <ErpLinkCombobox
                        doctype="Fiscal Year"
                        value={form.watch('fiscal_year')}
                        onChange={(v) => form.setValue('fiscal_year', v)}
                        placeholder="مثال: سنة مالية 2025"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">تاريخ العملية *</Label>
                      <DatePicker value={form.watch('transaction_date')} onChange={(v) => form.setValue('transaction_date', v)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">بداية الفترة *</Label>
                      <DatePicker value={form.watch('period_start_date')} onChange={(v) => form.setValue('period_start_date', v)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">نهاية الفترة *</Label>
                      <DatePicker value={form.watch('period_end_date')} onChange={(v) => form.setValue('period_end_date', v)} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-sm font-medium">حساب رأس إقفال *</Label>
                      <ErpLinkCombobox
                        doctype="Account"
                        value={form.watch('closing_account_head')}
                        onChange={(v) => form.setValue('closing_account_head', v)}
                        placeholder="حساب يرحّل إليه صافي الأرباح/الخسائر"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-sm font-medium">ملاحظات *</Label>
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

      {/* ── Filters ── */}
      <ErpListDateStatusFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        statusValue={docstatusFilter}
        onStatusChange={setDocstatusFilter}
        statusTabs={statusTabs}
        extraFilters={
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">السنة المالية</Label>
              <ErpLinkCombobox
                doctype="Fiscal Year"
                value={fiscalYearFilter}
                onChange={setFiscalYearFilter}
                placeholder="كل السنوات"
              />
            </div>
            {(dateFrom || dateTo || docstatusFilter !== 'all' || fiscalYearFilter) && (
              <Button type="button" variant="ghost" size="sm" className="h-9 text-xs gap-1" onClick={clearFilters}>
                مسح الكل
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Strip */}
      {/* Warning about period closing */}
      {draftCount > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/[0.04] px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-xs">
              <p className="font-semibold text-warning-foreground">يوجد {draftCount} قسيمة إقفال في حالة مسودة</p>
              <p className="text-muted-foreground">
                قبل ترحيل قسيمة الإقفال، تأكد من اكتمال جميع القيود المحاسبية للفترة المحددة. ترحيل قسيمة الإقفال يُغلق الفترة ولا يمكن تسجيل حركات جديدة ضمنها.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">قسائم إقفال سابقة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DataTable
            data={filteredData}
            columns={columns}
            title="القسائم"
            searchable
            loading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد ترحيل قسيمة الإقفال
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm leading-relaxed">
              <p>
                هل أنت متأكد من ترحيل قسيمة الإقفال{' '}
                <span className="font-semibold text-foreground">{selectedRow?.name}</span>؟
              </p>
              {selectedRow && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/[0.04] p-3 text-xs space-y-1.5">
                  <p className="font-semibold text-destructive">⚠️ تحذير: ما يعنيه ترحيل قسيمة الإقفال</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>سيتم تحويل جميع أرصدة حسابات الإيرادات والمصروفات إلى حساب الإقفال</li>
                    <li>ستُغلق الفترة من <span className="font-medium">{formatDate(selectedRow.period_start_date)}</span> إلى <span className="font-medium">{formatDate(selectedRow.period_end_date)}</span></li>
                    <li>لن يمكن تسجيل أي قيود محاسبية ضمن هذه الفترة بعد الترحيل</li>
                    <li>يمكن إلغاء الترحيل لاحقاً لكن يُنصح بالتأكد قبل المتابعة</li>
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                السنة المالية: <span className="font-medium">{selectedRow?.fiscal_year || '—'}</span>
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs"
              onClick={confirmSubmit}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? 'جاري الترحيل...' : 'نعم، ترحيل القسيمة'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              تأكيد إلغاء ترحيل قسيمة الإقفال
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm leading-relaxed">
              <p>
                هل أنت متأكد من إلغاء ترحيل قسيمة الإقفال{' '}
                <span className="font-semibold text-foreground">{selectedRow?.name}</span>؟
              </p>
              {selectedRow && (
                <div className="rounded-lg border border-warning/30 bg-warning/[0.04] p-3 text-xs space-y-1.5">
                  <p className="font-semibold text-warning-foreground">تنبيه:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>سيتم عكس قيود الإقفال وإعادة فتح الفترة</li>
                    <li>ستعود أرصدة الإيرادات والمصروفات إلى ما كانت عليه قبل الإقفال</li>
                    <li>قد تحتاج لمراجعة المدقق الخارجي قبل هذا الإجراء</li>
                    <li>الفترة: <span className="font-medium">{formatDate(selectedRow.period_start_date)}</span> — <span className="font-medium">{formatDate(selectedRow.period_end_date)}</span></li>
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs bg-destructive hover:bg-destructive/90"
              onClick={confirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'جاري الإلغاء...' : 'نعم، إلغاء الترحيل'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
