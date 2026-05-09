'use client';

import { useMemo, useState, useCallback } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Truck,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  ChevronDown,
  Phone,
  Mail,
  Globe,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Package,
  CheckCircle,
  XCircle,
  Percent,
  Banknote,
  ArrowRightLeft,
  FileText,
  Settings2,
  MapPin,
  CreditCard,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import { PageHeader, KpiStrip, PageShell } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/core/helpers';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ShippingCompanyRow {
  name: string;
  company_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  tracking_url?: string;
  fees_type?: string;
  fees_value?: number;
  status?: string;
  cod_enabled?: number | boolean;
  cod_fees_type?: string;
  cod_fees_value?: number;
  expense_account?: string;
  revenue_account?: string;
  notes?: string;
  creation?: string;
  modified?: string;
}

interface ShippingCompanyForm {
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  tracking_url: string;
  fees_type: string;
  fees_value: string;
  status: string;
  cod_enabled: boolean;
  cod_fees_type: string;
  cod_fees_value: string;
  expense_account: string;
  revenue_account: string;
  notes: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DOCTYPE = 'Shipping Company';

const FEES_TYPE_MAP: Record<string, string> = {
  Fixed: 'ثابت',
  Percentage: 'نسبة مئوية',
};

const STATUS_MAP: Record<string, string> = {
  Active: 'نشط',
  Inactive: 'غير نشط',
};

const initialForm: ShippingCompanyForm = {
  company_name: '',
  contact_person: '',
  phone: '',
  email: '',
  tracking_url: '',
  fees_type: 'Fixed',
  fees_value: '',
  status: 'Active',
  cod_enabled: false,
  cod_fees_type: 'Fixed',
  cod_fees_value: '',
  expense_account: '',
  revenue_account: '',
  notes: '',
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ShippingCompaniesPage() {
  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();

  // ── State ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editDocName, setEditDocName] = useState<string | null>(null);
  const [form, setForm] = useState<ShippingCompanyForm>({ ...initialForm });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShippingCompanyRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [feesTypeFilter, setFeesTypeFilter] = useState<'all' | 'Fixed' | 'Percentage'>('all');
  const [codFilter, setCodFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Data ──
  const { data, isLoading, isError, error, refetch } = useDocList<ShippingCompanyRow>(DOCTYPE, {
    fields: [
      'name',
      'company_name',
      'contact_person',
      'phone',
      'email',
      'tracking_url',
      'fees_type',
      'fees_value',
      'status',
      'cod_enabled',
      'cod_fees_type',
      'cod_fees_value',
      'expense_account',
      'revenue_account',
      'notes',
      'creation',
    ],
    order_by: 'creation desc',
    limit: 500,
  });

  const createMutation = useCreateDoc<ShippingCompanyRow>(DOCTYPE);
  const updateMutation = useUpdateDoc<ShippingCompanyRow>(DOCTYPE);
  const deleteMutation = useDeleteDoc(DOCTYPE);

  const rows = data || [];
  const chk = (v: unknown) => Number(v) === 1 || v === true;

  // ── Filtered Data ──
  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (feesTypeFilter !== 'all') {
      result = result.filter((r) => r.fees_type === feesTypeFilter);
    }
    if (codFilter === 'enabled') {
      result = result.filter((r) => chk(r.cod_enabled));
    } else if (codFilter === 'disabled') {
      result = result.filter((r) => !chk(r.cod_enabled));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (r) =>
          (r.company_name || '').toLowerCase().includes(q) ||
          (r.contact_person || '').toLowerCase().includes(q) ||
          (r.phone || '').toLowerCase().includes(q) ||
          (r.email || '').toLowerCase().includes(q) ||
          (r.name || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, statusFilter, feesTypeFilter, codFilter, searchQuery]);

  // ── KPIs ──
  const totalCompanies = rows.length;
  const activeCompanies = rows.filter((r) => r.status === 'Active').length;
  const codEnabledCount = rows.filter((r) => chk(r.cod_enabled)).length;
  const totalShipmentsMonth = rows.filter((r) => {
    if (!r.creation) return false;
    const created = new Date(r.creation);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  // ── Form Helpers ──
  const updateField = useCallback(<K extends keyof ShippingCompanyForm>(key: K, value: ShippingCompanyForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({ ...initialForm });
    setEditMode(false);
    setEditDocName(null);
  }, []);

  const openCreateDialog = useCallback(() => {
    resetForm();
    setDialogOpen(true);
  }, [resetForm]);

  const openEditDialog = useCallback((row: ShippingCompanyRow) => {
    setForm({
      company_name: row.company_name || '',
      contact_person: row.contact_person || '',
      phone: row.phone || '',
      email: row.email || '',
      tracking_url: row.tracking_url || '',
      fees_type: row.fees_type || 'Fixed',
      fees_value: String(row.fees_value ?? ''),
      status: row.status || 'Active',
      cod_enabled: chk(row.cod_enabled),
      cod_fees_type: row.cod_fees_type || 'Fixed',
      cod_fees_value: String(row.cod_fees_value ?? ''),
      expense_account: row.expense_account || '',
      revenue_account: row.revenue_account || '',
      notes: row.notes || '',
    });
    setEditMode(true);
    setEditDocName(row.name);
    setDialogOpen(true);
  }, []);

  // ── Save Handler ──
  const handleSave = useCallback(async () => {
    if (!form.company_name.trim()) {
      toast.error('يرجى إدخال اسم شركة الشحن');
      return;
    }

    const feesVal = Number(form.fees_value);
    if (form.fees_value && !Number.isFinite(feesVal)) {
      toast.error('يرجى إدخال قيمة رسوم صحيحة');
      return;
    }

    const codFeesVal = Number(form.cod_fees_value);
    if (form.cod_enabled && form.cod_fees_value && !Number.isFinite(codFeesVal)) {
      toast.error('يرجى إدخال قيمة رسوم الدفع عند الاستلام صحيحة');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        doctype: DOCTYPE,
        company_name: form.company_name.trim(),
        contact_person: form.contact_person.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        tracking_url: form.tracking_url.trim() || undefined,
        fees_type: form.fees_type,
        fees_value: form.fees_value ? feesVal : 0,
        status: form.status,
        cod_enabled: form.cod_enabled ? 1 : 0,
        cod_fees_type: form.cod_enabled ? form.cod_fees_type : undefined,
        cod_fees_value: form.cod_enabled && form.cod_fees_value ? codFeesVal : 0,
        expense_account: form.expense_account || undefined,
        revenue_account: form.revenue_account || undefined,
        notes: form.notes.trim() || undefined,
      };

      if (editMode && editDocName) {
        await updateMutation.mutateAsync({ name: editDocName, doc: payload });
        toast.success('تم تحديث شركة الشحن بنجاح');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('تم إنشاء شركة الشحن بنجاح');
      }

      setDialogOpen(false);
      resetForm();
      void refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'حدث خطأ غير متوقع';
      toast.error(editMode ? 'تعذر تحديث شركة الشحن' : 'تعذر إنشاء شركة الشحن', { description: msg });
    } finally {
      setSaving(false);
    }
  }, [form, editMode, editDocName, toast, createMutation, updateMutation, refetch, resetForm]);

  // ── Toggle Status Handler ──
  const handleToggleStatus = useCallback(
    async (row: ShippingCompanyRow) => {
      const newStatus = row.status === 'Active' ? 'Inactive' : 'Active';
      try {
        await updateMutation.mutateAsync({
          name: row.name,
          doc: { status: newStatus },
        });
        toast.success(newStatus === 'Active' ? 'تم تفعيل شركة الشحن' : 'تم تعطيل شركة الشحن');
        void refetch();
      } catch {
        toast.error('تعذر تغيير حالة شركة الشحن');
      }
    },
    [updateMutation, refetch, toast]
  );

  // ── Delete Handler ──
  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.name, {
      onSuccess: () => {
        toast.success('تم حذف شركة الشحن بنجاح');
        setDeleteTarget(null);
        void refetch();
      },
      onError: () => toast.error('تعذر حذف شركة الشحن'),
    });
  }, [deleteTarget, deleteMutation, refetch, toast]);

  // ── Clear Filters ──
  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setFeesTypeFilter('all');
    setCodFilter('all');
    setSearchQuery('');
  }, []);

  const hasActiveFilters =
    statusFilter !== 'all' || feesTypeFilter !== 'all' || codFilter !== 'all' || searchQuery.trim() !== '';

  // ── Columns ──
  const columns: Column<ShippingCompanyRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرقم',
        sortable: true,
        width: 'w-28',
        render: (v) => <span className="font-medium text-primary">{String(v)}</span>,
      },
      {
        key: 'company_name',
        header: 'اسم الشركة',
        sortable: true,
        render: (v) => <span className="font-semibold">{String(v || '—')}</span>,
      },
      {
        key: 'contact_person',
        header: 'جهة الاتصال',
        render: (v) => String(v || '—'),
      },
      {
        key: 'phone',
        header: 'الهاتف',
        render: (v) =>
          v ? (
            <span className="flex items-center gap-1 text-xs" dir="ltr">
              <Phone className="h-3 w-3 text-muted-foreground" />
              {String(v)}
            </span>
          ) : (
            '—'
          ),
      },
      {
        key: 'email',
        header: 'البريد الإلكتروني',
        render: (v) =>
          v ? (
            <span className="flex items-center gap-1 text-xs" dir="ltr">
              <Mail className="h-3 w-3 text-muted-foreground" />
              {String(v)}
            </span>
          ) : (
            '—'
          ),
      },
      {
        key: 'fees_type',
        header: 'نوع الرسوم',
        render: (v) => {
          const val = String(v || '');
          return (
            <Badge variant="outline" className="text-[10px] font-medium">
              {FEES_TYPE_MAP[val] || val || '—'}
            </Badge>
          );
        },
      },
      {
        key: 'fees_value',
        header: 'قيمة الرسوم',
        render: (v, row) => {
          const num = Number(v);
          if (!Number.isFinite(num) || num === 0) return '—';
          return (
            <span className="font-semibold tabular-nums">
              {row.fees_type === 'Percentage' ? `${num}%` : formatCurrency(num)}
            </span>
          );
        },
      },
      {
        key: 'cod_enabled',
        header: 'الدفع عند الاستلام',
        render: (v) =>
          chk(v) ? (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs text-emerald-700 dark:text-emerald-400">مفعّل</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">معطّل</span>
            </div>
          ),
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (v) => {
          const val = String(v || '');
          const isActive = val === 'Active';
          return (
            <Badge
              variant={isActive ? 'default' : 'secondary'}
              className={cn(
                'text-[10px] font-medium',
                isActive && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400',
                !isActive && 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'
              )}
            >
              {STATUS_MAP[val] || val || '—'}
            </Badge>
          );
        },
      },
      {
        key: 'tracking_url',
        header: 'رابط التتبع',
        render: (v) =>
          v ? (
            <a
              href={String(v)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              dir="ltr"
            >
              <Globe className="h-3 w-3" />
              تتبع
            </a>
          ) : (
            '—'
          ),
      },
      {
        key: '_actions',
        header: 'إجراءات',
        width: 'w-44',
        render: (_v, row) => (
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-[10px] px-2"
              onClick={() => openEditDialog(row)}
            >
              <Edit3 className="h-3 w-3" />
              تعديل
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                'h-7 text-[10px] px-2',
                row.status === 'Active' ? 'text-amber-600' : 'text-emerald-600'
              )}
              onClick={() => handleToggleStatus(row)}
            >
              {row.status === 'Active' ? (
                <>
                  <ToggleLeft className="h-3 w-3" />
                  تعطيل
                </>
              ) : (
                <>
                  <ToggleRight className="h-3 w-3" />
                  تفعيل
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [openEditDialog, handleToggleStatus]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      {/* ── Page Header ── */}
      <PageHeader
        title="الشحن والتوصيل"
        description="إدارة شركات الشحن وإعدادات التوصيل والرسوم — تتبع الشحنات وتكوين الدفع عند الاستلام"
        iconify="solar:delivery-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المبيعات', href: '/sales' }, { label: 'الشحن والتوصيل' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              <Settings2 className="h-3.5 w-3.5" />
              إعدادات التوزيع
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={coLoading}
              onClick={openCreateDialog}
            >
              <Plus className="h-3.5 w-3.5" />
              شركة شحن جديدة
            </Button>
          </div>
        }
      />

      {/* ── KPI Strip ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي الشركات"
          value={totalCompanies}
          icon={Truck}
          accent="primary"
          description="جميع شركات الشحن المسجلة"
        />
        <KpiCard
          title="الشركات النشطة"
          value={activeCompanies}
          icon={CheckCircle}
          accent="success"
          description="شركات شحن مفعّلة حالياً"
        />
        <KpiCard
          title="الدفع عند الاستلام"
          value={codEnabledCount}
          icon={CreditCard}
          accent="warning"
          description="شركات تدعم COD"
        />
        <KpiCard
          title="شحنات هذا الشهر"
          value={totalShipmentsMonth}
          icon={Package}
          accent="info"
          description="شركات أُضيفت هذا الشهر"
        />
      </KpiStrip>

      {/* ── Shipping Fees Distribution Settings ── */}
      {settingsOpen && (
        <PageShell className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">إعدادات توزيع رسوم الشحن</h3>
                <p className="text-[11px] text-muted-foreground">تحديد الحسابات المحاسبية لرسوم الشحن</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(false)}>
              إخفاء
            </Button>
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-destructive" />
                حساب مصروفات الشحن
              </Label>
              <p className="text-[10px] text-muted-foreground mb-1">
                الحساب الذي تُسجَّل فيه مصروفات الشحن كخصم
              </p>
              <ErpLinkCombobox
                doctype="Account"
                value={''}
                onChange={() => {}}
                placeholder="اختر حساب المصروفات"
                filters={{ root_type: 'Expense' }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                حساب إيرادات الشحن
              </Label>
              <p className="text-[10px] text-muted-foreground mb-1">
                الحساب الذي تُسجَّل فيه إيرادات الشحن كمردود
              </p>
              <ErpLinkCombobox
                doctype="Account"
                value={''}
                onChange={() => {}}
                placeholder="اختر حساب الإيرادات"
                filters={{ root_type: 'Income' }}
              />
            </div>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-info mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">ملاحظة:</span> عند تأكيد فاتورة البيع المرتبطة
                بشركة شحن، يتم إنشاء قيد يومية تلقائي يُسجَّل فيه فرق رسوم الشحن في حساب المصروفات
                والإيرادات المحددة أعلاه. تأكد من صحة الحسابات قبل إصدار الفواتير.
              </div>
            </div>
          </div>
        </PageShell>
      )}

      {/* ── Search & Filters ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث باسم الشركة، جهة الاتصال، الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 text-xs pe-8"
              />
            </div>
          </div>
        </div>

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
                <Label className="text-[10px]">حالة الشركة</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="Active">نشط</SelectItem>
                    <SelectItem value="Inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">نوع الرسوم</Label>
                <Select value={feesTypeFilter} onValueChange={(v) => setFeesTypeFilter(v as typeof feesTypeFilter)}>
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="Fixed">ثابت</SelectItem>
                    <SelectItem value="Percentage">نسبة مئوية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">الدفع عند الاستلام</Label>
                <Select value={codFilter} onValueChange={(v) => setCodFilter(v as typeof codFilter)}>
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="enabled">مفعّل</SelectItem>
                    <SelectItem value="disabled">معطّل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ── Data Table ── */}
      <DataTable
        data={filtered}
        columns={columns}
        searchable
        loading={isLoading}
        tableId="sales-shipping-companies"
        exportFileName="shipping-companies.csv"
        printTitle="شركات الشحن"
      />

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <span>{editMode ? 'تعديل شركة الشحن' : 'شركة شحن جديدة'}</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  {editMode ? 'قم بتعديل بيانات شركة الشحن' : 'أدخل بيانات شركة الشحن الجديدة'}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* ── البيانات الأساسية ── */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" />
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">
                      اسم الشركة <span className="text-destructive text-xs">*</span>
                    </Label>
                    <Input
                      value={form.company_name}
                      onChange={(e) => updateField('company_name', e.target.value)}
                      placeholder="مثال: أرامكس، DHL، فيدكس"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">جهة الاتصال</Label>
                    <Input
                      value={form.contact_person}
                      onChange={(e) => updateField('contact_person', e.target.value)}
                      placeholder="اسم مسؤول التواصل"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">رقم الهاتف</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="+966 5x xxx xxxx"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">البريد الإلكتروني</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="info@shipping.com"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    رابط التتبع
                  </Label>
                  <Input
                    value={form.tracking_url}
                    onChange={(e) => updateField('tracking_url', e.target.value)}
                    placeholder="https://track.example.com/{tracking_number}"
                    dir="ltr"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    استخدم {'{tracking_number}'} كعنصر نائب لرقم التتبع
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">حالة الشركة</Label>
                    <Select value={form.status} onValueChange={(v) => updateField('status', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">نشط</SelectItem>
                        <SelectItem value="Inactive">غير نشط</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div />
                </div>
              </div>
            </fieldset>

            {/* ── رسوم الشحن ── */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  رسوم الشحن
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">نوع الرسوم</Label>
                    <Select value={form.fees_type} onValueChange={(v) => updateField('fees_type', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fixed">مبلغ ثابت</SelectItem>
                        <SelectItem value="Percentage">نسبة مئوية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">
                      قيمة الرسوم {form.fees_type === 'Percentage' ? '(%)' : ''}
                    </Label>
                    <Input
                      type="number"
                      dir="ltr"
                      min={0}
                      step={form.fees_type === 'Percentage' ? '0.01' : '1'}
                      value={form.fees_value}
                      onChange={(e) => updateField('fees_value', e.target.value)}
                      placeholder={form.fees_type === 'Percentage' ? 'مثال: 5' : 'مثال: 25'}
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            {/* ── رسوم الدفع عند الاستلام (COD) ── */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-emerald-500/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    رسوم الدفع عند الاستلام (COD)
                  </h4>
                  <Switch
                    checked={form.cod_enabled}
                    onCheckedChange={(v) => updateField('cod_enabled', v)}
                  />
                </div>
              </div>
              {form.cod_enabled && (
                <div className="p-4 space-y-4 bg-card/50">
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 mb-2">
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      عند تفعيل رسوم الدفع عند الاستلام، سيتم إضافة رسوم إضافية على الطلبات التي تتم
                      بطريقة الدفع عند الاستلام عبر شركة الشحن هذه.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-semibold">نوع رسوم COD</Label>
                      <Select value={form.cod_fees_type} onValueChange={(v) => updateField('cod_fees_type', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fixed">مبلغ ثابت</SelectItem>
                          <SelectItem value="Percentage">نسبة مئوية</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-semibold">
                        قيمة رسوم COD {form.cod_fees_type === 'Percentage' ? '(%)' : ''}
                      </Label>
                      <Input
                        type="number"
                        dir="ltr"
                        min={0}
                        step={form.cod_fees_type === 'Percentage' ? '0.01' : '1'}
                        value={form.cod_fees_value}
                        onChange={(e) => updateField('cod_fees_value', e.target.value)}
                        placeholder={form.cod_fees_type === 'Percentage' ? 'مثال: 2' : 'مثال: 10'}
                      />
                    </div>
                  </div>
                </div>
              )}
              {!form.cod_enabled && (
                <div className="p-4 bg-card/50">
                  <p className="text-xs text-muted-foreground text-center">
                    رسوم الدفع عند الاستلام معطّلة — فعّلها لتكوين رسوم COD
                  </p>
                </div>
              )}
            </fieldset>

            {/* ── الحسابات المحاسبية ── */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-1.5">
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  الحسابات المحاسبية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <p className="text-[11px] text-muted-foreground">
                  تحديد حسابات المصروفات والإيرادات لرسوم الشحن — تُستخدم عند إنشاء قيود اليومية
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">حساب مصروفات الشحن</Label>
                    <ErpLinkCombobox
                      doctype="Account"
                      value={form.expense_account}
                      onChange={(v) => updateField('expense_account', v)}
                      placeholder="اختر حساب المصروفات"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">حساب إيرادات الشحن</Label>
                    <ErpLinkCombobox
                      doctype="Account"
                      value={form.revenue_account}
                      onChange={(v) => updateField('revenue_account', v)}
                      placeholder="اختر حساب الإيرادات"
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            {/* ── ملاحظات ── */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-muted/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  ملاحظات
                </h4>
              </div>
              <div className="p-4 bg-card/50">
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="ملاحظات إضافية حول شركة الشحن..."
                  rows={3}
                  className="text-sm"
                />
              </div>
            </fieldset>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); resetForm(); }} className="text-muted-foreground">
              إلغاء
            </Button>
            <Button disabled={saving} onClick={handleSave} className="gap-1.5 min-w-[130px]">
              {saving ? 'جاري الحفظ...' : editMode ? 'تحديث' : 'حفظ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف شركة الشحن &quot;{deleteTarget?.company_name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
              سيتم حذف جميع بيانات الشركة وإعداداتها.
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
