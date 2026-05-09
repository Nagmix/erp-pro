'use client';

import { useState, useMemo, useEffect } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Percent,
  Plus,
  Loader2,
  FileText,
  Download,
  ToggleLeft,
  ToggleRight,
  Calculator,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowDownUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { formatCurrency } from '@/lib/app-format';
import { apiSetupTaxPackage, type SetupTaxPackageData } from '@/lib/client/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDefaultCompanyName } from '@/lib/erp/default-company';

/* ─── Types ─── */
interface AccountRow {
  name: string;
  account_name: string;
  account_type: string;
  parent_account: string;
  is_group: number;
  tax_rate?: number;
  disabled: number | boolean;
}

interface SalesTaxTemplateRow {
  name: string;
  title: string;
  company: string;
  disabled?: number | boolean;
}

interface PurchaseTaxTemplateRow {
  name: string;
  title: string;
  company: string;
  disabled?: number | boolean;
}

interface SalesInvoiceRow {
  name: string;
  posting_date: string;
  total_taxes_and_charges: number;
  grand_total: number;
  docstatus: number;
}

interface PurchaseInvoiceRow {
  name: string;
  posting_date: string;
  total_taxes_and_charges: number;
  grand_total: number;
  docstatus: number;
}

/* Yemen standard tax rates */
const YEMEN_TAX_PRESETS = [
  { label: 'ضريبة القيمة المضافة 5%', rate: 5, name: 'ضريبة القيمة المضافة' },
  { label: 'ضريبة الخصم 2%', rate: 2, name: 'ضريبة الخصم عند المصدر' },
  { label: 'الرسم التنموي 1%', rate: 1, name: 'الرسم التنموي' },
  { label: 'ضريبة القيمة المضافة 15%', rate: 15, name: 'ضريبة القيمة المضافة 15%' },
];

/* Tax settings stored locally */
type YemenTaxSettings = {
  defaultSalesTax: string;
  defaultPurchaseTax: string;
  autoApplyTax: boolean;
  taxInclusivePricing: boolean;
  trn: string;
};

const SETTINGS_KEY = 'erp_yemen_tax_settings';
const defaultSettings: YemenTaxSettings = {
  defaultSalesTax: '',
  defaultPurchaseTax: '',
  autoApplyTax: false,
  taxInclusivePricing: true,
  trn: '',
};

