'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useDocList } from '@/lib/client/hooks';
import { PageHeader } from '@/components/erp/page-header';
import { StatusBadge } from '@/components/erp/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/core/helpers';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import {
  Truck,
  Package,
  Users,
  FileText,
  ClipboardList,
  Receipt,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ArrowDownLeft,
  RotateCcw,
  BarChart3,
  Warehouse,
  CircleDollarSign,
  TrendingDown,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Quick Actions                                                      */
/* ------------------------------------------------------------------ */
const QUICK_ACTIONS = [
  { label: 'أمر شراء جديد', href: '/purchases/purchase-orders?new=1', icon: ClipboardList, color: 'bg-chart-2/10 text-chart-2' },
  { label: 'فاتورة مشتريات', href: '/purchases/purchase-invoices?new=1', icon: Receipt, color: 'bg-destructive/10 text-destructive' },
  { label: 'طلب عروض أسعار', href: '/purchases/request-for-quotation?new=1', icon: FileText, color: 'bg-chart-1/10 text-chart-1' },
  { label: 'الموردون', href: '/purchases/suppliers', icon: Users, color: 'bg-primary/10 text-primary' },
];

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function PurchasesDashboardPage() {
  const { company } = useDefaultCompanyName();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  /* ---------- Fetch data ---------- */
  const { data: purchaseInvoices = [], isLoading: piLoading } = useDocList<Record<string, unknown>>(
    'Purchase Invoice',
    {
      fields: ['name', 'supplier', 'supplier_name', 'grand_total', 'outstanding_amount', 'posting_date', 'status', 'docstatus', 'due_date'],
      limit: 100,
      order_by: 'posting_date desc',
      filters: company ? [['company', '=', company]] : undefined,
    }
  );

  const { data: purchaseOrders = [], isLoading: poLoading } = useDocList<Record<string, unknown>>(
    'Purchase Order',
    {
      fields: ['name', 'supplier', 'supplier_name', 'grand_total', 'status', 'docstatus', 'transaction_date', 'schedule_date'],
      limit: 50,
      order_by: 'transaction_date desc',
      filters: company ? [['company', '=', company]] : undefined,
    }
  );

  const { data: suppliers = [], isLoading: supLoading } = useDocList<Record<string, unknown>>(
    'Supplier',
    {
      fields: ['name', 'supplier_name', 'supplier_group'],
      limit: 200,
    }
  );

  const { data: purchaseReceipts = [], isLoading: prLoading } = useDocList<Record<string, unknown>>(
    'Purchase Receipt',
    {
      fields: ['name', 'supplier', 'supplier_name', 'grand_total', 'status', 'docstatus', 'posting_date'],
      limit: 50,
      order_by: 'posting_date desc',
      filters: company ? [['company', '=', company]] : undefined,
    }
  );

  const isLoading = piLoading || poLoading || supLoading || prLoading;

  /* ---------- KPI calculations ---------- */
  const totalPurchases = useMemo(
    () => purchaseInvoices
      .filter((inv) => String(inv.posting_date ?? '').startsWith(thisMonth) && Number(inv.docstatus) === 1)
      .reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0),
    [purchaseInvoices, thisMonth]
  );

  const openPurchaseOrders = useMemo(
    () => purchaseOrders.filter((po) => Number(po.docstatus) === 1 && ['To Receive and Bill', 'To Receive', 'To Bill'].includes(String(po.status))).length,
    [purchaseOrders]
  );

  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.supplier_name).length,
    [suppliers]
  );

  const unpaidInvoices = useMemo(
    () => purchaseInvoices.filter((inv) => Number(inv.docstatus) === 1 && Number(inv.outstanding_amount || 0) > 0),
    [purchaseInvoices]
  );

  const unpaidAmount = useMemo(
    () => unpaidInvoices.reduce((sum, inv) => sum + Number(inv.outstanding_amount || 0), 0),
    [unpaidInvoices]
  );

  const pendingReceipts = useMemo(
    () => purchaseOrders.filter((po) => Number(po.docstatus) === 1 && ['To Receive and Bill', 'To Receive'].includes(String(po.status))).length,
    [purchaseOrders]
  );

  const returnsThisMonth = useMemo(
    () => purchaseInvoices.filter((inv) => String(inv.posting_date ?? '').startsWith(thisMonth) && String(inv.status) === 'Return').length,
    [purchaseInvoices, thisMonth]
  );

  /* ---------- Top 5 suppliers ---------- */
  const topSuppliers = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>();
    for (const inv of purchaseInvoices) {
      if (Number(inv.docstatus) !== 1) continue;
      const key = String(inv.supplier ?? '');
      const existing = map.get(key) || { name: String(inv.supplier_name ?? key), total: 0 };
      existing.total += Number(inv.grand_total || 0);
      map.set(key, existing);
    }
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [purchaseInvoices]);

  const maxSupplierVal = useMemo(() => Math.max(...topSuppliers.map((s) => s.total), 1), [topSuppliers]);

  /* ---------- PO Status Summary ---------- */
  const poStatusSummary = useMemo(() => {
    const statusMap = new Map<string, number>();
    for (const po of purchaseOrders) {
      const st = String(po.status || 'Draft');
      statusMap.set(st, (statusMap.get(st) || 0) + 1);
    }
    const colorMap: Record<string, string> = {
      'Draft': 'bg-secondary text-secondary-foreground',
      'To Receive and Bill': 'bg-chart-2',
      'To Receive': 'bg-chart-1',
      'To Bill': 'bg-chart-3',
      'Completed': 'bg-chart-3',
      'Cancelled': 'bg-destructive',
    };
    const labelMap: Record<string, string> = {
      'Draft': 'مسودة',
      'To Receive and Bill': 'استلام وفوترة',
      'To Receive': 'بانتظار الاستلام',
      'To Bill': 'بانتظار الفوترة',
      'Completed': 'مكتمل',
      'Cancelled': 'ملغي',
    };
    return Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      label: labelMap[status] || status,
      count,
      color: colorMap[status] || 'bg-muted',
    }));
  }, [purchaseOrders]);

  const totalPO = useMemo(() => Math.max(poStatusSummary.reduce((s, p) => s + p.count, 0), 1), [poStatusSummary]);

  /* ---------- Recent transactions ---------- */
  const recentTransactions = useMemo(() => {
    const items: { typeAr: string; name: string; party: string; amount: number; date: string; status: string }[] = [];
    for (const inv of purchaseInvoices.slice(0, 5)) {
      items.push({ typeAr: 'فاتورة مشتريات', name: String(inv.name ?? ''), party: String(inv.supplier_name ?? inv.supplier ?? '—'), amount: Number(inv.grand_total ?? 0), date: String(inv.posting_date ?? ''), status: String(inv.status ?? '') });
    }
    for (const po of purchaseOrders.slice(0, 3)) {
      items.push({ typeAr: 'أمر شراء', name: String(po.name ?? ''), party: String(po.supplier_name ?? po.supplier ?? '—'), amount: Number(po.grand_total ?? 0), date: String(po.transaction_date ?? ''), status: String(po.status ?? '') });
    }
    for (const pr of purchaseReceipts.slice(0, 2)) {
      items.push({ typeAr: 'استلام مشتريات', name: String(pr.name ?? ''), party: String(pr.supplier_name ?? pr.supplier ?? '—'), amount: Number(pr.grand_total ?? 0), date: String(pr.posting_date ?? ''), status: String(pr.status ?? '') });
    }
    items.sort((a, b) => b.date.localeCompare(a.date));
    return items.slice(0, 10);
  }, [purchaseInvoices, purchaseOrders, purchaseReceipts]);

  /* ---------- Pending receipts list ---------- */
  const pendingReceiptsList = useMemo(
    () => purchaseOrders
      .filter((po) => Number(po.docstatus) === 1 && ['To Receive and Bill', 'To Receive'].includes(String(po.status)))
      .slice(0, 5),
    [purchaseOrders]
  );

  /* ---------- Supplier payment summary ---------- */
  const supplierPaymentSummary = useMemo(() => {
    const totalPayable = unpaidInvoices.reduce((s, inv) => s + Number(inv.outstanding_amount || 0), 0);
    const totalInvoiced = purchaseInvoices
      .filter((inv) => Number(inv.docstatus) === 1)
      .reduce((s, inv) => s + Number(inv.grand_total || 0), 0);
    const paidRatio = totalInvoiced > 0 ? Math.round(((totalInvoiced - totalPayable) / totalInvoiced) * 100) : 0;
    return { totalPayable, totalInvoiced, paidRatio };
  }, [purchaseInvoices, unpaidInvoices]);

  return (
    <div dir="rtl" className="erp-page-enter mx-auto w-full max-w-[1600px] space-y-5 md:space-y-6">
      <PageHeader
        title="لوحة تحكم المشتريات"
        description="متابعة أوامر الشراء والفواتير والموردين والاستلام"
        iconify="solar:box-bold-duotone"
        accent="amber"
        breadcrumbs={[{ label: 'المشتريات' }, { label: 'لوحة التحكم' }]}
      />

      {/* ── KPI Row 1 ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/40">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-2/10 shrink-0">
                <CircleDollarSign className="h-4.5 w-4.5 text-chart-2" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">مشتريات الشهر</p>
                <p className="text-sm font-bold tabular-nums">{formatCurrency(totalPurchases)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-1/10 shrink-0">
                <ClipboardList className="h-4.5 w-4.5 text-chart-1" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">أوامر شراء مفتوحة</p>
                <p className="text-sm font-bold tabular-nums">{openPurchaseOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Users className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">الموردون النشطون</p>
                <p className="text-sm font-bold tabular-nums">{activeSuppliers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 shrink-0">
                <AlertTriangle className="h-4.5 w-4.5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">مبالغ مستحقة</p>
                <p className="text-sm font-bold tabular-nums text-rose-600">{formatCurrency(unpaidAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── KPI Row 2 ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-border/40">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-3/10 shrink-0">
                <Truck className="h-4.5 w-4.5 text-chart-3" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">استلامات معلّقة</p>
                <p className="text-sm font-bold tabular-nums">{pendingReceipts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 shrink-0">
                <RotateCcw className="h-4.5 w-4.5 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">مرتجعات الشهر</p>
                <p className="text-sm font-bold tabular-nums">{returnsThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-4/10 shrink-0">
                <BarChart3 className="h-4.5 w-4.5 text-chart-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">نسبة الصرف</p>
                <p className="text-sm font-bold tabular-nums">{supplierPaymentSummary.paidRatio}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Actions ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Button key={action.label} variant="outline" size="sm" className="h-9 gap-2 text-xs" asChild>
                  <Link href={action.href}>
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${action.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Top Suppliers & PO Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 5 suppliers */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">أفضل 5 موردين حسب قيمة المشتريات</CardTitle>
              <Link href="/purchases/suppliers" className="text-xs text-primary hover:underline">عرض الكل</Link>
            </div>
          </CardHeader>
          <CardContent>
            {topSuppliers.length === 0 && (
              <p className="text-xs text-muted-foreground py-8 text-center">لا توجد بيانات موردين بعد.</p>
            )}
            {topSuppliers.length > 0 && (
              <div className="space-y-3">
                {topSuppliers.map((sup, i) => (
                  <div key={sup.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-2/10 text-[10px] font-bold text-chart-2">
                          {i + 1}
                        </span>
                        <span className="text-xs font-medium truncate max-w-[160px]">{sup.name}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums">{formatCurrency(sup.total)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-chart-2 transition-all duration-500"
                        style={{ width: `${(sup.total / maxSupplierVal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PO Status Summary */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">حالة أوامر الشراء</CardTitle>
          </CardHeader>
          <CardContent>
            {poStatusSummary.length === 0 && (
              <p className="text-xs text-muted-foreground py-8 text-center">لا توجد أوامر شراء.</p>
            )}
            {poStatusSummary.length > 0 && (
              <div className="space-y-3">
                {/* Stacked bar */}
                <div className="flex rounded-full overflow-hidden h-3">
                  {poStatusSummary.map((item, i) => (
                    <div
                      key={i}
                      className={`${item.color} transition-all duration-500`}
                      style={{ width: `${(item.count / totalPO) * 100}%` }}
                    />
                  ))}
                </div>
                {/* Legend */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {poStatusSummary.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        <p className="text-xs font-semibold">{item.count}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Transactions & Pending Receipts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2 border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">آخر معاملات المشتريات</CardTitle>
              <span className="text-[10px] text-muted-foreground">آخر 10 معاملات</span>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-xs text-muted-foreground py-6 text-center">جاري التحميل…</p>}
            {!isLoading && recentTransactions.length === 0 && (
              <p className="text-xs text-muted-foreground py-8 text-center">لا توجد معاملات مشتريات حالياً.</p>
            )}
            {!isLoading && recentTransactions.length > 0 && (
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {recentTransactions.map((tx, i) => (
                  <div
                    key={`${tx.typeAr}-${tx.name}-${i}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
                        <Truck className="h-4 w-4 text-chart-2" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{tx.party}</p>
                        <p className="text-[10px] text-muted-foreground">{tx.name} — {tx.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold tabular-nums">{formatCurrency(tx.amount)}</span>
                      <StatusBadge status={tx.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Receipts & Supplier Payment */}
        <div className="space-y-4">
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">استلامات معلّقة</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingReceiptsList.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">لا توجد استلامات معلّقة.</p>
              )}
              {pendingReceiptsList.length > 0 && (
                <div className="space-y-2">
                  {pendingReceiptsList.map((po) => (
                    <div key={String(po.name)} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium truncate">{String(po.supplier_name ?? po.supplier ?? '—')}</p>
                        <p className="text-[10px] text-muted-foreground">{String(po.name)}</p>
                      </div>
                      <span className="text-xs font-semibold tabular-nums">{formatCurrency(Number(po.grand_total ?? 0))}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">ملخص المدفوعات للموردين</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">إجمالي المفوتر</span>
                  <span className="text-xs font-semibold">{formatCurrency(supplierPaymentSummary.totalInvoiced)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">إجمالي المستحق</span>
                  <span className="text-xs font-semibold text-rose-600">{formatCurrency(supplierPaymentSummary.totalPayable)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-chart-3 transition-all duration-500"
                    style={{ width: `${supplierPaymentSummary.paidRatio}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  نسبة الصرف: {supplierPaymentSummary.paidRatio}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
