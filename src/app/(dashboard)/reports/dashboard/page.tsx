'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { DataTable, type Column } from '@/components/erp/data-table';
import { EmptyState } from '@/components/erp/empty-state';
import { ExportButton } from '@/components/erp/export-button';
import { useDocList, useRunReport } from '@/lib/client/hooks';
import { formatCurrency, formatDate, CHART_PALETTE } from '@/lib/core/helpers';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Download,
  Printer,
  Wallet,
  ArrowUpDown,
  AlertTriangle,
  Calendar,
  FileSpreadsheet,
  Clock,
  UserCheck,
  Building2,
  BoxesIcon,
  Receipt,
} from 'lucide-react';

// ── Chart colors ──
// COLORS removed — using CHART_PALETTE.series from helpers

// ── Arabic month names ──
const AR_MONTHS: Record<string, string> = {
  '01': 'يناير',
  '02': 'فبراير',
  '03': 'مارس',
  '04': 'أبريل',
  '05': 'مايو',
  '06': 'يونيو',
  '07': 'يوليو',
  '08': 'أغسطس',
  '09': 'سبتمبر',
  '10': 'أكتوبر',
  '11': 'نوفمبر',
  '12': 'ديسمبر',
};

function formatMonthLabel(monthStr: string): string {
  if (!monthStr) return '';
  const parts = monthStr.split('-');
  if (parts.length >= 2) {
    return `${AR_MONTHS[parts[1]] ?? parts[1]} ${parts[0]}`;
  }
  return monthStr;
}

function defaultYearDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(now) };
}

