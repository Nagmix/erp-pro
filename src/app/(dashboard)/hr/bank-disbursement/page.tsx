'use client';

import { useState, useMemo, useCallback } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Download,
  Banknote,
  Users,
  Building2,
  CreditCard,
  Loader2,
  Filter,
} from 'lucide-react';
import { useDocList } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { apiCallMethod, apiCreateDoc } from '@/lib/client/api';
import { formatCurrency } from '@/lib/core/helpers';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useHrmsCheck } from '@/hooks/use-hrms-check';
import { HrmsRequiredBanner } from '@/components/erp/hrms-required-banner';

/* ────────────────────────────────────────
   Types
   ──────────────────────────────────────── */

type SalarySlipRow = {
  name: string;
  employee?: string;
  employee_name?: string;
  net_pay?: number;
  bank_name?: string;
  bank_account_no?: string;
  docstatus?: number;
  status?: string;
};

/* ────────────────────────────────────────
   Component
   ──────────────────────────────────────── */

export default function BankDisbursementPage() {
  const [tab, setTab] = useState('slips');
  const [bankFilter, setBankFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState('');
  const [payingSlip, setPayingSlip] = useState<string | null>(null);

  const { hrmsInstalled, loaded: hrmsLoaded } = useHrmsCheck();

  /* ── Fetch submitted salary slips ── */
  const { data, isLoading, isError, error, refetch } = useDocList<SalarySlipRow>('Salary Slip', {
    fields: [
      'name',
      'employee',
      'employee_name',
      'net_pay',
      'bank_name',
      'bank_account_no',
      'docstatus',
      'status',
    ],
    filters: [['docstatus', '=', '1']],
    limit: 500,
    order_by: 'modified desc',
  });

  const slips = data || [];

  /* ── Bank names for filter ── */
  const bankNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of slips) {
      if (s.bank_name) set.add(s.bank_name);
    }
    return Array.from(set).sort();
  }, [slips]);

  /* ── Filtered data ── */
  const filtered = useMemo(() => {
    let result = slips;
    if (bankFilter !== 'all') {
      result = result.filter((r) => r.bank_name === bankFilter);
    }
    if (periodFilter.trim()) {
      const q = periodFilter.trim().toLowerCase();
      result = result.filter((r) =>
        String(r.name).toLowerCase().includes(q) ||
        String(r.employee_name).toLowerCase().includes(q)
      );
    }
    return result;
  }, [slips, bankFilter, periodFilter]);

  /* ── KPIs ── */
  const totalNetPay = useMemo(() => filtered.reduce((sum, r) => sum + Number(r.net_pay ?? 0), 0), [filtered]);
  const employeeCount = new Set(filtered.map((r) => r.employee).filter(Boolean)).size;
  const bankCount = new Set(filtered.map((r) => r.bank_name).filter(Boolean)).size;

  /* ── Grouped by bank ── */
  const groupedByBank = useMemo(() => {
    const map = new Map<string, SalarySlipRow[]>();
    for (const s of filtered) {
      const key = s.bank_name || 'بدون بنك';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [filtered]);

  /* ── Create Payment Entry for a slip ── */
  const createPaymentForSlip = useCallback(async (slip: SalarySlipRow) => {
    setPayingSlip(slip.name);
    try {
      const mapped = await apiCallMethod<Record<string, unknown>>(
        'hrms.overrides.employee_payment_entry.get_payment_entry_for_salary_slip',
        { salary_slip: slip.name },
      );
      if (!mapped) throw new Error('تعذر إنشاء سند الدفع');
      await apiCreateDoc('Payment Entry', prepareFrappeDocForCreate(mapped));
      toast.success(`تم إنشاء سند دفع: ${slip.name}`);
      refetch();
    } catch (err) {
      toast.error((err as Error).message || 'تعذر إنشاء سند الدفع');
    } finally {
      setPayingSlip(null);
    }
  }, [refetch]);

  /* ── Export bank file ── */
  const exportBankFile = useCallback(() => {
    const rows = filtered.filter((r) => r.bank_name && r.bank_account_no);
    if (rows.length === 0) {
      toast.error('لا توجد بيانات بنكية للتصدير');
      return;
    }
    const header = 'رقم الحساب البنكي,صافي الراتب,اسم الموظف';
    const csv = rows.map((r) => `${r.bank_account_no},${r.net_pay},${r.employee_name}`).join('\n');
    const blob = new Blob([`${header}\n${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank_remittance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`تم تصدير ملف البنك (${rows.length} سجل)`);
  }, [filtered]);

  if (hrmsLoaded && !hrmsInstalled) {
    return (
      <div dir="rtl" className="erp-page-enter space-y-5">
        <PageHeader
          title="الصرف البنكي"
          description="إدارة صرف الرواتب عبر البنوك وإنشاء سندات الدفع وتصدير الملفات البنكية"
          iconify="solar:bank-bold-duotone"
          accent="success"
          breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'الصرف البنكي' }]}
        />
        <HrmsRequiredBanner />
      </div>
    );
  }

  /* ── Columns ── */
  const columns: Column<SalarySlipRow>[] = [
    {
      key: 'employee_name',
      header: 'الموظف',
      sortable: true,
      render: (value) => <span className="font-medium">{String(value || '—')}</span>,
    },
    {
      key: 'net_pay',
      header: 'صافي الراتب',
      sortable: true,
      render: (value) => (
        <span className="font-semibold tabular-nums">{formatCurrency(Number(value ?? 0))}</span>
      ),
    },
    {
      key: 'bank_name',
      header: 'البنك',
      sortable: true,
      render: (value) => (
        <span className="flex items-center gap-1.5">
          <Building2 className="h-3 w-3 text-muted-foreground" aria-hidden />
          {String(value || '—')}
        </span>
      ),
    },
    {
      key: 'bank_account_no',
      header: 'رقم الحساب البنكي',
      render: (value) => (
        <span className="font-mono text-xs" dir="ltr">{String(value || '—')}</span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (value) => <DocStatusBadge docstatus={Number(value === 'Submitted' ? 1 : value === 'Cancelled' ? 2 : 0) as 0 | 1 | 2} />,
    },
    {
      key: 'actions',
      header: '',
      width: 'w-28',
      render: (_, row) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          disabled={payingSlip === row.name}
          onClick={(e) => {
            e.stopPropagation();
            createPaymentForSlip(row);
          }}
        >
          {payingSlip === row.name ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CreditCard className="h-3 w-3" />
          )}
          إنشاء دفعة
        </Button>
      ),
    },
  ];

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="الصرف البنكي"
        description="إدارة صرف الرواتب عبر البنوك وإنشاء سندات الدفع وتصدير الملفات البنكية"
        iconify="solar:bank-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'الصرف البنكي' }]}
        actions={
          <Button size="sm" onClick={exportBankFile} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            تصدير ملف البنك
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="slips">كشوف الرواتب</TabsTrigger>
          <TabsTrigger value="banks">تجميع بالبنك</TabsTrigger>
        </TabsList>

        {/* ─── Tab: كشوف الرواتب ─── */}
        <TabsContent value="slips" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">البنك</Label>
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
              >
                <option value="all">الكل</option>
                {bankNames.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">بحث</Label>
              <Input
                placeholder="بحث بالموظف أو رقم الكشف..."
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />
          <PageShell padded={false}>
            <DataTable
              data={filtered}
              columns={columns}
              searchable
              loading={isLoading}
            />
          </PageShell>
        </TabsContent>

        {/* ─── Tab: تجميع بالبنك ─── */}
        <TabsContent value="banks" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">
              عرض {groupedByBank.size} بنك — إجمالي {formatCurrency(totalNetPay)}
            </Label>
          </div>

          {Array.from(groupedByBank.entries()).map(([bank, rows]) => {
            const bankTotal = rows.reduce((s, r) => s + Number(r.net_pay ?? 0), 0);
            return (
              <div key={bank} className="rounded-xl border border-border/40 bg-card overflow-hidden">
                {/* Bank header */}
                <div className="flex items-center justify-between p-4 bg-muted/30 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                    <span className="text-sm font-semibold">{bank}</span>
                    <span className="text-xs text-muted-foreground">({rows.length} موظف)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(bankTotal)}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        /* Export for this bank only */
                        const bankRows = rows.filter((r) => r.bank_account_no);
                        if (bankRows.length === 0) {
                          toast.error('لا توجد بيانات بنكية');
                          return;
                        }
                        const header = 'رقم الحساب البنكي,صافي الراتب,اسم الموظف';
                        const csv = bankRows.map((r) => `${r.bank_account_no},${r.net_pay},${r.employee_name}`).join('\n');
                        const blob = new Blob([`${header}\n${csv}`], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `bank_remittance_${bank}_${new Date().toISOString().slice(0, 10)}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(`تم التصدير — ${bankRows.length} سجل`);
                      }}
                    >
                      <Download className="h-3 w-3" />
                      تصدير
                    </Button>
                  </div>
                </div>

                {/* Bank rows */}
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                      <tr className="border-b border-border/30">
                        <th className="px-4 py-2 font-semibold">الموظف</th>
                        <th className="px-4 py-2 font-semibold">رقم الحساب</th>
                        <th className="px-4 py-2 font-semibold">صافي الراتب</th>
                        <th className="px-4 py-2 font-semibold w-24">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.name} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2 font-medium">{r.employee_name || '—'}</td>
                          <td className="px-4 py-2 font-mono" dir="ltr">{r.bank_account_no || '—'}</td>
                          <td className="px-4 py-2 tabular-nums">{formatCurrency(Number(r.net_pay ?? 0))}</td>
                          <td className="px-4 py-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs gap-1"
                              disabled={payingSlip === r.name}
                              onClick={() => createPaymentForSlip(r)}
                            >
                              {payingSlip === r.name ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CreditCard className="h-3 w-3" />
                              )}
                              دفعة
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {groupedByBank.size === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-9 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">لا توجد كشوف رواتب مرحّلة للصرف</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
