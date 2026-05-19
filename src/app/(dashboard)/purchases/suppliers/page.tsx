'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Building2,
  Plus,
  Mail,
  MapPin,
  Truck,
  User,
  Globe,
  Filter,
  ChevronDown,
  X,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Tag,
  Pencil,
  Eye,
  Loader2,
  Hash,
  Phone,
  CreditCard,
} from 'lucide-react';
import { useDocList, useCreateDoc, useDeleteDoc, useUpdateDoc, useDoc } from '@/lib/client/hooks';
import { buildSupplierCreate } from '@/lib/erp/erpnext-payloads';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/* ────────────────────────────────────────────
   أنواع البيانات
   ──────────────────────────────────────────── */
type SupplierRow = {
  name: string;
  supplier_name: string;
  supplier_type: string;
  supplier_group: string;
  country: string;
  default_currency: string;
  payment_terms: string;
  on_hold: number | boolean;
  email_id: string;
  mobile_no: string;
  tax_id: string;
  outstanding_amount?: number;
};

type SupplierFullDoc = {
  name: string;
  supplier_name: string;
  supplier_type: string;
  supplier_group: string;
  country: string;
  default_currency?: string;
  payment_terms?: string;
  on_hold?: number | boolean;
  email_id?: string;
  mobile_no?: string;
  phone?: string;
  tax_id?: string;
  tax_category?: string;
  default_price_list?: string;
  language?: string;
  image?: string;
  disabled?: number | boolean;
  outstanding_amount?: number;
  credit_limit?: number;
  company?: string;
  creation?: string;
  modified?: string;
  owner?: string;
};

/* ────────────────────────────────────────────
   أعمدة الجدول
   ──────────────────────────────────────────── */
