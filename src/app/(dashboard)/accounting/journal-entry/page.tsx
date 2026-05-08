'use client';

import { useState, useMemo } from 'react';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
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
import { Plus, Trash2, RefreshCw, Send, Undo2, Eye, FileText, Minus, Filter, ChevronDown, Upload, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDocList, useDeleteDoc, useSubmitDoc, useCancelDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/erp/page-header';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';
import { Label } from '@/components/ui/label';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { isBranchesEnabled } from '@/lib/core/setup-config';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface JournalRow {
  name: string;
  company?: string | null;
  voucher_type?: string | null;
  posting_date?: string | null;
  total_debit?: number | string | null;
  total_credit?: number | string | null;
  user_remark?: string | null;
  docstatus?: number | string | null;
}

const voucherTypeLabels: Record<string, string> = {
  'Journal Entry': 'قيد يومية',
  'Opening Entry': 'قيد افتتاحي',
  'Closing Entry': 'قيد إقفال',
  'Bank Entry': 'قيد بنكي',
  'Cash Entry': 'قيد نقدي',
  'Credit Card Entry': 'قيد بطاقة ائتمان',
  'Debit Note': 'إشعار مدين',
  'Credit Note': 'إشعار دائن',
  'Contra Entry': 'قيد مقابل',
  'Exchange Rate Revaluation': 'إعادة تقييم سعر الصرف'};

const asNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export default function JournalEntryPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState('');
  const branchesEnabled = isBranchesEnabled();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalRow | null>(null);

  const { toast } = useToast();
  const { company: defaultCompany } = useDefaultCompanyName();
  const { data, isLoading, isError, error, refetch } = useDocList<JournalRow>('Journal Entry', {
    fields: [
      'name',
      'company',
      'voucher_type',
      'posting_date',
      'total_debit',
      'total_credit',
      'user_remark',
      'docstatus',
    ],
    filters: branchFilter.trim() ? [['branch', '=', branchFilter.trim()]] : undefined,
    order_by: 'posting_date desc',
    limit: 500,
  });

  const deleteMutation = useDeleteDoc('Journal Entry');
  const submitMutation = useSubmitDoc<JournalRow>('Journal Entry');
  const cancelMutation = useCancelDoc<JournalRow>('Journal Entry');

  const entries = data || [];

  // Filtered data
  const filteredData = useMemo(() => {
    let list = entries;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((row: any) =>
        ['name', 'user_remark'].some(key => String(row.docstatus ?? '').toLowerCase().includes(q))
      );
    }
    if (dateFrom || dateTo) {
      list = list.filter((j) => rowInDateRangeISO(j.posting_date, dateFrom, dateTo));
    }
    if (statusFilter !== 'all') {
      list = list.filter((j) => String(asNumber(j.docstatus)) === statusFilter);
    }
    if (voucherTypeFilter !== 'all') {
      list = list.filter((j) => String(j.voucher_type || '') === voucherTypeFilter);
    }
    return list;
  }, [entries, dateFrom, dateTo, statusFilter, voucherTypeFilter]);
