'use client';

<<<<<<< HEAD
import { useState, useMemo, useCallback } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { StatusBadge } from '@/components/erp/status-badge';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
=======
import { useCallback, useSyncExternalStore, useState } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { StatusBadge } from '@/components/erp/status-badge';
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
<<<<<<< HEAD
import { Skeleton } from '@/components/ui/skeleton';
=======
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
<<<<<<< HEAD
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
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useToast } from '@/hooks/use-toast';
import {
  useDocList,
  useCreateDoc,
  useUpdateDoc,
  useDeleteDoc,
} from '@/lib/client/hooks';
=======
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/app-format';
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
import {
  CreditCard,
  DollarSign,
  Settings,
  Shield,
<<<<<<< HEAD
  Plus,
  Trash2,
  Loader2,
  Link2,
} from 'lucide-react';

/* ─── ERPNext DocType Types ─── */

interface PaymentGatewayRow {
  name: string;
  gateway_controller?: string;
  gateway_settings?: string;
  disabled?: number | boolean;
}

interface PaymentGatewayAccountRow {
  name: string;
  payment_gateway: string;
  payment_account: string;
  currency: string;
  is_default?: number | boolean;
}

/* ─── Constants ─── */
=======
} from 'lucide-react';

/* ─── Types ─── */
type GatewayId = 'tabby' | 'tamara' | 'stripe' | 'tap' | 'paymob' | 'paytabs' | 'paypal' | '2checkout';

type GatewayConfig = {
  id: GatewayId;
  name: string;
  nameAr: string;
  icon: string;
  apiKey: string;
  secretKey: string;
  merchantId: string;
  environment: 'test' | 'live';
  currency: string;
  glAccount: string;
  feePercent: number;
  enabled: boolean;
  totalTransactions: number;
  totalFees: number;
};

const LS_KEY = 'erp_payment_gateways';

const GATEWAY_DEFAULTS: Omit<GatewayConfig, 'apiKey' | 'secretKey' | 'merchantId' | 'glAccount'>[] = [
  { id: 'tabby', name: 'Tabby', nameAr: 'تابي', icon: 'solar:card-bold-duotone', environment: 'test', currency: 'SAR', feePercent: 2.5, enabled: false, totalTransactions: 0, totalFees: 0 },
  { id: 'tamara', name: 'Tamara', nameAr: 'تمارا', icon: 'solar:card-bold-duotone', environment: 'test', currency: 'SAR', feePercent: 2.0, enabled: false, totalTransactions: 0, totalFees: 0 },
  { id: 'stripe', name: 'Stripe', nameAr: 'سترايب', icon: 'solar:card-bold-duotone', environment: 'test', currency: 'USD', feePercent: 2.9, enabled: false, totalTransactions: 0, totalFees: 0 },
  { id: 'tap', name: 'Tap', nameAr: 'تاب', icon: 'solar:card-bold-duotone', environment: 'test', currency: 'KWD', feePercent: 2.0, enabled: false, totalTransactions: 0, totalFees: 0 },
  { id: 'paymob', name: 'Paymob', nameAr: 'بايموب', icon: 'solar:card-bold-duotone', environment: 'test', currency: 'EGP', feePercent: 1.75, enabled: false, totalTransactions: 0, totalFees: 0 },
  { id: 'paytabs', name: 'Paytabs', nameAr: 'بايتابس', icon: 'solar:card-bold-duotone', environment: 'test', currency: 'SAR', feePercent: 2.0, enabled: false, totalTransactions: 0, totalFees: 0 },
  { id: 'paypal', name: 'PayPal', nameAr: 'باي بال', icon: 'solar:card-bold-duotone', environment: 'test', currency: 'USD', feePercent: 3.5, enabled: false, totalTransactions: 0, totalFees: 0 },
  { id: '2checkout', name: '2Checkout', nameAr: 'تو تشيكاوت', icon: 'solar:card-bold-duotone', environment: 'test', currency: 'USD', feePercent: 3.5, enabled: false, totalTransactions: 0, totalFees: 0 },
];
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)

