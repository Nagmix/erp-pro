'use client';

import { useCallback, useMemo, useState } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/app-format';
import {
  useDocList,
  useCreateDoc,
  useUpdateDoc,
} from '@/lib/client/hooks';
import {
  DollarSign,
  RefreshCw,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Loader2,
} from 'lucide-react';

/* ───────── Types ───────── */

type Currency = {
  code: string;
  nameAr: string;
  nameEn: string;
  symbol: string;
  buyRate: number;
  sellRate: number;
  lastUpdate: string;
  source: 'يدوي' | 'API';
  active: boolean;
};

type ExchangeRate = {
  name: string;
  from_currency: string;
  to_currency: string;
  exchange_rate: number;
  date: string;
};

type ExchangeEntry = {
  id: string;
  date: string;
  doctype: string;
  docname: string;
  currency: string;
  originalAmount: number;
  rateAtCreation: number;
  rateAtSettlement: number;
  difference: number;
  type: 'ربح' | 'خسارة';
};

/* ───────── ERPNext API raw row types ───────── */

type ErpCurrencyRow = {
  name: string;
  enabled: number;
  fraction?: string;
  fraction_units?: number;
  number_format?: string;
  smallest_currency_fraction_value?: number;
};

type ErpExchangeRow = {
  name: string;
  from_currency: string;
  to_currency: string;
  exchange_rate: number;
  date: string;
};

/* ───────── Currency display helpers ───────── */

