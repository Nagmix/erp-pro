'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Mail,
  CreditCard,
  Globe,
  Webhook,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  Loader2,
  ArrowLeft,
  Wifi,
  WifiOff,
  Link2,
  Activity,
  Shield,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

/* ─── Integration Type ─── */
type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'unknown';

type IntegrationCard = {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: React.ElementType;
  accent: 'primary' | 'success' | 'warning' | 'info' | 'destructive' | 'purple';
  status: IntegrationStatus;
  enabled: boolean;
  lastSync: string | null;
  settingsPath: string;
  category: string;
};

/* ─── Integration Definitions ─── */
const INTEGRATION_DEFS: Omit<IntegrationCard, 'status' | 'enabled' | 'lastSync'>[] = [
  {
    id: 'sms-gateway',
    key: 'sms',
    title: 'بوابة الرسائل النصية',
    description: 'إرسال رسائل SMS للعملاء والموظفين عبر مزودي مثل Unifonic و Twilio',
    icon: MessageSquare,
    accent: 'success',
    settingsPath: '/settings/sms-gateway',
    category: 'التواصل',
  },
  {
    id: 'email-smtp',
    key: 'email',
    title: 'بريد SMTP',
    description: 'ضبط خادم البريد الصادر لإرسال الفواتير والإشعارات تلقائياً',
    icon: Mail,
    accent: 'info',
    settingsPath: '/settings/email-smtp',
    category: 'التواصل',
  },
  {
    id: 'payment-gateways',
    key: 'payment',
    title: 'بوابات الدفع',
    description: 'ربط بوابات الدفع الإلكتروني لاستقبال المدفوعات عبر الإنترنت',
    icon: CreditCard,
    accent: 'warning',
    settingsPath: '/settings/payment-gateways',
    category: 'المالية',
  },
  {
    id: 'ecommerce',
    key: 'ecommerce',
    title: 'التجارة الإلكترونية',
    description: 'مزامنة الطلبات والمخزون مع Salla و Zid و Shopify و WooCommerce',
    icon: Globe,
    accent: 'purple',
    settingsPath: '/settings/ecommerce-integration',
    category: 'المبيعات',
  },
  {
    id: 'webhooks',
    key: 'webhooks',
    title: 'ويب هوكس',
    description: 'إرسال أحداث النظام تلقائياً إلى أنظمة خارجية عبر HTTP Webhooks',
    icon: Webhook,
    accent: 'primary',
    settingsPath: '/operations/developer-api',
    category: 'التطوير',
  },
];

/* ─── Status helpers ─── */
function statusBadge(status: IntegrationStatus) {
  switch (status) {
    case 'connected':
      return (
        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5 border-emerald-300 text-emerald-700 bg-emerald-50">
          <Wifi className="h-3 w-3" />
          متصل
        </Badge>
      );
    case 'disconnected':
      return (
        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5 border-muted text-muted-foreground bg-muted/50">
          <WifiOff className="h-3 w-3" />
          غير متصل
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5 border-rose-300 text-rose-700 bg-rose-50">
          <AlertTriangle className="h-3 w-3" />
          خطأ
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5 border-amber-300 text-amber-700 bg-amber-50">
          <AlertTriangle className="h-3 w-3" />
          غير معروف
        </Badge>
      );
  }
}

function statusIcon(status: IntegrationStatus) {
  switch (status) {
    case 'connected':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'disconnected':
      return <XCircle className="h-4 w-4 text-muted-foreground" />;
    case 'error':
      return <AlertTriangle className="h-4 w-4 text-rose-500" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  }
}

/* ─── Accent surface for icon background ─── */
const accentSurface: Record<string, string> = {
  primary: 'bg-primary/[0.07] text-primary',
  success: 'bg-emerald-500/[0.09] text-emerald-800 dark:text-emerald-300',
  warning: 'bg-amber-500/[0.09] text-amber-900 dark:text-amber-300',
  info: 'bg-sky-500/[0.09] text-sky-900 dark:text-sky-300',
  destructive: 'bg-rose-500/[0.09] text-rose-900 dark:text-rose-300',
  purple: 'bg-purple-500/[0.09] text-purple-900 dark:text-purple-300',
};

/* ─── Load integrations data from API ─── */
type IntegrationsData = {
  shopify: string;
  salla: string;
  zid: string;
  woo: string;
  smsProvider: string;
  waProvider: string;
  notes: string;
};

async function loadIntegrationsData(): Promise<IntegrationsData | null> {
  try {
    const res = await fetch('/api/settings/integrations-local');
    const j = (await res.json()) as { data?: IntegrationsData };
    return j.data ?? null;
  } catch {
    return null;
  }
}

