'use client';

import { useCallback, useSyncExternalStore, useState } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { StatusBadge } from '@/components/erp/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/app-format';
import {
  CreditCard,
  DollarSign,
  Settings,
  Shield,
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

const CURRENCY_OPTIONS = [
  { value: 'YER', label: 'ريال يمني (YER)' },
  { value: 'SAR', label: 'ريال سعودي (SAR)' },
  { value: 'AED', label: 'درهم إماراتي (AED)' },
  { value: 'USD', label: 'دولار أمريكي (USD)' },
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

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="بوابات الدفع الإلكترونية"
        description="إدارة بوابات الدفع الإلكترونية وربطها بالحسابات المحاسبية"
        iconify="solar:card-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'الإعدادات' }, { label: 'بوابات الدفع' }]}
      />

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
          title="إجمالي المعاملات"
          value={totalTx}
          icon={CreditCard}
          accent="info"
        />
        <KpiCard
          title="إجمالي المصاريف"
          value={formatCurrency(totalFees)}
          icon={DollarSign}
          accent="warning"
        />
      </KpiStrip>

      {/* Gateway Cards Grid */}
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
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              إعداد {editing?.nameAr ?? 'البوابة'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
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
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">عملة الدفع</Label>
                <Select
                  value={form.currency ?? 'SAR'}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
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
                />
              </div>
            </div>

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
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
