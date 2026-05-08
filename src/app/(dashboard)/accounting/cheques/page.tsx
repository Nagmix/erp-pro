'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, Filter, ChevronDown, Upload, X } from 'lucide-react';
import { apiChequeLifecycleFieldStatus, apiEnsureChequeLifecycleField } from '@/lib/client/api';
import { useDocList, useUpdateDoc } from '@/lib/client/hooks';
import { CHEQUE_LIFECYCLE_FIELD, CHEQUE_LIFECYCLE_OPTIONS, chequeLifecycleLabel } from '@/lib/erp/cheque-lifecycle';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';
import { useToast } from '@/hooks/use-toast';
import { translateAccountName } from '@/lib/core/arabic-labels';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
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
  const { toast } = useToast();
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [includeLifecycle, setIncludeLifecycle] = useState(false);
  const [lifecycleCheckDone, setLifecycleCheckDone] = useState(false);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
      toast({
        title: res.created ? 'تم إنشاء حقل دورة الشيك' : 'الحقل موجود مسبقاً',
        description: res.insertAfter
          ? `يُدرج بعد "${res.insertAfter}"`
          : undefined});
    },
    onError: (e: Error) => toast({ title: 'تعذر إنشاء الحقل', description: e.message, variant: 'destructive' })});

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

  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setStatusFilter('all'); setTypeFilter('all'); };

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
    if (typeFilter === 'all') return rows;
    return rows.filter((p) => p.payment_type === typeFilter);
  }, [rows, typeFilter]);

  const onStageChange = useCallback(
    (name: string, stage: string) => {
      updatePe.mutate(
        { name, doc: { [CHEQUE_LIFECYCLE_FIELD]: stage || null } },
        {
          onSuccess: () => {
            toast({ title: 'تم تحديث مرحلة الشيك' });
            void qc.invalidateQueries({ queryKey: ['docList', 'Payment Entry'] });
          },
          onError: () => toast({ title: 'فشل الحفظ', variant: 'destructive' })}
      );
    },
    [qc, toast, updatePe]
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
        render: (v) => <span className="tabular-nums font-semibold">{formatCurrency(Number(v))}</span>},
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
              onStageChange(row.name, next);
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

  const filterOptions = [
    { key: 'all', label: 'الكل', count: rows.length },
    { key: 'Receive', label: 'تحصيل', count: rows.filter((p) => p.payment_type === 'Receive').length },
    { key: 'Pay', label: 'صرف', count: rows.filter((p) => p.payment_type === 'Pay').length },
    {
      key: 'Internal Transfer',
      label: 'تحويل',
      count: rows.filter((p) => p.payment_type === 'Internal Transfer').length},
  ];

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

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث بالرقم أو الطرف..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>

        {/* فلاتر متقدمة (قابلة للطي) */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" /> فلاتر متقدمة
                <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            {(dateFrom || dateTo || statusFilter !== 'all' || search) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
            <Label className="text-[10px]">من تاريخ</Label>
            <Input type="date" dir="ltr" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">إلى تاريخ</Label>
            <Input type="date" dir="ltr" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">الحالة</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="0">مسودة</SelectItem>
                <SelectItem value="1">مرحّل</SelectItem>
                <SelectItem value="2">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {lifecycleCheckDone && !includeLifecycle && (
        <Alert className="border-amber-500/40 bg-amber-500/5">
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

      <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-[var(--shadow-xs-ui)] p-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 overflow-x-auto">
          {filterOptions.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setTypeFilter(f.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-bold transition-all whitespace-nowrap ${typeFilter === f.key ? 'bg-background text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-border/30' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
            >
              {f.label}
              <span
                className={`tabular-nums text-[10px] rounded-md px-1.5 py-0.5 font-semibold ${typeFilter === f.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/70'}`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <DataTable data={filtered} columns={columns} searchable loading={isLoading} pageSize={15} />
    </div>
  );
}
