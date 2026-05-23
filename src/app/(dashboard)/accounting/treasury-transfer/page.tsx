'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import {
  ArrowLeftRight,
  Send,
  Wallet,
  Plus,
  ArrowRightLeft,
  CalendarDays,
  Hash,
  MessageSquare,
  Landmark,
  Banknote,
  Info,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';

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

/* ─── Section fieldset header component ─── */

function SectionFieldset({
  legend,
  icon: Icon,
  title,
  accent = 'primary',
  children,
}: {
  legend: string;
  icon: React.ElementType;
  title: string;
  accent?: 'primary' | 'info' | 'success' | 'warning' | 'destructive';
  children: React.ReactNode;
}) {
  const accentMap: Record<string, string> = {
    primary: 'from-primary/[0.04] via-transparent to-transparent',
    info: 'from-info/[0.04] via-transparent to-transparent',
    success: 'from-success/[0.04] via-transparent to-transparent',
    warning: 'from-warning/[0.04] via-transparent to-transparent',
    destructive: 'from-destructive/[0.04] via-transparent to-transparent',
  };
  const iconBgMap: Record<string, string> = {
    primary: 'bg-primary/10',
    info: 'bg-info/10',
    success: 'bg-success/10',
    warning: 'bg-warning/10',
    destructive: 'bg-destructive/10',
  };
  const iconTextMap: Record<string, string> = {
    primary: 'text-primary',
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  };

  return (
    <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
      <legend className="sr-only">{legend}</legend>
      <div className={`bg-gradient-to-l ${accentMap[accent]} px-4 py-2.5 border-b border-border/30`}>
        <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
          <span className={`h-5 w-5 rounded-md ${iconBgMap[accent]} flex items-center justify-center`}>
            <Icon className={`h-3 w-3 ${iconTextMap[accent]}`} />
          </span>
          {title}
        </h4>
      </div>
      <div className="p-4 space-y-4 bg-card/50">
        {children}
      </div>
    </fieldset>
  );
}

/* ─── Form field with icon label ─── */

