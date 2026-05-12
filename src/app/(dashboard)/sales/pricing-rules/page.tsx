'use client';

import { useMemo, useState } from 'react';
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
import { Plus, Trash2, Tag, Send, Undo2, CheckCircle, XCircle, Percent, Filter, ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { formatDate } from '@/lib/core/helpers';
import { useDocList, useDeleteDoc, useSubmitDoc, useCancelDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { apiCreateDoc, apiSubmitDoc } from '@/lib/client/api';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PricingRuleRow {
  name: string;
  title?: string;
  apply_on?: string;
  price_or_discount?: string;
  rate_or_discount?: number;
  company?: string;
  valid_from?: string;
  valid_upto?: string;
  disable?: number | boolean;
  selling?: number | boolean;
  buying?: number | boolean;
  docstatus: number;
}

const APPLY_ON_MAP: Record<string, string> = {
  'Item Code': 'صنف',
  'Item Group': 'مجموعة أصناف',
  'Brand': 'علامة تجارية',
};

const PRICE_DISCOUNT_MAP: Record<string, string> = {
  'Discount': 'خصم',
  'Price': 'سعر',
};

export default function PricingRulesPage() {
  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();

  // ── Filters ──
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'selling' | 'buying'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Create Dialog ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formApplyOn, setFormApplyOn] = useState('Item Code');
  const [formPriceOrDiscount, setFormPriceOrDiscount] = useState('Discount');
  const [formDiscountPercentage, setFormDiscountPercentage] = useState('');
  const [formValidFrom, setFormValidFrom] = useState('');
  const [formValidUpto, setFormValidUpto] = useState('');
  const [formForPriceList, setFormForPriceList] = useState('');
  const [formSelling, setFormSelling] = useState(true);
  const [formBuying, setFormBuying] = useState(false);
  const [creating, setCreating] = useState(false);

  // ── Delete Dialog ──
  const [deleteTarget, setDeleteTarget] = useState<PricingRuleRow | null>(null);

  // ── Data ──
  const { data, isLoading, isError, error, refetch } = useDocList<PricingRuleRow>('Pricing Rule', {
    fields: [
      'name',
      'title',
      'apply_on',
      'price_or_discount',
      'rate_or_discount',
      'company',
      'valid_from',
      'valid_upto',
      'disable',
      'selling',
      'buying',
      'docstatus',
    ],
    order_by: 'name desc',
    limit: 500,
  });

  const submitMutation = useSubmitDoc<PricingRuleRow>('Pricing Rule');
  const cancelMutation = useCancelDoc<PricingRuleRow>('Pricing Rule');
  const deleteMutation = useDeleteDoc('Pricing Rule');

  const rows = data || [];
  const chk = (v: unknown) => Number(v) === 1 || v === true;

  // ── Filtered data ──
  const filtered = useMemo(() => {
    let result = rows;
    if (activeFilter === 'active') result = result.filter((r) => !chk(r.disable));
    if (activeFilter === 'disabled') result = result.filter((r) => chk(r.disable));
    if (typeFilter === 'selling') result = result.filter((r) => chk(r.selling));
    if (typeFilter === 'buying') result = result.filter((r) => chk(r.buying));
    return result;
  }, [rows, activeFilter, typeFilter]);

  // ── KPIs ──
  const totalRules = rows.length;
  const activeRules = rows.filter((r) => !chk(r.disable)).length;
  const discountRules = rows.filter((r) => r.price_or_discount === 'Discount').length;
  const submittedRules = rows.filter((r) => Number(r.docstatus) === 1).length;

  // ── Create Handler ──
  const handleCreate = async () => {
    if (!formTitle.trim()) {
      toast.error('يرجى إدخال اسم القاعدة');
      return;
    }
    const company = formCompany || defaultCompany;
    if (!company) {
      toast.error('يرجى اختيار الشركة');
      return;
    }
    const discPct = Number(formDiscountPercentage);
    if (formPriceOrDiscount === 'Discount' && (!Number.isFinite(discPct) || discPct <= 0)) {
      toast.error('يرجى إدخال نسبة خصم صحيحة');
      return;
    }

    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        doctype: 'Pricing Rule',
        title: formTitle.trim(),
        company,
        apply_on: formApplyOn,
        price_or_discount: formPriceOrDiscount,
        ...(formPriceOrDiscount === 'Discount' ? { discount_percentage: discPct } : {}),
        ...(formValidFrom ? { valid_from: formValidFrom } : {}),
        ...(formValidUpto ? { valid_upto: formValidUpto } : {}),
        ...(formForPriceList ? { for_price_list: formForPriceList } : {}),
        selling: formSelling ? 1 : 0,
        buying: formBuying ? 1 : 0,
      };

      const body = prepareFrappeDocForCreate(payload);
      const created = await apiCreateDoc('Pricing Rule', body);
      if (created && typeof created === 'object' && 'name' in created) {
        try {
          await apiSubmitDoc('Pricing Rule', (created as { name: string }).name);
          toast.success('تم إنشاء قاعدة التسعير وترحيلها بنجاح');
        } catch {
          toast.success('تم إنشاء قاعدة التسعير (مسودة)', { description: 'يمكنك ترحيلها لاحقاً من جدول البيانات' });
        }
      } else {
        toast.success('تم إنشاء قاعدة التسعير بنجاح');
      }

      setDialogOpen(false);
      resetForm();
      void refetch();
    } catch (e) {
      toast.error('تعذر إنشاء قاعدة التسعير', { description: String((e as Error).message || e) });
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormCompany('');
    setFormApplyOn('Item Code');
    setFormPriceOrDiscount('Discount');
    setFormDiscountPercentage('');
    setFormValidFrom('');
    setFormValidUpto('');
    setFormForPriceList('');
    setFormSelling(true);
    setFormBuying(false);
  };

  // ── Delete Handler ──
  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.name, {
      onSuccess: () => {
        toast.success('تم حذف قاعدة التسعير بنجاح');
        setDeleteTarget(null);
        void refetch();
      },
      onError: () => toast.error('تعذر حذف قاعدة التسعير'),
    });
  };

  // ── Columns ──
  const columns: Column<PricingRuleRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرقم',
        sortable: true,
        width: 'w-28',
        render: (v) => <span className="font-medium text-primary">{String(v)}</span>,
      },
      {
        key: 'title',
        header: 'العنوان',
        sortable: true,
        render: (v) => String(v || '—'),
      },
      {
        key: 'apply_on',
        header: 'ينطبق على',
        render: (v) => {
          const val = String(v || '');
          return APPLY_ON_MAP[val] || val || '—';
        },
      },
      {
        key: 'price_or_discount',
        header: 'النوع',
        render: (v) => {
          const val = String(v || '');
          return PRICE_DISCOUNT_MAP[val] || val || '—';
        },
      },
      {
        key: 'rate_or_discount',
        header: 'القيمة/النسبة',
        render: (v) => {
          const num = Number(v);
          return Number.isFinite(num) ? (
            <span className="font-semibold tabular-nums">{num}%</span>
          ) : (
            '—'
          );
        },
      },
      {
        key: 'valid_from',
        header: 'صالح من',
        render: (v) => (v ? formatDate(String(v)) : '—'),
      },
      {
        key: 'valid_upto',
        header: 'صالح إلى',
        render: (v) => (v ? formatDate(String(v)) : '—'),
      },
      {
        key: 'disable',
        header: 'معطل',
        render: (v) =>
          chk(v) ? (
            <XCircle className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle className="h-4 w-4 text-success" />
          ),
      },
      {
        key: 'docstatus',
        header: 'الحالة',
        render: (_v, row) => <DocStatusBadge docstatus={Number(row.docstatus)} />,
      },
      {
        key: '_actions',
        header: 'إجراءات',
        width: 'w-36',
        render: (_v, row) => {
          const ds = Number(row.docstatus);
          return (
            <div className="flex flex-wrap gap-1">
              {ds === 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs px-2"
                  disabled={submitMutation.isPending}
                  onClick={() =>
                    submitMutation.mutate(row.name, {
                      onSuccess: () => {
                        toast.success('تم ترحيل قاعدة التسعير بنجاح');
                        void refetch();
                      },
                      onError: () => toast.error('تعذر ترحيل قاعدة التسعير'),
                    })
                  }
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
                  className="h-7 text-xs px-2"
                  disabled={cancelMutation.isPending}
                  onClick={() =>
                    cancelMutation.mutate(row.name, {
                      onSuccess: () => {
                        toast.success('تم إلغاء ترحيل قاعدة التسعير');
                        void refetch();
                      },
                      onError: () => toast.error('تعذر إلغاء ترحيل قاعدة التسعير'),
                    })
                  }
                >
                  <Undo2 className="h-3 w-3" />
                  إلغاء
                </Button>
              )}
              {ds === 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => setDeleteTarget(row)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [submitMutation, cancelMutation, refetch],
  );

  const clearFilters = () => {
    setActiveFilter('all');
    setTypeFilter('all');
  };
  const hasActiveFilters = activeFilter !== 'all' || typeFilter !== 'all';

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="قواعد التسعير"
        description="إدارة قواعد التسعير والخصومات — تحديد الأسعار والنسب على الأصناف والمجموعات والعلامات التجارية"
        iconify="solar:tag-price-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المبيعات', href: '/sales' }, { label: 'قواعد التسعير' }]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            قاعدة تسعير جديدة
          </Button>
        }
      />

      {/* KPI Strip */}
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
                <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as 'all' | 'active' | 'disabled')}>
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="disabled">معطلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">النوع</Label>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | 'selling' | 'buying')}>
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="selling">بيع</SelectItem>
                    <SelectItem value="buying">شراء</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Data Table */}
      <DataTable
        data={filtered}
        columns={columns}
        searchable
        loading={isLoading}
        tableId="sales-pricing-rules"
        exportFileName="pricing-rules.csv"
        printTitle="قواعد التسعير"
      />

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <span>قاعدة تسعير جديدة</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات قاعدة التسعير أو الخصم</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70">البيانات الأساسية</h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">اسم القاعدة <span className="text-destructive text-xs">*</span></Label>
                    <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="مثال: خصم الصيف 2025" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الشركة</Label>
                    <ErpLinkCombobox doctype="Company" value={formCompany} onChange={setFormCompany} placeholder={defaultCompany || 'اختر الشركة'} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">ينطبق على</Label>
                    <Select value={formApplyOn} onValueChange={setFormApplyOn}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Item Code">صنف</SelectItem>
                        <SelectItem value="Item Group">مجموعة أصناف</SelectItem>
                        <SelectItem value="Brand">علامة تجارية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">النوع</Label>
                    <Select value={formPriceOrDiscount} onValueChange={setFormPriceOrDiscount}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Discount">خصم</SelectItem>
                        <SelectItem value="Price">سعر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formPriceOrDiscount === 'Discount' && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">نسبة الخصم <span className="text-destructive text-xs">*</span></Label>
                    <Input
                      type="number"
                      dir="ltr"
                      min={0}
                      max={100}
                      step="0.01"
                      value={formDiscountPercentage}
                      onChange={(e) => setFormDiscountPercentage(e.target.value)}
                      placeholder="مثال: 15"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">صالح من</Label>
                    <Input type="date" dir="ltr" value={formValidFrom} onChange={(e) => setFormValidFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">صالح إلى</Label>
                    <Input type="date" dir="ltr" value={formValidUpto} onChange={(e) => setFormValidUpto(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">قائمة الأسعار (اختياري)</Label>
                  <ErpLinkCombobox doctype="Price List" value={formForPriceList} onChange={setFormForPriceList} placeholder="اختر قائمة أسعار" />
                </div>

                <div className="flex gap-6 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formSelling}
                      onChange={(e) => setFormSelling(e.target.checked)}
                      className="rounded"
                    />
                    <span>بيع</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formBuying}
                      onChange={(e) => setFormBuying(e.target.checked)}
                      className="rounded"
                    />
                    <span>شراء</span>
                  </label>
                </div>
              </div>
            </fieldset>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">
              إلغاء
            </Button>
            <Button disabled={creating} onClick={handleCreate} className="gap-1.5 min-w-[130px]">
              {creating ? 'جاري الحفظ...' : 'حفظ وترحيل'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف قاعدة التسعير &quot;{deleteTarget?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              variant="destructive"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