function loadSettings(): YemenTaxSettings {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(s: YemenTaxSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export default function YemenTaxConfigPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { company: defaultCompany } = useDefaultCompanyName();

  const [company, setCompany] = useState('');
  const [settings, setSettings] = useState<YemenTaxSettings>(() => typeof window !== 'undefined' ? loadSettings() : defaultSettings);

  // Tax setup form
  const [taxTitle, setTaxTitle] = useState('');
  const [taxRate, setTaxRate] = useState('5');
  const [lastSetup, setLastSetup] = useState<SetupTaxPackageData | null>(null);

  // Template create dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({ title: '', type: 'sales' as 'sales' | 'purchase' });

  // Tax rate dialog
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<typeof YEMEN_TAX_PRESETS[0] | null>(null);

  const effectiveCompany = company || defaultCompany || '';

  useEffect(() => {
    if (defaultCompany && !company) queueMicrotask(() => setCompany(defaultCompany));
  }, [defaultCompany, company]);



  const companyFilter = effectiveCompany ? [['company', '=', effectiveCompany] as [string, string, string]] : undefined;

  /* ──── ERPNext data hooks ──── */
  const { data: taxAccounts = [], isLoading: accountsLoading, isError: accountsError, error: accountsErr, refetch: refetchAccounts } = useDocList<AccountRow>('Account', {
    fields: ['name', 'account_name', 'account_type', 'parent_account', 'is_group', 'disabled'],
    filters: [['account_type', '=', 'Tax']],
    limit: 200,
  });

  const { data: salesTemplates = [], isLoading: salesLoading } = useDocList<SalesTaxTemplateRow>('Sales Taxes and Charges Template', {
    fields: ['name', 'title', 'company'],
    filters: companyFilter,
    limit: 200,
    enabled: Boolean(effectiveCompany),
  });

  const { data: purchaseTemplates = [], isLoading: purchaseLoading } = useDocList<PurchaseTaxTemplateRow>('Purchase Taxes and Charges Template', {
    fields: ['name', 'title', 'company'],
    filters: companyFilter,
    limit: 200,
    enabled: Boolean(effectiveCompany),
  });

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const { data: salesInvoices = [], isLoading: salesInvLoading } = useDocList<SalesInvoiceRow>('Sales Invoice', {
    fields: ['name', 'posting_date', 'total_taxes_and_charges', 'grand_total', 'docstatus'],
    filters: [['posting_date', '>=', firstOfMonth], ['docstatus', '=', 1]] as string[][],
    limit: 500,
  });

  const { data: purchaseInvoices = [], isLoading: purchaseInvLoading } = useDocList<PurchaseInvoiceRow>('Purchase Invoice', {
    fields: ['name', 'posting_date', 'total_taxes_and_charges', 'grand_total', 'docstatus'],
    filters: [['posting_date', '>=', firstOfMonth], ['docstatus', '=', 1]] as string[][],
    limit: 500,
  });

  const createTemplateSales = useCreateDoc('Sales Taxes and Charges Template');
  const createTemplatePurchase = useCreateDoc('Purchase Taxes and Charges Template');
  const deleteSalesTemplate = useDeleteDoc('Sales Taxes and Charges Template');
  const deletePurchaseTemplate = useDeleteDoc('Purchase Taxes and Charges Template');
  const updateAccount = useUpdateDoc('Account');

  /* ──── Tax setup mutation ──── */
  const setupMutation = useMutation({
    mutationFn: () =>
      apiSetupTaxPackage({
        company: effectiveCompany,
        title: taxTitle.trim(),
        rate: Number(taxRate),
      }),
    onSuccess: (data) => {
      setLastSetup(data);
      toast({
        title: 'تم إعداد الضريبة بالكامل',
        description: `قوالب: ${data.salesTaxTemplateTitle}، ${data.purchaseTaxTemplateTitle}`,
      });
      qc.invalidateQueries({ queryKey: ['docList', 'Account'] });
      qc.invalidateQueries({ queryKey: ['docList', 'Sales Taxes and Charges Template'] });
      qc.invalidateQueries({ queryKey: ['docList', 'Purchase Taxes and Charges Template'] });
      setTaxTitle('');
      setTaxRate('5');
    },
    onError: (e: Error) => {
      toast({ title: 'فشل الإعداد', description: e.message, variant: 'destructive' });
    },
  });

  /* ──── KPI calculations ──── */
  const activeTaxAccounts = taxAccounts.filter(a => !Boolean(a.disabled)).length;
  const totalTemplates = salesTemplates.length + purchaseTemplates.length;
  const salesTaxThisMonth = salesInvoices.reduce((sum, inv) => sum + (inv.total_taxes_and_charges || 0), 0);
  const purchaseTaxThisMonth = purchaseInvoices.reduce((sum, inv) => sum + (inv.total_taxes_and_charges || 0), 0);

  /* ──── Tax Filing Calculations ──── */
  const netTaxPayable = salesTaxThisMonth - purchaseTaxThisMonth;

  /* ──── Handlers ──── */
  const handlePresetSetup = (preset: typeof YEMEN_TAX_PRESETS[0]) => {
    setTaxTitle(preset.name);
    setTaxRate(String(preset.rate));
    setSelectedPreset(preset);
    setTaxDialogOpen(true);
  };

  const handleToggleAccount = async (account: AccountRow) => {
    try {
      const newVal = Boolean(account.disabled) ? 0 : 1;
      await updateAccount.mutateAsync({ name: account.name, doc: { disabled: newVal } });
      toast({ title: 'تم بنجاح', description: Boolean(account.disabled) ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    }
  };

  const handleSaveSettings = () => {
    saveSettings(settings);
    toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات الضرائب اليمنية' });
  };

  const handleExportFiling = () => {
    const filingData = {
      period: `${firstOfMonth} - ${now.toISOString().slice(0, 10)}`,
      company: effectiveCompany,
      salesTaxCollected: salesTaxThisMonth,
      purchaseTaxPaid: purchaseTaxThisMonth,
      netTaxPayable,
      trn: settings.trn,
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(filingData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-filing-${firstOfMonth}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'تم التصدير', description: 'تم تصدير الإقرار الضريبي بنجاح' });
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="إعدادات الضرائب اليمنية"
        description="إدارة معدلات الضرائب والقوالب والإقرارات الضريبية حسب النظام اليمني"
        iconify="solar:document-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'الضرائب اليمنية' }]}
      />

      <ListQueryAlert error={accountsError ? accountsErr : null} onRetry={() => refetchAccounts()} />

      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard
          title="حسابات الضريبة النشطة"
          value={activeTaxAccounts}
          icon={Percent}
          accent="success"
        />
        <KpiCard
          title="قوالب الضريبة"
          value={totalTemplates}
          icon={FileText}
          accent="info"
        />
        <KpiCard
          title="ضريبة المبيعات هذا الشهر"
          value={formatCurrency(salesTaxThisMonth)}
          icon={Calculator}
          accent="primary"
        />
        <KpiCard
          title="ضريبة المشتريات هذا الشهر"
          value={formatCurrency(purchaseTaxThisMonth)}
          icon={Building2}
          accent="warning"
        />
      </KpiStrip>

      <Tabs defaultValue="rates" dir="rtl">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/35 p-1">
          <TabsTrigger value="rates" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Percent className="h-3.5 w-3.5" />
            معدلات الضريبة
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <FileText className="h-3.5 w-3.5" />
            قوالب الضريبة
          </TabsTrigger>
          <TabsTrigger value="filing" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Calculator className="h-3.5 w-3.5" />
            الإقرار الضريبي
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <ToggleLeft className="h-3.5 w-3.5" />
            إعدادات الضريبة
          </TabsTrigger>
        </TabsList>

        {/* ═══ Tax Rates Tab ═══ */}
        <TabsContent value="rates" className="space-y-4">
          {/* Yemen Standard Presets */}
          <Card className="border-amber-500/20 bg-amber-500/[0.03]">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-amber-500/15 p-2.5">
                  <Percent className="h-5 w-5 text-amber-600" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-semibold">المعدلات الضريبية اليمنية المعيارية</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    إعداد سريع لمعدلات الضرائب حسب النظام الضريبي اليمني — يتم إنشاء حسابات GL وقوالب المبيعات والمشتريات تلقائياً
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {YEMEN_TAX_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    className="h-auto py-3 px-4 flex flex-col items-start gap-1.5 text-start"
                    onClick={() => handlePresetSetup(preset)}
                  >
                    <span className="text-sm font-semibold">{preset.label}</span>
                    <span className="text-[10px] text-muted-foreground">{preset.name}</span>
                  </Button>
                ))}
              </div>

              {effectiveCompany && (
                <div className="grid gap-3 sm:grid-cols-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">الشركة</Label>
                    <Input className="h-9 text-xs" value={effectiveCompany} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">اسم الضريبة</Label>
                    <Input className="h-9 text-xs" placeholder="مثال: ضريبة القيمة المضافة 5%" value={taxTitle} onChange={e => setTaxTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">النسبة %</Label>
                    <Input className="h-9 text-xs" type="number" step="0.01" min={0} max={100} dir="ltr" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
                  </div>
                </div>
              )}

              <Button
                disabled={setupMutation.isPending || !effectiveCompany || !taxTitle.trim()}
                onClick={() => setupMutation.mutate()}
                className="gap-1.5"
              >
                {setupMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                إنشاء حسابات وقوالب الضريبة
              </Button>
            </CardContent>
          </Card>

          {/* Last setup summary */}
          {lastSetup && (
            <Card className="border-border/60 bg-muted/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">آخر عملية إعداد</h2>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setLastSetup(null)}>إخفاء</Button>
                </div>
                <dl className="grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">قالب المبيعات</dt>
                    <dd className="font-mono text-[11px]">{lastSetup.salesTaxTemplateName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">قالب المشتريات</dt>
                    <dd className="font-mono text-[11px]">{lastSetup.purchaseTaxTemplateName ?? '—'}</dd>
                  </div>
                </dl>
                {lastSetup.accounts.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">حسابات GL</p>
                    <ul className="space-y-1 font-mono text-[11px]">
                      {lastSetup.accounts.map((a, i) => (
                        <li key={a.name} className="flex items-center gap-2">
                          <span className="text-muted-foreground w-16 shrink-0">
                            {a.role === 'output' ? 'مخرجات' : a.role === 'input' ? 'مدخلات' : 'صافي'}
                          </span>
                          <span className="break-all">{a.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tax Accounts from ERPNext */}
          <div>
            <h3 className="text-sm font-semibold mb-3">حسابات الضريبة المسجلة</h3>
            {accountsLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> جاري التحميل...
              </div>
            ) : taxAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                لا توجد حسابات ضريبية مسجلة. استخدم المعدلات المعيارية أعلاه لإعدادها.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-5 gap-2 text-xs font-semibold">
                  <div>اسم الحساب</div>
                  <div>نوع الحساب</div>
                  <div>الحساب الأب</div>
                  <div>مجموعة</div>
                  <div>الحالة</div>
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {taxAccounts.map((acc) => {
                    const isActive = !Boolean(acc.disabled);
                    return (
                      <div key={acc.name} className="px-4 py-3 grid grid-cols-5 gap-2 items-center border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                        <span className="text-sm font-medium truncate">{acc.account_name || acc.name}</span>
                        <span className="text-xs text-muted-foreground">{acc.account_type}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{acc.parent_account}</span>
                        <span className="text-xs">{acc.is_group ? 'نعم' : 'لا'}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] border-0 ${isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                            {isActive ? 'نشط' : 'معطّل'}
                          </Badge>
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => handleToggleAccount(acc)}
                            className="scale-75"
                            disabled={updateAccount.isPending}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ Tax Templates Tab ═══ */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Sales Tax Templates */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-emerald-600" />
                    </div>
                    قوالب ضريبة المبيعات
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">{salesTemplates.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {salesLoading ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل...
                  </div>
                ) : salesTemplates.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">لا توجد قوالب مبيعات</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {salesTemplates.map((t) => (
                      <div key={t.name} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/20 transition-colors">
                        <div>
                          <p className="text-xs font-medium">{t.title || t.name}</p>
                          <p className="text-[10px] text-muted-foreground">{t.company}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] border-0 bg-emerald-500/10 text-emerald-600">مبيعات</Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={async () => {
                            try {
                              await deleteSalesTemplate.mutateAsync(t.name);
                              toast({ title: 'تم الحذف' });
                            } catch (e) {
                              toast({ title: 'فشل الحذف', description: e instanceof Error ? e.message : 'خطأ', variant: 'destructive' });
                            }
                          }}>
                            <AlertTriangle className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Purchase Tax Templates */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-amber-600" />
                    </div>
                    قوالب ضريبة المشتريات
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">{purchaseTemplates.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {purchaseLoading ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل...
                  </div>
                ) : purchaseTemplates.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">لا توجد قوالب مشتريات</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {purchaseTemplates.map((t) => (
                      <div key={t.name} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/20 transition-colors">
                        <div>
                          <p className="text-xs font-medium">{t.title || t.name}</p>
                          <p className="text-[10px] text-muted-foreground">{t.company}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] border-0 bg-amber-500/10 text-amber-600">مشتريات</Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={async () => {
                            try {
                              await deletePurchaseTemplate.mutateAsync(t.name);
                              toast({ title: 'تم الحذف' });
                            } catch (e) {
                              toast({ title: 'فشل الحذف', description: e instanceof Error ? e.message : 'خطأ', variant: 'destructive' });
                            }
                          }}>
                            <AlertTriangle className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setTemplateDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              إنشاء قالب جديد
            </Button>
          </div>
        </TabsContent>

        {/* ═══ Tax Filing Tab ═══ */}
        <TabsContent value="filing" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-emerald-500/20">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-xs font-medium">ضريبة المبيعات المحصّلة</p>
                </div>
                <p className="text-xl font-bold">{formatCurrency(salesTaxThisMonth)}</p>
                <p className="text-[10px] text-muted-foreground">خلال الشهر الحالي</p>
              </CardContent>
            </Card>

            <Card className="border-amber-500/20">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-amber-600">
                  <Building2 className="h-4 w-4" />
                  <p className="text-xs font-medium">ضريبة المشتريات المدفوعة</p>
                </div>
                <p className="text-xl font-bold">{formatCurrency(purchaseTaxThisMonth)}</p>
                <p className="text-[10px] text-muted-foreground">خلال الشهر الحالي</p>
              </CardContent>
            </Card>

            <Card className={netTaxPayable >= 0 ? 'border-rose-500/20' : 'border-emerald-500/20'}>
              <CardContent className="p-5 space-y-2">
                <div className={`flex items-center gap-2 ${netTaxPayable >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  <ArrowDownUp className="h-4 w-4" />
                  <p className="text-xs font-medium">{netTaxPayable >= 0 ? 'صافي الضريبة المستحقة' : 'صافي الضريبة المستردة'}</p>
                </div>
                <p className="text-xl font-bold">{formatCurrency(Math.abs(netTaxPayable))}</p>
                <p className="text-[10px] text-muted-foreground">{netTaxPayable >= 0 ? 'مبلغ واجب الدفع' : 'مبلغ مسترد من الضريبة'}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">ملخص الإقرار الضريبي</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportFiling}>
                    <Download className="h-3.5 w-3.5" />
                    تصدير الإقرار
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/30 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي مبيعات الشهر</p>
                      <p className="text-lg font-bold">{formatCurrency(salesInvoices.reduce((s, i) => s + (i.grand_total || 0), 0))}</p>
                      <p className="text-[10px] text-muted-foreground">{salesInvoices.length} فاتورة مبيعات</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">إجمالي مشتريات الشهر</p>
                      <p className="text-lg font-bold">{formatCurrency(purchaseInvoices.reduce((s, i) => s + (i.grand_total || 0), 0))}</p>
                      <p className="text-[10px] text-muted-foreground">{purchaseInvoices.length} فاتورة مشتريات</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ضريبة المبيعات المحصّلة</span>
                    <span className="font-semibold text-emerald-600">+{formatCurrency(salesTaxThisMonth)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ضريبة المشتريات المدفوعة (مدخلات)</span>
                    <span className="font-semibold text-amber-600">-{formatCurrency(purchaseTaxThisMonth)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span>{netTaxPayable >= 0 ? 'صافي الضريبة المستحقة' : 'صافي الضريبة المستردة'}</span>
                    <span className={netTaxPayable >= 0 ? 'text-rose-600' : 'text-emerald-600'}>
                      {formatCurrency(Math.abs(netTaxPayable))}
                    </span>
                  </div>
                </div>

                {settings.trn && (
                  <div className="text-xs text-muted-foreground mt-2">
                    الرقم الضريبي (TRN): <span className="font-mono">{settings.trn}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Tax Settings Tab ═══ */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ToggleLeft className="h-4 w-4 text-primary" />
                </div>
                إعدادات الضرائب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">الضريبة الافتراضية للمبيعات</Label>
                  <Select value={settings.defaultSalesTax} onValueChange={v => setSettings(s => ({ ...s, defaultSalesTax: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="اختر قالب الضريبة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">بدون ضريبة</SelectItem>
                      {salesTemplates.map(t => (
                        <SelectItem key={t.name} value={t.name}>{t.title || t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">قالب الضريبة الذي يُطبّق تلقائياً على فواتير المبيعات</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">الضريبة الافتراضية للمشتريات</Label>
                  <Select value={settings.defaultPurchaseTax} onValueChange={v => setSettings(s => ({ ...s, defaultPurchaseTax: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="اختر قالب الضريبة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">بدون ضريبة</SelectItem>
                      {purchaseTemplates.map(t => (
                        <SelectItem key={t.name} value={t.name}>{t.title || t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">قالب الضريبة الذي يُطبّق تلقائياً على فواتير المشتريات</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border/40 p-4 hover:border-border/60 transition-colors">
                  <div>
                    <p className="text-sm font-medium">تطبيق الضريبة تلقائياً على الفواتير</p>
                    <p className="text-xs text-muted-foreground mt-0.5">عند التفعيل، يتم إضافة قالب الضريبة الافتراضي تلقائياً عند إنشاء فاتورة جديدة</p>
                  </div>
                  <Switch
                    checked={settings.autoApplyTax}
                    onCheckedChange={v => setSettings(s => ({ ...s, autoApplyTax: v }))}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border border-border/40 p-4 hover:border-border/60 transition-colors">
                  <div>
                    <p className="text-sm font-medium">تسعير شامل الضريبة</p>
                    <p className="text-xs text-muted-foreground mt-0.5">عند التفعيل، الأسعار المعروضة تتضمن الضريبة (شامل الضريبة)</p>
                  </div>
                  <Switch
                    checked={settings.taxInclusivePricing}
                    onCheckedChange={v => setSettings(s => ({ ...s, taxInclusivePricing: v }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs font-medium">الرقم الضريبي (TRN)</Label>
                <Input
                  dir="ltr"
                  placeholder="أدخل الرقم الضريبي للتسجيل"
                  value={settings.trn}
                  onChange={e => setSettings(s => ({ ...s, trn: e.target.value }))}
                  className="h-9 font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">رقم التسجيل الضريبي الخاص بالشركة — يظهر في الفواتير والإقرارات الضريبية</p>
              </div>

              <div className="flex justify-end">
                <Button size="sm" className="gap-1.5" onClick={handleSaveSettings}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  حفظ الإعدادات
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preset Tax Setup Confirmation Dialog */}
      <Dialog open={taxDialogOpen} onOpenChange={setTaxDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-amber-600" />
              إعداد ضريبة يمنية
            </DialogTitle>
          </DialogHeader>
          {selectedPreset && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-amber-500/10 p-3 space-y-1">
                <p className="text-sm font-semibold">{selectedPreset.label}</p>
                <p className="text-xs text-muted-foreground">النسبة: {selectedPreset.rate}%</p>
              </div>

              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">اسم الضريبة</Label>
                  <Input className="h-9 text-xs" value={taxTitle} onChange={e => setTaxTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">النسبة %</Label>
                  <Input className="h-9 text-xs" type="number" step="0.01" min={0} max={100} dir="ltr" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                سيتم إنشاء حسابات GL (مخرجات، مدخلات، صافي) وقوالب مبيعات ومشتريات تلقائياً.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setTaxDialogOpen(false)}>إلغاء</Button>
            <Button size="sm" onClick={() => { setupMutation.mutate(); setTaxDialogOpen(false); }} disabled={setupMutation.isPending}>
              {setupMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              إنشاء قالب ضريبة جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">عنوان القالب *</Label>
              <Input className="h-9" placeholder="مثال: ضريبة القيمة المضافة 5%" value={templateForm.title} onChange={e => setTemplateForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">نوع القالب</Label>
              <Select value={templateForm.type} onValueChange={v => setTemplateForm(f => ({ ...f, type: v as 'sales' | 'purchase' }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">قالب مبيعات</SelectItem>
                  <SelectItem value="purchase">قالب مشتريات</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setTemplateDialogOpen(false)}>إلغاء</Button>
            <Button
              size="sm"
              disabled={!templateForm.title.trim() || !effectiveCompany}
              onClick={async () => {
                try {
                  const doctype = templateForm.type === 'sales'
                    ? 'Sales Taxes and Charges Template'
                    : 'Purchase Taxes and Charges Template';
                  const mutation = templateForm.type === 'sales' ? createTemplateSales : createTemplatePurchase;
                  await mutation.mutateAsync({
                    title: templateForm.title.trim(),
                    company: effectiveCompany,
                  } as Record<string, unknown>);
                  toast({ title: 'تم بنجاح', description: 'تم إنشاء القالب' });
                  setTemplateDialogOpen(false);
                  setTemplateForm({ title: '', type: 'sales' });
                } catch (e) {
                  toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'خطأ', variant: 'destructive' });
                }
              }}
            >
              إنشاء القالب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
