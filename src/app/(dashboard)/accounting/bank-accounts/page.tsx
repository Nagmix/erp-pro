'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDocList, useDeleteDoc } from '@/lib/client/hooks';
import { apiCreateDoc, apiUpdateDoc } from '@/lib/client/api';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ErpTabbedForm, type ErpTabDef } from '@/components/erp/erp-tabbed-form';
import {
  Landmark,
  RefreshCw,
  PlusCircle,
  Receipt,
  Upload,
  CheckCircle2,
  XCircle,
  RotateCcw,
  GitCompareArrows,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { buildBankTransaction } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { formatCurrency } from '@/lib/core/helpers';
import { translateAccountName } from '@/lib/core/arabic-labels';

/* ───────────── Types ───────────── */

type BankAcc = {
  name: string;
  bank: string;
  company: string;
  account: string;
  bank_account_no?: string;
  account_name?: string;
};

type BankD = { name: string; swift_number?: string };

type Mode = { name: string; type: string };

type BtRow = {
  name: string;
  date: string;
  deposit: number;
  withdrawal: number;
  description: string;
  reference_number: string;
  status?: string;
};

type ParsedBankRow = {
  date: string;
  deposit: number;
  withdrawal: number;
  description: string;
  reference_number: string;
};

type ReconcileMatch = {
  matchKey: string;
  bankTransactionName: string;
  txRef: string;
  txDate: string;
  txAmount: number;
  matchedDoctype: string;
  matchedName: string;
  matchedDate: string;
  confidence: 'high' | 'medium';
};

/* ───────────── Helpers ───────────── */

const RECON_DECISIONS_STORAGE_KEY = 'erp_pro_bank_recon_decisions_v2';

function loadReconDecisionsFromStorage(): Record<string, 'confirmed' | 'rejected'> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(RECON_DECISIONS_STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    return p && typeof p === 'object' ? (p as Record<string, 'confirmed' | 'rejected'>) : {};
  } catch {
    return {};
  }
}

function parseBankCsv(text: string): ParsedBankRow[] {
  const lines = text.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: ParsedBankRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const parts = line.split(/[;\t,]/).map((s) => s.trim());
    if (parts.length < 2) continue;
    const head = (parts[0] || '').toLowerCase();
    if (i === 0 && (head.includes('date') || head.includes('تاريخ') || head.includes('posting'))) continue;
    let dateStr = parts[0]!;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [d, m, y] = dateStr.split('/');
      dateStr = `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
    }
    const dep = parseFloat(String(parts[1] ?? '0').replace(/,/g, '')) || 0;
    const wit = parseFloat(String(parts[2] ?? '0').replace(/,/g, '')) || 0;
    const desc = parts[3] || 'استيراد كشف';
    const ref = parts[4] || `import-${i}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
    out.push({ date: dateStr, deposit: dep, withdrawal: wit, description: String(desc), reference_number: String(ref) });
  }
  return out;
}

/* ───────────── Page Component ───────────── */

