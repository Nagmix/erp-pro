'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Plus,
  FolderTree,
  FileText,
  ChevronDown,
  ChevronLeft,
  Edit,
  Trash2,
  Search,
  Upload,
  Layers,
  Hash,
  Tag,
  Building2,
  FolderOpen,
  Info,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/core/helpers';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { useDocList, useCreateDoc, useDeleteDoc, useUpdateDoc } from '@/lib/client/hooks';
import { toast } from 'sonner';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { buildAccountCreate, buildAccountUpdate } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { useAccountBalances } from '@/lib/erp/use-account-balances';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { translateAccountName, translateDoctype, translateAccountType, translateRootType } from '@/lib/core/arabic-labels';

interface AccountData {
  name: string;
  account_name?: string;
  account_number: string;
  account_type: string;
  root_type: string;
  is_group: boolean | number;
  parent_account: string;
  balance?: number;
  company: string;
}

const rootTypeConfig: Record<string, {
  label: string;
  accent: string;
  bgLight: string;
  icon: string;
  gradient: string;
  border: string;
  badge: string;
}> = {
  Asset: {
    label: 'أصول',
    accent: 'text-chart-1 dark:text-blue-400',
    bgLight: 'bg-chart-1/10',
    icon: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/25',
    gradient: 'from-blue-500/8 to-transparent',
    border: 'border-chart-1/20/60 dark:border-blue-800/40',
    badge: 'bg-chart-1/10/80 text-chart-1 ring-1 ring-inset ring-chart-1/30',
  },
  Liability: {
    label: 'الالتزامات',
    accent: 'text-chart-2 dark:text-amber-400',
    bgLight: 'bg-chart-2/10',
    icon: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/25',
    gradient: 'from-amber-500/8 to-transparent',
    border: 'border-chart-2/20/60 dark:border-amber-800/40',
    badge: 'bg-chart-2/10/80 text-chart-2 ring-1 ring-inset ring-chart-2/30',
  },
  Equity: {
    label: 'حقوق الملكية',
    accent: 'text-chart-5 dark:text-violet-400',
    bgLight: 'bg-chart-5/10',
    icon: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/25',
    gradient: 'from-violet-500/8 to-transparent',
    border: 'border-chart-5/20',
    badge: 'bg-chart-5/10/80 text-chart-5 ring-1 ring-inset ring-chart-5/30',
  },
  Income: {
    label: 'الإيرادات',
    accent: 'text-primary dark:text-emerald-400',
    bgLight: 'bg-primary/10',
    icon: 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-emerald-500/25',
    gradient: 'from-emerald-500/8 to-transparent',
    border: 'border-primary/20/60 dark:border-emerald-800/40',
    badge: 'bg-primary/10/80 text-primary ring-1 ring-inset ring-primary/30',
  },
  Expense: {
    label: 'المصروفات',
    accent: 'text-destructive dark:text-rose-400',
    bgLight: 'bg-destructive/10',
    icon: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-500/25',
    gradient: 'from-rose-500/8 to-transparent',
    border: 'border-destructive/20/60 dark:border-rose-800/40',
    badge: 'bg-destructive/10/80 text-destructive ring-1 ring-inset ring-destructive/30',
  },
};

const accountTypeOptions = [
  { value: '', label: 'بدون تصنيف' },
  { value: 'Cash', label: 'نقدية' },
  { value: 'Bank', label: 'بنك' },
  { value: 'Receivable', label: 'مدينون' },
  { value: 'Payable', label: 'دائنون' },
  { value: 'Fixed Asset', label: 'أصول ثابتة' },
  { value: 'Income Account', label: 'حساب إيرادات' },
  { value: 'Cost of Goods Sold', label: 'تكلفة المبيعات' },
  { value: 'Equity', label: 'حقوق ملكية' },
  { value: 'Tax', label: 'ضريبي' },
  { value: 'Chargeable', label: 'قابل للشحن' },
  { value: 'Temporary', label: 'مؤقت' },
  { value: 'Stock', label: 'مخزون' },
  { value: 'Stock Received But Not Billed', label: 'مخزون مستلم غير مفوتر' },
  { value: 'Capital Work in Progress', label: 'أصول تحت الإنشاء' },
  { value: 'Depreciation', label: 'إهلاك' },
  { value: 'Accumulated Depreciation', label: 'إهلاك متراكم' },
  { value: 'Template', label: 'قالب' },
];

