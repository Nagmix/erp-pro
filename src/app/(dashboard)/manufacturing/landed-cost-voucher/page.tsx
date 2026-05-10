'use client';

import { useMemo, useState, useCallback } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Send,
  Undo2,
  Receipt,
  FileText,
  Filter,
  CalendarDays,
  Building2,
  Coins,
  Landmark,
  Package,
} from 'lucide-react';
import { PageHeader, KpiStrip, KpiCard } from '@/components/erp/page-header';
import { formatDate, formatNumber, formatCurrency } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { buildLandedCostVoucher } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/* ──────────────── Types ──────────────── */

interface LCVRow {
  name: string;
  posting_date: string;
  company?: string;
  docstatus: number;
  total_taxes_and_charges?: number;
  distribute_charges_based_on?: string;
}

interface ReceiptLine {
  receipt_document: string;
  applicable_charges: string;
}

interface TaxLine {
  expense_account: string;
  description: string;
  amount: string;
}

/* ──────────────── Helpers ──────────────── */

const emptyReceipt = (): ReceiptLine => ({
  receipt_document: '',
  applicable_charges: '0',
});

const emptyTax = (): TaxLine => ({
  expense_account: '',
  description: 'تكلفة إضافية',
  amount: '0',
});

const COMPANY_OPTIONS = [
  { value: '', label: 'الكل' },
] as { value: string; label: string }[];

const DOC_STATUS_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: '0', label: 'مسودة' },
  { value: '1', label: 'مُرحّل' },
  { value: '2', label: 'ملغي' },
] as const;

/* ──────────────── Component ──────────────── */

