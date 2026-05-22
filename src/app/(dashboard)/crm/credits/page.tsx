'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus,
  CreditCard,
  ArrowUpLeft,
  ArrowDownLeft,
  Filter,
  ChevronDown,
  X,
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Send,
  Undo2,
  Eye,
  Trash2,
  Mail,
  Clock,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { useDocList, useCreateDoc, useDeleteDoc, useSubmitDoc, useCancelDoc } from '@/lib/client/hooks';
import { ErpLinkCombobox as AccCombobox } from '@/components/erp/erp-link-combobox';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { docDetailPath } from '@/lib/erp/doc-detail-routes';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
// Types
// ============================================================

interface CreditRow {
  name: string;
  payment_type: string;
  posting_date: string;
  party_type: string;
  party: string;
  party_name?: string;
  mode_of_payment?: string;
  paid_amount: number;
  received_amount: number;
  paid_from?: string;
  paid_to?: string;
  reference_no?: string;
  reference_date?: string;
  currency?: string;
  docstatus: number;
  remarks?: string;
}

interface OutstandingRow {
  name: string;
  customer?: string;
  customer_name?: string;
  outstanding_amount?: number;
  due_date?: string;
  posting_date?: string;
  currency?: string;
  docstatus?: number;
}

// ============================================================
// Main Component
// ============================================================

