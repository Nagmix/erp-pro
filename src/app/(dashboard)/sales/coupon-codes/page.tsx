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
import { Plus, Trash2, Ticket, CheckCircle, XCircle, Filter, ChevronDown, Send, Undo2 } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { formatDate } from '@/lib/core/helpers';
import { useDocList, useDeleteDoc, useSubmitDoc, useCancelDoc, useUpdateDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { apiCreateDoc } from '@/lib/client/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CouponCodeRow {
  name: string;
  coupon_name?: string;
  coupon_code?: string;
  coupon_type?: string;
  maximum_use?: number;
  used?: number;
  pricing_rule?: string;
  valid_from?: string;
  valid_upto?: string;
  disable?: number | boolean;
  docstatus: number;
}

const COUPON_TYPE_MAP: Record<string, string> = {
  'Percentage': 'نسبة مئوية',
  'Item Price': 'سعر الصنف',
};

/** توليد رمز كوبون عشوائي */
function generateCouponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const len = 8;
  let code = '';
  for (let i = 0; i < len; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function CouponCodesPage() {
  // ── Filters ──
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Percentage' | 'Item Price'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Create Dialog ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formCouponName, setFormCouponName] = useState('');
  const [formCouponCode, setFormCouponCode] = useState('');
  const [formCouponType, setFormCouponType] = useState('Percentage');
  const [formMaximumUse, setFormMaximumUse] = useState('');
  const [formPricingRule, setFormPricingRule] = useState('');
  const [formValidFrom, setFormValidFrom] = useState('');
  const [formValidUpto, setFormValidUpto] = useState('');
  const [creating, setCreating] = useState(false);

  // ── Edit Dialog ──
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CouponCodeRow | null>(null);
  const [editCouponName, setEditCouponName] = useState('');
  const [editCouponCode, setEditCouponCode] = useState('');
  const [editCouponType, setEditCouponType] = useState('Percentage');
  const [editMaximumUse, setEditMaximumUse] = useState('');
  const [editPricingRule, setEditPricingRule] = useState('');
  const [editValidFrom, setEditValidFrom] = useState('');
  const [editValidUpto, setEditValidUpto] = useState('');
  const [editDisable, setEditDisable] = useState(false);
  const [updating, setUpdating] = useState(false);

  // ── Delete Dialog ──
  const [deleteTarget, setDeleteTarget] = useState<CouponCodeRow | null>(null);

  // ── Data ──
  const { data, isLoading, isError, error, refetch } = useDocList<CouponCodeRow>('Coupon Code', {
    fields: [
      'name',
      'coupon_name',
      'coupon_code',
      'coupon_type',
      'maximum_use',
      'used',
      'pricing_rule',
      'valid_from',
      'valid_upto',
      'disable',
      'docstatus',
    ],
    order_by: 'name desc',
    limit: 500,
  });

  const deleteMutation = useDeleteDoc('Coupon Code');
  const submitMutation = useSubmitDoc<CouponCodeRow>('Coupon Code');
  const cancelMutation = useCancelDoc<CouponCodeRow>('Coupon Code');
  const updateMutation = useUpdateDoc<CouponCodeRow>('Coupon Code');

  const rows = data || [];
  const chk = (v: unknown) => Number(v) === 1 || v === true;

  // ── Filtered data ──
  const filtered = useMemo(() => {
    let result = rows;
    if (activeFilter === 'active') result = result.filter((r) => !chk(r.disable));
    if (activeFilter === 'disabled') result = result.filter((r) => chk(r.disable));
    if (typeFilter !== 'all') result = result.filter((r) => r.coupon_type === typeFilter);
    return result;
  }, [rows, activeFilter, typeFilter]);

  // ── KPIs ──
  const totalCoupons = rows.length;
  const activeCoupons = rows.filter((r) => !chk(r.disable)).length;
  const totalUsage = rows.reduce((sum, r) => sum + (Number(r.used) || 0), 0);
  const draftCoupons = rows.filter((r) => Number(r.docstatus) === 0).length;

  // ── Create Handler ──
  const handleCreate = async () => {
    if (!formCouponName.trim()) {
      toast.error('يرجى إدخال اسم الكوبون');
      return;
    }
    if (!formPricingRule) {
      toast.error('يرجى اختيار قاعدة التسعير المرتبطة');
      return;
    }

    setCreating(true);
    try {
      const code = formCouponCode.trim() || generateCouponCode();
      const maxUse = Number(formMaximumUse);

      const payload: Record<string, unknown> = {
        doctype: 'Coupon Code',
        coupon_name: formCouponName.trim(),
        coupon_code: code,
        coupon_type: formCouponType,
        ...(Number.isFinite(maxUse) && maxUse > 0 ? { maximum_use: maxUse } : {}),
        pricing_rule: formPricingRule,
        ...(formValidFrom ? { valid_from: formValidFrom } : {}),
        ...(formValidUpto ? { valid_upto: formValidUpto } : {}),
      };

      const body = prepareFrappeDocForCreate(payload);
      await apiCreateDoc('Coupon Code', body);

      toast.success('تم إنشاء كوبون الخصم بنجاح');
      setDialogOpen(false);
      resetForm();
      void refetch();
    } catch (e) {
      toast.error('تعذر إنشاء كوبون الخصم', { description: String((e as Error).message || e) });
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormCouponName('');
    setFormCouponCode('');
    setFormCouponType('Percentage');
    setFormMaximumUse('');
    setFormPricingRule('');
    setFormValidFrom('');
    setFormValidUpto('');
  };

  const openDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  // ── Open Edit Dialog ──
  const openEditDialog = (row: CouponCodeRow) => {
    setEditTarget(row);
    setEditCouponName(row.coupon_name || '');
    setEditCouponCode(row.coupon_code || '');
    setEditCouponType(row.coupon_type || 'Percentage');
    setEditMaximumUse(row.maximum_use ? String(row.maximum_use) : '');
    setEditPricingRule(row.pricing_rule || '');
    setEditValidFrom(row.valid_from || '');
    setEditValidUpto(row.valid_upto || '');
    setEditDisable(chk(row.disable));
    setEditDialogOpen(true);
  };

  // ── Update Handler ──
  const handleUpdate = async () => {
    if (!editTarget) return;
    setUpdating(true);
    try {
      const maxUse = Number(editMaximumUse);
      const payload: Record<string, unknown> = {
        coupon_name: editCouponName.trim(),
        coupon_code: editCouponCode.trim(),
        coupon_type: editCouponType,
        ...(Number.isFinite(maxUse) && maxUse > 0 ? { maximum_use: maxUse } : {}),
        pricing_rule: editPricingRule,
        ...(editValidFrom ? { valid_from: editValidFrom } : {}),
        ...(editValidUpto ? { valid_upto: editValidUpto } : {}),
        disable: editDisable ? 1 : 0,
      };
      await updateMutation.mutateAsync({ name: editTarget.name, doc: payload });
      setEditDialogOpen(false);
      setEditTarget(null);
      toast.success('تم تحديث كوبون الخصم بنجاح');
      void refetch();
    } catch (e) {
      toast.error('تعذر تحديث كوبون الخصم', { description: String((e as Error).message || e) });
    } finally {
      setUpdating(false);
    }
  };

  // ── Delete Handler ──
  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.name, {
      onSuccess: () => {
        toast.success('تم حذف الكوبون بنجاح');
        setDeleteTarget(null);
        void refetch();
      },
      onError: () => toast.error('تعذر حذف الكوبون'),
    });
  };

  // ── Columns ──
  const columns: Column<CouponCodeRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرقم',
        sortable: true,
        width: 'w-28',
        render: (v) => <span className="font-medium text-primary">{String(v)}</span>,
      },
      {
        key: 'coupon_name',
        header: 'اسم الكوبون',
        sortable: true,
        render: (v) => String(v || '—'),
      },
      {
        key: 'coupon_code',
        header: 'رمز الكوبون',
        render: (v) => (
          <span className="font-mono bg-muted px-2 rounded text-xs" dir="ltr">
            {String(v || '—')}
          </span>
        ),
      },
      {
        key: 'coupon_type',
        header: 'النوع',
        render: (v) => {
          const val = String(v || '');
          return COUPON_TYPE_MAP[val] || val || '—';
        },
      },
      {
        key: 'maximum_use',
        header: 'الحد الأقصى',
        render: (v) => {
          const num = Number(v);
          return Number.isFinite(num) && num > 0 ? String(num) : '∞';
        },
      },
      {
        key: 'used',
        header: 'مستخدم',
        render: (v) => {
          const num = Number(v) || 0;
          return <span className="tabular-nums">{num}</span>;
        },
      },
      {
        key: 'pricing_rule',
        header: 'قاعدة التسعير',
        render: (v) => (
          <span className="text-xs text-muted-foreground">{String(v || '—')}</span>
        ),
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
                        toast.success('تم ترحيل الكوبون بنجاح');
                        void refetch();
                      },
                      onError: () => toast.error('تعذر ترحيل الكوبون'),
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
                        toast.success('تم إلغاء ترحيل الكوبون');
                        void refetch();
                      },
                      onError: () => toast.error('تعذر إلغاء ترحيل الكوبون'),
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
                  onClick={()=> setDeleteTarget(row)}
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
        title="أكواد الخصم"
        description="إدارة أكواد الخصم والكوبونات — إنشاء وتتبع أكواد الخصم المرتبطة بقواعد التسعير"
        iconify="solar:ticket-sale-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'المبيعات', href: '/sales' }, { label: 'أكواد الخصم' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={openDialog}>
            <Plus className="h-3.5 w-3.5" />
            كوبون جديد
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
                <Label className="text-xs">نوع الكوبون</Label>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | 'Percentage' | 'Item Price')}>
                  <SelectTrigger className="h-8 text-xs w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="Percentage">نسبة مئوية</SelectItem>
                    <SelectItem value="Item Price">سعر الصنف</SelectItem>
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
        onEdit={(row) => openEditDialog(row)}
        tableId="sales-coupon-codes"
        exportFileName="coupon-codes.csv"
        printTitle="أكواد الخصم"
      />

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <span>كوبون خصم جديد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات كوبون الخصم واربطه بقاعدة تسعير</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70">بيانات الكوبون</h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">اسم الكوبون <span className="text-destructive text-xs">*</span></Label>
                    <Input value={formCouponName} onChange={(e) => setFormCouponName(e.target.value)} placeholder="مثال: خصم العيد 2025" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">رمز الكوبون</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formCouponCode}
                        onChange={(e) => setFormCouponCode(e.target.value.toUpperCase())}
                        placeholder="يُولّد تلقائياً إن تُرك فارغاً"
                        dir="ltr"
                        className="font-mono"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-xs"
                        onClick={() => setFormCouponCode(generateCouponCode())}
                      >
                        توليد
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">النوع</Label>
                    <Select value={formCouponType} onValueChange={setFormCouponType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Percentage">نسبة مئوية</SelectItem>
                        <SelectItem value="Item Price">سعر الصنف</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الحد الأقصى للاستخدام</Label>
                    <Input
                      type="number"
                      dir="ltr"
                      min={0}
                      value={formMaximumUse}
                      onChange={(e) => setFormMaximumUse(e.target.value)}
                      placeholder="∞ إن تُرك فارغاً"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">قاعدة التسعير المرتبطة <span className="text-destructive text-xs">*</span></Label>
                  <ErpLinkCombobox doctype="Pricing Rule" value={formPricingRule} onChange={setFormPricingRule} placeholder="اختر قاعدة تسعير" />
                </div>

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
              </div>
            </fieldset>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">
              إلغاء
            </Button>
            <Button disabled={creating} onClick={handleCreate} className="gap-1.5 min-w-[130px]">
              {creating ? 'جاري الحفظ...' : 'حفظ الكوبون'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <span>تعديل كوبون الخصم</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">تعديل بيانات: {editTarget?.name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70">بيانات الكوبون</h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">اسم الكوبون</Label>
                    <Input value={editCouponName} onChange={(e) => setEditCouponName(e.target.value)} placeholder="مثال: خصم العيد 2025" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">رمز الكوبون</Label>
                    <div className="flex gap-2">
                      <Input
                        value={editCouponCode}
                        onChange={(e) => setEditCouponCode(e.target.value.toUpperCase())}
                        placeholder="رمز الكوبون"
                        dir="ltr"
                        className="font-mono"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-xs"
                        onClick={() => setEditCouponCode(generateCouponCode())}
                      >
                        توليد
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">النوع</Label>
                    <Select value={editCouponType} onValueChange={setEditCouponType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Percentage">نسبة مئوية</SelectItem>
                        <SelectItem value="Item Price">سعر الصنف</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الحد الأقصى للاستخدام</Label>
                    <Input
                      type="number"
                      dir="ltr"
                      min={0}
                      value={editMaximumUse}
                      onChange={(e) => setEditMaximumUse(e.target.value)}
                      placeholder="∞ إن تُرك فارغاً"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">قاعدة التسعير المرتبطة</Label>
                  <ErpLinkCombobox doctype="Pricing Rule" value={editPricingRule} onChange={setEditPricingRule} placeholder="اختر قاعدة تسعير" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">صالح من</Label>
                    <Input type="date" dir="ltr" value={editValidFrom} onChange={(e) => setEditValidFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">صالح إلى</Label>
                    <Input type="date" dir="ltr" value={editValidUpto} onChange={(e) => setEditValidUpto(e.target.value)} />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={editDisable}
                    onChange={(e) => setEditDisable(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-muted-foreground">معطّل</span>
                </label>
              </div>
            </fieldset>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-muted-foreground">
              إلغاء
            </Button>
            <Button disabled={updating} onClick={handleUpdate} className="gap-1.5 min-w-[130px]">
              {updating ? 'جاري الحفظ...' : 'حفظ التعديلات'}
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
              هل أنت متأكد من حذف الكوبون &quot;{deleteTarget?.coupon_name || deleteTarget?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
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
