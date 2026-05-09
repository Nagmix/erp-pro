'use client';

import { useState, useEffect, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
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
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Plus, Building2, LineChart, Trash2, Filter, ChevronDown, Upload, X} from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useDeleteDoc, useUpdateDoc } from '@/lib/client/hooks';
import { buildAssetCreate } from '@/lib/erp/erpnext-payloads';
import { mergeCompanyAccountsIntoAssetCategory } from '@/lib/erp/asset-category-company-accounts';
import { apiGetDoc, apiUpdateDoc } from '@/lib/client/api';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';

interface AssetRow {
  name: string;
  asset_name: string;
  /** ERPNext: Asset Category (link) */
  asset_category?: string;
  category?: string;
  company: string;
  purchase_date?: string;
  available_for_use_date?: string;
  purchase_amount?: number;
  gross_purchase_amount?: number;
  depreciation_method?: string;
  useful_life?: number;
  location: string;
  custodian?: string;
  item_code?: string;
  status: string;
}

// ============================================================
// Zod Schema
// ============================================================

const assetSchema = z
  .object({
    asset_name: z.string().min(1, 'اسم الأصل مطلوب'),
    category: z.string().min(1, 'الفئة مطلوبة'),
    item_code: z.string(),
    company: z.string().min(1, 'الشركة مطلوبة'),
    purchase_date: z.string().min(1, 'تاريخ الشراء مطلوب'),
    purchase_amount: z.coerce.number().min(1, 'قيمة الشراء مطلوبة'),
    depreciation_method: z.string(),
    useful_life: z.coerce.number().min(0),
    location: z.string(),
    custodian: z.string(),
    fixed_asset_account: z.string(),
    accumulated_depreciation_account: z.string(),
    depreciation_expense_account: z.string()})
  .superRefine((data, ctx) => {
    const life = Number(data.useful_life);
    if (life <= 0) return;
    if (!data.fixed_asset_account?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'حساب الأصل الثابت مطلوب عند وجود عمر إنتاجي وإهلاك',
        path: ['fixed_asset_account']});
    }
    if (!data.accumulated_depreciation_account?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'حساب مجمع الإهلاك مطلوب عند وجود عمر إنتاجي وإهلاك',
        path: ['accumulated_depreciation_account']});
    }
    if (!data.depreciation_expense_account?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'حساب مصروف الإهلاك مطلوب لترحيل قيود الإهلاك',
        path: ['depreciation_expense_account']});
    }
  });

type AssetFormInput = z.input<typeof assetSchema>;
type AssetFormOutput = z.output<typeof assetSchema>;

// ============================================================
// Columns
// ============================================================

