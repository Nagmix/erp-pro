'use client';

import { useCallback, useMemo, useState } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpListDateStatusFilters, type ErpStatusTab } from '@/components/erp/erp-list-date-status-filters';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErpTabbedForm, type ErpTabDef } from '@/components/erp/erp-tabbed-form';
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
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/core/helpers';
import { cn } from '@/lib/utils';
import {
  useDocList,
  useCreateDoc,
  useUpdateDoc,
  useDeleteDoc,
} from '@/lib/client/hooks';
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
  PiggyBank,
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
  cost_center?: string;
  project?: string;
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

/* ─── Status Color Mapping ─── */
const BUDGET_STATUS_MAP: Record<string, string> = {
  'مسودة': 'Draft',
  'نشط': 'Active',
  'مغلق': 'Completed',
  'متجاوز': 'Overdue',
};

/* ─── Progress Color Helper ─── */
function getProgressColor(pct: number): string {
  if (pct > 100) return 'bg-destructive';
  if (pct > 80) return 'bg-chart-2';
  return 'bg-chart-3';
}

function getProgressTrackColor(pct: number): string {
  if (pct > 100) return 'bg-destructive/10 dark:bg-destructive/10';
  if (pct > 80) return 'bg-chart-2/10 dark:bg-chart-2/10';
  return 'bg-primary/10 dark:bg-primary/10';
}

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */
export default function BudgetsPage() {
  /* ─── Fetch Cost Centers dynamically ─── */
  const {
    data: costCentersRaw = [],
    isLoading: ccLoading,
  } = useDocList<Record<string, unknown>>('Cost Center', {
    fields: ['name', 'cost_center_name'],
    limit: 500,
  });

  const costCenterOptions = useMemo(
    () => costCentersRaw.map((cc) => String(cc.cost_center_name || cc.name)),
    [costCentersRaw]
  );

  /* ─── Fetch Expense Accounts dynamically ─── */
  const {
    data: expenseAccountsRaw = [],
    isLoading: acctLoading,
  } = useDocList<Record<string, unknown>>('Account', {
    fields: ['name', 'account_name', 'account_type'],
    filters: [['account_type', '=', 'Expense Account']],
    limit: 500,
  });

  const accountOptions = useMemo(
    () => expenseAccountsRaw.map((a) => ({
      code: String(a.name),
      name: String(a.account_name || a.name),
    })),
    [expenseAccountsRaw]
  );

  /* ─── Fetch Budgets from ERPNext via hooks ─── */
  const {
    data: budgetsRaw = [],
    isLoading: budgetsLoading,
    error: budgetsError,
    refetch: refetchBudgets,
  } = useDocList<ErpBudgetRow>('Budget', {
    fields: [
      'name',
      'budget_against',
      'cost_center',
      'project',
      'fiscal_year',
      'company',
      'monthly_distribution',
      'action_if_annual_budget_exceeded',
      'action_if_accumulated_monthly_budget_exceeded',
      'docstatus',
    ],
    limit: 100,
  });

  /* ─── Fetch GL Entries for actual spending calculation ─── */
  const {
    data: glEntriesRaw = [],
  } = useDocList<Record<string, unknown>>('GL Entry', {
    fields: ['account', 'debit', 'credit', 'posting_date'],
    filters: [
      ['docstatus', '=', '1'],
      ['is_opening', '=', 'No'],
    ],
    limit: 2000,
  });

  /* ─── Mutations ─── */
  const createBudgetMutation = useCreateDoc('Budget');
  const updateBudgetMutation = useUpdateDoc('Budget');
  const deleteBudgetMutation = useDeleteDoc('Budget');

  /* ─── Map ERPNext rows → UI Budgets ─── */
  // Build account → total debit map from GL entries for actual spending
  const accountSpendingMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const gl of glEntriesRaw) {
      const account = String(gl.account ?? '');
      const debit = Number(gl.debit ?? 0);
      // Expense accounts: debit increases the expense
      const acctInfo = expenseAccountsRaw.find(a => String(a.name) === account);
      if (acctInfo && debit > 0) {
        map.set(account, (map.get(account) ?? 0) + debit);
      }
    }
    return map;
  }, [glEntriesRaw, expenseAccountsRaw]);

  const budgets = useMemo(
    () => budgetsRaw.map((row) => {
      let accounts: ErpBudgetAccountRow[] = [];
      if (Array.isArray(row.accounts)) {
        accounts = row.accounts;
      } else if (typeof row.accounts === 'string') {
        try { accounts = JSON.parse(row.accounts); } catch { accounts = []; }
      }

      const distribution: BudgetDistribution[] = accounts.map((a) => {
        const acctInfo = accountOptions.find((ao) => ao.code === a.account);
        const spent = accountSpendingMap.get(a.account) ?? 0;
        return {
          account: a.account,
          accountName: acctInfo?.name ?? a.account,
          amount: a.budget_amount ?? 0,
          spent,
        };
      });

      const allocatedAmount = distribution.reduce((s, d) => s + d.amount, 0);
      const actualSpent = distribution.reduce((s, d) => s + d.spent, 0);

      const statusMap: Record<number, Budget['status']> = {
        0: 'مسودة',
        1: 'نشط',
        2: 'مغلق',
      };

      return {
        id: row.name,
        name: row.cost_center || row.project || row.name,
        costCenter: row.cost_center || row.project || row.budget_against,
        fiscalYear: row.fiscal_year,
        period: 'سنوي' as Budget['period'],
        allocatedAmount,
        actualSpent,
        status: statusMap[row.docstatus ?? 0] ?? 'مسودة' as Budget['status'],
        distribution,
        createdAt: row.name,
      };
    }),
    [budgetsRaw, accountOptions, accountSpendingMap]
  );

  /* ─── State ─── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Budget | null>(null);
  const [activeTab, setActiveTab] = useState('budgets');
  const [docstatusFilter, setDocstatusFilter] = useState<string>('all');

  /* ─── Filtered budgets by docstatus ─── */
  const filteredBudgets = useMemo(() => {
    if (docstatusFilter === 'all') return budgets;
    return budgets.filter((b) => {
      const statusToDocstatus: Record<string, string> = { 'مسودة': '0', 'نشط': '1', 'مغلق': '2' };
      return statusToDocstatus[b.status] === docstatusFilter;
    });
  }, [budgets, docstatusFilter]);

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

  /* ─── Computed KPIs ─── */
  const totalBudgets = budgets.length;
  const activeBudgets = budgets.filter((b) => b.status === 'نشط').length;
  const totalAllocated = useMemo(() => budgets.reduce((s, b) => s + b.allocatedAmount, 0), [budgets]);
  const totalSpent = useMemo(() => budgets.reduce((s, b) => s + b.actualSpent, 0), [budgets]);

  const docstatusTabs: ErpStatusTab[] = [
    { value: 'all', label: 'الكل' },
    { value: '0', label: 'مسودة' },
    { value: '1', label: 'نشط' },
    { value: '2', label: 'ملغي' },
  ];

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
      toast.error('يرجى إدخال اسم الميزانية');
      return;
    }
    if (!form.costCenter) {
      toast.error('يرجى اختيار مركز التكلفة');
      return;
    }
    if (form.allocatedAmount <= 0) {
      toast.error('يرجى إدخال مبلغ مخصص صحيح');
      return;
    }

    const validDistribution = distribution.filter((d) => d.account && d.amount > 0);

    try {
      if (editingBudget) {
        await updateBudgetMutation.mutateAsync({
          name: editingBudget.id,
          doc: {
            doctype: 'Budget',
            budget_against: 'Cost Center',
            cost_center: form.costCenter,
            fiscal_year: form.fiscalYear,
            company: form.name,
            accounts: validDistribution.map((d) => ({
              account: d.account,
              budget_amount: d.amount,
            })),
          },
        });
        toast.success('تم تحديث الميزانية بنجاح');
      } else {
        await createBudgetMutation.mutateAsync({
          doctype: 'Budget',
          budget_against: 'Cost Center',
          cost_center: form.costCenter,
          fiscal_year: form.fiscalYear,
          company: form.name,
          accounts: validDistribution.map((d) => ({
            account: d.account,
            budget_amount: d.amount,
          })),
        });
        toast.success('تم إنشاء الميزانية بنجاح');
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error('خطأ', { description: String(err) });
    }
  }, [form, distribution, editingBudget, createBudgetMutation, updateBudgetMutation, toast]);

  const confirmDelete = useCallback(async () => {
    if (!toDelete) return;
    try {
      await deleteBudgetMutation.mutateAsync(toDelete.id);
      setDeleteOpen(false);
      setToDelete(null);
      toast.success('تم حذف الميزانية');
    } catch (err) {
      toast.error('خطأ في الحذف', { description: String(err) });
    }
  }, [toDelete, deleteBudgetMutation, toast]);

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
        const acctInfo = accountOptions.find((a) => a.code === acctCode);
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

  const saving = createBudgetMutation.isPending || updateBudgetMutation.isPending;
  const deleting = deleteBudgetMutation.isPending;
  const loading = budgetsLoading;

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
          <span className="text-xs font-semibold tabular-nums" dir="ltr">{formatCurrency(Number(v))}</span>
        ),
      },
      {
        key: 'actualSpent',
        header: 'المصروف',
        sortable: true,
        render: (v) => (
          <span className="text-xs tabular-nums" dir="ltr">{formatCurrency(Number(v))}</span>
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
                  ? 'text-destructive dark:text-rose-400'
                  : 'text-primary'
              )}
              dir="ltr"
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
                    ? 'text-destructive dark:text-rose-400'
                    : pct > 80
                      ? 'text-chart-2 dark:text-amber-400'
                      : 'text-primary dark:text-emerald-400'
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

      <ListQueryAlert error={budgetsError} onRetry={() => refetchBudgets()} />

      <ErpListDateStatusFilters
        dateFrom=""
        dateTo=""
        onDateFromChange={() => {}}
        onDateToChange={() => {}}
        statusValue={docstatusFilter}
        onStatusChange={setDocstatusFilter}
        statusTabs={docstatusTabs}
      />

      {/* ─── Tabs ─── */}
      <ErpTabbedForm
        value={activeTab}
        onValueChange={setActiveTab}
        tabs={[
          {
            value: 'budgets',
            label: 'الميزانيات',
            icon: <PiggyBank className="h-4 w-4" />,
            content: (
              <DataTable
                data={filteredBudgets}
                columns={columns}
                tableId="accounting-budgets"
                searchable
                loading={budgetsLoading}
                columnFilters
                stickyFirstColumn
                addLabel="ميزانية جديدة"
                onAdd={openCreate}
                onEdit={(row) => openEdit(row as Budget)}
                onDelete={(row) => {
                  setToDelete(row as Budget);
                  setDeleteOpen(true);
                }}
                exportFileName="الميزانيات.csv"
                printTitle="الميزانيات"
              />
            ),
          },
          {
            value: 'comparison',
            label: 'مقارنة الموازنة',
            icon: <BarChart3 className="h-4 w-4" />,
            content: (
              <div className="space-y-4">
                {costCenterComparison.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="p-10 text-center">
                <BarChart3 className="h-9 w-10 mx-auto text-muted-foreground/30 mb-3" />
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
                              ? 'bg-destructive/10 text-rose-700 dark:bg-destructive/10 dark:text-rose-400'
                              : item.percentage > 80
                                ? 'bg-chart-2/10 text-amber-700 dark:bg-chart-2/10 dark:text-amber-400'
                                : 'bg-primary/10 text-emerald-700 dark:bg-primary/10 dark:text-emerald-400'
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
                            ? 'text-destructive dark:text-rose-400'
                            : item.percentage > 80
                              ? 'text-chart-2 dark:text-amber-400'
                              : 'text-primary dark:text-emerald-400'
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
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
                            ? 'bg-destructive/5 dark:bg-destructive/10'
                            : 'bg-primary/5 dark:bg-primary/10'
                        )}
                      >
                        <p className="text-muted-foreground mb-0.5">الفرق</p>
                        <p
                          className={cn(
                            'font-semibold tabular-nums',
                            item.variance < 0
                              ? 'text-destructive dark:text-rose-400'
                              : 'text-primary dark:text-emerald-400'
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
              </div>
            ),
          },
          {
            value: 'distribution',
            label: 'توزيع الميزانية',
            icon: <PieChart className="h-4 w-4" />,
            content: (
              <div className="space-y-4">
                {budgets.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="p-10 text-center">
                <PieChart className="h-9 w-10 mx-auto text-muted-foreground/30 mb-3" />
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
                                        ? 'text-destructive'
                                        : spentPct > 80
                                          ? 'text-chart-2'
                                          : 'text-primary'
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
              </div>
            ),
          },
        ]}
      />

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
                <Label className="text-sm font-medium">اسم الميزانية *</Label>
                <Input
                  className="h-9"
                  placeholder="مثال: ميزانية الرواتب 2026"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">مركز التكلفة *</Label>
                <Select
                  value={form.costCenter}
                  onValueChange={(v) => setForm((f) => ({ ...f, costCenter: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="اختر مركز التكلفة" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCenterOptions.map((cc) => (
                      <SelectItem key={cc} value={cc}>
                        {cc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">السنة المالية *</Label>
                <Input
                  className="h-9"
                  type="number"
                  dir="ltr"
                  value={form.fiscalYear}
                  onChange={(e) => setForm((f) => ({ ...f, fiscalYear: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">نوع الفترة *</Label>
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
                <Label className="text-sm font-medium">المبلغ المخصص *</Label>
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
                <Label className="text-sm font-medium">الحالة</Label>
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
                <Label className="text-sm font-medium">توزيع المبلغ على الحسابات</Label>
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
                          {accountOptions.map((a) => (
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
                    distTotal > form.allocatedAmount && 'text-destructive'
                  )}
                >
                  {formatCurrency(distTotal)}
                  {distTotal > form.allocatedAmount && (
                    <span className="ms-1 text-[10px] text-destructive">(يتجاوز المخصص!)</span>
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
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {editingBudget ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirmation ═══ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              تأكيد حذف الميزانية
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الميزانية «{toDelete?.name}»؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
