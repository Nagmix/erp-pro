'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { ErpListDateStatusFilters, type ErpStatusTab } from '@/components/erp/erp-list-date-status-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Building2,
  FileText,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  X,
  Banknote,
  RotateCcw,
  Send,
} from 'lucide-react';
import { useDocList, useUpdateDoc, useCreateDoc } from '@/lib/client/hooks';
import { apiUpdateDoc, apiCreateDoc } from '@/lib/client/api';
import { CHEQUE_LIFECYCLE_FIELD, CHEQUE_LIFECYCLE_OPTIONS, chequeLifecycleLabel } from '@/lib/erp/cheque-lifecycle';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

// ── Types ──
type ChequeRow = {
  name: string;
  payment_type: string;
  posting_date: string;
  party_type: string;
  party: string;
  party_name?: string;
  mode_of_payment: string;
  paid_amount: number;
  reference_no: string;
  reference_date?: string;
  bank_account?: string;
  docstatus: number;
} & Partial<Record<typeof CHEQUE_LIFECYCLE_FIELD, string | undefined>>;

const LIFECYCLE_STAGES = ['Issued', 'Deposited', 'Cleared', 'Bounced'] as const;

const STAGE_COLORS: Record<string, string> = {
  Issued: 'bg-info/12 text-info ring-info/25',
  Deposited: 'bg-warning/12 text-warning ring-warning/25',
  Cleared: 'bg-success/12 text-success ring-success/25',
  Bounced: 'bg-destructive/12 text-destructive ring-destructive/25',
};

const STAGE_ICONS: Record<string, string> = {
  Issued: 'إصدار',
  Deposited: 'إيداع',
  Cleared: 'مقاصة',
  Bounced: 'ارتداد',
};

const BASE_FIELDS: string[] = [
  'name',
  'payment_type',
  'posting_date',
  'party_type',
  'party',
  'party_name',
  'mode_of_payment',
  'paid_amount',
  'reference_no',
  'reference_date',
  'bank_account',
  'docstatus',
  CHEQUE_LIFECYCLE_FIELD,
];

const statusTabs: ErpStatusTab[] = [
  { value: 'all', label: 'الكل' },
  { value: 'Issued', label: 'مصدّر' },
  { value: 'Deposited', label: 'مودع' },
  { value: 'Cleared', label: 'مقاص' },
  { value: 'Bounced', label: 'مرتد' },
];