export default function LandedCostVoucherPage() {
  const { company, isLoading: coLoading } = useDefaultCompanyName();

  /* Dialog state */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);

  /* Create form state */
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [distribute, setDistribute] = useState<'Amount' | 'Quantity'>('Amount');
  const [receipts, setReceipts] = useState<ReceiptLine[]>([emptyReceipt()]);
  const [taxes, setTaxes] = useState<TaxLine[]>([emptyTax()]);

  /* Filter state */
  const [filterCompany, setFilterCompany] = useState('');
  const [filterDocStatus, setFilterDocStatus] = useState('');

  /* ── Data fetching ── */
  const { data, isLoading, isError, error, refetch } = useDocList<LCVRow>('Landed Cost Voucher', {
    fields: ['name', 'posting_date', 'company', 'docstatus', 'total_taxes_and_charges', 'distribute_charges_based_on'],
    order_by: 'posting_date desc',
    limit: 200,
  });
  const createMutation = useCreateDoc<LCVRow>('Landed Cost Voucher');
  const submitMutation = useSubmitDoc<LCVRow>('Landed Cost Voucher');
  const cancelMutation = useCancelDoc<LCVRow>('Landed Cost Voucher');
  const deleteMutation = useDeleteDoc('Landed Cost Voucher');

  const allRows = data || [];

  /* ── Unique companies for filter ── */
  const companyFilterOptions = useMemo(() => {
    const companies = Array.from(new Set(allRows.map((r) => r.company).filter(Boolean)));
    return [
      { value: '', label: 'الكل' },
      ...companies.map((c) => ({ value: c!, label: c! })),
    ];
  }, [allRows]);

  /* ── Filtered rows ── */
  const rows = useMemo(() => {
    return allRows.filter((r) => {
      if (filterCompany && r.company !== filterCompany) return false;
      if (filterDocStatus && String(r.docstatus) !== filterDocStatus) return false;
      return true;
    });
  }, [allRows, filterCompany, filterDocStatus]);

  /* ── KPI computations ── */
  const kpiTotal = allRows.length;
  const kpiDraft = allRows.filter((r) => Number(r.docstatus) === 0).length;
  const kpiSubmitted = allRows.filter((r) => Number(r.docstatus) === 1).length;
  const totalCost = allRows.reduce((s, r) => s + (Number(r.total_taxes_and_charges) || 0), 0);

  /* ── Receipt/Tax update helpers ── */
  const updateReceipt = useCallback(
    (idx: number, field: keyof ReceiptLine, value: string) => {
      setReceipts((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx]!, [field]: value };
        return next;
      });
    },
    []
  );

  const updateTax = useCallback(
    (idx: number, field: keyof TaxLine, value: string) => {
      setTaxes((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx]!, [field]: value };
        return next;
      });
    },
    []
  );

  /* ── Table columns ── */
  const columns: Column<LCVRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'رقم المستند',
        sortable: true,
        render: (v) => (
          <span className="font-medium text-primary">{String(v)}</span>
        ),
      },
      {
        key: 'posting_date',
        header: 'التاريخ',
        sortable: true,
        render: (v) => (
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3 text-muted-foreground" />
            {formatDate(String(v))}
          </span>
        ),
      },
      {
        key: 'company',
        header: 'الشركة',
        render: (v) => (
          <span className="flex items-center gap-1 text-xs">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            {String(v ?? '—')}
          </span>
        ),
      },
      {
        key: 'total_taxes_and_charges',
        header: 'إجمالي التكاليف',
        render: (v) => (
          <span className="tabular-nums font-medium text-warning">
            {formatCurrency(Number(v) || 0)}
          </span>
        ),
      },
      {
        key: 'distribute_charges_based_on',
        header: 'طريقة التوزيع',
        render: (v) => {
          const val = String(v ?? '');
          return (
            <span className="text-xs">
              {val === 'Amount' ? 'حسب المبلغ' : val === 'Quantity' ? 'حسب الكمية' : '—'}
            </span>
          );
        },
      },
      {
        key: 'docstatus',
        header: 'حالة المستند',
        render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} />,
      },
      {
        key: '_actions',
        header: 'إجراءات',
        width: 'w-32',
        render: (_v, row) => {
          const ds = Number(row.docstatus);
          if (ds === 0) {
            return (
              <div className="flex items-center gap-1">
                <Button
                  dir="rtl"
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 text-[10px] gap-1"
                  onClick={() =>
                    submitMutation.mutate(row.name, {
                      onSuccess: () => {
                        toast.success('تم الترحيل بنجاح');
                        void refetch();
                      },
                      onError: () =>
                        toast.error('تعذر الترحيل'),
                    })
                  }
                >
                  <Send className="h-3 w-3" />
                  ترحيل
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive"
                  onClick={() => setDeleteName(row.name)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          }
          if (ds === 1) {
            return (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-[10px] gap-1"
                onClick={() =>
                  cancelMutation.mutate(row.name, {
                    onSuccess: () => {
                      toast.success('تم إلغاء المستند');
                      void refetch();
                    },
                    onError: () =>
                      toast.error('تعذر الإلغاء'),
                  })
                }
              >
                <Undo2 className="h-3 w-3" />
                إلغاء
              </Button>
            );
          }
          return <span className="text-muted-foreground text-xs">—</span>;
        },
      },
    ],
    [submitMutation, cancelMutation, toast, refetch]
  );

  /* ── Create handler ── */
  const handleCreate = () => {
    const useCompany = selectedCompany || company;
    if (!useCompany) {
      toast.error('تعذر تحديد الشركة');
      return;
    }
    const validReceipts = receipts.filter((r) => r.receipt_document);
    if (validReceipts.length === 0) {
      toast.error('حدد إيصال استلام واحد على الأقل');
      return;
    }
    const validTaxes = taxes.filter((t) => t.expense_account && Number(t.amount) > 0);
    if (validTaxes.length === 0) {
      toast.error('أضف بند تكلفة واحد على الأقل مع مبلغ أكبر من صفر');
      return;
    }

    const totalChargeAmount = validTaxes.reduce((s, t) => s + (Number(t.amount) || 0), 0);

    /* Use the first tax line for the buildLandedCostVoucher payload —
       the function only supports a single tax entry in its current API.
       For multi-line taxes, they'd need to extend the payload builder. */
    const firstTax = validTaxes[0]!;

    const doc = buildLandedCostVoucher({
      company: useCompany,
      posting_date: postingDate,
      distribute_charges_based_on: distribute,
      expense_account: firstTax.expense_account,
      charge_amount: totalChargeAmount,
      description: firstTax.description || 'تكلفة إضافية من الواجهة',
      purchase_receipts: validReceipts.map((r) => ({
        receipt_document: r.receipt_document,
        applicable_charges: Number(r.applicable_charges) || totalChargeAmount,
      })),
    });
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء مستند التكلفة الإضافية');
        setDialogOpen(false);
        setReceipts([emptyReceipt()]);
        setTaxes([emptyTax()]);
        setSelectedCompany('');
        setDistribute('Amount');
        void refetch();
      },
      onError: () =>
        toast.error('تعذر الحفظ — راجع صلاحيات الحساب وإيصال الاستلام'),
    });
  };

  /* ── Reset form on dialog close ── */
  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setReceipts([emptyReceipt()]);
      setTaxes([emptyTax()]);
      setSelectedCompany('');
      setDistribute('Amount');
      setPostingDate(new Date().toISOString().split('T')[0]!);
    }
  };

  /* ── Computed totals for the form ── */
  const formTotalCharges = taxes.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  /* ── Render ── */
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      {/* ── Page Header ── */}
      <PageHeader
        title="تكاليف إضافية"
        description="إدارة مستندات التكاليف الإضافية وتوزيعها على إيصالات الاستلام"
        iconify="solar:tag-price-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'التصنيع', href: '/manufacturing' }, { label: 'التكاليف الإضافية' }]}
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            disabled={coLoading}
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            مستند جديد
          </Button>
        }
      />

      {/* ── KPI Cards ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="مستندات التكلفة"
          value={kpiTotal}
          icon={Receipt}
          accent="warning"
          description="إجمالي المستندات"
        />
        <KpiCard
          title="مسودات"
          value={kpiDraft}
          icon={FileText}
          accent="info"
          description="بانتظار الترحيل"
        />
        <KpiCard
          title="مُرحّلة"
          value={kpiSubmitted}
          icon={Send}
          accent="success"
          description="مستندات معتمدة"
        />
        <KpiCard
          title="إجمالي التكاليف"
          value={formatCurrency(totalCost)}
          icon={Coins}
          accent="primary"
          description="جميع التكاليف الإضافية"
        />
      </KpiStrip>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/40 bg-card px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span className="font-semibold">تصفية:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            dir="rtl"
            value={filterCompany}
            onValueChange={(v) => setFilterCompany(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="الشركة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">الكل</SelectItem>
              {companyFilterOptions
                .filter((o) => o.value)
                .map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            dir="rtl"
            value={filterDocStatus}
            onValueChange={(v) => setFilterDocStatus(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="حالة المستند" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">الكل</SelectItem>
              {DOC_STATUS_OPTIONS.filter((o) => o.value).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterCompany || filterDocStatus) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive"
              onClick={() => {
                setFilterCompany('');
                setFilterDocStatus('');
              }}
            >
              مسح الفلاتر
            </Button>
          )}
          <span className="text-[11px] text-muted-foreground">
            عرض {rows.length} من {allRows.length}
          </span>
        </div>
      </div>

      {/* ── Data Table ── */}
      <DataTable
        data={rows}
        columns={columns}
        searchable
        loading={isLoading}
        tableId="landed-cost-vouchers"
        exportFileName="landed-cost-vouchers"
        onDelete={(r) => setDeleteName(r.name)}
      />

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف مستند التكلفة الإضافية؟</AlertDialogTitle>
            <p className="text-sm text-muted-foreground">
              سيتم حذف المستند &quot;{deleteName}&quot; نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deleteName) return;
                deleteMutation.mutate(deleteName, {
                  onSuccess: () => {
                    toast.success('تم حذف المستند');
                    setDeleteName(null);
                    void refetch();
                  },
                  onError: () =>
                    toast.error('تعذر الحذف'),
                });
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-warning" />
              إنشاء مستند تكلفة إضافية
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* ── Header Fields ── */}
            <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground">معلومات أساسية</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    الشركة
                  </Label>
                  <ErpLinkCombobox
                    doctype="Company"
                    value={selectedCompany || company || ''}
                    onChange={setSelectedCompany}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    تاريخ الترحيل
                  </Label>
                  <Input
                    type="date"
                    dir="ltr"
                    value={postingDate}
                    onChange={(e) => setPostingDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Landmark className="h-3 w-3" />
                    توزيع حسب
                  </Label>
                  <Select
                    dir="rtl"
                    value={distribute}
                    onValueChange={(v) => setDistribute(v as 'Amount' | 'Quantity')}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Amount">حسب المبلغ</SelectItem>
                      <SelectItem value="Quantity">حسب الكمية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ── Purchase Receipts ── */}
            <div className="rounded-lg border">
              <div className="bg-muted/35 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-warning" />
                  <span className="text-xs font-semibold">إيصالات الاستلام</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setReceipts((p) => [...p, emptyReceipt()])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة إيصال
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs min-w-[200px]">إيصال الاستلام</TableHead>
                      <TableHead className="text-xs w-36">التكاليف المستحقة</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.map((r, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <ErpLinkCombobox
                            doctype="Purchase Receipt"
                            value={r.receipt_document}
                            onChange={(v) => updateReceipt(idx, 'receipt_document', v)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-xs"
                            dir="ltr"
                            type="number"
                            min="0"
                            step="0.01"
                            value={r.applicable_charges}
                            onChange={(e) =>
                              updateReceipt(idx, 'applicable_charges', e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7"
                            onClick={() =>
                              receipts.length > 1 &&
                              setReceipts((rows) => rows.filter((_, j) => j !== idx))
                            }
                            disabled={receipts.length === 1}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {receipts.length > 0 && (
                <div className="border-t bg-muted/15 px-3 py-2">
                  <span className="text-[11px] text-muted-foreground">
                    عدد الإيصالات: {receipts.filter((r) => r.receipt_document).length}
                  </span>
                </div>
              )}
            </div>

            {/* ── Taxes / Charges ── */}
            <div className="rounded-lg border">
              <div className="bg-muted/35 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-warning" />
                  <span className="text-xs font-semibold">بنود التكاليف / الضرائب</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setTaxes((p) => [...p, emptyTax()])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة بند
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs min-w-[180px]">حساب المصروف</TableHead>
                      <TableHead className="text-xs min-w-[160px]">الوصف</TableHead>
                      <TableHead className="text-xs w-32">المبلغ</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxes.map((t, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <ErpLinkCombobox
                            doctype="Account"
                            value={t.expense_account}
                            onChange={(v) => updateTax(idx, 'expense_account', v)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-xs"
                            value={t.description}
                            onChange={(e) =>
                              updateTax(idx, 'description', e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-xs"
                            dir="ltr"
                            type="number"
                            min="0"
                            step="0.01"
                            value={t.amount}
                            onChange={(e) =>
                              updateTax(idx, 'amount', e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7"
                            onClick={() =>
                              taxes.length > 1 &&
                              setTaxes((rows) => rows.filter((_, j) => j !== idx))
                            }
                            disabled={taxes.length === 1}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {taxes.length > 0 && (
                <div className="border-t bg-muted/15 px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    عدد البنود: {taxes.length}
                  </span>
                  <span className="text-[11px] font-semibold">
                    إجمالي التكاليف: <span className="text-warning">{formatCurrency(formTotalCharges)}</span>
                  </span>
                </div>
              )}
            </div>

            {/* ── Summary ── */}
            <div className="rounded-lg border bg-muted/10 p-3">
              <h4 className="text-xs font-semibold mb-2">ملخص المستند</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">الشركة:</span>
                  <p className="font-medium truncate">{selectedCompany || company || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">طريقة التوزيع:</span>
                  <p className="font-medium">
                    {distribute === 'Amount' ? 'حسب المبلغ' : 'حسب الكمية'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">عدد الإيصالات:</span>
                  <p className="font-medium">{receipts.filter((r) => r.receipt_document).length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">إجمالي التكاليف:</span>
                  <p className="font-medium text-warning">{formatCurrency(formTotalCharges)}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={createMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="gap-1.5"
            >
              {createMutation.isPending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5" />
                  حفظ مسودة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