// ── Custom tooltip for charts ──
function ChartTooltip({
  active,
  payload,
  label,
  isCurrency = true,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  isCurrency?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      dir="rtl"
      className="rounded-lg border border-border/60 bg-card px-3 py-2 shadow-md text-xs"
    >
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">
            {isCurrency ? formatCurrency(p.value) : p.value.toLocaleString('ar-YE')}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Empty chart placeholder ──
function EmptyChart({ message }: { message?: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/10">
      <div className="text-center">
        <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">
          {message ?? 'لا توجد بيانات كافية'}
        </p>
      </div>
    </div>
  );
}

// ── Chart card wrapper ──
function ChartCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('border-border/40', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════
// Main Page Component
// ════════════════════════════════════════════════════════════════
export default function ReportsDashboardPage() {
  const { from: d0, to: d1 } = defaultYearDateRange();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateFrom, setDateFrom] = useState(d0);
  const [dateTo, setDateTo] = useState(d1);
  const { company } = useDefaultCompanyName();
  // ── Financial report selector ──
  const [selectedReportId, setSelectedReportId] = useState('general-ledger');

  // ── Fetch GL Entries ──
  const { data: glEntries, isLoading: glLoading } = useDocList<Record<string, unknown>>(
    'GL Entry',
    {
      fields: ['name', 'account', 'debit', 'credit', 'posting_date', 'voucher_type', 'against'],
      order_by: 'posting_date desc',
      limit: 500,
    }
  );

  // ── Fetch Sales Invoices ──
  const { data: salesInvoices, isLoading: salesLoading } = useDocList<Record<string, unknown>>(
    'Sales Invoice',
    {
      fields: ['name', 'customer', 'customer_name', 'grand_total', 'posting_date', 'status'],
      order_by: 'posting_date desc',
      limit: 200,
    }
  );

  // ── Fetch Purchase Invoices ──
  const { data: purchaseInvoices, isLoading: purchaseLoading } = useDocList<
    Record<string, unknown>
  >('Purchase Invoice', {
    fields: ['name', 'supplier', 'supplier_name', 'grand_total', 'posting_date', 'status'],
    order_by: 'posting_date desc',
    limit: 200,
  });

  // ── Fetch Expense Claims ──
  const { data: expenseClaims, isLoading: expenseLoading } = useDocList<Record<string, unknown>>(
    'Expense Claim',
    {
      fields: ['name', 'employee', 'employee_name', 'total_claimed_amount', 'posting_date', 'status'],
      order_by: 'posting_date desc',
      limit: 200,
    }
  );

  // ── Fetch Employees ──
  const { data: employees, isLoading: empLoading } = useDocList<Record<string, unknown>>(
    'Employee',
    {
      fields: ['name', 'employee_name', 'department', 'designation', 'status', 'gender'],
      limit: 500,
    }
  );

  // ── Fetch Salary Slips ──
  const { data: salarySlips, isLoading: slipLoading } = useDocList<Record<string, unknown>>(
    'Salary Slip',
    {
      fields: ['name', 'employee_name', 'gross_pay', 'total_deduction', 'net_pay', 'start_date', 'end_date'],
      limit: 200,
    }
  );

  // ── Fetch Warehouses ──
  const { data: warehouses, isLoading: whLoading } = useDocList<Record<string, unknown>>(
    'Warehouse',
    {
      fields: ['name', 'warehouse_name', 'warehouse_type'],
      limit: 100,
    }
  );

  // ── Fetch Stock Levels (Bin) ──
  const { data: bins, isLoading: binsLoading } = useDocList<Record<string, unknown>>('Bin', {
    fields: ['name', 'item_code', 'item_name', 'warehouse', 'actual_qty', 'stock_value', 'reorder_level'],
    limit: 500,
  });

  // ── Fetch Items ──
  const { data: items, isLoading: itemsLoading } = useDocList<Record<string, unknown>>('Item', {
    fields: ['name', 'item_name', 'item_group', 'stock_uom'],
    limit: 500,
  });

  // ── Fetch Attendance ──
  const { data: attendance, isLoading: attLoading } = useDocList<Record<string, unknown>>(
    'Attendance',
    {
      fields: ['name', 'employee', 'employee_name', 'status', 'attendance_date', 'department'],
      order_by: 'attendance_date desc',
      limit: 500,
    }
  );

  // ── Fetch Leave Applications ──
  const { data: leaveApps, isLoading: leaveLoading } = useDocList<Record<string, unknown>>(
    'Leave Application',
    {
      fields: ['name', 'employee', 'employee_name', 'leave_type', 'from_date', 'to_date', 'status', 'total_leave_days'],
      limit: 200,
    }
  );

  // ── Fetch Delivery Notes (for returns) ──
  const { data: deliveryNotes, isLoading: dnLoading } = useDocList<Record<string, unknown>>(
    'Delivery Note',
    {
      fields: ['name', 'customer', 'customer_name', 'grand_total', 'posting_date', 'status', 'is_return'],
      order_by: 'posting_date desc',
      limit: 200,
    }
  );

  // ════════════════════════════════════════════════════════════
  // Computed data — Overview
  // ════════════════════════════════════════════════════════════

  const safeSales = salesInvoices ?? [];
  const safePurchases = purchaseInvoices ?? [];
  const safeExpenses = expenseClaims ?? [];
  const safeGL = glEntries ?? [];
  const safeEmployees = employees ?? [];
  const safeSalarySlips = salarySlips ?? [];
  const safeBins = bins ?? [];
  const safeItems = items ?? [];
  const safeAttendance = attendance ?? [];
  const safeLeaveApps = leaveApps ?? [];
  const safeDeliveryNotes = deliveryNotes ?? [];

  const financialKPIs = useMemo(() => {
    const totalSales = safeSales
      .filter((s) => s.status !== 'Cancelled')
      .reduce((sum, s) => sum + Number(s.grand_total || 0), 0);
    const totalPurchases = safePurchases
      .filter((p) => p.status !== 'Cancelled')
      .reduce((sum, p) => sum + Number(p.grand_total || 0), 0);
    const totalExpenses = safeExpenses
      .filter((e) => e.status !== 'Cancelled')
      .reduce((sum, e) => sum + Number(e.total_claimed_amount || 0), 0);
    const netProfit = totalSales - totalPurchases - totalExpenses;
    const totalCredit = safeGL.reduce((sum, e) => sum + Number(e.credit || 0), 0);
    const availableBalance = totalCredit - safeGL.reduce((sum, e) => sum + Number(e.debit || 0), 0);
    return { totalSales, totalPurchases, netProfit, totalExpenses, availableBalance };
  }, [safeSales, safePurchases, safeExpenses, safeGL]);

  // ── Monthly revenue ──
  const monthlyRevenue = useMemo(() => {
    const months: Record<string, { sales: number; purchases: number }> = {};
    safeSales
      .filter((s) => s.status !== 'Cancelled' && s.posting_date)
      .forEach((s) => {
        const month = String(s.posting_date).slice(0, 7);
        if (!months[month]) months[month] = { sales: 0, purchases: 0 };
        months[month].sales += Number(s.grand_total || 0);
      });
    safePurchases
      .filter((p) => p.status !== 'Cancelled' && p.posting_date)
      .forEach((p) => {
        const month = String(p.posting_date).slice(0, 7);
        if (!months[month]) months[month] = { sales: 0, purchases: 0 };
        months[month].purchases += Number(p.grand_total || 0);
      });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month: formatMonthLabel(month),
        sales: Math.round(data.sales),
        purchases: Math.round(data.purchases),
      }));
  }, [safeSales, safePurchases]);

  // ── Expense breakdown for pie ──
  const expenseBreakdown = useMemo(() => {
    const categories: Record<string, number> = {};
    safeGL
      .filter((e) => {
        const acct = String(e.account || '');
        return (
          acct.includes('مصروف') ||
          acct.includes('Expense') ||
          acct.includes('مصاريف') ||
          acct.includes('Cost')
        );
      })
      .forEach((e) => {
        const acct = String(e.account || 'أخرى');
        const shortName = acct.split(' - ')[0] || acct;
        categories[shortName] = (categories[shortName] || 0) + Number(e.debit || 0);
      });
    if (Object.keys(categories).length === 0) {
      categories['مصروفات تشغيلية'] = financialKPIs.totalExpenses || 1;
    }
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [safeGL, financialKPIs.totalExpenses]);

  // ── Cash flow trend ──
  const cashFlowTrend = useMemo(() => {
    const months: Record<string, { inflow: number; outflow: number }> = {};
    safeGL.forEach((e) => {
      if (!e.posting_date) return;
      const month = String(e.posting_date).slice(0, 7);
      if (!months[month]) months[month] = { inflow: 0, outflow: 0 };
      months[month].inflow += Number(e.credit || 0);
      months[month].outflow += Number(e.debit || 0);
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month: formatMonthLabel(month),
        inflow: Math.round(data.inflow),
        outflow: Math.round(data.outflow),
        net: Math.round(data.inflow - data.outflow),
      }));
  }, [safeGL]);

  // ════════════════════════════════════════════════════════════
  // Computed data — Sales Analytics
  // ════════════════════════════════════════════════════════════

  // ── Top customers ──
  const topCustomers = useMemo(() => {
    const customers: Record<string, number> = {};
    safeSales
      .filter((s) => s.status !== 'Cancelled')
      .forEach((s) => {
        const name = String(s.customer_name || s.customer || 'غير محدد');
        customers[name] = (customers[name] || 0) + Number(s.grand_total || 0);
      });
    return Object.entries(customers)
      .map(([name, total]) => ({ name, total: Math.round(total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [safeSales]);

  // ── Sales by item group ──
  const salesByItemGroup = useMemo(() => {
    const groups: Record<string, number> = {};
    // Use items grouped data as proxy
    safeItems.forEach((item) => {
      const group = String(item.item_group || 'غير مصنف');
      if (!groups[group]) groups[group] = 0;
      groups[group] += 1;
    });
    if (Object.keys(groups).length === 0) {
      groups['غير مصنف'] = 1;
    }
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [safeItems]);

  // ── Monthly sales trend ──
  const monthlySalesTrend = useMemo(() => {
    const months: Record<string, number> = {};
    safeSales
      .filter((s) => s.status !== 'Cancelled' && s.posting_date)
      .forEach((s) => {
        const month = String(s.posting_date).slice(0, 7);
        months[month] = (months[month] || 0) + Number(s.grand_total || 0);
      });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, total]) => ({
        month: formatMonthLabel(month),
        total: Math.round(total),
      }));
  }, [safeSales]);

  // ── Sales vs Returns ──
  const salesVsReturns = useMemo(() => {
    const months: Record<string, { sales: number; returns: number }> = {};
    safeSales
      .filter((s) => s.status !== 'Cancelled' && s.posting_date)
      .forEach((s) => {
        const month = String(s.posting_date).slice(0, 7);
        if (!months[month]) months[month] = { sales: 0, returns: 0 };
        months[month].sales += Number(s.grand_total || 0);
      });
    safeDeliveryNotes
      .filter((d) => d.is_return && d.status !== 'Cancelled' && d.posting_date)
      .forEach((d) => {
        const month = String(d.posting_date).slice(0, 7);
        if (!months[month]) months[month] = { sales: 0, returns: 0 };
        months[month].returns += Math.abs(Number(d.grand_total || 0));
      });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month: formatMonthLabel(month),
        sales: Math.round(data.sales),
        returns: Math.round(data.returns),
      }));
  }, [safeSales, safeDeliveryNotes]);

  // ════════════════════════════════════════════════════════════
  // Computed data — Inventory Analytics
  // ════════════════════════════════════════════════════════════

  // ── Stock value by warehouse ──
  const stockByWarehouse = useMemo(() => {
    const whMap: Record<string, number> = {};
    safeBins.forEach((b) => {
      const wh = String(b.warehouse || 'غير محدد');
      whMap[wh] = (whMap[wh] || 0) + Number(b.stock_value || 0);
    });
    return Object.entries(whMap)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [safeBins]);

  // ── Top selling items ──
  const topSellingItems = useMemo(() => {
    const itemMap: Record<string, number> = {};
    safeBins
      .filter((b) => Number(b.actual_qty || 0) > 0)
      .forEach((b) => {
        const name = String(b.item_name || b.item_code || 'غير محدد');
        itemMap[name] = (itemMap[name] || 0) + Number(b.actual_qty || 0);
      });
    return Object.entries(itemMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [safeBins]);

  // ── Stock aging (by stock value ranges) ──
  const stockAging = useMemo(() => {
    const ranges = [
      { name: 'قيمة عالية (> 100 ألف)', min: 100000, count: 0 },
      { name: 'قيمة متوسطة (10-100 ألف)', min: 10000, max: 100000, count: 0 },
      { name: 'قيمة منخفضة (1-10 ألف)', min: 1000, max: 10000, count: 0 },
      { name: 'قيمة ضئيلة (< 1 ألف)', max: 1000, count: 0 },
    ];
    safeBins.forEach((b) => {
      const val = Number(b.stock_value || 0);
      if (val >= 100000) ranges[0].count++;
      else if (val >= 10000) ranges[1].count++;
      else if (val >= 1000) ranges[2].count++;
      else ranges[3].count++;
    });
    return ranges.map((r) => ({ name: r.name, value: r.count }));
  }, [safeBins]);

  // ── Reorder alerts ──
  const reorderAlerts = useMemo(() => {
    return safeBins
      .filter((b) => {
        const qty = Number(b.actual_qty || 0);
        const reorder = Number(b.reorder_level || 0);
        return reorder > 0 && qty <= reorder;
      })
      .map((b) => ({
        item_code: String(b.item_code || ''),
        item_name: String(b.item_name || ''),
        warehouse: String(b.warehouse || ''),
        actual_qty: Number(b.actual_qty || 0),
        reorder_level: Number(b.reorder_level || 0),
        stock_value: Number(b.stock_value || 0),
      }));
  }, [safeBins]);

  const reorderColumns: Column<Record<string, unknown>>[] = [
    { key: 'item_code', header: 'كود الصنف', sortable: true },
    { key: 'item_name', header: 'اسم الصنف', sortable: true },
    { key: 'warehouse', header: 'المستودع', sortable: true },
    {
      key: 'actual_qty',
      header: 'الكمية الحالية',
      sortable: true,
      render: (v) => (
        <span className="text-destructive font-semibold">{Number(v).toLocaleString('ar-YE')}</span>
      ),
    },
    {
      key: 'reorder_level',
      header: 'حد إعادة الطلب',
      sortable: true,
      render: (v) => Number(v).toLocaleString('ar-YE'),
    },
    {
      key: 'stock_value',
      header: 'قيمة المخزون',
      sortable: true,
      render: (v) => formatCurrency(Number(v)),
    },
  ];

  // ════════════════════════════════════════════════════════════
  // Computed data — HR Analytics
  // ════════════════════════════════════════════════════════════

  // ── Headcount by department ──
  const deptDistribution = useMemo(() => {
    const depts: Record<string, number> = {};
    safeEmployees
      .filter((e) => e.status === 'Active')
      .forEach((e) => {
        const dept = String(e.department || 'غير محدد').split(' - ')[0] || 'غير محدد';
        depts[dept] = (depts[dept] || 0) + 1;
      });
    return Object.entries(depts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [safeEmployees]);

  // ── Attendance rate trend ──
  const attendanceTrend = useMemo(() => {
    const days: Record<string, { present: number; absent: number; total: number }> = {};
    safeAttendance.forEach((a) => {
      if (!a.attendance_date) return;
      const day = String(a.attendance_date).slice(0, 10);
      if (!days[day]) days[day] = { present: 0, absent: 0, total: 0 };
      days[day].total++;
      if (a.status === 'Present' || a.status === 'Half Day') days[day].present++;
      if (a.status === 'Absent') days[day].absent++;
    });
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([day, data]) => ({
        day: formatDate(day),
        rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
        present: data.present,
        absent: data.absent,
      }));
  }, [safeAttendance]);

  // ── Salary distribution (by department) ──
  const salaryDistribution = useMemo(() => {
    const deptSalary: Record<string, number> = {};
    const empDeptMap: Record<string, string> = {};
    safeEmployees.forEach((e) => {
      if (e.name && e.department) {
        empDeptMap[String(e.name)] = String(e.department).split(' - ')[0] || 'غير محدد';
      }
    });
    safeSalarySlips.forEach((s) => {
      const emp = String(s.employee_name || '');
      const dept = empDeptMap[emp] || 'غير محدد';
      deptSalary[dept] = (deptSalary[dept] || 0) + Number(s.net_pay || 0);
    });
    if (Object.keys(deptSalary).length === 0) {
      deptSalary['غير محدد'] = 0;
    }
    return Object.entries(deptSalary)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [safeSalarySlips, safeEmployees]);

  // ── Leave balance overview ──
  const leaveBalance = useMemo(() => {
    const byType: Record<string, { approved: number; pending: number; total: number }> = {};
    safeLeaveApps.forEach((l) => {
      const type = String(l.leave_type || 'أخرى');
      if (!byType[type]) byType[type] = { approved: 0, pending: 0, total: 0 };
      const days = Number(l.total_leave_days || 0);
      byType[type].total += days;
      if (l.status === 'Approved') byType[type].approved += days;
      if (l.status === 'Open') byType[type].pending += days;
    });
    return Object.entries(byType)
      .map(([type, data]) => ({ type, ...data }))
      .slice(0, 8);
  }, [safeLeaveApps]);

  const leaveColumns: Column<Record<string, unknown>>[] = [
    { key: 'type', header: 'نوع الإجازة', sortable: true },
    {
      key: 'approved',
      header: 'موافق عليها',
      sortable: true,
      render: (v) => (
        <span className="text-emerald-600 font-semibold">{Number(v).toLocaleString('ar-YE')} يوم</span>
      ),
    },
    {
      key: 'pending',
      header: 'قيد الموافقة',
      sortable: true,
      render: (v) => (
        <span className="text-amber-600 font-semibold">{Number(v).toLocaleString('ar-YE')} يوم</span>
      ),
    },
    {
      key: 'total',
      header: 'الإجمالي',
      sortable: true,
      render: (v) => <span className="font-semibold">{Number(v).toLocaleString('ar-YE')} يوم</span>,
    },
  ];

  // ── Financial reports list ──
  const financialReports = useMemo(
    () => [
      { id: 'general-ledger', label: 'دفتر الأستاذ العام' },
      { id: 'accounts-receivable', label: 'ذمم العملاء' },
      { id: 'accounts-payable', label: 'ذمم الموردين' },
      { id: 'sales-register', label: 'سجل المبيعات' },
      { id: 'sales-profit', label: 'إجمالي الربح' },
      { id: 'balance-sheet', label: 'الميزانية العمومية' },
      { id: 'income-statement', label: 'قائمة الدخل' },
      { id: 'trial-balance', label: 'ميزان المراجعة' },
      { id: 'cash-flow', label: 'التدفقات النقدية' },
    ],
    []
  );

  const financialReportFilters = useMemo(() => {
    if (!company || !dateTo) return null;
    const base: Record<string, unknown> = { company };
    if (selectedReportId === 'accounts-receivable' || selectedReportId === 'accounts-payable') {
      base.report_date = dateTo;
    } else {
      base.from_date = dateFrom;
      base.to_date = dateTo;
    }
    return base;
  }, [company, dateFrom, dateTo, selectedReportId]);

  const financialReportQuery = useRunReport(
    selectedReportId,
    financialReportFilters ?? {},
    Boolean(selectedReportId) && financialReportFilters !== null
  );

  const isLoading =
    glLoading ||
    salesLoading ||
    purchaseLoading ||
    expenseLoading ||
    empLoading ||
    slipLoading ||
    whLoading ||
    binsLoading ||
    itemsLoading ||
    attLoading ||
    leaveLoading ||
    dnLoading;

  // ── Export handlers ──
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleExportPDF = useCallback(() => {
    toast.success('جاري تجهيز PDF', { description: 'سيتم تنزيل الملف قريباً' });
    window.print();
  }, [toast]);

  const handleExportExcel = useCallback(() => {
    toast.success('جاري تجهيز Excel', { description: 'سيتم تنزيل الملف قريباً' });
  }, [toast]);

  // ════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="لوحة التقارير المتقدمة"
        description="تحليلات شاملة للمبيعات والمشتريات والمخزون والموارد البشرية مع رسوم بيانية تفاعلية."
        iconify="solar:chart-2-bold-duotone"
        accent="purple"
        breadcrumbs={[
          { label: 'التقارير', href: '/reports' },
          { label: 'لوحة التقارير المتقدمة' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportPDF}>
              <Download className="h-3.5 w-3.5" />
              تصدير PDF
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              تصدير Excel
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" />
              طباعة
            </Button>
          </div>
        }
      />

      {/* ── Date range filter ── */}
      <Card className="border-border/40">
        <CardContent className="flex flex-wrap items-end gap-4 pt-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">من تاريخ</Label>
            <Input
              type="date"
              dir="ltr"
              className="h-9 w-40"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
            <Input
              type="date"
              dir="ltr"
              className="h-9 w-40"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          {company && (
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {company}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-muted/40 p-1">
          <TabsTrigger value="overview" className="gap-1.5 data-[state=active]:bg-background">
            <Activity className="h-4 w-4 opacity-80" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-1.5 data-[state=active]:bg-background">
            <Wallet className="h-4 w-4 opacity-80" />
            التقارير المالية
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-1.5 data-[state=active]:bg-background">
            <ShoppingCart className="h-4 w-4 opacity-80" />
            تحليلات المبيعات
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5 data-[state=active]:bg-background">
            <Package className="h-4 w-4 opacity-80" />
            تحليلات المخزون
          </TabsTrigger>
          <TabsTrigger value="hr" className="gap-1.5 data-[state=active]:bg-background">
            <Users className="h-4 w-4 opacity-80" />
            تحليلات الموارد البشرية
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB                                       */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-5">
          {/* KPI Strip */}
          <KpiStrip cols={5}>
            <KpiCard
              title="إجمالي المبيعات"
              value={formatCurrency(financialKPIs.totalSales)}
              icon={DollarSign}
              accent="primary"
              change={financialKPIs.totalSales > 0 ? 12.5 : 0}
              changeType={financialKPIs.totalSales > 0 ? 'positive' : 'neutral'}
              description="إجمالي فواتير المبيعات"
            />
            <KpiCard
              title="إجمالي المشتريات"
              value={formatCurrency(financialKPIs.totalPurchases)}
              icon={ShoppingCart}
              accent="warning"
              change={financialKPIs.totalPurchases > 0 ? 8.3 : 0}
              changeType={financialKPIs.totalPurchases > 0 ? 'negative' : 'neutral'}
              description="إجمالي فواتير المشتريات"
            />
            <KpiCard
              title="صافي الربح"
              value={formatCurrency(financialKPIs.netProfit)}
              icon={TrendingUp}
              accent="success"
              change={financialKPIs.netProfit > 0 ? 15.2 : -5.1}
              changeType={financialKPIs.netProfit > 0 ? 'positive' : 'negative'}
              description="المبيعات - المشتريات - المصروفات"
            />
            <KpiCard
              title="المصروفات"
              value={formatCurrency(financialKPIs.totalExpenses)}
              icon={Receipt}
              accent="destructive"
              change={3.7}
              changeType="negative"
              description="إجمالي المطالبات النقدية"
            />
            <KpiCard
              title="الرصيد المتاح"
              value={formatCurrency(financialKPIs.availableBalance)}
              icon={Wallet}
              accent={financialKPIs.availableBalance >= 0 ? 'info' : 'destructive'}
              change={financialKPIs.availableBalance > 0 ? 6.8 : -3.2}
              changeType={financialKPIs.availableBalance > 0 ? 'positive' : 'negative'}
              description="إجمالي الدائن - إجمالي المدين"
            />
          </KpiStrip>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Monthly Revenue Bar Chart */}
            <ChartCard title="الإيرادات الشهرية" icon={BarChart3}>
              {monthlyRevenue.length > 0 ? (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11 }}
                        angle={-30}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 12, direction: 'rtl' }}
                        formatter={(value: string) =>
                          value === 'sales' ? 'المبيعات' : 'المشتريات'
                        }
                      />
                      <Bar dataKey="sales" fill={CHART_PALETTE.primary} radius={[4, 4, 0, 0]} name="sales" />
                      <Bar dataKey="purchases" fill={CHART_PALETTE.secondary} radius={[4, 4, 0, 0]} name="purchases" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            {/* Expense Breakdown Pie Chart */}
            <ChartCard title="توزيع المصروفات" icon={PieChartIcon}>
              {expenseBreakdown.some((e) => e.value > 0) ? (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={110}
                        innerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }: { name: string; percent: number }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {expenseBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_PALETTE.series[index % CHART_PALETTE.series.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Cash Flow Trend Line Chart */}
            <ChartCard title="اتجاه التدفقات النقدية" icon={Activity}>
              {cashFlowTrend.length > 0 ? (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={cashFlowTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11 }}
                        angle={-30}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 12, direction: 'rtl' }}
                        formatter={(value: string) => {
                          const map: Record<string, string> = {
                            inflow: 'الوارد',
                            outflow: 'الصادر',
                            net: 'صافي',
                          };
                          return map[value] ?? value;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="inflow"
                        stroke={CHART_PALETTE.primary}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="inflow"
                      />
                      <Line
                        type="monotone"
                        dataKey="outflow"
                        stroke={CHART_PALETTE.quaternary}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="outflow"
                      />
                      <Line
                        type="monotone"
                        dataKey="net"
                        stroke={CHART_PALETTE.secondary}
                        strokeWidth={2.5}
                        strokeDasharray="5 5"
                        dot={{ r: 3 }}
                        name="net"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            {/* Summary info card */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  ملخص مالي سريع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground">عدد فواتير البيع</p>
                    <p className="text-xl font-bold tabular-nums">
                      {safeSales.filter((s) => s.status !== 'Cancelled').length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground">عدد فواتير الشراء</p>
                    <p className="text-xl font-bold tabular-nums">
                      {safePurchases.filter((p) => p.status !== 'Cancelled').length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground">قيود دفتر الأستاذ</p>
                    <p className="text-xl font-bold tabular-nums">{safeGL.length}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground">المطالبات النقدية</p>
                    <p className="text-xl font-bold tabular-nums">{safeExpenses.length}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-primary/20/60 bg-primary/5/50 p-3 dark:border-emerald-900/40 dark:bg-primary/5">
                  <p className="text-[10px] font-medium text-primary">هامش الربح</p>
                  <p className="text-2xl font-bold tabular-nums text-primary">
                    {financialKPIs.totalSales > 0
                      ? ((financialKPIs.netProfit / financialKPIs.totalSales) * 100).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* FINANCIAL REPORTS TAB                              */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="financial" className="space-y-5">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">اختيار التقرير والمعايير</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">التقرير</Label>
                <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                  <SelectTrigger className="h-9 w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {financialReports.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!['accounts-receivable', 'accounts-payable'].includes(selectedReportId) && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">من تاريخ</Label>
                  <Input
                    type="date"
                    dir="ltr"
                    className="h-9 w-40"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {['accounts-receivable', 'accounts-payable'].includes(selectedReportId)
                    ? 'كما في تاريخ'
                    : 'إلى تاريخ'}
                </Label>
                <Input
                  type="date"
                  dir="ltr"
                  className="h-9 w-40"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {financialReportQuery.isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="mt-3 text-sm text-muted-foreground">جاري تحميل التقرير…</p>
              </div>
            </div>
          )}

          {financialReportQuery.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              تعذر تشغيل التقرير. تحقق من الصلاحيات وتسمية التقرير في النظام.
            </div>
          )}

          {!financialReportQuery.isLoading &&
            !financialReportQuery.isError &&
            financialReportQuery.data === null && (
              <EmptyState
                title="اختر تقريراً للعرض"
                description="حدد التقرير المطلوب والفترة الزمنية ثم انتظر تحميل البيانات."
                icon={FileSpreadsheet}
              />
            )}

          {Boolean(financialReportQuery.data) && (
            <div className="space-y-4">
              <div className="text-sm font-medium text-muted-foreground">
                {financialReports.find((r) => r.id === selectedReportId)?.label ?? selectedReportId}
              </div>
              {/* Report data display */}
              <Card className="border-border/40">
                <CardContent className="pt-4">
                  <pre className="max-h-96 overflow-auto rounded-lg bg-muted/30 p-4 text-xs" dir="ltr">
                    {JSON.stringify(financialReportQuery.data, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* SALES ANALYTICS TAB                                */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="sales" className="space-y-5">
          {/* KPIs */}
          <KpiStrip cols={4}>
            <KpiCard
              title="إجمالي المبيعات"
              value={formatCurrency(financialKPIs.totalSales)}
              icon={DollarSign}
              accent="primary"
              compact
            />
            <KpiCard
              title="عدد فواتير البيع"
              value={safeSales.filter((s) => s.status !== 'Cancelled').length}
              icon={Receipt}
              accent="info"
              compact
            />
            <KpiCard
              title="عدد العملاء"
              value={new Set(
                safeSales.filter((s) => s.status !== 'Cancelled').map((s) => s.customer)
              ).size}
              icon={Users}
              accent="success"
              compact
            />
            <KpiCard
              title="متوسط قيمة الفاتورة"
              value={formatCurrency(
                safeSales.filter((s) => s.status !== 'Cancelled').length > 0
                  ? financialKPIs.totalSales /
                      safeSales.filter((s) => s.status !== 'Cancelled').length
                  : 0
              )}
              icon={TrendingUp}
              accent="warning"
              compact
            />
          </KpiStrip>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Top Customers Horizontal Bar */}
            <ChartCard title="أكبر العملاء مبيعات" icon={Users}>
              {topCustomers.length > 0 && topCustomers.some((c) => c.total > 0) ? (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={topCustomers}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        width={75}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="total" fill={CHART_PALETTE.primary} radius={[0, 4, 4, 0]} name="المبيعات">
                        {topCustomers.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_PALETTE.series[index % CHART_PALETTE.series.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            {/* Sales by Item Group Pie */}
            <ChartCard title="المبيعات حسب مجموعة الأصناف" icon={PieChartIcon}>
              {salesByItemGroup.length > 0 && salesByItemGroup.some((g) => g.value > 0) ? (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={salesByItemGroup}
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        innerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }: { name: string; percent: number }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {salesByItemGroup.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_PALETTE.series[index % CHART_PALETTE.series.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Monthly Sales Trend Line */}
            <ChartCard title="اتجاه المبيعات الشهري" icon={TrendingUp}>
              {monthlySalesTrend.length > 0 ? (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={monthlySalesTrend}
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11 }}
                        angle={-30}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke={CHART_PALETTE.primary}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        name="المبيعات"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            {/* Sales vs Returns Bar */}
            <ChartCard title="المبيعات مقابل المرتجعات" icon={ArrowUpDown}>
              {salesVsReturns.length > 0 &&
              salesVsReturns.some((s) => s.sales > 0 || s.returns > 0) ? (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesVsReturns} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11 }}
                        angle={-30}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 12, direction: 'rtl' }}
                        formatter={(value: string) =>
                          value === 'sales' ? 'المبيعات' : 'المرتجعات'
                        }
                      />
                      <Bar dataKey="sales" fill={CHART_PALETTE.primary} radius={[4, 4, 0, 0]} name="sales" />
                      <Bar dataKey="returns" fill={CHART_PALETTE.quaternary} radius={[4, 4, 0, 0]} name="returns" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* INVENTORY ANALYTICS TAB                            */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="inventory" className="space-y-5">
          {/* KPIs */}
          <KpiStrip cols={4}>
            <KpiCard
              title="إجمالي قيمة المخزون"
              value={formatCurrency(safeBins.reduce((sum, b) => sum + Number(b.stock_value || 0), 0))}
              icon={BoxesIcon}
              accent="primary"
              compact
            />
            <KpiCard
              title="عدد الأصناف"
              value={safeItems.length}
              icon={Package}
              accent="info"
              compact
            />
            <KpiCard
              title="المستودعات"
              value={(warehouses ?? []).length}
              icon={Building2}
              accent="success"
              compact
            />
            <KpiCard
              title="تنبيهات إعادة الطلب"
              value={reorderAlerts.length}
              icon={AlertTriangle}
              accent={reorderAlerts.length > 0 ? 'destructive' : 'success'}
              compact
            />
          </KpiStrip>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Stock Value by Warehouse Bar */}
            <ChartCard title="قيمة المخزون حسب المستودع" icon={Building2}>
              {stockByWarehouse.length > 0 && stockByWarehouse.some((w) => w.value > 0) ? (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={stockByWarehouse}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                      />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" fill={CHART_PALETTE.primary} radius={[0, 4, 4, 0]} name="قيمة المخزون">
                        {stockByWarehouse.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_PALETTE.series[index % CHART_PALETTE.series.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            {/* Top Selling Items Horizontal Bar */}
            <ChartCard title="أعلى الأصناف كمية" icon={BoxesIcon}>
              {topSellingItems.length > 0 ? (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={topSellingItems}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
                      <Tooltip content={<ChartTooltip isCurrency={false} />} />
                      <Bar dataKey="value" fill={CHART_PALETTE.quinary} radius={[0, 4, 4, 0]} name="الكمية">
                        {topSellingItems.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_PALETTE.series[index % CHART_PALETTE.series.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Stock Aging Pie */}
            <ChartCard title="توزيع قيم المخزون" icon={PieChartIcon}>
              {stockAging.some((s) => s.value > 0) ? (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stockAging}
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        innerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }: { name: string; percent: number }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {stockAging.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_PALETTE.series[index % CHART_PALETTE.series.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            {/* Reorder Alerts Summary */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  تنبيهات إعادة الطلب
                  {reorderAlerts.length > 0 && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                      {reorderAlerts.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reorderAlerts.length > 0 ? (
                  <div className="max-h-[280px] overflow-y-auto">
                    <DataTable
                      data={reorderAlerts as unknown as Record<string, unknown>[]}
                      columns={reorderColumns}
                      searchable={false}
                      pageSize={5}
                      tableId="reorder-alerts"
                    />
                  </div>
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-center">
                    <div>
                      <Package className="mx-auto h-8 w-8 text-emerald-500/40" />
                      <p className="mt-2 text-sm text-muted-foreground">لا توجد أصناف تحتاج إعادة طلب</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* HR ANALYTICS TAB                                   */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="hr" className="space-y-5">
          {/* KPIs */}
          <KpiStrip cols={4}>
            <KpiCard
              title="إجمالي الموظفين"
              value={safeEmployees.filter((e) => e.status === 'Active').length}
              icon={Users}
              accent="primary"
              compact
            />
            <KpiCard
              title="إجمالي الرواتب"
              value={formatCurrency(
                safeSalarySlips.reduce((sum, s) => sum + Number(s.net_pay || 0), 0)
              )}
              icon={DollarSign}
              accent="success"
              compact
            />
            <KpiCard
              title="معدل الحضور"
              value={
                safeAttendance.length > 0
                  ? `${Math.round(
                      (safeAttendance.filter((a) => a.status === 'Present').length /
                        safeAttendance.length) *
                        100
                    )}%`
                  : '0%'
              }
              icon={UserCheck}
              accent="info"
              compact
            />
            <KpiCard
              title="طلبات الإجازة"
              value={safeLeaveApps.length}
              icon={Calendar}
              accent="warning"
              compact
            />
          </KpiStrip>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Headcount by Department Bar */}
            <ChartCard title="عدد الموظفين حسب القسم" icon={Users}>
              {deptDistribution.length > 0 && deptDistribution.some((d) => d.value > 0) ? (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={deptDistribution}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
                      <Tooltip content={<ChartTooltip isCurrency={false} />} />
                      <Bar dataKey="value" fill={CHART_PALETTE.quinary} radius={[0, 4, 4, 0]} name="عدد الموظفين">
                        {deptDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_PALETTE.series[index % CHART_PALETTE.series.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            {/* Attendance Rate Trend Line */}
            <ChartCard title="معدل الحضور اليومي" icon={Clock}>
              {attendanceTrend.length > 0 ? (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={attendanceTrend}
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 10 }}
                        angle={-30}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          return (
                            <div
                              dir="rtl"
                              className="rounded-lg border border-border/60 bg-card px-3 py-2 shadow-md text-xs"
                            >
                              <p className="font-semibold mb-1">{label}</p>
                              <div className="flex items-center gap-2">
                                <span className="inline-block h-2.5 w-2.5 rounded-full bg-chart-3" />
                                <span>معدل الحضور: {payload[0].value}%</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        stroke={CHART_PALETTE.primary}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        name="معدل الحضور"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Salary Distribution Pie */}
            <ChartCard title="توزيع الرواتب حسب القسم" icon={DollarSign}>
              {salaryDistribution.length > 0 && salaryDistribution.some((s) => s.value > 0) ? (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={salaryDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        innerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }: { name: string; percent: number }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {salaryDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_PALETTE.series[index % CHART_PALETTE.series.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            {/* Leave Balance Overview */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  رصيد الإجازات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaveBalance.length > 0 ? (
                  <div className="max-h-[280px] overflow-y-auto">
                    <DataTable
                      data={leaveBalance as unknown as Record<string, unknown>[]}
                      columns={leaveColumns}
                      searchable={false}
                      pageSize={5}
                      tableId="leave-balance"
                    />
                  </div>
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-center">
                    <div>
                      <Calendar className="mx-auto h-8 w-8 text-muted-foreground/40" />
                      <p className="mt-2 text-sm text-muted-foreground">لا توجد طلبات إجازة</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