const CURRENCY_DISPLAY: Record<string, { nameAr: string; nameEn: string; symbol: string }> = {
  YER: { nameAr: 'ريال يمني', nameEn: 'Yemeni Rial', symbol: '﷼' },
  SAR: { nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', symbol: '﷼' },
  AED: { nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham', symbol: 'د.إ' },
  USD: { nameAr: 'دولار أمريكي', nameEn: 'US Dollar', symbol: '$' },
  EUR: { nameAr: 'يورو', nameEn: 'Euro', symbol: '€' },
  KWD: { nameAr: 'دينار كويتي', nameEn: 'Kuwaiti Dinar', symbol: 'د.ك' },
  OMR: { nameAr: 'ريال عماني', nameEn: 'Omani Rial', symbol: 'ر.ع.' },
  BHD: { nameAr: 'دينار بحريني', nameEn: 'Bahraini Dinar', symbol: 'د.ب' },
  EGP: { nameAr: 'جنيه مصري', nameEn: 'Egyptian Pound', symbol: 'ج.م' },
  JOD: { nameAr: 'دينار أردني', nameEn: 'Jordanian Dinar', symbol: 'د.أ' },
  QAR: { nameAr: 'ريال قطري', nameEn: 'Qatari Riyal', symbol: 'ر.ق' },
  GBP: { nameAr: 'جنيه إسترليني', nameEn: 'British Pound', symbol: '£' },
  CNY: { nameAr: 'يوان صيني', nameEn: 'Chinese Yuan', symbol: '¥' },
  TRY: { nameAr: 'ليرة تركية', nameEn: 'Turkish Lira', symbol: '₺' },
};

function getCurrencyDisplay(code: string) {
  return CURRENCY_DISPLAY[code] ?? { nameAr: code, nameEn: code, symbol: code };
}

/* ───────── Page Component ───────── */

export default function MultiCurrencyPage() {
  /* ─── Fetch Currencies via hooks ─── */
  const {
    data: currencyRows = [],
    isLoading: curLoading,
    error: curError,
    refetch: refetchCurrencies,
  } = useDocList<ErpCurrencyRow>('Currency', {
    fields: ['name', 'enabled', 'fraction', 'fraction_units', 'number_format', 'smallest_currency_fraction_value'],
    limit: 100,
  });

  /* ─── Fetch Exchange Rates via hooks ─── */
  const {
    data: exchangeRows = [],
    isLoading: exLoading,
    error: exError,
    refetch: refetchExchange,
  } = useDocList<ErpExchangeRow>('Currency Exchange', {
    fields: ['name', 'from_currency', 'to_currency', 'exchange_rate', 'date'],
    limit: 100,
    order_by: 'date desc',
  });

  /* ─── Fetch Journal Entries with multi-currency for exchange gain/loss ─── */
  const {
    data: jeRows = [],
    isLoading: jeLoading,
  } = useDocList<Record<string, unknown>>('Journal Entry', {
    fields: ['name', 'posting_date', 'total_debit', 'total_credit', 'voucher_type', 'multi_currency'],
    filters: [['multi_currency', '=', '1']],
    limit: 200,
    order_by: 'posting_date desc',
  });

  /* ─── Fetch Journal Entry Account rows for exchange gain/loss computation ─── */
  const {
    data: jeAccountRows = [],
    isLoading: jeAcctLoading,
  } = useDocList<Record<string, unknown>>('Journal Entry Account', {
    fields: ['name', 'parent', 'account', 'exchange_rate', 'debit', 'credit', 'debit_in_account_currency', 'credit_in_account_currency', 'currency'],
    limit: 500,
  });

  /* ─── Mutations ─── */
  const createExchangeMutation = useCreateDoc('Currency Exchange');
  const updateCurrencyMutation = useUpdateDoc('Currency');

  /* ─── State ─── */
  const [activeTab, setActiveTab] = useState('rates');

  /* Edit Rate Dialog */
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [editBuyRate, setEditBuyRate] = useState('');
  const [editSellRate, setEditSellRate] = useState('');

  /* Converter State */
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('YER');
  const [convertAmount, setConvertAmount] = useState('1');

  /* ─── Map currencies from ERPNext data ─── */
  const currencies = useMemo(() => {
    const mapped: Currency[] = currencyRows.map((r) => {
      const display = getCurrencyDisplay(r.name);
      // Find the latest exchange rate for this currency → YER
      const rateToYER = exchangeRows.find(
        (e) => e.from_currency === r.name && e.to_currency === 'YER'
      );
      const rateFromYER = exchangeRows.find(
        (e) => e.from_currency === 'YER' && e.to_currency === r.name
      );
      const buyRate = rateToYER?.exchange_rate ?? (r.name === 'YER' ? 1 : 0);
      const sellRate = buyRate > 0 ? buyRate * 1.002 : 0;
      return {
        code: r.name,
        nameAr: display.nameAr,
        nameEn: display.nameEn,
        symbol: display.symbol,
        buyRate,
        sellRate: rateFromYER ? 1 / rateFromYER.exchange_rate : sellRate,
        lastUpdate: rateToYER?.date ?? new Date().toISOString(),
        source: rateToYER ? 'API' : 'يدوي' as const,
        active: r.enabled === 1,
      };
    });

    // If no currencies returned, seed with YER at least
    if (mapped.length === 0) {
      mapped.push({
        code: 'YER',
        nameAr: 'ريال يمني',
        nameEn: 'Yemeni Rial',
        symbol: '﷼',
        buyRate: 1,
        sellRate: 1,
        lastUpdate: new Date().toISOString(),
        source: 'يدوي',
        active: true,
      });
    }

    return mapped;
  }, [currencyRows, exchangeRows]);

  /* ─── Map exchange rates ─── */
  const exchangeRates: ExchangeRate[] = useMemo(
    () => exchangeRows.map((r) => ({
      name: r.name,
      from_currency: r.from_currency,
      to_currency: r.to_currency,
      exchange_rate: r.exchange_rate,
      date: r.date,
    })),
    [exchangeRows]
  );

  /* ─── Compute REAL exchange gain/loss from Journal Entries ─── */
  const exchangeEntries: ExchangeEntry[] = useMemo(() => {
    const entries: ExchangeEntry[] = [];

    // Group JE account rows by parent (Journal Entry)
    const jeAccountMap = new Map<string, Record<string, unknown>[]>();
    for (const acct of jeAccountRows) {
      const parent = String(acct.parent ?? '');
      if (!jeAccountMap.has(parent)) jeAccountMap.set(parent, []);
      jeAccountMap.get(parent)!.push(acct);
    }

    // For each multi-currency JE, compute exchange gain/loss
    for (const je of jeRows) {
      const jeName = String(je.name ?? '');
      const accounts = jeAccountMap.get(jeName) ?? [];
      const postingDate = String(je.posting_date ?? '');

      for (const acct of accounts) {
        const currency = String(acct.currency ?? '');
        // Only consider non-YER currencies
        if (!currency || currency === 'YER') continue;

        const exchangeRate = Number(acct.exchange_rate ?? 0);
        const debitInAcctCurrency = Number(acct.debit_in_account_currency ?? 0);
        const creditInAcctCurrency = Number(acct.credit_in_account_currency ?? 0);
        const debitBase = Number(acct.debit ?? 0);
        const creditBase = Number(acct.credit ?? 0);

        // If the account has a non-YER currency and has amounts
        const originalAmount = Math.abs(debitInAcctCurrency || creditInAcctCurrency);
        if (originalAmount === 0 || exchangeRate === 0) continue;

        // Find the current exchange rate for this currency
        const currentRate = exchangeRows.find(
          (e) => e.from_currency === currency && e.to_currency === 'YER'
        )?.exchange_rate ?? exchangeRate;

        // Compute difference: (current rate - entry rate) * original amount
        const rateDiff = currentRate - exchangeRate;
        const diffAmount = Math.round(rateDiff * originalAmount * 100) / 100;

        // Only include if there's an actual difference
        if (Math.abs(diffAmount) < 0.01) continue;

        entries.push({
          id: `${jeName}-${acct.name ?? ''}`,
          date: postingDate,
          doctype: 'قيد يومية',
          docname: jeName,
          currency,
          originalAmount,
          rateAtCreation: exchangeRate,
          rateAtSettlement: currentRate,
          difference: diffAmount,
          type: diffAmount >= 0 ? 'ربح' : 'خسارة',
        });
      }
    }

    return entries;
  }, [jeRows, jeAccountRows, exchangeRows]);

  /* ── KPI Calculations ── */
  const activeCurrenciesCount = useMemo(
    () => currencies.filter((c) => c.active).length,
    [currencies]
  );

  const lastRateUpdate = useMemo(() => {
    const dates = currencies
      .filter((c) => c.active)
      .map((c) => new Date(c.lastUpdate).getTime())
      .filter((d) => !isNaN(d));
    if (dates.length === 0) return '—';
    const maxDate = new Date(Math.max(...dates));
    return formatDate(maxDate.toISOString());
  }, [currencies]);

  const totalGains = useMemo(
    () => exchangeEntries.filter((e) => e.type === 'ربح').reduce((s, e) => s + e.difference, 0),
    [exchangeEntries]
  );

  const totalLosses = useMemo(
    () => exchangeEntries.filter((e) => e.type === 'خسارة').reduce((s, e) => s + Math.abs(e.difference), 0),
    [exchangeEntries]
  );

  const netGainLoss = useMemo(
    () => totalGains - totalLosses,
    [totalGains, totalLosses]
  );

  /* ── Handlers ── */

  const handleToggleActive = useCallback(
    async (code: string) => {
      const currency = currencies.find((c) => c.code === code);
      if (!currency) return;
      const newActive = !currency.active;
      try {
        await updateCurrencyMutation.mutateAsync({
          name: code,
          doc: { enabled: newActive ? 1 : 0 },
        });
        toast.success(currency.active ? 'تم تعطيل العملة' : 'تم تفعيل العملة', { description: `${currency.nameAr} (${code})` });
      } catch (err) {
        toast.error('خطأ', { description: String(err) });
      }
    },
    [currencies, updateCurrencyMutation, toast]
  );

  const handleOpenEdit = useCallback((currency: Currency) => {
    setEditingCurrency(currency);
    setEditBuyRate(String(currency.buyRate));
    setEditSellRate(String(currency.sellRate));
    setEditDialogOpen(true);
  }, []);

  const handleSaveRate = useCallback(async () => {
    if (!editingCurrency) return;
    const buy = parseFloat(editBuyRate);
    const sell = parseFloat(editSellRate);
    if (isNaN(buy) || isNaN(sell) || buy <= 0 || sell <= 0) {
      toast.error('خطأ', { description: 'يرجى إدخال أسعار صحيحة' });
      return;
    }

    try {
      const today = new Date().toISOString().slice(0, 10);

      // Save buy rate (currency → YER)
      await createExchangeMutation.mutateAsync({
        doctype: 'Currency Exchange',
        from_currency: editingCurrency.code,
        to_currency: 'YER',
        exchange_rate: buy,
        date: today,
      });

      // Save sell rate (YER → currency)
      if (sell > 0) {
        await createExchangeMutation.mutateAsync({
          doctype: 'Currency Exchange',
          from_currency: 'YER',
          to_currency: editingCurrency.code,
          exchange_rate: 1 / sell,
          date: today,
        });
      }

      toast.success('تم تحديث السعر', { description: `${editingCurrency.nameAr} (${editingCurrency.code})` });
      setEditDialogOpen(false);
      setEditingCurrency(null);
    } catch (err) {
      toast.error('خطأ', { description: String(err) });
    }
  }, [editingCurrency, editBuyRate, editSellRate, createExchangeMutation, toast]);

  const handleUpdateRates = useCallback(async () => {
    refetchCurrencies();
    refetchExchange();
    toast.success('تم تحديث الأسعار', { description: 'تم جلب الأسعار من ERPNext بنجاح' });
  }, [refetchCurrencies, refetchExchange, toast]);

  /* ── Conversion Logic ── */

  const getRate = useCallback(
    (code: string): number => {
      const c = currencies.find((cur) => cur.code === code);
      return c ? c.buyRate : 1;
    },
    [currencies]
  );

  const convertResult = useMemo(() => {
    const amount = parseFloat(convertAmount) || 0;
    const fromRate = getRate(fromCurrency);
    const toRate = getRate(toCurrency);
    if (fromRate === 0 || toRate === 0) return { result: 0, rateUsed: 0 };
    const rateUsed = toRate / fromRate;
    const result = amount * rateUsed;
    return { result, rateUsed };
  }, [convertAmount, fromCurrency, toCurrency, getRate]);

  const handleSwapCurrencies = useCallback(() => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }, [fromCurrency, toCurrency]);

  /* ── Quick Conversion Table ── */

  const quickConversions = useMemo(() => {
    const fromRate = getRate(fromCurrency);
    return currencies
      .filter((c) => c.active && c.code !== fromCurrency)
      .map((c) => ({
        code: c.code,
        nameAr: c.nameAr,
        symbol: c.symbol,
        rate: fromRate > 0 ? c.buyRate / fromRate : 0,
      }));
  }, [currencies, fromCurrency, getRate]);

  /* ── Active currencies for converter dropdown ── */
  const activeCurrenciesList = useMemo(
    () => currencies.filter((c) => c.active),
    [currencies]
  );

  const loading = curLoading || exLoading || jeLoading || jeAcctLoading;
  const error = curError || exError;
  const saving = createExchangeMutation.isPending;

  /* ── DataTable Columns ── */

  const rateColumns: Column<Currency>[] = useMemo(
    () => [
      {
        key: 'nameAr',
        header: 'العملة',
        sortable: true,
        render: (_v, row: Currency) => (
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
              {row.code}
            </span>
            <span className="font-medium">{row.nameAr}</span>
          </div>
        ),
      },
      {
        key: 'code',
        header: 'الرمز',
        sortable: true,
        render: (_v, row: Currency) => (
          <span className="tabular-nums text-muted-foreground">{row.symbol} {row.code}</span>
        ),
      },
      {
        key: 'buyRate',
        header: 'سعر الشراء',
        sortable: true,
        render: (_v, row: Currency) => (
          <span className="tabular-nums font-medium text-primary dark:text-emerald-400">
            {row.buyRate.toLocaleString('ar-YE', { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: 'sellRate',
        header: 'سعر البيع',
        sortable: true,
        render: (_v, row: Currency) => (
          <span className="tabular-nums font-medium text-destructive dark:text-rose-400">
            {row.sellRate.toLocaleString('ar-YE', { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: 'lastUpdate',
        header: 'آخر تحديث',
        sortable: true,
        render: (_v, row: Currency) => (
          <span className="text-muted-foreground text-[11px]">{formatDate(row.lastUpdate)}</span>
        ),
      },
      {
        key: 'source',
        header: 'المصدر',
        sortable: true,
        render: (_v, row: Currency) => (
          <StatusBadge
            status={row.source === 'API' ? 'Active' : 'Draft'}
            className={row.source === 'API' ? 'bg-info/12 text-info ring-1 ring-inset ring-info/25' : 'bg-secondary text-secondary-foreground ring-1 ring-inset ring-border/40'}
          />
        ),
      },
      {
        key: 'active',
        header: 'الحالة',
        render: (_v, row: Currency) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={row.active}
              onCheckedChange={() => handleToggleActive(row.code)}
              disabled={row.code === 'YER'}
              aria-label={`تفعيل/تعطيل ${row.nameAr}`}
            />
            <span className={`text-xs font-medium ${row.active ? 'text-primary dark:text-emerald-400' : 'text-muted-foreground'}`}>
              {row.active ? 'مفعّلة' : 'معطّلة'}
            </span>
          </div>
        ),
      },
    ],
    [handleToggleActive]
  );

  const exchangeColumns: Column<ExchangeEntry>[] = useMemo(
    () => [
      {
        key: 'date',
        header: 'التاريخ',
        sortable: true,
        render: (_v, row: ExchangeEntry) => (
          <span className="text-muted-foreground">{formatDate(row.date)}</span>
        ),
      },
      {
        key: 'doctype',
        header: 'المستند',
        sortable: true,
        render: (_v, row: ExchangeEntry) => (
          <div>
            <div className="text-xs font-medium">{row.doctype}</div>
            <div className="text-[10px] text-muted-foreground">{row.docname}</div>
          </div>
        ),
      },
      {
        key: 'currency',
        header: 'العملة',
        sortable: true,
        render: (_v, row: ExchangeEntry) => {
          const cur = currencies.find((c) => c.code === row.currency);
          return (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-[9px] font-bold text-primary">
                {row.currency}
              </span>
              {cur?.nameAr ?? row.currency}
            </span>
          );
        },
      },
      {
        key: 'originalAmount',
        header: 'المبلغ الأصلي',
        sortable: true,
        render: (_v, row: ExchangeEntry) => (
          <span className="tabular-nums font-medium">
            {row.originalAmount.toLocaleString('ar-YE', { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: 'rateAtCreation',
        header: 'السعر عند الإنشاء',
        sortable: true,
        render: (_v, row: ExchangeEntry) => (
          <span className="tabular-nums text-muted-foreground">
            {row.rateAtCreation.toLocaleString('ar-YE', { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: 'rateAtSettlement',
        header: 'السعر الحالي',
        sortable: true,
        render: (_v, row: ExchangeEntry) => (
          <span className="tabular-nums text-muted-foreground">
            {row.rateAtSettlement.toLocaleString('ar-YE', { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: 'difference',
        header: 'الفرق',
        sortable: true,
        render: (_v, row: ExchangeEntry) => (
          <span className={`tabular-nums font-semibold ${row.type === 'ربح' ? 'text-primary dark:text-emerald-400' : 'text-destructive dark:text-rose-400'}`}>
            {row.difference > 0 ? '+' : ''}{row.difference.toLocaleString('ar-YE')}
          </span>
        ),
      },
      {
        key: 'type',
        header: 'النوع',
        sortable: true,
        render: (_v, row: ExchangeEntry) => (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
              row.type === 'ربح'
                ? 'bg-primary/10 text-primary ring-primary/25'
                : 'bg-destructive/10 text-destructive ring-destructive/25'
            }`}
          >
            {row.type === 'ربح' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {row.type}
          </span>
        ),
      },
    ],
    [currencies]
  );

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جارٍ تحميل بيانات العملات...</p>
        </div>
      </div>
    );
  }

  /* ── Render ── */

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      {/* Page Header */}
      <PageHeader
        title="متعدد العملات"
        description="إدارة أسعار الصرف وتحويل العملات وتتبع أرباح وخسائر التحويل"
        iconify="solar:dollar-minimalistic-bold-duotone"
        accent="success"
        breadcrumbs={[
          { label: 'المحاسبة', href: '/accounting' },
          { label: 'متعدد العملات' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleUpdateRates}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              تحديث الأسعار
            </Button>
          </div>
        }
      />

      <ListQueryAlert error={error} onRetry={() => { refetchCurrencies(); refetchExchange(); }} />

      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard
          title="العملات المفعّلة"
          value={activeCurrenciesCount}
          icon={DollarSign}
          accent="success"
          change={activeCurrenciesCount > 0 ? 9 : 0}
          changeType={activeCurrenciesCount > 0 ? 'positive' : 'neutral'}
          description={`من إجمالي ${currencies.length} عملات مسجلة`}
        />
        <KpiCard
          title="آخر تحديث للأسعار"
          value={lastRateUpdate}
          icon={RefreshCw}
          accent="info"
          description="آخر تحديث من ERPNext"
        />
        <KpiCard
          title="إجمالي أرباح التحويل"
          value={formatCurrency(totalGains)}
          icon={TrendingUp}
          accent="success"
          description="أرباح فروق أسعار الصرف"
        />
        <KpiCard
          title="إجمالي خسائر التحويل"
          value={formatCurrency(totalLosses)}
          icon={TrendingDown}
          accent="destructive"
          description="خسائر فروق أسعار الصرف"
        />
      </KpiStrip>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="rates" className="gap-1.5 text-xs">
            <DollarSign className="h-3.5 w-3.5" />
            أسعار الصرف
          </TabsTrigger>
          <TabsTrigger value="converter" className="gap-1.5 text-xs">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            محول العملات
          </TabsTrigger>
          <TabsTrigger value="gainloss" className="gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" />
            أرباح وخسائر التحويل
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Exchange Rates ─── */}
        <TabsContent value="rates" className="space-y-0">
          <DataTable<Currency>
            data={currencies}
            columns={rateColumns}
            tableId="multi-currency-rates"
            searchable
            pageSize={10}
            addLabel="تحديث الأسعار"
            onAdd={handleUpdateRates}
            onEdit={handleOpenEdit}
            exportFileName="اسعار_الصرف"
            printTitle="أسعار الصرف"
            getRowId={(row) => (row as Currency).code}
          />
        </TabsContent>

        {/* ─── Tab 2: Currency Converter ─── */}
        <TabsContent value="converter" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Converter Card */}
            <Card className="border-border/40">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary dark:text-emerald-400">
                    <ArrowRightLeft className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">محول العملات</h3>
                    <p className="text-[11px] text-muted-foreground">تحويل المبالغ بين العملات المختلفة</p>
                  </div>
                </div>

                {/* From Currency */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">من عملة</Label>
                  <Select value={fromCurrency} onValueChange={setFromCurrency}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCurrenciesList.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.nameAr} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">المبلغ</Label>
                  <Input
                    type="number"
                    dir="ltr"
                    className="h-9 text-lg tabular-nums font-semibold"
                    value={convertAmount}
                    onChange={(e) => setConvertAmount(e.target.value)}
                    placeholder="أدخل المبلغ"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-10 rounded-full border-dashed"
                    onClick={handleSwapCurrencies}
                    aria-label="تبديل العملات"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* To Currency */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">إلى عملة</Label>
                  <Select value={toCurrency} onValueChange={setToCurrency}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCurrenciesList.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.nameAr} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Result */}
                <div className="rounded-xl border border-primary/20 bg-primary/5/50 dark:bg-primary/5 p-5 text-center space-y-2">
                  <p className="text-xs text-muted-foreground">النتيجة</p>
                  <p className="text-3xl sm:text-4xl font-bold tabular-nums text-primary">
                    {convertResult.result.toLocaleString('ar-YE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">{convertAmount}</span> {currencies.find((c) => c.code === fromCurrency)?.nameAr ?? fromCurrency} = <span className="font-semibold text-foreground">{convertResult.result.toLocaleString('ar-YE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span> {currencies.find((c) => c.code === toCurrency)?.nameAr ?? toCurrency}
                  </p>
                  <p className="text-[10px] text-muted-foreground pt-1">
                    سعر الصرف المستخدم: 1 {fromCurrency} = {convertResult.rateUsed.toLocaleString('ar-YE', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {toCurrency}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Conversion Table */}
            <Card className="border-border/40">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1 dark:text-sky-400">
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">جدول التحويل السريع</h3>
                    <p className="text-[11px] text-muted-foreground">
                      1 {currencies.find((c) => c.code === fromCurrency)?.nameAr ?? fromCurrency} بالعملات الأخرى
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-h-[460px] overflow-y-auto custom-scrollbar">
                  {quickConversions.map((qc) => (
                    <div
                      key={qc.code}
                      className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2.5 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                          {qc.code}
                        </span>
                        <div>
                          <p className="text-xs font-medium">{qc.nameAr}</p>
                          <p className="text-[10px] text-muted-foreground">{qc.symbol}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold tabular-nums">
                          {qc.rate.toLocaleString('ar-YE', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Tab 3: Exchange Gain/Loss ─── */}
        <TabsContent value="gainloss" className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-primary/20 bg-primary/5/30 dark:bg-primary/5">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-emerald-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">إجمالي الأرباح</p>
                  <p className="text-xl font-bold tabular-nums text-primary dark:text-emerald-400">
                    {formatCurrency(totalGains)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/20 bg-destructive/5/30 dark:bg-destructive/5">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive dark:text-rose-400">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">إجمالي الخسائر</p>
                  <p className="text-xl font-bold tabular-nums text-destructive dark:text-rose-400">
                    {formatCurrency(totalLosses)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={`border-border/40 ${netGainLoss >= 0 ? 'bg-primary/5/30 dark:bg-primary/5' : 'bg-destructive/5/30 dark:bg-destructive/5'}`}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${netGainLoss >= 0 ? 'bg-primary/10 text-primary dark:text-emerald-400' : 'bg-destructive/10 text-destructive dark:text-rose-400'}`}>
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">الصافي</p>
                  <p className={`text-xl font-bold tabular-nums ${netGainLoss >= 0 ? 'text-primary dark:text-emerald-400' : 'text-destructive dark:text-rose-400'}`}>
                    {netGainLoss >= 0 ? '+' : ''}{formatCurrency(netGainLoss)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exchange Gain/Loss DataTable */}
          <DataTable<ExchangeEntry>
            data={exchangeEntries}
            columns={exchangeColumns}
            tableId="exchange-gain-loss"
            searchable
            pageSize={10}
            exportFileName="ارباح_خسائر_التحويل"
            printTitle="أرباح وخسائر التحويل"
            getRowId={(row) => (row as ExchangeEntry).id}
          />

          {exchangeEntries.length === 0 && (
            <Card className="border-border/40">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  لا توجد أرباح أو خسائر تحويل حالياً. تظهر هذه البيانات عند وجود قيود يومية متعددة العملات مع فروق أسعار صرف.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Edit Rate Dialog ─── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              تعديل سعر الصرف — {editingCurrency?.nameAr} ({editingCurrency?.code})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Current rates display */}
            {editingCurrency && (
              <div className="rounded-lg border border-border/40 bg-muted/30 p-3 space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground">الأسعار الحالية</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">سعر الشراء:</span>
                  <span className="tabular-nums font-medium text-primary">{editingCurrency.buyRate.toLocaleString('ar-YE', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">سعر البيع:</span>
                  <span className="tabular-nums font-medium text-destructive">{editingCurrency.sellRate.toLocaleString('ar-YE', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            {/* Buy Rate */}
            <div className="space-y-2">
              <Label htmlFor="editBuyRate" className="text-sm font-medium">
                سعر الشراء (ريال يمني)
              </Label>
              <Input
                id="editBuyRate"
                type="number"
                dir="ltr"
                className="h-9 tabular-nums"
                value={editBuyRate}
                onChange={(e) => setEditBuyRate(e.target.value)}
                placeholder="أدخل سعر الشراء"
                min="0"
                step="0.01"
              />
            </div>

            {/* Sell Rate */}
            <div className="space-y-2">
              <Label htmlFor="editSellRate" className="text-sm font-medium">
                سعر البيع (ريال يمني)
              </Label>
              <Input
                id="editSellRate"
                type="number"
                dir="ltr"
                className="h-9 tabular-nums"
                value={editSellRate}
                onChange={(e) => setEditSellRate(e.target.value)}
                placeholder="أدخل سعر البيع"
                min="0"
                step="0.01"
              />
            </div>

            {/* Spread display */}
            {editBuyRate && editSellRate && (
              <div className="rounded-lg border border-border/40 p-3 space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground">الفرق (السبريد)</p>
                {(() => {
                  const buy = parseFloat(editBuyRate);
                  const sell = parseFloat(editSellRate);
                  if (isNaN(buy) || isNaN(sell)) return null;
                  const spread = sell - buy;
                  const spreadPct = buy > 0 ? ((spread / buy) * 100).toFixed(4) : '0';
                  return (
                    <div className="flex justify-between text-xs">
                      <span className={spread >= 0 ? 'text-primary' : 'text-destructive'}>
                        {spread.toLocaleString('ar-YE', { minimumFractionDigits: 2 })} ({spreadPct}%)
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="text-xs"
              disabled={saving}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSaveRate}
              className="text-xs gap-1.5"
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DollarSign className="h-3.5 w-3.5" />}
              حفظ السعر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
