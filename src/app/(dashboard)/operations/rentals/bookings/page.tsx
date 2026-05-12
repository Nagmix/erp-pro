'use client';

import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { StatusBadge } from '@/components/erp/status-badge';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Plus, Trash2, Filter, ChevronDown, X, Calendar, Send, Ban, CheckCircle2 } from 'lucide-react';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc, useSubmitDoc, useCancelDoc } from '@/lib/client/hooks';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

interface QuotationRow {
  name: string;
  customer_name?: string;
  transaction_date?: string;
  grand_total?: number;
  status?: string;
  valid_till?: string;
  docstatus?: number;
  party_name?: string;
}

// ============================================================
// Status styles for Quotation statuses
// ============================================================

const QUOTATION_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  Draft: { label: 'مسودة', cls: 'bg-secondary text-secondary-foreground' },
  Open: { label: 'مفتوح', cls: 'bg-chart-2/10 text-chart-2' },
  Submitted: { label: 'مُقدّم', cls: 'bg-primary/10 text-primary' },
  Ordered: { label: 'مؤكد', cls: 'bg-primary/10 text-primary' },
  Cancelled: { label: 'ملغي', cls: 'bg-destructive/10 text-destructive' },
  Expired: { label: 'منتهي', cls: 'bg-muted text-muted-foreground' },
  Lost: { label: 'مفقود', cls: 'bg-destructive/10 text-destructive' },
};

// ============================================================
// Schema
// ============================================================

const bookingSchema = z.object({
  customer: z.string().min(1, 'العميل مطلوب'),
  transaction_date: z.string().min(1, 'تاريخ الحجز مطلوب'),
  valid_till: z.string().min(1, 'تاريخ الانتهاء مطلوب'),
  item_code: z.string().default(''),
  rate: z.coerce.number().min(0).default(0),
  notes: z.string().default(''),
});

type BookingFormInput = z.input<typeof bookingSchema>;
type BookingFormOutput = z.output<typeof bookingSchema>;

// ============================================================
// Main Component
// ============================================================

