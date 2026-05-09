'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { useDocList, useCreateDoc } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { useAccountBalances } from '@/lib/erp/use-account-balances';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { translateAccountName } from '@/lib/core/arabic-labels';
import { toast } from 'sonner';
import { Lock, Wallet, CheckCircle2, AlertTriangle, ArrowUpLeft, ArrowDownLeft, Scale, DoorOpen } from 'lucide-react';
import Link from 'next/link';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';

type VaultRow = {
  name: string;
  account_name: string;
  is_group?: number | boolean;
  balance?: number;
};

type PaymentRow = {
  name: string;
  payment_type: string;
  posting_date: string;
  paid_amount: number;
  party_type?: string;
  party?: string;
  mode_of_payment?: string;
  docstatus: number;
};

export default function TreasuryClosingPage() {
  const { company: defaultCompany } = useDefaultCompanyName();
  const createJournalEntry = useCreateDoc('Journal Entry');

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [closingBusy, setClosingBusy] = useState(false);

  // Fetch treasury/vault accounts
  const { data: vaultAccounts = [], isLoading: vaultsLoading } = useDocList<VaultRow>('Account', {
    fields: ['name', 'account_name', 'is_group'],
    filters: [['account_type', '=', 'Cash']],
    limit: 200,
  });

  // Fetch account balances
  const vaultNames = useMemo(() => vaultAccounts.filter(v => !v.is_group).map(v => v.name), [vaultAccounts]);
  const balanceResults = useAccountBalances(
    vaultNames,
    defaultCompany || '',
    selectedDate,
    Boolean(defaultCompany && vaultNames.length > 0)
  );
  const balanceMap = useMemo(() => {
    const m: Record<string, number> = {};
    vaultNames.forEach((name, i) => {
      const d = balanceResults[i]?.data;
      if (typeof d === 'number' && !Number.isNaN(d)) m[name] = d;
    });
    return m;
  }, [vaultNames, balanceResults]);

  // Fetch Payment Entries for selected date
  const { data: dayPayments = [], isLoading: paymentsLoading, isError, error, refetch } = useDocList<PaymentRow>('Payment Entry', {
    fields: ['name', 'payment_type', 'posting_date', 'paid_amount', 'party_type', 'party', 'mode_of_payment', 'docstatus'],
    filters: [['posting_date', '=', selectedDate]],
    order_by: 'creation desc',
    limit: 200,
  });

  // Calculate totals
  const totalReceipts = useMemo(
    () => dayPayments.filter(p => p.payment_type === 'Receive').reduce((s, p) => s + (Number(p.paid_amount) || 0), 0),
    [dayPayments]
  );
  const totalPayments = useMemo(
    () => dayPayments.filter(p => p.payment_type === 'Pay').reduce((s, p) => s + (Number(p.paid_amount) || 0), 0),
    [dayPayments]
  );
  const totalBalance = useMemo(
    () => vaultNames.reduce((s, name) => s + (balanceMap[name] || 0), 0),
    [vaultNames, balanceMap]
  );
  const openingBalance = useMemo(
    () => totalBalance - totalReceipts + totalPayments,
    [totalBalance, totalReceipts, totalPayments]
  );

  // Treasury balance table data
  const treasuryBalanceData = useMemo(() => {
    return vaultAccounts.filter(v => !v.is_group).map(vault => ({
      name: vault.name,
      account_name: translateAccountName(vault.account_name || vault.name),
      balance: balanceMap[vault.name] || 0,
      receipts: dayPayments
        .filter(p => p.payment_type === 'Receive')
        .reduce((s, p) => s + (Number(p.paid_amount) || 0), 0),
      payments: dayPayments
        .filter(p => p.payment_type === 'Pay')
        .reduce((s, p) => s + (Number(p.paid_amount) || 0), 0),
    }));
  }, [vaultAccounts, balanceMap, dayPayments]);

  // Close treasury handler
  const handleCloseTreasury = useCallback(async () => {
    if (!defaultCompany) {
      toast.error('يجب ضبط الشركة الافتراضية أولاً');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من إغلاق الخزينة ليوم ${formatDate(selectedDate)}؟`)) return;
    setClosingBusy(true);
    try {
      await createJournalEntry.mutateAsync({
        doctype: 'Journal Entry',
        voucher_type: 'Journal Entry',
        posting_date: selectedDate,
        company: defaultCompany,
        user_remark: `إغلاق الخزينة ليوم ${formatDate(selectedDate)}`,
        accounts: vaultNames.map(name => ({
          account: name,
          debit_in_account_currency: 0,
          credit_in_account_currency: Math.max(0, balanceMap[name] || 0),
        })).filter((entry: { credit_in_account_currency: number }) => entry.credit_in_account_currency > 0),
      });
      toast.success('تم إغلاق الخزينة بنجاح');
      void refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('فشل إغلاق الخزينة', { description: msg });
    } finally {
      setClosingBusy(false);
    }
  }, [defaultCompany, selectedDate, vaultNames, balanceMap, createJournalEntry, refetch, toast]);

  // Payment columns
  const paymentColumns: Column<PaymentRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'رقم',
        sortable: true,
        filterable: true,
        render: (v) => {
          const href = docDetailPath('Payment Entry', String(v));
          return href ? <Link href={href} className="font-medium text-primary hover:underline">{String(v)}</Link> : <span>{String(v)}</span>;
        },
      },
      {
        key: 'payment_type',
        header: 'النوع',
        filterable: true,
        render: (v) => {
          const typeMap: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
            'Receive': { label: 'قبض', variant: 'default' },
            'Pay': { label: 'صرف', variant: 'destructive' },
            'Internal Transfer': { label: 'تحويل', variant: 'secondary' },
          };
          const info = typeMap[String(v)] || { label: String(v), variant: 'outline' as const };
          return <Badge variant={info.variant}>{info.label}</Badge>;
        },
      },
      {
        key: 'paid_amount',
        header: 'المبلغ',
        sortable: true,
        render: (v) => <span className="font-semibold tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span>,
      },
      { key: 'party', header: 'الطرف', filterable: true, render: (v) => String(v || '\u2014') },
      { key: 'mode_of_payment', header: 'طريقة الدفع', filterable: true, render: (v) => String(v || '\u2014') },
      { key: 'docstatus', header: 'الحالة', render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} /> },
    ],
    []
  );

  // Treasury balance columns
  const treasuryBalanceCols: Column<{ name: string; account_name: string; balance: number; receipts: number; payments: number }>[] = useMemo(
    () => [
      { key: 'account_name', header: 'الخزينة', filterable: true },
      {
        key: 'balance',
        header: 'رصيد الافتتاح',
        sortable: true,
        render: (v) => <span className="font-semibold tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span>,
      },
      {
        key: 'receipts',
        header: 'القبض اليوم',
        sortable: true,
        render: (v) => <span className="font-semibold text-emerald-600 tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span>,
      },
      {
        key: 'payments',
        header: 'الصرف اليوم',
        sortable: true,
        render: (v) => <span className="font-semibold text-destructive tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span>,
      },
      {
        key: 'closing',
        header: 'رصيد الإغلاق',
        sortable: true,
        render: (_v, row) => (
          <span className="font-bold tabular-nums" dir="ltr">
            {formatCurrency((Number(row.balance) || 0) + (Number(row.receipts) || 0) - (Number(row.payments) || 0))}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="الإغلاق اليومي للخزنة"
        description={`ملخص حركات الخزائن والنقدية ليوم ${formatDate(selectedDate)}`}
        iconify="solar:lock-keyhole-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'الإغلاق اليومي' }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">التاريخ</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                dir="ltr"
                className="h-9 w-[150px] text-xs"
              />
            </div>
            <Button
              onClick={handleCloseTreasury}
              disabled={closingBusy}
              className="gap-1.5"
              variant="default"
            >
              <Lock className="h-3.5 w-3.5" />
              {closingBusy ? 'جارٍ الإغلاق...' : 'إغلاق الخزينة'}
            </Button>
          </div>
        }
      />

      <KpiStrip>
        <KpiCard title="رصيد الافتتاح" value={formatCurrency(openingBalance)} icon={DoorOpen} accent="primary" />
        <KpiCard title="إجمالي القبض" value={formatCurrency(totalReceipts)} icon={ArrowUpLeft} accent="success" />
        <KpiCard title="إجمالي الصرف" value={formatCurrency(totalPayments)} icon={ArrowDownLeft} accent="destructive" />
        <KpiCard title="رصيد الإغلاق" value={formatCurrency(totalBalance)} icon={Scale} accent={totalBalance >= 0 ? 'info' : 'destructive'} />
      </KpiStrip>

      {/* Treasury Balance Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            أرصدة الخزائن
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={treasuryBalanceData}
            columns={treasuryBalanceCols}
            loading={vaultsLoading}
            pageSize={15}
            tableId="accounting-treasury-closing-balances"
            exportFileName="treasury-closing-balances.csv"
            printTitle={`أرصدة الخزائن - ${formatDate(selectedDate)}`}
          />
        </CardContent>
      </Card>

      {/* Today's Payment Entries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            سندات اليوم ({dayPayments.length} سند)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={dayPayments}
            columns={paymentColumns}
            searchable
            loading={paymentsLoading}
            pageSize={15}
            tableId="accounting-treasury-closing-payments"
            exportFileName="treasury-closing-payments.csv"
            printTitle={`سندات اليوم - ${formatDate(selectedDate)}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