// Get unique voucher types
  const voucherTypes = useMemo(() => {
    const types = new Set(entries.map(e => String(e.voucher_type || '')).filter(Boolean));
    return Array.from(types).sort();
  }, [entries]);

  const columns: Column<JournalRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'رقم القيد',
        sortable: true,
        filterable: true,
        width: 'w-28',
        render: (value) => {
          const nm = String(value);
          const href = docDetailPath('Journal Entry', nm);
          return href ? (
            <Link href={href} className="font-medium text-primary hover:underline">{nm}</Link>
          ) : (
            <span className="font-medium text-primary">{nm}</span>
          );
        }},
      {
        key: 'posting_date',
        header: 'التاريخ',
        sortable: true,
        render: (value) => (value ? formatDate(String(value)) : '—')},
      {
        key: 'voucher_type',
        header: 'النوع',
        filterable: true,
        render: (value) => {
          const key = String(value ?? '');
          return voucherTypeLabels[key] || key || '—';
        }},
      {
        key: 'total_debit',
        header: 'إجمالي المدين',
        sortable: true,
        render: (value) => (
          <span className="font-semibold text-blue-600 tabular-nums" dir="ltr">
            {formatCurrency(asNumber(value))}
          </span>
        )},
      {
        key: 'total_credit',
        header: 'إجمالي الدائن',
        sortable: true,
        render: (value) => (
          <span className="font-semibold text-orange-600 tabular-nums" dir="ltr">
            {formatCurrency(asNumber(value))}
          </span>
        )},
      {
        key: 'user_remark',
        header: 'البيان',
        filterable: true,
        render: (value) => <span className="text-muted-foreground text-xs truncate max-w-[200px] block">{String(value || '—')}</span>},
      {
        key: 'docstatus',
        header: 'الحالة',
        render: (value) => <DocStatusBadge docstatus={asNumber(value) as 0 | 1 | 2} />},
      {
        key: 'actions',
        header: 'إجراءات',
        width: 'w-48',
        render: (_, row) => (
          <div className="flex flex-wrap gap-1">
            {(() => {
              const href = docDetailPath('Journal Entry', row.name);
              return href ? (
                <Button asChild size="sm" variant="outline" className="h-7 px-2 text-[10px]">
                  <Link href={href}><Eye className="h-3 w-3 ms-1" />عرض</Link>
                </Button>
              ) : null;
            })()}
            {asNumber(row.docstatus) === 0 && (
              <Button
                type="button"
                size="sm"
                className="h-7 text-[10px] px-2"
                onClick={() =>
                  submitMutation.mutate(row.name, {
                    onSuccess: () => { toast({ title: 'تم ترحيل القيد' }); void refetch(); },
                    onError: () => toast({ title: 'فشل الترحيل — تحقق من البيانات', variant: 'destructive' })})
                }
              >
                <Send className="h-3 w-3 ms-1" />ترحيل
              </Button>
            )}
            {asNumber(row.docstatus) === 1 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[10px] px-2"
                onClick={() =>
                  cancelMutation.mutate(row.name, {
                    onSuccess: () => { toast({ title: 'تم إلغاء القيد' }); void refetch(); },
                    onError: () => toast({ title: 'فشل الإلغاء', variant: 'destructive' })})
                }
              >
                <Undo2 className="h-3 w-3 ms-1" />إلغاء
              </Button>
            )}
            {asNumber(row.docstatus) < 2 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-[10px] text-destructive"
                onClick={() => { setSelectedEntry(row); setDeleteDialogOpen(true); }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )},
    ],
    [submitMutation, cancelMutation, refetch, toast]
  );
  const clearFilters = () => { setDateFrom(''); setDateTo(''); setStatusFilter('all'); setSearch(''); setVoucherTypeFilter('all'); };


  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="القيود اليومية"
        description="إدارة القيود المحاسبية والتسويات والترحيل؛ الإنشاء والاستيراد من صفحة قيد جديد"
        iconify="solar:document-medicine-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'القيود اليومية' }]}
        actions={
          <Button size="sm" className="gap-1.5" asChild>
            <Link href="/accounting/journal-entry/new">
              <Plus className="h-3.5 w-3.5" />
              قيد جديد
            </Link>
          </Button>
        }
      />

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث بالرقم أو البيان..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
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
            {(dateFrom || dateTo || statusFilter !== 'all' || voucherTypeFilter !== 'all' || search) && (
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
          <div className="space-y-1">
            <Label className="text-[10px]">نوع القيد</Label>
            <Select value={voucherTypeFilter} onValueChange={setVoucherTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="Journal Entry">قيد يومية</SelectItem>
                <SelectItem value="Opening Entry">قيد افتتاحي</SelectItem>
                <SelectItem value="Bank Entry">قيد بنكي</SelectItem>
                <SelectItem value="Cash Entry">قيد نقدي</SelectItem>
                <SelectItem value="Credit Card Entry">قيد بطاقة ائتمان</SelectItem>
                <SelectItem value="Debit Note">إشعار مدين</SelectItem>
                <SelectItem value="Credit Note">إشعار دائن</SelectItem>
                <SelectItem value="Contra Entry">قيد مقابل</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <DataTable
        data={filteredData}
        columns={columns}
        searchable
        loading={isLoading}
        pageSize={15}
        tableId="accounting-journal-entry"
        columnFilters
        stickyFirstColumn
        exportFileName="journal-entries.csv"
        printTitle="القيود اليومية"
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد الحذف</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">هل أنت متأكد من حذف القيد &quot;{selectedEntry?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedEntry) {
                  deleteMutation.mutate(selectedEntry.name, {
                    onSuccess: () => { toast({ title: 'تم حذف القيد' }); void refetch(); },
                    onError: () => toast({ title: 'حدث خطأ أثناء الحذف', variant: 'destructive' })});
                  setDeleteDialogOpen(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
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
