'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { useDocList } from '@/lib/client/hooks';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/app-format';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Calculator,
  TrendingUp,
  TrendingDown,
  Plus,
  Receipt,
  Banknote,
  ClipboardCheck,
  Loader2,
} from 'lucide-react';

/* ─── Types ─── */
type TaxDeclaration = {
  id: string;
  quarter: string;
  year: number;
  filingDate: string;
  declarationType: string;
  taxableSales: number;
  taxablePurchases: number;
  salesTax: number;
  purchaseTax: number;
  netTaxPayable: number;
  status: 'مسودة' | 'مقدّم';
};

type TaxReportRow = {
  id: string;
  doctype: string;
  docname: string;
  date: string;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
};

type WithholdingEntry = {
  id: string;
  supplier: string;
  invoiceNo: string;
  amount: number;
  withholdingRate: number;
  withheldAmount: number;
  paymentStatus: 'مدفوع' | 'غير مدفوع' | 'مخصوم';
};

const QUARTER_OPTIONS = [
  { value: 'Q1', label: 'الربع الأول (يناير - مارس)' },
  { value: 'Q2', label: 'الربع الثاني (أبريل - يونيو)' },
  { value: 'Q3', label: 'الربع الثالث (يوليو - سبتمبر)' },
  { value: 'Q4', label: 'الربع الرابع (أكتوبر - ديسمبر)' },
];

const DECL_TYPE_OPTIONS = [
  { value: 'standard', label: 'قياسي' },
  { value: 'adjusted', label: 'معدّل' },
  { value: 'zero', label: 'صفري' },
];

/* ─── API helpers for local storage ─── */
async function fetchDeclarations(): Promise<TaxDeclaration[]> {
  const res = await fetch('/api/accounting/tax-declarations');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل تحميل الإقرارات');
  return json.data ?? [];
}

async function createDeclarationAPI(data: Omit<TaxDeclaration, 'id'>): Promise<TaxDeclaration> {
  const res = await fetch('/api/accounting/tax-declarations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل إنشاء الإقرار');
  return json.data;
}

