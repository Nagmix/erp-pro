'use client';

import { useState, useMemo, useCallback } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  DollarSign, Users, CalendarClock, RefreshCcw, ChevronDown, ChevronUp,
  FileText, Download, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';
import { useDocList, useCreateDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ──────────────── Types ──────────────── */

type SalesInv = {
  name: string;
  customer: string;
  customer_name?: string;
  outstanding_amount: number;
  due_date?: string;
  posting_date?: string;
  grand_total?: number;
  status?: string;
  docstatus?: number;
};

type PurchaseInv = {
  name: string;
  supplier: string;
  supplier_name?: string;
  outstanding_amount: number;
  due_date?: string;
  posting_date?: string;
  grand_total?: number;
  status?: string;
  docstatus?: number;
};

type JournalEntry = {
  name: string;
  posting_date?: string;
  user_remark?: string;
  docstatus?: number;
};

type PartyGroup = {
  partyName: string;
  partyId: string;
  totalOutstanding: number;
  invoiceCount: number;
  oldestDate: string;
  daysOverdue: number;
  invoices: (SalesInv | PurchaseInv)[];
};

/* ──────────────── Helpers ──────────────── */

function daysBetween(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000));
}

function getStatusInfo(daysOverdue: number): { label: string; color: string } {
  if (daysOverdue <= 0) return { label: 'في الموعد', color: 'bg-primary/10 text-emerald-700 dark:bg-primary/10 dark:text-emerald-300' };
  if (daysOverdue <= 30) return { label: 'متأخر قليلاً', color: 'bg-chart-2/10 text-amber-700 dark:bg-chart-2/10 dark:text-amber-300' };
  if (daysOverdue <= 90) return { label: 'متأخر', color: 'bg-chart-4/10 text-orange-700 dark:bg-chart-4/10 dark:text-orange-300' };
  return { label: 'متأخر جداً', color: 'bg-destructive/10 text-rose-700 dark:bg-destructive/10 dark:text-rose-300' };
}

function getScheduleStatus(dueDate: string): { label: string; color: string; icon: 'green' | 'yellow' | 'red' } {
  if (!dueDate) return { label: '—', color: 'bg-muted text-muted-foreground', icon: 'green' };
  const days = daysBetween(dueDate);
  if (days <= 0) return { label: 'في الموعد', color: 'bg-primary/10 text-emerald-700', icon: 'green' };
  if (days <= 7) return { label: 'مستحق قريباً', color: 'bg-chart-2/10 text-amber-700', icon: 'yellow' };
  return { label: 'متأخر', color: 'bg-destructive/10 text-rose-700', icon: 'red' };
}

/* ──────────────── Main Component ──────────────── */

