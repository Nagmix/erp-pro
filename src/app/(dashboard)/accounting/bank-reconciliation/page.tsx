'use client';

import { useState, useMemo, useCallback } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { KpiCard } from '@/components/erp/kpi-card';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useDocList, useCreateDoc } from '@/lib/client/hooks';
import { EmptyState } from '@/components/erp/empty-state';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { apiCreateDoc, apiUpdateDoc } from '@/lib/client/api';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import {
  Landmark,
  ArrowLeftRight,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  Handshake,
  CircleDollarSign,
  FileWarning,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface BankTransactionRow {
  name: string;
  date: string;
  deposit: number;
  withdrawal: number;
  description: string;
  reference_number: string;
  bank_account: string;
  unallocated_amount?: number;
  docstatus: number;
}

interface PaymentEntryRow {
  name: string;
  posting_date: string;
  party_name?: string;
  paid_amount: number;
  received_amount?: number;
  reference_no: string;
  reference_date?: string;
  bank_account?: string;
}

interface MatchPair {
  bankTx: BankTransactionRow;
  paymentEntry: PaymentEntryRow;
  confidence: 'high' | 'medium';
}

// ============================================================
// Zod Schema
// ============================================================

const bankTxSchema = z.object({
  bank_account: z.string().min(1, 'الحساب البنكي مطلوب'),
  date: z.string().min(1, 'التاريخ مطلوب'),
  description: z.string().min(1, 'الوصف مطلوب'),
  reference_number: z.string(),
  deposit: z.coerce.number().min(0),
  withdrawal: z.coerce.number().min(0),
});

type BankTxFormInput = z.input<typeof bankTxSchema>;
type BankTxFormOutput = z.output<typeof bankTxSchema>;

// ============================================================
// Main Component
// ============================================================

export default function BankReconciliationPage() {
  const [bankAccount, setBankAccount] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);
  const [manualMatchMode, setManualMatchMode] = useState(false);
  const [selectedBankTx, setSelectedBankTx] = useState<BankTransactionRow | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentEntryRow | null>(null);
  const [matchedKeys, setMatchedKeys] = useState<Set<string>>(new Set());
  const [reconciling, setReconciling] = useState(false);
  const { company: defaultCo } = useDefaultCompanyName();

  // ── Data fetching ──
  const { data: bankTx = [], isLoading: btLoad, isError: btErr, error: btErrObj, refetch: refetchBt } = useDocList<BankTransactionRow>('Bank Transaction', {
    fields: ['name', 'date', 'deposit', 'withdrawal', 'description', 'reference_number', 'bank_account', 'unallocated_amount', 'docstatus'],
    order_by: 'date desc',
    limit: 500,
  });

  const { data: paymentEntries = [], isLoading: peLoad, isError: peErr, error: peErrObj, refetch: refetchPe } = useDocList<PaymentEntryRow>('Payment Entry', {
    fields: ['name', 'posting_date', 'party_name', 'paid_amount', 'received_amount', 'reference_no', 'reference_date', 'bank_account'],
    order_by: 'posting_date desc',
    limit: 500,
  });

  const isLoading = btLoad || peLoad;
  const isError = btErr || peErr;
  const error = btErr ? btErrObj : peErrObj;

  // ── Filtered data ──
  const filteredBankTx = useMemo(() => {
    let list = bankTx;
    if (bankAccount) list = list.filter(t => t.bank_account === bankAccount);
    if (dateFrom) list = list.filter(t => t.date >= dateFrom);
    if (dateTo) list = list.filter(t => t.date <= dateTo);
    return list;
  }, [bankTx, bankAccount, dateFrom, dateTo]);

  const filteredPayments = useMemo(() => {
    let list = paymentEntries;
    if (bankAccount) list = list.filter(p => p.bank_account === bankAccount);
    if (dateFrom) list = list.filter(p => p.posting_date >= dateFrom);
    if (dateTo) list = list.filter(p => p.posting_date <= dateTo);
    return list;
  }, [paymentEntries, bankAccount, dateFrom, dateTo]);

  // ── Auto-match logic ──
  const matches = useMemo<MatchPair[]>(() => {
    const result: MatchPair[] = [];
    for (const tx of filteredBankTx) {
      if (matchedKeys.has(tx.name)) continue;
      const txAmount = Number(tx.deposit) > 0 ? Number(tx.deposit) : Number(tx.withdrawal);
      if (!txAmount) continue;
      const txRef = String(tx.reference_number || '').trim();

      // High confidence: reference number match + amount match
      if (txRef) {
        const refMatch = filteredPayments.find(p => {
          if (matchedKeys.has(`pe-${p.name}`)) return false;
          const pRef = String(p.reference_no || '').trim();
          const pAmount = Number(tx.deposit) > 0 ? Number(p.received_amount || p.paid_amount) : Number(p.paid_amount);
          return pRef === txRef && Math.abs(pAmount - txAmount) < 0.01;
        });
        if (refMatch) {
          result.push({ bankTx: tx, paymentEntry: refMatch, confidence: 'high' });
          continue;
        }
      }

      // Medium confidence: amount match + date proximity
      const amountDateMatch = filteredPayments.find(p => {
        if (matchedKeys.has(`pe-${p.name}`)) return false;
        const pAmount = Number(tx.deposit) > 0 ? Number(p.received_amount || p.paid_amount) : Number(p.paid_amount);
        return Math.abs(pAmount - txAmount) < 0.01 && p.posting_date === tx.date;
      });
      if (amountDateMatch) {
        result.push({ bankTx: tx, paymentEntry: amountDateMatch, confidence: 'medium' });
      }
    }
    return result;
  }, [filteredBankTx, filteredPayments, matchedKeys]);

  // ── KPIs ──
  const totalDeposits = useMemo(() => filteredBankTx.reduce((s, t) => s + (Number(t.deposit) || 0), 0), [filteredBankTx]);
  const totalWithdrawals = useMemo(() => filteredBankTx.reduce((s, t) => s + (Number(t.withdrawal) || 0), 0), [filteredBankTx]);
  const bankBalance = totalDeposits - totalWithdrawals;
  const systemPayments = useMemo(() => filteredPayments.reduce((s, p) => s + (Number(p.paid_amount) || 0), 0), [filteredPayments]);
  const difference = bankBalance - systemPayments;
  const pendingCount = useMemo(() => filteredBankTx.filter(t => !matchedKeys.has(t.name)).length, [filteredBankTx, matchedKeys]);
  const matchedCount = useMemo(() => filteredBankTx.filter(t => matchedKeys.has(t.name)).length, [filteredBankTx, matchedKeys]);
  const totalReconciledAmount = useMemo(() => filteredBankTx.filter(t => matchedKeys.has(t.name)).reduce((s, t) => s + (Number(t.deposit) || 0) + (Number(t.withdrawal) || 0), 0), [filteredBankTx, matchedKeys]);
  const totalUnmatchedAmount = useMemo(() => filteredBankTx.filter(t => !matchedKeys.has(t.name)).reduce((s, t) => s + (Number(t.deposit) || 0) + (Number(t.withdrawal) || 0), 0), [filteredBankTx, matchedKeys]);

  // ── Form ──
  const form = useForm<BankTxFormInput, any, BankTxFormOutput>({
    resolver: zodResolver(bankTxSchema),
    defaultValues: {
      bank_account: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      reference_number: '',
      deposit: 0,
      withdrawal: 0,
    },
  });

  // ── Handlers ──
  const handleCreateBankTx = async (formData: BankTxFormOutput) => {
    try {
      await apiCreateDoc('Bank Transaction', {
        bank_account: formData.bank_account,
        date: formData.date,
        description: formData.description,
        reference_number: formData.reference_number || undefined,
        deposit: formData.deposit || 0,
        withdrawal: formData.withdrawal || 0,
      });
      toast.success('تم إنشاء الحركة البنكية بنجاح');
      setCreateDialogOpen(false);
      form.reset();
      void refetchBt();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('حدث خطأ أثناء إنشاء الحركة البنكية', { description: msg });
    }
  };

  const handleAutoMatch = useCallback(async () => {
    setAutoMatching(true);
    const newMatchedKeys = new Set(matchedKeys);
    let count = 0;
    for (const match of matches) {
      newMatchedKeys.add(match.bankTx.name);
      newMatchedKeys.add(`pe-${match.paymentEntry.name}`);
      count++;
    }
    setMatchedKeys(newMatchedKeys);
    setAutoMatching(false);
    toast.success(`تم مطابقة ${count} حركة تلقائياً`, { description: `${matches.length} مقترح مطابقة` });
  }, [matches, matchedKeys, toast]);

  const handleManualReconcile = useCallback(async () => {
    if (!selectedBankTx || !selectedPayment) {
      toast.error('اختر حركة بنكية وقيود النظام أولاً');
      return;
    }
    setReconciling(true);
    try {
      // Update bank transaction as reconciled
      await apiUpdateDoc('Bank Transaction', selectedBankTx.name, {
        status: 'Reconciled',
      });
      const newMatchedKeys = new Set(matchedKeys);
      newMatchedKeys.add(selectedBankTx.name);
      newMatchedKeys.add(`pe-${selectedPayment.name}`);
      setMatchedKeys(newMatchedKeys);
      setSelectedBankTx(null);
      setSelectedPayment(null);
      setManualMatchMode(false);
      toast.success('تمت التسوية البنكية بنجاح');
      void refetchBt();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('حدث خطأ أثناء التسوية', { description: msg });
    } finally {
      setReconciling(false);
    }
  }, [selectedBankTx, selectedPayment, matchedKeys, refetchBt, toast]);

  // ── Bank Transaction Columns ──
  const btCols: Column<BankTransactionRow>[] = [
    { key: 'date', header: 'التاريخ', sortable: true, render: (v) => formatDate(String(v || '')) },
    { key: 'description', header: 'الوصف' },
    { key: 'reference_number', header: 'رقم المرجع', render: (v) => String(v || '—') },
    { key: 'deposit', header: 'إيداع', sortable: true, render: (v) => Number(v) > 0 ? (
      <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums" dir="ltr">{formatCurrency(Number(v))}</span>
    ) : <span className="text-muted-foreground">—</span> },
    { key: 'withdrawal', header: 'سحب', sortable: true, render: (v) => Number(v) > 0 ? (
      <span className="text-rose-600 dark:text-rose-400 font-semibold tabular-nums" dir="ltr">{formatCurrency(Number(v))}</span>
    ) : <span className="text-muted-foreground">—</span> },
    { key: 'status', header: 'الحالة', render: (_, row) => matchedKeys.has(row.name) ? (
      <Badge variant="outline" className="border-0 text-xs font-semibold px-2 py-0.5 bg-success/12 text-success ring-1 ring-inset ring-success/25">مطابق</Badge>
    ) : (
      <Badge variant="outline" className="border-0 text-xs font-semibold px-2 py-0.5 bg-warning/15 text-warning-foreground/90 ring-1 ring-inset ring-warning/30">معلّق</Badge>
    )},
  ];

  // ── Payment Entry Columns ──
  const peCols: Column<PaymentEntryRow>[] = [
    { key: 'name', header: 'الرقم', width: 'w-28', render: (v) => <span className="font-mono text-[10px] text-primary">{String(v)}</span> },
    { key: 'posting_date', header: 'تاريخ الترحيل', sortable: true, render: (v) => formatDate(String(v || '')) },
    { key: 'party_name', header: 'الطرف', render: (v) => String(v || '—') },
    { key: 'paid_amount', header: 'المبلغ', sortable: true, render: (v) => (
      <span className="font-semibold tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span>
    )},
    { key: 'reference_no', header: 'رقم المرجع', render: (v) => String(v || '—') },
  ];

  // ── Match columns ──
  const matchCols: Column<MatchPair>[] = [
    { key: 'bankTx', header: 'حركة الكشف', render: (_, row) => (
      <div className="space-y-0.5">
        <p className="text-[11px] font-medium">{row.bankTx.description}</p>
        <p className="text-[10px] text-muted-foreground" dir="ltr">{formatDate(row.bankTx.date)} | {row.bankTx.reference_number || '—'}</p>
      </div>
    )},
    { key: 'amount', header: 'المبلغ', render: (_, row) => (
      <span className="font-semibold tabular-nums" dir="ltr">
        {formatCurrency(Number(row.bankTx.deposit) || Number(row.bankTx.withdrawal) || 0)}
      </span>
    )},
    { key: 'paymentEntry', header: 'قيود النظام', render: (_, row) => (
      <div className="space-y-0.5">
        <p className="text-[11px] font-mono">{row.paymentEntry.name}</p>
        <p className="text-[10px] text-muted-foreground">{row.paymentEntry.party_name || '—'}</p>
      </div>
    )},
    { key: 'confidence', header: 'الثقة', render: (v) => v === 'high' ? (
      <Badge className="text-[10px] bg-success/12 text-success border-0">عالية</Badge>
    ) : (
      <Badge className="text-[10px] bg-warning/15 text-warning-foreground/90 border-0">متوسطة</Badge>
    )},
  ];

  const clearFilters = () => { setBankAccount(''); setDateFrom(''); setDateTo(''); };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => { void refetchBt(); void refetchPe(); }} />

      <PageHeader
        title="التسوية البنكية"
        description="مطابقة كشف الحساب البنكي مع القيود النظامية"
        iconify="solar:card-recive-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'التسوية البنكية' }]}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { form.reset({ bank_account: bankAccount, date: new Date().toISOString().split('T')[0], description: '', reference_number: '', deposit: 0, withdrawal: 0 }); setCreateDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5" />
              حركة بنكية جديدة
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={autoMatching || matches.length === 0}
              onClick={() => void handleAutoMatch()}
            >
              {autoMatching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              مطابقة تلقائية ({matches.length})
            </Button>
          </div>
        }
      />

      {/* KPI Strip - Summary */}
      <KpiStrip cols={3}>
        <KpiCard title="رصيد البنك" value={formatCurrency(bankBalance)} icon={Landmark} accent="primary" compact />
        <KpiCard title="رصيد النظام" value={formatCurrency(systemPayments)} icon={ArrowLeftRight} accent="info" compact />
        <KpiCard title="الفرق" value={formatCurrency(Math.abs(difference))} icon={XCircle} accent={Math.abs(difference) > 0.01 ? 'destructive' : 'success'} compact />
      </KpiStrip>

      {/* KPI Strip - Reconciliation Status */}
      <KpiStrip cols={4}>
        <KpiCard title="مطابق" value={matchedCount} description={filteredBankTx.length > 0 ? `من أصل ${filteredBankTx.length} حركة` : undefined} icon={CheckCircle2} accent="success" compact />
        <KpiCard title="غير مطابق" value={pendingCount} description={pendingCount > 0 ? `مبلغ: ${formatCurrency(totalUnmatchedAmount)}` : undefined} icon={FileWarning} accent="warning" compact />
        <KpiCard title="إجمالي المبلغ المسوّى" value={formatCurrency(totalReconciledAmount)} icon={CircleDollarSign} accent="info" compact />
        <KpiCard title="معلّق للتسوية" value={formatCurrency(totalUnmatchedAmount)} icon={Handshake} accent={pendingCount > 0 ? 'destructive' : 'success'} compact />
      </KpiStrip>

      {/* Bank Account & Date Filter */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5 min-w-[220px]">
            <Label className="text-[10px]">الحساب البنكي</Label>
            <ErpLinkCombobox
              doctype="Bank Account"
              value={bankAccount}
              onChange={setBankAccount}
              placeholder="كل الحسابات..."
              showCreateShortcut={false}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">من تاريخ</Label>
            <Input type="date" dir="ltr" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">إلى تاريخ</Label>
            <Input type="date" dir="ltr" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          {(bankAccount || dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
              <X className="h-3 w-3" /> مسح الفلاتر
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bank-statement" dir="rtl" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="bank-statement" className="gap-1.5">
            <Landmark className="h-4 w-4" />
            كشف بنكي
          </TabsTrigger>
          <TabsTrigger value="system-entries" className="gap-1.5">
            <ArrowLeftRight className="h-4 w-4" />
            قيود النظام
          </TabsTrigger>
          <TabsTrigger value="matching" className="gap-1.5">
            <Handshake className="h-4 w-4" />
            المطابقة ({matches.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Bank Statement */}
        <TabsContent value="bank-statement" className="space-y-4">
          <Card>
            <CardHeader className="py-3 flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm">حركات الكشف البنكي</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">إيداعات: <span className="font-semibold tabular-nums" dir="ltr">{formatCurrency(totalDeposits)}</span></Badge>
                <Badge variant="secondary" className="text-[10px]">سحوبات: <span className="font-semibold tabular-nums" dir="ltr">{formatCurrency(totalWithdrawals)}</span></Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!btLoad && filteredBankTx.length === 0 ? (
                <EmptyState
                  title="لا توجد حركات بنكية"
                  description="لم يتم العثور على حركات بنكية للفترة المحددة. جرّب تعديل الفلاتر أو أنشئ حركة بنكية جديدة."
                  icon={Landmark}
                  actionLabel="حركة بنكية جديدة"
                  onAction={() => { form.reset({ bank_account: bankAccount, date: new Date().toISOString().split('T')[0], description: '', reference_number: '', deposit: 0, withdrawal: 0 }); setCreateDialogOpen(true); }}
                />
              ) : (
                <DataTable
                  data={filteredBankTx}
                  columns={btCols}
                  pageSize={15}
                  searchable
                  loading={btLoad}
                  tableId="bank-tx-table"
                  exportFileName="bank-transactions.csv"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: System Entries */}
        <TabsContent value="system-entries" className="space-y-4">
          <Card>
            <CardHeader className="py-3 flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm">قيود الدفع والقبض</CardTitle>
              <Badge variant="secondary" className="text-[10px]">إجمالي: <span className="font-semibold tabular-nums" dir="ltr">{formatCurrency(systemPayments)}</span></Badge>
            </CardHeader>
            <CardContent>
              {!peLoad && filteredPayments.length === 0 ? (
                <EmptyState
                  title="لا توجد قيود دفع"
                  description="لم يتم العثور على قيود دفع أو قبض للفترة المحددة. جرّب تعديل الفلاتر أو أنشئ قيد دفع من صفحة قيود الدفع."
                  icon={ArrowLeftRight}
                />
              ) : (
                <DataTable
                  data={filteredPayments}
                  columns={peCols}
                  pageSize={15}
                  searchable
                  loading={peLoad}
                  tableId="payment-entries-table"
                  exportFileName="payment-entries.csv"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Matching */}
        <TabsContent value="matching" className="space-y-4">
          {/* Auto-match results */}
          <Card>
            <CardHeader className="py-3 flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                مقترحات المطابقة
                <span className="text-[10px] text-muted-foreground font-normal">
                  (مطابق: {matchedKeys.size / 2} | معلّق: {pendingCount})
                </span>
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={autoMatching || matches.length === 0}
                onClick={() => void handleAutoMatch()}
              >
                {autoMatching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                تطبيق الكل ({matches.length})
              </Button>
            </CardHeader>
            <CardContent>
              {!btLoad && !peLoad && matches.length === 0 ? (
                <EmptyState
                  title="لا توجد مقترحات مطابقة"
                  description="لم يتم العثور على مطابقات تلقائية بين الحركات البنكية وقيود النظام. يمكنك استخدام التسوية اليدوية أدناه."
                  icon={Zap}
                />
              ) : (
                <DataTable
                  data={matches}
                  columns={matchCols}
                  pageSize={10}
                  searchable
                  loading={btLoad || peLoad}
                  tableId="bank-match-table"
                  exportFileName="bank-matches.csv"
                />
              )}
            </CardContent>
          </Card>

          {/* Manual Match Section */}
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardHeader className="py-3 flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Handshake className="h-4 w-4 text-primary" />
                تسوية يدوية
              </CardTitle>
              <Button
                size="sm"
                variant={manualMatchMode ? 'default' : 'outline'}
                className="gap-1.5"
                onClick={() => {
                  setManualMatchMode(!manualMatchMode);
                  if (manualMatchMode) {
                    setSelectedBankTx(null);
                    setSelectedPayment(null);
                  }
                }}
              >
                {manualMatchMode ? 'إلغاء التسوية اليدوية' : 'تسوية يدوية'}
              </Button>
            </CardHeader>
            {manualMatchMode && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bank Transaction Selection */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold">اختر حركة بنكية</Label>
                    <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border border-border/40 p-2">
                      {filteredBankTx.filter(t => !matchedKeys.has(t.name)).map(tx => (
                        <button
                          key={tx.name}
                          type="button"
                          onClick={() => setSelectedBankTx(tx)}
                          className={cn(
                            'w-full text-start rounded-md px-3 py-2 text-xs transition-colors',
                            selectedBankTx?.name === tx.name
                              ? 'bg-primary/10 border border-primary/30'
                              : 'hover:bg-muted/50 border border-transparent'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{tx.description}</span>
                            <span className={cn('font-semibold tabular-nums shrink-0', Number(tx.deposit) > 0 ? 'text-emerald-600' : 'text-rose-600')} dir="ltr">
                              {formatCurrency(Number(tx.deposit) || Number(tx.withdrawal) || 0)}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(tx.date)} | {tx.reference_number || '—'}</p>
                        </button>
                      ))}
                      {filteredBankTx.filter(t => !matchedKeys.has(t.name)).length === 0 && (
                        <p className="text-center text-xs text-muted-foreground py-4">لا توجد حركات معلّقة</p>
                      )}
                    </div>
                  </div>

                  {/* Payment Entry Selection */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold">اختر قيد النظام</Label>
                    <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border border-border/40 p-2">
                      {filteredPayments.filter(p => !matchedKeys.has(`pe-${p.name}`)).map(pe => (
                        <button
                          key={pe.name}
                          type="button"
                          onClick={() => setSelectedPayment(pe)}
                          className={cn(
                            'w-full text-start rounded-md px-3 py-2 text-xs transition-colors',
                            selectedPayment?.name === pe.name
                              ? 'bg-primary/10 border border-primary/30'
                              : 'hover:bg-muted/50 border border-transparent'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] text-primary">{pe.name}</span>
                            <span className="font-semibold tabular-nums shrink-0" dir="ltr">{formatCurrency(Number(pe.paid_amount) || 0)}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{pe.party_name || '—'} | {formatDate(pe.posting_date)}</p>
                        </button>
                      ))}
                      {filteredPayments.filter(p => !matchedKeys.has(`pe-${p.name}`)).length === 0 && (
                        <p className="text-center text-xs text-muted-foreground py-4">لا توجد قيود متاحة</p>
                      )}
                    </div>
                  </div>
                </div>

                {selectedBankTx && selectedPayment && (
                  <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/[0.04] px-4 py-3">
                    <div className="text-xs space-y-1">
                      <p className="font-semibold">تسوية</p>
                      <p className="text-muted-foreground">
                        حركة: <span className="font-medium text-foreground">{selectedBankTx.description}</span>
                        {' ← '}
                        قيد: <span className="font-mono text-primary">{selectedPayment.name}</span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={reconciling}
                      onClick={() => void handleManualReconcile()}
                    >
                      {reconciling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      تسوية
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Bank Transaction Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-success" />
              إنشاء حركة بنكية جديدة
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreateBankTx)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">الحساب البنكي *</Label>
              <ErpLinkCombobox
                doctype="Bank Account"
                value={form.watch('bank_account')}
                onChange={(v) => form.setValue('bank_account', v)}
                placeholder="اختر الحساب البنكي..."
              />
              {form.formState.errors.bank_account && (
                <p className="text-[10px] text-destructive">{form.formState.errors.bank_account.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">التاريخ *</Label>
              <Input type="date" dir="ltr" {...form.register('date')} />
              {form.formState.errors.date && (
                <p className="text-[10px] text-destructive">{form.formState.errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">الوصف *</Label>
              <Input placeholder="وصف الحركة البنكية..." {...form.register('description')} />
              {form.formState.errors.description && (
                <p className="text-[10px] text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">رقم المرجع</Label>
              <Input placeholder="رقم مرجعي (اختياري)..." dir="ltr" {...form.register('reference_number')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">الإيداع</Label>
                <Input type="number" dir="ltr" placeholder="0.00" {...form.register('deposit', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">السحب</Label>
                <Input type="number" dir="ltr" placeholder="0.00" {...form.register('withdrawal', { valueAsNumber: true })} />
              </div>
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setCreateDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
              <Button type="submit" className="gap-1.5 min-w-[130px]">
                إنشاء الحركة
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
