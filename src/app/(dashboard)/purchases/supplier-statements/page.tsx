'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { EmptyState } from '@/components/erp/empty-state';
import { ExportButton } from '@/components/erp/export-button';
import { apiGetList } from '@/lib/client/api';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Printer,
  FileDown,
  FileSpreadsheet,
  Mail,
  RotateCcw,
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CalendarClock,
  Truck,
  FileText,
  Send,
  Signature,
  Filter,
  Loader2,
  ShoppingBag,
  Wallet,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface GLEntry {
  name: string;
  posting_date: string;
  account: string;
  party_type: string;
  party: string;
  voucher_type: string;
  voucher_no: string;
  debit: number;
  credit: number;
  against: string;
  remarks: string;
  against_voucher: string;
  is_cancelled: number;
  fiscal_year: string;
  company: string;
}

interface SupplierRecord {
  name: string;
  supplier_name: string;
  supplier_group: string;
  default_currency: string;
  email_id: string;
  mobile_no: string;
  country: string;
}

type TransactionType = 'all' | 'Purchase Invoice' | 'Payment Entry' | 'Journal Entry' | 'Debit Note';

const TRANSACTION_TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'all', label: 'جميع المعاملات' },
  { value: 'Purchase Invoice', label: 'فاتورة مشتريات' },
  { value: 'Payment Entry', label: 'سند صرف' },
  { value: 'Journal Entry', label: 'قيد يومية' },
  { value: 'Debit Note', label: 'إشعار مدين' },
];

function getTransactionTypeLabel(voucherType: string): string {
  switch (voucherType) {
    case 'Purchase Invoice': return 'فاتورة مشتريات';
    case 'Payment Entry': return 'سند صرف';
    case 'Journal Entry': return 'قيد يومية';
    case 'Sales Invoice': return 'فاتورة مبيعات';
    default:
      if (voucherType.includes('Debit Note') || voucherType.includes('Return')) return 'إشعار مدين';
      return voucherType;
  }
}

function getTransactionTypeBadgeColor(voucherType: string): string {
  switch (voucherType) {
    case 'Purchase Invoice': return 'bg-chart-2/10 text-chart-2';
    case 'Payment Entry': return 'bg-primary/10 text-primary';
    case 'Journal Entry': return 'bg-chart-1/10 text-chart-1';
    default:
      if (voucherType.includes('Debit Note') || voucherType.includes('Return'))
        return 'bg-chart-4/10 text-chart-4';
      return 'bg-muted text-muted-foreground';
  }
}

/** حساب أعمار الذمم — من منظور المورد (الدائن) */
interface AgingBucket {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  daysAbove90: number;
}

function calculateAging(glEntries: GLEntry[], asOfDate: string): AgingBucket {
  const asOf = new Date(asOfDate);
  const bucket: AgingBucket = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, daysAbove90: 0 };

  for (const entry of glEntries) {
    // For suppliers: credit means we owe them (outstanding)
    const outstanding = (entry.credit || 0) - (entry.debit || 0);
    if (outstanding <= 0) continue;

    const postingDate = new Date(entry.posting_date);
    const diffMs = asOf.getTime() - postingDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      bucket.current += outstanding;
    } else if (diffDays <= 30) {
      bucket.days1to30 += outstanding;
    } else if (diffDays <= 60) {
      bucket.days31to60 += outstanding;
    } else if (diffDays <= 90) {
      bucket.days61to90 += outstanding;
    } else {
      bucket.daysAbove90 += outstanding;
    }
  }

  return bucket;
}

// ============================================================
// Main Component
// ============================================================

