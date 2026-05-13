'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/erp/data-table';
import { useDocList } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { formatCurrency, formatDate, STATUS_COLORS } from '@/lib/core/helpers';
import { apiCallMethod, apiCreateDoc } from '@/lib/client/api';
import { prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import {
  LayoutDashboard,
  FileText,
  Quote,
  Truck,
  Receipt,
  Headphones,
  LogOut,
  ArrowLeft,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  Printer,
  Send,
  ShieldCheck,
  Building2,
  User,
  TrendingUp,
  CreditCard,
  Package,
  MessageSquare,
  Plus,
  RefreshCw,
  CalendarDays,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────
type InvoiceRow = {
  name: string;
  customer?: string;
  posting_date?: string;
  due_date?: string;
  grand_total?: number;
  outstanding_amount?: number;
  status?: string;
};
type QuoteRow = {
  name: string;
  party_name?: string;
  transaction_date?: string;
  status?: string;
  docstatus?: number;
  base_grand_total?: number;
};
type SalesOrderRow = {
  name: string;
  customer?: string;
  transaction_date?: string;
  delivery_date?: string;
  status?: string;
  grand_total?: number;
  per_delivered?: number;
  per_billed?: number;
  docstatus?: number;
};
type DeliveryRow = {
  name: string;
  customer?: string;
  posting_date?: string;
  status?: string;
};
type PaymentRow = {
  name: string;
  posting_date?: string;
  paid_amount?: number;
  reference_no?: string;
};
type IssueRow = {
  name: string;
  subject?: string;
  status?: string;
  priority?: string;
  issue_type?: string;
  opening_date?: string;
  resolution_date?: string;
};
type CustomerInfo = {
  name: string;
  customer_name?: string;
  customer_type?: string;
  email_id?: string;
  mobile_no?: string;
  company_name?: string;
};

// ─── Status badge helper ──────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  const s = status || '';
  const color = STATUS_COLORS[s];
  if (color) {
    return (
      <Badge
        className={`${color.bg} ${color.text} border-transparent text-[10px] px-2 py-0.5`}
      >
        {color.label}
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-[10px] px-2 py-0.5">{s || '—'}</Badge>;
}

// ─── KPI Card ─────────────────────────────────────────────────────
function KPICard({
  title,
  value,
  icon: Icon,
  accent,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  subtitle?: string;
}) {
  const accentMap: Record<string, string> = {
    emerald: 'from-emerald-500/15 to-emerald-600/5 text-primary border-emerald-500/20',
    amber: 'from-amber-500/15 to-amber-600/5 text-amber-600 dark:text-amber-400 border-amber-500/20',
    rose: 'from-rose-500/15 to-rose-600/5 text-rose-600 dark:text-rose-400 border-rose-500/20',
    sky: 'from-sky-500/15 to-sky-600/5 text-sky-600 dark:text-sky-400 border-sky-500/20',
  };
  const classes = accentMap[accent] || accentMap.emerald;
  return (
    <Card className={`bg-gradient-to-br ${classes} border`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium opacity-80 mb-1">{title}</p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight truncate">{value}</p>
            {subtitle && (
              <p className="text-[11px] opacity-70 mt-1">{subtitle}</p>
            )}
          </div>
          <div className="rounded-xl bg-white/30 dark:bg-black/10 p-2.5 shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Aging Bar ────────────────────────────────────────────────────
function AgingBar({ label, amount, maxAmount, colorClass }: {
  label: string;
  amount: number;
  maxAmount: number;
  colorClass: string;
}) {
  const pct = maxAmount > 0 ? Math.min(100, (amount / maxAmount) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{formatCurrency(amount)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function PortalPage() {
  const { isAuthenticated, user, checkAuth, logout } = useAuthStore();
  const [customer, setCustomer] = useState('');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [quoteFilter, setQuoteFilter] = useState('all');
  const [statementFrom, setStatementFrom] = useState('');
  const [statementTo, setStatementTo] = useState('');
  const [issueSubject, setIssueSubject] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [issuePriority, setIssuePriority] = useState('Medium');
  const [issueType, setIssueType] = useState('');
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);
  const [approvingQuote, setApprovingQuote] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const sessionReady = isAuthenticated && Boolean(customer.trim());

  // ─── Data Queries ───────────────────────────────────────────
  const invoices = useDocList<InvoiceRow>('Sales Invoice', {
    fields: ['name', 'customer', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status'],
    filters: customer ? [['customer', '=', customer]] : [],
    limit: 200,
    order_by: 'posting_date desc',
    enabled: sessionReady,
  });

  const quotes = useDocList<QuoteRow>('Quotation', {
    fields: ['name', 'party_name', 'transaction_date', 'status', 'docstatus', 'base_grand_total'],
    filters: customer ? [['party_name', '=', customer]] : [],
    limit: 200,
    order_by: 'transaction_date desc',
    enabled: sessionReady,
  });

  const salesOrders = useDocList<SalesOrderRow>('Sales Order', {
    fields: ['name', 'customer', 'transaction_date', 'delivery_date', 'status', 'grand_total', 'per_delivered', 'per_billed', 'docstatus'],
    filters: customer ? [['customer', '=', customer]] : [],
    limit: 200,
    order_by: 'transaction_date desc',
    enabled: sessionReady,
  });

  const deliveries = useDocList<DeliveryRow>('Delivery Note', {
    fields: ['name', 'customer', 'posting_date', 'status'],
    filters: customer ? [['customer', '=', customer]] : [],
    limit: 200,
    order_by: 'posting_date desc',
    enabled: sessionReady,
  });

  const payments = useDocList<PaymentRow>('Payment Entry', {
    fields: ['name', 'posting_date', 'paid_amount', 'reference_no'],
    filters: customer ? [['party', '=', customer], ['party_type', '=', 'Customer'], ['payment_type', '=', 'Receive'], ['docstatus', '=', '1']] : [],
    limit: 200,
    order_by: 'posting_date desc',
    enabled: sessionReady,
  });

  const issues = useDocList<IssueRow>('Issue', {
    fields: ['name', 'subject', 'status', 'priority', 'issue_type', 'opening_date', 'resolution_date'],
    filters: customer ? [['customer', '=', customer]] : [],
    limit: 200,
    order_by: 'opening_date desc',
    enabled: sessionReady,
  });

  const customerDoc = useDocList<CustomerInfo>('Customer', {
    fields: ['name', 'customer_name', 'customer_type', 'email_id', 'mobile_no', 'company_name'],
    filters: customer ? [['name', '=', customer]] : [],
    limit: 1,
    enabled: sessionReady,
  });

  // Load customer info
  useEffect(() => {
    if (customerDoc.data && customerDoc.data.length > 0) {
      setCustomerInfo(customerDoc.data[0]);
    } else {
      setCustomerInfo(null);
    }
  }, [customerDoc.data]);

  // ─── Computed Values ────────────────────────────────────────
  const outstanding = useMemo(
    () => (invoices.data || []).reduce((sum, row) => sum + Number(row.outstanding_amount || 0), 0),
    [invoices.data]
  );

  const totalInvoiced = useMemo(
    () => (invoices.data || []).reduce((sum, row) => sum + Number(row.grand_total || 0), 0),
    [invoices.data]
  );

  const totalPaid = useMemo(
    () => totalInvoiced - outstanding,
    [totalInvoiced, outstanding]
  );

  const openQuotes = useMemo(
    () => (quotes.data || []).filter(q => q.status === 'Open' || q.docstatus === 0).length,
    [quotes.data]
  );

  const pendingDeliveries = useMemo(
    () => (salesOrders.data || []).filter(so => Number(so.per_delivered || 0) < 100 && so.docstatus === 1).length,
    [salesOrders.data]
  );

  const overdueInvoices = useMemo(
    () => (invoices.data || []).filter(inv => inv.status === 'Overdue').length,
    [invoices.data]
  );

  const totalInvoices = useMemo(
    () => (invoices.data || []).length,
    [invoices.data]
  );

  // ─── Aging Summary ──────────────────────────────────────────
  const aging = useMemo(() => {
    const now = new Date();
    const current = { label: 'حالي (0-30)', amount: 0 };
    const d30 = { label: '30-60 يوم', amount: 0 };
    const d60 = { label: '60-90 يوم', amount: 0 };
    const d90 = { label: '90+ يوم', amount: 0 };

    for (const inv of invoices.data || []) {
      const outstandingAmt = Number(inv.outstanding_amount || 0);
      if (outstandingAmt <= 0) continue;
      if (!inv.due_date) {
        current.amount += outstandingAmt;
        continue;
      }
      const dueDate = new Date(inv.due_date);
      const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) current.amount += outstandingAmt;
      else if (diffDays <= 60) d30.amount += outstandingAmt;
      else if (diffDays <= 90) d60.amount += outstandingAmt;
      else d90.amount += outstandingAmt;
    }

    const maxAmt = Math.max(current.amount, d30.amount, d60.amount, d90.amount, 1);
    return { current, d30, d60, d90, maxAmt };
  }, [invoices.data]);

  // ─── Filtered Data ──────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    const list = invoices.data || [];
    if (invoiceFilter === 'all') return list;
    return list.filter(inv => {
      if (invoiceFilter === 'overdue') return inv.status === 'Overdue';
      if (invoiceFilter === 'unpaid') return inv.status === 'Unpaid';
      if (invoiceFilter === 'paid') return inv.status === 'Paid';
      if (invoiceFilter === 'partly') return inv.status === 'Partly Paid';
      return true;
    });
  }, [invoices.data, invoiceFilter]);

  const filteredQuotes = useMemo(() => {
    const list = quotes.data || [];
    if (quoteFilter === 'all') return list;
    return list.filter(q => {
      if (quoteFilter === 'open') return q.status === 'Open' || q.docstatus === 0;
      if (quoteFilter === 'ordered') return q.status === 'Ordered';
      if (quoteFilter === 'expired') return q.status === 'Expired';
      if (quoteFilter === 'lost') return q.status === 'Lost';
      return true;
    });
  }, [quotes.data, quoteFilter]);

  // ─── Statement Data ─────────────────────────────────────────
  const statementData = useMemo(() => {
    const entries: {
      date: string;
      type: string;
      reference: string;
      debit: number;
      credit: number;
      balance: number;
    }[] = [];

    const fromDate = statementFrom ? new Date(statementFrom) : null;
    const toDate = statementTo ? new Date(statementTo + 'T23:59:59') : null;

    const invList = (invoices.data || [])
      .filter(inv => {
        if (!inv.posting_date) return false;
        const d = new Date(inv.posting_date);
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      })
      .map(inv => ({
        date: inv.posting_date || '',
        type: 'فاتورة',
        reference: inv.name,
        debit: Number(inv.grand_total || 0),
        credit: 0,
      }));

    const payList = (payments.data || [])
      .filter(p => {
        if (!p.posting_date) return false;
        const d = new Date(p.posting_date);
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      })
      .map(p => ({
        date: p.posting_date || '',
        type: 'دفعة',
        reference: p.name,
        debit: 0,
        credit: Number(p.paid_amount || 0),
      }));

    const combined = [...invList, ...payList].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    let runningBalance = 0;
    for (const entry of combined) {
      runningBalance += entry.debit - entry.credit;
      entries.push({ ...entry, balance: runningBalance });
    }

    return entries;
  }, [invoices.data, payments.data, statementFrom, statementTo]);

  // ─── Recent Activity ────────────────────────────────────────
  const recentActivity = useMemo(() => {
    const items: { date: string; description: string; type: string }[] = [];

    for (const inv of (invoices.data || []).slice(0, 3)) {
      items.push({
        date: inv.posting_date || '',
        description: `فاتورة ${inv.name} — ${formatCurrency(Number(inv.grand_total || 0))}`,
        type: 'invoice',
      });
    }
    for (const p of (payments.data || []).slice(0, 3)) {
      items.push({
        date: p.posting_date || '',
        description: `دفعة ${p.name} — ${formatCurrency(Number(p.paid_amount || 0))}`,
        type: 'payment',
      });
    }
    for (const so of (salesOrders.data || []).slice(0, 2)) {
      items.push({
        date: so.transaction_date || '',
        description: `أمر بيع ${so.name}`,
        type: 'order',
      });
    }

    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [invoices.data, payments.data, salesOrders.data]);

  // ─── Actions ────────────────────────────────────────────────
  const createPaymentForInvoice = useCallback(async (row: InvoiceRow) => {
    setPayingInvoice(row.name);
    try {
      const mapped = await apiCallMethod<Record<string, unknown>>(
        'erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry',
        { dt: 'Sales Invoice', dn: row.name }
      );
      if (!mapped) throw new Error('تعذر إنشاء Payment Entry');
      await apiCreateDoc('Payment Entry', prepareFrappeDocForCreate(mapped));
      toast.success(`تم إنشاء دفعة للفاتورة: ${row.name}`);
      void invoices.refetch();
      void payments.refetch();
    } catch (error) {
      toast.error((error as Error).message || 'تعذر إنشاء الدفعة');
    } finally {
      setPayingInvoice(null);
    }
  }, [invoices, payments]);

  const approveQuote = useCallback(async (quoteName: string) => {
    setApprovingQuote(quoteName);
    try {
      const mapped = await apiCallMethod<Record<string, unknown>>(
        'erpnext.selling.doctype.quotation.quotation.make_sales_order',
        { source_name: quoteName }
      );
      if (!mapped) throw new Error('تعذر توليد أمر البيع');
      await apiCreateDoc('Sales Order', prepareFrappeDocForCreate(mapped));
      toast.success('تمت الموافقة وتحويل العرض إلى أمر بيع');
      void quotes.refetch();
      void salesOrders.refetch();
    } catch (error) {
      toast.error((error as Error).message || 'تعذر تنفيذ الموافقة');
    } finally {
      setApprovingQuote(null);
    }
  }, [quotes, salesOrders]);

  const createIssue = useCallback(async () => {
    if (!issueSubject.trim()) {
      toast.error('يرجى إدخال موضوع البلاغ');
      return;
    }
    if (!customer.trim()) {
      toast.error('يرجى تحديد العميل أولاً');
      return;
    }
    setSubmittingIssue(true);
    try {
      await apiCreateDoc('Issue', {
        subject: issueSubject.trim(),
        description: issueDesc.trim(),
        priority: issuePriority,
        issue_type: issueType || undefined,
        customer: customer.trim(),
        raised_by: user?.email || undefined,
      });
      toast.success('تم إنشاء البلاغ بنجاح');
      setIssueSubject('');
      setIssueDesc('');
      setIssuePriority('Medium');
      setIssueType('');
      void issues.refetch();
    } catch (error) {
      toast.error((error as Error).message || 'تعذر إنشاء البلاغ');
    } finally {
      setSubmittingIssue(false);
    }
  }, [issueSubject, issueDesc, issuePriority, issueType, customer, user, issues]);

  const printStatement = useCallback(() => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = statementData.map(e => `
      <tr>
        <td>${formatDate(e.date)}</td>
        <td>${e.type}</td>
        <td>${e.reference}</td>
        <td>${e.debit > 0 ? formatCurrency(e.debit) : '—'}</td>
        <td>${e.credit > 0 ? formatCurrency(e.credit) : '—'}</td>
        <td>${formatCurrency(e.balance)}</td>
      </tr>
    `).join('');
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
      <title>كشف حساب — ${customer}</title>
      <style>
        body{font-family:system-ui,sans-serif;font-size:12px;padding:20px;direction:rtl;}
        h1{font-size:18px;margin-bottom:4px;} h2{font-size:14px;color:#666;margin-top:0;}
        table{width:100%;border-collapse:collapse;margin-top:16px;} th,td{border:1px solid #ddd;padding:6px 8px;text-align:right;}
        th{background:#f5f5f5;font-weight:600;} .footer{margin-top:20px;font-size:10px;color:#999;}
      </style>
    </head><body>
      <h1>ERP Pro — كشف حساب</h1>
      <h2>العميل: ${customerInfo?.customer_name || customer}</h2>
      ${statementFrom || statementTo ? `<p>الفترة: ${statementFrom ? formatDate(statementFrom) : 'البداية'} — ${statementTo ? formatDate(statementTo) : 'الآن'}</p>` : ''}
      <table><thead><tr><th>التاريخ</th><th>النوع</th><th>المرجع</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p class="footer">تم إنشاء هذا الكشف تلقائياً من نظام ERP Pro — ${new Date().toLocaleDateString('en-US')}</p>
    </body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  }, [statementData, customer, customerInfo, statementFrom, statementTo]);

  const refetchAll = useCallback(() => {
    void invoices.refetch();
    void quotes.refetch();
    void salesOrders.refetch();
    void deliveries.refetch();
    void payments.refetch();
    void issues.refetch();
    void customerDoc.refetch();
  }, [invoices, quotes, salesOrders, deliveries, payments, issues, customerDoc]);

  // ─── Table Columns ──────────────────────────────────────────
  const invCols: Column<InvoiceRow>[] = [
    { key: 'name', header: 'رقم الفاتورة', sortable: true },
    { key: 'posting_date', header: 'تاريخ الإصدار', sortable: true, render: (v) => v ? formatDate(String(v)) : '—' },
    { key: 'due_date', header: 'تاريخ الاستحقاق', sortable: true, render: (v) => v ? formatDate(String(v)) : '—' },
    { key: 'grand_total', header: 'الإجمالي', sortable: true, render: (v) => formatCurrency(Number(v || 0)) },
    { key: 'outstanding_amount', header: 'المتبقي', sortable: true, render: (v) => formatCurrency(Number(v || 0)) },
    { key: 'status', header: 'الحالة', render: (_v, row) => <StatusBadge status={row.status} /> },
    {
      key: '_pay',
      header: 'الدفع',
      render: (_v, row) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          disabled={Number(row.outstanding_amount || 0) <= 0 || payingInvoice === row.name}
          onClick={() => void createPaymentForInvoice(row)}
        >
          {payingInvoice === row.name ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <CreditCard className="h-3 w-3" />
          )}
          سداد
        </Button>
      ),
    },
  ];

  const qCols: Column<QuoteRow>[] = [
    { key: 'name', header: 'رقم العرض', sortable: true },
    { key: 'transaction_date', header: 'التاريخ', sortable: true, render: (v) => v ? formatDate(String(v)) : '—' },
    { key: 'base_grand_total', header: 'القيمة', sortable: true, render: (v) => formatCurrency(Number(v || 0)) },
    { key: 'status', header: 'الحالة', render: (_v, row) => <StatusBadge status={row.status} /> },
    {
      key: '_actions',
      header: 'إجراء',
      render: (_v, row) => (
        <Button
          size="sm"
          className="h-7 text-xs gap-1"
          disabled={approvingQuote === row.name}
          onClick={() => void approveQuote(row.name)}
        >
          {approvingQuote === row.name ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3 w-3" />
          )}
          موافقة وتحويل
        </Button>
      ),
    },
  ];

  const soCols: Column<SalesOrderRow>[] = [
    { key: 'name', header: 'رقم الأمر', sortable: true },
    { key: 'transaction_date', header: 'تاريخ الطلب', sortable: true, render: (v) => v ? formatDate(String(v)) : '—' },
    { key: 'delivery_date', header: 'تاريخ التسليم', sortable: true, render: (v) => v ? formatDate(String(v)) : '—' },
    { key: 'grand_total', header: 'الإجمالي', sortable: true, render: (v) => formatCurrency(Number(v || 0)) },
    { key: 'status', header: 'الحالة', render: (_v, row) => <StatusBadge status={row.status} /> },
    {
      key: 'per_delivered',
      header: 'نسبة التسليم',
      render: (_v, row) => {
        const pct = Math.round(Number(row.per_delivered || 0));
        return (
          <div className="flex items-center gap-2 min-w-[100px]">
            <Progress value={pct} className="h-2 flex-1" />
            <span className="text-[11px] text-muted-foreground w-10 text-left" dir="ltr">{pct}%</span>
          </div>
        );
      },
    },
  ];

  const dnCols: Column<DeliveryRow>[] = [
    { key: 'name', header: 'رقم الإشعار', sortable: true },
    { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => v ? formatDate(String(v)) : '—' },
    { key: 'status', header: 'الحالة', render: (_v, row) => <StatusBadge status={row.status} /> },
  ];

  const issueCols: Column<IssueRow>[] = [
    { key: 'name', header: 'الرقم', sortable: true },
    { key: 'subject', header: 'الموضوع', sortable: true },
    { key: 'priority', header: 'الأولوية', render: (_v, row) => <StatusBadge status={row.priority} /> },
    { key: 'status', header: 'الحالة', render: (_v, row) => <StatusBadge status={row.status} /> },
    { key: 'opening_date', header: 'تاريخ الفتح', sortable: true, render: (v) => v ? formatDate(String(v)) : '—' },
  ];

  // ─── Login Screen ───────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md space-y-6">
          {/* Branding */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">بوابة العميل</h1>
            <p className="text-sm text-muted-foreground">ERP Pro — نظام إدارة موارد المؤسسات</p>
          </div>

          {/* Login Card */}
          <Card className="border-border/40 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">تسجيل الدخول مطلوب</CardTitle>
              <CardDescription className="text-sm">
                بوابة العميل تستخدم نفس جلسة ERP Pro. سجّل الدخول ثم عد لهذه الصفحة.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>يمكنك استخدام حسابك في النظام للوصول إلى البوابة</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-4 w-4 shrink-0" />
                  <span>سيتم عرض بياناتك كعميل بعد تسجيل الدخول</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full gap-2">
                <Link href="/login?redirect=/portal">
                  <ArrowLeft className="h-4 w-4" />
                  الانتقال لتسجيل الدخول
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Customer Selection (if authenticated but no customer selected) ──
  if (!customer.trim()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-lg space-y-6">
          {/* Header Bar */}
          <div className="bg-gradient-to-l from-teal-600 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-teal-600/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/20 p-2">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">ERP Pro</h1>
                  <p className="text-xs text-white/80">بوابة العميل</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10 gap-1" onClick={() => logout()}>
                <LogOut className="h-4 w-4" />
                خروج
              </Button>
            </div>
          </div>

          {/* Customer Input Card */}
          <Card className="border-border/40 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                تحديد حساب العميل
              </CardTitle>
              <CardDescription>
                أدخل معرّف العميل للوصول إلى بياناتك وفواتيرك وتقاريرك
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer-id" className="text-sm font-medium">معرّف العميل</Label>
                <Input
                  id="customer-id"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="مثال: CUST-0001"
                  dir="ltr"
                  className="font-mono text-sm h-11"
                />
                <p className="text-[11px] text-muted-foreground">
                  أدخل معرّف العميل كما يظهر في نظام ERP Pro
                </p>
              </div>
              {user && (
                <div className="rounded-lg bg-muted/50 p-3 flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user.fullName || user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full gap-2"
                disabled={!customer.trim()}
                onClick={() => {
                  if (customer.trim()) {
                    void invoices.refetch();
                    void quotes.refetch();
                  }
                }}
              >
                <Search className="h-4 w-4" />
                عرض بيانات العميل
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Main Portal UI ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" dir="rtl">
      {/* ── Header Bar ── */}
      <header className="bg-gradient-to-l from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-600/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-2">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold">ERP Pro</h1>
                <p className="text-xs text-white/80">بوابة العميل</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {customerInfo && (
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                  <Building2 className="h-4 w-4 text-white/80" />
                  <span className="text-sm font-medium">{customerInfo.customer_name || customer}</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-white/90 hover:text-white hover:bg-white/10 gap-1"
                onClick={() => {
                  setCustomer('');
                  setCustomerInfo(null);
                }}
              >
                <User className="h-4 w-4" />
                تبديل العميل
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/90 hover:text-white hover:bg-white/10 gap-1"
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4" />
                خروج
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Error Alert */}
        <ListQueryAlert
          error={invoices.isError ? invoices.error : quotes.isError ? quotes.error : salesOrders.isError ? salesOrders.error : deliveries.error}
          onRetry={refetchAll}
        />

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs sm:text-sm">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">لوحة التحكم</span>
              <span className="sm:hidden">الرئيسية</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              الفواتير
            </TabsTrigger>
            <TabsTrigger value="quotations" className="gap-1.5 text-xs sm:text-sm">
              <Quote className="h-4 w-4" />
              العروض
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5 text-xs sm:text-sm">
              <Truck className="h-4 w-4" />
              الطلبات
            </TabsTrigger>
            <TabsTrigger value="statements" className="gap-1.5 text-xs sm:text-sm">
              <Receipt className="h-4 w-4" />
              الكشف
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-1.5 text-xs sm:text-sm">
              <Headphones className="h-4 w-4" />
              الدعم
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════ DASHBOARD TAB ═══════════════ */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Welcome */}
            <Card className="border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-teal-500/10 to-emerald-500/5 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      مرحباً، {customerInfo?.customer_name || customer}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      مرحباً بك في بوابة الخدمة الذاتية — يمكنك متابعة فواتيرك وعروضك وطلباتك
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={refetchAll}>
                    <RefreshCw className={`h-3.5 w-3.5 ${invoices.isLoading ? 'animate-spin' : ''}`} />
                    تحديث
                  </Button>
                </div>
                {customerInfo && (
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    {customerInfo.email_id && (
                      <span className="flex items-center gap-1">
                        <span>البريد:</span> {customerInfo.email_id}
                      </span>
                    )}
                    {customerInfo.mobile_no && (
                      <span className="flex items-center gap-1">
                        <span>الجوال:</span> {customerInfo.mobile_no}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="إجمالي المستحقات"
                value={formatCurrency(outstanding)}
                icon={DollarSign}
                accent="rose"
                subtitle={overdueInvoices > 0 ? `${overdueInvoices} فاتورة متأخرة` : undefined}
              />
              <KPICard
                title="إجمالي الفواتير"
                value={totalInvoices}
                icon={FileText}
                accent="sky"
                subtitle={formatCurrency(totalInvoiced)}
              />
              <KPICard
                title="عروض مفتوحة"
                value={openQuotes}
                icon={Quote}
                accent="amber"
              />
              <KPICard
                title="تسليمات معلقة"
                value={pendingDeliveries}
                icon={Truck}
                accent="emerald"
              />
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Aging Summary */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    تقسيم المستحقات حسب العمر
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AgingBar label={aging.current.label} amount={aging.current.amount} maxAmount={aging.maxAmt} colorClass="bg-emerald-500" />
                  <AgingBar label={aging.d30.label} amount={aging.d30.amount} maxAmount={aging.maxAmt} colorClass="bg-amber-500" />
                  <AgingBar label={aging.d60.label} amount={aging.d60.amount} maxAmount={aging.maxAmt} colorClass="bg-orange-500" />
                  <AgingBar label={aging.d90.label} amount={aging.d90.amount} maxAmount={aging.maxAmt} colorClass="bg-rose-500" />
                  <Separator />
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>إجمالي المستحقات</span>
                    <span>{formatCurrency(outstanding)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-sky-500" />
                    آخر الأنشطة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentActivity.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">لا توجد أنشطة حديثة</p>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {recentActivity.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-sm">
                          <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${
                            item.type === 'invoice' ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400' :
                            item.type === 'payment' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {item.type === 'invoice' ? <FileText className="h-3 w-3" /> :
                             item.type === 'payment' ? <CreditCard className="h-3 w-3" /> :
                             <Package className="h-3 w-3" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{item.description}</p>
                            <p className="text-[11px] text-muted-foreground">{item.date ? formatDate(item.date) : '—'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">إجراءات سريعة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3">
                  <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => setActiveTab('invoices')}>
                    <FileText className="h-5 w-5 text-sky-500" />
                    <span className="text-xs">عرض الفواتير</span>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => setActiveTab('quotations')}>
                    <Quote className="h-5 w-5 text-amber-500" />
                    <span className="text-xs">العروض</span>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => setActiveTab('statements')}>
                    <Receipt className="h-5 w-5 text-emerald-500" />
                    <span className="text-xs">كشف الحساب</span>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => setActiveTab('support')}>
                    <Headphones className="h-5 w-5 text-rose-500" />
                    <span className="text-xs">تقديم بلاغ</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════ INVOICES TAB ═══════════════ */}
          <TabsContent value="invoices" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-border/40">
                <CardContent className="p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">إجمالي الفوترة</p>
                  <p className="text-sm font-bold">{formatCurrency(totalInvoiced)}</p>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardContent className="p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">المدفوع</p>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardContent className="p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">المستحق</p>
                  <p className="text-sm font-bold text-rose-600">{formatCurrency(outstanding)}</p>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardContent className="p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">متأخرة</p>
                  <p className="text-sm font-bold text-orange-600">{overdueInvoices}</p>
                </CardContent>
              </Card>
            </div>

            {/* Filter & Table */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-sky-500" />
                    فواتير المبيعات
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs shrink-0">تصفية:</Label>
                    <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="unpaid">غير مدفوع</SelectItem>
                        <SelectItem value="overdue">متأخر</SelectItem>
                        <SelectItem value="paid">مدفوع</SelectItem>
                        <SelectItem value="partly">مدفوع جزئياً</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={filteredInvoices}
                  columns={invCols}
                  searchable
                  loading={invoices.isLoading}
                  pageSize={10}
                  tableId="portal-invoices"
                  exportFileName="فواتير-العميل"
                />
              </CardContent>
            </Card>

            {/* Aging Summary */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  تقسيم المستحقات حسب العمر
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-4 gap-4">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">حالي (0-30)</p>
                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(aging.current.amount)}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">30-60 يوم</p>
                    <p className="text-sm font-bold text-amber-600">{formatCurrency(aging.d30.amount)}</p>
                  </div>
                  <div className="rounded-lg bg-chart-4/5 p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">60-90 يوم</p>
                    <p className="text-sm font-bold text-orange-600">{formatCurrency(aging.d60.amount)}</p>
                  </div>
                  <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">90+ يوم</p>
                    <p className="text-sm font-bold text-rose-600">{formatCurrency(aging.d90.amount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════ QUOTATIONS TAB ═══════════════ */}
          <TabsContent value="quotations" className="space-y-6">
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Quote className="h-4 w-4 text-amber-500" />
                    عروض الأسعار
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs shrink-0">تصفية:</Label>
                    <Select value={quoteFilter} onValueChange={setQuoteFilter}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="open">مفتوح</SelectItem>
                        <SelectItem value="ordered">تم الطلب</SelectItem>
                        <SelectItem value="expired">منتهي</SelectItem>
                        <SelectItem value="lost">مفقود</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={filteredQuotes}
                  columns={qCols}
                  searchable
                  loading={quotes.isLoading}
                  pageSize={10}
                  tableId="portal-quotations"
                  exportFileName="عروض-الأسعار"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════ ORDERS & DELIVERIES TAB ═══════════════ */}
          <TabsContent value="orders" className="space-y-6">
            {/* Sales Orders */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-500" />
                  أوامر البيع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={salesOrders.data || []}
                  columns={soCols}
                  searchable
                  loading={salesOrders.isLoading}
                  pageSize={10}
                  tableId="portal-sales-orders"
                  exportFileName="أوامر-البيع"
                />
              </CardContent>
            </Card>

            {/* Delivery Notes */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4 text-sky-500" />
                  إشعارات التسليم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={deliveries.data || []}
                  columns={dnCols}
                  searchable
                  loading={deliveries.isLoading}
                  pageSize={10}
                  tableId="portal-deliveries"
                  exportFileName="إشعارات-التسليم"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════ STATEMENTS TAB ═══════════════ */}
          <TabsContent value="statements" className="space-y-6">
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-emerald-500" />
                    كشف حساب العميل
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1 h-8 text-xs" onClick={printStatement} disabled={statementData.length === 0}>
                      <Printer className="h-3.5 w-3.5" />
                      طباعة
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Range Filter */}
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      من تاريخ
                    </Label>
                    <Input
                      type="date"
                      value={statementFrom}
                      onChange={(e) => setStatementFrom(e.target.value)}
                      className="h-9 w-40 text-xs"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      إلى تاريخ
                    </Label>
                    <Input
                      type="date"
                      value={statementTo}
                      onChange={(e) => setStatementTo(e.target.value)}
                      className="h-9 w-40 text-xs"
                      dir="ltr"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => { setStatementFrom(''); setStatementTo(''); }}
                  >
                    إعادة تعيين
                  </Button>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[11px] text-muted-foreground">إجمالي المدين</p>
                    <p className="text-sm font-bold text-rose-600">
                      {formatCurrency(statementData.reduce((s, e) => s + e.debit, 0))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[11px] text-muted-foreground">إجمالي الدائن</p>
                    <p className="text-sm font-bold text-emerald-600">
                      {formatCurrency(statementData.reduce((s, e) => s + e.credit, 0))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[11px] text-muted-foreground">عدد الحركات</p>
                    <p className="text-sm font-bold">{statementData.length}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[11px] text-muted-foreground">الرصيد الحالي</p>
                    <p className={`text-sm font-bold ${outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(statementData.length > 0 ? statementData[statementData.length - 1]!.balance : 0)}
                    </p>
                  </div>
                </div>

                {/* Statement Table */}
                {statementData.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    <Receipt className="h-9 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p>لا توجد حركات في الفترة المحددة</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/40 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/80 border-b border-border/40">
                            <th className="px-3 py-2.5 text-right font-semibold">التاريخ</th>
                            <th className="px-3 py-2.5 text-right font-semibold">النوع</th>
                            <th className="px-3 py-2.5 text-right font-semibold">المرجع</th>
                            <th className="px-3 py-2.5 text-right font-semibold">مدين</th>
                            <th className="px-3 py-2.5 text-right font-semibold">دائن</th>
                            <th className="px-3 py-2.5 text-right font-semibold">الرصيد</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statementData.map((entry, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-3 py-2">{entry.date ? formatDate(entry.date) : '—'}</td>
                              <td className="px-3 py-2">
                                <Badge
                                  variant={entry.type === 'فاتورة' ? 'info' : 'success'}
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {entry.type}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 font-mono">{entry.reference}</td>
                              <td className="px-3 py-2 font-semibold text-rose-600">
                                {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                              </td>
                              <td className="px-3 py-2 font-semibold text-emerald-600">
                                {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                              </td>
                              <td className={`px-3 py-2 font-bold ${entry.balance > 0 ? 'text-rose-600' : entry.balance < 0 ? 'text-emerald-600' : ''}`}>
                                {formatCurrency(entry.balance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════ SUPPORT TAB ═══════════════ */}
          <TabsContent value="support" className="space-y-6">
            {/* Create Issue */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4 text-rose-500" />
                  تقديم بلاغ / طلب دعم
                </CardTitle>
                <CardDescription className="text-sm">
                  أنشئ بلاغاً جديداً وسيتم متابعته من قبل فريق الدعم
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الموضوع *</Label>
                    <Input
                      value={issueSubject}
                      onChange={(e) => setIssueSubject(e.target.value)}
                      placeholder="عنوان البلاغ أو الطلب"
                      className="h-9"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">الأولوية</Label>
                      <Select value={issuePriority} onValueChange={setIssuePriority}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">منخفض</SelectItem>
                          <SelectItem value="Medium">متوسط</SelectItem>
                          <SelectItem value="High">عالي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">نوع البلاغ</Label>
                      <Select value={issueType} onValueChange={setIssueType}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="اختر النوع" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Problem">مشكلة</SelectItem>
                          <SelectItem value="Query">استفسار</SelectItem>
                          <SelectItem value="Suggestion">اقتراح</SelectItem>
                          <SelectItem value="Complaint">شكوى</SelectItem>
                          <SelectItem value="Request">طلب</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">التفاصيل</Label>
                  <Textarea
                    value={issueDesc}
                    onChange={(e) => setIssueDesc(e.target.value)}
                    placeholder="اشرح المشكلة أو الطلب بالتفصيل..."
                    className="min-h-24"
                  />
                </div>
                <Button
                  className="gap-2"
                  disabled={submittingIssue || !issueSubject.trim()}
                  onClick={() => void createIssue()}
                >
                  {submittingIssue ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  إرسال البلاغ
                </Button>
              </CardContent>
            </Card>

            {/* Existing Issues */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-sky-500" />
                  البلاغات السابقة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={issues.data || []}
                  columns={issueCols}
                  searchable
                  loading={issues.isLoading}
                  pageSize={10}
                  tableId="portal-issues"
                  exportFileName="البلاغات"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-border/30 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} ERP Pro — بوابة العميل ذاتية الخدمة</p>
        </div>
      </footer>
    </div>
  );
}
