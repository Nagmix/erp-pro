'use client';

<<<<<<< HEAD
import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
=======
import { useCallback, useMemo, useSyncExternalStore, useState } from 'react';
import { PageHeader } from '@/components/erp/page-header';
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
<<<<<<< HEAD
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
=======
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/app-format';
<<<<<<< HEAD
import { useDoc, useDocList, useUpdateDoc } from '@/lib/client/hooks';
=======
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
import {
  RefreshCw,
  Plug,
  CheckCircle2,
  XCircle,
  Store,
  ArrowRightLeft,
  Clock,
  TestTube,
<<<<<<< HEAD
  Save,
  Wifi,
  WifiOff,
  Activity,
  Settings2,
=======
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
} from 'lucide-react';

/* ─── Types ─── */
type PlatformId = 'salla' | 'zid' | 'shopify' | 'woocommerce';

type PlatformConfig = {
  platform: PlatformId;
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  storeUrl: string;
  syncProducts: boolean;
  syncOrders: boolean;
  syncStock: boolean;
  syncInterval: string;
  syncDirection: string;
  lastSync: string | null;
  lastSyncStatus: 'success' | 'failed' | null;
};

<<<<<<< HEAD
type ECommerceSettings = {
  enabled?: number | boolean;
  products_per_page?: number;
  enable_wishlist?: number | boolean;
  enable_variants?: number | boolean;
  show_price?: number | boolean;
  show_availability?: number | boolean;
  [key: string]: unknown;
};

type IntegrationRequestRow = {
  name: string;
  creation?: string;
  modified?: string;
  integration_type?: string;
  remote_addressee?: string;
  request_id?: string;
  status?: string;
  error?: string;
  reference_doctype?: string;
  reference_docname?: string;
  data?: string;
  output?: string;
};
=======
type SyncLogEntry = {
  id: string;
  date: string;
  platform: PlatformId;
  type: string;
  records: number;
  status: 'ناجح' | 'فاشل';
};

const LS_CONFIG = 'erp_ecommerce_configs';
const LS_LOG = 'erp_ecommerce_sync_log';
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)

const PLATFORM_META: Record<PlatformId, { name: string; nameAr: string; icon: string }> = {
  salla: { name: 'Salla', nameAr: 'سلة', icon: 'solar:shop-bold-duotone' },
  zid: { name: 'Zid', nameAr: 'زِد', icon: 'solar:shop-bold-duotone' },
  shopify: { name: 'Shopify', nameAr: 'شوبيفاي', icon: 'solar:shop-bold-duotone' },
  woocommerce: { name: 'WooCommerce', nameAr: 'ووكومرس', icon: 'solar:shop-bold-duotone' },
};

const SYNC_INTERVALS = [
  { value: '15m', label: 'كل 15 دقيقة' },
  { value: '1h', label: 'كل ساعة' },
  { value: '6h', label: 'كل 6 ساعات' },
  { value: '1d', label: 'يومياً' },
];

const SYNC_DIRECTIONS = [
  { value: 'import', label: 'استيراد فقط' },
  { value: 'export', label: 'تصدير فقط' },
  { value: 'bidirectional', label: 'ثنائي' },
];

const SYNC_TYPES = ['منتجات', 'طلبات', 'مخزون'];

<<<<<<< HEAD
function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true';
  return false;
}

