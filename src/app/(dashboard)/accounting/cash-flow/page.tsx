'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { KpiStrip } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ExportButton } from '@/components/erp/export-button';
import { formatCurrency, CHART_PALETTE } from '@/lib/core/helpers';
import { useDocList, useErpMethodCall } from '@/lib/client/hooks';
import {
  ArrowUpLeft,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Landmark,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface CashFlowRow {
  label: string;
  inflow: number;
  outflow: number;
  net: number;
}

export default function CashFlowPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Fetch Payment Entries for operating flows
  const { data: payments = [], isLoading: paymentsLoading, refetch: refetchPayments, error: paymentsError } = useDocList<Record<string, unknown>>('Payment Entry', {
    fields: ['name', 'payment_type', 'posting_date', 'paid_amount', 'party_type', 'party_name', 'mode_of_payment'],
    filters: [
      ['docstatus', '=', '1'],
      ['posting_date', '>=', dateFrom],
      ['posting_date', '<=', dateTo],
    ],
    limit: 500,
    order_by: 'posting_date desc',
  });

  // Fetch Journal Entries for investing/financing flows
  const { data: journals = [], isLoading: journalsLoading, refetch: refetchJournals, error: journalsError } = useDocList<Record<string, unknown>>('Journal Entry', {
    fields: ['name', 'posting_date', 'total_debit', 'total_credit', 'voucher_type', 'user_remark'],
    filters: [
      ['docstatus', '=', '1'],
      ['posting_date', '>=', dateFrom],
      ['posting_date', '<=', dateTo],
    ],
    limit: 500,
    order_by: 'posting_date desc',
  });

  // Fetch Sales Invoices for operating inflows
  const { data: salesInvoices = [], isLoading: siLoading, error: siError } = useDocList<Record<string, unknown>>('Sales Invoice', {
    fields: ['name', 'posting_date', 'grand_total'],
    filters: [
      ['docstatus', '=', '1'],
      ['posting_date', '>=', dateFrom],
      ['posting_date', '<=', dateTo],
    ],
    limit: 500,
    order_by: 'posting_date desc',
  });

  // Fetch Purchase Invoices for operating outflows
  const { data: purchaseInvoices = [], isLoading: piLoading, error: piError } = useDocList<Record<string, unknown>>('Purchase Invoice', {
    fields: ['name', 'posting_date', 'grand_total'],
    filters: [
      ['docstatus', '=', '1'],
      ['posting_date', '>=', dateFrom],
      ['posting_date', '<=', dateTo],
    ],
    limit: 500,
    order_by: 'posting_date desc',
  });

  // Fetch GL Entries to categorize Journal Entries into investing/financing
  const { data: glEntries = [], isLoading: glLoading, error: glError } = useDocList<Record<string, unknown>>('GL Entry', {
    fields: ['name', 'account', 'debit', 'credit', 'voucher_no', 'posting_date', 'against_voucher'],
    filters: [
      ['docstatus', '=', '1'],
      ['posting_date', '>=', dateFrom],
      ['posting_date', '<=', dateTo],
      ['voucher_type', '=', 'Journal Entry'],
    ],
    limit: 1000,
    order_by: 'posting_date desc',
  });

  // Fetch Account root types to classify GL entries
  const { data: accountsRaw = [], isLoading: accountsLoading } = useDocList<Record<string, unknown>>('Account', {
    fields: ['name', 'root_type', 'account_type'],
    limit: 500,
  });

  // Build account → root_type map
  const accountRootTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accountsRaw) {
      map.set(String(a.name), String(a.root_type ?? ''));
    }
    return map;
  }, [accountsRaw]);

  // Get opening balance via method call (bank/cash account balance at dateFrom)
  const { data: openingBalResult } = useErpMethodCall<{ message: { balance: number } }>(['Account']);
  // We'll compute opening balance from bank/cash accounts

  // Fetch Account balances for opening balance
  const { data: bankCashAccounts = [] } = useDocList<Record<string, unknown>>('Account', {
    fields: ['name', 'account_name', 'account_type'],
    or_filters: [
      ['account_type', '=', 'Bank'],
      ['account_type', '=', 'Cash'],
    ],
    limit: 100,
  });

  const loading = paymentsLoading || journalsLoading || siLoading || piLoading || glLoading || accountsLoading;
  const error = paymentsError || journalsError || siError || piError || glError;

  // Calculate cash flow sections using REAL data
  const operatingInflows = useMemo(() =>
    payments
      .filter(p => String(p.payment_type) === 'Receive')
      .reduce((sum, p) => sum + Number(p.paid_amount ?? 0), 0),
    [payments]
  );

  const operatingOutflows = useMemo(() =>
    payments
      .filter(p => String(p.payment_type) === 'Pay')
      .reduce((sum, p) => sum + Number(p.paid_amount ?? 0), 0),
    [payments]
  );

  const salesInflow = useMemo(() =>
    salesInvoices.reduce((sum, si) => sum + Number(si.grand_total ?? 0), 0),
    [salesInvoices]
  );

  const purchaseOutflow = useMemo(() =>
    purchaseInvoices.reduce((sum, pi) => sum + Number(pi.grand_total ?? 0), 0),
    [purchaseInvoices]
  );

  // Classify Journal Entry GL entries into investing/financing based on account root types
  const { investingInflows, investingOutflows, financingInflows, financingOutflows } = useMemo(() => {
    let invIn = 0, invOut = 0, finIn = 0, finOut = 0;

    // Group GL entries by voucher_no (Journal Entry)
    const jeMap = new Map<string, { debits: { account: string; amount: number }[]; credits: { account: string; amount: number }[] }>();

    for (const gl of glEntries) {
      const voucherNo = String(gl.voucher_no ?? '');
      if (!jeMap.has(voucherNo)) {
        jeMap.set(voucherNo, { debits: [], credits: [] });
      }
      const entry = jeMap.get(voucherNo)!;
      const debit = Number(gl.debit ?? 0);
      const credit = Number(gl.credit ?? 0);
      const account = String(gl.account ?? '');

      if (debit > 0) {
        entry.debits.push({ account, amount: debit });
      }
      if (credit > 0) {
        entry.credits.push({ account, amount: credit });
      }
    }

    // For each Journal Entry, classify based on the accounts involved
    // - If an Asset account (root_type=Asset, not Bank/Cash) is debited → investing outflow (buying assets)
    // - If an Asset account (root_type=Asset, not Bank/Cash) is credited → investing inflow (selling assets)
    // - If a Liability or Equity account is credited → financing inflow (loans, capital)
    // - If a Liability or Equity account is debited → financing outflow (repaying loans)
    for (const [, entry] of jeMap) {
      for (const d of entry.debits) {
        const rootType = accountRootTypeMap.get(d.account) ?? '';
        if (rootType === 'Asset') {
          const acctInfo = accountsRaw.find(a => String(a.name) === d.account);
          const acctType = String(acctInfo?.account_type ?? '');
          // Skip Bank/Cash accounts - those are the cash effect itself
          if (acctType !== 'Bank' && acctType !== 'Cash') {
            invOut += d.amount;
          }
        } else if (rootType === 'Liability' || rootType === 'Equity') {
          finOut += d.amount;
        }
      }
      for (const c of entry.credits) {
        const rootType = accountRootTypeMap.get(c.account) ?? '';
        if (rootType === 'Asset') {
          const acctInfo = accountsRaw.find(a => String(a.name) === c.account);
          const acctType = String(acctInfo?.account_type ?? '');
          if (acctType !== 'Bank' && acctType !== 'Cash') {
            invIn += c.amount;
          }
        } else if (rootType === 'Liability' || rootType === 'Equity') {
          finIn += c.amount;
        }
      }
    }

    return {
      investingInflows: Math.round(invIn),
      investingOutflows: Math.round(invOut),
      financingInflows: Math.round(finIn),
      financingOutflows: Math.round(finOut),
    };
  }, [glEntries, accountRootTypeMap, accountsRaw]);

  const operatingNet = operatingInflows - operatingOutflows + salesInflow - purchaseOutflow;
  const investingNet = investingInflows - investingOutflows;
  const financingNet = financingInflows - financingOutflows;
  const netChange = operatingNet + investingNet + financingNet;

  // Opening balance: try to get from Account balance method, fallback to 0
  const openingBalance = useMemo(() => {
    // Sum up opening balances from bank/cash accounts if available
    // This is a simplified approach - the actual balance would need a server-side method
    // For now, we use 0 as the base but note it in the UI
    return 0;
  }, []);

  const closingBalance = openingBalance + netChange;

  // Summary rows
  const summaryRows: CashFlowRow[] = [
    { label: 'التدفقات التشغيلية', inflow: operatingInflows + salesInflow, outflow: operatingOutflows + purchaseOutflow, net: operatingNet },
    { label: 'التدفقات الاستثمارية', inflow: investingInflows, outflow: investingOutflows, net: investingNet },
    { label: 'التدفقات التمويلية', inflow: financingInflows, outflow: financingOutflows, net: financingNet },
  ];

  // Chart data - monthly breakdown
  const chartData = useMemo(() => {
    const months: Record<string, { month: string; operating: number; investing: number; financing: number }> = {};

    payments.forEach(p => {
      const m = String(p.posting_date ?? '').slice(0, 7);
      if (!months[m]) months[m] = { month: m, operating: 0, investing: 0, financing: 0 };
      const amt = Number(p.paid_amount ?? 0);
      if (String(p.payment_type) === 'Receive') months[m].operating += amt;
      else months[m].operating -= amt;
    });

    // Add JE-based investing/financing to chart
    const jeMonthMap = new Map<string, { investing: number; financing: number }>();
    for (const gl of glEntries) {
      const m = String(gl.posting_date ?? '').slice(0, 7);
      if (!jeMonthMap.has(m)) jeMonthMap.set(m, { investing: 0, financing: 0 });
      const entry = jeMonthMap.get(m)!;
      const debit = Number(gl.debit ?? 0);
      const credit = Number(gl.credit ?? 0);
      const rootType = accountRootTypeMap.get(String(gl.account ?? '')) ?? '';
      const acctInfo = accountsRaw.find(a => String(a.name) === String(gl.account));
      const acctType = String(acctInfo?.account_type ?? '');

      if (rootType === 'Asset' && acctType !== 'Bank' && acctType !== 'Cash') {
        entry.investing += credit - debit; // credit = inflow, debit = outflow
      } else if (rootType === 'Liability' || rootType === 'Equity') {
        entry.financing += credit - debit;
      }
    }

    for (const [m, data] of jeMonthMap) {
      if (!months[m]) months[m] = { month: m, operating: 0, investing: 0, financing: 0 };
      months[m].investing += data.investing;
      months[m].financing += data.financing;
    }

    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }, [payments, glEntries, accountRootTypeMap, accountsRaw]);

  const handleRefresh = () => {
    refetchPayments();
    refetchJournals();
  };

  const exportData = summaryRows.map(row => ({
    'البند': row.label,
    'الوارد': row.inflow,
    'الصادر': row.outflow,
    'صافي التدفق': row.net,
  }));

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="تقرير التدفقات النقدية"
        description="تحليل حركة النقد وفقاً للأنشطة التشغيلية والاستثمارية والتمويلية"
        iconify="solar:wallet-money-bold-duotone"
        accent="primary"
        breadcrumbs={[
          { label: 'المحاسبة', href: '/accounting' },
          { label: 'تقرير التدفقات النقدية' },
        ]}
        actions={
          <div className="flex gap-2">
            <ExportButton
              data={exportData as unknown as Record<string, unknown>[]}
              filename="تقرير التدفقات النقدية"
              columns={[
                { key: 'البند', header: 'البند' },
                { key: 'الوارد', header: 'الوارد' },
                { key: 'الصادر', header: 'الصادر' },
                { key: 'صافي التدفق', header: 'صافي التدفق' },
              ]}
            />
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </div>
        }
      />

      <ListQueryAlert error={error} onRetry={handleRefresh} />

      {/* Date Range Selector */}
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-[var(--radius-md-ui)] border border-border/40 bg-card">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          نطاق التقرير
        </div>
        <div className="space-y-1">
          <Label className="text-xs">من تاريخ</Label>
          <Input type="date" dir="ltr" className="h-8 w-40 text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">إلى تاريخ</Label>
          <Input type="date" dir="ltr" className="h-8 w-40 text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard title="صافي التدفق التشغيلي" value={formatCurrency(operatingNet)} icon={TrendingUp} accent={operatingNet >= 0 ? 'success' : 'destructive'} />
        <KpiCard title="صافي التدفق الاستثماري" value={formatCurrency(investingNet)} icon={Building2} accent={investingNet >= 0 ? 'info' : 'warning'} />
        <KpiCard title="صافي التدفق التمويلي" value={formatCurrency(financingNet)} icon={Landmark} accent={financingNet >= 0 ? 'primary' : 'destructive'} />
        <KpiCard title="صافي التغير النقدي" value={formatCurrency(netChange)} icon={DollarSign} accent={netChange >= 0 ? 'success' : 'destructive'} />
      </KpiStrip>

      {/* Three Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Operating */}
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
              <TrendingUp className="h-4 w-4" />
              التدفقات التشغيلية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">وارد (قبض + مبيعات)</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(operatingInflows + salesInflow)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">صادر (دفع + مشتريات)</span>
              <span className="font-semibold text-rose-600">{formatCurrency(operatingOutflows + purchaseOutflow)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>صافي التدفقات التشغيلية</span>
              <span className={operatingNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(operatingNet)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Investing */}
        <Card className="border-chart-1/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-chart-1">
              <Building2 className="h-4 w-4" />
              التدفقات الاستثمارية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">وارد (بيع أصول)</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(investingInflows)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">صادر (شراء أصول)</span>
              <span className="font-semibold text-rose-600">{formatCurrency(investingOutflows)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>صافي التدفقات الاستثمارية</span>
              <span className={investingNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(investingNet)}</span>
            </div>
            {investingInflows === 0 && investingOutflows === 0 && (
              <div className="flex items-start gap-1.5 rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3 shrink-0 mt-0.5" />
                <span>يُحسب من قيود اليومية ذات حسابات الأصول (غير النقدية)</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financing */}
        <Card className="border-chart-5/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-chart-5">
              <Landmark className="h-4 w-4" />
              التدفقات التمويلية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">وارد (قروض، رأس مال)</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(financingInflows)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">صادر (سداد قروض)</span>
              <span className="font-semibold text-rose-600">{formatCurrency(financingOutflows)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>صافي التدفقات التمويلية</span>
              <span className={financingNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(financingNet)}</span>
            </div>
            {financingInflows === 0 && financingOutflows === 0 && (
              <div className="flex items-start gap-1.5 rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3 shrink-0 mt-0.5" />
                <span>يُحسب من قيود اليومية ذات حسابات الخصوم وحقوق الملكية</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">ملخص التدفقات النقدية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-3 text-end font-medium text-muted-foreground">البند</th>
                  <th className="py-2 px-3 text-start font-medium text-muted-foreground">الوارد</th>
                  <th className="py-2 px-3 text-start font-medium text-muted-foreground">الصادر</th>
                  <th className="py-2 px-3 text-start font-medium text-muted-foreground">صافي التدفق</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row) => (
                  <tr key={row.label} className="border-b border-border/40 hover:bg-accent/30">
                    <td className="py-2.5 px-3 font-medium">{row.label}</td>
                    <td className="py-2.5 px-3 text-start tabular-nums text-emerald-600">{formatCurrency(row.inflow)}</td>
                    <td className="py-2.5 px-3 text-start tabular-nums text-rose-600">{formatCurrency(row.outflow)}</td>
                    <td className={`py-2.5 px-3 text-start tabular-nums font-semibold ${row.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold">
                  <td className="py-3 px-3">رصيد الافتتاح</td>
                  <td colSpan={3} className="py-3 px-3 text-start tabular-nums">{formatCurrency(openingBalance)}</td>
                </tr>
                <tr className="font-bold bg-muted/30">
                  <td className="py-3 px-3">صافي التغير النقدي</td>
                  <td colSpan={2} className="py-3 px-3"></td>
                  <td className={`py-3 px-3 text-start tabular-nums ${netChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(netChange)}
                  </td>
                </tr>
                <tr className="font-bold">
                  <td className="py-3 px-3">رصيد الإقفال</td>
                  <td colSpan={2} className="py-3 px-3"></td>
                  <td className="py-3 px-3 text-start tabular-nums font-bold">{formatCurrency(closingBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3 w-3 shrink-0 mt-0.5" />
            <span>التدفقات الاستثمارية والتمويلية مبنية على تحليل حسابات قيود اليومية (أصول غير نقدية = استثمارية، خصوم/حقوق ملكية = تمويلية). رصيد الافتتاح يحتاج استعلام رصيد الحسابات البنكية/النقدية عند تاريخ البداية.</span>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">اتجاه التدفقات النقدية الشهرية</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-16 text-center">
              لا توجد بيانات تدفقات نقدية في النطاق المحدد. ستظهر الرسوم البيانية عند توفر بيانات المدفوعات.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(220, 10%, 90%)' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="operating" fill={CHART_PALETTE.primary} radius={[4, 4, 0, 0]} name="تشغيلية" />
                <Bar dataKey="investing" fill={CHART_PALETTE.secondary} radius={[4, 4, 0, 0]} name="استثمارية" />
                <Bar dataKey="financing" fill={CHART_PALETTE.quinary} radius={[4, 4, 0, 0]} name="تمويلية" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
