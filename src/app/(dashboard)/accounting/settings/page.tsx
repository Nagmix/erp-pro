'use client';

import { useMemo, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/erp/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { formatDate } from '@/lib/core/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Landmark,
  CalendarDays,
  Wallet,
  FileText,
  Building2,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Plus,
  Trash2,
  Loader2,
  Receipt,
  AlertTriangle,
  Route,
  Globe,
  Scale,
  Shield,
  Percent,
  ClipboardList,
  FileBadge,
  Flag,
  Settings,
  ChevronLeft,
} from 'lucide-react';

/* ─── أنواع الإعدادات المسموح بها ─── */
type SettingItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
};

/* ─── مجموعات الإعدادات الحقيقية ─── */
const SETTINGS_GROUPS = {
  general: {
    label: 'إعدادات عامة',
    items: [
      { title: 'توجيه الحسابات', description: 'ربط الحسابات الافتراضية بأنواع المستندات', href: '/settings/account-routing', icon: Route },
      { title: 'السنوات المالية', description: 'إدارة السنوات المالية والفترات المحاسبية', href: '/accounting/fiscal-year', icon: CalendarDays },
      { title: 'متعدد العملات', description: 'إعدادات العملات وأسعار الصرف', href: '/accounting/multi-currency', icon: Globe },
      { title: 'الأرصدة الافتتاحية', description: 'إعداد أرصدة الحسابات الافتتاحية', href: '/accounting/opening-balances', icon: Scale },
      { title: 'صلاحيات الخزائن', description: 'إدارة صلاحيات الوصول للخزائن', href: '/accounting/vault-permissions', icon: Shield },
    ] as SettingItem[],
  },
  tax: {
    label: 'الضرائب',
    items: [
      { title: 'معدلات الضريبة', description: 'إعداد معدلات الضرائب المختلفة', href: '/settings/tax-rates', icon: Percent },
      { title: 'قواعد الضرائب', description: 'إعداد قواعد تطبيق الضرائب', href: '/settings/tax-rules', icon: ClipboardList },
      { title: 'الإقرار الضريبي', description: 'إعداد وتقديم الإقرارات الضريبية', href: '/accounting/tax-declaration', icon: FileBadge },
      { title: 'تكوين الضرائب اليمنية', description: 'إعدادات الضرائب الخاصة باليمن', href: '/settings/yemen-tax-config', icon: Flag },
    ] as SettingItem[],
  },
};

/* ─── مكون بطاقة الإعداد الاحترافية ─── */
function SettingCard({ item }: { item: SettingItem }) {
  const Icon = item.icon;
  return (
    <Link href={item.href}>
      <Card className="group h-full border-border/30 bg-card hover:bg-accent/30 transition-all duration-200 cursor-pointer hover:border-primary/20 hover:shadow-sm">
        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary/70 group-hover:bg-primary/15 group-hover:text-primary transition-colors duration-200">
            <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[13px] sm:text-sm leading-tight">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5 shrink-0">{item.badge}</Badge>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{item.description}</p>
          </div>
          <ChevronLeft className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/50 shrink-0 transition-colors" />
        </CardContent>
      </Card>
    </Link>
  );
}

/* ─── مؤشر الأداء المصغر ─── */
function KpiChip({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${accent}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] leading-tight opacity-70">{label}</p>
        <p className="text-xs font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
      <Skeleton className="h-3.5 w-3.5 rounded shrink-0" />
      <div className="space-y-1">
        <Skeleton className="h-2 w-12 rounded" />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
    </div>
  );
}

/* ─── مكون إدارة أنواع المصروفات ─── */

type ExpenseTypeRow = {
  name: string;
  expense_claim_type_name?: string;
  expense_type?: string;
  default_account?: string;
  accounts?: Array<{ company: string; default_account: string }>;
};

const DEFAULT_EXPENSE_TYPE_NAMES = [
  'مصاريف إدارية', 'مصاريف سفر وتنقل', 'مصاريف ضيافة', 'مصاريف صيانة',
  'مصاريف نقل وشحن', 'مصاريف اتصالات', 'مصاريف قرطاسية ومستلزمات', 'مصاريف وقود',
  'مصاريف إيجار', 'مصاريف كهرباء وماء', 'مصاريف تسويق وإعلان', 'مصاريف تدريب وتطوير',
  'مصاريف طبية وتأمين', 'مصاريف مهنية وخدمية', 'مصاريف متنوعة',
];

