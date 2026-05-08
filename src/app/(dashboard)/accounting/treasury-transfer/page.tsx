'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { ErpListDateStatusFilters } from '@/components/erp/erp-list-date-status-filters';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import { useDocList, useCreateDoc } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { translateAccountName } from '@/lib/core/arabic-labels';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeftRight, ArrowRightLeft, Send, Wallet, Banknote } from 'lucide-react';
import Link from 'next/link';

type TransferRow = {
  name: string;
  posting_date: string;
  total_debit: number;
  total_credit: number;
  user_remark: string;
  docstatus: number;
  voucher_type: string;
};

const CASH_FILTER = [['account_type', '=', 'Cash'], ['is_group', '=', '0']] as string[][];

export default function TreasuryTransferPage() {
  const { toast } = useToast();
  const { company: defaultCompany } = useDefaultCompanyName();
  const createJournalEntry = useCreateDoc('Journal Entry');

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Form state
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [transferDate, setTransferDate] = useState(today);
  const [reference, setReference] = useState('');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  // Filter state for history table
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch treasury transfer Journal Entries
  const { data: transfers = [], isLoading, isError, error, refetch } = useDocList<TransferRow>('Journal Entry', {
    fields: ['name', 'posting_date', 'total_debit', 'total_credit', 'user_remark', 'docstatus', 'voucher_type'],
    filters: [['voucher_type', '=', 'Journal Entry']],
    order_by: 'posting_date desc',
    limit: 200,
  });

  // Filter transfers by date and status
  const filteredTransfers = useMemo(() => {
    let list = transfers;
    if (dateFrom || dateTo) {
      list = list.filter(t => rowInDateRangeISO(t.posting_date, dateFrom, dateTo));
    }
    if (statusFilter !== 'all') {
      list = list.filter(t => String(t.docstatus) === statusFilter);
    }
    return list;
  }, [transfers, dateFrom, dateTo, statusFilter]);

  // KPI calculations
  const totalTransferred = useMemo(
    () => filteredTransfers.filter(t => t.docstatus === 1).reduce((s, t) => s + (Number(t.total_debit) || 0), 0),
    [filteredTransfers]
  );
  const pendingCount = useMemo(
    () => filteredTransfers.filter(t => t.docstatus === 0).length,
    [filteredTransfers]
  );
  const submittedCount = useMemo(
    () => filteredTransfers.filter(t => t.docstatus === 1).length,
    [filteredTransfers]
  );

  // Handle transfer creation
  const handleTransfer = useCallback(async () => {
    if (!fromAccount || !toAccount || !amount) {
      toast({ title: 'يرجى تعبئة جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    if (fromAccount === toAccount) {
      toast({ title: 'لا يمكن التحويل من وإلى نفس الخزينة', variant: 'destructive' });
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'المبلغ غير صالح', variant: 'destructive' });
      return;
    }
    if (!defaultCompany) {
      toast({ title: 'يجب ضبط الشركة الافتراضية أولاً', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await createJournalEntry.mutateAsync({
        doctype: 'Journal Entry',
        voucher_type: 'Journal Entry',
        posting_date: transferDate,
        company: defaultCompany,
        user_remark: remarks || `تحويل بين الخزائن: ${translateAccountName(fromAccount)} ← ${translateAccountName(toAccount)}`,
        cheque_no: reference || undefined,
        accounts: [
          { account: fromAccount, debit_in_account_currency: 0, credit_in_account_currency: amt },
          { account: toAccount, debit_in_account_currency: amt, credit_in_account_currency: 0 },
        ],
      });
      toast({ title: 'تم إنشاء تحويل الخزينة بنجاح' });
      setFromAccount('');
      setToAccount('');
      setAmount('');
      setRemarks('');
      setReference('');
      setTransferDate(today);
      void refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'فشل إنشاء التحويل', description: msg, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }, [fromAccount, toAccount, amount, remarks, reference, transferDate, defaultCompany, createJournalEntry, refetch, toast, today]);

  // History table columns
  const columns: Column<TransferRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'رقم القيد',
        sortable: true,
        filterable: true,
        render: (v) => (
          <Link href={`/doc/journal-entry/${encodeURIComponent(String(v))}`} className="font-medium text-primary hover:underline">
            {String(v)}
          </Link>
        ),
      },
      { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => v ? formatDate(String(v)) : '\u2014' },
      {
        key: 'total_debit',
        header: 'المبلغ',
        sortable: true,
        render: (v) => <span className="font-semibold text-blue-600 tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span>,
      },
      { key: 'user_remark', header: 'البيان', filterable: true, render: (v) => String(v || '\u2014') },
      {
        key: 'docstatus',
        header: 'الحالة',
        render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} />,
      },
      {
        key: 'actions',
        header: 'إجراءات',
        render: (_v, row) => (
          <Link
            href={`/doc/journal-entry/${encodeURIComponent(row.name)}`}
            className="text-xs text-primary hover:underline"
          >
            عرض التفاصيل
          </Link>
        ),
      },
    ],
    []
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="التحويل بين الخزائن"
        description="تحويل الأموال بين الخزائن بإنشاء قيد يومية تلقائي — من خزينة المصدر إلى خزينة الهدف"
        iconify="solar:transfer-horizontal-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'التحويل بين الخزائن' }]}
      />

      <>
        </>

      {/* Transfer Form */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            إنشاء تحويل جديد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">خزينة المصدر <span className="text-destructive">*</span></Label>
              <ErpLinkCombobox
                doctype="Account"
                value={fromAccount}
                onChange={setFromAccount}
                placeholder="اختر الخزينة المصدر"
                displayKey="account_name"
                filters={CASH_FILTER}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">خزينة الهدف <span className="text-destructive">*</span></Label>
              <ErpLinkCombobox
                doctype="Account"
                value={toAccount}
                onChange={setToAccount}
                placeholder="اختر الخزينة الهدف"
                displayKey="account_name"
                filters={CASH_FILTER}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">المبلغ (ر.ي) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                dir="ltr"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">التاريخ</Label>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                dir="ltr"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">المرجع</Label>
              <Input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="رقم مرجعي اختياري"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">ملاحظات</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="سبب التحويل..."
                rows={1}
                className="min-h-[36px]"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleTransfer} disabled={busy} className="gap-1.5 min-w-[140px]">
              <Send className="h-3.5 w-3.5" />
              {busy ? 'جارٍ التحويل...' : 'تحويل'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transfer History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            سجل التحويلات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ErpListDateStatusFilters
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            statusValue={statusFilter}
            onStatusChange={setStatusFilter}
            statusTabs={[
              { value: 'all', label: `الكل (${transfers.length})` },
              { value: '0', label: 'مسودات' },
              { value: '1', label: 'مقدمة' },
              { value: '2', label: 'ملغاة' },
            ]}
          />
          <DataTable
            data={filteredTransfers}
            columns={columns}
            searchable
            loading={isLoading}
            pageSize={10}
            tableId="accounting-treasury-transfer"
            exportFileName="treasury-transfers.csv"
            printTitle="التحويل بين الخزائن"
          />
        </CardContent>
      </Card>
    </div>
  );
}
