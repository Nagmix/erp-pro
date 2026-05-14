'use client';

import { useMemo, useState, useCallback } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ModernIcon } from '@/components/ui/modern-icon';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { translateAccountName } from '@/lib/core/arabic-labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Landmark,
  CalendarDays,
  Wallet,
  FileText,
  Users,
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowUpLeft,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Receipt,
} from 'lucide-react';

function SettingsCard({ icon, title, description, href, badge }: { icon: string; title: string; description: string; href: string; badge?: string }) {
  return (
    <Link href={href}>
      <Card className="hover:bg-accent/50 transition-all duration-200 cursor-pointer group h-full border-border/40 hover:border-primary/20 hover:shadow-[var(--shadow-sm-ui)]">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all duration-200">
            <ModernIcon iconify={icon} className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm leading-tight">{title}</div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate">{description}</div>
          </div>
          {badge && (
            <Badge variant="secondary" className="text-[10px] shrink-0">{badge}</Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function KpiStat({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        <p className="text-xs font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

/* ─── مكون إدارة أنواع المصروفات ─── */

type ExpenseTypeRow = {
  name: string;
  expense_claim_type_name?: string;
};

/** أنواع المصروفات الافتراضية الشائعة للمؤسسات اليمنية */
const DEFAULT_EXPENSE_TYPES = [
  'مصاريف إدارية',
  'مصاريف سفر وتنقل',
  'مصاريف ضيافة',
  'مصاريف صيانة',
  'مصاريف نقل وشحن',
  'مصاريف اتصالات',
  'مصاريف قرطاسية ومستلزمات',
  'مصاريف وقود',
  'مصاريف إيجار',
  'مصاريف كهرباء وماء',
  'مصاريف تسويق وإعلان',
  'مصاريف تدريب وتطوير',
  'مصاريف طبية وتأمين',
  'مصاريف مهنية وخدمية',
  'مصاريف متنوعة',
];

function ExpenseTypesManager() {
  const { data: expenseTypes = [], isLoading, isError, error, refetch } = useDocList<ExpenseTypeRow>('Expense Claim Type', {
    fields: ['name'],
    limit: 200,
  });

  const createMutation = useCreateDoc('Expense Claim Type');
  const deleteMutation = useDeleteDoc('Expense Claim Type');

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ExpenseTypeRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [seedingDefaults, setSeedingDefaults] = useState(false);

  /** إضافة أنواع المصروفات الافتراضية دفعة واحدة */
  const handleSeedDefaults = useCallback(async () => {
    setSeedingDefaults(true);
    const existing = new Set(expenseTypes.map(t => t.name));
    const toCreate = DEFAULT_EXPENSE_TYPES.filter(t => !existing.has(t));
    if (toCreate.length === 0) {
      toast.info('جميع أنواع المصروفات الافتراضية موجودة بالفعل');
      setSeedingDefaults(false);
      return;
    }
    let created = 0;
    let failed = 0;
    for (const typeName of toCreate) {
      try {
        await createMutation.mutateAsync({ name: typeName });
        created++;
      } catch {
        failed++;
      }
    }
    if (created > 0) toast.success(`تم إضافة ${created} نوع مصروف بنجاح`);
    if (failed > 0) toast.warning(`فشل إضافة ${failed} نوع`);
    refetch();
    setSeedingDefaults(false);
  }, [expenseTypes, createMutation, refetch]);

  const handleAdd = useCallback(async () => {
    if (!newTypeName.trim()) {
      toast.error('يرجى إدخال اسم نوع المصروف');
      return;
    }
    try {
      // ERPNext Expense Claim Type uses the document name as the type name
      await createMutation.mutateAsync({
        name: newTypeName.trim(),
      });
      toast.success(`تم إضافة نوع المصروف "${newTypeName.trim()}" بنجاح`);
      setNewTypeName('');
      setAddDialogOpen(false);
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل إضافة نوع المصروف';
      if (msg.includes('already exists') || msg.includes('Duplicate') || msg.includes('duplicate')) {
        toast.error('نوع المصروف موجود بالفعل');
      } else {
        toast.error(msg);
      }
    }
  }, [newTypeName, createMutation, refetch]);

  const handleDelete = useCallback(async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteMutation.mutateAsync(toDelete.name);
      toast.success(`تم حذف نوع المصروف "${toDelete.name}" بنجاح`);
      setDeleteDialogOpen(false);
      setToDelete(null);
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل حذف نوع المصروف';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }, [toDelete, deleteMutation, refetch]);

  if (isError) {
    return (
      <div className="mt-4 space-y-4">
        <Alert variant="destructive" className="border-destructive/35 bg-destructive/5">
          <Receipt className="h-4 w-4" />
          <AlertTitle>فشل تحميل أنواع المصروفات</AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="text-sm">{error instanceof Error ? error.message : 'خطأ غير معروف'}</p>
            <p className="text-xs text-muted-foreground">
              قد تكون وحدة الموارد البشرية (HR) غير مثبتة على الخادم. أنواع المصروفات تتطلب تفعيل وحدة الموارد البشرية في النظام.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>إعادة المحاولة</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            أنواع المصروفات
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة أنواع وتصنيفات المصروفات المستخدمة في مطالبات المصروفات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleSeedDefaults} disabled={seedingDefaults}>
            {seedingDefaults ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {seedingDefaults ? 'جاري الإضافة...' : 'إضافة الأنواع الافتراضية'}
          </Button>
          <Button className="gap-2" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة نوع مصروف
          </Button>
        </div>
      </div>

      <Separator />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : expenseTypes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">لا توجد أنواع مصروفات مسجلة</p>
            <p className="text-xs text-muted-foreground mt-1">أضف أنواع المصروفات لتصنيف مطالبات المصروفات</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" className="gap-2" onClick={handleSeedDefaults} disabled={seedingDefaults}>
                {seedingDefaults ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {seedingDefaults ? 'جاري الإضافة...' : 'إضافة الأنواع الافتراضية'}
              </Button>
              <Button variant="secondary" className="gap-2" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                إضافة نوع مخصص
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {expenseTypes.map((type) => (
            <Card key={type.name} className="border-border/40 hover:border-primary/20 transition-all duration-200 group">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Receipt className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{type.name}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => { setToDelete(type); setDeleteDialogOpen(true); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        إجمالي أنواع المصروفات: <strong>{expenseTypes.length}</strong>
      </div>

      {/* حوار إضافة نوع مصروف */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              إضافة نوع مصروف جديد
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">أدخل اسم نوع المصروف الجديد ليتم تسجيله في النظام</p>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="expense-type-name">اسم نوع المصروف</Label>
              <Input
                id="expense-type-name"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="مثال: مصاريف سفر، مصاريف طعام، مصاريف نقل"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              />
              <p className="text-xs text-muted-foreground">سيتم استخدام هذا الاسم في تصنيف مطالبات المصروفات</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار تأكيد الحذف */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد حذف نوع المصروف</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            هل أنت متأكد من حذف نوع المصروف &laquo;{toDelete?.name}&raquo;؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AccountingSettingsPage() {
  const { company: defaultCompany, isLoading: companyLoading } = useDefaultCompanyName();

  /* ── Fetch real ERPNext data ── */
  const { data: fiscalYears = [], isError: fyError, error: fyErr } = useDocList<{ name: string; year_start_date: string; year_end_date: string; disabled: number }>('Fiscal Year', {
    fields: ['name', 'year_start_date', 'year_end_date', 'disabled'],
    limit: 20,
    order_by: 'year_start_date desc',
  });

  const { data: accounts = [] } = useDocList<{ name: string; root_type: string; is_group: number }>('Account', {
    fields: ['name', 'root_type', 'is_group'],
    limit: 500,
  });

  const { data: costCenters = [] } = useDocList<{ name: string }>('Cost Center', {
    fields: ['name'],
    limit: 200,
  });

  const { data: currencies = [] } = useDocList<{ name: string }>('Currency', {
    fields: ['name'],
    limit: 100,
  });

  /* ── Computed stats ── */
  const activeFy = useMemo(() => fiscalYears.find(fy => !fy.disabled), [fiscalYears]);
  const totalLeafAccounts = useMemo(() => accounts.filter(a => !a.is_group).length, [accounts]);
  const rootTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of accounts) {
      if (!a.is_group) {
        counts[a.root_type] = (counts[a.root_type] || 0) + 1;
      }
    }
    return counts;
  }, [accounts]);

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="إعدادات المحاسبة"
        description="إدارة إعدادات وعمومات المحاسبة والمالية"
        iconify="solar:settings-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting/dashboard' }, { label: 'الإعدادات' }]}
      />

      {/* ── Live ERPNext Status ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />
            الوضع المحاسبي الحالي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ListQueryAlert error={fyError ? fyErr : null} onRetry={() => {}} />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <KpiStat icon={Building2} label="الشركة" value={companyLoading ? '...' : (defaultCompany || '—')} accent="bg-primary/10 text-primary" />
            <KpiStat icon={CalendarDays} label="السنة المالية النشطة" value={activeFy ? activeFy.name : '—'} accent="bg-chart-3/10 text-chart-3" />
            <KpiStat icon={FileText} label="إجمالي الحسابات" value={String(totalLeafAccounts)} accent="bg-chart-1/10 text-chart-1" />
            <KpiStat icon={Wallet} label="مراكز التكلفة" value={String(costCenters.length)} accent="bg-chart-5/10 text-chart-5" />
            <KpiStat icon={TrendingUp} label="حسابات الأصول" value={String(rootTypeCounts['Asset'] || 0)} accent="bg-chart-1/10 text-chart-1" />
            <KpiStat icon={TrendingDown} label="حسابات الالتزامات" value={String(rootTypeCounts['Liability'] || 0)} accent="bg-chart-2/10 text-chart-2" />
          </div>
          {activeFy && (
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                من {formatDate(activeFy.year_start_date)} إلى {formatDate(activeFy.year_end_date)}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-chart-3" />
                {currencies.length} عملة مسجلة
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="operations" dir="rtl">
        <TabsList>
          <TabsTrigger value="operations">عمليات المحاسبة</TabsTrigger>
          <TabsTrigger value="general">الإعدادات العامة</TabsTrigger>
          <TabsTrigger value="expense-types">أنواع المصروفات</TabsTrigger>
          <TabsTrigger value="tax">الضرائب والفواتير</TabsTrigger>
        </TabsList>

        <TabsContent value="operations">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:transfer-horizontal-bold-duotone"
              title="التحويل بين الخزائن"
              description="تحويل الأموال بين الخزائن المختلفة"
              href="/accounting/treasury-transfer"
            />
            <SettingsCard
              icon="solar:wallet-money-bold-duotone"
              title="المصاريف اليومية"
              description="تسجيل ومتابعة المصاريف اليومية"
              href="/accounting/daily-expenses"
            />
            <SettingsCard
              icon="solar:lock-keyhole-bold-duotone"
              title="الإغلاق اليومي للخزنة"
              description="إغلاق رصيد الخزنة في نهاية اليوم"
              href="/accounting/treasury-closing"
            />
            <SettingsCard
              icon="solar:calendar-bold-duotone"
              title="إقفال الفترة"
              description="إقفال الفترات المحاسبية ومنع التعديل"
              href="/accounting/period-closing"
            />
            <SettingsCard
              icon="solar:bank-bold-duotone"
              title="التسوية البنكية"
              description="مطابقة كشوف الحسابات البنكية"
              href="/accounting/bank-reconciliation"
            />
            <SettingsCard
              icon="solar:refresh-circle-bold-duotone"
              title="القيود المتكررة"
              description="إدارة القيود المحاسبية المتكررة"
              href="/accounting/recurring-entries"
            />
            <SettingsCard
              icon="solar:shield-keyhole-bold-duotone"
              title="صلاحيات الخزائن"
              description="إدارة صلاحيات الوصول للخزائن"
              href="/accounting/vault-permissions"
            />
            <SettingsCard
              icon="solar:scale-bold-duotone"
              title="الأرصدة الافتتاحية"
              description="إعداد الأرصدة الافتتاحية للحسابات"
              href="/accounting/opening-balances"
            />
            <SettingsCard
              icon="solar:document-text-bold-duotone"
              title="السجل المالي الموحد"
              description="عرض السجل المالي الموحد للشركة"
              href="/accounting/financial-register"
            />
          </div>
        </TabsContent>

        <TabsContent value="general">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:routing-bold-duotone"
              title="توجيه الحسابات"
              description="إعداد توجيه الحسابات الافتراضية"
              href="/settings/account-routing"
            />
            <SettingsCard
              icon="solar:calendar-mark-bold-duotone"
              title="السنوات المالية"
              description="إدارة السنوات المالية والفترات"
              href="/accounting/fiscal-year"
              badge={fiscalYears.length > 0 ? String(fiscalYears.length) : undefined}
            />
            <SettingsCard
              icon="solar:clock-circle-bold-duotone"
              title="الإيرادات المؤجلة"
              description="إدارة الإيرادات المؤجلة والمعترف بها"
              href="/accounting/deferred-revenue"
            />
            <SettingsCard
              icon="solar:dollar-minimalistic-bold-duotone"
              title="متعدد العملات"
              description="إعدادات العملات وأسعار الصرف"
              href="/accounting/multi-currency"
              badge={currencies.length > 0 ? String(currencies.length) : undefined}
            />
            <SettingsCard
              icon="solar:card-recive-bold-duotone"
              title="الشيكات والدفاتر"
              description="إدارة الشيكات ودفاتر الشيكات"
              href="/accounting/cheque-books"
            />
            <SettingsCard
              icon="solar:lock-bold-duotone"
              title="إقفال الفترات المتقدم"
              description="إقفال متقدم للفترات المحاسبية"
              href="/accounting/period-closing-v2"
            />
            <SettingsCard
              icon="solar:chart-bold-duotone"
              title="الميزانيات"
              description="إعداد ومتابعة الميزانيات"
              href="/accounting/budgets"
            />
            <SettingsCard
              icon="solar:book-2-bold-duotone"
              title="دليل الحسابات"
              description="إدارة الهيكل المحاسبي وشجرة الحسابات"
              href="/accounting/chart-of-accounts"
              badge={totalLeafAccounts > 0 ? String(totalLeafAccounts) : undefined}
            />
            <SettingsCard
              icon="solar:buildings-3-bold-duotone"
              title="مراكز التكلفة"
              description="إدارة مراكز التكلفة والتقسيمات"
              href="/accounting/cost-centers"
              badge={costCenters.length > 0 ? String(costCenters.length) : undefined}
            />
          </div>
        </TabsContent>

        <TabsContent value="expense-types">
          <ExpenseTypesManager />
        </TabsContent>

        <TabsContent value="tax">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <SettingsCard
              icon="solar:percent-bold-duotone"
              title="معدلات الضريبة"
              description="إعداد معدلات الضرائب المختلفة"
              href="/settings/tax-rates"
            />
            <SettingsCard
              icon="solar:clipboard-list-bold-duotone"
              title="قواعد الضرائب"
              description="إعداد قواعد تطبيق الضرائب"
              href="/settings/tax-rules"
            />
            <SettingsCard
              icon="solar:document-bold-duotone"
              title="الإقرار الضريبي"
              description="إعداد وتقديم الإقرارات الضريبية"
              href="/accounting/tax-declaration"
            />
            <SettingsCard
              icon="solar:flag-bold-duotone"
              title="تكوين الضرائب اليمنية"
              description="إعدادات الضرائب الخاصة باليمن"
              href="/settings/yemen-tax-config"
            />
            <SettingsCard
              icon="solar:bell-bold-duotone"
              title="قواعد الإرسال الآلي"
              description="إعداد قواعد التنبيهات والإرسال الآلي"
              href="/settings/notification-rules"
            />
            <SettingsCard
              icon="solar:letter-bold-duotone"
              title="إعدادات البريد SMTP"
              description="تكوين خادم البريد الإلكتروني"
              href="/settings/email-smtp"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
