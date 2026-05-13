'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
 DialogDescription,
 DialogFooter,
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
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
 Percent,
 Plus,
 Calculator,
 Shield,
 ToggleLeft,
 ToggleRight,
 FileText,
 Trash2,
 Pencil,
 Search,
 Filter,
 CheckCircle2,
 XCircle,
 ArrowUpDown,
 Tags,
 Receipt,
 AlertTriangle,
 Info,
 Eye,
 Copy,
} from 'lucide-react';
import { toast } from 'sonner';

/* ────────────────────────────────────────────────────────────── */
/* Types              */
/* ────────────────────────────────────────────────────────────── */

type TaxType = 'vat' | 'selective' | 'service' | 'withholding' | 'other';

interface TaxRuleRow {
 name: string;
 title: string;
 tax_type: TaxType;
 rate: number;
 included_in_price: boolean;
 disabled: boolean;
 effective_from: string;
 expiry_date?: string;
 description?: string;
 apply_to: 'all' | 'specific_categories' | 'specific_items';
 company: string;
 doctype: string;
 creation?: string;
 modified?: string;
}

interface TaxCategoryRow {
 name: string;
 category_name: string;
 company?: string;
 disabled?: boolean;
 parent?: string;
}

interface TaxCalcInput {
 amount: number;
 taxRuleName: string;
}

/* ────────────────────────────────────────────────────────────── */
/* Constants             */
/* ────────────────────────────────────────────────────────────── */

const TAX_TYPE_OPTIONS: { value: TaxType; label: string; color: string; description: string }[] = [
 { value: 'vat', label: 'ضريبة القيمة المضافة', color: 'bg-chart-3/10 text-chart-3', description: 'ضريبة غير مباشرة على الاستهلاك' },
 { value: 'selective', label: 'ضريبة انتقائية', color: 'bg-chart-2/10 text-chart-2', description: 'ضريبة على سلع محددة (تبغ، مشروبات…)' },
 { value: 'service', label: 'ضريبة خدمات', color: 'bg-chart-1/10 text-chart-1', description: 'ضريبة على الخدمات المقدمة' },
 { value: 'withholding', label: 'ضريبة استقطاع', color: 'bg-destructive/10 text-destructive', description: 'ضريبة تُستقطع عند المصدر' },
 { value: 'other', label: 'أخرى', color: 'bg-muted text-muted-foreground', description: 'نوع ضريبي آخر' },
];

const APPLY_TO_OPTIONS = [
 { value: 'all', label: 'جميع الأصناف' },
 { value: 'specific_categories', label: 'فئات محددة' },
 { value: 'specific_items', label: 'أصناف محددة' },
] as const;

const SALES_DOCTYPE = 'Sales Taxes and Charges Template';
const PURCHASE_DOCTYPE = 'Purchase Taxes and Charges Template';

/* ────────────────────────────────────────────────────────────── */
/* Helper Functions            */
/* ────────────────────────────────────────────────────────────── */

function taxTypeLabel(type: TaxType): string {
 return TAX_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
}

function taxTypeColor(type: TaxType): string {
 return TAX_TYPE_OPTIONS.find((t) => t.value === type)?.color ?? 'bg-muted text-muted-foreground';
}

function formatDate(dateStr?: string): string {
 if (!dateStr) return '—';
 try {
 const d = new Date(dateStr);
 return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
 } catch {
 return dateStr;
 }
}