const CURRENCY_OPTIONS = [
  { value: 'YER', label: 'ريال يمني (YER)' },
  { value: 'SAR', label: 'ريال سعودي (SAR)' },
  { value: 'AED', label: 'درهم إماراتي (AED)' },
  { value: 'USD', label: 'دولار أمريكي (USD)' },
<<<<<<< HEAD
  { value: 'KWD', label: 'دينار كويتي (KWD)' },
  { value: 'EGP', label: 'جنيه مصري (EGP)' },
  { value: 'EUR', label: 'يورو (EUR)' },
  { value: 'GBP', label: 'جنيه إسترليني (GBP)' },
];

/* ─── Gateway form state ─── */

interface GatewayFormState {
  name: string;
  gateway_controller: string;
  gateway_settings: string;
}

interface AccountFormState {
  payment_account: string;
  currency: string;
  is_default: boolean;
}

const emptyGatewayForm: GatewayFormState = {
  name: '',
  gateway_controller: '',
  gateway_settings: '',
};

const emptyAccountForm: AccountFormState = {
  payment_account: '',
  currency: 'SAR',
  is_default: false,
};

/* ─── Page Component ─── */

export default function PaymentGatewaysPage() {
  const { toast } = useToast();

  /* ─── Dialog state ─── */
  const [gatewayDialogOpen, setGatewayDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'gateway' | 'account'>('gateway');
  const [deleteTarget, setDeleteTarget] = useState<string>('');
  const [editingGateway, setEditingGateway] = useState<PaymentGatewayRow | null>(null);
  const [editingAccount, setEditingAccount] = useState<PaymentGatewayAccountRow | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayRow | null>(null);
  const [gatewayForm, setGatewayForm] = useState<GatewayFormState>(emptyGatewayForm);
  const [accountForm, setAccountForm] = useState<AccountFormState>(emptyAccountForm);

  /* ─── ERPNext data hooks ─── */
  const {
    data: gateways = [],
    isLoading: gatewaysLoading,
    isError: gatewaysError,
    error: gatewaysErr,
    refetch: refetchGateways,
  } = useDocList<PaymentGatewayRow>('Payment Gateway', {
    fields: ['name', 'gateway_controller', 'gateway_settings', 'disabled'],
    limit: 200,
  });

  const {
    data: accounts = [],
    isLoading: accountsLoading,
    isError: accountsError,
    error: accountsErr,
    refetch: refetchAccounts,
  } = useDocList<PaymentGatewayAccountRow>('Payment Gateway Account', {
    fields: ['name', 'payment_gateway', 'payment_account', 'currency', 'is_default'],
    limit: 500,
  });

  /* ─── Mutations ─── */
  const createGateway = useCreateDoc<PaymentGatewayRow>('Payment Gateway');
  const updateGateway = useUpdateDoc<PaymentGatewayRow>('Payment Gateway');
  const deleteGateway = useDeleteDoc('Payment Gateway');
  const createAccount = useCreateDoc<PaymentGatewayAccountRow>('Payment Gateway Account');
  const updateAccount = useUpdateDoc<PaymentGatewayAccountRow>('Payment Gateway Account');
  const deleteAccount = useDeleteDoc('Payment Gateway Account');

  /* ─── Derived data ─── */
  const isGatewayMutating = createGateway.isPending || updateGateway.isPending;
  const isAccountMutating = createAccount.isPending || updateAccount.isPending;

  // Map accounts to their gateways
  const accountsByGateway = useMemo(() => {
    const map = new Map<string, PaymentGatewayAccountRow[]>();
    for (const acc of accounts) {
      const key = acc.payment_gateway || '__none__';
      const list = map.get(key) || [];
      list.push(acc);
      map.set(key, list);
    }
    return map;
  }, [accounts]);

  // KPIs
  const enabledCount = gateways.filter((g) => !g.disabled).length;
  const disabledCount = gateways.filter((g) => g.disabled).length;
  const totalAccounts = accounts.length;
  const defaultCount = accounts.filter((a) => a.is_default).length;

  /* ─── Gateway CRUD handlers ─── */

  const openNewGateway = () => {
    setEditingGateway(null);
    setGatewayForm(emptyGatewayForm);
    setGatewayDialogOpen(true);
  };

  const openEditGateway = (gw: PaymentGatewayRow) => {
    setEditingGateway(gw);
    setGatewayForm({
      name: gw.name || '',
      gateway_controller: gw.gateway_controller || '',
      gateway_settings: gw.gateway_settings || '',
    });
    setGatewayDialogOpen(true);
  };

  const saveGateway = useCallback(async () => {
    if (!gatewayForm.name.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم البوابة', variant: 'destructive' });
      return;
    }
    try {
      if (editingGateway) {
        await updateGateway.mutateAsync({
          name: editingGateway.name,
          doc: {
            gateway_controller: gatewayForm.gateway_controller,
            gateway_settings: gatewayForm.gateway_settings,
          },
        });
        toast({ title: 'تم بنجاح', description: `تم تحديث بوابة ${editingGateway.name}` });
      } else {
        await createGateway.mutateAsync({
          name: gatewayForm.name.trim(),
          gateway_controller: gatewayForm.gateway_controller,
          gateway_settings: gatewayForm.gateway_settings,
        } as Record<string, unknown>);
        toast({ title: 'تم بنجاح', description: `تم إضافة بوابة ${gatewayForm.name}` });
      }
      setGatewayDialogOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    }
  }, [editingGateway, gatewayForm, createGateway, updateGateway, toast]);

  const toggleGateway = async (gw: PaymentGatewayRow) => {
    try {
      const newVal = gw.disabled ? 0 : 1;
      await updateGateway.mutateAsync({
        name: gw.name,
        doc: { disabled: newVal },
      });
      toast({
        title: 'تم بنجاح',
        description: gw.disabled ? `تم تفعيل بوابة ${gw.name}` : `تم تعطيل بوابة ${gw.name}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    }
  };

  const confirmDeleteGateway = (gwName: string) => {
    setDeleteType('gateway');
    setDeleteTarget(gwName);
    setDeleteDialogOpen(true);
  };

  /* ─── Account CRUD handlers ─── */

  const openNewAccount = (gw: PaymentGatewayRow) => {
    setSelectedGateway(gw);
    setEditingAccount(null);
    setAccountForm({ ...emptyAccountForm });
    setAccountDialogOpen(true);
  };

  const openEditAccount = (acc: PaymentGatewayAccountRow) => {
    const gw = gateways.find((g) => g.name === acc.payment_gateway) || null;
    setSelectedGateway(gw);
    setEditingAccount(acc);
    setAccountForm({
      payment_account: acc.payment_account || '',
      currency: acc.currency || 'SAR',
      is_default: Boolean(acc.is_default),
    });
    setAccountDialogOpen(true);
  };

  const saveAccount = useCallback(async () => {
    if (!selectedGateway) return;
    if (!accountForm.payment_account.trim()) {
      toast({ title: 'خطأ', description: 'يرجى اختيار حساب الدفع', variant: 'destructive' });
      return;
    }
    try {
      if (editingAccount) {
        await updateAccount.mutateAsync({
          name: editingAccount.name,
          doc: {
            payment_account: accountForm.payment_account,
            currency: accountForm.currency,
            is_default: accountForm.is_default ? 1 : 0,
          },
        });
        toast({ title: 'تم بنجاح', description: 'تم تحديث حساب البوابة' });
      } else {
        await createAccount.mutateAsync({
          payment_gateway: selectedGateway.name,
          payment_account: accountForm.payment_account,
          currency: accountForm.currency,
          is_default: accountForm.is_default ? 1 : 0,
        } as Record<string, unknown>);
        toast({ title: 'تم بنجاح', description: 'تم إضافة حساب البوابة' });
      }
      setAccountDialogOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    }
  }, [selectedGateway, editingAccount, accountForm, createAccount, updateAccount, toast]);

  const confirmDeleteAccount = (accName: string) => {
    setDeleteType('account');
    setDeleteTarget(accName);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      if (deleteType === 'gateway') {
        await deleteGateway.mutateAsync(deleteTarget);
        toast({ title: 'تم بنجاح', description: 'تم حذف البوابة' });
      } else {
        await deleteAccount.mutateAsync(deleteTarget);
        toast({ title: 'تم بنجاح', description: 'تم حذف حساب البوابة' });
      }
      setDeleteDialogOpen(false);
      setDeleteTarget('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    }
  };

  /* ─── Render helpers ─── */

  const renderGatewaySkeleton = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-border/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
=======
];

function loadGateways(): GatewayConfig[] {
  if (typeof window === 'undefined') return GATEWAY_DEFAULTS.map((g) => ({ ...g, apiKey: '', secretKey: '', merchantId: '', glAccount: '' }));
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return GATEWAY_DEFAULTS.map((g) => ({ ...g, apiKey: '', secretKey: '', merchantId: '', glAccount: '' }));
    const saved = JSON.parse(raw) as Partial<GatewayConfig>[];
    return GATEWAY_DEFAULTS.map((g) => {
      const s = saved.find((x) => x.id === g.id);
      return { ...g, apiKey: '', secretKey: '', merchantId: '', glAccount: '', ...s };
    });
  } catch {
    return GATEWAY_DEFAULTS.map((g) => ({ ...g, apiKey: '', secretKey: '', merchantId: '', glAccount: '' }));
  }
}

const emptySubscribe = () => () => {};

export default function PaymentGatewaysPage() {
  const { toast } = useToast();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [gateways, setGateways] = useState<GatewayConfig[]>(() => loadGateways());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GatewayConfig | null>(null);
  const [form, setForm] = useState<Partial<GatewayConfig>>({});

  const openSetup = (gw: GatewayConfig) => {
    setEditing(gw);
    setForm({ ...gw });
    setDialogOpen(true);
  };

  const saveGateway = useCallback(() => {
    if (!editing) return;
    const updated = gateways.map((g) =>
      g.id === editing.id
        ? {
            ...g,
            apiKey: form.apiKey ?? '',
            secretKey: form.secretKey ?? '',
            merchantId: form.merchantId ?? '',
            environment: form.environment ?? 'test',
            currency: form.currency ?? 'SAR',
            glAccount: form.glAccount ?? '',
            feePercent: form.feePercent ?? g.feePercent,
            enabled: form.enabled ?? false,
          }
        : g
    );
    setGateways(updated);
    localStorage.setItem(LS_KEY, JSON.stringify(updated.map(({ apiKey, secretKey, ...rest }) => rest)));
    setDialogOpen(false);
    toast({ title: `تم حفظ إعدادات ${editing.nameAr}` });
  }, [editing, form, gateways, toast]);

  // KPIs
  const enabledCount = gateways.filter((g) => g.enabled).length;
  const disabledCount = gateways.length - enabledCount;
  const totalTx = gateways.reduce((s, g) => s + g.totalTransactions, 0);
  const totalFees = gateways.reduce((s, g) => s + g.totalFees, 0);

  if (!mounted) return null;
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="بوابات الدفع الإلكترونية"
        description="إدارة بوابات الدفع الإلكترونية وربطها بالحسابات المحاسبية"
        iconify="solar:card-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'الإعدادات' }, { label: 'بوابات الدفع' }]}
<<<<<<< HEAD
        actions={
          <Button size="sm" className="gap-1.5" onClick={openNewGateway}>
            <Plus className="h-3.5 w-3.5" />
            بوابة جديدة
          </Button>
        }
      />

      {/* Error Alerts */}
      {(gatewaysError || accountsError) && (
        <ListQueryAlert
          error={gatewaysErr || accountsErr}
          onRetry={() => {
            refetchGateways();
            refetchAccounts();
          }}
        />
      )}

=======
      />

>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard
          title="بوابات مفعّلة"
          value={enabledCount}
          icon={Shield}
          accent="success"
        />
        <KpiCard
          title="بوابات معطّلة"
          value={disabledCount}
          icon={Shield}
          accent="destructive"
        />
        <KpiCard
<<<<<<< HEAD
          title="حسابات البوابات"
          value={totalAccounts}
=======
          title="إجمالي المعاملات"
          value={totalTx}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
          icon={CreditCard}
          accent="info"
        />
        <KpiCard
<<<<<<< HEAD
          title="حسابات افتراضية"
          value={defaultCount}
=======
          title="إجمالي المصاريف"
          value={formatCurrency(totalFees)}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
          icon={DollarSign}
          accent="warning"
        />
      </KpiStrip>

      {/* Gateway Cards Grid */}
<<<<<<< HEAD
      {gatewaysLoading ? (
        renderGatewaySkeleton()
      ) : gateways.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="p-8 text-center">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">لا توجد بوابات دفع مسجلة بعد</p>
            <p className="text-xs text-muted-foreground/60 mt-1">اضغط &quot;بوابة جديدة&quot; لإضافة بوابة دفع</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {gateways.map((gw) => {
            const gwAccounts = accountsByGateway.get(gw.name) || [];
            const defaultAcc = gwAccounts.find((a) => a.is_default);
            const isEnabled = !gw.disabled;

            return (
              <Card
                key={gw.name}
                className={`border-border/40 bg-card hover:border-border/60 transition-colors ${!isEnabled ? 'opacity-60' : ''}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-success/10 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-success" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{gw.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {gw.gateway_controller || '—'}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={isEnabled ? 'Active' : 'Inactive'} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <span className="text-muted-foreground">الحسابات</span>
                      <p className="font-medium">{gwAccounts.length}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <span className="text-muted-foreground">الافتراضي</span>
                      <p className="font-medium truncate">{defaultAcc?.currency || '—'}</p>
                    </div>
                    {gw.gateway_settings && (
                      <div className="col-span-2 rounded-md bg-muted/40 px-2 py-1.5">
                        <span className="text-muted-foreground">إعدادات البوابة</span>
                        <p className="font-medium truncate">{gw.gateway_settings}</p>
                      </div>
                    )}
                  </div>

                  {/* Linked accounts mini-list */}
                  {gwAccounts.length > 0 && (
                    <div className="space-y-1">
                      {gwAccounts.slice(0, 3).map((acc) => (
                        <div
                          key={acc.name}
                          className="flex items-center justify-between gap-1.5 rounded border border-border/30 px-2 py-1 text-[10px]"
                        >
                          <div className="flex items-center gap-1 min-w-0">
                            <Link2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate">{acc.payment_account}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-mono text-muted-foreground">{acc.currency}</span>
                            {acc.is_default && (
                              <span className="rounded bg-success/10 px-1 text-success text-[9px]">افتراضي</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {gwAccounts.length > 3 && (
                        <p className="text-[10px] text-muted-foreground text-center">
                          +{gwAccounts.length - 3} حسابات أخرى
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => openEditGateway(gw)}
                    >
                      <Settings className="h-3.5 w-3.5" />
                      إعداد
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => openNewAccount(gw)}
                      title="إضافة حساب"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => toggleGateway(gw)}
                      title={isEnabled ? 'تعطيل' : 'تفعيل'}
                    >
                      <Shield className={`h-3.5 w-3.5 ${isEnabled ? 'text-success' : 'text-destructive'}`} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Payment Gateway Accounts Table ─── */}
      {!accountsLoading && accounts.length > 0 && (
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">حسابات بوابات الدفع</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground">
                    <th className="text-start py-2 px-2 font-medium">البوابة</th>
                    <th className="text-start py-2 px-2 font-medium">حساب الدفع</th>
                    <th className="text-start py-2 px-2 font-medium">العملة</th>
                    <th className="text-start py-2 px-2 font-medium">افتراضي</th>
                    <th className="text-start py-2 px-2 font-medium w-24" />
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.name} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="py-2 px-2 font-medium">{acc.payment_gateway}</td>
                      <td className="py-2 px-2">{acc.payment_account}</td>
                      <td className="py-2 px-2 font-mono">{acc.currency}</td>
                      <td className="py-2 px-2">
                        {acc.is_default ? (
                          <span className="rounded bg-success/10 text-success px-1.5 py-0.5 text-[10px]">نعم</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => openEditAccount(acc)}
                            title="تعديل"
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => confirmDeleteAccount(acc.name)}
                            title="حذف"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Gateway Setup Dialog ─── */}
      <Dialog open={gatewayDialogOpen} onOpenChange={setGatewayDialogOpen}>
=======
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {gateways.map((gw) => (
          <Card
            key={gw.id}
            className="border-border/40 bg-card hover:border-border/60 transition-colors"
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-success/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-success" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{gw.nameAr}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{gw.name}</p>
                  </div>
                </div>
                <StatusBadge status={gw.enabled ? 'Active' : 'Inactive'} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                  <span className="text-muted-foreground">البيئة</span>
                  <p className="font-medium">{gw.environment === 'test' ? 'اختبار' : 'إنتاج'}</p>
                </div>
                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                  <span className="text-muted-foreground">العملة</span>
                  <p className="font-medium">{gw.currency}</p>
                </div>
                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                  <span className="text-muted-foreground">المصاريف</span>
                  <p className="font-medium">{gw.feePercent}%</p>
                </div>
                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                  <span className="text-muted-foreground">المعاملات</span>
                  <p className="font-medium">{gw.totalTransactions}</p>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 text-xs"
                onClick={() => openSetup(gw)}
              >
                <Settings className="h-3.5 w-3.5" />
                إعداد
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Setup Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
<<<<<<< HEAD
              {editingGateway ? `تعديل بوابة ${editingGateway.name}` : 'بوابة دفع جديدة'}
=======
              إعداد {editing?.nameAr ?? 'البوابة'}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
<<<<<<< HEAD
            <div className="space-y-1.5">
              <Label className="text-xs">اسم البوابة *</Label>
              <Input
                dir="ltr"
                className="h-9 font-mono text-xs"
                value={gatewayForm.name}
                onChange={(e) => setGatewayForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثال: Stripe, Tabby, PayPal"
                disabled={!!editingGateway}
              />
              {editingGateway && (
                <p className="text-[10px] text-muted-foreground">لا يمكن تغيير اسم البوابة بعد الإنشاء</p>
              )}
=======
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">مفتاح API</Label>
                <Input
                  dir="ltr"
                  className="h-9 font-mono text-xs"
                  value={form.apiKey ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                  placeholder="API Key"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">المفتاح السرّي</Label>
                <Input
                  dir="ltr"
                  type="password"
                  className="h-9 font-mono text-xs"
                  value={form.secretKey ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, secretKey: e.target.value }))}
                  placeholder="Secret Key"
                />
              </div>
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
<<<<<<< HEAD
                <Label className="text-xs">متحكم البوابة</Label>
                <Input
                  dir="ltr"
                  className="h-9 font-mono text-xs"
                  value={gatewayForm.gateway_controller}
                  onChange={(e) => setGatewayForm((f) => ({ ...f, gateway_controller: e.target.value }))}
                  placeholder="Gateway Controller"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">إعدادات البوابة</Label>
                <ErpLinkCombobox
                  doctype="DocType"
                  value={gatewayForm.gateway_settings}
                  onChange={(v) => setGatewayForm((f) => ({ ...f, gateway_settings: v }))}
                  placeholder="اختر إعدادات البوابة"
                  showCreateShortcut={false}
                />
              </div>
            </div>

            {editingGateway && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/30 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">حذف البوابة</p>
                  <p className="text-[10px] text-muted-foreground">سيتم حذف البوابة وجميع حساباتها المرتبطة</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    setGatewayDialogOpen(false);
                    confirmDeleteGateway(editingGateway.name);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setGatewayDialogOpen(false)}>
              إلغاء
            </Button>
            <Button size="sm" onClick={saveGateway} disabled={isGatewayMutating}>
              {isGatewayMutating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin ms-1.5" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ البوابة'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Gateway Account Setup Dialog ─── */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              {editingAccount ? 'تعديل حساب البوابة' : `ربط حساب — ${selectedGateway?.name || ''}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">ربط حساب GL *</Label>
              <ErpLinkCombobox
                doctype="Account"
                value={accountForm.payment_account}
                onChange={(v) => setAccountForm((f) => ({ ...f, payment_account: v }))}
                placeholder="اختر حساب الدفع"
                displayKey="account_name"
                filters={[['account_type', '=', 'Cash']]}
              />
=======
                <Label className="text-xs">معرّف التاجر</Label>
                <Input
                  dir="ltr"
                  className="h-9 font-mono text-xs"
                  value={form.merchantId ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, merchantId: e.target.value }))}
                  placeholder="Merchant ID"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">البيئة</Label>
                <Select
                  value={form.environment ?? 'test'}
                  onValueChange={(v) => setForm((f) => ({ ...f, environment: v as 'test' | 'live' }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">اختبار</SelectItem>
                    <SelectItem value="live">إنتاج</SelectItem>
                  </SelectContent>
                </Select>
              </div>
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">عملة الدفع</Label>
                <Select
<<<<<<< HEAD
                  value={accountForm.currency}
                  onValueChange={(v) => setAccountForm((f) => ({ ...f, currency: v }))}
=======
                  value={form.currency ?? 'SAR'}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
<<<<<<< HEAD
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/30 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">حساب افتراضي</p>
                  <p className="text-[10px] text-muted-foreground">سيُستخدم هذا الحساب بشكل افتراضي للبوابة</p>
                </div>
                <Switch
                  checked={accountForm.is_default}
                  onCheckedChange={(v) => setAccountForm((f) => ({ ...f, is_default: v }))}
=======
              <div className="space-y-1.5">
                <Label className="text-xs">مصاريف الدفع (%)</Label>
                <Input
                  className="h-9"
                  type="number"
                  dir="ltr"
                  step="0.01"
                  min={0}
                  max={100}
                  value={form.feePercent ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, feePercent: Number(e.target.value) }))}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                />
              </div>
            </div>

<<<<<<< HEAD
            {editingAccount && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/20 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">حذف الحساب</p>
                  <p className="text-[10px] text-muted-foreground">سيتم إزالة ربط هذا الحساب بالبوابة</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    setAccountDialogOpen(false);
                    confirmDeleteAccount(editingAccount.name);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAccountDialogOpen(false)}>
              إلغاء
            </Button>
            <Button size="sm" onClick={saveAccount} disabled={isAccountMutating}>
              {isAccountMutating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin ms-1.5" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ الحساب'
              )}
=======
            <div className="space-y-1.5">
              <Label className="text-xs">ربط حساب GL</Label>
              <ErpLinkCombobox
                doctype="Account"
                value={form.glAccount ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, glAccount: v }))}
                placeholder="اختر حساب الدفع"
                displayKey="account_name"
                filters={[['account_type', '=', 'Cash']]}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/30 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">تفعيل البوابة</p>
                <p className="text-[10px] text-muted-foreground">عند التفعيل ستظهر البوابة كخيار دفع في الفواتير</p>
              </div>
              <Switch
                checked={form.enabled ?? false}
                onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button size="sm" onClick={saveGateway}>
              حفظ الإعدادات
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
<<<<<<< HEAD

      {/* ─── Delete Confirmation Dialog ─── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'gateway'
                ? `هل أنت متأكد من حذف بوابة الدفع "${deleteTarget}"؟ سيتم حذف جميع حساباتها المرتبطة أيضًا.`
                : `هل أنت متأكد من حذف حساب البوابة "${deleteTarget}"؟ لا يمكن التراجع عن هذا الإجراء.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteGateway.isPending || deleteAccount.isPending}
            >
              {deleteGateway.isPending || deleteAccount.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
=======
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
    </div>
  );
}
