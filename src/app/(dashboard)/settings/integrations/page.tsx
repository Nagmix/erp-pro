'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
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
  Zap,
  Database,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

/* ─── Types ─── */
type IntegrationStatus = 'connected' | 'disconnected' | 'error';

type IntegrationStatusResult = {
  key: string;
  status: IntegrationStatus;
  configured: boolean;
  lastSync: string | null;
  details: string;
  erpNextDocCount: number;
};

type IntegrationsStatusResponse = {
  integrations: IntegrationStatusResult[];
  kpis: {
    configured: number;
    connected: number;
    disconnected: number;
    errors: number;
    total: number;
  };
  backendAvailable: boolean;
};

type IntegrationsLocalData = {
  shopify: string;
  salla: string;
  zid: string;
  woo: string;
  smsProvider: string;
  waProvider: string;
  notes: string;
};

/* ─── Integration Definitions ─── */
const INTEGRATION_DEFS = [
  {
    id: 'sms-gateway',
    key: 'sms',
    title: 'بوابة الرسائل النصية',
    description: 'إرسال رسائل SMS للعملاء والموظفين عبر مزودي مثل Unifonic و Twilio',
    icon: MessageSquare,
    accent: 'success' as const,
    settingsPath: '/settings/sms-gateway',
    category: 'التواصل',
    erpNextDoctypes: ['SMS Settings'],
  },
  {
    id: 'email-smtp',
    key: 'email',
    title: 'بريد SMTP',
    description: 'ضبط خادم البريد الصادر لإرسال الفواتير والإشعارات تلقائياً',
    icon: Mail,
    accent: 'info' as const,
    settingsPath: '/settings/email-smtp',
    category: 'التواصل',
    erpNextDoctypes: ['Email Account'],
  },
  {
    id: 'payment-gateways',
    key: 'payment',
    title: 'بوابات الدفع',
    description: 'ربط بوابات الدفع الإلكتروني لاستقبال المدفوعات عبر الإنترنت',
    icon: CreditCard,
    accent: 'warning' as const,
    settingsPath: '/settings/payment-gateways',
    category: 'المالية',
    erpNextDoctypes: ['PayPal Settings', 'Stripe Settings', 'Razorpay Settings', 'Payment Gateway'],
  },
  {
    id: 'ecommerce',
    key: 'ecommerce',
    title: 'التجارة الإلكترونية',
    description: 'مزامنة الطلبات والمخزون مع Salla و Zid و Shopify و WooCommerce',
    icon: Globe,
    accent: 'purple' as const,
    settingsPath: '/settings/ecommerce-integration',
    category: 'المبيعات',
    erpNextDoctypes: ['Shopify Log', 'E Commerce Item'],
  },
  {
    id: 'webhooks',
    key: 'webhooks',
    title: 'ويب هوكس',
    description: 'إرسال أحداث النظام تلقائياً إلى أنظمة خارجية عبر HTTP Webhooks',
    icon: Webhook,
    accent: 'primary' as const,
    settingsPath: '/operations/developer-api',
    category: 'التطوير',
    erpNextDoctypes: ['Webhook'],
  },
] as const;

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

/* ─── Fetch helpers ─── */
async function fetchIntegrationStatus(): Promise<IntegrationsStatusResponse> {
  const res = await fetch('/api/settings/integrations/status');
  const j = (await res.json()) as { success?: boolean; data?: IntegrationsStatusResponse };
  if (!j.data) throw new Error('تعذر تحميل حالة التكاملات');
  return j.data;
}

async function fetchLocalData(): Promise<IntegrationsLocalData | null> {
  try {
    const res = await fetch('/api/settings/integrations-local');
    const j = (await res.json()) as { data?: IntegrationsLocalData };
    return j.data ?? null;
  } catch {
    return null;
  }
}