export default function BankAccountsPage() {
  const { company: defaultCompany } = useDefaultCompanyName();
  const queryClient = useQueryClient();

  /* ── Bank accounts state ── */
  const [openBankDialog, setOpenBankDialog] = useState(false);
  const [openBankAccDialog, setOpenBankAccDialog] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankSwift, setBankSwift] = useState('');
  const [accBank, setAccBank] = useState('');
  const [accCompany, setAccCompany] = useState('');
  const [accGlAccount, setAccGlAccount] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [accLabel, setAccLabel] = useState('');
  const [createBusy, setCreateBusy] = useState<'bank' | 'account' | 'mode' | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBankAcc, setSelectedBankAcc] = useState<BankAcc | null>(null);

  /* ── Payment methods state ── */
  const [openModeDialog, setOpenModeDialog] = useState(false);
  const [modeName, setModeName] = useState('');
  const [modeType, setModeType] = useState<'Cash' | 'Bank' | 'General'>('Bank');

  /* ── Reconciliation state ── */
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bankAccForImport, setBankAccForImport] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [importStats, setImportStats] = useState<{ files: number; rows: number; ok: number; skipped: number } | null>(null);
  const [reconDecisions, setReconDecisions] = useState<Record<string, 'confirmed' | 'rejected'>>({});
  const [reconStorageReady, setReconStorageReady] = useState(false);
  const [reconBusyKey, setReconBusyKey] = useState<string | null>(null);

  const deleteBankAccMutation = useDeleteDoc('Bank Account');

  useEffect(() => {
    if (defaultCompany) queueMicrotask(() => setAccCompany(defaultCompany));
  }, [defaultCompany]);

  useEffect(() => {
    queueMicrotask(() => {
      setReconDecisions(loadReconDecisionsFromStorage());
      setReconStorageReady(true);
    });
  }, []);

  useEffect(() => {
    if (!reconStorageReady || typeof window === 'undefined') return;
    try {
      localStorage.setItem(RECON_DECISIONS_STORAGE_KEY, JSON.stringify(reconDecisions));
    } catch { /* ignore quota */ }
  }, [reconDecisions, reconStorageReady]);

  /* ── Data fetching ── */
  const { data: banks = [], isLoading: bLoad, isError: bErr, error: bErrObj, refetch: r1 } = useDocList<BankD>('Bank', {
    fields: ['name', 'swift_number'],
    limit: 200,
  });

  const { data: bankAccounts = [], isLoading: aLoad, isError: aErr, error: aErrObj, refetch: r2 } = useDocList<BankAcc>(
    'Bank Account',
    { fields: ['name', 'bank', 'company', 'account', 'bank_account_no', 'account_name'], limit: 500 }
  );

  const { data: modes = [], isLoading: mLoad, refetch: r3 } = useDocList<Mode>('Mode of Payment', {
    fields: ['name', 'type'],
    limit: 200,
  });

  const {
    data: recentBt = [],
    isLoading: btLoad,
    refetch: rBt,
  } = useDocList<BtRow>('Bank Transaction', {
    fields: ['name', 'date', 'deposit', 'withdrawal', 'description', 'reference_number', 'status'],
    order_by: 'modified desc',
    limit: 80,
  });

  const { data: paymentEntries = [] } = useDocList<{ name: string; posting_date?: string; paid_amount?: number; reference_no?: string }>(
    'Payment Entry',
    { fields: ['name', 'posting_date', 'paid_amount', 'reference_no'], order_by: 'posting_date desc', limit: 800 }
  );

  const { data: glEntries = [] } = useDocList<{ name: string; posting_date?: string; debit?: number; credit?: number; voucher_no?: string }>(
    'GL Entry',
    { fields: ['name', 'posting_date', 'debit', 'credit', 'voucher_no'], order_by: 'posting_date desc', limit: 1200 }
  );

  const isErr = bErr || aErr;
  const err = bErr ? bErrObj : aErr ? aErrObj : null;
  const loading = bLoad || aLoad || mLoad;

  const refreshAll = useCallback(() => {
    void r1(); void r2(); void r3(); void rBt();
  }, [r1, r2, r3, rBt]);

  // KPIs
  const totalDeposits = recentBt.reduce((s, t) => s + (Number(t.deposit) || 0), 0);
  const totalWithdrawals = recentBt.reduce((s, t) => s + (Number(t.withdrawal) || 0), 0);

  /* ── Column definitions ── */
  const aCols: Column<BankAcc>[] = useMemo(() => [
    { key: 'name', header: 'اسم الحساب', sortable: true },
    { key: 'bank', header: 'البنك' },
    { key: 'bank_account_no', header: 'رقم الحساب' },
    { key: 'company', header: 'الشركة' },
    {
      key: 'actions',
      header: 'إجراءات',
      width: 'w-24',
      render: (_, row) => (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-[10px] text-destructive"
          onClick={() => { setSelectedBankAcc(row); setDeleteDialogOpen(true); }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      ),
    },
  ], []);

  const btCols: Column<BtRow>[] = useMemo(() => [
    { key: 'date', header: 'التاريخ', render: (v) => String(v || '—') },
    { key: 'deposit', header: 'الإيداع', render: (v) => <span className="text-green-600 font-semibold tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span> },
    { key: 'withdrawal', header: 'السحب', render: (v) => <span className="text-destructive font-semibold tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span> },
    { key: 'description', header: 'الوصف' },
    { key: 'reference_number', header: 'المرجع' },
    {
      key: 'status',
      header: 'الحالة',
      render: (v) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          'Pending': { label: 'معلّق', color: 'bg-chart-2/10 text-chart-2' },
          'Reconciled': { label: 'مطابق', color: 'bg-primary/10 text-green-700' },
          'Unreconciled': { label: 'غير مطابق', color: 'bg-destructive/10 text-red-700' },
        };
        const info = statusMap[String(v)] || { label: String(v || '—'), color: 'bg-muted text-muted-foreground' };
        return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${info.color}`}>{info.label}</span>;
      },
    },
  ], []);

  /* ── Create handlers ── */
  const createBank = useCallback(async () => {
    if (!bankName.trim()) {
      toast.error('اسم البنك مطلوب');
      return;
    }
    setCreateBusy('bank');
    try {
      await apiCreateDoc('Bank', { bank_name: bankName.trim(), swift_number: bankSwift.trim() || undefined });
      setOpenBankDialog(false);
      setBankName(''); setBankSwift('');
      toast.success('تم إنشاء البنك');
      void r1();
    } catch (e) {
      toast.error('تعذر إنشاء البنك', { description: String((e as Error).message || e) });
    } finally { setCreateBusy(null); }
  }, [bankName, bankSwift, r1, toast]);

  const createBankAccount = useCallback(async () => {
    const company = accCompany || defaultCompany;
    if (!accBank || !company || !accGlAccount || !accNumber.trim()) {
      toast.error('يرجى تعبئة الحقول المطلوبة');
      return;
    }
    setCreateBusy('account');
    try {
      await apiCreateDoc('Bank Account', {
        bank: accBank, company, account: accGlAccount,
        bank_account_no: accNumber.trim(), account_name: accLabel.trim() || accNumber.trim(),
        is_company_account: 1,
      });
      setOpenBankAccDialog(false);
      setAccBank(''); setAccGlAccount(''); setAccNumber(''); setAccLabel('');
      toast.success('تم إنشاء الحساب البنكي');
      void r2();
    } catch (e) {
      toast.error('تعذر إنشاء الحساب البنكي', { description: String((e as Error).message || e) });
    } finally { setCreateBusy(null); }
  }, [accBank, accCompany, accGlAccount, accLabel, accNumber, defaultCompany, r2, toast]);

  const createMode = useCallback(async () => {
    if (!modeName.trim()) {
      toast.error('اسم طريقة الدفع مطلوب');
      return;
    }
    setCreateBusy('mode');
    try {
      await apiCreateDoc('Mode of Payment', { mode_of_payment: modeName.trim(), type: modeType });
      setOpenModeDialog(false);
      setModeName(''); setModeType('Bank');
      toast.success('تم إنشاء طريقة الدفع');
      void r3();
    } catch (e) {
      toast.error('تعذر إنشاء طريقة الدفع', { description: String((e as Error).message || e) });
    } finally { setCreateBusy(null); }
  }, [modeName, modeType, r3, toast]);

  /* ── CSV import handler ── */
  const onCsvFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || !bankAccForImport) {
        toast.error('اختر حساباً بنكياً أولاً');
        return;
      }
      setImportBusy(true);
      const allRows: ParsedBankRow[] = [];
      for (const file of Array.from(files)) {
        const text = await file.text();
        allRows.push(...parseBankCsv(text));
      }
      const uniqMap = new Map<string, ParsedBankRow>();
      for (const row of allRows) {
        const key = `${row.date}|${row.reference_number}|${row.deposit}|${row.withdrawal}`;
        if (!uniqMap.has(key)) uniqMap.set(key, row);
      }
      const rows = [...uniqMap.values()];
      if (!rows.length) {
        setImportBusy(false);
        toast.error('لم يُعثر على صفوف صالحة');
        return;
      }
      let ok = 0;
      let skipped = 0;
      for (const r of rows) {
        if (r.deposit <= 0 && r.withdrawal <= 0) { skipped++; continue; }
        const doc = buildBankTransaction({
          date: r.date, bank_account: bankAccForImport,
          deposit: r.deposit, withdrawal: r.withdrawal,
          description: r.description, reference_number: r.reference_number,
        });
        try { await apiCreateDoc('Bank Transaction', doc); ok++; }
        catch (e) {
          toast.success('توقف الاستيراد عند حركة فاشلة');
          break;
        }
      }
      setImportBusy(false);
      setImportStats({ files: files.length, rows: rows.length, ok, skipped });
      void queryClient.invalidateQueries({ queryKey: ['docList', 'Bank Transaction'] });
      void rBt();
      if (ok > 0) toast.success(`تم إنشاء ${ok} حركة كشف`);
    },
    [bankAccForImport, queryClient, rBt, toast]
  );

  /* ── Reconciliation logic ── */
  const reconciliationMatches = useMemo<ReconcileMatch[]>(() => {
    const out: ReconcileMatch[] = [];
    for (const tx of recentBt) {
      const txAmount = Number(tx.deposit || 0) > 0 ? Number(tx.deposit) : Number(tx.withdrawal || 0);
      if (!txAmount) continue;
      const ref = String(tx.reference_number || '').trim();
      const txDate = String(tx.date || '');
      const btName = String(tx.name || '');

      const paymentByRef = paymentEntries.find((p) => ref && String(p.reference_no || '').trim() === ref);
      if (paymentByRef) {
        out.push({
          matchKey: `${btName}|Payment Entry|${paymentByRef.name}`,
          bankTransactionName: btName, txRef: ref || tx.name,
          txDate, txAmount, matchedDoctype: 'Payment Entry',
          matchedName: paymentByRef.name, matchedDate: String(paymentByRef.posting_date || ''),
          confidence: 'high',
        });
        continue;
      }

      const paymentByAmountDate = paymentEntries.find((p) => {
        const amount = Number(p.paid_amount || 0);
        return amount > 0 && Math.abs(amount - txAmount) < 0.01 && String(p.posting_date || '') === txDate;
      });
      if (paymentByAmountDate) {
        out.push({
          matchKey: `${btName}|Payment Entry|${paymentByAmountDate.name}`,
          bankTransactionName: btName, txRef: ref || tx.name,
          txDate, txAmount, matchedDoctype: 'Payment Entry',
          matchedName: paymentByAmountDate.name, matchedDate: String(paymentByAmountDate.posting_date || ''),
          confidence: 'medium',
        });
        continue;
      }

      const glByVoucher = glEntries.find((g) => ref && String(g.voucher_no || '').trim() === ref);
      if (glByVoucher) {
        out.push({
          matchKey: `${btName}|GL Entry|${glByVoucher.name}`,
          bankTransactionName: btName, txRef: ref || tx.name,
          txDate, txAmount, matchedDoctype: 'GL Entry',
          matchedName: glByVoucher.name, matchedDate: String(glByVoucher.posting_date || ''),
          confidence: 'high',
        });
      }
    }
    return out.slice(0, 200);
  }, [recentBt, paymentEntries, glEntries]);

  const confirmReconciliation = useCallback(
    async (row: ReconcileMatch) => {
      setReconBusyKey(row.matchKey);
      try {
        await apiUpdateDoc('Bank Transaction', row.bankTransactionName, { status: 'Reconciled' });
        setReconDecisions((prev) => ({ ...prev, [row.matchKey]: 'confirmed' }));
        void queryClient.invalidateQueries({ queryKey: ['docList', 'Bank Transaction'] });
        void rBt();
        toast.success('تم تأكيد المطابقة');
      } catch (e) {
        toast.error('تعذر تأكيد المطابقة', { description: e instanceof Error ? e.message : String(e) });
      } finally { setReconBusyKey(null); }
    },
    [queryClient, rBt, toast]
  );

  const rejectReconciliation = useCallback(
    async (row: ReconcileMatch) => {
      setReconBusyKey(row.matchKey);
      try {
        await apiUpdateDoc('Bank Transaction', row.bankTransactionName, { status: 'Unreconciled' });
        setReconDecisions((prev) => ({ ...prev, [row.matchKey]: 'rejected' }));
        void queryClient.invalidateQueries({ queryKey: ['docList', 'Bank Transaction'] });
        void rBt();
        toast.success('تم رفض المقترح');
      } catch (e) {
        toast.error('تعذر رفض المطابقة', { description: e instanceof Error ? e.message : String(e) });
      } finally { setReconBusyKey(null); }
    },
    [queryClient, rBt, toast]
  );

  const clearReconciliationDecision = useCallback(
    async (row: ReconcileMatch) => {
      const hadDecision = reconDecisions[row.matchKey];
      setReconBusyKey(row.matchKey);
      try {
        if (hadDecision) {
          await apiUpdateDoc('Bank Transaction', row.bankTransactionName, { status: 'Pending' });
          void queryClient.invalidateQueries({ queryKey: ['docList', 'Bank Transaction'] });
          void rBt();
        }
        setReconDecisions((prevD) => { const next = { ...prevD }; delete next[row.matchKey]; return next; });
        toast.success('أُلغي القرار');
      } catch (e) {
        setReconDecisions((prevD) => { const next = { ...prevD }; delete next[row.matchKey]; return next; });
        toast.error('أُلغي القرار محلياً', { description: e instanceof Error ? e.message : String(e) });
      } finally { setReconBusyKey(null); }
    },
    [queryClient, rBt, reconDecisions, toast]
  );

  const reconStats = useMemo(() => {
    let confirmed = 0;
    let rejected = 0;
    for (const m of reconciliationMatches) {
      const d = reconDecisions[m.matchKey];
      if (d === 'confirmed') confirmed++;
      else if (d === 'rejected') rejected++;
    }
    const pending = reconciliationMatches.length - confirmed - rejected;
    return { confirmed, rejected, pending };
  }, [reconciliationMatches, reconDecisions]);

  const reconCols = useMemo<Column<ReconcileMatch>[]>(
    () => [
      { key: 'bankTransactionName', header: 'حركة الكشف', render: (v) => <span className="font-mono text-[10px]" dir="ltr">{String(v)}</span> },
      { key: 'txRef', header: 'المرجع' },
      { key: 'txDate', header: 'التاريخ' },
      { key: 'txAmount', header: 'المبلغ', render: (v) => <span className="tabular-nums">{formatCurrency(Number(v) || 0)}</span> },
      {
        key: 'matchedDoctype',
        header: 'النوع المطابق',
        render: (v) => {
          const MAP: Record<string, string> = {
            'Payment Entry': 'سند دفع', 'GL Entry': 'قيد دفتر الأستاذ',
            'Sales Invoice': 'فاتورة مبيعات', 'Purchase Invoice': 'فاتورة مشتريات',
            'Journal Entry': 'قيد يومية', 'Expense Claim': 'مطالبة مصروفات',
            'Bank Transaction': 'حركة بنكية',
          };
          return <span>{MAP[String(v)] || String(v || '—')}</span>;
        },
      },
      { key: 'matchedName', header: 'المستند', render: (v) => <span className="font-mono text-[10px]" dir="ltr">{String(v)}</span> },
      { key: 'matchedDate', header: 'تاريخ المستند' },
      { key: 'confidence', header: 'الثقة', render: (v) => (v === 'high' ? 'عالية' : 'متوسطة') },
      {
        key: 'userDecision',
        header: 'القرار',
        render: (_, row) => {
          const d = reconDecisions[row.matchKey];
          if (d === 'confirmed') return <span className="text-primary font-semibold text-[11px]">موافق ✓</span>;
          if (d === 'rejected') return <span className="text-destructive font-semibold text-[11px]">مرفوض ✗</span>;
          return <span className="text-muted-foreground text-[11px]">—</span>;
        },
      },
      {
        key: 'reconActions',
        header: 'إجراء',
        width: 'w-[180px]',
        render: (_, row) => {
          const busy = reconBusyKey === row.matchKey;
          const d = reconDecisions[row.matchKey];
          return (
            <div className="flex flex-wrap items-center justify-end gap-1" dir="ltr">
              <Button type="button" size="sm" variant="outline" className="h-7 px-2 gap-1 text-emerald-700 border-primary/40 hover:bg-chart-3/10" disabled={busy || d === 'confirmed'} onClick={() => void confirmReconciliation(row)}>
                {busy ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}✓
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-7 px-2 gap-1 text-destructive border-destructive/40 hover:bg-destructive/10" disabled={busy || d === 'rejected'} onClick={() => void rejectReconciliation(row)}>
                <XCircle className="h-3 w-3" />✗
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2" disabled={busy || !d} title="إلغاء القرار" onClick={() => void clearReconciliationDecision(row)}>
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          );
        },
      },
    ],
    [reconDecisions, reconBusyKey, confirmReconciliation, rejectReconciliation, clearReconciliationDecision]
  );

  /* ── Render ── */
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isErr ? err : null} onRetry={refreshAll} />

      <PageHeader
        title="البنوك والحسابات البنكية"
        description="إدارة البنوك والحسابات البنكية وحركات الكشف والمطابقة البنكية"
        iconify="solar:bank-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'البنوك والحسابات البنكية' }]}
        actions={
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={refreshAll} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" />
            تحديث
          </Button>
        }
      />

      
      <ErpTabbedForm
        defaultValue="accounts"
        tabs={[
          {
            value: 'accounts',
            label: 'الحسابات البنكية',
            icon: <Landmark className="h-4 w-4" />,
            content: (
              <div className="space-y-4">
                {/* Bank Accounts Table */}
                <Card>
                  <CardHeader className="py-3 flex flex-row flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-sm">الحسابات البنكية</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Dialog open={openBankAccDialog} onOpenChange={setOpenBankAccDialog}>
                        <DialogTrigger asChild>
                          <Button type="button" size="sm" variant="outline" className="gap-1.5">
                            <PlusCircle className="h-3.5 w-3.5" />
                            حساب بنكي جديد
                          </Button>
                        </DialogTrigger>
                        <DialogContent size="lg">
                          <DialogHeader><DialogTitle>إنشاء حساب بنكي</DialogTitle></DialogHeader>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label>البنك *</Label>
                              <ErpLinkCombobox doctype="Bank" value={accBank} onChange={setAccBank} placeholder="اختر البنك" />
                            </div>
                            <div className="space-y-1.5">
                              <Label>الشركة</Label>
                              <div className="text-sm font-semibold">{accCompany || defaultCompany || '—'}</div>
                            </div>
                            <div className="space-y-1.5">
                              <Label>حساب GL *</Label>
                              <ErpLinkCombobox doctype="Account" value={accGlAccount} onChange={setAccGlAccount} placeholder="الحساب المحاسبي" />
                            </div>
                            <div className="space-y-1.5">
                              <Label>رقم الحساب *</Label>
                              <Input value={accNumber} onChange={(e) => setAccNumber(e.target.value)} placeholder="SAxxxxxxxx" dir="ltr" />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                              <Label>اسم العرض (اختياري)</Label>
                              <Input value={accLabel} onChange={(e) => setAccLabel(e.target.value)} placeholder="الحساب الجاري - الرئيسي" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-4">
                            <Button type="button" variant="outline" onClick={() => setOpenBankAccDialog(false)}>إلغاء</Button>
                            <Button type="button" onClick={() => void createBankAccount()} disabled={createBusy === 'account'}>
                              {createBusy === 'account' ? 'جاري الإنشاء...' : 'إنشاء'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      data={bankAccounts}
                      columns={aCols}
                      pageSize={10}
                      searchable
                      loading={aLoad}
                      columnFilters
                      stickyFirstColumn
                      tableId="accounting-bank-accounts"
                      exportFileName="bank-accounts.csv"
                      printTitle="الحسابات البنكية"
                    />
                  </CardContent>
                </Card>

                {/* Banks + Payment Methods */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="py-3 flex flex-row flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-sm">سجل البنوك</CardTitle>
                      <Dialog open={openBankDialog} onOpenChange={setOpenBankDialog}>
                        <DialogTrigger asChild>
                          <Button type="button" size="sm" variant="outline" className="gap-1.5">
                            <PlusCircle className="h-3.5 w-3.5" />
                            بنك جديد
                          </Button>
                        </DialogTrigger>
                        <DialogContent size="md">
                          <DialogHeader><DialogTitle>إنشاء بنك</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <Label>اسم البنك *</Label>
                              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="مثال: البنك الأهلي" />
                            </div>
                            <div className="space-y-1.5">
                              <Label>SWIFT (اختياري)</Label>
                              <Input value={bankSwift} onChange={(e) => setBankSwift(e.target.value)} placeholder="NCBKSARI" dir="ltr" />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" onClick={() => setOpenBankDialog(false)}>إلغاء</Button>
                              <Button type="button" onClick={() => void createBank()} disabled={createBusy === 'bank'}>
                                {createBusy === 'bank' ? 'جاري الإنشاء...' : 'إنشاء'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      <DataTable
                        data={banks}
                        columns={[
                          { key: 'name', header: 'اسم البنك', sortable: true },
                          { key: 'swift_number', header: 'SWIFT' },
                        ]}
                        pageSize={5}
                        searchable
                        loading={bLoad}
                        tableId="accounting-bank-accounts-banks"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-3 flex flex-row flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-sm">طرق الدفع</CardTitle>
                      <Dialog open={openModeDialog} onOpenChange={setOpenModeDialog}>
                        <DialogTrigger asChild>
                          <Button type="button" size="sm" variant="outline" className="gap-1.5">
                            <PlusCircle className="h-3.5 w-3.5" />
                            طريقة دفع جديدة
                          </Button>
                        </DialogTrigger>
                        <DialogContent size="md">
                          <DialogHeader><DialogTitle>إنشاء طريقة دفع</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <Label>اسم طريقة الدفع *</Label>
                              <Input value={modeName} onChange={(e) => setModeName(e.target.value)} placeholder="مثال: تحويل بنكي" />
                            </div>
                            <div className="space-y-1.5">
                              <Label>النوع</Label>
                              <div className="flex gap-3">
                                {(['Cash', 'Bank', 'General'] as const).map((t) => (
                                  <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                                    <input type="radio" name="modeType" checked={modeType === t} onChange={() => setModeType(t)} className="accent-primary" />
                                    {t === 'Cash' ? 'نقد' : t === 'Bank' ? 'بنك' : 'عام'}
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" onClick={() => setOpenModeDialog(false)}>إلغاء</Button>
                              <Button type="button" onClick={() => void createMode()} disabled={createBusy === 'mode'}>
                                {createBusy === 'mode' ? 'جاري الإنشاء...' : 'إنشاء'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      <DataTable
                        data={modes}
                        columns={[
                          { key: 'name', header: 'طريقة الدفع' },
                          { key: 'type', header: 'النوع', render: (v) => (String(v) === 'Bank' ? 'بنك' : String(v) === 'Cash' ? 'نقد' : String(v) === 'General' ? 'عام' : String(v || '-')) },
                        ]}
                        pageSize={5}
                        searchable
                        loading={mLoad}
                        tableId="accounting-bank-accounts-modes"
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            value: 'transactions',
            label: 'حركات البنك',
            icon: <Receipt className="h-4 w-4" />,
            content: (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="py-3 flex flex-row flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-sm">حركات البنك</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" size="sm" variant="outline" className="gap-1.5">
                            <Upload className="h-3.5 w-3.5" />
                            استيراد كشف
                          </Button>
                        </DialogTrigger>
                        <DialogContent dir="rtl" className="max-w-2xl gap-3">
                          <DialogHeader><DialogTitle>استيراد حركات كشف بنكي</DialogTitle></DialogHeader>
                          <div className="space-y-3 text-sm">
                            <p className="text-muted-foreground">
                              ملف CSV/نص بالترتيب: <span dir="ltr">date, deposit, withdrawal, description, ref</span> — السطر الأول يُتخطى إن كان عنواناً.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                              <div className="space-y-1.5">
                                <Label>حساب بنكي *</Label>
                                <ErpLinkCombobox doctype="Bank Account" value={bankAccForImport} onChange={setBankAccForImport} placeholder="مثال: الحساب الجاري" />
                              </div>
                              <div className="space-y-1.5">
                                <Label>ملف</Label>
                                <Input type="file" accept=".csv,.txt" multiple className="cursor-pointer" disabled={importBusy}
                                  onChange={(e) => { void onCsvFiles(e.target.files); e.target.value = ''; }}
                                />
                              </div>
                            </div>
                            {importStats && (
                              <div className="rounded-md border border-border/40 bg-muted/30 p-2 text-[11px] text-muted-foreground">
                                آخر عملية: ملفات {importStats.files} | صفوف صالحة {importStats.rows} | أُنشئ {importStats.ok} | متجاوز {importStats.skipped}
                              </div>
                            )}
                            <div className="flex items-center justify-end gap-2">
                              <Button type="button" variant="ghost" onClick={() => setImportDialogOpen(false)} className="text-muted-foreground">إغلاق</Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      data={recentBt}
                      columns={btCols}
                      pageSize={15}
                      searchable
                      loading={btLoad}
                      columnFilters
                      stickyFirstColumn
                      tableId="accounting-bank-transactions"
                      exportFileName="bank-transactions.csv"
                      printTitle="حركات البنك"
                    />
                  </CardContent>
                </Card>

                {/* Reconciliation */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GitCompareArrows className="h-4 w-4" />
                      المطابقة البنكية
                      <span className="text-[10px] text-muted-foreground font-normal">
                        (مقترحات: {reconciliationMatches.length} | مؤكدة: {reconStats.confirmed} | معلّق: {reconStats.pending})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      data={reconciliationMatches}
                      columns={reconCols}
                      pageSize={10}
                      searchable
                      loading={btLoad}
                      columnFilters
                      stickyFirstColumn
                      tableId="accounting-bank-reconciliation"
                      exportFileName="reconciliation.csv"
                      printTitle="المطابقة البنكية"
                    />
                  </CardContent>
                </Card>
              </div>
            ),
          },
        ]}
      />

      {/* Delete Bank Account Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد حذف الحساب البنكي</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">هل أنت متأكد من حذف الحساب &quot;{selectedBankAcc?.name}&quot;؟</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedBankAcc) {
                  deleteBankAccMutation.mutate(selectedBankAcc.name, {
                    onSuccess: () => { toast.success('تم حذف الحساب البنكي'); setDeleteDialogOpen(false); },
                    onError: () => toast.error('حدث خطأ أثناء الحذف'),
                  });
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