export default function DebtReschedulePage() {
  const { company } = useDefaultCompanyName();
  const [partyType, setPartyType] = useState<'customer' | 'supplier'>('customer');
  const [expandedParty, setExpandedParty] = useState<string | null>(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [rescheduleParty, setRescheduleParty] = useState<PartyGroup | null>(null);
  const [scheduleView, setScheduleView] = useState(false);

  const [rescheduleForm, setRescheduleForm] = useState({
    installments: 3,
    startDate: '',
    installmentAmount: 0,
    reason: '',
  });

  // ── Fetch Sales Invoices (Customer Debts) ──
  const {
    data: salesInvoices,
    isLoading: loadingSales,
    isError: isErrorSales,
    error: errorSales,
    refetch: refetchSales,
  } = useDocList<SalesInv>('Sales Invoice', {
    fields: ['name', 'customer', 'customer_name', 'outstanding_amount', 'due_date', 'posting_date', 'grand_total', 'status', 'docstatus'],
    filters: [['outstanding_amount', '>', 0], ['docstatus', '=', 1]] as string[][],
    limit: 500,
    order_by: 'due_date asc',
  });

  // ── Fetch Purchase Invoices (Supplier Debts) ──
  const {
    data: purchaseInvoices,
    isLoading: loadingPurchase,
    isError: isErrorPurchase,
    error: errorPurchase,
    refetch: refetchPurchase,
  } = useDocList<PurchaseInv>('Purchase Invoice', {
    fields: ['name', 'supplier', 'supplier_name', 'outstanding_amount', 'due_date', 'posting_date', 'grand_total', 'status', 'docstatus'],
    filters: [['outstanding_amount', '>', 0], ['docstatus', '=', 1]] as string[][],
    limit: 500,
    order_by: 'due_date asc',
  });

  // ── Fetch rescheduled Journal Entries ──
  const {
    data: journalEntries,
    refetch: refetchJournal,
  } = useDocList<JournalEntry>('Journal Entry', {
    fields: ['name', 'posting_date', 'user_remark', 'docstatus'],
    filters: [['user_remark', 'like', '%إعادة جدولة%']],
    limit: 200,
    order_by: 'creation desc',
  });

  const createJournalMutation = useCreateDoc('Journal Entry');

  // ── Group invoices by party ──
  const partyGroups = useMemo<PartyGroup[]>(() => {
    if (partyType === 'customer') {
      const invoices = salesInvoices || [];
      const map = new Map<string, PartyGroup>();
      for (const inv of invoices) {
        const key = inv.customer;
        if (!map.has(key)) {
          map.set(key, {
            partyName: inv.customer_name || inv.customer,
            partyId: inv.customer,
            totalOutstanding: 0,
            invoiceCount: 0,
            oldestDate: inv.due_date || inv.posting_date || '',
            daysOverdue: 0,
            invoices: [],
          });
        }
        const group = map.get(key)!;
        group.totalOutstanding += Number(inv.outstanding_amount) || 0;
        group.invoiceCount += 1;
        group.invoices.push(inv);
        const d = inv.due_date || inv.posting_date || '';
        if (d && d < group.oldestDate) group.oldestDate = d;
      }
      for (const group of map.values()) {
        group.daysOverdue = daysBetween(group.oldestDate);
      }
      return Array.from(map.values()).sort((a, b) => b.daysOverdue - a.daysOverdue);
    } else {
      const invoices = purchaseInvoices || [];
      const map = new Map<string, PartyGroup>();
      for (const inv of invoices) {
        const key = inv.supplier;
        if (!map.has(key)) {
          map.set(key, {
            partyName: inv.supplier_name || inv.supplier,
            partyId: inv.supplier,
            totalOutstanding: 0,
            invoiceCount: 0,
            oldestDate: inv.due_date || inv.posting_date || '',
            daysOverdue: 0,
            invoices: [],
          });
        }
        const group = map.get(key)!;
        group.totalOutstanding += Number(inv.outstanding_amount) || 0;
        group.invoiceCount += 1;
        group.invoices.push(inv);
        const d = inv.due_date || inv.posting_date || '';
        if (d && d < group.oldestDate) group.oldestDate = d;
      }
      for (const group of map.values()) {
        group.daysOverdue = daysBetween(group.oldestDate);
      }
      return Array.from(map.values()).sort((a, b) => b.daysOverdue - a.daysOverdue);
    }
  }, [partyType, salesInvoices, purchaseInvoices]);

  // ── KPIs ──
  const totalOutstanding = useMemo(() => partyGroups.reduce((s, g) => s + g.totalOutstanding, 0), [partyGroups]);
  const numDebtors = partyGroups.length;
  const avgDaysOverdue = useMemo(() => {
    if (partyGroups.length === 0) return 0;
    return Math.round(partyGroups.reduce((s, g) => s + g.daysOverdue, 0) / partyGroups.length);
  }, [partyGroups]);
  const rescheduledThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    return (journalEntries || []).filter(j => j.posting_date && j.posting_date >= monthStart).length;
  }, [journalEntries]);

  // ── Reschedule handlers ──
  const openRescheduleDialog = useCallback((group: PartyGroup) => {
    setRescheduleParty(group);
    setSelectedInvoices(group.invoices.map(inv => inv.name));
    setRescheduleForm({
      installments: 3,
      startDate: new Date().toISOString().slice(0, 10),
      installmentAmount: Math.ceil(group.totalOutstanding / 3),
      reason: '',
    });
    setRescheduleDialogOpen(true);
  }, []);

  const handleReschedule = useCallback(() => {
    if (!rescheduleParty || !company) return;
    if (!rescheduleForm.startDate) {
      toast.error('يرجى تحديد تاريخ البدء');
      return;
    }
    if (rescheduleForm.installments < 1) {
      toast.error('عدد الأقساط يجب أن يكون 1 على الأقل');
      return;
    }

    const partyTypeValue = partyType === 'customer' ? 'Customer' : 'Supplier';
    const remark = `إعادة جدولة ديون ${rescheduleParty.partyName} — ${rescheduleForm.installments} قسط بمبلغ ${formatCurrency(rescheduleForm.installmentAmount)} — السبب: ${rescheduleForm.reason || 'غير محدد'}`;

    const debtorAccount = partyType === 'customer' ? 'Debtors - ' + company : 'Creditors - ' + company;
    const rescheduleAccount = partyType === 'customer' ? 'Creditors - ' + company : 'Debtors - ' + company;

    const doc: Record<string, unknown> = {
      doctype: 'Journal Entry',
      company,
      posting_date: rescheduleForm.startDate,
      voucher_type: 'Journal Entry',
      title: `إعادة جدولة - ${rescheduleParty.partyName}`,
      user_remark: remark,
      accounts: [
        {
          account: debtorAccount,
          party_type: partyTypeValue,
          party: rescheduleParty.partyId,
          debit_in_account_currency: 0,
          credit_in_account_currency: rescheduleParty.totalOutstanding,
        },
        {
          account: rescheduleAccount,
          party_type: partyTypeValue,
          party: rescheduleParty.partyId,
          debit_in_account_currency: rescheduleParty.totalOutstanding,
          credit_in_account_currency: 0,
        },
      ],
    };

    createJournalMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء قيد إعادة الجدولة بنجاح');
        setRescheduleDialogOpen(false);
        setRescheduleParty(null);
        setSelectedInvoices([]);
        void refetchJournal();
      },
      onError: () => {
        toast.error('فشل إنشاء قيد إعادة الجدولة');
      },
    });
  }, [rescheduleParty, company, partyType, rescheduleForm, createJournalMutation, refetchJournal]);

  const toggleInvoiceSelect = useCallback((invName: string) => {
    setSelectedInvoices(prev =>
      prev.includes(invName) ? prev.filter(n => n !== invName) : [...prev, invName]
    );
  }, []);

  const exportReport = useCallback(() => {
    const headers = partyType === 'customer'
      ? ['العميل', 'إجمالي المستحق', 'عدد الفواتير', 'أقدم فاتورة', 'أيام التأخير', 'الحالة']
      : ['المورد', 'إجمالي المستحق', 'عدد الفواتير', 'أقدم فاتورة', 'أيام التأخير', 'الحالة'];

    const rows = partyGroups.map(g => [
      g.partyName,
      g.totalOutstanding.toFixed(2),
      String(g.invoiceCount),
      g.oldestDate,
      String(g.daysOverdue),
      getStatusInfo(g.daysOverdue).label,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debt-reschedule-${partyType}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [partyGroups, partyType]);

  // ── Columns for party table ──
  const partyColumns: Column<PartyGroup>[] = useMemo(() => [
    {
      key: 'partyName',
      header: partyType === 'customer' ? 'العميل' : 'المورد',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-medium">{row.partyName}</span>
        </div>
      ),
    },
    {
      key: 'totalOutstanding',
      header: 'إجمالي المستحق',
      sortable: true,
      render: (v) => <span className="font-semibold tabular-nums">{formatCurrency(Number(v) || 0)}</span>,
    },
    {
      key: 'invoiceCount',
      header: 'عدد الفواتير',
      sortable: true,
      render: (v) => <Badge variant="outline" className="text-[10px] border-0 bg-muted/50">{String(v)}</Badge>,
    },
    {
      key: 'oldestDate',
      header: 'أقدم فاتورة',
      sortable: true,
      render: (v) => <span className="text-xs">{v ? formatDate(String(v)) : '—'}</span>,
    },
    {
      key: 'daysOverdue',
      header: 'أيام التأخير',
      sortable: true,
      render: (v) => {
        const days = Number(v) || 0;
        return (
          <span className={cn('text-xs font-semibold', days > 30 ? 'text-destructive' : days > 0 ? 'text-chart-2' : 'text-primary')}>
            {days > 0 ? `${days} يوم` : '—'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'الحالة',
      width: 'w-28',
      render: (_, row) => {
        const info = getStatusInfo(row.daysOverdue);
        return <Badge variant="outline" className={cn('text-[10px] font-semibold border-0 px-2 py-0.5', info.color)}>{info.label}</Badge>;
      },
    },
  ], [partyType]);

  // ── Invoice detail columns ──
  const invoiceColumns: Column<SalesInv | PurchaseInv>[] = useMemo(() => [
    { key: 'name', header: 'رقم الفاتورة', sortable: true, render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
    { key: 'outstanding_amount', header: 'المبلغ المستحق', sortable: true, render: (v) => <span className="font-semibold text-xs tabular-nums">{formatCurrency(Number(v) || 0)}</span> },
    { key: 'posting_date', header: 'تاريخ الفاتورة', sortable: true, render: (v) => <span className="text-xs">{v ? formatDate(String(v)) : '—'}</span> },
    { key: 'due_date', header: 'تاريخ الاستحقاق', sortable: true, render: (v) => <span className="text-xs">{v ? formatDate(String(v)) : '—'}</span> },
    { key: 'grand_total', header: 'الإجمالي', render: (v) => <span className="text-xs tabular-nums">{formatCurrency(Number(v) || 0)}</span> },
  ], []);

  // ── Reschedule schedule data ──
  const scheduleItems = useMemo(() => {
    if (!journalEntries) return [];
    return (journalEntries || []).map(je => {
      const remark = je.user_remark || '';
      const match = remark.match(/إعادة جدولة ديون (.+?) — (\d+) قسط/);
      return {
        name: je.name,
        partyName: match?.[1] || '—',
        installments: match?.[2] || '—',
        postingDate: je.posting_date || '',
        remark,
        status: je.docstatus === 1 ? 'مُقدّم' : je.docstatus === 2 ? 'ملغي' : 'مسودة',
      };
    });
  }, [journalEntries]);

  const isLoading = partyType === 'customer' ? loadingSales : loadingPurchase;
  const isError = partyType === 'customer' ? isErrorSales : isErrorPurchase;
  const error = partyType === 'customer' ? errorSales : errorPurchase;
  const refetch = partyType === 'customer' ? refetchSales : refetchPurchase;

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="إعادة جدولة الديون"
        description="إدارة الديون المتأخرة وإعادة جدولة سداد الفواتير المستحقة للعملاء والموردين."
        iconify="solar:wallet-money-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'إعادة جدولة الديون' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={exportReport}>
              <Download className="h-3.5 w-3.5" />
              تصدير التقرير
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setScheduleView(!scheduleView)}>
              <CalendarClock className="h-3.5 w-3.5" />
              {scheduleView ? 'عرض الديون' : 'جدول السداد'}
            </Button>
          </div>
        }
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      {/* KPI Strip */}
      {/* Toggle Customer / Supplier */}
      <Tabs value={partyType} onValueChange={(v) => setPartyType(v as 'customer' | 'supplier')}>
        <TabsList className="bg-muted/35">
          <TabsTrigger value="customer" className="text-xs gap-1.5">
            <Users className="h-3.5 w-3.5" /> عملاء
          </TabsTrigger>
          <TabsTrigger value="supplier" className="text-xs gap-1.5">
            <Users className="h-3.5 w-3.5" /> موردين
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {scheduleView ? (
        /* ═══════ Payment Schedule View ═══════ */
        <PageShell padded className="space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 px-4 pt-4">
            <CalendarClock className="h-4 w-4 text-primary" />
            جدول سداد الديون المعاد جدولتها
          </h3>
          {scheduleItems.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center px-4 pb-4">
              <p className="text-sm text-muted-foreground">لا توجد ديون معاد جدولتها بعد</p>
            </div>
          ) : (
            <div className="space-y-3 px-4 pb-4">
              {scheduleItems.map((item) => {
                const statusInfo = getScheduleStatus(item.postingDate);
                return (
                  <Card key={item.name} className="rounded-xl border border-border/40 bg-card shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="text-sm font-semibold">{item.partyName}</span>
                            <Badge variant="outline" className={cn('text-[10px] border-0 px-1.5 py-0', statusInfo.color)}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            قيد: <span className="font-mono text-primary">{item.name}</span> — {item.installments} قسط
                          </p>
                          <p className="text-[11px] text-muted-foreground max-w-md truncate">{item.remark}</p>
                        </div>
                        <div className="text-start shrink-0 space-y-1">
                          <p className="text-xs text-muted-foreground">{item.postingDate ? formatDate(item.postingDate) : '—'}</p>
                          <Badge variant="outline" className={cn('text-[10px] border-0', item.status === 'مُقدّم' ? 'bg-primary/10 text-emerald-700' : 'bg-muted text-muted-foreground')}>
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </PageShell>
      ) : (
        /* ═══════ Party Table with expandable rows ═══════ */
        <PageShell padded={false}>
          <div className="px-4 pt-4">
            <DataTable
              data={partyGroups}
              columns={partyColumns}
              searchable
              loading={isLoading}
              tableId="debt-reschedule-parties"
              exportFileName="debt-reschedule.csv"
              printTitle="إعادة جدولة الديون"
              onView={(row) => {
                setExpandedParty(expandedParty === row.partyId ? null : row.partyId);
              }}
              onEdit={(row) => openRescheduleDialog(row)}
            />
          </div>

          {/* Expanded invoice details */}
          {expandedParty && (() => {
            const group = partyGroups.find(g => g.partyId === expandedParty);
            if (!group) return null;
            return (
              <div className="border-t border-border/30 mx-4 mt-2 mb-4">
                <div className="flex items-center justify-between py-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <ChevronUp className="h-4 w-4 text-primary" />
                    فواتير: {group.partyName}
                    <Badge variant="outline" className="text-[10px] border-0 bg-muted/50">{group.invoiceCount}</Badge>
                  </h4>
                  <Button size="sm" className="gap-1.5 text-xs" onClick={() => openRescheduleDialog(group)}>
                    <RefreshCcw className="h-3.5 w-3.5" />
                    إعادة جدولة
                  </Button>
                </div>
                <DataTable
                  data={group.invoices}
                  columns={invoiceColumns}
                  searchable={false}
                  pageSize={5}
                  tableId="debt-reschedule-invoices"
                />
              </div>
            );
          })()}
        </PageShell>
      )}

      {/* ═══════ Reschedule Dialog ═══════ */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <RefreshCcw className="h-5 w-5" />
              </div>
              <div>
                <span>إعادة جدولة الديون</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  {rescheduleParty?.partyName}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            {/* Invoice selection */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-warning/10 flex items-center justify-center"><DollarSign className="h-3 w-3 text-warning" /></span>
                  اختيار الفواتير
                </h4>
              </div>
              <div className="p-4 space-y-2 bg-card/50 max-h-48 overflow-y-auto">
                {rescheduleParty?.invoices.map((inv) => (
                  <label key={inv.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors">
                    <Checkbox
                      checked={selectedInvoices.includes(inv.name)}
                      onCheckedChange={() => toggleInvoiceSelect(inv.name)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono">{inv.name}</span>
                        <span className="text-xs font-semibold tabular-nums">{formatCurrency(Number(inv.outstanding_amount) || 0)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        استحقاق: {inv.due_date ? formatDate(inv.due_date) : '—'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="px-4 py-2 bg-muted/20 border-t border-border/30 text-xs text-muted-foreground flex items-center justify-between">
                <span>محدد: {selectedInvoices.length} فاتورة</span>
                <span className="font-semibold tabular-nums">
                  إجمالي: {formatCurrency(
                    rescheduleParty?.invoices
                      .filter(inv => selectedInvoices.includes(inv.name))
                      .reduce((s, inv) => s + (Number(inv.outstanding_amount) || 0), 0) || 0
                  )}
                </span>
              </div>
            </fieldset>

            {/* Payment plan */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-success/10 flex items-center justify-center"><CalendarClock className="h-3 w-3 text-success" /></span>
                  خطة السداد الجديدة
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">عدد الأقساط</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={rescheduleForm.installments}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value) || 1);
                        setRescheduleForm(prev => ({
                          ...prev,
                          installments: val,
                          installmentAmount: Math.ceil(
                            (rescheduleParty?.invoices
                              .filter(inv => selectedInvoices.includes(inv.name))
                              .reduce((s, inv) => s + (Number(inv.outstanding_amount) || 0), 0) || 0) / val
                          ),
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">تاريخ البدء <span className="text-destructive text-xs">*</span></Label>
                    <DatePicker
                      value={rescheduleForm.startDate}
                      onChange={(v) => setRescheduleForm(prev => ({ ...prev, startDate: v }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">مبلغ القسط</Label>
                  <Input
                    type="number"
                    min={0}
                    value={rescheduleForm.installmentAmount}
                    onChange={(e) => setRescheduleForm(prev => ({ ...prev, installmentAmount: Number(e.target.value) || 0 }))}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    الإجمالي: {formatCurrency(rescheduleForm.installmentAmount * rescheduleForm.installments)}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">سبب إعادة الجدولة</Label>
                  <Textarea
                    placeholder="أدخل سبب إعادة الجدولة..."
                    value={rescheduleForm.reason}
                    onChange={(e) => setRescheduleForm(prev => ({ ...prev, reason: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>
            </fieldset>

            {/* Installment preview */}
            {rescheduleForm.startDate && rescheduleForm.installments > 0 && (
              <div className="rounded-xl border border-border/40 p-3 space-y-2">
                <h5 className="text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  معاينة جدول الأقساط
                </h5>
                <div className="space-y-1">
                  {Array.from({ length: Math.min(rescheduleForm.installments, 12) }).map((_, i) => {
                    const date = new Date(rescheduleForm.startDate);
                    date.setMonth(date.getMonth() + i);
                    const status = getScheduleStatus(date.toISOString().slice(0, 10));
                    return (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/20 last:border-0">
                        <span className="text-muted-foreground">القسط {i + 1}</span>
                        <span dir="ltr">{formatDate(date.toISOString())}</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(rescheduleForm.installmentAmount)}</span>
                        <Badge variant="outline" className={cn('text-[9px] px-1 py-0 border-0', status.color)}>
                          {status.label}
                        </Badge>
                      </div>
                    );
                  })}
                  {rescheduleForm.installments > 12 && (
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                      ... و{rescheduleForm.installments - 12} قسط إضافي
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setRescheduleDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button
              onClick={handleReschedule}
              disabled={createJournalMutation.isPending || selectedInvoices.length === 0}
              className="gap-1.5 min-w-[130px]"
            >
              {createJournalMutation.isPending ? (
                <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />جاري الحفظ...</>
              ) : 'تأكيد إعادة الجدولة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