function FormField({
  label,
  icon: Icon,
  error,
  children,
  required,
  hint,
}: {
  label: string;
  icon: React.ElementType;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground flex items-center gap-2">
        <span className="h-6 w-6 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
        {label}
        {required && <span className="text-destructive text-xs me-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-muted-foreground/60 pe-8">{hint}</p>
      )}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[11px] text-destructive font-medium flex items-center gap-1 pe-8"
          >
            <Info className="h-3 w-3 shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TreasuryTransferPage() {
  const { company: defaultCompany } = useDefaultCompanyName();
  const createJournalEntry = useCreateDoc('Journal Entry');

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);

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

  // Reset form
  const resetForm = useCallback(() => {
    setFromAccount('');
    setToAccount('');
    setAmount('');
    setTransferDate(today);
    setReference('');
    setRemarks('');
  }, [today]);

  // Handle transfer creation
  const handleTransfer = useCallback(async () => {
    if (!fromAccount || !toAccount || !amount) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    if (fromAccount === toAccount) {
      toast.error('لا يمكن التحويل من وإلى نفس الخزينة');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('المبلغ غير صالح');
      return;
    }
    if (!defaultCompany) {
      toast.error('يجب ضبط الشركة الافتراضية أولاً');
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
      toast.success('تم إنشاء تحويل الخزينة بنجاح');
      resetForm();
      setDialogOpen(false);
      void refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('فشل إنشاء التحويل', { description: msg });
    } finally {
      setBusy(false);
    }
  }, [fromAccount, toAccount, amount, remarks, reference, transferDate, defaultCompany, createJournalEntry, refetch, resetForm]);

  // History table columns
  const columns: Column<TransferRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'رقم القيد',
        sortable: true,
        filterable: true,
        render: (v) => {
          const href = docDetailPath('Journal Entry', String(v));
          return href ? <Link href={href} className="font-medium text-primary hover:underline">{String(v)}</Link> : <span>{String(v)}</span>;
        },
      },
      { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => v ? formatDate(String(v)) : '\u2014' },
      {
        key: 'total_debit',
        header: 'المبلغ',
        sortable: true,
        render: (v) => <span className="font-semibold text-chart-1 tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span>,
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
        render: (_v, row) => {
          const href = docDetailPath('Journal Entry', row.name);
          return href ? <Link href={href} className="text-xs text-primary hover:underline">عرض التفاصيل</Link> : <span className="text-xs text-muted-foreground">عرض التفاصيل</span>;
        },
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
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            تحويل جديد
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0">
              <Banknote className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium">إجمالي التحويلات المرحّلة</p>
              <p className="text-lg font-bold tabular-nums" dir="ltr">{formatCurrency(totalTransferred)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium">مسودات معلّقة</p>
              <p className="text-lg font-bold tabular-nums">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium">تحويلات مرحّلة</p>
              <p className="text-lg font-bold tabular-nums">{submittedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Create Transfer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <div>
                <span>إنشاء تحويل جديد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">حدد الخزينة المصدر والهدف والمبلغ لإنشاء قيد تحويل تلقائي</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Section 1: Transfer Details */}
            <SectionFieldset legend="تفاصيل التحويل" icon={ArrowLeftRight} title="تفاصيل التحويل" accent="primary">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="خزينة المصدر" icon={Landmark} required hint="الحساب الذي سيُخصم منه المبلغ">
                  <ErpLinkCombobox
                    doctype="Account"
                    value={fromAccount}
                    onChange={setFromAccount}
                    placeholder="اختر الخزينة المصدر"
                    displayKey="account_name"
                    filters={CASH_FILTER}
                  />
                </FormField>
                <FormField label="خزينة الهدف" icon={Landmark} required hint="الحساب الذي سيُضاف إليه المبلغ">
                  <ErpLinkCombobox
                    doctype="Account"
                    value={toAccount}
                    onChange={setToAccount}
                    placeholder="اختر الخزينة الهدف"
                    displayKey="account_name"
                    filters={CASH_FILTER}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="المبلغ (ر.ي)" icon={Banknote} required hint="مبلغ التحويل">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    dir="ltr"
                    className="h-9"
                  />
                </FormField>
                <FormField label="التاريخ" icon={CalendarDays} hint="تاريخ التحويل">
                  <DatePicker
                    value={transferDate}
                    onChange={setTransferDate}
                    className="h-9"
                  />
                </FormField>
              </div>
            </SectionFieldset>

            {/* Section 2: Additional Info */}
            <SectionFieldset legend="معلومات إضافية" icon={Hash} title="معلومات إضافية" accent="info">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="المرجع" icon={Hash} hint="رقم مرجعي اختياري">
                  <Input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="رقم مرجعي اختياري"
                    className="h-9"
                  />
                </FormField>
                <FormField label="ملاحظات" icon={MessageSquare} hint="سبب التحويل أو تفاصيل إضافية">
                  <Textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="سبب التحويل..."
                    rows={1}
                    className="min-h-[36px] resize-none"
                  />
                </FormField>
              </div>
              <div className="flex items-end">
                <div className="rounded-lg bg-muted/30 p-3 border border-border/30 w-full">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <Info className="h-3 w-3 inline-block me-1 -mt-0.5" />
                    سيتم إنشاء قيد يومية تلقائي بخصم المبلغ من خزينة المصدر وإضافته إلى خزينة الهدف.
                  </p>
                </div>
              </div>
            </SectionFieldset>
          </div>

          <DialogFooter className="gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">
              إلغاء
            </Button>
            <Button onClick={handleTransfer} disabled={busy} className="gap-1.5 min-w-[140px]">
              <Send className="h-3.5 w-3.5" />
              {busy ? 'جارٍ التحويل...' : 'تحويل'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