const accountSchema = z.object({
  account_number: z.string().min(1, 'رقم الحساب مطلوب'),
  account_name: z.string().min(1, 'اسم الحساب مطلوب'),
  root_type: z.string().min(1, 'النوع الجذري مطلوب'),
  account_type: z.string(),
  parent_account: z.string(),
  is_group: z.boolean(),
  company: z.string().min(1, 'اسم الشركة مطلوب'),
});

type AccountFormData = z.infer<typeof accountSchema>;

// ────────────────────────────────────────────────
// Tree Item
// ────────────────────────────────────────────────

function AccountTreeItem({
  account,
  allAccounts,
  level,
  onEdit,
  onDelete,
  getBalance,
}: {
  account: AccountData;
  allAccounts: AccountData[];
  level: number;
  onEdit: (acc: AccountData) => void;
  onDelete: (acc: AccountData) => void;
  getBalance: (name: string) => number;
}) {
  const [isOpen, setIsOpen] = useState(level < 2);
  const children = allAccounts.filter(a => a.parent_account === account.name);
  const hasChildren = children.length > 0;
  const isGroup = !!account.is_group;
  const displayName = translateAccountName(account.account_name || account.name);
  const balance = getBalance(account.name);
  const config = rootTypeConfig[account.root_type];

  return (
    <div>
      <div
        className="flex items-center gap-2 h-10 px-4 group transition-colors hover:bg-accent/50 border-b border-border/20 last:border-b-0 text-xs"
        style={{ paddingRight: `${level * 1.25 + 1}rem` }}
      >
        {hasChildren ? (
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <CollapsibleTrigger asChild>
                <button className="h-5 w-5 rounded flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${isOpen ? '' : '-rotate-90'}`} />
                </button>
              </CollapsibleTrigger>
              <FolderOpen className={`h-4 w-4 shrink-0 ${config?.accent || 'text-muted-foreground'}`} />
              <span className="font-medium truncate">{displayName}</span>
              {children.length > 0 && (
                <span className="text-[10px] text-muted-foreground/70 tabular-nums shrink-0">({children.length})</span>
              )}
            </div>
          </Collapsible>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="w-5 shrink-0" />
            <FileText className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <span className="truncate">{displayName}</span>
          </div>
        )}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-muted-foreground font-mono text-[11px] tabular-nums w-24 text-center" dir="ltr">
            {account.account_number}
          </span>
          <span className="w-28 text-center">
            {account.account_type ? (
              <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                {accountTypeOptions.find(o => o.value === account.account_type)?.label || translateDoctype(account.account_type)}
              </Badge>
            ) : isGroup ? (
              <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0 text-muted-foreground">
                مجموعة
              </Badge>
            ) : null}
          </span>
          <span className="tabular-nums min-w-[110px] text-start text-xs" dir="ltr">
            {isGroup ? (
              <span className="text-muted-foreground/40">—</span>
            ) : (
              <span className={balance >= 0 ? 'text-foreground' : 'text-destructive font-medium'}>
                {formatCurrency(balance)}
              </span>
            )}
          </span>
          <div className="flex gap-0.5 w-16 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(account)}
              className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Edit className="h-3 w-3" />
            </button>
            <button
              onClick={() => onDelete(account)}
              className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {hasChildren && isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {children.map(child => (
              <AccountTreeItem
                key={child.name}
                account={child}
                allAccounts={allAccounts}
                level={level + 1}
                onEdit={onEdit}
                onDelete={onDelete}
                getBalance={getBalance}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ────────────────────────────────────────────────
// Form Field Component
// ────────────────────────────────────────────────

function FormField({
  label,
  icon: Icon,
  error,
  children,
  required,
  hint,
}: {
  label: string;
  icon: React.ElementType;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground flex items-center gap-2">
        <span className="h-6 w-6 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
        {label}
        {required && <span className="text-destructive text-xs me-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-muted-foreground/60 pe-8">{hint}</p>
      )}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[11px] text-destructive font-medium flex items-center gap-1 pe-8"
          >
            <Info className="h-3 w-3 shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ────────────────────────────────────────────────
// Account Form Dialog Content
// ────────────────────────────────────────────────

function AccountFormContent({
  form,
  title,
  icon,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
  pendingLabel,
  defaultCompany,
}: {
  form: UseFormReturn<AccountFormData>;
  title: string;
  icon: React.ReactNode;
  onSubmit: (data: AccountFormData) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
  pendingLabel: string;
  defaultCompany?: string;
}) {
  const selectedRootType = form.watch('root_type');
  const rootConfig = rootTypeConfig[selectedRootType];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0" dir="rtl">
      {/* Header */}
      <DialogHeader className="pb-4 mb-0">
        <DialogTitle className="flex items-center gap-3 text-lg font-bold">
          {icon}
          <div>
            <span>{title}</span>
            <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات الحساب في الحقول أدناه</p>
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 max-h-[65vh] overflow-y-auto -mx-1 px-1">
        {/* ── Basic Info ── */}
        <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
          <legend className="sr-only">المعلومات الأساسية</legend>
          <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
            <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
              <span className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center">
                <Hash className="h-3 w-3 text-primary" />
              </span>
              المعلومات الأساسية
            </h4>
          </div>
          <div className="p-4 space-y-4 bg-card/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="رقم الحساب" icon={Hash} error={form.formState.errors.account_number?.message} required hint="الرقم التسلسلي في دليل الحسابات">
                <Input
                  placeholder="مثال: 1140"
                  className="font-mono tabular-nums text-start"
                  {...form.register('account_number')}
                />
              </FormField>
              <FormField label="اسم الحساب" icon={Tag} error={form.formState.errors.account_name?.message} required hint="الاسم الوصفي للحساب">
                <Input
                  placeholder="مثال: النقدية بالصندوق"
                  {...form.register('account_name')}
                />
              </FormField>
            </div>
          </div>
        </fieldset>

        {/* ── Classification ── */}
        <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
          <legend className="sr-only">التصنيف</legend>
          <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
            <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
              <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center">
                <Layers className="h-3 w-3 text-info" />
              </span>
              التصنيف المحاسبي
            </h4>
          </div>
          <div className="p-4 space-y-4 bg-card/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="النوع الجذري" icon={Layers} required>
                <Select dir="rtl" value={form.watch('root_type')} onValueChange={v => form.setValue('root_type', v)}>
                  <SelectTrigger className="text-start">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="min-w-[200px]" align="start">
                    {Object.entries(rootTypeConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2.5">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: key === 'Asset' ? '#3b82f6' : key === 'Liability' ? '#f59e0b' : key === 'Equity' ? '#8b5cf6' : key === 'Income' ? '#10b981' : '#f43f5e' }} />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="تصنيف الحساب" icon={Tag} hint="اختياري - لتحديد نوع الحساب الفرعي">
                <Select dir="rtl" value={form.watch('account_type')} onValueChange={v => form.setValue('account_type', v)}>
                  <SelectTrigger className="text-start">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="min-w-[200px]" align="start">
                    {accountTypeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value || '_none'}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            {rootConfig && (
              <motion.div
                key={selectedRootType}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex items-center gap-2.5 text-xs rounded-xl px-3.5 py-2.5 ${rootConfig.bgLight} ${rootConfig.border} border`}
              >
                <div className={`h-6 w-6 rounded-lg flex items-center justify-center shadow-sm ${rootConfig.icon}`}>
                  <Layers className="h-3 w-3" />
                </div>
                <span className={`font-medium ${rootConfig.accent}`}>
                  النوع: <strong>{rootConfig.label}</strong>
                </span>
              </motion.div>
            )}
          </div>
        </fieldset>

        {/* ── Hierarchy ── */}
        <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
          <legend className="sr-only">التسلسل الهرمي</legend>
          <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
            <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
              <span className="h-5 w-5 rounded-md bg-success/10 flex items-center justify-center">
                <FolderTree className="h-3 w-3 text-success" />
              </span>
              التسلسل الهرمي والشركة
            </h4>
          </div>
          <div className="p-4 space-y-4 bg-card/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="الحساب الأب" icon={FolderTree} hint="اتركه فارغاً للجذر؛ يُفضّل اختيار حساب مجموعة">
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 self-start text-xs text-muted-foreground"
                    onClick={() => form.setValue('parent_account', '')}
                  >
                    حساب جذري (بدون أب)
                  </Button>
                  <ErpLinkCombobox
                    doctype="Account"
                    displayKey="account_name"
                    value={form.watch('parent_account')}
                    onChange={(v) => form.setValue('parent_account', v)}
                    placeholder="اختر الحساب الأب..."
                    showCreateShortcut={false}
                    className="text-sm"
                  />
                </div>
              </FormField>
              <FormField label="الشركة (افتراضية)" icon={Building2}>
                <p className="text-sm font-semibold">{form.watch('company') || defaultCompany || '—'}</p>
                {!defaultCompany && (
                  <p className="text-[10px] text-destructive">اضبط الشركة الافتراضية من الإعدادات</p>
                )}
                <input type="hidden" {...form.register('company')} />
              </FormField>
            </div>

            <label className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors">
              <Checkbox
                checked={form.watch('is_group')}
                onCheckedChange={checked => form.setValue('is_group', !!checked)}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">حساب مجموعة</span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  يحتوي على حسابات فرعية ولا يُسجَّل عليه قيود مباشرة
                </span>
              </div>
            </label>
          </div>
        </fieldset>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
        <Button type="button" variant="ghost" onClick={onCancel} className="text-muted-foreground">
          إلغاء
        </Button>
        <Button type="submit" disabled={isPending} className="gap-1.5 min-w-[130px]">
          {isPending ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              {pendingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}

// ────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────

export default function ChartOfAccountsPage() {
  const [filterRoot, setFilterRoot] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { company: defaultCompany, isLoading: companyLoading } = useDefaultCompanyName();
  const asOfDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const { data, isLoading, isError, error, refetch } = useDocList<AccountData>('Account', {
    fields: ['name', 'account_name', 'account_number', 'account_type', 'root_type', 'is_group', 'parent_account', 'company'],
    limit: 5000,
  });
  const createMutation = useCreateDoc('Account');
  const updateMutation = useUpdateDoc('Account');
  const deleteMutation = useDeleteDoc('Account');

  const accounts = data || [];
  const leafNames = useMemo(
    () => accounts.filter(a => !a.is_group).map(a => a.name),
    [accounts]
  );
  const balanceResults = useAccountBalances(
    leafNames,
    defaultCompany || (accounts[0]?.company as string) || '',
    asOfDate,
    Boolean((defaultCompany || accounts[0]?.company) && leafNames.length)
  );
  const balanceMap = useMemo(() => {
    const m: Record<string, number> = {};
    leafNames.forEach((name, i) => {
      const d = balanceResults[i]?.data;
      if (typeof d === 'number' && !Number.isNaN(d)) m[name] = d;
    });
    return m;
  }, [leafNames, balanceResults]);

  const getBalance = (name: string) => balanceMap[name] ?? 0;

  const createForm = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: { account_number: '', account_name: '', root_type: 'Asset', account_type: '', parent_account: '', is_group: false, company: '' },
  });
  const editForm = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: { account_number: '', account_name: '', root_type: 'Asset', account_type: '', parent_account: '', is_group: false, company: '' },
  });

  useEffect(() => {
    if (defaultCompany) {
      createForm.setValue('company', defaultCompany);
      editForm.setValue('company', defaultCompany);
    }
  }, [defaultCompany, createForm, editForm]);

  const filteredAccounts = useMemo(() => {
    let result = accounts;
    if (filterRoot !== 'all') result = result.filter(a => a.root_type === filterRoot);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.account_number.includes(q) ||
        (a.account_name || '').toLowerCase().includes(q) ||
        translateAccountName(a.account_name || a.name).includes(q) ||
        a.account_type.toLowerCase().includes(q)
      );
    }
    return result;
  }, [accounts, filterRoot, searchQuery]);

  const groupedAccounts = useMemo(() => {
    const rootAccounts = filteredAccounts.filter(a => !a.parent_account);
    const groups: Record<string, AccountData[]> = {};
    for (const root of rootAccounts) {
      if (!groups[root.root_type]) groups[root.root_type] = [];
      groups[root.root_type].push(root);
    }
    return groups;
  }, [filteredAccounts]);

  const summaryByRootType = useMemo(() => {
    const result: Record<string, number> = {};
    for (const rt of Object.keys(rootTypeConfig)) {
      result[rt] = accounts
        .filter(a => a.root_type === rt && !a.is_group)
        .reduce((s, a) => s + (balanceMap[a.name] ?? 0), 0);
    }
    return result;
  }, [accounts, balanceMap]);

  const totalAccounts = accounts.length;

  const handleCreate = (data: AccountFormData) => {
    const at = !data.account_type || data.account_type === '_none' ? '' : data.account_type;
    const payload = buildAccountCreate({
      account_name: data.account_name, account_number: data.account_number,
      parent_account: data.parent_account, is_group: data.is_group, company: data.company,
      root_type: data.root_type, account_type: at,
    });
    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('تم إنشاء الحساب بنجاح');
        setCreateDialogOpen(false);
        createForm.reset();
        if (defaultCompany) createForm.setValue('company', defaultCompany);
      },
      onError: () => toast.error('حدث خطأ أثناء إنشاء الحساب'),
    });
  };

  const handleEdit = (data: AccountFormData) => {
    if (!selectedAccount) return;
    const at = !data.account_type || data.account_type === '_none' ? '' : data.account_type;
    const doc = buildAccountUpdate({
      account_name: data.account_name, account_number: data.account_number,
      parent_account: data.parent_account, is_group: data.is_group, company: data.company,
      root_type: data.root_type, account_type: at,
    });
    updateMutation.mutate(
      { name: selectedAccount.name, doc },
      {
        onSuccess: () => {
          toast.success('تم تعديل الحساب بنجاح');
          setEditDialogOpen(false);
          setSelectedAccount(null);
          editForm.reset();
        },
        onError: () => toast.error('حدث خطأ أثناء تعديل الحساب'),
      }
    );
  };

  const runCsvImport = async (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      toast.error('الملف فارغ أو بلا بيانات');
      return;
    }
    const comp = defaultCompany || createForm.getValues('company');
    if (!comp) {
      toast.error('تعذر تحديد الشركة، يرجى إضافة شركة أولاً');
      return;
    }
    let ok = 0;
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/[,\t;]/).map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length < 2) continue;
      const [account_name, account_number, parent_account, is_group, root_type, account_type] = parts;
      if (!account_name) continue;
      const payload = buildAccountCreate({
        account_name,
        account_number: account_number || undefined,
        parent_account: parent_account || '',
        is_group: (is_group || '0') === '1' || is_group === 'true',
        company: comp,
        root_type: (root_type as string) || 'Asset',
        account_type: (account_type as string) || '',
      });
      try {
        await createMutation.mutateAsync(payload);
        ok += 1;
      } catch { /* skip row */ }
    }
    toast.success(`تم استيراد ${ok} من ${lines.length - 1} حساب`);
    void refetch();
  };

  const handleDelete = () => {
    if (!selectedAccount) return;
    deleteMutation.mutate(selectedAccount.name, {
      onSuccess: () => {
        toast.success('تم حذف الحساب بنجاح');
        setDeleteDialogOpen(false);
        setSelectedAccount(null);
      },
      onError: () => toast.error('حدث خطأ أثناء حذف الحساب'),
    });
  };

  const openEdit = (acc: AccountData) => {
    setSelectedAccount(acc);
    editForm.reset({
      account_number: acc.account_number,
      account_name: acc.account_name || acc.name,
      root_type: acc.root_type,
      account_type: acc.account_type,
      parent_account: acc.parent_account,
      is_group: !!acc.is_group,
      company: acc.company || defaultCompany,
    });
    setEditDialogOpen(true);
  };

  const openDelete = (acc: AccountData) => {
    setSelectedAccount(acc);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="دليل الحسابات"
        description="إدارة الهيكل المحاسبي وشجرة الحسابات الكاملة"
        iconify="solar:book-2-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'دليل الحسابات' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,text/csv"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) void f.text().then(runCsvImport);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={companyLoading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              استيراد CSV
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                createForm.reset();
                if (defaultCompany) createForm.setValue('company', defaultCompany);
                setCreateDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              إضافة حساب
            </Button>
          </div>
        }
      />

      {/* ─── KPI Summary ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(rootTypeConfig).map(([key, config]) => {
          const count = accounts.filter(a => a.root_type === key).length;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
            >
              <Card
                className={`relative overflow-hidden border cursor-pointer transition-all duration-300 hover:shadow-lg ${config.border} ${filterRoot === key ? 'ring-2 ring-offset-1 ring-primary/30 shadow-md' : ''}`}
                onClick={() => setFilterRoot(filterRoot === key ? 'all' : key)}
              >
                <div className={`absolute inset-0 bg-gradient-to-bl ${config.gradient} pointer-events-none`} />
                <CardContent className="p-4 relative">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-2 min-w-0">
                      <p className="text-[11px] font-semibold text-muted-foreground tracking-wide">{config.label}</p>
                      <p className={`text-lg font-bold tabular-nums ${config.accent}`} dir="ltr">
                        {formatCurrency(summaryByRootType[key] || 0)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {count} حساب
                      </p>
                    </div>
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${config.icon}`}>
                      <Layers className="h-4.5 w-4.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Toolbar: Search + Filters ─── */}
      <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-[var(--shadow-xs-ui)] p-3" dir="rtl">
        {/* Row 1: Search + Stats */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md group">
            <div className="absolute start-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center pointer-events-none transition-colors group-focus-within:bg-primary/20">
              <Search className="h-4 w-4 text-primary/70 group-focus-within:text-primary" />
            </div>
            <Input
              placeholder="بحث في الحسابات بالاسم أو الرقم ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pe-13 ps-9 h-11 text-sm rounded-xl border-border/40 bg-background/60 focus:bg-background focus:shadow-[var(--shadow-sm-ui)] transition-all duration-300 placeholder:text-muted-foreground/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-muted/80 hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-all duration-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ms-auto">
            <Badge variant="outline" className="text-[11px] h-8 px-3 rounded-lg border-border/40 bg-muted/30 text-muted-foreground font-medium">
              <FolderTree className="h-3 w-3 ms-1.5 text-primary/60" />
              {filteredAccounts.length} من {totalAccounts}
            </Badge>
          </div>
        </div>

        {/* Row 2: Filter Tabs */}
        <div className="flex items-center gap-1 mt-3 p-1 rounded-xl bg-muted/40 overflow-x-auto">
          <button
            onClick={() => setFilterRoot('all')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-bold transition-all duration-250 whitespace-nowrap ${
              filterRoot === 'all'
                ? 'bg-background text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-border/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            الكل
            <span className={`tabular-nums text-[10px] rounded-md px-1.5 py-0.5 font-semibold ${
              filterRoot === 'all' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/70'
            }`}>{totalAccounts}</span>
          </button>
          {Object.entries(rootTypeConfig).map(([key, config]) => {
            const count = accounts.filter(a => a.root_type === key).length;
            const isActive = filterRoot === key;
            return (
              <button
                key={key}
                onClick={() => setFilterRoot(isActive ? 'all' : key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-bold transition-all duration-250 whitespace-nowrap ${
                  isActive
                    ? 'bg-background text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-border/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: key === 'Asset' ? '#3b82f6' : key === 'Liability' ? '#f59e0b' : key === 'Equity' ? '#8b5cf6' : key === 'Income' ? '#10b981' : '#f43f5e' }} />
                {config.label}
                <span className={`tabular-nums text-[10px] rounded-md px-1.5 py-0.5 font-semibold ${
                  isActive ? `${config.badge}` : 'bg-muted text-muted-foreground/70'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Tree View ─── */}
      <Card className="overflow-hidden border-border/40">
        {/* Table Header */}
        <div className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm px-4 py-2 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40 select-none">
          <span className="flex-1">الحساب</span>
          <span className="w-24 text-center">الرقم</span>
          <span className="w-28 text-center">التصنيف</span>
          <span className="w-[110px] text-start" dir="ltr">الرصيد</span>
          <span className="w-16" />
        </div>

        {isLoading ? (
          <div className="divide-y divide-border/20">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 h-10 px-4 animate-pulse" style={{ paddingRight: `${(i % 3) * 1.25 + 1}rem` }}>
                <div className="h-3.5 w-3.5 rounded bg-muted" />
                <div className="h-3.5 rounded bg-muted flex-1 max-w-[180px]" />
                <div className="h-3 rounded bg-muted w-14" />
                <div className="h-3 rounded bg-muted w-16" />
                <div className="h-3 rounded bg-muted w-20" />
              </div>
            ))}
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="py-14 flex flex-col items-center justify-center text-center">
            <FolderTree className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground/70">لا توجد حسابات</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
              {searchQuery
                ? `لم يتم العثور على نتائج لـ "${searchQuery}"`
                : 'ابدأ بإضافة حساب جديد لبناء دليل الحسابات'
              }
            </p>
            {!searchQuery && (
              <Button
                size="sm"
                className="mt-3 gap-1.5"
                onClick={() => {
                  createForm.reset();
                  if (defaultCompany) createForm.setValue('company', defaultCompany);
                  setCreateDialogOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                إضافة حساب جديد
              </Button>
            )}
          </div>
        ) : (
          <div>
            {Object.entries(groupedAccounts).map(([rootType, rootAccounts]) => {
              const config = rootTypeConfig[rootType];
              if (!config) return null;
              const typeTotal = summaryByRootType[rootType] || 0;
              const typeCount = accounts.filter(a => a.root_type === rootType).length;

              return (
                <Collapsible key={rootType} defaultOpen>
                  <CollapsibleTrigger asChild>
                    <div className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-colors hover:bg-accent/40 border-b border-border/40 ${config.bgLight}`}>
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 [[data-state=closed]>&]:-rotate-90" />
                      <span className={`h-2 w-2 rounded-full shrink-0`} style={{ background: rootType === 'Asset' ? '#3b82f6' : rootType === 'Liability' ? '#f59e0b' : rootType === 'Equity' ? '#8b5cf6' : rootType === 'Income' ? '#10b981' : '#f43f5e' }} />
                      <span className={`font-semibold text-sm ${config.accent}`}>{config.label}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{typeCount}</span>
                      <span className={`font-semibold text-sm tabular-nums ms-auto ${config.accent}`} dir="ltr">
                        {formatCurrency(typeTotal)}
                      </span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {rootAccounts.map(account => (
                      <AccountTreeItem
                        key={account.name}
                        account={account}
                        allAccounts={filteredAccounts}
                        level={0}
                        onEdit={openEdit}
                        onDelete={openDelete}
                        getBalance={getBalance}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </Card>

      {/* ─── Create Dialog ─── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <AccountFormContent
            form={createForm}
            title="إضافة حساب جديد"
            icon={
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
            }
            onSubmit={handleCreate}
            onCancel={() => setCreateDialogOpen(false)}
            isPending={createMutation.isPending}
            submitLabel="حفظ الحساب"
            pendingLabel="جاري الحفظ..."
            defaultCompany={defaultCompany}
          />
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ─── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <AccountFormContent
            form={editForm}
            title="تعديل الحساب"
            icon={
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Edit className="h-4.5 w-4.5" />
              </div>
            }
            onSubmit={handleEdit}
            onCancel={() => setEditDialogOpen(false)}
            isPending={updateMutation.isPending}
            submitLabel="تحديث الحساب"
            pendingLabel="جاري التحديث..."
            defaultCompany={defaultCompany}
          />
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد حذف الحساب</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  سيتم حذف الحساب &quot;{selectedAccount?.account_name || selectedAccount?.name}&quot; نهائياً.
                  هذا الإجراء لا يمكن التراجع عنه.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              variant="destructive" className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
