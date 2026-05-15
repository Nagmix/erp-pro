'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { ErpListDateStatusFilters, type ErpStatusTab } from '@/components/erp/erp-list-date-status-filters';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { apiChequeLifecycleFieldStatus, apiEnsureChequeLifecycleField } from '@/lib/client/api';
import { useDocList, useUpdateDoc } from '@/lib/client/hooks';
import { CHEQUE_LIFECYCLE_FIELD, CHEQUE_LIFECYCLE_OPTIONS, chequeLifecycleLabel } from '@/lib/erp/cheque-lifecycle';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

type PERow = {
  name: string;
  payment_type: string;
  posting_date: string;
  party_type: string;
  party: string;
  mode_of_payment: string;
  paid_amount: number;
  reference_no: string;
  docstatus: number;
} & Partial<Record<typeof CHEQUE_LIFECYCLE_FIELD, string | undefined>>;

const BASE_FIELDS: string[] = [
  'name',
  'payment_type',
  'posting_date',
  'party_type',
  'party',
  'mode_of_payment',
  'paid_amount',
  'reference_no',
  'docstatus',
];

export default function ChequesPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [includeLifecycle, setIncludeLifecycle] = useState(false);
  const [lifecycleCheckDone, setLifecycleCheckDone] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('all');

  const fields = useMemo(() => {
    const f = [...BASE_FIELDS];
    if (includeLifecycle) f.push(CHEQUE_LIFECYCLE_FIELD);
    return f;
  }, [includeLifecycle]);

  const { data, isLoading, isError, error, refetch } = useDocList<PERow>('Payment Entry', {
    fields,
    order_by: 'posting_date desc',
    limit: 500,
  });

  const updatePe = useUpdateDoc('Payment Entry');

  const ensureFieldMut = useMutation({
    mutationFn: () => apiEnsureChequeLifecycleField(),
    onSuccess: (res) => {
      setIncludeLifecycle(true);
      void qc.invalidateQueries({ queryKey: ['docList', 'Payment Entry'] });
      toast.success(res.created ? 'تم إنشاء حقل دورة الشيك' : 'الحقل موجود مسبقاً', { description: res.insertAfter
          ? `يُدرج بعد "${res.insertAfter}"`
          : undefined });
    },
    onError: (e: Error) => toast.error('تعذر إنشاء الحقل', { description: e.message })});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await apiChequeLifecycleFieldStatus();
        if (!cancelled && s.exists) setIncludeLifecycle(true);
      } catch {
        /* تعذر التحقق — يظهر تنبيه التفعيل اليدوي */
      } finally {
        if (!cancelled) setLifecycleCheckDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusTabs: ErpStatusTab[] = [
    { value: 'all', label: 'الكل' },
    { value: '0', label: 'مسودة' },
    { value: '1', label: 'مرحّل' },
    { value: '2', label: 'ملغي' },
  ];

  const clearFilters = () => { setDateFrom(''); setDateTo(''); setStatusFilter('all'); setTypeFilter('all'); setLifecycleFilter('all'); };

  const rows = useMemo(() => {
    const all = data || [];
    const cheques = all.filter((p) => {
      const m = (p.mode_of_payment || '').toLowerCase();
      return (
        m.includes('cheque') ||
        m.includes('شيك') ||
        m.includes('check') ||
        m.includes('ck')
      );
    });
    return cheques;
  }, [data]);

  const filtered = useMemo(() => {
    let list = rows;
    if (typeFilter !== 'all') list = list.filter((p) => p.payment_type === typeFilter);
    if (dateFrom || dateTo) {
      list = list.filter((p) => rowInDateRangeISO(p.posting_date, dateFrom, dateTo));
    }
    if (statusFilter !== 'all') list = list.filter((p) => String(p.docstatus) === statusFilter);
    if (lifecycleFilter !== 'all' && includeLifecycle) {
      list = list.filter((p) => (p[CHEQUE_LIFECYCLE_FIELD] || '__none__') === lifecycleFilter);
    }
    return list;
  }, [rows, typeFilter, dateFrom, dateTo, statusFilter, lifecycleFilter, includeLifecycle]);

  const onStageChange = useCallback(
    (name: string, stage: string, docstatus: number) => {
      if (docstatus === 1) {
        toast.error('لا يمكن تعديل مرحلة شيك مرحّل — ألغِ الترحيل أولاً');
        return;
      }
      if (docstatus === 2) {
        toast.error('لا يمكن تعديل مرحلة شيك ملغي');
        return;
      }
      updatePe.mutate(
        { name, doc: { [CHEQUE_LIFECYCLE_FIELD]: stage || null } },
        {
          onSuccess: () => {
            toast.success('تم تحديث مرحلة الشيك');
            void qc.invalidateQueries({ queryKey: ['docList', 'Payment Entry'] });
          },
          onError: (err: Error) =>
            toast.error('فشل الحفظ', { description: err.message || 'خطأ غير معروف' }),
        }
      );
    },
    [qc, updatePe]
  );

  const columns: Column<PERow>[] = useMemo(() => {
    const base: Column<PERow>[] = [
      {
        key: 'name',
        header: 'المرجع',
        width: 'w-28',
        render: (v) => {
          const nm = String(v);
          const href = docDetailPath('Payment Entry', nm);
          return href ? (
            <Link href={href} className="font-mono text-primary hover:underline">
              {nm}
            </Link>
          ) : (
            <span className="font-mono text-primary">{nm}</span>
          );
        }},
      { key: 'payment_type', header: 'النوع' },
      { key: 'party', header: 'الطرف' },
      { key: 'mode_of_payment', header: 'طريقة الدفع' },
      {
        key: 'paid_amount',
        header: 'المبلغ',
        render: (v) => <span className="tabular-nums font-semibold" dir="ltr">{formatCurrency(Number(v))}</span>},
      { key: 'reference_no', header: 'رقم الشيك/مرجع', render: (v) => String(v || '—') },
      { key: 'posting_date', header: 'التاريخ', render: (v) => formatDate(String(v)) },
      { key: 'docstatus', header: 'الحالة', render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} /> },
    ];

    if (!includeLifecycle) return base;

    const lifecycleCol: Column<PERow> = {
      key: CHEQUE_LIFECYCLE_FIELD,
      header: 'دورة الشيك',
      width: 'w-44',
      render: (_v, row) => {
        const cur = row[CHEQUE_LIFECYCLE_FIELD] || '';
        return (
          <Select
            value={cur || '__unset__'}
            onValueChange={(val) => {
              const next = val === '__unset__' ? '' : val;
              onStageChange(row.name, next, row.docstatus);
            }}
            disabled={updatePe.isPending}
          >
            <SelectTrigger className="h-8 text-xs" dir="rtl">
              <SelectValue placeholder="اختر المرحلة" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="__unset__">— غير محدد —</SelectItem>
              {CHEQUE_LIFECYCLE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {chequeLifecycleLabel(opt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }};

    return [...base.slice(0, 6), lifecycleCol, ...base.slice(6)];
  }, [includeLifecycle, onStageChange, updatePe.isPending]);

  const hasActiveFilters = dateFrom || dateTo || statusFilter !== 'all' || typeFilter !== 'all' || lifecycleFilter !== 'all';

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="الشيكات"
        description="إدارة الشيكات والمدفوعات — يُفلتر تلقائياً بما يشمل «شيك» في طريقة الدفع؛ مراحل: إصدار → إيداع → مقاصة أو ارتداد"
        iconify="solar:card-2-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'الشيكات' }]}
        actions={
          <Button size="sm" className="gap-1.5" asChild>
            <Link href="/accounting/payment-entry?chequeFlow=1">
              <Plus className="h-3.5 w-3.5" />
              تسجيل شيك (دفعة)
            </Link>
          </Button>
        }
      />

      {lifecycleCheckDone && !includeLifecycle && (
        <Alert className="border-amber-500/40 bg-chart-2/5">
          <AlertTitle>تفعيل مراحل الشيك</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <span className="text-sm">
              لعرض عمود «دورة الشيك» وتحديث المراحل، أنشئ حقلاً مخصصاً على قيد الدفع (إصدار / إيداع / مقاصة / ارتداد).
              يتطلب صلاحية محاسبة أو مدير نظام على الخادم.
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0 gap-2"
              disabled={ensureFieldMut.isPending}
              onClick={() => ensureFieldMut.mutate()}
            >
              {ensureFieldMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              إنشاء الحقل تلقائياً
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">نوع السند</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="Receive">تحصيل</SelectItem>
                  <SelectItem value="Pay">صرف</SelectItem>
                  <SelectItem value="Internal Transfer">تحويل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {includeLifecycle && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">دورة الشيك</Label>
                <Select value={lifecycleFilter} onValueChange={setLifecycleFilter}>
                  <SelectTrigger className="h-9 text-xs w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="__none__">بدون مرحلة</SelectItem>
                    {CHEQUE_LIFECYCLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{chequeLifecycleLabel(opt)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
        data={filtered}
        columns={columns}
        searchable
        loading={isLoading}
        pageSize={15}
        columnFilters
        stickyFirstColumn
        tableId="accounting-cheques"
        exportFileName="cheques.csv"
        printTitle="الشيكات"
      />
    </div>
  );
}