function formatNumber(n: number): string {
 return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function mapTemplateToRule(
 raw: Record<string, unknown>,
 doctype: string
): TaxRuleRow {
 const taxes = raw.taxes as Record<string, unknown>[] | undefined;
 const firstTax = Array.isArray(taxes) && taxes.length > 0 ? taxes[0] : {};
 const rate = Number(firstTax?.rate ?? raw.rate ?? 0);
 const includedInPrice = Boolean(
 firstTax?.included_in_print_rate ?? raw.included_in_price ?? false
 );
 const desc = String(raw.description ?? firstTax?.description ?? '');
 let taxType: TaxType = 'vat';
 const titleStr = String(raw.title ?? raw.name ?? '').toLowerCase();
 if (titleStr.includes('انتقائية') || titleStr.includes('selective')) taxType = 'selective';
 else if (titleStr.includes('خدمات') || titleStr.includes('service')) taxType = 'service';
 else if (titleStr.includes('استقطاع') || titleStr.includes('withholding')) taxType = 'withholding';
 else if (titleStr.includes('أخرى') || titleStr.includes('other')) taxType = 'other';

 return {
 name: String(raw.name ?? ''),
 title: String(raw.title ?? raw.name ?? ''),
 tax_type: taxType,
 rate,
 included_in_price: includedInPrice,
 disabled: Boolean(raw.disabled ?? false),
 effective_from: String(raw.effective_from ?? raw.creation ?? new Date().toISOString().slice(0, 10)),
 expiry_date: raw.expiry_date ? String(raw.expiry_date) : undefined,
 description: desc,
 apply_to: (raw.apply_to as 'all' | 'specific_categories' | 'specific_items') ?? 'all',
 company: String(raw.company ?? ''),
 doctype,
 creation: String(raw.creation ?? ''),
 modified: String(raw.modified ?? ''),
 };
}

/* ────────────────────────────────────────────────────────────── */
/* Component             */
/* ────────────────────────────────────────────────────────────── */

export default function TaxRulesPage() {
 const qc = useQueryClient();
 const { company: defaultCompany } = useDefaultCompanyName();

 // ── State ──────────────────────────────────────────────────
 const [filterTaxType, setFilterTaxType] = useState<string>('all');
 const [filterStatus, setFilterStatus] = useState<string>('all');
 const [dialogOpen, setDialogOpen] = useState(false);
 const [editingRule, setEditingRule] = useState<TaxRuleRow | null>(null);
 const [deleteOpen, setDeleteOpen] = useState(false);
 const [toDelete, setToDelete] = useState<TaxRuleRow | null>(null);
 const [activeTab, setActiveTab] = useState('rules');
 const [calcAmount, setCalcAmount] = useState<string>('1000');
 const [calcTaxRule, setCalcTaxRule] = useState<string>('');

 // Form state
 const [formTitle, setFormTitle] = useState('');
 const [formTaxType, setFormTaxType] = useState<TaxType>('vat');
 const [formRate, setFormRate] = useState('15');
 const [formIncludedInPrice, setFormIncludedInPrice] = useState(false);
 const [formEffectiveFrom, setFormEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
 const [formExpiryDate, setFormExpiryDate] = useState('');
 const [formDescription, setFormDescription] = useState('');
 const [formApplyTo, setFormApplyTo] = useState<'all' | 'specific_categories' | 'specific_items'>('all');
 const [formDoctype, setFormDoctype] = useState<'sales' | 'purchase'>('sales');
 const [formDisabled, setFormDisabled] = useState(false);

 // ── Data fetching ──────────────────────────────────────────
 const effectiveCompany = defaultCompany ?? '';
 const companyFilter = effectiveCompany
 ? [['company', '=', effectiveCompany] as [string, string, string]]
 : undefined;

 const { data: salesTemplates = [], isLoading: loadSales } = useDocList<Record<string, unknown>>(
 SALES_DOCTYPE,
 {
  fields: ['name', 'title', 'company', 'disabled', 'creation', 'modified', 'description'],
  filters: companyFilter,
  limit: 500,
  enabled: Boolean(effectiveCompany),
 }
 );

 const { data: purchaseTemplates = [], isLoading: loadPurchase } = useDocList<Record<string, unknown>>(
 PURCHASE_DOCTYPE,
 {
  fields: ['name', 'title', 'company', 'disabled', 'creation', 'modified', 'description'],
  filters: companyFilter,
  limit: 500,
  enabled: Boolean(effectiveCompany),
 }
 );

 const { data: taxCategories = [], isLoading: loadCategories } = useDocList<Record<string, unknown>>(
 'Item Tax Template',
 {
  fields: ['name', 'title', 'company', 'disabled'],
  filters: companyFilter,
  limit: 200,
  enabled: Boolean(effectiveCompany),
 }
 );

 // ── Derived data ───────────────────────────────────────────
 const allRules: TaxRuleRow[] = useMemo(() => {
 const s = salesTemplates.map((r) => mapTemplateToRule(r, SALES_DOCTYPE));
 const p = purchaseTemplates.map((r) => mapTemplateToRule(r, PURCHASE_DOCTYPE));
 return [...s, ...p];
 }, [salesTemplates, purchaseTemplates]);

 const categoryRows: TaxCategoryRow[] = useMemo(
 () =>
  taxCategories.map((c) => ({
  name: String(c.name ?? ''),
  category_name: String(c.title ?? c.name ?? ''),
  company: String(c.company ?? ''),
  disabled: Boolean(c.disabled ?? false),
  })),
 [taxCategories]
 );

 const filteredRules = useMemo(() => {
 let result = allRules;
 if (filterTaxType !== 'all') {
  result = result.filter((r) => r.tax_type === filterTaxType);
 }
 if (filterStatus === 'active') {
  result = result.filter((r) => !r.disabled);
 } else if (filterStatus === 'disabled') {
  result = result.filter((r) => r.disabled);
 }
 return result;
 }, [allRules, filterTaxType, filterStatus]);

 // ── Stats ──────────────────────────────────────────────────
 const stats = useMemo(() => {
 const total = allRules.length;
 const active = allRules.filter((r) => !r.disabled).length;
 const taxTypes = new Set(allRules.map((r) => r.tax_type)).size;
 const vatRule = allRules.find((r) => r.tax_type === 'vat' && !r.disabled);
 const defaultVatRate = vatRule?.rate ?? 0;
 return { total, active, taxTypes, defaultVatRate };
 }, [allRules]);

 // ── Tax calculation preview ────────────────────────────────
 const calcResult = useMemo(() => {
 const amount = parseFloat(calcAmount);
 if (isNaN(amount) || amount <= 0 || !calcTaxRule) return null;
 const rule = allRules.find((r) => r.name === calcTaxRule);
 if (!rule) return null;
 const taxAmount = rule.included_in_price
  ? amount - amount / (1 + rule.rate / 100)
  : amount * (rule.rate / 100);
 const total = rule.included_in_price ? amount : amount + taxAmount;
 return {
  baseAmount: rule.included_in_price ? amount - taxAmount : amount,
  taxAmount,
  total,
  rate: rule.rate,
  includedInPrice: rule.included_in_price,
  ruleTitle: rule.title,
 };
 }, [calcAmount, calcTaxRule, allRules]);

 // ── Mutations ──────────────────────────────────────────────
 const createSales = useCreateDoc(SALES_DOCTYPE);
 const createPurchase = useCreateDoc(PURCHASE_DOCTYPE);
 const updateSales = useUpdateDoc(SALES_DOCTYPE);
 const updatePurchase = useUpdateDoc(PURCHASE_DOCTYPE);
 const deleteSales = useDeleteDoc(SALES_DOCTYPE);
 const deletePurchase = useDeleteDoc(PURCHASE_DOCTYPE);

 // ── Form helpers ───────────────────────────────────────────
 const resetForm = useCallback(() => {
 setFormTitle('');
 setFormTaxType('vat');
 setFormRate('15');
 setFormIncludedInPrice(false);
 setFormEffectiveFrom(new Date().toISOString().slice(0, 10));
 setFormExpiryDate('');
 setFormDescription('');
 setFormApplyTo('all');
 setFormDoctype('sales');
 setFormDisabled(false);
 setEditingRule(null);
 }, []);

 const openCreate = useCallback(() => {
 resetForm();
 setDialogOpen(true);
 }, [resetForm]);

 const openEdit = useCallback((rule: TaxRuleRow) => {
 setEditingRule(rule);
 setFormTitle(rule.title);
 setFormTaxType(rule.tax_type);
 setFormRate(String(rule.rate));
 setFormIncludedInPrice(rule.included_in_price);
 setFormEffectiveFrom(rule.effective_from?.slice(0, 10) ?? '');
 setFormExpiryDate(rule.expiry_date?.slice(0, 10) ?? '');
 setFormDescription(rule.description ?? '');
 setFormApplyTo(rule.apply_to);
 setFormDoctype(rule.doctype === PURCHASE_DOCTYPE ? 'purchase' : 'sales');
 setFormDisabled(rule.disabled);
 setDialogOpen(true);
 }, []);

 const handleSave = useCallback(async () => {
 if (!formTitle.trim()) {
  toast.error('يرجى إدخال عنوان القاعدة');
  return;
 }
 const rateNum = parseFloat(formRate);
 if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
  toast.error('يرجى إدخال نسبة ضريبية صحيحة (0-100)');
  return;
 }

 const doctype = formDoctype === 'sales' ? SALES_DOCTYPE : PURCHASE_DOCTYPE;
 const taxLabel = TAX_TYPE_OPTIONS.find((t) => t.value === formTaxType)?.label ?? formTaxType;
 const accountType = formIncludedInPrice ? 'ضريبة متضمنة' : 'ضريبة غير متضمنة';

 const doc: Record<string, unknown> = {
  title: `${formTitle.trim()} - ${taxLabel}`,
  company: effectiveCompany,
  disabled: formDisabled ? 1 : 0,
  description: formDescription?.trim() || '',
  taxes: [
  {
   charge_type: 'On Net Total',
   account_head: `ضريبة ${taxLabel} - ${effectiveCompany}`,
   description: `${accountType} - ${formDescription?.trim() || taxLabel}`,
   rate: rateNum,
   included_in_print_rate: formIncludedInPrice ? 1 : 0,
  },
  ],
 };

 try {
  if (editingRule) {
  const mutator = editingRule.doctype === SALES_DOCTYPE ? updateSales : updatePurchase;
  await mutator.mutateAsync({ name: editingRule.name, doc });
  toast.success('تم تحديث القاعدة الضريبية بنجاح');
  } else {
  const mutator = formDoctype === 'sales' ? createSales : createPurchase;
  await mutator.mutateAsync(doc);
  toast.success('تم إنشاء القاعدة الضريبية بنجاح');
  }
  setDialogOpen(false);
  resetForm();
  qc.invalidateQueries({ queryKey: ['docList', SALES_DOCTYPE] });
  qc.invalidateQueries({ queryKey: ['docList', PURCHASE_DOCTYPE] });
 } catch (e) {
  toast.error(e instanceof Error ? e.message : 'فشلت العملية');
 }
 }, [
 formTitle, formTaxType, formRate, formIncludedInPrice, formDescription,
 formDisabled, formDoctype, formApplyTo, effectiveCompany, editingRule,
 createSales, createPurchase, updateSales, updatePurchase, resetForm, qc,
 ]);

 const handleToggleDisable = useCallback(
 async (rule: TaxRuleRow) => {
  const mutator = rule.doctype === SALES_DOCTYPE ? updateSales : updatePurchase;
  try {
  await mutator.mutateAsync({
   name: rule.name,
   doc: { disabled: rule.disabled ? 0 : 1 },
  });
  toast.success(rule.disabled ? 'تم تفعيل القاعدة' : 'تم تعطيل القاعدة');
  qc.invalidateQueries({ queryKey: ['docList', SALES_DOCTYPE] });
  qc.invalidateQueries({ queryKey: ['docList', PURCHASE_DOCTYPE] });
  } catch (e) {
  toast.error(e instanceof Error ? e.message : 'فشل تبديل الحالة');
  }
 },
 [updateSales, updatePurchase, qc]
 );

 const handleDelete = useCallback(async () => {
 if (!toDelete) return;
 const mutator = toDelete.doctype === SALES_DOCTYPE ? deleteSales : deletePurchase;
 try {
  await mutator.mutateAsync(toDelete.name);
  toast.success('تم حذف القاعدة الضريبية');
  qc.invalidateQueries({ queryKey: ['docList', SALES_DOCTYPE] });
  qc.invalidateQueries({ queryKey: ['docList', PURCHASE_DOCTYPE] });
 } catch (e) {
  toast.error(e instanceof Error ? e.message : 'فشل الحذف');
 }
 setDeleteOpen(false);
 setToDelete(null);
 }, [toDelete, deleteSales, deletePurchase, qc]);

 // ── DataTable columns ──────────────────────────────────────
 const columns: Column<TaxRuleRow>[] = useMemo(
 () => [
  {
  key: 'title',
  header: 'عنوان القاعدة',
  sortable: true,
  width: 'w-48',
  render: (_, row) => (
   <div className="flex flex-col gap-0.5">
   <span className="font-medium text-sm truncate">{row.title}</span>
   <span className="text-xs text-muted-foreground font-mono">{row.name}</span>
   </div>
  ),
  },
  {
  key: 'tax_type',
  header: 'نوع الضريبة',
  sortable: true,
  width: 'w-36',
  render: (_, row) => (
   <Badge variant="secondary" className={`text-xs font-medium ${taxTypeColor(row.tax_type)}`}>
   {taxTypeLabel(row.tax_type)}
   </Badge>
  ),
  },
  {
  key: 'rate',
  header: 'النسبة %',
  sortable: true,
  width: 'w-24',
  render: (v) => (
   <span className="font-mono text-sm font-semibold tabular-nums">{Number(v).toFixed(2)}%</span>
  ),
  },
  {
  key: 'included_in_price',
  header: 'متضمنة/غير متضمنة',
  width: 'w-36',
  render: (_, row) => (
   <div className="flex items-center gap-1.5">
   {row.included_in_price ? (
    <span className="flex items-center gap-1 text-[11px] text-chart-3">
    <CheckCircle2 className="h-3.5 w-3.5" />
    ضريبة متضمنة
    </span>
   ) : (
    <span className="flex items-center gap-1 text-[11px] text-chart-4">
    <XCircle className="h-3.5 w-3.5" />
    ضريبة غير متضمنة
    </span>
   )}
   </div>
  ),
  },
  {
  key: 'disabled',
  header: 'الحالة',
  sortable: true,
  width: 'w-28',
  render: (_, row) => (
   <TooltipProvider>
   <Tooltip>
    <TooltipTrigger asChild>
    <button
     type="button"
     onClick={() => handleToggleDisable(row)}
     className="inline-flex items-center gap-1.5"
    >
     {row.disabled ? (
     <Badge variant="outline" className="text-xs text-destructive border-destructive/40">
      <XCircle className="h-3 w-3 me-1" />
      معطّلة
     </Badge>
     ) : (
     <Badge variant="outline" className="text-xs text-chart-3 border-chart-3/30">
      <CheckCircle2 className="h-3 w-3 me-1" />
      مفعّلة
     </Badge>
     )}
    </button>
    </TooltipTrigger>
    <TooltipContent>
    {row.disabled ? 'انقر للتفعيل' : 'انقر للتعطيل'}
    </TooltipContent>
   </Tooltip>
   </TooltipProvider>
  ),
  },
  {
  key: 'effective_from',
  header: 'سارية من',
  sortable: true,
  width: 'w-32',
  render: (v) => <span className="text-xs">{formatDate(String(v))}</span>,
  },
  {
  key: 'doctype',
  header: 'النطاق',
  width: 'w-28',
  render: (_, row) => (
   <Badge variant="outline" className="text-xs">
   {row.doctype === SALES_DOCTYPE ? 'مبيعات' : 'مشتريات'}
   </Badge>
  ),
  },
 ],
 [handleToggleDisable]
 );

 // ── Categories columns ─────────────────────────────────────
 const catColumns: Column<TaxCategoryRow>[] = useMemo(
 () => [
  {
  key: 'category_name',
  header: 'اسم الفئة',
  sortable: true,
  render: (_, row) => <span className="font-medium text-sm">{row.category_name}</span>,
  },
  {
  key: 'company',
  header: 'الشركة',
  render: (v) => <span className="text-xs text-muted-foreground">{String(v ?? '—')}</span>,
  },
  {
  key: 'disabled',
  header: 'الحالة',
  render: (_, row) =>
   row.disabled ? (
   <Badge variant="outline" className="text-xs text-destructive border-destructive/40">معطّلة</Badge>
   ) : (
   <Badge variant="outline" className="text-xs text-chart-3 border-chart-3/30">مفعّلة</Badge>
   ),
  },
 ],
 []
 );

 const isLoading = loadSales || loadPurchase;

 // ── Render ─────────────────────────────────────────────────
 return (
 <div dir="rtl" className="space-y-6">
  {/* ── Header ────────────────────────────────────────── */}
  <div className="flex items-center justify-between gap-4 flex-wrap">
  <div>
   <h1 className="text-xl font-bold flex items-center gap-2">
   <Shield className="h-5 w-5 text-primary" />
   قواعد الضرائب
   </h1>
   <p className="text-sm text-muted-foreground mt-1">
   إدارة قواعد وأنواع الضرائب — ضريبة متضمنة، ضريبة غير متضمنة، ضريبة انتقائية، ضريبة استقطاع، ضريبة خدمات
   </p>
  </div>
  <Button type="button" onClick={openCreate} className="gap-1.5">
   <Plus className="h-4 w-4" />
   قاعدة ضريبية جديدة
  </Button>
  </div>

  {/* ── Stats Cards ───────────────────────────────────── */}
  <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3">
  <Card>
   <CardContent className="p-4 flex items-center gap-3">
   <div className="h-9 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
    <FileText className="h-5 w-5 text-primary" />
   </div>
   <div>
    <p className="text-[11px] text-muted-foreground">إجمالي القواعد</p>
    <p className="text-lg font-bold mt-0.5">{stats.total}</p>
   </div>
   </CardContent>
  </Card>
  <Card>
   <CardContent className="p-4 flex items-center gap-3">
   <div className="h-9 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center shrink-0">
    <CheckCircle2 className="h-5 w-5 text-chart-3" />
   </div>
   <div>
    <p className="text-[11px] text-muted-foreground">قواعد مفعّلة</p>
    <p className="text-lg font-bold mt-0.5">{stats.active}</p>
   </div>
   </CardContent>
  </Card>
  <Card>
   <CardContent className="p-4 flex items-center gap-3">
   <div className="h-9 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center shrink-0">
    <Tags className="h-5 w-5 text-chart-2" />
   </div>
   <div>
    <p className="text-[11px] text-muted-foreground">أنواع الضرائب</p>
    <p className="text-lg font-bold mt-0.5">{stats.taxTypes}</p>
   </div>
   </CardContent>
  </Card>
  <Card>
   <CardContent className="p-4 flex items-center gap-3">
   <div className="h-9 w-10 rounded-lg bg-chart-1/10 flex items-center justify-center shrink-0">
    <Percent className="h-5 w-5 text-chart-1" />
   </div>
   <div>
    <p className="text-[11px] text-muted-foreground">نسبة القيمة المضافة الافتراضية</p>
    <p className="text-lg font-bold mt-0.5">{stats.defaultVatRate > 0 ? `${stats.defaultVatRate}%` : '—'}</p>
   </div>
   </CardContent>
  </Card>
  </div>

  {/* ── Tax Type Legend ────────────────────────────────── */}
  <Card>
  <CardContent className="p-4">
   <h3 className="text-xs font-semibold text-muted-foreground mb-3">أنواع الضرائب المدعومة</h3>
   <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
   {TAX_TYPE_OPTIONS.map((opt) => (
    <div key={opt.value} className="flex items-start gap-2 rounded-lg border border-border/40 p-2.5">
    <Badge variant="secondary" className={`text-[9px] shrink-0 ${opt.color}`}>
     {opt.label}
    </Badge>
    <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
    </div>
   ))}
   </div>
  </CardContent>
  </Card>

  {/* ── Tabs ──────────────────────────────────────────── */}
  <Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
   <TabsTrigger value="rules" className="gap-1.5">
   <Receipt className="h-3.5 w-3.5" />
   قواعد الضرائب
   </TabsTrigger>
   <TabsTrigger value="categories" className="gap-1.5">
   <Tags className="h-3.5 w-3.5" />
   فئات الضرائب
   </TabsTrigger>
   <TabsTrigger value="calculator" className="gap-1.5">
   <Calculator className="h-3.5 w-3.5" />
   حاسبة الضرائب
   </TabsTrigger>
  </TabsList>

  {/* ── Tab: Rules ─────────────────────────────────── */}
  <TabsContent value="rules" className="space-y-4 mt-4">
   {/* Filters */}
   <Card>
   <CardContent className="p-4">
    <div className="flex flex-wrap items-end gap-4">
    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
     <Filter className="h-3.5 w-3.5" />
     فلترة:
    </div>
    <div className="space-y-1.5 min-w-[160px]">
     <Label className="text-xs">نوع الضريبة</Label>
     <Select value={filterTaxType} onValueChange={setFilterTaxType}>
     <SelectTrigger className="h-8 text-xs">
      <SelectValue />
     </SelectTrigger>
     <SelectContent>
      <SelectItem value="all">الكل</SelectItem>
      {TAX_TYPE_OPTIONS.map((opt) => (
      <SelectItem key={opt.value} value={opt.value}>
       {opt.label}
      </SelectItem>
      ))}
     </SelectContent>
     </Select>
    </div>
    <div className="space-y-1.5 min-w-[140px]">
     <Label className="text-xs">الحالة</Label>
     <Select value={filterStatus} onValueChange={setFilterStatus}>
     <SelectTrigger className="h-8 text-xs">
      <SelectValue />
     </SelectTrigger>
     <SelectContent>
      <SelectItem value="all">الكل</SelectItem>
      <SelectItem value="active">مفعّلة</SelectItem>
      <SelectItem value="disabled">معطّلة</SelectItem>
     </SelectContent>
     </Select>
    </div>
    {(filterTaxType !== 'all' || filterStatus !== 'all') && (
     <Button
     type="button"
     variant="ghost"
     size="sm"
     className="h-8 text-xs"
     onClick={() => {
      setFilterTaxType('all');
      setFilterStatus('all');
     }}
     >
     <XCircle className="h-3.5 w-3.5 me-1" />
     مسح الفلاتر
     </Button>
    )}
    <div className="ms-auto text-xs text-muted-foreground">
     عرض {filteredRules.length} من {allRules.length} قاعدة
    </div>
    </div>
   </CardContent>
   </Card>

   {/* DataTable */}
   <DataTable
   data={filteredRules}
   columns={columns}
   tableId="tax-rules"
   searchable
   addLabel="قاعدة ضريبية جديدة"
   onAdd={openCreate}
   onEdit={openEdit}
   onDelete={(row) => {
    setToDelete(row);
    setDeleteOpen(true);
   }}
   loading={isLoading}
   exportFileName="tax-rules"
   printTitle="قواعد الضرائب — ERP Pro"
   />
  </TabsContent>

  {/* ── Tab: Categories ────────────────────────────── */}
  <TabsContent value="categories" className="space-y-4 mt-4">
   <Card>
   <CardContent className="p-4">
    <div className="flex items-center gap-3 mb-4">
    <div className="h-9 w-9 rounded-lg bg-chart-2/10 flex items-center justify-center">
     <Tags className="h-4 w-4 text-chart-2" />
    </div>
    <div>
     <h2 className="text-sm font-semibold">فئات الضرائب</h2>
     <p className="text-[11px] text-muted-foreground">
     قوالب الضرائب الخاصة بالأصناف (Item Tax Template) — تُستخدم لربط نسب ضريبية مختلفة بكل فئة أصناف
     </p>
    </div>
    </div>
    <DataTable
    data={categoryRows}
    columns={catColumns}
    tableId="tax-categories"
    searchable
    loading={loadCategories}
    exportFileName="tax-categories"
    printTitle="فئات الضرائب — ERP Pro"
    />
   </CardContent>
   </Card>
  </TabsContent>

  {/* ── Tab: Calculator ─────────────────────────────── */}
  <TabsContent value="calculator" className="space-y-4 mt-4">
   <Card>
   <CardContent className="p-6">
    <div className="flex items-center gap-3 mb-6">
    <div className="h-9 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
     <Calculator className="h-5 w-5 text-primary" />
    </div>
    <div>
     <h2 className="text-sm font-semibold">حاسبة معاينة الضرائب</h2>
     <p className="text-[11px] text-muted-foreground">
     أدخل مبلغاً واختر قاعدة ضريبية لمعاينة نتيجة الحساب فوراً
     </p>
    </div>
    </div>

    <div className="grid gap-6 sm:grid-cols-2">
    {/* Inputs */}
    <div className="space-y-4">
     <div className="space-y-1.5">
     <Label className="text-xs">المبلغ</Label>
     <div className="relative">
      <Input
      type="number"
      min={0}
      step="0.01"
      dir="ltr"
      className="h-9 pe-12 font-mono"
      placeholder="1000.00"
      value={calcAmount}
      onChange={(e) => setCalcAmount(e.target.value)}
      />
      <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
      ر.ي
      </span>
     </div>
     </div>

     <div className="space-y-1.5">
     <Label className="text-xs">قاعدة الضريبة</Label>
     <Select value={calcTaxRule} onValueChange={setCalcTaxRule}>
      <SelectTrigger className="h-9 text-xs">
      <SelectValue placeholder="اختر قاعدة ضريبية…" />
      </SelectTrigger>
      <SelectContent>
      {allRules
       .filter((r) => !r.disabled)
       .map((rule) => (
       <SelectItem key={rule.name} value={rule.name}>
        {rule.title} — {rule.rate}%
        {rule.included_in_price ? ' (متضمنة)' : ' (غير متضمنة)'}
       </SelectItem>
       ))}
      </SelectContent>
     </Select>
     </div>

     {allRules.length === 0 && !isLoading && (
     <div className="flex items-center gap-2 p-3 rounded-lg bg-chart-2/5 border border-chart-2/20">
      <AlertTriangle className="h-4 w-4 text-chart-2 shrink-0" />
      <p className="text-[11px] text-chart-2">
      لا توجد قواعد ضريبية مفعّلة بعد. أنشئ قاعدة أولاً من تبويب «قواعد الضرائب».
      </p>
     </div>
     )}
    </div>

    {/* Results */}
    <div className="rounded-xl border border-border/50 bg-muted/30 p-5 space-y-4">
     <h3 className="text-xs font-semibold text-muted-foreground">نتيجة الحساب</h3>
     {calcResult ? (
     <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">القاعدة المختارة</span>
      <span className="text-xs font-medium">{calcResult.ruleTitle}</span>
      </div>
      <Separator />
      <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">
       {calcResult.includedInPrice ? 'المبلغ شامل الضريبة' : 'المبلغ قبل الضريبة'}
      </span>
      <span className="text-sm font-mono font-semibold">{formatNumber(calcResult.includedInPrice ? parseFloat(calcAmount) : calcResult.baseAmount)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">نسبة الضريبة</span>
      <span className="text-sm font-mono">{calcResult.rate.toFixed(2)}%</span>
      </div>
      <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">مبلغ الضريبة</span>
      <span className="text-sm font-mono font-semibold text-primary">
       {formatNumber(calcResult.taxAmount)}
      </span>
      </div>
      <Separator />
      <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold">
       {calcResult.includedInPrice ? 'صافي المبلغ قبل الضريبة' : 'الإجمالي شامل الضريبة'}
      </span>
      <span className="text-lg font-bold font-mono text-chart-3">
       {formatNumber(calcResult.includedInPrice ? calcResult.baseAmount : calcResult.total)}
      </span>
      </div>
      {calcResult.includedInPrice && (
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-chart-1/5 border border-chart-1/20">
       <Info className="h-3.5 w-3.5 text-chart-1 shrink-0 mt-0.5" />
       <p className="text-xs text-chart-1 leading-relaxed">
       الضريبة متضمنة في السعر — يتم استخراج مبلغ الضريبة من الإجمالي. المبلغ المعروض أعلاه هو صافي السعر قبل الضريبة.
       </p>
      </div>
      )}
     </div>
     ) : (
     <div className="flex flex-col items-center justify-center py-8 text-center">
      <Calculator className="h-9 w-10 text-muted-foreground/30 mb-3" />
      <p className="text-xs text-muted-foreground">
      أدخل مبلغاً واختر قاعدة ضريبية لرؤية نتيجة الحساب
      </p>
     </div>
     )}
    </div>
    </div>
   </CardContent>
   </Card>
  </TabsContent>
  </Tabs>

  {/* ── Create / Edit Dialog ─────────────────────────── */}
  <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
  <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    {editingRule ? (
    <>
     <Pencil className="h-4 w-4" />
     تعديل قاعدة ضريبية
    </>
    ) : (
    <>
     <Plus className="h-4 w-4" />
     إنشاء قاعدة ضريبية جديدة
    </>
    )}
   </DialogTitle>
   <DialogDescription>
    {editingRule
    ? 'عدّل تفاصيل القاعدة الضريبية واحفظ التغييرات'
    : 'أنشئ قاعدة ضريبية جديدة تُطبّق على الفواتير تلقائياً'}
   </DialogDescription>
   </DialogHeader>

   <div className="grid gap-5 py-2">
   {/* Row 1: Title + Doctype */}
   <div className="grid gap-4 sm:grid-cols-2">
    <div className="space-y-1.5 sm:col-span-2">
    <Label className="text-xs">عنوان القاعدة *</Label>
    <Input
     className="h-9"
     placeholder="مثال: ضريبة القيمة المضافة 15%"
     value={formTitle}
     onChange={(e) => setFormTitle(e.target.value)}
    />
    </div>
   </div>

   {/* Row 2: Tax Type + Rate */}
   <div className="grid gap-4 sm:grid-cols-2">
    <div className="space-y-1.5">
    <Label className="text-xs">نوع الضريبة</Label>
    <Select value={formTaxType} onValueChange={(v) => setFormTaxType(v as TaxType)}>
     <SelectTrigger className="h-9">
     <SelectValue />
     </SelectTrigger>
     <SelectContent>
     {TAX_TYPE_OPTIONS.map((opt) => (
      <SelectItem key={opt.value} value={opt.value}>
      <span className="flex items-center gap-2">
       {opt.label}
       <span className="text-xs text-muted-foreground">— {opt.description}</span>
      </span>
      </SelectItem>
     ))}
     </SelectContent>
    </Select>
    </div>
    <div className="space-y-1.5">
    <Label className="text-xs">النسبة %</Label>
    <div className="relative">
     <Input
     type="number"
     step="0.01"
     min={0}
     max={100}
     dir="ltr"
     className="h-9 pe-8 font-mono"
     value={formRate}
     onChange={(e) => setFormRate(e.target.value)}
     />
     <Percent className="absolute end-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
    </div>
    </div>
   </div>

   {/* Row 3: Included in Price + Apply To */}
   <div className="grid gap-4 sm:grid-cols-2">
    <div className="space-y-1.5">
    <Label className="text-xs">تطبيق الضريبة</Label>
    <Select value={formDoctype} onValueChange={(v) => setFormDoctype(v as 'sales' | 'purchase')}>
     <SelectTrigger className="h-9">
     <SelectValue />
     </SelectTrigger>
     <SelectContent>
     <SelectItem value="sales">قالب مبيعات</SelectItem>
     <SelectItem value="purchase">قالب مشتريات</SelectItem>
     </SelectContent>
    </Select>
    </div>
    <div className="space-y-1.5">
    <Label className="text-xs">نطاق التطبيق</Label>
    <Select value={formApplyTo} onValueChange={(v) => setFormApplyTo(v as typeof formApplyTo)}>
     <SelectTrigger className="h-9">
     <SelectValue />
     </SelectTrigger>
     <SelectContent>
     {APPLY_TO_OPTIONS.map((opt) => (
      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
     ))}
     </SelectContent>
    </Select>
    </div>
   </div>

   {/* Row 4: Included in Price Toggle */}
   <div className="flex items-center justify-between gap-4 rounded-lg border border-border/50 p-3">
    <div className="space-y-0.5">
    <Label className="text-sm font-medium">ضريبة متضمنة في السعر</Label>
    <p className="text-xs text-muted-foreground">
     عند التفعيل، يكون السعر المعروض للعميل شاملاً الضريبة (ضريبة متضمنة). عند التعطيل، تُضاف الضريبة فوق السعر (ضريبة غير متضمنة).
    </p>
    </div>
    <Switch
    checked={formIncludedInPrice}
    onCheckedChange={setFormIncludedInPrice}
    />
   </div>

   {/* Row 5: Effective From + Expiry Date */}
   <div className="grid gap-4 sm:grid-cols-2">
    <div className="space-y-1.5">
    <Label className="text-xs">تاريخ السريان</Label>
    <Input
     type="date"
     className="h-9"
     dir="ltr"
     value={formEffectiveFrom}
     onChange={(e) => setFormEffectiveFrom(e.target.value)}
    />
    </div>
    <div className="space-y-1.5">
    <Label className="text-xs">تاريخ الانتهاء (اختياري)</Label>
    <Input
     type="date"
     className="h-9"
     dir="ltr"
     value={formExpiryDate}
     onChange={(e) => setFormExpiryDate(e.target.value)}
    />
    </div>
   </div>

   {/* Row 6: Description */}
   <div className="space-y-1.5">
    <Label className="text-xs">الوصف</Label>
    <Textarea
    className="min-h-[70px] text-xs"
    placeholder="وصف اختياري لهذه القاعدة الضريبية…"
    value={formDescription}
    onChange={(e) => setFormDescription(e.target.value)}
    />
   </div>

   {/* Row 7: Disabled Toggle */}
   <div className="flex items-center justify-between gap-4 rounded-lg border border-border/50 p-3">
    <div className="space-y-0.5">
    <Label className="text-sm font-medium">تعطيل القاعدة</Label>
    <p className="text-xs text-muted-foreground">
     القاعدة المعطّلة لا تظهر في الفواتير الجديدة لكن تبقى مسجلة في النظام
    </p>
    </div>
    <Switch
    checked={formDisabled}
    onCheckedChange={setFormDisabled}
    />
   </div>
   </div>

   <DialogFooter>
   <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
    إلغاء
   </Button>
   <Button
    type="button"
    onClick={handleSave}
    disabled={!formTitle.trim() || !formRate}
   >
    {editingRule ? 'حفظ التعديلات' : 'إنشاء القاعدة'}
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>

  {/* ── Delete Confirmation ──────────────────────────── */}
  <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
  <AlertDialogContent dir="rtl">
   <AlertDialogHeader>
   <AlertDialogTitle className="flex items-center gap-2">
    <Trash2 className="h-4 w-4 text-destructive" />
    حذف القاعدة الضريبية
   </AlertDialogTitle>
   <AlertDialogDescription>
    هل أنت متأكد من حذف «{toDelete?.title || toDelete?.name}»؟
    لن يتم حذف حساب GL المرتبط تلقائياً. قد تؤثر هذه العملية على الفواتير المستقبلية المرتبطة بهذه القاعدة.
   </AlertDialogDescription>
   </AlertDialogHeader>
   <AlertDialogFooter>
   <AlertDialogCancel>إلغاء</AlertDialogCancel>
   <AlertDialogAction onClick={handleDelete} variant="destructive">
    حذف نهائياً
   </AlertDialogAction>
   </AlertDialogFooter>
  </AlertDialogContent>
  </AlertDialog>
 </div>
 );
}
