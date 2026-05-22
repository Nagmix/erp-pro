'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ErpListDateStatusFilters } from '@/components/erp/erp-list-date-status-filters';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import { AlertCircle, Clock, FileText, Plus, Send, Undo2, Eye, Trash2 } from 'lucide-react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { StatusBadge } from '@/components/erp/status-badge';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDocList, useSubmitDoc, useCancelDoc, useDeleteDoc } from '@/lib/client/hooks';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Label } from '@/components/ui/label';
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
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { isBranchesEnabled } from '@/lib/core/setup-config';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface InvoiceRow {
  name: string;
  company?: string;
  customer_name: string;
  posting_date: string;
  due_date: string;
  base_grand_total: number;
  outstanding_amount: number;
  status: string;
  docstatus: number;
}

const STATUS_LABELS: Record<string, string> = {
  Draft: 'مسودة',
  Unpaid: 'غير مدفوعة',
  Paid: 'مدفوعة',
  Overdue: 'متأخرة',
  'Partly Paid': 'مدفوعة جزئياً',
  Return: 'مرتجع',
  Cancelled: 'ملغاة',
};

export default function SalesInvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setStatusFilter('all'); };
  const branchesEnabled = isBranchesEnabled();
  const { company: defaultCompany } = useDefaultCompanyName();
  const { data, isLoading, isError, error, refetch } = useDocList<InvoiceRow>('Sales Invoice', {
    fields: [
      'name',
      'company',
      'customer_name',
      'posting_date',
      'due_date',
      'base_grand_total',
      'outstanding_amount',
      'status',
      'docstatus',
    ],
    filters: branchFilter.trim() ? [['branch', '=', branchFilter.trim()]] : undefined,
    order_by: 'posting_date desc',
    limit: 500,
  });

  const submitMutation = useSubmitDoc<InvoiceRow>('Sales Invoice');
  const cancelMutation = useCancelDoc<InvoiceRow>('Sales Invoice');
  const deleteMutation = useDeleteDoc('Sales Invoice');

  const invoices = data || [];
  const filtered = useMemo(() => {
    let list = invoices;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((row) =>
        String(row.name || '').toLowerCase().includes(q) ||
        String(row.customer_name || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom || dateTo) {
      list = list.filter((x) => rowInDateRangeISO(x.posting_date, dateFrom, dateTo));
    }
    if (statusFilter !== 'all') {
      list = list.filter((x) => x.status === statusFilter);
    }
    return list;
  }, [invoices, dateFrom, dateTo, statusFilter, search]);

  // KPIs
  const totalInvoices = invoices.length;
  const totalAmount = useMemo(() => invoices.reduce((s, inv) => s + Number(inv.base_grand_total || 0), 0), [invoices]);
  const totalOutstanding = useMemo(() => invoices.reduce((s, inv) => s + Number(inv.outstanding_amount || 0), 0), [invoices]);
  const overdueCount = invoices.filter(inv => inv.status === 'Overdue').length;

  const columns: Column<InvoiceRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'رقم الفاتورة',
        sortable: true,
        width: 'w-28',
        render: (value) => {
          const nm = String(value);
          const href = docDetailPath('Sales Invoice', nm);
          return href ? (
            <Link href={href} className="font-medium text-primary hover:underline">
              {nm}
            </Link>
          ) : (
            <span className="font-medium text-primary">{nm}</span>
          );
        }},
      { key: 'customer_name', header: 'العميل', sortable: true },
      { key: 'posting_date', header: 'تاريخ الفاتورة', sortable: true, render: (value) => formatDate(String(value)) },
      { key: 'due_date', header: 'تاريخ الاستحقاق', sortable: true, render: (value) => formatDate(String(value)) },
      {
        key: 'base_grand_total',
        header: 'الإجمالي',
        sortable: true,
        render: (value) => <span className="font-semibold tabular-nums">{formatCurrency(Number(value))}</span>},
      {
        key: 'outstanding_amount',
        header: 'المبلغ المستحق',
        sortable: true,
        render: (value) => {
          const amount = Number(value);
          return (
            <span className={cn('font-semibold tabular-nums', amount > 0 ? 'text-chart-2' : 'text-primary')}>
              {formatCurrency(amount)}
            </span>
          );
        }},
      { key: 'status', header: 'الحالة', render: (value) => <StatusBadge status={String(value)} /> },
      {
        key: 'actions',
        header: 'إجراءات',
        width: 'w-44',
        render: (_, row) => (
          <div className="flex flex-wrap gap-1">
            {(() => {
              const href = docDetailPath('Sales Invoice', row.name);
              return href ? (
                <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                  <Link href={href}><Eye className="h-3 w-3 ms-1" />عرض</Link>
                </Button>
              ) : null;
            })()}
            {Number(row.docstatus) === 0 && (
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs px-2"
                disabled={submitMutation.isPending}
                onClick={() =>
                  submitMutation.mutate(row.name, {
                    onSuccess: () => { toast.success('تم ترحيل الفاتورة'); void refetch(); },
                    onError: () => toast.error('فشل الترحيل — تحقق من البيانات')})
                }
              >
                <Send className="h-3 w-3 ms-1" />ترحيل
              </Button>
            )}
            {Number(row.docstatus) === 1 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
                disabled={cancelMutation.isPending}
                onClick={() =>
                  cancelMutation.mutate(row.name, {
                    onSuccess: () => { toast.success('تم إلغاء الترحيل'); void refetch(); },
                    onError: () => toast.error('فشل الإلغاء')})
                }
              >
                <Undo2 className="h-3 w-3 ms-1" />إلغاء
              </Button>
            )}
            {Number(row.docstatus) < 2 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive"
                onClick={() => { setSelectedInvoice(row); setDeleteDialogOpen(true); }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )},
    ],
    [submitMutation, cancelMutation, refetch, toast]
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="فواتير المبيعات"
        description="إدارة فواتير البيع والتحصيل والإشعارات الدائنة مع الترحيل والإلغاء"
        iconify="solar:document-add-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'المبيعات', href: '/sales' }, { label: 'فواتير المبيعات' }]}
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/sales/sales-invoices/new">
              <Plus className="h-3.5 w-3.5" />
              فاتورة جديدة
            </Link>
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">إجمالي الفواتير</p>
          <p className="text-2xl font-bold tabular-nums">{totalInvoices}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">إجمالي المبالغ</p>
          <p className="text-2xl font-bold tabular-nums text-primary">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">إجمالي المستحق</p>
          <p className={cn('text-2xl font-bold tabular-nums', totalOutstanding > 0 ? 'text-chart-2' : 'text-primary')}>{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">فواتير متأخرة</p>
          <p className={cn('text-2xl font-bold tabular-nums', overdueCount > 0 ? 'text-destructive' : 'text-emerald-600')}>{overdueCount}</p>
        </div>
      </div>

      {/* شريط البحث */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px]">
          <Input placeholder="بحث بالرقم أو العميل..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
        </div>
        {(search || dateFrom || dateTo || statusFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
            مسح الفلاتر
          </Button>
        )}
      </div>

      <ErpListDateStatusFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        statusTabs={[
          { value: 'all', label: 'الكل' },
          { value: 'Draft', label: STATUS_LABELS['Draft'] },
          { value: 'Unpaid', label: STATUS_LABELS['Unpaid'] },
          { value: 'Paid', label: STATUS_LABELS['Paid'] },
          { value: 'Overdue', label: STATUS_LABELS['Overdue'] },
          { value: 'Partly Paid', label: STATUS_LABELS['Partly Paid'] },
        ]}
        extraFilters={
          branchesEnabled ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground">الفرع</Label>
                <ErpLinkCombobox doctype="Branch" value={branchFilter} onChange={setBranchFilter} placeholder="كل الفروع" />
              </div>
              {branchFilter ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => setBranchFilter('')}
                >
                  مسح الفرع
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      />

      <DataTable
        tableId="sales-sales-invoices"
        data={filtered}
        columns={columns}
        searchable
        exportFileName="sales-invoices"
        printTitle="فواتير المبيعات"
        loading={isLoading}
        stickyFirstColumn
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد حذف الفاتورة</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">هل أنت متأكد من حذف الفاتورة &quot;{selectedInvoice?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedInvoice) {
                  deleteMutation.mutate(selectedInvoice.name, {
                    onSuccess: () => { toast.success('تم حذف الفاتورة'); void refetch(); },
                    onError: () => toast.error('حدث خطأ أثناء الحذف')});
                  setDeleteDialogOpen(false);
                }
              }}
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
