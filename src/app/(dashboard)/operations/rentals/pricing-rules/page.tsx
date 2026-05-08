'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
  Plus,
  Trash2,
  Tag,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Filter,
  ChevronDown,
  Edit,
  Send,
  Undo2,
  Loader2,
} from 'lucide-react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { formatDate, formatCurrency } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useDeleteDoc, useUpdateDoc, useSubmitDoc, useCancelDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { apiCreateDoc, apiSubmitDoc } from '@/lib/client/api';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Types ──
interface PricingRuleRow {
  name: string;
  title?: string;
  price_or_discount?: string;
  rate_or_discount?: number;
  valid_from?: string;
  valid_upto?: string;
  apply_on?: string;
  disable?: number | boolean;
  docstatus: number;
  company?: string;
  selling?: number | boolean;
  buying?: number | boolean;
  priority?: number;
  // Custom rental fields (stored as custom fields or local meta)
  daily_price?: number;
  hourly_price?: number;
  min_hours?: number;
  booking_slot?: string;
  applicable_days?: string;
  warehouse?: string;
}

const APPLY_ON_MAP: Record<string, string> = {
  'Item Code': 'صنف',
  'Item Group': 'مجموعة أصناف',
  'Brand': 'علامة تجارية',
};

const PRICE_DISCOUNT_MAP: Record<string, string> = {
  'Discount': 'خصم',
  'Price': 'سعر ثابت',
};

const WEEKDAYS = [
  { key: 'sat', label: 'السبت' },
  { key: 'sun', label: 'الأحد' },
  { key: 'mon', label: 'الاثنين' },
  { key: 'tue', label: 'الثلاثاء' },
  { key: 'wed', label: 'الأربعاء' },
  { key: 'thu', label: 'الخميس' },
  { key: 'fri', label: 'الجمعة' },
];

function getRuleStatus(row: PricingRuleRow): string {
  const chk = (v: unknown) => Number(v) === 1 || v === true;
  if (chk(row.disable)) return 'Disabled';
  if (row.valid_upto) {
    const end = new Date(row.valid_upto);
    if (end < new Date()) return 'Expired';
  }
  return 'Active';
}