const columns: Column<SupplierRow>[] = [
  {
    key: 'supplier_name',
    header: 'اسم المورد',
    sortable: true,
    render: (_, row) => (
      <div className="flex items-center gap-2">
        {row.supplier_type === 'Company' ? (
          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
        ) : (
          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="font-medium">{row.supplier_name}</span>
      </div>
    ),
  },
  {
    key: 'supplier_group',
    header: 'المجموعة',
    sortable: true,
    render: (value) => (
      <div className="flex items-center gap-1.5">
        <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
        <span>{String(value || '—')}</span>
      </div>
    ),
  },
  {
    key: 'country',
    header: 'البلد',
    render: (value) => (
      <div className="flex items-center gap-1.5">
        <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
        <span>{String(value || '—')}</span>
      </div>
    ),
  },
  {
    key: 'default_currency',
    header: 'العملة',
    width: 'w-20',
    render: (value) => (
      <Badge variant="outline" className="text-xs font-medium border-0 bg-muted text-muted-foreground">
        {String(value || '—')}
      </Badge>
    ),
  },
  {
    key: 'payment_terms',
    header: 'شروط الدفع',
    render: (value) => (
      <span className="text-xs">{String(value || '—')}</span>
    ),
  },
  {
    key: 'on_hold',
    header: 'معلّق',
    width: 'w-20',
    render: (value) => {
      const isOnHold = Boolean(value) || Number(value) === 1;
      return isOnHold ? (
        <Badge variant="outline" className="text-xs font-medium border-0 bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25">
          <ToggleRight className="h-3 w-3 me-1" />
          معلّق
        </Badge>
      ) : (
        <Badge variant="outline" className="text-xs font-medium border-0 bg-success/12 text-success ring-1 ring-inset ring-success/25">
          <ToggleLeft className="h-3 w-3 me-1" />
          نشط
        </Badge>
      );
    },
  },
  {
    key: 'supplier_type',
    header: 'النوع',
    width: 'w-24',
    render: (value) => (
      <Badge
        variant="outline"
        className={`text-xs font-medium px-2 py-0.5 border-0 ${
          String(value) === 'Company'
            ? 'bg-primary/10 text-primary'
            : 'bg-secondary text-secondary-foreground'
        }`}
      >
        {String(value) === 'Company' ? 'شركة' : 'فرد'}
      </Badge>
    ),
  },
];

/* ────────────────────────────────────────────
   بيانات النموذج الافتراضية
   ──────────────────────────────────────────── */
const emptyForm = {
  supplier_name: '',
  supplier_type: 'Company',
  supplier_group: '',
  country: '',
  default_currency: '',
  payment_terms: '',
  on_hold: false,
  email_id: '',
  mobile_no: '',
  tax_id: '',
};

/* ────────────────────────────────────────────
   الصفحة الرئيسية
   ──────────────────────────────────────────── */
export default function PurchasesSuppliersPage() {
  /* ── الحالة ── */
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<SupplierRow | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState(emptyForm);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingSupplier, setViewingSupplier] = useState<SupplierRow | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [onHoldFilter, setOnHoldFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');

  /* ── جلب البيانات ── */
  const { data, isLoading, isError, error, refetch } =
    useDocList<SupplierRow>('Supplier', {
      fields: [
        'name',
        'supplier_name',
        'supplier_type',
        'supplier_group',
        'country',
        'default_currency',
        'payment_terms',
        'on_hold',
        'email_id',
        'mobile_no',
        'tax_id',
      ],
      limit: 2000,
    });

  const createMutation = useCreateDoc('Supplier');
  const deleteMutation = useDeleteDoc('Supplier');
  const updateMutation = useUpdateDoc('Supplier');

  // Fetch full document for viewing
  const { data: viewDoc, isLoading: viewDocLoading } = useDoc<SupplierFullDoc>(
    'Supplier',
    viewingSupplier?.name || '',
    { enabled: viewDialogOpen && Boolean(viewingSupplier?.name) }
  );

  const suppliers = data || [];

  /* ── اشتقاقات القوائم ── */
  const groups = useMemo(
    () => [...new Set(suppliers.map((s) => s.supplier_group).filter(Boolean))].sort(),
    [suppliers]
  );

  const countries = useMemo(
    () => [...new Set(suppliers.map((s) => s.country).filter(Boolean))].sort(),
    [suppliers]
  );

  /* ── فلاتر ── */
  let filteredData = suppliers;
  if (groupFilter !== 'all')
    filteredData = filteredData.filter((s) => s.supplier_group === groupFilter);
  if (onHoldFilter !== 'all')
    filteredData = filteredData.filter((s) => {
      const isOnHold = Boolean(s.on_hold) || Number(s.on_hold) === 1;
      return onHoldFilter === 'yes' ? isOnHold : !isOnHold;
    });
  if (countryFilter !== 'all')
    filteredData = filteredData.filter((s) => s.country === countryFilter);

  /* ── مؤشرات الأداء ── */
  const totalCount = suppliers.length;
  const activeCount = suppliers.filter(
    (s) => !Boolean(s.on_hold) && Number(s.on_hold) !== 1
  ).length;
  const onHoldCount = suppliers.filter(
    (s) => Boolean(s.on_hold) || Number(s.on_hold) === 1
  ).length;

  // مجموع المبالغ المستحقّة (تقريبي من البيانات المتاحة)
  const outstandingTotal = 0;

  const hasActiveFilters =
    onHoldFilter !== 'all' || countryFilter !== 'all' || groupFilter !== 'all';

  const clearFilters = () => {
    setOnHoldFilter('all');
    setCountryFilter('all');
    setGroupFilter('all');
  };

  /* ── إنشاء مورد ── */
  const handleCreate = () => {
    if (!formData.supplier_name) {
      toast.error('يرجى إدخال اسم المورد');
      return;
    }
    if (!formData.supplier_group?.trim()) {
      toast.error('يرجى اختيار مجموعة الموردين');
      return;
    }
    if (!formData.country?.trim()) {
      toast.error('يرجى اختيار البلد');
      return;
    }
    const doc = buildSupplierCreate({
      supplier_name: formData.supplier_name,
      supplier_type: formData.supplier_type as 'Company' | 'Individual',
      supplier_group: formData.supplier_group,
      country: formData.country,
      email_id: formData.email_id || undefined,
      mobile_no: formData.mobile_no || undefined,
      tax_id: formData.tax_id || undefined,
    });

    // إضافة حقول إضافية غير مُدارة بواسطة buildSupplierCreate
    const fullDoc: Record<string, unknown> = {
      ...doc,
      ...(formData.default_currency ? { default_currency: formData.default_currency } : {}),
      ...(formData.payment_terms ? { payment_terms: formData.payment_terms } : {}),
      ...(formData.on_hold ? { on_hold: 1 } : {}),
    };

    createMutation.mutate(fullDoc, {
      onSuccess: () => {
        toast.success('تم إضافة المورد بنجاح');
        setDialogOpen(false);
        setFormData(emptyForm);
      },
      onError: () => toast.error('حدث خطأ أثناء إضافة المورد'),
    });
  };

  /* ── Edit Handlers ── */
  const openEditDialog = (row: SupplierRow) => {
    setSelected(row);
    setEditFormData({
      supplier_name: row.supplier_name || '',
      supplier_type: row.supplier_type || 'Company',
      supplier_group: row.supplier_group || '',
      country: row.country || '',
      default_currency: row.default_currency || '',
      payment_terms: row.payment_terms || '',
      on_hold: Boolean(row.on_hold) || Number(row.on_hold) === 1,
      email_id: row.email_id || '',
      mobile_no: row.mobile_no || '',
      tax_id: row.tax_id || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selected) return;
    if (!editFormData.supplier_name?.trim()) {
      toast.error('يرجى إدخال اسم المورد');
      return;
    }
    if (!editFormData.supplier_group?.trim()) {
      toast.error('يرجى اختيار مجموعة الموردين');
      return;
    }
    const doc: Record<string, unknown> = {
      supplier_name: editFormData.supplier_name.trim(),
      supplier_type: editFormData.supplier_type,
      supplier_group: editFormData.supplier_group,
      country: editFormData.country || undefined,
      email_id: editFormData.email_id || undefined,
      mobile_no: editFormData.mobile_no || undefined,
      tax_id: editFormData.tax_id || undefined,
      default_currency: editFormData.default_currency || undefined,
      payment_terms: editFormData.payment_terms || undefined,
      on_hold: editFormData.on_hold ? 1 : 0,
    };
    updateMutation.mutate(
      { name: selected.name, doc },
      {
        onSuccess: () => {
          toast.success('تم تحديث بيانات المورد بنجاح');
          setEditDialogOpen(false);
          setSelected(null);
          void refetch();
        },
        onError: () => toast.error('حدث خطأ أثناء تحديث المورد'),
      }
    );
  };

  /* ── View Handler ── */
  const openViewDialog = (row: SupplierRow) => {
    setViewingSupplier(row);
    setViewDialogOpen(true);
  };

  /* ── حذف مورد ── */
  const handleDelete = () => {
    if (!selected) return;
    deleteMutation.mutate(selected.name, {
      onSuccess: () => {
        toast.success('تم حذف المورد بنجاح');
        setDeleteDialogOpen(false);
        setSelected(null);
      },
      onError: () => toast.error('حدث خطأ أثناء حذف المورد'),
    });
  };

  /* ──────────────────────────────────────────
     واجهة المستخدم
     ────────────────────────────────────────── */
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      {/* ═══ رأس الصفحة ═══ */}
      <PageHeader
        title="الموردين"
        description="إدارة الموردين، متابعة الحسابات، البيانات الضريبية، الفروع والتصنيفات"
        iconify="solar:buildings-bold-duotone"
        accent="warning"
        breadcrumbs={[
          { label: 'المشتريات', href: '/purchases' },
          { label: 'الموردون' },
        ]}
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setFormData(emptyForm);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            مورد جديد
          </Button>
        }
      />
      {/* ═══ شريط الفلاتر ═══ */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => void refetch()}
          >
            <RefreshCw className="h-3 w-3" />
            تحديث
          </Button>
        </div>

        {/* فلاتر متقدمة (قابلة للطي) */}
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
            {hasActiveFilters && (
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
              {/* فلتر مجموعة الموردين */}
              <div className="space-y-1">
                <Label className="text-xs">المجموعة</Label>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="h-8 text-xs w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المجموعات</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* فلتر التعليق */}
              <div className="space-y-1">
                <Label className="text-xs">التعليق</Label>
                <Select value={onHoldFilter} onValueChange={setOnHoldFilter}>
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="no">غير معلّق</SelectItem>
                    <SelectItem value="yes">معلّق</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* فلتر البلد */}
              <div className="space-y-1">
                <Label className="text-xs">البلد</Label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل البلدان</SelectItem>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ═══ تبويبات المجموعات ═══ */}
      <PageShell className="space-y-4" padded={false}>
        <div className="px-4 pt-4">
          <Tabs value={groupFilter} onValueChange={setGroupFilter}>
            <TabsList className="bg-muted/35 flex flex-wrap h-auto gap-1 py-1">
              <TabsTrigger value="all" className="text-xs">
                الكل ({totalCount})
              </TabsTrigger>
              {groups.slice(0, 10).map((g) => (
                <TabsTrigger key={g} value={g} className="text-xs max-w-[140px] truncate">
                  {g}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <DataTable
          data={filteredData}
          columns={columns}
          searchable
          loading={isLoading}
          tableId="purchases-suppliers"
          exportFileName="الموردين"
          onView={(row) => openViewDialog(row)}
          onEdit={(row) => openEditDialog(row)}
          onDelete={(row) => {
            setSelected(row);
            setDeleteDialogOpen(true);
          }}
        />
      </PageShell>

      {/* ═══ حوار إضافة مورد جديد ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          dir="rtl"
          className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 gap-0"
        >
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <span>إضافة مورد جديد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  أدخل بيانات المورد في الحقول أدناه
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* ═══ البيانات الأساسية ═══ */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-warning/10 flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-warning" />
                  </span>
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    اسم المورد <span className="text-destructive text-xs">*</span>
                  </Label>
                  <Input
                    placeholder="اسم المورد أو الشركة"
                    value={formData.supplier_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        supplier_name: e.target.value,
                      }))
                    }
                    className="h-9"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">نوع المورد</Label>
                    <Select
                      dir="rtl"
                      value={formData.supplier_type}
                      onValueChange={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          supplier_type: val,
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="Company">شركة</SelectItem>
                        <SelectItem value="Individual">فرد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">مجموعة الموردين</Label>
                    <ErpLinkCombobox
                      doctype="Supplier Group"
                      value={formData.supplier_group}
                      onChange={(v) =>
                        setFormData((prev) => ({
                          ...prev,
                          supplier_group: v,
                        }))
                      }
                      placeholder="اختر المجموعة..."
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">العملة الافتراضية</Label>
                    <ErpLinkCombobox
                      doctype="Currency"
                      value={formData.default_currency}
                      onChange={(v) =>
                        setFormData((prev) => ({
                          ...prev,
                          default_currency: v,
                        }))
                      }
                      placeholder="اختر العملة..."
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">شروط الدفع</Label>
                    <ErpLinkCombobox
                      doctype="Payment Terms Template"
                      value={formData.payment_terms}
                      onChange={(v) =>
                        setFormData((prev) => ({
                          ...prev,
                          payment_terms: v,
                        }))
                      }
                      placeholder="اختر شروط الدفع..."
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                {/* خيار التعليق */}
                <div className="flex items-center gap-3 py-1">
                  <Checkbox
                    id="on_hold"
                    checked={formData.on_hold}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        on_hold: Boolean(checked),
                      }))
                    }
                  />
                  <Label
                    htmlFor="on_hold"
                    className="text-sm font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <ToggleRight className="h-4 w-4 text-destructive" />
                    تعليق المورد
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    (لن يمكن إصدار أوامر شراء للمورد المعلّق)
                  </span>
                </div>
              </div>
            </fieldset>

            {/* ═══ معلومات الاتصال ═══ */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center">
                    <Mail className="h-3 w-3 text-info" />
                  </span>
                  معلومات الاتصال
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">البريد الإلكتروني</Label>
                    <Input
                      type="email"
                      placeholder="name@company.sa"
                      dir="ltr"
                      value={formData.email_id}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          email_id: e.target.value,
                        }))
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">رقم الهاتف</Label>
                    <Input
                      placeholder="05XXXXXXXX"
                      dir="ltr"
                      value={formData.mobile_no}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          mobile_no: e.target.value,
                        }))
                      }
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            {/* ═══ الموقع والضرائب ═══ */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-success/10 flex items-center justify-center">
                    <MapPin className="h-3 w-3 text-success" />
                  </span>
                  الموقع والضرائب
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">البلد</Label>
                    <ErpLinkCombobox
                      doctype="Country"
                      value={formData.country}
                      onChange={(v) =>
                        setFormData((prev) => ({
                          ...prev,
                          country: v,
                        }))
                      }
                      placeholder="اختر البلد..."
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الرقم الضريبي</Label>
                    <Input
                      placeholder="الرقم الضريبي"
                      dir="rtl"
                      value={formData.tax_id}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tax_id: e.target.value,
                        }))
                      }
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="text-muted-foreground"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="gap-1.5 min-w-[130px]"
              >
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ المورد'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ حوار تعديل مورد ═══ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <span>تعديل بيانات المورد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">تعديل بيانات: {selected?.supplier_name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><Building2 className="h-3 w-3 text-info" /></span>
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">اسم المورد <span className="text-destructive text-xs">*</span></Label>
                  <Input placeholder="اسم المورد أو الشركة" value={editFormData.supplier_name} onChange={e => setEditFormData(prev => ({ ...prev, supplier_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">كود المورد</Label>
                  <Input value={selected?.name || ''} disabled className="bg-muted text-muted-foreground" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">نوع المورد</Label>
                    <Select dir="rtl" value={editFormData.supplier_type} onValueChange={val => setEditFormData(prev => ({ ...prev, supplier_type: val }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="Company">شركة</SelectItem>
                        <SelectItem value="Individual">فرد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">مجموعة الموردين</Label>
                    <ErpLinkCombobox doctype="Supplier Group" value={editFormData.supplier_group} onChange={(v) => setEditFormData((prev) => ({ ...prev, supplier_group: v }))} placeholder="اختر المجموعة..." className="h-9 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">العملة الافتراضية</Label>
                    <ErpLinkCombobox doctype="Currency" value={editFormData.default_currency} onChange={(v) => setEditFormData((prev) => ({ ...prev, default_currency: v }))} placeholder="اختر العملة..." className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">شروط الدفع</Label>
                    <ErpLinkCombobox doctype="Payment Terms Template" value={editFormData.payment_terms} onChange={(v) => setEditFormData((prev) => ({ ...prev, payment_terms: v }))} placeholder="اختر شروط الدفع..." className="h-9 text-sm" />
                  </div>
                </div>
                <div className="flex items-center gap-3 py-1">
                  <Checkbox id="edit_on_hold" checked={editFormData.on_hold} onCheckedChange={(checked) => setEditFormData((prev) => ({ ...prev, on_hold: Boolean(checked) }))} />
                  <Label htmlFor="edit_on_hold" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                    <ToggleRight className="h-4 w-4 text-destructive" />
                    تعليق المورد
                  </Label>
                </div>
              </div>
            </fieldset>
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><Mail className="h-3 w-3 text-info" /></span>
                  معلومات الاتصال
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">البريد الإلكتروني</Label>
                    <Input type="email" placeholder="name@company.sa" dir="ltr" value={editFormData.email_id} onChange={e => setEditFormData(prev => ({ ...prev, email_id: e.target.value }))} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">رقم الهاتف</Label>
                    <Input placeholder="05XXXXXXXX" dir="ltr" value={editFormData.mobile_no} onChange={e => setEditFormData(prev => ({ ...prev, mobile_no: e.target.value }))} className="h-9" />
                  </div>
                </div>
              </div>
            </fieldset>
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-success/10 flex items-center justify-center"><MapPin className="h-3 w-3 text-success" /></span>
                  الموقع والضرائب
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">البلد</Label>
                    <ErpLinkCombobox doctype="Country" value={editFormData.country} onChange={(v) => setEditFormData((prev) => ({ ...prev, country: v }))} placeholder="اختر البلد..." className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الرقم الضريبي</Label>
                    <Input placeholder="الرقم الضريبي" dir="rtl" value={editFormData.tax_id} onChange={e => setEditFormData(prev => ({ ...prev, tax_id: e.target.value }))} className="h-9" />
                  </div>
                </div>
              </div>
            </fieldset>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="gap-1.5 min-w-[130px]">
              {updateMutation.isPending ? (
                <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />جاري الحفظ...</>
              ) : 'حفظ التعديلات'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ حوار عرض مورد ═══ */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <span>تفاصيل المورد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">{viewingSupplier?.supplier_name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {viewDocLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ms-3 text-sm text-muted-foreground">جاري تحميل البيانات...</span>
            </div>
          ) : viewDoc ? (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto">
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-success/10 flex items-center justify-center"><User className="h-3 w-3 text-success" /></span>
                    البيانات الأساسية
                  </h4>
                </div>
                <div className="p-4 space-y-3 bg-card/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SupplierDetailField icon={<Hash className="h-3.5 w-3.5" />} label="كود المورد" value={viewDoc.name} dir="ltr" />
                    <SupplierDetailField icon={<User className="h-3.5 w-3.5" />} label="اسم المورد" value={viewDoc.supplier_name} />
                    <SupplierDetailField icon={<Building2 className="h-3.5 w-3.5" />} label="نوع المورد" value={viewDoc.supplier_type === 'Company' ? 'شركة' : 'فرد'} badge badgeClass={viewDoc.supplier_type === 'Company' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'} />
                    <SupplierDetailField icon={<Tag className="h-3.5 w-3.5" />} label="المجموعة" value={viewDoc.supplier_group} />
                    <SupplierDetailField icon={<Globe className="h-3.5 w-3.5" />} label="البلد" value={viewDoc.country} />
                    <SupplierDetailField icon={<CreditCard className="h-3.5 w-3.5" />} label="الرقم الضريبي" value={viewDoc.tax_id} dir="ltr" />
                  </div>
                </div>
              </fieldset>
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><Mail className="h-3 w-3 text-info" /></span>
                    معلومات الاتصال
                  </h4>
                </div>
                <div className="p-4 space-y-3 bg-card/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SupplierDetailField icon={<Mail className="h-3.5 w-3.5" />} label="البريد الإلكتروني" value={viewDoc.email_id} dir="ltr" />
                    <SupplierDetailField icon={<Phone className="h-3.5 w-3.5" />} label="رقم الهاتف" value={viewDoc.mobile_no || viewDoc.phone} dir="ltr" />
                  </div>
                </div>
              </fieldset>
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-warning/10 flex items-center justify-center"><CreditCard className="h-3 w-3 text-warning" /></span>
                    البيانات المالية
                  </h4>
                </div>
                <div className="p-4 space-y-3 bg-card/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SupplierDetailField icon={<CreditCard className="h-3.5 w-3.5" />} label="العملة الافتراضية" value={viewDoc.default_currency || '—'} dir="ltr" />
                    <SupplierDetailField icon={<CreditCard className="h-3.5 w-3.5" />} label="شروط الدفع" value={viewDoc.payment_terms || '—'} />
                    <SupplierDetailField icon={<ToggleRight className="h-3.5 w-3.5" />} label="الحالة" value={viewDoc.on_hold ? 'معلّق' : 'نشط'} badge badgeClass={viewDoc.on_hold ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'} />
                  </div>
                </div>
              </fieldset>
              {viewDoc.creation && (
                <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                  <div className="bg-gradient-to-l from-muted/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                    <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                      <span className="h-5 w-5 rounded-md bg-muted/20 flex items-center justify-center"><Hash className="h-3 w-3 text-muted-foreground" /></span>
                      معلومات النظام
                    </h4>
                  </div>
                  <div className="p-4 space-y-3 bg-card/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <SupplierDetailField label="تاريخ الإنشاء" value={viewDoc.creation ? new Date(viewDoc.creation).toLocaleDateString('en-US') : '—'} />
                      <SupplierDetailField label="آخر تعديل" value={viewDoc.modified ? new Date(viewDoc.modified).toLocaleDateString('en-US') : '—'} />
                      <SupplierDetailField label="المُنشئ" value={viewDoc.owner || '—'} dir="ltr" />
                      <SupplierDetailField label="الحالة" value={viewDoc.disabled ? 'معطّل' : 'نشط'} badge badgeClass={viewDoc.disabled ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'} />
                    </div>
                  </div>
                </fieldset>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              تعذر تحميل بيانات المورد
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button variant="ghost" onClick={() => setViewDialogOpen(false)} className="text-muted-foreground">إغلاق</Button>
            {viewingSupplier && (
              <Button className="gap-1.5" onClick={() => { setViewDialogOpen(false); openEditDialog(viewingSupplier); }}>
                <Pencil className="h-3.5 w-3.5" />
                تعديل
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ حوار تأكيد الحذف ═══ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المورد &quot;{selected?.supplier_name}&quot;؟ لا يمكن
              التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── Reusable Detail Field component for View Dialog ─── */
function SupplierDetailField({
  icon,
  label,
  value,
  dir,
  badge,
  badgeClass,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  dir?: string;
  badge?: boolean;
  badgeClass?: string;
}) {
  const displayValue = value || '—';
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">{icon}{label}</p>
      {badge ? (
        <Badge variant="outline" className={cn('text-xs font-medium px-2 py-0.5 border-0', badgeClass)}>{displayValue}</Badge>
      ) : (
        <p className={cn('text-sm font-medium', !value && 'text-muted-foreground')} dir={dir}>{displayValue}</p>
      )}
    </div>
  );
}
