'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { KpiCard } from '@/components/erp/kpi-card';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { toast } from 'sonner';
import {
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  DollarSign,
  Percent,
  Users,
  Trophy,
  Award,
  Calculator,
  HandCoins,
  Banknote,
  Target,
  TrendingUp,
  CheckCircle,
  XCircle,
  ChevronDown,
  Filter,
  Loader2,
  UserCheck,
  CircleDollarSign,
  BarChart3,
  Clock,
  Wallet,
  BadgeDollarSign,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatCurrency } from '@/lib/core/helpers';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommissionRule {
  name: string;
  rule_name?: string;
  period?: string;
  calculation_basis?: string;
  target_amount?: number;
  target_quantity?: number;
  commission_rate?: number;
  commission_amount_fixed?: number;
  commission_type?: string;
  assigned_employees?: string;
  status?: string;
  disable?: number | boolean;
  creation?: string;
}

interface CommissionCalculation {
  name: string;
  employee?: string;
  employee_name?: string;
  period?: string;
  sales_amount?: number;
  sales_quantity?: number;
  target_amount?: number;
  achievement_percentage?: number;
  commission_amount?: number;
  status?: string;
  rule?: string;
  pay_method?: string;
  from_date?: string;
  to_date?: string;
  creation?: string;
}

interface EmployeeSummary {
  employee: string;
  employee_name: string;
  total_commission: number;
  total_sales: number;
  calculation_count: number;
  paid_count: number;
  pending_count: number;
}

// ─── Maps ────────────────────────────────────────────────────────────────────

const PERIOD_MAP: Record<string, string> = {
  Monthly: 'شهري',
  Quarterly: 'ربع سنوي',
  Yearly: 'سنوي',
};

const PERIOD_OPTIONS = [
  { value: 'Monthly', label: 'شهري' },
  { value: 'Quarterly', label: 'ربع سنوي' },
  { value: 'Yearly', label: 'سنوي' },
];

const BASIS_MAP: Record<string, string> = {
  sales_amount: 'مبلغ المبيعات',
  sales_quantity: 'كمية المبيعات',
  paid_invoices: 'الفواتير المدفوعة',
};

const BASIS_OPTIONS = [
  { value: 'sales_amount', label: 'مبلغ المبيعات' },
  { value: 'sales_quantity', label: 'كمية المبيعات' },
  { value: 'paid_invoices', label: 'الفواتير المدفوعة' },
];

const COMMISSION_TYPE_OPTIONS = [
  { value: 'percentage', label: 'نسبة مئوية' },
  { value: 'fixed', label: 'مبلغ ثابت' },
];

const CALC_STATUS_MAP: Record<string, { label: string; color: string }> = {
  Pending: { label: 'قيد الانتظار', color: 'bg-warning/12 text-warning ring-1 ring-inset ring-warning/25' },
  Paid: { label: 'مدفوع', color: 'bg-success/12 text-success ring-1 ring-inset ring-success/25' },
  'Added to Salary': { label: 'مضاف للراتب', color: 'bg-info/12 text-info ring-1 ring-inset ring-info/25' },
  Cancelled: { label: 'ملغي', color: 'bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25' },
};

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchCommissionRules(): Promise<CommissionRule[]> {
  try {
    const res = await fetch('/api/erpnext/commissions?fields=' + encodeURIComponent(JSON.stringify(['*'])) + '&limit=500');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'فشل تحميل البيانات');
    return json.data || [];
  } catch {
    return [];
  }
}

async function fetchCommissionCalculations(): Promise<CommissionCalculation[]> {
  try {
    const res = await fetch('/api/erpnext/commissions?sub=calculations&fields=' + encodeURIComponent(JSON.stringify(['*'])) + '&limit=500');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'فشل تحميل البيانات');
    return json.data || [];
  } catch {
    return [];
  }
}

async function createCommissionRule(payload: Record<string, unknown>): Promise<unknown> {
  const res = await fetch('/api/erpnext/commissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل الإنشاء');
  return json.data;
}