/* ─── Main Component ─── */
export default function SettingsIntegrationsPage() {
  const queryClient = useQueryClient();

  // Fetch integration status from ERPNext
  const statusQuery = useQuery({
    queryKey: ['integrationsStatus'],
    queryFn: fetchIntegrationStatus,
    staleTime: 30_000,
  });

  // Fetch local integrations data (e-commerce form)
  const localQuery = useQuery({
    queryKey: ['integrationsLocal'],
    queryFn: fetchLocalData,
    staleTime: 30_000,
  });

  const loading = statusQuery.isLoading || localQuery.isLoading;

  // Local state for e-commerce form fields
  const [shopify, setShopify] = useState('');
  const [salla, setSalla] = useState('');
  const [zid, setZid] = useState('');
  const [woo, setWoo] = useState('');
  const [smsProvider, setSmsProvider] = useState('Unifonic');
  const [waProvider, setWaProvider] = useState('Meta');
  const [notes, setNotes] = useState('');

  // Initialize form fields from local data
  const localData = localQuery.data;
  if (localData && !shopify && !salla && !zid && !woo && localData.shopify) {
    setShopify(localData.shopify);
    setSalla(localData.salla);
    setZid(localData.zid);
    setWoo(localData.woo);
    setSmsProvider(localData.smsProvider || 'Unifonic');
    setWaProvider(localData.waProvider || 'Meta');
    setNotes(localData.notes || '');
  }

  // Local toggle state for each integration
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    INTEGRATION_DEFS.forEach((def) => {
      map[def.key] = false;
    });
    return map;
  });

  // Update enabled state from status data
  const statusData = statusQuery.data;
  if (statusData) {
    const newEnabled: Record<string, boolean> = {};
    let needsUpdate = false;
    statusData.integrations.forEach((intg) => {
      const shouldBe = intg.configured;
      if (enabledMap[intg.key] !== shouldBe) needsUpdate = true;
      newEnabled[intg.key] = shouldBe;
    });
    if (needsUpdate) setEnabledMap(newEnabled);
  }

  // Configure dialog
  const [configOpen, setConfigOpen] = useState(false);
  const [configKey, setConfigKey] = useState<string>('');

  /* ─── Save local settings ─── */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/integrations-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopify, salla, zid, woo, smsProvider, waProvider, notes }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error('فشل الحفظ');
      return j;
    },
    onSuccess: () => {
      toast.success('تم حفظ إعدادات التكاملات بنجاح');
      void queryClient.invalidateQueries({ queryKey: ['integrationsLocal'] });
      void queryClient.invalidateQueries({ queryKey: ['integrationsStatus'] });
    },
    onError: () => {
      toast.error('فشل الحفظ');
    },
  });

  /* ─── Health check (refresh statuses) ─── */
  const healthCheckMutation = useMutation({
    mutationFn: async () => {
      // First save local data if changed
      await fetch('/api/settings/integrations-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopify, salla, zid, woo, smsProvider, waProvider, notes }),
      }).catch(() => {});
      // Then test connectivity
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopify, salla, zid, woo }),
      });
      const j = (await res.json()) as { success?: boolean; data?: { messages?: string[] }; error?: string };
      if (!res.ok || !j.success) throw new Error(j.error || 'فشل التحقق');
      return j;
    },
    onSuccess: (data) => {
      const msgs = data.data?.messages ?? [];
      toast.success(msgs.join(' · ') || 'تم فحص التكاملات بنجاح');
      void queryClient.invalidateQueries({ queryKey: ['integrationsStatus'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'فشل التحقق من صحة التكاملات');
    },
  });

  /* ─── Sync integration ─── */
  const syncMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await fetch('/api/settings/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const j = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !j.success) throw new Error(j.error || 'فشلت المزامنة');
      return j;
    },
    onSuccess: (_, key) => {
      const def = INTEGRATION_DEFS.find((d) => d.key === key);
      toast.success(`تم تسجيل طلب المزامنة لـ ${def?.title ?? key}`);
      void queryClient.invalidateQueries({ queryKey: ['integrationsStatus'] });
    },
    onError: () => {
      toast.error('فشلت المزامنة');
    },
  });

  /* ─── Toggle integration ─── */
  const toggleIntegration = useCallback((key: string, enabled: boolean) => {
    setEnabledMap((prev) => ({ ...prev, [key]: enabled }));
    toast.success(enabled ? 'تم تفعيل التكامل' : 'تم تعطيل التكامل');
  }, []);

  /* ─── Open config dialog ─── */
  const openConfig = (key: string) => {
    setConfigKey(key);
    setConfigOpen(true);
  };

  /* ─── Build status map from query ─── */
  const statusMap: Record<string, IntegrationStatusResult | undefined> = {};
  statusData?.integrations.forEach((intg) => {
    statusMap[intg.key] = intg;
  });

  /* ─── KPI counts from real data ─── */
  const kpis = statusData?.kpis ?? { configured: 0, connected: 0, disconnected: 0, errors: 0, total: INTEGRATION_DEFS.length };

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
              onClick={() => void queryClient.invalidateQueries({ queryKey: ['integrationsStatus'] })}
              disabled={statusQuery.isFetching}
            >
              {statusQuery.isFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              تحديث الحالة
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => void healthCheckMutation.mutateAsync()}
              disabled={healthCheckMutation.isPending}
            >
              {healthCheckMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Activity className="h-3.5 w-3.5" />
              )}
              فحص الصحة
            </Button>
          </div>
        }
      />

      {/* Backend availability notice */}
      {statusData && !statusData.backendAvailable && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-sm text-amber-800">خادم ERPNext غير متاح</AlertTitle>
          <AlertDescription className="text-xs text-amber-700 leading-relaxed">
            تعذّر الاتصال بخادم ERPNext. يتم عرض حالة التكاملات المحلية فقط. تحقق من صفحة إعداد الخادم.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard
          title="تكاملات مُعدّة"
          value={kpis.configured}
          icon={Zap}
          accent="success"
          compact
          description="تكاملات تم إعدادها"
        />
        <KpiCard
          title="متصلة"
          value={kpis.connected}
          icon={Wifi}
          accent="info"
          compact
          description="تعمل بشكل طبيعي"
        />
        <KpiCard
          title="غير متصلة"
          value={kpis.disconnected}
          icon={WifiOff}
          accent="destructive"
          compact
          description="بحاجة إلى إعداد"
        />
        <KpiCard
          title="أخطاء"
          value={kpis.errors}
          icon={AlertTriangle}
          accent="warning"
          compact
          description="مشاكل اتصال"
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
          {INTEGRATION_DEFS.map((def) => {
            const Icon = def.icon;
            const intgStatus = statusMap[def.key];
            const status: IntegrationStatus = intgStatus?.status ?? 'disconnected';
            const configured = intgStatus?.configured ?? false;
            const lastSync = intgStatus?.lastSync ?? null;
            const details = intgStatus?.details ?? '';
            const erpDocCount = intgStatus?.erpNextDocCount ?? 0;
            const enabled = enabledMap[def.key] ?? false;

            return (
              <Card
                key={def.id}
                className={`border-border/40 transition-all duration-200 hover:border-border/60 hover:shadow-sm ${
                  enabled ? 'bg-card' : 'bg-muted/20 opacity-80'
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accentSurface[def.accent]}`}
                      >
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h3 className="text-sm font-semibold leading-tight">{def.title}</h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                          {def.description}
                        </p>
                      </div>
                    </div>
                    {statusIcon(status)}
                  </div>

                  {/* Status row */}
                  <div className="flex items-center justify-between gap-2">
                    {statusBadge(status)}
                    <span className="text-[10px] text-muted-foreground">
                      {lastSync
                        ? `آخر مزامنة: ${new Date(lastSync).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`
                        : 'لا توجد مزامنة'}
                    </span>
                  </div>

                  {/* Details row */}
                  {details && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/30 rounded px-2 py-1.5">
                      {details}
                    </p>
                  )}

                  {/* ERPNext docs indicator */}
                  {erpDocCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Database className="h-3 w-3" />
                      <span>{erpDocCount} سجل في ERPNext</span>
                    </div>
                  )}

                  <Separator className="bg-border/30" />

                  {/* Actions row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => toggleIntegration(def.key, checked)}
                        aria-label={`تفعيل ${def.title}`}
                      />
                      <span className="text-[11px] text-muted-foreground">
                        {enabled ? 'مفعّل' : 'معطّل'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Configure button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openConfig(def.key)}
                        aria-label={`إعدادات ${def.title}`}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      {/* Sync Now button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => void syncMutation.mutateAsync(def.key)}
                        disabled={syncMutation.isPending || !configured}
                        aria-label={`مزامنة ${def.title}`}
                      >
                        {syncMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      {/* Open settings page */}
                      <Link href={def.settingsPath}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`فتح صفحة ${def.title}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Category badge */}
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                      {def.category}
                    </Badge>
                    {def.erpNextDoctypes.length > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono" dir="ltr">
                        {def.erpNextDoctypes[0]}
                      </Badge>
                    )}
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
              onClick={() => void healthCheckMutation.mutateAsync()}
              disabled={healthCheckMutation.isPending}
            >
              {healthCheckMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
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
            <Button size="sm" disabled={saveMutation.isPending} onClick={() => void saveMutation.mutateAsync()}>
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Link2 className="h-4 w-4" />
        <AlertTitle className="text-sm">ملاحظات حول التكاملات</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
          حالات الاتصال تُجلب مباشرة من سجلات ERPNext (SMS Settings، Email Account، Payment Gateway، Webhook...).
          مزامنة الطلبات والمخزون مع Salla / Zid / Shopify تتطلب مفاتيح API وواجهة خلفية مخصصة.
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
            {/* Status info */}
            {statusMap[configKey] && (
              <div className="rounded-lg border border-border/40 p-3 space-y-2 bg-muted/20">
                <div className="flex items-center gap-2">
                  {statusIcon(statusMap[configKey]!.status)}
                  <span className="text-xs font-medium">
                    الحالة: {statusMap[configKey]!.status === 'connected' ? 'متصل' : statusMap[configKey]!.status === 'disconnected' ? 'غير متصل' : 'خطأ'}
                  </span>
                </div>
                {statusMap[configKey]!.details && (
                  <p className="text-[11px] text-muted-foreground">{statusMap[configKey]!.details}</p>
                )}
                {statusMap[configKey]!.erpNextDocCount > 0 && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    {statusMap[configKey]!.erpNextDocCount} سجل في ERPNext
                  </p>
                )}
              </div>
            )}

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
                  لإعداد البريد الصادر، انتقل إلى صفحة إعدادات SMTP المخصصة أو تحقق من حسابات البريد في ERPNext.
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
                  لإعداد بوابات الدفع الإلكتروني، انتقل إلى صفحة بوابات الدفع أو تحقق من إعدادات PayPal/Stripe/Razorpay في ERPNext.
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
                  لإعداد Webhooks، انتقل إلى صفحة واجهة المطور حيث يمكنك إدارة نقاط النهاية. يمكنك أيضاً إنشاء خطافات ويب مباشرة في ERPNext.
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
            <Button size="sm" disabled={saveMutation.isPending} onClick={() => { void saveMutation.mutateAsync(); setConfigOpen(false); }}>
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