export default function EcommerceIntegrationPage() {
  const { toast } = useToast();

  /* ─── E Commerce Settings from ERPNext ─── */
  const {
    data: ecommerceSettings,
    isLoading: ecommerceLoading,
    error: ecommerceError,
  } = useDoc<ECommerceSettings>('E Commerce Settings', 'E Commerce Settings');

  const updateEcommerceSettings = useUpdateDoc<ECommerceSettings>('E Commerce Settings');

  /* ─── Integration Requests (sync logs) ─── */
  const {
    data: integrationRequests,
    isLoading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useDocList<IntegrationRequestRow>('Integration Request', {
    fields: ['name', 'creation', 'integration_type', 'remote_addressee', 'status', 'error', 'reference_doctype', 'reference_docname'],
    order_by: 'creation desc',
    limit: 100,
  });

  /* ─── Platform configs from server store (React Query) ─── */
  const queryClient = useQueryClient();

  const {
    data: configsData,
    isLoading: configsLoading,
    error: configsError,
    refetch: refetchConfigs,
  } = useQuery<{ platforms: PlatformConfig[] }>({
    queryKey: ['ecommercePlatformConfigs'],
    queryFn: async () => {
      const res = await fetch('/api/settings/ecommerce-platform');
      const json = (await res.json()) as {
        success: boolean;
        data?: { platforms: PlatformConfig[] };
        error?: string;
      };
      if (!json.success || !json.data) {
        throw new Error(json.error || 'فشل تحميل إعدادات المنصات');
      }
      return json.data;
    },
  });

  const configs = configsData?.platforms ?? [];

  /* ─── State for operations ─── */
  const [testing, setTesting] = useState<PlatformId | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null); // `${platform}-${type}`
  const [savingPlatform, setSavingPlatform] = useState<PlatformId | null>(null);
  const [savingEcomSettings, setSavingEcomSettings] = useState(false);

  /* ─── Local overrides for E Commerce Settings ─── */
  const [dirtyEcom, setDirtyEcom] = useState<Partial<ECommerceSettings>>({});

  const ecomDraft = useMemo<ECommerceSettings>(() => ({
    ...(ecommerceSettings ?? {}),
    ...dirtyEcom,
  }), [ecommerceSettings, dirtyEcom]);

  const setEcomField = useCallback((key: string, value: unknown) => {
    setDirtyEcom((prev) => ({ ...prev, [key]: value }));
  }, []);

  /* ─── Platform config helpers ─── */
  const updateConfig = useCallback(
    async (platform: PlatformId, patch: Partial<PlatformConfig>) => {
      // Optimistic update: update the React Query cache
      queryClient.setQueryData<{ platforms: PlatformConfig[] }>(
        ['ecommercePlatformConfigs'],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            platforms: old.platforms.map((c) =>
              c.platform === platform ? { ...c, ...patch } : c
            ),
          };
        }
      );
      // Persist to server
      try {
        await fetch('/api/settings/ecommerce-platform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform, patch }),
        });
      } catch {
        // Revert on error
        void refetchConfigs();
      }
    },
    [queryClient, refetchConfigs]
  );

  const saveConfig = useCallback(
    async (platform: PlatformId) => {
      setSavingPlatform(platform);
      try {
        const cfg = configs.find((c) => c.platform === platform);
        if (!cfg) return;
        const res = await fetch('/api/settings/ecommerce-platform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform, patch: cfg }),
        });
        const json = (await res.json()) as { success?: boolean; error?: string };
        if (!json.success) {
          throw new Error(json.error || 'فشل الحفظ');
        }
        toast({ title: `تم حفظ إعدادات ${PLATFORM_META[platform].nameAr}` });
      } catch (err) {
        toast({
          title: 'فشل الحفظ',
          description: err instanceof Error ? err.message : 'خطأ غير معروف',
          variant: 'destructive',
        });
      } finally {
        setSavingPlatform(null);
      }
=======
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const defaultConfigs: PlatformConfig[] = [
  { platform: 'salla', apiUrl: '', apiKey: '', apiSecret: '', storeUrl: '', syncProducts: false, syncOrders: false, syncStock: false, syncInterval: '1h', syncDirection: 'import', lastSync: null, lastSyncStatus: null },
  { platform: 'zid', apiUrl: '', apiKey: '', apiSecret: '', storeUrl: '', syncProducts: false, syncOrders: false, syncStock: false, syncInterval: '1h', syncDirection: 'import', lastSync: null, lastSyncStatus: null },
  { platform: 'shopify', apiUrl: '', apiKey: '', apiSecret: '', storeUrl: '', syncProducts: false, syncOrders: false, syncStock: false, syncInterval: '1h', syncDirection: 'import', lastSync: null, lastSyncStatus: null },
  { platform: 'woocommerce', apiUrl: '', apiKey: '', apiSecret: '', storeUrl: '', syncProducts: false, syncOrders: false, syncStock: false, syncInterval: '1h', syncDirection: 'import', lastSync: null, lastSyncStatus: null },
];

const emptySubscribe = () => () => {};

export default function EcommerceIntegrationPage() {
  const { toast } = useToast();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [configs, setConfigs] = useState<PlatformConfig[]>(() => loadJson(LS_CONFIG, defaultConfigs));
  const [log, setLog] = useState<SyncLogEntry[]>(() => loadJson(LS_LOG, []));
  const [testing, setTesting] = useState<PlatformId | null>(null);

  const updateConfig = useCallback(
    (platform: PlatformId, patch: Partial<PlatformConfig>) => {
      setConfigs((prev) => {
        const updated = prev.map((c) => (c.platform === platform ? { ...c, ...patch } : c));
        localStorage.setItem(LS_CONFIG, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const saveConfig = useCallback(
    (platform: PlatformId) => {
      localStorage.setItem(LS_CONFIG, JSON.stringify(configs));
      toast({ title: `تم حفظ إعدادات ${PLATFORM_META[platform].nameAr}` });
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
    },
    [configs, toast]
  );

<<<<<<< HEAD
  /* ─── Test Connection ─── */
=======
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
  const testConnection = useCallback(
    async (platform: PlatformId) => {
      const cfg = configs.find((c) => c.platform === platform);
      if (!cfg?.apiKey) {
        toast({ title: 'أدخل مفتاح API أولاً', variant: 'destructive' });
        return;
      }
      setTesting(platform);
<<<<<<< HEAD
      try {
        // Verify via our backend integration test endpoint
        const res = await fetch('/api/integrations/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopify: platform === 'shopify' ? cfg.storeUrl || cfg.apiUrl : '',
            salla: platform === 'salla' ? cfg.storeUrl || cfg.apiUrl : '',
            zid: platform === 'zid' ? cfg.storeUrl || cfg.apiUrl : '',
            woo: platform === 'woocommerce' ? cfg.storeUrl || cfg.apiUrl : '',
          }),
        });
        const json = (await res.json()) as {
          success?: boolean;
          data?: { messages?: string[] };
          error?: string;
        };

        const success = json.success === true;
        await updateConfig(platform, {
          lastSync: new Date().toISOString(),
          lastSyncStatus: success ? 'success' : 'failed',
        });

        toast({
          title: success
            ? `تم الاتصال بـ ${PLATFORM_META[platform].nameAr} بنجاح`
            : `فشل الاتصال بـ ${PLATFORM_META[platform].nameAr}`,
          description: success && json.data?.messages?.length
            ? json.data.messages.join(' · ')
            : json.error || undefined,
          variant: success ? undefined : 'destructive',
        });
      } catch {
        await updateConfig(platform, {
          lastSync: new Date().toISOString(),
          lastSyncStatus: 'failed',
        });
        toast({
          title: `فشل الاتصال بـ ${PLATFORM_META[platform].nameAr}`,
          description: 'تعذر الاتصال بالخادم للتحقق',
          variant: 'destructive',
        });
      } finally {
        setTesting(null);
      }
=======
      await new Promise((r) => setTimeout(r, 2000));
      const success = Math.random() > 0.3;
      updateConfig(platform, {
        lastSync: new Date().toISOString(),
        lastSyncStatus: success ? 'success' : 'failed',
      });
      setTesting(null);
      toast({
        title: success
          ? `تم الاتصال بـ ${PLATFORM_META[platform].nameAr} بنجاح`
          : `فشل الاتصال بـ ${PLATFORM_META[platform].nameAr}`,
        variant: success ? undefined : 'destructive',
      });
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
    },
    [configs, toast, updateConfig]
  );

<<<<<<< HEAD
  /* ─── Sync Operation ─── */
  const runSync = useCallback(
    async (platform: PlatformId, type: string) => {
      const syncKey = `${platform}-${type}`;
      setSyncing(syncKey);
      try {
        // Create an Integration Request record via ERPNext API
        const typeMap: Record<string, string> = {
          'منتجات': 'Item',
          'طلبات': 'Sales Order',
          'مخزون': 'Stock Entry',
        };
        const refDoctype = typeMap[type] || 'Item';

        const res = await fetch('/api/data/Integration Request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            integration_type: 'Remote',
            remote_addressee: PLATFORM_META[platform].name,
            reference_doctype: refDoctype,
            status: 'Queued',
            data: JSON.stringify({
              platform,
              sync_type: type,
              triggered_at: new Date().toISOString(),
            }),
          }),
        });
        const json = (await res.json()) as { success?: boolean; data?: { name?: string }; error?: string };

        const success = json.success === true;
        await updateConfig(platform, {
          lastSync: new Date().toISOString(),
          lastSyncStatus: success ? 'success' : 'failed',
        });

        if (success) {
          void refetchLogs();
        }

        toast({
          title: success
            ? `تم إنشاء طلب مزامنة ${type} لـ ${PLATFORM_META[platform].nameAr}`
            : `فشلت مزامنة ${type}`,
          description: success && json.data?.name ? `رقم الطلب: ${json.data.name}` : json.error || undefined,
          variant: success ? undefined : 'destructive',
        });
      } catch (err) {
        await updateConfig(platform, {
          lastSync: new Date().toISOString(),
          lastSyncStatus: 'failed',
        });
        toast({
          title: `فشلت مزامنة ${type}`,
          description: err instanceof Error ? err.message : 'خطأ غير معروف',
          variant: 'destructive',
        });
      } finally {
        setSyncing(null);
      }
    },
    [toast, updateConfig, refetchLogs]
  );

  /* ─── Save E Commerce Settings ─── */
  const saveEcomSettings = useCallback(async () => {
    setSavingEcomSettings(true);
    try {
      await updateEcommerceSettings.mutateAsync({
        name: 'E Commerce Settings',
        doc: ecomDraft,
      });
      toast({ title: 'تم حفظ إعدادات المتجر الإلكتروني' });
    } catch (err) {
      toast({
        title: 'فشل حفظ الإعدادات',
        description: err instanceof Error ? err.message : 'خطأ غير معروف',
        variant: 'destructive',
      });
    } finally {
      setSavingEcomSettings(false);
    }
  }, [ecomDraft, updateEcommerceSettings, toast]);

  /* ─── KPIs ─── */
  const connectedCount = useMemo(
    () => configs.filter((c) => c.apiKey).length,
    [configs]
  );
  const successSyncs = useMemo(
    () => configs.filter((c) => c.lastSyncStatus === 'success').length,
    [configs]
  );
  const totalLogs = integrationRequests?.length ?? 0;

  /* ─── Sync Log Columns ─── */
  const logColumns: Column<IntegrationRequestRow>[] = useMemo(
    () => [
      {
        key: 'creation',
=======
  const runSync = useCallback(
    (platform: PlatformId, type: string) => {
      const newEntry: SyncLogEntry = {
        id: uid(),
        date: new Date().toISOString(),
        platform,
        type,
        records: Math.floor(Math.random() * 50) + 1,
        status: Math.random() > 0.2 ? 'ناجح' : 'فاشل',
      };
      const updated = [newEntry, ...log];
      setLog(updated);
      localStorage.setItem(LS_LOG, JSON.stringify(updated));
      updateConfig(platform, {
        lastSync: newEntry.date,
        lastSyncStatus: newEntry.status === 'ناجح' ? 'success' : 'failed',
      });
      toast({
        title: newEntry.status === 'ناجح'
          ? `تمت مزامنة ${type} (${newEntry.records} سجل)`
          : `فشلت مزامنة ${type}`,
      });
    },
    [log, toast, updateConfig]
  );

  const logColumns: Column<SyncLogEntry>[] = useMemo(
    () => [
      {
        key: 'date',
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
        header: 'التاريخ',
        sortable: true,
        render: (v) => <span className="text-xs">{formatDate(String(v))}</span>,
      },
      {
<<<<<<< HEAD
        key: 'remote_addressee',
        header: 'المنصة',
        render: (v) => <span className="text-xs">{String(v || '—')}</span>,
      },
      {
        key: 'integration_type',
        header: 'النوع',
        render: (v) => <span className="text-xs">{String(v || '—')}</span>,
      },
      {
        key: 'reference_doctype',
        header: 'مرجع',
        render: (v) => <span className="text-xs">{String(v || '—')}</span>,
=======
        key: 'platform',
        header: 'المنصة',
        render: (v) => <span className="text-xs">{PLATFORM_META[v as PlatformId]?.nameAr ?? String(v)}</span>,
      },
      { key: 'type', header: 'النوع' },
      {
        key: 'records',
        header: 'عدد السجلات',
        render: (v) => <span className="tabular-nums text-xs">{String(v)}</span>,
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
      },
      {
        key: 'status',
        header: 'الحالة',
<<<<<<< HEAD
        render: (v) => {
          const statusMap: Record<string, string> = {
            Completed: 'Sent',
            Queued: 'Open',
            Failed: 'Overdue',
          };
          return <StatusBadge status={statusMap[String(v)] || String(v)} />;
        },
=======
        render: (v) => (
          <StatusBadge status={v === 'ناجح' ? 'Sent' : 'Overdue'} />
        ),
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
      },
    ],
    []
  );

<<<<<<< HEAD
  /* ─── Filtered logs per platform ─── */
  const filteredLog = useCallback(
    (platform: PlatformId) => {
      if (!integrationRequests) return [];
      const platformName = PLATFORM_META[platform].name;
      return integrationRequests.filter(
        (r) => r.remote_addressee === platformName
      );
    },
    [integrationRequests]
  );

  /* ─── Loading state ─── */
  const isPageLoading = configsLoading || ecommerceLoading;

  if (isPageLoading) {
    return (
      <div dir="rtl" className="erp-page-enter space-y-5">
        <PageHeader
          title="ربط المتاجر الإلكترونية"
          description="إدارة الاتصال والمزامنة مع منصات التجارة الإلكترونية"
          iconify="solar:shop-bold-duotone"
          accent="warning"
          breadcrumbs={[{ label: 'الإعدادات' }, { label: 'ربط المتاجر' }]}
        />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-10 w-80 rounded-lg" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }
=======
  const filteredLog = (platform: PlatformId) => log.filter((l) => l.platform === platform);

  if (!mounted) return null;
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="ربط المتاجر الإلكترونية"
        description="إدارة الاتصال والمزامنة مع منصات التجارة الإلكترونية"
        iconify="solar:shop-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'الإعدادات' }, { label: 'ربط المتاجر' }]}
      />

<<<<<<< HEAD
      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard
          title="منصات متصلة"
          value={connectedCount}
          icon={Wifi}
          accent="success"
          compact
        />
        <KpiCard
          title="منصات غير متصلة"
          value={4 - connectedCount}
          icon={WifiOff}
          accent="destructive"
          compact
        />
        <KpiCard
          title="مزامنات ناجحة"
          value={successSyncs}
          icon={CheckCircle2}
          accent="info"
          compact
        />
        <KpiCard
          title="طلبات التكامل"
          value={totalLogs}
          icon={Activity}
          accent="warning"
          compact
        />
      </KpiStrip>

      {/* Error alerts */}
      {configsError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{configsError.message}</span>
          <Button size="sm" variant="outline" className="ms-auto text-xs" onClick={() => void refetchConfigs()}>
            إعادة المحاولة
          </Button>
        </div>
      )}
      {ecommerceError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>فشل تحميل إعدادات المتجر الإلكتروني: {ecommerceError.message}</span>
        </div>
      )}

      {/* E Commerce Settings Card (ERPNext) */}
      <Card className="border-border/40 bg-card">
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">إعدادات المتجر الإلكتروني</h2>
              <p className="text-xs text-muted-foreground">إعدادات ERPNext E Commerce Settings</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between rounded-lg border border-border/30 p-3">
              <Label className="text-xs font-semibold">تفعيل المتجر</Label>
              <Switch
                checked={toBool(ecomDraft.enabled)}
                onCheckedChange={(v) => setEcomField('enabled', v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/30 p-3">
              <Label className="text-xs font-semibold">إظهار السعر</Label>
              <Switch
                checked={toBool(ecomDraft.show_price)}
                onCheckedChange={(v) => setEcomField('show_price', v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/30 p-3">
              <Label className="text-xs font-semibold">إظهار التوفر</Label>
              <Switch
                checked={toBool(ecomDraft.show_availability)}
                onCheckedChange={(v) => setEcomField('show_availability', v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/30 p-3">
              <Label className="text-xs font-semibold">تفعيل المفضلة</Label>
              <Switch
                checked={toBool(ecomDraft.enable_wishlist)}
                onCheckedChange={(v) => setEcomField('enable_wishlist', v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/30 p-3">
              <Label className="text-xs font-semibold">تفعيل المتغيرات</Label>
              <Switch
                checked={toBool(ecomDraft.enable_variants)}
                onCheckedChange={(v) => setEcomField('enable_variants', v)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">عدد المنتجات في الصفحة</Label>
              <Input
                type="number"
                className="h-9 text-xs"
                min={1}
                max={100}
                value={ecomDraft.products_per_page ?? 20}
                onChange={(e) =>
                  setEcomField('products_per_page', parseInt(e.target.value, 10) || 20)
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              className="gap-1.5"
              disabled={savingEcomSettings || updateEcommerceSettings.isPending}
              onClick={() => void saveEcomSettings()}
            >
              <Save className="h-3.5 w-3.5" />
              {savingEcomSettings || updateEcommerceSettings.isPending
                ? 'جاري الحفظ…'
                : 'حفظ إعدادات المتجر'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Platform Tabs */}
=======
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
      <Tabs defaultValue="salla" className="space-y-4">
        <TabsList>
          {Object.entries(PLATFORM_META).map(([key, meta]) => (
            <TabsTrigger key={key} value={key} className="gap-1.5 text-xs">
              <Store className="h-3.5 w-3.5" />
              {meta.nameAr}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(PLATFORM_META) as PlatformId[]).map((platform) => {
<<<<<<< HEAD
          const cfg = configs.find((c) => c.platform === platform);
          if (!cfg) return null;
=======
          const cfg = configs.find((c) => c.platform === platform) ?? configs[0];
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
          const meta = PLATFORM_META[platform];

          return (
            <TabsContent key={platform} value={platform} className="space-y-5">
              {/* Connection Settings */}
              <Card className="border-border/40 bg-card">
                <CardContent className="p-5 space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Plug className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold">إعدادات الاتصال — {meta.nameAr}</h2>
                      <p className="text-xs text-muted-foreground">أدخل بيانات الربط مع متجر {meta.nameAr}</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">رابط API</Label>
                      <Input
                        dir="ltr"
                        className="h-9 font-mono text-xs"
                        value={cfg.apiUrl}
<<<<<<< HEAD
                        onChange={(e) => void updateConfig(platform, { apiUrl: e.target.value })}
=======
                        onChange={(e) => updateConfig(platform, { apiUrl: e.target.value })}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                        placeholder={`https://api.${meta.name.toLowerCase()}.com/v1`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">رابط المتجر</Label>
                      <Input
                        dir="ltr"
                        className="h-9 font-mono text-xs"
                        value={cfg.storeUrl}
<<<<<<< HEAD
                        onChange={(e) => void updateConfig(platform, { storeUrl: e.target.value })}
=======
                        onChange={(e) => updateConfig(platform, { storeUrl: e.target.value })}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                        placeholder={`https://mystore.${meta.name.toLowerCase()}.com`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">مفتاح API</Label>
                      <Input
                        dir="ltr"
                        className="h-9 font-mono text-xs"
                        value={cfg.apiKey}
<<<<<<< HEAD
                        onChange={(e) => void updateConfig(platform, { apiKey: e.target.value })}
=======
                        onChange={(e) => updateConfig(platform, { apiKey: e.target.value })}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                        placeholder="API Key"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">سرّ API</Label>
                      <Input
                        dir="ltr"
                        type="password"
                        className="h-9 font-mono text-xs"
                        value={cfg.apiSecret}
<<<<<<< HEAD
                        onChange={(e) => void updateConfig(platform, { apiSecret: e.target.value })}
=======
                        onChange={(e) => updateConfig(platform, { apiSecret: e.target.value })}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                        placeholder="API Secret"
                      />
                    </div>
                  </div>

                  {/* Sync Options */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-3 rounded-lg border border-border/30 p-3">
                      <p className="text-xs font-semibold">خيارات المزامنة</p>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`sync-products-${platform}`}
                          checked={cfg.syncProducts}
<<<<<<< HEAD
                          onCheckedChange={(v) => void updateConfig(platform, { syncProducts: v === true })}
=======
                          onCheckedChange={(v) => updateConfig(platform, { syncProducts: v === true })}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                        />
                        <Label htmlFor={`sync-products-${platform}`} className="text-xs cursor-pointer">مزامنة المنتجات</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`sync-orders-${platform}`}
                          checked={cfg.syncOrders}
<<<<<<< HEAD
                          onCheckedChange={(v) => void updateConfig(platform, { syncOrders: v === true })}
=======
                          onCheckedChange={(v) => updateConfig(platform, { syncOrders: v === true })}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                        />
                        <Label htmlFor={`sync-orders-${platform}`} className="text-xs cursor-pointer">مزامنة الطلبات</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`sync-stock-${platform}`}
                          checked={cfg.syncStock}
<<<<<<< HEAD
                          onCheckedChange={(v) => void updateConfig(platform, { syncStock: v === true })}
=======
                          onCheckedChange={(v) => updateConfig(platform, { syncStock: v === true })}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                        />
                        <Label htmlFor={`sync-stock-${platform}`} className="text-xs cursor-pointer">مزامنة المخزون</Label>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">فترة المزامنة</Label>
                        <Select
                          value={cfg.syncInterval}
<<<<<<< HEAD
                          onValueChange={(v) => void updateConfig(platform, { syncInterval: v })}
=======
                          onValueChange={(v) => updateConfig(platform, { syncInterval: v })}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SYNC_INTERVALS.map((i) => (
                              <SelectItem key={i.value} value={i.value}>
                                {i.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">اتجاه المزامنة</Label>
                        <Select
                          value={cfg.syncDirection}
<<<<<<< HEAD
                          onValueChange={(v) => void updateConfig(platform, { syncDirection: v })}
=======
                          onValueChange={(v) => updateConfig(platform, { syncDirection: v })}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SYNC_DIRECTIONS.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Last Sync Status */}
                  {cfg.lastSync && (
                    <div className="flex items-center gap-3 rounded-lg border border-border/30 px-3 py-2 text-xs">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">آخر مزامنة:</span>
                      <span className="font-medium">{formatDate(cfg.lastSync)}</span>
                      {cfg.lastSyncStatus === 'success' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <span>{cfg.lastSyncStatus === 'success' ? 'ناجحة' : 'فاشلة'}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
<<<<<<< HEAD
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={savingPlatform === platform}
                      onClick={() => void saveConfig(platform)}
                    >
                      <Save className="h-3.5 w-3.5" />
                      {savingPlatform === platform ? 'جاري الحفظ…' : 'حفظ الإعدادات'}
=======
                    <Button size="sm" onClick={() => saveConfig(platform)}>
                      حفظ الإعدادات
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1.5"
                      disabled={testing === platform}
<<<<<<< HEAD
                      onClick={() => void testConnection(platform)}
=======
                      onClick={() => testConnection(platform)}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                    >
                      <TestTube className="h-3.5 w-3.5" />
                      {testing === platform ? 'جاري الاتصال…' : 'اختبار الاتصال'}
                    </Button>
<<<<<<< HEAD
                    {SYNC_TYPES.map((type) => {
                      const syncKey = `${platform}-${type}`;
                      return (
                        <Button
                          key={type}
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={syncing === syncKey}
                          onClick={() => void runSync(platform, type)}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${syncing === syncKey ? 'animate-spin' : ''}`} />
                          {syncing === syncKey ? 'جاري المزامنة…' : `مزامنة ${type}`}
                        </Button>
                      );
                    })}
=======
                    {SYNC_TYPES.map((type) => (
                      <Button
                        key={type}
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => runSync(platform, type)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        مزامنة {type}
                      </Button>
                    ))}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                  </div>
                </CardContent>
              </Card>

              {/* Sync Log */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  سجل المزامنة — {meta.nameAr}
                </h3>
                <DataTable
                  data={filteredLog(platform)}
                  columns={logColumns}
                  tableId={`ecommerce-log-${platform}`}
                  searchable
                  exportFileName={`سجل-مزامنة-${meta.nameAr}`}
<<<<<<< HEAD
                  loading={logsLoading}
                  error={logsError}
                  onRetry={() => void refetchLogs()}
=======
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                />
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