async function updateCommissionRule(name: string, payload: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`/api/erpnext/commissions/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل التحديث');
  return json.data;
}

async function deleteCommissionRule(name: string): Promise<void> {
  const res = await fetch(`/api/erpnext/commissions/${encodeURIComponent(name)}`, { method: 'DELETE' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل الحذف');
}

async function payCommission(calculationName: string, payMethod: 'salary' | 'expense'): Promise<unknown> {
  const res = await fetch('/api/erpnext/commissions/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ calculation_name: calculationName, pay_method: payMethod }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل صرف العمولة');
  return json.data;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SalesCommissionsPage() {
  // ── State ──
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [calculations, setCalculations] = useState<CommissionCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculationsLoading, setCalculationsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState('rules');

  // ── Dialog states ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CommissionRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommissionRule | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<CommissionCalculation | null>(null);
  const [payingName, setPayingName] = useState<string | null>(null);

  // ── Filters ──
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [calcStatusFilter, setCalcStatusFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  // ── Summary dialog ──
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryEmployee, setSummaryEmployee] = useState<string>('');

  // ── Form state ──
  const [formRuleName, setFormRuleName] = useState('');
  const [formPeriod, setFormPeriod] = useState('Monthly');
  const [formBasis, setFormBasis] = useState('sales_amount');
  const [formTargetAmount, setFormTargetAmount] = useState('');
  const [formTargetQuantity, setFormTargetQuantity] = useState('');
  const [formCommissionType, setFormCommissionType] = useState('percentage');
  const [formCommissionRate, setFormCommissionRate] = useState('');
  const [formCommissionFixed, setFormCommissionFixed] = useState('');
  const [formEmployees, setFormEmployees] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [creating, setCreating] = useState(false);

  // ── Load data ──
  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCommissionRules();
      setRules(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCalculations = useCallback(async () => {
    setCalculationsLoading(true);
    try {
      const data = await fetchCommissionCalculations();
      setCalculations(data);
    } catch {
      setCalculations([]);
    } finally {
      setCalculationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRules();
    void loadCalculations();
  }, [loadRules, loadCalculations]);

  // ── Helpers ──
  const chk = (v: unknown) => Number(v) === 1 || v === true;

  // ── Filtered rules ──
  const filteredRules = useMemo(() => {
    let result = rules;
    if (statusFilter === 'active') result = result.filter((r) => !chk(r.disable) && r.status !== 'Inactive');
    if (statusFilter === 'inactive') result = result.filter((r) => chk(r.disable) || r.status === 'Inactive');
    return result;
  }, [rules, statusFilter]);

  // ── Unique employees for filter ──
  const uniqueEmployees = useMemo(() => {
    const set = new Map<string, string>();
    for (const c of calculations) {
      if (c.employee && c.employee_name) {
        set.set(c.employee, c.employee_name);
      }
    }
    return Array.from(set.entries()).map(([id, name]) => ({ id, name }));
  }, [calculations]);

  // ── Unique periods for filter ──
  const uniquePeriods = useMemo(() => {
    const set = new Set<string>();
    for (const c of calculations) {
      if (c.period) set.add(c.period);
    }
    return Array.from(set);
  }, [calculations]);

  // ── Filtered calculations ──
  const filteredCalculations = useMemo(() => {
    let result = calculations;
    if (calcStatusFilter !== 'all') result = result.filter((c) => c.status === calcStatusFilter);
    if (employeeFilter !== 'all') result = result.filter((c) => c.employee === employeeFilter);
    if (periodFilter !== 'all') result = result.filter((c) => c.period === periodFilter);
    return result;
  }, [calculations, calcStatusFilter, employeeFilter, periodFilter]);

  // ── Employee summaries ──
  const employeeSummaries = useMemo((): EmployeeSummary[] => {
    const map = new Map<string, EmployeeSummary>();
    for (const c of calculations) {
      if (!c.employee) continue;
      const existing = map.get(c.employee) || {
        employee: c.employee,
        employee_name: c.employee_name || c.employee,
        total_commission: 0,
        total_sales: 0,
        calculation_count: 0,
        paid_count: 0,
        pending_count: 0,
      };
      existing.total_commission += Number(c.commission_amount) || 0;
      existing.total_sales += Number(c.sales_amount) || 0;
      existing.calculation_count += 1;
      if (c.status === 'Paid' || c.status === 'Added to Salary') existing.paid_count += 1;
      if (c.status === 'Pending') existing.pending_count += 1;
      map.set(c.employee, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.total_commission - a.total_commission);
  }, [calculations]);

  // ── KPIs ──
  const totalRules = rules.length;
  const activeRulesCount = rules.filter((r) => !chk(r.disable) && r.status !== 'Inactive').length;
  const totalCommissionsThisMonth = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    return calculations
      .filter((c) => {
        if (!c.creation) return false;
        const d = new Date(c.creation);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((sum, c) => sum + (Number(c.commission_amount) || 0), 0);
  }, [calculations]);
  const topEarner = useMemo(() => {
    if (employeeSummaries.length === 0) return '—';
    return employeeSummaries[0].employee_name;
  }, [employeeSummaries]);

  // ── Form helpers ──
  const resetForm = () => {
    setFormRuleName('');
    setFormPeriod('Monthly');
    setFormBasis('sales_amount');
    setFormTargetAmount('');
    setFormTargetQuantity('');
    setFormCommissionType('percentage');
    setFormCommissionRate('');
    setFormCommissionFixed('');
    setFormEmployees([]);
    setFormStatus('active');
    setEditTarget(null);
  };

  const openEditDialog = (row: CommissionRule) => {
    setEditTarget(row);
    setFormRuleName(row.rule_name || '');
    setFormPeriod(row.period || 'Monthly');
    setFormBasis(row.calculation_basis || 'sales_amount');
    setFormTargetAmount(row.target_amount ? String(row.target_amount) : '');
    setFormTargetQuantity(row.target_quantity ? String(row.target_quantity) : '');
    setFormCommissionType(row.commission_type || 'percentage');
    setFormCommissionRate(row.commission_rate ? String(row.commission_rate) : '');
    setFormCommissionFixed(row.commission_amount_fixed ? String(row.commission_amount_fixed) : '');
    setFormEmployees(row.assigned_employees ? row.assigned_employees.split(',').map((s) => s.trim()).filter(Boolean) : []);
    setFormStatus(chk(row.disable) || row.status === 'Inactive' ? 'inactive' : 'active');
    setDialogOpen(true);
  };

  // ── Create/Update handler ──
  const handleSave = async () => {
    if (!formRuleName.trim()) {
      toast.error('يرجى إدخال اسم القاعدة');
      return;
    }
    if (formEmployees.length === 0) {
      toast.error('يرجى اختيار موظف واحد على الأقل');
      return;
    }
    if (formCommissionType === 'percentage' && (!formCommissionRate || Number(formCommissionRate) <= 0)) {
      toast.error('يرجى إدخال نسبة العمولة');
      return;
    }
    if (formCommissionType === 'fixed' && (!formCommissionFixed || Number(formCommissionFixed) <= 0)) {
      toast.error('يرجى إدخال مبلغ العمولة');
      return;
    }

    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        rule_name: formRuleName.trim(),
        period: formPeriod,
        calculation_basis: formBasis,
        target_amount: Number(formTargetAmount) || 0,
        target_quantity: Number(formTargetQuantity) || 0,
        commission_type: formCommissionType,
        commission_rate: formCommissionType === 'percentage' ? Number(formCommissionRate) || 0 : 0,
        commission_amount_fixed: formCommissionType === 'fixed' ? Number(formCommissionFixed) || 0 : 0,
        assigned_employees: formEmployees.join(','),
        status: formStatus === 'active' ? 'Active' : 'Inactive',
        disable: formStatus === 'inactive' ? 1 : 0,
      };

      if (editTarget) {
        await updateCommissionRule(editTarget.name, payload);
        toast.success('تم تحديث قاعدة العمولة بنجاح');
      } else {
        await createCommissionRule(payload);
        toast.success('تم إنشاء قاعدة العمولة بنجاح');
      }

      setDialogOpen(false);
      resetForm();
      void loadRules();
    } catch (e) {
      toast.error((e as Error).message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setCreating(false);
    }
  };

  // ── Delete handler ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCommissionRule(deleteTarget.name);
      toast.success('تم حذف قاعدة العمولة بنجاح');
      setDeleteTarget(null);
      void loadRules();
    } catch (e) {
      toast.error((e as Error).message || 'فشل الحذف');
    }
  };

  // ── Pay commission handler ──
  const handlePay = async (method: 'salary' | 'expense') => {
    if (!payTarget) return;
    setPayingName(payTarget.name);
    try {
      await payCommission(payTarget.name, method);
      toast.success(method === 'salary' ? 'تمت إضافة العمولة إلى الراتب' : 'تم صرف العمولة كمصروف');
      setPayDialogOpen(false);
      setPayTarget(null);
      void loadCalculations();
    } catch (e) {
      toast.error((e as Error).message || 'فشل صرف العمولة');
    } finally {
      setPayingName(null);
    }
  };

  // ── View employee summary ──
  const handleViewSummary = (employee: string) => {
    setSummaryEmployee(employee);
    setSummaryOpen(true);
  };

  // ── Rules columns ──
  const rulesColumns: Column<CommissionRule>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرقم',
        sortable: true,
        width: 'w-36',
        render: (v) => <span className="font-semibold text-primary">{String(v)}</span>,
      },
      {
        key: 'rule_name',
        header: 'اسم القاعدة',
        sortable: true,
        render: (v) => <span className="font-medium">{String(v || '—')}</span>,
      },
      {
        key: 'period',
        header: 'الفترة',
        render: (v) => {
          const val = String(v || '');
          return (
            <Badge variant="outline" className="text-xs font-medium border-border/40">
              {PERIOD_MAP[val] || val || '—'}
            </Badge>
          );
        },
      },
      {
        key: 'calculation_basis',
        header: 'أساس الحساب',
        render: (v) => BASIS_MAP[String(v || '')] || String(v || '—'),
      },
      {
        key: 'target_amount',
        header: 'المستهدف',
        render: (v) => {
          const num = Number(v);
          return Number.isFinite(num) && num > 0 ? (
            <span className="tabular-nums font-medium">{formatCurrency(num)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        key: 'commission_rate',
        header: 'نسبة العمولة',
        render: (_v, row) => {
          if (row.commission_type === 'percentage') {
            const rate = Number(row.commission_rate);
            return Number.isFinite(rate) && rate > 0 ? (
              <span className="font-semibold tabular-nums text-success">{rate}%</span>
            ) : (
              '—'
            );
          }
          const fixed = Number(row.commission_amount_fixed);
          return Number.isFinite(fixed) && fixed > 0 ? (
            <span className="font-semibold tabular-nums text-success">{formatCurrency(fixed)}</span>
          ) : (
            '—'
          );
        },
      },
      {
        key: 'assigned_employees',
        header: 'الموظفون',
        render: (v) => {
          const list = String(v || '').split(',').filter(Boolean);
          if (list.length === 0) return <span className="text-muted-foreground">—</span>;
          if (list.length <= 2) return <span className="text-xs">{list.join(', ')}</span>;
          return (
            <span className="text-xs">
              {list.slice(0, 2).join(', ')}{' '}
              <Badge variant="secondary" className="text-[9px] h-4 px-1">+{list.length - 2}</Badge>
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (v, row) =>
          chk(row.disable) || v === 'Inactive' ? (
            <Badge variant="outline" className="text-xs font-medium bg-muted text-muted-foreground ring-1 ring-inset ring-border/40 border-0">
              غير نشط
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs font-medium bg-success/12 text-success ring-1 ring-inset ring-success/25 border-0">
              نشط
            </Badge>
          ),
      },
      {
        key: '_actions',
        header: 'إجراءات',
        width: 'w-28',
        render: (_v, row) => (
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2"
              onClick={() => openEditDialog(row)}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  // ── Calculations columns ──
  const calcColumns: Column<CommissionCalculation>[] = useMemo(
    () => [
      {
        key: 'employee_name',
        header: 'الموظف',
        sortable: true,
        render: (v, row) => (
          <span
            className="font-medium cursor-pointer hover:underline text-primary"
            onClick={() => row.employee && handleViewSummary(row.employee)}
          >
            {String(v || row.employee || '—')}
          </span>
        ),
      },
      {
        key: 'period',
        header: 'الفترة',
        sortable: true,
        render: (v) => String(v || '—'),
      },
      {
        key: 'sales_amount',
        header: 'مبلغ المبيعات',
        sortable: true,
        render: (v) => {
          const num = Number(v);
          return Number.isFinite(num) ? (
            <span className="tabular-nums">{formatCurrency(num)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        key: 'target_amount',
        header: 'المستهدف',
        render: (v) => {
          const num = Number(v);
          return Number.isFinite(num) && num > 0 ? (
            <span className="tabular-nums">{formatCurrency(num)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        key: 'achievement_percentage',
        header: 'نسبة الإنجاز',
        sortable: true,
        render: (v) => {
          const num = Number(v);
          if (!Number.isFinite(num)) return <span className="text-muted-foreground">—</span>;
          const color = num >= 100 ? 'text-success' : num >= 70 ? 'text-warning' : 'text-destructive';
          return (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', num >= 100 ? 'bg-success' : num >= 70 ? 'bg-warning' : 'bg-destructive')}
                  style={{ width: `${Math.min(num, 100)}%` }}
                />
              </div>
              <span className={cn('text-xs font-semibold tabular-nums', color)}>{num.toFixed(1)}%</span>
            </div>
          );
        },
      },
      {
        key: 'commission_amount',
        header: 'مبلغ العمولة',
        sortable: true,
        render: (v) => {
          const num = Number(v);
          return Number.isFinite(num) && num > 0 ? (
            <span className="font-bold tabular-nums text-success">{formatCurrency(num)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (v) => {
          const info = CALC_STATUS_MAP[String(v || '')];
          return info ? (
            <Badge variant="outline" className={cn('text-xs font-medium border-0', info.color)}>
              {info.label}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">{String(v || '—')}</Badge>
          );
        },
      },
      {
        key: '_pay_action',
        header: 'صرف',
        width: 'w-32',
        render: (_v, row) => {
          if (row.status !== 'Pending') return null;
          const isPaying = payingName === row.name;
          return (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 text-xs px-2 gap-1"
              disabled={isPaying}
              onClick={() => { setPayTarget(row); setPayDialogOpen(true); }}
            >
              {isPaying ? <Loader2 className="h-3 w-3 animate-spin" /> : <HandCoins className="h-3 w-3" />}
              صرف
            </Button>
          );
        },
      },
    ],
    [payingName],
  );

  const clearFilters = () => {
    setStatusFilter('all');
    setCalcStatusFilter('all');
    setEmployeeFilter('all');
    setPeriodFilter('all');
  };

  const hasActiveFilters = statusFilter !== 'all' || calcStatusFilter !== 'all' || employeeFilter !== 'all' || periodFilter !== 'all';

  // ── Selected employee summary ──
  const selectedSummary = useMemo(() => {
    if (!summaryEmployee) return null;
    return employeeSummaries.find((s) => s.employee === summaryEmployee) || null;
  }, [employeeSummaries, summaryEmployee]);

  const selectedCalcHistory = useMemo(() => {
    if (!summaryEmployee) return [];
    return calculations.filter((c) => c.employee === summaryEmployee);
  }, [calculations, summaryEmployee]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      {/* Page Header */}
      <PageHeader
        title="عمولات المبيعات"
        description="إدارة قواعد العمولات وحسابها — تحديد المستهدفات والنسب وصرف العمولات للموظفين"
        iconify="solar:hand-money-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'المبيعات', href: '/sales' }, { label: 'عمولات المبيعات' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { void loadRules(); void loadCalculations(); }}>
              <RefreshCw className="h-3.5 w-3.5" />
              تحديث
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5" />
              قاعدة عمولة جديدة
            </Button>
          </div>
        }
      />

      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي القواعد"
          value={totalRules}
          icon={Award}
          accent="primary"
          description="جميع قواعد العمولات"
        />
        <KpiCard
          title="القواعد النشطة"
          value={activeRulesCount}
          icon={CheckCircle}
          accent="success"
          description="قواعد تعمل حالياً"
        />
        <KpiCard
          title="عمولات هذا الشهر"
          value={formatCurrency(totalCommissionsThisMonth)}
          icon={DollarSign}
          accent="warning"
          description="إجمالي العمولات المحسوبة"
        />
        <KpiCard
          title="أعلى كاسب"
          value={topEarner}
          icon={Trophy}
          accent="info"
          description="الموظف الأعلى عمولة"
        />
      </KpiStrip>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="rules" className="gap-1.5 text-xs">
            <Award className="h-3.5 w-3.5" />
            قواعد العمولة
          </TabsTrigger>
          <TabsTrigger value="calculations" className="gap-1.5 text-xs">
            <Calculator className="h-3.5 w-3.5" />
            حسابات العمولة
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            ملخص الموظفين
          </TabsTrigger>
        </TabsList>

        {/* ─── Rules Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="rules" className="space-y-4">
          {/* Filters */}
          <div className="space-y-3">
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                    <Filter className="h-3 w-3" /> فلاتر
                    <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
                  </Button>
                </CollapsibleTrigger>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                    <XCircle className="h-3 w-3" /> مسح الفلاتر
                  </Button>
                )}
              </div>
              <CollapsibleContent>
                <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
                  <div className="space-y-1">
                    <Label className="text-xs">الحالة</Label>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}>
                      <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="active">نشطة</SelectItem>
                        <SelectItem value="inactive">غير نشطة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DataTable
            data={filteredRules}
            columns={rulesColumns}
            searchable
            loading={loading}
            error={error}
            onRetry={() => void loadRules()}
            tableId="sales-commission-rules"
            exportFileName="commission-rules.csv"
            printTitle="قواعد عمولات المبيعات"
            onAdd={() => { resetForm(); setDialogOpen(true); }}
            addLabel="قاعدة عمولة جديدة"
          />
        </TabsContent>

        {/* ─── Calculations Tab ──────────────────────────────────────────────── */}
        <TabsContent value="calculations" className="space-y-4">
          {/* Filters */}
          <div className="space-y-3">
            <Collapsible open={true}>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">الحالة</Label>
                  <Select value={calcStatusFilter} onValueChange={setCalcStatusFilter}>
                    <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="Pending">قيد الانتظار</SelectItem>
                      <SelectItem value="Paid">مدفوع</SelectItem>
                      <SelectItem value="Added to Salary">مضاف للراتب</SelectItem>
                      <SelectItem value="Cancelled">ملغي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الموظف</Label>
                  <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                    <SelectTrigger className="h-8 text-xs w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {uniqueEmployees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الفترة</Label>
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {uniquePeriods.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1 mt-3">
                    <XCircle className="h-3 w-3" /> مسح
                  </Button>
                )}
              </div>
            </Collapsible>
          </div>

          <DataTable
            data={filteredCalculations}
            columns={calcColumns}
            searchable
            loading={calculationsLoading}
            tableId="sales-commission-calculations"
            exportFileName="commission-calculations.csv"
            printTitle="حسابات عمولات المبيعات"
          />
        </TabsContent>

        {/* ─── Employee Summary Tab ──────────────────────────────────────────── */}
        <TabsContent value="summary" className="space-y-4">
          {employeeSummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">لا توجد بيانات عمولات للموظفين</p>
              <p className="text-xs text-muted-foreground mt-1">سيتم عرض ملخص العمولات هنا عند توفر حسابات</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employeeSummaries.map((emp) => (
                <div
                  key={emp.employee}
                  className="rounded-xl border border-border/40 bg-card p-4 hover:border-border/60 transition-colors cursor-pointer"
                  onClick={() => handleViewSummary(emp.employee)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{emp.employee_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{emp.employee}</p>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                      <CircleDollarSign className="h-4 w-4 text-success" />
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">إجمالي العمولة</p>
                      <p className="text-sm font-bold tabular-nums text-success">{formatCurrency(emp.total_commission)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(emp.total_sales)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">عدد الحسابات</p>
                      <p className="text-xs font-semibold">{emp.calculation_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">المدفوع / المعلّق</p>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[9px] bg-success/12 text-success border-0 h-4 px-1">{emp.paid_count}</Badge>
                        <Badge variant="outline" className="text-[9px] bg-warning/12 text-warning border-0 h-4 px-1">{emp.pending_count}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Create/Edit Rule Dialog ──────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <span>{editTarget ? 'تعديل قاعدة العمولة' : 'قاعدة عمولة جديدة'}</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  {editTarget ? 'تعديل إعدادات قاعدة العمولة' : 'إنشاء قاعدة جديدة لحساب عمولات المبيعات'}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* البيانات الأساسية */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70">البيانات الأساسية</h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">اسم القاعدة <span className="text-destructive text-xs">*</span></Label>
                    <Input value={formRuleName} onChange={(e) => setFormRuleName(e.target.value)} placeholder="مثال: عمولة المبيعات الشهرية" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الفترة <span className="text-destructive text-xs">*</span></Label>
                    <Select value={formPeriod} onValueChange={setFormPeriod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PERIOD_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">أساس الحساب <span className="text-destructive text-xs">*</span></Label>
                    <Select value={formBasis} onValueChange={setFormBasis}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BASIS_OPTIONS.map((b) => (
                          <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">المستهدف (مبلغ)</Label>
                    <Input
                      type="number"
                      dir="ltr"
                      min={0}
                      step="0.01"
                      value={formTargetAmount}
                      onChange={(e) => setFormTargetAmount(e.target.value)}
                      placeholder="مثال: 50000"
                    />
                  </div>
                </div>

                {(formBasis === 'sales_quantity') && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">المستهدف (كمية)</Label>
                    <Input
                      type="number"
                      dir="ltr"
                      min={0}
                      value={formTargetQuantity}
                      onChange={(e) => setFormTargetQuantity(e.target.value)}
                      placeholder="مثال: 100"
                    />
                  </div>
                )}
              </div>
            </fieldset>

            {/* العمولة */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70">العمولة</h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">نوع العمولة <span className="text-destructive text-xs">*</span></Label>
                    <Select value={formCommissionType} onValueChange={setFormCommissionType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COMMISSION_TYPE_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formCommissionType === 'percentage' ? (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">نسبة العمولة (%) <span className="text-destructive text-xs">*</span></Label>
                      <div className="relative">
                        <Input
                          type="number"
                          dir="ltr"
                          min={0}
                          max={100}
                          step="0.01"
                          value={formCommissionRate}
                          onChange={(e) => setFormCommissionRate(e.target.value)}
                          placeholder="مثال: 5"
                        />
                        <Percent className="absolute end-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">مبلغ العمولة الثابت <span className="text-destructive text-xs">*</span></Label>
                      <Input
                        type="number"
                        dir="ltr"
                        min={0}
                        step="0.01"
                        value={formCommissionFixed}
                        onChange={(e) => setFormCommissionFixed(e.target.value)}
                        placeholder="مثال: 500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </fieldset>

            {/* الموظفون */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70">الموظفون المُعيّنون</h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ErpLinkCombobox
                      doctype="Employee"
                      value=""
                      onChange={(val) => {
                        if (val && !formEmployees.includes(val)) {
                          setFormEmployees((prev) => [...prev, val]);
                        }
                      }}
                      placeholder="اختر موظف لإضافته"
                      displayKey="employee_name"
                    />
                  </div>
                  {formEmployees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formEmployees.map((empId) => (
                        <Badge key={empId} variant="secondary" className="gap-1 pe-1.5 text-xs">
                          {empId}
                          <button
                            type="button"
                            className="h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-destructive/20"
                            onClick={() => setFormEmployees((prev) => prev.filter((e) => e !== empId))}
                          >
                            <XCircle className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  {formEmployees.length === 0 && (
                    <p className="text-xs text-muted-foreground">لم يتم اختيار موظفين بعد</p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/30 bg-background/50">
                  <div>
                    <Label className="text-sm font-medium">حالة القاعدة</Label>
                    <p className="text-xs text-muted-foreground">تفعيل أو تعطيل القاعدة</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs', formStatus === 'active' ? 'text-success font-semibold' : 'text-muted-foreground')}>
                      {formStatus === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                    <Switch
                      checked={formStatus === 'active'}
                      onCheckedChange={(checked) => setFormStatus(checked ? 'active' : 'inactive')}
                    />
                  </div>
                </div>
              </div>
            </fieldset>
          </div>

          {/* Dialog footer */}
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); resetForm(); }} className="text-muted-foreground">
              إلغاء
            </Button>
            <Button disabled={creating} onClick={handleSave} className="gap-1.5 min-w-[130px]">
              {creating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  جاري الحفظ...
                </>
              ) : editTarget ? 'حفظ التعديلات' : 'إنشاء القاعدة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف قاعدة العمولة &quot;{deleteTarget?.rule_name || deleteTarget?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Pay Commission Dialog ──────────────────────────────────────────── */}
      <Dialog open={payDialogOpen} onOpenChange={(open) => { setPayDialogOpen(open); if (!open) setPayTarget(null); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <HandCoins className="h-5 w-5" />
              </div>
              <span>صرف العمولة</span>
            </DialogTitle>
          </DialogHeader>

          {payTarget && (
            <div className="space-y-4 mt-2">
              <div className="rounded-xl border border-border/40 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">الموظف</span>
                  <span className="font-medium">{payTarget.employee_name || payTarget.employee}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">مبلغ العمولة</span>
                  <span className="font-bold text-success tabular-nums">{formatCurrency(Number(payTarget.commission_amount) || 0)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">الفترة</span>
                  <span>{payTarget.period || '—'}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">اختر طريقة صرف العمولة</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-border/40 p-4 text-center hover:bg-primary/5 hover:border-primary/30 transition-colors"
                  disabled={payingName === payTarget.name}
                  onClick={() => handlePay('salary')}
                >
                  <Wallet className="h-6 w-6 mx-auto mb-2 text-info" />
                  <p className="text-xs font-semibold">إضافة للراتب</p>
                  <p className="text-xs text-muted-foreground mt-1">سيتم إضافتها مع الراتب الشهري</p>
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-border/40 p-4 text-center hover:bg-primary/5 hover:border-primary/30 transition-colors"
                  disabled={payingName === payTarget.name}
                  onClick={() => handlePay('expense')}
                >
                  <Banknote className="h-6 w-6 mx-auto mb-2 text-success" />
                  <p className="text-xs font-semibold">سند مصروف</p>
                  <p className="text-xs text-muted-foreground mt-1">صرف فوري كمصروف نقدي</p>
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Employee Summary Dialog ──────────────────────────────────────────── */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <span>ملخص عمولات الموظف</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">{selectedSummary?.employee_name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedSummary && (
            <div className="space-y-4 mt-2">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border/40 p-3 text-center">
                  <CircleDollarSign className="h-5 w-5 mx-auto text-success mb-1" />
                  <p className="text-xs text-muted-foreground">إجمالي العمولة</p>
                  <p className="text-sm font-bold tabular-nums text-success">{formatCurrency(selectedSummary.total_commission)}</p>
                </div>
                <div className="rounded-xl border border-border/40 p-3 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
                  <p className="text-sm font-bold tabular-nums">{formatCurrency(selectedSummary.total_sales)}</p>
                </div>
                <div className="rounded-xl border border-border/40 p-3 text-center">
                  <CheckCircle className="h-5 w-5 mx-auto text-success mb-1" />
                  <p className="text-xs text-muted-foreground">مدفوع</p>
                  <p className="text-sm font-bold">{selectedSummary.paid_count}</p>
                </div>
                <div className="rounded-xl border border-border/40 p-3 text-center">
                  <Clock className="h-5 w-5 mx-auto text-warning mb-1" />
                  <p className="text-xs text-muted-foreground">معلّق</p>
                  <p className="text-sm font-bold">{selectedSummary.pending_count}</p>
                </div>
              </div>

              <Separator />

              {/* Calculation History */}
              <div>
                <h4 className="text-xs font-semibold mb-2">سجل العمولات</h4>
                <ScrollArea className="max-h-72">
                  <div className="rounded-xl border border-border/40 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead className="text-[11px] font-semibold">الفترة</TableHead>
                          <TableHead className="text-[11px] font-semibold">المبيعات</TableHead>
                          <TableHead className="text-[11px] font-semibold">العمولة</TableHead>
                          <TableHead className="text-[11px] font-semibold">الحالة</TableHead>
                          <TableHead className="text-[11px] font-semibold">إجراء</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCalcHistory.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                              لا توجد حسابات عمولات
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedCalcHistory.map((calc) => {
                            const statusInfo = CALC_STATUS_MAP[calc.status || ''];
                            return (
                              <TableRow key={calc.name} className="border-b border-border/20">
                                <TableCell className="text-xs">{calc.period || '—'}</TableCell>
                                <TableCell className="text-xs tabular-nums">{formatCurrency(Number(calc.sales_amount) || 0)}</TableCell>
                                <TableCell className="text-xs font-semibold tabular-nums text-success">{formatCurrency(Number(calc.commission_amount) || 0)}</TableCell>
                                <TableCell className="text-xs">
                                  {statusInfo ? (
                                    <Badge variant="outline" className={cn('text-xs font-medium border-0', statusInfo.color)}>
                                      {statusInfo.label}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">{calc.status || '—'}</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {calc.status === 'Pending' && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      className="h-6 text-xs px-2 gap-1"
                                      disabled={payingName === calc.name}
                                      onClick={() => { setPayTarget(calc); setPayDialogOpen(true); setSummaryOpen(false); }}
                                    >
                                      {payingName === calc.name ? <Loader2 className="h-3 w-3 animate-spin" /> : <HandCoins className="h-3 w-3" />}
                                      صرف
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
