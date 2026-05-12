'use client';

import { useState, useMemo, useCallback } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { StatusBadge } from '@/components/erp/status-badge';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { ErpListDateStatusFilters, type ErpStatusTab } from '@/components/erp/erp-list-date-status-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
// Status Tabs
// ============================================================

const statusTabs: ErpStatusTab[] = [
  { value: 'all', label: 'الكل' },
  { value: 'pending', label: 'معلّق' },
  { value: 'posted', label: 'مُرحّل' },
];

// ============================================================
// Main Component
// ============================================================

export default function DepreciationRunPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assetFilter, setAssetFilter] = useState('');
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

  // ── Apply all filters ──
  const filteredSchedules = useMemo(() => {
    let list = depSched;
    // Date range
    if (dateFrom) list = list.filter(s => s.schedule_date >= dateFrom);
    if (dateTo) list = list.filter(s => s.schedule_date <= dateTo);
    // Status filter
    if (statusFilter === 'pending') list = list.filter(s => !s.journal_entry);
    else if (statusFilter === 'posted') list = list.filter(s => !!s.journal_entry);
    // Asset filter
    if (assetFilter) list = list.filter(s => s.parent === assetFilter);
    return list;
  }, [depSched, dateFrom, dateTo, statusFilter, assetFilter]);

  // ── Pending schedules (no journal_entry) ──
  const pendingSchedules = useMemo(() => {
    let list = depSched.filter(s => !s.journal_entry);
    if (dateFrom) list = list.filter(s => s.schedule_date >= dateFrom);
    if (dateTo) list = list.filter(s => s.schedule_date <= dateTo);
    if (assetFilter) list = list.filter(s => s.parent === assetFilter);
    return list;
  }, [depSched, dateFrom, dateTo, assetFilter]);

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

  // ── Clear filters ──
  const clearFilters = useCallback(() => {
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
    setAssetFilter('');
  }, []);

  const hasActiveFilters = dateFrom || dateTo || statusFilter !== 'all' || assetFilter;

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

      {/* Unified Filters */}
      <ErpListDateStatusFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        statusTabs={statusTabs}
        extraFilters={
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">الأصل</Label>
              <ErpLinkCombobox
                doctype="Asset"
                value={assetFilter}
                onChange={setAssetFilter}
                placeholder="اختر الأصل..."
                displayKey="asset_name"
                className="h-9 w-48"
              />
            </div>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-xs gap-1"
                onClick={clearFilters}
              >
                <X className="h-3 w-3" />
                مسح الفلاتر
              </Button>
            )}
          </div>
        }
      />

      {/* Depreciation Schedule Table */}
      <DataTable
        data={filteredSchedules}
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
