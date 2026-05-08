'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ErpListDateStatusFilters } from '@/components/erp/erp-list-date-status-filters';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import { AlertCircle, Clock, FileText, Plus, Filter, ChevronDown, Upload, X } from 'lucide-react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { StatusBadge } from '@/components/erp/status-badge';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDocList } from '@/lib/client/hooks';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { isBranchesEnabled } from '@/lib/core/setup-config';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface InvoiceRow {
  name: string;
  company?: string;
  customer_name: string;
  posting_date: string;
  due_date: string;
  base_grand_total: number;
  outstanding_amount: number;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  Draft: 'مسودة',
  Unpaid: 'غير مدفوعة',
  Paid: 'مدفوعة',
  Overdue: 'متأخرة',
  'Partly Paid': 'مدفوعة جزئياً'};

export default function SalesInvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
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
    ],
    filters: branchFilter.trim() ? [['branch', '=', branchFilter.trim()]] : undefined,
    order_by: 'posting_date desc',
    limit: 500,
  });

  const invoices = data || [];
  const filtered = useMemo(() => {
    let list = invoices;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((row: any) =>
        ['name', 'customer_name'].some(key => String(row.docstatus ?? '').toLowerCase().includes(q))
      );
    }
    if (dateFrom || dateTo) {
      list = list.filter((x) => rowInDateRangeISO(x.posting_date, dateFrom, dateTo));
    }
    if (statusFilter !== 'all') {
      list = list.filter((x) => x.status === statusFilter);
    }
    
    if (invoiceStatusFilter !== 'all') {
      list = list.filter((row: any) => String(row.docstatus ?? '') === invoiceStatusFilter);
    }return list;
  }, [invoices, dateFrom, dateTo, statusFilter]);  const columns: Column<InvoiceRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'رقم الفاتورة',
        sortable: true,
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
      {
        key: 'company',
        header: 'الشركة',
        sortable: true,
        render: (_v, row) => <span className="text-muted-foreground text-xs">{String(row.company || '—')}</span>},
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
        render: (value) => <span className="font-semibold tabular-nums">{formatCurrency(Number(value))}</span>},
      { key: 'status', header: 'الحالة', render: (value) => <StatusBadge status={String(value)} /> },
    ],
    []
  );
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="فواتير المبيعات"
        description="إدارة فواتير البيع والتحصيل والإشعارات الدائنة"
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

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث بالرقم أو العميل..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
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
            {(dateFrom || dateTo || invoiceStatusFilter !== 'all' || search) && (
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
            <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="Draft">مسودة</SelectItem>
                <SelectItem value="Unpaid">غير مدفوعة</SelectItem>
                <SelectItem value="Paid">مدفوعة</SelectItem>
                <SelectItem value="Overdue">متأخرة</SelectItem>
                <SelectItem value="Partly Paid">مدفوعة جزئياً</SelectItem>
                <SelectItem value="Return">مرتجع</SelectItem>
                <SelectItem value="Cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
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
          { value: 'Draft', label: 'مسودة' },
          { value: 'Unpaid', label: 'غير مدفوعة' },
          { value: 'Paid', label: 'مدفوعة' },
          { value: 'Overdue', label: 'متأخرة' },
          { value: 'Partly Paid', label: 'جزئياً' },
        ]}
        extraFilters={
          branchesEnabled ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1 min-w-[200px]">
                <Label className="text-[10px] text-muted-foreground">الفرع</Label>
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
    </div>
  );
}
