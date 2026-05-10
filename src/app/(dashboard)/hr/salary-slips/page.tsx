'use client';

import { useState, useMemo, useCallback } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { KpiCard, KpiStrip, PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  FileText,
  Send,
  Undo2,
  Trash2,
  Printer,
  Filter,
  ChevronDown,
  X,
  Download,
  Loader2,
  Wallet,
  FileCheck,
  Ban,
  DollarSign,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDocList, useDeleteDoc, useSubmitDoc, useCancelDoc } from '@/lib/client/hooks';
import { apiGetDoc } from '@/lib/client/api';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { pdf } from '@react-pdf/renderer';
import { PayslipPDFDocument, type PayslipData } from '@/components/erp/payslip-pdf';

// ── Types ────────────────────────────────────────────────────
interface SalarySlipRow {
  name: string;
  employee: string;
  employee_name: string;
  start_date: string;
  end_date: string;
  gross_pay: number;
  total_deduction: number;
  net_pay: number;
  docstatus: number;
  status?: string;
  currency?: string;
}

// ── Main Component ───────────────────────────────────────────
export default function SalarySlipsPage() {
  const [deleteDialog, setDeleteDialog] = useState<SalarySlipRow | null>(null);
  const [submitDialog, setSubmitDialog] = useState<SalarySlipRow | null>(null);
  const [cancelDialog, setCancelDialog] = useState<SalarySlipRow | null>(null);
  const [bulkPrintDialog, setBulkPrintDialog] = useState(false);
  const [bulkDateFrom, setBulkDateFrom] = useState('');
  const [bulkDateTo, setBulkDateTo] = useState('');
  const [printingSlip, setPrintingSlip] = useState<string | null>(null);
  const [bulkPrinting, setBulkPrinting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const clearFilters = () => {
    setStatusFilter('all');
    setSearch('');
    setFiltersOpen(false);
    setDateFrom('');
    setDateTo('');
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useDocList<SalarySlipRow>('Salary Slip', {
    fields: [
      'name',
      'employee',
      'employee_name',
      'start_date',
      'end_date',
      'gross_pay',
      'total_deduction',
      'net_pay',
      'docstatus',
      'currency',
    ],
    limit: 400,
    order_by: 'end_date desc',
  });

  const deleteMutation = useDeleteDoc('Salary Slip');
  const submitMut = useSubmitDoc('Salary Slip');
  const cancelMut = useCancelDoc('Salary Slip');

  const salarySlips = data || [];

  // ── Filtered Data ──────────────────────────────────────────
  const filteredData = useMemo(() => {
    let list = salarySlips;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          [s.name, s.employee_name, s.employee].some((v) =>
            String(v ?? '').toLowerCase().includes(q)
          )
      );
    }
    if (statusFilter !== 'all') {
      const ds = Number(statusFilter);
      list = list.filter((s) => Number(s.docstatus) === ds);
    }
    if (dateFrom) {
      list = list.filter((s) => s.start_date && s.start_date >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((s) => s.end_date && s.end_date <= dateTo);
    }
    return list;
  }, [salarySlips, search, statusFilter, dateFrom, dateTo]);

  // ── KPI Data ───────────────────────────────────────────────
  const totalSlips = salarySlips.length;
  const draftCount = salarySlips.filter((s) => Number(s.docstatus) === 0).length;
  const submittedCount = salarySlips.filter((s) => Number(s.docstatus) === 1).length;
  const cancelledCount = salarySlips.filter((s) => Number(s.docstatus) === 2).length;
  const totalNetPay = salarySlips
    .filter((s) => Number(s.docstatus) === 1)
    .reduce((sum, s) => sum + Number(s.net_pay ?? 0), 0);

  // ── Print PDF ──────────────────────────────────────────────
  const handlePrintPDF = useCallback(
    async (slip: SalarySlipRow) => {
      setPrintingSlip(slip.name);
      try {
        const fullSlip = (await apiGetDoc('Salary Slip', slip.name)) as Record<string, unknown>;

        const payslipData: PayslipData = {
          company: String(fullSlip.company || ''),
          employee_name: String(fullSlip.employee_name || ''),
          employee_id: String(fullSlip.employee || ''),
          department: String(fullSlip.department || ''),
          designation: String(fullSlip.designation || ''),
          start_date: String(fullSlip.start_date || ''),
          end_date: String(fullSlip.end_date || ''),
          gross_pay: Number(fullSlip.gross_pay) || 0,
          total_deduction: Number(fullSlip.total_deduction) || 0,
          net_pay: Number(fullSlip.net_pay) || 0,
          earnings: (
            (fullSlip.earnings as Record<string, unknown>[] | undefined) || []
          ).map((e) => ({
            name: String(e.salary_component || ''),
            amount: Number(e.amount) || 0,
          })),
          deductions: (
            (fullSlip.deductions as Record<string, unknown>[] | undefined) || []
          ).map((d) => ({
            name: String(d.salary_component || ''),
            amount: Number(d.amount) || 0,
          })),
          bank_name: String(fullSlip.bank_name || ''),
          bank_account: String(fullSlip.bank_account_no || ''),
          currency: String(fullSlip.currency || 'YER'),
        };

        const blob = await pdf(<PayslipPDFDocument data={payslipData} />).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payslip-${slip.employee_name}-${slip.start_date}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('تم تحميل قسيمة الراتب');
      } catch {
        toast.error('حدث خطأ أثناء إنشاء PDF');
      } finally {
        setPrintingSlip(null);
      }
    },
    [toast]
  );

  // ── Bulk Print ─────────────────────────────────────────────
  const handleBulkPrint = useCallback(async () => {
    setBulkPrinting(true);
    try {
      let toPrint = salarySlips.filter((s) => Number(s.docstatus) === 1);
      if (bulkDateFrom) {
        toPrint = toPrint.filter((s) => s.start_date && s.start_date >= bulkDateFrom);
      }
      if (bulkDateTo) {
        toPrint = toPrint.filter((s) => s.end_date && s.end_date <= bulkDateTo);
      }

      if (toPrint.length === 0) {
        toast.error('لا توجد قسائم مرّحلة للطباعة');
        setBulkPrinting(false);
        return;
      }

      let successCount = 0;
      for (const slip of toPrint) {
        try {
          const fullSlip = (await apiGetDoc('Salary Slip', slip.name)) as Record<string, unknown>;
          const payslipData: PayslipData = {
            company: String(fullSlip.company || ''),
            employee_name: String(fullSlip.employee_name || ''),
            employee_id: String(fullSlip.employee || ''),
            department: String(fullSlip.department || ''),
            designation: String(fullSlip.designation || ''),
            start_date: String(fullSlip.start_date || ''),
            end_date: String(fullSlip.end_date || ''),
            gross_pay: Number(fullSlip.gross_pay) || 0,
            total_deduction: Number(fullSlip.total_deduction) || 0,
            net_pay: Number(fullSlip.net_pay) || 0,
            earnings: (
              (fullSlip.earnings as Record<string, unknown>[] | undefined) || []
            ).map((e) => ({
              name: String(e.salary_component || ''),
              amount: Number(e.amount) || 0,
            })),
            deductions: (
              (fullSlip.deductions as Record<string, unknown>[] | undefined) || []
            ).map((d) => ({
              name: String(d.salary_component || ''),
              amount: Number(d.amount) || 0,
            })),
            bank_name: String(fullSlip.bank_name || ''),
            bank_account: String(fullSlip.bank_account_no || ''),
            currency: String(fullSlip.currency || 'YER'),
          };

          const blob = await pdf(<PayslipPDFDocument data={payslipData} />).toBlob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `payslip-${slip.employee_name}-${slip.start_date}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          successCount++;

          // Small delay between downloads to avoid browser blocking
          await new Promise((r) => setTimeout(r, 400));
        } catch {
          // Skip failed slips silently
        }
      }

      toast.success(`تم تحميل ${successCount} من ${toPrint.length} قسيمة`);
      setBulkPrintDialog(false);
      setBulkDateFrom('');
      setBulkDateTo('');
    } catch {
      toast.error('حدث خطأ أثناء الطباعة المجمعة');
    } finally {
      setBulkPrinting(false);
    }
  }, [salarySlips, bulkDateFrom, bulkDateTo, toast]);

  // ── Table Columns ──────────────────────────────────────────
  const columns: Column<SalarySlipRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرقم',
        sortable: true,
        width: 'w-28',
        render: (value) => (
          <span className="font-medium text-primary">{String(value)}</span>
        ),
      },
      {
        key: 'employee_name',
        header: 'الموظف',
        sortable: true,
        render: (_, row) => (
          <div>
            <span className="font-medium">{row.employee_name || '—'}</span>
            <span className="block text-xs text-muted-foreground">
              {row.employee || ''}
            </span>
          </div>
        ),
      },
      {
        key: 'start_date',
        header: 'الفترة',
        sortable: true,
        render: (_, row) => (
          <span className="text-xs">
            {row.start_date ? formatDate(String(row.start_date)) : '—'} —{' '}
            {row.end_date ? formatDate(String(row.end_date)) : '—'}
          </span>
        ),
      },
      {
        key: 'gross_pay',
        header: 'الإجمالي',
        sortable: true,
        render: (value) => (
          <span className="tabular-nums">{formatCurrency(Number(value ?? 0))}</span>
        ),
      },
      {
        key: 'total_deduction',
        header: 'الاستقطاعات',
        render: (value) => (
          <span className="tabular-nums text-destructive">
            {formatCurrency(Number(value ?? 0))}
          </span>
        ),
      },
      {
        key: 'net_pay',
        header: 'الصافي',
        sortable: true,
        render: (value) => (
          <span className="font-semibold tabular-nums">
            {formatCurrency(Number(value ?? 0))}
          </span>
        ),
      },
      {
        key: 'docstatus',
        header: 'الحالة',
        width: 'w-20',
        render: (value) => (
          <DocStatusBadge docstatus={Number(value ?? 0) as 0 | 1 | 2} />
        ),
      },
      {
        key: '_actions',
        header: 'إجراءات',
        width: 'w-36',
        render: (_v, row) => {
          const ds = Number(row.docstatus);
          const isPrinting = printingSlip === row.name;
          return (
            <div className="flex items-center gap-1">
              {ds === 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs gap-1"
                  onClick={() => setSubmitDialog(row)}
                >
                  <Send className="h-3 w-3" />
                  ترحيل
                </Button>
              )}
              {ds === 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  onClick={() => setCancelDialog(row)}
                >
                  <Undo2 className="h-3 w-3" />
                  إلغاء
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                disabled={isPrinting}
                onClick={() => handlePrintPDF(row)}
              >
                {isPrinting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Printer className="h-3 w-3" />
                )}
                PDF
              </Button>
            </div>
          );
        },
      },
    ],
    [printingSlip, handlePrintPDF]
  );

  // ── Render ─────────────────────────────────────────────────
  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="قسائم الرواتب"
        description="عرض قسائم الرواتب ومتابعة حالتها وترحيلها وطباعتها"
        iconify="solar:document-text-bold-duotone"
        accent="purple"
        breadcrumbs={[
          { label: 'الموارد البشرية', href: '/hr' },
          { label: 'قسائم الرواتب' },
        ]}
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            variant="outline"
            onClick={() => setBulkPrintDialog(true)}
            disabled={submittedCount === 0}
          >
            <Download className="h-3.5 w-3.5" />
            طباعة مجمعة
          </Button>
        }
      />

      {/* ── KPI Strip ── */}
      <KpiStrip cols={5}>
        <KpiCard
          title="إجمالي القسائم"
          value={totalSlips}
          icon={FileText}
          accent="primary"
          compact
        />
        <KpiCard
          title="مسودات"
          value={draftCount}
          icon={Wallet}
          accent="warning"
          compact
        />
        <KpiCard
          title="مُقدّمة"
          value={submittedCount}
          icon={FileCheck}
          accent="success"
          compact
        />
        <KpiCard
          title="ملغاة"
          value={cancelledCount}
          icon={Ban}
          accent="destructive"
          compact
        />
        <KpiCard
          title="صافي الرواتب الإجمالي"
          value={formatCurrency(totalNetPay)}
          icon={DollarSign}
          accent="info"
          compact
        />
      </KpiStrip>

      {/* ── Search & Filters ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="بحث بالموظف أو الرقم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" /> فلاتر متقدمة
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform',
                    filtersOpen && 'rotate-180'
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            {(statusFilter !== 'all' || search || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs gap-1"
              >
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
                <Label className="text-xs">الحالة</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="0">مسودة</SelectItem>
                    <SelectItem value="1">مُقدّم</SelectItem>
                    <SelectItem value="2">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">من تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إلى تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ── Status Filter Pills ── */}
      <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-[var(--shadow-xs-ui)] p-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 overflow-x-auto">
          {(
            [
              { key: 'all', label: 'الكل', count: salarySlips.length },
              { key: '0', label: 'مسودات', count: draftCount },
              { key: '1', label: 'مُقدّمة', count: submittedCount },
              { key: '2', label: 'ملغاة', count: cancelledCount },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === f.key
                  ? 'bg-background text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-border/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {f.label}
              <span
                className={`tabular-nums text-xs rounded-md px-1.5 py-0.5 font-semibold ${
                  statusFilter === f.key
                    ? 'bg-chart-5/10 text-chart-5'
                    : 'bg-muted text-muted-foreground/70'
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      {/* ── Data Table ── */}
      <DataTable
        data={filteredData}
        columns={columns}
        searchable
        loading={isLoading}
        tableId="salary-slips"
        exportFileName="salary-slips"
        printTitle="قسائم الرواتب — ERP Pro"
        onDelete={(row) => Number(row.docstatus) === 0 && setDeleteDialog(row)}
      />

      {/* ── Submit Dialog ── */}
      <AlertDialog open={!!submitDialog} onOpenChange={() => setSubmitDialog(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد الترحيل</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  هل تريد ترحيل القسيمة &quot;{submitDialog?.name}&quot;؟ لا يمكن تعديل القسيمة بعد الترحيل.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                submitDialog &&
                submitMut.mutate(submitDialog.name, {
                  onSuccess: () => {
                    toast.success('تم الترحيل بنجاح');
                    setSubmitDialog(null);
                  },
                  onError: () =>
                    toast.error('فشل الترحيل'),
                })
              }
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              ترحيل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Cancel Dialog ── */}
      <AlertDialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
                <Undo2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد الإلغاء</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  هل تريد إلغاء القسيمة &quot;{cancelDialog?.name}&quot;؟ يمكن التراجع عن هذا الإجراء لاحقاً.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                cancelDialog &&
                cancelMut.mutate(cancelDialog.name, {
                  onSuccess: () => {
                    toast.success('تم إلغاء القسيمة');
                    setCancelDialog(null);
                  },
                  onError: () =>
                    toast.error('فشل الإلغاء'),
                })
              }
              className="gap-1.5"
            >
              <Undo2 className="h-3.5 w-3.5" />
              إلغاء القسيمة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Dialog ── */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد الحذف</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  هل أنت متأكد من حذف القسيمة &quot;{deleteDialog?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteDialog &&
                deleteMutation.mutate(deleteDialog.name, {
                  onSuccess: () => {
                    toast.success('تم حذف القسيمة');
                    setDeleteDialog(null);
                  },
                  onError: () =>
                    toast.error('فشل الحذف'),
                })
              }
              variant="destructive" className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk Print Dialog ── */}
      <Dialog open={bulkPrintDialog} onOpenChange={setBulkPrintDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-purple-600" />
              طباعة مجمعة لقسائم الرواتب
            </DialogTitle>
            <DialogDescription className="text-xs">
              سيتم تحميل PDF لكل قسيمة مرّحلة بشكل منفصل. يمكنك تحديد نطاق تاريخ لتضييق القائمة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">عدد القسائم المرّحلة</span>
                <span className="font-bold text-purple-600">{submittedCount}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">من تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={bulkDateFrom}
                  onChange={(e) => setBulkDateFrom(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">إلى تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={bulkDateTo}
                  onChange={(e) => setBulkDateTo(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            {(bulkDateFrom || bulkDateTo) && (
              <div className="rounded-lg border border-chart-5/20 bg-chart-5/5 p-2.5">
                <p className="text-[11px] text-chart-5">
                  <strong>ملاحظة:</strong> سيتم طباعة القسائم المرّحلة فقط ضمن النطاق المحدد.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setBulkPrintDialog(false);
                setBulkDateFrom('');
                setBulkDateTo('');
              }}
              className="text-muted-foreground"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleBulkPrint}
              disabled={bulkPrinting || submittedCount === 0}
              className="gap-1.5 min-w-[130px]"
            >
              {bulkPrinting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  جاري الطباعة...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  طباعة المجمّعة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