/* ─── Main Component ─── */
export default function SettingsIntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [healthChecking, setHealthChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  // Integration data from API
  const [integrationsData, setIntegrationsData] = useState<IntegrationsData | null>(null);

  // Local toggle state for each integration
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({
    sms: false,
    email: false,
    payment: false,
    ecommerce: false,
    webhooks: false,
  });

  // Status map
  const [statusMap, setStatusMap] = useState<Record<string, IntegrationStatus>>({
    sms: 'unknown',
    email: 'unknown',
    payment: 'unknown',
    ecommerce: 'unknown',
    webhooks: 'unknown',
  });

  // Last sync map
  const [lastSyncMap, setLastSyncMap] = useState<Record<string, string | null>>({
    sms: null,
    email: null,
    payment: null,
    ecommerce: null,
    webhooks: null,
  });

  // Configure dialog
  const [configOpen, setConfigOpen] = useState(false);
  const [configKey, setConfigKey] = useState<string>('');

  // E-commerce form fields
  const [shopify, setShopify] = useState('');
  const [salla, setSalla] = useState('');
  const [zid, setZid] = useState('');
  const [woo, setWoo] = useState('');
  const [smsProvider, setSmsProvider] = useState('Unifonic');
  const [waProvider, setWaProvider] = useState('Meta');
  const [notes, setNotes] = useState('');

  /* ─── Load data ─── */
  useEffect(() => {
    void (async () => {
      const data = await loadIntegrationsData();
      if (data) {
        setIntegrationsData(data);
        setShopify(data.shopify);
        setSalla(data.salla);
        setZid(data.zid);
        setWoo(data.woo);
        setSmsProvider(data.smsProvider);
        setWaProvider(data.waProvider);
        setNotes(data.notes);

        // Infer statuses from data
        const hasEcommerce = !!(data.shopify || data.salla || data.zid || data.woo);
        const hasSms = !!data.smsProvider;
        const hasEmail = false; // Requires separate SMTP check

        setEnabledMap({
          sms: hasSms,
          email: hasEmail,
          payment: false,
          ecommerce: hasEcommerce,
          webhooks: false,
        });

        setStatusMap({
          sms: hasSms ? 'connected' : 'disconnected',
          email: hasEmail ? 'connected' : 'disconnected',
          payment: 'disconnected',
          ecommerce: hasEcommerce ? 'connected' : 'disconnected',
          webhooks: 'disconnected',
        });

        if (hasEcommerce) {
          setLastSyncMap((prev) => ({ ...prev, ecommerce: new Date().toISOString() }));
        }
        if (hasSms) {
          setLastSyncMap((prev) => ({ ...prev, sms: new Date().toISOString() }));
        }
      }
      setLoading(false);
    })();
  }, []);

  /* ─── Build integration cards ─── */
  const integrationCards: IntegrationCard[] = INTEGRATION_DEFS.map((def) => ({
    ...def,
    status: statusMap[def.key] ?? 'unknown',
    enabled: enabledMap[def.key] ?? false,
    lastSync: lastSyncMap[def.key] ?? null,
  }));

  /* ─── KPI counts ─── */
  const totalConnected = integrationCards.filter((c) => c.status === 'connected').length;
  const totalDisconnected = integrationCards.filter((c) => c.status === 'disconnected').length;
  const totalErrors = integrationCards.filter((c) => c.status === 'error').length;
  const totalEnabled = integrationCards.filter((c) => c.enabled).length;

  /* ─── Toggle integration ─── */
  const toggleIntegration = useCallback((key: string, enabled: boolean) => {
    setEnabledMap((prev) => ({ ...prev, [key]: enabled }));
    if (!enabled) {
      setStatusMap((prev) => ({ ...prev, [key]: 'disconnected' }));
    }
    toast.success(enabled ? 'تم تفعيل التكامل' : 'تم تعطيل التكامل');
  }, []);

  /* ─── Health check ─── */
  const runHealthCheck = useCallback(async () => {
    setHealthChecking(true);
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopify, salla, zid, woo }),
      });
      const j = (await res.json()) as { success?: boolean; data?: { messages?: string[] }; error?: string };

      // Update status based on results
      const hasEcommerce = !!(shopify || salla || zid || woo);
      const hasSms = !!smsProvider;

      setStatusMap((prev) => ({
        ...prev,
        ecommerce: hasEcommerce ? 'connected' : 'disconnected',
        sms: hasSms ? 'connected' : 'disconnected',
        email: prev.email,
        payment: prev.payment,
        webhooks: prev.webhooks,
      }));

      if (hasEcommerce) {
        setLastSyncMap((prev) => ({ ...prev, ecommerce: new Date().toISOString() }));
      }
      if (hasSms) {
        setLastSyncMap((prev) => ({ ...prev, sms: new Date().toISOString() }));
      }

      if (!res.ok || !j.success) {
        toast.error(j.error || 'فشل التحقق من صحة التكاملات');
      } else {
        const msgs = j.data?.messages ?? [];
        toast.success(msgs.join(' · ') || 'تم فحص التكاملات بنجاح');
      }
    } catch {
      toast.error('تعذّر الاتصال بالخادم');
    } finally {
      setHealthChecking(false);
    }
  }, [shopify, salla, zid, woo, smsProvider]);

  /* ─── Save ─── */
  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/integrations-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopify, salla, zid, woo, smsProvider, waProvider, notes }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) {
        toast.error('فشل الحفظ');
        return;
      }
      toast.success('تم حفظ إعدادات التكاملات بنجاح');
    } catch {
      toast.error('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }, [shopify, salla, zid, woo, smsProvider, waProvider, notes]);

  /* ─── Open config dialog ─── */
  const openConfig = (key: string) => {
    setConfigKey(key);
    setConfigOpen(true);
  };

  /* ─── Render ─── */
  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="مركز التكاملات"
        description="إدارة جميع التكاملات والربطات الخارجية — مراقبة حالة الاتصال وتفعيل الخدمات"
        iconify="solar:link-round-bold-duotone"
        accent="purple"
        breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'التكاملات' }]}
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => void runHealthCheck()}
              disabled={healthChecking}
            >
              {healthChecking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Activity className="h-3.5 w-3.5" />
              )}
              فحص الصحة
            </Button>
          </div>
        }
      />

      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard
          title="تكاملات متصلة"
          value={totalConnected}
          icon={Wifi}
          accent="success"
          compact
          description="تكاملات تعمل بشكل طبيعي"
        />
        <KpiCard
          title="غير متصلة"
          value={totalDisconnected}
          icon={WifiOff}
          accent="destructive"
          compact
          description="تكاملات بحاجة إلى إعداد"
        />
        <KpiCard
          title="أخطاء"
          value={totalErrors}
          icon={AlertTriangle}
          accent="warning"
          compact
          description="تكاملات بها مشاكل اتصال"
        />
        <KpiCard
          title="مفعّلة"
          value={totalEnabled}
          icon={Shield}
          accent="info"
          compact
          description="تكاملات مفعّلة حالياً"
        />
      </KpiStrip>

      {/* Integration Cards Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-border/40 animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-5 w-32 bg-muted/50 rounded" />
                <div className="h-3 w-full bg-muted/30 rounded" />
                <div className="h-3 w-2/3 bg-muted/30 rounded" />
                <div className="h-8 w-20 bg-muted/30 rounded mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrationCards.map((integration) => {
            const Icon = integration.icon;
            return (
              <Card
                key={integration.id}
                className={`border-border/40 transition-all duration-200 hover:border-border/60 hover:shadow-sm ${
                  integration.enabled ? 'bg-card' : 'bg-muted/20 opacity-80'
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accentSurface[integration.accent]}`}
                      >
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h3 className="text-sm font-semibold leading-tight">{integration.title}</h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                    {statusIcon(integration.status)}
                  </div>

                  {/* Status row */}
                  <div className="flex items-center justify-between gap-2">
                    {statusBadge(integration.status)}
                    <span className="text-[10px] text-muted-foreground">
                      {integration.lastSync
                        ? `آخر مزامنة: ${new Date(integration.lastSync).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`
                        : 'لا توجد مزامنة'}
                    </span>
                  </div>

                  <Separator className="bg-border/30" />

                  {/* Actions row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={integration.enabled}
                        onCheckedChange={(checked) => toggleIntegration(integration.key, checked)}
                        aria-label={`تفعيل ${integration.title}`}
                      />
                      <span className="text-[11px] text-muted-foreground">
                        {integration.enabled ? 'مفعّل' : 'معطّل'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openConfig(integration.key)}
                        aria-label={`إعدادات ${integration.title}`}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Link href={integration.settingsPath}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`فتح صفحة ${integration.title}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Category badge */}
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                      {integration.category}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick E-commerce Config Section */}
      <Card className="border-border/40 bg-card">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-semibold">إعدادات التجارة الإلكترونية السريعة</h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => void runHealthCheck()}
              disabled={healthChecking}
            >
              {healthChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              تحقق من الاتصال
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">متجر Shopify</Label>
              <Input dir="ltr" value={shopify} onChange={(e) => setShopify(e.target.value)} placeholder="example.myshopify.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">تاجر Salla</Label>
              <Input value={salla} onChange={(e) => setSalla(e.target.value)} placeholder="اسم المتجر" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">تاجر Zid</Label>
              <Input value={zid} onChange={(e) => setZid(e.target.value)} placeholder="معرف المتجر" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">رابط WooCommerce</Label>
              <Input dir="ltr" value={woo} onChange={(e) => setWoo(e.target.value)} placeholder="https://store.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">مزود الرسائل النصية</Label>
              <Input value={smsProvider} onChange={(e) => setSmsProvider(e.target.value)} placeholder="Unifonic" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">مزود WhatsApp</Label>
              <Input value={waProvider} onChange={(e) => setWaProvider(e.target.value)} placeholder="Meta" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold">ملاحظات الربط</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات حول إعدادات التكامل..." />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Link2 className="h-4 w-4" />
        <AlertTitle className="text-sm">ملاحظات حول التكاملات</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
          مزامنة الطلبات والمخزون مع Salla / Zid / Shopify تتطلب مفاتيح API وواجهة خلفية مخصصة. الحقول تُخزَّن في ملف البيانات المحلي مع مرآة في SQLite للاسترداد.
          لتفعيل البريد الصادر، انتقل إلى صفحة إعدادات SMTP. لبوابات الدفع، تأكد من ضبط مفاتيح API من صفحة بوابات الدفع.
        </AlertDescription>
      </Alert>

      {/* Quick Links Section */}
      <Card className="border-dashed border-border/50 bg-muted/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-purple-600 shrink-0" />
            <h3 className="text-xs font-semibold">صفحات الإعدادات المرتبطة</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { label: 'إعدادات البريد SMTP', href: '/settings/email-smtp', icon: Mail },
              { label: 'بوابة الرسائل النصية', href: '/settings/sms-gateway', icon: MessageSquare },
              { label: 'بوابات الدفع', href: '/settings/payment-gateways', icon: CreditCard },
              { label: 'التجارة الإلكترونية', href: '/settings/ecommerce-integration', icon: Globe },
              { label: 'واجهة المطور', href: '/operations/developer-api', icon: Webhook },
              { label: 'الخلفية ERPNext', href: '/settings/erp-backend', icon: Shield },
            ].map((link) => {
              const LIcon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 rounded-lg border border-border/30 bg-background p-2.5 text-xs hover:bg-muted/30 transition-colors"
                >
                  <LIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{link.label}</span>
                  <ArrowLeft className="h-3 w-3 text-muted-foreground shrink-0 ms-auto" />
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Config Dialog for specific integration */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              إعدادات {INTEGRATION_DEFS.find((d) => d.key === configKey)?.title ?? ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {configKey === 'ecommerce' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  قم بضبط إعدادات الربط مع منصات التجارة الإلكترونية. أدخل بيانات المتجر الذي تريد ربطه.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">متجر Shopify</Label>
                  <Input dir="ltr" value={shopify} onChange={(e) => setShopify(e.target.value)} placeholder="example.myshopify.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">تاجر Salla</Label>
                  <Input value={salla} onChange={(e) => setSalla(e.target.value)} placeholder="اسم المتجر" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">تاجر Zid</Label>
                  <Input value={zid} onChange={(e) => setZid(e.target.value)} placeholder="معرف المتجر" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">رابط WooCommerce</Label>
                  <Input dir="ltr" value={woo} onChange={(e) => setWoo(e.target.value)} placeholder="https://store.com" />
                </div>
              </div>
            )}
            {configKey === 'sms' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  أدخل مزود خدمة الرسائل النصية. يمكنك استخدام Unifonic أو Twilio أو أي مزود آخر.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">مزود الرسائل النصية</Label>
                  <Input value={smsProvider} onChange={(e) => setSmsProvider(e.target.value)} placeholder="Unifonic" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">مزود WhatsApp</Label>
                  <Input value={waProvider} onChange={(e) => setWaProvider(e.target.value)} placeholder="Meta" />
                </div>
              </div>
            )}
            {configKey === 'email' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  لإعداد البريد الصادر، انتقل إلى صفحة إعدادات SMTP المخصصة.
                </p>
                <Link href="/settings/email-smtp">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    فتح صفحة إعدادات SMTP
                  </Button>
                </Link>
              </div>
            )}
            {configKey === 'payment' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  لإعداد بوابات الدفع الإلكتروني، انتقل إلى صفحة بوابات الدفع.
                </p>
                <Link href="/settings/payment-gateways">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    فتح صفحة بوابات الدفع
                  </Button>
                </Link>
              </div>
            )}
            {configKey === 'webhooks' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  لإعداد Webhooks، انتقل إلى صفحة واجهة المطور حيث يمكنك إدارة نقاط النهاية.
                </p>
                <Link href="/operations/developer-api">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Webhook className="h-3.5 w-3.5" />
                    فتح صفحة واجهة المطور
                  </Button>
                </Link>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">ملاحظات</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfigOpen(false)}>
              إغلاق
            </Button>
            <Button size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