export default function CreditsPage() {
  // ── State ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // فلاتر
  const [customerFilter, setCustomerFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // نموذج الإنشاء
  const [formPaymentType, setFormPaymentType] = useState<'Receive' | 'Pay'>('Receive');
  const [formCustomer, setFormCustomer] = useState('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formModeOfPayment, setFormModeOfPayment] = useState('');
  const [formPaidFrom, setFormPaidFrom] = useState('');
  const [formPaidTo, setFormPaidTo] = useState('');
  const [formCurrency, setFormCurrency] = useState('YER');
  const [formReference, setFormReference] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formPostingDate, setFormPostingDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const { company } = useDefaultCompanyName();

  // ── Data ──
  const list = useDocList<CreditRow>('Payment Entry', {
    fields: [
      'name',
      'payment_type',
      'posting_date',
      'party_type',
      'party',
      'party_name',
      'mode_of_payment',
      'paid_amount',
      'received_amount',
      'paid_from',
      'paid_to',
      'reference_no',
      'reference_date',
      'currency',
      'docstatus',
      'remarks',
    ],
    filters: [['party_type', '=', 'Customer']],
    limit: 500,
    order_by: 'posting_date desc',
  });

  const createMut = useCreateDoc('Payment Entry');
  const deleteMut = useDeleteDoc('Payment Entry');
  const submitMut = useSubmitDoc<CreditRow>('Payment Entry');
  const cancelMut = useCancelDoc<CreditRow>('Payment Entry');

  // جلب بيانات الفواتير المستحقة لحساب الرصيد المستحق والتقادم
  const outstandingList = useDocList<OutstandingRow>('Sales Invoice', {
    fields: ['name', 'customer', 'customer_name', 'outstanding_amount', 'due_date', 'posting_date', 'currency', 'docstatus'],
    filters: [['outstanding_amount', '>', '0'], ['docstatus', '=', '1']],
    limit: 1000,
    order_by: 'due_date asc',
  });

  const entries = list.data || [];
  const outstandingInvoices = outstandingList.data || [];

  // ── Filtered Data ──
  const filteredData = useMemo(() => {
    let result = entries;
    if (customerFilter) {
      result = result.filter(
        (r) =>
          r.party === customerFilter ||
          r.party_name?.includes(customerFilter)
      );
    }
    if (dateFrom) result = result.filter((r) => r.posting_date >= dateFrom);
    if (dateTo) result = result.filter((r) => r.posting_date <= dateTo);
    if (paymentTypeFilter !== 'all') {
      result = result.filter((r) => r.payment_type === paymentTypeFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter((r) => String(r.docstatus) === statusFilter);
    }
    return result;
  }, [entries, customerFilter, dateFrom, dateTo, paymentTypeFilter, statusFilter]);

  // ── KPI Calculations ──
  const totalCredits = useMemo(
    () =>
      entries
        .filter((r) => r.payment_type === 'Receive' && r.docstatus === 1)
        .reduce((sum, x) => sum + Number(x.paid_amount || 0), 0),
    [entries]
  );

  const totalSpent = useMemo(
    () =>
      entries
        .filter((r) => r.payment_type === 'Pay' && r.docstatus === 1)
        .reduce((sum, x) => sum + Number(x.paid_amount || 0), 0),
    [entries]
  );

  const totalTransactions = entries.length;

  // إجمالي المبلغ المستحق من فواتير المبيعات
  const totalOutstanding = useMemo(
    () =>
      outstandingInvoices.reduce(
        (sum, inv) => sum + Number(inv.outstanding_amount || 0),
        0
      ),
    [outstandingInvoices]
  );

  // حساب تقادم المستحقات (aging)
  const aging = useMemo(() => {
    const now = new Date();
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    for (const inv of outstandingInvoices) {
      const dueDate = inv.due_date ? new Date(inv.due_date) : null;
      const amount = Number(inv.outstanding_amount || 0);
      if (!dueDate || amount <= 0) continue;
      const diffMs = now.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        buckets.current += amount;
      } else if (diffDays <= 30) {
        buckets.days30 += amount;
      } else if (diffDays <= 60) {
        buckets.days60 += amount;
      } else if (diffDays <= 90) {
        buckets.days90 += amount;
      } else {
        buckets.over90 += amount;
      }
    }
    return buckets;
  }, [outstandingInvoices]);

  const netBalance = totalCredits - totalSpent;

  const activeFiltersCount = [
    customerFilter,
    dateFrom,
    dateTo,
    paymentTypeFilter !== 'all',
    statusFilter !== 'all',
  ].filter(Boolean).length;

  // ── Clear Filters ──
  const clearFilters = () => {
    setCustomerFilter('');
    setDateFrom('');
    setDateTo('');
    setPaymentTypeFilter('all');
    setStatusFilter('all');
  };

  // ── Reset Form ──
  const resetForm = () => {
    setFormPaymentType('Receive');
    setFormCustomer('');
    setFormAmount('');
    setFormModeOfPayment('');
    setFormPaidFrom('');
    setFormPaidTo('');
    setFormCurrency('YER');
    setFormReference('');
    setFormRemarks('');
    setFormPostingDate(new Date().toISOString().slice(0, 10));
  };

  // ── Create Handler ──
  const handleCreate = () => {
    if (!company || !formCustomer || !formAmount || Number(formAmount) <= 0) {
      toast.error('يرجى إكمال جميع الحقول المطلوبة');
      return;
    }
    const payload = {
      doctype: 'Payment Entry',
      payment_type: formPaymentType,
      party_type: 'Customer',
      party: formCustomer,
      party_name: formCustomer,
      company,
      paid_amount: Number(formAmount),
      received_amount: Number(formAmount),
      mode_of_payment: formModeOfPayment || undefined,
      paid_from: formPaidFrom || undefined,
      paid_to: formPaidTo || undefined,
      currency: formCurrency || 'YER',
      reference_no: formReference || `CREDIT-${Date.now()}`,
      reference_date: formPostingDate,
      posting_date: formPostingDate,
      remarks: formRemarks || undefined,
    };
    createMut.mutate(prepareFrappeDocForCreate(payload), {
      onSuccess: () => {
        toast.success(
          formPaymentType === 'Receive'
            ? 'تم شحن الرصيد بنجاح'
            : 'تم تسجيل الصرف بنجاح'
        );
        setDialogOpen(false);
        resetForm();
      },
      onError: () =>
        toast.error(
          formPaymentType === 'Receive'
            ? 'فشل شحن الرصيد'
            : 'فشل تسجيل الصرف'
        ),
    });
  };

  // ── Table Columns ──
  const columns: Column<CreditRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'رقم القيد',
        sortable: true,
        width: 'w-32',
        render: (value) => {
          const nm = String(value);
          const href = docDetailPath('Payment Entry', nm);
          return href ? (
            <Link
              href={href}
              className="font-medium text-primary hover:underline"
            >
              {nm}
            </Link>
          ) : (
            <span className="font-medium text-primary">{nm}</span>
          );
        },
      },
      {
        key: 'posting_date',
        header: 'التاريخ',
        sortable: true,
        width: 'w-28',
        render: (value) => (
          <span className="text-muted-foreground">
            {formatDate(String(value))}
          </span>
        ),
      },
      {
        key: 'payment_type',
        header: 'النوع',
        width: 'w-28',
        render: (value) => {
          const typeMap: Record<
            string,
            { icon: React.ReactNode; label: string; color: string }
          > = {
            Receive: {
              icon: <ArrowUpLeft className="h-3.5 w-3.5" />,
              label: 'استلام',
              color:
                'text-emerald-700 bg-primary/10 dark:text-emerald-400 dark:bg-chart-3/10',
            },
            Pay: {
              icon: <ArrowDownLeft className="h-3.5 w-3.5" />,
              label: 'صرف',
              color:
                'text-rose-700 bg-destructive/10 dark:text-rose-400 dark:bg-destructive/10',
            },
          };
          const info = typeMap[String(value)] || {
            icon: null,
            label: String(value),
            color: '',
          };
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${info.color}`}
            >
              {info.icon}
              {info.label}
            </span>
          );
        },
      },
      {
        key: 'party_name',
        header: 'العميل',
        sortable: true,
        render: (value, row) => (
          <span className="font-medium">
            {String(value || row.party || '—')}
          </span>
        ),
      },
      {
        key: 'paid_amount',
        header: 'المبلغ',
        sortable: true,
        width: 'w-32',
        render: (value, row) => (
          <span
            className={cn(
              'tabular-nums font-semibold',
              row.payment_type === 'Receive'
                ? 'text-primary'
                : 'text-destructive'
            )}
          >
            {row.payment_type === 'Pay' ? '−' : '+'}
            {formatCurrency(Number(value) || 0, row.currency || 'YER')}
          </span>
        ),
      },
      {
        key: 'mode_of_payment',
        header: 'طريقة الدفع',
        width: 'w-28',
        render: (value) =>
          value ? (
            <Badge variant="secondary" className="text-xs font-normal">
              {String(value)}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: 'currency',
        header: 'العملة',
        width: 'w-20',
        render: (value) => (
          <span className="font-mono text-xs text-muted-foreground" dir="ltr">
            {String(value || 'YER')}
          </span>
        ),
      },
      {
        key: 'reference_no',
        header: 'المرجع',
        width: 'w-28',
        render: (value) =>
          value ? (
            <span className="text-xs" dir="ltr">
              {String(value)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: 'docstatus',
        header: 'الحالة',
        width: 'w-24',
        render: (value) => <DocStatusBadge docstatus={Number(value) as 0 | 1 | 2} />,
      },
      {
        key: 'actions',
        header: 'إجراءات',
        width: 'w-36',
        render: (_, row) => (
          <div className="flex flex-wrap gap-1">
            {(() => {
              const href = docDetailPath('Payment Entry', row.name);
              return href ? (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                >
                  <Link href={href}>
                    <Eye className="h-3 w-3 ms-1" />
                    عرض
                  </Link>
                </Button>
              ) : null;
            })()}
            {Number(row.docstatus) === 0 && (
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() =>
                  submitMut.mutate(row.name, {
                    onSuccess: () => {
                      toast.success('تم ترحيل القيد');
                      void list.refetch();
                    },
                    onError: () => toast.error('فشل الترحيل'),
                  })
                }
              >
                <Send className="h-3 w-3 ms-1" />
                ترحيل
              </Button>
            )}
            {Number(row.docstatus) === 1 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
                onClick={() =>
                  cancelMut.mutate(row.name, {
                    onSuccess: () => {
                      toast.success('تم إلغاء القيد');
                      void list.refetch();
                    },
                    onError: () => toast.error('فشل الإلغاء'),
                  })
                }
              >
                <Undo2 className="h-3 w-3 ms-1" />
                إلغاء
              </Button>
            )}
            {Number(row.docstatus) < 2 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive px-1"
                onClick={() => {
                  deleteMut.mutate(row.name, {
                    onSuccess: () => toast.success('تم حذف القيد'),
                    onError: () => toast.error('فشل الحذف'),
                  });
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [submitMut, cancelMut, deleteMut, list]
  );

  // ── Render ──
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="النقاط والأرصدة"
        description="شحن واستهلاك أرصدة العملاء عبر قيود الدفع — استلام وصرف"
        iconify="solar:wallet-money-bold-duotone"
        accent="warning"
        breadcrumbs={[
          { label: 'CRM', href: '/crm' },
          { label: 'الأرصدة' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled
              title="قريباً"
            >
              <Mail className="h-3.5 w-3.5" />
              إرسال كشف حساب
              <Badge variant="secondary" className="text-[9px] px-1 py-0">قريباً</Badge>
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              عملية جديدة
            </Button>
          </div>
        }
      />
      {/* ملخص تقادم المستحقات */}
      {totalOutstanding > 0 && (
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">ملخص تقادم المستحقات</h3>
              <span className="text-xs text-muted-foreground">— تصنيف المبالغ غير المسددة حسب الأيام المتأخرة</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-5 gap-3">
              <AgingBucket
                label="حالي (غير مستحق)"
                amount={aging.current}
                color="bg-success/10 text-success border-success/20"
                barColor="bg-success"
              />
              <AgingBucket
                label="1-30 يوم"
                amount={aging.days30}
                color="bg-primary/10 text-primary border-primary/20"
                barColor="bg-primary"
              />
              <AgingBucket
                label="31-60 يوم"
                amount={aging.days60}
                color="bg-warning/10 text-warning border-warning/20"
                barColor="bg-warning"
              />
              <AgingBucket
                label="61-90 يوم"
                amount={aging.days90}
                color="bg-chart-2/10 text-chart-2 border-chart-2/20"
                barColor="bg-chart-2"
              />
              <AgingBucket
                label="أكثر من 90 يوم"
                amount={aging.over90}
                color="bg-destructive/10 text-destructive border-destructive/20"
                barColor="bg-destructive"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <ListQueryAlert
        error={list.isError ? list.error : null}
        onRetry={() => list.refetch()}
      />

      {/* فلاتر */}
      <div className="space-y-2">
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" />
                فلاتر متقدمة
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform',
                    filtersOpen && 'rotate-180'
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
                {activeFiltersCount} فلتر نشط
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-5 w-5 p-0 text-warning hover:text-warning"
                >
                  <X className="h-3 w-3" />
                </Button>
              </span>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-3 border-t mt-1">
              <div className="space-y-1 min-w-[200px]">
                <Label className="text-xs">العميل</Label>
                <ErpLinkCombobox
                  doctype="Customer"
                  value={customerFilter}
                  onChange={setCustomerFilter}
                  displayKey="customer_name"
                  placeholder="جميع العملاء"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">من تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 text-xs w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إلى تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 text-xs w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">النوع</Label>
                <Select
                  value={paymentTypeFilter}
                  onValueChange={setPaymentTypeFilter}
                >
                  <SelectTrigger className="h-9 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="Receive">استلام</SelectItem>
                    <SelectItem value="Pay">صرف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الحالة</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="0">مسودة</SelectItem>
                    <SelectItem value="1">مرحّل</SelectItem>
                    <SelectItem value="2">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 text-xs gap-1"
                >
                  <X className="h-3 w-3" />
                  مسح الكل
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* جدول البيانات */}
      <DataTable
        data={filteredData}
        columns={columns}
        searchable
        loading={list.isLoading}
        tableId="crm-credits-table"
        exportFileName="أرصدة-العملاء"
        printTitle="تقرير أرصدة العملاء"
      />

      {/* نافذة إنشاء عملية جديدة */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent dir="rtl" className="max-w-xl max-h-[90vh] overflow-y-auto p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <span>
                  {formPaymentType === 'Receive'
                    ? 'شحن رصيد عميل'
                    : 'تسجيل صرف لعميل'}
                </span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  إنشاء قيد دفع لعميل — استلام أو صرف
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* نوع العملية */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">نوع العملية *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={formPaymentType === 'Receive' ? 'default' : 'outline'}
                  className={cn(
                    'h-auto py-2.5 text-xs gap-2',
                    formPaymentType === 'Receive' &&
                      'bg-chart-3 hover:bg-chart-3 text-white'
                  )}
                  onClick={() => setFormPaymentType('Receive')}
                >
                  <ArrowUpLeft className="h-4 w-4" />
                  استلام (شحن رصيد)
                </Button>
                <Button
                  type="button"
                  variant={formPaymentType === 'Pay' ? 'default' : 'outline'}
                  className={cn(
                    'h-auto py-2.5 text-xs gap-2',
                    formPaymentType === 'Pay' &&
                      'bg-destructive hover:bg-destructive text-white'
                  )}
                  onClick={() => setFormPaymentType('Pay')}
                >
                  <ArrowDownLeft className="h-4 w-4" />
                  صرف (استخدام رصيد)
                </Button>
              </div>
            </div>

            {/* العميل */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">العميل *</Label>
              <ErpLinkCombobox
                doctype="Customer"
                value={formCustomer}
                onChange={setFormCustomer}
                displayKey="customer_name"
                placeholder="اختر العميل"
              />
            </div>

            {/* المبلغ والعملة */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label className="text-sm font-medium">المبلغ *</Label>
                <Input
                  type="number"
                  dir="ltr"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">العملة</Label>
                <Select value={formCurrency} onValueChange={setFormCurrency}>
                  <SelectTrigger className="h-9 text-xs" dir="ltr">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YER">YER</SelectItem>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* طريقة الدفع */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">طريقة الدفع</Label>
              <ErpLinkCombobox
                doctype="Mode of Payment"
                value={formModeOfPayment}
                onChange={setFormModeOfPayment}
                placeholder="اختر طريقة الدفع"
              />
            </div>

            {/* الحسابات */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {formPaymentType === 'Receive'
                    ? 'الحساب المستلم (إلى)'
                    : 'الحساب الدافع (من)'}
                </Label>
                <AccCombobox
                  doctype="Account"
                  value={formPaymentType === 'Receive' ? formPaidTo : formPaidFrom}
                  onChange={(v) => {
                    if (formPaymentType === 'Receive') setFormPaidTo(v);
                    else setFormPaidFrom(v);
                  }}
                  placeholder="الحساب"
                  filters={[['account_type', '=', 'Cash']]}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {formPaymentType === 'Receive'
                    ? 'حساب العميل (من)'
                    : 'حساب العميل (إلى)'}
                </Label>
                <AccCombobox
                  doctype="Account"
                  value={formPaymentType === 'Receive' ? formPaidFrom : formPaidTo}
                  onChange={(v) => {
                    if (formPaymentType === 'Receive') setFormPaidFrom(v);
                    else setFormPaidTo(v);
                  }}
                  placeholder="الحساب"
                  filters={[['account_type', '=', 'Receivable']]}
                />
              </div>
            </div>

            {/* التاريخ والمرجع */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">تاريخ القيد *</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={formPostingDate}
                  onChange={(e) => setFormPostingDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">رقم المرجع</Label>
                <Input
                  placeholder="رقم الشيك / التأكيد"
                  dir="ltr"
                  value={formReference}
                  onChange={(e) => setFormReference(e.target.value)}
                />
              </div>
            </div>

            {/* ملاحظات */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">ملاحظات</Label>
              <Input
                placeholder="ملاحظات إضافية"
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
              />
            </div>

            {/* ملخص */}
            <div className="rounded-lg border border-border/40 bg-muted/15 p-3 text-xs space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">نوع العملية</span>
                <span className="font-medium">
                  {formPaymentType === 'Receive' ? 'استلام (شحن)' : 'صرف'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">العملة</span>
                <span className="font-mono" dir="ltr">{formCurrency}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">المبلغ</span>
                <span className="font-bold tabular-nums">
                  {formatCurrency(Number(formAmount) || 0, formCurrency)}
                </span>
              </div>
            </div>
          </div>

          {/* أزرار الحفظ */}
          <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-muted-foreground"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={createMut.isPending}
              className="gap-1.5 min-w-[130px]"
            >
              {createMut.isPending
                ? 'جاري الحفظ...'
                : formPaymentType === 'Receive'
                ? 'شحن الرصيد'
                : 'تسجيل الصرف'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Aging Bucket Sub-Component ─── */
function AgingBucket({
  label,
  amount,
  color,
  barColor,
}: {
  label: string;
  amount: number;
  color: string;
  barColor: string;
}) {
  const maxAmount = Math.max(amount, 1);
  const barWidth = Math.min((amount / maxAmount) * 100, 100);
  return (
    <div className={cn('rounded-lg border p-3 space-y-2', color)}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-sm font-bold tabular-nums" dir="ltr">{formatCurrency(amount)}</p>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${amount > 0 ? Math.max(barWidth, 5) : 0}%` }}
        />
      </div>
    </div>
  );
}