export default function BookingsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<QuotationRow | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { company: defaultCo } = useDefaultCompanyName();

  // Data
  const list = useDocList<QuotationRow>('Quotation', {
    fields: [
      'name',
      'customer_name',
      'transaction_date',
      'grand_total',
      'status',
      'valid_till',
      'docstatus',
      'party_name',
    ],
    order_by: 'transaction_date desc',
    limit: 500,
  });

  const createMutation = useCreateDoc('Quotation');
  const deleteMutation = useDeleteDoc('Quotation');
  const submitMutation = useSubmitDoc('Quotation');
  const cancelMutation = useCancelDoc('Quotation');

  const allRows = list.data ?? [];

  // Stats
  const stats = useMemo(() => {
    const total = allRows.length;
    const confirmed = allRows.filter((r) => r.status === 'Ordered').length;
    const pending = allRows.filter((r) => ['Draft', 'Open'].includes(String(r.status ?? ''))).length;
    const cancelled = allRows.filter((r) => r.status === 'Cancelled' || r.docstatus === 2).length;
    const completed = allRows.filter((r) => r.status === 'Expired' || r.status === 'Lost').length;
    return { total, confirmed, pending, cancelled, completed };
  }, [allRows]);

  // Filtered data
  const filteredData = useMemo(() => {
    let data = allRows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter(
        (r) =>
          [r.name, r.customer_name, r.status].some((v) =>
            String(v ?? '').toLowerCase().includes(q)
          )
      );
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'Draft') data = data.filter((r) => r.docstatus === 0);
      else if (statusFilter === 'Submitted') data = data.filter((r) => r.docstatus === 1);
      else if (statusFilter === 'Cancelled') data = data.filter((r) => r.docstatus === 2);
      else data = data.filter((r) => r.status === statusFilter);
    }
    if (dateFrom) data = data.filter((r) => r.transaction_date && r.transaction_date >= dateFrom);
    if (dateTo) data = data.filter((r) => r.transaction_date && r.transaction_date <= dateTo);
    return data;
  }, [allRows, search, statusFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  // Columns
  const columns: Column<QuotationRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'رقم الحجز',
        sortable: true,
        width: 'w-32',
        render: (v) => <span className="font-mono text-xs text-primary">{String(v)}</span>,
      },
      {
        key: 'customer_name',
        header: 'العميل',
        sortable: true,
        render: (v) => <span className="text-sm font-medium">{String(v ?? '—')}</span>,
      },
      {
        key: 'transaction_date',
        header: 'تاريخ الحجز',
        sortable: true,
        render: (v) => (
          <span className="text-xs tabular-nums" dir="ltr">
            {v ? formatDate(String(v)) : '—'}
          </span>
        ),
      },
      {
        key: 'grand_total',
        header: 'المبلغ الإجمالي',
        sortable: true,
        render: (v) => (
          <span className="tabular-nums font-semibold" dir="ltr">
            {formatCurrency(Number(v ?? 0))}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'الحالة',
        sortable: true,
        width: 'w-28',
        render: (v) => {
          const statusInfo = QUOTATION_STATUS_MAP[String(v ?? '')];
          if (statusInfo) {
            return (
              <Badge variant="outline" className={cn('text-xs border-0', statusInfo.cls)}>
                {statusInfo.label}
              </Badge>
            );
          }
          return <StatusBadge status={String(v ?? '—')} />;
        },
      },
      {
        key: 'valid_till',
        header: 'تاريخ الانتهاء',
        sortable: true,
        render: (v) => (
          <span className="text-xs tabular-nums" dir="ltr">
            {v ? formatDate(String(v)) : '—'}
          </span>
        ),
      },
    ],
    []
  );

  // Form
  const createForm = useForm<BookingFormInput, any, BookingFormOutput>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      customer: '',
      transaction_date: new Date().toISOString().split('T')[0],
      valid_till: '',
      item_code: '',
      rate: 0,
      notes: '',
    },
  });

  // Handlers
  const handleCreate = async (formData: BookingFormOutput) => {
    try {
      const doc: Record<string, unknown> = {
        doctype: 'Quotation',
        quotation_to: 'Customer',
        party_name: formData.customer,
        customer: formData.customer,
        transaction_date: formData.transaction_date,
        valid_till: formData.valid_till,
        items: formData.item_code
          ? [{ item_code: formData.item_code, qty: 1, rate: formData.rate }]
          : [],
      };
      await createMutation.mutateAsync(doc);
      toast.success('تم إنشاء أمر الحجز بنجاح');
      setCreateDialogOpen(false);
      createForm.reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('حدث خطأ أثناء الإنشاء', { description: msg });
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteMutation.mutate(selected.name, {
      onSuccess: () => {
        toast.success('تم حذف أمر الحجز بنجاح');
        setDeleteDialogOpen(false);
        setSelected(null);
      },
      onError: () => toast.error('حدث خطأ أثناء الحذف'),
    });
  };

  const handleSubmit = () => {
    if (!selected) return;
    submitMutation.mutate(selected.name, {
      onSuccess: () => {
        toast.success('تم تأكيد أمر الحجز بنجاح');
        setSubmitDialogOpen(false);
        setSelected(null);
      },
      onError: (e) => {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error('حدث خطأ أثناء التأكيد', { description: msg });
        setSubmitDialogOpen(false);
      },
    });
  };

  const handleCancel = () => {
    if (!selected) return;
    cancelMutation.mutate(selected.name, {
      onSuccess: () => {
        toast.success('تم إلغاء أمر الحجز بنجاح');
        setCancelDialogOpen(false);
        setSelected(null);
      },
      onError: (e) => {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error('حدث خطأ أثناء الإلغاء', { description: msg });
        setCancelDialogOpen(false);
      },
    });
  };

  // Filter pills
  const filterPills = useMemo(
    () => [
      { key: 'all', label: 'الكل', count: allRows.length },
      { key: 'Draft', label: 'مسودات', count: stats.pending },
      { key: 'Submitted', label: 'مُقدّمة', count: allRows.filter((r) => r.docstatus === 1 && r.status !== 'Ordered').length },
      { key: 'Ordered', label: 'مؤكدة', count: stats.confirmed },
      { key: 'Cancelled', label: 'ملغاة', count: stats.cancelled },
    ],
    [allRows, stats]
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="أوامر الحجز"
        description="إدارة حجوزات وحدات الإيجار"
        iconify="solar:calendar-bold-duotone"
        accent="primary"
        breadcrumbs={[
          { label: 'التشغيل' },
          { label: 'إدارة الإيجارات', href: '/operations/rentals' },
          { label: 'أوامر الحجز' },
        ]}
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              createForm.reset({
                customer: '',
                transaction_date: new Date().toISOString().split('T')[0],
                valid_till: '',
                item_code: '',
                rate: 0,
                notes: '',
              });
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            حجز جديد
          </Button>
        }
      />

      <ListQueryAlert error={list.isError ? (list.error as Error) : null} onRetry={() => void list.refetch()} />

      {/* KPI Strip */}
      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="بحث برقم الحجز أو العميل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" /> فلاتر متقدمة
                <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            {(search || dateFrom || dateTo || statusFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
                <Label className="text-xs">من تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إلى تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Filter Pills */}
      <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-[var(--shadow-xs-ui)] p-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 overflow-x-auto">
          {filterPills.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-bold transition-all whitespace-nowrap',
                statusFilter === f.key
                  ? 'bg-background text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-border/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              )}
            >
              {f.label}
              <span
                className={cn(
                  'tabular-nums text-xs rounded-md px-1.5 py-0.5 font-semibold',
                  statusFilter === f.key
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground/70'
                )}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={filteredData}
        columns={columns}
        searchable
        loading={list.isLoading}
        onEdit={(row) => {
          setSelected(row);
          // For draft bookings, allow editing by opening create dialog pre-filled
          if (row.docstatus === 0) {
            createForm.reset({
              customer: row.party_name || '',
              transaction_date: row.transaction_date || '',
              valid_till: row.valid_till || '',
              item_code: '',
              rate: Number(row.grand_total ?? 0),
              notes: '',
            });
            setCreateDialogOpen(true);
          }
        }}
        onDelete={(row) => {
          setSelected(row);
          setDeleteDialogOpen(true);
        }}
      />

      {/* Action buttons for selected booking */}
      {selected && (
        <div className="flex flex-wrap gap-2">
          {selected.docstatus === 0 && (
            <Button
              size="sm"
              variant="default"
              className="gap-1.5"
              onClick={() => setSubmitDialogOpen(true)}
            >
              <Send className="h-3.5 w-3.5" />
              تأكيد الحجز
            </Button>
          )}
          {selected.docstatus === 1 && (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() => setCancelDialogOpen(true)}
            >
              <Ban className="h-3.5 w-3.5" />
              إلغاء الحجز
            </Button>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة حجز جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">العميل *</Label>
                <ErpLinkCombobox
                  doctype="Customer"
                  value={createForm.watch('customer')}
                  onChange={(v) => createForm.setValue('customer', v)}
                  placeholder="اختر العميل..."
                  displayKey="customer_name"
                />
                {createForm.formState.errors.customer && (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.customer.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">تاريخ الحجز *</Label>
                  <Input
                    type="date"
                    dir="ltr"
                    {...createForm.register('transaction_date')}
                  />
                  {createForm.formState.errors.transaction_date && (
                    <p className="text-xs text-destructive">
                      {createForm.formState.errors.transaction_date.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">تاريخ الانتهاء *</Label>
                  <Input
                    type="date"
                    dir="ltr"
                    {...createForm.register('valid_till')}
                  />
                  {createForm.formState.errors.valid_till && (
                    <p className="text-xs text-destructive">
                      {createForm.formState.errors.valid_till.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الوحدة</Label>
                  <ErpLinkCombobox
                    doctype="Item"
                    value={createForm.watch('item_code') ?? ''}
                    onChange={(v) => createForm.setValue('item_code', v)}
                    placeholder="اختر وحدة الإيجار..."
                    displayKey="item_name"
                    showCreateShortcut={false}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">السعر</Label>
                  <Input
                    type="number"
                    dir="ltr"
                    placeholder="0.00"
                    {...createForm.register('rate', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">ملاحظات</Label>
                <Textarea
                  placeholder="ملاحظات إضافية..."
                  rows={3}
                  {...createForm.register('notes')}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateDialogOpen(false)}
                className="text-muted-foreground"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="gap-1.5 min-w-[130px]"
              >
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الحجز'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation */}
      <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد الحجز</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  هل أنت متأكد من تأكيد أمر الحجز &quot;{selected?.name}&quot;؟ بعد التأكيد لا يمكن
                  تعديله.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">إلغاء الحجز</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  هل أنت متأكد من إلغاء أمر الحجز &quot;{selected?.name}&quot;؟ لا يمكن التراجع عن هذا
                  الإجراء.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              variant="destructive" className="gap-1.5"
            >
              <Ban className="h-3.5 w-3.5" />
              إلغاء الحجز
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد الحذف</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  هل أنت متأكد من حذف أمر الحجز &quot;{selected?.name}&quot;؟ لا يمكن التراجع عن هذا
                  الإجراء.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              variant="destructive" className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
