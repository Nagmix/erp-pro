'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { ErpListDateStatusFilters } from '@/components/erp/erp-list-date-status-filters';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import { useDocList } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { translateAccountName } from '@/lib/core/arabic-labels';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, ArrowUpLeft, ArrowDownLeft, FileText, Landmark, Receipt, Scale } from 'lucide-react';
import Link from 'next/link';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';

type GLRow = {
  name: string;
  posting_date: string;
  account: string;
  debit: number;
  credit: number;
  against: string;
  voucher_type: string;
  voucher_no: string;
  remarks?: string;
};

type JournalRow = {
  name: string;
  posting_date: string;
  voucher_type: string;
  total_debit: number;
  total_credit: number;
  user_remark?: string;
  docstatus: number;
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

export default function FinancialRegisterPage() {
  const { toast } = useToast();
  const { company: defaultCompany } = useDefaultCompanyName();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch Journal Entries
  const { data: journals = [], isLoading: jLoading, isError: jError, error: jErr, refetch: jRefetch } = useDocList<JournalRow>('Journal Entry', {
    fields: ['name', 'posting_date', 'voucher_type', 'total_debit', 'total_credit', 'user_remark', 'docstatus'],
    order_by: 'posting_date desc',
    limit: 300,
  });

  // Fetch Payment Entries
  const { data: payments = [], isLoading: pLoading, isError: pError, error: pErr, refetch: pRefetch } = useDocList<PaymentRow>('Payment Entry', {
    fields: ['name', 'payment_type', 'posting_date', 'paid_amount', 'party_type', 'party', 'mode_of_payment', 'docstatus'],
    order_by: 'posting_date desc',
    limit: 300,
  });

  // Fetch GL Entries
  const { data: glEntries = [], isLoading: gLoading, isError: gError, error: gErr, refetch: gRefetch } = useDocList<GLRow>('GL Entry', {
    fields: ['name', 'posting_date', 'account', 'debit', 'credit', 'against', 'voucher_type', 'voucher_no', 'remarks'],
    order_by: 'posting_date desc',
    limit: 500,
  });

  const isLoading = jLoading || pLoading || gLoading;
  const isError = jError || pError || gError;
  const error = jErr || pErr || gErr;
  const refetch = () => { jRefetch(); pRefetch(); gRefetch(); };

  // Date + status filters
  const filteredJournals = useMemo(() => {
    let list = journals;
    if (dateFrom || dateTo) list = list.filter(j => rowInDateRangeISO(j.posting_date, dateFrom, dateTo));
    if (statusFilter !== 'all') list = list.filter(j => String(j.docstatus) === statusFilter);
    return list;
  }, [journals, dateFrom, dateTo, statusFilter]);

  const filteredPayments = useMemo(() => {
    let list = payments;
    if (dateFrom || dateTo) list = list.filter(p => rowInDateRangeISO(p.posting_date, dateFrom, dateTo));
    if (statusFilter !== 'all') list = list.filter(p => String(p.docstatus) === statusFilter);
    return list;
  }, [payments, dateFrom, dateTo, statusFilter]);

  const filteredGL = useMemo(() => {
    let list = glEntries;
    if (dateFrom || dateTo) list = list.filter(g => rowInDateRangeISO(g.posting_date, dateFrom, dateTo));
    return list;
  }, [glEntries, dateFrom, dateTo]);

  // KPIs
  const totalDebit = useMemo(() => filteredJournals.reduce((s, j) => s + (Number(j.total_debit) || 0), 0), [filteredJournals]);
  const totalCredit = useMemo(() => filteredJournals.reduce((s, j) => s + (Number(j.total_credit) || 0), 0), [filteredJournals]);
  const netBalance = useMemo(() => totalDebit - totalCredit, [totalDebit, totalCredit]);
  const totalReceipts = useMemo(() => filteredPayments.filter(p => p.payment_type === 'Receive').reduce((s, p) => s + (Number(p.paid_amount) || 0), 0), [filteredPayments]);
  const totalPaymentsOut = useMemo(() => filteredPayments.filter(p => p.payment_type === 'Pay').reduce((s, p) => s + (Number(p.paid_amount) || 0), 0), [filteredPayments]);

  // Journal columns
  const journalCols: Column<JournalRow>[] = useMemo(() => [
    {
      key: 'name',
      header: 'رقم القيد',
      sortable: true,
      filterable: true,
      render: (v) => (
        <Link href={(() => { const h = docDetailPath('Journal Entry', String(v)); return h || '#'; })()} className="font-medium text-primary hover:underline">
          {String(v)}
        </Link>
      ),
    },
    { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => v ? formatDate(String(v)) : '\u2014' },
    {
      key: 'voucher_type',
      header: 'النوع',
      filterable: true,
      render: (v) => {
        const map: Record<string, string> = { 'Journal Entry': 'قيد يومية', 'Opening Entry': 'قيد افتتاحي', 'Closing Entry': 'قيد إقفال' };
        return <Badge variant="outline" className="text-[10px]">{map[String(v)] || String(v)}</Badge>;
      },
    },
    { key: 'total_debit', header: 'مدين', sortable: true, render: (v) => <span className="font-semibold text-blue-600 tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span> },
    { key: 'total_credit', header: 'دائن', sortable: true, render: (v) => <span className="font-semibold text-orange-600 tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span> },
    { key: 'user_remark', header: 'البيان', filterable: true, render: (v) => String(v || '\u2014') },
    { key: 'docstatus', header: 'الحالة', render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} /> },
  ], []);

  // Payment columns
  const paymentCols: Column<PaymentRow>[] = useMemo(() => [
    {
      key: 'name',
      header: 'رقم السند',
      sortable: true,
      filterable: true,
      render: (v) => (
        <Link href={(() => { const h = docDetailPath('Payment Entry', String(v)); return h || '#'; })()} className="font-medium text-primary hover:underline">
          {String(v)}
        </Link>
      ),
    },
    { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => v ? formatDate(String(v)) : '\u2014' },
    {
      key: 'payment_type',
      header: 'النوع',
      filterable: true,
      render: (v) => {
        const map: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
          'Receive': { label: 'قبض', variant: 'default' },
          'Pay': { label: 'صرف', variant: 'destructive' },
          'Internal Transfer': { label: 'تحويل', variant: 'secondary' },
        };
        const info = map[String(v)] || { label: String(v), variant: 'outline' as const };
        return <Badge variant={info.variant}>{info.label}</Badge>;
      },
    },
    { key: 'party', header: 'الطرف', filterable: true, render: (v) => String(v || '\u2014') },
    { key: 'paid_amount', header: 'المبلغ', sortable: true, render: (v) => <span className="font-semibold tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span> },
    { key: 'mode_of_payment', header: 'طريقة الدفع', filterable: true, render: (v) => String(v || '\u2014') },
    { key: 'docstatus', header: 'الحالة', render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} /> },
  ], []);

  // GL Entry columns
  const glCols: Column<GLRow>[] = useMemo(() => [
    { key: 'voucher_no', header: 'رقم القيد', sortable: true, filterable: true },
    { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => v ? formatDate(String(v)) : '\u2014' },
    { key: 'account', header: 'الحساب', filterable: true, render: (v) => translateAccountName(String(v)) },
    { key: 'debit', header: 'مدين', sortable: true, render: (v) => <span className="font-semibold text-blue-600 tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span> },
    { key: 'credit', header: 'دائن', sortable: true, render: (v) => <span className="font-semibold text-orange-600 tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span> },
    { key: 'against', header: 'مقابل', filterable: true, render: (v) => String(v || '\u2014') },
    { key: 'voucher_type', header: 'النوع', filterable: true, render: (v) => String(v || '\u2014') },
  ], []);

  const statusTabs = [
    { value: 'all', label: 'الكل' },
    { value: '0', label: 'مسودات' },
    { value: '1', label: 'مقدمة' },
    { value: '2', label: 'ملغاة' },
  ];

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="السجل المالي الموحد"
        description="عرض شامل لجميع الحركات المالية: القيود والسندات وحركات GL في مكان واحد"
        iconify="solar:book-2-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'السجل المالي الموحد' }]}
      />

      <KpiStrip>
        <KpiCard title="إجمالي المدين" value={formatCurrency(totalDebit)} icon={BookOpen} accent="info" />
        <KpiCard title="إجمالي الدائن" value={formatCurrency(totalCredit)} icon={Landmark} accent="warning" />
        <KpiCard title="الرصيد الصافي" value={formatCurrency(netBalance)} icon={Scale} accent={netBalance >= 0 ? 'success' : 'destructive'} />
        <KpiCard title="إجمالي القبض" value={formatCurrency(totalReceipts)} icon={ArrowUpLeft} accent="success" />
      </KpiStrip>

      {/* Filters */}
      <ErpListDateStatusFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        statusTabs={statusTabs}
      />

      <Tabs defaultValue="journals" dir="rtl">
        <TabsList>
          <TabsTrigger value="journals">
            <BookOpen className="h-3.5 w-3.5 me-1.5" />
            سجل القيود ({filteredJournals.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Receipt className="h-3.5 w-3.5 me-1.5" />
            سندات القبض والصرف ({filteredPayments.length})
          </TabsTrigger>
          <TabsTrigger value="gl">
            <FileText className="h-3.5 w-3.5 me-1.5" />
            حركات GL ({filteredGL.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="journals">
          <Card>
            <CardContent className="p-0">
              <DataTable
                data={filteredJournals}
                columns={journalCols}
                searchable
                loading={isLoading}
                pageSize={15}
                tableId="financial-register-journals"
                columnFilters
                exportFileName="financial-register-journals.csv"
                printTitle="السجل المالي - القيود اليومية"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              <DataTable
                data={filteredPayments}
                columns={paymentCols}
                searchable
                loading={isLoading}
                pageSize={15}
                tableId="financial-register-payments"
                columnFilters
                exportFileName="financial-register-payments.csv"
                printTitle="السجل المالي - السندات"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gl">
          <Card>
            <CardContent className="p-0">
              <DataTable
                data={filteredGL}
                columns={glCols}
                searchable
                loading={isLoading}
                pageSize={15}
                tableId="financial-register-gl"
                columnFilters
                exportFileName="financial-register-gl.csv"
                printTitle="السجل المالي - حركات GL"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