function ExpenseTypesManager({ autoOpenCreate }: { autoOpenCreate?: boolean }) {
  const { company: defaultCompany } = useDefaultCompanyName();
  const { data: expenseTypes = [], isLoading, isError, error, refetch } = useDocList<ExpenseTypeRow>('Expense Claim Type', {
    fields: ['name', 'expense_type'],
    limit: 200,
  });
  const createMutation = useCreateDoc('Expense Claim Type');
  const deleteMutation = useDeleteDoc('Expense Claim Type');

  const [addDialogOpen, setAddDialogOpen] = useState(autoOpenCreate ?? false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeAccount, setNewTypeAccount] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ExpenseTypeRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [seedingDefaults, setSeedingDefaults] = useState(false);
  const [configuringAccounts, setConfiguringAccounts] = useState(false);

  const handleSeedDefaults = useCallback(async () => {
    setSeedingDefaults(true);
    const existing = new Set(expenseTypes.map(t => t.name));
    const toCreate = DEFAULT_EXPENSE_TYPE_NAMES.filter(t => !existing.has(t));
    if (toCreate.length === 0) {
      toast.info('جميع أنواع المصروفات الافتراضية موجودة بالفعل');
      setSeedingDefaults(false);
      return;
    }
    let created = 0, failed = 0;
    for (const typeName of toCreate) {
      try { await createMutation.mutateAsync({ expense_type: typeName }); created++; }
      catch { failed++; }
    }
    if (created > 0) toast.success(`تم إضافة ${created} نوع مصروف بنجاح`);
    if (failed > 0) toast.warning(`فشل إضافة ${failed} نوع`);
    refetch();
    setSeedingDefaults(false);
    if (created > 0) handleConfigureAccounts();
  }, [expenseTypes, createMutation, refetch]);

  const handleConfigureAccounts = useCallback(async () => {
    setConfiguringAccounts(true);
    try {
      const res = await fetch('/api/setup/configure-expense-accounts', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.updated > 0 ? (data.message || `تم تعيين الحسابات لـ ${data.updated} نوع`) : (data.message || 'جميع الأنواع لديها حسابات'));
        refetch();
      } else {
        toast.error(data.error || 'فشل تعيين الحسابات');
      }
    } catch { toast.error('تعذر الاتصال بالخادم'); }
    finally { setConfiguringAccounts(false); }
  }, [refetch]);

  const handleAdd = useCallback(async () => {
    if (!newTypeName.trim()) { toast.error('يرجى إدخال اسم نوع المصروف'); return; }
    try {
      const payload: Record<string, unknown> = { expense_type: newTypeName.trim() };
      if (newTypeAccount?.trim() && defaultCompany) {
        payload.accounts = [{ company: defaultCompany, default_account: newTypeAccount.trim() }];
      }
      await createMutation.mutateAsync(payload);
      toast.success(`تم إضافة نوع المصروف "${newTypeName.trim()}"`);
      setNewTypeName(''); setNewTypeAccount(''); setAddDialogOpen(false); refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل إضافة نوع المصروف';
      toast.error(msg.includes('already exists') || msg.includes('Duplicate') ? 'نوع المصروف موجود بالفعل' : msg);
    }
  }, [newTypeName, newTypeAccount, defaultCompany, createMutation, refetch]);

  const handleDelete = useCallback(async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteMutation.mutateAsync(toDelete.name);
      toast.success(`تم حذف "${toDelete.name}"`);
      setDeleteDialogOpen(false); setToDelete(null); refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'فشل الحذف'); }
    finally { setDeleting(false); }
  }, [toDelete, deleteMutation, refetch]);

  if (isError) {
    return (
      <Alert variant="destructive" className="mt-4 border-destructive/35 bg-destructive/5">
        <Receipt className="h-4 w-4" />
        <AlertTitle>فشل تحميل أنواع المصروفات</AlertTitle>
        <AlertDescription className="space-y-2">
          <p className="text-sm">{error instanceof Error ? error.message : 'خطأ غير معروف'}</p>
          <p className="text-xs text-muted-foreground">قد تكون وحدة HR غير مثبتة. أنواع المصروفات تتطلب تفعيل وحدة الموارد البشرية.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>إعادة المحاولة</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const typesWithoutAccount = expenseTypes.filter(t => {
    const hasAccount = !!t.default_account || (Array.isArray(t.accounts) && t.accounts.some(a => a.default_account));
    return !hasAccount;
  });

  return (
    <div className="space-y-4">
      {/* شريط الإجراءات */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium">{expenseTypes.length} نوع مسجل</span>
          {typesWithoutAccount.length > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/5 text-[10px]">
              {typesWithoutAccount.length} بدون حساب
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleConfigureAccounts} disabled={configuringAccounts}>
            {configuringAccounts ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Landmark className="h-3.5 w-3.5" />}
            تعيين الحسابات
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSeedDefaults} disabled={seedingDefaults}>
            {seedingDefaults ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            الأنواع الافتراضية
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            إضافة نوع
          </Button>
        </div>
      </div>

      {/* تنبيه الأنواع بدون حسابات */}
      {typesWithoutAccount.length > 0 && (
        <Alert className="border-amber-500/30 bg-amber-500/5 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          <AlertDescription className="text-xs">
            يوجد {typesWithoutAccount.length} نوع بدون حساب افتراضي. اضغط «تعيين الحسابات» للتعيين التلقائي.
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      {/* قائمة الأنواع */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/30">
              <CardContent className="p-3 flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-2.5 w-16 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : expenseTypes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد أنواع مصروفات مسجلة</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleSeedDefaults} disabled={seedingDefaults}>
                <Plus className="h-3 w-3" /> إضافة الأنواع الافتراضية
              </Button>
              <Button size="sm" variant="secondary" className="gap-1.5 text-xs" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-3 w-3" /> إضافة نوع مخصص
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {expenseTypes.map((type) => {
            const hasAccount = !!type.default_account || (Array.isArray(type.accounts) && type.accounts.some(a => a.default_account));
            const accountDisplay = type.default_account
              || (Array.isArray(type.accounts) && type.accounts.find(a => a.default_account)?.default_account)
              || '';
            return (
              <Card key={type.name} className={`border-border/30 group ${!hasAccount ? 'border-amber-500/20 bg-amber-500/[0.02]' : ''}`}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${hasAccount ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-500'}`}>
                      {hasAccount ? <Receipt className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate">{type.name}</p>
                      {accountDisplay ? (
                        <p className="text-[10px] text-muted-foreground truncate">{accountDisplay}</p>
                      ) : (
                        <p className="text-[10px] text-amber-600">بدون حساب</p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={()=> { setToDelete(type); setDeleteDialogOpen(true); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* حوار إضافة */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-primary" /> إضافة نوع مصروف جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="et-name" className="text-xs">اسم نوع المصروف</Label>
              <Input id="et-name" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="مثال: مصاريف سفر" className="h-9 text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="et-acct" className="text-xs">الحساب الافتراضي (اختياري)</Label>
              <Input id="et-acct" value={newTypeAccount} onChange={(e) => setNewTypeAccount(e.target.value)}
                placeholder="اسم حساب المصروف من شجرة الحسابات" className="h-9 text-sm" />
              <p className="text-[10px] text-muted-foreground">يمكنك تعيينه لاحقاً عبر «تعيين الحسابات»</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(false)}>إلغاء</Button>
            <Button size="sm" onClick={handleAdd} disabled={createMutation.isPending} className="gap-1.5">
              {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار تأكيد الحذف */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-[380px]">
          <DialogHeader><DialogTitle className="text-base">تأكيد الحذف</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            هل أنت متأكد من حذف &laquo;{toDelete?.name}&raquo;؟ لا يمكن التراجع.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>إلغاء</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="gap-1.5">
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── المحتوى الرئيسي ─── */
function AccountingSettingsContent() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const shouldAutoCreate = searchParams.get('create') === '1';

  const initialTab = tabFromUrl === 'expense-types' ? 'expense-types'
    : tabFromUrl === 'tax' ? 'tax'
    : 'general';

  const { company: defaultCompany, isLoading: companyLoading } = useDefaultCompanyName();

  const { data: fiscalYears = [], isError: fyError, error: fyErr } = useDocList<{ name: string; year_start_date: string; year_end_date: string; disabled: number }>('Fiscal Year', {
    fields: ['name', 'year_start_date', 'year_end_date', 'disabled'],
    limit: 20, order_by: 'year_start_date desc',
  });
  const { data: accounts = [], isLoading: accountsLoading } = useDocList<{ name: string; root_type: string; is_group: number }>('Account', {
    fields: ['name', 'root_type', 'is_group'], limit: 500,
  });
  const { data: costCenters = [] } = useDocList<{ name: string }>('Cost Center', { fields: ['name'], limit: 200 });
  const { data: currencies = [] } = useDocList<{ name: string }>('Currency', { fields: ['name'], limit: 100 });

  const activeFy = useMemo(() => fiscalYears.find(fy => !fy.disabled), [fiscalYears]);
  const totalLeafAccounts = useMemo(() => accounts.filter(a => !a.is_group).length, [accounts]);
  const rootTypeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of accounts) { if (!a.is_group) c[a.root_type] = (c[a.root_type] || 0) + 1; }
    return c;
  }, [accounts]);

  // إضافة badge للسنوات المالية والعملات
  const generalItems: SettingItem[] = useMemo(() => SETTINGS_GROUPS.general.items.map(item => {
    if (item.href === '/accounting/fiscal-year' && fiscalYears.length > 0) return { ...item, badge: String(fiscalYears.length) };
    if (item.href === '/accounting/multi-currency' && currencies.length > 0) return { ...item, badge: String(currencies.length) };
    return item;
  }), [fiscalYears.length, currencies.length]);

  const taxItems = SETTINGS_GROUPS.tax.items;
  const isKpiLoading = companyLoading || accountsLoading;

  return (
    <div className="erp-page-enter space-y-4" dir="rtl">
      <PageHeader
        title="إعدادات المحاسبة"
        description="ضبط إعدادات الحسابات والضرائب والتكوين المحاسبي"
        iconify="solar:settings-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting/dashboard' }, { label: 'الإعدادات' }]}
      />

      {/* ── شريط الحالة المحاسبي ── */}
      <div className="flex flex-wrap gap-2">
        {isKpiLoading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiChip icon={Building2} label="الشركة" value={defaultCompany || '—'} accent="bg-primary/8 text-primary" />
            <KpiChip icon={CalendarDays} label="السنة المالية" value={activeFy?.name || '—'} accent="bg-chart-3/8 text-chart-3" />
            <KpiChip icon={FileText} label="الحسابات" value={String(totalLeafAccounts)} accent="bg-chart-1/8 text-chart-1" />
            <KpiChip icon={Wallet} label="مراكز التكلفة" value={String(costCenters.length)} accent="bg-chart-5/8 text-chart-5" />
            {activeFy && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                <span>{formatDate(activeFy.year_start_date)} — {formatDate(activeFy.year_end_date)}</span>
              </div>
            )}
          </>
        )}
      </div>

      <ListQueryAlert error={fyError ? fyErr : null} onRetry={() => {}} />

      {/* ── التبويبات ── */}
      <Tabs defaultValue={initialTab} dir="rtl">
        <TabsList className="h-9 p-0.5 bg-muted/40 w-full overflow-x-auto scrollbar-none">
          <TabsTrigger value="general" className="text-xs h-8 px-3 gap-1.5 shrink-0">
            <Settings className="h-3.5 w-3.5" />
            <span>إعدادات عامة</span>
          </TabsTrigger>
          <TabsTrigger value="tax" className="text-xs h-8 px-3 gap-1.5 shrink-0">
            <Percent className="h-3.5 w-3.5" />
            <span>الضرائب</span>
          </TabsTrigger>
          <TabsTrigger value="expense-types" className="text-xs h-8 px-3 gap-1.5 shrink-0">
            <Receipt className="h-3.5 w-3.5" />
            <span>أنواع المصروفات</span>
          </TabsTrigger>
        </TabsList>

        {/* ── إعدادات عامة ── */}
        <TabsContent value="general" className="mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {generalItems.map((item) => (
              <SettingCard key={item.href} item={item} />
            ))}
          </div>
        </TabsContent>

        {/* ── الضرائب ── */}
        <TabsContent value="tax" className="mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {taxItems.map((item) => (
              <SettingCard key={item.href} item={item} />
            ))}
          </div>
        </TabsContent>

        {/* ── أنواع المصروفات ── */}
        <TabsContent value="expense-types" className="mt-3">
          <ExpenseTypesManager autoOpenCreate={shouldAutoCreate && initialTab === 'expense-types'} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── الصفحة مع Suspense ─── */
export default function AccountingSettingsPage() {
  return (
    <Suspense fallback={
      <div className="erp-page-enter space-y-4 p-6" dir="rtl">
        <Skeleton className="h-7 w-40 rounded" />
        <Skeleton className="h-4 w-56 rounded" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
        <Skeleton className="h-9 w-72 rounded-lg" />
      </div>
    }>
      <AccountingSettingsContent />
    </Suspense>
  );
}
