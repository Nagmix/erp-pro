'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/app-format';
import { cn } from '@/lib/utils';
import {
  Wallet,
  Plus,
  BarChart3,
  PieChart,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

/* ─── Types ─── */
type BudgetDistribution = {
  account: string;
  accountName: string;
  amount: number;
  spent: number;
};

type Budget = {
  id: string;
  name: string;
  costCenter: string;
  fiscalYear: string;
  period: 'سنوي' | 'نصف سنوي' | 'ربعي' | 'شهري';
  allocatedAmount: number;
  actualSpent: number;
  status: 'مسودة' | 'نشط' | 'مغلق' | 'متجاوز';
  distribution: BudgetDistribution[];
  createdAt: string;
};

/* ─── ERPNext API Budget Row (raw from API) ─── */
type ErpBudgetRow = {
  name: string;
  budget_against: string;
  budget_against_name: string;
  fiscal_year: string;
  company: string;
  monthly_distribution?: string;
  action_if_annual_budget_exceeded?: string;
  action_if_accumulated_monthly_budget_exceeded?: string;
  docstatus?: number;
  // child table may come as JSON string or array
  accounts?: ErpBudgetAccountRow[] | string;
};

type ErpBudgetAccountRow = {
  account: string;
  budget_amount: number;
};

/* ─── Constants ─── */
const PERIOD_OPTIONS: Budget['period'][] = ['سنوي', 'نصف سنوي', 'ربعي', 'شهري'];
const STATUS_OPTIONS: Budget['status'][] = ['مسودة', 'نشط', 'مغلق', 'متجاوز'];

const COST_CENTER_OPTIONS = [
  'الإدارة العامة',
  'المبيعات والتسويق',
  'المشتريات',
  'المخزون والمستودعات',
  'الموارد البشرية',
  'تقنية المعلومات',
  'الإنتاج',
  'البحث والتطوير',
];

const ACCOUNT_OPTIONS = [
  { code: '5001', name: 'رواتب وأجور' },
  { code: '5002', name: 'إيجارات' },
  { code: '5003', name: 'مصروفات تشغيلية' },
  { code: '5004', name: 'صيانة وإصلاح' },
  { code: '5005', name: 'نقل وشحن' },
  { code: '5006', name: 'مواد مكتبية' },
  { code: '5007', name: 'إعلان وتسويق' },
  { code: '5008', name: 'اتصالات وإنترنت' },
  { code: '5009', name: 'سفر وضيافة' },
  { code: '5010', name: 'تأمينات' },
];

/* ─── Status Color Mapping ─── */
const BUDGET_STATUS_MAP: Record<string, string> = {
  'مسودة': 'Draft',
  'نشط': 'Active',
  'مغلق': 'Completed',
  'متجاوز': 'Overdue',
};

/* ─── Progress Color Helper ─── */
function getProgressColor(pct: number): string {
  if (pct > 100) return 'bg-rose-500';
  if (pct > 80) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getProgressTrackColor(pct: number): string {
  if (pct > 100) return 'bg-rose-100 dark:bg-rose-950/40';
  if (pct > 80) return 'bg-amber-100 dark:bg-amber-950/40';
  return 'bg-emerald-100 dark:bg-emerald-950/40';
}

/* ─── Map ERPNext row → UI Budget ─── */
function mapErpRowToBudget(row: ErpBudgetRow, idx: number): Budget {
  let accounts: ErpBudgetAccountRow[] = [];
  if (Array.isArray(row.accounts)) {
    accounts = row.accounts;
  } else if (typeof row.accounts === 'string') {
    try { accounts = JSON.parse(row.accounts); } catch { accounts = []; }
  }

  const distribution: BudgetDistribution[] = accounts.map((a) => {
    const acctInfo = ACCOUNT_OPTIONS.find((ao) => ao.code === a.account);
    return {
      account: a.account,
      accountName: acctInfo?.name ?? a.account,
      amount: a.budget_amount ?? 0,
      spent: 0,
    };
  });

  const allocatedAmount = distribution.reduce((s, d) => s + d.amount, 0);

  const statusMap: Record<number, Budget['status']> = {
    0: 'مسودة',
    1: 'نشط',
    2: 'مغلق',
  };

  return {
    id: row.name,
    name: row.budget_against_name || row.name,
    costCenter: row.budget_against_name || row.budget_against,
    fiscalYear: row.fiscal_year,
    period: 'سنوي',
    allocatedAmount,
    actualSpent: 0,
    status: statusMap[row.docstatus ?? 0] ?? 'مسودة',
    distribution,
    createdAt: row.name,
  };
}

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */
export default function BudgetsPage() {
  const { toast } = useToast();

  /* ─── State ─── */
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Budget | null>(null);
  const [activeTab, setActiveTab] = useState('budgets');

  /* ─── Form State ─── */
  const [form, setForm] = useState({
    name: '',
    costCenter: '',
    fiscalYear: new Date().getFullYear().toString(),
    period: 'سنوي' as Budget['period'],
    allocatedAmount: 0,
    status: 'مسودة' as Budget['status'],
  });

  const [distribution, setDistribution] = useState<BudgetDistribution[]>([
    { account: '', accountName: '', amount: 0, spent: 0 },
  ]);

  /* ─── Refresh trigger ─── */
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshBudgets = useCallback(() => setRefreshKey((k) => k + 1), []);

  /* ─── Fetch budgets from ERPNext ─── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          '/api/data/Budget?fields=["name","budget_against","budget_against_name","fiscal_year","company","monthly_distribution","action_if_annual_budget_exceeded","action_if_accumulated_monthly_budget_exceeded","docstatus"]&limit_page_length=100'
        );
        if (!res.ok) throw new Error('فشل في جلب الميزانيات');
        const json = await res.json();
        const raw: ErpBudgetRow[] = json.data ?? json ?? [];
        const mapped = raw.map((r, i) => mapErpRowToBudget(r, i));
        if (!cancelled) setBudgets(mapped);
      } catch (err) {
        if (!cancelled) {
          toast({ title: 'خطأ في تحميل الميزانيات', description: String(err), variant: 'destructive' });
          setBudgets([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  /* ─── Computed KPIs ─── */
  const totalBudgets = budgets.length;
  const activeBudgets = budgets.filter((b) => b.status === 'نشط').length;
  const totalAllocated = useMemo(() => budgets.reduce((s, b) => s + b.allocatedAmount, 0), [budgets]);
  const totalSpent = useMemo(() => budgets.reduce((s, b) => s + b.actualSpent, 0), [budgets]);

  /* ─── Actions ─── */
  const openCreate = useCallback(() => {
    setEditingBudget(null);
    setForm({
      name: '',
      costCenter: '',
      fiscalYear: new Date().getFullYear().toString(),
      period: 'سنوي',
      allocatedAmount: 0,
      status: 'مسودة',
    });
    setDistribution([{ account: '', accountName: '', amount: 0, spent: 0 }]);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((budget: Budget) => {
    setEditingBudget(budget);
    setForm({
      name: budget.name,
      costCenter: budget.costCenter,
      fiscalYear: budget.fiscalYear,
      period: budget.period,
      allocatedAmount: budget.allocatedAmount,
      status: budget.status,
    });
    setDistribution(
      budget.distribution.length > 0
        ? budget.distribution
        : [{ account: '', accountName: '', amount: 0, spent: 0 }]
    );
    setDialogOpen(true);
  }, []);

  const saveBudget = useCallback(async () => {
    if (!form.name.trim()) {
      toast({ title: 'يرجى إدخال اسم الميزانية', variant: 'destructive' });
      return;
    }
    if (!form.costCenter) {
      toast({ title: 'يرجى اختيار مركز التكلفة', variant: 'destructive' });
      return;
    }
    if (form.allocatedAmount <= 0) {
      toast({ title: 'يرجى إدخال مبلغ مخصص صحيح', variant: 'destructive' });
      return;
    }

    const validDistribution = distribution.filter((d) => d.account && d.amount > 0);
    const docstatus = form.status === 'نشط' ? 1 : form.status === 'مغلق' ? 2 : 0;

    setSaving(true);
    try {
      if (editingBudget) {
        // Update
        const body = {
          doctype: 'Budget',
          budget_against: 'Cost Center',
          budget_against_name: form.costCenter,
          fiscal_year: form.fiscalYear,
          company: form.name,
          docstatus,
          accounts: validDistribution.map((d) => ({
            account: d.account,
            budget_amount: d.amount,
          })),
        };
        const res = await fetch(`/api/data/Budget/${editingBudget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('فشل في تحديث الميزانية');
        toast({ title: 'تم تحديث الميزانية بنجاح' });
      } else {
        // Create
        const body = {
          doctype: 'Budget',
          budget_against: 'Cost Center',
          budget_against_name: form.costCenter,
          fiscal_year: form.fiscalYear,
          company: form.name,
          docstatus,
          accounts: validDistribution.map((d) => ({
            account: d.account,
            budget_amount: d.amount,
          })),
        };
        const res = await fetch('/api/data/Budget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('فشل في إنشاء الميزانية');
        toast({ title: 'تم إنشاء الميزانية بنجاح' });
      }
      setDialogOpen(false);
      refreshBudgets();
    } catch (err) {
      toast({ title: 'خطأ', description: String(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [form, distribution, editingBudget, refreshBudgets, toast]);

  const confirmDelete = useCallback(async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/data/Budget/${toDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل في حذف الميزانية');
      setDeleteOpen(false);
      setToDelete(null);
      toast({ title: 'تم حذف الميزانية' });
      refreshBudgets();
    } catch (err) {
      toast({ title: 'خطأ في الحذف', description: String(err), variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }, [toDelete, refreshBudgets, toast]);

  /* ─── Distribution Helpers ─── */
  const addDistRow = () =>
    setDistribution((prev) => [...prev, { account: '', accountName: '', amount: 0, spent: 0 }]);

  const removeDistRow = (idx: number) => {
    if (distribution.length <= 1) return;
    setDistribution((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateDistRow = (idx: number, field: keyof BudgetDistribution, value: string | number) => {
    setDistribution((prev) => {
      const updated = [...prev];
      const row = { ...updated[idx] };

      if (field === 'account') {
        const acctCode = String(value);
        const acctInfo = ACCOUNT_OPTIONS.find((a) => a.code === acctCode);
        row.account = acctCode;
        row.accountName = acctInfo?.name ?? '';
      } else {
        (row as unknown as Record<string, string | number>)[field] = value;
      }

      updated[idx] = row;
      return updated;
    });
  };

  const distTotal = useMemo(() => distribution.reduce((s, d) => s + d.amount, 0), [distribution]);

  /* ─── DataTable Columns ─── */
  const columns: Column<Budget>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'اسم الميزانية',
        sortable: true,
        render: (v) => <span className="font-medium text-primary">{String(v)}</span>,
      },
      {
        key: 'costCenter',
        header: 'مركز التكلفة',
        sortable: true,
      },
      {
        key: 'fiscalYear',
        header: 'الفترة',
        sortable: true,
        render: (_v, row) => (
          <span className="text-xs">
            {row.fiscalYear} — {row.period}
          </span>
        ),
      },
      {
        key: 'allocatedAmount',
        header: 'المخصص',
        sortable: true,
        render: (v) => (
          <span className="text-xs font-semibold tabular-nums">{formatCurrency(Number(v))}</span>
        ),
      },
      {
        key: 'actualSpent',
        header: 'المصروف',
        sortable: true,
        render: (v) => (
          <span className="text-xs tabular-nums">{formatCurrency(Number(v))}</span>
        ),
      },
      {
        key: 'remaining',
        header: 'المتبقي',
        render: (_v, row) => {
          const rem = row.allocatedAmount - row.actualSpent;
          return (
            <span
              className={cn(
                'text-xs font-semibold tabular-nums',
                rem < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              )}
            >
              {formatCurrency(rem)}
            </span>
          );
        },
      },
      {
        key: 'percentage',
        header: 'النسبة%',
        render: (_v, row) => {
          const pct = row.allocatedAmount > 0 ? Math.round((row.actualSpent / row.allocatedAmount) * 100) : 0;
          return (
            <div className="flex items-center gap-2 min-w-[100px]">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', getProgressColor(pct))}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <span
                className={cn(
                  'text-[11px] font-semibold tabular-nums w-10 text-end',
                  pct > 100
                    ? 'text-rose-600 dark:text-rose-400'
                    : pct > 80
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                {pct}%
              </span>
            </div>
          );
        },
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (v) => <StatusBadge status={BUDGET_STATUS_MAP[String(v)] ?? String(v)} />,
      },
    ],
    []
  );

  /* ─── Budget vs Actual data grouped by cost center ─── */
  const costCenterComparison = useMemo(() => {
    const map = new Map<string, { allocated: number; spent: number }>();
    for (const b of budgets) {
      const existing = map.get(b.costCenter) || { allocated: 0, spent: 0 };
      existing.allocated += b.allocatedAmount;
      existing.spent += b.actualSpent;
      map.set(b.costCenter, existing);
    }
    return Array.from(map.entries()).map(([center, data]) => ({
      costCenter: center,
      ...data,
      variance: data.allocated - data.spent,
      percentage: data.allocated > 0 ? Math.round((data.spent / data.allocated) * 100) : 0,
    }));
  }, [budgets]);

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جارٍ تحميل الميزانيات...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="إدارة الميزانيات"
        description="تخطيط ومتابعة الميزانيات التشغيلية ومقارنة الأداء الفعلي بالمخصص"
        iconify="solar:wallet-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'إدارة الميزانيات' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            ميزانية جديدة
          </Button>
        }
      />

      {/* ─── KPI Strip ─── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي الميزانيات"
          value={totalBudgets}
          icon={Wallet}
          accent="info"
          change={totalBudgets > 0 ? 5 : 0}
          changeType={totalBudgets > 0 ? 'positive' : 'neutral'}
        />
        <KpiCard
          title="الميزانيات النشطة"
          value={activeBudgets}
          icon={CheckCircle}
          accent="success"
          change={activeBudgets > 0 ? 10 : 0}
          changeType={activeBudgets > 0 ? 'positive' : 'neutral'}
        />
        <KpiCard
          title="إجمالي المخصص"
          value={formatCurrency(totalAllocated)}
          icon={TrendingUp}
          accent="primary"
        />
        <KpiCard
          title="إجمالي المصروف الفعلي"
          value={formatCurrency(totalSpent)}
          icon={TrendingDown}
          accent={totalSpent > totalAllocated ? 'destructive' : 'warning'}
        />
      </KpiStrip>

      {/* ─── Tabs ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="budgets" className="gap-1.5 text-xs">
            <Wallet className="h-3.5 w-3.5" />
            الميزانيات
          </TabsTrigger>
          <TabsTrigger value="comparison" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            مقارنة الموازنة
          </TabsTrigger>
          <TabsTrigger value="distribution" className="gap-1.5 text-xs">
            <PieChart className="h-3.5 w-3.5" />
            توزيع الميزانية
          </TabsTrigger>
        </TabsList>

        {/* ═══ Tab 1: Budgets List ═══ */}
        <TabsContent value="budgets" className="space-y-4">
          <DataTable
            data={budgets}
            columns={columns}
            tableId="budgets-list"
            searchable
            addLabel="ميزانية جديدة"
            onAdd={openCreate}
            onEdit={(row) => openEdit(row as Budget)}
            onDelete={(row) => {
              setToDelete(row as Budget);
              setDeleteOpen(true);
            }}
            exportFileName="الميزانيات"
          />
        </TabsContent>

        {/* ═══ Tab 2: Budget vs Actual ═══ */}
        <TabsContent value="comparison" className="space-y-4">
          {costCenterComparison.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="p-10 text-center">
                <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">لا توجد بيانات كافية للمقارنة</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {costCenterComparison.map((item) => (
                <Card
                  key={item.costCenter}
                  className="border-border/40 overflow-hidden hover:border-border/70 transition-colors"
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'h-9 w-9 rounded-lg flex items-center justify-center',
                            item.percentage > 100
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                              : item.percentage > 80
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          )}
                        >
                          {item.percentage > 100 ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : item.percentage > 80 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{item.costCenter}</p>
                          <p className="text-[11px] text-muted-foreground">مركز التكلفة</p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'text-lg font-bold tabular-nums',
                          item.percentage > 100
                            ? 'text-rose-600 dark:text-rose-400'
                            : item.percentage > 80
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        {item.percentage}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className={cn('h-3 rounded-full overflow-hidden', getProgressTrackColor(item.percentage))}>
                        <div
                          className={cn('h-full rounded-full transition-all', getProgressColor(item.percentage))}
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="rounded-lg bg-muted/30 p-2.5 text-center">
                        <p className="text-muted-foreground mb-0.5">المخصص</p>
                        <p className="font-semibold tabular-nums">{formatCurrency(item.allocated)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-2.5 text-center">
                        <p className="text-muted-foreground mb-0.5">المصروف</p>
                        <p className="font-semibold tabular-nums">{formatCurrency(item.spent)}</p>
                      </div>
                      <div
                        className={cn(
                          'rounded-lg p-2.5 text-center',
                          item.variance < 0
                            ? 'bg-rose-50 dark:bg-rose-950/30'
                            : 'bg-emerald-50 dark:bg-emerald-950/30'
                        )}
                      >
                        <p className="text-muted-foreground mb-0.5">الفرق</p>
                        <p
                          className={cn(
                            'font-semibold tabular-nums',
                            item.variance < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          )}
                        >
                          {formatCurrency(item.variance)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══ Tab 3: Budget Distribution ═══ */}
        <TabsContent value="distribution" className="space-y-4">
          {budgets.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="p-10 text-center">
                <PieChart className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">لا توجد ميزانيات لعرض توزيعها</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {budgets.map((budget) => {
                const totalDist = budget.distribution.reduce((s, d) => s + d.amount, 0);
                return (
                  <Card
                    key={budget.id}
                    className="border-border/40 overflow-hidden hover:border-border/70 transition-colors"
                  >
                    <CardContent className="p-5 space-y-3">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{budget.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {budget.costCenter} — {budget.fiscalYear}
                          </p>
                        </div>
                        <StatusBadge
                          status={BUDGET_STATUS_MAP[budget.status] ?? budget.status}
                        />
                      </div>

                      {/* Total */}
                      <div className="flex justify-between items-center rounded-lg bg-muted/30 px-3 py-2 text-xs">
                        <span className="text-muted-foreground">إجمالي المخصص</span>
                        <span className="font-bold tabular-nums">{formatCurrency(budget.allocatedAmount)}</span>
                      </div>

                      {/* Distribution Rows */}
                      {budget.distribution.length > 0 ? (
                        <div className="space-y-2">
                          {budget.distribution.map((dist, idx) => {
                            const distPct =
                              totalDist > 0 ? Math.round((dist.amount / totalDist) * 100) : 0;
                            const spentPct =
                              dist.amount > 0 ? Math.round((dist.spent / dist.amount) * 100) : 0;
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                      {dist.account}
                                    </span>
                                    <span className="truncate">{dist.accountName}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="tabular-nums font-medium">
                                      {formatCurrency(dist.amount)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground tabular-nums">
                                      ({distPct}%)
                                    </span>
                                  </div>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-all',
                                      getProgressColor(spentPct)
                                    )}
                                    style={{ width: `${Math.min(spentPct, 100)}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                  <span>المصروف: {formatCurrency(dist.spent)}</span>
                                  <span
                                    className={cn(
                                      spentPct > 100
                                        ? 'text-rose-600'
                                        : spentPct > 80
                                          ? 'text-amber-600'
                                          : 'text-emerald-600'
                                    )}
                                  >
                                    {spentPct}% مستخدم
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground text-center py-4">
                          لا يوجد توزيع محدد
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══ Create / Edit Dialog ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              {editingBudget ? 'تعديل الميزانية' : 'إنشاء ميزانية جديدة'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Basic Fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">اسم الميزانية *</Label>
                <Input
                  className="h-9"
                  placeholder="مثال: ميزانية الرواتب 2026"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">مركز التكلفة *</Label>
                <Select
                  value={form.costCenter}
                  onValueChange={(v) => setForm((f) => ({ ...f, costCenter: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="اختر مركز التكلفة" />
                  </SelectTrigger>
                  <SelectContent>
                    {COST_CENTER_OPTIONS.map((cc) => (
                      <SelectItem key={cc} value={cc}>
                        {cc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">السنة المالية *</Label>
                <Input
                  className="h-9"
                  type="number"
                  dir="ltr"
                  value={form.fiscalYear}
                  onChange={(e) => setForm((f) => ({ ...f, fiscalYear: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">نوع الفترة *</Label>
                <Select
                  value={form.period}
                  onValueChange={(v) => setForm((f) => ({ ...f, period: v as Budget['period'] }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">المبلغ المخصص *</Label>
                <Input
                  className="h-9"
                  type="number"
                  dir="ltr"
                  min={0}
                  placeholder="0.00"
                  value={form.allocatedAmount || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, allocatedAmount: Number(e.target.value) || 0 }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">الحالة</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as Budget['status'] }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Distribution Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">توزيع المبلغ على الحسابات</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={addDistRow}
                >
                  <Plus className="h-3 w-3" />
                  إضافة حساب
                </Button>
              </div>

              <div className="rounded-lg border border-border/40 overflow-hidden">
                {/* Table Header */}
                <div className="bg-muted/50 px-3 py-2 grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground">
                  <div className="col-span-4">الحساب</div>
                  <div className="col-span-3">المبلغ</div>
                  <div className="col-span-3">المصروف</div>
                  <div className="col-span-2" />
                </div>

                {/* Rows */}
                {distribution.map((row, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 grid grid-cols-12 gap-2 items-center border-t border-border/20"
                  >
                    <div className="col-span-4">
                      <Select
                        value={row.account}
                        onValueChange={(v) => updateDistRow(idx, 'account', v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="اختر الحساب" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCOUNT_OPTIONS.map((a) => (
                            <SelectItem key={a.code} value={a.code}>
                              <span className="font-mono text-[10px] ms-1">{a.code}</span>{' '}
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      className="col-span-3 h-8 text-xs"
                      type="number"
                      dir="ltr"
                      min={0}
                      placeholder="0.00"
                      value={row.amount || ''}
                      onChange={(e) => updateDistRow(idx, 'amount', Number(e.target.value) || 0)}
                    />
                    <Input
                      className="col-span-3 h-8 text-xs"
                      type="number"
                      dir="ltr"
                      min={0}
                      placeholder="0.00"
                      value={row.spent || ''}
                      onChange={(e) => updateDistRow(idx, 'spent', Number(e.target.value) || 0)}
                    />
                    <div className="col-span-2 flex justify-center">
                      {distribution.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          type="button"
                          onClick={() => removeDistRow(idx)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Distribution Total */}
              <div className="flex justify-between items-center rounded-lg bg-muted/30 px-4 py-2 text-xs">
                <span className="text-muted-foreground">إجمالي التوزيع</span>
                <span
                  className={cn(
                    'font-bold tabular-nums',
                    distTotal > form.allocatedAmount && 'text-rose-600'
                  )}
                >
                  {formatCurrency(distTotal)}
                  {distTotal > form.allocatedAmount && (
                    <span className="ms-1 text-[10px] text-rose-500">(يتجاوز المخصص!)</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-muted-foreground"
              disabled={saving}
            >
              إلغاء
            </Button>
            <Button type="button" onClick={saveBudget} className="gap-1.5 min-w-[120px]" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingBudget ? (
                'تحديث الميزانية'
              ) : (
                'إنشاء الميزانية'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirmation ═══ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد الحذف</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  هل أنت متأكد من حذف الميزانية &quot;{toDelete?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