export default function SupplierAccountStatementPage() {
  // --- State ---
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
  });
  const [transactionFilter, setTransactionFilter] = useState<TransactionType>('all');
  const [footerText, setFooterText] = useState('توقيع المورد: ........................');
  const [showAging, setShowAging] = useState(true);
  const [glEntries, setGlEntries] = useState<GLEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [supplierAccount, setSupplierAccount] = useState('');
  const [entriesError, setEntriesError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  // --- Fetch GL Entries ---
  const fetchGlEntries = useCallback(async () => {
    if (!selectedSupplier) {
      toast.error('يرجى اختيار المورد أولاً');
      return;
    }

    setLoadingEntries(true);
    setEntriesError('');

    try {
      // Fetch GL Entries for this supplier as party
      const filters: string[][] = [
        ['party_type', '=', 'Supplier'],
        ['party', '=', selectedSupplier],
        ['is_cancelled', '=', '0'],
      ];

      if (dateRange.from) {
        filters.push(['posting_date', '>=', dateRange.from]);
      }
      if (dateRange.to) {
        filters.push(['posting_date', '<=', dateRange.to]);
      }

      const entries = await apiGetList<GLEntry>('GL Entry', {
        fields: [
          'name', 'posting_date', 'account', 'party_type', 'party',
          'voucher_type', 'voucher_no', 'debit', 'credit',
          'against', 'remarks', 'against_voucher', 'is_cancelled',
          'fiscal_year', 'company',
        ],
        filters,
        order_by: 'posting_date asc, name asc',
        limit: 5000,
      });

      setGlEntries(entries);
      if (entries.length > 0) {
        setSupplierAccount(entries[0].account);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل بيانات كشف الحساب';
      setEntriesError(msg);
      toast.error(msg);
    } finally {
      setLoadingEntries(false);
    }
  }, [selectedSupplier, dateRange.from, dateRange.to]);

  // --- Filtered entries by transaction type ---
  const filteredEntries = useMemo(() => {
    if (transactionFilter === 'all') return glEntries;

    if (transactionFilter === 'Debit Note') {
      return glEntries.filter(
        (e) => e.voucher_type.includes('Debit Note') || e.voucher_type.includes('Return')
      );
    }

    return glEntries.filter((e) => e.voucher_type === transactionFilter);
  }, [glEntries, transactionFilter]);

  // --- Compute running balance ---
  // For suppliers: credit = we owe them (positive balance), debit = we pay them (reduces balance)
  const statementRows = useMemo(() => {
    let runningBalance = 0;
    return filteredEntries.map((entry) => {
      // From supplier perspective: credit increases what we owe, debit decreases
      runningBalance += (entry.credit || 0) - (entry.debit || 0);
      return { ...entry, running_balance: runningBalance };
    });
  }, [filteredEntries]);

  // --- Beginning balance ---
  const beginningBalance = useMemo(() => {
    if (!selectedSupplier || !dateRange.from) return 0;
    const totalBalance = statementRows.length > 0
      ? statementRows[statementRows.length - 1].running_balance
      : 0;
    const inPeriodSum = statementRows.reduce(
      (acc, e) => acc + (e.credit || 0) - (e.debit || 0), 0
    );
    return totalBalance - inPeriodSum;
  }, [statementRows, selectedSupplier, dateRange.from]);

  // --- Ending balance ---
  const endingBalance = useMemo(() => {
    if (statementRows.length === 0) return beginningBalance;
    return statementRows[statementRows.length - 1].running_balance;
  }, [statementRows, beginningBalance]);

  // --- Summary ---
  const summary = useMemo(() => {
    const totalPurchases = statementRows.reduce((sum, e) => sum + (e.credit || 0), 0);
    const totalPayments = statementRows.reduce((sum, e) => sum + (e.debit || 0), 0);
    const outstandingBalance = totalPurchases - totalPayments;

    // Overdue: credit entries (purchases) older than 30 days not yet paid
    const today = new Date();
    const overdueAmount = statementRows.reduce((sum, e) => {
      if (e.credit > 0) {
        const postingDate = new Date(e.posting_date);
        const diffDays = Math.floor((today.getTime() - postingDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) return sum + e.credit;
      }
      return sum;
    }, 0);

    return { totalPurchases, totalPayments, outstandingBalance, overdueAmount };
  }, [statementRows]);

  // --- Aging ---
  const aging = useMemo(() => {
    if (!dateRange.to) return { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, daysAbove90: 0 };
    return calculateAging(filteredEntries, dateRange.to);
  }, [filteredEntries, dateRange.to]);

  const agingTotal = aging.current + aging.days1to30 + aging.days31to60 + aging.days61to90 + aging.daysAbove90;

  // --- Supplier info ---
  const [supplierDoc, setSupplierDoc] = useState<SupplierRecord | null>(null);

  const fetchSupplierInfo = useCallback(async () => {
    if (!selectedSupplier) {
      setSupplierDoc(null);
      return;
    }
    try {
      const data = await apiGetList<SupplierRecord>('Supplier', {
        fields: ['name', 'supplier_name', 'supplier_group', 'default_currency', 'email_id', 'mobile_no', 'country'],
        filters: [['name', '=', selectedSupplier]],
        limit: 1,
      });
      setSupplierDoc(data[0] || null);
    } catch {
      setSupplierDoc(null);
    }
  }, [selectedSupplier]);

  // Fetch supplier info when selection changes
  useMemo(() => {
    void fetchSupplierInfo();
  }, [fetchSupplierInfo]);

  // --- Reset ---
  const resetFilters = useCallback(() => {
    setSelectedSupplier('');
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    setDateRange({ from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) });
    setTransactionFilter('all');
    setGlEntries([]);
    setSupplierAccount('');
    setEntriesError('');
    setSupplierDoc(null);
  }, []);

  // --- Print ---
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // --- Email ---
  const handleEmail = useCallback(() => {
    const email = supplierDoc?.email_id;
    if (!email) {
      toast.error('لا يوجد بريد إلكتروني مسجل لهذا المورد');
      return;
    }
    const subject = encodeURIComponent(`كشف حساب مورد - ${supplierDoc?.supplier_name || selectedSupplier}`);
    const body = encodeURIComponent(
      `السلام عليكم،\n\nمرفق كشف حسابكم كمورد بتاريخ ${dateRange.from} إلى ${dateRange.to}.\n\nالرصيد المستحق: ${formatCurrency(endingBalance, 'YER')}\n\nمع تحياتنا`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    toast.success('تم فتح برنامج البريد لإرسال كشف الحساب');
  }, [supplierDoc, selectedSupplier, dateRange.from, dateRange.to, endingBalance]);

  // --- Export data ---
  const exportColumns = [
    { key: 'posting_date', header: 'التاريخ' },
    { key: 'voucher_type_ar', header: 'نوع المعاملة' },
    { key: 'voucher_no', header: 'المرجع' },
    { key: 'debit', header: 'مدين (مدفوعات)' },
    { key: 'credit', header: 'دائن (مشتريات)' },
    { key: 'running_balance', header: 'الرصيد التراكمي' },
    { key: 'remarks', header: 'البيان' },
  ];

  const exportData = statementRows.map((row) => ({
    posting_date: row.posting_date,
    voucher_type_ar: getTransactionTypeLabel(row.voucher_type),
    voucher_no: row.voucher_no,
    debit: row.debit || 0,
    credit: row.credit || 0,
    running_balance: row.running_balance,
    remarks: row.remarks || '',
  }));

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="كشف حساب المورد"
        description="عرض تفصيلي لمعاملات المورد المالية مع أرصدة تراكمية وتوزيع أعمار الذمم المستحقة."
        iconify="solar:document-text-bold-duotone"
        accent="warning"
        breadcrumbs={[
          { label: 'المشتريات', href: '/purchases' },
          { label: 'كشف حساب المورد' },
        ]}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handlePrint}
              disabled={statementRows.length === 0}
            >
              <Printer className="h-3.5 w-3.5" />
              طباعة
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleEmail}
              disabled={!selectedSupplier}
            >
              <Mail className="h-3.5 w-3.5" />
              إرسال بالبريد
            </Button>
            {statementRows.length > 0 && (
              <ExportButton
                data={exportData}
                filename={`كشف حساب مورد ${supplierDoc?.supplier_name || selectedSupplier}`}
                columns={exportColumns}
              />
            )}
          </div>
        }
      />

      {/* ===== KPI Strip ===== */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي المشتريات"
          value={formatCurrency(summary.totalPurchases, 'YER')}
          icon={ShoppingBag}
          accent="warning"
          compact
        />
        <KpiCard
          title="إجمالي المدفوعات"
          value={formatCurrency(summary.totalPayments, 'YER')}
          icon={Wallet}
          accent="success"
          compact
        />
        <KpiCard
          title="الرصيد المستحق"
          value={formatCurrency(summary.outstandingBalance, 'YER')}
          icon={Calculator}
          accent="primary"
          compact
        />
        <KpiCard
          title="المبالغ المتأخرة"
          value={formatCurrency(summary.overdueAmount, 'YER')}
          icon={AlertTriangle}
          accent="destructive"
          compact
        />
      </KpiStrip>

      {/* ===== Filter Card ===== */}
      <Card className="border-border/40 print:hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">معايير كشف الحساب</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] gap-1"
                onClick={resetFilters}
              >
                <RotateCcw className="h-3 w-3" />
                إعادة تعيين
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Supplier Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Truck className="h-3.5 w-3.5" />
                المورد
              </Label>
              <ErpLinkCombobox
                doctype="Supplier"
                value={selectedSupplier}
                onChange={setSelectedSupplier}
                placeholder="اختر المورد..."
                displayKey="supplier_name"
                showCreateShortcut={false}
              />
            </div>

            {/* Date Range */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                الفترة
              </Label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="اختر الفترة"
              />
            </div>

            {/* Transaction Type Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" />
                نوع المعاملة
              </Label>
              <Select
                value={transactionFilter}
                onValueChange={(v) => setTransactionFilter(v as TransactionType)}
              >
                <SelectTrigger className="h-9 w-full border-border/40 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Load Button */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">&nbsp;</Label>
              <Button
                className="h-9 w-full gap-1.5"
                onClick={fetchGlEntries}
                disabled={!selectedSupplier || loadingEntries}
              >
                {loadingEntries ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {loadingEntries ? 'جاري التحميل...' : 'عرض كشف الحساب'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== Supplier Info Banner ===== */}
      {selectedSupplier && supplierDoc && (
        <Card className="border-border/40 bg-muted/20 print:shadow-none">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{supplierDoc.supplier_name}</span>
                <Badge variant="outline" className="text-[10px]">{selectedSupplier}</Badge>
              </div>
              {supplierAccount && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calculator className="h-3.5 w-3.5" />
                  <span className="text-xs">الحساب: {supplierAccount}</span>
                </div>
              )}
              {supplierDoc.email_id && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="text-xs">{supplierDoc.email_id}</span>
                </div>
              )}
              {supplierDoc.mobile_no && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span className="text-xs">📱 {supplierDoc.mobile_no}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                <span className="text-xs">
                  من {dateRange.from || '—'} إلى {dateRange.to || '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Loading / Error / Empty States ===== */}
      {loadingEntries && (
        <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">جاري تحميل كشف حساب المورد...</span>
        </div>
      )}

      {entriesError && !loadingEntries && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-center text-destructive text-sm">
            {entriesError}
          </CardContent>
        </Card>
      )}

      {!loadingEntries && !entriesError && !selectedSupplier && (
        <EmptyState
          title="اختر المورد"
          description="اختر المورد والفترة الزمنية لعرض كشف الحساب."
        />
      )}

      {!loadingEntries && !entriesError && selectedSupplier && glEntries.length === 0 && (
        <EmptyState
          title="لا توجد معاملات"
          description="لا توجد معاملات مالية لهذا المورد ضمن الفترة المحددة."
        />
      )}

      {/* ===== Statement Table ===== */}
      {statementRows.length > 0 && !loadingEntries && (
        <div ref={printRef}>
          {/* Print Header */}
          <div className="hidden print:block print:mb-6">
            <h1 className="text-xl font-bold text-center mb-2">كشف حساب مورد</h1>
            <div className="flex justify-between text-sm">
              <span>المورد: {supplierDoc?.supplier_name || selectedSupplier}</span>
              <span>الفترة: {dateRange.from} إلى {dateRange.to}</span>
            </div>
            {supplierAccount && (
              <div className="text-sm text-muted-foreground">الحساب: {supplierAccount}</div>
            )}
          </div>

          <Card className="border-border/40 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                تفاصيل المعاملات
                <Badge variant="secondary" className="text-[10px]">
                  {statementRows.length} معاملة
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-muted/90 backdrop-blur">
                    <TableRow className="hover:bg-muted/60 border-b border-border/40">
                      <TableHead className="text-xs font-semibold w-12">#</TableHead>
                      <TableHead className="text-xs font-semibold">التاريخ</TableHead>
                      <TableHead className="text-xs font-semibold">النوع</TableHead>
                      <TableHead className="text-xs font-semibold">المرجع</TableHead>
                      <TableHead className="text-xs font-semibold">البيان</TableHead>
                      <TableHead className="text-xs font-semibold text-start" dir="ltr">مدين (مدفوعات)</TableHead>
                      <TableHead className="text-xs font-semibold text-start" dir="ltr">دائن (مشتريات)</TableHead>
                      <TableHead className="text-xs font-semibold text-start" dir="ltr">الرصيد التراكمي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Beginning Balance Row */}
                    <TableRow className="bg-muted/20 font-medium">
                      <TableCell colSpan={5} className="text-xs font-semibold py-2.5">
                        رصيد افتتاحي (قبل {dateRange.from || '—'})
                      </TableCell>
                      <TableCell className="text-xs py-2.5 tabular-nums" dir="ltr">
                        {beginningBalance < 0 ? formatCurrency(Math.abs(beginningBalance), 'YER') : '—'}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 tabular-nums" dir="ltr">
                        {beginningBalance > 0 ? formatCurrency(beginningBalance, 'YER') : '—'}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 tabular-nums font-semibold" dir="ltr">
                        <span className={cn(
                          beginningBalance > 0 && 'text-red-600 dark:text-red-400',
                          beginningBalance < 0 && 'text-emerald-600 dark:text-emerald-400',
                        )}>
                          {formatCurrency(beginningBalance, 'YER')}
                        </span>
                      </TableCell>
                    </TableRow>

                    {/* Transaction Rows */}
                    {statementRows.map((entry, index) => (
                      <TableRow
                        key={entry.name || index}
                        className="group border-b border-border/20 transition-colors hover:bg-primary/5"
                      >
                        <TableCell className="text-[11px] text-muted-foreground py-2">
                          {index + 1}
                        </TableCell>
                        <TableCell className="text-xs py-2" dir="ltr">
                          {formatDate(entry.posting_date)}
                        </TableCell>
                        <TableCell className="text-xs py-2">
                          <span className={cn(
                            'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                            getTransactionTypeBadgeColor(entry.voucher_type)
                          )}>
                            {getTransactionTypeLabel(entry.voucher_type)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs py-2 font-mono" dir="ltr">
                          {entry.voucher_no}
                        </TableCell>
                        <TableCell className="text-xs py-2 text-muted-foreground max-w-[200px] truncate">
                          {entry.remarks || entry.against || '—'}
                        </TableCell>
                        <TableCell className="text-xs py-2 tabular-nums" dir="ltr">
                          {entry.debit > 0 ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {formatCurrency(entry.debit, 'YER')}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-xs py-2 tabular-nums" dir="ltr">
                          {entry.credit > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {formatCurrency(entry.credit, 'YER')}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-xs py-2 tabular-nums font-semibold" dir="ltr">
                          <span className={cn(
                            entry.running_balance > 0 && 'text-red-600 dark:text-red-400',
                            entry.running_balance < 0 && 'text-emerald-600 dark:text-emerald-400',
                            entry.running_balance === 0 && 'text-muted-foreground',
                          )}>
                            {formatCurrency(entry.running_balance, 'YER')}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Ending Balance Row */}
                    <TableRow className="bg-muted/30 font-bold border-t-2 border-border/60">
                      <TableCell colSpan={5} className="text-xs py-2.5 font-bold">
                        رصيد ختامي
                      </TableCell>
                      <TableCell className="text-xs py-2.5 tabular-nums font-bold text-red-600 dark:text-red-400" dir="ltr">
                        {formatCurrency(summary.totalPayments, 'YER')}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 tabular-nums font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">
                        {formatCurrency(summary.totalPurchases, 'YER')}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 tabular-nums font-bold" dir="ltr">
                        <span className={cn(
                          endingBalance > 0 && 'text-red-600 dark:text-red-400',
                          endingBalance < 0 && 'text-emerald-600 dark:text-emerald-400',
                        )}>
                          {formatCurrency(endingBalance, 'YER')}
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* ===== Summary Section ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* Summary Card */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  ملخص كشف الحساب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border/20">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    إجمالي المشتريات
                  </span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400" dir="ltr">
                    {formatCurrency(summary.totalPurchases, 'YER')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/20">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5" />
                    إجمالي المدفوعات
                  </span>
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400" dir="ltr">
                    {formatCurrency(summary.totalPayments, 'YER')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/20">
                  <span className="text-sm text-muted-foreground">الرصيد المستحق للمورد</span>
                  <span className={cn(
                    'text-sm font-bold',
                    summary.outstandingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                  )} dir="ltr">
                    {formatCurrency(summary.outstandingBalance, 'YER')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    المبالغ المتأخرة ({'>'} 30 يوم)
                  </span>
                  <span className="text-sm font-semibold text-orange-600 dark:text-orange-400" dir="ltr">
                    {formatCurrency(summary.overdueAmount, 'YER')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Aging Breakdown Card */}
            {showAging && (
              <Card className="border-border/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      توزيع أعمار الذمم
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px]" dir="ltr">
                      إجمالي: {formatCurrency(agingTotal, 'YER')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Aging Bar */}
                  <div className="flex h-8 rounded-lg overflow-hidden bg-muted/30">
                    {(() => {
                      if (agingTotal === 0) return <div className="w-full bg-muted/20 flex items-center justify-center text-[10px] text-muted-foreground">لا توجد ذمم مستحقة</div>;
                      const segments = [
                        { value: aging.current, color: 'bg-chart-3/80', label: 'حالي' },
                        { value: aging.days1to30, color: 'bg-chart-1/80', label: '1-30 يوم' },
                        { value: aging.days31to60, color: 'bg-chart-2/80', label: '31-60 يوم' },
                        { value: aging.days61to90, color: 'bg-chart-4/80', label: '61-90 يوم' },
                        { value: aging.daysAbove90, color: 'bg-destructive/80', label: '+90 يوم' },
                      ];
                      return segments.map((seg) => {
                        const pct = (seg.value / agingTotal) * 100;
                        if (pct < 0.5) return null;
                        return (
                          <div
                            key={seg.label}
                            className={cn('flex items-center justify-center text-[9px] font-medium text-white transition-all', seg.color)}
                            style={{ width: `${pct}%` }}
                            title={`${seg.label}: ${formatCurrency(seg.value, 'YER')} (${pct.toFixed(1)}%)`}
                          >
                            {pct > 8 ? `${pct.toFixed(0)}%` : ''}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Aging Detail Rows */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-xs flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-chart-3/80" />
                        حالي
                      </span>
                      <span className="text-xs font-medium tabular-nums" dir="ltr">
                        {formatCurrency(aging.current, 'YER')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-xs flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-chart-1/80" />
                        1 - 30 يوم
                      </span>
                      <span className="text-xs font-medium tabular-nums" dir="ltr">
                        {formatCurrency(aging.days1to30, 'YER')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-xs flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-chart-2/80" />
                        31 - 60 يوم
                      </span>
                      <span className="text-xs font-medium tabular-nums" dir="ltr">
                        {formatCurrency(aging.days31to60, 'YER')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-xs flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-chart-4/80" />
                        61 - 90 يوم
                      </span>
                      <span className="text-xs font-medium tabular-nums" dir="ltr">
                        {formatCurrency(aging.days61to90, 'YER')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-xs flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
                        أكثر من 90 يوم
                      </span>
                      <span className="text-xs font-medium tabular-nums text-red-600 dark:text-red-400" dir="ltr">
                        {formatCurrency(aging.daysAbove90, 'YER')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ===== Custom Footer Section ===== */}
          <Card className="border-border/40 mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Signature className="h-4 w-4" />
                التذييل والتوقيع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">توقيع المورد</Label>
                  <div className="border-b-2 border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
                    توقيع المورد: ........................
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">توقيع الشركة</Label>
                  <div className="border-b-2 border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
                    توقيع المفوض: ........................
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 print:hidden">
                <Label className="text-xs text-muted-foreground">نص تذييل مخصص</Label>
                <Textarea
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="أدخل نص التذييل المخصص..."
                  className="h-16 text-xs resize-none"
                />
              </div>
              <div className="text-xs text-muted-foreground border-t border-border/20 pt-2">
                {footerText}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: hsl(var(--border) / 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: hsl(var(--border) / 0.8);
        }
      `}</style>
    </div>
  );
}