export default function ChequeWorkflowPage() {
  const qc = useQueryClient();
  const { company: defaultCompany } = useDefaultCompanyName();

  // ── Filters ──
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [bankAccountFilter, setBankAccountFilter] = useState('');
  const [search, setSearch] = useState('');

  // ── Create Dialog ──
  const [createOpen, setCreateOpen] = useState(false);
  const [formParty, setFormParty] = useState('');
  const [formPartyType, setFormPartyType] = useState<'Customer' | 'Supplier'>('Customer');
  const [formRefNo, setFormRefNo] = useState('');
  const [formRefDate, setFormRefDate] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formBank, setFormBank] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  // ── Deposit Dialog ──
  const [depositTarget, setDepositTarget] = useState<ChequeRow | null>(null);
  const [depositBankAccount, setDepositBankAccount] = useState('');
  const [depositDate, setDepositDate] = useState('');
  const [depositing, setDepositing] = useState(false);

  // ── Clear/Bounce Dialog ──
  const [clearBounceTarget, setClearBounceTarget] = useState<{ row: ChequeRow; action: 'Cleared' | 'Bounced' } | null>(null);
  const [processing, setProcessing] = useState(false);

  // ── Reverse Dialog ──
  const [reverseTarget, setReverseTarget] = useState<ChequeRow | null>(null);
  const [reversing, setReversing] = useState(false);

  // ── Data ──
  const { data, isLoading, isError, error, refetch } = useDocList<ChequeRow>('Payment Entry', {
    fields: BASE_FIELDS,
    order_by: 'posting_date desc',
    limit: 500,
  });

  const updatePe = useUpdateDoc('Payment Entry');

  // ── Filter cheques ──
  const allCheques = useMemo(() => {
    const all = data || [];
    return all.filter((p) => {
      const m = (p.mode_of_payment || '').toLowerCase();
      return (
        m.includes('cheque') ||
        m.includes('شيك') ||
        m.includes('check') ||
        m.includes('ck')
      );
    });
  }, [data]);

  // ── Filtered data ──
  const filtered = useMemo(() => {
    let result = allCheques;
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((r) => {
        const stage = r[CHEQUE_LIFECYCLE_FIELD] || '';
        if (statusFilter === 'Issued') return !stage || stage === 'Issued';
        return stage === statusFilter;
      });
    }
    // Date range filter
    if (dateFrom) {
      result = result.filter((r) => r.posting_date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((r) => r.posting_date <= dateTo);
    }
    // Payment type filter
    if (paymentTypeFilter !== 'all') {
      result = result.filter((r) => r.payment_type === paymentTypeFilter);
    }
    // Bank account filter
    if (bankAccountFilter) {
      result = result.filter((r) => r.bank_account === bankAccountFilter);
    }
    // Search
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          (r.reference_no || '').toLowerCase().includes(s) ||
          (r.party_name || r.party || '').toLowerCase().includes(s) ||
          (r.name || '').toLowerCase().includes(s)
      );
    }
    return result;
  }, [allCheques, statusFilter, dateFrom, dateTo, paymentTypeFilter, bankAccountFilter, search]);

  // ── KPIs ──
  const issuedCount = allCheques.filter(
    (r) => !r[CHEQUE_LIFECYCLE_FIELD] || r[CHEQUE_LIFECYCLE_FIELD] === 'Issued'
  ).length;
  const depositedCount = allCheques.filter(
    (r) => r[CHEQUE_LIFECYCLE_FIELD] === 'Deposited'
  ).length;
  const clearedCount = allCheques.filter(
    (r) => r[CHEQUE_LIFECYCLE_FIELD] === 'Cleared'
  ).length;
  const bouncedCount = allCheques.filter(
    (r) => r[CHEQUE_LIFECYCLE_FIELD] === 'Bounced'
  ).length;
  const totalValue = allCheques.reduce((sum, r) => sum + (Number(r.paid_amount) || 0), 0);

  // ── Clear filters ──
  const clearFilters = useCallback(() => {
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
    setPaymentTypeFilter('all');
    setBankAccountFilter('');
  }, []);

  const hasActiveFilters = dateFrom || dateTo || statusFilter !== 'all' || paymentTypeFilter !== 'all' || bankAccountFilter;

  // ── Stage update handler ──
  const updateStage = useCallback(
    async (name: string, stage: string) => {
      await updatePe.mutateAsync({
        name,
        doc: { [CHEQUE_LIFECYCLE_FIELD]: stage },
      });
      void qc.invalidateQueries({ queryKey: ['docList', 'Payment Entry'] });
    },
    [updatePe, qc]
  );

  // ── Deposit handler ──
  const handleDeposit = useCallback(async () => {
    if (!depositTarget || !depositDate) return;
    setDepositing(true);
    try {
      const updateData: Record<string, unknown> = {
        [CHEQUE_LIFECYCLE_FIELD]: 'Deposited',
      };
      if (depositBankAccount) {
        updateData.bank_account = depositBankAccount;
      }
      await apiUpdateDoc('Payment Entry', depositTarget.name, updateData);
      toast.success('تم تحديث حالة الشيك إلى إيداع');
      setDepositTarget(null);
      setDepositBankAccount('');
      setDepositDate('');
      void refetch();
    } catch (e) {
      toast.error((e as Error).message || 'فشل تحديث حالة الشيك');
    } finally {
      setDepositing(false);
    }
  }, [depositTarget, depositBankAccount, depositDate, refetch]);

  // ── Clear/Bounce handler ──
  const handleClearBounce = useCallback(async () => {
    if (!clearBounceTarget) return;
    setProcessing(true);
    try {
      await updateStage(clearBounceTarget.row.name, clearBounceTarget.action);
      toast.success(clearBounceTarget.action === 'Cleared' ? 'تم تأكيد مقاصة الشيك' : 'تم تسجيل ارتداد الشيك');
      setClearBounceTarget(null);
    } catch (e) {
      toast.error((e as Error).message || 'فشل التحديث');
    } finally {
      setProcessing(false);
    }
  }, [clearBounceTarget, updateStage]);

  // ── Reverse (create reversal Journal Entry) ──
  const handleReverse = useCallback(async () => {
    if (!reverseTarget || !defaultCompany) return;
    setReversing(true);
    try {
      const reversalEntry: Record<string, unknown> = {
        doctype: 'Journal Entry',
        company: defaultCompany,
        posting_date: new Date().toISOString().split('T')[0],
        user_remark: `عكس قيد شيك مرتد - ${reverseTarget.reference_no || reverseTarget.name}`,
        accounts: [
          {
            account: reverseTarget.bank_account || 'Creditors',
            credit_in_account_currency: reverseTarget.paid_amount,
          },
          {
            account: reverseTarget.party_type === 'Customer' ? 'Debtors' : 'Creditors',
            debit_in_account_currency: reverseTarget.paid_amount,
          },
        ],
      };
      await apiCreateDoc('Journal Entry', reversalEntry);
      toast.success('تم إنشاء قيد عكس الشيك المرتد');
      setReverseTarget(null);
      void refetch();
    } catch (e) {
      toast.error((e as Error).message || 'فشل إنشاء قيد العكس');
    } finally {
      setReversing(false);
    }
  }, [reverseTarget, defaultCompany, refetch]);

  const resetCreateForm = useCallback(() => {
    setFormParty('');
    setFormPartyType('Customer');
    setFormRefNo('');
    setFormRefDate('');
    setFormAmount('');
    setFormBank('');
    setFormDueDate('');
  }, []);

  // ── Create Cheque handler ──
  const handleCreate = useCallback(async () => {
    if (!formParty || !formRefNo || !formRefDate || !formAmount || !formBank) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const amount = Number(formAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }
    if (!defaultCompany) {
      toast.error('يرجى تحديد الشركة');
      return;
    }

    setCreating(true);
    try {
      const paymentType = formPartyType === 'Customer' ? 'Receive' : 'Pay';
      const payload: Record<string, unknown> = {
        doctype: 'Payment Entry',
        company: defaultCompany,
        payment_type: paymentType,
        party_type: formPartyType,
        party: formParty,
        posting_date: formRefDate,
        paid_amount: amount,
        received_amount: amount,
        mode_of_payment: 'Cheque',
        reference_no: formRefNo,
        reference_date: formRefDate,
        bank: formBank,
        [CHEQUE_LIFECYCLE_FIELD]: 'Issued',
      };
      if (formDueDate) {
        payload.due_date = formDueDate;
      }
      await apiCreateDoc('Payment Entry', payload);
      toast.success('تم تسجيل الشيك بنجاح');
      setCreateOpen(false);
      resetCreateForm();
      void refetch();
    } catch (e) {
      toast.error((e as Error).message || 'فشل تسجيل الشيك');
    } finally {
      setCreating(false);
    }
  }, [formParty, formPartyType, formRefNo, formRefDate, formAmount, formBank, formDueDate, defaultCompany, refetch, resetCreateForm]);

  const getStage = (row: ChequeRow): string => {
    return row[CHEQUE_LIFECYCLE_FIELD] || 'Issued';
  };

  // ── Columns ──
  const columns: Column<ChequeRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'المرجع',
        width: 'w-28',
        render: (v) => <span className="font-mono text-primary font-medium">{String(v)}</span>,
      },
      {
        key: 'party_name',
        header: 'الطرف',
        render: (_v, row) => String(row.party_name || row.party || '—'),
      },
      {
        key: 'reference_no',
        header: 'رقم الشيك',
        render: (v) => <span className="font-mono">{String(v || '—')}</span>,
      },
      {
        key: 'reference_date',
        header: 'تاريخ الشيك',
        render: (v) => (v ? formatDate(String(v)) : '—'),
      },
      {
        key: 'paid_amount',
        header: 'المبلغ',
        render: (v) => (
          <span className="tabular-nums font-semibold">{formatCurrency(Number(v))}</span>
        ),
      },
      {
        key: 'bank_account',
        header: 'الحساب البنكي',
        render: (v) => String(v || '—'),
      },
      {
        key: CHEQUE_LIFECYCLE_FIELD,
        header: 'المرحلة',
        width: 'w-32',
        render: (_v, row) => {
          const stage = getStage(row);
          return (
            <Badge
              variant="outline"
              className={cn('border-0 text-[10px] font-semibold px-2 py-0.5 ring-1 ring-inset', STAGE_COLORS[stage] || STAGE_COLORS.Issued)}
            >
              {STAGE_ICONS[stage] || chequeLifecycleLabel(stage)}
            </Badge>
          );
        },
      },
      {
        key: '_actions',
        header: 'إجراءات',
        width: 'w-48',
        render: (_v, row) => {
          const stage = getStage(row);
          return (
            <div className="flex flex-wrap gap-1">
              {stage === 'Issued' && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 text-[10px] px-2 gap-1"
                  onClick={() => setDepositTarget(row)}
                >
                  <Building2 className="h-3 w-3" />
                  إيداع في البنك
                </Button>
              )}
              {stage === 'Deposited' && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 text-[10px] px-2 gap-1"
                    onClick={() => setClearBounceTarget({ row, action: 'Cleared' })}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    مقاصة
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px] px-2 gap-1 text-destructive"
                    onClick={() => setClearBounceTarget({ row, action: 'Bounced' })}
                  >
                    <XCircle className="h-3 w-3" />
                    ارتداد
                  </Button>
                </>
              )}
              {stage === 'Bounced' && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px] px-2 gap-1 text-warning"
                  onClick={() => setReverseTarget(row)}
                >
                  <RotateCcw className="h-3 w-3" />
                  عكس القيد
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  // ── Lifecycle visual flow ──
  const renderLifecycleFlow = () => {
    const stages = LIFECYCLE_STAGES;
    const counts: Record<string, number> = {
      Issued: issuedCount,
      Deposited: depositedCount,
      Cleared: clearedCount,
      Bounced: bouncedCount,
    };

    return (
      <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5">
        <div className="flex items-center justify-center gap-1 overflow-x-auto py-2">
          {stages.map((stage, i) => (
            <div key={stage} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter(stage === 'Issued' && statusFilter === 'Issued' ? 'all' : stage)}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-all min-w-[80px]',
                  statusFilter === stage
                    ? 'bg-background shadow-md ring-1 ring-border/40'
                    : 'hover:bg-muted/30'
                )}
              >
                <Badge
                  variant="outline"
                  className={cn(
                    'border-0 text-[10px] font-bold px-2.5 py-1 ring-1 ring-inset',
                    STAGE_COLORS[stage]
                  )}
                >
                  {STAGE_ICONS[stage]}
                </Badge>
                <span className="text-lg font-bold tabular-nums">{counts[stage] || 0}</span>
              </button>
              {i < stages.length - 1 && (
                <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="دورة حياة الشيكات"
        description="إدارة كاملة لدورة حياة الشيكات من الإصدار حتى المقاصة أو الارتداد"
        iconify="solar:checkbook-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'دورة الشيكات' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            تسجيل شيك
          </Button>
        }
      />

      {/* KPI Strip */}
      {/* Visual Lifecycle Flow */}
      {renderLifecycleFlow()}

      {/* Unified Filters */}
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
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">نوع الدفع</Label>
              <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                <SelectTrigger className="h-9 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="Receive">استلام</SelectItem>
                  <SelectItem value="Pay">دفع</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">الحساب البنكي</Label>
              <ErpLinkCombobox
                doctype="Bank Account"
                value={bankAccountFilter}
                onChange={setBankAccountFilter}
                placeholder="اختر الحساب البنكي..."
                displayKey="account_name"
                className="h-9 w-48"
              />
            </div>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-xs gap-1"
                onClick={clearFilters}
              >
                <X className="h-3 w-3" />
                مسح الفلاتر
              </Button>
            )}
          </div>
        }
      />

      {/* Search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="بحث برقم الشيك أو الطرف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={filtered}
        columns={columns}
        searchable={false}
        loading={isLoading}
        tableId="cheque-workflow"
        exportFileName="cheque-workflow.csv"
        printTitle="دورة حياة الشيكات"
      />

      {/* Create Cheque Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm(); }}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <span>تسجيل شيك جديد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  إصدار شيك جديد في دورة الحياة
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">نوع الطرف <span className="text-destructive text-xs">*</span></Label>
                <Select value={formPartyType} onValueChange={(v) => setFormPartyType(v as 'Customer' | 'Supplier')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Customer">عميل</SelectItem>
                    <SelectItem value="Supplier">مورد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {formPartyType === 'Customer' ? 'العميل' : 'المورد'} <span className="text-destructive text-xs">*</span>
                </Label>
                <ErpLinkCombobox
                  doctype={formPartyType}
                  value={formParty}
                  onChange={setFormParty}
                  placeholder={formPartyType === 'Customer' ? 'اختر العميل...' : 'اختر المورد...'}
                  displayKey={formPartyType === 'Customer' ? 'customer_name' : 'supplier_name'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">رقم الشيك <span className="text-destructive text-xs">*</span></Label>
                <Input value={formRefNo} onChange={(e) => setFormRefNo(e.target.value)} placeholder="رقم الشيك" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">تاريخ الشيك <span className="text-destructive text-xs">*</span></Label>
                <Input type="date" dir="ltr" value={formRefDate} onChange={(e) => setFormRefDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">المبلغ <span className="text-destructive text-xs">*</span></Label>
                <Input
                  type="number"
                  dir="ltr"
                  min={0}
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="مثال: 500000"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">البنك <span className="text-destructive text-xs">*</span></Label>
                <ErpLinkCombobox
                  doctype="Bank"
                  value={formBank}
                  onChange={setFormBank}
                  placeholder="اختر البنك..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">تاريخ الاستحقاق</Label>
              <Input type="date" dir="ltr" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => { setCreateOpen(false); resetCreateForm(); }} className="text-muted-foreground">
              إلغاء
            </Button>
            <Button disabled={creating} onClick={handleCreate} className="gap-1.5 min-w-[120px]">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {creating ? 'جارٍ التسجيل...' : 'تسجيل الشيك'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={!!depositTarget} onOpenChange={(open) => { if (!open) setDepositTarget(null); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              إيداع الشيك في البنك
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-lg bg-muted/50 text-xs">
              <p>الشيك: <span className="font-mono font-semibold">{depositTarget?.reference_no}</span></p>
              <p>المبلغ: <span className="font-semibold">{formatCurrency(Number(depositTarget?.paid_amount || 0))}</span></p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الحساب البنكي <span className="text-destructive text-xs">*</span></Label>
              <ErpLinkCombobox
                doctype="Bank Account"
                value={depositBankAccount}
                onChange={setDepositBankAccount}
                placeholder="اختر الحساب البنكي..."
                displayKey="account_name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">تاريخ الإيداع <span className="text-destructive text-xs">*</span></Label>
              <Input type="date" dir="ltr" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setDepositTarget(null)}>إلغاء</Button>
            <Button disabled={depositing || !depositDate} onClick={handleDeposit} className="gap-1.5 min-w-[120px]">
              {depositing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Building2 className="h-3.5 w-3.5" />}
              {depositing ? 'جارٍ الإيداع...' : 'تأكيد الإيداع'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear/Bounce Confirmation Dialog */}
      <AlertDialog open={!!clearBounceTarget} onOpenChange={(open) => { if (!open) setClearBounceTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {clearBounceTarget?.action === 'Cleared' ? 'تأكيد المقاصة' : 'تأكيد الارتداد'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {clearBounceTarget?.action === 'Cleared'
                ? `هل أنت متأكد من تأكيد مقاصة الشيك رقم "${clearBounceTarget?.row.reference_no}" بمبلغ ${formatCurrency(Number(clearBounceTarget?.row.paid_amount || 0))}؟`
                : `هل أنت متأكد من تسجيل ارتداد الشيك رقم "${clearBounceTarget?.row.reference_no}" بمبلغ ${formatCurrency(Number(clearBounceTarget?.row.paid_amount || 0))}؟ سيتم تغيير حالة الشيك إلى مرتد.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearBounce}
              disabled={processing}
              variant={clearBounceTarget?.action === 'Cleared' ? 'success' : 'destructive'}
            >
              {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1" /> : null}
              {clearBounceTarget?.action === 'Cleared' ? 'تأكيد المقاصة' : 'تأكيد الارتداد'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reverse Confirmation Dialog */}
      <AlertDialog open={!!reverseTarget} onOpenChange={(open) => { if (!open) setReverseTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>عكس القيد</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من عكس قيد الشيك المرتد رقم &quot;{reverseTarget?.reference_no}&quot;؟
              سيتم إنشاء قيد يومي عكسي بمبلغ {formatCurrency(Number(reverseTarget?.paid_amount || 0))}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReverse}
              disabled={reversing}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {reversing ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1" /> : <RotateCcw className="h-3.5 w-3.5 me-1" />}
              عكس القيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