const catColors: Record<string, string> = {
  'مباني': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'معدات': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'مركبات': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'تقنية معلومات': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'أثاث': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'};

const columns: Column<AssetRow>[] = [
  { key: 'name', header: 'الرقم', sortable: true, width: 'w-24', render: (value) => <span className="font-medium text-primary">{String(value)}</span> },
  { key: 'asset_name', header: 'اسم الأصل', sortable: true },
  { key: 'asset_category', header: 'الفئة', render: (_, row) => {
    const c = row.asset_category || row.category || '';

    return (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-medium ${catColors[c] || 'bg-muted text-muted-foreground'}`}>{c || '—'}</span>
    );
  }},
  { key: 'available_for_use_date', header: 'تاريخ الاستخدام', sortable: true, render: (_, row) => formatDate(String(row.available_for_use_date || row.purchase_date || '')) },
  { key: 'gross_purchase_amount', header: 'قيمة الشراء', sortable: true, render: (_, row) => (
    <span className="font-semibold tabular-nums">{formatCurrency(Number(row.gross_purchase_amount ?? row.purchase_amount ?? 0))}</span>
  )},
  { key: 'location', header: 'الموقع' },
  { key: 'status', header: 'الحالة', render: (value) => <StatusBadge status={String(value)} /> },
];

// ============================================================
// Main Component
// ============================================================

export default function AssetsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [assetStatusFilter, setAssetStatusFilter] = useState('all');
  const [selected, setSelected] = useState<AssetRow | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const clearFilters = () => { setStatusFilter('all'); setSearch(''); setAssetStatusFilter('all'); setDateFrom(''); setDateTo(''); };
  const { company: defaultCo } = useDefaultCompanyName();
  const {
    data: depSched = [],
    isLoading: depLoad,
    isError: depErr,
    error: depErrObj,
    refetch: refetchDep} = useDocList<{
    name: string;
    parent: string;
    schedule_date: string;
    depreciation_amount: number;
    journal_entry?: string;
  }>('Depreciation Schedule', {
    fields: ['name', 'parent', 'schedule_date', 'depreciation_amount', 'journal_entry'],
    order_by: 'schedule_date desc',
    limit: 200,
  });
  const { data, isLoading, isError, error, refetch } = useDocList<AssetRow>('Asset', {
    fields: [
      'name',
      'asset_name',
      'asset_category',
      'item_code',
      'company',
      'available_for_use_date',
      'gross_purchase_amount',
      'location',
      'custodian',
      'depreciation_method',
      'total_number_of_depreciations',
      'status',
    ],
    limit: 500,
  });
  const createMutation = useCreateDoc('Asset');
  const updateMutation = useUpdateDoc('Asset');
  const deleteMutation = useDeleteDoc('Asset');

  const assets = data || [];
  const filteredData = useMemo(() => {
    let list = assets;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a =>
        [a.name, a.asset_name, a.asset_category].some(v => String(v ?? '').toLowerCase().includes(q))
      );
    }
    if (dateFrom) {
      list = list.filter(a => a.available_for_use_date && a.available_for_use_date >= dateFrom);
    }
    if (dateTo) {
      list = list.filter(a => a.available_for_use_date && a.available_for_use_date <= dateTo);
    }
    if (assetStatusFilter !== 'all') {
      list = list.filter(a => a.status === assetStatusFilter);
    }
    return list;
  }, [assets, search, dateFrom, dateTo, assetStatusFilter]);  const createForm = useForm<AssetFormInput, any, AssetFormOutput>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      asset_name: '',
      category: '',
      item_code: '',
      company: '',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_amount: 0,
      depreciation_method: 'Straight Line',
      useful_life: 0,
      location: '',
      custodian: '',
      fixed_asset_account: '',
      accumulated_depreciation_account: '',
      depreciation_expense_account: ''}});

  const editForm = useForm<AssetFormInput, any, AssetFormOutput>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      asset_name: '',
      category: '',
      item_code: '',
      company: '',
      purchase_date: '',
      purchase_amount: 0,
      depreciation_method: 'Straight Line',
      useful_life: 0,
      location: '',
      custodian: '',
      fixed_asset_account: '',
      accumulated_depreciation_account: '',
      depreciation_expense_account: ''}});

  useEffect(() => {
    if (defaultCo) {
      createForm.setValue('company', defaultCo);
    }
  }, [defaultCo, createForm]);

  /** تعبئة حسابات فئة الأصل عند فتح التعديل (مخزَّنة على الفئة لا على الأصل في ERPNext). */
  useEffect(() => {
    if (!editDialogOpen || !selected) return;
    const catName = selected.asset_category || selected.category || '';
    const co = selected.company?.trim();
    if (!catName || !co) return;
    let cancelled = false;
    void (async () => {
      try {
        const cat = await apiGetDoc<Record<string, unknown>>('Asset Category', catName);
        if (cancelled || !cat) return;
        const rows = (cat.accounts as Record<string, unknown>[] | undefined) ?? [];
        const row = rows.find((r) => String(r.company_name ?? '').trim() === co);
        editForm.setValue('fixed_asset_account', String(row?.fixed_asset_account ?? ''));
        editForm.setValue('accumulated_depreciation_account', String(row?.accumulated_depreciation_account ?? ''));
        editForm.setValue('depreciation_expense_account', String(row?.depreciation_expense_account ?? ''));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editDialogOpen, selected, editForm]);

  const handleCreate = async (formData: AssetFormOutput) => {
    if (!defaultCo) {
      toast.error('تعذر تحديد الشركة');
      return;
    }
    const life = Number(formData.useful_life);
    const company = (formData.company || defaultCo).trim();
    try {
      if (life > 0) {
        const cat = await apiGetDoc<Record<string, unknown>>('Asset Category', formData.category);
        if (!cat) {
          toast.error('لم يُعثر على فئة الأصل', { description: formData.category });
          return;
        }
        const merged = mergeCompanyAccountsIntoAssetCategory(
          cat.accounts as Record<string, unknown>[] | undefined,
          company,
          {
            fixed_asset_account: formData.fixed_asset_account,
            accumulated_depreciation_account: formData.accumulated_depreciation_account,
            depreciation_expense_account: formData.depreciation_expense_account}
        );
        await apiUpdateDoc('Asset Category', formData.category, { accounts: merged });
      }
      const doc = buildAssetCreate({
        asset_name: formData.asset_name,
        asset_category: formData.category,
        company,
        available_for_use_date: formData.purchase_date,
        gross_purchase_amount: formData.purchase_amount,
        location: formData.location,
        is_existing_asset: true,
        item_code: formData.item_code?.trim() || undefined,
        custodian: formData.custodian?.trim() || undefined,
        calculate_depreciation: life > 0,
        depreciation_method: life > 0 ? formData.depreciation_method?.trim() : undefined,
        useful_life_years: life > 0 ? life : undefined});
      await createMutation.mutateAsync(doc);
      toast.success('تم إنشاء الأصل بنجاح');
      setCreateDialogOpen(false);
      createForm.reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('حدث خطأ أثناء إنشاء الأصل', { description: msg });
    }
  };

  const handleEdit = async (formData: AssetFormOutput) => {
    if (!selected) return;
    const life = Number(formData.useful_life);
    const company = formData.company.trim();
    try {
      if (life > 0) {
        const cat = await apiGetDoc<Record<string, unknown>>('Asset Category', formData.category);
        if (!cat) {
          toast.error('لم يُعثر على فئة الأصل');
          return;
        }
        const merged = mergeCompanyAccountsIntoAssetCategory(
          cat.accounts as Record<string, unknown>[] | undefined,
          company,
          {
            fixed_asset_account: formData.fixed_asset_account,
            accumulated_depreciation_account: formData.accumulated_depreciation_account,
            depreciation_expense_account: formData.depreciation_expense_account}
        );
        await apiUpdateDoc('Asset Category', formData.category, { accounts: merged });
      }
      const doc: Record<string, unknown> = {
        asset_name: formData.asset_name,
        asset_category: formData.category,
        company: formData.company,
        available_for_use_date: formData.purchase_date,
        gross_purchase_amount: formData.purchase_amount,
        location: formData.location || undefined,
        item_code: formData.item_code?.trim() || undefined,
        custodian: formData.custodian?.trim() || undefined,
        calculate_depreciation: life > 0 ? 1 : 0,
        depreciation_method: life > 0 ? formData.depreciation_method : undefined,
        ...(life > 0
          ? {
              total_number_of_depreciations: Math.max(1, Math.round((life * 12) / 12)),
              frequency_of_depreciation: 12}
          : {})};
      await updateMutation.mutateAsync({ name: selected.name, doc });
      toast.success('تم تعديل الأصل بنجاح');
      setEditDialogOpen(false);
      setSelected(null);
      editForm.reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('حدث خطأ أثناء تعديل الأصل', { description: msg });
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteMutation.mutate(selected.name, {
      onSuccess: () => { toast.success('تم حذف الأصل بنجاح'); setDeleteDialogOpen(false); setSelected(null); },
      onError: () => toast.error('حدث خطأ أثناء الحذف')});
  };

  const openEdit = (row: AssetRow) => {
    setSelected(row);
    editForm.reset({
      asset_name: row.asset_name,
      category: row.asset_category || row.category || '',
      item_code: row.item_code || '',
      company: row.company,
      purchase_date: row.purchase_date || row.available_for_use_date || '',
      purchase_amount: Number(row.purchase_amount ?? row.gross_purchase_amount ?? 0),
      depreciation_method: row.depreciation_method || 'Straight Line',
      useful_life: row.useful_life ?? 0,
      location: row.location || '',
      custodian: row.custodian || '',
      fixed_asset_account: '',
      accumulated_depreciation_account: '',
      depreciation_expense_account: ''});
    setEditDialogOpen(true);
  };

  const renderAssetFormFields = (form: UseFormReturn<AssetFormInput, any, AssetFormOutput>) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium">اسم الأصل *</Label>
        <Input placeholder="اسم الأصل" {...form.register('asset_name')} />
        {form.formState.errors.asset_name && <p className="text-[10px] text-destructive">{form.formState.errors.asset_name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">فئة الأصل *</Label>
          <ErpLinkCombobox
            doctype="Asset Category"
            value={form.watch('category')}
            onChange={(v) => form.setValue('category', v)}
            placeholder="اختر فئة الأصل..."
          />
          {form.formState.errors.category && (
            <p className="text-[10px] text-destructive">{form.formState.errors.category.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">صنف الأصل (Item)</Label>
          <ErpLinkCombobox
            doctype="Item"
            value={form.watch('item_code')}
            onChange={(v) => form.setValue('item_code', v)}
            displayKey="item_name"
            placeholder="اختياري — مطلوب في بعض الحالات"
            showCreateShortcut={false}
            className="h-9 text-sm"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">الشركة (افتراضية)</Label>
        <p className="text-sm font-semibold">{form.watch('company') || defaultCo || '—'}</p>
        {!defaultCo && (
          <p className="text-[10px] text-destructive">اضبط الشركة الافتراضية من الإعدادات</p>
        )}
        <input type="hidden" {...form.register('company')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">تاريخ الشراء *</Label>
          <Input type="date" dir="ltr" {...form.register('purchase_date')} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">قيمة الشراء *</Label>
          <Input type="number" dir="ltr" placeholder="0.00" {...form.register('purchase_amount', { valueAsNumber: true })} />
          {form.formState.errors.purchase_amount && <p className="text-[10px] text-destructive">{form.formState.errors.purchase_amount.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">طريقة الإهلاك</Label>
          <Select value={form.watch('depreciation_method')} onValueChange={v => form.setValue('depreciation_method', v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent dir="rtl" align="start">
              <SelectItem value="Straight Line">خط مستقيم</SelectItem>
              <SelectItem value="Double Declining Balance">رصيد متناقص مضاعف</SelectItem>
              <SelectItem value="Written Down Value">قيمة متدنية</SelectItem>
              <SelectItem value="Manual">يدوي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">العمر الإنتاجي (سنوات)</Label>
          <Input type="number" dir="ltr" placeholder="0" {...form.register('useful_life', { valueAsNumber: true })} />
        </div>
      </div>
      {Number(form.watch('useful_life')) > 0 && (
        <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-3">
          <p className="text-xs font-semibold text-foreground">الحسابات المحاسبية (فئة الأصل — الشركة)</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            تُخزَّن هذه الحقول في «فئة الأصل» لكل شركة (لا على مستند الأصل مباشرة). تُحدَّث تلقائياً عند
            الحفظ لتفعيل جدولة الإهلاك وترحيل القيود.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-medium">حساب الأصل الثابت *</Label>
              <ErpLinkCombobox
                doctype="Account"
                value={form.watch('fixed_asset_account')}
                onChange={(v) => form.setValue('fixed_asset_account', v)}
                placeholder="حساب الأصول الثابتة..."
                className="h-9 text-sm"
              />
              {form.formState.errors.fixed_asset_account && (
                <p className="text-[10px] text-destructive">{form.formState.errors.fixed_asset_account.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">حساب مجمع الإهلاك *</Label>
              <ErpLinkCombobox
                doctype="Account"
                value={form.watch('accumulated_depreciation_account')}
                onChange={(v) => form.setValue('accumulated_depreciation_account', v)}
                placeholder="مجمع الإهلاك..."
                className="h-9 text-sm"
              />
              {form.formState.errors.accumulated_depreciation_account && (
                <p className="text-[10px] text-destructive">
                  {form.formState.errors.accumulated_depreciation_account.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">حساب مصروف الإهلاك *</Label>
              <ErpLinkCombobox
                doctype="Account"
                value={form.watch('depreciation_expense_account')}
                onChange={(v) => form.setValue('depreciation_expense_account', v)}
                placeholder="مصروف الإهلاك..."
                className="h-9 text-sm"
              />
              {form.formState.errors.depreciation_expense_account && (
                <p className="text-[10px] text-destructive">
                  {form.formState.errors.depreciation_expense_account.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">الموقع</Label>
          <ErpLinkCombobox doctype="Location" value={form.watch('location') || ''} onChange={(v) => form.setValue('location', v)} placeholder="موقع الأصل" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">المسؤول</Label>
          <ErpLinkCombobox doctype="Employee" value={form.watch('custodian') || ''} onChange={(v) => form.setValue('custodian', v)} placeholder="المسؤول عن الأصل" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="الأصول الثابتة"
        description="إدارة الأصول الثابتة والإهلاك"
        iconify="solar:buildings-2-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'الأصول الثابتة' }]}
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              const t = new Date().toISOString().split('T')[0]!;
              createForm.reset({
                asset_name: '',
                category: '',
                item_code: '',
                company: defaultCo || '',
                purchase_date: t,
                purchase_amount: 0,
                depreciation_method: 'Straight Line',
                useful_life: 0,
                location: '',
                custodian: '',
                fixed_asset_account: '',
                accumulated_depreciation_account: '',
                depreciation_expense_account: ''});
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            أصل جديد
          </Button>
        }
      />

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث باسم الأصل..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>

        {/* فلاتر متقدمة (قابلة للطي) */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" /> فلاتر متقدمة
                <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            {(dateFrom || dateTo || assetStatusFilter !== 'all' || search) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
            <Label className="text-[10px]">من تاريخ</Label>
            <Input type="date" dir="ltr" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">إلى تاريخ</Label>
            <Input type="date" dir="ltr" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">الحالة</Label>
            <Select value={assetStatusFilter} onValueChange={setAssetStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="Active">نشط</SelectItem>
                <SelectItem value="Sold">مباع</SelectItem>
                <SelectItem value="Scrapped">مستهلك</SelectItem>
                <SelectItem value="In Maintenance">صيانة</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-[var(--shadow-xs-ui)] p-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 overflow-x-auto">
          {([
            { key: 'all', label: 'الكل', count: assets.length },
            { key: 'Active', label: 'نشطة', count: assets.filter(a => a.status === 'Active').length },
            { key: 'Draft', label: 'مسودات', count: assets.filter(a => a.status === 'Draft').length },
            { key: 'Sold', label: 'مباعة', count: assets.filter(a => a.status === 'Sold').length },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-bold transition-all whitespace-nowrap ${statusFilter === f.key ? 'bg-background text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-border/30' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}>
              {f.label}
              <span className={`tabular-nums text-[10px] rounded-md px-1.5 py-0.5 font-semibold ${statusFilter === f.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/70'}`}>{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      <DataTable
        data={filteredData}
        columns={columns}
        searchable
        loading={isLoading}
        onEdit={openEdit}
        onDelete={(row) => { setSelected(row); setDeleteDialogOpen(true); }}
      />

      <div className="space-y-2">
        {depErr && (
          <ListQueryAlert
            error={depErrObj ?? new Error('dep')}
            onRetry={() => { void refetchDep(); }}
          />
        )}
        <DataTable
          data={depSched}
          title="جدول الإهلاك"
          searchable
          loading={depLoad}
          columns={[
            { key: 'parent', header: 'الأصل (معرف)', sortable: true },
            {
              key: 'schedule_date',
              header: 'تاريخ الاستحقاق',
              sortable: true,
              render: (v) => formatDate(String(v || ''))},
            {
              key: 'depreciation_amount',
              header: 'مبلغ الإهلاك',
              sortable: true,
              render: (v) => <span className="tabular-nums font-medium">{formatCurrency(Number(v) || 0)}</span>},
            { key: 'journal_entry', header: 'قيد يومية', render: (v) => (v ? <span className="font-mono text-[10px]">{String(v)}</span> : '—') },
          ]}
        />
        <p className="text-xs text-muted-foreground flex items-start gap-2">
          <LineChart className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>ملاحظة:</strong> يمكن متابعة دورة حياة الأصل (الإهلاك، البيع، الإقفال) من خلال إجراءات الأصول
            المحاسبية المعتمدة في النظام.
          </span>
        </p>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>إضافة أصل ثابت جديد</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)}>
            {renderAssetFormFields(createForm)}
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setCreateDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
              <Button type="submit" disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">{createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الأصل'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل الأصل</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)}>
            {renderAssetFormFields(editForm)}
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
              <Button type="submit" disabled={updateMutation.isPending} className="gap-1.5 min-w-[130px]">{updateMutation.isPending ? 'جاري التحديث...' : 'تحديث الأصل'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد الحذف</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">هل أنت متأكد من حذف الأصل &quot;{selected?.asset_name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
