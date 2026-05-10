'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { KpiCard } from '@/components/erp/kpi-card';
import { KpiStrip } from '@/components/erp/page-header';
import { ErpListDateStatusFilters, type ErpStatusTab } from '@/components/erp/erp-list-date-status-filters';
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
import { Plus, Trash2, Send, Undo2, Eye, Upload, FileSpreadsheet, Minus } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDocList, useDeleteDoc, useSubmitDoc, useCancelDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';
import { Label } from '@/components/ui/label';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { isBranchesEnabled } from '@/lib/core/setup-config';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Input } from '@/components/ui/input';
import { apiCreateDoc } from '@/lib/client/api';
import { buildJournalEntry } from '@/lib/erp/erpnext-payloads';
import { parseJournalImportXlsx } from '@/lib/erp/parse-journal-import-xlsx';
import type { JournalLineInput } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface JournalRow {
  name: string;
  company?: string | null;
  voucher_type?: string | null;
  posting_date?: string | null;
  total_debit?: number | string | null;
  total_credit?: number | string | null;
  user_remark?: string | null;
  docstatus?: number | string | null;
  branch?: string | null;
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
  'Exchange Rate Revaluation': 'إعادة تقييم سعر الصرف',
};

const asNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const statusTabs: ErpStatusTab[] = [
  { value: 'all', label: 'الكل' },
  { value: '0', label: 'مسودة' },
  { value: '1', label: 'مرحّل' },
  { value: '2', label: 'ملغي' },
];