export default function RentalPricingRulesPage() {
  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();

  // ── Filters ──
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'disabled' | 'expired'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'daily' | 'hourly' | 'seasonal'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ── Create/Edit Dialog ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PricingRuleRow | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formPriceOrDiscount, setFormPriceOrDiscount] = useState('Discount');
  const [formRate, setFormRate] = useState('');
  const [formApplyOn, setFormApplyOn] = useState('Item Code');
  const [formItem, setFormItem] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formValidFrom, setFormValidFrom] = useState('');
  const [formValidUpto, setFormValidUpto] = useState('');
  const [formApplicableDays, setFormApplicableDays] = useState<string[]>(
    WEEKDAYS.map((d) => d.key)
  );
  const [formDailyPrice, setFormDailyPrice] = useState('');
  const [formHourlyPrice, setFormHourlyPrice] = useState('');
  const [formMinHours, setFormMinHours] = useState('');
  const [formBookingSlot, setFormBookingSlot] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('');
  const [formPriority, setFormPriority] = useState('');
  const [formActive, setFormActive] = useState(true);
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
      'priority',
    ],
    order_by: 'name desc',
    limit: 500,
  });

  const submitMutation = useSubmitDoc<PricingRuleRow>('Pricing Rule');
  const cancelMutation = useCancelDoc<PricingRuleRow>('Pricing Rule');
  const deleteMutation = useDeleteDoc('Pricing Rule');
  const updateMutation = useUpdateDoc<PricingRuleRow>('Pricing Rule');

  const rows = data || [];
  const chk = (v: unknown) => Number(v) === 1 || v === true;

  // ── Filtered data ──
  const filtered = useMemo(() => {
    let result = rows;
    if (activeFilter === 'active') result = result.filter((r) => getRuleStatus(r) === 'Active');
    if (activeFilter === 'disabled') result = result.filter((r) => getRuleStatus(r) === 'Disabled');
    if (activeFilter === 'expired') result = result.filter((r) => getRuleStatus(r) === 'Expired');
    if (typeFilter === 'daily') result = result.filter((r) => r.daily_price || Number(r.rate_or_discount) > 0);
    if (typeFilter === 'hourly') result = result.filter((r) => r.hourly_price);
    if (typeFilter === 'seasonal') result = result.filter((r) => r.valid_from && r.valid_upto);
    if (dateFrom) result = result.filter((r) => r.valid_from && r.valid_from >= dateFrom);
    if (dateTo) result = result.filter((r) => r.valid_upto && r.valid_upto <= dateTo);
    return result;
  }, [rows, activeFilter, typeFilter, dateFrom, dateTo]);

  // ── KPIs ──
  const totalRules = rows.length;
  const dailyRules = rows.filter((r) => !chk(r.disable) && r.daily_price).length;
  const hourlyRules = rows.filter((r) => !chk(r.disable) && r.hourly_price).length;
  const seasonalRules = rows.filter((r) => !chk(r.disable) && r.valid_from && r.valid_upto).length;

  // ── Form reset ──
  const resetForm = () => {
    setFormTitle('');
    setFormPriceOrDiscount('Discount');
    setFormRate('');
    setFormApplyOn('Item Code');
    setFormItem('');
    setFormQty('');
    setFormValidFrom('');
    setFormValidUpto('');
    setFormApplicableDays(WEEKDAYS.map((d) => d.key));
    setFormDailyPrice('');
    setFormHourlyPrice('');
    setFormMinHours('');
    setFormBookingSlot('');
    setFormWarehouse('');
    setFormPriority('');
    setFormActive(true);
    setEditTarget(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (row: PricingRuleRow) => {
    setEditTarget(row);
    setFormTitle(row.title || '');
    setFormPriceOrDiscount(row.price_or_discount || 'Discount');
    setFormRate(String(row.rate_or_discount || ''));
    setFormApplyOn(row.apply_on || 'Item Code');
    setFormValidFrom(row.valid_from || '');
    setFormValidUpto(row.valid_upto || '');
    setFormPriority(String(row.priority || ''));
    setFormActive(!chk(row.disable));
    setDialogOpen(true);
  };

  // ── Create/Edit Handler ──
  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast.error('يرجى إدخال عنوان القاعدة');
      return;
    }
    const company = defaultCompany;
    if (!company) {
      toast.error('يرجى اختيار الشركة');
      return;
    }
    const rate = Number(formRate);
    if (formPriceOrDiscount === 'Discount' && (!Number.isFinite(rate) || rate <= 0)) {
      toast.error('يرجى إدخال القيمة بشكل صحيح');
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
        ...(formPriceOrDiscount === 'Discount' ? { discount_percentage: rate } : {}),
        ...(formPriceOrDiscount === 'Price' ? { price_list_rate: rate } : {}),
        ...(formValidFrom ? { valid_from: formValidFrom } : {}),
        ...(formValidUpto ? { valid_upto: formValidUpto } : {}),
        ...(formPriority ? { priority: Number(formPriority) } : {}),
        disable: formActive ? 0 : 1,
        selling: 1,
        buying: 0,
      };

      if (editTarget) {
        await updateMutation.mutateAsync({ name: editTarget.name, doc: payload });
        toast.success('تم تحديث قاعدة التسعير');
      } else {
        const body = prepareFrappeDocForCreate(payload);
        const created = await apiCreateDoc('Pricing Rule', body);
        if (created && typeof created === 'object' && 'name' in created) {
          try {
            await apiSubmitDoc('Pricing Rule', (created as { name: string }).name);
            toast.success('تم إنشاء قاعدة التسعير وترحيلها');
          } catch {
            toast.success('تم إنشاء قاعدة التسعير (مسودة)');
          }
        } else {
          toast.success('تم إنشاء قاعدة التسعير');
        }
      }

      setDialogOpen(false);
      resetForm();
      void refetch();
    } catch (e) {
      toast.error((e as Error).message || 'تعذر حفظ قاعدة التسعير');
    } finally {
      setCreating(false);
    }
  };

  // ── Delete Handler ──
  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.name, {
      onSuccess: () => {
        toast.success('تم حذف قاعدة التسعير');
        setDeleteTarget(null);
        void refetch();
      },
      onError: () => toast.error('تعذر حذف قاعدة التسعير'),
    });
  };

  // ── Toggle day ──
  const toggleDay = (day: string) => {
    setFormApplicableDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
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
        key: 'price_or_discount',
        header: 'النوع',
        render: (v) => {
          const val = String(v || '');
          return PRICE_DISCOUNT_MAP[val] || val || '—';
        },
      },
      {
        key: 'rate_or_discount',
        header: 'القيمة',
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
        key: 'apply_on',
        header: 'يُطبّق على',
        render: (v) => APPLY_ON_MAP[String(v || '')] || String(v || '—'),
      },
      {
        key: 'valid_from',
        header: 'من',
        render: (v) => (v ? formatDate(String(v)) : '—'),
      },
      {
        key: 'valid_upto',
        header: 'إلى',
        render: (v) => (v ? formatDate(String(v)) : '—'),
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (_v, row) => {
          const status = getRuleStatus(row);
          const colorMap: Record<string, string> = {
            Active: 'bg-success/12 text-success ring-success/25',
            Disabled: 'bg-muted text-muted-foreground ring-border/40',
            Expired: 'bg-destructive/12 text-destructive ring-destructive/25',
          };
          const labelMap: Record<string, string> = {
            Active: 'نشط',
            Disabled: 'معطّل',
            Expired: 'منتهي',
          };
          return (
            <Badge
              variant="outline"
              className={cn('border-0 text-[10px] font-semibold px-2 py-0.5 ring-1 ring-inset', colorMap[status])}
            >
              {labelMap[status] || status}
            </Badge>
          );
        },
      },
    ],
    []
  );

  const clearFilters = () => {
    setActiveFilter('all');
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
  };
  const hasActiveFilters = activeFilter !== 'all' || typeFilter !== 'all' || dateFrom || dateTo;

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="قواعد التسعير"
        description="إدارة أسعار الإيجار بالأيام والساعات والمواسم"
        iconify="solar:tag-price-bold-duotone"
        accent="success"
        breadcrumbs={[
          { label: 'التشغيل' },
          { label: 'إدارة الإيجارات', href: '/operations/rentals' },
          { label: 'قواعد التسعير' },
        ]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={openCreateDialog}>
            <Plus className="h-3.5 w-3.5" />
            قاعدة تسعير جديدة
          </Button>
        }
      />

      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي القواعد"
          value={totalRules}
          icon={Tag}
          accent="primary"
          description="جميع قواعد التسعير"
        />
        <KpiCard
          title="قواعد يومية"
          value={dailyRules}
          icon={Calendar}
          accent="success"
          description="أسعار الإيجار اليومي"
        />
        <KpiCard
          title="قواعد ساعية"
          value={hourlyRules}
          icon={Clock}
          accent="warning"
          description="أسعار الإيجار بالساعة"
        />
        <KpiCard
          title="قواعد موسمية"
          value={seasonalRules}
          icon={Calendar}
          accent="info"
          description="أسعار حسب الموسم"
        />
      </KpiStrip>

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
                <Label className="text-[10px]">الحالة</Label>
                <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="disabled">معطلة</SelectItem>
                    <SelectItem value="expired">منتهية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">نوع السعر</Label>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="daily">يومية</SelectItem>
                    <SelectItem value="hourly">ساعية</SelectItem>
                    <SelectItem value="seasonal">موسمية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">من تاريخ</Label>
                <Input type="date" dir="ltr" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">إلى تاريخ</Label>
                <Input type="date" dir="ltr" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
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
        tableId="rental-pricing-rules"
        exportFileName="rental-pricing-rules.csv"
        printTitle="قواعد التسعير"
        onEdit={openEditDialog}
        onDelete={(row) => setDeleteTarget(row)}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <span>{editTarget ? 'تعديل قاعدة التسعير' : 'قاعدة تسعير جديدة'}</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  أدخل بيانات قاعدة التسعير للإيجار
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" dir="rtl" className="mt-2">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="general" className="text-xs">عام</TabsTrigger>
              <TabsTrigger value="application" className="text-xs">التطبيق</TabsTrigger>
              <TabsTrigger value="period" className="text-xs">الفترة</TabsTrigger>
              <TabsTrigger value="pricing" className="text-xs">الأسعار</TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs">متقدم</TabsTrigger>
            </TabsList>

            {/* Tab: General */}
            <TabsContent value="general" className="space-y-4 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">عنوان القاعدة <span className="text-destructive text-xs">*</span></Label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="مثال: تسعيرة الإيجار اليومي" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">نوع التسعير <span className="text-destructive text-xs">*</span></Label>
                  <Select value={formPriceOrDiscount} onValueChange={setFormPriceOrDiscount}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Discount">خصم</SelectItem>
                      <SelectItem value="Price">سعر ثابت</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">القيمة <span className="text-destructive text-xs">*</span></Label>
                <Input
                  type="number"
                  dir="ltr"
                  min={0}
                  step="0.01"
                  value={formRate}
                  onChange={(e) => setFormRate(e.target.value)}
                  placeholder={formPriceOrDiscount === 'Discount' ? 'مثال: 15 (%)' : 'مثال: 50000 (ر.ي)'}
                />
              </div>
            </TabsContent>

            {/* Tab: Application */}
            <TabsContent value="application" className="space-y-4 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">يُطبّق على <span className="text-destructive text-xs">*</span></Label>
                  <Select value={formApplyOn} onValueChange={setFormApplyOn}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Item Code">صنف</SelectItem>
                      <SelectItem value="Item Group">مجموعة أصناف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">
                    {formApplyOn === 'Item Group' ? 'المجموعة' : 'الصنف'} <span className="text-destructive text-xs">*</span>
                  </Label>
                  <ErpLinkCombobox
                    doctype={formApplyOn === 'Item Group' ? 'Item Group' : 'Item'}
                    value={formItem}
                    onChange={setFormItem}
                    placeholder={formApplyOn === 'Item Group' ? 'اختر مجموعة...' : 'اختر صنفاً...'}
                    displayKey={formApplyOn === 'Item Group' ? 'item_group_name' : 'item_name'}
                  />
                </div>
              </div>
              <div className="space-y-1.5 max-w-xs">
                <Label className="text-[13px] font-semibold">الكمية</Label>
                <Input
                  type="number"
                  dir="ltr"
                  min={0}
                  value={formQty}
                  onChange={(e) => setFormQty(e.target.value)}
                  placeholder="اتركه فارغاً للكل"
                />
              </div>
            </TabsContent>

            {/* Tab: Period */}
            <TabsContent value="period" className="space-y-4 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">تاريخ البداية</Label>
                  <Input type="date" dir="ltr" value={formValidFrom} onChange={(e) => setFormValidFrom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">تاريخ النهاية</Label>
                  <Input type="date" dir="ltr" value={formValidUpto} onChange={(e) => setFormValidUpto(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold">أيام الأسبوع</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => (
                    <label
                      key={day.key}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all',
                        formApplicableDays.includes(day.key)
                          ? 'border-primary/40 bg-primary/10 text-primary font-semibold'
                          : 'border-border/40 text-muted-foreground hover:border-border/60'
                      )}
                    >
                      <Checkbox
                        checked={formApplicableDays.includes(day.key)}
                        onCheckedChange={() => toggleDay(day.key)}
                        className="h-3 w-3"
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab: Pricing */}
            <TabsContent value="pricing" className="space-y-4 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">السعر اليومي (ر.ي)</Label>
                  <Input
                    type="number"
                    dir="ltr"
                    min={0}
                    step="0.01"
                    value={formDailyPrice}
                    onChange={(e) => setFormDailyPrice(e.target.value)}
                    placeholder="مثال: 25000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">السعر بالساعة (ر.ي)</Label>
                  <Input
                    type="number"
                    dir="ltr"
                    min={0}
                    step="0.01"
                    value={formHourlyPrice}
                    onChange={(e) => setFormHourlyPrice(e.target.value)}
                    placeholder="مثال: 1500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">الحد الأدنى للساعات</Label>
                  <Input
                    type="number"
                    dir="ltr"
                    min={0}
                    value={formMinHours}
                    onChange={(e) => setFormMinHours(e.target.value)}
                    placeholder="مثال: 2"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">فترة الحجز</Label>
                  <Select value={formBookingSlot} onValueChange={setFormBookingSlot}>
                    <SelectTrigger><SelectValue placeholder="اختر فترة الحجز..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 دقائق</SelectItem>
                      <SelectItem value="15">15 دقيقة</SelectItem>
                      <SelectItem value="30">30 دقيقة</SelectItem>
                      <SelectItem value="60">60 دقيقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Advanced */}
            <TabsContent value="advanced" className="space-y-4 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">المستودع</Label>
                  <ErpLinkCombobox
                    doctype="Warehouse"
                    value={formWarehouse}
                    onChange={setFormWarehouse}
                    placeholder="اختر المستودع..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">الأولوية</Label>
                  <Input
                    type="number"
                    dir="ltr"
                    min={0}
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    placeholder="مثال: 1"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={formActive}
                  onCheckedChange={setFormActive}
                  id="rule-active"
                />
                <Label htmlFor="rule-active" className="text-[13px] font-semibold cursor-pointer">
                  {formActive ? 'نشط' : 'معطّل'}
                </Label>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); resetForm(); }} className="text-muted-foreground">
              إلغاء
            </Button>
            <Button disabled={creating} onClick={handleSave} className="gap-1.5 min-w-[130px]">
              {creating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  جارٍ الحفظ...
                </>
              ) : editTarget ? (
                'تحديث'
              ) : (
                'حفظ وترحيل'
              )}
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
