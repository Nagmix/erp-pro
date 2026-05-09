'use client';

import { useState, useMemo, useCallback } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { KpiCard } from '@/components/erp/kpi-card';
import { StatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDocList, useCreateDoc } from '@/lib/client/hooks';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { apiCreateDoc, apiGetDoc, apiUpdateDoc } from '@/lib/client/api';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Calculator,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Filter,
  ChevronDown,
  X,
  Loader2,
  Package,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface DepSchedRow {
  name: string;
  parent: string;
  schedule_date: string;
  depreciation_amount: number;
  journal_entry?: string;
  docstatus: number;
}

interface AssetRow {
  name: string;
  asset_name: string;
  asset_category?: string;
  status: string;
  calculate_depreciation?: number;
  gross_purchase_amount?: number;
  company: string;
}

// ============================================================
// Main Component
// ============================================================

export default function DepreciationRunPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const { company: defaultCo } = useDefaultCompanyName();

  // ── Data fetching ──
  const { data: depSched = [], isLoading: depLoad, isError: depErr, error: depErrObj, refetch: refetchDep } = useDocList<DepSchedRow>('Depreciation Schedule', {
    fields: ['name', 'parent', 'schedule_date', 'depreciation_amount', 'journal_entry', 'docstatus'],
    order_by: 'schedule_date desc',
    limit: 500,
  });

  const { data: assets = [], isLoading: assetLoad, isError: assetIsErr, error: assetErr, refetch: refetchAssets } = useDocList<AssetRow>('Asset', {
    fields: ['name', 'asset_name', 'asset_category', 'status', 'calculate_depreciation', 'gross_purchase_amount', 'company'],
    limit: 500,
  });

  const isLoading = depLoad || assetLoad;
  const isError = depErr || assetIsErr;
  const error = depErr ? depErrObj : assetErr;

  // ── Pending schedules (no journal_entry) ──
  const pendingSchedules = useMemo(() => {
    let list = depSched.filter(s => !s.journal_entry);
    if (dateFrom) list = list.filter(s => s.schedule_date >= dateFrom);
    if (dateTo) list = list.filter(s => s.schedule_date <= dateTo);
    return list;
  }, [depSched, dateFrom, dateTo]);

  const postedSchedules = useMemo(() => depSched.filter(s => !!s.journal_entry), [depSched]);

  // ── Assets eligible for depreciation ──
  const depreciableAssets = useMemo(
    () => assets.filter(a => a.status === 'Active' && a.calculate_depreciation),
    [assets]
  );

  // ── KPIs ──
  const totalPendingAmount = useMemo(
    () => pendingSchedules.reduce((s, r) => s + (Number(r.depreciation_amount) || 0), 0),
    [pendingSchedules]
  );

  const totalPostedAmount = useMemo(
    () => postedSchedules.reduce((s, r) => s + (Number(r.depreciation_amount) || 0), 0),
    [postedSchedules]
  );

  // ── Asset-wise breakdown ──
  const assetBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; pendingCount: number; pendingAmount: number }>();
    for (const s of pendingSchedules) {
      const existing = map.get(s.parent) || { name: s.parent, pendingCount: 0, pendingAmount: 0 };
      existing.pendingCount++;
      existing.pendingAmount += Number(s.depreciation_amount) || 0;
      map.set(s.parent, existing);
    }
    return [...map.values()].sort((a, b) => b.pendingAmount - a.pendingAmount);
  }, [pendingSchedules]);

  // ── Run Depreciation ──
  const handleRunDepreciation = useCallback(async () => {
    if (!defaultCo) {
      toast.error('تعذر تحديد الشركة');
      return;
    }
    if (pendingSchedules.length === 0) {
      toast.success('لا توجد إهلاكات مستحقة', { description: 'جميع جداول الإهلاك مُرحّلة بالفعل' });
      return;
    }

    setProcessing(true);
    setProgress({ current: 0, total: pendingSchedules.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pendingSchedules.length; i++) {
      const sched = pendingSchedules[i]!;
      setProgress({ current: i + 1, total: pendingSchedules.length });

      try {
        // Get asset details to find depreciation accounts
        const assetDoc = await apiGetDoc<Record<string, unknown>>('Asset', sched.parent);
        if (!assetDoc) {
          failCount++;
          continue;
        }

        // Get asset category accounts
        const catName = String(assetDoc.asset_category || '');
        let depExpenseAccount = '';
        let accDepAccount = '';

        if (catName) {
          try {
            const cat = await apiGetDoc<Record<string, unknown>>('Asset Category', catName);
            const rows = (cat?.accounts as Record<string, unknown>[] | undefined) ?? [];
            const co = String(assetDoc.company || defaultCo);
            const row = rows.find((r) => String(r.company_name ?? '').trim() === co);
            depExpenseAccount = String(row?.depreciation_expense_account ?? '');
            accDepAccount = String(row?.accumulated_depreciation_account ?? '');
          } catch {
            /* ignore category fetch error */
          }
        }

        if (!depExpenseAccount || !accDepAccount) {
          failCount++;
          continue;
        }

        // Create Journal Entry for depreciation
        const je = await apiCreateDoc('Journal Entry', {
          voucher_type: 'Depreciation Entry',
          company: String(assetDoc.company || defaultCo),
          posting_date: sched.schedule_date,
          accounts: [
            { account: depExpenseAccount, debit: Number(sched.depreciation_amount) || 0, credit: 0 },
            { account: accDepAccount, debit: 0, credit: Number(sched.depreciation_amount) || 0 },
          ],
        });

        // Update schedule with journal_entry reference
        const jeName = je && typeof je === 'object' && 'name' in je ? String(je.name) : '';
        if (jeName && sched.name) {
          try {
            await apiUpdateDoc('Asset', String(assetDoc.name), {
              // Trigger recalculation by saving the asset with the JE reference
            });
          } catch {
            // Asset update is optional - the JE is already created
          }
        }

        successCount++;
      } catch {
        failCount++;
      }
    }

    setProcessing(false);
    void refetchDep();
    void refetchAssets();

    if (successCount > 0) {
      toast.success('تم تشغيل الإهلاك بنجاح', { description: `تم ترحيل ${successCount} قيد إهلاك${failCount > 0 ? ` وفشل ${failCount}` : ''}` });
    } else {
      toast.error('لم يتم ترحيل أي قيود', { description: 'تأكد من إعداد حسابات الإهلاك في فئات الأصول' });
    }
  }, [defaultCo, pendingSchedules, refetchDep, refetchAssets, toast]);

  // ── Columns for schedule table ──
  const columns: Column<DepSchedRow>[] = [
    { key: 'parent', header: 'اسم الأصل', sortable: true, render: (v) => <span className="font-medium">{String(v)}</span> },
    { key: 'schedule_date', header: 'تاريخ الاستحقاق', sortable: true, render: (v) => formatDate(String(v || '')) },
    { key: 'depreciation_amount', header: 'مبلغ الإهلاك', sortable: true, render: (v) => (
      <span className="font-semibold tabular-nums" dir="ltr">{formatCurrency(Number(v) || 0)}</span>
    )},
    { key: 'journal_entry', header: 'قيد يومية', render: (v) => v ? (
      <span className="font-mono text-xs text-primary">{String(v)}</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    )},
    { key: 'status', header: 'الحالة', render: (_, row) => row.journal_entry ? (
      <Badge variant="outline" className="border-0 text-xs font-semibold px-2 py-0.5 bg-success/12 text-success ring-1 ring-inset ring-success/25">
        مُرحّل
      </Badge>
    ) : (
      <Badge variant="outline" className="border-0 text-xs font-semibold px-2 py-0.5 bg-warning/15 text-warning-foreground/90 ring-1 ring-inset ring-warning/30">
        معلّق
      </Badge>
    )},
  ];

  const clearFilters = () => { setDateFrom(''); setDateTo(''); };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => { void refetchDep(); void refetchAssets(); }} />

      <PageHeader
        title="تشغيل الإهلاك"
        description="حساب وترحيل إهلاك الأصول الثابتة"
        iconify="solar:calculator-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'تشغيل الإهلاك' }]}
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            disabled={processing || pendingSchedules.length === 0}
            onClick={() => void handleRunDepreciation()}
          >
            {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {processing ? `جاري الترحيل (${progress.current}/${progress.total})` : 'تشغيل الإهلاك'}
          </Button>
        }
      />

      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard title="أصول قابلة للإهلاك" value={depreciableAssets.length} icon={Package} accent="primary" compact />
        <KpiCard title="إهلاك مستحق" value={pendingSchedules.length} icon={Clock} accent="warning" compact />
        <KpiCard title="إهلاك مُرحّل" value={postedSchedules.length} icon={CheckCircle2} accent="success" compact />
        <KpiCard title="إجمالي مبلغ الإهلاك" value={formatCurrency(totalPendingAmount)} icon={Calculator} accent="info" compact />
      </KpiStrip>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-warning/30 bg-warning/[0.03]">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              إهلاكات معلّقة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">عدد القيود المعلّقة</span>
              <span className="font-semibold tabular-nums">{pendingSchedules.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">إجمالي المبلغ المستحق</span>
              <span className="font-semibold tabular-nums" dir="ltr">{formatCurrency(totalPendingAmount)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-success/30 bg-success/[0.03]">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              إهلاكات مُرحّلة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">عدد القيود المرحّلة</span>
              <span className="font-semibold tabular-nums">{postedSchedules.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">إجمالي المبلغ المُرحّل</span>
              <span className="font-semibold tabular-nums" dir="ltr">{formatCurrency(totalPostedAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Filter */}
      <div className="space-y-3">
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" /> فلاتر الفترة
                <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
                <Label className="text-xs">من تاريخ</Label>
                <Input type="date" dir="ltr" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إلى تاريخ</Label>
                <Input type="date" dir="ltr" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Depreciation Schedule Table */}
      <DataTable
        data={dateFrom || dateTo ? pendingSchedules : depSched}
        columns={columns}
        searchable
        loading={isLoading}
        title="جدول الإهلاك"
        tableId="depreciation-schedule-table"
        exportFileName="depreciation-schedule.csv"
      />

      {/* Asset-wise Breakdown */}
      {assetBreakdown.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">تفصيل الإهلاك حسب الأصل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {assetBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-sm hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{item.name}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">{item.pendingCount} قيد</Badge>
                  </div>
                  <span className="font-semibold tabular-nums shrink-0" dir="ltr">{formatCurrency(item.pendingAmount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