export default function JournalEntryPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState('');
  const branchesEnabled = isBranchesEnabled();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<JournalRow | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      ...(branchesEnabled ? ['branch'] : []),
    ],
    filters: branchFilter.trim() ? [['branch', '=', branchFilter.trim()]] : undefined,
    order_by: 'posting_date desc',
    limit: 500,
  });

  const deleteMutation = useDeleteDoc('Journal Entry');
  const submitMutation = useSubmitDoc<JournalRow>('Journal Entry');
  const cancelMutation = useCancelDoc<JournalRow>('Journal Entry');

  const entries = data || [];

  // ── KPI calculations ──
  const kpis = useMemo(() => {
    const total = entries.length;
    const totalDebit = entries.reduce((s, j) => s + asNumber(j.total_debit), 0);
    const totalCredit = entries.reduce((s, j) => s + asNumber(j.total_credit), 0);
    const draftCount = entries.filter((j) => asNumber(j.docstatus) === 0).length;
    const submittedCount = entries.filter((j) => asNumber(j.docstatus) === 1).length;
    return { total, totalDebit, totalCredit, draftCount, submittedCount };
  }, [entries]);

  // ── Filtered data ──
  const filteredData = useMemo(() => {
    let list = entries;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((row: any) =>
        ['name', 'user_remark', 'voucher_type', 'company'].some(key => String((row as any)[key] ?? '').toLowerCase().includes(q))
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
  }, [entries, dateFrom, dateTo, statusFilter, voucherTypeFilter, search]);

  // ── Excel import handler ──
  const handleImport = useCallback(async () => {
    const input = fileInputRef.current;
    if (!input) return;
    const file = input.files?.[0];
    if (!file) return;

    if (!defaultCompany) {
      toast.error('تعذر تحديد الشركة');
      return;
    }

    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const lines: JournalLineInput[] = await parseJournalImportXlsx(buffer);

      if (!lines.length) {
        toast.error('لم يتم العثور على بنود صالحة في الملف');
        return;
      }

      // Build and create the Journal Entry
      const doc = buildJournalEntry({
        company: defaultCompany,
        posting_date: new Date().toISOString().split('T')[0],
        voucher_type: 'Journal Entry',
        title: `استيراد — ${file.name}`,
        user_remark: `تم الاستيراد من ملف: ${file.name}`,
        lines,
      });

      await apiCreateDoc('Journal Entry', doc);
      toast.success(`تم استيراد القيد بنجاح (${lines.length} بند)`);
      void refetch();
    } catch (err: any) {
      toast.error('فشل الاستيراد', { description: err?.message || 'تحقق من تنسيق الملف' });
    } finally {
      setImporting(false);
      // Reset file input so same file can be re-selected
      input.value = '';
    }
  }, [defaultCompany, toast, refetch]);

  // ── Table columns ──
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
        render: (value) => (value ? formatDate(String(value)) : '—'),
      },
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
          <span className="font-semibold text-primary tabular-nums" dir="ltr">
            {formatCurrency(asNumber(value))}
          </span>
        )},
      {
        key: 'total_credit',
        header: 'إجمالي الدائن',
        sortable: true,
        render: (value) => (
          <span className="font-semibold text-chart-4 tabular-nums" dir="ltr">
            {formatCurrency(asNumber(value))}
          </span>
        )},
      {
        key: 'user_remark',
        header: 'البيان',
        filterable: true,
        render: (value) => <span className="text-muted-foreground text-xs truncate max-w-[200px] block">{String(value || '—')}</span>,
      },
      {
        key: 'docstatus',
        header: 'الحالة',
        render: (value) => <DocStatusBadge docstatus={asNumber(value) as 0 | 1 | 2} />,
      },
      {
        key: 'actions',
        header: 'إجراءات',
        width: 'w-48',
        render: (_, row) => (
          <div className="flex flex-wrap gap-1">
            {(() => {
              const href = docDetailPath('Journal Entry', row.name);
              return href ? (
                <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                  <Link href={href}><Eye className="h-3 w-3 ms-1" />عرض</Link>
                </Button>
              ) : null;
            })()}
            {asNumber(row.docstatus) === 0 && (
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() =>
                  submitMutation.mutate(row.name, {
                    onSuccess: () => { toast.success('تم ترحيل القيد'); void refetch(); },
                    onError: () => toast.error('فشل الترحيل — تحقق من البيانات'),
                  })
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
                className="h-7 text-xs px-2"
                onClick={() =>
                  cancelMutation.mutate(row.name, {
                    onSuccess: () => { toast.success('تم إلغاء القيد'); void refetch(); },
                    onError: () => toast.error('فشل الإلغاء'),
                  })
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
                className="h-7 text-xs text-destructive"
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

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
    setSearch('');
    setVoucherTypeFilter('all');
    setBranchFilter('');
  };

  const hasActiveFilters = dateFrom || dateTo || statusFilter !== 'all' || voucherTypeFilter !== 'all' || search || branchFilter;

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
          <div className="flex items-center gap-2">
            {/* زر استيراد Excel */}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              {importing ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {importing ? 'جاري الاستيراد...' : 'استيراد Excel'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImport}
            />
            <Button size="sm" className="gap-1.5" asChild>
              <Link href="/accounting/journal-entry/new">
                <Plus className="h-3.5 w-3.5" />
                قيد جديد
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── شريط مؤشرات الأداء (KPI Strip) ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي القيود"
          value={kpis.total}
          icon={FileSpreadsheet}
          accent="info"
          compact
          description="جميع القيود في الفترة"
        />
        <KpiCard
          title="إجمالي المدين"
          value={formatCurrency(kpis.totalDebit)}
          icon={Plus}
          accent="success"
          compact
          description="مجموع حركة المدين"
        />
        <KpiCard
          title="إجمالي الدائن"
          value={formatCurrency(kpis.totalCredit)}
          icon={Minus}
          accent="warning"
          compact
          description="مجموع حركة الدائن"
        />
        <KpiCard
          title="مسودة / مرحّل"
          value={`${kpis.draftCount} / ${kpis.submittedCount}`}
          icon={Send}
          accent="primary"
          compact
          description="عدد القيود مسودة مقابل المرحّلة"
        />
      </KpiStrip>

      {/* ── فلاتر التاريخ والحالة والنوع والفرع ── */}
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
            {/* نوع القيد */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">نوع القيد</Label>
              <Select value={voucherTypeFilter} onValueChange={setVoucherTypeFilter}>
                <SelectTrigger className="h-9 text-xs w-32"><SelectValue /></SelectTrigger>
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
            {/* فرع */}
            {branchesEnabled && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">الفرع</Label>
                <ErpLinkCombobox
                  doctype="Branch"
                  value={branchFilter}
                  onChange={setBranchFilter}
                  placeholder="كل الفروع"
                  className="h-9 w-36"
                />
              </div>
            )}
            {/* بحث سريع */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">بحث</Label>
              <Input
                placeholder="رقم أو بيان..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9 text-xs w-44"
              />
            </div>
            {/* مسح */}
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

      {/* ── جدول البيانات ── */}
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

      {/* ─ـ حوار تأكيد الحذف ─ـ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
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
                    onSuccess: () => { toast.success('تم حذف القيد'); void refetch(); },
                    onError: () => toast.error('حدث خطأ أثناء الحذف'),
                  });
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