async function updateDeclarationAPI(data: Partial<TaxDeclaration> & { id: string }): Promise<TaxDeclaration> {
  const res = await fetch('/api/accounting/tax-declarations', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل تحديث الإقرار');
  return json.data;
}

async function fetchWithholdings(): Promise<WithholdingEntry[]> {
  const res = await fetch('/api/accounting/withholding');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل تحميل سجلات الاستقطاع');
  return json.data ?? [];
}

async function createWithholdingAPI(data: Omit<WithholdingEntry, 'id'>): Promise<WithholdingEntry> {
  const res = await fetch('/api/accounting/withholding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل إنشاء سجل الاستقطاع');
  return json.data;
}

async function deleteWithholdingAPI(id: string): Promise<void> {
  const res = await fetch(`/api/accounting/withholding?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل حذف سجل الاستقطاع');
}

export default function TaxDeclarationPage() {
  const { company } = useDefaultCompanyName();
  const queryClient = useQueryClient();

  // ─── Declarations (from local DB via API) ───
  const {
    data: declarations = [],
    isLoading: declLoading,
    error: declError,
    refetch: refetchDeclarations,
  } = useQuery({
    queryKey: ['taxDeclarations'],
    queryFn: fetchDeclarations,
  });

  const createDeclMutation = useMutation({
    mutationFn: createDeclarationAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxDeclarations'] });
    },
  });

  const updateDeclMutation = useMutation({
    mutationFn: updateDeclarationAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxDeclarations'] });
    },
  });

  // ─── Withholding entries (from local DB via API) ───
  const {
    data: withholdings = [],
    isLoading: whLoading,
    error: whError,
    refetch: refetchWithholdings,
  } = useQuery({
    queryKey: ['withholdingEntries'],
    queryFn: fetchWithholdings,
  });

  const createWhMutation = useMutation({
    mutationFn: createWithholdingAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withholdingEntries'] });
    },
  });

  const deleteWhMutation = useMutation({
    mutationFn: deleteWithholdingAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withholdingEntries'] });
    },
  });

  // Declarations form state
  const [declDialog, setDeclDialog] = useState(false);
  const [declForm, setDeclForm] = useState({
    quarter: 'Q1',
    year: new Date().getFullYear(),
    filingDate: new Date().toISOString().slice(0, 10),
    declarationType: 'standard',
  });

  // Tax Report
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');

  // Withholding form state
  const [whDialog, setWhDialog] = useState(false);
  const [whForm, setWhForm] = useState<Partial<WithholdingEntry>>({});
  const [whDeleteOpen, setWhDeleteOpen] = useState(false);
  const [whToDelete, setWhToDelete] = useState<WithholdingEntry | null>(null);

  // Fetch Sales Invoices and Purchase Invoices for tax data
  const {
    data: salesInvoices = [],
    isLoading: loadingSales,
    error: salesError,
    refetch: refetchSales,
  } = useDocList<Record<string, unknown>>('Sales Invoice', {
    fields: ['name', 'posting_date', 'grand_total', 'total_taxes_and_charges', 'docstatus'],
    limit: 500,
    enabled: true,
  });

  const {
    data: purchaseInvoices = [],
    isLoading: loadingPurch,
    error: purchError,
    refetch: refetchPurch,
  } = useDocList<Record<string, unknown>>('Purchase Invoice', {
    fields: ['name', 'posting_date', 'grand_total', 'total_taxes_and_charges', 'docstatus'],
    limit: 500,
    enabled: true,
  });

  // ─── Compute Tax Data ───
  const submittedSales = useMemo(
    () => salesInvoices.filter((inv) => inv.docstatus === 1),
    [salesInvoices]
  );

  const submittedPurchases = useMemo(
    () => purchaseInvoices.filter((inv) => inv.docstatus === 1),
    [purchaseInvoices]
  );

  const totalTaxableSales = useMemo(
    () => submittedSales.reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0),
    [submittedSales]
  );

  const totalTaxablePurchases = useMemo(
    () => submittedPurchases.reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0),
    [submittedPurchases]
  );

  const totalSalesTax = useMemo(
    () => submittedSales.reduce((s, inv) => s + (Number(inv.total_taxes_and_charges) || 0), 0),
    [submittedSales]
  );

  const totalPurchaseTax = useMemo(
    () => submittedPurchases.reduce((s, inv) => s + (Number(inv.total_taxes_and_charges) || 0), 0),
    [submittedPurchases]
  );

  const netTaxPayable = totalSalesTax - totalPurchaseTax;
  const submittedDeclarations = declarations.filter((d) => d.status === 'مقدّم').length;

  // ─── Tax Report Rows ───
  const taxReportRows: TaxReportRow[] = useMemo(() => {
    const sales: TaxReportRow[] = submittedSales
      .filter((inv) => {
        if (!reportFrom || !reportTo) return true;
        const d = String(inv.posting_date ?? '');
        return d >= reportFrom && d <= reportTo;
      })
      .map((inv) => {
        const taxable = Number(inv.grand_total) || 0;
        const tax = Number(inv.total_taxes_and_charges) || 0;
        const rate = taxable > 0 ? (tax / taxable) * 100 : 0;
        return {
          id: `s-${inv.name}`,
          doctype: 'فاتورة مبيعات',
          docname: String(inv.name),
          date: String(inv.posting_date ?? ''),
          taxableAmount: taxable - tax,
          taxRate: Math.round(rate * 100) / 100,
          taxAmount: tax,
        };
      });

    const purchases: TaxReportRow[] = submittedPurchases
      .filter((inv) => {
        if (!reportFrom || !reportTo) return true;
        const d = String(inv.posting_date ?? '');
        return d >= reportFrom && d <= reportTo;
      })
      .map((inv) => {
        const taxable = Number(inv.grand_total) || 0;
        const tax = Number(inv.total_taxes_and_charges) || 0;
        const rate = taxable > 0 ? (tax / taxable) * 100 : 0;
        return {
          id: `p-${inv.name}`,
          doctype: 'فاتورة مشتريات',
          docname: String(inv.name),
          date: String(inv.posting_date ?? ''),
          taxableAmount: taxable - tax,
          taxRate: Math.round(rate * 100) / 100,
          taxAmount: tax,
        };
      });

    return [...sales, ...purchases];
  }, [submittedSales, submittedPurchases, reportFrom, reportTo]);

  const reportTotals = useMemo(() => {
    const taxable = taxReportRows.reduce((s, r) => s + r.taxableAmount, 0);
    const tax = taxReportRows.reduce((s, r) => s + r.taxAmount, 0);
    return { taxable, tax };
  }, [taxReportRows]);

  // ─── Declaration Actions ───
  const createDeclaration = () => {
    createDeclMutation.mutate({
      quarter: declForm.quarter,
      year: declForm.year,
      filingDate: declForm.filingDate,
      declarationType: declForm.declarationType,
      taxableSales: totalTaxableSales,
      taxablePurchases: totalTaxablePurchases,
      salesTax: totalSalesTax,
      purchaseTax: totalPurchaseTax,
      netTaxPayable,
      status: 'مسودة',
    }, {
      onSuccess: () => {
        setDeclDialog(false);
        toast.success('تم إنشاء الإقرار الضريبي');
      },
      onError: (err) => {
        toast.error('خطأ', { description: err.message });
      },
    });
  };

  const submitDeclaration = (decl: TaxDeclaration) => {
    updateDeclMutation.mutate({
      id: decl.id,
      status: 'مقدّم',
    }, {
      onSuccess: () => {
        toast.success(`تم تقديم الإقرار ${decl.quarter}-${decl.year}`);
      },
      onError: (err) => {
        toast.error('خطأ', { description: err.message });
      },
    });
  };

  const printDeclaration = (decl: TaxDeclaration) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><title>إقرار ضريبي ${decl.quarter}-${decl.year}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;font-size:12px;}
        h1{font-size:18px;margin-bottom:8px;}
        table{width:100%;border-collapse:collapse;margin-top:16px;}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:right;}
        th{background:#f5f5f5;font-weight:600;}
        .total-row{font-weight:700;background:#f0f0f0;}
      </style></head><body>
      <h1>الإقرار الضريبي — ${decl.quarter} ${decl.year}</h1>
      <p>نوع الإقرار: ${DECL_TYPE_OPTIONS.find((o) => o.value === decl.declarationType)?.label ?? decl.declarationType}</p>
      <p>تاريخ التقديم: ${decl.filingDate}</p>
      <p>الحالة: ${decl.status}</p>
      <table>
        <tr><th>البند</th><th>المبلغ (ر.ي)</th></tr>
        <tr><td>مبيعات خاضعة</td><td>${decl.taxableSales.toLocaleString('ar-YE')}</td></tr>
        <tr><td>مشتريات خاضعة</td><td>${decl.taxablePurchases.toLocaleString('ar-YE')}</td></tr>
        <tr><td>ضريبة المبيعات</td><td>${decl.salesTax.toLocaleString('ar-YE')}</td></tr>
        <tr><td>ضريبة المشتريات</td><td>${decl.purchaseTax.toLocaleString('ar-YE')}</td></tr>
        <tr class="total-row"><td>صافي الضريبة المستحقة</td><td>${decl.netTaxPayable.toLocaleString('ar-YE')}</td></tr>
      </table>
      </body></html>`);
    w.document.close();
    w.print();
  };

  // ─── Withholding Actions ───
  const openCreateWithholding = () => {
    setWhForm({ supplier: '', invoiceNo: '', amount: 0, withholdingRate: 5, withheldAmount: 0, paymentStatus: 'غير مدفوع' });
    setWhDialog(true);
  };

  const saveWithholding = () => {
    if (!whForm.supplier?.trim() || !whForm.amount) {
      toast.error('أدخل اسم المورد والمبلغ');
      return;
    }
    const amt = Number(whForm.amount) || 0;
    const rate = Number(whForm.withholdingRate) || 0;
    createWhMutation.mutate({
      supplier: whForm.supplier!,
      invoiceNo: whForm.invoiceNo ?? '',
      amount: amt,
      withholdingRate: rate,
      withheldAmount: Math.round((amt * rate) / 100 * 100) / 100,
      paymentStatus: whForm.paymentStatus ?? 'غير مدفوع',
    }, {
      onSuccess: () => {
        setWhDialog(false);
        toast.success('تم إنشاء سجل ضريبة الاستقطاع');
      },
      onError: (err) => {
        toast.error('خطأ', { description: err.message });
      },
    });
  };

  const confirmDeleteWh = () => {
    if (!whToDelete) return;
    deleteWhMutation.mutate(whToDelete.id, {
      onSuccess: () => {
        setWhDeleteOpen(false);
        setWhToDelete(null);
        toast.success('تم حذف سجل ضريبة الاستقطاع');
      },
      onError: (err) => {
        toast.error('خطأ', { description: err.message });
      },
    });
  };

  // ─── DataTable Columns ───
  const declColumns: Column<TaxDeclaration>[] = useMemo(
    () => [
      {
        key: 'quarter',
        header: 'الربع',
        sortable: true,
        render: (v) => {
          const opt = QUARTER_OPTIONS.find((o) => o.value === v);
          return <span className="text-xs font-medium">{opt?.label ?? String(v)}</span>;
        },
      },
      { key: 'year', header: 'السنة', sortable: true, render: (v) => <span className="tabular-nums text-xs">{String(v)}</span> },
      {
        key: 'declarationType',
        header: 'نوع الإقرار',
        render: (v) => {
          const opt = DECL_TYPE_OPTIONS.find((o) => o.value === v);
          return <span className="text-xs">{opt?.label ?? String(v)}</span>;
        },
      },
      {
        key: 'salesTax',
        header: 'ضريبة المبيعات',
        render: (v) => <span className="text-xs tabular-nums">{formatCurrency(Number(v))}</span>,
      },
      {
        key: 'purchaseTax',
        header: 'ضريبة المشتريات',
        render: (v) => <span className="text-xs tabular-nums">{formatCurrency(Number(v))}</span>,
      },
      {
        key: 'netTaxPayable',
        header: 'صافي المستحق',
        render: (v) => (
          <span className={`text-xs font-semibold tabular-nums ${Number(v) >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {formatCurrency(Number(v))}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (v) => <StatusBadge status={v === 'مقدّم' ? 'Submitted' : 'Draft'} />,
      },
    ],
    []
  );

  const reportColumns: Column<TaxReportRow>[] = useMemo(
    () => [
      {
        key: 'doctype',
        header: 'نوع المستند',
        render: (v) => (
          <span className={`text-xs font-medium ${v === 'فاتورة مبيعات' ? 'text-primary' : 'text-chart-2'}`}>
            {String(v)}
          </span>
        ),
      },
      { key: 'docname', header: 'رقم المستند', render: (v) => <span className="font-mono text-[10px]">{String(v)}</span> },
      { key: 'date', header: 'التاريخ', sortable: true, render: (v) => <span className="text-xs">{formatDate(String(v))}</span> },
      { key: 'taxableAmount', header: 'المبلغ الخاضع', render: (v) => <span className="text-xs tabular-nums">{formatCurrency(Number(v))}</span> },
      { key: 'taxRate', header: 'نسبة الضريبة', render: (v) => <span className="text-xs tabular-nums">{String(v)}%</span> },
      { key: 'taxAmount', header: 'مبلغ الضريبة', render: (v) => <span className="text-xs font-semibold tabular-nums">{formatCurrency(Number(v))}</span> },
    ],
    []
  );

  const whColumns: Column<WithholdingEntry>[] = useMemo(
    () => [
      { key: 'supplier', header: 'المورد', sortable: true },
      { key: 'invoiceNo', header: 'رقم الفاتورة', render: (v) => <span className="font-mono text-[10px]">{String(v)}</span> },
      { key: 'amount', header: 'المبلغ', render: (v) => <span className="text-xs tabular-nums">{formatCurrency(Number(v))}</span> },
      { key: 'withholdingRate', header: 'نسبة الاستقطاع', render: (v) => <span className="text-xs tabular-nums">{String(v)}%</span> },
      { key: 'withheldAmount', header: 'المبلغ المخصوم', render: (v) => <span className="text-xs font-semibold tabular-nums">{formatCurrency(Number(v))}</span> },
      {
        key: 'paymentStatus',
        header: 'حالة الدفع',
        render: (v) => {
          const map: Record<string, string> = { 'مدفوع': 'Paid', 'غير مدفوع': 'Unpaid', 'مخصوم': 'Partly Paid' };
          return <StatusBadge status={map[String(v)] ?? String(v)} />;
        },
      },
    ],
    []
  );

  const loading = loadingSales || loadingPurch;
  const error = salesError || purchError || declError || whError;

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="الإقرار الضريبي"
        description="إعداد وتقديم الإقرارات الضريبية الربع سنوية"
        iconify="solar:document-bold-duotone"
        accent="destructive"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'الإقرار الضريبي' }]}
      />

      <ListQueryAlert error={error} onRetry={() => { refetchSales(); refetchPurch(); refetchDeclarations(); refetchWithholdings(); }} />

      <Tabs defaultValue="declaration" className="space-y-4">
        <TabsList>
          <TabsTrigger value="declaration" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            إقرار ضريبي
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-1.5 text-xs">
            <Receipt className="h-3.5 w-3.5" />
            تقرير الضرائب
          </TabsTrigger>
          <TabsTrigger value="withholding" className="gap-1.5 text-xs">
            <Banknote className="h-3.5 w-3.5" />
            ضريبة الاستقطاع
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Tax Declaration ─── */}
        <TabsContent value="declaration" className="space-y-5">
          {/* KPIs */}
          {/* Create Declaration Form */}
          <Card className="border-border/40 bg-card">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">إنشاء إقرار ضريبي ربع سنوي</h2>
                  <p className="text-xs text-muted-foreground">يتم حساب الملخص تلقائياً من فواتير المبيعات والمشتريات</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">الربع *</Label>
                  <Select
                    value={declForm.quarter}
                    onValueChange={(v) => setDeclForm((f) => ({ ...f, quarter: v }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUARTER_OPTIONS.map((q) => (
                        <SelectItem key={q.value} value={q.value}>
                          {q.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">السنة *</Label>
                  <Input
                    className="h-9"
                    type="number"
                    dir="ltr"
                    value={declForm.year}
                    onChange={(e) => setDeclForm((f) => ({ ...f, year: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">تاريخ التقديم *</Label>
                  <Input
                    className="h-9"
                    type="date"
                    dir="ltr"
                    value={declForm.filingDate}
                    onChange={(e) => setDeclForm((f) => ({ ...f, filingDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">نوع الإقرار</Label>
                  <Select
                    value={declForm.declarationType}
                    onValueChange={(v) => setDeclForm((f) => ({ ...f, declarationType: v }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DECL_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Auto-calculated Summary */}
              <div className="rounded-lg border border-border/30 bg-muted/20 p-4 space-y-3">
                <h3 className="text-xs font-semibold flex items-center gap-2">
                  <Calculator className="h-3.5 w-3.5" />
                  ملخص محسوب تلقائياً
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="flex justify-between items-center rounded-md bg-background px-3 py-2 border border-border/30">
                    <span className="text-muted-foreground">مبيعات خاضعة</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(totalTaxableSales)}</span>
                  </div>
                  <div className="flex justify-between items-center rounded-md bg-background px-3 py-2 border border-border/30">
                    <span className="text-muted-foreground">مشتريات خاضعة</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(totalTaxablePurchases)}</span>
                  </div>
                  <div className="flex justify-between items-center rounded-md bg-background px-3 py-2 border border-border/30">
                    <span className="text-muted-foreground">ضريبة المبيعات</span>
                    <span className="font-semibold tabular-nums text-emerald-700">{formatCurrency(totalSalesTax)}</span>
                  </div>
                  <div className="flex justify-between items-center rounded-md bg-background px-3 py-2 border border-border/30">
                    <span className="text-muted-foreground">ضريبة المشتريات</span>
                    <span className="font-semibold tabular-nums text-amber-700">{formatCurrency(totalPurchaseTax)}</span>
                  </div>
                  <div className="flex justify-between items-center rounded-md bg-destructive/5 px-3 py-2 border border-destructive/20 sm:col-span-2 lg:col-span-1">
                    <span className="font-semibold text-destructive">صافي الضريبة المستحقة</span>
                    <span className="font-bold tabular-nums text-destructive">{formatCurrency(netTaxPayable)}</span>
                  </div>
                </div>
              </div>

              <Button size="sm" onClick={createDeclaration} disabled={createDeclMutation.isPending}>
                {createDeclMutation.isPending ? <Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 me-1.5" />}
                إنشاء الإقرار
              </Button>
            </CardContent>
          </Card>

          {/* Past Declarations */}
          <DataTable
            data={declarations}
            columns={declColumns}
            tableId="tax-declarations"
            searchable
            loading={declLoading}
            exportFileName="الإقرارات-الضريبية"
            onView={(row) => {
              if (row.status === 'مسودة') submitDeclaration(row);
            }}
            onEdit={(row) => printDeclaration(row)}
          />
        </TabsContent>

        {/* ─── Tab 2: Tax Report ─── */}
        <TabsContent value="report" className="space-y-5">
          <Card className="border-border/40 bg-card">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">من تاريخ</Label>
                  <Input
                    className="h-9"
                    type="date"
                    dir="ltr"
                    value={reportFrom}
                    onChange={(e) => setReportFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">إلى تاريخ</Label>
                  <Input
                    className="h-9"
                    type="date"
                    dir="ltr"
                    value={reportTo}
                    onChange={(e) => setReportTo(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setReportFrom('');
                    setReportTo('');
                  }}
                >
                  مسح الفلتر
                </Button>
              </div>
            </CardContent>
          </Card>

          <DataTable
            data={taxReportRows}
            columns={reportColumns}
            tableId="tax-report"
            searchable
            loading={loading}
            exportFileName="تقرير-الضرائب"
          />

          {/* Report Summary */}
          <Card className="border-border/40 bg-card">
            <CardContent className="p-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex justify-between items-center rounded-lg bg-muted/30 px-4 py-3">
                  <span className="text-xs font-semibold text-muted-foreground">إجمالي المبالغ الخاضعة</span>
                  <span className="text-sm font-bold tabular-nums">{formatCurrency(reportTotals.taxable)}</span>
                </div>
                <div className="flex justify-between items-center rounded-lg bg-destructive/5 border border-destructive/15 px-4 py-3">
                  <span className="text-xs font-semibold text-destructive">إجمالي الضريبة</span>
                  <span className="text-sm font-bold tabular-nums text-destructive">{formatCurrency(reportTotals.tax)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 3: Withholding Tax ─── */}
        <TabsContent value="withholding" className="space-y-5">
          <DataTable
            data={withholdings}
            columns={whColumns}
            tableId="withholding-tax"
            searchable
            loading={whLoading}
            addLabel="إنشاء سجل"
            onAdd={openCreateWithholding}
            onDelete={(row) => {
              setWhToDelete(row);
              setWhDeleteOpen(true);
            }}
            exportFileName="ضريبة-الاستقطاع"
          />

          {/* Withholding Summary */}
          <Card className="border-border/40 bg-card">
            <CardContent className="p-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="flex justify-between items-center rounded-lg bg-muted/30 px-4 py-3">
                  <span className="text-xs text-muted-foreground">إجمالي المبالغ</span>
                  <span className="text-sm font-bold tabular-nums">
                    {formatCurrency(withholdings.reduce((s, w) => s + w.amount, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center rounded-lg bg-muted/30 px-4 py-3">
                  <span className="text-xs text-muted-foreground">إجمالي المخصوم</span>
                  <span className="text-sm font-bold tabular-nums">
                    {formatCurrency(withholdings.reduce((s, w) => s + w.withheldAmount, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center rounded-lg bg-muted/30 px-4 py-3">
                  <span className="text-xs text-muted-foreground">غير مدفوع</span>
                  <span className="text-sm font-bold tabular-nums text-amber-700">
                    {formatCurrency(withholdings.filter((w) => w.paymentStatus === 'غير مدفوع').reduce((s, w) => s + w.withheldAmount, 0))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Withholding Create Dialog ─── */}
      <Dialog open={whDialog} onOpenChange={setWhDialog}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              إنشاء سجل ضريبة استقطاع
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">المورد *</Label>
                <Input
                  className="h-9"
                  value={whForm.supplier ?? ''}
                  onChange={(e) => setWhForm((f) => ({ ...f, supplier: e.target.value }))}
                  placeholder="اسم المورد"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">رقم الفاتورة</Label>
                <Input
                  className="h-9"
                  value={whForm.invoiceNo ?? ''}
                  onChange={(e) => setWhForm((f) => ({ ...f, invoiceNo: e.target.value }))}
                  placeholder="رقم الفاتورة"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">المبلغ *</Label>
                <Input
                  className="h-9"
                  type="number"
                  dir="ltr"
                  value={whForm.amount ?? 0}
                  onChange={(e) => setWhForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">نسبة الاستقطاع %</Label>
                <Input
                  className="h-9"
                  type="number"
                  dir="ltr"
                  step="0.1"
                  value={whForm.withholdingRate ?? 5}
                  onChange={(e) => setWhForm((f) => ({ ...f, withholdingRate: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">حالة الدفع</Label>
              <Select
                value={whForm.paymentStatus ?? 'غير مدفوع'}
                onValueChange={(v) => setWhForm((f) => ({ ...f, paymentStatus: v as WithholdingEntry['paymentStatus'] }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="غير مدفوع">غير مدفوع</SelectItem>
                  <SelectItem value="مخصوم">مخصوم</SelectItem>
                  <SelectItem value="مدفوع">مدفوع</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Calculated */}
            <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">المبلغ المخصوم (محسوب)</span>
                <span className="font-bold tabular-nums">
                  {formatCurrency(Math.round(((Number(whForm.amount) || 0) * (Number(whForm.withholdingRate) || 0)) / 100 * 100) / 100)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setWhDialog(false)}>
              إلغاء
            </Button>
            <Button size="sm" onClick={saveWithholding} disabled={createWhMutation.isPending}>
              {createWhMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1" /> : null}
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Withholding Confirm ─── */}
      <AlertDialog open={whDeleteOpen} onOpenChange={setWhDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف سجل ضريبة الاستقطاع للمورد «{whToDelete?.supplier}»؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteWhMutation.isPending}>إلغاء</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDeleteWh} disabled={deleteWhMutation.isPending}>
              {deleteWhMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
